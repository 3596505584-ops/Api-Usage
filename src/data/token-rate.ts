/**
 * 输出速率口径（单一来源）
 *
 * 速率 = 输出 Token / 生成阶段耗时（duration - ttft）。
 * 非流式或假流式请求（上游一次性返回全文）会让 duration - ttft 塌缩到几百毫秒，
 * 从而算出上千 t/s 的假速率，因此这里统一做两道防护：
 *   1. streamed === false 直接判定不可测，速率与 TTFT 均不参与统计；
 *   2. 数值兜底：生成阶段窗口过短，或结果超过 MAX_PLAUSIBLE_RATE，一律归 0。
 */

/** 速率上限（t/s）；超过视为异常数据 */
export const MAX_PLAUSIBLE_RATE = 1000;

/** 生成阶段最小窗口（ms）；低于此值无法得到有意义的速率 */
export const MIN_OUTPUT_WINDOW_MS = 200;

/**
 * 清洗历史遗留的速率：非有限值或超过上限一律归 0。
 * 用于 hydrate 迁移与导入数据清洗。
 */
export function sanitizeRate(rate: unknown): number {
  const value = typeof rate === 'number' ? rate : parseFloat(String(rate));
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > MAX_PLAUSIBLE_RATE) return 0;
  return Math.round(value);
}

/**
 * 计算输出速率（t/s）。
 * @param duration 整轮耗时（ms）
 * @param ttft 首字延迟（ms）
 * @param completionTokens 输出 Token 数
 * @param streamed 是否为真实流式；false 表示非流式/假流式，速率不可测
 */
export function computeTokenRate(opts: {
  duration: number;
  ttft: number;
  completionTokens: number;
  streamed?: boolean | null;
}): number {
  const { duration, ttft, completionTokens, streamed } = opts;
  if (streamed === false) return 0;
  const dur = Number.isFinite(duration) ? duration : 0;
  const first = Number.isFinite(ttft) ? ttft : 0;
  const comp = Number.isFinite(completionTokens) ? completionTokens : 0;
  if (dur <= 0 || comp <= 0) return 0;
  // TTFT 不可信（非流式）时不参与速率与首字延迟统计
  if (first <= 0) return 0;
  const window = dur - first;
  if (window < MIN_OUTPUT_WINDOW_MS) return 0;
  return sanitizeRate((comp / window) * 1000);
}

/**
 * 迁移清洗：把一次性返回造成的异常速率与失真 TTFT 归零。
 * @returns 是否有条目被修改
 */
export function sanitizeHistoryTiming(entry: any): boolean {
  if (!entry || typeof entry !== 'object') return false;
  let changed = false;
  const rate = entry.tokenRate;
  if (typeof rate === 'number' && Number.isFinite(rate) && (rate > MAX_PLAUSIBLE_RATE || rate < 0)) {
    entry.tokenRate = 0;
    changed = true;
  }
  const dur = typeof entry.duration === 'number' ? entry.duration : 0;
  const first = typeof entry.ttft === 'number' ? entry.ttft : 0;
  // TTFT 几乎等于总耗时：说明首字与全文同时到达，TTFT 无意义
  if (dur > 0 && first > 0 && first >= dur * 0.98) {
    entry.ttft = 0;
    entry.tokenRate = 0;
    changed = true;
  }
  return changed;
}