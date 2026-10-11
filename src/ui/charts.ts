import { getSelectedSave } from '../store/index';
import { localDay } from '../utils/date';

let chart: any = null;
let heatChart: any = null;

async function getECharts() {
  // 按需加载：仅 Bar + Heatmap + Grid/Tooltip，避免全量 2.5MB
  const echarts: any = await import('echarts/core');
  const { BarChart, HeatmapChart } = await import('echarts/charts');
  const { GridComponent, TooltipComponent, VisualMapComponent } = await import('echarts/components');
  const { CanvasRenderer } = await import('echarts/renderers');
  echarts.use([BarChart, HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);
  return echarts;
}

function getDoc(): Document { return (window.parent as any)?.document ?? document; }

function aggregateByDay(entries: any[]) {
  const map: Record<string, { cost: number; tokens: number; count: number }> = {};
  for (const e of entries) {
    const k = localDay(e.timestamp);
    if (!map[k]) map[k] = { cost: 0, tokens: 0, count: 0 };
    map[k].cost += e.cost || 0;
    map[k].tokens += e.total_tokens || 0;
    map[k].count++;
  }
  const keys = Object.keys(map).sort();
  return keys.map(k => ({ day: k.slice(5).replace('-', '/'), cost: map[k].cost, tokens: map[k].tokens, count: map[k].count }));
}

export async function renderCharts() {
  const doc = getDoc();
  const s: any = getSelectedSave();
  if (!s) return;
  const barEl = doc.getElementById('aus-chart-bar');
  if (!barEl) return;
  const entries: any[] = s.history || [];
  if (!entries.length) { barEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ds-text-3);font-size:var(--aus-fs-base);">暂无数据，发起一次对话后自动统计</div>'; return; }
  const echarts: any = await getECharts();
  const agg = aggregateByDay(entries);
  const days = agg.map(a => a.day);
  const costs = agg.map(a => Number(a.cost.toFixed(4)));

  if (!chart) chart = echarts.init(barEl);
  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 32, right: 12, top: 12, bottom: 28 },
    tooltip: { trigger: 'axis', backgroundColor: 'var(--ds-text)', textStyle: { color: 'var(--ds-card-inner)', fontSize: 12 }, borderWidth: 0 },
    xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: 'var(--ds-border)' } }, axisLabel: { color: 'var(--ds-text-3)', fontSize: 12 }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: 'var(--ds-border)' } }, axisLabel: { color: 'var(--ds-text-3)', fontSize: 12 } },
    series: [{ type: 'bar', data: costs, itemStyle: { color: '#FF6A00', borderRadius: [4, 4, 0, 0] }, barWidth: 14, emphasis: { itemStyle: { color: '#FF7A00' } } }],
  });

  // 热力图（简化：按日 tokens 强度条）
  const heatEl = doc.getElementById('aus-heatmap');
  if (heatEl) {
    if (!heatChart) heatChart = echarts.init(heatEl);
    const max = Math.max(...agg.map(a => a.tokens), 1);
    heatChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { formatter: (p: any) => `${p.data[0]}: ${p.data[1]} tokens` },
      grid: { left: 40, right: 12, top: 8, bottom: 24 },
      xAxis: { type: 'category', data: days, axisLabel: { color: 'var(--ds-text-3)', fontSize: 12 }, axisLine: { lineStyle: { color: 'var(--ds-border)' } } },
      yAxis: { type: 'category', data: ['Tokens'], axisLabel: { color: 'var(--ds-text-3)' }, axisLine: { show: false }, splitLine: { show: false } },
      visualMap: { min: 0, max, show: false, inRange: { color: ['#FFF7ED', '#FF6A00'] } },
      series: [{ type: 'heatmap', data: agg.map((a, i) => [i, 0, a.tokens]), label: { show: false }, emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.2)' } } }],
    });
  }
}

export function bindChartResize() {
  const doc = getDoc();
  const ro = new (window as any).ResizeObserver(() => { try { chart?.resize(); heatChart?.resize(); } catch {} });
  const bar = doc.getElementById('aus-chart-bar');
  const heat = doc.getElementById('aus-heatmap');
  if (bar) ro.observe(bar);
  if (heat) ro.observe(heat);
}
