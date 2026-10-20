/**
 * TauriTavern ABI 适配层 —— 只在这里接触宿主门面，所有调用都做能力检测与 try/catch。
 *
 * 设计约束：
 * - 宿主 API 属"Project Contract"（会演进），因此这里不允许抛出异常、不允许假设字段必存在；
 * - 上游 SillyTavern（无 __TAURITAVERN__）在此层全部返回 null / 空数组，上层自动降级；
 * - 不注入宿主内部模块、不读工作区文件、不依赖 __TAURI_INTERNALS__。
 */

export type AgentRunSummary = {
  runId?: string;
  status?: string;
  createdAt?: string;
  terminalAt?: string;
  updatedAt?: string;
  workspaceId?: string;
  stableChatId?: string;
  generationType?: string;
  committedMessage?: { messageIndex?: number; messageId?: string } | null;
  profileId?: string | null;
  [key: string]: any;
};

function globalScope(): any {
  try {
    const win: any = typeof window !== 'undefined' ? window : null;
    if (win?.__TAURITAVERN__) return win;
    if (win?.parent?.__TAURITAVERN__) return win.parent;
    if (win?.top?.__TAURITAVERN__) return win.top;
    const g: any = globalThis as any;
    if (g.__TAURITAVERN__) return { __TAURITAVERN__: g.__TAURITAVERN__ };
  } catch {}
  return null;
}

/** 宿主根门面（window.__TAURITAVERN__）；非 TauriTavern 返回 null */
export function getTauriTavernRoot(): any {
  try {
    const scope = globalScope();
    return scope?.__TAURITAVERN__ || null;
  } catch {
    return null;
  }
}

export function isTauriTavern(): boolean {
  return !!getTauriTavernRoot();
}

/** Agent ABI 是否可用：listRuns / readEvents 是采集的必要条件 */
export function getAgentApi(): any {
  const root = getTauriTavernRoot();
  const agent = root?.api?.agent;
  if (!agent || typeof agent !== 'object') return null;
  if (typeof agent.listRuns !== 'function') return null;
  if (typeof agent.readEvents !== 'function') return null;
  return agent;
}

export function hasAgentSupport(): boolean {
  return !!getAgentApi();
}

/** 等待宿主就绪（主门面可能在扩展加载后才挂载） */
export async function waitForTauriTavern(timeoutMs = 4000): Promise<any> {
  const immediate = getTauriTavernRoot();
  if (immediate?.api?.agent) return immediate;
  try {
    const win: any = typeof window !== 'undefined' ? window : null;
    const ready = win?.__TAURITAVERN_MAIN_READY__ || immediate?.ready;
    if (ready && typeof ready.then === 'function') {
      await Promise.race([ready, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
    }
  } catch {}
  if (getTauriTavernRoot()?.api?.agent) return getTauriTavernRoot();
  const deadline = Date.now() + Math.max(0, timeoutMs);
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (getTauriTavernRoot()?.api?.agent) return getTauriTavernRoot();
  }
  return getTauriTavernRoot();
}

/** 当前聊天的稳定 ID（重命名不变）；拿不到时返回 null */
export async function getStableChatId(): Promise<string | null> {
  const root = getTauriTavernRoot();
  try {
    const current = root?.api?.chat?.current;
    const handle = typeof current?.handle === 'function' ? await current.handle() : current;
    if (!handle) return null;
    if (typeof handle === 'string') return handle;
    if (typeof handle.stableId === 'function') {
      const value = await handle.stableId();
      if (value) return String(value);
    }
    if (typeof handle.stableId === 'string' && handle.stableId) return handle.stableId;
    if (typeof handle.stable_id === 'string' && handle.stable_id) return handle.stable_id;
  } catch {}
  return null;
}

function normalizeRunList(result: any): AgentRunSummary[] {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.runs)) return result.runs;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

/**
 * 列出当前聊天的 Agent Run。
 * 不同 TT 版本的入参名不一致（stableChatId / chatRef），因此按优先级逐个尝试。
 */
export async function listRuns(options: { stableChatId?: string | null; limit?: number } = {}): Promise<AgentRunSummary[]> {
  const agent = getAgentApi();
  if (!agent) return [];
  const limit = Math.max(1, Math.min(50, Number(options.limit) || 5));
  const stableChatId = options.stableChatId || null;
  const variants: any[] = [];
  if (stableChatId) {
    variants.push({ stableChatId, limit });
    variants.push({ stableChatId, limit, includeTerminal: true });
    variants.push({ chatRef: { kind: 'character', stableId: stableChatId }, limit });
    variants.push({ chatRef: { kind: 'character', stableChatId }, limit });
  }
  variants.push({ limit });
  for (const params of variants) {
    try {
      const runs = normalizeRunList(await agent.listRuns(params));
      if (runs.length) return runs;
    } catch {}
  }
  return [];
}

/** 分页读取一个 Run 的全部事件；超过页上限时 truncated=true */
export async function readAllEvents(
  runId: string,
  options: { limit?: number; maxPages?: number } = {},
): Promise<{ events: any[]; truncated: boolean }> {
  const agent = getAgentApi();
  if (!agent || !runId) return { events: [], truncated: false };
  const limit = Math.max(1, Math.min(500, Number(options.limit) || 500));
  const maxPages = Math.max(1, Math.min(20, Number(options.maxPages) || 20));
  const events: any[] = [];
  let afterSeq = 0;
  let truncated = false;
  for (let page = 0; page < maxPages; page += 1) {
    let result: any = null;
    try {
      result = await agent.readEvents({ runId, afterSeq, limit });
    } catch {
      break;
    }
    const batch = Array.isArray(result) ? result : (Array.isArray(result?.events) ? result.events : []);
    if (!batch.length) break;
    events.push(...batch);
    const maxSeq = batch.reduce((max: number, event: any) => Math.max(max, Number(event?.seq) || 0), afterSeq);
    if (batch.length < limit || maxSeq <= afterSeq) break;
    afterSeq = maxSeq;
    if (page === maxPages - 1) truncated = true;
  }
  return { events, truncated };
}

/** 读取单个模型回合的投影（provider.usage 是 Agent 用量的唯一出口） */
export async function readModelTurn(
  runId: string,
  invocationId: string | null,
  round: number,
): Promise<any | null> {
  const agent = getAgentApi();
  if (!agent || typeof agent.readModelTurn !== 'function' || !runId) return null;
  const params: any = { runId, round, maxChars: 1 };
  if (invocationId) params.invocationId = invocationId;
  const attempts: any[] = [params];
  if (invocationId) {
    // 根 Agent 的调用可能不接受 invocationId
    attempts.push({ runId, round, maxChars: 1 });
    attempts.push({ runId, invocationId, round });
    attempts.push({ runId, round });
  }
  for (const attempt of attempts) {
    try {
      const turn = await agent.readModelTurn(attempt);
      if (turn && typeof turn === 'object') return turn;
    } catch {}
  }
  return null;
}

/** 订阅 Run 事件流，返回取消函数（宿主不支持时返回空函数） */
export async function subscribeRun(
  runId: string,
  handler: (event: any) => void,
  options: { afterSeq?: number; intervalMs?: number } = {},
): Promise<() => void> {
  const agent = getAgentApi();
  if (!agent || typeof agent.subscribe !== 'function' || !runId) return () => {};
  try {
    const handle = await agent.subscribe(runId, handler, {
      afterSeq: Number(options.afterSeq) || 0,
      intervalMs: Number(options.intervalMs) || 1200,
    });
    if (typeof handle === 'function') return handle as () => void;
    if (handle && typeof handle.unsubscribe === 'function') return () => { try { handle.unsubscribe(); } catch {} };
    return () => {};
  } catch {
    return () => {};
  }
}

/** 加载 Agent Profile（用于连接 / 模型解析） */
export async function loadProfile(profileId: string | null): Promise<any | null> {
  const agent = getAgentApi();
  if (!agent || typeof agent.profiles?.load !== 'function' || !profileId) return null;
  try {
    const profile = await agent.profiles.load({ profileId });
    return profile && typeof profile === 'object' ? profile : null;
  } catch {
    return null;
  }
}

/** 加载 LLM 连接配置（connectionRef 模式） */
export async function loadLlmConnection(connectionId: string | null): Promise<any | null> {
  const root = getTauriTavernRoot();
  const api = root?.api?.llmConnections;
  if (!api || typeof api.load !== 'function' || !connectionId) return null;
  try {
    const connection = await api.load({ connectionId });
    return connection && typeof connection === 'object' ? connection : null;
  } catch {
    return null;
  }
}
