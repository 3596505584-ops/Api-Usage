import { state, getSelectedSave } from '../store/index';
import { calcSavings } from '../services/pricing';
import { findWalletForHistory } from '../data/wallets';

function getDoc(): Document { return (window.parent as any)?.document ?? document; }

function fmt(n: number): string { return n.toLocaleString('zh-CN'); }

export function renderStats() {
  const doc = getDoc();
  const s: any = getSelectedSave();
  if (!s) return;
  const host = doc.getElementById('aus-stats');
  if (!host) return;
  const totalCost = s.total_cost || 0;
  const totalTokens = s.total_tokens || 0;
  const hit = s.cache_hit_tokens || 0, miss = s.cache_miss_tokens || 0;
  const rounds = s.rounds || 0;
  const hitRate = hit + miss > 0 ? (hit / (hit + miss) * 100) : 0;
  const avgCost = rounds ? totalCost / rounds : 0;
  const avgTokens = rounds ? totalTokens / rounds : 0;
  // 预计节省：对每条按 miss-hit 差价重算（简化用总 hit * 平均差价）
  let savings = 0;
  try {
    for (const h of s.history || []) {
      savings += calcSavings(
        { timestamp: h.timestamp, model: h.model, prompt_cache_hit_tokens: h.cache_hit_tokens || 0, prompt_cache_miss_tokens: h.cache_miss_tokens || 0, completion_tokens: h.completion_tokens || 0 },
        state.settings,
        findWalletForHistory(state.wallets, h),
      );
    }
  } catch {}
  const inputCost = s.input_cost || 0, outputCost = s.output_cost || 0;
  const latest = (s.history || [])[0];
  const latestRate = latest ? (latest.cache_hit_rate || 0) : 0;
  // 单轮最大/最小
  let maxCost = 0, minCost = Infinity, maxTok = 0, minTok = Infinity;
  for (const h of s.history || []) {
    const c = h.cost || 0, t = h.total_tokens || 0;
    if (c > maxCost) maxCost = c;
    if (c < minCost) minCost = c;
    if (t > maxTok) maxTok = t;
    if (t < minTok) minTok = t;
  }
  if (!isFinite(minCost)) minCost = 0;
  if (!isFinite(minTok)) minTok = 0;
  const avgIn = rounds ? (s.input_tokens || 0) / rounds : 0;
  const avgOut = rounds ? (s.output_tokens || 0) / rounds : 0;
  const avgDur = rounds ? ((s.history || []).reduce((a: number, h: any) => a + (h.duration || 0), 0) / rounds / 1000) : 0;
  const avgSpeed = rounds ? ((s.history || []).reduce((a: number, h: any) => a + (h.tokenRate || 0), 0) / rounds) : 0;

  const cards: Array<{ title: string; val: string; sub: string; accent?: boolean }> = [
    { title: '总消耗', val: '¥' + totalCost.toFixed(4), sub: fmt(totalTokens) + ' tokens' },
    { title: '加权命中率', val: hitRate.toFixed(1) + '%', sub: '基于 ' + rounds + ' 轮', accent: true },
    { title: '平均每轮', val: '¥' + avgCost.toFixed(4), sub: Math.round(avgTokens) + ' tokens' },
    { title: '预计节省', val: '¥' + savings.toFixed(4), sub: fmt(hit) + ' hit tokens', accent: true },
    { title: '输入费用', val: '¥' + inputCost.toFixed(4), sub: fmt(s.input_tokens || 0) + ' tokens' },
    { title: '输出费用', val: '¥' + outputCost.toFixed(4), sub: fmt(s.output_tokens || 0) + ' tokens' },
    { title: '总 Tokens', val: fmt(totalTokens), sub: '平均 ' + Math.round(avgTokens) + '/轮' },
    { title: '命中 Tokens', val: fmt(hit), sub: '占输入 ' + (hit + miss > 0 ? ((hit / (hit + miss)) * 100).toFixed(1) : '0') + '%' },
    { title: '未命中 Tokens', val: fmt(miss), sub: '占输入 ' + (hit + miss > 0 ? ((miss / (hit + miss)) * 100).toFixed(1) : '0') + '%' },
    { title: '对话轮数', val: String(rounds), sub: '轮对话' },
    { title: '单轮最大', val: '¥' + maxCost.toFixed(4), sub: maxCost ? fmt(maxTok) + ' tokens' : '暂无数据' },
    { title: '单轮最小', val: '¥' + minCost.toFixed(4), sub: s.history?.length ? fmt(minTok) + ' tokens' : '暂无数据' },
    { title: '最新命中率', val: latest ? latestRate.toFixed(1) + '%' : '-', sub: latest ? latest.model : '暂无数据', accent: true },
    { title: '平均输入', val: Math.round(avgIn).toString(), sub: 'tokens/轮' },
    { title: '平均输出', val: Math.round(avgOut).toString(), sub: 'tokens/轮' },
    { title: '平均耗时', val: avgDur.toFixed(1) + 's', sub: '首延 ' + (s.history?.[0]?.ttft ? (s.history[0].ttft / 1000).toFixed(1) + 's' : '-') },
    { title: '平均速率', val: Math.round(avgSpeed) + ' t/s', sub: avgSpeed ? 'tokens/秒' : '暂无数据', accent: true },
    { title: '思维链', val: (latest?.thinkTokens || 0) + ' tk', sub: latest?.thinkTime ? (latest.thinkTime / 1000).toFixed(1) + 's' : '—' },
  ];

  host.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">` + cards.map(c => `
    <div class="ds-card" style="padding:12px 14px;">
      <div class="ds-card-title" style="font-size:var(--aus-fs-sm);">${c.title}</div>
      <div class="${c.accent ? 'ds-card-val' : 'ds-card-val'}" style="${c.accent ? 'color:#0BA25E;' : ''}font-size:18px;">${c.val}</div>
      <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.sub}</div>
    </div>
  `).join('') + `</div>`;
}
