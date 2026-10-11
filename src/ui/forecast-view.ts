import { state } from '../store/index';
import { fitSegments, remainingRounds as calcR, ctxLimitRounds, costAt, nextPromptWithBand, ctxLimitForModel } from '../stats/forecast';
import { energyScore, topPowerChats } from '../stats/energyScore';
import { getPricing } from '../services/pricing';
import { esc } from '../utils/date';
import { formatMoney } from '../services/currency';
import { getWalletExchangeRate } from '../services/currency';
import { findWalletForHistory, findWalletModel, walletBalanceToCny } from '../data/wallets';

function getDoc(){ return (window.parent as any)?.document ?? document; }
function currentChatId(): string | null {
  try { const ctx:any=(globalThis as any).SillyTavern?.getContext?.(); return ctx?.getCurrentChatId?.()||null; } catch { return null; }
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

// 对话自选（与统计页统一胶囊 UI）
let selectedForecastKey: string = '__current__';
let forecastChatPickerOpen = false;

function getRecordedChatsForForecast(list: any[]): Array<{ chatId: string | null; chatName: string | null; displayName: string }> {
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

function getEffectiveHist(fullHist: any[]): any[] {
  if (selectedForecastKey === '__all__') return fullHist.slice();
  if (selectedForecastKey === '__current__') {
    const cur = currentChatId();
    if (!cur) return fullHist.slice();
    return fullHist.filter((h: any) => (h.chatId ?? null) === cur);
  }
  if (selectedForecastKey === '__null__') return fullHist.filter((h: any) => !h.chatId);
  return fullHist.filter((h: any) => (h.chatId ?? null) === selectedForecastKey);
}

function getForecastLabel(fullHist: any[]): string {
  if (selectedForecastKey === '__current__') return '当前对话';
  if (selectedForecastKey === '__all__') return '全部';
  if (selectedForecastKey === '__null__') return '未分组/旧数据';
  const found = getRecordedChatsForForecast(fullHist).find(c => (c.chatId ?? '__null__') === selectedForecastKey);
  return found?.displayName || selectedForecastKey;
}

function renderForecastChatPicker(fullHist: any[]) {
  const doc = getDoc();
  const btn = doc.getElementById('aus-forecast-chat-btn') as HTMLElement | null;
  const dropdown = doc.getElementById('aus-forecast-chat-dropdown') as HTMLElement | null;
  const label = doc.getElementById('aus-forecast-chat-label') as HTMLElement | null;
  if (!btn || !dropdown || !label) return;
  label.textContent = getForecastLabel(fullHist);
  const chats = getRecordedChatsForForecast(fullHist);
  let html = '';
  const curActive = selectedForecastKey === '__current__' ? 'background:var(--ds-card);font-weight:600;' : '';
  html += `<div data-fchat="__current__" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${curActive}">当前对话</div>`;
  const allActive = selectedForecastKey === '__all__' ? 'background:var(--ds-card);font-weight:600;' : '';
  html += `<div data-fchat="__all__" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${allActive}">全部</div>`;
  for (const c of chats) {
    const key = c.chatId ?? '__null__';
    const active = key === selectedForecastKey ? 'background:var(--ds-card);font-weight:600;' : '';
    html += `<div data-fchat="${esc(key)}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}" title="${esc(c.chatId || '')}">${esc(c.displayName)}</div>`;
  }
  if (!chats.length) html += '<div style="padding:8px 10px;color:var(--ds-text-3);font-size:var(--aus-fs-base);">暂无对话</div>';
  dropdown.innerHTML = html;
  dropdown.querySelectorAll('[data-fchat]').forEach((el: any) => {
    el.onclick = () => {
      selectedForecastKey = el.getAttribute('data-fchat') || '__current__';
      forecastChatPickerOpen = false;
      dropdown.style.display = 'none';
      renderForecastView();
    };
  });
}

function bindForecastChatPicker() {
  const doc = getDoc();
  const btn = doc.getElementById('aus-forecast-chat-btn') as HTMLElement | null;
  const dropdown = doc.getElementById('aus-forecast-chat-dropdown') as HTMLElement | null;
  if (!btn || !dropdown) return;
  if ((bindForecastChatPicker as any)._bound) return;
  (bindForecastChatPicker as any)._bound = true;
  btn.onclick = () => {
    forecastChatPickerOpen = !forecastChatPickerOpen;
    dropdown.style.display = forecastChatPickerOpen ? 'block' : 'none';
    if (forecastChatPickerOpen) {
      const hist: any[] = (state as any).history || [];
      renderForecastChatPicker(hist);
    }
  };
  doc.addEventListener('click', (e: any) => {
    const t = e.target as HTMLElement;
    if (forecastChatPickerOpen && !t.closest('#aus-forecast-chat-dropdown') && !t.closest('#aus-forecast-chat-btn')) {
      forecastChatPickerOpen = false;
      const d = doc.getElementById('aus-forecast-chat-dropdown') as HTMLElement | null;
      if (d) d.style.display = 'none';
    }
  });
}


let forecastRenderToken = 0;

export async function renderForecastView(): Promise<void> {
  const doc=getDoc();
  const token = ++forecastRenderToken;
  const hist:any[] = await import('../data/repository').then((mod) => mod.repository.getAllHistory()).catch(() => (state as any).history || []);
  if (token !== forecastRenderToken) return;
  try { renderForecastChatPicker(hist); } catch {}
  try { bindForecastChatPicker(); } catch {}
  const effectiveHist = getEffectiveHist(hist);
  // 预测卡（主页面与概览复用）— 基于自选对话的预测
  const renderCard = (host: HTMLElement | null) => {
    if (!host) return;
    if (effectiveHist.length < 3) {
      host.innerHTML = `<div style="text-align:center;padding:16px;color:var(--ds-text-3);font-size:var(--aus-fs-base);">继续对话以启用预测（需 ≥3 轮当前对话样本）</div>`;
      return;
    }
    const fit = fitSegments(effectiveHist, null);
    if (!fit) { host.innerHTML = `<div style="padding:12px;color:var(--ds-text-2);font-size:var(--aus-fs-base);">暂无数据</div>`; return; }
    const bal = balanceNum();
    const latestEntry = [...effectiveHist].sort((a: any, b: any) => a.timestamp - b.timestamp)[effectiveHist.length - 1];
    const model = latestEntry?.model || 'deepseek-v4-flash';
    const wallet = findWalletForHistory(state.wallets, latestEntry || {});
    const walletModel = findWalletModel(wallet, model);
    const pricing = getPricing(model, state.settings as any, wallet);
    const p = pricing.offpeak;
    const R = bal!=null? calcR(bal, fit, p): { R:0, R_low:0, R_high:0 };
    const ctxLim = ctxLimitForModel(model, walletModel?.contextLimit);
    const rCtx = ctxLim != null ? ctxLimitRounds(fit, ctxLim) : null;
    const rShow = rCtx!=null? Math.min(R.R, rCtx): R.R;
    const next = nextPromptWithBand(fit);
    const hitPct = (fit.hitEwma*100).toFixed(1);
    const deltaTok = Math.round(fit.delta);
    const cNext = costAt(fit.segLen, fit, p);
    host.innerHTML = `<div style="line-height:1.6;">
      <div style="font-size:var(--aus-fs-base);font-weight:700;color:var(--ds-text);">预计还可 <span style="color:var(--ds-green);">~${rShow} 轮</span>（余额口径）· ±${Math.abs(R.R_high-R.R_low)/2|0}</div>
      <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:4px;">每轮新增 ≈ ${deltaTok.toLocaleString()} tok · 命中率(近5) ${hitPct}% · 下一轮成本 ≈ ${(()=>{ try{  return formatMoney(cNext,4);} catch{ return '¥'+cNext.toFixed(4)+' CNY';}})()} · 下一轮 prompt ≈ ${Math.round(next.prompt).toLocaleString()} tok</div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <div style="flex:1;background:var(--ds-card);border-radius:6px;height:8px;position:relative;overflow:hidden;"><div style="position:absolute;left:0;top:0;bottom:0;width:${Math.min(100,(R.R/ Math.max(10,R.R+(rCtx||0)))*100)}%;background:var(--ds-green);"></div></div>
        <div style="flex:1;background:var(--ds-card);border-radius:6px;height:8px;position:relative;overflow:hidden;"><div style="position:absolute;left:0;top:0;bottom:0;width:${rCtx!=null?Math.min(100,(rCtx/ Math.max(10,rCtx))*100):0}%;background:${(rCtx!=null&&rCtx<rShow)?'var(--ds-red)':'var(--ds-purple-bg)'};"></div></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:4px;"><span>R(余额) ${R.R}</span><span>R(ctx ${ctxLim != null ? `${(ctxLim / 1000) | 0}k` : '未知'}) ${rCtx ?? '—'}</span></div>
      ${rCtx!=null && rCtx<rShow ? `<div style="font-size:var(--aus-fs-sm);color:var(--ds-red);margin-top:6px;">⚠ ${rCtx} 轮后 prompt 达上限 ${ctxLim?.toLocaleString()} tok，建议压缩上下文</div>` : ''}
    </div>`;
  };
  renderCard(doc.getElementById('aus-forecast-card'));
  // 能耗标识 — 随自选对话联动
  const badgeHost = doc.getElementById('aus-energy-badge');
  if (badgeHost) {
    const r = energyScore(effectiveHist, null);
    const grade = r.grade;
    const colors: Record<string,string> = { A:'#16a34a', B:'#22c55e', C:'#84cc16', D:'#eab308', E:'#f97316', F:'#ef4444', G:'#dc2626' };
    const grades: string[] = ['A','B','C','D','E','F','G'];
    const idx = grades.indexOf(grade);
    badgeHost.innerHTML = `<div style="display:flex;gap:12px;align-items:center;justify-content:flex-start;">
      <div style="display:flex;flex-direction:column;gap:2px;flex:none;">
        ${grades.map((g,i)=>`<div style="display:flex;align-items:center;gap:6px;"><span style="width:28px;height:22px;border-radius:4px;background:${colors[g]};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--aus-fs-base);">${g}</span>${i===idx?`<span style="color:${colors[g]};font-weight:700;">◀ 当前</span>`:''}</div>`).join('')}
      </div>
        <div style="flex:0 1 300px;min-width:210px;max-width:340px;display:grid;gap:6px;font-size:var(--aus-fs-sm);">
        <div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:var(--ds-text-2);">增速 Δ</span><span style="font-weight:600;white-space:nowrap;">${Math.round(r.metrics.delta).toLocaleString()} tok/轮</span></div>
        <div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:var(--ds-text-2);">输出</span><span style="font-weight:600;white-space:nowrap;">${Math.round(r.metrics.out).toLocaleString()} tok/轮</span></div>
        <div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:var(--ds-text-2);">效率</span><span style="font-weight:600;white-space:nowrap;">${(r.metrics.efficiency*100).toFixed(1)}%</span></div>
        <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:4px;">综合评分 ${r.score.toFixed(0)} · ${grade} 级 · 样本 ${effectiveHist.length} 轮 · ${esc(getForecastLabel(hist))}</div>
      </div>
    </div>`;
  }
  // 预测图 — 随自选对话
  renderForecastChart(effectiveHist, null);
  // 敏感度滑块 — 随自选对话
  renderSensitivity(effectiveHist, null);
  // 对比视图
  renderCompare(hist);
}

let forecastChart:any=null;
async function renderForecastChart(history:any[], chatId:string|null){
  const doc=getDoc();
  const el=doc.getElementById('aus-forecast-chart') as HTMLElement|null;
  if (!el) return;
  if (!history.length) { el.innerHTML='<div style="text-align:center;padding:40px;color:var(--ds-text-3);">暂无数据</div>'; return; }
  const fit = fitSegments(history, chatId);
  if (!fit || fit.segLen<1) { el.innerHTML='<div style="text-align:center;padding:40px;color:var(--ds-text-3);">样本不足</div>'; return; }
  const sorted = (chatId ? [...history].filter(h=> (h.chatId??null)===chatId) : [...history]).sort((a,b)=>a.timestamp-b.timestamp);
  const y = sorted.map((h:any)=> h.prompt_tokens ?? (h.cache_hit_tokens||0)+(h.cache_miss_tokens||0));
  // 历史拟合段
  const fitLine = y.map((_,i)=> fit.C0 + fit.delta * ((fit.segStart + i)>=sorted.length - fit.segLen ? ((fit.segStart + i)- (sorted.length-fit.segLen)) : 0));
  // 预测 10 轮
  const futureN=10;
  const pred:any[]=[], low:any[]=[], high:any[]=[];
  for(let k=1;k<=futureN;k++){ const n=fit.segLen + k -1; const p=fit.C0+fit.delta*n; pred.push(p); low.push(Math.max(0,p-fit.sigma)); high.push(p+fit.sigma); }
  const labels = sorted.map((_,i)=>`#${i+1}`).concat(Array.from({length:futureN},(_,i)=>`+${i+1}`));
  const histData = y.concat(Array(futureN).fill(null));
  const predData = Array(y.length).fill(null).concat(pred);
  const lowData = Array(y.length).fill(null).concat(low);
  const highData = Array(y.length).fill(null).concat(high);
  const latestModel = sorted[sorted.length-1];
  const latestWallet = findWalletForHistory(state.wallets, latestModel || {});
  const ctxLim = ctxLimitForModel(latestModel?.model || 'deepseek-v4-flash', findWalletModel(latestWallet, latestModel?.model || '')?.contextLimit);
  // echarts
  const ec:any = await import('echarts/core');
  const { LineChart } = await import('echarts/charts');
  const { GridComponent, TooltipComponent } = await import('echarts/components');
  const { CanvasRenderer } = await import('echarts/renderers');
  ec.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);
  if (forecastChart) try{ forecastChart.dispose(); }catch{}
  el.innerHTML=''; (el as any).style.height='260px';
  forecastChart = ec.init(el);
  const cText3 = getComputedStyle(doc.getElementById('aus-panel')||doc.documentElement).getPropertyValue('--ds-text-3') || '#9CA3AF';
  const cBorder = getComputedStyle(doc.getElementById('aus-panel')||doc.documentElement).getPropertyValue('--ds-border') || '#E5E7EB';
  forecastChart.setOption({
    backgroundColor:'transparent',
    tooltip:{ trigger:'axis' },
    grid:{ left:48, right:16, top:16, bottom:24 },
    xAxis:{ type:'category', data:labels, axisLine:{lineStyle:{color:cBorder}}, axisLabel:{color:cText3,fontSize: 12, interval: Math.ceil(labels.length/12)-1} },
    yAxis:{ type:'value', axisLabel:{color:cText3,fontSize: 12}, splitLine:{lineStyle:{color:cBorder}} },
    series:[
      { name:'历史 prompt', type:'line', data:histData, smooth:true, symbol:'circle', symbolSize:3, lineStyle:{width:1.5}, itemStyle:{color:'#6366F1'} },
      { name:'拟合', type:'line', data:fitLine.concat(Array(futureN).fill(null)), lineStyle:{type:'dashed',width:1.5,color:'#9CA3AF'}, symbol:'none' },
      { name:'预测', type:'line', data:predData, lineStyle:{width:1.8,color:'#0BA25E'}, symbol:'none' },
      { name:'置信下', type:'line', data:lowData, lineStyle:{width:0}, symbol:'none', areaStyle:{color:'rgba(16,185,129,0.12)'} },
      { name:'置信上', type:'line', data:highData, lineStyle:{width:0}, symbol:'none' },
      ...(ctxLim != null ? [{ type:'line', data:Array(labels.length).fill(ctxLim), lineStyle:{type:'dashed',color:'#ef4444'}, symbol:'none', markLine:{ data:[{ yAxis: ctxLim }] } }] : [])
    ]
  }, true);
}

function renderSensitivity(history:any[], chatId:string|null){
  const host=getDoc().getElementById('aus-forecast-sensitivity');
  if (!host) return;
  const hitInit = (()=>{ const fit=fitSegments(history,chatId); return fit? Math.round(fit.hitEwma*100): 50; })();
  host.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);">假设命中率</span><input id="aus-sens-hit" type="range" min="0" max="100" value="${hitInit}" style="flex:1;"><span id="aus-sens-hit-val" style="font-weight:600;min-width:36px;text-align:right;">${hitInit}%</span></div><div id="aus-sens-result" style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:6px;"></div>`;
  const slider = host.querySelector('#aus-sens-hit') as HTMLInputElement;
  const valEl = host.querySelector('#aus-sens-hit-val') as HTMLElement;
  const resEl = host.querySelector('#aus-sens-result') as HTMLElement;
  const update = ()=>{
    const h = Number(slider.value)/100;
    if (valEl) valEl.textContent = slider.value+'%';
    const fit = fitSegments(history,chatId);
    if (!fit) { if(resEl) resEl.textContent='样本不足'; return; }
    const bal=balanceNum();
    if (bal==null){ if(resEl) resEl.textContent='未设置余额，无法估算剩余轮数'; return; }
    // 临时覆盖 hit
    const tmp={...fit, hitEwma:h} as any;
    const scoped = chatId ? history.filter((hh:any)=>(hh.chatId??null)===chatId) : history;
    const latestEntry = [...scoped].sort((a: any, b: any) => a.timestamp - b.timestamp).slice(-1)[0];
    const model = latestEntry?.model || 'deepseek-v4-flash';
    const pricing = getPricing(model, state.settings as any, findWalletForHistory(state.wallets, latestEntry || {}));
    const R = calcR(bal, tmp, pricing.offpeak);
    if(resEl) resEl.textContent = `命中 ${slider.value}% 时预计剩余 ${R.R} 轮（±${Math.abs(R.R_high-R.R_low)/2|0}），降 10% 约少 ${Math.abs(R.R - calcR(bal,{...fit,hitEwma:Math.max(0,h-0.1)} as any,pricing.offpeak).R)} 轮`;
  };
  if (slider) slider.oninput = update;
  update();
}

function renderCompare(history:any[]){
  const host=getDoc().getElementById('aus-forecast-compare');
  if (!host) return;
  const list = topPowerChats(history, 8);
  if (!list.length) { host.innerHTML = `<div style="padding:12px;color:var(--ds-text-3);font-size:var(--aus-fs-sm);">暂无对话</div>`; return; }
  host.innerHTML = list.map(r=>{
    const name = r.chatId || '全部/未分组';
    const pct = Math.max(6, Math.min(100, (r.delta/8000)*100));
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--ds-border);font-size:var(--aus-fs-sm);">
      <span style="min-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(name)}</span>
      <span style="width:18px;height:18px;border-radius:999px;background:${gradeColor(r.grade)};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--aus-fs-sm);">${r.grade}</span>
      <span style="flex:1;height:6px;background:var(--ds-card);border-radius:999px;position:relative;overflow:hidden;"><span style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:var(--ds-purple-bg);"></span></span>
      <span style="min-width:60px;text-align:right;">${Math.round(r.delta).toLocaleString()} tok/轮</span>
    </div>`;
  }).join('');
  function gradeColor(g:string){ const m:any={A:'#16a34a',B:'#22c55e',C:'#84cc16',D:'#eab308',E:'#f97316',F:'#ef4444',G:'#dc2626'}; return m[g]||'#9CA3AF'; }
}

export function initForecastView(){
  const doc=getDoc();
  doc.addEventListener('click', (e:any)=>{
    // 预测页内交互已在 render 中绑定
  });
}
