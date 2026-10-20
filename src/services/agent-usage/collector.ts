/**
 * TauriTavern Agent 模式用量采集器。
 *
 * 事实基线（已对 TauriTavern 源码核实）：
 * - Agent 模式下 `Generate()` 在 `startAgentRunFromGeneratedPrompt()` 处直接 return（script.js:6491），
 *   不进入 `finishGenerating()`，因此**不会**触发 `GENERATION_ENDED`；
 * - 模型调用发生在 Rust 侧（LLM Gateway → ChatCompletionService），前端没有任何 fetch 可拦；
 * - Agent 流式响应会在 delta 中移除 usage 并在 Rust 内聚合（openai.rs:227），最终只写回
 *   `provider_metadata.usage`，因此 `readModelTurn().provider.usage` 是**唯一**用量出口；
 * - 提交到聊天的消息带 `extra.tauritavern.agent.runId`（agent-chat-message.js），这是来源判定的权威依据；
 * - 终态事件为 run_completed / run_partial_success / run_failed / run_cancelled。
 *
 * 采集口径：一次 Run = 一条历史，跨 Invocation（主 Agent / 子 Agent）、跨模型回合聚合。
 */

import { state } from '../../store/index';
import { repository } from '../../data/repository';
import { log } from '../../utils/logger';
import { calcCost, normalizeModel } from '../pricing';
import { buildEndpointContext, type HistoryConnection } from '../connection-identity';
import { findWalletForConnection } from '../../data/wallets';
import { normalizeUsage } from './normalize';
import type { AgentRunEntryInput, AgentRunStatus, AgentTurnDetail, AgentWalletShare } from '../../types/agent';
import {
  getAgentApi,
  getStableChatId,
  hasAgentSupport,
  isTauriTavern,
  listRuns,
  loadLlmConnection,
  loadProfile,
  readAllEvents,
  readModelTurn,
  subscribeRun,
  type AgentRunSummary,
} from './tt-agent-api';

const TERMINAL_STATUSES = new Set(['completed', 'partial_success', 'cancelled', 'failed']);
const ROOT_INVOCATION = 'root';
const PENDING_POLL_INTERVAL_MS = 1500;
const PENDING_POLL_TIMEOUT_MS = 15000;
const RUN_SUBSCRIBE_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_TURNS_PER_RUN = 100;
const MAX_RECONCILE_RUNS = 5;
const WATERMARK_KEY = 'aus_agent_watermark_v1';
/** 应急逃生阀：localStorage.setItem('aus_agent_capture','0') 可整体关闭 Agent 采集 */
const SWITCH_KEY = 'aus_agent_capture';

const recordedRuns = new Set<string>();
const collectingRuns = new Set<string>();
let installed = false;
let agentPending = false;
let pendingSince = 0;
let pendingTimer: any = null;
let pendingDeadline = 0;
let activeUnsubscribe: (() => void) | null = null;
let activeRunId: string | null = null;
let reconcileTimer: any = null;

function switchOn(): boolean {
  try {
    return localStorage.getItem(SWITCH_KEY) !== '0';
  } catch {
    return true;
  }
}

/** Agent 通道是否可用（无 TauriTavern 或 ABI 不符时返回 false，上层完全降级） */
export function isAgentChannelAvailable(): boolean {
  try {
    return isTauriTavern() && hasAgentSupport();
  } catch {
    return false;
  }
}

/** 是否有 Agent Run 正在进行（供 GENERATION_ENDED 守卫避免误记残留 usage） */
export function isAgentRunPending(): boolean {
  return agentPending;
}

function pendingExpired(): boolean {
  return agentPending && pendingDeadline > 0 && Date.now() > pendingDeadline;
}

/** 由 GENERATE_AFTER_DATA 调用：仅 Agent 模式会带 frozenRunInputSnapshot */
export function notifyGenerateAfterData(data: any, dryRun?: boolean): void {
  try {
    if (dryRun === true) return;
    if (!data || typeof data !== 'object') return;
    if (!Object.prototype.hasOwnProperty.call(data, 'frozenRunInputSnapshot')) return;
    markPending();
  } catch {}
}

function markPending(): void {
  agentPending = true;
  pendingSince = Date.now();
  pendingDeadline = pendingSince + PENDING_POLL_TIMEOUT_MS;
  if (pendingTimer) return;
  log.debug('Agent 模式生成开始，等待 Run 落库');
  pendingTimer = setInterval(() => { void pollPendingRun(); }, PENDING_POLL_INTERVAL_MS);
}

function clearPending(): void {
  agentPending = false;
  pendingSince = 0;
  pendingDeadline = 0;
  if (pendingTimer) {
    try { clearInterval(pendingTimer); } catch {}
    pendingTimer = null;
  }
}

/** pending 短轮询：捕获"失败且未提交到聊天"的 Run（未提交时不会触发 MESSAGE_RECEIVED） */
async function pollPendingRun(): Promise<void> {
  if (!agentPending) return;
  try {
    if (pendingExpired()) {
      clearPending();
      return;
    }
    const runs = await listRuns({ stableChatId: await getStableChatId(), limit: 5 });
    const fresh = runs.find((run) => {
      const created = Date.parse(String(run?.createdAt || ''));
      return !Number.isNaN(created) && created >= pendingSince - 2000;
    });
    if (!fresh?.runId) return;
    clearPending();
    await trackRun(String(fresh.runId), fresh);
  } catch (e) {
    log.debug('Agent pending 轮询失败 ' + ((e as any)?.message || e));
  }
}

/** 订阅 Run 直到终态，再采集；非终态则等待事件 */
async function trackRun(runId: string, summary?: AgentRunSummary): Promise<void> {
  if (TERMINAL_STATUSES.has(String(summary?.status || ''))) {
    await captureAgentRun(runId, summary);
    return;
  }
  if (activeRunId === runId) return;
  cancelActiveRun();
  activeRunId = runId;
  let done = false;
  const finish = async () => {
    if (done) return;
    done = true;
    cancelActiveRun();
    const latest = await findRunSummary(runId);
    await captureAgentRun(runId, latest || summary);
  };
  const unsubscribe = await subscribeRun(runId, (event: any) => {
    const type = String(event?.type || '');
    if (TERMINAL_STATUSES.has(type.replace(/^run_/, ''))) void finish();
  }, { afterSeq: 0, intervalMs: 1200 });
  activeUnsubscribe = unsubscribe;
  setTimeout(() => { void finish(); }, RUN_SUBSCRIBE_TIMEOUT_MS);
}

function cancelActiveRun(): void {
  if (activeUnsubscribe) {
    try { activeUnsubscribe(); } catch {}
    activeUnsubscribe = null;
  }
  activeRunId = null;
}

async function findRunSummary(runId: string): Promise<AgentRunSummary | null> {
  try {
    const runs = await listRuns({ stableChatId: await getStableChatId(), limit: 20 });
    return runs.find((run) => String(run?.runId || '') === runId) || null;
  } catch {
    return null;
  }
}

/** 从聊天消息的 extra 中取 Agent 标记（来源判定的权威依据） */
export function extractAgentRunId(message: any): string | null {
  try {
    const runId = message?.extra?.tauritavern?.agent?.runId;
    return typeof runId === 'string' && runId.trim() ? runId.trim() : null;
  } catch {
    return null;
  }
}

/** MESSAGE_RECEIVED 入口：Agent 提交消息后必然带 runId */
export async function notifyMessageReceived(messageId?: number): Promise<void> {
  try {
    const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
    const chat: any[] = ctx?.chat || [];
    const index = typeof messageId === 'number' ? messageId : chat.length - 1;
    const message = chat[index] || chat[chat.length - 1];
    const runId = extractAgentRunId(message);
    if (!runId) return;
    clearPending();
    const summary = await findRunSummary(runId);
    if (summary && !TERMINAL_STATUSES.has(String(summary.status || ''))) {
      await trackRun(runId, summary);
      return;
    }
    await captureAgentRun(runId, summary || undefined);
  } catch (e) {
    log.debug('Agent 消息采集失败 ' + ((e as any)?.message || e));
  }
}

// ---------------------------------------------------------------------------
// 采集
// ---------------------------------------------------------------------------

type TurnKey = { invocationId: string; round: number };

function eventPayload(event: any): any {
  return event?.payload && typeof event.payload === 'object' ? event.payload : {};
}

function collectTurnKeys(events: any[]): TurnKey[] {
  const seen = new Set<string>();
  const keys: TurnKey[] = [];
  for (const event of events) {
    if (String(event?.type || '') !== 'model_completed') continue;
    const payload = eventPayload(event);
    const round = Number(payload.round);
    if (!Number.isFinite(round) || round <= 0) continue;
    const invocationId = String(payload.invocationId || ROOT_INVOCATION);
    const key = invocationId + '|' + round;
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push({ invocationId, round });
  }
  return keys.sort((a, b) => a.round - b.round || a.invocationId.localeCompare(b.invocationId));
}

function eventTimestamp(events: any[], type: string, invocationId: string, round: number): number {
  for (const event of events) {
    if (String(event?.type || '') !== type) continue;
    const payload = eventPayload(event);
    if (Number(payload.round) !== round) continue;
    if (String(payload.invocationId || ROOT_INVOCATION) !== invocationId) continue;
    const ms = Date.parse(String(event?.timestamp || ''));
    if (!Number.isNaN(ms)) return ms;
  }
  return 0;
}

function terminalStatusOf(events: any[], summary?: AgentRunSummary): AgentRunStatus {
  const summaryStatus = String(summary?.status || '');
  if (TERMINAL_STATUSES.has(summaryStatus)) return summaryStatus as AgentRunStatus;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const type = String(events[i]?.type || '');
    const mapped = type.replace(/^run_/, '');
    if (TERMINAL_STATUSES.has(mapped)) return mapped as AgentRunStatus;
  }
  return 'completed';
}

/** 用 Profile / 当前设置解析接入身份；只取 endpoint，不映射活动密钥（Agent 密钥由 Profile 决定） */
async function resolveTurnConnection(source: string | null, profile: any): Promise<HistoryConnection | null> {
  let chatCompletionSource = source;
  let baseUrl = '';
  try {
    const model = profile?.model;
    if (model && model.mode === 'connectionRef' && model.connectionRef) {
      const connection = await loadLlmConnection(String(model.connectionRef));
      const candidateSource = connection?.chatCompletionSource || connection?.source || connection?.provider;
      if (typeof candidateSource === 'string' && candidateSource.trim()) chatCompletionSource = candidateSource.trim();
      const endpoint = connection?.endpoint?.baseUrl || connection?.baseUrl || connection?.endpoint?.url;
      if (typeof endpoint === 'string' && endpoint.trim()) baseUrl = endpoint.trim();
    }
  } catch {}
  if (!chatCompletionSource) {
    try {
      const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
      const settings = ctx?.chatCompletionSettings || (globalThis as any).oai_settings || {};
      const fallback = settings?.chat_completion_source;
      if (typeof fallback === 'string' && fallback.trim()) chatCompletionSource = fallback.trim();
      const fallbackUrl = settings?.custom_url || settings?.reverse_proxy;
      if (!baseUrl && typeof fallbackUrl === 'string') baseUrl = fallbackUrl.trim();
    } catch {}
  }
  if (!chatCompletionSource && !baseUrl) return null;
  const endpoint = buildEndpointContext({
    chat_completion_source: chatCompletionSource || undefined,
    custom_url: baseUrl || undefined,
  });
  return { ...endpoint, credentialId: null, credentialLabel: null };
}

function walletFor(connection: HistoryConnection | null) {
  try {
    return findWalletForConnection(state.wallets, connection);
  } catch {
    return null;
  }
}

function currentChatId(): string | null {
  try {
    const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
    const id = ctx?.getCurrentChatId?.();
    if (typeof id === 'string' && id) return id;
  } catch {}
  return null;
}

function currentChatName(): string | null {
  try {
    const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
    const characters = ctx?.characters;
    const index = ctx?.characterId ?? (globalThis as any).this_chid;
    const name = characters?.[index]?.name;
    if (typeof name === 'string' && name) return name;
  } catch {}
  return null;
}

/** 采集一个 Run：逐回合读取 usage → 逐回合计价 → 聚合为一条历史 */
async function collectRun(runId: string, summary?: AgentRunSummary): Promise<AgentRunEntryInput | null> {
  const { events, truncated } = await readAllEvents(runId);
  if (!events.length) {
    log.debug('Agent Run 无事件，跳过 ' + runId);
    return null;
  }
  const turnKeys = collectTurnKeys(events).slice(0, MAX_TURNS_PER_RUN);
  if (!turnKeys.length) {
    log.debug('Agent Run 无模型回合，跳过 ' + runId);
    return null;
  }

  const profileId = String(
    summary?.profileId
      || eventPayload(events.find((event) => String(event?.type) === 'profile_resolved') || {})?.profileId
      || '',
  ).trim() || null;
  const profile = profileId ? await loadProfile(profileId) : null;
  const profileData = (profile as any)?.profile ?? profile;

  let partial = truncated;
  const turns: AgentTurnDetail[] = [];
  const shares = new Map<string, AgentWalletShare>();
  let hit = 0, miss = 0, comp = 0, total = 0, think = 0;
  let cost = 0, inputCost = 0, outputCost = 0, duration = 0;
  let primaryModel = '';
  let primaryConnection: HistoryConnection | null = null;
  let primaryWalletId: string | null = null;

  for (const key of turnKeys) {
    let turn: any = null;
    try {
      turn = await readModelTurn(runId, key.invocationId === ROOT_INVOCATION ? null : key.invocationId, key.round);
    } catch {
      turn = null;
    }
    if (!turn) { partial = true; continue; }

    const rawUsage = turn?.provider?.usage ?? null;
    const normalized = normalizeUsage(rawUsage);
    if (!normalized) { partial = true; continue; }

    const source = typeof turn?.provider?.source === 'string' ? turn.provider.source : null;
    const providerFormat = typeof turn?.provider?.format === 'string' ? turn.provider.format : null;
    const model = normalizeModel(String(turn?.provider?.model || primaryModel || 'unknown'));
    if (!primaryModel) primaryModel = model;

    const connection = await resolveTurnConnection(source, profileData);
    if (!primaryConnection) primaryConnection = connection;
    const wallet = walletFor(connection);
    if (!primaryWalletId) primaryWalletId = wallet?.id ?? null;

    const completedAt = eventTimestamp(events, 'model_completed', key.invocationId, key.round);
    const requestedAt = eventTimestamp(events, 'model_request_created', key.invocationId, key.round);
    const turnDuration = completedAt && requestedAt && completedAt > requestedAt ? completedAt - requestedAt : 0;
    const timestamp = completedAt || Date.now();

    const c = calcCost({
      timestamp,
      model,
      prompt_cache_hit_tokens: normalized.cache_hit_tokens,
      prompt_cache_miss_tokens: normalized.cache_miss_tokens,
      completion_tokens: normalized.completion_tokens,
    }, state.settings as any, wallet);

    hit += normalized.cache_hit_tokens;
    miss += normalized.cache_miss_tokens;
    comp += normalized.completion_tokens;
    total += normalized.total_tokens;
    think += normalized.think_tokens;
    cost += c.total;
    inputCost += c.input;
    outputCost += c.output;
    duration += turnDuration;

    turns.push({
      round: key.round,
      invocationId: key.invocationId,
      model,
      source,
      providerFormat,
      hit: normalized.cache_hit_tokens,
      miss: normalized.cache_miss_tokens,
      comp: normalized.completion_tokens,
      total: normalized.total_tokens,
      think: normalized.think_tokens,
      durationMs: turnDuration,
      timestamp,
      cost: c.total,
      inputCost: c.input,
      outputCost: c.output,
      priceType: c.priceType,
      pricingSource: c.source,
      walletId: wallet?.id ?? null,
      rawUsage,
    });

    const shareKey = wallet?.id ?? '__unassigned__';
    const existing = shares.get(shareKey);
    if (existing) {
      existing.hit += normalized.cache_hit_tokens;
      existing.miss += normalized.cache_miss_tokens;
      existing.comp += normalized.completion_tokens;
      existing.total += normalized.total_tokens;
      existing.cost += c.total;
      existing.inputCost += c.input;
      existing.outputCost += c.output;
    } else {
      shares.set(shareKey, {
        walletId: wallet?.id ?? null,
        timestamp,
        model,
        hit: normalized.cache_hit_tokens,
        miss: normalized.cache_miss_tokens,
        comp: normalized.completion_tokens,
        total: normalized.total_tokens,
        cost: c.total,
        inputCost: c.input,
        outputCost: c.output,
        priceType: c.priceType,
        pricingSource: c.source,
      });
    }
  }

  if (!turns.length) {
    log.debug('Agent Run 未取到任何 usage，不写入 ' + runId);
    return null;
  }

  const createdMs = Date.parse(String(summary?.createdAt || events[0]?.timestamp || ''));
  const timestamp = Number.isNaN(createdMs) ? Date.now() : createdMs;
  const terminalMs = Date.parse(String(summary?.terminalAt || summary?.updatedAt || ''));
  const lastCommit = [...events].reverse().find((event) => String(event?.type) === 'chat_commit_completed');
  const commitPayload = lastCommit ? eventPayload(lastCommit) : {};
  const messageIndex = Number.isFinite(Number(commitPayload?.messageIndex)) ? Number(commitPayload.messageIndex) : null;
  const committed = Boolean(lastCommit);
  const invocationCount = new Set(turns.map((turn) => turn.invocationId)).size;
  const status = terminalStatusOf(events, summary);
  const priceType = turns[0]?.priceType || 'old';
  const pricingSource = turns[0]?.pricingSource || 'unpriced';
  const shareList = Array.from(shares.values());

  return {
    agentRunId: runId,
    timestamp,
    model: primaryModel || 'unknown',
    hit,
    miss,
    comp,
    total,
    thinkTokens: think,
    cost,
    inputCost,
    outputCost,
    priceType,
    pricingSource,
    duration,
    walletId: primaryWalletId,
    walletShares: shareList,
    turns,
    connection: primaryConnection,
    chatId: currentChatId(),
    chatName: currentChatName(),
    status,
    profileId: profileId || (typeof summary?.profileId === 'string' ? summary.profileId : null),
    modelTurns: turns.length,
    invocationCount,
    stableChatId: typeof summary?.stableChatId === 'string' ? summary.stableChatId : null,
    messageIndex: messageIndex != null && Number.isFinite(messageIndex) ? messageIndex : null,
    generationType: typeof summary?.generationType === 'string' ? summary.generationType : null,
    committed,
    partial,
    wallClockMs: !Number.isNaN(terminalMs) && terminalMs > timestamp ? terminalMs - timestamp : 0,
    fullRequest: {
      mode: 'agent',
      model: primaryModel || 'unknown',
      source: turns[0]?.source || null,
      providerFormat: turns[0]?.providerFormat || null,
      model_turns: turns.length,
      invocations: invocationCount,
      endpoint: primaryConnection?.endpointLabel || null,
    },
  };
}

/** 采集并写入一个 Run（幂等：同一 runId 重复调用会 upsert 覆盖而非新增） */
export async function captureAgentRun(runId: string, summary?: AgentRunSummary): Promise<boolean> {
  if (!runId || recordedRuns.has(runId) || collectingRuns.has(runId)) return false;
  if (!isAgentChannelAvailable() || !switchOn()) return false;
  collectingRuns.add(runId);
  try {
    const input = await collectRun(runId, summary);
    if (!input) return false;
    const entry = await repository.addAgentRunEntry(input);
    if (!entry) return false;
    recordedRuns.add(runId);
    updateWatermark(input.stableChatId, summary?.createdAt || null);
    log.debug('Agent Run 已记录 ' + runId + ' turns=' + input.modelTurns + ' total=' + input.total);
    try { (globalThis as any).ApiUsageStat?.refreshUI?.(); } catch {}
    return true;
  } catch (e) {
    log.debug('Agent Run 采集失败 ' + runId + ' ' + ((e as any)?.message || e));
    return false;
  } finally {
    collectingRuns.delete(runId);
  }
}

// ---------------------------------------------------------------------------
// 对账
// ---------------------------------------------------------------------------

function readWatermarks(): Record<string, string> {
  try {
    const raw = localStorage.getItem(WATERMARK_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function updateWatermark(stableChatId: string | null, createdAt: string | null): void {
  if (!stableChatId || !createdAt) return;
  try {
    const marks = readWatermarks();
    const current = marks[stableChatId];
    if (!current || Date.parse(createdAt) > Date.parse(current)) {
      marks[stableChatId] = createdAt;
      localStorage.setItem(WATERMARK_KEY, JSON.stringify(marks));
    }
  } catch {}
}

export function hasRecordedAgentRun(runId: string): boolean {
  if (recordedRuns.has(runId)) return true;
  try {
    return (state.history || []).some((entry: any) => entry?.agentRunId === runId);
  } catch {
    return false;
  }
}

/**
 * 对账：补齐页面刷新、扩展关闭期间漏采的终态 Run。
 * 只读最近若干条，避免打开面板时产生 IPC 峰值。
 */
export async function reconcileAgentRuns(limit = MAX_RECONCILE_RUNS): Promise<number> {
  if (!isAgentChannelAvailable() || !switchOn()) return 0;
  try {
    const stableChatId = await getStableChatId();
    const runs = await listRuns({ stableChatId, limit: 20 });
    if (!runs.length) return 0;
    const marks = readWatermarks();
    const watermark = stableChatId ? Date.parse(marks[stableChatId] || '') : NaN;
    const firstRun = !Number.isFinite(watermark);
    let count = 0;
    for (const run of runs) {
      if (count >= limit) break;
      const runId = String(run?.runId || '');
      if (!runId) continue;
      if (!TERMINAL_STATUSES.has(String(run?.status || ''))) continue;
      if (hasRecordedAgentRun(runId)) continue;
      const created = Date.parse(String(run?.createdAt || ''));
      if (!firstRun && Number.isFinite(created) && Number.isFinite(watermark) && created <= watermark) break;
      if (await captureAgentRun(runId, run)) count += 1;
    }
    if (firstRun && runs[0]?.createdAt && stableChatId) {
      updateWatermark(stableChatId, String(runs[0].createdAt));
    }
    return count;
  } catch (e) {
    log.debug('Agent 对账失败 ' + ((e as any)?.message || e));
    return 0;
  }
}

function scheduleReconcile(delay = 2000): void {
  if (reconcileTimer) return;
  reconcileTimer = setTimeout(() => {
    reconcileTimer = null;
    void reconcileAgentRuns();
  }, delay);
}

// ---------------------------------------------------------------------------
// 安装 / 卸载
// ---------------------------------------------------------------------------

let generateAfterDataHandler: any = null;
let messageReceivedHandler: any = null;
let chatChangedHandler: any = null;
let appReadyHandler: any = null;

/** 安装 Agent 采集通道；宿主不支持时返回 false 并且不注册任何监听 */
export function initAgentUsage(): boolean {
  if (installed) return true;
  if (!isAgentChannelAvailable()) return false;
  try {
    const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
    const es = ctx?.eventSource;
    const et = ctx?.event_types;
    if (!es || !et) return false;

    generateAfterDataHandler = (data: any, dryRun?: boolean) => notifyGenerateAfterData(data, dryRun);
    messageReceivedHandler = (messageId?: number) => { void notifyMessageReceived(messageId); };
    chatChangedHandler = () => { clearPending(); cancelActiveRun(); scheduleReconcile(1500); };
    appReadyHandler = () => { scheduleReconcile(2500); };

    if (et.GENERATE_AFTER_DATA) es.on(et.GENERATE_AFTER_DATA, generateAfterDataHandler);
    if (et.MESSAGE_RECEIVED) es.on(et.MESSAGE_RECEIVED, messageReceivedHandler);
    if (et.CHAT_CHANGED) es.on(et.CHAT_CHANGED, chatChangedHandler);
    if (et.APP_READY) es.on(et.APP_READY, appReadyHandler);

    installed = true;
    scheduleReconcile(3000);
    log.debug('Agent 采集通道已安装');
    return true;
  } catch {
    return false;
  }
}

export function uninstallAgentUsage(): void {
  try {
    const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
    const es = ctx?.eventSource;
    const et = ctx?.event_types;
    if (es && et) {
      if (generateAfterDataHandler) try { es.off?.(et.GENERATE_AFTER_DATA, generateAfterDataHandler); } catch {}
      if (messageReceivedHandler) try { es.off?.(et.MESSAGE_RECEIVED, messageReceivedHandler); } catch {}
      if (chatChangedHandler) try { es.off?.(et.CHAT_CHANGED, chatChangedHandler); } catch {}
      if (appReadyHandler) try { es.off?.(et.APP_READY, appReadyHandler); } catch {}
    }
  } catch {}
  clearPending();
  cancelActiveRun();
  if (reconcileTimer) {
    try { clearTimeout(reconcileTimer); } catch {}
    reconcileTimer = null;
  }
  installed = false;
}

/** 打开面板时触发一次对账（上限 5 条，无额外 IPC 峰值） */
export function reconcileOnPanelOpen(): void {
  if (!isAgentChannelAvailable()) return;
  scheduleReconcile(600);
}

export { getAgentApi };
