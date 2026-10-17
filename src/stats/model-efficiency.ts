/**
 * 模型效率/性价比聚合 — 纯函数。
 *
 * 输入输出比只说明“单位产出的上下文开销”，不能单独代表便宜；
 * 每 1k 输出 token 成本才是产出成本的直接度量。两者并列展示。
 */
import { prepareEntries, type ForecastInputEntry, type PriceTrio } from './forecast-series';

export type ModelEfficiencyRow = {
  model: string;
  rounds: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  inputCost: number;
  outputCost: number;
  /** 输入 / 输出；输出为 0 时为 null */
  ioRatio: number | null;
  /** 输出 / (输入 + 输出) */
  outputShare: number;
  /** 每 1k 输出 token 成本；无价格或输出为 0 时为 null */
  costPer1kOutput: number | null;
  /** 平均每轮成本；无价格时为 null */
  avgCost: number | null;
  /** 缓存命中率；无缓存样本时为 null */
  hitRate: number | null;
  /** 相对全未命中估算的输入费用节省比例；无法计算时为 null */
  cacheSaving: number | null;
  /** 是否有可用价格（历史费用 > 0 或能解析到价格） */
  priced: boolean;
};

export type ModelEfficiencyOptions = {
  /** 用于补算缓存节省的价格解析器；返回 null 表示该模型无价 */
  priceForModel?: (model: string) => PriceTrio | null;
};

type Accumulator = {
  model: string;
  rounds: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  inputCost: number;
  outputCost: number;
  hit: number;
  hitSamples: number;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function compareNullableAsc(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

/**
 * 按模型聚合效率指标，默认按每 1k 输出成本升序（无价排最后）。
 */
export function aggregateModelEfficiency(
  history: ForecastInputEntry[],
  options: ModelEfficiencyOptions = {},
): ModelEfficiencyRow[] {
  const prepared = prepareEntries(history);
  const map = new Map<string, Accumulator>();
  for (const entry of prepared) {
    const model = entry.model || 'unknown';
    let acc = map.get(model);
    if (!acc) {
      acc = {
        model,
        rounds: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        inputCost: 0,
        outputCost: 0,
        hit: 0,
        hitSamples: 0,
      };
      map.set(model, acc);
    }
    acc.rounds += 1;
    acc.inputTokens += entry.prompt;
    acc.outputTokens += entry.output;
    acc.totalTokens += entry.total;
    acc.cost += entry.cost;
    acc.inputCost += entry.inputCost;
    acc.outputCost += entry.outputCost;
    if (entry.cacheSamples > 0) {
      acc.hit += entry.hit;
      acc.hitSamples += entry.cacheSamples;
    }
  }

  const rows: ModelEfficiencyRow[] = [];
  for (const acc of map.values()) {
    const price = options.priceForModel ? options.priceForModel(acc.model) : null;
    const priced = acc.cost > 0 || acc.inputCost > 0 || acc.outputCost > 0;
    const ioRatio = acc.outputTokens > 0 ? acc.inputTokens / acc.outputTokens : null;
    const outputShare = acc.totalTokens > 0 ? acc.outputTokens / acc.totalTokens : 0;
    const costPer1kOutput = priced && acc.outputTokens > 0
      ? (acc.cost / acc.outputTokens) * 1000
      : null;
    const avgCost = priced && acc.rounds > 0 ? acc.cost / acc.rounds : null;
    const hitRate = acc.hitSamples > 0 ? clamp01(acc.hit / acc.hitSamples) : null;
    let cacheSaving: number | null = null;
    if (price && price.miss > 0 && acc.inputTokens > 0 && (acc.cost > 0 || acc.inputCost > 0)) {
      const expected = (acc.inputTokens * price.miss) / 1e6;
      if (expected > 0) cacheSaving = clamp01(1 - acc.inputCost / expected);
    }
    rows.push({
      model: acc.model,
      rounds: acc.rounds,
      inputTokens: acc.inputTokens,
      outputTokens: acc.outputTokens,
      totalTokens: acc.totalTokens,
      cost: acc.cost,
      inputCost: acc.inputCost,
      outputCost: acc.outputCost,
      ioRatio,
      outputShare,
      costPer1kOutput,
      avgCost,
      hitRate,
      cacheSaving,
      priced,
    });
  }

  rows.sort((a, b) => {
    const byCost = compareNullableAsc(a.costPer1kOutput, b.costPer1kOutput);
    if (byCost !== 0) return byCost;
    const byRatio = compareNullableAsc(a.ioRatio, b.ioRatio);
    if (byRatio !== 0) return byRatio;
    return a.model.localeCompare(b.model);
  });
  return rows;
}
