/**
 * 统一仓库 — 单一历史的唯一 储存/调用/修改 入口
 * 已废弃多存档，所有数据归一至 state.history + 聚合字段
 */
import { state, getSelectedSave } from '../store/index';
import { saveHot, loadHot, loadHistoryCold, appendHistoryCold, getAllHistory, saveHistoryCold, clearHistoryCold } from '../store/persistence';
import { calcCost, isDeepSeekOfficialModel, normalizeModel } from '../services/pricing';
import { getWalletExchangeRate } from '../services/currency';
import { MAX_HISTORY, DETAIL_KEEP, PRICING } from '../constants/pricing';
import { emit, DataEvents } from './events';
import type { Snapshot } from './types';
import { defaultSettings } from '../types/settings';
import { isUnsafeKey, isValidDayKey, localDay } from '../utils/date';
import { isTruncatedFinish } from '../utils/finish';
import { log, toast } from '../utils/logger';
import { usageFingerprint } from './fingerprint';
import { computeTokenRate, sanitizeHistoryTiming } from './token-rate';
import { normalizeConnectionEndpoint, type HistoryConnection } from '../services/connection-identity';
import {
  createDeepSeekWallet,
  createWalletFromConnection,
  cloneWalletPriceRule,
  ensureDeepSeekWallet,
  findWalletForConnection,
  findWalletForHistory,
  findExactPricedModelMatch,
  findWalletModel,
  normalizeWalletPriceRule,
  normalizeWallets,
  observeCredential,
  observeModel,
  walletIdForEndpoint,
  isDeepSeekOfficialConnection,
} from './wallets';
import { DEEPSEEK_WALLET_ID, type WalletConfig } from '../types/wallet';
import { migrateLegacyWalletApiKey } from '../services/wallet-secrets';
import { historyRecordKey } from '../utils/history-key';

function getCurrentChatId(): string | null {
  try {
    const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
    if (ctx?.getCurrentChatId) {
      const v = ctx.getCurrentChatId();
      if (typeof v === 'string' && v) return v;
    }
    // 兼容：直接取 characters[this_chid]?.chat
    const chid = (globalThis as any).this_chid;
    const chars = (globalThis as any).characters;
    if (typeof chid === 'number' && Array.isArray(chars) && chars[chid]) {
      const c = chars[chid].chat;
      if (typeof c === 'string' && c) return c;
    }
  } catch {}
  return null;
}

function getCurrentChatName(): string | null {
  const id = getCurrentChatId();
  return id ? String(id) : null;
}

const recentUsageFingerprints = new Map<string, number>();
let storageFailureNotified = false;

function notifyStorageFailure(error: unknown): void {
  log.error('冷历史写入失败', error);
  if (storageFailureNotified) return;
  storageFailureNotified = true;
  toast('warning', '冷历史写入失败，统计可能不完整；请检查浏览器存储空间');
}

function numericPrice(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function legacyCustomPriceRule(custom: any) {
  const normalized = normalizeModel(String(custom?.model || ''));
  const base: any = (PRICING as any)[normalized] || (PRICING as any)['deepseek-flash'];
  return normalizeWalletPriceRule({
    usePeakPricing: custom?.usePeakPricing !== false,
    offpeak: {
      hit: numericPrice(custom?.offpeak?.hit, base.offpeak.hit),
      miss: numericPrice(custom?.offpeak?.miss, base.offpeak.miss),
      output: numericPrice(custom?.offpeak?.output, base.offpeak.output),
    },
    peak: {
      hit: numericPrice(custom?.peak?.hit, base.peak.hit),
      miss: numericPrice(custom?.peak?.miss, base.peak.miss),
      output: numericPrice(custom?.peak?.output, base.peak.output),
    },
    priceConfigured: true,
  });
}

function migrateLegacyPricing(wallet: WalletConfig, customModels: any[]): boolean {
  if (wallet.legacyPricingImported) return false;
  const now = Date.now();
  for (const custom of customModels || []) {
    const sourceModel = String(custom?.model || '').trim();
    if (!sourceModel) continue;
    const existing = findWalletModel(wallet, sourceModel);
    const source = custom?.synced === true ? 'sync' as const : 'manual' as const;
    if (existing) {
      existing.price = legacyCustomPriceRule(custom);
      existing.source = source;
      existing.locked = false;
      existing.updatedAt = now;
    } else {
      wallet.models.push({
        id: `legacy:${sourceModel}`,
        sourceModel,
        model: sourceModel,
        aliases: [],
        price: legacyCustomPriceRule(custom),
        source,
        locked: false,
        discoveredAt: now,
        lastSeen: now,
        updatedAt: now,
      });
    }
  }
  wallet.legacyPricingImported = true;
  wallet.updatedAt = now;
  return true;
}

function migrateLegacyBalance(wallet: WalletConfig): boolean {
  if (wallet.balance.amount != null && String(wallet.balance.amount).trim() !== '') return false;
  const custom = state.customBalance != null && String(state.customBalance).trim() !== ''
    ? String(state.customBalance)
    : (state.balance?.balance != null ? String(state.balance.balance) : '');
  if (!custom) return false;
  wallet.balance.amount = custom;
  wallet.balance.currency = String(state.balance?.currency || '').toUpperCase() === 'USD' ? 'USD' : 'CNY';
  wallet.balance.mode = 'manual';
  wallet.balance.lastCalibrated = Number(state.balance?.timestamp) || null;
  wallet.updatedAt = Date.now();
  return true;
}

function historyConnection(entry: any): HistoryConnection | null {
  if (!entry || (!entry.endpointId && !entry.sourceType)) return null;
  return normalizeConnectionEndpoint({
    sourceType: entry.sourceType ?? null,
    endpointId: entry.endpointId ?? null,
    endpointLabel: entry.endpointLabel ?? null,
    credentialId: entry.credentialId ?? null,
    credentialLabel: entry.credentialLabel ?? null,
  });
}

function ensureWalletForConnection(
  wallets: WalletConfig[],
  ignored: Set<string>,
  connection: HistoryConnection | null,
  now = Date.now(),
): { wallet: WalletConfig | null; changed: boolean } {
  if (!connection || !connection.endpointId) return { wallet: null, changed: false };
  let wallet = findWalletForConnection(wallets, connection);
  let changed = false;
  if (!wallet) {
    const id = isDeepSeekOfficialConnection(connection)
      ? DEEPSEEK_WALLET_ID
      : walletIdForEndpoint(connection.endpointId);
    if (!id || ignored.has(id)) return { wallet: null, changed: false };
    const created = isDeepSeekOfficialConnection(connection)
      ? createDeepSeekWallet(state.settings, now)
      : createWalletFromConnection(connection, state.settings, now);
    if (!created) return { wallet: null, changed: false };
    wallets.push(created);
    wallet = created;
    changed = true;
  }
  if (connection.endpointId && wallet.endpointId !== connection.endpointId && wallet.id !== DEEPSEEK_WALLET_ID) {
    wallet.endpointId = connection.endpointId;
    wallet.updatedAt = now;
    changed = true;
  }
  if (connection.endpointLabel) {
    const label = String(connection.endpointLabel).trim();
    if (label && (!wallet.endpointLabel || wallet.endpointLabel !== label)) {
      wallet.endpointLabel = label;
      wallet.endpointDisplay = label;
      if (!wallet.legacyPricingImported || wallet.name === wallet.endpointLabel) wallet.name = label;
      wallet.updatedAt = now;
      changed = true;
    }
  }
  if (observeCredential(wallet, connection.credentialId, connection.credentialLabel, now)) {
    wallet.updatedAt = now;
    changed = true;
  }
  return { wallet, changed };
}

function refreshBuiltinWalletModels(wallet: WalletConfig, now = Date.now()): boolean {
  if (wallet.id !== DEEPSEEK_WALLET_ID) return false;
  let changed = false;
  const defaults = createDeepSeekWallet(state.settings, wallet.createdAt || now);
  for (const builtin of defaults.models) {
    const existing = wallet.models.find((item) => item.sourceModel === builtin.sourceModel);
    if (!existing) {
      wallet.models.push(builtin);
      changed = true;
      continue;
    }
    if (existing.source !== 'builtin' || existing.locked) continue;
    if (JSON.stringify(existing.price) !== JSON.stringify(builtin.price)) {
      existing.price = builtin.price;
      existing.updatedAt = now;
      changed = true;
    }
  }
  return changed;
}

function migrateHistoryModels(entries: any[]): boolean {
  let changed = false;
  for (const entry of entries || []) {
    if (!entry || typeof entry.model !== 'string') continue;
    const normalized = normalizeModel(entry.model);
    if (normalized === entry.model) continue;
    if (entry.rawModel == null) entry.rawModel = entry.model;
    entry.model = normalized;
    changed = true;
  }
  return changed;
}

function mergeWalletConfiguration(
  duplicate: WalletConfig,
  target: WalletConfig,
  now = Date.now(),
): boolean {
  let changed = false;
  if ((target.balance.amount == null || String(target.balance.amount).trim() === '')
    && duplicate.balance.amount != null
    && String(duplicate.balance.amount).trim() !== '') {
    target.balance.amount = duplicate.balance.amount;
    target.balance.currency = duplicate.balance.currency;
    target.balance.mode = duplicate.balance.mode;
    target.balance.lastCalibrated = duplicate.balance.lastCalibrated;
    changed = true;
  }
  if (!target.balance.primaryCredentialId && duplicate.balance.primaryCredentialId) {
    target.balance.primaryCredentialId = duplicate.balance.primaryCredentialId;
    changed = true;
  }
  for (const credential of duplicate.credentials || []) {
    if (observeCredential(target, credential.id, credential.label, credential.lastSeen || now)) changed = true;
  }
  for (const model of duplicate.models || []) {
    if (!model.price?.priceConfigured || (model.source !== 'manual' && model.source !== 'sync')) continue;
    const existing = findWalletModel(target, model.sourceModel) || findWalletModel(target, model.model);
    if (!existing) {
      target.models.push({
        ...model,
        id: `legacy-official:${model.id}`,
        aliases: [...(model.aliases || [])],
        price: cloneWalletPriceRule(model.price),
      });
      changed = true;
      continue;
    }
    if (existing.source !== 'manual' || model.source === 'manual') {
      existing.price = cloneWalletPriceRule(model.price);
      existing.source = model.source;
      existing.locked = model.locked === true;
      existing.aliases = Array.from(new Set([...(existing.aliases || []), ...(model.aliases || [])]));
      existing.updatedAt = now;
      changed = true;
    }
  }
  if (!target.catalogProvider && duplicate.catalogProvider) {
    target.catalogProvider = duplicate.catalogProvider;
    changed = true;
  }
  if (!target.lastUsedAt || (duplicate.lastUsedAt || 0) > target.lastUsedAt) {
    target.lastUsedAt = duplicate.lastUsedAt || target.lastUsedAt;
    changed = true;
  }
  if (changed) target.updatedAt = now;
  return changed;
}

function migrateWalletEndpoints(ignored: Set<string>, now = Date.now()): boolean {
  const byEndpoint = new Map<string, WalletConfig>();
  const next: WalletConfig[] = [];
  const duplicateIds = new Set<string>();
  let changed = false;

  for (const wallet of state.wallets) {
    if (wallet.id === DEEPSEEK_WALLET_ID) {
      next.push(wallet);
      if (wallet.endpointId) byEndpoint.set(wallet.endpointId, wallet);
      continue;
    }
    const oldEndpointLabel = wallet.endpointLabel;
    const oldEndpointDisplay = wallet.endpointDisplay;
    const normalized = normalizeConnectionEndpoint({
      sourceType: wallet.sourceType,
      endpointId: wallet.endpointId,
      endpointLabel: wallet.endpointLabel,
      credentialId: null,
      credentialLabel: null,
    });
    if (!normalized?.endpointId) {
      next.push(wallet);
      continue;
    }
    if (wallet.endpointId !== normalized.endpointId || wallet.endpointLabel !== normalized.endpointLabel) {
      wallet.endpointId = normalized.endpointId;
      wallet.endpointLabel = normalized.endpointLabel ?? null;
      wallet.endpointDisplay = normalized.endpointLabel ?? null;
      if (wallet.name === oldEndpointLabel || wallet.name === oldEndpointDisplay) wallet.name = normalized.endpointLabel || wallet.name;
      wallet.updatedAt = now;
      changed = true;
    }
    const existing = byEndpoint.get(wallet.endpointId);
    if (!existing) {
      byEndpoint.set(wallet.endpointId, wallet);
      next.push(wallet);
      continue;
    }
    const preferCurrent = ignored.has(existing.id) && !ignored.has(wallet.id);
    const target = preferCurrent ? wallet : existing;
    const duplicate = preferCurrent ? existing : wallet;
    if (preferCurrent) {
      const index = next.indexOf(existing);
      if (index >= 0) next[index] = wallet;
      byEndpoint.set(wallet.endpointId, wallet);
    }
    if (mergeWalletConfiguration(duplicate, target, now)) changed = true;
    duplicateIds.add(duplicate.id);
    changed = true;
  }

  state.wallets = next;
  if (duplicateIds.size) {
    state.walletIgnored = state.walletIgnored.filter((id) => !duplicateIds.has(id));
    for (const id of duplicateIds) ignored.delete(id);
  }
  return changed;
}

function migrateWallets(hot: any, cold: any[] = []): boolean {
  const now = Date.now();
  const normalized = normalizeWallets(state.wallets, state.settings, now);
  let changed = normalized !== state.wallets;
  state.wallets = normalized;
  state.walletIgnored = Array.isArray(state.walletIgnored)
    ? Array.from(new Set(state.walletIgnored.map((id) => String(id || '').trim()).filter(Boolean)))
    : [];
  const ignored = new Set(state.walletIgnored);
  const official = state.wallets.find((wallet) => wallet.id === DEEPSEEK_WALLET_ID)
    || createDeepSeekWallet(state.settings, now);
  if (!state.wallets.some((wallet) => wallet.id === official.id)) state.wallets.unshift(official);
  changed = migrateLegacyPricing(official, state.settings.customModels || []) || changed;
  changed = migrateLegacyBalance(official) || changed;
  changed = refreshBuiltinWalletModels(official, now) || changed;
  migrateLegacyWalletApiKey(official.id);
  changed = migrateWalletEndpoints(ignored, now) || changed;
  const allHistory = [...(cold || []), ...(state.history || [])];
  changed = migrateHistoryModels(allHistory) || changed;
  for (const entry of allHistory) {
    const connection = historyConnection(entry);
    if (!connection) continue;
    if (entry.endpointId !== connection.endpointId || entry.endpointLabel !== connection.endpointLabel) {
      entry.endpointId = connection.endpointId;
      entry.endpointLabel = connection.endpointLabel;
      changed = true;
    }
    const observed = ensureWalletForConnection(state.wallets, ignored, connection, Number(entry.timestamp) || now);
    if (observed.changed) changed = true;
    if (!observed.wallet) continue;
    if (observed.wallet.id !== entry.walletId) {
      entry.walletId = observed.wallet.id;
      changed = true;
    }
    if (shouldTrackWalletModel(observed.wallet, String(entry.model || ''))) {
      const model = observeModel(observed.wallet, String(entry.model || ''), Number(entry.timestamp) || now);
      if (model.model && model.model.price.priceConfigured !== true) {
        const legacy = (state.settings.customModels || []).find((custom: any) => {
          try {
            return normalizeModel(String(custom?.model || '')) === normalizeModel(String(entry.model || ''))
              || String(custom?.model || '') === String(entry.model || '');
          } catch {
            return false;
          }
        });
        if (legacy) {
          model.model.price = legacyCustomPriceRule(legacy);
          model.model.source = legacy.synced === true ? 'sync' : 'manual';
          model.model.updatedAt = Number(entry.timestamp) || now;
          model.changed = true;
        }
      }
      if (model.changed) {
        observed.wallet.updatedAt = now;
        changed = true;
      }
    }
    if (!observed.wallet.lastUsedAt || Number(entry.timestamp) > observed.wallet.lastUsedAt) {
      observed.wallet.lastUsedAt = Number(entry.timestamp) || now;
      changed = true;
    }
  }
  const backfillDone = Number(hot?._walletPricingBackfillVersion || 0) >= WALLET_PRICING_BACKFILL_VERSION;
  if (!backfillDone) {
    changed = backfillLegacyExactPricing(allHistory) || changed;
    if (hot && typeof hot === 'object') hot._walletPricingBackfillVersion = WALLET_PRICING_BACKFILL_VERSION;
    changed = true;
  }
  if (hot && Array.isArray(hot.wallets) && state.wallets.length === 0) {
    state.wallets = normalizeWallets(hot.wallets, state.settings, now);
    changed = true;
  }
  return changed;
}

const WALLET_PRICING_BACKFILL_VERSION = 1;

function recalcEntryCost(entry: any, wallet: WalletConfig | null) {
  const legacyWallet = entry?.legacyPricingWalletId
    ? state.wallets.find((item) => item.id === entry.legacyPricingWalletId) || null
    : null;
  return calcCost({
    timestamp: entry.timestamp,
    model: entry.model,
    prompt_cache_hit_tokens: entry.cache_hit_tokens || 0,
    prompt_cache_miss_tokens: entry.cache_miss_tokens || 0,
    completion_tokens: entry.completion_tokens || 0,
  }, state.settings as any, legacyWallet || wallet);
}

function applyCostPatch(entry: any, cost: ReturnType<typeof calcCost>): void {
  entry.input_cost = cost.input;
  entry.output_cost = cost.output;
  entry.cost = cost.total;
  entry.priceType = cost.priceType;
  entry.pricingSource = entry.legacyPricingWalletId ? 'legacy-match' : cost.source;
}

function applyTotalDelta(previous: { input: number; output: number; total: number }, next: { input: number; output: number; total: number }): void {
  state.input_cost += (next.input || 0) - (previous.input || 0);
  state.output_cost += (next.output || 0) - (previous.output || 0);
  state.total_cost += (next.total || 0) - (previous.total || 0);
}

function aggregateHistory(entries: any[]): {
  total_tokens: number;
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
  cache_hit_tokens: number;
  cache_miss_tokens: number;
  input_cost: number;
  output_cost: number;
  rounds: number;
} {
  const result = {
    total_tokens: 0,
    total_cost: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_hit_tokens: 0,
    cache_miss_tokens: 0,
    input_cost: 0,
    output_cost: 0,
    rounds: 0,
  };
  for (const entry of entries || []) {
    result.total_tokens += Number(entry?.total_tokens) || 0;
    result.total_cost += Number(entry?.cost) || 0;
    result.cache_hit_tokens += Number(entry?.cache_hit_tokens) || 0;
    result.cache_miss_tokens += Number(entry?.cache_miss_tokens) || 0;
    result.input_tokens += (Number(entry?.cache_hit_tokens) || 0) + (Number(entry?.cache_miss_tokens) || 0);
    result.output_tokens += Number(entry?.completion_tokens) || 0;
    result.input_cost += Number(entry?.input_cost) || 0;
    result.output_cost += Number(entry?.output_cost) || 0;
    if (isDeepSeekOfficialModel(entry?.model)) result.rounds += 1;
  }
  return result;
}

function applyAggregate(next: ReturnType<typeof aggregateHistory>): void {
  state.total_tokens = next.total_tokens;
  state.total_cost = next.total_cost;
  state.input_tokens = next.input_tokens;
  state.output_tokens = next.output_tokens;
  state.cache_hit_tokens = next.cache_hit_tokens;
  state.cache_miss_tokens = next.cache_miss_tokens;
  state.input_cost = next.input_cost;
  state.output_cost = next.output_cost;
  state.rounds = next.rounds;
}

async function rebuildAggregates(): Promise<void> {
  const cold = await loadHistoryCold();
  const merged = [...(state.history || []), ...cold].sort((a: any, b: any) => b.timestamp - a.timestamp);
  const keyOf = historyRecordKey;
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const entry of merged) {
    const key = keyOf(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }
  applyAggregate(aggregateHistory(unique));
}

function shouldTrackWalletModel(wallet: WalletConfig, model: string): boolean {
  if (wallet.id !== DEEPSEEK_WALLET_ID) return true;
  try {
    return !(PRICING as any)[normalizeModel(model)];
  } catch {
    return true;
  }
}

function backfillLegacyExactPricing(allHistory: any[]): boolean {
  let changed = false;
  const ignored = new Set(state.walletIgnored || []);
  for (const entry of allHistory || []) {
    if (!entry || entry.legacyPricingWalletId) continue;
    const sourceWallet = findWalletForHistory(state.wallets, entry);
    if (!sourceWallet) continue;
    const current = calcCost({
      timestamp: entry.timestamp,
      model: entry.model,
      prompt_cache_hit_tokens: entry.cache_hit_tokens || 0,
      prompt_cache_miss_tokens: entry.cache_miss_tokens || 0,
      completion_tokens: entry.completion_tokens || 0,
    }, state.settings as any, sourceWallet);
    if (current.source !== 'unpriced') continue;
    const match = findExactPricedModelMatch(state.wallets, String(entry.model || ''), ignored);
    if (!match || match.walletId === sourceWallet.id) continue;
    entry.legacyPricingWalletId = match.walletId;
    entry.legacyPricingModel = match.model;
    const previous = {
      input: Number(entry.input_cost) || 0,
      output: Number(entry.output_cost) || 0,
      total: Number(entry.cost) || 0,
    };
    const matchedWallet = state.wallets.find((wallet) => wallet.id === match.walletId) || null;
    const cost = recalcEntryCost(entry, matchedWallet);
    applyCostPatch(entry, cost);
    applyTotalDelta(previous, cost);
    changed = true;
  }
  return changed;
}

export function getFilteredHistoryForScope(): any[] {
  const scope = (state.settings as any).historyScope || 'all';
  if (scope !== 'current') return state.history || [];
  const cur = getCurrentChatId();
  if (!cur) return state.history || [];
  return (state.history || []).filter((h: any) => h.chatId === cur);
}

export type HistoryDeleteFilter = {
  start?: string;
  end?: string;
  model?: string;
  chat?: string;
};

// 归一化设置：只接受已知设置键，防止历史/余额等字段污染（如误将整个 state 存入 settings），并清洗非法值
function normalizeSettings(incoming: any): any {
  const def: any = defaultSettings();
  const src: any = (incoming && typeof incoming === 'object') ? incoming : {};
  const merged: any = { ...def };
  for (const k of Object.keys(def)) {
    if (src[k] !== undefined) merged[k] = src[k];
  }
  merged.webdav = { ...def.webdav, ...(src.webdav || {}) };
  merged.pricingSync = { ...def.pricingSync, ...(src.pricingSync || {}) };
  if (!isFinite(parseFloat(String(merged.pricingSync.exchangeRate))) || parseFloat(String(merged.pricingSync.exchangeRate)) <= 0) merged.pricingSync.exchangeRate = 7.2;
  if (typeof merged.pricingSync.showSyncedModels !== 'boolean') merged.pricingSync.showSyncedModels = false;
  if (!isFinite(parseFloat(String(merged.pricingSync.syncedMarkVersion)))) merged.pricingSync.syncedMarkVersion = 0;
  if (!Array.isArray(merged.peakHours) || !merged.peakHours.length) merged.peakHours = def.peakHours;
  merged.extraOffDays = Array.isArray(merged.extraOffDays)
    ? Array.from(new Set(merged.extraOffDays.filter((day: any) => isValidDayKey(day)))).sort()
    : def.extraOffDays;
  if (!Array.isArray(merged.customModels)) merged.customModels = def.customModels;
  if (!merged.historyScope) merged.historyScope = def.historyScope;
  if (!merged.theme) merged.theme = def.theme;
  if (typeof merged.modelsPricingCollapsed !== 'boolean') merged.modelsPricingCollapsed = true;
  if (!Array.isArray(merged.overviewFour) || (merged.overviewFour.length !== 8 && merged.overviewFour.length !== 4)) merged.overviewFour = def.overviewFour;
  if (Array.isArray(merged.overviewFour) && merged.overviewFour.length === 4) {
    merged.overviewFour = [...merged.overviewFour, ...def.overviewFour.slice(4)];
  }
  try {
    const valid = new Set(['avg_cost','avg_tokens','avg_duration','avg_rate','avg_ttft','avg_input_cost','avg_input_tokens','avg_output_cost','avg_output_tokens','avg_think_time','avg_think_tokens','avg_hit_rate','latest_hit_rate','max_output','max_input','max_total','avg_think_ratio','truncation_rate']);
    if (Array.isArray(merged.overviewFour)) merged.overviewFour = merged.overviewFour.map((k:any)=> valid.has(k)?k:'avg_cost');
    if (merged.overviewFour.length !== 8) merged.overviewFour = def.overviewFour;
    if (!Array.isArray(merged.statsFour) || merged.statsFour.length !== 4) merged.statsFour = def.statsFour;
    const validStats = new Set(['avg_cost','avg_tokens','avg_duration','avg_rate','avg_ttft','avg_input_cost','avg_input_tokens','avg_output_cost','avg_output_tokens','avg_think_time','avg_think_tokens','avg_think_ratio','truncation_rate','avg_hit_rate','latest_hit_rate','max_output','max_input','max_total']);
    if (Array.isArray(merged.statsFour)) merged.statsFour = merged.statsFour.map((k:any)=> validStats.has(k)?k:'avg_cost');
    if (merged.statsFour.length !== 4) merged.statsFour = def.statsFour;
  } catch {}
  return merged;
}

function sanitizeFullRequest(fr: any): any {
  if (!fr || typeof fr !== 'object') return fr;
  const keep: any = {};
  for (const k of ['model','stream','temperature','max_tokens','top_p','stream_options','chat_completion_source','endpoint']) {
    if (fr[k] !== undefined) keep[k] = fr[k];
  }
  if (Array.isArray(fr.messages)) keep.messages_length = fr.messages.length;
  else if (typeof fr.messages_length === 'number') keep.messages_length = fr.messages_length;
  else if (typeof fr.messages === 'number') keep.messages_length = fr.messages;
  return keep;
}

function clampMessage(m: any): any {
  if (!m || typeof m !== 'object') return m;
  const c = typeof m.content === 'string'
    ? (m.content.length > 600 ? m.content.slice(0, 600) + '…[截断]' : m.content)
    : m.content;
  return { ...m, content: c };
}

// 限制完整响应落盘大小，避免 settings.json 被超大 SSE 文本撑爆
const RESPONSE_KEEP = 200000;
function clampResponse(resp: any): any {
  if (resp == null) return null;
  if (typeof resp === 'string') {
    return resp.length > RESPONSE_KEEP ? resp.slice(0, RESPONSE_KEEP) + '\n…[响应过长已截断]' : resp;
  }
  try {
    const s = JSON.stringify(resp);
    if (s.length > RESPONSE_KEEP) return s.slice(0, RESPONSE_KEEP) + '\n…[响应过长已截断]';
  } catch {}
  return resp;
}

function pruneDetails() {
  if (!state.history || !state.history.length) return;
  const hs = [...state.history].sort((a: any, b: any) => b.timestamp - a.timestamp);
  for (let i = 0; i < hs.length; i++) {
    const e: any = hs[i];
    if (i >= DETAIL_KEEP) {
      delete e.messages;
      delete e.fullRequest;
      delete e.fullResponse;
    } else {
      // 保留前 DETAIL_KEEP 条的完整响应/请求；fullRequest 裁剪 messages 防止大对象落盘
      if (e.fullRequest && typeof e.fullRequest === 'object' && Array.isArray(e.fullRequest.messages)) {
        e.fullRequest = sanitizeFullRequest(e.fullRequest);
      }
    }
  }
}

function persist() {
  pruneDetails();
  // 剥离隐私大字段，防止对话全文落盘到 settings.json
  let safeLastUsage: any = state.lastUsage;
  if (safeLastUsage) {
    try {
      const c: any = { ...safeLastUsage };
      delete c.messages;
      delete c.fullRequest;
      delete c.fullResponse;
      // raw_usage 保留但去除可能的大对象
      safeLastUsage = c;
    } catch {}
  }
  saveHot({
    history: state.history,
    total_tokens: state.total_tokens,
    total_cost: state.total_cost,
    input_tokens: state.input_tokens,
    output_tokens: state.output_tokens,
    cache_hit_tokens: state.cache_hit_tokens,
    cache_miss_tokens: state.cache_miss_tokens,
    input_cost: state.input_cost,
    output_cost: state.output_cost,
    rounds: state.rounds,
    startTime: state.startTime,
    settings: state.settings,
    balance: state.balance,
    customBalance: state.customBalance,
    wallets: state.wallets,
    walletIgnored: state.walletIgnored,
    messageCount: state.messageCount,
    lastUsage: safeLastUsage,
  });
  emit(DataEvents.UPDATED);
}

export const repository = {
  snapshot(): Snapshot {
    return {
      saves: {} as any,
      currentSave: null as any,
      settings: state.settings,
      balance: state.balance,
      customBalance: state.customBalance,
      wallets: state.wallets,
      walletIgnored: state.walletIgnored,
      messageCount: state.messageCount,
      lastUsage: state.lastUsage,
      history: state.history as any,
      total_tokens: state.total_tokens as any,
      total_cost: state.total_cost as any,
    } as any;
  },

  getAggregated() { return getSelectedSave(); },

  getHistoryByRange(range: { start: string; end: string }) {
    const s: any = getSelectedSave();
    if (!s?.history) return [];
    const toDay = (ts: number) => { const d = new Date(ts); const pad=(n:number)=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
    return s.history.filter((h: any) => {
      const k = toDay(h.timestamp);
      return k >= range.start && k <= range.end;
    });
  },

  async getColdHistory() { return loadHistoryCold(); },

  async getAllHistory() { return getAllHistory(); },

  async deleteHistoryByFilter(filter: HistoryDeleteFilter = {}): Promise<number> {
    const start = filter.start && isValidDayKey(filter.start) ? filter.start : '';
    const end = filter.end && isValidDayKey(filter.end) ? filter.end : '';
    const model = String(filter.model || '').trim();
    const chat = String(filter.chat || '').trim();
    const all = await getAllHistory();
    const remains = (all || []).filter((entry: any) => {
      if (!entry) return false;
      if (start || end) {
        const day = localDay(entry.timestamp);
        if (start && day < start) return true;
        if (end && day > end) return true;
      }
      if (model && String(entry.model || '') !== model) return true;
      if (chat) {
        const chatId = String(entry.chatId || '');
        const chatName = String(entry.chatName || '');
        if (chatId !== chat && chatName !== chat) return true;
      }
      return false;
    });
    const removed = Math.max(0, (all || []).length - remains.length);
    if (!removed) return 0;
    await this.replaceAll({ history: remains } as any, { clearCold: true });
    await this.recalcAll();
    await rebuildAggregates();
    persist();
    emit(DataEvents.UPDATED);
    return removed;
  },

  getWallets(): WalletConfig[] {
    return state.wallets || [];
  },

  getWallet(walletId: string): WalletConfig | null {
    return (state.wallets || []).find((wallet) => wallet.id === walletId) || null;
  },

  getIgnoredWalletIds(): string[] {
    return [...(state.walletIgnored || [])];
  },

  replaceWallets(next: WalletConfig[], ignored?: string[]): void {
    state.wallets = ensureDeepSeekWallet(normalizeWallets(next, state.settings, Date.now()), state.settings, Date.now());
    if (ignored !== undefined) {
      state.walletIgnored = Array.from(new Set(ignored.map((id) => String(id || '').trim()).filter((id) => id && id !== DEEPSEEK_WALLET_ID)));
    }
    persist();
    emit(DataEvents.SETTINGS_CHANGED);
  },

  updateWallet(walletId: string, updater: (wallet: WalletConfig) => void): WalletConfig | null {
    const wallet = (state.wallets || []).find((item) => item.id === walletId);
    if (!wallet) return null;
    updater(wallet);
    wallet.updatedAt = Date.now();
    persist();
    emit(DataEvents.SETTINGS_CHANGED);
    return wallet;
  },

  setWalletIgnored(walletId: string, ignored: boolean): boolean {
    if (!walletId || walletId === DEEPSEEK_WALLET_ID) return false;
    if (ignored) {
      if (!state.walletIgnored.includes(walletId)) state.walletIgnored.push(walletId);
    } else {
      state.walletIgnored = state.walletIgnored.filter((id) => id !== walletId);
    }
    persist();
    emit(DataEvents.SETTINGS_CHANGED);
    return true;
  },

  setWalletBalance(walletId: string, amount: string | null, currency: 'CNY' | 'USD' = 'CNY', calibrated = false): WalletConfig | null {
    return this.updateWallet(walletId, (wallet) => {
      wallet.balance.amount = amount == null || String(amount).trim() === '' ? null : String(amount);
      wallet.balance.currency = currency === 'USD' ? 'USD' : 'CNY';
      wallet.balance.mode = calibrated ? 'auto' : 'manual';
      if (calibrated) wallet.balance.lastCalibrated = Date.now();
    });
  },

  recalcEntryWallet(entry: any): WalletConfig | null {
    return findWalletForHistory(state.wallets, entry);
  },

  addEntry(
    usage: any,
    model: string,
    messages: any[],
    startTime: number,
    fullRequest?: any,
    fullResponse?: any,
    ttft = 0,
    thinkTime = 0,
    finishReason: string | null = null,
    connection: HistoryConnection | null = null,
    requestId: string | null = null,
    streamed: boolean | null = null,
  ) {
    messages = messages || [];
    if (!model) try { model = (globalThis as any).SillyTavern?.getContext?.().model || 'deepseek-v4-flash'; } catch { model = 'deepseek-v4-flash'; }
    const rawModel = String(model);
    model = normalizeModel(rawModel);
    log.debug('addEntry 收到', { model, hasMessages: !!messages?.length });
    // 容错：拒绝数字/空对象导致的 0 token 污染条目
    if (!usage || typeof usage !== 'object' || Array.isArray(usage)) {
      log.debug('addEntry 跳过：usage 非对象 model=' + model);
      return null as any;
    }
    const hasAnyTokenField =
      typeof usage.prompt_tokens === 'number' ||
      typeof usage.completion_tokens === 'number' ||
      typeof usage.total_tokens === 'number' ||
      typeof usage.input_tokens === 'number' ||
      typeof usage.output_tokens === 'number' ||
      typeof usage.prompt_cache_hit_tokens === 'number' ||
      (usage.prompt_tokens_details && typeof usage.prompt_tokens_details.cached_tokens === 'number');
    if (!hasAnyTokenField) {
      log.debug('addEntry 跳过：无 token 字段 model=' + model);
      return null as any;
    }
    let hit = usage.prompt_cache_hit_tokens || 0;
    if (!hit && usage.prompt_tokens_details?.cached_tokens) hit = usage.prompt_tokens_details.cached_tokens;
    let miss = usage.prompt_cache_miss_tokens;
    if (miss === undefined || miss === null) { miss = (usage.prompt_tokens || usage.input_tokens || 0) - hit; if (miss < 0) miss = 0; }
    const comp = usage.completion_tokens || usage.output_tokens || 0;
    const total = usage.total_tokens || hit + miss + comp;
    // 若解析后仍全 0，视为无效数据，不写入历史
    if (hit === 0 && miss === 0 && comp === 0 && total === 0) {
      log.debug('addEntry 跳过：全 0 token model=' + model);
      return null as any;
    }
    log.debug('addEntry 解析', { model, hit, miss, comp, total });
    const fr = finishReason ?? (usage as any)?.__finish_reason ?? (usage as any)?.finish_reason ?? null;
    const nowTs = Date.now();
    let wallet: WalletConfig | null = null;
    try {
      const observed = ensureWalletForConnection(
        state.wallets,
        new Set(state.walletIgnored || []),
        connection,
        nowTs,
      );
      wallet = observed.wallet;
      if (wallet) {
        if (shouldTrackWalletModel(wallet, model)) {
          const modelObservation = observeModel(wallet, model, nowTs);
          if (modelObservation.changed) wallet.updatedAt = nowTs;
          if (
            modelObservation.model?.source === 'discovered'
            && modelObservation.model.price.priceConfigured !== true
            && (state.settings as any).pricingSync?.enabled
          ) {
            try {
              import('../services/pricing-sync')
                .then((module) => module.syncPricingFromModelsDev({ silent: true }))
                .then(() => this.recalcWallet(wallet!.id))
                .catch(() => {});
            } catch {}
          }
        }
        wallet.lastUsedAt = nowTs;
      }
    } catch {}
    // 同一请求的 fetch 与 GENERATION_ENDED 双路径去重；无请求标识时不去重，避免误删合法重复请求。
    try {
      const now = Date.now();
      const fp = requestId
        ? usageFingerprint(model, total, hit, miss, comp, connection, requestId)
        : `anonymous:${now}:${Math.random().toString(36).slice(2)}`;
      const lastFpTime = recentUsageFingerprints.get(fp);
      if (requestId && lastFpTime && now - lastFpTime < 5000) {
        // 重复记录：主路径先写入时缺完整响应/finish_reason，fetch 后解析到则回填
        try {
          const head: any = requestId
            ? state.history.find((entry: any) => entry.requestId === requestId) || state.history[0]
            : state.history[0];
          if (head) {
            let changed = false;
            if (fullResponse && !head.fullResponse) { head.fullResponse = clampResponse(fullResponse); changed = true; }
            if (fr && !head.finishReason) { head.finishReason = fr; head.isTruncated = isTruncatedFinish(fr); changed = true; }
            const estThink = usage?.completion_tokens_details?.reasoning_tokens || (usage as any)?.__think_tokens_est || 0;
            if (estThink && !head.thinkTokens) { head.thinkTokens = estThink; changed = true; }
            if (ttft && !head.ttft) {
              // 非流式/假流式：TTFT 与速率均不可信，一并归零
              if (streamed === false) {
                head.ttft = 0;
                head.tokenRate = 0;
                head.streamed = false;
              } else {
                head.ttft = ttft;
                const dur = head.duration || 0;
                head.tokenRate = computeTokenRate({ duration: dur, ttft, completionTokens: head.completion_tokens || 0, streamed });
                if (streamed != null) head.streamed = streamed;
              }
              changed = true;
            } else if (streamed === false && !head.streamed) {
              head.ttft = 0;
              head.tokenRate = 0;
              head.streamed = false;
              changed = true;
            }
            if (thinkTime && !head.thinkTime) { head.thinkTime = thinkTime; changed = true; }
            if (connection) {
              for (const key of ['sourceType', 'endpointId', 'endpointLabel', 'credentialId', 'credentialLabel'] as const) {
                if (!head[key] && connection[key]) { head[key] = connection[key]; changed = true; }
              }
            }
            if (wallet && !head.walletId) {
              head.walletId = wallet.id;
              changed = true;
            }
            if (changed) {
              if ((state.lastUsage as any)?.timestamp === head.timestamp) {
                if (head.fullResponse) (state.lastUsage as any).fullResponse = head.fullResponse;
                if (head.finishReason) { (state.lastUsage as any).finishReason = head.finishReason; (state.lastUsage as any).isTruncated = head.isTruncated; }
                if (head.ttft) { (state.lastUsage as any).ttft = head.ttft; (state.lastUsage as any).tokenRate = head.tokenRate; }
                if (head.thinkTime) (state.lastUsage as any).thinkTime = head.thinkTime;
                if (head.thinkTokens) (state.lastUsage as any).thinkTokens = head.thinkTokens;
                if (head.sourceType) (state.lastUsage as any).sourceType = head.sourceType;
                if (head.endpointId) (state.lastUsage as any).endpointId = head.endpointId;
                if (head.endpointLabel) (state.lastUsage as any).endpointLabel = head.endpointLabel;
                if (head.credentialId) (state.lastUsage as any).credentialId = head.credentialId;
                if (head.credentialLabel) (state.lastUsage as any).credentialLabel = head.credentialLabel;
              }
              persist();
            }
          }
        } catch {}
        log.debug('addEntry 去重跳过(5s指纹)', { fp });
        return null as any;
      }
      recentUsageFingerprints.set(fp, now);
      for (const [key, timestamp] of recentUsageFingerprints) {
        if (now - timestamp > 30000) recentUsageFingerprints.delete(key);
      }
    } catch {}
    const lu: any = { timestamp: Date.now(), model, rawModel: rawModel !== model ? rawModel : null, prompt_tokens: hit + miss, prompt_cache_hit_tokens: hit, prompt_cache_miss_tokens: miss, completion_tokens: comp, total_tokens: total };
    const duration = startTime ? Date.now() - startTime : 0;
    const thinkTokens = usage.completion_tokens_details?.reasoning_tokens || (usage as any)?.__think_tokens_est || 0;
    lu.duration = duration;
    // 非流式/假流式：TTFT 不可信（等于总耗时），速率分母塌缩会算出假速率，两者一并归零
    const nonStreamed = streamed === false;
    lu.streamed = streamed;
    lu.tokenRate = nonStreamed ? 0 : computeTokenRate({ duration, ttft: ttft || 0, completionTokens: comp, streamed });
    lu.ttft = nonStreamed ? 0 : (ttft || 0); lu.thinkTime = thinkTime || 0; lu.thinkTokens = thinkTokens;
    // 截断检测：非正常 finish_reason（length / content_filter / sensitive 等）
    lu.finishReason = fr; (lu as any).isTruncated = isTruncatedFinish(fr);
    lu.messages = (messages || []).map(clampMessage);
    const c: any = calcCost({ timestamp: lu.timestamp, model, prompt_cache_hit_tokens: hit, prompt_cache_miss_tokens: miss, completion_tokens: comp }, state.settings as any, wallet);
    lu.cost = c.total; lu.input_cost = c.input; lu.output_cost = c.output; lu.priceType = c.priceType;
    lu.walletId = wallet?.id ?? null;
    lu.pricingSource = c.source;
    const safeResponse = clampResponse(fullResponse);
    lu.raw_usage = usage; lu.fullRequest = fullRequest; lu.fullResponse = safeResponse;
    // 记录所属对话，便于按对话过滤
    const chatId = getCurrentChatId();
    const chatName = getCurrentChatName();
    (lu as any).chatId = chatId; (lu as any).chatName = chatName;
    lu.requestId = requestId;
    if (connection) {
      lu.sourceType = connection.sourceType;
      lu.endpointId = connection.endpointId;
      lu.endpointLabel = connection.endpointLabel;
      lu.credentialId = connection.credentialId;
      lu.credentialLabel = connection.credentialLabel;
    }
    state.lastUsage = lu;

    const fr2 = fr;
    const entry: any = {
      timestamp: lu.timestamp, model, rawModel: rawModel !== model ? rawModel : null, prompt_tokens: hit + miss, cache_hit_tokens: hit, cache_miss_tokens: miss,
      requestId,
      completion_tokens: comp, total_tokens: total, input_cost: lu.input_cost, output_cost: lu.output_cost,
      cost: lu.cost, cache_hit_rate: (hit + miss) > 0 ? (hit / (hit + miss) * 100) : 0, priceType: lu.priceType,
      raw_usage: usage, messages: (messages || []).map(clampMessage), duration, ttft: lu.ttft, thinkTime, thinkTokens, tokenRate: lu.tokenRate, fullRequest, fullResponse: safeResponse,
      finishReason: fr2, isTruncated: isTruncatedFinish(fr2),
      streamed,
      chatId, chatName,
      sourceType: connection?.sourceType ?? null,
      endpointId: connection?.endpointId ?? null,
      endpointLabel: connection?.endpointLabel ?? null,
      credentialId: connection?.credentialId ?? null,
      credentialLabel: connection?.credentialLabel ?? null,
      walletId: wallet?.id ?? null,
      pricingSource: c.source,
    };
    log.debug('addEntry 即将写入', { model: entry.model, total: entry.total_tokens });
    state.history.unshift(entry);
    state.total_tokens += total; state.total_cost += lu.cost; state.input_tokens += hit + miss; state.output_tokens += comp;
    state.cache_hit_tokens += hit; state.cache_miss_tokens += miss; state.input_cost += lu.input_cost; state.output_cost += lu.output_cost;
    if (isDeepSeekOfficialModel(model)) state.rounds += 1;
    // 余额本地预扣；钱包存在时只扣钱包余额，未归属请求仍兼容旧全局余额。
    try {
      if (wallet) {
        const current = wallet.balance.amount == null || wallet.balance.amount === ''
          ? NaN
          : parseFloat(String(wallet.balance.amount));
        if (Number.isFinite(current)) {
          const cost = wallet.balance.currency === 'USD'
            ? lu.cost / getWalletExchangeRate()
            : lu.cost;
          wallet.balance.amount = (current - cost).toFixed(4);
          wallet.updatedAt = Date.now();
        }
      } else if (state.customBalance != null && String(state.customBalance).trim() !== '') {
        const cur = parseFloat(String(state.customBalance));
        if (!isNaN(cur)) state.customBalance = (cur - lu.cost).toFixed(4);
      } else if (state.balance && (state.balance as any).balance != null && String((state.balance as any).balance).trim() !== '') {
        const cur = parseFloat(String((state.balance as any).balance));
        if (!isNaN(cur)) {
          (state.balance as any).balance = (cur - lu.cost).toFixed(4);
          (state.balance as any).timestamp = Date.now();
        }
      }
    } catch {}
    if (state.history.length > MAX_HISTORY) {
      const overflow = state.history.slice(MAX_HISTORY);
      appendHistoryCold(overflow).catch(notifyStorageFailure);
      state.history = state.history.slice(0, MAX_HISTORY);
    }
    state.startTime = state.startTime || Date.now();
    persist();
    emit(DataEvents.HISTORY_ADDED, entry);
    return entry;
  },

  async recalcAll(): Promise<void> {
    for (const h of state.history || []) {
      const wallet = findWalletForHistory(state.wallets, h);
      const previous = {
        input: Number(h.input_cost) || 0,
        output: Number(h.output_cost) || 0,
        total: Number(h.cost) || 0,
      };
      const c = recalcEntryCost(h, wallet);
      applyCostPatch(h, c);
      applyTotalDelta(previous, c);
      h.cache_hit_rate = (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0) > 0 ? ((h.cache_hit_tokens || 0) / ((h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0)) * 100) : 0;
    }
    try {
      const cold = await loadHistoryCold();
      let coldChanged = false;
      for (const h of cold) {
        const wallet = findWalletForHistory(state.wallets, h);
        const previous = {
          input: Number(h.input_cost) || 0,
          output: Number(h.output_cost) || 0,
          total: Number(h.cost) || 0,
        };
        const c = recalcEntryCost(h, wallet);
        applyCostPatch(h, c);
        applyTotalDelta(previous, c);
        h.cache_hit_rate = (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0) > 0 ? ((h.cache_hit_tokens || 0) / ((h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0)) * 100) : 0;
        coldChanged = true;
      }
      if (coldChanged) await saveHistoryCold(cold);
    } catch (error) {
      log.error('冷历史重算失败', error);
    }
    persist();
  },

  async rebuildAggregates(): Promise<void> {
    await rebuildAggregates();
    persist();
  },

  async recalcWallet(walletId: string): Promise<number> {
    const wallet = state.wallets.find((item) => item.id === walletId) || null;
    if (!wallet) return 0;
    let changed = 0;
    for (const h of state.history || []) {
      const sourceWallet = findWalletForHistory(state.wallets, h);
      if (sourceWallet?.id !== wallet.id && h.legacyPricingWalletId !== wallet.id) continue;
      const previous = {
        input: Number(h.input_cost) || 0,
        output: Number(h.output_cost) || 0,
        total: Number(h.cost) || 0,
      };
      const c = recalcEntryCost(h, sourceWallet || wallet);
      applyCostPatch(h, c);
      applyTotalDelta(previous, c);
      h.cache_hit_rate = (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0) > 0 ? ((h.cache_hit_tokens || 0) / ((h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0)) * 100) : 0;
      changed++;
    }
    try {
      const cold = await loadHistoryCold();
      let coldChanged = false;
      for (const h of cold) {
        const sourceWallet = findWalletForHistory(state.wallets, h);
        if (sourceWallet?.id !== wallet.id && h.legacyPricingWalletId !== wallet.id) continue;
        const previous = {
          input: Number(h.input_cost) || 0,
          output: Number(h.output_cost) || 0,
          total: Number(h.cost) || 0,
        };
        const c = recalcEntryCost(h, sourceWallet || wallet);
        applyCostPatch(h, c);
        applyTotalDelta(previous, c);
        coldChanged = true;
        changed++;
      }
      if (coldChanged) await saveHistoryCold(cold);
    } catch {}
    persist();
    return changed;
  },

  async replaceAll(next: Partial<Snapshot> & any, options: { clearCold?: boolean } = {}): Promise<void> {
    if (next.history !== undefined) {
      let h = next.history as any[];
      // 清洗原型污染键
      h = h.map((e: any) => {
        if (!e || typeof e !== 'object') return e;
        for (const k of Object.keys(e)) if (isUnsafeKey(k)) delete e[k];
        return e;
      });
      if (h.length > MAX_HISTORY) {
        const overflow = h.slice(MAX_HISTORY);
        if (options.clearCold) await saveHistoryCold(overflow);
        else await appendHistoryCold(overflow);
        state.history = h.slice(0, MAX_HISTORY);
      } else {
        if (options.clearCold) await clearHistoryCold();
        state.history = h as any;
      }
    } else if (options.clearCold) {
      await clearHistoryCold();
    }
    if (next.total_tokens !== undefined) state.total_tokens = next.total_tokens as any;
    if (next.total_cost !== undefined) state.total_cost = next.total_cost as any;
    if (next.input_tokens !== undefined) state.input_tokens = next.input_tokens as any;
    if (next.output_tokens !== undefined) state.output_tokens = next.output_tokens as any;
    if (next.cache_hit_tokens !== undefined) state.cache_hit_tokens = next.cache_hit_tokens as any;
    if (next.cache_miss_tokens !== undefined) state.cache_miss_tokens = next.cache_miss_tokens as any;
    if (next.input_cost !== undefined) state.input_cost = next.input_cost as any;
    if (next.output_cost !== undefined) state.output_cost = next.output_cost as any;
    if (next.rounds !== undefined) state.rounds = next.rounds as any;
    if (next.startTime !== undefined) state.startTime = next.startTime as any;
    // 兼容旧 saves 导入：合并至单一历史（聚合仅在外部未提供时自算，避免重复累加）
    if (next.saves) {
      let all: any[] = [...(state.history || [])];
      for (const s of Object.values(next.saves as any)) {
        const h = (s as any).history || [];
        all = all.concat(h);
      }
      all.sort((a: any, b: any) => b.timestamp - a.timestamp);
      const keyOf = historyRecordKey;
      const seen = new Set<string>();
      const dedup: any[] = [];
      for (const h of all) { const k = keyOf(h); if (!seen.has(k)) { seen.add(k); dedup.push(h); } }
      if (dedup.length > MAX_HISTORY) {
        const overflow = dedup.slice(MAX_HISTORY);
        await appendHistoryCold(overflow);
      }
      state.history = dedup.slice(0, MAX_HISTORY);
      if (next.total_tokens === undefined) {
        let tt = 0, tc = 0, it = 0, ot = 0, ch = 0, cm = 0, ic = 0, oc = 0;
        for (const h of state.history) {
          tt += h.total_tokens || 0; tc += h.cost || 0;
          it += (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0); ot += h.completion_tokens || 0;
          ch += h.cache_hit_tokens || 0; cm += h.cache_miss_tokens || 0;
          ic += h.input_cost || 0; oc += h.output_cost || 0;
        }
        state.total_tokens = tt as any; state.total_cost = tc as any; state.input_tokens = it as any;
        state.output_tokens = ot as any; state.cache_hit_tokens = ch as any; state.cache_miss_tokens = cm as any;
        state.input_cost = ic as any; state.output_cost = oc as any; state.rounds = state.history.length as any;
      }
    }
    if (next.settings !== undefined) {
      state.settings = normalizeSettings(next.settings);
      // 旧历史补 finishReason 并重算 isTruncated（兼容 sensitive/content_filter 等非正常结束）
      try {
        let need = false;
        for (const h of state.history as any[]) {
          if ((h as any).finishReason === undefined) { (h as any).finishReason = (h as any).raw_usage?.__finish_reason ?? null; need = true; }
          const t = isTruncatedFinish((h as any).finishReason);
          if ((h as any).isTruncated !== t) { (h as any).isTruncated = t; need = true; }
        }
        if (need) saveHot({ history: state.history } as any);
      } catch {}
    }
    if (next.balance !== undefined) state.balance = next.balance;
    if (next.customBalance !== undefined) state.customBalance = next.customBalance as any;
    if (next.wallets !== undefined) state.wallets = normalizeWallets(next.wallets, state.settings, Date.now());
    if (next.walletIgnored !== undefined) {
      state.walletIgnored = Array.isArray(next.walletIgnored)
        ? Array.from(new Set(next.walletIgnored.map((id: unknown) => String(id || '').trim()).filter(Boolean)))
        : [];
    }
    if (next.messageCount !== undefined) state.messageCount = next.messageCount as any;
    if (next.lastUsage !== undefined) state.lastUsage = next.lastUsage as any;
    persist();
    if (next.settings) emit(DataEvents.SETTINGS_CHANGED);
    if (next.wallets !== undefined || next.walletIgnored !== undefined) emit(DataEvents.SETTINGS_CHANGED);
    if (next.balance !== undefined || next.customBalance !== undefined) emit(DataEvents.BALANCE_CHANGED);
  },

  pruneZeroEntries() {
    const before = (state.history || []).length;
    const filtered = (state.history || []).filter((h: any) => {
      const isZero = h.total_tokens === 0 && h.prompt_tokens === 0 && h.completion_tokens === 0 && h.cache_hit_tokens === 0 && h.cache_miss_tokens === 0;
      const isFakeTokenCount = !!(h.raw_usage && (h.raw_usage as any)._from_token_count);
      const isDebug = (h as any)._debug === true;
      return !(isZero || isFakeTokenCount || isDebug);
    });
    if (filtered.length !== before) {
      state.history = filtered as any;
      // 重算聚合，避免 totals 包含零条目影响
      let total_tokens = 0, total_cost = 0, input_tokens = 0, output_tokens = 0, cache_hit_tokens = 0, cache_miss_tokens = 0, input_cost = 0, output_cost = 0, rounds = 0;
      for (const h of filtered) {
        total_tokens += h.total_tokens || 0;
        total_cost += h.cost || 0;
        input_tokens += (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0);
        output_tokens += h.completion_tokens || 0;
        cache_hit_tokens += h.cache_hit_tokens || 0;
        cache_miss_tokens += h.cache_miss_tokens || 0;
        input_cost += h.input_cost || 0;
        output_cost += h.output_cost || 0;
        rounds += 1;
      }
      state.total_tokens = total_tokens as any;
      state.total_cost = total_cost as any;
      state.input_tokens = input_tokens as any;
      state.output_tokens = output_tokens as any;
      state.cache_hit_tokens = cache_hit_tokens as any;
      state.cache_miss_tokens = cache_miss_tokens as any;
      state.input_cost = input_cost as any;
      state.output_cost = output_cost as any;
      state.rounds = rounds as any;
      persist();
      log.debug('已自动清理 ' + (before - filtered.length) + ' 条全 0 污染条目');
    }
    return filtered.length;
  },

  async hydrate() {
    const hot: any = await loadHot();
    if (hot) {
      if (hot.history) state.history = hot.history;
      if (hot.total_tokens !== undefined) state.total_tokens = hot.total_tokens;
      if (hot.total_cost !== undefined) state.total_cost = hot.total_cost;
      if (hot.input_tokens !== undefined) state.input_tokens = hot.input_tokens;
      if (hot.output_tokens !== undefined) state.output_tokens = hot.output_tokens;
      if (hot.cache_hit_tokens !== undefined) state.cache_hit_tokens = hot.cache_hit_tokens;
      if (hot.cache_miss_tokens !== undefined) state.cache_miss_tokens = hot.cache_miss_tokens;
      if (hot.input_cost !== undefined) state.input_cost = hot.input_cost;
      if (hot.output_cost !== undefined) state.output_cost = hot.output_cost;
      if (hot.rounds !== undefined) state.rounds = hot.rounds;
      if (hot.startTime !== undefined) state.startTime = hot.startTime;
      if (hot.settings) state.settings = normalizeSettings(hot.settings);
      if (hot.balance) state.balance = hot.balance;
      if (hot.customBalance) state.customBalance = hot.customBalance;
      if (hot.wallets) state.wallets = normalizeWallets(hot.wallets, state.settings, Date.now());
      if (Array.isArray(hot.walletIgnored)) state.walletIgnored = hot.walletIgnored;
      if (hot.messageCount) state.messageCount = hot.messageCount;
      if (hot.lastUsage) state.lastUsage = hot.lastUsage;
    }
    // 迁移：旧设置无 historyScope 时补默认值 all
    if (!(state.settings as any).historyScope) {
      (state.settings as any).historyScope = 'all';
      try { saveHot({ settings: state.settings }); } catch {}
    }
    if (!(state.settings as any).overviewWalletId) {
      (state.settings as any).overviewWalletId = DEEPSEEK_WALLET_ID;
      (state.settings as any).overviewWalletManuallySet = false;
      try { saveHot({ settings: state.settings }); } catch {}
    }
    if ((state.settings as any).overviewWalletManuallySet !== true) {
      if ((state.settings as any).overviewWalletId === 'all') {
        (state.settings as any).overviewWalletId = DEEPSEEK_WALLET_ID;
      }
      (state.settings as any).overviewWalletManuallySet = true;
      try { saveHot({ settings: state.settings }); } catch {}
    }
    // 迁移：旧设置无 overviewFour 时补默认八块（兼容旧4块）
    if (!Array.isArray((state.settings as any).overviewFour) || ((state.settings as any).overviewFour.length !== 8 && (state.settings as any).overviewFour.length !== 4)) {
      (state.settings as any).overviewFour = ['avg_cost','avg_tokens','avg_duration','avg_rate','avg_input_tokens','avg_output_tokens','avg_hit_rate','max_total'];
      try { saveHot({ settings: state.settings }); } catch {}
    } else if ((state.settings as any).overviewFour.length === 4) {
      (state.settings as any).overviewFour = [...(state.settings as any).overviewFour, 'avg_input_tokens','avg_output_tokens','avg_hit_rate','max_total'];
      try { saveHot({ settings: state.settings }); } catch {}
    }
    if (typeof (state.settings as any).modelsPricingCollapsed !== 'boolean') {
      (state.settings as any).modelsPricingCollapsed = true;
      try { saveHot({ settings: state.settings }); } catch {}
    }
    if (!Array.isArray((state.settings as any).statsFour) || (state.settings as any).statsFour.length !== 4) {
      (state.settings as any).statsFour = ['avg_cost','avg_tokens','avg_think_ratio','truncation_rate'];
      try { saveHot({ settings: state.settings }); } catch {}
    } else {
      try {
        const validStats = new Set(['avg_cost','avg_tokens','avg_duration','avg_rate','avg_ttft','avg_input_cost','avg_input_tokens','avg_output_cost','avg_output_tokens','avg_think_time','avg_think_tokens','avg_think_ratio','truncation_rate','avg_hit_rate','latest_hit_rate','max_output','max_input','max_total']);
        let cur: any[] = (state.settings as any).statsFour;
        if (cur.some((k:any)=> !validStats.has(k))) {
          (state.settings as any).statsFour = ['avg_cost','avg_tokens','avg_think_ratio','truncation_rate'];
          try { saveHot({ settings: state.settings }); } catch {}
        }
      } catch {}
    }
    // 迁移：pricingSync（默认关闭，汇率 7.2，自动同步仅手动）
    if (!(state.settings as any).pricingSync) {
      (state.settings as any).pricingSync = { enabled: false, mode: 'add-missing', exchangeRate: 7.2, useLiveRate: true, autoIntervalHours: 0, lastSync: null, lastRateFetch: null, recalcOnSync: false, showSyncedModels: false, syncedMarkVersion: 0 };
      try { saveHot({ settings: state.settings }); } catch {}
    } else {
      try {
        const def:any = { enabled:false, mode:'add-missing', exchangeRate:7.2, useLiveRate:true, autoIntervalHours:0, lastSync:null, lastRateFetch:null, recalcOnSync:false, showSyncedModels:false, syncedMarkVersion:0 };
        const ps:any=(state.settings as any).pricingSync;
        for(const k of Object.keys(def)) if(ps[k]===undefined) ps[k]=def[k];
        const r=parseFloat(String(ps.exchangeRate));
        if(!isFinite(r)||r<=0) ps.exchangeRate=7.2;
        if(typeof ps.showSyncedModels!=='boolean') ps.showSyncedModels=false;
        if(!isFinite(parseFloat(String(ps.syncedMarkVersion)))) ps.syncedMarkVersion=0;
        try{ saveHot({settings:state.settings}); }catch{}
      } catch {}
    }
    // 迁移：旧历史补 finishReason 并重算 isTruncated（兼容 sensitive/content_filter 等非正常结束）
    try {
      let need = false;
      for (const h of state.history as any[]) {
        if ((h as any).finishReason === undefined) { (h as any).finishReason = (h as any).raw_usage?.__finish_reason ?? null; need = true; }
        const t = isTruncatedFinish((h as any).finishReason);
        if ((h as any).isTruncated !== t) { (h as any).isTruncated = t; need = true; }
      }
      if (need) try { saveHot({ history: state.history } as any); } catch {}
    } catch {}
    // 迁移：旧历史无 chatId 时尝试回填（无法精确回溯则保留 null，按 all 展示）
    let needPersistChatId = false;
    for (const h of state.history || []) {
      if ((h as any).chatId === undefined) {
        (h as any).chatId = null;
        (h as any).chatName = null;
        needPersistChatId = true;
      }
    }
    if (needPersistChatId) try { saveHot({ history: state.history }); } catch {}
    let coldForWalletMigration: any[] = [];
    try { coldForWalletMigration = await loadHistoryCold(); } catch {}
    // 迁移：清洗非流式/假流式造成的异常速率与失真 TTFT（>1000 t/s，或 TTFT≈总耗时）
    try {
      let hotFixed = false;
      for (const h of state.history || []) {
        if (sanitizeHistoryTiming(h)) hotFixed = true;
      }
      let coldFixed = false;
      for (const h of coldForWalletMigration || []) {
        if (sanitizeHistoryTiming(h)) coldFixed = true;
      }
      if (hotFixed) try { saveHot({ history: state.history }); } catch {}
      if (coldFixed) try { await saveHistoryCold(coldForWalletMigration); } catch {}
    } catch {}
    if (migrateWallets(hot, coldForWalletMigration)) {
      try { saveHot({ wallets: state.wallets, walletIgnored: state.walletIgnored }); } catch {}
      if (coldForWalletMigration.length) {
        try { await saveHistoryCold(coldForWalletMigration); } catch {}
      }
    }
    // 自动清理历史中的全 0 污染条目（由之前 token_count 误判产生）
    try { this.pruneZeroEntries(); } catch {}
    // 对历史成本按归一化模型重算，修复 [masa]/[OR] 前缀导致的 0 费用
    try { await this.recalcAll(); } catch {}
    // 热缓存聚合字段必须与热+冷全量历史一致，避免概览与统计页出现两套总额
    try { await rebuildAggregates(); persist(); } catch {}
    emit(DataEvents.UPDATED);
    return this.snapshot();
  },
};
