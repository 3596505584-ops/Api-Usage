import { icon } from './icons';
import { computeOverview, computeChatStats } from '../data/computed';
import { renderHeatmap } from './heatmap';
import { state } from '../store/index';
import { saveHot } from '../store/persistence';
import { esc } from '../utils/date';
import type { OverviewFourKey } from '../types/settings';
import { formatMoney, getDisplayCurrency } from '../services/currency';
import { repository } from '../data/repository';

function getDoc(): Document {
  return (window.parent as any)?.document ?? document;
}

function fmt(n: number) { return n.toLocaleString('zh-CN'); }
function CNY(n: number) {
  try {  return formatMoney(n, 4); } catch { return '¥' + n.toFixed(4) + ' CNY'; }
}
function moneyHtml(cny: number, digits = 4): string {
  try {
    
    const cur: any = getDisplayCurrency();
    const v = cur.code === 'USD' ? cny / cur.rate : cny;
    return `${cur.symbol}${v.toFixed(digits)} <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">${cur.code}</span>`;
  } catch { return `¥${(cny||0).toFixed(digits)} <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">CNY</span>`; }
}

type FourOpt = { key: OverviewFourKey; label: string };
export const FOUR_OPTIONS: FourOpt[] = [
  { key: 'avg_cost', label: '每轮费用' },
  { key: 'avg_tokens', label: '每轮 Token' },
  { key: 'avg_duration', label: '平均耗时' },
  { key: 'avg_ttft', label: '平均首字延迟' },
  { key: 'avg_rate', label: '输出速率' },
  { key: 'avg_input_cost', label: '每轮平均输入费用' },
  { key: 'avg_input_tokens', label: '每轮平均输入 Token' },
  { key: 'avg_output_cost', label: '每轮平均输出费用' },
  { key: 'avg_output_tokens', label: '每轮平均输出 Token' },
  { key: 'avg_think_time', label: '思维链平均耗时' },
  { key: 'avg_think_tokens', label: '思维链平均 Token' },
  { key: 'avg_hit_rate', label: '平均缓存命中率' },
  { key: 'latest_hit_rate', label: '最新命中率' },
  { key: 'max_output', label: '单轮最大输出' },
  { key: 'max_input', label: '单轮最大输入' },
  { key: 'max_total', label: '单轮最大总 Token' },
  { key: 'avg_think_ratio', label: '思维链占比' },
  { key: 'truncation_rate', label: '截断率' },
];
const FOUR_LABEL_MAP = new Map<string,string>(FOUR_OPTIONS.map(o=>[o.key,o.label]));

function ensureFour(): OverviewFourKey[] {
  let cur: any = (state.settings as any).overviewFour;
  const valid = new Set(FOUR_OPTIONS.map(o=>o.key));
  const defaults: OverviewFourKey[] = ['avg_cost','avg_tokens','avg_duration','avg_rate','avg_input_tokens','avg_output_tokens','avg_hit_rate','max_total'];
  if (!Array.isArray(cur) || cur.some((k:any)=>!valid.has(k))) {
    cur = defaults.slice();
    (state.settings as any).overviewFour = cur;
    try { saveHot({ settings: state.settings }); } catch {}
    return cur as OverviewFourKey[];
  }
  if (cur.length === 4) {
    // 旧4块迁移至8块：保留原4，补齐后4默认
    cur = [...cur, ...defaults.slice(4)] as OverviewFourKey[];
    (state.settings as any).overviewFour = cur;
    try { saveHot({ settings: state.settings }); } catch {}
  }
  if (cur.length !== 8) {
    cur = defaults.slice();
    (state.settings as any).overviewFour = cur;
    try { saveHot({ settings: state.settings }); } catch {}
  }
  return cur as OverviewFourKey[];
}

export function getFourDisplay(key: OverviewFourKey, v: any): { title:string; html:string } {
  const title = FOUR_LABEL_MAP.get(key) || key;
  switch (key) {
    case 'avg_cost': return { title, html: moneyHtml(v.avgCost||0, 4) };
    case 'avg_tokens': return { title, html: `${Math.round(v.avgTokens||0).toLocaleString('zh-CN')}` };
    case 'avg_duration': return { title, html: `${(v.avgDuration||0).toFixed(1)} <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">s</span>` };
    case 'avg_ttft': {
      const has = (v.avgTtft||0) > 0;
      return { title, html: has ? `${(v.avgTtft).toFixed(1)} <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">s</span>` : `<span style="color:var(--ds-text-3);">—</span>` };
    }
    case 'avg_rate': {
      const has = (v.avgRate||0) > 0;
      return { title, html: has ? `${Math.round(v.avgRate)} <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">t/s</span>` : `<span style="color:var(--ds-text-3);">—</span>` };
    }
    case 'avg_input_cost': return { title, html: moneyHtml(v.avgInputCost||0, 4) };
    case 'avg_input_tokens': return { title, html: `${Math.round(v.avgInputTokens||0).toLocaleString('zh-CN')}` };
    case 'avg_output_cost': return { title, html: moneyHtml(v.avgOutputCost||0, 4) };
    case 'avg_output_tokens': return { title, html: `${Math.round(v.avgOutputTokens||0).toLocaleString('zh-CN')}` };
    case 'avg_think_time': {
      const has = (v.avgThinkTime||0) > 0;
      return { title, html: has ? `${(v.avgThinkTime).toFixed(1)} <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">s</span>` : `<span style="color:var(--ds-text-3);">—</span>` };
    }
    case 'avg_think_tokens': {
      const has = (v.avgThinkTokens||0) > 0;
      return { title, html: has ? `${Math.round(v.avgThinkTokens).toLocaleString('zh-CN')}` : `<span style="color:var(--ds-text-3);">—</span>` };
    }
    case 'avg_hit_rate': {
      const has = (v.avgHitRate||0) > 0;
      return { title, html: has ? `${(v.avgHitRate).toFixed(1)}<span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">%</span>` : `<span style="color:var(--ds-text-3);">—</span>` };
    }
    case 'latest_hit_rate': {
      const val = v.latestHitRate;
      if (val == null) return { title, html: `<span style="color:var(--ds-text-3);">—</span>` };
      return { title, html: `${val.toFixed(1)}<span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">%</span>` };
    }
    case 'max_output': return { title, html: `${(v.maxOutput||0).toLocaleString('zh-CN')}` };
    case 'max_input': return { title, html: `${(v.maxInput||0).toLocaleString('zh-CN')}` };
    case 'max_total': return { title, html: `${(v.maxTotal||0).toLocaleString('zh-CN')}` };
    case 'avg_think_ratio': {
      const has = (v.avgThinkRatio||0) > 0 || (v.rounds||0) > 0;
      const val = v.avgThinkRatio||0;
      return { title, html: has && val>0 ? `${val.toFixed(1)}<span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">%</span>` : `<span style="color:var(--ds-text-3);">—</span>` };
    }
    case 'truncation_rate': {
      const has = (v.rounds||0) > 0;
      const val = v.truncationRate||0;
      return { title, html: has ? `${val.toFixed(1)}<span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">%</span>` : `<span style="color:var(--ds-text-3);">—</span>` };
    }
    default: return { title, html: '—' };
  }
}

let fourBound = false;
let overviewWalletBound = false;
let overviewWalletViewportBound = false;
let overviewAsyncToken = 0;

function closeOverviewWalletDropdown(): void {
  const dropdown = getDoc().getElementById('aus-overview-wallet-dropdown') as HTMLElement | null;
  if (dropdown) dropdown.style.display = 'none';
}

function bindOverviewWalletViewport(): void {
  if (overviewWalletViewportBound) return;
  overviewWalletViewportBound = true;
  try { ((window.parent as any) || window).addEventListener('resize', closeOverviewWalletDropdown, { passive: true } as any); } catch {}
  try { window.addEventListener('resize', closeOverviewWalletDropdown, { passive: true } as any); } catch {}
  try { getDoc().getElementById('aus-main')?.addEventListener('scroll', closeOverviewWalletDropdown, { passive: true } as any); } catch {}
}

function positionOverviewWalletDropdown(btn: HTMLElement, dropdown: HTMLElement): void {
  try {
    const panel = getDoc().getElementById('aus-panel') as HTMLElement | null;
    const panelRect = panel?.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const viewportWidth = ((window.parent as any)?.innerWidth ?? window.innerWidth);
    const viewportHeight = ((window.parent as any)?.innerHeight ?? window.innerHeight);
    const available = Math.max(180, Math.min(280, viewportWidth - 16));
    dropdown.style.position = 'fixed';
    dropdown.style.width = `${available}px`;
    dropdown.style.minWidth = '0';
    dropdown.style.maxWidth = `${viewportWidth - 16}px`;
    dropdown.style.maxHeight = `${Math.max(120, viewportHeight - 24)}px`;
    const left = Math.max(8, Math.min(btnRect.right - available, viewportWidth - available - 8));
    const estimatedHeight = Math.min(dropdown.scrollHeight || 220, viewportHeight - 24);
    const openUp = btnRect.bottom + 6 + estimatedHeight > viewportHeight - 8;
    const top = openUp
      ? Math.max(8, btnRect.top - estimatedHeight - 6)
      : btnRect.bottom + 6;
    dropdown.style.top = `${Math.round(top)}px`;
    dropdown.style.left = `${Math.round(left)}px`;
    dropdown.style.right = 'auto';
    dropdown.style.zIndex = '100500';
    if (panelRect) {
      dropdown.style.pointerEvents = 'auto';
    }
  } catch {}
}
function bindFour() {
  if (fourBound) return;
  fourBound = true;
  const doc = (window.parent as any)?.document ?? document;
  doc.addEventListener('click', (e: any) => {
    const t = e.target as HTMLElement;
    for (let i=0;i<8;i++) {
      const drop = doc.getElementById(`aus-four-drop-${i}`);
      const btn = doc.getElementById(`aus-four-btn-${i}`);
      if (drop && btn && !t.closest(`#aus-four-drop-${i}`) && !t.closest(`#aus-four-btn-${i}`)) drop.style.display='none';
    }
  });
}

function openFourDrop(idx:number, v:any) {
  const doc = (window.parent as any)?.document ?? document;
  const drop = doc.getElementById(`aus-four-drop-${idx}`) as HTMLElement | null;
  if (!drop) return;
  const curKeys = ensureFour();
  const cur = curKeys[idx];
  drop.innerHTML = FOUR_OPTIONS.map(o=>{
    const active = o.key===cur;
    return `<div data-four="${idx}" data-key="${o.key}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-sm);${active?'background:var(--ds-card);font-weight:600;color:var(--ds-text);':''}">${o.label}</div>`;
  }).join('');
  drop.querySelectorAll('[data-four]').forEach((el:any)=>{
    el.onclick = () => {
      const key = el.getAttribute('data-key') as OverviewFourKey;
      const at = Number(el.getAttribute('data-four'));
      const arr = ensureFour().slice() as OverviewFourKey[];
      arr[at] = key;
      (state.settings as any).overviewFour = arr;
      try { saveHot({ settings: state.settings }); } catch {}
      drop.style.display='none';
      renderOverview();
    };
  });
  drop.style.display = drop.style.display==='block' ? 'none' : 'block';
}

export function renderOverview(fullHistory?: any[]) {
  const doc = (window.parent as any)?.document ?? document;
  const ignored = new Set(repository.getIgnoredWalletIds());
  const wallets = repository.getWallets().filter((wallet) => !ignored.has(wallet.id));
  const selectedWalletId = String((state.settings as any).overviewWalletId || 'all');
  const activeWalletId = selectedWalletId !== 'all' && wallets.some((wallet) => wallet.id === selectedWalletId)
    ? selectedWalletId
    : 'all';
  const v = computeOverview(activeWalletId, fullHistory);
  const walletBtn = doc.getElementById('aus-overview-wallet-btn');
  const walletLabel = doc.getElementById('aus-overview-wallet-label');
  const walletDrop = doc.getElementById('aus-overview-wallet-dropdown') as HTMLElement | null;
  if (walletLabel) {
    walletLabel.textContent = activeWalletId === 'all'
      ? '全部钱包合计'
      : wallets.find((wallet) => wallet.id === activeWalletId)?.name || '全部钱包合计';
  }
  if (walletDrop) {
    const item = (id: string, label: string) => {
      const active = id === activeWalletId;
      return `<div data-overview-wallet="${esc(id)}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-sm);${active ? 'background:var(--ds-card);font-weight:600;' : ''}">${esc(label)}</div>`;
    };
    walletDrop.innerHTML = item('all', '全部钱包合计') + wallets.map((wallet) => item(wallet.id, wallet.name)).join('');
    walletDrop.querySelectorAll('[data-overview-wallet]').forEach((el: any) => {
      el.onclick = () => {
        (state.settings as any).overviewWalletId = el.getAttribute('data-overview-wallet') || 'all';
        (state.settings as any).overviewWalletManuallySet = true;
        try { saveHot({ settings: state.settings }); } catch {}
        walletDrop.style.display = 'none';
        renderOverview();
      };
    });
  }
  if (walletBtn && walletDrop) {
    walletBtn.onclick = (event: Event) => {
      event.stopPropagation();
      const open = walletDrop.style.display !== 'block';
      walletDrop.style.display = open ? 'block' : 'none';
      if (open) {
        bindOverviewWalletViewport();
        positionOverviewWalletDropdown(walletBtn as HTMLElement, walletDrop);
      }
    };
  }
  if (!overviewWalletBound) {
    overviewWalletBound = true;
    doc.addEventListener('click', (event: any) => {
      const target = event.target as HTMLElement;
      const drop = doc.getElementById('aus-overview-wallet-dropdown') as HTMLElement | null;
      if (drop && !target?.closest?.('#aus-overview-wallet-dropdown') && !target?.closest?.('#aus-overview-wallet-btn')) {
        drop.style.display = 'none';
      }
    });
  }

  const balEl = doc.getElementById('aus-balance');
  if (balEl) balEl.textContent = v.balanceText;
  const remEl = doc.getElementById('aus-balance-remaining');
  if (remEl) {
    if (v.remainingRounds != null) remEl.textContent = '预计还可进行 ' + v.remainingRounds.toLocaleString('zh-CN') + ' 轮对话';
    else {
      remEl.textContent = v.hasBalance ? '暂无可用于预测的费用记录' : '设置钱包余额后可预测剩余轮次';
    }
  }
  const costEl = doc.getElementById('aus-total-cost');
  if (costEl) {
    try {  costEl.textContent = formatMoney(v.totalCost, 4); } catch { costEl.textContent = '¥' + v.totalCost.toFixed(4) + ' CNY'; }
  }
  const tokEl = doc.getElementById('aus-total-tokens');
  if (tokEl) tokEl.textContent = fmt(v.totalTokens) + ' tokens';

  const histHost = doc.getElementById('aus-overview-history');
  if (histHost) {
    histHost.innerHTML = `
      <div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);margin-bottom:8px;">历史消耗</div>
      <div style="display:grid;gap:10px;font-size:var(--aus-fs-sm);">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;"><span style="color:var(--ds-text-2);">Token 历史消耗</span><span style="font-weight:600;color:var(--ds-text);">${fmt(v.totalTokens)} tokens</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;"><span style="color:var(--ds-text-2);">输入（命中缓存）</span><span style="font-weight:600;color:var(--ds-green);">${fmt(v.hit)} tokens</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;"><span style="color:var(--ds-text-2);">输入（未命中缓存）</span><span style="font-weight:600;color:var(--ds-red);">${fmt(v.miss)} tokens</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;"><span style="color:var(--ds-text-2);">输出</span><span style="font-weight:600;color:var(--ds-text);">${fmt(v.output)} tokens</span></div>
      </div>
    `;
  }

  const spendHost = doc.getElementById('aus-overview-spend');
  if (spendHost) {
    spendHost.innerHTML = `
      <div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);margin-bottom:8px;">支出明细</div>
      <div style="display:grid;gap:10px;font-size:var(--aus-fs-sm);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;"><span style="color:var(--ds-text-2);padding-top:2px;">预计节省</span><span style="text-align:right;"><div style="font-weight:600;color:var(--ds-green);">${CNY(v.savings)}</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:1px;">${fmt(v.hit)} tokens</div></span></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;"><span style="color:var(--ds-text-2);padding-top:2px;">支出在输入</span><span style="text-align:right;"><div style="font-weight:600;color:var(--ds-text);">${CNY(v.inputCost)}</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:1px;">${fmt(v.hit + v.miss)} tokens</div></span></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;"><span style="color:var(--ds-text-2);padding-top:2px;">支出在输出</span><span style="text-align:right;"><div style="font-weight:600;color:var(--ds-text);">${CNY(v.outputCost)}</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:1px;">${fmt(v.output)} tokens</div></span></div>
      </div>
    `;
  }

  const fourHost = doc.getElementById('aus-overview-four');
  if (fourHost) {
    const keys = ensureFour();
    bindFour();
    fourHost.innerHTML = keys.map((k,i)=>{
      const d = getFourDisplay(k, v);
      const isRate = k==='avg_rate';
      const valColor = isRate ? 'var(--ds-green)' : 'var(--ds-text)';
      return `<div class="ds-card" style="padding:14px;position:relative;overflow:visible;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
          <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.title}</div>
          <button id="aus-four-btn-${i}" title="切换指标" style="flex-shrink:0;padding:4px 7px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text-2);font-size:var(--aus-fs-sm);cursor:pointer;line-height:1;">${icon('chevron-down', 14)}</button>
          <div id="aus-four-drop-${i}" style="display:none;position:absolute;top:38px;right:8px;z-index:6;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:180px;max-height:260px;overflow:auto;"></div>
        </div>
        <div style="font-size:18px;font-weight:600;color:${valColor};margin-top:6px;word-break:break-all;">${d.html}</div>
      </div>`;
    }).join('');
    keys.forEach((_,i)=>{
      const btn = doc.getElementById(`aus-four-btn-${i}`);
      if (btn) btn.onclick = () => openFourDrop(i, v);
    });
  }

  // 热力图：用量概览页展示全部历史的 token 分布（近 2 年，占满右侧）
  try {
    const hist: any[] = fullHistory || (state.history || []) as any[];
    renderHeatmap(hist);
  } catch {}
  // 按对话统计列表（热力图下方，类似趋势预测·对比 Top，全量历史聚合，数据走 computed 唯一算入口）
  try { renderChatSummaryOverview(fullHistory); } catch {}
  if (!fullHistory) {
    const token = ++overviewAsyncToken;
    repository.getAllHistory().then((all) => {
      if (token === overviewAsyncToken && all?.length) renderOverview(all);
    }).catch(() => {});
  }
}

function renderChatSummaryOverview(fullHistory?: any[]) {
  const doc = (window.parent as any)?.document ?? document;
  const tbody = doc.getElementById('aus-chat-summary-tbody') as HTMLElement | null;
  const card = doc.getElementById('aus-chat-summary-overview') as HTMLElement | null;
  if (!card) return;
  if (!tbody) return;
  const renderRows = (rows: ReturnType<typeof computeChatStats>) => {
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:16px;color:var(--ds-text-3);">暂无数据</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const avgRate = r.avgHitRate > 0 ? r.avgHitRate.toFixed(1) + '%' : '—';
      const colorRate = r.avgHitRate >= 50 ? 'var(--ds-green)' : r.avgHitRate > 0 ? 'var(--ds-text)' : 'var(--ds-text-3)';
      let costTxt = `¥${r.cost.toFixed(4)}`;
      try {  costTxt = formatMoney(r.cost, 4); } catch {}
      return `<tr style="border-bottom:1px solid var(--ds-card);">
        <td style="padding:6px 8px;text-align:left;color:var(--ds-text);font-weight:500;max-width:160px;overflow:hidden;text-overflow:ellipsis;" title="${esc(r.chatId || 'null')}">${esc(r.displayName)}</td>
        <td style="padding:6px 8px;text-align:right;">${r.count}</td>
        <td style="padding:6px 8px;text-align:right;color:#0BA25E;">${r.hit.toLocaleString('zh-CN')}</td>
        <td style="padding:6px 8px;text-align:right;color:#DC2626;">${r.miss.toLocaleString('zh-CN')}</td>
        <td style="padding:6px 8px;text-align:right;color:#6366F1;">${r.out.toLocaleString('zh-CN')}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:600;">${r.total.toLocaleString('zh-CN')}</td>
        <td style="padding:6px 8px;text-align:right;color:var(--ds-text);">${costTxt}</td>
        <td style="padding:6px 8px;text-align:right;">${Math.round(r.avgTokens).toLocaleString('zh-CN')}</td>
        <td style="padding:6px 8px;text-align:right;color:${colorRate};">${avgRate}</td>
      </tr>`;
    }).join('');
  };
  const hotRows = computeChatStats(fullHistory);
  renderRows(hotRows);
  if (fullHistory) return;
  // 若存在冷存储全量（IndexedDB），异步补全以确保按对话统计完整（hot 仅 50 条）
  (async () => {
    try {
      const mod: any = await import('../store/persistence');
      if (!mod.getAllHistory) return;
      const all: any[] = await mod.getAllHistory();
      if (!all || all.length <= (state.history?.length || 0)) return;
      const fullRows = computeChatStats(all);
      // 避免无变化时重复渲染
      if (fullRows.length !== hotRows.length || fullRows.some((r, i) => r.total !== hotRows[i]?.total)) {
        renderRows(fullRows);
      }
    } catch {}
  })();
}
