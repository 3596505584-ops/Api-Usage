import { getSelectedSave } from '../store/index';
import { localDay } from '../utils/date';

export type YKey = 'input_hit_token'|'input_miss_token'|'output_token'|'total_token'|'input_hit_cost'|'input_miss_cost'|'output_cost'|'total_cost';
export type XKey = 'round'|'hour'|'day'|'week'|'month';

export const Y_OPTIONS: Array<{key:YKey,label:string,unit:string,kind:'token'|'cost',color:string}> = [
  { key:'input_hit_token', label:'输入(命中) token', unit:'tokens', kind:'token', color:'#0BA25E' },
  { key:'input_miss_token', label:'输入(未命中) token', unit:'tokens', kind:'token', color:'#F87171' },
  { key:'output_token', label:'输出 token', unit:'tokens', kind:'token', color:'#6366F1' },
  { key:'total_token', label:'总 Token', unit:'tokens', kind:'token', color:'#111827' },
  { key:'input_hit_cost', label:'输入(命中)费用', unit:'CNY', kind:'cost', color:'#10B981' },
  { key:'input_miss_cost', label:'输入(未命中)费用', unit:'CNY', kind:'cost', color:'#F59E0B' },
  { key:'output_cost', label:'输出费用', unit:'CNY', kind:'cost', color:'#8B5CF6' },
  { key:'total_cost', label:'总费用', unit:'CNY', kind:'cost', color:'#FF6A00' },
];

export const X_OPTIONS: Array<{key:XKey,label:string}> = [
  { key:'round', label:'轮次' },
  { key:'hour', label:'每小时' },
  { key:'day', label:'每日' },
  { key:'week', label:'每周' },
  { key:'month', label:'每月' },
];

export const X_OPTIONS_WITHOUT_ROUND: Array<{key:XKey,label:string}> = X_OPTIONS.filter((option) => option.key !== 'round');

/** 自定义图表的默认选中项：缓存命中 + 缓存未命中 + 输出 Token 三段拆分，配总费用曲线 */
export const DEFAULT_Y_KEYS: YKey[] = ['input_hit_token', 'input_miss_token', 'output_token', 'total_cost'];
/** 自定义图表的默认横轴：按轮次逐条展示 */
export const DEFAULT_X_KEY: XKey = 'round';

let ySelected: Set<YKey> = new Set<YKey>(DEFAULT_Y_KEYS);
let xSelected: XKey = DEFAULT_X_KEY;

export function getYSelected(): YKey[] { return Array.from(ySelected); }
export function getXSelected(): XKey { return xSelected; }
export function setYSelected(keys: YKey[]) { ySelected = new Set(keys.length?keys:DEFAULT_Y_KEYS); }
export function setXSelected(k: XKey) { xSelected = k; }
export function toggleY(key: YKey) {
  if (ySelected.has(key)) { if (ySelected.size>1) ySelected.delete(key); }
  else ySelected.add(key);
}

function toHourKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0'), h = String(d.getHours()).padStart(2,'0');
  return `${y}-${m}-${day} ${h}:00`;
}
function toWeekKey(ts: number): string {
  const d = new Date(ts);
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((tmp as any) - (yearStart as any)) / 86400000 + 1)/7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}
function toMonthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getBucketKey(e: any, x: XKey, idx: number): string {
  if (x==='round') return `#${idx+1}`;
  if (x==='hour') return toHourKey(e.timestamp);
  if (x==='day') return localDay(e.timestamp);
  if (x==='week') return toWeekKey(e.timestamp);
  if (x==='month') return toMonthKey(e.timestamp);
  return localDay(e.timestamp);
}

function getYValue(e: any, y: YKey): number {
  switch(y) {
    case 'input_hit_token': return e.cache_hit_tokens || 0;
    case 'input_miss_token': return e.cache_miss_tokens || 0;
    case 'output_token': return e.completion_tokens || 0;
    case 'total_token': return e.total_tokens || 0;
    case 'input_hit_cost': {
      const hit = e.cache_hit_tokens || 0, miss = e.cache_miss_tokens || 0, tot = hit+miss;
      const ic = e.input_cost || 0;
      return tot ? ic * (hit/tot) : 0;
    }
    case 'input_miss_cost': {
      const hit = e.cache_hit_tokens || 0, miss = e.cache_miss_tokens || 0, tot = hit+miss;
      const ic = e.input_cost || 0;
      return tot ? ic * (miss/tot) : 0;
    }
    case 'output_cost': return e.output_cost || 0;
    case 'total_cost': return e.cost || 0;
  }
  return 0;
}

export function aggregateForChart(entries: any[], yKeys: YKey[], xKey: XKey): { labels: string[]; series: Array<{name:string,data:number[],kind:'token'|'cost',color:string}> } {
  const yMeta = new Map<string, typeof Y_OPTIONS[number]>(Y_OPTIONS.map(o=>[o.key,o] as any));
  if (!yKeys.length) yKeys = DEFAULT_Y_KEYS as any;
  if (xKey==='round') {
    const labels = entries.map((_, i)=>`#${i+1}`);
    const series = yKeys.map(k=>{
      const meta = yMeta.get(k)!;
      return { name: meta.label, data: entries.map(e=> Number(getYValue(e,k).toFixed(String(k).includes('cost')?6:0))), kind: meta.kind, color: meta.color };
    });
    return { labels, series };
  }
  // 按 X 分桶聚合
  const buckets = new Map<string, any[]>();
  entries.forEach(e=>{
    const key = getBucketKey(e, xKey, 0);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(e);
  });
  const sortedKeys = Array.from(buckets.keys()).sort();
  const labels = sortedKeys.map(k=>{
    if (xKey==='hour') return k.slice(5); // MM-DD HH:00
    if (xKey==='day') return k.slice(5).replace('-','/');
    if (xKey==='week') return k;
    if (xKey==='month') return k;
    return k;
  });
  const series = yKeys.map(k=>{
    const meta = yMeta.get(k)!;
    const data = sortedKeys.map(bucket=>{
      const arr = buckets.get(bucket)!;
      let sum = 0; for (const e of arr) sum += getYValue(e,k);
      return Number(sum.toFixed(String(k).includes('cost')?4:0));
    });
    return { name: meta.label, data, kind: meta.kind, color: meta.color };
  });
  return { labels, series };
}
