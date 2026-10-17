import { describe, expect, it } from 'vitest';
import { aggregateModelEfficiency } from './model-efficiency';
import type { ForecastInputEntry } from './forecast-series';

function entry(
  model: string,
  prompt: number,
  output: number,
  cost: number,
  hit: number,
  miss: number,
): ForecastInputEntry {
  return {
    timestamp: 1_700_000_000_000,
    model,
    prompt_tokens: prompt,
    cache_hit_tokens: hit,
    cache_miss_tokens: miss,
    completion_tokens: output,
    total_tokens: prompt + output,
    cost,
    input_cost: cost * 0.4,
    output_cost: cost * 0.6,
  };
}

describe('模型效率聚合', () => {
  it('计算输入输出比、每 1k 输出成本与命中率，并按成本升序', () => {
    const rows = aggregateModelEfficiency([
      entry('model-a', 1_000, 100, 0.1, 800, 200),
      entry('model-a', 1_000, 100, 0.1, 800, 200),
      entry('model-b', 2_000, 100, 0.3, 500, 1_500),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].model).toBe('model-a');
    expect(rows[0].rounds).toBe(2);
    expect(rows[0].inputTokens).toBe(2_000);
    expect(rows[0].outputTokens).toBe(200);
    expect(rows[0].ioRatio).toBeCloseTo(10, 6);
    expect(rows[0].outputShare).toBeCloseTo(200 / 2_200, 6);
    expect(rows[0].costPer1kOutput).toBeCloseTo(1, 6);
    expect(rows[0].hitRate).toBeCloseTo(0.8, 6);
    expect(rows[1].model).toBe('model-b');
    expect(rows[1].costPer1kOutput).toBeCloseTo(3, 6);
  });

  it('可用价格解析器补算缓存节省', () => {
    const pricedEntry = {
      ...entry('model-a', 1_000, 100, 0.01, 800, 200),
      input_cost: 0.0028,
      output_cost: 0.0072,
    };
    const rows = aggregateModelEfficiency(
      [pricedEntry],
      { priceForModel: () => ({ hit: 1, miss: 10, output: 1 }) },
    );
    expect(rows[0].priced).toBe(true);
    expect(rows[0].cacheSaving).toBeCloseTo(0.72, 6);
  });

  it('无价格时成本类为 null 并排在最后', () => {
    const rows = aggregateModelEfficiency([
      entry('priced', 1_000, 100, 0.1, 800, 200),
      entry('unpriced', 1_000, 100, 0, 0, 0),
    ]);
    expect(rows[0].model).toBe('priced');
    expect(rows[1].model).toBe('unpriced');
    expect(rows[1].costPer1kOutput).toBeNull();
    expect(rows[1].avgCost).toBeNull();
    expect(rows[1].hitRate).toBeNull();
    expect(rows[1].priced).toBe(false);
  });

  it('输出为 0 时输入输出比与每 1k 输出成本为 null', () => {
    const rows = aggregateModelEfficiency([entry('model-a', 1_000, 0, 0.1, 500, 500)]);
    expect(rows[0].ioRatio).toBeNull();
    expect(rows[0].costPer1kOutput).toBeNull();
    expect(rows[0].outputShare).toBe(0);
  });
});
