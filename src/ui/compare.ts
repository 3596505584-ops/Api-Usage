import { getSelectedSave } from '../store/index';
import { esc } from '../utils/date';
import { formatMoney, getDisplayCurrency } from '../services/currency';
import { icon } from './icons';

let selOld: number | null = null;
let selNew: number | null = null;

function getDoc(): Document { return (window.parent as any)?.document ?? document; }

function diffMessages(oldMsgs: any[], newMsgs: any[]): string {
  const toText = (m: any) => `${m.role || ''}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`;
  const a = (oldMsgs || []).map(toText).join('\n');
  const b = (newMsgs || []).map(toText).join('\n');
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return '<span style="color:var(--ds-text-2);">两条请求完全一致（缓存命中段完整）</span>';
  const ctx = 80;
  const aCtx = esc(a.slice(Math.max(0, i - ctx), i)) + '<span style="background:var(--ds-red-bg);color:var(--ds-red);padding:0 2px;border-radius:3px;">' + esc(a.slice(i, i + 200)) + '</span>' + esc(a.slice(i + 200, i + 280));
  const bCtx = esc(b.slice(Math.max(0, i - ctx), i)) + '<span style="background:var(--ds-green-bg);color:var(--ds-green);padding:0 2px;border-radius:3px;">' + esc(b.slice(i, i + 200)) + '</span>' + esc(b.slice(i + 200, i + 280));
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div style="background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:10px;font-size:var(--aus-fs-sm);white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">旧：${aCtx}</div><div style="background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:10px;font-size:var(--aus-fs-sm);white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">新：${bCtx}</div></div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:8px;">差异起点即缓存发散位置，前 ${i} 字符一致为命中段</div>`;
}

export function bindHistoryCompare() {
  const doc = getDoc();
  doc.addEventListener('click', (e: any) => {
    const t = e.target as HTMLElement;
    if (!t) return;
    if (t.classList.contains('aus-compare-old') || t.classList.contains('aus-compare-new')) {
      const ts = parseInt(t.getAttribute('data-ts') || '0');
      if (t.classList.contains('aus-compare-old')) selOld = ts;
      else selNew = ts;
      renderDiff();
    }
    if (t.id === 'aus-diff-fullscreen') {
      const m = doc.getElementById('aus-diff');
      if (m) m.classList.toggle('aus-diff-full');
    }
  });
}

function renderDiff() {
  const doc = getDoc();
  const host = doc.getElementById('aus-diff');
  if (!host) return;
  if (selOld == null || selNew == null) {
    host.innerHTML = '<div style="text-align:center;padding:16px;color:var(--ds-text-3);font-size:var(--aus-fs-base);">已选 ' + (selOld != null ? '旧 ' : '') + (selNew != null ? '新 ' : '') + '，请在历史中各选一条 旧/新 进行对比</div>';
    return;
  }
  const s: any = getSelectedSave();
  const oldEntry = (s?.history || []).find((h: any) => h.timestamp === selOld);
  const newEntry = (s?.history || []).find((h: any) => h.timestamp === selNew);
  if (!oldEntry || !newEntry) { host.innerHTML = '<div style="color:var(--ds-red);font-size:var(--aus-fs-base);">未找到对应记录</div>'; return; }
  host.innerHTML = diffMessages(oldEntry.messages || [], newEntry.messages || []);
}

export function renderUsageDetail(ts: number) {
  const doc = getDoc();
  const s: any = getSelectedSave();
  const h: any = (s?.history || []).find((x: any) => x.timestamp === ts);
  if (!h) return;
  let overlay = doc.getElementById('aus-usage-overlay') as HTMLElement | null;
  if (!overlay) {
    overlay = doc.createElement('div');
    overlay.id = 'aus-usage-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:var(--ds-overlay);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = '<div style="background:var(--ds-card-inner);border-radius:14px;max-width:560px;width:100%;max-height:80vh;overflow:auto;padding:16px;" id="aus-usage-box"></div>';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay!.style.display = 'none'; });
    doc.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  const box = doc.getElementById('aus-usage-box')!;
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><b style="font-size:14px;color:var(--ds-text);">使用详情</b><button onclick="document.getElementById('aus-usage-overlay').style.display='none'" title="关闭" style="border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);padding:6px 10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;">${icon('close', 14)}</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
      <div style="background:var(--ds-card);border-radius:10px;padding:10px;"><div style="color:var(--ds-text-2);font-size:11px;">模型</div><div style="font-weight:600;color:var(--ds-text);">${esc(h.model)}</div></div>
      <div style="background:var(--ds-card);border-radius:10px;padding:10px;"><div style="color:var(--ds-text-2);font-size:11px;">费用</div><div style="font-weight:700;color:var(--ds-text);">${(()=>{ try{  return formatMoney(h.cost||0,4);} catch{ return '¥'+(h.cost||0).toFixed(4)+' CNY';}})()}</div></div>
      <div style="background:var(--ds-card);border-radius:10px;padding:10px;"><div style="color:var(--ds-text-2);font-size:11px;">Tokens</div><div style="color:var(--ds-text);">${h.prompt_tokens || 0} in · ${h.completion_tokens || 0} out · ${h.total_tokens || 0} 总</div></div>
      <div style="background:var(--ds-card);border-radius:10px;padding:10px;"><div style="color:var(--ds-text-2);font-size:11px;">命中率</div><div style="color:var(--ds-text);">${(h.cache_hit_rate || 0).toFixed(1)}%</div></div>
      <div style="background:var(--ds-card);border-radius:10px;padding:10px;"><div style="color:var(--ds-text-2);font-size:11px;">耗时/速率</div><div style="color:var(--ds-text);">${h.duration || 0}ms · ${(h.tokenRate||0)>0 ? h.tokenRate+' t/s' : '未测速'} · 首延 ${(h.ttft||0)>0 ? h.ttft+'ms' : '—'}</div></div>
      <div style="background:var(--ds-card);border-radius:10px;padding:10px;"><div style="color:var(--ds-text-2);font-size:11px;">思维链</div><div style="color:var(--ds-text);">${h.thinkTokens || 0} tk · ${h.thinkTime || 0}ms</div></div>
    </div>
  `;
  doc.addEventListener('click', (e: any) => {
    const t = e.target as HTMLElement;
    if (t?.classList?.contains('aus-usage-btn')) {
      const ts2 = parseInt(t.getAttribute('data-ts') || '0');
      renderUsageDetail(ts2);
    }
  }, { once: true } as any);
}