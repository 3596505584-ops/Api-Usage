import { icon } from './icons';
import { getSelectedSave, state } from '../store/index';
import { localDay, esc } from '../utils/date';
import { Y_OPTIONS, Y_GROUPS, X_OPTIONS, getYSelected, getXSelected, getChartType, setChartType, toggleY, setXSelected, aggregateForChart } from './chart-config';
import { renderExtraCharts } from './extra-charts';
import { renderModelTrends, initModelTrends } from './model-trends';
import { DataEvents, on as onDataEvent } from '../data/events';
import {
  STATS_FILTER_ALL,
  STATS_FILTER_UNKNOWN,
  computeStatsFour,
  filterStatsHistory,
  getCredentialFilterOptions,
  getEndpointFilterOptions,
  type StatsHistoryFilter,
} from '../data/computed';
import { FOUR_OPTIONS, getFourDisplay } from './overview';
import { historyRecordKey } from '../utils/history-key';
import { toast } from '../utils/logger';

type RangeKey = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'lastMonth' | 'custom' | 'all';
let currentRange: RangeKey = '30d';
let customStart = '';
let customEnd = '';
let pickerOpen = false;
let selectedModels: string[] = [];
let modelPickerOpen = false;
let selectedChat: string = STATS_FILTER_ALL;
let chatPickerOpen = false;
let selectedEndpoint: string = STATS_FILTER_ALL;
let endpointPickerOpen = false;
let selectedCredential: string = STATS_FILTER_ALL;
let credentialPickerOpen = false;
let lastStatsHistory: any[] = [];

// 模型汇总表排序：点击表头（除模型外）正序/倒序切换
type SummarySortKey = 'count' | 'hit' | 'miss' | 'out' | 'total' | 'cost' | 'avgCost' | 'avgDur' | 'avgRate';
let summarySortKey: SummarySortKey | null = null;
let summarySortDir: 'asc' | 'desc' = 'desc';
let lastSummaryFiltered: any[] | null = null;

function updateSummarySortHeader() {
  const doc = getDoc();
  const ths = doc.querySelectorAll('#aus-model-summary thead th[data-sort-key]');
  ths.forEach((th: any) => {
    th.style.color = '';
    th.style.fontWeight = '';
    const ind = th.querySelector('.aus-sort-ind');
    if (ind) ind.textContent = '';
    // 悬停高亮由 CSS :hover 处理，此处仅重置
  });
  if (summarySortKey) {
    const cur = doc.querySelector(`#aus-model-summary thead th[data-sort-key="${summarySortKey}"]`) as HTMLElement | null;
    if (cur) {
      cur.style.color = 'var(--ds-text)';
      cur.style.fontWeight = '600';
      const ind = cur.querySelector('.aus-sort-ind') as HTMLElement | null;
      if (ind) ind.innerHTML = summarySortDir === 'asc' ? icon('chevron-up', 14) : icon('chevron-down', 14);
    }
  }
}

function bindSummarySort() {
  const doc = getDoc();
  const ths = doc.querySelectorAll('#aus-model-summary thead th[data-sort-key]');
  if (!ths.length) return;
  // 避免重复绑定
  if ((bindSummarySort as any)._bound) return;
  (bindSummarySort as any)._bound = true;
  ths.forEach((th: any) => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort-key') as SummarySortKey;
      if (!key) return;
      if (summarySortKey === key) {
        summarySortDir = summarySortDir === 'asc' ? 'desc' : 'asc';
      } else {
        summarySortKey = key;
        summarySortDir = 'desc';
      }
      updateSummarySortHeader();
      if (lastSummaryFiltered) renderModelSummary(lastSummaryFiltered);
    });
    th.addEventListener('mouseenter', () => {
      const k = th.getAttribute('data-sort-key');
      if (k !== summarySortKey) th.style.color = 'var(--ds-text)';
    });
    th.addEventListener('mouseleave', () => {
      const k = th.getAttribute('data-sort-key');
      if (k !== summarySortKey) th.style.color = '';
    });
  });
}

function getDoc() { return (window.parent as any)?.document ?? document; }
function themeColor(name: string, fallback: string) {
  try {
    const doc = getDoc();
    const el = doc.getElementById('aus-panel') || doc.documentElement;
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fallback;
  } catch { return fallback; }
}

function getRangeDates(): { start: string; end: string } {
  const today = localDay(Date.now());
  const d = new Date(today + 'T00:00:00');
  const fmt = (x: Date) => localDay(x.getTime());
  switch (currentRange) {
    case 'today': return { start: today, end: today };
    case 'yesterday': { const y = new Date(d); y.setDate(y.getDate()-1); const s=fmt(y); return { start:s,end:s }; }
    case '7d': { const s=new Date(d); s.setDate(s.getDate()-6); return { start:fmt(s), end:today }; }
    case '30d': { const s=new Date(d); s.setDate(s.getDate()-29); return { start:fmt(s), end:today }; }
    case 'month': { const s=new Date(d.getFullYear(), d.getMonth(),1); return { start:fmt(s), end:today }; }
    case 'lastMonth': { const s=new Date(d.getFullYear(), d.getMonth()-1,1); const e=new Date(d.getFullYear(), d.getMonth(),0); return { start:fmt(s), end:fmt(e) }; }
    case 'custom': return { start: customStart || today, end: customEnd || today };
    case 'all': return { start: '2020-01-01', end: today };
  }
  return { start: today, end: today };
}

function getRecordedModels(history?: any[]): string[] {
  const set = new Set<string>();
  for (const h of history || []) if (h?.model) set.add(h.model);
  return Array.from(set).sort();
}

function getRecordedChatsFrom(list: any[]): Array<{ chatId: string | null; chatName: string | null; displayName: string }> {
  const map = new Map<string, { chatId: string | null; chatName: string | null; lastSeen: number }>();
  for (const h of list || []) {
    const cid = (h.chatId ?? null) as string | null;
    const cname = (h.chatName ?? null) as string | null;
    const key = cid ?? '__null__';
    const timestamp = Number(h?.timestamp) || 0;
    if (!map.has(key)) map.set(key, { chatId: cid, chatName: cname, lastSeen: timestamp });
    else {
      const current = map.get(key)!;
      if (timestamp >= current.lastSeen && cname) current.chatName = cname;
      if (timestamp > current.lastSeen) current.lastSeen = timestamp;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen).map(v => {
    let display = v.chatName || '';
    if (!display) {
      if (v.chatId) display = v.chatId.length > 18 ? v.chatId.slice(0, 8) + '…' + v.chatId.slice(-4) : v.chatId;
      else display = '未分组/旧数据';
    }
    return { chatId: v.chatId, chatName: v.chatName, displayName: display };
  });
}

function currentStatsFilter(): StatsHistoryFilter {
  const { start, end } = getRangeDates();
  return {
    start,
    end,
    model: selectedModels.length ? selectedModels : STATS_FILTER_ALL,
    chat: selectedChat,
    endpoint: selectedEndpoint,
    credential: selectedCredential,
  };
}

function updateRangeHighlight() {
  const doc = getDoc();
  doc.querySelectorAll('[data-range]').forEach((el: any) => {
    const r = el.getAttribute('data-range');
    if (r === currentRange) { el.style.background = 'var(--ds-card)'; el.style.fontWeight = '600'; }
    else { el.style.background = ''; el.style.fontWeight = ''; }
  });
  // 日历仅自定义时显示
  const calWrap = doc.getElementById('aus-date-calendar');
  if (calWrap) calWrap.style.display = currentRange === 'custom' ? 'block' : 'none';
}

function renderCalendar() {
  const doc = getDoc();
  const cal = doc.getElementById('aus-date-calendar');
  if (!cal) return;
  updateRangeHighlight();
  if (currentRange !== 'custom') return;
  const todayStr = localDay(Date.now());
  if (!customStart) customStart = todayStr;
  if (!customEnd) customEnd = todayStr;
  cal.innerHTML = `<div style="padding:12px;min-width:260px;display:grid;gap:10px;">
    <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">开始日期</div><input type="date" id="aus-custom-start" value="${customStart}" max="${todayStr}" style="width:100%;padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);box-sizing:border-box;"></div>
    <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">结束日期</div><input type="date" id="aus-custom-end" value="${customEnd}" max="${todayStr}" style="width:100%;padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);box-sizing:border-box;"></div>
    <button id="aus-custom-apply" style="padding:8px 12px;border-radius:999px;background:var(--ds-black);color:var(--ds-black-text);border:none;font-size:var(--aus-fs-base);cursor:pointer;">应用</button>
  </div>`;
  const startEl = doc.getElementById('aus-custom-start') as HTMLInputElement | null;
  const endEl = doc.getElementById('aus-custom-end') as HTMLInputElement | null;
  const applyBtn = doc.getElementById('aus-custom-apply');
  const apply = () => {
    if (startEl) customStart = startEl.value || todayStr;
    if (endEl) customEnd = endEl.value || todayStr;
    if (customStart > customEnd) { const t = customStart; customStart = customEnd; customEnd = t; if (startEl) startEl.value = customStart; if (endEl) endEl.value = customEnd; }
    updatePickerLabel();
    updateRangeHighlight();
    renderStatsView();
  };
  if (startEl) startEl.onchange = apply;
  if (endEl) endEl.onchange = apply;
  if (applyBtn) applyBtn.onclick = apply;
}

function updatePickerLabel() {
  const doc = getDoc();
  const label = doc.getElementById('aus-range-label');
  if (!label) return;
  const map: any = { all:'全部', today:'今天', yesterday:'昨天', '7d':'近 7 天', '30d':'近 30 天', month:'本月', lastMonth:'上月', custom:'自定义' };
  if (currentRange === 'custom' && customStart && customEnd) {
    label.textContent = customStart === customEnd ? customStart : `${customStart} ~ ${customEnd}`;
  } else label.textContent = map[currentRange] || '近 30 天';
  updateRangeHighlight();
}

function renderModelPicker(modelsHist?: any[]) {
  const doc = getDoc();
  const dropdown = doc.getElementById('aus-model-dropdown');
  const label = doc.getElementById('aus-model-label');
  if (!dropdown || !label) return;
  const models = getRecordedModels(modelsHist);
  const validModels = new Set(models);
  selectedModels = selectedModels.filter((model) => validModels.has(model));
  const allSelected = selectedModels.length === 0;
  label.textContent = allSelected ? '全部' : selectedModels.length === 1 ? selectedModels[0] : `已选 ${selectedModels.length} 项`;
  label.title = allSelected ? '全部模型' : selectedModels.join('、');
  let html = `<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${allSelected?'background:var(--ds-card);font-weight:600;':''}"><input type="checkbox" data-model-all ${allSelected?'checked':''} style="accent-color:var(--ds-text);" /><span>全部模型</span></label>`;
  for (const m of models) {
    const checked = selectedModels.includes(m);
    const active = checked ? 'background:var(--ds-card);font-weight:600;' : '';
    html += `<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}"><input type="checkbox" data-model="${esc(m)}" ${checked?'checked':''} style="accent-color:var(--ds-text);" /><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(m)}</span></label>`;
  }
  if (!models.length) html += '<div style="padding:8px 10px;color:var(--ds-text-3);font-size:var(--aus-fs-base);">暂无模型</div>';
  dropdown.innerHTML = html;
  const allInput = dropdown.querySelector('[data-model-all]') as HTMLInputElement | null;
  if (allInput) {
    allInput.onchange = () => {
      selectedModels = [];
      renderStatsView();
    };
  }
  dropdown.querySelectorAll('input[data-model]').forEach((el: any) => {
    el.onchange = () => {
      const model = el.getAttribute('data-model') || '';
      if (!model) return;
      if (el.checked) {
        if (!selectedModels.includes(model)) selectedModels.push(model);
      } else {
        selectedModels = selectedModels.filter((item) => item !== model);
      }
      renderStatsView();
    };
  });
}

function renderChatPicker(chatHist?: any[]) {
  const doc = getDoc();
  const dropdown = doc.getElementById('aus-chat-dropdown');
  const label = doc.getElementById('aus-chat-label');
  if (!dropdown || !label) return;
  const list = chatHist ? getRecordedChatsFrom(chatHist) : getRecordedChatsFrom((getSelectedSave() as any)?.history || []);
  const find = list.find(c => (c.chatId ?? '__null__') === selectedChat);
  label.textContent = selectedChat === '__all__' ? '全部' : (find?.displayName || selectedChat);
  label.title = find?.chatId || find?.displayName || '';
  let html = `<div data-chat="__all__" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${selectedChat==='__all__'?'background:var(--ds-card);font-weight:600;':''}">全部</div>`;
  for (const c of list) {
    const key = c.chatId ?? '__null__';
    const active = key === selectedChat ? 'background:var(--ds-card);font-weight:600;' : '';
    html += `<div data-chat="${esc(key)}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}" title="${esc(c.chatId || '')}">${esc(c.displayName)}</div>`;
  }
  if (!list.length) html += '<div style="padding:8px 10px;color:var(--ds-text-3);font-size:var(--aus-fs-base);">暂无对话</div>';
  dropdown.innerHTML = html;
  dropdown.querySelectorAll('[data-chat]').forEach((el: any) => {
    el.onclick = () => {
      selectedChat = el.getAttribute('data-chat') || '__all__';
      chatPickerOpen = false;
      dropdown.style.display = 'none';
      renderChatPicker(chatHist);
      renderStatsView();
    };
  });
}

function renderEndpointPicker(history?: any[]) {
  const doc = getDoc();
  const dropdown = doc.getElementById('aus-endpoint-dropdown');
  const label = doc.getElementById('aus-endpoint-label');
  if (!dropdown || !label) return;
  const options = getEndpointFilterOptions(history || []);
  const current = options.find((option) => option.id === selectedEndpoint);
  label.textContent = selectedEndpoint === STATS_FILTER_ALL
    ? '全部'
    : selectedEndpoint === STATS_FILTER_UNKNOWN
      ? '未记录接入'
      : current?.label || selectedEndpoint;
  label.title = label.textContent;
  const optionHtml = (id: string, text: string, title: string) => {
    const active = id === selectedEndpoint ? 'background:var(--ds-card);font-weight:600;' : '';
    return `<div data-endpoint="${esc(id)}" title="${esc(title)}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}">${esc(text)}</div>`;
  };
  let html = optionHtml(STATS_FILTER_ALL, '全部', '全部');
  for (const option of options) html += optionHtml(option.id, option.label, option.label);
  if (!options.length) html += '<div style="padding:8px 10px;color:var(--ds-text-3);font-size:var(--aus-fs-base);">暂无接入记录</div>';
  dropdown.innerHTML = html;
  dropdown.querySelectorAll('[data-endpoint]').forEach((el: any) => {
    el.onclick = () => {
      selectedEndpoint = el.getAttribute('data-endpoint') || STATS_FILTER_ALL;
      selectedCredential = STATS_FILTER_ALL;
      endpointPickerOpen = false;
      dropdown.style.display = 'none';
      renderStatsView();
    };
  });
}

function renderCredentialPicker(history?: any[], endpoint = selectedEndpoint) {
  const doc = getDoc();
  const dropdown = doc.getElementById('aus-credential-dropdown');
  const label = doc.getElementById('aus-credential-label');
  if (!dropdown || !label) return;
  const options = getCredentialFilterOptions(history || [], endpoint);
  const current = options.find((option) => option.id === selectedCredential);
  label.textContent = selectedCredential === STATS_FILTER_ALL
    ? '全部'
    : selectedCredential === STATS_FILTER_UNKNOWN
      ? '未识别密钥'
      : current?.label || selectedCredential;
  label.title = label.textContent;
  const optionHtml = (id: string, text: string, title: string) => {
    const active = id === selectedCredential ? 'background:var(--ds-card);font-weight:600;' : '';
    return `<div data-credential="${esc(id)}" title="${esc(title)}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}">${esc(text)}</div>`;
  };
  let html = optionHtml(STATS_FILTER_ALL, '全部', '全部');
  for (const option of options) html += optionHtml(option.id, option.label, option.label);
  if (!options.length) html += '<div style="padding:8px 10px;color:var(--ds-text-3);font-size:var(--aus-fs-base);">暂无密钥记录</div>';
  dropdown.innerHTML = html;
  dropdown.querySelectorAll('[data-credential]').forEach((el: any) => {
    el.onclick = () => {
      selectedCredential = el.getAttribute('data-credential') || STATS_FILTER_ALL;
      credentialPickerOpen = false;
      dropdown.style.display = 'none';
      renderStatsView();
    };
  });
}

export function positionFilterDropdown(btn: HTMLElement, dropdown: HTMLElement) {
  try {
    const doc = getDoc();
    const panel = doc.getElementById('aus-panel') as HTMLElement | null;
    if (!panel) return;
    const panelRect = panel.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const available = Math.max(160, panelRect.width - 16);
    dropdown.style.maxWidth = `${available}px`;
    dropdown.style.boxSizing = 'border-box';
    const width = Math.min(dropdown.offsetWidth || 220, available);
    const buttonLeft = btnRect.left - panelRect.left;
    const desiredLeft = Math.max(8, Math.min(buttonLeft, panelRect.width - width - 8));
    dropdown.style.left = `${desiredLeft - buttonLeft}px`;
    dropdown.style.right = 'auto';
  } catch {}
}

function closeFilterDropdowns(except?: 'range' | 'model' | 'chat' | 'endpoint' | 'credential') {
  const doc = getDoc();
  if (except !== 'range') {
    pickerOpen = false;
    const el = doc.getElementById('aus-range-dropdown');
    if (el) el.style.display = 'none';
  }
  if (except !== 'model') {
    modelPickerOpen = false;
    const el = doc.getElementById('aus-model-dropdown');
    if (el) el.style.display = 'none';
  }
  if (except !== 'chat') {
    chatPickerOpen = false;
    const el = doc.getElementById('aus-chat-dropdown');
    if (el) el.style.display = 'none';
  }
  if (except !== 'endpoint') {
    endpointPickerOpen = false;
    const el = doc.getElementById('aus-endpoint-dropdown');
    if (el) el.style.display = 'none';
  }
  if (except !== 'credential') {
    credentialPickerOpen = false;
    const el = doc.getElementById('aus-credential-dropdown');
    if (el) el.style.display = 'none';
  }
}

function bindPicker() {
  const doc = getDoc();
  const btn = doc.getElementById('aus-range-btn');
  const dropdown = doc.getElementById('aus-range-dropdown');
  if (btn && dropdown) {
    btn.onclick = () => {
      pickerOpen = !pickerOpen;
      closeFilterDropdowns('range');
      dropdown.style.display = pickerOpen ? 'flex' : 'none';
      if (pickerOpen) {
        renderCalendar();
        positionFilterDropdown(btn as HTMLElement, dropdown as HTMLElement);
      }
    };
    doc.querySelectorAll('[data-range]').forEach((el: any) => {
      el.onclick = () => {
        const r = el.getAttribute('data-range') as RangeKey;
        currentRange = r;
        if (r !== 'custom') { customStart=''; customEnd=''; }
        pickerOpen = false;
        dropdown.style.display = 'none';
        updatePickerLabel();
        renderStatsView();
      };
    });
  }
  const mBtn = doc.getElementById('aus-model-btn');
  const mDropdown = doc.getElementById('aus-model-dropdown');
  if (mBtn && mDropdown) {
    mBtn.onclick = () => {
      modelPickerOpen = !modelPickerOpen;
      closeFilterDropdowns('model');
      mDropdown.style.display = modelPickerOpen ? 'block' : 'none';
      if (modelPickerOpen) {
        renderModelPicker(lastStatsHistory);
        positionFilterDropdown(mBtn as HTMLElement, mDropdown as HTMLElement);
      }
    };
  }
  const cBtn = doc.getElementById('aus-chat-btn');
  const cDropdown = doc.getElementById('aus-chat-dropdown');
  if (cBtn && cDropdown) {
    cBtn.onclick = () => {
      chatPickerOpen = !chatPickerOpen;
      closeFilterDropdowns('chat');
      cDropdown.style.display = chatPickerOpen ? 'block' : 'none';
      if (chatPickerOpen) {
        (async () => {
          try {
            const h = await getHistoryForStats();
            renderChatPicker(h);
          } catch { renderChatPicker(); }
          positionFilterDropdown(cBtn as HTMLElement, cDropdown as HTMLElement);
        })();
      }
    };
  }
  const eBtn = doc.getElementById('aus-endpoint-btn');
  const eDropdown = doc.getElementById('aus-endpoint-dropdown');
  if (eBtn && eDropdown) {
    eBtn.onclick = () => {
      endpointPickerOpen = !endpointPickerOpen;
      closeFilterDropdowns('endpoint');
      eDropdown.style.display = endpointPickerOpen ? 'block' : 'none';
      if (endpointPickerOpen) {
        renderEndpointPicker(lastStatsHistory);
        positionFilterDropdown(eBtn as HTMLElement, eDropdown as HTMLElement);
      }
    };
  }
  const kBtn = doc.getElementById('aus-credential-btn');
  const kDropdown = doc.getElementById('aus-credential-dropdown');
  if (kBtn && kDropdown) {
    kBtn.onclick = () => {
      credentialPickerOpen = !credentialPickerOpen;
      closeFilterDropdowns('credential');
      kDropdown.style.display = credentialPickerOpen ? 'block' : 'none';
      if (credentialPickerOpen) {
        renderCredentialPicker(lastStatsHistory);
        positionFilterDropdown(kBtn as HTMLElement, kDropdown as HTMLElement);
      }
    };
  }
  doc.addEventListener('click', (e: any) => {
    const t = e.target as HTMLElement;
    if (pickerOpen && !t.closest('#aus-range-dropdown') && !t.closest('#aus-range-btn')) {
      pickerOpen = false;
      const d = doc.getElementById('aus-range-dropdown');
      if (d) d.style.display = 'none';
    }
    if (modelPickerOpen && !t.closest('#aus-model-dropdown') && !t.closest('#aus-model-btn')) {
      modelPickerOpen = false;
      const d = doc.getElementById('aus-model-dropdown');
      if (d) d.style.display = 'none';
    }
    if (chatPickerOpen && !t.closest('#aus-chat-dropdown') && !t.closest('#aus-chat-btn')) {
      chatPickerOpen = false;
      const d = doc.getElementById('aus-chat-dropdown');
      if (d) d.style.display = 'none';
    }
    if (endpointPickerOpen && !t.closest('#aus-endpoint-dropdown') && !t.closest('#aus-endpoint-btn')) {
      endpointPickerOpen = false;
      const d = doc.getElementById('aus-endpoint-dropdown');
      if (d) d.style.display = 'none';
    }
    if (credentialPickerOpen && !t.closest('#aus-credential-dropdown') && !t.closest('#aus-credential-btn')) {
      credentialPickerOpen = false;
      const d = doc.getElementById('aus-credential-dropdown');
      if (d) d.style.display = 'none';
    }
  });
}

let chartYOpen = false;
let chartXOpen = false;

function renderChartSelectors() {
  const doc = getDoc();
  const yBtn = doc.getElementById('aus-chart-y-btn');
  const xBtn = doc.getElementById('aus-chart-x-btn');
  const yDrop = doc.getElementById('aus-chart-y-dropdown');
  const xDrop = doc.getElementById('aus-chart-x-dropdown');
  const yLabel = doc.getElementById('aus-chart-y-label');
  const xLabel = doc.getElementById('aus-chart-x-label');
  if (!yBtn || !xBtn || !yDrop || !xDrop) return;
  // Y 多选（按 Token / 费用 / 性能 / 比率分组）
  const ySel: string[] = getYSelected() as any;
  if (yLabel) yLabel.textContent = ySel.length ? `${ySel.length} 项` : '选择';
  let yHtml = '';
  for (const group of Y_GROUPS) {
    const opts = Y_OPTIONS.filter(o => o.group === group.key);
    if (!opts.length) continue;
    yHtml += `<div style="padding:6px 8px 2px;font-size:var(--aus-fs-xs);color:var(--ds-text-3);font-weight:600;">${group.label}</div>`;
    for (const opt of opts) {
      const checked = ySel.includes(opt.key);
      yHtml += `<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:var(--aus-fs-sm);${checked?'background:var(--ds-card);':''}"><input type="checkbox" data-ykey="${opt.key}" ${checked?'checked':''} style="accent-color:var(--ds-text);" /><span style="display:inline-block;width:8px;height:8px;background:${opt.color};border-radius:2px;"></span>${opt.label}<span style="margin-left:auto;color:var(--ds-text-3);font-size:var(--aus-fs-sm);">${opt.unit}</span></label>`;
    }
  }
  const typeSel = getChartType();
  const typeOpts = [ { v:'auto', l:'自动' }, { v:'bar', l:'柱状' }, { v:'line', l:'曲线' }, { v:'area', l:'面积' } ];
  yHtml += `<div style="margin-top:4px;border-top:1px solid var(--ds-border);padding:6px 8px 2px;font-size:var(--aus-fs-xs);color:var(--ds-text-3);font-weight:600;">展示方式</div>`;
  yHtml += `<div style="display:flex;gap:4px;flex-wrap:wrap;padding:2px 6px 8px;">${typeOpts.map(t => `<div data-chart-type="${t.v}" style="padding:4px 9px;border-radius:999px;border:1px solid var(--ds-border);font-size:var(--aus-fs-sm);cursor:pointer;${typeSel===t.v?'background:var(--ds-card);font-weight:600;':''}">${t.l}</div>`).join('')}</div>`;
  yDrop.innerHTML = yHtml;
  yDrop.querySelectorAll('input[data-ykey]').forEach((el: any)=>{
    el.onchange = () => {
      toggleY(el.getAttribute('data-ykey') as any);
      renderChartSelectors();
      renderStatsView();
    };
  });
  yDrop.querySelectorAll('[data-chart-type]').forEach((el: any)=>{
    el.onclick = () => {
      setChartType(el.getAttribute('data-chart-type') as any);
      renderChartSelectors();
      renderStatsView();
    };
  });
  // X 单选
  const xSel = getXSelected();
  const xMap: any = { round:'轮次', hour:'每小时', day:'每日', week:'每周', month:'每月' };
  if (xLabel) xLabel.textContent = xMap[xSel] || xSel;
  let xHtml = '';
  for (const opt of X_OPTIONS) {
    const active = opt.key===xSel;
    xHtml += `<div data-xkey="${opt.key}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active?'background:var(--ds-card);font-weight:600;':''}">${opt.label}</div>`;
  }
  xDrop.innerHTML = xHtml;
  xDrop.querySelectorAll('[data-xkey]').forEach((el:any)=>{
    el.onclick = () => {
      setXSelected(el.getAttribute('data-xkey') as any);
      chartXOpen=false; xDrop.style.display='none';
      renderChartSelectors();
      renderStatsView();
    };
  });
}

function bindChartSelectors() {
  const doc = getDoc();
  const yBtn = doc.getElementById('aus-chart-y-btn');
  const yDrop = doc.getElementById('aus-chart-y-dropdown');
  const xBtn = doc.getElementById('aus-chart-x-btn');
  const xDrop = doc.getElementById('aus-chart-x-dropdown');
  if (yBtn && yDrop) {
    yBtn.onclick = () => {
      chartYOpen = !chartYOpen;
      yDrop.style.display = chartYOpen ? 'block' : 'none';
      if (chartYOpen) { const xD = doc.getElementById('aus-chart-x-dropdown'); if (xD) { xD.style.display='none'; chartXOpen=false; } renderChartSelectors(); }
    };
  }
  if (xBtn && xDrop) {
    xBtn.onclick = () => {
      chartXOpen = !chartXOpen;
      xDrop.style.display = chartXOpen ? 'block' : 'none';
      if (chartXOpen) { const yD = doc.getElementById('aus-chart-y-dropdown'); if (yD) { yD.style.display='none'; chartYOpen=false; } renderChartSelectors(); }
    };
  }
  doc.addEventListener('click', (e:any)=>{
    const t = e.target as HTMLElement;
    if (chartYOpen && !t.closest('#aus-chart-y-dropdown') && !t.closest('#aus-chart-y-btn')) { chartYOpen=false; const d=doc.getElementById('aus-chart-y-dropdown'); if(d) d.style.display='none'; }
    if (chartXOpen && !t.closest('#aus-chart-x-dropdown') && !t.closest('#aus-chart-x-btn')) { chartXOpen=false; const d=doc.getElementById('aus-chart-x-dropdown'); if(d) d.style.display='none'; }
  });
}

// 可配置图表（Y多选 X单选，双轴）
let chart: any = null;
async function renderChart(filteredRaw: any[]) {
  const doc = getDoc();
  const el = doc.getElementById('aus-stats-chart') as HTMLElement | null;
  if (!el) return;
  const yKeys = getYSelected() as any;
  const xKey = getXSelected() as any;
  const { labels, series } = aggregateForChart(filteredRaw, yKeys, xKey);
  if (!labels.length) {
    if (chart) { try { chart.dispose(); } catch {} chart = null; }
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--ds-text-3);font-size:var(--aus-fs-base);">该筛选无数据（历史 ' + filteredRaw.length + ' 条）</div>';
    return;
  }
  const w = (el as HTMLElement).clientWidth, h = (el as HTMLElement).clientHeight;
  if (w === 0 || h === 0) {
    // 统计页隐藏时（首次加载默认显示概览），不报错不重试，等待切换到统计页时由 switchView 触发
    const statsView = doc.querySelector('[data-view="stats"]') as HTMLElement | null;
    const isHidden = statsView ? (statsView.style.display === 'none' || (statsView as any).offsetParent === null) : false;
    if (isHidden) {
      try { const { log } = await import('../utils/logger'); log.debug('renderChart 容器隐藏，等待切换'); } catch {}
      return;
    }
    const tries = (renderChart as any)._retryCount || 0;
    if (tries >= 80) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ds-text-3);font-size:var(--aus-fs-sm);">图表容器未就绪，请切换视图重试</div>';
      return;
    }
    (renderChart as any)._retryCount = tries + 1;
    setTimeout(() => renderChart(filteredRaw), 120);
    return;
  }
  (renderChart as any)._retryCount = 0;
  let echarts: any;
  try {
    echarts = await import('echarts/core').then(async (ec: any) => {
      const { BarChart, LineChart } = await import('echarts/charts');
      const { GridComponent, TooltipComponent } = await import('echarts/components');
      const { CanvasRenderer } = await import('echarts/renderers');
      ec.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);
      return ec;
    });
  } catch (e) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:#DC2626;font-size:var(--aus-fs-base);">图表加载失败，请检查网络后重试</div>';
    console.error('[Api-Usage] echarts load failed', e);
    return;
  }
  if (!chart) {
    chart = echarts.init(el);
  } else {
    try { chart.resize(); } catch {}
  }
  const kinds = new Set(series.map(s => s.kind));
  const hasToken = kinds.has('token');
  const hasCost = kinds.has('cost');
  const hasCount = kinds.has('count');
  const hasDuration = kinds.has('duration');
  const hasRate = kinds.has('rate');
  const hasPercent = kinds.has('percent');
  const chartType = getChartType();
  const cBorder = themeColor('--ds-border', '#E5E7EB');
  const cCard = themeColor('--ds-card', '#F6F7F8');
  const cText3 = themeColor('--ds-text-3', '#9CA3AF');
  const curCur = (()=>{ try{  return getDisplayCurrency(); } catch{ return {code:'CNY',symbol:'¥',rate:1} as any; } })();
  if (hasCost) {
    // 费用单位动态换算：CNY→USD 时图表数据需除以汇率
    for (const s of series) if (s.kind==='cost') s.data = s.data.map((v:any)=> curCur.code==='USD' ? Number((Number(v)/curCur.rate).toFixed(4)) : v);
  }
  // 窄屏（手机竖屏）压缩轴占位：隐藏轴名、缩小字号、Token 用 万/k 缩写，避免左右轴挤掉绘图区
  const narrow = w < 560;
  const labelSize = narrow ? 10 : 12;
  const axisGap = narrow ? 40 : 46;
  const compactNum = (v: number) => {
    const n = Number(v);
    if (!isFinite(n)) return '0';
    if (Math.abs(n) >= 10000) return (n / 10000).toFixed(Math.abs(n) % 10000 ? 1 : 0) + '万';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(Math.abs(n) % 1000 ? 1 : 0) + 'k';
    return String(Math.round(n));
  };
  // 多轴：左轴 token（无 token 时放请求数），其余按类型依次挂右侧并偏移，避免互相压线
  const yAxis: any[] = [];
  const axisIndex: Record<string, number> = {};
  let rightOffset = 0;
  const labelStyle = { color: cText3, fontSize: labelSize };
  const addAxis = (key: string, cfg: any, left = false, gap = axisGap) => {
    const axis: any = { type:'value', ...cfg };
    if (left) axis.position = 'left';
    else { axis.position = 'right'; axis.offset = rightOffset; rightOffset += gap; }
    axisIndex[key] = yAxis.length;
    yAxis.push(axis);
  };
  if (hasToken) addAxis('token', { name: narrow ? '' : 'tokens', axisLine:{show:false}, splitLine:{lineStyle:{color:cCard}}, axisLabel: { ...labelStyle, formatter: compactNum } }, true);
  if (hasCount) addAxis('count', { name: narrow ? '' : '次', minInterval:1, axisLine:{show:false}, splitLine:{show:false}, axisLabel: narrow ? { show:false } : labelStyle }, !hasToken, narrow ? 12 : axisGap);
  if (hasCost) addAxis('cost', { name: narrow ? '' : curCur.code, axisLine:{show:false}, splitLine:{show:false}, axisLabel:{ ...labelStyle, formatter:(v:number)=> curCur.symbol + Number(v).toFixed(narrow ? 3 : 4) } });
  if (hasDuration) addAxis('duration', { name: narrow ? '' : '耗时 s', axisLine:{show:false}, splitLine:{show:false}, axisLabel:{ ...labelStyle, formatter:(v:number)=> Number(v).toFixed(1) } });
  if (hasRate) addAxis('rate', { name: narrow ? '' : '速率 t/s', axisLine:{show:false}, splitLine:{show:false}, axisLabel:{ ...labelStyle, formatter:(v:number)=> Math.round(v) } });
  if (hasPercent) addAxis('percent', { name: narrow ? '' : '%', min:0, max:100, axisLine:{show:false}, splitLine:{show:false}, axisLabel:{ ...labelStyle, formatter:(v:number)=> v + '%' } });
  const tokenSeries = series.filter(s => s.kind === 'token');
  const lastTokenIdx = tokenSeries.length ? series.indexOf(tokenSeries[tokenSeries.length - 1]) : -1;
  const seriesOpt = series.map((s, idx)=>{
    const kind = s.kind;
    let type: 'bar' | 'line';
    if (chartType === 'bar') type = 'bar';
    else if (chartType === 'line' || chartType === 'area') type = 'line';
    else type = (kind === 'token' || kind === 'count') ? 'bar' : 'line';
    const isStack = kind === 'token' && type === 'bar';
    const isTop = idx === lastTokenIdx;
    let col = s.color;
    if (col === '#111827' || (typeof col === 'string' && col.indexOf('var(')===0)) col = themeColor('--ds-text', '#111827');
    const base: any = {
      name: s.name,
      type,
      yAxisIndex: axisIndex[kind] ?? 0,
      data: s.data,
      emphasis: { focus: 'series' },
      itemStyle: { color: col },
    };
    if (type === 'bar') {
      base.barMaxWidth = 18;
      if (isStack) { base.stack = 'token'; base.barGap = '-100%'; }
      base.itemStyle.borderRadius = isStack ? (isTop ? [4,4,0,0] : [0,0,0,0]) : [4,4,0,0];
    } else {
      base.smooth = true;
      base.symbol = 'circle';
      base.symbolSize = 4;
      base.lineStyle = { color: col, width: kind === 'percent' ? 1.6 : 2, type: kind === 'percent' ? 'dashed' : 'solid' };
      if (chartType === 'area' || (chartType === 'auto' && kind === 'percent')) {
        base.areaStyle = { color: col, opacity: 0.08 };
      }
    }
    return base;
  });
  const cCardInner = themeColor('--ds-card-inner', '#FFFFFF');
  const cText = themeColor('--ds-text', '#111827');
  // X 轴密度随容器宽度动态计算，最少展示 8 个
  const cw = w || 320;
  const minPerLabel = cw < 500 ? 42 : cw < 760 ? 56 : 68;
  const maxLabels = Math.max(8, Math.floor(cw / minPerLabel));
  const xInterval = labels.length <= maxLabels ? 0 : Math.ceil(labels.length / maxLabels) - 1;
  const needZoom = labels.length > maxLabels;
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: cCardInner,
      borderColor: cBorder,
      borderWidth: 1,
      textStyle: { color: cText, fontSize: 12 },
      formatter: (params:any)=>{
        if (!params?.length) return '';
        const idx = params[0].dataIndex;
        const label = labels[idx];
        let html = `<div style="font-weight:600;margin-bottom:6px;">${esc(label)}</div>`;
        for (const p of params) {
          const v = p.value;
          const meta = Y_OPTIONS.find((o:any)=>o.label===p.seriesName);
          const kind = meta?.kind;
          let disp: string;
          if (kind === 'cost') disp = curCur.symbol + Number(v).toFixed(4) + ' ' + curCur.code;
          else if (kind === 'percent') disp = Number(v).toFixed(1) + ' %';
          else if (kind === 'duration') disp = Number(v).toFixed(2) + ' s';
          else if (kind === 'rate') disp = Math.round(Number(v)) + ' t/s';
          else if (kind === 'count') disp = Number(v).toLocaleString() + ' 次';
          else disp = Number(v).toLocaleString() + ' ' + (meta?.unit || '');
          html += `<div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;background:${p.color};border-radius:2px;"></span>${esc(p.seriesName)}<span style="margin-left:auto;font-weight:600;">${disp}</span></div>`;
        }
        return `<div style="padding:4px 2px;min-width:180px;">${html}</div>`;
      }
    },
    grid: { left: narrow ? 40 : 50, right: 12 + rightOffset, top: 8, bottom: 28 },
    dataZoom: needZoom ? [{ type:'inside', xAxisIndex:0, start: Math.max(0, (labels.length - maxLabels) / labels.length * 100), end: 100, zoomOnMouseWheel: false, moveOnMouseMove: true }] : undefined,
    xAxis: { type:'category', data: labels, axisLine:{lineStyle:{color:cBorder}}, axisLabel:{color:cText3,fontSize: 12,interval: xInterval,rotate: labels.length>12?30:0, hideOverlap: false} },
    yAxis: yAxis.length?yAxis:{ type:'value', axisLabel:{color:cText3,fontSize: 12} },
    series: seriesOpt,
  }, true);
  setTimeout(()=>{ try{ chart.resize(); }catch{} }, 60);
}

function renderModelSummary(filtered: any[]) {
  const doc = getDoc();
  const tbody = doc.getElementById('aus-summary-tbody');
  if (!tbody) return;
  lastSummaryFiltered = filtered;
  // 确保表头排序交互已绑定（面板创建后才有 DOM）
  try { bindSummarySort(); } catch {}
  try { updateSummarySortHeader(); } catch {}
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:16px;color:var(--ds-text-3);">暂无数据</td></tr>'; return; }
  const map: Record<string, { count: number; hit: number; miss: number; out: number; total: number; cost: number; dur: number; rate: number; rateCnt: number }> = {};
  for (const h of filtered) {
    const m = h.model || 'unknown';
    if (!map[m]) map[m] = { count: 0, hit: 0, miss: 0, out: 0, total: 0, cost: 0, dur: 0, rate: 0, rateCnt: 0 };
    const e = map[m]; e.count++; e.hit += h.cache_hit_tokens || 0; e.miss += h.cache_miss_tokens || 0; e.out += h.completion_tokens || 0; e.total += h.total_tokens || 0; e.cost += h.cost || 0;
    if (h.duration) { e.dur += h.duration; }
    if (h.tokenRate) { e.rate += h.tokenRate; e.rateCnt++; }
  }
  type Row = { m: string; count: number; hit: number; miss: number; out: number; total: number; cost: number; avgCost: number; avgDurVal: number; avgRateVal: number; avgDurStr: string; avgRateStr: string };
  let list: Row[] = Object.keys(map).map(m => {
    const e = map[m];
    const avgCost = e.count ? e.cost / e.count : 0;
    const avgDurVal = e.count && e.dur ? e.dur / e.count : -1;
    const avgDurStr = e.count && e.dur ? (e.dur / e.count / 1000).toFixed(1) + 's' : '—';
    const avgRateVal = e.rateCnt ? e.rate / e.rateCnt : -1;
    const avgRateStr = e.rateCnt ? Math.round(e.rate / e.rateCnt) + ' t/s' : '—';
    return { m, count: e.count, hit: e.hit, miss: e.miss, out: e.out, total: e.total, cost: e.cost, avgCost, avgDurVal, avgRateVal, avgDurStr, avgRateStr };
  });
  if (summarySortKey) {
    const dir = summarySortDir === 'asc' ? 1 : -1;
    const getVal = (r: Row): number => {
      switch (summarySortKey) {
        case 'count': return r.count;
        case 'hit': return r.hit;
        case 'miss': return r.miss;
        case 'out': return r.out;
        case 'total': return r.total;
        case 'cost': return r.cost;
        case 'avgCost': return r.avgCost;
        case 'avgDur': return r.avgDurVal;
        case 'avgRate': return r.avgRateVal;
        default: return 0;
      }
    };
    list.sort((a, b) => {
      const av = getVal(a), bv = getVal(b);
      if (av === bv) return a.m.localeCompare(b.m);
      return (av - bv) * dir;
    });
  } else {
    list.sort((a, b) => a.m.localeCompare(b.m));
  }
  const fmtC = (v:number)=>{ try{  return formatMoney(v||0,4);} catch{ return '¥'+(v||0).toFixed(4)+' CNY'; } };
  const rows = list.map(r => {
     return `<tr style="border-bottom:1px solid var(--ds-card);"><td style="padding:6px 8px;text-align:left;color:var(--ds-text);font-weight:500;max-width:140px;overflow:hidden;text-overflow:ellipsis;">${esc(r.m)}</td><td style="padding:6px 8px;text-align:right;">${r.count}</td><td style="padding:6px 8px;text-align:right;color:#0BA25E;">${r.hit.toLocaleString()}</td><td style="padding:6px 8px;text-align:right;color:#DC2626;">${r.miss.toLocaleString()}</td><td style="padding:6px 8px;text-align:right;color:#6366F1;">${r.out.toLocaleString()}</td><td style="padding:6px 8px;text-align:right;font-weight:600;">${r.total.toLocaleString()}</td><td style="padding:6px 8px;text-align:right;color:var(--ds-text);">${fmtC(r.cost)}</td><td style="padding:6px 8px;text-align:right;">${fmtC(r.avgCost)}</td><td style="padding:6px 8px;text-align:right;color:var(--ds-text-2);">${r.avgDurStr}</td><td style="padding:6px 8px;text-align:right;color:#0BA25E;">${r.avgRateStr}</td></tr>`;
  }).join('');
  tbody.innerHTML = rows;
}

let cachedAllHistory: any[] | null = null;
let allHistoryPromise: Promise<any[]> | null = null;
let statsHistoryWarningShown = false;

export function invalidateStatsCache() {
  cachedAllHistory = null;
  lastStatsHistory = [];
}
try {
  onDataEvent(DataEvents.HISTORY_ADDED, invalidateStatsCache);
  onDataEvent(DataEvents.UPDATED, invalidateStatsCache);
} catch {}

async function getHistoryForStats(): Promise<any[]> {
  const s: any = getSelectedSave();
  const hot: any[] = s?.history || [];
  if (cachedAllHistory) {
    const keyOf = historyRecordKey;
    const seen = new Set(cachedAllHistory.map(keyOf));
    const fresh = hot.filter((h: any) => !seen.has(keyOf(h)));
    if (fresh.length) cachedAllHistory = [...fresh, ...cachedAllHistory].sort((a: any,b: any)=> b.timestamp - a.timestamp);
    return cachedAllHistory;
  }
  if (allHistoryPromise) return allHistoryPromise;
  allHistoryPromise = (async () => {
    try {
      const mod: any = await import('../store/persistence');
      if (mod.getAllHistory) {
        const all = await mod.getAllHistory();
        const result = all || hot;
        cachedAllHistory = result;
        return result;
      }
    } catch (error) {
      if (!statsHistoryWarningShown) {
        statsHistoryWarningShown = true;
        toast('warning', '冷历史读取失败，当前统计可能只包含近期记录');
      }
      console.error('[Api-Usage] 全量历史读取失败', error);
    } finally {
      allHistoryPromise = null;
    }
    cachedAllHistory = hot;
    return hot;
  })();
  return allHistoryPromise;
}

export async function renderStatsView() {
  const doc = getDoc();
  const s: any = getSelectedSave();
  if (!s) return;
  const allHistory: any[] = await getHistoryForStats();
  lastStatsHistory = allHistory;
  const endpointOptions = getEndpointFilterOptions(allHistory);
  const validEndpoints = new Set([STATS_FILTER_ALL, ...endpointOptions.map((option) => option.id)]);
  if (!validEndpoints.has(selectedEndpoint)) {
    selectedEndpoint = STATS_FILTER_ALL;
    selectedCredential = STATS_FILTER_ALL;
  }
  const credentialOptions = getCredentialFilterOptions(allHistory, selectedEndpoint);
  const validCredentials = new Set([STATS_FILTER_ALL, ...credentialOptions.map((option) => option.id)]);
  if (!validCredentials.has(selectedCredential)) selectedCredential = STATS_FILTER_ALL;
  const summaryFiltered = filterStatsHistory(allHistory, currentStatsFilter());
  const chartFiltered = summaryFiltered;
  let totalCost = 0, totalReq = summaryFiltered.length, totalTok = 0;
  for (const e of summaryFiltered) { totalCost += e.cost || 0; totalTok += e.total_tokens || 0; }
  const costEl = doc.getElementById('aus-stats-cost');
  if (costEl) { try {  costEl.textContent = formatMoney(totalCost, 2); } catch { costEl.textContent = '¥' + totalCost.toFixed(2) + ' CNY'; } }
  const reqEl = doc.getElementById('aus-stats-req');
  if (reqEl) reqEl.textContent = String(totalReq);
  const tokEl = doc.getElementById('aus-stats-tok');
  if (tokEl) tokEl.textContent = totalTok.toLocaleString('zh-CN');
  renderStatsFour(summaryFiltered);
  renderModelSummary(summaryFiltered);
  renderModelPicker(allHistory);
  renderChatPicker(allHistory);
  renderEndpointPicker(allHistory);
  renderCredentialPicker(allHistory);
  renderChartSelectors();
  // 首次加载时统计页为 display:none，跳过图表渲染，等待 switchView 切到统计页时再渲染，避免 0 尺寸报错
  const statsViewEl = doc.querySelector('[data-view="stats"]') as HTMLElement | null;
  const isStatsHidden = statsViewEl ? (statsViewEl.style.display === 'none' || (statsViewEl as any).offsetParent === null) : false;
  if (!isStatsHidden) {
    renderChart(chartFiltered);
    renderExtraCharts(chartFiltered);
    renderModelTrends(chartFiltered);
  } else {
    try { const { log } = await import('../utils/logger'); log.debug('stats 隐藏，跳过图表初始化'); } catch {}
  }
}

// 统计页 4 小块（响应时间+模型双维度筛选）
import { saveHot } from '../store/persistence';
import { formatMoney, getDisplayCurrency } from '../services/currency';
function ensureStatsFour(): string[] {
  const def = ['avg_cost','avg_tokens','avg_think_ratio','truncation_rate'];
  let cur: any = (state.settings as any).statsFour;
  const valid = new Set(FOUR_OPTIONS.map(o=>o.key));
  if (!Array.isArray(cur) || cur.length !== 4 || cur.some((k:any)=> !valid.has(k))) {
    cur = def.slice();
    (state.settings as any).statsFour = cur;
    try { saveHot({ settings: state.settings }); } catch {}
    return cur as string[];
  }
  return cur as string[];
}
let statsFourBound = false;
function bindStatsFour() {
  if (statsFourBound) return;
  statsFourBound = true;
  const doc = getDoc();
  doc.addEventListener('click', (e:any)=>{
    const t = e.target as HTMLElement;
    for (let i=0;i<4;i++) {
      const drop = doc.getElementById(`aus-stats-four-drop-${i}`);
      const btn = doc.getElementById(`aus-stats-four-btn-${i}`);
      if (drop && btn && !t.closest(`#aus-stats-four-drop-${i}`) && !t.closest(`#aus-stats-four-btn-${i}`)) drop.style.display='none';
    }
  });
}
function openStatsFourDrop(idx:number, v:any) {
  const doc = getDoc();
  const drop = doc.getElementById(`aus-stats-four-drop-${idx}`) as HTMLElement | null;
  if (!drop) return;
  const curKeys = ensureStatsFour();
  const cur = curKeys[idx];
  drop.innerHTML = FOUR_OPTIONS.map(o=>{
    const active = o.key===cur;
    return `<div data-sfour="${idx}" data-key="${o.key}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-sm);${active?'background:var(--ds-card);font-weight:600;color:var(--ds-text);':''}">${o.label}</div>`;
  }).join('');
  drop.querySelectorAll('[data-sfour]').forEach((el:any)=>{
    el.onclick = () => {
      const key = el.getAttribute('data-key');
      const at = Number(el.getAttribute('data-sfour'));
      const arr = ensureStatsFour().slice();
      arr[at] = key as any;
      (state.settings as any).statsFour = arr;
      try { saveHot({ settings: state.settings }); } catch {}
      drop.style.display='none';
      renderStatsView();
    };
  });
  drop.style.display = drop.style.display==='block' ? 'none' : 'block';
}
export function renderStatsFour(filtered:any[]) {
  const doc = getDoc();
  const host = doc.getElementById('aus-stats-four');
  if (!host) return;
  const v = computeStatsFour(filtered || []);
  const keys = ensureStatsFour();
  bindStatsFour();
  host.innerHTML = keys.map((k,i)=>{
    const d = getFourDisplay(k as any, v as any);
    const isRate = k==='avg_rate';
    const valColor = isRate ? 'var(--ds-green)' : 'var(--ds-text)';
    return `<div class="ds-card" style="padding:14px;position:relative;overflow:visible;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
        <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.title}</div>
        <button id="aus-stats-four-btn-${i}" title="切换指标" style="flex-shrink:0;padding:4px 7px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text-2);font-size:var(--aus-fs-sm);cursor:pointer;line-height:1;">${icon('chevron-down', 14)}</button>
        <div id="aus-stats-four-drop-${i}" style="display:none;position:absolute;top:38px;right:8px;z-index:6;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:180px;max-height:260px;overflow:auto;"></div>
      </div>
      <div style="font-size:18px;font-weight:600;color:${valColor};margin-top:6px;word-break:break-all;">${d.html}</div>
    </div>`;
  }).join('');
  keys.forEach((_,i)=>{
    const btn = doc.getElementById(`aus-stats-four-btn-${i}`);
    if (btn) btn.onclick = () => openStatsFourDrop(i, v);
  });
}

export function initStatsView() {
  bindPicker();
  bindChartSelectors();
  try { bindSummarySort(); } catch {}
  try { initModelTrends(); } catch {}
  updatePickerLabel();
  renderStatsView();
}
