import { localDay } from '../utils/date';

export type YKind = 'token' | 'cost' | 'count' | 'duration' | 'rate' | 'percent';
export type YAgg = 'sum' | 'avg' | 'ratio';
export type YGroup = 'token' | 'cost' | 'perf' | 'ratio';
export type YKey =
  | 'input_hit_token' | 'input_miss_token' | 'output_token' | 'total_token' | 'avg_tokens'
  | 'input_hit_cost' | 'input_miss_cost' | 'output_cost' | 'total_cost' | 'avg_cost'
  | 'request_count' | 'avg_ttft' | 'avg_duration' | 'avg_rate'
  | 'hit_rate' | 'think_ratio' | 'truncation_rate';
export type XKey = 'round' | 'hour' | 'day' | 'week' | 'month';
export type ChartType = 'auto' | 'bar' | 'line' | 'area';

export type YOption = {
  key: YKey;
  label: string;
  unit: string;
  kind: YKind;
  agg: YAgg;
  group: YGroup;
  color: string;
};

export const Y_OPTIONS: YOption[] = [
  // Token
  { key: 'input_hit_token', label: '输入(命中) token', unit: 'tokens', kind: 'token', agg: 'sum', group: 'token', color: '#0BA25E' },
  { key: 'input_miss_token', label: '输入(未命中) token', unit: 'tokens', kind: 'token', agg: 'sum', group: 'token', color: '#F87171' },
  { key: 'output_token', label: '输出 token', unit: 'tokens', kind: 'token', agg: 'sum', group: 'token', color: '#6366F1' },
  { key: 'total_token', label: '总 Token', unit: 'tokens', kind: 'token', agg: 'sum', group: 'token', color: '#111827' },
  { key: 'avg_tokens', label: '平均每轮 Token', unit: 'tokens', kind: 'token', agg: 'avg', group: 'token', color: '#0EA5E9' },
  // 费用
  { key: 'input_hit_cost', label: '输入(命中)费用', unit: 'CNY', kind: 'cost', agg: 'sum', group: 'cost', color: '#10B981' },
  { key: 'input_miss_cost', label: '输入(未命中)费用', unit: 'CNY', kind: 'cost', agg: 'sum', group: 'cost', color: '#F59E0B' },
  { key: 'output_cost', label: '输出费用', unit: 'CNY', kind: 'cost', agg: 'sum', group: 'cost', color: '#8B5CF6' },
  { key: 'total_cost', label: '总费用', unit: 'CNY', kind: 'cost', agg: 'sum', group: 'cost', color: '#FF6A00' },
  { key: 'avg_cost', label: '平均每轮成本', unit: 'CNY', kind: 'cost', agg: 'avg', group: 'cost', color: '#EA580C' },
  // 请求与性能
  { key: 'request_count', label: '请求数', unit: '次', kind: 'count', agg: 'sum', group: 'perf', color: '#64748B' },
  { key: 'avg_ttft', label: '平均首字延迟', unit: 's', kind: 'duration', agg: 'avg', group: 'perf', color: '#06B6D4' },
  { key: 'avg_duration', label: '平均耗时', unit: 's', kind: 'duration', agg: 'avg', group: 'perf', color: '#0EA5E9' },
  { key: 'avg_rate', label: '平均速率', unit: 't/s', kind: 'rate', agg: 'avg', group: 'perf', color: '#14B8A6' },
  // 比率
  { key: 'hit_rate', label: '缓存命中率', unit: '%', kind: 'percent', agg: 'ratio', group: 'ratio', color: '#22C55E' },
  { key: 'think_ratio', label: '思维链占比', unit: '%', kind: 'percent', agg: 'ratio', group: 'ratio', color: '#A855F7' },
  { key: 'truncation_rate', label: '截断率', unit: '%', kind: 'percent', agg: 'ratio', group: 'ratio', color: '#EF4444' },
];

export const Y_GROUPS: Array<{ key: YGroup; label: string }> = [
  { key: 'token', label: 'Token' },
  { key: 'cost', label: '费用' },
  { key: 'perf', label: '请求与性能' },
  { key: 'ratio', label: '比率' },
];

export const X_OPTIONS: Array<{ key: XKey; label: string }> = [
  { key: 'round', label: '轮次' },
  { key: 'hour', label: '每小时' },
  { key: 'day', label: '每日' },
  { key: 'week', label: '每周' },
  { key: 'month', label: '每月' },
];

export const X_OPTIONS_WITHOUT_ROUND: Array<{ key: XKey; label: string }> = X_OPTIONS.filter((option) => option.key !== 'round');

/** 默认组合：缓存命中/未命中/输出三段 Token + 总费用曲线 + 命中率曲线，一屏内同时看用量、成本与缓存效果 */
export const DEFAULT_Y_KEYS: YKey[] = ['input_hit_token', 'input_miss_token', 'output_token', 'total_cost', 'hit_rate'];
export const DEFAULT_X_KEY: XKey = 'round';
export const DEFAULT_CHART_TYPE: ChartType = 'auto';
export type AxisLabelMode = 'auto' | 'all' | 'hide';
export const DEFAULT_AXIS_LABEL_MODE: AxisLabelMode = 'auto';

let ySelected: Set<YKey> = new Set<YKey>(DEFAULT_Y_KEYS);
let axisLabelMode: AxisLabelMode = DEFAULT_AXIS_LABEL_MODE;
let xSelected: XKey = DEFAULT_X_KEY;
let chartType: ChartType = DEFAULT_CHART_TYPE;

export function getYSelected(): YKey[] { return Array.from(ySelected); }
export function getXSelected(): XKey { return xSelected; }
export function getChartType(): ChartType { return chartType; }
export function setYSelected(keys: YKey[]) { ySelected = new Set(keys.length ? keys : DEFAULT_Y_KEYS); }
export function setXSelected(k: XKey) { xSelected = k; }
export function setChartType(t: ChartType) {
  chartType = (t === 'bar' || t === 'line' || t === 'area') ? t : 'auto';
}
export function getAxisLabelMode(): AxisLabelMode { return axisLabelMode; }
export function setAxisLabelMode(m: AxisLabelMode) {
  axisLabelMode = (m === 'all' || m === 'hide') ? m : 'auto';
}
export function toggleY(key: YKey) {
  if (ySelected.has(key)) { if (ySelected.size > 1) ySelected.delete(key); }
  else ySelected.add(key);
}

function toHourKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'), h = String(d.getHours()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:00`;
}
function toWeekKey(ts: number): string {
  const d = new Date(ts);
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp as any) - (yearStart as any)) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
function toMonthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getBucketKey(e: any, x: XKey, idx: number): string {
  if (x === 'round') return `#${idx + 1}`;
  if (x === 'hour') return toHourKey(e.timestamp);
  if (x === 'day') return localDay(e.timestamp);
  if (x === 'week') return toWeekKey(e.timestamp);
  if (x === 'month') return toMonthKey(e.timestamp);
  return localDay(e.timestamp);
}

/** 单条记录对应的数值（比率类返回 0-100） */
export function getYValue(e: any, y: YKey): number {
  switch (y) {
    case 'input_hit_token': return e.cache_hit_tokens || 0;
    case 'input_miss_token': return e.cache_miss_tokens || 0;
    case 'output_token': return e.completion_tokens || 0;
    case 'total_token': return e.total_tokens || 0;
    case 'avg_tokens': return e.total_tokens || 0;
    case 'input_hit_cost': {
      const hit = e.cache_hit_tokens || 0, miss = e.cache_miss_tokens || 0, tot = hit + miss;
      const ic = e.input_cost || 0;
      return tot ? ic * (hit / tot) : 0;
    }
    case 'input_miss_cost': {
      const hit = e.cache_hit_tokens || 0, miss = e.cache_miss_tokens || 0, tot = hit + miss;
      const ic = e.input_cost || 0;
      return tot ? ic * (miss / tot) : 0;
    }
    case 'output_cost': return e.output_cost || 0;
    case 'total_cost': return e.cost || 0;
    case 'avg_cost': return e.cost || 0;
    case 'request_count': return 1;
    case 'avg_ttft': return e.ttft ? e.ttft / 1000 : 0;
    case 'avg_duration': return e.duration ? e.duration / 1000 : 0;
    case 'avg_rate': return e.tokenRate || 0;
    case 'hit_rate': {
      const hit = e.cache_hit_tokens || 0, miss = e.cache_miss_tokens || 0;
      const tot = hit + miss;
      return tot ? (hit / tot) * 100 : 0;
    }
    case 'think_ratio': {
      const out = e.completion_tokens || 0, think = e.thinkTokens || 0;
      return out ? (think / out) * 100 : 0;
    }
    case 'truncation_rate': return e.isTruncated ? 100 : 0;
  }
  return 0;
}

function bucketValue(arr: any[], opt: YOption): number {
  if (opt.agg === 'sum') {
    let sum = 0;
    for (const e of arr) sum += getYValue(e, opt.key);
    return sum;
  }
  if (opt.agg === 'avg') {
    let sum = 0, n = 0;
    for (const e of arr) {
      const v = getYValue(e, opt.key);
      if (v > 0) { sum += v; n++; }
    }
    return n ? sum / n : 0;
  }
  // ratio：按桶内加权，而不是把单条百分比简单相加
  if (opt.key === 'hit_rate') {
    let hit = 0, miss = 0;
    for (const e of arr) { hit += e.cache_hit_tokens || 0; miss += e.cache_miss_tokens || 0; }
    const tot = hit + miss;
    return tot ? (hit / tot) * 100 : 0;
  }
  if (opt.key === 'think_ratio') {
    let think = 0, out = 0;
    for (const e of arr) { think += e.thinkTokens || 0; out += e.completion_tokens || 0; }
    return out ? (think / out) * 100 : 0;
  }
  if (opt.key === 'truncation_rate') {
    let n = 0;
    for (const e of arr) if (e.isTruncated) n++;
    return arr.length ? (n / arr.length) * 100 : 0;
  }
  return 0;
}

function precisionFor(kind: YKind): number {
  if (kind === 'cost') return 4;
  if (kind === 'percent' || kind === 'duration') return 2;
  if (kind === 'rate') return 1;
  return 0;
}

export type ChartSeries = {
  name: string;
  data: number[];
  kind: YKind;
  agg: YAgg;
  unit: string;
  group: YGroup;
  color: string;
};

export function aggregateForChart(entries: any[], yKeys: YKey[], xKey: XKey): { labels: string[]; series: ChartSeries[] } {
  const meta = new Map<YKey, YOption>(Y_OPTIONS.map(o => [o.key, o] as [YKey, YOption]));
  if (!yKeys.length) yKeys = DEFAULT_Y_KEYS;
  const round = xKey === 'round';
  const labels: string[] = [];
  let buckets: Map<string, any[]> | null = null;
  let sortedKeys: string[] = [];
  if (round) {
    labels.push(...entries.map((_, i) => `#${i + 1}`));
  } else {
    buckets = new Map();
    for (const e of entries) {
      const key = getBucketKey(e, xKey, 0);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(e);
    }
    sortedKeys = Array.from(buckets.keys()).sort();
    labels.push(...sortedKeys.map(k => {
      if (xKey === 'hour') return k.slice(5);
      if (xKey === 'day') return k.slice(5).replace('-', '/');
      return k;
    }));
  }
  const series: ChartSeries[] = yKeys.map(k => {
    const opt = meta.get(k)!;
    const data = round
      ? entries.map(e => Number(getYValue(e, k).toFixed(precisionFor(opt.kind))))
      : sortedKeys.map(b => Number(bucketValue((buckets as Map<string, any[]>).get(b)!, opt).toFixed(precisionFor(opt.kind))));
    return { name: opt.label, data, kind: opt.kind, agg: opt.agg, unit: opt.unit, group: opt.group, color: opt.color };
  });
  return { labels, series };
}
