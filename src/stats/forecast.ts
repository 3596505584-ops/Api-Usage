import { DEFAULT_CONTEXT_LIMIT } from '../constants/pricing';

/**
 * Q3 预测核心 — 纯函数实现，<130 行
 * 依赖：单 chatId 的 prompt 序列，命中率/输出 EWMA，价格表
 */
export type FitResult = {
  chatId: string | null;
  C0: number;
  delta: number;
  sigma: number;
  r2: number;
  segStart: number;
  segLen: number;
  model: 'linear' | 'log' | 'recent-mean';
  hitEwma: number;
  outEwma: number;
  avgIntervalMs: number;
};

function ewma(arr: number[], alpha = 0.3): number {
  if (!arr.length) return 0;
  let v = arr[arr.length - 1];
  for (let i = arr.length - 2; i >= 0; i--) v = alpha * arr[i] + (1 - alpha) * v;
  return v;
}

/** 检测回落点：prompt 骤降 >=30% 则分段，只用最后一段 */
function segmentByDrop(sorted: any[]): { seg: any[]; segStart: number } {
  if (sorted.length < 2) return { seg: sorted, segStart: 0 };
  let cut = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].prompt_tokens ?? (sorted[i - 1].cache_hit_tokens || 0) + (sorted[i - 1].cache_miss_tokens || 0);
    const cur = sorted[i].prompt_tokens ?? (sorted[i].cache_hit_tokens || 0) + (sorted[i].cache_miss_tokens || 0);
    if (prev > 0 && cur / prev <= 0.7) cut = i;
  }
  return { seg: sorted.slice(cut), segStart: cut };
}

function linearFit(y: number[]): { C0: number; delta: number; sigma: number; r2: number } {
  const n = y.length;
  if (n < 3) {
    const deltas: number[] = [];
    for (let i = 1; i < n; i++) deltas.push(y[i] - y[i - 1]);
    const delta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    const C0 = n ? y[0] : 0;
    return { C0, delta, sigma: 0, r2: 0 };
  }
  // 最小二乘：x=0..n-1
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += i; sy += y[i]; sxx += i * i; sxy += i * y[i]; }
  const denom = n * sxx - sx * sx;
  const delta = denom ? (n * sxy - sx * sy) / denom : 0;
  const C0 = (sy - delta * sx) / n;
  // sigma：残差标准差
  let rss = 0, tss = 0;
  const mean = sy / n;
  for (let i = 0; i < n; i++) { const pred = C0 + delta * i; rss += (y[i] - pred) ** 2; tss += (y[i] - mean) ** 2; }
  const sigma = Math.sqrt(rss / n);
  const r2 = tss ? 1 - rss / tss : 0;
  return { C0, delta, sigma, r2 };
}

function logFit(y: number[]): { C0: number; delta: number; sigma: number; r2: number; a: number; b: number } {
  const n = y.length;
  if (n < 6) return { C0: y[0] || 0, delta: 0, sigma: 0, r2: -1, a: 0, b: y[0] || 0 };
  // y = a*ln(x+1)+b
  const xs = y.map((_, i) => Math.log(i + 1));
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += y[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * y[i]; }
  const denom = n * sxx - sx * sx;
  const a = denom ? (n * sxy - sx * sy) / denom : 0;
  const b = (sy - a * sx) / n;
  let rss = 0, tss = 0;
  const mean = sy / n;
  for (let i = 0; i < n; i++) { const pred = a * xs[i] + b; rss += (y[i] - pred) ** 2; tss += (y[i] - mean) ** 2; }
  const sigma = Math.sqrt(rss / n);
  const r2 = tss ? 1 - rss / tss : 0;
  return { C0: b, delta: a, sigma, r2, a, b };
}

export function fitSegments(history: any[], chatId: string | null): FitResult | null {
  const filtered = chatId ? history.filter((h: any) => (h.chatId ?? null) === chatId) : history.slice();
  if (filtered.length < 1) return null;
  const sorted = [...filtered].sort((a, b) => a.timestamp - b.timestamp);
  const promptOf = (h: any) => h.prompt_tokens ?? (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0);
  const { seg, segStart } = segmentByDrop(sorted);
  const y = seg.map(promptOf);
  // 多模型自动选择：样本<6 用 recent-mean
  if (y.length < 6) {
    const C0 = y[0] || 0;
    const delta = y.length >= 2 ? (y[y.length - 1] - y[0]) / (y.length - 1) : 0;
    // recent-mean 的 sigma 取 std
    const mean = y.reduce((a, b) => a + b, 0) / y.length;
    const sigma = Math.sqrt(y.reduce((a, b) => a + (b - mean) ** 2, 0) / y.length);
    const r2 = 0;
    return finalize(seg, sorted, C0, delta, sigma, r2, 'recent-mean', segStart);
  }
  const lf = linearFit(y);
  const gf = logFit(y);
  if (gf.r2 > lf.r2 && gf.r2 > 0.5) {
    // log 模型转 linear 近似 delta：用最后两点斜率近似
    const approxDelta = y.length >= 2 ? y[y.length - 1] - y[y.length - 2] : 0;
    return finalize(seg, sorted, gf.b, approxDelta, gf.sigma, gf.r2, 'log', segStart, { C0: gf.b, delta: approxDelta, sigma: gf.sigma, r2: gf.r2 });
  }
  return finalize(seg, sorted, lf.C0, lf.delta, lf.sigma, lf.r2, 'linear', segStart);
}

function finalize(seg: any[], sorted: any[], C0: number, delta: number, sigma: number, r2: number, model: FitResult['model'], segStart: number, extra?: any): FitResult {
  const hitRates = seg.map(h => {
    const ch = h.cache_hit_tokens || 0, cm = h.cache_miss_tokens || 0, tot = ch + cm;
    return tot ? ch / tot : 0;
  });
  const outTokens = seg.map(h => h.completion_tokens || 0);
  const hitEwma = ewma(hitRates.slice(-5));
  const outEwma = ewma(outTokens.slice(-5));
  // 平均轮间隔
  let avgIntervalMs = 0;
  if (sorted.length >= 2) {
    const diffs: number[] = [];
    for (let i = 1; i < sorted.length; i++) diffs.push(sorted[i].timestamp - sorted[i - 1].timestamp);
    avgIntervalMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  }
  return { chatId: (seg[0] as any)?.chatId ?? null, C0: Math.max(0, C0), delta: Math.max(0, delta), sigma: Math.max(0, sigma), r2, segStart, segLen: seg.length, model, hitEwma, outEwma, avgIntervalMs };
}

/** 命中率加权单轮成本 c(n) */
export function costAt(n: number, fit: FitResult, pricing: { hit: number; miss: number; output: number }): number {
  const prompt = Math.max(0, fit.C0 + fit.delta * n);
  const hitTok = prompt * fit.hitEwma;
  const missTok = prompt * (1 - fit.hitEwma);
  return (hitTok * pricing.hit + missTok * pricing.miss + fit.outEwma * pricing.output) / 1e6;
}

/** 解二次方程求 R：B = Σ c(n) 1..R */
export function remainingRounds(budget: number, fit: FitResult, pricing: { hit: number; miss: number; output: number }): { R: number; R_low: number; R_high: number } {
  if (budget <= 0 || !fit) return { R: 0, R_low: 0, R_high: 0 };
  const pIn = fit.hitEwma * pricing.hit + (1 - fit.hitEwma) * pricing.miss;
  // c(n)= (C0+n*Δ)*pIn/1e6 + out* pOut/1e6
  // Σ = R*(C0*pIn+out*pOut)/1e6 + Δ*pIn/1e6 * R(R+1)/2
  const a = (fit.delta * pIn) / 1e6 / 2;
  const b = (fit.C0 * pIn) / 1e6 + (fit.outEwma * pricing.output) / 1e6 + (fit.delta * pIn) / 1e6 / 2;
  const solve = (dlt: number) => {
    const aa = (dlt * pIn) / 1e6 / 2;
    const bb = ( (fit.C0 * pIn) / 1e6 + (fit.outEwma * pricing.output) / 1e6 + (dlt * pIn) / 1e6 / 2 );
    if (Math.abs(aa) < 1e-12) return bb ? Math.floor(budget / bb) : 0;
    const disc = bb * bb + 4 * aa * budget;
    const r = (-bb + Math.sqrt(disc)) / (2 * aa);
    return Math.max(0, Math.floor(r));
  };
  if (Math.abs(a) < 1e-12) {
    const r = b ? Math.floor(budget / b) : 0;
    return { R: Math.max(0, r), R_low: Math.max(0, r), R_high: Math.max(0, r) };
  }
  const R = solve(fit.delta);
  const R_low = solve(Math.max(0, fit.delta - fit.sigma));
  const R_high = solve(fit.delta + fit.sigma);
  return { R, R_low: Math.min(R, R_low), R_high: Math.max(R, R_high) };
}

export function ctxLimitRounds(fit: FitResult | null, limit: number): number | null {
  if (!fit || !limit || fit.delta <= 0) return null;
  const r = (limit - fit.C0) / fit.delta;
  return r > 0 ? Math.floor(r) : 0;
}

export function nextPromptWithBand(fit: FitResult): { prompt: number; low: number; high: number } {
  const n = fit.segLen;
  const p = fit.C0 + fit.delta * n;
  return { prompt: Math.max(0, p), low: Math.max(0, p - fit.sigma), high: p + fit.sigma };
}

export function ctxLimitForModel(model: string, configuredLimit?: number | null): number | null {
  if (configuredLimit != null && Number.isFinite(configuredLimit) && configuredLimit > 0) return Math.round(configuredLimit);
  const m = (model || '').toLowerCase();
  if (m.includes('128k')) return 128000;
  if (m.includes('64k')) return 64000;
  if (m.includes('32k')) return 32000;
  return DEFAULT_CONTEXT_LIMIT;
}
