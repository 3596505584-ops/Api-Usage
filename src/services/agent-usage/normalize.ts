/**
 * 用量归一化 —— 把各家 provider 的 usage 形状统一成扩展内部口径。
 *
 * 兼容来源：
 * - OpenAI / DeepSeek / 兼容中转：prompt_tokens / completion_tokens / prompt_cache_hit_tokens /
 *   prompt_cache_miss_tokens / prompt_tokens_details.cached_tokens
 * - OpenAI Responses：input_tokens / output_tokens / input_tokens_details.cached_tokens
 * - Anthropic Claude：input_tokens / output_tokens / cache_read_input_tokens / cache_creation_input_tokens
 * - Google Gemini：usageMetadata.promptTokenCount / candidatesTokenCount / cachedContentTokenCount
 *
 * TauriTavern 的 Agent 通道已经把多数 provider 归一成 OpenAI 形状（并写 prompt_tokens_details.cached_tokens），
 * 这里的实现对"已归一"和"原生形状"两种输入都成立，因此常规对话与 Agent 通道共用同一套映射，
 * 避免两处口径漂移。
 */

export type NormalizedUsage = {
  /** 输入总量 = 命中 + 未命中 */
  prompt_tokens: number;
  cache_hit_tokens: number;
  cache_miss_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  /** 思维链 token（provider 未提供时为 0，不做字符比例估算） */
  think_tokens: number;
};

/** 取第一个可用的有限数值；0 是有效值，undefined/null/NaN 才跳过 */
function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function positive(value: number | null): number {
  return value != null && value > 0 ? value : 0;
}

function isObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 归一化任意 provider 的 usage 对象。
 * 全部 token 都为 0 或输入不是对象时返回 null（调用方应跳过该次记录，不能写 0 token 污染条目）。
 */
export function normalizeUsage(raw: unknown): NormalizedUsage | null {
  if (!isObject(raw)) return null;
  let source: Record<string, any> = raw;
  // Gemini 会把 usage 包在 usageMetadata 里；同时兼容外层已含其它字段的形状
  if (isObject(source.usageMetadata)) source = { ...source, ...source.usageMetadata };

  const anthropic = firstNumber(source.cache_read_input_tokens, source.cache_creation_input_tokens) !== null;
  const gemini = firstNumber(source.promptTokenCount, source.candidatesTokenCount) !== null;

  const promptRaw = firstNumber(
    source.prompt_tokens,
    source.input_tokens,
    source.total_input_tokens,
    gemini ? source.promptTokenCount : undefined,
  );
  const completionRaw = firstNumber(
    source.completion_tokens,
    source.output_tokens,
    gemini ? source.candidatesTokenCount : undefined,
  );
  const hitRaw = firstNumber(
    source.prompt_cache_hit_tokens,
    source.cache_hit_tokens,
    source.prompt_tokens_details?.cached_tokens,
    source.input_tokens_details?.cached_tokens,
    source.cache_read_input_tokens,
    gemini ? source.cachedContentTokenCount : undefined,
    source.cached_tokens,
  );
  const missRaw = firstNumber(source.prompt_cache_miss_tokens, source.cache_miss_tokens);
  const totalRaw = firstNumber(source.total_tokens, source.totalTokenCount);
  const thinkRaw = firstNumber(
    source.completion_tokens_details?.reasoning_tokens,
    source.output_tokens_details?.reasoning_tokens,
    source.reasoning_tokens,
    source.thinking_tokens,
    source.thoughtsTokenCount,
  );

  const prompt = positive(promptRaw);
  const completion = positive(completionRaw);
  let hit = positive(hitRaw);
  let miss = missRaw != null && missRaw >= 0 ? missRaw : -1;

  if (miss < 0) {
    if (anthropic) {
      // Anthropic：input_tokens 只统计未缓存输入，缓存读/写单列
      const cacheCreate = positive(firstNumber(source.cache_creation_input_tokens));
      miss = prompt + cacheCreate;
    } else {
      miss = Math.max(0, prompt - hit);
    }
  }
  if (hit > prompt + miss && !anthropic && !gemini) {
    // 少数中转把 cached_tokens 重复计入 input_tokens，修正命中不超过输入
    hit = prompt + miss;
  }
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
    think_tokens: think,
  };
}

/**
 * 把归一化结果合成为扩展内部使用的 OpenAI 形状 usage 对象。
 * 原始 usage 挂在 __raw 上，供历史详情"Raw Usage"页签查看。
 */
export function toOpenAIUsage(normalized: NormalizedUsage, raw?: unknown): Record<string, any> {
  const usage: Record<string, any> = {
    prompt_tokens: normalized.prompt_tokens,
    completion_tokens: normalized.completion_tokens,
    total_tokens: normalized.total_tokens,
    prompt_cache_hit_tokens: normalized.cache_hit_tokens,
    prompt_cache_miss_tokens: normalized.cache_miss_tokens,
    __normalized: true,
  };
  if (normalized.cache_hit_tokens > 0) {
    usage.prompt_tokens_details = { cached_tokens: normalized.cache_hit_tokens };
  }
  if (normalized.think_tokens > 0) {
    usage.completion_tokens_details = { reasoning_tokens: normalized.think_tokens };
  }
  if (raw !== undefined) usage.__raw = raw;
  return usage;
}

/** 流式累计器：同一条 SSE 里 usage 可能分散在 message_start / message_delta / 末帧 */
export type StreamUsageState = {
  prompt: number;
  hit: number;
  completion: number;
  total: number;
  think: number;
  model: string | null;
  seen: boolean;
};

export function createStreamUsageState(): StreamUsageState {
  return { prompt: 0, hit: 0, completion: 0, total: 0, think: 0, model: null, seen: false };
}

function mergeInto(state: StreamUsageState, normalized: NormalizedUsage): void {
  // 各字段取最大值：Anthropic 的 output 在 message_delta 才补齐，OpenAI 只在末帧出现，
  // 取最大值对"只出现一次"和"多帧累计"两种情形都成立
  state.prompt = Math.max(state.prompt, normalized.cache_hit_tokens + normalized.cache_miss_tokens);
  state.hit = Math.max(state.hit, normalized.cache_hit_tokens);
  state.completion = Math.max(state.completion, normalized.completion_tokens);
  state.total = Math.max(state.total, normalized.total_tokens);
  state.think = Math.max(state.think, normalized.think_tokens);
  state.seen = true;
}

/** 从单个 SSE chunk 里提取 usage 并合并进累计器，返回是否命中 usage */
export function applyUsageChunk(state: StreamUsageState, chunk: any): boolean {
  if (!isObject(chunk)) return false;
  if (typeof chunk.model === 'string' && chunk.model) state.model = chunk.model;
  if (isObject(chunk.message) && typeof chunk.message.model === 'string' && chunk.message.model) {
    state.model = chunk.message.model;
  }
  if (typeof chunk.modelVersion === 'string' && chunk.modelVersion) state.model = chunk.modelVersion;

  const candidates = [
    chunk.usage,
    chunk.message?.usage,
    (chunk as any).usageMetadata,
    chunk.response?.usage,
    chunk.choices?.[0]?.usage,
  ];
  let hit = false;
  for (const candidate of candidates) {
    const normalized = normalizeUsage(candidate);
    if (!normalized) continue;
    mergeInto(state, normalized);
    hit = true;
  }
  return hit;
}

export function streamUsageToUsage(state: StreamUsageState, raw?: unknown): Record<string, any> | null {
  if (!state.seen) return null;
  const normalized: NormalizedUsage = {
    prompt_tokens: state.prompt,
    cache_hit_tokens: state.hit,
    cache_miss_tokens: Math.max(0, state.prompt - state.hit),
    completion_tokens: state.completion,
    total_tokens: Math.max(state.total, state.prompt + state.completion),
    think_tokens: state.think,
  };
  if (normalized.cache_hit_tokens + normalized.cache_miss_tokens + normalized.completion_tokens <= 0) return null;
  return toOpenAIUsage(normalized, raw);
}
