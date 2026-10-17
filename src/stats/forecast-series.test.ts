import { describe, expect, it } from 'vitest';
import {
  buildForecastSeries,
  computeCompactionForecast,
  computeGrowthFit,
  computeHitEstimate,
  computeOutputEstimate,
  contextRoundsFor,
  detectCompactions,
  prepareEntries,
  promptAt,
  simulateRemainingRounds,
  type ForecastInputEntry,
  type ForecastOptions,
} from './forecast-series';

function entry(
  index: number,
  prompt: number,
  options: Partial<ForecastInputEntry> = {},
): ForecastInputEntry {
  return {
    timestamp: 1_700_000_000_000 + index * 60_000,
    model: 'deepseek-flash',
    prompt_tokens: prompt,
    cache_hit_tokens: Math.round(prompt * 0.9),
    cache_miss_tokens: prompt - Math.round(prompt * 0.9),
    completion_tokens: 100,
    total_tokens: prompt + 100,
    cost: prompt / 1_000_000,
    input_cost: prompt / 1_000_000,
    output_cost: 0,
    ...options,
  };
}

function seriesEntries(prompts: number[]): ForecastInputEntry[] {
  return prompts.map((prompt, index) => entry(index, prompt));
}

function options(overrides: Partial<ForecastOptions> = {}): ForecastOptions {
  return {
    horizon: 5,
    pricing: { hit: 1, miss: 2, output: 3 },
    ctxLimit: 100_000,
    hitFallback: { mode: 'global', globalRate: 0.6, modelRate: 0.7, manualRate: 0.5 },
    compaction: true,
    ...overrides,
  };
}

describe('预测序列数据准备', () => {
  it('按时间排序、过滤空 prompt 并计算命中率', () => {
    const prepared = prepareEntries([
      entry(2, 300, { cache_hit_tokens: 0, cache_miss_tokens: 0 }),
      entry(0, 100),
      entry(1, 0),
    ]);
    expect(prepared).toHaveLength(2);
    expect(prepared[0].prompt).toBe(100);
    expect(prepared[0].hitRate).toBeCloseTo(0.9, 6);
    expect(prepared[1].prompt).toBe(300);
    expect(prepared[1].hitRate).toBeNull();
    expect(prepared[1].miss).toBe(300);
  });

  it('识别压缩点并记录本次压缩前的轮数', () => {
    const prepared = prepareEntries(seriesEntries([20_000, 22_000, 24_000, 26_000, 28_000, 30_000, 5_000, 7_000, 9_000]));
    const compactions = detectCompactions(prepared);
    expect(compactions).toHaveLength(1);
    expect(compactions[0]).toMatchObject({
      round: 7,
      before: 30_000,
      after: 5_000,
      gapRounds: 7,
    });
    expect(compactions[0].dropPct).toBeCloseTo(5 / 6, 6);
  });

  it('相对降幅不足或绝对降幅不足时不判定压缩', () => {
    const smallDrop = prepareEntries(seriesEntries([20_000, 18_000, 17_000, 16_000]));
    expect(detectCompactions(smallDrop)).toHaveLength(0);
    const tinyAbsolute = prepareEntries(seriesEntries([2_000, 1_000, 900, 800]));
    expect(detectCompactions(tinyAbsolute)).toHaveLength(0);
  });

  it('连续回落只记录第一次', () => {
    const prepared = prepareEntries(seriesEntries([30_000, 20_000, 14_000, 16_000]));
    const compactions = detectCompactions(prepared);
    expect(compactions).toHaveLength(1);
    expect(compactions[0].round).toBe(2);
  });
});

describe('增长拟合与预测', () => {
  it('压缩后段线性拟合', () => {
    const prepared = prepareEntries(seriesEntries([20_000, 22_000, 24_000, 26_000, 28_000, 30_000, 5_000, 7_000, 9_000]));
    const compactions = detectCompactions(prepared);
    const fit = computeGrowthFit(prepared, compactions);
    expect(fit.model).toBe('linear');
    expect(fit.n).toBe(3);
    expect(fit.c0).toBeCloseTo(5_000, 6);
    expect(fit.delta).toBeCloseTo(2_000, 6);
    expect(promptAt(fit, 3)).toBeCloseTo(11_000, 6);
  });

  it('压缩预测按最近一次压缩前轮数推算', () => {
    const prepared = prepareEntries(seriesEntries([20_000, 22_000, 24_000, 26_000, 28_000, 30_000, 5_000, 7_000, 9_000]));
    const compactions = detectCompactions(prepared);
    const forecast = computeCompactionForecast(prepared, compactions);
    expect(forecast.detected).toBe(true);
    expect(forecast.period).toBe(7);
    expect(forecast.segmentAge).toBe(2);
    expect(forecast.roundsUntilNext).toBe(5);
    expect(forecast.nextRound).toBe(14);
    expect(forecast.retention).toBeCloseTo(1 / 6, 6);
  });

  it('无压缩时返回未检测状态', () => {
    const prepared = prepareEntries(seriesEntries([1_000, 1_100, 1_200]));
    const forecast = computeCompactionForecast(prepared, []);
    expect(forecast.detected).toBe(false);
    expect(forecast.nextRound).toBeNull();
  });

  it('构建历史 + 未来序列，并在预测轮次应用压缩', () => {
    const prepared = prepareEntries(seriesEntries([20_000, 22_000, 24_000, 26_000, 28_000, 30_000, 5_000, 7_000, 9_000]));
    const series = buildForecastSeries(seriesEntries([20_000, 22_000, 24_000, 26_000, 28_000, 30_000, 5_000, 7_000, 9_000]), options());
    expect(series).not.toBeNull();
    expect(series!.history).toHaveLength(9);
    expect(series!.future).toHaveLength(5);
    expect(series!.next.input).toBeCloseTo(11_000, 6);
    expect(series!.future[0].cost).not.toBeNull();
    expect(series!.future[4].compaction).toBe(true);
    expect(series!.future[4].input).toBeLessThan(series!.future[3].input);
    expect(prepared).toHaveLength(9);
  });

  it('上下文上限截断未来序列', () => {
    const series = buildForecastSeries(seriesEntries([1_000, 2_000, 3_000, 4_000, 5_000]), options({ ctxLimit: 7_500, compaction: false, horizon: 10 }));
    expect(series).not.toBeNull();
    expect(series!.future.length).toBeLessThan(10);
    expect(series!.future[series!.future.length - 1].overLimit).toBe(true);
  });
});

describe('命中率与输出估计', () => {
  it('当前段有缓存数据时使用 token 加权', () => {
    const prepared = prepareEntries([
      entry(0, 1_000, { cache_hit_tokens: 900, cache_miss_tokens: 100 }),
      entry(1, 2_000, { cache_hit_tokens: 1_000, cache_miss_tokens: 1_000 }),
    ]);
    const hit = computeHitEstimate(prepared, [], { mode: 'manual', globalRate: 0.1, modelRate: 0.2, manualRate: 0.3 });
    expect(hit.hasData).toBe(true);
    expect(hit.source).toBe('data');
    expect(hit.rate).toBeCloseTo(1_900 / 3_000, 6);
  });

  it('无缓存数据时按选项回退', () => {
    const prepared = prepareEntries([
      entry(0, 1_000, { cache_hit_tokens: 0, cache_miss_tokens: 0 }),
      entry(1, 2_000, { cache_hit_tokens: 0, cache_miss_tokens: 0 }),
    ]);
    expect(computeHitEstimate(prepared, [], { mode: 'global', globalRate: 0.62, modelRate: 0.7, manualRate: 0.5 }))
      .toMatchObject({ source: 'global', rate: 0.62, hasData: false });
    expect(computeHitEstimate(prepared, [], { mode: 'model', globalRate: 0.62, modelRate: 0.7, manualRate: 0.5 }))
      .toMatchObject({ source: 'model', rate: 0.7 });
    expect(computeHitEstimate(prepared, [], { mode: 'manual', globalRate: 0.62, modelRate: 0.7, manualRate: 0.5 }))
      .toMatchObject({ source: 'manual', rate: 0.5 });
    expect(computeHitEstimate(prepared, [], { mode: 'global', globalRate: null, modelRate: null, manualRate: null }))
      .toMatchObject({ source: 'none', rate: 0 });
  });

  it('输出估计剔除截断样本', () => {
    const prepared = prepareEntries([
      entry(0, 1_000, { completion_tokens: 100 }),
      entry(1, 1_100, { completion_tokens: 200 }),
      entry(2, 1_200, { completion_tokens: 300 }),
      entry(3, 1_300, { completion_tokens: 9_000, finishReason: 'length' }),
    ]);
    const output = computeOutputEstimate(prepared, []);
    expect(output.value).toBe(200);
    expect(output.samples).toBe(3);
    expect(output.excluded).toBe(1);
  });
});

describe('余额与上下文轮数', () => {
  it('预算为零时剩余轮数为零', () => {
    const series = buildForecastSeries(seriesEntries([1_000, 2_000, 3_000, 4_000]), options({ compaction: false }))!;
    expect(simulateRemainingRounds(0, series, options({ compaction: false }))).toMatchObject({ R: 0, low: 0, high: 0 });
  });

  it('价格未知时无法估算', () => {
    const series = buildForecastSeries(seriesEntries([1_000, 2_000, 3_000, 4_000]), options({ pricing: null, compaction: false }))!;
    expect(simulateRemainingRounds(10, series, options({ pricing: null, compaction: false }))).toBeNull();
  });

  it('按预算逐轮累加并保持区间顺序', () => {
    const history = seriesEntries([1_000, 2_000, 3_000, 4_000, 5_000, 6_000, 7_000]);
    const series = buildForecastSeries(history, options({ compaction: false, ctxLimit: null }))!;
    const result = simulateRemainingRounds(0.1, series, options({ compaction: false, ctxLimit: null }));
    expect(result).not.toBeNull();
    expect(result!.R).toBeGreaterThan(0);
    expect(result!.low).toBeLessThanOrEqual(result!.R);
    expect(result!.high).toBeGreaterThanOrEqual(result!.R);
  });

  it('上下文轮数按 Δ 外推，压缩启用时交由压缩预测表达', () => {
    const linear = buildForecastSeries(seriesEntries([1_000, 2_000, 3_000, 4_000]), options({ compaction: false, ctxLimit: 10_000 }))!;
    expect(contextRoundsFor(linear, 10_000, false)).toBe(6);
    const compacted = buildForecastSeries(seriesEntries([20_000, 22_000, 24_000, 26_000, 28_000, 30_000, 5_000, 7_000, 9_000]), options())!;
    expect(contextRoundsFor(compacted, 100_000, true)).toBeNull();
  });
});
