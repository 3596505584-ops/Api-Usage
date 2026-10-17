/**
 * 趋势预测序列核心 — 纯函数，不依赖 DOM/store。
 *
 * 设计目标：
 * - 以单个对话为单位，完整保留历史点用于绘图；
 * - 识别上下文回落（压缩/隐藏楼层/重开）并在回落点后重新拟合；
 * - 命中率优先从历史缓存 token 测算，无数据时才使用回退值；
 * - 检测到一次压缩即可依据“本次压缩前的轮数”预测下次压缩；
 * - 成本、余额轮数、上下文轮数共用同一套逐轮投影，保证图表与数据块口径一致。
 */
import { isTruncatedFinish } from '../utils/finish';

export type PriceTrio = { hit: number; miss: number; output: number };

export type ForecastInputEntry = {
  timestamp?: number;
  model?: string;
  prompt_tokens?: number;
  cache_hit_tokens?: number;
  cache_miss_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
  input_cost?: number;
  output_cost?: number;
  finishReason?: string | null;
  isTruncated?: boolean;
  chatId?: string | null;
};

export type PreparedEntry = {
  index: number;
  timestamp: number;
  model: string;
  prompt: number;
  hit: number;
  miss: number;
  output: number;
  total: number;
  cost: number;
  inputCost: number;
  outputCost: number;
  /** 命中率；无缓存样本时为 null */
  hitRate: number | null;
  /** hit + miss，用于加权命中率 */
  cacheSamples: number;
  truncated: boolean;
  /** 1-based 轮次 */
  round: number;
};

export type CompactionPoint = {
  /** 压缩后那条记录在 prepared 中的下标 */
  index: number;
  /** 压缩后那条记录的轮次（1-based） */
  round: number;
  before: number;
  after: number;
  dropPct: number;
  /** 距上一次压缩的轮数；首次压缩为 round - 1 */
  gapRounds: number;
  postHitRate: number | null;
};

export type GrowthFit = {
  model: 'linear' | 'recent-mean';
  /** 当前段第一个点的拟合值（x=0） */
  c0: number;
  /** 每轮增量；recent-mean 为 0 */
  delta: number;
  /** 残差标准差（已做下限保护） */
  sigma: number;
  r2: number;
  /** 当前段样本数 */
  n: number;
  /** 当前段在 prepared 中的起始下标 */
  segStart: number;
  /** 当前段最后一个真实 prompt */
  lastPrompt: number;
  /** 最近若干轮的平均间隔（毫秒） */
  avgIntervalMs: number;
  /** 预测区间用 */
  xMean: number;
  sxx: number;
};

export type HitSource = 'data' | 'global' | 'model' | 'manual' | 'none';

export type HitEstimate = {
  rate: number;
  source: HitSource;
  /** 参与测算的样本数（回退时为 0） */
  samples: number;
  /** 当前段内参与测算的样本数 */
  segmentSamples: number;
  /** 该对话是否存在任何缓存命中数据 */
  hasData: boolean;
};

export type OutputEstimate = {
  value: number;
  low: number;
  high: number;
  samples: number;
  excluded: number;
};

export type CompactionForecast = {
  detected: boolean;
  count: number;
  lastRound: number | null;
  /** 依据最近一次压缩前段长度得到的周期（轮） */
  period: number | null;
  /** 压缩后保留比例 */
  retention: number | null;
  postHitRate: number | null;
  /** 当前段已持续轮数 */
  segmentAge: number;
  /** 距下次压缩轮数 */
  roundsUntilNext: number | null;
  /** 预测下次压缩的轮次（1-based） */
  nextRound: number | null;
  /** 多次压缩时的间隔中位数（参考） */
  medianGap: number | null;
};

export type HistoryPoint = {
  round: number;
  input: number;
  hit: number;
  miss: number;
  output: number;
  cost: number;
  cumulativeCost: number;
  hitRate: number | null;
  compaction: boolean;
};

export type FuturePoint = {
  round: number;
  input: number;
  inputLow: number;
  inputHigh: number;
  hit: number;
  miss: number;
  output: number;
  hitRate: number;
  cost: number | null;
  costLow: number | null;
  costHigh: number | null;
  cumulativeCost: number | null;
  compaction: boolean;
  overLimit: boolean;
};

export type HitFallback = {
  mode: 'global' | 'model' | 'manual';
  globalRate: number | null;
  modelRate: number | null;
  manualRate: number | null;
};

export type ForecastOptions = {
  horizon: number;
  /** null 表示价格未知，成本类全部返回 null */
  pricing: PriceTrio | null;
  ctxLimit: number | null;
  hitFallback: HitFallback;
  /** 是否启用压缩情景预测 */
  compaction: boolean;
};

export type ForecastSeries = {
  prepared: PreparedEntry[];
  history: HistoryPoint[];
  future: FuturePoint[];
  compactions: CompactionPoint[];
  fit: GrowthFit;
  hit: HitEstimate;
  output: OutputEstimate;
  compactionForecast: CompactionForecast;
  currentRound: number;
  currentPrompt: number;
  totalCost: number;
  averageCost: number;
  next: {
    input: number;
    inputLow: number;
    inputHigh: number;
    output: number;
    hitRate: number;
    cost: number | null;
    costLow: number | null;
    costHigh: number | null;
  };
};

export type RemainingRoundsResult = {
  R: number;
  low: number;
  high: number;
  ctxLimited: boolean;
};

/** 上下文回落判定：相对降幅 >= 20% 且绝对降幅 >= 1500 token */
export const COMPACTION_DROP_RATIO = 0.8;
export const COMPACTION_MIN_DROP = 1500;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = average(values);
  let sum = 0;
  for (const value of values) sum += (value - mean) ** 2;
  return Math.sqrt(sum / values.length);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quantile(values: number[], q: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[Math.min(sorted.length - 1, base + 1)];
  return sorted[base] + rest * (next - sorted[base]);
}

function medianAbsoluteDeviation(values: number[]): number {
  if (!values.length) return 0;
  const med = median(values);
  return median(values.map((value) => Math.abs(value - med)));
}

/**
 * 数据准备：按时间升序、过滤空 prompt、计算命中率与截断标记。
 * 无缓存字段时 hit=0、miss=prompt，仅用于堆叠图展示，不伪造命中率。
 */
export function prepareEntries(history: ForecastInputEntry[]): PreparedEntry[] {
  const sorted = [...(history || [])].sort((a, b) => (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0));
  const prepared: PreparedEntry[] = [];
  for (const entry of sorted) {
    const rawHit = Math.max(0, Number(entry?.cache_hit_tokens) || 0);
    const rawMiss = Math.max(0, Number(entry?.cache_miss_tokens) || 0);
    const cacheSamples = rawHit + rawMiss;
    const prompt = Math.max(0, Number(entry?.prompt_tokens) || cacheSamples);
    if (prompt <= 0) continue;
    const output = Math.max(0, Number(entry?.completion_tokens) || 0);
    const hitRate = cacheSamples > 0 ? clamp01(rawHit / cacheSamples) : null;
    prepared.push({
      index: prepared.length,
      timestamp: Number(entry?.timestamp) || 0,
      model: entry?.model || 'unknown',
      prompt,
      hit: cacheSamples > 0 ? rawHit : 0,
      miss: cacheSamples > 0 ? rawMiss : prompt,
      output,
      total: Math.max(0, Number(entry?.total_tokens) || prompt + output),
      cost: Number(entry?.cost) || 0,
      inputCost: Number(entry?.input_cost) || 0,
      outputCost: Number(entry?.output_cost) || 0,
      hitRate,
      cacheSamples,
      truncated: entry?.isTruncated === true || isTruncatedFinish(entry?.finishReason),
      round: prepared.length + 1,
    });
  }
  return prepared;
}

/**
 * 识别上下文回落点。连续回落只记录第一次，避免一次压缩被拆成多个点。
 */
export function detectCompactions(prepared: PreparedEntry[]): CompactionPoint[] {
  const points: CompactionPoint[] = [];
  let lastRound = 0;
  for (let i = 1; i < prepared.length; i++) {
    if (points.length && points[points.length - 1].index === i - 1) continue;
    const previous = prepared[i - 1];
    const current = prepared[i];
    const drop = previous.prompt - current.prompt;
    if (previous.prompt <= 0) continue;
    if (current.prompt / previous.prompt > COMPACTION_DROP_RATIO) continue;
    if (drop < COMPACTION_MIN_DROP) continue;
    // 周期口径：首次压缩按“从第 1 轮到压缩轮”的累计轮数；后续按两次压缩之间的轮数
    const gapRounds = lastRound ? current.round - lastRound : current.round;
    points.push({
      index: i,
      round: current.round,
      before: previous.prompt,
      after: current.prompt,
      dropPct: drop / previous.prompt,
      gapRounds,
      postHitRate: current.hitRate,
    });
    lastRound = current.round;
  }
  return points;
}

function regression(xs: number[], ys: number[]): {
  slope: number;
  intercept: number;
  r2: number;
  sigma: number;
  xMean: number;
  sxx: number;
} {
  const n = xs.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i += 1) {
    sx += xs[i];
    sy += ys[i];
    sxx += xs[i] * xs[i];
    sxy += xs[i] * ys[i];
  }
  const xMean = n ? sx / n : 0;
  const yMean = n ? sy / n : 0;
  const centeredXX = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
  const denominator = centeredXX;
  const slope = denominator > 1e-9
    ? xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0) / denominator
    : 0;
  const intercept = yMean - slope * xMean;
  let rss = 0;
  let tss = 0;
  for (let i = 0; i < n; i += 1) {
    const predicted = intercept + slope * xs[i];
    rss += (ys[i] - predicted) ** 2;
    tss += (ys[i] - yMean) ** 2;
  }
  const variance = n > 2 ? rss / (n - 2) : 0;
  const sigma = Math.sqrt(Math.max(0, variance));
  const r2 = tss > 1e-9 ? 1 - rss / tss : 1;
  return { slope, intercept, r2, sigma, xMean, sxx: centeredXX };
}

function averageIntervalMs(prepared: PreparedEntry[]): number {
  if (prepared.length < 2) return 0;
  const recent = prepared.slice(-21);
  const diffs: number[] = [];
  for (let i = 1; i < recent.length; i += 1) {
    const diff = recent[i].timestamp - recent[i - 1].timestamp;
    if (diff > 0) diffs.push(diff);
  }
  return diffs.length ? average(diffs) : 0;
}

/**
 * 对最后一个压缩点之后的当前段做增长拟合。
 * 样本 >= 12 时先用中位绝对偏差剔除离群点，再回归。
 */
export function computeGrowthFit(prepared: PreparedEntry[], compactions: CompactionPoint[]): GrowthFit {
  const segStart = compactions.length ? compactions[compactions.length - 1].index : 0;
  const segment = prepared.slice(segStart);
  const n = segment.length;
  const interval = averageIntervalMs(prepared);
  if (!n) {
    return { model: 'recent-mean', c0: 0, delta: 0, sigma: 0, r2: 0, n: 0, segStart, lastPrompt: 0, avgIntervalMs: interval, xMean: 0, sxx: 0 };
  }
  const y = segment.map((entry) => entry.prompt);
  const lastPrompt = y[n - 1];

  if (n === 1) {
    return {
      model: 'recent-mean',
      c0: lastPrompt,
      delta: 0,
      sigma: Math.max(1, lastPrompt * 0.01),
      r2: 0,
      n,
      segStart,
      lastPrompt,
      avgIntervalMs: interval,
      xMean: 0,
      sxx: 0,
    };
  }

  if (n === 2) {
    const delta = Math.max(0, y[1] - y[0]);
    return {
      model: 'linear',
      c0: y[0],
      delta,
      sigma: Math.max(1, standardDeviation(y), lastPrompt * 0.01),
      r2: 0,
      n,
      segStart,
      lastPrompt,
      avgIntervalMs: interval,
      xMean: 0.5,
      sxx: 0.5,
    };
  }

  let xs = y.map((_, index) => index);
  let ys = y.slice();
  if (n >= 12) {
    const med = median(y);
    const mad = medianAbsoluteDeviation(y) * 1.4826;
    if (mad > 0) {
      const filtered = y
        .map((value, index) => ({ value, index }))
        .filter((point) => Math.abs(point.value - med) <= 3 * mad);
      if (filtered.length >= 6) {
        xs = filtered.map((point) => point.index);
        ys = filtered.map((point) => point.value);
      }
    }
  }

  const fit = regression(xs, ys);
  const sigmaFloor = Math.max(1, lastPrompt * 0.01);
  const sigma = Math.max(fit.sigma, sigmaFloor);
  const useRecentMean = fit.r2 < 0.35 && n >= 6;
  if (useRecentMean) {
    const recent = y.slice(-Math.min(5, n));
    const med = median(recent);
    return {
      model: 'recent-mean',
      c0: med,
      delta: 0,
      sigma: Math.max(standardDeviation(recent), sigmaFloor),
      r2: fit.r2,
      n,
      segStart,
      lastPrompt,
      avgIntervalMs: interval,
      xMean: 0,
      sxx: 0,
    };
  }
  return {
    model: 'linear',
    c0: Math.max(0, fit.intercept),
    delta: Math.max(0, fit.slope),
    sigma,
    r2: fit.r2,
    n,
    segStart,
    lastPrompt,
    avgIntervalMs: interval,
    xMean: fit.xMean,
    sxx: fit.sxx,
  };
}

/** 当前段内第 offset 轮的拟合 prompt（offset 从当前段起点算） */
export function promptAt(fit: GrowthFit, offset: number): number {
  if (fit.model === 'recent-mean') return Math.max(0, fit.c0);
  return Math.max(0, fit.c0 + fit.delta * offset);
}

/** 95% 预测区间半宽 */
export function predictionBand(fit: GrowthFit, offset: number): number {
  if (fit.n <= 0) return 0;
  const base = fit.sigma * Math.sqrt(1 + 1 / fit.n);
  if (fit.model === 'recent-mean' || fit.sxx <= 1e-9) return 1.96 * base;
  const distance = offset - fit.xMean;
  const factor = Math.sqrt(1 + 1 / fit.n + (distance * distance) / fit.sxx);
  return 1.96 * fit.sigma * factor;
}

/** 全量历史的有效缓存命中率（hit / (hit + miss)） */
export function computeGlobalHitRate(history: ForecastInputEntry[]): number | null {
  let hit = 0;
  let samples = 0;
  for (const entry of history || []) {
    const h = Math.max(0, Number(entry?.cache_hit_tokens) || 0);
    const m = Math.max(0, Number(entry?.cache_miss_tokens) || 0);
    if (h + m <= 0) continue;
    hit += h;
    samples += h + m;
  }
  return samples > 0 ? clamp01(hit / samples) : null;
}

/** 指定模型的有效缓存命中率 */
export function computeModelHitRate(history: ForecastInputEntry[], model: string): number | null {
  let hit = 0;
  let samples = 0;
  for (const entry of history || []) {
    if ((entry?.model || '') !== model) continue;
    const h = Math.max(0, Number(entry?.cache_hit_tokens) || 0);
    const m = Math.max(0, Number(entry?.cache_miss_tokens) || 0);
    if (h + m <= 0) continue;
    hit += h;
    samples += h + m;
  }
  return samples > 0 ? clamp01(hit / samples) : null;
}

function pickWeightedHitRate(entries: PreparedEntry[]): { rate: number; samples: number } | null {
  const recent = entries.slice(-10);
  let hit = 0;
  let samples = 0;
  for (const entry of recent) {
    if (entry.hitRate == null || entry.cacheSamples <= 0) continue;
    hit += entry.hit;
    samples += entry.cacheSamples;
  }
  return samples > 0 ? { rate: clamp01(hit / samples), samples } : null;
}

/**
 * 命中率测算：
 * 1. 当前段有有效样本 → token 加权（最近 10 个有效样本）；
 * 2. 当前段无、但对话更早有样本 → 用对话最近的有效样本；
 * 3. 完全没有样本 → 按选项回退（全站/同模型/手动），都没有则为 0。
 */
export function computeHitEstimate(
  prepared: PreparedEntry[],
  compactions: CompactionPoint[],
  fallback: HitFallback,
): HitEstimate {
  const segStart = compactions.length ? compactions[compactions.length - 1].index : 0;
  const segment = prepared.slice(segStart);
  const segmentData = segment.filter((entry) => entry.hitRate != null && entry.cacheSamples > 0);
  const allData = prepared.filter((entry) => entry.hitRate != null && entry.cacheSamples > 0);
  const segmentPick = pickWeightedHitRate(segmentData);
  if (segmentPick) {
    return { rate: segmentPick.rate, source: 'data', samples: segmentPick.samples, segmentSamples: segmentData.length, hasData: true };
  }
  const allPick = pickWeightedHitRate(allData);
  if (allPick) {
    return { rate: allPick.rate, source: 'data', samples: allPick.samples, segmentSamples: 0, hasData: true };
  }
  if (fallback.mode === 'manual' && fallback.manualRate != null) {
    return { rate: clamp01(fallback.manualRate), source: 'manual', samples: 0, segmentSamples: 0, hasData: false };
  }
  if (fallback.mode === 'model' && fallback.modelRate != null) {
    return { rate: clamp01(fallback.modelRate), source: 'model', samples: 0, segmentSamples: 0, hasData: false };
  }
  if (fallback.globalRate != null) {
    return { rate: clamp01(fallback.globalRate), source: 'global', samples: 0, segmentSamples: 0, hasData: false };
  }
  return { rate: 0, source: 'none', samples: 0, segmentSamples: 0, hasData: false };
}

/** 输出 token 估计：当前段非截断样本的中位数，MAD 作为波动半宽 */
export function computeOutputEstimate(prepared: PreparedEntry[], compactions: CompactionPoint[]): OutputEstimate {
  const segStart = compactions.length ? compactions[compactions.length - 1].index : 0;
  const segment = prepared.slice(segStart);
  const excluded = prepared.filter((entry) => entry.truncated).length;
  const segmentCandidates = segment.filter((entry) => !entry.truncated && entry.output > 0);
  const allCandidates = prepared.filter((entry) => !entry.truncated && entry.output > 0);
  const list = (segmentCandidates.length ? segmentCandidates : allCandidates).slice(-10);
  if (!list.length) return { value: 0, low: 0, high: 0, samples: 0, excluded };
  const values = list.map((entry) => entry.output);
  const med = median(values);
  const mad = medianAbsoluteDeviation(values) * 1.4826;
  const spread = mad > 0 ? mad : Math.max(0, quantile(values, 0.75) - quantile(values, 0.25)) / 2;
  return {
    value: med,
    low: Math.max(0, med - spread),
    high: med + spread,
    samples: values.length,
    excluded,
  };
}

/**
 * 压缩预测：用最近一次压缩的“压缩前段长度”作为周期。
 * 即使只有一次压缩，也能给出下次压缩的估计。
 */
export function computeCompactionForecast(prepared: PreparedEntry[], compactions: CompactionPoint[]): CompactionForecast {
  if (!compactions.length) {
    return {
      detected: false,
      count: 0,
      lastRound: null,
      period: null,
      retention: null,
      postHitRate: null,
      segmentAge: prepared.length,
      roundsUntilNext: null,
      nextRound: null,
      medianGap: null,
    };
  }
  const last = compactions[compactions.length - 1];
  const currentRound = prepared.length;
  const period = last.gapRounds > 0 ? last.gapRounds : null;
  const segmentAge = Math.max(0, currentRound - last.round);
  const roundsUntilNext = period != null ? Math.max(1, period - segmentAge) : null;
  const retention = last.before > 0 ? Math.max(0.05, Math.min(0.95, last.after / last.before)) : null;
  const medianGap = compactions.length >= 2 ? median(compactions.map((point) => point.gapRounds)) : null;
  return {
    detected: true,
    count: compactions.length,
    lastRound: last.round,
    period,
    retention,
    postHitRate: last.postHitRate,
    segmentAge,
    roundsUntilNext,
    nextRound: roundsUntilNext != null ? currentRound + roundsUntilNext : null,
    medianGap,
  };
}

export function buildHistoryPoints(prepared: PreparedEntry[], compactions: CompactionPoint[]): HistoryPoint[] {
  const compactionRounds = new Set(compactions.map((point) => point.round));
  let cumulative = 0;
  return prepared.map((entry) => {
    cumulative += entry.cost;
    return {
      round: entry.round,
      input: entry.prompt,
      hit: entry.hit,
      miss: entry.miss,
      output: entry.output,
      cost: entry.cost,
      cumulativeCost: cumulative,
      hitRate: entry.hitRate,
      compaction: compactionRounds.has(entry.round),
    };
  });
}

function projectRounds(
  prepared: PreparedEntry[],
  fit: GrowthFit,
  hit: HitEstimate,
  output: OutputEstimate,
  pricing: PriceTrio | null,
  ctxLimit: number | null,
  compactionForecast: CompactionForecast,
  compactionEnabled: boolean,
  maxRounds: number,
): FuturePoint[] {
  const out: FuturePoint[] = [];
  const currentRound = prepared.length;
  let cumulative = prepared.reduce((sum, entry) => sum + entry.cost, 0);
  let factor = 1;
  let currentHit = hit.rate;
  const retention = compactionForecast.retention ?? 0.5;
  let nextCompactionRound = compactionEnabled && compactionForecast.detected
    ? compactionForecast.nextRound
    : null;
  for (let k = 0; k < maxRounds; k += 1) {
    const round = currentRound + k + 1;
    const offset = fit.n + k;
    const base = promptAt(fit, offset);
    const baseBand = predictionBand(fit, offset);
    let input = base * factor;
    let overLimit = ctxLimit != null && input > ctxLimit;
    let isCompaction = false;
    if (compactionEnabled && nextCompactionRound != null && round >= nextCompactionRound) {
      isCompaction = true;
      factor *= retention;
      input = base * factor;
      currentHit = compactionForecast.postHitRate ?? hit.rate;
      nextCompactionRound = compactionForecast.period != null ? round + compactionForecast.period : null;
    } else if (compactionEnabled && compactionForecast.postHitRate != null && currentHit < hit.rate) {
      currentHit = Math.min(hit.rate, currentHit + (hit.rate - currentHit) * 0.35);
    }
    const hitRate = clamp01(currentHit);
    const hitTokens = input * hitRate;
    const missTokens = input * (1 - hitRate);
    let cost: number | null = null;
    let costLow: number | null = null;
    let costHigh: number | null = null;
    if (pricing) {
      const costAt = (rate: number) => (
        input * rate * pricing.hit
        + input * (1 - rate) * pricing.miss
        + output.value * pricing.output
      ) / 1e6;
      cost = costAt(hitRate);
      const low = costAt(clamp01(hitRate + 0.1));
      const high = costAt(clamp01(hitRate - 0.1));
      costLow = Math.min(low, high);
      costHigh = Math.max(low, high);
      cumulative += cost;
    }
    const band = baseBand * factor;
    out.push({
      round,
      input,
      inputLow: Math.max(0, input - band),
      inputHigh: input + band,
      hit: hitTokens,
      miss: missTokens,
      output: output.value,
      hitRate,
      cost,
      costLow,
      costHigh,
      cumulativeCost: pricing ? cumulative : null,
      compaction: isCompaction,
      overLimit,
    });
    if (overLimit) break;
  }
  return out;
}

/**
 * 构建完整预测序列。历史点完整保留，未来点按 horizon 生成。
 * 无任何有效历史时返回 null。
 */
export function buildForecastSeries(
  history: ForecastInputEntry[],
  options: ForecastOptions,
): ForecastSeries | null {
  const prepared = prepareEntries(history);
  if (!prepared.length) return null;
  const compactions = detectCompactions(prepared);
  const fit = computeGrowthFit(prepared, compactions);
  const hit = computeHitEstimate(prepared, compactions, options.hitFallback);
  const output = computeOutputEstimate(prepared, compactions);
  const compactionForecast = computeCompactionForecast(prepared, compactions);
  const historyPoints = buildHistoryPoints(prepared, compactions);
  const horizon = Math.max(1, Math.floor(options.horizon) || 10);
  const future = projectRounds(
    prepared,
    fit,
    hit,
    output,
    options.pricing,
    options.ctxLimit,
    compactionForecast,
    options.compaction,
    horizon,
  );
  const first = future[0];
  const last = prepared[prepared.length - 1];
  const totalCost = prepared.reduce((sum, entry) => sum + entry.cost, 0);
  const next = first
    ? {
      input: first.input,
      inputLow: first.inputLow,
      inputHigh: first.inputHigh,
      output: first.output,
      hitRate: first.hitRate,
      cost: first.cost,
      costLow: first.costLow,
      costHigh: first.costHigh,
    }
    : {
      input: promptAt(fit, fit.n),
      inputLow: promptAt(fit, fit.n),
      inputHigh: promptAt(fit, fit.n),
      output: output.value,
      hitRate: hit.rate,
      cost: null,
      costLow: null,
      costHigh: null,
    };
  return {
    prepared,
    history: historyPoints,
    future,
    compactions,
    fit,
    hit,
    output,
    compactionForecast,
    currentRound: prepared.length,
    currentPrompt: last?.prompt || 0,
    totalCost,
    averageCost: prepared.length ? totalCost / prepared.length : 0,
    next,
  };
}

/**
 * 逐轮模拟余额可支撑轮数。与图表共用 projectRounds，保证口径一致。
 * 返回 null 表示无法估算（价格未知）。
 */
export function simulateRemainingRounds(
  budget: number,
  series: ForecastSeries,
  options: ForecastOptions,
  maxRounds = 10000,
): RemainingRoundsResult | null {
  if (!options.pricing) return null;
  if (!Number.isFinite(budget) || budget <= 0) return { R: 0, low: 0, high: 0, ctxLimited: false };
  const run = (deltaScale: number, hitDelta: number): { R: number; ctxLimited: boolean } => {
    const fit: GrowthFit = { ...series.fit, delta: series.fit.delta * deltaScale };
    const hit: HitEstimate = { ...series.hit, rate: clamp01(series.hit.rate + hitDelta) };
    const points = projectRounds(
      series.prepared,
      fit,
      hit,
      series.output,
      options.pricing,
      options.ctxLimit,
      series.compactionForecast,
      options.compaction,
      maxRounds,
    );
    let spent = 0;
    let rounds = 0;
    let ctxLimited = false;
    for (const point of points) {
      if (point.overLimit) { ctxLimited = true; break; }
      if (point.cost == null) break;
      if (spent + point.cost > budget) break;
      spent += point.cost;
      rounds += 1;
    }
    return { R: rounds, ctxLimited };
  };
  const base = run(1, 0);
  const optimistic = run(0.5, 0.05);
  const pessimistic = run(1.5, -0.05);
  return {
    R: base.R,
    low: Math.min(base.R, pessimistic.R),
    high: Math.max(base.R, optimistic.R),
    ctxLimited: base.ctxLimited,
  };
}

/**
 * 上下文可支撑轮数。
 * - 未启用压缩预测：按当前段 Δ 线性外推；
 * - 启用且检测到压缩：返回 null，由“距下次压缩”表达（压缩会主动回落）。
 */
export function contextRoundsFor(
  series: ForecastSeries,
  ctxLimit: number | null,
  compactionEnabled: boolean,
): number | null {
  if (!ctxLimit) return null;
  if (compactionEnabled && series.compactionForecast.detected) return null;
  if (series.fit.delta <= 0) return null;
  const remain = ctxLimit - series.currentPrompt;
  return remain <= 0 ? 0 : Math.max(0, Math.floor(remain / series.fit.delta));
}
