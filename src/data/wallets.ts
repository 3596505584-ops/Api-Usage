import { PRICING, HIDDEN_PRICING_MODELS, PRICE_HISTORY, DEFAULT_PEAK_HOURS, DEFAULT_CONTEXT_LIMIT, LEGACY_DEEPSEEK_CONTEXT_LIMIT } from '../constants/pricing';
import { isDeepSeekOfficialEndpoint, officialEndpointId, type HistoryConnection } from '../services/connection-identity';
import type { Settings } from '../types/settings';
import {
  DEEPSEEK_WALLET_ID,
  defaultCatalogProvider,
  emptyWalletPriceRule,
  isFirstPartyCatalogProvider,
  walletCurrencyOrDefault,
  type WalletConfig,
  type WalletCredentialObservation,
  type WalletCurrency,
  type WalletModel,
  type WalletPriceRule,
  type WalletPriceTier,
} from '../types/wallet';
import { isUnsafeKey } from '../utils/date';
import { normalizeBalanceQuery, moneyNumber } from './balance-providers';

export const DEEPSEEK_OFFICIAL_ENDPOINT_ID = officialEndpointId('deepseek');

function cleanText(value: unknown): string {
  return String(value == null ? '' : value).trim();
}

function finiteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function positiveNumberOrNull(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function builtinContextLimit(model: string): number | null {
  const key = String(model || '').toLowerCase();
  if (key.includes('128k')) return 128000;
  if (key.includes('64k')) return 64000;
  if (key.includes('32k')) return 32000;
  if (key.includes('deepseek')) return DEFAULT_CONTEXT_LIMIT;
  return null;
}

/** 钱包页清空手动上限后恢复的自动推断值 */
export function defaultContextLimitForModel(model: string): number | null {
  return builtinContextLimit(model);
}

function safeId(s: string): string {
  return s.replace(/[^a-zA-Z0-9:_-]/g, '-').slice(0, 100);
}

export function walletIdForEndpoint(endpointId: string | null | undefined): string | null {
  const id = cleanText(endpointId);
  return id ? `wallet:${safeId(id)}` : null;
}

export function isDeepSeekOfficialConnection(connection: HistoryConnection | null | undefined): boolean {
  if (!connection) return false;
  const sourceType = cleanText(connection.sourceType).toLowerCase();
  const endpointId = cleanText(connection.endpointId);
  const endpointLabel = cleanText(connection.endpointLabel);
  const officialEndpoint = endpointId === DEEPSEEK_OFFICIAL_ENDPOINT_ID
    || isDeepSeekOfficialEndpoint(endpointId)
    || isDeepSeekOfficialEndpoint(endpointLabel)
    || endpointLabel === 'DeepSeek 官方';
  if (officialEndpoint) return true;
  return sourceType === 'deepseek' && !endpointId;
}

export function walletMatchesConnection(
  wallet: WalletConfig,
  connection: HistoryConnection | null | undefined,
): boolean {
  if (!wallet || !connection) return false;
  if (wallet.id === DEEPSEEK_WALLET_ID) return isDeepSeekOfficialConnection(connection);
  if (wallet.endpointId && connection.endpointId) return wallet.endpointId === connection.endpointId;
  if (wallet.sourceType && connection.sourceType) {
    return wallet.sourceType === connection.sourceType && !wallet.endpointId && !connection.endpointId;
  }
  return false;
}

export function findWalletForConnection(
  wallets: WalletConfig[],
  connection: HistoryConnection | null | undefined,
): WalletConfig | null {
  if (!connection) return null;
  for (const wallet of wallets || []) {
    if (walletMatchesConnection(wallet, connection)) return wallet;
  }
  return null;
}

export function findWalletForHistory(
  wallets: WalletConfig[],
  history: { walletId?: string | null; endpointId?: string | null; sourceType?: string | null },
): WalletConfig | null {
  if (!history) return null;
  if (history.walletId) {
    const exact = (wallets || []).find((wallet) => wallet.id === history.walletId);
    if (exact) return exact;
  }
  if (history.endpointId) {
    const byEndpoint = (wallets || []).find((wallet) => wallet.endpointId === history.endpointId);
    if (byEndpoint) return byEndpoint;
  }
  if (cleanText(history.sourceType).toLowerCase() === 'deepseek') {
    return (wallets || []).find((wallet) => wallet.id === DEEPSEEK_WALLET_ID) || null;
  }
  return null;
}

function clonePriceTier(tier: unknown, fallback?: Partial<WalletPriceTier>): WalletPriceTier {
  const src: any = tier && typeof tier === 'object' ? tier : {};
  return {
    hit: finiteNumber(src.hit, finiteNumber(fallback?.hit, 0)),
    miss: finiteNumber(src.miss, finiteNumber(fallback?.miss, 0)),
    output: finiteNumber(src.output, finiteNumber(fallback?.output, 0)),
  };
}

export function normalizeWalletPriceRule(raw: any): WalletPriceRule {
  const src: any = raw && typeof raw === 'object' ? raw : {};
  const configured = src.priceConfigured === true;
  return {
    usePeakPricing: src.usePeakPricing !== false,
    offpeak: clonePriceTier(src.offpeak),
    peak: clonePriceTier(src.peak),
    priceConfigured: configured,
  };
}

export function cloneWalletPriceRule(rule: WalletPriceRule): WalletPriceRule {
  return {
    usePeakPricing: rule.usePeakPricing !== false,
    offpeak: { ...rule.offpeak },
    peak: { ...rule.peak },
    priceConfigured: rule.priceConfigured === true,
  };
}

function normalizeAliases(raw: unknown, current: string): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    const item = cleanText(value);
    if (!item || item === current || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export function normalizeWalletModel(raw: any, now = Date.now()): WalletModel | null {
  if (!raw || typeof raw !== 'object') return null;
  const sourceModel = cleanText(raw.sourceModel || raw.model);
  if (!sourceModel) return null;
  const model = cleanText(raw.model || sourceModel);
  const source = ['builtin', 'manual', 'sync', 'discovered'].includes(raw.source)
    ? raw.source as WalletModel['source']
    : 'discovered';
  const discoveredAt = finiteNumber(raw.discoveredAt, now);
  const contextLimitManual = raw.contextLimitManual === true;
  const rawContextLimit = positiveNumberOrNull(raw.contextLimit);
  const legacyDeepseekAuto = !contextLimitManual
    && rawContextLimit === LEGACY_DEEPSEEK_CONTEXT_LIMIT
    && sourceModel.toLowerCase().includes('deepseek');
  return {
    id: cleanText(raw.id) || `${sourceModel}:${discoveredAt}`,
    sourceModel,
    model,
    aliases: normalizeAliases(raw.aliases, model),
    contextLimit: contextLimitManual
      ? rawContextLimit
      : (legacyDeepseekAuto ? DEFAULT_CONTEXT_LIMIT : (rawContextLimit ?? builtinContextLimit(sourceModel))),
    contextLimitManual,
    price: normalizeWalletPriceRule(raw.price),
    source,
    locked: raw.locked === true,
    discoveredAt,
    lastSeen: finiteNumber(raw.lastSeen, discoveredAt),
    updatedAt: finiteNumber(raw.updatedAt, discoveredAt),
  };
}

function normalizeCredential(raw: any): WalletCredentialObservation | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = cleanText(raw.id);
  if (!id) return null;
  return {
    id,
    label: cleanText(raw.label) || '未命名密钥',
    lastSeen: finiteNumber(raw.lastSeen, 0),
  };
}

function normalizePeakHours(raw: unknown, fallback: Settings['peakHours']): Settings['peakHours'] {
  const list = Array.isArray(raw) ? raw : fallback;
  const out: Settings['peakHours'] = [];
  for (const item of list || []) {
    if (!item || typeof item !== 'object') continue;
    const start = cleanText((item as any).start);
    const end = cleanText((item as any).end);
    if (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)) out.push({ start, end });
  }
  return out.length ? out : fallback.map((item) => ({ ...item }));
}

export function normalizeWallet(raw: any, settings: Settings, now = Date.now()): WalletConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = cleanText(raw.id);
  if (!id) return null;
  for (const key of Object.keys(raw)) {
    if (isUnsafeKey(key)) delete raw[key];
  }
  const endpointId = cleanText(raw.endpointId) || null;
  const sourceType = cleanText(raw.sourceType) || null;
  const kind: WalletConfig['kind'] = id === DEEPSEEK_WALLET_ID ? 'official' : (raw.kind === 'official' ? 'official' : 'relay');
  const name = cleanText(raw.name) || cleanText(raw.endpointLabel) || (kind === 'official' ? '官方接口' : '未命名钱包');
  const balanceRaw: any = raw.balance && typeof raw.balance === 'object' ? raw.balance : {};
  const models = Array.isArray(raw.models)
    ? raw.models.map((item: any) => normalizeWalletModel(item, now)).filter(Boolean) as WalletModel[]
    : [];
  const credentials = Array.isArray(raw.credentials)
    ? raw.credentials.map((item: any) => normalizeCredential(item)).filter(Boolean) as WalletCredentialObservation[]
    : [];
  const modelMap = new Map<string, WalletModel>();
  for (const model of models) {
    const key = model.id || `${model.sourceModel}:${model.discoveredAt}`;
    if (!modelMap.has(key)) modelMap.set(key, model);
  }
  const credentialMap = new Map<string, WalletCredentialObservation>();
  for (const credential of credentials) credentialMap.set(credential.id, credential);
  const createdAt = finiteNumber(raw.createdAt, now);
  const rawCatalogProvider = cleanText(raw.catalogProvider) || defaultCatalogProvider(sourceType);
  return {
    id,
    name,
    kind,
    sourceType,
    endpointId,
    endpointLabel: cleanText(raw.endpointLabel) || null,
    endpointDisplay: cleanText(raw.endpointDisplay || raw.endpointLabel) || null,
    catalogProvider: isFirstPartyCatalogProvider(rawCatalogProvider) ? rawCatalogProvider : null,
    responseCost: ['CNY', 'USD', 'off'].includes(raw.responseCost) ? raw.responseCost : 'auto',
    balance: {
      query: normalizeBalanceQuery(balanceRaw.query),
      ...(balanceRaw.snapshot && typeof balanceRaw.snapshot === 'object' ? {
        snapshot: {
          amount: moneyNumber(balanceRaw.snapshot.amount) === null ? null : String(balanceRaw.snapshot.amount),
          currency: walletCurrencyOrDefault(balanceRaw.snapshot.currency),
          usage: moneyNumber(balanceRaw.snapshot.usage),
          scope: balanceRaw.snapshot.scope === 'key' ? 'key' as const : 'account' as const,
          keyRemaining: moneyNumber(balanceRaw.snapshot.keyRemaining),
          checkedAt: finiteNumber(balanceRaw.snapshot.checkedAt, 0),
        },
      } : {}),
      mode: balanceRaw.mode === 'auto' ? 'auto' : 'manual',
      amount: balanceRaw.amount == null || balanceRaw.amount === '' ? null : String(balanceRaw.amount),
      currency: walletCurrencyOrDefault(balanceRaw.currency),
      primaryCredentialId: cleanText(balanceRaw.primaryCredentialId) || null,
      lastCalibrated: balanceRaw.lastCalibrated == null ? null : finiteNumber(balanceRaw.lastCalibrated, 0),
    },
    peakHours: normalizePeakHours(raw.peakHours, settings.peakHours?.length ? settings.peakHours : DEFAULT_PEAK_HOURS),
    weekendOffpeak: raw.weekendOffpeak !== false,
    credentials: Array.from(credentialMap.values()),
    models: Array.from(modelMap.values()),
    collapsed: raw.collapsed !== false,
    createdAt,
    updatedAt: finiteNumber(raw.updatedAt, createdAt),
    lastUsedAt: raw.lastUsedAt == null ? null : finiteNumber(raw.lastUsedAt, 0),
    legacyPricingImported: raw.legacyPricingImported === true,
  };
}

function visibleBuiltinModels(): string[] {
  return Object.keys(PRICING).filter((model) => HIDDEN_PRICING_MODELS.indexOf(model) === -1);
}

function currentBuiltinPrice(model: string, now: number): WalletPriceRule {
  const segments = (PRICE_HISTORY as any)[model] as Array<any> | undefined;
  let segment: any = null;
  for (const item of segments || []) {
    if (item && now >= item.since) segment = item;
    else break;
  }
  const fallback: any = (PRICING as any)[model] || (PRICING as any)['deepseek-flash'];
  const price: any = segment || fallback;
  return {
    usePeakPricing: price?.usePeakPricing !== false,
    offpeak: clonePriceTier(price?.offpeak, fallback?.offpeak),
    peak: clonePriceTier(price?.peak, fallback?.peak),
    priceConfigured: true,
  };
}

export function createDeepSeekWallet(settings: Settings, now = Date.now()): WalletConfig {
  const models: WalletModel[] = visibleBuiltinModels().map((model) => ({
    id: `builtin:${model}`,
    sourceModel: model,
    model,
    aliases: [],
    contextLimit: builtinContextLimit(model),
    contextLimitManual: false,
    price: currentBuiltinPrice(model, now),
    source: 'builtin',
    locked: false,
    discoveredAt: now,
    lastSeen: now,
    updatedAt: now,
  }));
  return {
    id: DEEPSEEK_WALLET_ID,
    name: 'DeepSeek 官方',
    kind: 'official',
    sourceType: 'deepseek',
    endpointId: DEEPSEEK_OFFICIAL_ENDPOINT_ID,
    endpointLabel: 'DeepSeek 官方 API',
    endpointDisplay: 'DeepSeek 官方 API',
    catalogProvider: 'deepseek',
    balance: {
      mode: 'manual',
      amount: null,
      currency: 'CNY',
      primaryCredentialId: null,
      lastCalibrated: null,
    },
    peakHours: (settings.peakHours?.length ? settings.peakHours : DEFAULT_PEAK_HOURS).map((item) => ({ ...item })),
    weekendOffpeak: true,
    credentials: [],
    models,
    collapsed: true,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    legacyPricingImported: false,
  };
}

export function createWalletFromConnection(
  connection: HistoryConnection,
  settings: Settings,
  now = Date.now(),
): WalletConfig | null {
  if (!connection || !connection.endpointId) return null;
  if (isDeepSeekOfficialConnection(connection)) return createDeepSeekWallet(settings, now);
  const sourceType = cleanText(connection.sourceType) || null;
  const label = cleanText(connection.endpointLabel) || (sourceType ? `${sourceType} 接口` : '未命名接入');
  const id = walletIdForEndpoint(connection.endpointId);
  if (!id) return null;
  return {
    id,
    name: label,
    kind: 'relay',
    sourceType,
    endpointId: connection.endpointId,
    endpointLabel: label,
    endpointDisplay: label,
    catalogProvider: defaultCatalogProvider(sourceType),
    balance: {
      mode: 'manual',
      amount: null,
      currency: 'CNY',
      primaryCredentialId: null,
      lastCalibrated: null,
    },
    peakHours: (settings.peakHours?.length ? settings.peakHours : DEFAULT_PEAK_HOURS).map((item) => ({ ...item })),
    weekendOffpeak: false,
    credentials: [],
    models: [],
    collapsed: true,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    legacyPricingImported: true,
  };
}

export function ensureDeepSeekWallet(
  wallets: WalletConfig[],
  settings: Settings,
  now = Date.now(),
): WalletConfig[] {
  const list = Array.isArray(wallets) ? wallets : [];
  const existing = list.find((wallet) => wallet.id === DEEPSEEK_WALLET_ID);
  if (!existing) return [createDeepSeekWallet(settings, now), ...list];
  return list;
}

export function normalizeWallets(raw: unknown, settings: Settings, now = Date.now()): WalletConfig[] {
  const list = Array.isArray(raw)
    ? raw.map((item) => normalizeWallet(item, settings, now)).filter(Boolean) as WalletConfig[]
    : [];
  const map = new Map<string, WalletConfig>();
  for (const wallet of list) map.set(wallet.id, wallet);
  return ensureDeepSeekWallet(Array.from(map.values()), settings, now);
}

export function cloneWallet(wallet: WalletConfig): WalletConfig {
  return {
    ...wallet,
    balance: { ...wallet.balance, query: normalizeBalanceQuery(wallet.balance.query), snapshot: wallet.balance.snapshot ? { ...wallet.balance.snapshot } : undefined },
    peakHours: wallet.peakHours.map((item) => ({ ...item })),
    credentials: wallet.credentials.map((item) => ({ ...item })),
    models: wallet.models.map((item) => ({
      ...item,
      aliases: [...item.aliases],
      price: cloneWalletPriceRule(item.price),
    })),
  };
}

export function observeCredential(
  wallet: WalletConfig,
  credentialId: string | null | undefined,
  credentialLabel: string | null | undefined,
  now = Date.now(),
): boolean {
  const id = cleanText(credentialId);
  if (!id) return false;
  const label = cleanText(credentialLabel) || '未命名密钥';
  const current = wallet.credentials.find((item) => item.id === id);
  if (!current) {
    wallet.credentials.push({ id, label, lastSeen: now });
    return true;
  }
  let changed = false;
  if (label && current.label !== label) {
    current.label = label;
    changed = true;
  }
  if (now > current.lastSeen) {
    current.lastSeen = now;
    changed = true;
  }
  return changed;
}

function normalizeModelKey(value: string): string {
  const key = cleanText(value).replace(/^\[[^\]]+\]/, '').trim().toLowerCase();
  if (key === 'deepseek-v4.1-flash') return 'deepseek-flash';
  if (key === 'deepseek-v4-flash-vision') return 'deepseek-v4-flash-vision-exp';
  return key;
}

export function walletModelMatches(model: WalletModel, requested: string): boolean {
  const target = normalizeModelKey(requested);
  if (!target) return false;
  const candidates = [model.model, model.sourceModel, ...(model.aliases || [])];
  return candidates.some((candidate) => normalizeModelKey(candidate) === target);
}

export function findWalletModel(wallet: WalletConfig | null | undefined, model: string): WalletModel | null {
  if (!wallet || !model) return null;
  for (const item of wallet.models || []) {
    if (walletModelMatches(item, model)) return item;
  }
  return null;
}

export function observeModel(
  wallet: WalletConfig,
  modelName: string,
  now = Date.now(),
): { changed: boolean; model: WalletModel | null } {
  const name = cleanText(modelName);
  if (!name) return { changed: false, model: null };
  const existing = findWalletModel(wallet, name);
  if (existing) {
    let changed = false;
    if (now > existing.lastSeen) {
      existing.lastSeen = now;
      changed = true;
    }
    return { changed, model: existing };
  }
  const created: WalletModel = {
    id: `model:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    sourceModel: name,
    model: name,
    aliases: [],
    contextLimit: builtinContextLimit(name),
    contextLimitManual: false,
    price: emptyWalletPriceRule(),
    source: 'discovered',
    locked: false,
    discoveredAt: now,
    lastSeen: now,
    updatedAt: now,
  };
  wallet.models.push(created);
  return { changed: true, model: created };
}

export function walletBalanceToCny(wallet: WalletConfig, exchangeRate: number): number | null {
  const amount = wallet.balance.amount == null || wallet.balance.amount === ''
    ? NaN
    : parseFloat(String(wallet.balance.amount));
  if (!Number.isFinite(amount)) return null;
  const rate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 1;
  return wallet.balance.currency === 'USD' ? amount * rate : amount;
}

export function cnyToWalletCurrency(value: number, currency: WalletCurrency, exchangeRate: number): number {
  const rate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 1;
  return currency === 'USD' ? value / rate : value;
}

export function walletPendingModelCount(wallet: WalletConfig): number {
  return (wallet.models || []).filter((model) => {
    if (wallet.id === DEEPSEEK_WALLET_ID && model.source === 'builtin') return false;
    return model.price.priceConfigured !== true;
  }).length;
}

export type ExactPricedModelMatch = {
  walletId: string;
  model: string;
};

/** 仅用于旧数据回填：按完整模型名查找已启用计价的模型，不做别名或归一化匹配。 */
export function findExactPricedModelMatch(
  wallets: WalletConfig[],
  model: string,
  ignoredWalletIds: Iterable<string> = [],
): ExactPricedModelMatch | null {
  const requested = String(model || '');
  if (!requested) return null;
  const ignored = new Set(ignoredWalletIds);
  const candidates: Array<ExactPricedModelMatch & { official: number; updatedAt: number }> = [];
  for (const wallet of wallets || []) {
    if (ignored.has(wallet.id)) continue;
    for (const item of wallet.models || []) {
      if (!item.price.priceConfigured || item.model !== requested) continue;
      candidates.push({
        walletId: wallet.id,
        model: item.model,
        official: wallet.id === DEEPSEEK_WALLET_ID ? 1 : 0,
        updatedAt: item.updatedAt || 0,
      });
    }
  }
  const official = (wallets || []).find((wallet) => wallet.id === DEEPSEEK_WALLET_ID);
  if (official && !ignored.has(official.id) && (PRICING as any)[requested]) {
    candidates.push({
      walletId: official.id,
      model: requested,
      official: 1,
      updatedAt: Number.MAX_SAFE_INTEGER,
    });
  }
  candidates.sort((a, b) => b.official - a.official || b.updatedAt - a.updatedAt);
  if (!candidates.length) return null;
  return { walletId: candidates[0].walletId, model: candidates[0].model };
}

export function mergeWalletCollections(local: WalletConfig[], remote: WalletConfig[]): WalletConfig[] {
  const map = new Map<string, WalletConfig>();
  for (const wallet of normalizeWallets(local, {
    peakHours: DEFAULT_PEAK_HOURS,
  } as Settings)) map.set(wallet.id, wallet);
  for (const incoming of remote || []) {
    const current = map.get(incoming.id);
    if (!current || incoming.updatedAt > current.updatedAt) {
      const next = cloneWallet(incoming);
      if (current) {
        const credentialMap = new Map(next.credentials.map((item) => [item.id, item]));
        for (const item of current.credentials) {
          const existing = credentialMap.get(item.id);
          if (!existing || item.lastSeen > existing.lastSeen) credentialMap.set(item.id, { ...item });
        }
        next.credentials = Array.from(credentialMap.values());
        const modelMap = new Map(next.models.map((item) => [item.sourceModel.toLowerCase(), item]));
        for (const item of current.models) {
          const key = item.sourceModel.toLowerCase();
          const existing = modelMap.get(key);
          if (!existing || item.updatedAt > existing.updatedAt) modelMap.set(key, { ...item, aliases: [...item.aliases] });
        }
        next.models = Array.from(modelMap.values());
      }
      map.set(incoming.id, next);
      continue;
    }
    const credentialMap = new Map(current.credentials.map((item) => [item.id, item]));
    for (const item of incoming.credentials) {
      const existing = credentialMap.get(item.id);
      if (!existing || item.lastSeen > existing.lastSeen) credentialMap.set(item.id, { ...item });
    }
    current.credentials = Array.from(credentialMap.values());
    const modelMap = new Map(current.models.map((item) => [item.sourceModel.toLowerCase(), item]));
    for (const item of incoming.models) {
      const key = item.sourceModel.toLowerCase();
      const existing = modelMap.get(key);
      if (!existing || item.updatedAt > existing.updatedAt) modelMap.set(key, { ...item, aliases: [...item.aliases] });
    }
    current.models = Array.from(modelMap.values());
  }
  return Array.from(map.values());
}
