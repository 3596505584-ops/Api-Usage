import { state } from '../store/index';
import { repository } from '../data/repository';
import {
  computeGlobalHitRate,
  computeModelHitRate,
  computeModelEfficiency,
} from '../data/computed';
import {
  buildForecastSeries,
  contextRoundsFor,
  simulateRemainingRounds,
  type ForecastOptions,
  type ForecastSeries,
  type HitFallback,
  type PriceTrio,
} from '../stats/forecast-series';
import type { ModelEfficiencyRow } from '../stats/model-efficiency';
import { energyScore, topPowerChats } from '../stats/energyScore';
import { ctxLimitForModel } from '../stats/forecast';
import { getPricing, isPeakHour, isWalletPeakHour } from '../services/pricing';
import { formatMoney, getDisplayCurrency, getWalletExchangeRate } from '../services/currency';
import { findWalletForHistory, findWalletModel, walletBalanceToCny } from '../data/wallets';
import { esc } from '../utils/date';
import { icon } from './icons';
import { disposeForecastCharts, renderForecastCharts } from './forecast-chart';

type HitMode = 'global' | 'model' | 'manual';
type EfficiencyScope = 'all' | 'chat';

type ForecastPreferences = {
  horizon: number;
  hitMode: HitMode;
  manualHit: number;
  compaction: boolean;
  scope: EfficiencyScope;
  showTop: boolean;
};

type ModelOption = { model: string; count: number; lastSeen: number };

type PriceContext = {
  model: string;
  wallet: any;
  walletModel: any;
  pricing: any;
  trio: PriceTrio | null;
  known: boolean;
  usePeak: boolean;
  label: string;
  walletLabel: string;
  nextTs: number;
};

const PREFS_KEY = 'aus_forecast_prefs_v1';
const HORIZONS = [5, 10, 20, 50, 100];

let selectedForecastKey = '__current__';
let selectedForecastModel: string | null = null;
let horizon = 10;
let hitMode: HitMode = 'global';
let manualHitRate = 50;
let compactionEnabled = true;
let efficiencyScope: EfficiencyScope = 'all';
let showTop = false;
let openDropdown: string | null = null;
let renderToken = 0;
let globalCloseBound = false;
let hitRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let lastFullHistory: any[] = [];
let lastEffectiveHistory: any[] = [];
let lastSeries: ForecastSeries | null = null;
let lastPriceContext: PriceContext | null = null;
let lastEfficiencyRows: ModelEfficiencyRow[] = [];
let lastEfficiencyHistory: any[] = [];
let lastEfficiencyLabel = '全部历史';
let efficiencySort: { key: keyof ModelEfficiencyRow; dir: 'asc' | 'desc' } | null = null;

function getDoc(): Document {
  return (window.parent as any)?.document ?? document;
}

function currentChatId(): string | null {
  try {
    const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
    return ctx?.getCurrentChatId?.() || null;
  } catch {
    return null;
  }
}

function loadPreferences(): void {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<ForecastPreferences>;
    if (HORIZONS.includes(Number(parsed.horizon))) horizon = Number(parsed.horizon);
    if (parsed.hitMode === 'global' || parsed.hitMode === 'model' || parsed.hitMode === 'manual') hitMode = parsed.hitMode;
    const manual = Number(parsed.manualHit);
    if (Number.isFinite(manual)) manualHitRate = Math.max(0, Math.min(100, manual));
    if (typeof parsed.compaction === 'boolean') compactionEnabled = parsed.compaction;
    if (parsed.scope === 'all' || parsed.scope === 'chat') efficiencyScope = parsed.scope;
    if (typeof parsed.showTop === 'boolean') showTop = parsed.showTop;
  } catch {}
}

function savePreferences(): void {
  try {
    const prefs: ForecastPreferences = {
      horizon,
      hitMode,
      manualHit: manualHitRate,
      compaction: compactionEnabled,
      scope: efficiencyScope,
      showTop,
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

function balanceNum(): number | null {
  const ignored = new Set(state.walletIgnored || []);
  const selected = String((state.settings as any).overviewWalletId || 'all');
  const wallets = (state.wallets || []).filter((wallet) => !ignored.has(wallet.id));
  const target = selected === 'all' ? wallets : wallets.filter((wallet) => wallet.id === selected);
  let total: number | null = null;
  for (const wallet of target) {
    const value = walletBalanceToCny(wallet, getWalletExchangeRate());
    if (value == null) continue;
    total = (total ?? 0) + value;
  }
  if (total == null) {
    const fallback = (state as any).customBalance || (state as any).balance?.balance;
    if (fallback == null || fallback === '') return null;
    const value = parseFloat(String(fallback));
    if (Number.isFinite(value)) total = value;
  }
  return total;
}

function getRecordedChatsForForecast(list: any[]): Array<{ chatId: string | null; chatName: string | null; displayName: string }> {
  const map = new Map<string, { chatId: string | null; chatName: string | null; lastSeen: number }>();
  for (const entry of list || []) {
    const chatId = (entry.chatId ?? null) as string | null;
    const chatName = (entry.chatName ?? null) as string | null;
    const key = chatId ?? '__null__';
    const timestamp = Number(entry?.timestamp) || 0;
    if (!map.has(key)) map.set(key, { chatId, chatName, lastSeen: timestamp });
    else {
      const current = map.get(key)!;
      if (timestamp >= current.lastSeen && chatName) current.chatName = chatName;
      if (timestamp > current.lastSeen) current.lastSeen = timestamp;
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .map((value) => {
      let display = value.chatName || '';
      if (!display) {
        if (value.chatId) display = value.chatId.length > 18 ? value.chatId.slice(0, 8) + '…' + value.chatId.slice(-4) : value.chatId;
        else display = '未分组/旧数据';
      }
      return { chatId: value.chatId, chatName: value.chatName, displayName: display };
    });
}

function getEffectiveHist(fullHist: any[]): any[] {
  if (selectedForecastKey === '__all__') return fullHist.slice();
  if (selectedForecastKey === '__current__') {
    return getCurrentChatHist(fullHist);
  }
  if (selectedForecastKey === '__null__') return fullHist.filter((entry) => !entry.chatId);
  return fullHist.filter((entry) => (entry.chatId ?? null) === selectedForecastKey);
}

function getCurrentChatHist(fullHist: any[]): any[] {
  const current = currentChatId();
  if (!current) return [];
  return fullHist.filter((entry) => (entry.chatId ?? null) === current);
}

function getForecastLabel(fullHist: any[]): string {
  if (selectedForecastKey === '__current__') {
    const current = currentChatId();
    return current ? '当前对话' : '当前对话（未打开）';
  }
  if (selectedForecastKey === '__all__') return '全部';
  if (selectedForecastKey === '__null__') return '未分组/旧数据';
  const found = getRecordedChatsForForecast(fullHist).find((chat) => (chat.chatId ?? '__null__') === selectedForecastKey);
  return found?.displayName || selectedForecastKey;
}

function getModelOptions(history: any[]): ModelOption[] {
  const map = new Map<string, ModelOption>();
  for (const entry of history || []) {
    const model = entry?.model;
    if (!model) continue;
    const timestamp = Number(entry?.timestamp) || 0;
    const current = map.get(model);
    if (current) {
      current.count += 1;
      if (timestamp > current.lastSeen) current.lastSeen = timestamp;
    } else {
      map.set(model, { model, count: 1, lastSeen: timestamp });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen);
}

function latestEntryForModel(history: any[], model: string | null): any | null {
  if (!history.length) return null;
  if (!model) return [...history].sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)).slice(-1)[0] || null;
  const filtered = history.filter((entry) => entry.model === model);
  if (!filtered.length) return null;
  return [...filtered].sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)).slice(-1)[0] || null;
}

function averageIntervalMs(history: any[]): number {
  if (history.length < 2) return 0;
  const sorted = [...history].sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)).slice(-21);
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const diff = (Number(sorted[i].timestamp) || 0) - (Number(sorted[i - 1].timestamp) || 0);
    if (diff > 0) diffs.push(diff);
  }
  return diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
}

function resolvePriceContext(history: any[], model: string | null): PriceContext | null {
  if (!model) return null;
  const latest = latestEntryForModel(history, model);
  if (!latest && !history.length) return null;
  const wallet = findWalletForHistory((state.wallets || []) as any, latest || history[history.length - 1] || {});
  const walletModel = findWalletModel(wallet, model);
  const pricing: any = getPricing(model, state.settings as any, wallet);
  const pending = pricing?.pending === true;
  const avgInterval = averageIntervalMs(history);
  const nextTs = latest?.timestamp ? Number(latest.timestamp) + avgInterval : Date.now();
  const usePeak = pricing?.usePeakPricing !== false && (wallet
    ? isWalletPeakHour(nextTs, wallet, state.settings as any)
    : isPeakHour(nextTs, state.settings as any));
  const tier = usePeak ? pricing?.peak : pricing?.offpeak;
  const trio: PriceTrio | null = pending || !tier
    ? null
    : {
      hit: Number(tier.hit) || 0,
      miss: Number(tier.miss) || 0,
      output: Number(tier.output) || 0,
    };
  return {
    model,
    wallet,
    walletModel,
    pricing,
    trio,
    known: !pending && trio != null,
    usePeak,
    label: pending ? '未配置价格' : pricing?.usePeakPricing === false ? '固定价' : usePeak ? '高峰价' : '低谷价',
    walletLabel: wallet?.name || '未归属钱包',
    nextTs,
  };
}

function formatCost(value: number, digits = 4): string {
  try {
    return formatMoney(value || 0, digits);
  } catch {
    return '¥' + (value || 0).toFixed(digits) + ' CNY';
  }
}

function compactTok(value: number): string {
  return Math.round(Number(value) || 0).toLocaleString('zh-CN');
}

function pct(value: number, digits = 1): string {
  return (Number(value) * 100).toFixed(digits) + '%';
}

function currencyInfo(): { code: 'CNY' | 'USD'; symbol: string; rate: number } {
  const currency = getDisplayCurrency();
  return { code: currency.code, symbol: currency.symbol, rate: currency.rate };
}

function hitSourceText(series: ForecastSeries): string {
  switch (series.hit.source) {
    case 'data':
      return series.hit.segmentSamples > 0
        ? `自动测算 · 当前段 ${series.hit.segmentSamples} 条记录`
        : '自动测算 · 对话历史有效样本';
    case 'global':
      return '无缓存数据 · 全站平均';
    case 'model':
      return '无缓存数据 · 同模型平均';
    case 'manual':
      return '无缓存数据 · 手动假设';
    default:
      return '无缓存数据 · 按 0% 保守估算';
  }
}

function closeAllDropdowns(): void {
  const doc = getDoc();
  for (const name of ['chat', 'model', 'horizon', 'hit', 'scope']) {
    const dropdown = doc.getElementById(`aus-forecast-${name}-dropdown`) as HTMLElement | null;
    if (dropdown) dropdown.style.display = 'none';
  }
  openDropdown = null;
}

function toggleDropdown(name: string): void {
  const doc = getDoc();
  if (openDropdown === name) {
    closeAllDropdowns();
    return;
  }
  closeAllDropdowns();
  const dropdown = doc.getElementById(`aus-forecast-${name}-dropdown`) as HTMLElement | null;
  if (!dropdown) return;
  dropdown.style.display = 'block';
  openDropdown = name;
}

function bindGlobalClose(): void {
  if (globalCloseBound) return;
  globalCloseBound = true;
  try {
    getDoc().addEventListener('click', () => closeAllDropdowns());
  } catch {}
}

function dropdownItem(attr: string, value: string, label: string, active: boolean, meta = ''): string {
  return `<div class="aus-forecast-dropdown-item${active ? ' is-active' : ''}" ${attr}="${esc(value)}" title="${esc(label)}">
    <span class="aus-forecast-dropdown-label">${esc(label)}</span>
    ${meta ? `<span class="aus-forecast-dropdown-meta">${esc(meta)}</span>` : ''}
  </div>`;
}

function renderChatDropdown(fullHist: any[]): void {
  const doc = getDoc();
  const dropdown = doc.getElementById('aus-forecast-chat-dropdown') as HTMLElement | null;
  if (!dropdown) return;
  const chats = getRecordedChatsForForecast(fullHist);
  let html = dropdownItem('data-fchat', '__current__', '当前对话', selectedForecastKey === '__current__');
  html += dropdownItem('data-fchat', '__all__', '全部', selectedForecastKey === '__all__');
  for (const chat of chats) {
    const key = chat.chatId ?? '__null__';
    html += dropdownItem('data-fchat', key, chat.displayName, selectedForecastKey === key, chat.chatId ? '' : '旧数据');
  }
  if (!chats.length) html += '<div class="aus-forecast-dropdown-empty">暂无对话</div>';
  dropdown.innerHTML = html;
  dropdown.querySelectorAll('[data-fchat]').forEach((el: any) => {
    el.onclick = (event: Event) => {
      event.stopPropagation();
      selectedForecastKey = el.getAttribute('data-fchat') || '__current__';
      selectedForecastModel = null;
      closeAllDropdowns();
      renderForecastView();
    };
  });
}

function renderModelDropdown(options: ModelOption[]): void {
  const doc = getDoc();
  const dropdown = doc.getElementById('aus-forecast-model-dropdown') as HTMLElement | null;
  if (!dropdown) return;
  dropdown.innerHTML = options.map((option) => dropdownItem(
    'data-fmodel',
    option.model,
    option.model,
    selectedForecastModel === option.model,
    `${option.count} 轮`,
  )).join('') || '<div class="aus-forecast-dropdown-empty">暂无模型</div>';
  dropdown.querySelectorAll('[data-fmodel]').forEach((el: any) => {
    el.onclick = (event: Event) => {
      event.stopPropagation();
      selectedForecastModel = el.getAttribute('data-fmodel') || null;
      closeAllDropdowns();
      renderForecastView();
    };
  });
}

function renderHorizonDropdown(): void {
  const doc = getDoc();
  const dropdown = doc.getElementById('aus-forecast-horizon-dropdown') as HTMLElement | null;
  if (!dropdown) return;
  dropdown.innerHTML = HORIZONS.map((value) => dropdownItem(
    'data-fhorizon',
    String(value),
    `${value} 轮`,
    horizon === value,
    value === 10 ? '默认' : '',
  )).join('');
  dropdown.querySelectorAll('[data-fhorizon]').forEach((el: any) => {
    el.onclick = (event: Event) => {
      event.stopPropagation();
      const value = Number(el.getAttribute('data-fhorizon'));
      if (HORIZONS.includes(value)) horizon = value;
      savePreferences();
      closeAllDropdowns();
      renderForecastView();
    };
  });
}

function hitModeLabel(mode: HitMode, globalRate: number | null, modelRate: number | null): string {
  if (mode === 'manual') return `手动 ${Math.round(manualHitRate)}%`;
  if (mode === 'model') return modelRate == null ? '同模型平均 —' : `同模型平均 ${pct(modelRate)}`;
  return globalRate == null ? '全站平均 —' : `全站平均 ${pct(globalRate)}`;
}

function renderHitControl(
  fullHist: any[],
  model: string | null,
  series: ForecastSeries | null,
  globalRate: number | null,
  modelRate: number | null,
): void {
  const doc = getDoc();
  const host = doc.getElementById('aus-forecast-hit-control') as HTMLElement | null;
  if (!host) return;
  if (selectedForecastKey === '__all__' || !model) {
    host.innerHTML = '';
    return;
  }
  if (series?.hit.hasData) {
    host.innerHTML = `<span class="aus-forecast-badge" title="命中率来自当前对话的缓存命中 token，不提供手动设置">自动测算 · ${pct(series.hit.rate)}</span>`;
    return;
  }
  host.innerHTML = `
    <div class="aus-forecast-picker" style="position:relative;">
      <div id="aus-forecast-hit-btn" class="aus-forecast-pill" title="该对话没有缓存命中数据，可选择平均命中率">
        <span class="aus-forecast-pill-label">平均命中率</span>
        <span class="aus-forecast-pill-value">${esc(hitModeLabel(hitMode, globalRate, modelRate))}</span>
        ${icon('chevron-down', 14)}
      </div>
      <div id="aus-forecast-hit-dropdown" class="aus-forecast-dropdown"></div>
    </div>
    ${hitMode === 'manual' ? `<div class="aus-forecast-hit-range">
      <input id="aus-forecast-hit-range" type="range" min="0" max="100" value="${Math.round(manualHitRate)}">
      <span id="aus-forecast-hit-range-val">${Math.round(manualHitRate)}%</span>
    </div>` : ''}
  `;
  const button = doc.getElementById('aus-forecast-hit-btn') as HTMLElement | null;
  const dropdown = doc.getElementById('aus-forecast-hit-dropdown') as HTMLElement | null;
  if (button) {
    button.onclick = (event: Event) => {
      event.stopPropagation();
      toggleDropdown('hit');
    };
  }
  if (dropdown) {
    dropdown.innerHTML = [
      dropdownItem('data-fhit', 'global', '全站平均', hitMode === 'global', globalRate == null ? '无样本' : pct(globalRate)),
      dropdownItem('data-fhit', 'model', '同模型平均', hitMode === 'model', modelRate == null ? '无样本' : pct(modelRate)),
      dropdownItem('data-fhit', 'manual', '手动假设', hitMode === 'manual', `${Math.round(manualHitRate)}%`),
    ].join('');
    dropdown.querySelectorAll('[data-fhit]').forEach((el: any) => {
      el.onclick = (event: Event) => {
        event.stopPropagation();
        const mode = el.getAttribute('data-fhit');
        if (mode === 'global' || mode === 'model' || mode === 'manual') hitMode = mode;
        savePreferences();
        closeAllDropdowns();
        renderForecastView();
      };
    });
  }
  const range = doc.getElementById('aus-forecast-hit-range') as HTMLInputElement | null;
  const valueLabel = doc.getElementById('aus-forecast-hit-range-val') as HTMLElement | null;
  if (range) {
    range.oninput = (event: Event) => {
      event.stopPropagation();
      manualHitRate = Math.max(0, Math.min(100, Number(range.value) || 0));
      if (valueLabel) valueLabel.textContent = `${Math.round(manualHitRate)}%`;
      if (hitRefreshTimer) clearTimeout(hitRefreshTimer);
      hitRefreshTimer = setTimeout(() => {
        savePreferences();
        renderForecastView();
      }, 180);
    };
    range.onchange = () => savePreferences();
  }
}

function renderToolbar(
  fullHist: any[],
  effective: any[],
  modelOptions: ModelOption[],
  model: string | null,
  priceContext: PriceContext | null,
  series: ForecastSeries | null,
  globalRate: number | null,
  modelRate: number | null,
): void {
  const doc = getDoc();
  bindGlobalClose();
  const chatLabel = doc.getElementById('aus-forecast-chat-label') as HTMLElement | null;
  if (chatLabel) chatLabel.textContent = getForecastLabel(fullHist);
  renderChatDropdown(fullHist);

  const chatButton = doc.getElementById('aus-forecast-chat-btn') as HTMLElement | null;
  if (chatButton) {
    chatButton.onclick = (event: Event) => {
      event.stopPropagation();
      toggleDropdown('chat');
    };
  }

  const modelWrap = doc.getElementById('aus-forecast-model-wrap') as HTMLElement | null;
  if (modelWrap) modelWrap.style.display = modelOptions.length > 1 && selectedForecastKey !== '__all__' ? 'flex' : 'none';
  const modelLabel = doc.getElementById('aus-forecast-model-label') as HTMLElement | null;
  if (modelLabel) modelLabel.textContent = model || '—';
  renderModelDropdown(modelOptions);
  const modelButton = doc.getElementById('aus-forecast-model-btn') as HTMLElement | null;
  if (modelButton) {
    modelButton.onclick = (event: Event) => {
      event.stopPropagation();
      toggleDropdown('model');
    };
  }

  const horizonLabel = doc.getElementById('aus-forecast-horizon-label') as HTMLElement | null;
  if (horizonLabel) horizonLabel.textContent = `${horizon} 轮`;
  renderHorizonDropdown();
  const horizonButton = doc.getElementById('aus-forecast-horizon-btn') as HTMLElement | null;
  if (horizonButton) {
    horizonButton.onclick = (event: Event) => {
      event.stopPropagation();
      toggleDropdown('horizon');
    };
  }

  renderHitControl(fullHist, model, series, globalRate, modelRate);

  const compactionToggle = doc.getElementById('aus-forecast-compaction-toggle') as HTMLInputElement | null;
  const compactionLabel = doc.getElementById('aus-forecast-compaction-label') as HTMLElement | null;
  if (compactionToggle) {
    compactionToggle.checked = compactionEnabled;
    compactionToggle.onchange = () => {
      compactionEnabled = compactionToggle.checked;
      savePreferences();
      renderForecastView();
    };
  }
  if (compactionLabel) {
    const detected = series?.compactionForecast.detected;
    compactionLabel.textContent = detected
      ? `压缩情景（检测到 ${series?.compactionForecast.count} 次）`
      : '压缩情景（未检测到）';
  }

  const sub = doc.getElementById('aus-forecast-sub') as HTMLElement | null;
  if (sub) {
    const parts: string[] = [];
    if (selectedForecastKey === '__all__') {
      parts.push(`全部历史 ${fullHist.length} 条`, '逐轮预测需选择单个对话');
    } else {
      parts.push(`样本 ${effective.length} 轮`);
      if (series) {
        parts.push(`当前段 ${series.fit.n} 轮`);
        if (series.compactionForecast.detected) parts.push(`最近压缩第 ${series.compactionForecast.lastRound} 轮`);
      }
      if (priceContext?.known) {
        parts.push(`计价 ${priceContext.walletLabel} · ${model || '—'} · ${priceContext.label}`);
      } else {
        parts.push('未配置价格，成本类不可用');
      }
    }
    sub.textContent = parts.join(' · ');
  }
}

function kpiCard(
  label: string,
  value: string,
  sub: string,
  tone: 'default' | 'green' | 'orange' | 'red' = 'default',
  title = '',
): string {
  return `<div class="ds-card aus-forecast-kpi aus-forecast-kpi-${tone}"${title ? ` title="${esc(title)}"` : ''}>
    <div class="aus-forecast-kpi-label">${esc(label)}</div>
    <div class="aus-forecast-kpi-value">${value}</div>
    <div class="aus-forecast-kpi-sub">${sub}</div>
  </div>`;
}

function renderKpis(
  series: ForecastSeries,
  priceContext: PriceContext | null,
  ctxLimit: number | null,
  options: ForecastOptions,
  balance: number | null,
): void {
  const doc = getDoc();
  const host = doc.getElementById('aus-forecast-kpis') as HTMLElement | null;
  if (!host) return;
  const remaining = balance != null ? simulateRemainingRounds(balance, series, options) : null;
  const ctxRounds = contextRoundsFor(series, ctxLimit, options.compaction);
  const futureCost = series.future.reduce((sum, point) => sum + (point.cost ?? 0), 0);
  const futureInput = series.future.reduce((sum, point) => sum + point.input, 0);
  const pricingKnown = priceContext?.known === true;

  const costValue = series.next.cost == null || !pricingKnown ? '—' : formatCost(series.next.cost, 4);
  const costSub = series.next.cost == null || !pricingKnown
    ? '未配置价格，成本类不可用'
    : (series.next.costLow != null && series.next.costHigh != null
      ? `区间 ${formatCost(series.next.costLow, 4)} – ${formatCost(series.next.costHigh, 4)}`
      : '按当前模型与时段价格');

  const ctxCompaction = options.compaction && series.compactionForecast.detected;
  const promptOverLimit = ctxLimit != null && series.currentPrompt > ctxLimit;
  const ctxValue = ctxCompaction
    ? (series.compactionForecast.roundsUntilNext != null ? `距下次压缩 ${series.compactionForecast.roundsUntilNext} 轮` : '距下次压缩 —')
    : (ctxRounds != null ? `${ctxRounds} 轮` : (ctxLimit != null && series.fit.delta <= 0 ? '可维持' : '—'));
  const ctxSub = ctxCompaction
    ? `预计第 ${series.compactionForecast.nextRound ?? '—'} 轮 · 本次压缩前 ${series.compactionForecast.period ?? '—'} 轮`
    : (ctxLimit != null
      ? (promptOverLimit
        ? `当前输入 ${compactTok(series.currentPrompt)} 已超过参考上限 ${compactTok(ctxLimit)} tok`
        : (series.fit.delta <= 0 ? 'Δ≈0，上下文不再增长' : `上下文上限 ${compactTok(ctxLimit)} tok`))
      : '上下文上限未知');

  const remainingValue = remaining == null
    ? '—'
    : `${remaining.R} 轮`;
  const remainingSub = balance == null
    ? '未设置余额，可在钱包页填写'
    : (!pricingKnown
      ? '未配置价格，无法估算'
      : `区间 ${remaining?.low ?? 0} – ${remaining?.high ?? 0} 轮${remaining?.ctxLimited ? ' · 受上下文上限限制' : ''}`);

  host.innerHTML = [
    kpiCard('下一轮输入', `${compactTok(series.next.input)} tok`, `区间 ${compactTok(series.next.inputLow)} – ${compactTok(series.next.inputHigh)}`, 'default', '基于当前段增长拟合，95% 预测区间'),
    kpiCard('下一轮输出', `${compactTok(series.next.output)} tok`, `非截断样本 ${series.output.samples} 条`, 'default', '已剔除截断/异常输出样本'),
    kpiCard('下一轮成本', costValue, costSub, 'orange', '按当前计价模型、钱包与下一轮预计时段价格'),
    kpiCard('命中率', pct(series.hit.rate), hitSourceText(series), series.hit.hasData ? 'green' : 'orange', '有缓存数据时自动测算；无数据时才使用平均命中率'),
    kpiCard('每轮增量 Δ', `${compactTok(series.fit.delta)} tok/轮`, `当前段 ${series.fit.n} 轮 · ${series.fit.model === 'linear' ? '线性拟合' : '近期均值'}`, 'default', '当前压缩后段的平均每轮新增'),
    kpiCard('余额可撑', remainingValue, remainingSub, remaining != null && remaining.R <= 0 ? 'red' : 'default', '按预测成本逐轮累加，直到余额不足'),
    kpiCard('上下文可撑', ctxValue, ctxSub, ctxCompaction ? 'green' : 'default', '未启用压缩预测时按当前 Δ 线性外推'),
    kpiCard('未来 N 轮总成本', pricingKnown ? formatCost(futureCost, 4) : '—', pricingKnown ? `未来 ${series.future.length} 轮 · 输入 ${compactTok(futureInput)} tok` : '未配置价格，成本类不可用', 'orange', '按当前视界累加预测成本'),
  ].join('');
}

function renderHealth(history: any[], model: string | null): void {
  const doc = getDoc();
  const host = doc.getElementById('aus-forecast-health') as HTMLElement | null;
  if (!host) return;
  if (!history.length) {
    host.innerHTML = '<div class="aus-forecast-empty">暂无数据</div>';
    return;
  }
  const sortedForScore = [...history].sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));
  const result = energyScore(sortedForScore, null);
  const colors: Record<string, string> = { A: '#16a34a', B: '#22c55e', C: '#84cc16', D: '#eab308', E: '#f97316', F: '#ef4444', G: '#dc2626' };
  const grades = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const metrics = result.metrics;
  host.innerHTML = `
    <div class="aus-forecast-health-grades">
      ${grades.map((grade) => `<span class="aus-forecast-grade${grade === result.grade ? ' is-current' : ''}" style="background:${colors[grade]};">${grade}</span>`).join('')}
    </div>
    <div class="aus-forecast-health-score">
      <span class="aus-forecast-health-score-value" style="color:${colors[result.grade]};">${result.score.toFixed(0)}</span>
      <span class="aus-forecast-health-score-label">综合评分 · ${result.grade} 级</span>
    </div>
    <div class="aus-forecast-health-metrics">
      <div><span>增速 Δ</span><b>${compactTok(metrics.delta)} tok/轮</b></div>
      <div><span>输出</span><b>${compactTok(metrics.out)} tok/轮</b></div>
      <div><span>效率</span><b>${pct(metrics.efficiency)}</b></div>
      <div><span>命中</span><b>${pct(metrics.hitRate)}</b></div>
      <div><span>截断</span><b>${pct(metrics.truncRate)}</b></div>
      <div><span>思维链</span><b>${pct(metrics.thinkRatio)}</b></div>
    </div>
    <div class="aus-forecast-health-foot">样本 ${history.length} 轮 · ${esc(model || '—')} · ${esc(getForecastLabel(lastFullHistory))}</div>
  `;
}

function renderCompaction(series: ForecastSeries, options: ForecastOptions): void {
  const doc = getDoc();
  const host = doc.getElementById('aus-forecast-compaction') as HTMLElement | null;
  if (!host) return;
  const forecast = series.compactionForecast;
  if (!forecast.detected) {
    host.innerHTML = `<div class="aus-forecast-empty">
      未检测到上下文压缩。判定规则：prompt 环比回落 ≥20% 且绝对降幅 ≥1500 tok；若酒馆使用总结/隐藏楼层，压缩点会在这里自动标记。
    </div>`;
    return;
  }
  const recent = series.compactions.slice(-3).reverse();
  const list = recent.map((point) => {
    const gapLabel = point.gapRounds === point.round ? `累计 ${point.gapRounds} 轮` : `间隔 ${point.gapRounds} 轮`;
    return `<div class="aus-forecast-compaction-row">
    <span class="aus-forecast-compaction-round">第 ${point.round} 轮</span>
    <span class="aus-forecast-compaction-change">${compactTok(point.before)} → ${compactTok(point.after)}</span>
    <span class="aus-forecast-compaction-drop">-${Math.round(point.dropPct * 100)}%</span>
    <span class="aus-forecast-compaction-gap">${gapLabel}</span>
  </div>`;
  }).join('');
  host.innerHTML = `
    <div class="aus-forecast-compaction-grid">
      <div><span>本次压缩前</span><b>${forecast.period ?? '—'} 轮</b></div>
      <div><span>压缩后保留</span><b>${forecast.retention != null ? Math.round(forecast.retention * 100) + '%' : '—'}</b></div>
      <div><span>当前段已持续</span><b>${forecast.segmentAge} 轮</b></div>
      <div><span>预计下次压缩</span><b>${forecast.nextRound != null ? `第 ${forecast.nextRound} 轮` : '—'}</b></div>
    </div>
    <div class="aus-forecast-compaction-note">
      ${options.compaction
        ? `按最近一次压缩前 ${forecast.period ?? '—'} 轮推算，约 ${forecast.roundsUntilNext ?? '—'} 轮后触发。`
        : '压缩情景已关闭，当前预测按线性外推。'}
      ${forecast.postHitRate != null ? ` 压缩后首轮命中率 ${pct(forecast.postHitRate)}。` : ''}
      ${forecast.medianGap != null ? ` 历史间隔中位 ${forecast.medianGap} 轮。` : ''}
    </div>
    <div class="aus-forecast-compaction-list">${list}</div>
    <div class="aus-forecast-compaction-foot">样本较少时压缩周期仅供参考；预测压缩点会在主图中以橙色虚线标出。</div>
  `;
}

function sortEfficiencyRows(rows: ModelEfficiencyRow[]): ModelEfficiencyRow[] {
  if (!efficiencySort) return rows;
  const { key, dir } = efficiencySort;
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = a[key] as any;
    const right = b[key] as any;
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    if (typeof left === 'string') return String(left).localeCompare(String(right)) * sign;
    return (Number(left) - Number(right)) * sign;
  });
}

function renderEfficiency(history: any[], scopeLabel: string): void {
  const doc = getDoc();
  const host = doc.getElementById('aus-forecast-efficiency') as HTMLElement | null;
  const sub = doc.getElementById('aus-forecast-efficiency-sub') as HTMLElement | null;
  const scopeButton = doc.getElementById('aus-forecast-scope-btn') as HTMLElement | null;
  if (scopeButton) {
    scopeButton.innerHTML = `<span class="aus-forecast-pill-label">范围</span><span class="aus-forecast-pill-value">${scopeLabel}</span>${icon('chevron-down', 14)}`;
    scopeButton.onclick = (event: Event) => {
      event.stopPropagation();
      toggleDropdown('scope');
    };
  }
  const scopeDropdown = doc.getElementById('aus-forecast-scope-dropdown') as HTMLElement | null;
  if (scopeDropdown) {
    scopeDropdown.innerHTML = [
      dropdownItem('data-fscope', 'all', '全部历史', efficiencyScope === 'all', `${lastFullHistory.length} 条`),
      dropdownItem('data-fscope', 'chat', '当前对话', efficiencyScope === 'chat', `${getCurrentChatHist(lastFullHistory).length} 条`),
    ].join('');
    scopeDropdown.querySelectorAll('[data-fscope]').forEach((el: any) => {
      el.onclick = (event: Event) => {
        event.stopPropagation();
        const value = el.getAttribute('data-fscope');
        if (value === 'all' || value === 'chat') efficiencyScope = value;
        savePreferences();
        closeAllDropdowns();
        renderForecastView();
      };
    });
  }
  if (!host) return;
  const rows = computeModelEfficiency(history, {
    priceForModel: (model) => resolvePriceContext(history, model)?.trio ?? null,
  });
  lastEfficiencyRows = rows;
  lastEfficiencyHistory = history;
  lastEfficiencyLabel = scopeLabel;
  if (!rows.length) {
    host.innerHTML = '<div class="aus-forecast-empty">暂无模型效率数据</div>';
    if (sub) sub.textContent = `范围：${scopeLabel} · 暂无记录`;
    return;
  }
  const sorted = sortEfficiencyRows(rows);
  const selectableModels = new Set(getModelOptions(lastEffectiveHistory).map((option) => option.model));
  const pricedCosts = sorted.map((row) => row.costPer1kOutput).filter((value): value is number => value != null && value > 0);
  const maxCost = pricedCosts.length ? Math.max(...pricedCosts) : 0;
  const sortArrow = (key: keyof ModelEfficiencyRow): string => {
    if (!efficiencySort || efficiencySort.key !== key) return '<span class="aus-forecast-sort-arrow">↕</span>';
    return `<span class="aus-forecast-sort-arrow is-active">${efficiencySort.dir === 'asc' ? '↑' : '↓'}</span>`;
  };
  const header = (key: keyof ModelEfficiencyRow, label: string): string => `<th class="aus-forecast-eff-th" data-sort="${key}">${label}${sortArrow(key)}</th>`;
  const firstPriced = sorted.find((row) => row.costPer1kOutput != null);
  const body = sorted.map((row) => {
    const isBest = firstPriced === row;
    const cost = row.costPer1kOutput == null ? '—' : formatCost(row.costPer1kOutput, 4);
    const width = row.costPer1kOutput != null && maxCost > 0
      ? Math.max(3, Math.min(100, (row.costPer1kOutput / maxCost) * 100))
      : 0;
    const hit = row.hitRate == null ? '—' : pct(row.hitRate);
    const saving = row.cacheSaving == null ? '—' : pct(row.cacheSaving);
    const avg = row.avgCost == null ? '—' : formatCost(row.avgCost, 4);
    const ratio = row.ioRatio == null ? '—' : `${row.ioRatio.toFixed(1)} : 1`;
    const selectable = selectableModels.has(row.model);
    return `<tr class="aus-forecast-eff-row${row.model === selectedForecastModel ? ' is-selected' : ''}" data-eff-model="${esc(row.model)}" title="${selectable ? '点击切换为计价模型' : '该模型不在当前对话中，仅作全量对比'}">
      <td><div class="aus-forecast-eff-model"><span>${esc(row.model)}</span>${isBest ? '<span class="aus-forecast-eff-best">最省</span>' : ''}</div></td>
      <td>${row.rounds}</td>
      <td>${ratio}</td>
      <td><div class="aus-forecast-eff-cost"><span>${cost}</span><span class="aus-forecast-eff-bar"><i style="width:${width}%"></i></span></div></td>
      <td>${hit}</td>
      <td>${saving}</td>
      <td>${avg}</td>
    </tr>`;
  }).join('');
  host.innerHTML = `<div class="aus-forecast-eff-wrap">
    <table class="aus-forecast-eff-table">
      <thead><tr>
        <th class="aus-forecast-eff-th" data-sort="model">模型${sortArrow('model')}</th>
        ${header('rounds', '轮次')}
        ${header('ioRatio', '输入/输出')}
        ${header('costPer1kOutput', '每 1k 输出成本')}
        ${header('hitRate', '命中率')}
        ${header('cacheSaving', '缓存节省')}
        ${header('avgCost', '平均每轮')}
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
  if (sub) {
    sub.textContent = `范围：${scopeLabel}（${history.length} 条）· 按每 1k 输出成本升序 · 点击行可切换计价模型`;
  }
  host.querySelectorAll('th[data-sort]').forEach((th: any) => {
    th.onclick = (event: Event) => {
      event.stopPropagation();
      const key = th.getAttribute('data-sort') as keyof ModelEfficiencyRow;
      if (!key) return;
      if (efficiencySort && efficiencySort.key === key) {
        efficiencySort = { key, dir: efficiencySort.dir === 'asc' ? 'desc' : 'asc' };
      } else {
        efficiencySort = { key, dir: key === 'model' ? 'asc' : 'asc' };
      }
      renderEfficiency(lastEfficiencyHistory, lastEfficiencyLabel);
    };
  });
  host.querySelectorAll('[data-eff-model]').forEach((tr: any) => {
    tr.onclick = (event: Event) => {
      event.stopPropagation();
      const model = tr.getAttribute('data-eff-model');
      if (!model) return;
      if (!getModelOptions(lastEffectiveHistory).some((option) => option.model === model)) return;
      selectedForecastModel = model;
      closeAllDropdowns();
      renderForecastView();
    };
  });
}

function chatDisplayNameMap(fullHist: any[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const chat of getRecordedChatsForForecast(fullHist)) {
    map.set(chat.chatId ?? '__null__', chat.displayName);
  }
  return map;
}

function renderTop(fullHist: any[]): void {
  const doc = getDoc();
  const host = doc.getElementById('aus-forecast-top') as HTMLElement | null;
  const toggle = doc.getElementById('aus-forecast-top-toggle') as HTMLElement | null;
  if (!host || !toggle) return;
  toggle.textContent = `${showTop ? '▾' : '▸'} 最耗对话 Top`;
  toggle.onclick = (event: Event) => {
    event.stopPropagation();
    showTop = !showTop;
    savePreferences();
    renderTop(fullHist);
  };
  host.style.display = showTop ? 'block' : 'none';
  if (!showTop) return;
  const list = topPowerChats(fullHist, 8);
  if (!list.length) {
    host.innerHTML = '<div class="aus-forecast-empty">暂无对话</div>';
    return;
  }
  const names = chatDisplayNameMap(fullHist);
  const colors: Record<string, string> = { A: '#16a34a', B: '#22c55e', C: '#84cc16', D: '#eab308', E: '#f97316', F: '#ef4444', G: '#dc2626' };
  host.innerHTML = list.map((row) => {
    const key = row.chatId ?? '__null__';
    const name = names.get(key) || row.chatId || '未分组/旧数据';
    const entries = fullHist.filter((entry) => (entry.chatId ?? null) === row.chatId);
    const avgCost = entries.length ? entries.reduce((sum, entry) => sum + (Number(entry.cost) || 0), 0) / entries.length : 0;
    const pctWidth = Math.max(4, Math.min(100, (row.delta / Math.max(1, list[0].delta)) * 100));
    return `<div class="aus-forecast-top-row">
      <span class="aus-forecast-top-name" title="${esc(row.chatId || '未分组/旧数据')}">${esc(name)}</span>
      <span class="aus-forecast-grade aus-forecast-grade-sm" style="background:${colors[row.grade] || '#9CA3AF'};">${row.grade}</span>
      <span class="aus-forecast-top-bar"><span style="width:${pctWidth}%"></span></span>
      <span class="aus-forecast-top-delta">${compactTok(row.delta)} tok/轮</span>
      <span class="aus-forecast-top-cost">${formatCost(avgCost, 4)}/轮</span>
    </div>`;
  }).join('');
}

function clearCharts(message: string): void {
  disposeForecastCharts();
  const doc = getDoc();
  for (const id of ['aus-forecast-main-chart', 'aus-forecast-hit-chart', 'aus-forecast-cost-chart']) {
    const el = doc.getElementById(id) as HTMLElement | null;
    if (el) el.innerHTML = `<div class="aus-forecast-chart-empty">${esc(message)}</div>`;
  }
}

function renderNoticeCards(message: string): void {
  const doc = getDoc();
  const kpis = doc.getElementById('aus-forecast-kpis') as HTMLElement | null;
  if (kpis) kpis.innerHTML = `<div class="ds-card aus-forecast-notice">${esc(message)}</div>`;
  const health = doc.getElementById('aus-forecast-health') as HTMLElement | null;
  if (health) health.innerHTML = '<div class="aus-forecast-empty">需要单个对话的逐轮数据</div>';
  const compaction = doc.getElementById('aus-forecast-compaction') as HTMLElement | null;
  if (compaction) compaction.innerHTML = '<div class="aus-forecast-empty">需要单个对话的逐轮数据</div>';
}

function renderAllNotice(): void {
  renderNoticeCards('当前选择“全部”历史。逐轮预测、压缩与健康度需要单个对话的时间序列；请从上方对话胶囊选择具体对话。下方模型效率对比仍可查看。');
  clearCharts('请选择单个对话以查看逐轮预测');
  const doc = getDoc();
  const mainSub = doc.getElementById('aus-forecast-main-sub') as HTMLElement | null;
  if (mainSub) mainSub.textContent = '逐轮预测需要指定单个对话';
}

function renderNoSeries(message: string): void {
  renderNoticeCards(message);
  clearCharts(message);
  const doc = getDoc();
  const mainSub = doc.getElementById('aus-forecast-main-sub') as HTMLElement | null;
  if (mainSub) mainSub.textContent = message;
}

function renderMainSub(series: ForecastSeries, ctxLimit: number | null): void {
  const doc = getDoc();
  const mainSub = doc.getElementById('aus-forecast-main-sub') as HTMLElement | null;
  if (!mainSub) return;
  const future = series.future.length;
  const parts = [
    `历史 ${series.history.length} 轮`,
    future ? `未来 ${future} 轮` : '未来预测受上下文上限限制',
    '虚线为预测 · 阴影为 95% 区间',
  ];
  if (series.compactionForecast.detected) parts.push('橙色标记为压缩点');
  if (ctxLimit != null && series.history.some((point) => point.input > ctxLimit)) {
    parts.push('历史输入已超过参考上限，参考线按当前计价模型估算');
  }
  mainSub.textContent = parts.join(' · ');
}

export async function renderForecastView(): Promise<void> {
  const token = ++renderToken;
  let fullHist: any[] = [];
  try {
    fullHist = await repository.getAllHistory();
  } catch {
    fullHist = (state as any).history || [];
  }
  if (token !== renderToken) return;
  lastFullHistory = fullHist;
  bindGlobalClose();

  const effective = getEffectiveHist(fullHist);
  lastEffectiveHistory = effective;
  const modelOptions = getModelOptions(effective);
  if (!selectedForecastModel || !modelOptions.some((option) => option.model === selectedForecastModel)) {
    selectedForecastModel = modelOptions[0]?.model || null;
  }
  const model = selectedForecastModel;
  const priceContext = model ? resolvePriceContext(effective, model) : null;
  lastPriceContext = priceContext;
  const ctxLimit = model ? ctxLimitForModel(model, (priceContext?.walletModel as any)?.contextLimit) : null;
  const globalRate = computeGlobalHitRate(fullHist);
  const modelRate = model ? computeModelHitRate(fullHist, model) : null;
  const hitFallback: HitFallback = {
    mode: hitMode,
    globalRate,
    modelRate,
    manualRate: manualHitRate / 100,
  };
  const options: ForecastOptions = {
    horizon,
    pricing: priceContext?.known && priceContext.trio ? priceContext.trio : null,
    ctxLimit,
    hitFallback,
    compaction: compactionEnabled,
  };
  const series = selectedForecastKey !== '__all__' && effective.length
    ? buildForecastSeries(effective, options)
    : null;
  lastSeries = series;

  renderToolbar(fullHist, effective, modelOptions, model, priceContext, series, globalRate, modelRate);

  if (!fullHist.length) {
    renderNoSeries('暂无数据，发起一次对话后自动统计');
    renderEfficiency(fullHist, '全部历史');
    renderTop(fullHist);
    return;
  }
  if (selectedForecastKey === '__all__') {
    renderAllNotice();
    renderEfficiency(
      efficiencyScope === 'all' ? fullHist : getCurrentChatHist(fullHist),
      efficiencyScope === 'all' ? '全部历史' : '当前对话',
    );
    renderTop(fullHist);
    return;
  }
  if (!series) {
    renderNoSeries(selectedForecastKey === '__current__' && !currentChatId()
      ? '未打开对话。请先进入一个聊天，或从上方选择一个具体对话。'
      : '当前对话暂无可用于预测的记录，继续对话后自动启用。');
    renderEfficiency(
      efficiencyScope === 'all' ? fullHist : effective,
      efficiencyScope === 'all' ? '全部历史' : '当前对话',
    );
    renderTop(fullHist);
    return;
  }

  renderMainSub(series, ctxLimit);
  renderKpis(series, priceContext, ctxLimit, options, balanceNum());
  renderHealth(effective, model);
  renderCompaction(series, options);
  renderEfficiency(efficiencyScope === 'all' ? fullHist : effective, efficiencyScope === 'all' ? '全部历史' : '当前对话');
  renderTop(fullHist);

  try {
    await renderForecastCharts({
      series,
      ctxLimit,
      currency: currencyInfo(),
      formatCost: (value: number, digits?: number) => formatCost(value, digits ?? 4),
    });
  } catch (error) {
    console.error('[Api-Usage] 趋势预测图表渲染失败', error);
  }
}

export function initForecastView(): void {
  loadPreferences();
  bindGlobalClose();
}
