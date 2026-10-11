import { state, getSelectedSave, getHistoryForDisplay } from '../store/index';
import { esc, localDay, localTimeHM } from '../utils/date';
import { CN_HOLIDAY_COVERAGE_LABEL } from '../constants/holidays';
import { isTruncatedFinish } from '../utils/finish';
import { saveHot } from '../store/persistence';
import { queryBalance } from '../services/balance';
import { bindImportExport } from '../services/import-export';
import { renderSettings } from './settings';
import { bindHistoryCompare, renderUsageDetail } from './compare';
import { renderOverview } from './overview';
import { initStatsView, positionFilterDropdown, renderStatsView } from './stats-view';
import { initExtraCharts, renderExtraCharts } from './extra-charts';
import { renderForecastView, initForecastView } from './forecast-view';
import { renderWalletView } from './wallet-view';
import { applyTheme } from '../services/theme';
import { DataEvents, on as onDataEvent } from '../data/events';
import { formatMoney, getDisplayCurrency } from '../services/currency';
import { repository } from '../data/repository';
import { trackOpen, trackPage, trackRender, flushTelemetry } from '../services/telemetry';
import {
  STATS_FILTER_ALL,
  STATS_FILTER_UNKNOWN,
  filterStatsHistory,
  getCredentialFilterOptions,
  getEndpointFilterOptions,
} from '../data/computed';

/** 面板首帧渲染耗时的起点（用于匿名统计里的渲染耗时分桶） */
let panelOpenStartTs = 0;
function nowTs(): number {
  try { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); } catch { return Date.now(); }
}

declare const __APP_VERSION__: string;

function getDoc(): Document { return (window.parent as any)?.document ?? document; }

// 精简展示完整响应：SSE 流式合并增量内容，隐藏 id/created/object/choices/index/delta 等重复字段
function prettyFullResponse(resp: any): string {
  if (resp == null) return '（原文已清理）';
  if (typeof resp !== 'string') {
    try { return JSON.stringify(resp, null, 2); } catch { return String(resp); }
  }
  const text = resp.trim();
  if (text.indexOf('data:') === -1) {
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
  }
  let id = '', model = '', finish: string | null = null, usage: any = null;
  let content = '', reasoning = '', chunks = 0;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    let chunk: any;
    try { chunk = JSON.parse(payload); } catch { continue; }
    chunks++;
    if (chunk.id) id = chunk.id;
    if (chunk.model) model = chunk.model;
    if (chunk.usage) usage = chunk.usage;
    const ch = Array.isArray(chunk.choices) ? chunk.choices[0] : null;
    if (ch) {
      const d = ch.delta || {};
      if (typeof d.reasoning_content === 'string') reasoning += d.reasoning_content;
      else if (typeof d.reasoning === 'string') reasoning += d.reasoning;
      if (typeof d.content === 'string') content += d.content;
      if (ch.finish_reason) finish = ch.finish_reason;
    }
  }
  const head: string[] = [];
  if (id) head.push(`id: ${id}`);
  if (model) head.push(`model: ${model}`);
  head.push(`chunks: ${chunks}`);
  head.push(`finish_reason: ${finish ?? '（无）'}`);
  if (usage) head.push(`usage: ${JSON.stringify(usage)}`);
  const body: string[] = [];
  if (reasoning) body.push(`【思维链】\n${reasoning}`);
  body.push(`【正文】\n${content || '（无内容）'}`);
  return `${head.join('\n')}\n\n${body.join('\n\n')}\n\n—— 已合并 SSE 增量并隐藏重复字段 ——`;
}

let panelCreated = false;
let panelOpen = false;
let currentView: 'overview' | 'stats' | 'history' | 'forecast' | 'wallet' | 'settings' | 'help' | 'about' = 'overview';
let collapsed = false;

export function refreshUI() {
  try {
    if (!panelOpen) return;
    const doc = getDoc();
    const s: any = getSelectedSave();
    if (!s) return;
    const bal = state.customBalance || state.balance?.balance;
    const balEl = doc.getElementById('aus-balance');
    if (balEl) {
      try {  const v = bal ? parseFloat(String(bal)) : NaN; balEl.textContent = !isNaN(v) ? formatMoney(v, 2) : formatMoney(0, 2); } catch { balEl.textContent = bal ? '¥' + bal + ' CNY' : '¥0.00 CNY'; }
    }
    const totalCostEl = doc.getElementById('aus-total-cost');
    if (totalCostEl) {
      try {  totalCostEl.textContent = formatMoney(s.total_cost || 0, 4); } catch { totalCostEl.textContent = '¥' + (s.total_cost || 0).toFixed(4) + ' CNY'; }
    }
    const tokEl = doc.getElementById('aus-total-tokens');
    if (tokEl) tokEl.textContent = (s.total_tokens || 0).toLocaleString('zh-CN') + ' tokens';
    renderHistory(doc, s);
    renderOverview();
    renderStatsView();
    try { renderForecastView(); } catch {}
    try { renderWalletView(); } catch {}
  } catch {}
}

let historyPage = 1;
const HISTORY_PAGE_SIZE = 30;
let historyFullCache: any[] | null = null;
let historyCacheScope = '';
let historyLoading = false;
const invalidateHistoryCache = () => {
  historyFullCache = null;
  historyCacheScope = '';
  historyPage = 1;
};
const historyFilters = {
  model: STATS_FILTER_ALL,
  chat: STATS_FILTER_ALL,
  endpoint: STATS_FILTER_ALL,
  credential: STATS_FILTER_ALL,
};
let historyFilterBase: any[] = [];
try {
  onDataEvent(DataEvents.HISTORY_ADDED, invalidateHistoryCache);
  onDataEvent(DataEvents.UPDATED, invalidateHistoryCache);
} catch {}

type HistoryFilterKind = keyof typeof historyFilters;
type HistoryFilterOption = { id: string; label: string; title?: string; unknown?: boolean };

function historyFiltersActive(): boolean {
  return Object.values(historyFilters).some((value) => value !== STATS_FILTER_ALL);
}

function resetHistoryFilters() {
  historyFilters.model = STATS_FILTER_ALL;
  historyFilters.chat = STATS_FILTER_ALL;
  historyFilters.endpoint = STATS_FILTER_ALL;
  historyFilters.credential = STATS_FILTER_ALL;
  historyPage = 1;
}

function getHistoryChatOptions(history: any[]): HistoryFilterOption[] {
  const map = new Map<string, { id: string; label: string; title: string; lastSeen: number }>();
  for (const entry of history || []) {
    const chatId = entry?.chatId ?? null;
    const id = chatId ?? '__null__';
    const chatName = String(entry?.chatName || '').trim();
    const label = chatName || (chatId
      ? (String(chatId).length > 18 ? `${String(chatId).slice(0, 8)}…${String(chatId).slice(-4)}` : String(chatId))
      : '未分组/旧数据');
    const timestamp = Number(entry?.timestamp) || 0;
    const current = map.get(id);
    if (!current) {
      map.set(id, { id, label, title: String(chatId || label), lastSeen: timestamp });
    } else {
      if (timestamp >= current.lastSeen && chatName) {
        current.label = chatName;
        current.title = String(chatId || chatName);
      }
      if (timestamp > current.lastSeen) current.lastSeen = timestamp;
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.lastSeen - a.lastSeen || a.label.localeCompare(b.label, 'zh-CN'))
    .map(({ id, label, title }) => ({ id, label, title }));
}

function closeHistoryFilterDropdowns() {
  const doc = getDoc();
  for (const kind of ['model', 'chat', 'endpoint', 'credential'] as HistoryFilterKind[]) {
    const dropdown = doc.getElementById(`aus-history-${kind}-dropdown`);
    if (dropdown) (dropdown as HTMLElement).style.display = 'none';
  }
}

function renderHistoryFilterDropdown(
  kind: HistoryFilterKind,
  selected: string,
  options: HistoryFilterOption[],
  emptyText: string,
  onSelect: (value: string) => void,
) {
  const doc = getDoc();
  const dropdown = doc.getElementById(`aus-history-${kind}-dropdown`);
  if (!dropdown) return;
  const item = (id: string, label: string, title = label) => {
    const active = id === selected ? 'background:var(--ds-card);font-weight:600;' : '';
    return `<div data-history-value="${esc(id)}" title="${esc(title)}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;${active}">${esc(label)}</div>`;
  };
  let html = item(STATS_FILTER_ALL, '全部');
  for (const option of options) html += item(option.id, option.label, option.title || option.label);
  if (!options.length) html += `<div style="padding:8px 10px;color:var(--ds-text-3);font-size:12px;">${esc(emptyText)}</div>`;
  dropdown.innerHTML = html;
  dropdown.querySelectorAll('[data-history-value]').forEach((element: any) => {
    element.onclick = () => onSelect(element.getAttribute('data-history-value') || STATS_FILTER_ALL);
  });
}

function renderHistoryFilters(history: any[]) {
  historyFilterBase = history || [];
  const doc = getDoc();
  const models = Array.from(new Set(historyFilterBase.map((entry) => String(entry?.model || '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .map((id) => ({ id, label: id }));
  if (historyFilters.model !== STATS_FILTER_ALL && !models.some((option) => option.id === historyFilters.model)) {
    historyFilters.model = STATS_FILTER_ALL;
  }
  const chats = getHistoryChatOptions(historyFilterBase);
  if (historyFilters.chat !== STATS_FILTER_ALL && !chats.some((option) => option.id === historyFilters.chat)) {
    historyFilters.chat = STATS_FILTER_ALL;
  }
  const endpoints = getEndpointFilterOptions(historyFilterBase);
  if (historyFilters.endpoint !== STATS_FILTER_ALL && !endpoints.some((option) => option.id === historyFilters.endpoint)) {
    historyFilters.endpoint = STATS_FILTER_ALL;
    historyFilters.credential = STATS_FILTER_ALL;
  }
  const credentials = getCredentialFilterOptions(historyFilterBase, historyFilters.endpoint);
  if (historyFilters.credential !== STATS_FILTER_ALL && !credentials.some((option) => option.id === historyFilters.credential)) {
    historyFilters.credential = STATS_FILTER_ALL;
  }

  const labelMap: Record<HistoryFilterKind, string> = {
    model: historyFilters.model === STATS_FILTER_ALL ? '全部' : historyFilters.model,
    chat: historyFilters.chat === STATS_FILTER_ALL
      ? '全部'
      : chats.find((option) => option.id === historyFilters.chat)?.label || historyFilters.chat,
    endpoint: historyFilters.endpoint === STATS_FILTER_ALL
      ? '全部'
      : historyFilters.endpoint === STATS_FILTER_UNKNOWN
        ? '未记录接入'
        : endpoints.find((option) => option.id === historyFilters.endpoint)?.label || historyFilters.endpoint,
    credential: historyFilters.credential === STATS_FILTER_ALL
      ? '全部'
      : historyFilters.credential === STATS_FILTER_UNKNOWN
        ? '未识别密钥'
        : credentials.find((option) => option.id === historyFilters.credential)?.label || historyFilters.credential,
  };
  for (const kind of ['model', 'chat', 'endpoint', 'credential'] as HistoryFilterKind[]) {
    const label = doc.getElementById(`aus-history-${kind}-label`);
    if (label) {
      label.textContent = labelMap[kind];
      label.title = labelMap[kind];
    }
  }
  renderHistoryFilterDropdown('model', historyFilters.model, models, '暂无模型', (value) => {
    historyFilters.model = value;
    historyPage = 1;
    closeHistoryFilterDropdowns();
    renderHistory(doc, getSelectedSave());
  });
  renderHistoryFilterDropdown('chat', historyFilters.chat, chats, '暂无对话', (value) => {
    historyFilters.chat = value;
    historyPage = 1;
    closeHistoryFilterDropdowns();
    renderHistory(doc, getSelectedSave());
  });
  renderHistoryFilterDropdown('endpoint', historyFilters.endpoint, endpoints, '暂无接入记录', (value) => {
    historyFilters.endpoint = value;
    historyFilters.credential = STATS_FILTER_ALL;
    historyPage = 1;
    closeHistoryFilterDropdowns();
    renderHistory(doc, getSelectedSave());
  });
  renderHistoryFilterDropdown('credential', historyFilters.credential, credentials, '暂无密钥记录', (value) => {
    historyFilters.credential = value;
    historyPage = 1;
    closeHistoryFilterDropdowns();
    renderHistory(doc, getSelectedSave());
  });
}

function filteredHistoryForDisplay(history: any[]): any[] {
  return filterStatsHistory(history, {
    model: historyFilters.model,
    chat: historyFilters.chat,
    endpoint: historyFilters.endpoint,
    credential: historyFilters.credential,
  });
}

function bindHistoryFilters(doc: Document) {
  const controls: Array<[HistoryFilterKind, string]> = [
    ['model', '#aus-history-model-btn'],
    ['chat', '#aus-history-chat-btn'],
    ['endpoint', '#aus-history-endpoint-btn'],
    ['credential', '#aus-history-credential-btn'],
  ];
  for (const [kind, selector] of controls) {
    const button = doc.querySelector(selector) as HTMLElement | null;
    const dropdown = doc.getElementById(`aus-history-${kind}-dropdown`) as HTMLElement | null;
    if (!button || !dropdown) continue;
    button.onclick = () => {
      const willOpen = dropdown.style.display !== 'block';
      closeHistoryFilterDropdowns();
      if (!willOpen) return;
      renderHistoryFilters(historyFilterBase);
      dropdown.style.display = 'block';
      positionFilterDropdown(button, dropdown);
    };
  }
  doc.addEventListener('click', (event: any) => {
    const target = event.target as HTMLElement;
    if (!target.closest('#aus-history-filter-host')) closeHistoryFilterDropdowns();
  });
}

let activeHistoryDetailTs: string | null = null;
let activeHistoryDetailPanel: HTMLElement | null = null;
let activeHistoryDetailHost: HTMLElement | null = null;
let activeHistoryDetailBtn: HTMLElement | null = null;

function resetHistoryDetailState(doc: Document, clearBody = false) {
  try {
    const body = doc.getElementById('aus-history-detail-body') as HTMLElement | null;
    if (body && clearBody) body.innerHTML = '';
    const drawer = doc.getElementById('aus-history-detail') as HTMLElement | null;
    if (drawer) drawer.style.display = 'none';
    const content = doc.getElementById('aus-content-body') as HTMLElement | null;
    if (content) content.classList.remove('has-history-detail');
  } catch {}
  activeHistoryDetailTs = null;
  activeHistoryDetailPanel = null;
  activeHistoryDetailHost = null;
  activeHistoryDetailBtn = null;
}

function closeHistoryDetail(doc: Document) {
  const panel = activeHistoryDetailPanel;
  const host = activeHistoryDetailHost;
  if (panel) {
    try {
      if (panel.parentElement && panel.parentElement.id === 'aus-history-detail-body' && host) host.appendChild(panel);
    } catch {}
    panel.style.display = 'none';
    panel.style.flexDirection = 'column';
    panel.style.maxHeight = 'min(520px,60vh)';
    panel.style.overflowY = 'auto';
    panel.style.overflowX = 'hidden';
    panel.style.marginTop = '8px';
    panel.style.borderTop = '1px solid var(--ds-border)';
    panel.style.paddingTop = '8px';
  }
  const btn = activeHistoryDetailBtn;
  if (btn && btn.isConnected) {
    btn.textContent = '详情';
    btn.style.background = 'var(--ds-black)';
    btn.style.color = 'var(--ds-black-text)';
    btn.style.borderColor = 'var(--ds-black)';
  }
  resetHistoryDetailState(doc);
}

function openHistoryDetail(doc: Document, panel: HTMLElement, btn: HTMLElement) {
  const ts = btn.getAttribute('data-ts') || '';
  if (activeHistoryDetailTs === ts && activeHistoryDetailPanel === panel) { closeHistoryDetail(doc); return; }
  if (activeHistoryDetailPanel && activeHistoryDetailPanel !== panel) closeHistoryDetail(doc);
  const body = doc.getElementById('aus-history-detail-body') as HTMLElement | null;
  const drawer = doc.getElementById('aus-history-detail') as HTMLElement | null;
  const title = doc.getElementById('aus-history-detail-title') as HTMLElement | null;
  if (!body || !drawer) return;
  activeHistoryDetailHost = panel.parentElement as HTMLElement | null;
  activeHistoryDetailTs = ts;
  activeHistoryDetailPanel = panel;
  activeHistoryDetailBtn = btn;
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.maxHeight = 'none';
  panel.style.overflow = 'visible';
  panel.style.marginTop = '0';
  panel.style.borderTop = 'none';
  panel.style.paddingTop = '0';
  try { body.appendChild(panel); } catch {}
  if (title) {
    const model = btn.getAttribute('data-model') || '记录详情';
    const time = btn.getAttribute('data-time') || '';
    title.textContent = time ? `${model} · ${time}` : model;
  }
  btn.textContent = '收起';
  btn.style.background = 'var(--ds-card-inner)';
  btn.style.color = 'var(--ds-text)';
  btn.style.borderColor = 'var(--ds-black)';
  drawer.style.display = 'flex';
  const content = doc.getElementById('aus-content-body') as HTMLElement | null;
  if (content) content.classList.add('has-history-detail');
}

function renderHistoryInner(doc: Document, fullHist: any[]) {
  const host = doc.getElementById('aus-history');
  if (!host) return;
  const reopenDetailTs = activeHistoryDetailTs;
  resetHistoryDetailState(doc, true);
  const total = fullHist.length;
  if (!total) {
    host.innerHTML = `<div style="text-align:center;padding:24px;color:var(--ds-text-3);font-size:12px;line-height:1.8;">当前筛选无记录<br/><button id="aus-history-filter-reset" style="margin-top:8px;padding:6px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">清除筛选</button></div>`;
    const reset = doc.getElementById('aus-history-filter-reset') as HTMLButtonElement | null;
    if (reset) reset.onclick = () => {
      resetHistoryFilters();
      closeHistoryFilterDropdowns();
      renderHistory(doc, getSelectedSave());
    };
    return;
  }
  const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  if (historyPage > totalPages) historyPage = totalPages;
  if (historyPage < 1) historyPage = 1;
  const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
  const pageHist = fullHist.slice(start, start + HISTORY_PAGE_SIZE);
  const pagerTop = total > HISTORY_PAGE_SIZE ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:11px;color:var(--ds-text-2);">
      <span>共 ${total} 条 · 第 ${historyPage}/${totalPages} 页</span>
      <span style="display:flex;gap:6px;">
        <button id="aus-history-prev" ${historyPage<=1?'disabled':''} style="padding:4px 10px;border:1px solid var(--ds-border);border-radius:999px;background:${historyPage<=1?'var(--ds-card)':'var(--ds-card-inner)'};color:var(--ds-text);font-size:11px;cursor:${historyPage<=1?'not-allowed':'pointer'};opacity:${historyPage<=1?'0.5':'1'};">‹ 上一页</button>
        <button id="aus-history-next" ${historyPage>=totalPages?'disabled':''} style="padding:4px 10px;border:1px solid var(--ds-border);border-radius:999px;background:${historyPage>=totalPages?'var(--ds-card)':'var(--ds-card-inner)'};color:var(--ds-text);font-size:11px;cursor:${historyPage>=totalPages?'not-allowed':'pointer'};opacity:${historyPage>=totalPages?'0.5':'1'};">下一页 ›</button>
      </span>
    </div>` : '';
  const pagerBottom = total > HISTORY_PAGE_SIZE ? `<div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:10px;font-size:11px;">
      <button id="aus-history-prev-b" ${historyPage<=1?'disabled':''} style="padding:4px 12px;border:1px solid var(--ds-border);border-radius:999px;background:${historyPage<=1?'var(--ds-card)':'var(--ds-card-inner)'};color:var(--ds-text);font-size:11px;cursor:${historyPage<=1?'not-allowed':'pointer'};opacity:${historyPage<=1?'0.5':'1'};">‹ 上一页</button>
      <span style="color:var(--ds-text-2);">第 ${historyPage}/${totalPages} 页</span>
      <button id="aus-history-next-b" ${historyPage>=totalPages?'disabled':''} style="padding:4px 12px;border:1px solid var(--ds-border);border-radius:999px;background:${historyPage>=totalPages?'var(--ds-card)':'var(--ds-card-inner)'};color:var(--ds-text);font-size:11px;cursor:${historyPage>=totalPages?'not-allowed':'pointer'};opacity:${historyPage>=totalPages?'0.5':'1'};">下一页 ›</button>
    </div>` : '';
  host.innerHTML = pagerTop + pageHist.map((h: any) => {
    const total = h.total_tokens || 1;
    const hp = ((h.cache_hit_tokens || 0) / total * 100);
    const mp = ((h.cache_miss_tokens || 0) / total * 100);
    const op = ((h.completion_tokens || 0) / total * 100);
    const hps = hp.toFixed(1), mps = mp.toFixed(1), ops = op.toFixed(1);
    const fmtMoney = (v:number,d=4)=>{ try{  return formatMoney(v||0,d);} catch{ return '¥'+(v||0).toFixed(d)+' CNY'; } };
    const c4 = fmtMoney(h.cost||0,4); const c6 = fmtMoney(h.cost||0,6); const in6 = fmtMoney(h.input_cost||0,6); const out6 = fmtMoney(h.output_cost||0,6);
    const recordDate = new Date(h.timestamp);
    const recordDateText = recordDate.toLocaleDateString('zh-CN');
    const recordTimeText = recordDate.toLocaleTimeString('zh-CN', { hour12: false });
    return `
    <div style="padding:10px 12px;background:var(--ds-card);border-radius:10px;margin-bottom:8px;font-size:12px;">
      <div class="aus-history-card-head" style="display:flex;justify-content:space-between;align-items:center;">
        <div class="aus-history-card-main" style="min-width:0;flex:1;">
          <div class="aus-history-card-title" style="font-weight:600;color:var(--ds-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(h.model)} · ${esc(localTimeHM(h.timestamp))}</div>
          <div style="color:var(--ds-text-2);margin-top:2px;">${h.prompt_tokens || 0} in · ${h.completion_tokens || 0} out · ${h.duration || 0}ms · ${h.tokenRate || 0} t/s</div>
        </div>
        <div class="aus-history-card-actions" style="text-align:right;flex-shrink:0;margin-left:8px;display:flex;gap:6px;align-items:center;">
          <div class="aus-history-card-cost">
            <div style="font-weight:700;color:var(--ds-text);">${c4}</div>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="aus-compare-old" data-ts="${h.timestamp}" style="padding:4px 6px;border:1px solid var(--ds-border);border-radius:6px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;">旧</button>
            <button class="aus-compare-new" data-ts="${h.timestamp}" style="padding:4px 6px;border:1px solid var(--ds-border);border-radius:6px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;">新</button>
            <button class="aus-detail-toggle" data-ts="${h.timestamp}" data-model="${esc(h.model || '')}" data-time="${esc(recordDateText + ' ' + recordTimeText)}" style="padding:4px 8px;border:1px solid var(--ds-black);border-radius:6px;background:var(--ds-black);color:var(--ds-black-text);font-size:10px;cursor:pointer;">详情</button>
          </div>
        </div>
      </div>
      <div style="background:var(--ds-border);border-radius:999px;height:6px;overflow:hidden;margin-top:8px;display:flex;">
        <div style="background:var(--ds-green);width:${hp}%;height:100%;"></div>
        <div style="background:var(--ds-red-border);width:${mp}%;height:100%;"></div>
        <div style="background:var(--ds-purple-bg);width:${op}%;height:100%;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;margin-top:4px;">
        <div style="display:flex;gap:8px;"><span style="color:var(--ds-green);font-weight:500;">${hps}% 命中</span><span style="color:var(--ds-red);font-weight:500;">${mps}% 未命中</span><span style="color:var(--ds-purple);font-weight:500;">${ops}% 输出</span></div>
        <span style="color:var(--ds-text-2);">${total.toLocaleString()}t</span>
      </div>
      <div class="aus-detail-panel" data-detail="${h.timestamp}" style="display:none;margin-top:8px;border-top:1px solid var(--ds-border);padding-top:8px;max-height:min(520px,60vh);overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;flex-direction:column;gap:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:10px;">
            <div style="font-size:10px;color:var(--ds-text-3);font-weight:600;letter-spacing:0.5px;">基础信息</div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:6px;font-size:11px;">
              <div><div style="color:var(--ds-text-2);font-size:10px;">模型</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;word-break:break-all;">${esc(h.model||'—')}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">时段</div><div style="font-weight:600;margin-top:2px;color:var(--ds-text);">${h.priceType==='new-peak'||h.priceType==='wallet-peak'?'高峰':h.priceType==='new-offpeak'||h.priceType==='wallet-offpeak'?'非高峰':h.priceType==='unpriced'?'待定价':'旧价格'}</div></div>
              <div style="min-width:0;"><div style="color:var(--ds-text-2);font-size:10px;">钱包</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;word-break:break-all;">${esc(repository.getWallet(String(h.walletId||''))?.name || h.endpointLabel || '未归属钱包')}</div></div>
              <div style="min-width:0;"><div style="color:var(--ds-text-2);font-size:10px;">计价来源</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;word-break:break-all;">${h.pricingSource==='wallet'?'钱包规则':h.pricingSource==='builtin'?'DeepSeek 内置':h.pricingSource==='unpriced'?'待定价':h.pricingSource==='legacy-match'?'旧数据同名价':h.pricingSource==='legacy'?'旧全局规则':'旧记录兜底'}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">日期</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${esc(recordDateText)}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">时间</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${esc(recordTimeText)}</div></div>
            </div>
          </div>
            <div style="background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:10px;">
            <div style="font-size:10px;color:var(--ds-text-3);font-weight:600;letter-spacing:0.5px;">性能</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px;font-size:11px;">
              <div><div style="color:var(--ds-text-2);font-size:10px;">耗时</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${((h.duration||0)/1000).toFixed(1)}s</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">首字延迟</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${(h.ttft||0)>0?((h.ttft||0)/1000).toFixed(1)+'s':'—'}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">速率</div><div style="font-weight:600;color:var(--ds-green);margin-top:2px;">${h.tokenRate||0} t/s</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">思维链耗时</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${(h.thinkTime||0)>0?((h.thinkTime||0)/1000).toFixed(1)+'s':'—'}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">思维链占比</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${(()=>{ const comp=h.completion_tokens||0, th=h.thinkTokens||0; if(!comp||!th) return '—'; return (th/comp*100).toFixed(1)+'%';})()}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">是否截断</div><div style="font-weight:600;margin-top:2px;color:${(isTruncatedFinish(h.finishReason)||h.isTruncated)?'var(--ds-red)':'var(--ds-text)'};">${(isTruncatedFinish(h.finishReason)||h.isTruncated)?'是 ('+(esc(h.finishReason||'length'))+')':'否'}</div></div>
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:10px;">
            <div style="font-size:10px;color:var(--ds-text-3);font-weight:600;letter-spacing:0.5px;">Token 消耗</div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:6px;font-size:11px;">
              <div><div style="color:var(--ds-text-2);font-size:10px;">缓存命中</div><div style="font-weight:600;color:var(--ds-green);margin-top:2px;">${(h.cache_hit_tokens||0).toLocaleString()}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">缓存未命中</div><div style="font-weight:600;color:var(--ds-red);margin-top:2px;">${(h.cache_miss_tokens||0).toLocaleString()}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">输出 Token</div><div style="font-weight:600;color:var(--ds-purple);margin-top:2px;">${(h.completion_tokens||0).toLocaleString()}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">总 Token</div><div style="font-weight:700;color:var(--ds-text);margin-top:2px;">${(h.total_tokens||0).toLocaleString()}</div></div>
              <div style="grid-column:1/-1;"><div style="color:var(--ds-text-2);font-size:10px;">思维链 Token</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${h.thinkTokens||0}</div></div>
            </div>
          </div>
          <div style="background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:10px;">
            <div style="font-size:10px;color:var(--ds-text-3);font-weight:600;letter-spacing:0.5px;">费用明细</div>
            <div style="display:grid;gap:6px;margin-top:6px;font-size:11px;">
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--ds-text-2);">输入费用</span><span style="font-weight:600;color:var(--ds-text);">${in6}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--ds-text-2);">输出费用</span><span style="font-weight:600;color:var(--ds-text);">${out6}</span></div>
              <div style="display:flex;justify-content:space-between;border-top:1px solid var(--ds-card);padding-top:6px;margin-top:2px;"><span style="color:var(--ds-text);font-weight:600;">总费用</span><span style="font-weight:700;color:var(--ds-text);">${c6}</span></div>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="aus-tab-btn" data-tab="req" data-ts="${h.timestamp}" style="padding:6px 10px;border:1px solid var(--ds-black);border-radius:999px;background:var(--ds-black);color:var(--ds-black-text);font-size:11px;cursor:pointer;">请求参数 (Request Body)</button>
          <button class="aus-tab-btn" data-tab="res" data-ts="${h.timestamp}" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">API 完整响应 (Full Response)</button>
          <button class="aus-tab-btn" data-tab="raw" data-ts="${h.timestamp}" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">原始 Token 用量 (Raw Usage)</button>
          <button class="aus-tab-btn" data-tab="msg" data-ts="${h.timestamp}" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">消息内容 (Messages)</button>
        </div>
        <pre class="aus-tab-content" data-content="req-${h.timestamp}" style="flex:1;min-height:160px;margin-top:2px;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:10px;font-size:11px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">${esc(h.fullRequest ? JSON.stringify(h.fullRequest, null, 2) : (h.raw_usage ? JSON.stringify(h.raw_usage, null, 2) : '（原文已清理，仅保留统计）'))}</pre>
        <div class="aus-tab-content" data-content="res-${h.timestamp}" style="display:none;margin-top:2px;">
          <pre style="margin:0;min-height:160px;max-height:360px;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:10px;font-size:11px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">${esc(prettyFullResponse(h.fullResponse))}</pre>
          ${h.fullResponse ? `<div style="display:flex;justify-content:flex-end;margin-top:6px;"><button class="aus-res-raw-btn" data-ts="${h.timestamp}" style="padding:4px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">查看原始完整数据</button></div><pre class="aus-res-raw" data-ts="${h.timestamp}" style="display:none;margin:6px 0 0;max-height:360px;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:10px;font-size:11px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">${esc(typeof h.fullResponse === 'string' ? h.fullResponse : JSON.stringify(h.fullResponse, null, 2))}</pre>` : ''}
        </div>
        <pre class="aus-tab-content" data-content="raw-${h.timestamp}" style="display:none;flex:1;min-height:160px;margin-top:2px;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:10px;font-size:11px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">${esc(JSON.stringify(h.raw_usage || {}, null, 2))}</pre>
        <pre class="aus-tab-content" data-content="msg-${h.timestamp}" style="display:none;flex:1;min-height:160px;margin-top:2px;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:10px;font-size:11px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">${esc(h.messages && (h as any).messages.length ? JSON.stringify(h.messages, null, 2) : '（原文已清理——仅最近 5 条保留，其余仅统计可用）')}</pre>
      </div>
    </div>
  `;
  }).join('') + pagerBottom;
  // 分页按钮
  const bindPager = (id: string) => {
    const b = doc.getElementById(id) as HTMLButtonElement | null;
    if (!b) return;
    if (id.includes('prev')) b.onclick = () => { if (historyPage > 1) { historyPage--; renderHistoryInner(doc, fullHist); try{ doc.getElementById('aus-history')?.scrollIntoView({ behavior:'smooth', block:'start'}); }catch{} } };
    else b.onclick = () => { const tp = Math.max(1, Math.ceil(fullHist.length / HISTORY_PAGE_SIZE)); if (historyPage < tp) { historyPage++; renderHistoryInner(doc, fullHist); try{ doc.getElementById('aus-history')?.scrollIntoView({ behavior:'smooth', block:'start'}); }catch{} } };
  };
  bindPager('aus-history-prev'); bindPager('aus-history-next'); bindPager('aus-history-prev-b'); bindPager('aus-history-next-b');
  host.querySelectorAll('.aus-detail-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ts = (btn as HTMLElement).getAttribute('data-ts');
      if (activeHistoryDetailBtn === btn && activeHistoryDetailPanel) { closeHistoryDetail(doc); return; }
      const panel = host.querySelector(`[data-detail="${ts}"]`) as HTMLElement | null;
      if (!panel) return;
      openHistoryDetail(doc, panel, btn as HTMLElement);
    });
  });
  host.querySelectorAll('.aus-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ts = (btn as HTMLElement).getAttribute('data-ts');
      const tab = (btn as HTMLElement).getAttribute('data-tab');
      const root = (btn as HTMLElement).closest('.aus-detail-panel') as HTMLElement | null;
      if (!root) return;
      root.querySelectorAll('.aus-tab-btn').forEach((b: any) => { b.style.background = 'var(--ds-card-inner)'; b.style.color = 'var(--ds-text)'; b.style.borderColor = 'var(--ds-border)'; });
      (btn as HTMLElement).style.background = 'var(--ds-black)'; (btn as HTMLElement).style.color = 'var(--ds-black-text)'; (btn as HTMLElement).style.borderColor = 'var(--ds-black)';
      root.querySelectorAll('.aus-tab-content').forEach((c: any) => { c.style.display = 'none'; });
      const target = root.querySelector(`[data-content="${tab}-${ts}"]`) as HTMLElement | null;
      if (target) target.style.display = 'block';
    });
  });
  host.querySelectorAll('.aus-res-raw-btn').forEach((btn: any) => {
    btn.addEventListener('click', () => {
      const ts = btn.getAttribute('data-ts');
      const root = btn.closest('.aus-detail-panel') as HTMLElement | null;
      const pre = root?.querySelector(`.aus-res-raw[data-ts="${ts}"]`) as HTMLElement | null;
      if (!pre) return;
      const show = pre.style.display === 'none';
      pre.style.display = show ? 'block' : 'none';
      btn.textContent = show ? '隐藏原始完整数据' : '查看原始完整数据';
    });
  });
  if (reopenDetailTs) {
    const panel = host.querySelector(`[data-detail="${reopenDetailTs}"]`) as HTMLElement | null;
    const btn = host.querySelector(`.aus-detail-toggle[data-ts="${reopenDetailTs}"]`) as HTMLElement | null;
    if (panel && btn) openHistoryDetail(doc, panel, btn as HTMLElement);
  }
}

function renderHistory(doc: Document, s: any) {
  const host = doc.getElementById('aus-history');
  if (!host) return;
  let hist: any[] = s.history || [];
  let scope = 'all';
  try {
    scope = (state.settings as any).historyScope || 'all';
    if (scope === 'current') hist = getHistoryForDisplay();
  } catch {}
  if (!hist.length) {
    historyPage = 1;
    historyFullCache = null;
    historyCacheScope = '';
    const tip = scope === 'current'
      ? '<div style="text-align:center;padding:16px;color:var(--ds-text-3);font-size:12px;line-height:1.8;">当前对话暂无记录<br/><span style="font-size:11px;">已按“当前对话”过滤，旧记录（未关联对话）仅在“全部历史”中可见</span><br/><button id="aus-history-scope-switch" style="margin-top:8px;padding:6px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:11px;cursor:pointer;">切换为全部历史</button></div>'
      : '<div style="text-align:center;padding:16px;color:var(--ds-text-3);font-size:12px;">暂无历史记录</div>';
    host.innerHTML = tip;
    const btn = doc.getElementById('aus-history-scope-switch') as HTMLButtonElement | null;
    if (btn) btn.onclick = () => {
      (state.settings as any).historyScope = 'all';
      try { (saveHot as any)({ settings: state.settings }); } catch {}
      historyPage = 1;
      try { refreshUI(); } catch {}
    };
    return;
  }
  // 页码越界/对话切换保护：scope 或 currentChatId 变化重置首页，避免跨对话页码错位
  let curChatId: string | null = null;
  try { curChatId = (globalThis as any).SillyTavern?.getContext?.()?.getCurrentChatId?.() || (globalThis as any).SillyTavern?.getContext?.().getCurrentChatId?.call?.(null) || null; } catch {}
  try { if (!curChatId) curChatId = (globalThis as any).SillyTavern?.getContext?.().getCurrentChatId?.() || null; } catch {}
  const scopeKey = scope === 'current' ? `current:${curChatId||''}` : 'all';
  if (historyCacheScope !== scopeKey) { historyPage = 1; historyCacheScope = scopeKey; historyFullCache = null; }
  // 同步先渲染：若已有全量缓存则直接用缓存分页，否则用热数据分页（30条），避免一次渲染2000条
  let fullForRender: any[] = hist;
  if (historyFullCache && historyFullCache.length > hist.length) fullForRender = historyFullCache;
  renderHistoryFilters(fullForRender);
  renderHistoryInner(doc, filteredHistoryForDisplay(fullForRender));
  // 异步加载全量（热+冷）以支持 2000 条翻页，加载后若更多数据则二次渲染；统计已用聚合 totals，不受此展示分页影响
  if (historyLoading) return;
  const needFull = hist.length >= HISTORY_PAGE_SIZE || historyFullCache !== null || fullForRender.length >= HISTORY_PAGE_SIZE;
  if (!needFull && hist.length < HISTORY_PAGE_SIZE) return;
  historyLoading = true;
  (async () => {
    try {
      const mod: any = await import('../store/persistence');
      if (!mod.getAllHistory) return;
      const all: any[] = await mod.getAllHistory();
      if (!all || !all.length) return;
      let full = all;
      try {
        if (scope === 'current' && curChatId) {
          full = all.filter((h:any)=> h.chatId === curChatId);
        }
      } catch {}
      if (full.length <= hist.length) return;
      historyFullCache = full;
      // 若当前页仍指向热数据页，需保持页码但更新总数
      renderHistoryFilters(full);
      renderHistoryInner(doc, filteredHistoryForDisplay(full));
    } catch {} finally { historyLoading = false; }
  })();
}

export function bindPanel(doc: Document) {
  const q = doc.getElementById('aus-btn-query-balance') as HTMLButtonElement | null;
  if (q) q.onclick = () => queryBalance();
}

function switchView(view: typeof currentView) {
  currentView = view;
  // 匿名使用统计：页面使用率（仅本地累加，关闭面板时统一上报）
  try { trackPage(view); } catch {}
  const doc = getDoc();
  if (view !== 'history') closeHistoryDetail(doc);
  doc.querySelectorAll('[data-view]').forEach((el: any) => {
    const v = el.getAttribute('data-view');
    const on = v === view;
    el.style.display = on ? 'block' : 'none';
    // 瞬时切换：不再走“先透明再淡入”，避免点击后有一小段延迟感
    if (on) { el.style.transition = 'none'; el.style.opacity = '1'; }
  });
  doc.querySelectorAll('.aus-nav-item').forEach((el: any) => {
    const v = el.getAttribute('data-nav');
    if (v === view) el.classList.add('active');
    else el.classList.remove('active');
  });
  const titles: any = { overview: '用量概览', stats: '用量统计', history: '历史记录', forecast: '趋势预测（Beta）', wallet: '钱包', settings: '设置', help: '使用说明', about: '关于' };
  const titleText = titles[view] || '';
  const titleEl = doc.getElementById('aus-page-title');
  const mobileTitleEl = doc.getElementById('aus-mobile-page-title');
  if (titleEl) titleEl.textContent = titleText;
  if (mobileTitleEl) mobileTitleEl.textContent = titleText;
  // 只渲染目标视图：原先每次点击都全量 refreshUI（历史/概览/统计/预测/钱包五页，其中两页要重建 ECharts），
  // 再叠加 60ms 定时器二次渲染，是点击卡顿与延迟的主要来源；数据变更仍由 refreshUI 统一刷新。
  try {
    if (view === 'overview') renderOverview();
    else if (view === 'stats') renderStatsView();
    else if (view === 'forecast') Promise.resolve(renderForecastView()).catch(() => {});
    else if (view === 'wallet') Promise.resolve(renderWalletView()).catch(() => {});
    else if (view === 'history') { const s = getSelectedSave(); if (s) renderHistory(doc, s); }
  } catch {}
  // 图表容器宽度兜底：首次显示若尚未完成布局，下一帧补渲染一次（替代原先 60ms/80ms 定时器）
  if (view === 'stats' || view === 'forecast') {
    requestAnimationFrame(() => {
      try {
        const chartEl = doc.getElementById(view === 'stats' ? 'aus-stats-chart' : 'aus-forecast-chart');
        if (chartEl && (chartEl.clientWidth === 0 || chartEl.clientHeight === 0)) {
          if (view === 'stats') renderStatsView();
          else Promise.resolve(renderForecastView()).catch(() => {});
        }
      } catch {}
    });
  }
}

function positionPanel() {
  // 已改为 fixed，无需手动跟随滚动；保留空实现以兼容旧调用
  try {
    const doc = getDoc();
    const charts: any[] = [];
    // 触发图表自适应（解决 resize 不重算）
    for (const id of ['aus-stats-chart','aus-chart-token','aus-chart-cost','aus-chart-hit','aus-chart-req','aus-chart-dur','aus-chart-pie','aus-chart-model-token','aus-chart-model-req']) {
      const el = doc.getElementById(id) as any;
      if (el && (el as any).__echarts_instance) try { (el as any).__echarts_instance.resize(); } catch {}
    }
  } catch {}
}

export function createPanel() {
  if (panelCreated) return;
  const doc = getDoc();
  if (doc.getElementById('aus-panel')) { panelCreated = true; return; }
  panelCreated = true;
  const theme = (state.settings as any).theme || 'light';
  const overlay = doc.createElement('div');
  overlay.id = 'aus-overlay';
  overlay.setAttribute('data-extension', 'api-usage-stat');
  overlay.setAttribute('data-ds-theme', theme);
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:var(--ds-overlay);z-index:100000;display:none;opacity:0;transition:opacity 0.2s;';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });
  const panel = doc.createElement('div');
  panel.id = 'aus-panel';
  panel.setAttribute('data-extension', 'api-usage-stat');
  panel.setAttribute('data-ds-theme', theme);
  panel.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:100001;background:var(--ds-panel-bg);color:var(--ds-text);font-family:\'Microsoft YaHei\',\'微软雅黑\',system-ui,-apple-system,sans-serif;display:none;flex-direction:column;overflow:hidden;transform:none;filter:none;will-change:auto;';
  panel.innerHTML = `
    <div id="aus-mobile-header" style="display:none;height:56px;align-items:center;padding:0 16px;flex-shrink:0;border-bottom:1px solid var(--ds-border);background:var(--ds-card-inner);">
      <button id="aus-hamburger-btn" title="菜单" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;cursor:pointer;color:var(--ds-text);font-size:18px;line-height:1;padding:0;">☰</button>
      <span style="margin-left:12px;font-size:13px;font-weight:700;color:var(--ds-text);white-space:nowrap;flex-shrink:0;">API用量统计</span>
      <span id="aus-mobile-page-title" style="margin-left:10px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;color:var(--ds-text-2);">用量概览</span>
      <button id="aus-mobile-panel-close" title="关闭" style="margin-left:auto;width:32px;height:32px;flex-shrink:0;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text-2);cursor:pointer;font-size:14px;">✕</button>
    </div>
    <div id="aus-panel-body" style="flex:1;display:flex;flex-direction:row;overflow:hidden;min-height:0;">
    <div id="aus-sidebar" style="width:260px;flex-shrink:0;background:var(--ds-sidebar-bg);border-right:1px solid var(--ds-border);display:flex;flex-direction:column;overflow:hidden;">
      <div style="height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;flex-shrink:0;">
        <div style="display:flex;flex-direction:column;min-width:0;" id="aus-brand">
          <span style="font-size:15px;font-weight:700;color:var(--ds-text);white-space:nowrap;">API用量统计</span>
          <span style="font-size:11px;color:var(--ds-text-2);white-space:nowrap;">v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''}</span>
        </div>
        <button id="aus-sidebar-toggle" style="width:30px;height:30px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text-2);cursor:pointer;flex-shrink:0;font-size:13px;padding:0;line-height:1;">‹</button>
      </div>
      <div style="flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:4px;">
        <div class="aus-nav-group" style="display:flex;flex-direction:column;gap:4px;">
          <div class="aus-nav-item active" data-nav="overview" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:14px;line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;font-size:16px;">◈</span><span class="aus-nav-label">用量概览</span></div>
          <div class="aus-nav-item" data-nav="stats" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:14px;line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;font-size:16px;">▦</span><span class="aus-nav-label">用量统计</span></div>
          <div class="aus-nav-item" data-nav="history" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:14px;line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;font-size:16px;">≡</span><span class="aus-nav-label">历史记录</span></div>
          <div class="aus-nav-item" data-nav="forecast" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:14px;line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;font-size:16px;">⬈</span><span class="aus-nav-label">趋势预测（Beta）</span></div>
          <div class="aus-nav-item" data-nav="wallet" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:14px;line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;font-size:16px;">▣</span><span class="aus-nav-label">钱包</span></div>
        </div>
        <div style="flex:1;"></div>
        <div class="aus-nav-group" style="display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--ds-border);padding-top:10px;">
          <div class="aus-nav-item" data-nav="settings" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:14px;line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;font-size:16px;">⚙</span><span class="aus-nav-label">设置</span></div>
          <div class="aus-nav-item" data-nav="help" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:14px;line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;font-size:16px;">?</span><span class="aus-nav-label">使用说明</span></div>
          <div class="aus-nav-item" data-nav="about" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:14px;line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;font-size:16px;">ⓘ</span><span class="aus-nav-label">关于</span></div>
        </div>
      </div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--ds-panel-bg);">
      <div id="aus-page-header" style="flex-shrink:0;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid var(--ds-border);background:var(--ds-card-inner);">
        <span id="aus-page-title" style="font-size:14px;font-weight:600;color:var(--ds-text);">用量概览</span>
        <button id="aus-panel-close" style="width:32px;height:32px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text-2);cursor:pointer;font-size:14px;">✕</button>
      </div>
      <div id="aus-content-body" style="flex:1;display:flex;flex-direction:row;overflow:hidden;min-height:0;position:relative;">
      <div id="aus-main" style="flex:1;min-width:0;overflow:auto;padding:20px;background:var(--ds-panel-bg);">
        <div style="max-width:1100px;margin:0 auto;display:grid;gap:16px;">
          <div data-view="overview">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="ds-card aus-overview-balance-card" style="position:relative;"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;"><div class="ds-card-title">充值余额</div><div id="aus-overview-wallet-btn" style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;"><span style="color:var(--ds-text-2);">余额口径</span><span id="aus-overview-wallet-label" style="font-weight:600;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部钱包合计</span><span>▼</span></div><div id="aus-overview-wallet-dropdown" style="display:none;position:absolute;top:44px;right:10px;z-index:20;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:190px;max-height:260px;overflow:auto;"></div></div><div class="ds-card-val" id="aus-balance">¥0.00<small>CNY</small></div><div id="aus-balance-remaining" style="font-size:11px;color:var(--ds-text-2);margin-top:6px;min-height:16px;"></div><div style="margin-top:8px;display:flex;gap:6px;"><button id="aus-btn-query-balance" class="ds-btn-pill" style="padding:6px 12px;font-size:11px;">查询余额</button><button id="aus-btn-export" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">导出记录</button><button id="aus-btn-import" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">导入记录</button></div></div>
              <div class="ds-card"><div class="ds-card-title">累计消费</div><div class="ds-card-val" id="aus-total-cost">¥0.0000<small>CNY</small></div><div style="font-size:11px;color:var(--ds-text-3);margin-top:2px;" id="aus-total-tokens">0 tokens</div></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
              <div class="ds-card" id="aus-overview-history"></div>
              <div class="ds-card" id="aus-overview-spend"></div>
            </div>
            <div id="aus-overview-four" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px;"></div>
            <div id="aus-heatmap-card-overview" class="ds-card" style="margin-top:12px;width:100%;max-width:100%;overflow:hidden;box-sizing:border-box;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                <div style="font-size:12px;font-weight:600;color:var(--ds-text);">Token 使用量热力图</div>
                <div id="aus-heatmap-legend-overview" style="display:flex;align-items:center;gap:3px;font-size:10px;color:var(--ds-text-3);"></div>
              </div>
              <div style="display:flex;gap:0;overflow:hidden;max-width:100%;box-sizing:border-box;">
                <div id="aus-heatmap-labels-overview" style="flex-shrink:0;padding:4px 0"></div>
                <div id="aus-heatmap-scroll-overview" style="overflow-x:auto;overflow-y:hidden;flex:1;min-width:0;max-width:100%;padding:4px 0;cursor:grab;scrollbar-width:thin;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;">
                  <div id="aus-heatmap-container-overview" style="display:inline-block;min-width:max-content;"></div>
                </div>
              </div>
              <div style="font-size:10px;color:var(--ds-text-3);margin-top:6px;display:flex;justify-content:space-between;">
                <span>按日聚合 Token（深绿=高用量，展示近 2 年）</span>
                <span style="color:var(--ds-text-2);">悬停查看日期</span>
              </div>
            </div>
            <div id="aus-chat-summary-overview" class="ds-card" style="margin-top:12px;overflow:auto;">
              <div style="font-size:12px;font-weight:600;color:var(--ds-text);margin-bottom:8px;">按对话统计</div>
              <table style="width:100%;border-collapse:collapse;font-size:11px;white-space:nowrap;min-width:720px;">
                <thead><tr style="color:var(--ds-text-2);border-bottom:1px solid var(--ds-border);text-align:right;"><th style="text-align:left;padding:6px 8px;">对话</th><th style="padding:6px 8px;">轮次</th><th style="padding:6px 8px;">命中</th><th style="padding:6px 8px;">未命中</th><th style="padding:6px 8px;">输出</th><th style="padding:6px 8px;">总 Tokens</th><th style="padding:6px 8px;">总费用</th><th style="padding:6px 8px;">平均 Token/轮</th><th style="padding:6px 8px;">平均命中率</th></tr></thead>
                <tbody id="aus-chat-summary-tbody"><tr><td colspan="9" style="text-align:center;padding:16px;color:var(--ds-text-3);">暂无数据</td></tr></tbody>
              </table>
              <div style="font-size:10px;color:var(--ds-text-3);margin-top:6px;">按总 Token 倒序 · 数据来源为全部历史（不受统计页筛选影响）</div>
            </div>
            </div>
           <div data-view="stats" style="display:none;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;position:relative;flex-wrap:wrap;">
              <div class="aus-stats-filter">
                <div id="aus-range-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:12px;cursor:pointer;"><span style="color:var(--ds-text-2);">时间维度</span><span id="aus-range-label" style="font-weight:600;color:var(--ds-text);">近 30 天</span><span style="font-size:10px;">▼</span></div>
                <div id="aus-range-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);overflow:hidden;flex-direction:row;">
                  <div style="min-width:120px;border-right:1px solid var(--ds-card);padding:8px;display:grid;gap:2px;">
                    <div data-range="all" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:var(--ds-text);">全部</div>
                    <div data-range="today" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:var(--ds-text);">今天</div>
                    <div data-range="yesterday" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:var(--ds-text);">昨天</div>
                    <div data-range="7d" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:var(--ds-text);">近 7 天</div>
                    <div data-range="30d" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:var(--ds-text);">近 30 天</div>
                    <div data-range="month" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:var(--ds-text);">本月</div>
                    <div data-range="lastMonth" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:var(--ds-text);">上月</div>
                    <div data-range="custom" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:var(--ds-text);">自定义</div>
                  </div>
                  <div id="aus-date-calendar" style="padding:12px;display:none;"></div>
                </div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-model-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:12px;cursor:pointer;"><span style="color:var(--ds-text-2);">模型</span><span id="aus-model-label" style="font-weight:600;color:var(--ds-text);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span><span style="font-size:10px;">▼</span></div>
                <div id="aus-model-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:180px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-chat-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:12px;cursor:pointer;"><span style="color:var(--ds-text-2);">对话</span><span id="aus-chat-label" style="font-weight:600;color:var(--ds-text);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span><span style="font-size:10px;">▼</span></div>
                <div id="aus-chat-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-endpoint-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:12px;cursor:pointer;"><span style="color:var(--ds-text-2);">接入类型</span><span id="aus-endpoint-label" style="font-weight:600;color:var(--ds-text);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span><span style="font-size:10px;">▼</span></div>
                <div id="aus-endpoint-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;max-width:320px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-credential-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:12px;cursor:pointer;"><span style="color:var(--ds-text-2);">API 密钥</span><span id="aus-credential-label" style="font-weight:600;color:var(--ds-text);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span><span style="font-size:10px;">▼</span></div>
                <div id="aus-credential-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;max-width:320px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
              <div class="ds-card"><div style="font-size:11px;color:var(--ds-text-2);">消费金额</div><div id="aus-stats-cost" style="font-size:22px;font-weight:700;color:var(--ds-text);margin-top:6px;">¥0.00 CNY</div></div>
              <div class="ds-card"><div style="font-size:11px;color:var(--ds-text-2);">API 请求次数</div><div id="aus-stats-req" style="font-size:22px;font-weight:700;color:var(--ds-text);margin-top:6px;">0</div></div>
              <div class="ds-card"><div style="font-size:11px;color:var(--ds-text-2);">Tokens</div><div id="aus-stats-tok" style="font-size:22px;font-weight:700;color:var(--ds-text);margin-top:6px;">0</div></div>
            </div>
            <div id="aus-stats-four" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px;"></div>
            <div id="aus-model-summary" class="ds-card" style="margin-top:12px;overflow:auto;">
              <div style="font-size:12px;font-weight:600;color:var(--ds-text);margin-bottom:8px;">模型汇总</div>
              <table style="width:100%;border-collapse:collapse;font-size:11px;white-space:nowrap;">
                <thead><tr style="color:var(--ds-text-2);border-bottom:1px solid var(--ds-border);text-align:right;"><th style="text-align:left;padding:6px 8px;">模型</th><th data-sort-key="count" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">调用次数<span class="aus-sort-ind"></span></th><th data-sort-key="hit" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">输入(命中)<span class="aus-sort-ind"></span></th><th data-sort-key="miss" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">输入(未命中)<span class="aus-sort-ind"></span></th><th data-sort-key="out" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">输出<span class="aus-sort-ind"></span></th><th data-sort-key="total" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">总 Tokens<span class="aus-sort-ind"></span></th><th data-sort-key="cost" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">总成本<span class="aus-sort-ind"></span></th><th data-sort-key="avgCost" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">平均成本<span class="aus-sort-ind"></span></th><th data-sort-key="avgDur" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">平均耗时<span class="aus-sort-ind"></span></th><th data-sort-key="avgRate" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">平均速率<span class="aus-sort-ind"></span></th></tr></thead>
                <tbody id="aus-summary-tbody"><tr><td colspan="10" style="text-align:center;padding:16px;color:var(--ds-text-3);">暂无数据</td></tr></tbody>
              </table>
            </div>
            <div class="ds-card" style="margin-top:12px;position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;"><span style="font-size:12px;font-weight:600;color:var(--ds-text);">自定义图表</span><div style="display:flex;gap:8px;position:relative;"><div id="aus-chart-y-btn" style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;"><span style="color:var(--ds-text-2);">Y</span><span id="aus-chart-y-label" style="font-weight:600;color:var(--ds-text);">总费用</span><span style="font-size:10px;">▼</span></div><div id="aus-chart-x-btn" style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;"><span style="color:var(--ds-text-2);">X</span><span id="aus-chart-x-label" style="font-weight:600;color:var(--ds-text);">每日</span><span style="font-size:10px;">▼</span></div><div id="aus-chart-y-dropdown" style="display:none;position:absolute;top:34px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:220px;max-height:280px;overflow:auto;"></div><div id="aus-chart-x-dropdown" style="display:none;position:absolute;top:34px;right:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:140px;"></div></div></div><div id="aus-stats-chart" style="height:300px;"></div></div>
            <div id="aus-extra-charts" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px;">
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:11px;font-weight:600;color:var(--ds-text);">Token 趋势</span><div style="display:flex;gap:6px;"><div id="aus-extra-y-token" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;"><span id="aus-extra-y-label-token">3 项</span> ▼</div><div id="aus-extra-x-token" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;"><span id="aus-extra-x-label-token">轮次</span> ▼</div></div></div><div id="aus-extra-y-drop-token" style="display:none;position:absolute;top:32px;left:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:180px;max-height:200px;overflow:auto;"></div><div id="aus-extra-x-drop-token" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-token" style="height:220px;"></div></div>
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:11px;font-weight:600;color:var(--ds-text);">费用 趋势</span><div style="display:flex;gap:6px;"><div id="aus-extra-y-cost" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;"><span id="aus-extra-y-label-cost">1 项</span> ▼</div><div id="aus-extra-x-cost" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;"><span id="aus-extra-x-label-cost">轮次</span> ▼</div></div></div><div id="aus-extra-y-drop-cost" style="display:none;position:absolute;top:32px;left:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:180px;max-height:200px;overflow:auto;"></div><div id="aus-extra-x-drop-cost" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-cost" style="height:220px;"></div></div>
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:11px;font-weight:600;color:var(--ds-text);">缓存命中 趋势</span><div style="display:flex;gap:6px;"><div id="aus-extra-x-hit" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;"><span id="aus-extra-x-label-hit">轮次</span> ▼</div></div></div><div id="aus-extra-x-drop-hit" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-hit" style="height:220px;"></div></div>
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:11px;font-weight:600;color:var(--ds-text);">API请求数 趋势</span><div style="display:flex;gap:6px;"><div id="aus-extra-x-req" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;"><span id="aus-extra-x-label-req">每日</span> ▼</div></div></div><div id="aus-extra-x-drop-req" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-req" style="height:220px;"></div></div>
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:11px;font-weight:600;color:var(--ds-text);">耗时与速率 趋势</span><div style="display:flex;gap:6px;"><div id="aus-extra-x-dur" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;"><span id="aus-extra-x-label-dur">轮次</span> ▼</div></div></div><div id="aus-extra-x-drop-dur" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-dur" style="height:220px;"></div></div>
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:11px;font-weight:600;color:var(--ds-text);">模型用量占比</span><div id="aus-pie-toggle" style="padding:4px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-black);color:var(--ds-black-text);font-size:10px;cursor:pointer;">Token</div></div><div id="aus-chart-pie" style="height:220px;"></div></div>
            </div>
            <div id="aus-model-trends" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px;">
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:11px;font-weight:600;color:var(--ds-text);">模型 Token 趋势</span><div style="display:flex;gap:6px;"><div id="aus-modeltrends-x-token" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;"><span id="aus-modeltrends-x-label-token">每日</span> ▼</div></div></div><div id="aus-modeltrends-x-drop-token" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-model-token" style="height:220px;"></div></div>
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:11px;font-weight:600;color:var(--ds-text);">模型调用次数趋势</span><div style="display:flex;gap:6px;"><div id="aus-modeltrends-x-req" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;"><span id="aus-modeltrends-x-label-req">每日</span> ▼</div></div></div><div id="aus-modeltrends-x-drop-req" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-model-req" style="height:220px;"></div></div>
            </div>
          </div>
          <div data-view="forecast" style="display:none;">
            <div style="display:grid;gap:12px;">
              <div style="display:flex;align-items:center;gap:8px;position:relative;flex-wrap:wrap;">
                <div id="aus-forecast-chat-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:12px;cursor:pointer;"><span style="color:var(--ds-text-2);">对话</span><span id="aus-forecast-chat-label" style="font-weight:600;color:var(--ds-text);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">当前对话</span><span style="font-size:10px;">▼</span></div>
                <div id="aus-forecast-chat-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:220px;max-height:260px;overflow:auto;padding:8px;"></div>
                <span style="font-size:10px;color:var(--ds-text-3);">切换对话以查看对应预测，能耗/趋势均随之更新</span>
              </div>
              <div id="aus-forecast-card" class="ds-card"></div>
              <div class="ds-card"><div style="font-size:12px;font-weight:600;color:var(--ds-text);margin-bottom:8px;">能耗标识（RP 能耗效率）</div><div id="aus-energy-badge"></div></div>
              <div class="ds-card"><div style="font-size:12px;font-weight:600;color:var(--ds-text);margin-bottom:8px;">预测趋势（输入 token 按轮次 + 拟合/置信带/上限）</div><div id="aus-forecast-chart" style="height:260px;"></div></div>
              <div class="ds-card"><div style="font-size:12px;font-weight:600;color:var(--ds-text);margin-bottom:8px;">敏感度 · 假设命中率</div><div id="aus-forecast-sensitivity"></div></div>
              <div class="ds-card"><div style="font-size:12px;font-weight:600;color:var(--ds-text);margin-bottom:8px;">对比 · 最耗对话 Top</div><div id="aus-forecast-compare"></div></div>
            </div>
          </div>
          <div data-view="wallet" style="display:none;">
            <div id="aus-wallet"></div>
          </div>
          <div data-view="history" style="display:none;">
            <div id="aus-history-filter-host" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;position:relative;flex-wrap:wrap;">
              <div class="aus-stats-filter">
                <div id="aus-history-model-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:12px;cursor:pointer;"><span style="color:var(--ds-text-2);">模型</span><span id="aus-history-model-label" style="font-weight:600;color:var(--ds-text);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span><span style="font-size:10px;">▼</span></div>
                <div id="aus-history-model-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:180px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-history-chat-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:12px;cursor:pointer;"><span style="color:var(--ds-text-2);">对话</span><span id="aus-history-chat-label" style="font-weight:600;color:var(--ds-text);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span><span style="font-size:10px;">▼</span></div>
                <div id="aus-history-chat-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-history-endpoint-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:12px;cursor:pointer;"><span style="color:var(--ds-text-2);">接入类型</span><span id="aus-history-endpoint-label" style="font-weight:600;color:var(--ds-text);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span><span style="font-size:10px;">▼</span></div>
                <div id="aus-history-endpoint-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;max-width:320px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-history-credential-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:12px;cursor:pointer;"><span style="color:var(--ds-text-2);">API 密钥</span><span id="aus-history-credential-label" style="font-weight:600;color:var(--ds-text);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span><span style="font-size:10px;">▼</span></div>
                <div id="aus-history-credential-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;max-width:320px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
            </div>
            <div id="aus-diff" class="ds-card" style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:12px;font-weight:600;color:var(--ds-text);">缓存断点</span><button id="aus-diff-fullscreen" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:6px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">全屏</button></div><div style="font-size:11px;color:var(--ds-text-3);">在历史中各选一条 旧/新 对比，橙/绿高亮即发散点</div></div>
            <div id="aus-history"></div>
          </div>
          <div data-view="settings" style="display:none;">
            <div id="aus-settings"></div>
          </div>
          <div data-view="help" style="display:none;">
            <div style="display:grid;gap:12px;">
              <div class="ds-card" style="line-height:1.7;font-size:12px;"><div style="font-size:11px;color:#0EA5E9;font-weight:600;margin-bottom:6px;">📊 匿名使用统计</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>本扩展默认开启匿名使用统计，仅上报浏览器环境分桶（浏览器名与主版本、系统、架构、语言、窄屏分桶、深色偏好、standalone、时区偏移）、8 个页面的使用次数、打开次数、扩展版本与面板渲染耗时分桶。</div><div>不采集对话名称或内容、模型名、密钥、余额、费用、接口地址等任何隐私数据；服务端不记录 IP 地址。数据按匿名随机标识汇总，仅用于了解用户规模与改进方向。</div><div>可在「设置 → 匿名使用统计」随时关闭，关闭后立即停止采集与上报；也可在那里重置匿名标识。</div><div>完整说明见 <a href="https://janmk1453.github.io/Api-Usage/#privacy" target="_blank" rel="noreferrer" style="color:var(--ds-text);text-decoration:underline;">隐私声明</a>。</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:12px;"><div style="font-size:11px;color:#FF6A00;font-weight:600;margin-bottom:6px;">完整使用文档</div><div style="color:var(--ds-text-2);">详细说明各页面、筛选、钱包、定价、同步、隐私与常见问题。</div><a href="https://janmk1453.github.io/Api-Usage/" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;justify-content:center;margin-top:10px;padding:8px 14px;border-radius:999px;background:var(--ds-black);color:var(--ds-black-text);text-decoration:none;font-size:12px;font-weight:600;">前往完整使用文档</a></div>
              <div class="ds-card" style="line-height:1.7;font-size:12px;"><div style="font-size:11px;color:#DC2626;font-weight:600;margin-bottom:6px;">隐私声明（完整版：<a href="https://janmk1453.github.io/Api-Usage/#privacy" target="_blank" rel="noreferrer" style="color:#DC2626;text-decoration:underline;">https://janmk1453.github.io/Api-Usage/#privacy</a>）</div><div style="color:var(--ds-text-2);display:grid;gap:6px;"><div>本扩展有且只能获得用户在酒馆本身中填写的：密钥条目的编号、用户备注和掩码末三位，仅用于独立区分请求来源，不会且无法读取、保存或上传完整明文密钥。</div><div>用户储存在酒馆本身的密钥是安全的，本扩展无法获取真实密钥。</div><div>用户主动填入本扩展的校准密钥是实际可用的密钥，且仅会被用于查询 DeepSeek 官方余额，不会额外造成扣费或消耗；它仅经 XOR 混淆后存放于 SillyTavern，不进入历史记录、统计、日志、导入导出或 WebDAV。自动校准时仅由浏览器直接发送至 <a href="https://api.deepseek.com/user/balance" target="_blank" rel="noreferrer" style="color:var(--ds-text);text-decoration:underline;">https://api.deepseek.com/user/balance</a> API 查询。</div><div>XOR 不是安全加密，请使用权限受限的密钥并自行评估风险。</div><div>本扩展完整代码开源可审查。</div><div style="margin-top:2px;padding-top:6px;border-top:1px solid var(--ds-border);font-weight:600;color:#DC2626;">免责声明（完整版见上方链接）</div><div>本扩展不对功能“价格来源”、“自动同步”等利用 <a href="https://models.dev" target="_blank" rel="noreferrer" style="color:var(--ds-text);text-decoration:underline;">models.dev</a> 获取的数据中出现或可能出现的商业化中转站负责；我们不建议使用任何商业化中转站，尽管我们已经尽力筛选数据，但由于对大量数据进行完全筛选难以实现，因此我们不对可能出现的任何商业化中转站名称负责，不构成推荐，和 models.dev 或任何中转站没有商业往来，坚定不移的反对商业化。</div><div>我们将尽可能维护扩展的安全和隐私性，但本扩展不对因酒馆/本扩展的安全漏洞或因间接原因导致的任何形式的密钥泄露及产生的损失负责。</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:12px;"><div style="font-size:11px;color:#0BA25E;font-weight:600;margin-bottom:6px;">钱包</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 扩展按识别到的接入链接自动创建和汇总钱包，默认始终保留 DeepSeek 官方钱包；同名链接下识别的密钥和模型会归入同一钱包。</div><div>2. 每个钱包可独立维护名称、余额、模型价格、峰谷规则和价格来源；钱包默认收起，展开状态按钱包记忆。价格来源仅展示第一方模型厂商，不展示中转站或聚合平台。</div><div>3. 请求进入后会先匹配所属钱包，再使用该钱包的模型价格和峰谷规则计费，并从对应钱包余额预扣；未配置价格的模型先记零费用，保存或同步价格后自动重算冷热历史。</div><div>4. 自动余额校准仅支持 DeepSeek 官方直连，校准密钥需在钱包内单独填写；其他接入可使用手工余额，多个密钥不会自动相加。</div><div>5. 删除钱包会进入“已忽略接入”，后续请求不会自动重建、不参与余额合计，历史记录仍保留归属，需要时可恢复显示。</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:12px;"><div style="font-size:11px;color:#2563EB;font-weight:600;margin-bottom:6px;">📊 使用统计 / 预测</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 输入 API 密钥并保存后点击“查询”获取余额（余额查询仅支持 DeepSeek 官方）</div><div>2. 正常对话，扩展自动记录每次请求的费用、token 数及缓存命中等统计数据</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:12px;"><div style="font-size:11px;color:var(--ds-green);font-weight:600;margin-bottom:6px;">💡 高峰时间提示</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 设置中可开启峰值提示小圆点，直观显示当前（DeepSeek）高低峰状态</div><div>2. 圆点可拖动，位置自动记忆，找不到时可在设置中重置</div><div>3. DeepSeek 官方规则：周一至周五（不含中国法定节假日）9:00-12:00、14:00-18:00 为高峰，其余时段（含周末、中国法定节假日全天）为空闲；调休上班的周末同样按空闲计费</div><div>4. 内置中国法定节假日数据覆盖 ${CN_HOLIDAY_COVERAGE_LABEL}，超出范围的年份可在设置中按日期补充“额外空闲日期”</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:12px;"><div style="font-size:11px;color:#DB2777;font-weight:600;margin-bottom:6px;">🔄 消息对比</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 在历史记录中找到想对比的两条消息，前者点“旧”，后者点“新”</div><div>2. 系统并排显示请求消息的文字差异</div><div>3. 差异点即缓存发散起始位置（前 N 条相同为缓存命中段）</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:12px;"><div style="font-size:11px;color:#D97706;font-weight:600;margin-bottom:6px;">📈 统计图表</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 切换时间、模型（可多选）、对话、接入类型和 API 密钥查看不同范围的统计</div><div>2. 多图表展示多模请求参数，悬浮查看分模型明细</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:12px;"><div style="font-size:11px;color:#7C3AED;font-weight:600;margin-bottom:6px;">💾 请求详细参数</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 在历史记录中点击某条的“详情”，电脑端会在右侧打开约四分之一宽的窗口并压缩列表宽度，手机端会在屏幕下部弹出约四分之三高度的悬浮窗口</div><div>2. 查看：模型/时间/耗时/首字延迟/思维链/费用/Token 等详情及四类原始数据（请求参数/完整响应/Raw Usage/Messages）</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:12px;"><div style="font-size:11px;color:#0891B2;font-weight:600;margin-bottom:6px;">🧡 模型兼容</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 完全兼容 DeepSeek 官方 API</div><div>2. 尽量兼容不同厂商/渠道的请求格式，部分模型可能无缓存命中</div><div>3. 如数据异常，请携带完整请求与响应反馈</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:12px;"><div style="font-size:11px;color:var(--ds-text-3);font-weight:600;margin-bottom:6px;">✨ 关于</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>本扩展由原脚本（<a href="https://github.com/janmk1453/deepseek-tavern-script" target="_blank" style="color:var(--ds-text);text-decoration:underline;">deepseek-tavern-script</a>）迁移重构。</div><div><span style="color:var(--ds-text);">@janmk</span> · 仓库 <a href="https://github.com/janmk1453/Api-Usage" target="_blank" style="color:var(--ds-text);text-decoration:underline;">janmk1453/Api-Usage</a></div></div></div>
            </div>
          </div>
          <div data-view="about" style="display:none;">
            <div style="display:grid;gap:12px;">
              <div class="ds-card" style="line-height:1.7;font-size:12px;color:var(--ds-text);">
                <div style="font-size:14px;font-weight:600;">关于<br/>API用量统计 · SillyTavern 扩展</div>
                <div style="margin-top:8px;color:var(--ds-text-2);">迁移至原 DeepSeek使用预测 脚本<br/>致力于实现最全面的用量可视化统计<br/><br/>仓库：<a href="https://github.com/janmk1453/Api-Usage" target="_blank" style="color:var(--ds-text);">janmk1453/Api-Usage</a></div>
              </div>
              <div class="ds-card" style="display:grid;gap:8px;">
                <div style="font-size:12px;font-weight:600;color:var(--ds-text);">检查更新</div>
                <div id="aus-update-banner" style="display:none;padding:8px 10px;border-radius:8px;background:var(--ds-yellow-bg);border:1px solid var(--ds-yellow-border);font-size:11px;color:var(--ds-text);"></div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <div style="position:relative;z-index:5;">
                    <button id="aus-update-branch-btn" class="ds-btn-pill" style="padding:6px 14px;font-size:11px;">更新分支：<span id="aus-update-branch-label">main</span></button>
                    <div id="aus-update-branch-dropdown" style="display:none;position:absolute;top:calc(100% + 6px);left:0;min-width:150px;padding:6px;background:var(--ds-bg);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:60;flex-direction:column;gap:4px;">
                      <div data-update-branch="main" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;">main（稳定）</div>
                      <div data-update-branch="dev" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12px;">dev（测试）</div>
                    </div>
                  </div>
                  <button id="aus-check-update" class="ds-btn-pill" style="padding:6px 14px;font-size:11px;">检查更新</button>
                  <button id="aus-run-update" class="ds-btn-pill" style="display:none;padding:6px 14px;font-size:11px;">立即更新</button>
                  <span style="font-size:11px;color:var(--ds-text-3);">当前 v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''} · 每 1 小时自动检查</span>
                </div>
                <div style="font-size:11px;color:var(--ds-text-3);">可选择 main 或 dev 分支直接更新，默认 main；更新完成后自动刷新网页。非 Git 安装请使用“管理扩展程序”。</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <aside id="aus-history-detail" style="display:none;flex-direction:column;width:25%;min-width:300px;max-width:480px;flex-shrink:0;border-left:1px solid var(--ds-border);background:var(--ds-card-inner);overflow:hidden;">
        <div style="flex-shrink:0;height:48px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;border-bottom:1px solid var(--ds-border);">
          <span id="aus-history-detail-title" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;color:var(--ds-text);">记录详情</span>
          <button id="aus-history-detail-close" title="关闭" style="width:28px;height:28px;flex-shrink:0;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card);color:var(--ds-text-2);cursor:pointer;font-size:13px;line-height:1;">✕</button>
        </div>
        <div id="aus-history-detail-body" style="flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:12px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;"></div>
      </aside>
    </div>
    </div>
    </div>
  `;
  // 兼容旧遮罩：覆盖式抽屉遮罩，点击关闭
  const sbOverlay = doc.createElement('div');
  sbOverlay.id = 'aus-sidebar-overlay';
  sbOverlay.style.cssText = 'display:none;';
  panel.appendChild(sbOverlay);
  doc.body.appendChild(overlay);
  doc.body.appendChild(panel);
  try { applyTheme(theme); } catch {}
  try {
    const p = (window.parent as any) || window;
    p.addEventListener('resize', positionPanel, { passive: true } as any);
  } catch {}
  doc.getElementById('aus-panel-close')?.addEventListener('click', closePanel);
  doc.getElementById('aus-mobile-panel-close')?.addEventListener('click', closePanel);
  doc.getElementById('aus-history-detail-close')?.addEventListener('click', () => closeHistoryDetail(doc));
  doc.querySelectorAll('.aus-nav-item').forEach((el: any) => {
    el.addEventListener('click', () => {
      const v = el.getAttribute('data-nav');
      if (v) switchView(v as any);
    });
  });
  // DeepSeek 方案：窄屏覆盖式抽屉 + 遮罩点外关闭，宽屏 60/260 折叠；无动画瞬时切换
  let mobileOpen = false;
  const isMobile = () => {
    try {
      const body = doc.getElementById('aus-panel-body') as HTMLElement | null;
      if (body && body.clientWidth > 0) return body.clientWidth <= 760;
      return ((window.parent as any)?.innerWidth ?? window.innerWidth) <= 760;
    } catch { return window.innerWidth <= 760; }
  };
  const syncMobileSidebar = () => {
    const sb = doc.getElementById('aus-sidebar') as HTMLElement | null;
    if (!sb) return;
    const ov = doc.getElementById('aus-sidebar-overlay') as HTMLElement | null;
    if (isMobile()) {
      if (mobileOpen) sb.classList.add('is-open');
      else sb.classList.remove('is-open');
      if (ov) {
        ov.classList.toggle('is-open', mobileOpen);
        ov.style.display = '';
        if (mobileOpen) {
          ov.onclick = () => { mobileOpen = false; syncMobileSidebar(); };
        } else ov.onclick = null;
      }
      // 窄屏下强制还原为完整导航（避免宽屏折叠残留的 inline 隐藏）
      const brand = doc.getElementById('aus-brand') as HTMLElement | null;
      if (brand) brand.style.removeProperty('display');
      doc.querySelectorAll('.aus-nav-label').forEach((el: any) => { (el as HTMLElement).style.removeProperty('display'); });
      doc.querySelectorAll('#aus-sidebar .aus-nav-item').forEach((el: any) => {
        const c = el as HTMLElement;
        c.style.removeProperty('justify-content');
        c.style.removeProperty('padding');
      });
      if (sb) {
        sb.style.removeProperty('width');
        sb.style.removeProperty('min-width');
        sb.style.removeProperty('max-width');
      }
    } else {
      sb.classList.remove('is-open');
      if (ov) {
        ov.classList.remove('is-open');
        ov.style.display = 'none';
        ov.onclick = null;
      }
    }
  };
  const applyCollapsed = (v: boolean) => {
    collapsed = v;
    const sb = doc.getElementById('aus-sidebar') as HTMLElement | null;
    const brand = doc.getElementById('aus-brand') as HTMLElement | null;
    const btn = doc.getElementById('aus-sidebar-toggle') as HTMLElement | null;
    if (!sb) return;
    if (isMobile()) {
      // 窄屏：忽略 collapsed，改由 mobileOpen 控制显隐
      syncMobileSidebar();
      return;
    }
    // 宽屏：保留 60/260 折叠
    sb.style.setProperty('width', collapsed ? '60px' : '260px', 'important');
    sb.style.setProperty('min-width', collapsed ? '60px' : '260px', 'important');
    sb.style.setProperty('max-width', collapsed ? '60px' : '260px', 'important');
    if (brand) brand.style.setProperty('display', collapsed ? 'none' : 'flex', 'important');
    if (btn) btn.textContent = collapsed ? '›' : '‹';
    doc.querySelectorAll('.aus-nav-label').forEach((el: any) => { (el as HTMLElement).style.setProperty('display', collapsed ? 'none' : 'inline', 'important'); });
    doc.querySelectorAll('.aus-nav-item').forEach((el: any) => { (el as HTMLElement).style.justifyContent = collapsed ? 'center' : 'flex-start'; });
    doc.querySelectorAll('#aus-sidebar .aus-nav-item').forEach((el: any) => {
      (el as HTMLElement).style.padding = collapsed ? '10px 0' : '10px 12px';
    });
  };
  doc.getElementById('aus-sidebar-toggle')?.addEventListener('click', () => applyCollapsed(!collapsed));
  doc.getElementById('aus-hamburger-btn')?.addEventListener('click', () => {
    mobileOpen = !mobileOpen;
    syncMobileSidebar();
  });
  // 窄屏下点击导航自动收起，复刻抽屉体验但保持 display 切换
  doc.querySelectorAll('.aus-nav-item').forEach((el: any) => {
    el.addEventListener('click', () => {
      if (isMobile() && mobileOpen) { mobileOpen = false; syncMobileSidebar(); }
    });
  });
  try {
    if (isMobile()) { mobileOpen = false; syncMobileSidebar(); }
    let rzT: any = null;
    const onResize = () => {
      if (rzT) return;
      rzT = setTimeout(() => {
        rzT = null;
        if (isMobile()) syncMobileSidebar();
        else { mobileOpen = false; syncMobileSidebar(); applyCollapsed(collapsed); }
        try { positionPanel(); } catch {}
      }, 150);
    };
    (window.parent as any)?.addEventListener('resize', onResize);
    window.addEventListener('resize', onResize);
  } catch {}
  bindPanel(doc);
  bindHistoryFilters(doc);
  bindImportExport(doc);
  renderSettings(doc);
  bindHistoryCompare();
  initStatsView();
  initExtraCharts();
  try { initForecastView(); } catch {}
  // 关于页检查更新按钮
  try {
    // 更新分支胶囊下拉，默认 main
    import('../services/update').then(m => {
      const branchBtn = doc.getElementById('aus-update-branch-btn') as HTMLButtonElement | null;
      const branchLabel = doc.getElementById('aus-update-branch-label') as HTMLElement | null;
      const branchDrop = doc.getElementById('aus-update-branch-dropdown') as HTMLElement | null;
      if (!branchBtn || !branchLabel || !branchDrop) return;
      const renderBranch = () => {
        const branch = m.getUpdateBranch();
        branchLabel.textContent = branch;
        branchDrop.querySelectorAll('[data-update-branch]').forEach((el: any) => {
          const active = el.getAttribute('data-update-branch') === branch;
          el.style.background = active ? 'var(--ds-card)' : 'transparent';
          el.style.fontWeight = active ? '600' : '400';
        });
      };
      renderBranch();
      branchBtn.onclick = (e) => {
        e.stopPropagation();
        branchDrop.style.display = branchDrop.style.display === 'flex' ? 'none' : 'flex';
      };
      branchDrop.querySelectorAll('[data-update-branch]').forEach((el: any) => {
        el.onclick = () => {
          const branch = el.getAttribute('data-update-branch');
          if (branch !== 'main' && branch !== 'dev') return;
          m.setUpdateBranch(branch);
          renderBranch();
          branchDrop.style.display = 'none';
          m.checkUpdate(true);
        };
      });
      doc.addEventListener('click', (ev: any) => {
        const drop = doc.getElementById('aus-update-branch-dropdown') as HTMLElement | null;
        if (!drop) return;
        if (!ev?.target?.closest?.('#aus-update-branch-dropdown') && !ev?.target?.closest?.('#aus-update-branch-btn')) {
          drop.style.display = 'none';
        }
      });
    }).catch(() => {});
    const updBtn = doc.getElementById('aus-check-update') as HTMLButtonElement | null;
    if (updBtn) {
      updBtn.onclick = () => {
        updBtn.textContent = '检查中…';
        updBtn.setAttribute('disabled', '');
        import('../services/update').then(m => m.checkUpdate(true).finally(() => {
          updBtn.textContent = '检查更新';
          updBtn.removeAttribute('disabled');
        }));
      };
    }
    const runUpdBtn = doc.getElementById('aus-run-update') as HTMLButtonElement | null;
    if (runUpdBtn) {
      runUpdBtn.onclick = () => {
        if (runUpdBtn.hasAttribute('disabled')) return;
        runUpdBtn.textContent = '更新中…';
        runUpdBtn.setAttribute('disabled', '');
        import('../services/update').then(m => m.updateSelf()).then(res => {
          if (res.ok && res.changed) {
            const bannerEl = doc.getElementById('aus-update-banner') as HTMLElement | null;
            if (bannerEl) {
              bannerEl.style.display = 'block';
              bannerEl.style.background = 'var(--ds-green-bg)';
              bannerEl.style.borderColor = 'var(--ds-green)';
              bannerEl.textContent = `已更新到 ${res.branch} 分支，正在刷新页面…`;
            }
            runUpdBtn.textContent = '即将刷新…';
            setTimeout(() => {
              try {
                (window.parent as any)?.location?.reload?.();
              } catch {
                try { location.reload(); } catch {}
              }
            }, 1500);
            return;
          }
          runUpdBtn.textContent = '立即更新';
          runUpdBtn.removeAttribute('disabled');
          if (res.ok && !res.changed) {
            const bannerEl = doc.getElementById('aus-update-banner') as HTMLElement | null;
            if (bannerEl) {
              bannerEl.style.display = 'block';
              bannerEl.style.background = 'var(--ds-green-bg)';
              bannerEl.style.borderColor = 'var(--ds-green)';
              bannerEl.textContent = `已是最新版本（${res.branch}），无需更新` + (res.commit ? '（' + res.commit + '）' : '');
            }
            runUpdBtn.style.display = 'none';
          }
        }).catch(() => {
          runUpdBtn.textContent = '立即更新';
          runUpdBtn.removeAttribute('disabled');
        });
      };
    }
  } catch {}
  switchView('overview');
  refreshUI();
}

export function resetPanelState() {
  panelCreated = false;
  panelOpen = false;
}

export function openPanel() {
  const doc = getDoc();
  panelOpenStartTs = nowTs();
  try { trackOpen(); } catch {}
  let ov = doc.getElementById('aus-overlay') as HTMLElement | null;
  let pn = doc.getElementById('aus-panel') as HTMLElement | null;
  if (!ov || !pn) {
    createPanel();
    ov = doc.getElementById('aus-overlay') as HTMLElement | null;
    pn = doc.getElementById('aus-panel') as HTMLElement | null;
    if (!ov || !pn) return;
  }
  ov.style.display = 'block';
  pn.style.display = 'flex';
  try {
    const sb = doc.getElementById('aus-sidebar') as HTMLElement | null;
    const isMobile = (()=>{ try{ const b = doc.getElementById('aus-panel-body') as HTMLElement | null; if (b && b.clientWidth > 0) return b.clientWidth <= 760; return ((window.parent as any)?.innerWidth ?? window.innerWidth) <= 760; } catch{ return window.innerWidth <=760; }})();
    if (sb) {
      if (isMobile) {
        // 窄屏默认隐藏，等待汉堡呼出
        if (sb.classList.contains('is-open') && !((doc as any)._aus_mobileOpen)) sb.classList.remove('is-open');
      } else sb.classList.remove('is-open');
    }
  } catch {}
  positionPanel();
  requestAnimationFrame(() => {
    ov.style.opacity = '1';
    positionPanel();
    try { if (panelOpenStartTs) trackRender(nowTs() - panelOpenStartTs); } catch {}
  });
  panelOpen = true;
  refreshUI();
  try { import('../services/update').then(m => m.maybeAutoCheck()); } catch {}
}
export function closePanel() {
  const doc = getDoc();
  const ov = doc.getElementById('aus-overlay') as HTMLElement | null;
  const pn = doc.getElementById('aus-panel') as HTMLElement | null;
  if (ov) { ov.style.opacity = '0'; setTimeout(() => { ov.style.display = 'none'; }, 200); }
  if (pn) pn.style.display = 'none';
  panelOpen = false;
  // 匿名使用统计：关闭面板时合并上报本次会话数据
  try { flushTelemetry('close'); } catch {}
}
export function togglePanel() { if (panelOpen) closePanel(); else openPanel(); }
