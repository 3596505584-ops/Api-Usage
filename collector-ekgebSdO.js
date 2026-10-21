import { r as state } from "./store-Cc2SGj8q.js";
import { t as log } from "./logger-8RGXnvfI.js";
import { M as buildEndpointContext, _ as normalizeModel, b as findWalletForConnection, d as calcCost, t as repository } from "./repository-BdeEwY0n.js";
//#region src/services/agent-usage/normalize.ts
/** 取第一个可用的有限数值；0 是有效值，undefined/null/NaN 才跳过 */
function firstNumber(...values) {
	for (const value of values) {
		if (typeof value === "number" && Number.isFinite(value)) return value;
		if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
	}
	return null;
}
function positive(value) {
	return value != null && value > 0 ? value : 0;
}
function isObject(value) {
	return !!value && typeof value === "object" && !Array.isArray(value);
}
/**
* 归一化任意 provider 的 usage 对象。
* 全部 token 都为 0 或输入不是对象时返回 null（调用方应跳过该次记录，不能写 0 token 污染条目）。
*/
function normalizeUsage(raw) {
	if (!isObject(raw)) return null;
	let source = raw;
	if (isObject(source.usageMetadata)) source = {
		...source,
		...source.usageMetadata
	};
	const anthropic = firstNumber(source.cache_read_input_tokens, source.cache_creation_input_tokens) !== null;
	const gemini = firstNumber(source.promptTokenCount, source.candidatesTokenCount) !== null;
	const promptRaw = firstNumber(source.prompt_tokens, source.input_tokens, source.total_input_tokens, gemini ? source.promptTokenCount : void 0);
	const completionRaw = firstNumber(source.completion_tokens, source.output_tokens, gemini ? source.candidatesTokenCount : void 0);
	const hitRaw = firstNumber(source.prompt_cache_hit_tokens, source.cache_hit_tokens, source.prompt_tokens_details?.cached_tokens, source.input_tokens_details?.cached_tokens, source.cache_read_input_tokens, gemini ? source.cachedContentTokenCount : void 0, source.cached_tokens);
	const missRaw = firstNumber(source.prompt_cache_miss_tokens, source.cache_miss_tokens);
	const totalRaw = firstNumber(source.total_tokens, source.totalTokenCount);
	const thinkRaw = firstNumber(source.completion_tokens_details?.reasoning_tokens, source.output_tokens_details?.reasoning_tokens, source.reasoning_tokens, source.thinking_tokens, source.thoughtsTokenCount);
	const prompt = positive(promptRaw);
	const completion = positive(completionRaw);
	let hit = positive(hitRaw);
	let miss = missRaw != null && missRaw >= 0 ? missRaw : -1;
	if (miss < 0) {
		if (anthropic) miss = prompt + positive(firstNumber(source.cache_creation_input_tokens));
		else miss = Math.max(0, prompt - hit);
	}
	if (hit > prompt + miss && !anthropic && !gemini) hit = prompt + miss;
	const promptTotal = Math.max(prompt, hit + miss);
	if (promptTotal > hit + miss) miss = promptTotal - hit;
	const computedTotal = hit + miss + completion;
	const total = Math.max(totalRaw != null && totalRaw > 0 ? totalRaw : 0, computedTotal);
	if (hit + miss + completion <= 0 && total <= 0) return null;
	const think = Math.min(positive(thinkRaw), completion > 0 ? completion : positive(thinkRaw));
	return {
		prompt_tokens: hit + miss,
		cache_hit_tokens: hit,
		cache_miss_tokens: miss,
		completion_tokens: completion,
		total_tokens: total,
		think_tokens: think
	};
}
//#endregion
//#region src/services/agent-usage/tt-agent-api.ts
function globalScope() {
	try {
		const win = typeof window !== "undefined" ? window : null;
		if (win?.__TAURITAVERN__) return win;
		if (win?.parent?.__TAURITAVERN__) return win.parent;
		if (win?.top?.__TAURITAVERN__) return win.top;
		const g = globalThis;
		if (g.__TAURITAVERN__) return { __TAURITAVERN__: g.__TAURITAVERN__ };
	} catch {}
	return null;
}
/** 宿主根门面（window.__TAURITAVERN__）；非 TauriTavern 返回 null */
function getTauriTavernRoot() {
	try {
		return globalScope()?.__TAURITAVERN__ || null;
	} catch {
		return null;
	}
}
function isTauriTavern() {
	return !!getTauriTavernRoot();
}
/** Agent ABI 是否可用：listRuns / readEvents 是采集的必要条件 */
function getAgentApi() {
	const agent = getTauriTavernRoot()?.api?.agent;
	if (!agent || typeof agent !== "object") return null;
	if (typeof agent.listRuns !== "function") return null;
	if (typeof agent.readEvents !== "function") return null;
	return agent;
}
function hasAgentSupport() {
	return !!getAgentApi();
}
/** 当前聊天的稳定 ID（重命名不变）；拿不到时返回 null */
async function getStableChatId() {
	const root = getTauriTavernRoot();
	try {
		const current = root?.api?.chat?.current;
		const handle = typeof current?.handle === "function" ? await current.handle() : current;
		if (!handle) return null;
		if (typeof handle === "string") return handle;
		if (typeof handle.stableId === "function") {
			const value = await handle.stableId();
			if (value) return String(value);
		}
		if (typeof handle.stableId === "string" && handle.stableId) return handle.stableId;
		if (typeof handle.stable_id === "string" && handle.stable_id) return handle.stable_id;
	} catch {}
	return null;
}
function normalizeRunList(result) {
	if (Array.isArray(result)) return result;
	if (Array.isArray(result?.runs)) return result.runs;
	if (Array.isArray(result?.items)) return result.items;
	return [];
}
/**
* 列出当前聊天的 Agent Run。
* 不同 TT 版本的入参名不一致（stableChatId / chatRef），因此按优先级逐个尝试。
*/
async function listRuns(options = {}) {
	const agent = getAgentApi();
	if (!agent) return [];
	const limit = Math.max(1, Math.min(50, Number(options.limit) || 5));
	const stableChatId = options.stableChatId || null;
	const variants = [];
	if (stableChatId) {
		variants.push({
			stableChatId,
			limit
		});
		variants.push({
			stableChatId,
			limit,
			includeTerminal: true
		});
		variants.push({
			chatRef: {
				kind: "character",
				stableId: stableChatId
			},
			limit
		});
		variants.push({
			chatRef: {
				kind: "character",
				stableChatId
			},
			limit
		});
	}
	variants.push({ limit });
	for (const params of variants) try {
		const runs = normalizeRunList(await agent.listRuns(params));
		if (runs.length) return runs;
	} catch {}
	return [];
}
/** 分页读取一个 Run 的全部事件；超过页上限时 truncated=true */
async function readAllEvents(runId, options = {}) {
	const agent = getAgentApi();
	if (!agent || !runId) return {
		events: [],
		truncated: false
	};
	const limit = Math.max(1, Math.min(500, Number(options.limit) || 500));
	const maxPages = Math.max(1, Math.min(20, Number(options.maxPages) || 20));
	const events = [];
	let afterSeq = 0;
	let truncated = false;
	for (let page = 0; page < maxPages; page += 1) {
		let result = null;
		try {
			result = await agent.readEvents({
				runId,
				afterSeq,
				limit
			});
		} catch {
			break;
		}
		const batch = Array.isArray(result) ? result : Array.isArray(result?.events) ? result.events : [];
		if (!batch.length) break;
		events.push(...batch);
		const maxSeq = batch.reduce((max, event) => Math.max(max, Number(event?.seq) || 0), afterSeq);
		if (batch.length < limit || maxSeq <= afterSeq) break;
		afterSeq = maxSeq;
		if (page === maxPages - 1) truncated = true;
	}
	return {
		events,
		truncated
	};
}
/** 读取单个模型回合的投影（provider.usage 是 Agent 用量的唯一出口） */
async function readModelTurn(runId, invocationId, round) {
	const agent = getAgentApi();
	if (!agent || typeof agent.readModelTurn !== "function" || !runId) return null;
	const params = {
		runId,
		round,
		maxChars: 1
	};
	if (invocationId) params.invocationId = invocationId;
	const attempts = [params];
	if (invocationId) {
		attempts.push({
			runId,
			round,
			maxChars: 1
		});
		attempts.push({
			runId,
			invocationId,
			round
		});
		attempts.push({
			runId,
			round
		});
	}
	for (const attempt of attempts) try {
		const turn = await agent.readModelTurn(attempt);
		if (turn && typeof turn === "object") return turn;
	} catch {}
	return null;
}
/** 订阅 Run 事件流，返回取消函数（宿主不支持时返回空函数） */
async function subscribeRun(runId, handler, options = {}) {
	const agent = getAgentApi();
	if (!agent || typeof agent.subscribe !== "function" || !runId) return () => {};
	try {
		const handle = await agent.subscribe(runId, handler, {
			afterSeq: Number(options.afterSeq) || 0,
			intervalMs: Number(options.intervalMs) || 1200
		});
		if (typeof handle === "function") return handle;
		if (handle && typeof handle.unsubscribe === "function") return () => {
			try {
				handle.unsubscribe();
			} catch {}
		};
		return () => {};
	} catch {
		return () => {};
	}
}
/** 加载 Agent Profile（用于连接 / 模型解析） */
async function loadProfile(profileId) {
	const agent = getAgentApi();
	if (!agent || typeof agent.profiles?.load !== "function" || !profileId) return null;
	try {
		const profile = await agent.profiles.load({ profileId });
		return profile && typeof profile === "object" ? profile : null;
	} catch {
		return null;
	}
}
/** 加载 LLM 连接配置（connectionRef 模式） */
async function loadLlmConnection(connectionId) {
	const api = getTauriTavernRoot()?.api?.llmConnections;
	if (!api || typeof api.load !== "function" || !connectionId) return null;
	try {
		const connection = await api.load({ connectionId });
		return connection && typeof connection === "object" ? connection : null;
	} catch {
		return null;
	}
}
//#endregion
//#region src/services/agent-usage/collector.ts
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
var TERMINAL_STATUSES = /* @__PURE__ */ new Set([
	"completed",
	"partial_success",
	"cancelled",
	"failed"
]);
var ROOT_INVOCATION = "root";
var PENDING_POLL_INTERVAL_MS = 1500;
var PENDING_POLL_TIMEOUT_MS = 15e3;
var RUN_SUBSCRIBE_TIMEOUT_MS = 6e5;
var MAX_TURNS_PER_RUN = 100;
var MAX_RECONCILE_RUNS = 5;
var WATERMARK_KEY = "aus_agent_watermark_v1";
/** 应急逃生阀：localStorage.setItem('aus_agent_capture','0') 可整体关闭 Agent 采集 */
var SWITCH_KEY = "aus_agent_capture";
var recordedRuns = /* @__PURE__ */ new Set();
var collectingRuns = /* @__PURE__ */ new Set();
var installed = false;
var agentPending = false;
var pendingSince = 0;
var pendingTimer = null;
var pendingDeadline = 0;
var activeUnsubscribe = null;
var activeRunId = null;
var reconcileTimer = null;
function switchOn() {
	try {
		return localStorage.getItem(SWITCH_KEY) !== "0";
	} catch {
		return true;
	}
}
/** Agent 通道是否可用（无 TauriTavern 或 ABI 不符时返回 false，上层完全降级） */
function isAgentChannelAvailable() {
	try {
		return isTauriTavern() && hasAgentSupport();
	} catch {
		return false;
	}
}
function pendingExpired() {
	return agentPending && pendingDeadline > 0 && Date.now() > pendingDeadline;
}
/** 由 GENERATE_AFTER_DATA 调用：仅 Agent 模式会带 frozenRunInputSnapshot */
function notifyGenerateAfterData(data, dryRun) {
	try {
		if (dryRun === true) return;
		if (!data || typeof data !== "object") return;
		if (!Object.prototype.hasOwnProperty.call(data, "frozenRunInputSnapshot")) return;
		markPending();
	} catch {}
}
function markPending() {
	agentPending = true;
	pendingSince = Date.now();
	pendingDeadline = pendingSince + PENDING_POLL_TIMEOUT_MS;
	if (pendingTimer) return;
	log.debug("Agent 模式生成开始，等待 Run 落库");
	pendingTimer = setInterval(() => {
		pollPendingRun();
	}, PENDING_POLL_INTERVAL_MS);
}
function clearPending() {
	agentPending = false;
	pendingSince = 0;
	pendingDeadline = 0;
	if (pendingTimer) {
		try {
			clearInterval(pendingTimer);
		} catch {}
		pendingTimer = null;
	}
}
/** pending 短轮询：捕获"失败且未提交到聊天"的 Run（未提交时不会触发 MESSAGE_RECEIVED） */
async function pollPendingRun() {
	if (!agentPending) return;
	try {
		if (pendingExpired()) {
			clearPending();
			return;
		}
		const fresh = (await listRuns({
			stableChatId: await getStableChatId(),
			limit: 5
		})).find((run) => {
			const created = Date.parse(String(run?.createdAt || ""));
			return !Number.isNaN(created) && created >= pendingSince - 2e3;
		});
		if (!fresh?.runId) return;
		clearPending();
		await trackRun(String(fresh.runId), fresh);
	} catch (e) {
		log.debug("Agent pending 轮询失败 " + (e?.message || e));
	}
}
/** 订阅 Run 直到终态，再采集；非终态则等待事件 */
async function trackRun(runId, summary) {
	if (TERMINAL_STATUSES.has(String(summary?.status || ""))) {
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
		await captureAgentRun(runId, await findRunSummary(runId) || summary);
	};
	activeUnsubscribe = await subscribeRun(runId, (event) => {
		const type = String(event?.type || "");
		if (TERMINAL_STATUSES.has(type.replace(/^run_/, ""))) finish();
	}, {
		afterSeq: 0,
		intervalMs: 1200
	});
	setTimeout(() => {
		finish();
	}, RUN_SUBSCRIBE_TIMEOUT_MS);
}
function cancelActiveRun() {
	if (activeUnsubscribe) {
		try {
			activeUnsubscribe();
		} catch {}
		activeUnsubscribe = null;
	}
	activeRunId = null;
}
async function findRunSummary(runId) {
	try {
		return (await listRuns({
			stableChatId: await getStableChatId(),
			limit: 20
		})).find((run) => String(run?.runId || "") === runId) || null;
	} catch {
		return null;
	}
}
/** 从聊天消息的 extra 中取 Agent 标记（来源判定的权威依据） */
function extractAgentRunId(message) {
	try {
		const runId = message?.extra?.tauritavern?.agent?.runId;
		return typeof runId === "string" && runId.trim() ? runId.trim() : null;
	} catch {
		return null;
	}
}
/** MESSAGE_RECEIVED 入口：Agent 提交消息后必然带 runId */
async function notifyMessageReceived(messageId) {
	try {
		const chat = (globalThis.SillyTavern?.getContext?.())?.chat || [];
		const runId = extractAgentRunId(chat[typeof messageId === "number" ? messageId : chat.length - 1] || chat[chat.length - 1]);
		if (!runId) return;
		clearPending();
		const summary = await findRunSummary(runId);
		if (summary && !TERMINAL_STATUSES.has(String(summary.status || ""))) {
			await trackRun(runId, summary);
			return;
		}
		await captureAgentRun(runId, summary || void 0);
	} catch (e) {
		log.debug("Agent 消息采集失败 " + (e?.message || e));
	}
}
function eventPayload(event) {
	return event?.payload && typeof event.payload === "object" ? event.payload : {};
}
function collectTurnKeys(events) {
	const seen = /* @__PURE__ */ new Set();
	const keys = [];
	for (const event of events) {
		if (String(event?.type || "") !== "model_completed") continue;
		const payload = eventPayload(event);
		const round = Number(payload.round);
		if (!Number.isFinite(round) || round <= 0) continue;
		const invocationId = String(payload.invocationId || ROOT_INVOCATION);
		const key = invocationId + "|" + round;
		if (seen.has(key)) continue;
		seen.add(key);
		keys.push({
			invocationId,
			round
		});
	}
	return keys.sort((a, b) => a.round - b.round || a.invocationId.localeCompare(b.invocationId));
}
function eventTimestamp(events, type, invocationId, round) {
	for (const event of events) {
		if (String(event?.type || "") !== type) continue;
		const payload = eventPayload(event);
		if (Number(payload.round) !== round) continue;
		if (String(payload.invocationId || ROOT_INVOCATION) !== invocationId) continue;
		const ms = Date.parse(String(event?.timestamp || ""));
		if (!Number.isNaN(ms)) return ms;
	}
	return 0;
}
function terminalStatusOf(events, summary) {
	const summaryStatus = String(summary?.status || "");
	if (TERMINAL_STATUSES.has(summaryStatus)) return summaryStatus;
	for (let i = events.length - 1; i >= 0; i -= 1) {
		const mapped = String(events[i]?.type || "").replace(/^run_/, "");
		if (TERMINAL_STATUSES.has(mapped)) return mapped;
	}
	return "completed";
}
/** 用 Profile / 当前设置解析接入身份；只取 endpoint，不映射活动密钥（Agent 密钥由 Profile 决定） */
async function resolveTurnConnection(source, profile) {
	let chatCompletionSource = source;
	let baseUrl = "";
	try {
		const model = profile?.model;
		if (model && model.mode === "connectionRef" && model.connectionRef) {
			const connection = await loadLlmConnection(String(model.connectionRef));
			const candidateSource = connection?.chatCompletionSource || connection?.source || connection?.provider;
			if (typeof candidateSource === "string" && candidateSource.trim()) chatCompletionSource = candidateSource.trim();
			const endpoint = connection?.endpoint?.baseUrl || connection?.baseUrl || connection?.endpoint?.url;
			if (typeof endpoint === "string" && endpoint.trim()) baseUrl = endpoint.trim();
		}
	} catch {}
	if (!chatCompletionSource) try {
		const settings = (globalThis.SillyTavern?.getContext?.())?.chatCompletionSettings || globalThis.oai_settings || {};
		const fallback = settings?.chat_completion_source;
		if (typeof fallback === "string" && fallback.trim()) chatCompletionSource = fallback.trim();
		const fallbackUrl = settings?.custom_url || settings?.reverse_proxy;
		if (!baseUrl && typeof fallbackUrl === "string") baseUrl = fallbackUrl.trim();
	} catch {}
	if (!chatCompletionSource && !baseUrl) return null;
	return {
		...buildEndpointContext({
			chat_completion_source: chatCompletionSource || void 0,
			custom_url: baseUrl || void 0
		}),
		credentialId: null,
		credentialLabel: null
	};
}
function walletFor(connection) {
	try {
		return findWalletForConnection(state.wallets, connection);
	} catch {
		return null;
	}
}
function currentChatId() {
	try {
		const id = (globalThis.SillyTavern?.getContext?.())?.getCurrentChatId?.();
		if (typeof id === "string" && id) return id;
	} catch {}
	return null;
}
function currentChatName() {
	try {
		const ctx = globalThis.SillyTavern?.getContext?.();
		const characters = ctx?.characters;
		const index = ctx?.characterId ?? globalThis.this_chid;
		const name = characters?.[index]?.name;
		if (typeof name === "string" && name) return name;
	} catch {}
	return null;
}
/** 采集一个 Run：逐回合读取 usage → 逐回合计价 → 聚合为一条历史 */
async function collectRun(runId, summary) {
	const { events, truncated } = await readAllEvents(runId);
	if (!events.length) {
		log.debug("Agent Run 无事件，跳过 " + runId);
		return null;
	}
	const turnKeys = collectTurnKeys(events).slice(0, MAX_TURNS_PER_RUN);
	if (!turnKeys.length) {
		log.debug("Agent Run 无模型回合，跳过 " + runId);
		return null;
	}
	const profileId = String(summary?.profileId || eventPayload(events.find((event) => String(event?.type) === "profile_resolved") || {})?.profileId || "").trim() || null;
	const profile = profileId ? await loadProfile(profileId) : null;
	const profileData = profile?.profile ?? profile;
	let partial = truncated;
	const turns = [];
	const shares = /* @__PURE__ */ new Map();
	let hit = 0, miss = 0, comp = 0, total = 0, think = 0;
	let cost = 0, inputCost = 0, outputCost = 0, duration = 0;
	let primaryModel = "";
	let primaryConnection = null;
	let primaryWalletId = null;
	for (const key of turnKeys) {
		let turn = null;
		try {
			turn = await readModelTurn(runId, key.invocationId === ROOT_INVOCATION ? null : key.invocationId, key.round);
		} catch {
			turn = null;
		}
		if (!turn) {
			partial = true;
			continue;
		}
		const rawUsage = turn?.provider?.usage ?? null;
		const normalized = normalizeUsage(rawUsage);
		if (!normalized) {
			partial = true;
			continue;
		}
		const source = typeof turn?.provider?.source === "string" ? turn.provider.source : null;
		const providerFormat = typeof turn?.provider?.format === "string" ? turn.provider.format : null;
		const model = normalizeModel(String(turn?.provider?.model || primaryModel || "unknown"));
		if (!primaryModel) primaryModel = model;
		const connection = await resolveTurnConnection(source, profileData);
		if (!primaryConnection) primaryConnection = connection;
		const wallet = walletFor(connection);
		if (!primaryWalletId) primaryWalletId = wallet?.id ?? null;
		const completedAt = eventTimestamp(events, "model_completed", key.invocationId, key.round);
		const requestedAt = eventTimestamp(events, "model_request_created", key.invocationId, key.round);
		const turnDuration = completedAt && requestedAt && completedAt > requestedAt ? completedAt - requestedAt : 0;
		const timestamp = completedAt || Date.now();
		const c = calcCost({
			timestamp,
			model,
			prompt_cache_hit_tokens: normalized.cache_hit_tokens,
			prompt_cache_miss_tokens: normalized.cache_miss_tokens,
			completion_tokens: normalized.completion_tokens
		}, state.settings, wallet);
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
			rawUsage
		});
		const shareKey = wallet?.id ?? "__unassigned__";
		const existing = shares.get(shareKey);
		if (existing) {
			existing.hit += normalized.cache_hit_tokens;
			existing.miss += normalized.cache_miss_tokens;
			existing.comp += normalized.completion_tokens;
			existing.total += normalized.total_tokens;
			existing.cost += c.total;
			existing.inputCost += c.input;
			existing.outputCost += c.output;
		} else shares.set(shareKey, {
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
			pricingSource: c.source
		});
	}
	if (!turns.length) {
		log.debug("Agent Run 未取到任何 usage，不写入 " + runId);
		return null;
	}
	const createdMs = Date.parse(String(summary?.createdAt || events[0]?.timestamp || ""));
	const timestamp = Number.isNaN(createdMs) ? Date.now() : createdMs;
	const terminalMs = Date.parse(String(summary?.terminalAt || summary?.updatedAt || ""));
	const lastCommit = [...events].reverse().find((event) => String(event?.type) === "chat_commit_completed");
	const commitPayload = lastCommit ? eventPayload(lastCommit) : {};
	const messageIndex = Number.isFinite(Number(commitPayload?.messageIndex)) ? Number(commitPayload.messageIndex) : null;
	const committed = Boolean(lastCommit);
	const invocationCount = new Set(turns.map((turn) => turn.invocationId)).size;
	const status = terminalStatusOf(events, summary);
	const priceType = turns[0]?.priceType || "old";
	const pricingSource = turns[0]?.pricingSource || "unpriced";
	const shareList = Array.from(shares.values());
	return {
		agentRunId: runId,
		timestamp,
		model: primaryModel || "unknown",
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
		profileId: profileId || (typeof summary?.profileId === "string" ? summary.profileId : null),
		modelTurns: turns.length,
		invocationCount,
		stableChatId: typeof summary?.stableChatId === "string" ? summary.stableChatId : null,
		messageIndex: messageIndex != null && Number.isFinite(messageIndex) ? messageIndex : null,
		generationType: typeof summary?.generationType === "string" ? summary.generationType : null,
		committed,
		partial,
		wallClockMs: !Number.isNaN(terminalMs) && terminalMs > timestamp ? terminalMs - timestamp : 0,
		fullRequest: {
			mode: "agent",
			model: primaryModel || "unknown",
			source: turns[0]?.source || null,
			providerFormat: turns[0]?.providerFormat || null,
			model_turns: turns.length,
			invocations: invocationCount,
			endpoint: primaryConnection?.endpointLabel || null
		}
	};
}
/** 采集并写入一个 Run（幂等：同一 runId 重复调用会 upsert 覆盖而非新增） */
async function captureAgentRun(runId, summary) {
	if (!runId || recordedRuns.has(runId) || collectingRuns.has(runId)) return false;
	if (!isAgentChannelAvailable() || !switchOn()) return false;
	collectingRuns.add(runId);
	try {
		const input = await collectRun(runId, summary);
		if (!input) return false;
		if (!await repository.addAgentRunEntry(input)) return false;
		recordedRuns.add(runId);
		updateWatermark(input.stableChatId, summary?.createdAt || null);
		log.debug("Agent Run 已记录 " + runId + " turns=" + input.modelTurns + " total=" + input.total);
		try {
			globalThis.ApiUsageStat?.refreshUI?.();
		} catch {}
		return true;
	} catch (e) {
		log.debug("Agent Run 采集失败 " + runId + " " + (e?.message || e));
		return false;
	} finally {
		collectingRuns.delete(runId);
	}
}
function readWatermarks() {
	try {
		const raw = localStorage.getItem(WATERMARK_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}
function updateWatermark(stableChatId, createdAt) {
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
function hasRecordedAgentRun(runId) {
	if (recordedRuns.has(runId)) return true;
	try {
		return (state.history || []).some((entry) => entry?.agentRunId === runId);
	} catch {
		return false;
	}
}
/**
* 对账：补齐页面刷新、扩展关闭期间漏采的终态 Run。
* 只读最近若干条，避免打开面板时产生 IPC 峰值。
*/
async function reconcileAgentRuns(limit = MAX_RECONCILE_RUNS) {
	if (!isAgentChannelAvailable() || !switchOn()) return 0;
	try {
		const stableChatId = await getStableChatId();
		const runs = await listRuns({
			stableChatId,
			limit: 20
		});
		if (!runs.length) return 0;
		const marks = readWatermarks();
		const watermark = stableChatId ? Date.parse(marks[stableChatId] || "") : NaN;
		const firstRun = !Number.isFinite(watermark);
		let count = 0;
		for (const run of runs) {
			if (count >= limit) break;
			const runId = String(run?.runId || "");
			if (!runId) continue;
			if (!TERMINAL_STATUSES.has(String(run?.status || ""))) continue;
			if (hasRecordedAgentRun(runId)) continue;
			const created = Date.parse(String(run?.createdAt || ""));
			if (!firstRun && Number.isFinite(created) && Number.isFinite(watermark) && created <= watermark) break;
			if (await captureAgentRun(runId, run)) count += 1;
		}
		if (firstRun && runs[0]?.createdAt && stableChatId) updateWatermark(stableChatId, String(runs[0].createdAt));
		return count;
	} catch (e) {
		log.debug("Agent 对账失败 " + (e?.message || e));
		return 0;
	}
}
function scheduleReconcile(delay = 2e3) {
	if (reconcileTimer) return;
	reconcileTimer = setTimeout(() => {
		reconcileTimer = null;
		reconcileAgentRuns();
	}, delay);
}
var generateAfterDataHandler = null;
var messageReceivedHandler = null;
var chatChangedHandler = null;
var appReadyHandler = null;
/** 安装 Agent 采集通道；宿主不支持时返回 false 并且不注册任何监听 */
function initAgentUsage() {
	if (installed) return true;
	if (!isAgentChannelAvailable()) return false;
	try {
		const ctx = globalThis.SillyTavern?.getContext?.();
		const es = ctx?.eventSource;
		const et = ctx?.event_types;
		if (!es || !et) return false;
		generateAfterDataHandler = (data, dryRun) => notifyGenerateAfterData(data, dryRun);
		messageReceivedHandler = (messageId) => {
			notifyMessageReceived(messageId);
		};
		chatChangedHandler = () => {
			clearPending();
			cancelActiveRun();
			scheduleReconcile(1500);
		};
		appReadyHandler = () => {
			scheduleReconcile(2500);
		};
		if (et.GENERATE_AFTER_DATA) es.on(et.GENERATE_AFTER_DATA, generateAfterDataHandler);
		if (et.MESSAGE_RECEIVED) es.on(et.MESSAGE_RECEIVED, messageReceivedHandler);
		if (et.CHAT_CHANGED) es.on(et.CHAT_CHANGED, chatChangedHandler);
		if (et.APP_READY) es.on(et.APP_READY, appReadyHandler);
		installed = true;
		scheduleReconcile(3e3);
		log.debug("Agent 采集通道已安装");
		return true;
	} catch {
		return false;
	}
}
function uninstallAgentUsage() {
	try {
		const ctx = globalThis.SillyTavern?.getContext?.();
		const es = ctx?.eventSource;
		const et = ctx?.event_types;
		if (es && et) {
			if (generateAfterDataHandler) try {
				es.off?.(et.GENERATE_AFTER_DATA, generateAfterDataHandler);
			} catch {}
			if (messageReceivedHandler) try {
				es.off?.(et.MESSAGE_RECEIVED, messageReceivedHandler);
			} catch {}
			if (chatChangedHandler) try {
				es.off?.(et.CHAT_CHANGED, chatChangedHandler);
			} catch {}
			if (appReadyHandler) try {
				es.off?.(et.APP_READY, appReadyHandler);
			} catch {}
		}
	} catch {}
	clearPending();
	cancelActiveRun();
	if (reconcileTimer) {
		try {
			clearTimeout(reconcileTimer);
		} catch {}
		reconcileTimer = null;
	}
	installed = false;
}
/** 打开面板时触发一次对账（上限 5 条，无额外 IPC 峰值） */
function reconcileOnPanelOpen() {
	if (!isAgentChannelAvailable()) return;
	scheduleReconcile(600);
}
//#endregion
export { initAgentUsage, reconcileOnPanelOpen, uninstallAgentUsage };
