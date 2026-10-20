import { afterEach, describe, expect, it } from 'vitest';
import {
  aggregateForChart,
  getYValue,
  getChartType,
  setChartType,
  DEFAULT_Y_KEYS,
  Y_OPTIONS,
} from './chart-config';

const entry = (over: any = {}) => ({
  timestamp: new Date(2026, 0, 1, 12, 0, 0).getTime(),
  model: 'm',
  prompt_tokens: 100,
  cache_hit_tokens: 60,
  cache_miss_tokens: 40,
  completion_tokens: 20,
  total_tokens: 120,
  input_cost: 0.01,
  output_cost: 0.02,
  cost: 0.03,
  cache_hit_rate: 60,
  duration: 2000,
  ttft: 500,
  tokenRate: 40,
  thinkTokens: 5,
  isTruncated: false,
  ...over,
});

afterEach(() => setChartType('auto'));

describe('自定义图表聚合', () => {
  it('round 维度按单条记录返回', () => {
    const es = [entry(), entry({ total_tokens: 80, cost: 0.01 })];
    const { labels, series } = aggregateForChart(es, ['total_token', 'total_cost'], 'round');
    expect(labels).toEqual(['#1', '#2']);
    expect(series[0].data).toEqual([120, 80]);
    expect(series[1].data).toEqual([0.03, 0.01]);
  });

  it('按日聚合 token/费用求和，请求数计数', () => {
    const es = [entry(), entry(), entry({ total_tokens: 30, cost: 0.01 })];
    const { labels, series } = aggregateForChart(es, ['total_token', 'total_cost', 'request_count'], 'day');
    expect(labels).toHaveLength(1);
    expect(series[0].data[0]).toBe(270);
    expect(series[1].data[0]).toBe(0.07);
    expect(series[2].data[0]).toBe(3);
  });

  it('命中率按桶内 token 加权，而不是百分比平均', () => {
    const es = [
      entry({ cache_hit_tokens: 90, cache_miss_tokens: 10 }),
      entry({ cache_hit_tokens: 10, cache_miss_tokens: 90 }),
    ];
    const { series } = aggregateForChart(es, ['hit_rate'], 'day');
    expect(series[0].data[0]).toBe(50);
  });

  it('平均耗时忽略 0/空值', () => {
    const es = [entry({ duration: 2000 }), entry({ duration: 0 }), entry({ duration: undefined })];
    const { series } = aggregateForChart(es, ['avg_duration'], 'day');
    expect(series[0].data[0]).toBe(2);
  });

  it('截断率按条数比例', () => {
    const es = [entry({ isTruncated: true }), entry(), entry(), entry()];
    const { series } = aggregateForChart(es, ['truncation_rate'], 'day');
    expect(series[0].data[0]).toBe(25);
  });

  it('单条比率返回 0-100', () => {
    expect(getYValue(entry({ cache_hit_tokens: 30, cache_miss_tokens: 70 }), 'hit_rate')).toBe(30);
    expect(getYValue(entry({ completion_tokens: 40, thinkTokens: 10 }), 'think_ratio')).toBe(25);
    expect(getYValue(entry({ isTruncated: true }), 'truncation_rate')).toBe(100);
    expect(getYValue(entry({ ttft: 1500 }), 'avg_ttft')).toBe(1.5);
  });

  it('展示方式状态可切换，非法值回退自动', () => {
    setChartType('area');
    expect(getChartType()).toBe('area');
    setChartType('xxx' as any);
    expect(getChartType()).toBe('auto');
  });

  it('默认 Y 只包含已定义维度', () => {
    const keys = new Set(Y_OPTIONS.map(o => o.key));
    for (const k of DEFAULT_Y_KEYS) expect(keys.has(k)).toBe(true);
  });
});
