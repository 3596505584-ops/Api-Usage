import { describe, expect, it } from 'vitest';
import {
  costAt,
  ctxLimitRounds,
  ctxLimitForModel,
  fitSegments,
  nextPromptWithBand,
  remainingRounds,
  type FitResult,
} from './forecast';

function entry(index: number, promptTokens: number, chatId = 'chat-a') {
  return {
    chatId,
    timestamp: 1_700_000_000_000 + index * 60_000,
    prompt_tokens: promptTokens,
    cache_hit_tokens: 800,
    cache_miss_tokens: 200,
    completion_tokens: 100,
    total_tokens: promptTokens + 100,
  };
}

function fit(overrides: Partial<FitResult> = {}): FitResult {
  return {
    chatId: null,
    C0: 1_000_000,
    delta: 0,
    sigma: 0,
    r2: 1,
    segStart: 0,
    segLen: 10,
    model: 'linear',
    hitEwma: 1,
    outEwma: 0,
    avgIntervalMs: 60_000,
    ...overrides,
  };
}

describe('趋势预测核心', () => {
  it('空历史返回空拟合', () => {
    expect(fitSegments([], null)).toBeNull();
  });

  it('线性数据命中线性模型', () => {
    const history = Array.from({ length: 8 }, (_, index) => entry(index, 1_000 + index * 100));
    const result = fitSegments(history, null);
    expect(result).not.toBeNull();
    expect(result?.model).toBe('linear');
    expect(result?.C0).toBeCloseTo(1_000, 6);
    expect(result?.delta).toBeCloseTo(100, 6);
    expect(result?.r2).toBeCloseTo(1, 6);
  });

  it('回落超过三成时只拟合末段', () => {
    const values = [1_000, 1_100, 1_200, 1_300, 1_400, 1_500, 300, 400, 500];
    const history = values.map((value, index) => entry(index, value));
    const result = fitSegments(history, null);
    expect(result).toMatchObject({ model: 'recent-mean', segStart: 6, segLen: 3 });
    expect(result?.C0).toBe(300);
    expect(result?.delta).toBe(100);
  });

  it('按对话过滤历史', () => {
    const history = [
      entry(0, 1_000, 'chat-a'),
      entry(1, 1_100, 'chat-b'),
      entry(2, 1_200, 'chat-a'),
    ];
    expect(fitSegments(history, 'chat-b')?.segLen).toBe(1);
    expect(fitSegments(history, 'missing')).toBeNull();
  });

  it('预算为零时剩余轮数为零', () => {
    expect(remainingRounds(0, fit(), { hit: 1, miss: 1, output: 0 })).toEqual({
      R: 0,
      R_low: 0,
      R_high: 0,
    });
  });

  it('固定单轮成本时正确计算剩余轮数', () => {
    const result = remainingRounds(5, fit(), { hit: 1, miss: 1, output: 0 });
    expect(result).toEqual({ R: 5, R_low: 5, R_high: 5 });
  });

  it('增长成本时给出区间且保持顺序', () => {
    const result = remainingRounds(10, fit({ delta: 100_000, sigma: 10_000 }), {
      hit: 1,
      miss: 1,
      output: 0,
    });
    expect(result.R).toBeGreaterThan(0);
    expect(result.R_low).toBeLessThanOrEqual(result.R);
    expect(result.R_high).toBeGreaterThanOrEqual(result.R);
  });

  it('计算单轮成本和上下文轮数', () => {
    const pricing = { hit: 1, miss: 1, output: 0 };
    expect(costAt(0, fit(), pricing)).toBe(1);
    expect(costAt(1, fit({ delta: 100_000 }), pricing)).toBe(1.1);
    expect(ctxLimitRounds(fit({ C0: 1_000, delta: 100 }), 3_100)).toBe(21);
    expect(ctxLimitRounds(fit({ delta: 0 }), 3_100)).toBeNull();
  });

  it('优先使用配置的上下文上限，名称无法识别时按 1M 兜底', () => {
    expect(ctxLimitForModel('custom-64-model')).toBe(1_000_000);
    expect(ctxLimitForModel('custom-model')).toBe(1_000_000);
    expect(ctxLimitForModel('custom-64k-model')).toBe(64000);
    expect(ctxLimitForModel('deepseek-flash')).toBe(1_000_000);
    expect(ctxLimitForModel('custom-model', 256000)).toBe(256000);
  });

  it('下一轮预测包含置信带', () => {
    expect(nextPromptWithBand(fit({ C0: 100, delta: 10, sigma: 5, segLen: 3 }))).toEqual({
      prompt: 130,
      low: 125,
      high: 135,
    });
  });
});
