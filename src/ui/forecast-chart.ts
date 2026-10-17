/**
 * 趋势预测图表 — 主趋势、缓存命中率、累计成本三张图。
 * 统一在此管理 ECharts 实例、主题取色、resize 与 dispose。
 */
import type { ForecastSeries } from '../stats/forecast-series';

type CurrencyInfo = { code: string; symbol: string; rate: number };

export type ForecastChartOptions = {
  series: ForecastSeries;
  ctxLimit: number | null;
  currency: CurrencyInfo;
  /** 金额格式化（已按全站币种换算） */
  formatCost: (value: number, digits?: number) => string;
};

const instances: Record<string, any> = {};
let echartsPromise: Promise<any> | null = null;
let resizeObserver: ResizeObserver | null = null;
let resizeBound = false;

function getDoc(): Document {
  return (window.parent as any)?.document ?? document;
}

function themeColor(name: string, fallback: string): string {
  try {
    const doc = getDoc();
    const el = doc.getElementById('aus-panel') || doc.documentElement;
    const value = getComputedStyle(el).getPropertyValue(name).trim();
    return value || fallback;
  } catch {
    return fallback;
  }
}

async function loadECharts(): Promise<any> {
  if (!echartsPromise) {
    echartsPromise = (async () => {
      const echarts: any = await import('echarts/core');
      const { LineChart, ScatterChart } = await import('echarts/charts');
      const {
        GridComponent,
        TooltipComponent,
        LegendComponent,
        MarkLineComponent,
        MarkPointComponent,
        GraphicComponent,
      } = await import('echarts/components');
      const { CanvasRenderer } = await import('echarts/renderers');
      echarts.use([
        LineChart,
        ScatterChart,
        GridComponent,
        TooltipComponent,
        LegendComponent,
        MarkLineComponent,
        MarkPointComponent,
        GraphicComponent,
        CanvasRenderer,
      ]);
      return echarts;
    })();
  }
  return echartsPromise;
}

function compactNumber(value: number): string {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿';
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + '万';
  return Math.round(n).toLocaleString('zh-CN');
}

function axisMoney(currency: CurrencyInfo, cnyValue: number): string {
  const n = currency.code === 'USD'
    ? (Number(cnyValue) || 0) / (currency.rate || 1)
    : (Number(cnyValue) || 0);
  if (currency.code === 'USD') {
    if (Math.abs(n) >= 1) return currency.symbol + n.toFixed(2);
    if (Math.abs(n) >= 0.01) return currency.symbol + n.toFixed(4);
    return currency.symbol + n.toFixed(5);
  }
  if (Math.abs(n) >= 1) return currency.symbol + n.toFixed(2);
  return currency.symbol + n.toFixed(4);
}

async function initChart(id: string, echarts: any): Promise<any | null> {
  const doc = getDoc();
  const el = doc.getElementById(id) as HTMLElement | null;
  if (!el) return null;
  if (!el.clientWidth || !el.clientHeight) return null;
  if (instances[id]) {
    try { instances[id].dispose(); } catch {}
    delete instances[id];
  }
  try {
    const existing = echarts.getInstanceByDom?.(el);
    if (existing) existing.dispose();
  } catch {}
  el.innerHTML = '';
  const chart = echarts.init(el);
  instances[id] = chart;
  return chart;
}

function ensureResizeObserver(): void {
  if (resizeObserver || typeof ResizeObserver === 'undefined') return;
  const doc = getDoc();
  const targets = ['aus-forecast-main-chart', 'aus-forecast-hit-chart', 'aus-forecast-cost-chart'];
  const observed: HTMLElement[] = [];
  for (const id of targets) {
    const el = doc.getElementById(id) as HTMLElement | null;
    if (el) observed.push(el);
  }
  if (!observed.length) return;
  resizeObserver = new ResizeObserver(() => {
    try { resizeForecastCharts(); } catch {}
  });
  observed.forEach((el) => resizeObserver!.observe(el));
  if (!resizeBound) {
    resizeBound = true;
    try {
      window.addEventListener('resize', () => {
        try { resizeForecastCharts(); } catch {}
      });
      const parentWindow = (window.parent as any);
      if (parentWindow && parentWindow !== window && parentWindow.addEventListener) {
        parentWindow.addEventListener('resize', () => {
          try { resizeForecastCharts(); } catch {}
        });
      }
    } catch {}
  }
}

export function resizeForecastCharts(): void {
  for (const id of Object.keys(instances)) {
    try { instances[id]?.resize(); } catch {}
  }
}

export function disposeForecastCharts(): void {
  for (const id of Object.keys(instances)) {
    try { instances[id]?.dispose(); } catch {}
    delete instances[id];
  }
  if (resizeObserver) {
    try { resizeObserver.disconnect(); } catch {}
    resizeObserver = null;
  }
}

function buildLabels(series: ForecastSeries): { labels: string[]; historyLength: number; futureLength: number } {
  const labels = [
    ...series.history.map((point) => `#${point.round}`),
    ...series.future.map((point) => `+${point.round - series.currentRound}`),
  ];
  return { labels, historyLength: series.history.length, futureLength: series.future.length };
}

function futureOnlySeries(
  historyLength: number,
  futureValues: number[],
  connection: number | null,
): Array<number | null> {
  const result = new Array<number | null>(historyLength + futureValues.length).fill(null);
  if (historyLength > 0 && connection != null) result[historyLength - 1] = connection;
  for (let i = 0; i < futureValues.length; i += 1) result[historyLength + i] = futureValues[i];
  return result;
}

function baseAxisStyle(border: string, text3: string) {
  return {
    axisLine: { lineStyle: { color: border } },
    axisTick: { show: false },
    axisLabel: { color: text3, fontSize: 12, hideOverlap: true },
  };
}

function compactionTooltip(point: any): string {
  if (!point) return '';
  return `<div style="font-size:11px;color:#9CA3AF;">压缩前 ${compactNumber(point.before)} → 后 ${compactNumber(point.after)}（降 ${Math.round(point.dropPct * 100)}%）</div>`;
}

async function renderMainChart(echarts: any, options: ForecastChartOptions): Promise<void> {
  const chart = await initChart('aus-forecast-main-chart', echarts);
  if (!chart) return;
  const { series, ctxLimit, currency, formatCost } = options;
  const { labels, historyLength } = buildLabels(series);
  if (!labels.length) return;
  const border = themeColor('--ds-border', '#E5E7EB');
  const text3 = themeColor('--ds-text-3', '#9CA3AF');
  const text = themeColor('--ds-text', '#111827');
  const cardInner = themeColor('--ds-card-inner', '#FFFFFF');

  const historyHit = series.history.map((point) => point.hit);
  const historyMiss = series.history.map((point) => point.miss);
  const historyInput = series.history.map((point) => point.input);
  const historyOutput = series.history.map((point) => point.output);
  const historyCost = series.history.map((point) => point.cost);
  const futureInput = series.future.map((point) => point.input);
  const futureOutput = series.future.map((point) => point.output);
  const futureCost = series.future.map((point) => point.cost ?? 0);

  const lastInput = historyLength ? historyInput[historyLength - 1] : null;
  const lastOutput = historyLength ? historyOutput[historyLength - 1] : null;
  const lastCost = historyLength ? historyCost[historyLength - 1] : null;

  const predInput = futureOnlySeries(historyLength, futureInput, lastInput);
  const predOutput = futureOnlySeries(historyLength, futureOutput, lastOutput);
  const predCost = series.future.some((point) => point.cost != null)
    ? futureOnlySeries(historyLength, futureCost, lastCost)
    : null;

  const bandLow = futureOnlySeries(historyLength, series.future.map((point) => point.inputLow), lastInput);
  const bandHigh = futureOnlySeries(
    historyLength,
    series.future.map((point) => Math.max(0, point.inputHigh - point.inputLow)),
    0,
  );

  const historyCompactions = series.history
    .filter((point) => point.compaction)
    .map((point) => {
      const detail = series.compactions.find((item) => item.round === point.round);
      return { value: [`#${point.round}`, point.input], compaction: detail };
    });
  const futureCompactions = series.future
    .filter((point) => point.compaction)
    .map((point) => ({ value: [`+${point.round - series.currentRound}`, point.input], compaction: null }));

  const markLineData: any[] = [];
  for (const compaction of series.compactions) {
    markLineData.push({
      xAxis: `#${compaction.round}`,
      lineStyle: { color: '#F59E0B', width: 1, type: 'dashed', opacity: 0.45 },
      label: { show: false },
    });
  }
  for (const point of series.future.filter((item) => item.compaction)) {
    markLineData.push({
      xAxis: `+${point.round - series.currentRound}`,
      lineStyle: { color: '#F59E0B', width: 1, type: 'dotted', opacity: 0.6 },
      label: { show: false },
    });
  }
  if (ctxLimit != null) {
    markLineData.push({
      yAxis: ctxLimit,
      lineStyle: { color: '#DC2626', width: 1, type: 'dashed', opacity: 0.75 },
      label: {
        show: true,
        position: 'insideEndTop',
        formatter: `参考上限 ${compactNumber(ctxLimit)}`,
        color: '#DC2626',
        fontSize: 10,
      },
    });
  }

  const markArea = historyLength && series.future.length
    ? {
      silent: true,
      itemStyle: { color: 'rgba(16, 185, 129, 0.06)' },
      label: { show: false },
      data: [[{ xAxis: labels[historyLength - 1] }, { xAxis: labels[labels.length - 1] }]],
    }
    : undefined;

  const legendData = [
    '历史输入(命中)',
    '历史输入(未命中)',
    '历史输出',
    ...(series.future.length ? ['预测输入', '预测输出'] : []),
    ...(predCost ? ['历史成本', '预测成本'] : []),
    ...(historyCompactions.length ? ['历史压缩'] : []),
    ...(futureCompactions.length ? ['预测压缩'] : []),
  ];

  const hasCost = predCost != null;
  const yAxis: any[] = [{
    type: 'value',
    name: 'tokens',
    position: 'left',
    nameTextStyle: { color: text3, fontSize: 11 },
    axisLine: { show: false },
    splitLine: { lineStyle: { color: border } },
    axisLabel: { color: text3, fontSize: 12, formatter: (value: number) => compactNumber(value) },
  }];
  if (hasCost) {
    yAxis.push({
      type: 'value',
      name: currency.code,
      position: 'right',
      nameTextStyle: { color: text3, fontSize: 11 },
      axisLine: { show: false },
      splitLine: { show: false },
      axisLabel: { color: text3, fontSize: 12, formatter: (value: number) => axisMoney(currency, value) },
    });
  }

  const seriesOption: any[] = [
    {
      name: '历史输入(命中)',
      type: 'line',
      stack: 'input',
      data: historyHit,
      smooth: false,
      showSymbol: false,
      lineStyle: { width: 1, color: '#0BA25E' },
      itemStyle: { color: '#0BA25E' },
      areaStyle: { color: 'rgba(11, 162, 94, 0.28)' },
      sampling: 'lttb',
      markLine: markLineData.length ? { silent: true, symbol: 'none', data: markLineData } : undefined,
      markArea,
    },
    {
      name: '历史输入(未命中)',
      type: 'line',
      stack: 'input',
      data: historyMiss,
      smooth: false,
      showSymbol: false,
      lineStyle: { width: 1, color: '#F87171' },
      itemStyle: { color: '#F87171' },
      areaStyle: { color: 'rgba(248, 113, 113, 0.26)' },
      sampling: 'lttb',
    },
    {
      name: '历史输出',
      type: 'line',
      data: historyOutput,
      smooth: false,
      showSymbol: false,
      lineStyle: { width: 1.6, color: '#6366F1' },
      itemStyle: { color: '#6366F1' },
      sampling: 'lttb',
    },
  ];
  if (series.future.length) {
    seriesOption.push(
      {
        name: '预测输入',
        type: 'line',
        data: predInput,
        smooth: false,
        showSymbol: false,
        lineStyle: { width: 1.8, color: '#0BA25E', type: 'dashed' },
        itemStyle: { color: '#0BA25E' },
      },
      {
        name: '预测输出',
        type: 'line',
        data: predOutput,
        smooth: false,
        showSymbol: false,
        lineStyle: { width: 1.4, color: '#8B5CF6', type: 'dashed' },
        itemStyle: { color: '#8B5CF6' },
      },
      {
        name: '__bandLow',
        type: 'line',
        stack: 'band',
        data: bandLow,
        showSymbol: false,
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        silent: true,
        tooltip: { show: false },
      },
      {
        name: '__bandHigh',
        type: 'line',
        stack: 'band',
        data: bandHigh,
        showSymbol: false,
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(11, 162, 94, 0.12)' },
        silent: true,
        tooltip: { show: false },
      },
    );
  }
  if (predCost) {
    seriesOption.push(
      {
        name: '历史成本',
        type: 'line',
        yAxisIndex: 1,
        data: historyCost,
        smooth: false,
        showSymbol: false,
        lineStyle: { width: 1.8, color: '#FF6A00' },
        itemStyle: { color: '#FF6A00' },
        sampling: 'lttb',
      },
      {
        name: '预测成本',
        type: 'line',
        yAxisIndex: 1,
        data: predCost,
        smooth: false,
        showSymbol: false,
        lineStyle: { width: 1.8, color: '#FF6A00', type: 'dashed' },
        itemStyle: { color: '#FF6A00' },
      },
    );
  }
  if (historyCompactions.length) {
    seriesOption.push({
      name: '历史压缩',
      type: 'scatter',
      data: historyCompactions,
      symbol: 'triangle',
      symbolSize: 9,
      itemStyle: { color: '#F59E0B' },
      z: 8,
    });
  }
  if (futureCompactions.length) {
    seriesOption.push({
      name: '预测压缩',
      type: 'scatter',
      data: futureCompactions,
      symbol: 'diamond',
      symbolSize: 8,
      itemStyle: { color: '#F59E0B', opacity: 0.8 },
      z: 8,
    });
  }

  const maxLabels = 12;
  const interval = labels.length <= maxLabels ? 0 : Math.ceil(labels.length / maxLabels) - 1;
  chart.setOption({
    animation: false,
    backgroundColor: 'transparent',
    legend: {
      type: 'scroll',
      top: 0,
      left: 0,
      right: 0,
      data: legendData,
      textStyle: { color: text3, fontSize: 11 },
      itemWidth: 14,
      itemHeight: 8,
      pageIconColor: text3,
      pageIconInactiveColor: border,
      pageTextStyle: { color: text3, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: cardInner,
      borderColor: border,
      borderWidth: 1,
      textStyle: { color: text, fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: border } },
      formatter: (params: any) => {
        if (!Array.isArray(params) || !params.length) return '';
        const index = params[0].dataIndex;
        const label = labels[index] || '';
        const isFuture = index >= historyLength;
        const roundNumber = isFuture
          ? series.currentRound + (index - historyLength) + 1
          : index + 1;
        let html = `<div style="font-weight:600;margin-bottom:6px;">第 ${roundNumber} 轮${isFuture ? '（预测）' : ''}</div>`;
        for (const param of params) {
          if (!param || String(param.seriesName).startsWith('__')) continue;
          if (param.seriesName === '历史压缩' || param.seriesName === '预测压缩') continue;
          const value = Array.isArray(param.value) ? param.value[1] : param.value;
          if (value == null || !Number.isFinite(Number(value))) continue;
          const isCost = param.seriesName.includes('成本');
          const display = isCost
            ? formatCost(Number(value), 4)
            : compactNumber(Number(value)) + ' tok';
          html += `<div style="display:flex;align-items:center;gap:6px;line-height:1.7;"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${param.color};"></span><span>${param.seriesName}</span><span style="margin-left:auto;font-weight:600;">${display}</span></div>`;
        }
        const hitPoint = historyCompactions.find((point) => point.value[0] === label);
        if (hitPoint?.compaction) html += compactionTooltip(hitPoint.compaction);
        const futurePoint = futureCompactions.find((point) => point.value[0] === label);
        if (futurePoint) html += '<div style="font-size:11px;color:#F59E0B;">预测压缩点（按历史压缩节奏）</div>';
        return `<div style="padding:2px 4px;min-width:190px;">${html}</div>`;
      },
    },
    grid: { left: 52, right: hasCost ? 58 : 20, top: 42, bottom: 30 },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      ...baseAxisStyle(border, text3),
      axisLabel: { color: text3, fontSize: 12, interval, hideOverlap: true },
    },
    yAxis,
    series: seriesOption,
  }, true);
}

async function renderHitChart(echarts: any, options: ForecastChartOptions): Promise<void> {
  const chart = await initChart('aus-forecast-hit-chart', echarts);
  if (!chart) return;
  const { series } = options;
  const { labels, historyLength } = buildLabels(series);
  if (!labels.length) return;
  const border = themeColor('--ds-border', '#E5E7EB');
  const text3 = themeColor('--ds-text-3', '#9CA3AF');
  const text = themeColor('--ds-text', '#111827');
  const cardInner = themeColor('--ds-card-inner', '#FFFFFF');

  const historyRate = series.history.map((point) => (point.hitRate == null ? null : point.hitRate * 100));
  const lastRate = historyLength ? historyRate[historyLength - 1] : null;
  const futureRate = futureOnlySeries(
    historyLength,
    series.future.map((point) => point.hitRate * 100),
    lastRate,
  );
  const hasData = series.hit.hasData;
  const fallbackLine = !hasData
    ? [{
      yAxis: series.hit.rate * 100,
      lineStyle: { color: '#0BA25E', width: 1, type: 'dashed', opacity: 0.7 },
      label: {
        show: true,
        position: 'insideEndTop',
        formatter: `回退命中率 ${Math.round(series.hit.rate * 100)}%`,
        color: '#0BA25E',
        fontSize: 10,
      },
    }]
    : [];
  const compactionLines = series.compactions.map((point) => ({
    xAxis: `#${point.round}`,
    lineStyle: { color: '#F59E0B', width: 1, type: 'dashed', opacity: 0.35 },
    label: { show: false },
  }));
  const interval = labels.length <= 12 ? 0 : Math.ceil(labels.length / 12) - 1;
  chart.setOption({
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: cardInner,
      borderColor: border,
      borderWidth: 1,
      textStyle: { color: text, fontSize: 12 },
      formatter: (params: any) => {
        if (!Array.isArray(params) || !params.length) return '';
        const index = params[0].dataIndex;
        const label = labels[index] || '';
        const isFuture = index >= historyLength;
        let html = `<div style="font-weight:600;margin-bottom:4px;">第 ${isFuture ? series.currentRound + (index - historyLength) + 1 : index + 1} 轮${isFuture ? '（预测）' : ''}</div>`;
        for (const param of params) {
          if (!param || String(param.seriesName).startsWith('__')) continue;
          const value = Array.isArray(param.value) ? param.value[1] : param.value;
          if (value == null || !Number.isFinite(Number(value))) continue;
          html += `<div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${param.color};"></span><span>${param.seriesName}</span><span style="margin-left:auto;font-weight:600;">${Number(value).toFixed(1)}%</span></div>`;
        }
        return `<div style="padding:2px 4px;min-width:160px;">${html}</div>`;
      },
    },
    grid: { left: 42, right: 18, top: 18, bottom: 26 },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      ...baseAxisStyle(border, text3),
      axisLabel: { color: text3, fontSize: 12, interval, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: border } },
      axisLabel: { color: text3, fontSize: 12, formatter: (value: number) => `${value}%` },
    },
    series: [
      {
        name: '缓存命中率',
        type: 'line',
        data: historyRate,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { width: 1.8, color: '#0BA25E' },
        itemStyle: { color: '#0BA25E' },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [...compactionLines, ...fallbackLine],
        },
      },
      ...(series.future.length ? [{
        name: '预测命中率',
        type: 'line',
        data: futureRate,
        showSymbol: false,
        lineStyle: { width: 1.8, color: '#0BA25E', type: 'dashed' },
        itemStyle: { color: '#0BA25E' },
      }] : []),
    ],
  }, true);
}

async function renderCostChart(echarts: any, options: ForecastChartOptions): Promise<void> {
  const chart = await initChart('aus-forecast-cost-chart', echarts);
  if (!chart) return;
  const { series, currency, formatCost } = options;
  const { labels, historyLength } = buildLabels(series);
  if (!labels.length) return;
  const border = themeColor('--ds-border', '#E5E7EB');
  const text3 = themeColor('--ds-text-3', '#9CA3AF');
  const text = themeColor('--ds-text', '#111827');
  const cardInner = themeColor('--ds-card-inner', '#FFFFFF');

  if (!series.future.some((point) => point.cost != null)) {
    chart.setOption({
      animation: false,
      backgroundColor: 'transparent',
      graphic: [{
        type: 'text',
        left: 'center',
        top: 'middle',
        style: { text: '未配置价格，无法估算成本', fill: text3, fontSize: 12 },
      }],
      xAxis: { type: 'category', data: labels, show: false },
      yAxis: { type: 'value', show: false },
      series: [],
    }, true);
    return;
  }

  const historyCumulative = series.history.map((point) => point.cumulativeCost);
  const lastCumulative = historyLength ? historyCumulative[historyLength - 1] : 0;
  const futureCumulative = futureOnlySeries(
    historyLength,
    series.future.map((point) => point.cumulativeCost ?? lastCumulative),
    lastCumulative,
  );
  const futureTotal = series.future.reduce((sum, point) => sum + (point.cost ?? 0), 0);
  const interval = labels.length <= 12 ? 0 : Math.ceil(labels.length / 12) - 1;

  chart.setOption({
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: cardInner,
      borderColor: border,
      borderWidth: 1,
      textStyle: { color: text, fontSize: 12 },
      formatter: (params: any) => {
        if (!Array.isArray(params) || !params.length) return '';
        const index = params[0].dataIndex;
        const isFuture = index >= historyLength;
        let html = `<div style="font-weight:600;margin-bottom:4px;">第 ${isFuture ? series.currentRound + (index - historyLength) + 1 : index + 1} 轮${isFuture ? '（预测）' : ''}</div>`;
        for (const param of params) {
          const value = Array.isArray(param.value) ? param.value[1] : param.value;
          if (value == null || !Number.isFinite(Number(value))) continue;
          html += `<div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${param.color};"></span><span>${param.seriesName}</span><span style="margin-left:auto;font-weight:600;">${formatCost(Number(value), 4)}</span></div>`;
        }
        return `<div style="padding:2px 4px;min-width:170px;">${html}</div>`;
      },
    },
    graphic: futureTotal > 0 ? [{
      type: 'text',
      right: 10,
      top: 0,
      style: {
        text: `未来 ${series.future.length} 轮 ≈ ${formatCost(futureTotal, 4)}`,
        fill: text3,
        fontSize: 11,
      },
    }] : undefined,
    grid: { left: 58, right: 22, top: 28, bottom: 26 },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      ...baseAxisStyle(border, text3),
      axisLabel: { color: text3, fontSize: 12, interval, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: border } },
      axisLabel: { color: text3, fontSize: 12, formatter: (value: number) => axisMoney(currency, value) },
    },
    series: [
      {
        name: '累计成本',
        type: 'line',
        data: historyCumulative,
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 1.8, color: '#FF6A00' },
        itemStyle: { color: '#FF6A00' },
        areaStyle: { color: 'rgba(255, 106, 0, 0.12)' },
        sampling: 'lttb',
      },
      {
        name: '预测累计成本',
        type: 'line',
        data: futureCumulative,
        showSymbol: false,
        lineStyle: { width: 1.8, color: '#FF6A00', type: 'dashed' },
        itemStyle: { color: '#FF6A00' },
      },
    ],
  }, true);
}

export async function renderForecastCharts(options: ForecastChartOptions): Promise<void> {
  let echarts: any;
  try {
    echarts = await loadECharts();
  } catch (error) {
    console.error('[Api-Usage] 预测图表加载失败', error);
    return;
  }
  ensureResizeObserver();
  await Promise.all([
    renderMainChart(echarts, options),
    renderHitChart(echarts, options),
    renderCostChart(echarts, options),
  ]);
}
