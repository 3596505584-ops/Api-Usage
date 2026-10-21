import { PRICING, DEFAULT_PEAK_HOURS, PRICE_HISTORY } from '../constants/pricing';
import type { PriceSegment } from '../constants/pricing';
import type { Settings } from '../types/settings';
import type { WalletConfig, WalletModel, WalletPriceTier } from '../types/wallet';
import { DEEPSEEK_WALLET_ID } from '../types/wallet';
import { findWalletModel } from '../data/wallets';
import { isChinaHoliday, isExtraOffDay, isPeakHour as isPeakHourRaw, isWeekendDay } from '../utils/date';
import { formatMoney as _formatMoney } from './currency';

export { isWeekendDay };

// 旧“新价格机制”入口已移除，保留原默认生效日以保证历史记录按既有口径计费。
const LEGACY_PEAK_PRICING_DATE = new Date('2026-08-17T00:00:00+08:00').getTime();

export function getModelList(settings: Settings): string[] {
  const set: Record<string, 1> = {};
  Object.keys(PRICING).forEach((k) => (set[k] = 1));
  (settings.customModels || []).forEach((m) => {
    if (m?.model) set[m.model] = 1;
  });
  return Object.keys(set);
}

function mergePrices(base: { hit: number; miss: number; output: number }, custom: any) {
  if (!custom) return base;
  return {
    hit: custom.hit !== undefined && custom.hit !== '' ? parseFloat(custom.hit) : base.hit,
    miss: custom.miss !== undefined && custom.miss !== '' ? parseFloat(custom.miss) : base.miss,
    output: custom.output !== undefined && custom.output !== '' ? parseFloat(custom.output) : base.output,
  };
}

function normalizeWalletTier(tier: WalletPriceTier | undefined): { hit: number; miss: number; output: number } {
  return {
    hit: Number.isFinite(Number(tier?.hit)) ? Number(tier?.hit) : 0,
    miss: Number.isFinite(Number(tier?.miss)) ? Number(tier?.miss) : 0,
    output: Number.isFinite(Number(tier?.output)) ? Number(tier?.output) : 0,
  };
}

function walletPricing(rule: WalletModel): { usePeakPricing: boolean; offpeak: any; peak: any } {
  return {
    usePeakPricing: rule.price.usePeakPricing !== false,
    offpeak: normalizeWalletTier(rule.price.offpeak),
    peak: normalizeWalletTier(rule.price.peak),
  };
}

const MODEL_ALIASES: Record<string,string> = {
  'deepseek-v4-flash-vision': 'deepseek-v4-flash-vision-exp',
  // 2026-09 更名：V4.1 Flash 统一为 deepseek-flash，历史记录与旧自定义价继续命中
  'deepseek-v4.1-flash': 'deepseek-flash',
};

export function normalizeModel(model: string): string {
  if (!model) return 'deepseek-v4-flash';
  let m = String(model).trim().replace(/^\[[^\]]+\]/, '').trim();
  const low = m.toLowerCase();
  if ((MODEL_ALIASES as any)[low]) return (MODEL_ALIASES as any)[low];
  if (low === 'deepseek-flash') return 'deepseek-flash';
  if (low === 'deepseek-v4-flash') return 'deepseek-v4-flash';
  if (low === 'deepseek-v4-pro') return 'deepseek-v4-pro';
  if (low === 'deepseek-v4-flash-vision-exp') return 'deepseek-v4-flash-vision-exp';
  // 精确匹配后不再回落 deepseek -> flash，保持原名以便无价提示
  return m;
}

// 自定义价匹配：按归一化键匹配，兼容 renamed 模型（如 deepseek-v4.1-flash → deepseek-flash）
function matchCustom(cm: any, m: string, raw?: string): boolean {
  if (!cm || !cm.model) return false;
  if (raw && cm.model === raw) return true;
  if (cm.model === m) return true;
  return normalizeModel(cm.model) === m;
}

export function getPricing(model: string, settings: Settings, wallet?: WalletConfig | null) {
  const raw = model || 'deepseek-v4-flash';
  const m = normalizeModel(raw);
  const base: any = (PRICING as any)[m] || (PRICING as any)['deepseek-v4-flash'];
  const walletRule = wallet ? findWalletModel(wallet, raw) : null;
  if (walletRule) {
    if (walletRule.source === 'builtin' && wallet?.id === DEEPSEEK_WALLET_ID) {
      const seg = findSegment(m, Date.now());
      if (seg) return { usePeakPricing: seg.usePeakPricing !== false, offpeak: seg.offpeak, peak: seg.peak };
      return base;
    }
    if (walletRule.price.priceConfigured) return walletPricing(walletRule);
    if (wallet?.id === DEEPSEEK_WALLET_ID && (PRICING as any)[m]) {
      const seg = findSegment(m, Date.now());
      if (seg) return { usePeakPricing: seg.usePeakPricing !== false, offpeak: seg.offpeak, peak: seg.peak };
      return base;
    }
    return {
      usePeakPricing: true,
      offpeak: { hit: 0, miss: 0, output: 0 },
      peak: { hit: 0, miss: 0, output: 0 },
      pending: true,
    };
  }
  if (wallet && wallet.id !== DEEPSEEK_WALLET_ID) {
    return {
      usePeakPricing: true,
      offpeak: { hit: 0, miss: 0, output: 0 },
      peak: { hit: 0, miss: 0, output: 0 },
      pending: true,
    };
  }
  for (const cm of settings.customModels || []) {
    if (matchCustom(cm, m, raw)) {
      return {
        usePeakPricing: cm.usePeakPricing !== false,
        offpeak: mergePrices(base.offpeak, cm.offpeak),
        peak: mergePrices(base.peak, cm.peak),
      };
    }
  }
  // 无自定义时返回当前时间命中段的价格（未来段不影响当前展示）
  const seg = findSegment(m, Date.now());
  if (seg) return { usePeakPricing: seg.usePeakPricing !== false, offpeak: seg.offpeak, peak: seg.peak };
  return base;
}

export function hasPriceForModel(model: string, settings: Settings, wallet?: WalletConfig | null): boolean {
  const raw = model || 'deepseek-v4-flash';
  const m = normalizeModel(raw);
  if (wallet) {
    const rule = findWalletModel(wallet, raw);
    if (rule) {
      if (rule.source === 'builtin' && wallet.id === DEEPSEEK_WALLET_ID) return !!(PRICING as any)[m];
      return rule.price.priceConfigured === true || (wallet.id === DEEPSEEK_WALLET_ID && !!(PRICING as any)[m]);
    }
    if (wallet.id === DEEPSEEK_WALLET_ID) return !!(PRICING as any)[m];
    return false;
  }
  if ((PRICING as any)[m]) return true;
  for (const cm of settings.customModels || []) if (matchCustom(cm, m, raw)) return true;
  // 仅 deepseek 系有内置价，非 deepseek 若未自定义则无价
  return false;
}

export function isDeepSeekOfficialModel(m: unknown): boolean {
  if (typeof m !== 'string') return false;
  const norm = normalizeModel(m);
  return norm.toLowerCase().indexOf('deepseek') === 0 || String(m).toLowerCase().includes('deepseek');
}

export function isPeakHour(timestamp: number, settings: Settings): boolean {
  const hours = (settings && settings.peakHours) || (DEFAULT_PEAK_HOURS as any);
  return isPeakHourRaw(timestamp, hours, (settings as any)?.extraOffDays);
}

function isWithinPeakHours(timestamp: number, peakHours: Array<{ start: string; end: string }>): boolean {
  const d = new Date(timestamp);
  const totalMinutes = d.getHours() * 60 + d.getMinutes();
  for (const h of peakHours || []) {
    if (!h || !h.start || !h.end) continue;
    const p = h.start.split(':');
    const q = h.end.split(':');
    const sp = parseInt(p[0]) * 60 + parseInt(p[1] || '0');
    const ep = parseInt(q[0]) * 60 + parseInt(q[1] || '0');
    if (sp < ep) {
      if (totalMinutes >= sp && totalMinutes < ep) return true;
    } else if (totalMinutes >= sp || totalMinutes < ep) return true;
  }
  return false;
}

function isOfficialPricingWallet(wallet: WalletConfig): boolean {
  return wallet.id === DEEPSEEK_WALLET_ID || wallet.kind === 'official';
}

// 官方钱包遵循 DeepSeek 规则：周末与中国法定节假日全天空闲；
// 额外空闲日期对所有钱包生效（用户显式补充的日期按空闲计费）
export function isWalletPeakHour(timestamp: number, wallet: WalletConfig, settings?: Settings | null): boolean {
  if (wallet.weekendOffpeak !== false && isWeekendDay(timestamp)) return false;
  if (isOfficialPricingWallet(wallet) && isChinaHoliday(timestamp)) return false;
  if (isExtraOffDay(timestamp, (settings as any)?.extraOffDays)) return false;
  return isWithinPeakHours(timestamp, wallet.peakHours?.length ? wallet.peakHours : DEFAULT_PEAK_HOURS);
}

// 1:1 calcCost（含周末豁免、仅 deepseek* 峰谷、内置价格段与历史默认生效日）
// 多段价格：按记录 timestamp 命中 PRICE_HISTORY 中 timestamp >= since 的最后一段；
// 自定义价格优先不回退；段自带 peakHours 优先于用户当前设置（历史峰谷规则不随当前设置漂移）
// 未来段（since 为未来时间）预置后自动生效，当前记录不受影响
function findSegment(normalizedModel: string, uTs: number): PriceSegment | null {
  const segs = (PRICE_HISTORY as any)[normalizedModel] as PriceSegment[] | undefined;
  if (!segs || !segs.length) return null;
  let hit: PriceSegment | null = null;
  for (const s of segs) {
    if (uTs >= s.since) hit = s;
    else break;
  }
  return hit;
}
function peakHoursFor(seg: PriceSegment | null, settings: Settings): any {
  if (seg?.peakHours?.length) return seg.peakHours;
  return (settings && (settings as any).peakHours) || (DEFAULT_PEAK_HOURS as any);
}
function hasCustomForModel(model: string, settings: Settings): boolean {
  const raw = model || 'deepseek-v4-flash';
  const m = normalizeModel(raw);
  for (const cm of (settings as any).customModels || []) if (matchCustom(cm, m, raw)) return true;
  return false;
}
function effectivePricingFor(model: string, uTs: number, settings: Settings, base: any) {
  const m = normalizeModel(model || 'deepseek-v4-flash');
  if (hasCustomForModel(model, settings)) return base;
  const seg = findSegment(m, uTs);
  if (seg) {
    return { usePeakPricing: seg.usePeakPricing !== false, offpeak: seg.offpeak, peak: seg.peak } as any;
  }
  return base;
}

export function calcCost(
  u: { timestamp: number; model: string; prompt_cache_hit_tokens: number; prompt_cache_miss_tokens: number; completion_tokens: number },
  settings: Settings,
  wallet?: WalletConfig | null,
): { input: number; output: number; total: number; priceType: string; source: 'api' | 'wallet' | 'builtin' | 'legacy' | 'legacy-unassigned' | 'unpriced' } {
  const model = u.model || 'deepseek-v4-flash';
  const walletRule = wallet ? findWalletModel(wallet, model) : null;
  const useWalletRule = !!walletRule
    && walletRule.price.priceConfigured
    && walletRule.source !== 'builtin';
  if (!wallet && !hasPriceForModel(model, settings)) {
    return { input: 0, output: 0, total: 0, priceType: 'old', source: 'legacy-unassigned' };
  }
  if (wallet && !hasPriceForModel(model, settings, wallet)) {
    return { input: 0, output: 0, total: 0, priceType: 'unpriced', source: 'unpriced' };
  }
  if (useWalletRule && wallet) {
    const pricing = walletPricing(walletRule);
    const usePeak = pricing.usePeakPricing !== false && isWalletPeakHour(u.timestamp, wallet, settings);
    const p: any = usePeak ? pricing.peak : pricing.offpeak;
    const ih = (u.prompt_cache_hit_tokens / 1e6) * p.hit;
    const im = (u.prompt_cache_miss_tokens / 1e6) * p.miss;
    const o = (u.completion_tokens / 1e6) * p.output;
    return {
      input: ih + im,
      output: o,
      total: ih + im + o,
      priceType: usePeak ? 'wallet-peak' : 'wallet-offpeak',
      source: 'wallet',
    };
  }
  const basePricing = getPricing(model, settings, wallet);
  const pricing = effectivePricingFor(model, u.timestamp, settings, basePricing);
  const segForHours = hasCustomForModel(model, settings) ? null : findSegment(normalizeModel(model), u.timestamp);
  const hours = peakHoursFor(segForHours, settings);
  const useNewPricing = u.timestamp >= LEGACY_PEAK_PRICING_DATE;
  let p: any;
  let priceType: string;
  if (useNewPricing && pricing.usePeakPricing !== false && isDeepSeekOfficialModel(model)) {
    const isPeak = isPeakHourRaw(u.timestamp, hours, (settings as any)?.extraOffDays);
    p = isPeak ? pricing.peak : pricing.offpeak;
    priceType = isPeak ? 'new-peak' : 'new-offpeak';
  } else {
    p = pricing.offpeak;
    priceType = useNewPricing ? 'new-offpeak' : 'old';
  }
  const ih = (u.prompt_cache_hit_tokens / 1e6) * p.hit;
  const im = (u.prompt_cache_miss_tokens / 1e6) * p.miss;
  const o = (u.completion_tokens / 1e6) * p.output;
  return {
    input: ih + im,
    output: o,
    total: ih + im + o,
    priceType,
    source: wallet
      ? (wallet.id === DEEPSEEK_WALLET_ID ? 'builtin' : 'unpriced')
      : (hasCustomForModel(model, settings) ? 'legacy' : 'legacy-unassigned'),
  };
}

export function calcSavings(
  u: { prompt_cache_hit_tokens: number; timestamp: number; model: string; prompt_cache_miss_tokens: number; completion_tokens: number },
  settings: Settings,
  wallet?: WalletConfig | null,
): number {
  const model = u.model || 'deepseek-v4-flash';
  const walletRule = wallet ? findWalletModel(wallet, model) : null;
  const useWalletRule = !!walletRule
    && walletRule.price.priceConfigured
    && walletRule.source !== 'builtin';
  if (!hasPriceForModel(model, settings, wallet)) return 0;
  if (useWalletRule && wallet) {
    const pricing = walletPricing(walletRule);
    const usePeak = pricing.usePeakPricing !== false && isWalletPeakHour(u.timestamp, wallet, settings);
    const p: any = usePeak ? pricing.peak : pricing.offpeak;
    return ((u.prompt_cache_hit_tokens || 0) / 1e6) * (p.miss - p.hit);
  }
  const basePricing = getPricing(model, settings, wallet);
  const pricing = effectivePricingFor(model, u.timestamp, settings, basePricing);
  const segForHours = hasCustomForModel(model, settings) ? null : findSegment(normalizeModel(model), u.timestamp);
  const hours = peakHoursFor(segForHours, settings);
  const useNewPricing = u.timestamp >= LEGACY_PEAK_PRICING_DATE;
  let p: any;
  if (useNewPricing && pricing.usePeakPricing !== false && isDeepSeekOfficialModel(model)) {
    p = isPeakHourRaw(u.timestamp, hours, (settings as any)?.extraOffDays) ? pricing.peak : pricing.offpeak;
  } else p = pricing.offpeak;
  return ((u.prompt_cache_hit_tokens || 0) / 1e6) * (p.miss - p.hit);
}

export function fmtCost(model: string, cost: number, digits = 4, settings: Settings): string {
  if (!hasPriceForModel(model, settings)) return '¥价格未设置';
  try { return _formatMoney(cost || 0, digits); } catch { return '¥' + (cost || 0).toFixed(digits) + ' CNY'; }
}
