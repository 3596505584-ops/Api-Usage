import { cn as __exportAll } from "./Image-B5UjBJH1.js";
import { r as state } from "./store-DSiVmOSF.js";
import { c as PRICING_SYNC_FALLBACK, i as HIDDEN_PRICING_MODELS, l as PRICING_SYNC_SOURCE, s as PRICING } from "./pricing-bcKQQNo6.js";
import { u as saveHot } from "./persistence-CrFXrRB_.js";
import { r as toast, t as log } from "./logger-Bv-AT94O.js";
import { _ as cloneWallet, h as normalizeModel, m as isDeepSeekOfficialModel, t as repository, y as findWalletModel } from "./repository-B4yMLqkN.js";
import { a as getWalletExchangeRate } from "./currency-IAtpC2X8.js";
//#region src/services/pricing-sync.ts
var pricing_sync_exports = /* @__PURE__ */ __exportAll({
	SYNCED_MARK_VERSION: () => 1,
	fetchModelsDevCatalog: () => fetchModelsDevCatalog,
	isSyncedCustomModel: () => isSyncedCustomModel,
	markLegacySyncedModels: () => markLegacySyncedModels,
	previewSync: () => previewSync,
	removeSyncedModels: () => removeSyncedModels,
	restartPricingSyncTimer: () => restartPricingSyncTimer,
	stopPricingSyncTimer: () => stopPricingSyncTimer,
	syncPricingFromModelsDev: () => syncPricingFromModelsDev
});
/** 是否为 models.dev 同步写入的价格条目（默认不在“模型与价格”列表显示） */
function isSyncedCustomModel(entry) {
	return !!entry && entry.synced === true;
}
/** 内置模型键（含隐藏内置），这些模型不参与同步模型判定 */
function builtinModelKeys() {
	return /* @__PURE__ */ new Set([...Object.keys(PRICING), ...HIDDEN_PRICING_MODELS || []]);
}
/** 两套价格是否基本一致（同步时汇率/实时汇率可能变化，给 5% 容差） */
function priceClose(a, b, tol = .05) {
	for (const f of [
		"hit",
		"miss",
		"output"
	]) {
		const x = parseFloat(String(a?.[f]));
		const y = parseFloat(String(b?.[f]));
		if (!isFinite(x) || !isFinite(y)) return false;
		const base = Math.max(Math.abs(x), Math.abs(y));
		if (base === 0) continue;
		if (Math.abs(x - y) / base > tol) return false;
	}
	return true;
}
/** 移除全部 models.dev 同步条目（关闭自动同步时调用），返回移除数量 */
function removeSyncedModels() {
	const cms = state.settings.customModels || [];
	const kept = cms.filter((c) => c?.synced !== true);
	let removed = cms.length - kept.length;
	state.settings.customModels = kept;
	const nextWallets = repository.getWallets().map((wallet) => {
		const next = cloneWallet(wallet);
		const before = next.models.length;
		next.models = next.models.filter((model) => !(model.source === "sync" && !model.locked));
		removed += before - next.models.length;
		return next;
	});
	if (removed > 0) repository.replaceWallets(nextWallets);
	try {
		saveHot({ settings: state.settings });
	} catch {}
	try {
		globalThis.ApiUsageStat?.refreshUI?.();
	} catch {}
	log.debug("synced models removed", { removed });
	return removed;
}
function toCNY(usd, rate) {
	return Math.round(usd * rate * 1e4) / 1e4;
}
function normalizeCost(c) {
	if (!c || typeof c !== "object") return null;
	const hitRaw = c.cache_read ?? c.cacheRead ?? c.cached_tokens;
	const missRaw = c.input;
	const outRaw = c.output ?? c.reasoning;
	const hit = hitRaw != null ? parseFloat(String(hitRaw)) : NaN;
	const miss = missRaw != null ? parseFloat(String(missRaw)) : NaN;
	const out = outRaw != null ? parseFloat(String(outRaw)) : NaN;
	if (!isFinite(miss) || !isFinite(out)) return null;
	return {
		hit: isFinite(hit) ? hit : miss,
		miss,
		output: out
	};
}
async function fetchJson(url, timeoutMs = 8e3) {
	const ctrl = new AbortController();
	const to = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		const r = await fetch(url, {
			signal: ctrl.signal,
			cache: "no-store"
		});
		if (!r.ok) throw new Error(`HTTP ${r.status}`);
		return await r.json();
	} finally {
		clearTimeout(to);
	}
}
async function fetchModelsDevCatalog() {
	const urls = [
		PRICING_SYNC_SOURCE,
		PRICING_SYNC_FALLBACK,
		"https://models.dev/catalog.json"
	];
	let lastErr = null;
	for (const u of urls) try {
		return await fetchJson(u);
	} catch (e) {
		lastErr = e;
	}
	throw lastErr || /* @__PURE__ */ new Error("fetch failed");
}
function buildCustomModelsFromCatalog(catalog, rate) {
	const out = [];
	if (!catalog || typeof catalog !== "object") return out;
	for (const providerId of Object.keys(catalog)) {
		const models = catalog[providerId]?.models;
		if (!models || typeof models !== "object") continue;
		for (const modelId of Object.keys(models)) {
			const cost = models[modelId]?.cost;
			const norm = normalizeCost(cost);
			if (!norm) continue;
			const cnHit = toCNY(norm.hit, rate);
			const cnMiss = toCNY(norm.miss, rate);
			const cnOut = toCNY(norm.output, rate);
			const usePeak = isDeepSeekOfficialModel(modelId);
			const entry = {
				model: modelId,
				usePeakPricing: usePeak,
				offpeak: {
					hit: cnHit,
					miss: cnMiss,
					output: cnOut
				},
				peak: usePeak ? {
					hit: toCNY(norm.hit * 2, 1) ? cnHit * 2 : cnHit * 2,
					miss: cnMiss * 2,
					output: cnOut * 2
				} : {
					hit: cnHit,
					miss: cnMiss,
					output: cnOut
				},
				synced: true
			};
			if (usePeak) {
				entry.peak.hit = Math.round(cnHit * 2 * 1e4) / 1e4;
				entry.peak.miss = Math.round(cnMiss * 2 * 1e4) / 1e4;
				entry.peak.output = Math.round(cnOut * 2 * 1e4) / 1e4;
			}
			out.push(entry);
		}
	}
	return out;
}
function buildProviderModelsFromCatalog(catalog, providerId, rate) {
	const models = (catalog?.[providerId])?.models;
	if (!models || typeof models !== "object") return [];
	const out = [];
	for (const modelId of Object.keys(models)) {
		const cost = normalizeCost(models[modelId]?.cost);
		if (!cost) continue;
		const hit = toCNY(cost.hit, rate);
		const miss = toCNY(cost.miss, rate);
		const output = toCNY(cost.output, rate);
		const usePeak = isDeepSeekOfficialModel(modelId);
		out.push({
			model: modelId,
			usePeakPricing: usePeak,
			offpeak: {
				hit,
				miss,
				output
			},
			peak: usePeak ? {
				hit: Math.round(hit * 2 * 1e4) / 1e4,
				miss: Math.round(miss * 2 * 1e4) / 1e4,
				output: Math.round(output * 2 * 1e4) / 1e4
			} : {
				hit,
				miss,
				output
			}
		});
	}
	return out;
}
function sameCatalogPrice(model, incoming) {
	return model.price.usePeakPricing === incoming.usePeakPricing && model.price.offpeak.hit === incoming.offpeak.hit && model.price.offpeak.miss === incoming.offpeak.miss && model.price.offpeak.output === incoming.offpeak.output && model.price.peak.hit === incoming.peak.hit && model.price.peak.miss === incoming.peak.miss && model.price.peak.output === incoming.peak.output;
}
function applyCatalogToWallet(wallet, incoming, mode, counts, samples, affected) {
	if (!wallet.catalogProvider || !incoming.length) return wallet;
	const next = cloneWallet(wallet);
	const now = Date.now();
	for (const price of incoming) {
		const existing = findWalletModel(next, price.model);
		if (!existing) {
			next.models.push({
				id: `sync:${wallet.id}:${price.model}`,
				sourceModel: price.model,
				model: price.model,
				aliases: [],
				price: {
					usePeakPricing: price.usePeakPricing,
					offpeak: { ...price.offpeak },
					peak: { ...price.peak },
					priceConfigured: true
				},
				source: "sync",
				locked: false,
				discoveredAt: now,
				lastSeen: now,
				updatedAt: now
			});
			counts.added++;
			affected.add(wallet.id);
			if (samples.length < 6) samples.push({
				model: price.model,
				...price.offpeak
			});
			continue;
		}
		if (mode === "add-missing") {
			counts.skipped++;
			continue;
		}
		if (existing.locked && mode !== "overwrite-all") {
			counts.skipped++;
			continue;
		}
		if (sameCatalogPrice(existing, price)) {
			if (existing.source !== "sync") {
				existing.source = "sync";
				existing.updatedAt = now;
				affected.add(wallet.id);
			}
			counts.skipped++;
			continue;
		}
		existing.price = {
			usePeakPricing: price.usePeakPricing,
			offpeak: { ...price.offpeak },
			peak: { ...price.peak },
			priceConfigured: true
		};
		existing.source = "sync";
		existing.updatedAt = now;
		counts.updated++;
		affected.add(wallet.id);
		if (samples.length < 6) samples.push({
			model: price.model,
			...price.offpeak
		});
	}
	return next;
}
function previewSync(catalog) {
	const rate = getWalletExchangeRate() || 7.2;
	const mode = state.settings.pricingSync?.mode || "add-missing";
	const samples = [];
	const counts = {
		added: 0,
		updated: 0,
		skipped: 0
	};
	let total = 0;
	const ignored = new Set(state.walletIgnored || []);
	for (const wallet of state.wallets || []) {
		if (ignored.has(wallet.id) || !wallet.catalogProvider) continue;
		const incoming = buildProviderModelsFromCatalog(catalog, wallet.catalogProvider, rate);
		total += incoming.length;
		applyCatalogToWallet(wallet, incoming, mode, counts, samples, /* @__PURE__ */ new Set());
	}
	return {
		added: counts.added,
		updated: counts.updated,
		skipped: counts.skipped,
		total,
		samples
	};
}
async function syncPricingFromModelsDev(opts) {
	const silent = !!opts?.silent;
	const ps = state.settings.pricingSync;
	if (!ps) return null;
	try {
		const catalog = await fetchModelsDevCatalog();
		const rate = getWalletExchangeRate() || 7.2;
		const ignored = new Set(state.walletIgnored || []);
		const counts = {
			added: 0,
			updated: 0,
			skipped: 0
		};
		const samples = [];
		const affected = /* @__PURE__ */ new Set();
		let total = 0;
		const nextWallets = repository.getWallets().map((wallet) => {
			if (ignored.has(wallet.id) || !wallet.catalogProvider) return wallet;
			const incoming = buildProviderModelsFromCatalog(catalog, wallet.catalogProvider, rate);
			total += incoming.length;
			return applyCatalogToWallet(wallet, incoming, ps.mode || "add-missing", counts, samples, affected);
		});
		if (!total) {
			if (!silent) toast("warning", "models.dev 未返回可用价格");
			return null;
		}
		repository.replaceWallets(nextWallets);
		ps.lastSync = Date.now();
		saveHot({ settings: state.settings });
		if (ps.recalcOnSync) for (const walletId of affected) try {
			await repository.recalcWallet(walletId);
		} catch {}
		try {
			globalThis.ApiUsageStat?.refreshUI?.();
		} catch {}
		const preview = {
			...counts,
			total,
			samples
		};
		if (!silent) toast("success", `价格已同步：新增 ${counts.added} 更新 ${counts.updated} 跳过 ${counts.skipped}（共 ${total} 个钱包模型）`);
		log.debug("pricing sync done", preview);
		return preview;
	} catch (e) {
		log.error("pricing sync failed", e);
		if (!silent) toast("error", "同步失败：" + (e?.message || e));
		return null;
	}
}
var pricingTimer = null;
function restartPricingSyncTimer() {
	if (pricingTimer) {
		try {
			clearInterval(pricingTimer);
		} catch {}
		pricingTimer = null;
	}
	const ps = state.settings.pricingSync;
	if (!ps?.enabled) return;
	const hours = parseInt(String(ps.autoIntervalHours)) || 0;
	if (!hours || hours <= 0) return;
	pricingTimer = setInterval(() => {
		syncPricingFromModelsDev({ silent: true }).catch(() => {});
	}, hours * 60 * 60 * 1e3);
}
function stopPricingSyncTimer() {
	if (pricingTimer) {
		try {
			clearInterval(pricingTimer);
		} catch {}
		pricingTimer = null;
	}
}
/**
* 迁移：早期版本把 models.dev 全量模型直接写进 customModels 且未加标记，
* 导致设置页“模型与价格”列表被同步模型刷屏。
* 这里按 models.dev 目录 + 汇率比对补上 synced 标记，使其从列表中隐藏（价格仍照常参与计价）。
* 返回 null 表示本次未能完成（网络不可用等），下次启动会重试。
*/
async function markLegacySyncedModels(opts) {
	const ps = state.settings.pricingSync;
	if (!ps) return null;
	if (Number(ps.syncedMarkVersion) >= 1) return {
		marked: 0,
		scanned: 0
	};
	if (!ps.enabled && !ps.lastSync) {
		ps.syncedMarkVersion = 1;
		try {
			saveHot({ settings: state.settings });
		} catch {}
		return {
			marked: 0,
			scanned: 0
		};
	}
	const cms = state.settings.customModels || [];
	if (!cms.length) {
		ps.syncedMarkVersion = 1;
		try {
			saveHot({ settings: state.settings });
		} catch {}
		return {
			marked: 0,
			scanned: 0
		};
	}
	const builtin = builtinModelKeys();
	const pending = cms.filter((c) => c?.model && c.synced !== true && !builtin.has(c.model));
	if (!pending.length) {
		ps.syncedMarkVersion = 1;
		try {
			saveHot({ settings: state.settings });
		} catch {}
		return {
			marked: 0,
			scanned: 0
		};
	}
	const used = /* @__PURE__ */ new Set();
	for (const h of state.history || []) try {
		if (h?.model) used.add(normalizeModel(h.model));
	} catch {}
	let catalog = null;
	try {
		catalog = await fetchModelsDevCatalog();
	} catch {
		catalog = null;
	}
	let marked = 0;
	if (catalog) {
		const rate = getWalletExchangeRate() || 7.2;
		const catalogEntries = buildCustomModelsFromCatalog(catalog, rate);
		const byName = new Map(catalogEntries.map((e) => [e.model, e]));
		for (const c of pending) {
			const inc = byName.get(c.model);
			if (inc && priceClose(c.offpeak, inc.offpeak)) {
				c.synced = true;
				marked++;
			}
		}
		const nextWallets = repository.getWallets().map((wallet) => cloneWallet(wallet));
		let walletMarked = false;
		for (const wallet of nextWallets) for (const model of wallet.models) {
			if (model.source === "builtin" || model.locked || model.source === "sync") continue;
			const inc = byName.get(model.sourceModel) || byName.get(model.model);
			if (inc && priceClose(model.price.offpeak, inc.offpeak)) {
				model.source = "sync";
				model.updatedAt = Date.now();
				walletMarked = true;
			}
		}
		if (walletMarked) repository.replaceWallets(nextWallets);
	} else if (pending.length >= 40) for (const c of pending) {
		try {
			if (used.has(normalizeModel(c.model))) continue;
		} catch {}
		c.synced = true;
		marked++;
	}
	else return null;
	if (catalog) ps.syncedMarkVersion = 1;
	if (marked) {
		try {
			saveHot({ settings: state.settings });
		} catch {}
		try {
			globalThis.ApiUsageStat?.refreshUI?.();
		} catch {}
		if (!opts?.skipRerender) try {
			const { renderSettings } = await import("./index.js").then((n) => n.t);
			const doc = window.parent?.document ?? document;
			if (doc?.getElementById("aus-settings")) renderSettings(doc);
		} catch {}
	} else if (catalog) try {
		saveHot({ settings: state.settings });
	} catch {}
	log.debug("synced model markers migrated", {
		marked,
		scanned: pending.length
	});
	return {
		marked,
		scanned: pending.length
	};
}
//#endregion
export { removeSyncedModels as a, pricing_sync_exports as i, isSyncedCustomModel as n, syncPricingFromModelsDev as o, previewSync as r, fetchModelsDevCatalog as t };
