import { pn as __exportAll } from "./graphic-BAx7jeh4.js";
import { f as STORAGE_KEYS } from "./pricing-Bc-qEvy8.js";
import { t as log } from "./logger-8RGXnvfI.js";
//#region src/utils/history-key.ts
/**
* 历史记录去重键：兼容旧记录缺少钱包字段的情况。
* 优先使用 endpointId，钱包记录与迁移前记录才能保持同一身份。
*/
function historyRecordKey(entry) {
	const agentRunId = typeof entry?.agentRunId === "string" ? entry.agentRunId.trim() : "";
	if (agentRunId) return JSON.stringify(["agent", agentRunId]);
	return JSON.stringify([
		Number(entry?.timestamp) || 0,
		String(entry?.model || ""),
		Number(entry?.total_tokens) || 0,
		Number(entry?.cache_hit_tokens) || 0,
		Number(entry?.cache_miss_tokens) || 0,
		Number(entry?.completion_tokens) || 0,
		String(entry?.endpointId || entry?.walletId || ""),
		String(entry?.credentialId || "")
	]);
}
//#endregion
//#region src/store/persistence.ts
/**
* 分页存储：extensionSettings(热) + IndexedDB + 旧 LS/TavernHelper 迁移
* 已废弃多存档，迁移时将所有旧 saves 合并为单一历史
*/
var persistence_exports = /* @__PURE__ */ __exportAll({
	HOT_KEEP: () => 50,
	appendHistoryCold: () => appendHistoryCold,
	clearHistoryCold: () => clearHistoryCold,
	flushSaveHot: () => flushSaveHot,
	getAllHistory: () => getAllHistory,
	getExtensionSettings: () => getExtensionSettings,
	loadHistoryCold: () => loadHistoryCold,
	loadHot: () => loadHot,
	migrateIfNeeded: () => migrateIfNeeded,
	saveExtensionSettings: () => saveExtensionSettings,
	saveHistoryCold: () => saveHistoryCold,
	saveHot: () => saveHot
});
var MODULE = "api_usage_stat";
var DB_NAME = "api_usage_stat_db";
var STORE_NAME = "kv";
var dbPromise = null;
function openDB() {
	return new Promise((resolve, reject) => {
		try {
			const req = indexedDB.open(DB_NAME, 1);
			req.onupgradeneeded = (e) => {
				const db = e.target.result;
				if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
			};
			req.onsuccess = (e) => {
				const db = e.target.result;
				db.onversionchange = () => {
					try {
						db.close();
					} catch {}
					if (dbPromise) dbPromise = null;
				};
				resolve(db);
			};
			req.onerror = (e) => reject(e.target.error);
		} catch (err) {
			reject(err);
		}
	});
}
function getDB() {
	if (!dbPromise) dbPromise = openDB().catch((error) => {
		dbPromise = null;
		throw error;
	});
	return dbPromise;
}
async function dbGet(key) {
	try {
		const db = await getDB();
		return await new Promise((res, rej) => {
			const r = db.transaction([STORE_NAME], "readonly").objectStore(STORE_NAME).get(key);
			r.onsuccess = (e) => res(e.target.result ?? null);
			r.onerror = (e) => rej(e.target.error);
		});
	} catch (dbError) {
		try {
			const fallback = localStorage.getItem("aus_" + key);
			if (fallback != null) return fallback;
		} catch {}
		log.warn("IndexedDB 读取失败且无本地降级数据", dbError);
		throw dbError;
	}
}
async function dbSet(key, value) {
	try {
		const db = await getDB();
		await new Promise((res, rej) => {
			const tx = db.transaction([STORE_NAME], "readwrite");
			const r = tx.objectStore(STORE_NAME).put(value, key);
			tx.oncomplete = () => res();
			tx.onabort = () => rej(tx.error || r.error);
			tx.onerror = () => rej(tx.error || r.error);
			r.onerror = (e) => rej(e.target.error);
		});
		try {
			localStorage.removeItem("aus_" + key);
		} catch {}
	} catch (dbError) {
		try {
			localStorage.setItem("aus_" + key, value);
		} catch (storageError) {
			log.error("持久化写入失败", key, dbError, storageError);
			throw storageError;
		}
	}
}
async function dbDelete(key) {
	try {
		const db = await getDB();
		await new Promise((res, rej) => {
			const tx = db.transaction([STORE_NAME], "readwrite");
			const r = tx.objectStore(STORE_NAME).delete(key);
			tx.oncomplete = () => res();
			tx.onabort = () => rej(tx.error || r.error);
			tx.onerror = () => rej(tx.error || r.error);
			r.onerror = (e) => rej(e.target.error);
		});
		try {
			localStorage.removeItem("aus_" + key);
		} catch {}
	} catch (dbError) {
		try {
			localStorage.removeItem("aus_" + key);
		} catch {}
		log.warn("IndexedDB 删除失败，已尝试清理本地降级存储", dbError);
	}
}
function loadLegacy(key) {
	try {
		const gv = globalThis.getAllVariables;
		if (typeof gv === "function") {
			const v = gv();
			if (v && v[key] != null) return v[key];
		}
	} catch {}
	try {
		return localStorage.getItem("ds_" + key) ?? localStorage.getItem(key);
	} catch {
		return null;
	}
}
function getExtensionSettings() {
	try {
		return globalThis.SillyTavern?.getContext?.().extensionSettings?.[MODULE] ?? null;
	} catch {
		return null;
	}
}
function saveExtensionSettings(data) {
	try {
		const ctx = globalThis.SillyTavern?.getContext?.();
		if (!ctx) return;
		ctx.extensionSettings[MODULE] = data;
		ctx.saveSettingsDebounced?.();
	} catch {}
}
var saveTimer = null;
var pendingPatch = null;
function saveHot(patch) {
	pendingPatch = {
		...pendingPatch || {},
		...patch
	};
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		saveTimer = null;
		const merged = {
			...getExtensionSettings() || {},
			...pendingPatch || {},
			_updated: Date.now()
		};
		pendingPatch = null;
		saveExtensionSettings(merged);
	}, 300);
}
function flushSaveHot() {
	if (!saveTimer && !pendingPatch) return;
	if (saveTimer) {
		try {
			clearTimeout(saveTimer);
		} catch {}
		saveTimer = null;
	}
	if (pendingPatch) {
		const patch = pendingPatch;
		pendingPatch = null;
		saveExtensionSettings({
			...getExtensionSettings() || {},
			...patch,
			_updated: Date.now()
		});
	}
}
async function migrateIfNeeded() {
	const cur = getExtensionSettings();
	if (cur && cur._migrated) {
		if (cur.saves && !cur.history) try {
			let allHistory = [];
			let agg = {
				total_tokens: 0,
				total_cost: 0,
				input_tokens: 0,
				output_tokens: 0,
				cache_hit_tokens: 0,
				cache_miss_tokens: 0,
				input_cost: 0,
				output_cost: 0,
				rounds: 0,
				startTime: Date.now()
			};
			let earliest = Date.now();
			for (const s of Object.values(cur.saves)) {
				const h = s.history || [];
				allHistory = allHistory.concat(h);
				agg.total_tokens += s.total_tokens || 0;
				agg.total_cost += s.total_cost || 0;
				agg.input_tokens += s.input_tokens || 0;
				agg.output_tokens += s.output_tokens || 0;
				agg.cache_hit_tokens += s.cache_hit_tokens || 0;
				agg.cache_miss_tokens += s.cache_miss_tokens || 0;
				agg.input_cost += s.input_cost || 0;
				agg.output_cost += s.output_cost || 0;
				agg.rounds += s.rounds || 0;
				if (s.startTime && s.startTime < earliest) earliest = s.startTime;
				try {
					const coldRaw = await dbGet("cold_" + s.name);
					if (coldRaw) {
						const cold = JSON.parse(coldRaw);
						allHistory = allHistory.concat(cold);
					}
				} catch {}
			}
			allHistory.sort((a, b) => b.timestamp - a.timestamp);
			const hot = allHistory.slice(0, 50);
			const cold = allHistory.slice(50);
			if (cold.length) await dbSet("cold_history", JSON.stringify(cold));
			const next = {
				history: hot,
				_coldCount: cold.length,
				total_tokens: agg.total_tokens,
				total_cost: agg.total_cost,
				input_tokens: agg.input_tokens,
				output_tokens: agg.output_tokens,
				cache_hit_tokens: agg.cache_hit_tokens,
				cache_miss_tokens: agg.cache_miss_tokens,
				input_cost: agg.input_cost,
				output_cost: agg.output_cost,
				rounds: agg.rounds,
				startTime: earliest,
				_migratedArchive: true
			};
			delete next.saves;
			delete next.currentSave;
			saveExtensionSettings({
				...cur,
				...next
			});
		} catch {}
		return;
	}
	const legacySaves = loadLegacy(STORAGE_KEYS.SAVES);
	const hasNewHistory = cur?.history;
	if (!legacySaves && !cur) {
		saveExtensionSettings({
			_migrated: true,
			_updated: Date.now(),
			history: [],
			total_tokens: 0,
			total_cost: 0,
			input_tokens: 0,
			output_tokens: 0,
			cache_hit_tokens: 0,
			cache_miss_tokens: 0,
			input_cost: 0,
			output_cost: 0,
			rounds: 0,
			startTime: Date.now()
		});
		return;
	}
	if (hasNewHistory) {
		saveExtensionSettings({
			...cur,
			_migrated: true,
			_updated: Date.now()
		});
		return;
	}
	try {
		const backup = {};
		for (const k of Object.values(STORAGE_KEYS)) {
			const v = loadLegacy(k);
			if (v) backup[k] = v;
		}
		if (Object.keys(backup).length) await dbSet("migration_backup_" + Date.now(), JSON.stringify(backup));
	} catch {}
	try {
		const savesRaw = loadLegacy(STORAGE_KEYS.SAVES);
		const settingsRaw = loadLegacy(STORAGE_KEYS.SETTINGS);
		const balanceRaw = loadLegacy(STORAGE_KEYS.BALANCE);
		const customBal = loadLegacy(STORAGE_KEYS.CUSTOM_BALANCE);
		const msgCount = loadLegacy(STORAGE_KEYS.MESSAGE_COUNT);
		const next = {
			_migrated: true,
			_updated: Date.now()
		};
		if (savesRaw) try {
			const saves = JSON.parse(savesRaw);
			let allHistory = [];
			let agg = {
				total_tokens: 0,
				total_cost: 0,
				input_tokens: 0,
				output_tokens: 0,
				cache_hit_tokens: 0,
				cache_miss_tokens: 0,
				input_cost: 0,
				output_cost: 0,
				rounds: 0,
				startTime: Date.now()
			};
			let earliest = Date.now();
			let count = 0;
			for (const s of Object.values(saves)) {
				const h = s.history || [];
				allHistory = allHistory.concat(h);
				agg.total_tokens += s.total_tokens || 0;
				agg.total_cost += s.total_cost || 0;
				agg.input_tokens += s.input_tokens || 0;
				agg.output_tokens += s.output_tokens || 0;
				agg.cache_hit_tokens += s.cache_hit_tokens || 0;
				agg.cache_miss_tokens += s.cache_miss_tokens || 0;
				agg.input_cost += s.input_cost || 0;
				agg.output_cost += s.output_cost || 0;
				agg.rounds += s.rounds || 0;
				if (s.startTime && s.startTime < earliest) earliest = s.startTime;
				count++;
			}
			allHistory.sort((a, b) => b.timestamp - a.timestamp);
			const hot = allHistory.slice(0, 50);
			const cold = allHistory.slice(50);
			if (cold.length) await dbSet("cold_history", JSON.stringify(cold));
			next.history = hot;
			next._coldCount = cold.length;
			next.total_tokens = agg.total_tokens;
			next.total_cost = agg.total_cost;
			next.input_tokens = agg.input_tokens;
			next.output_tokens = agg.output_tokens;
			next.cache_hit_tokens = agg.cache_hit_tokens;
			next.cache_miss_tokens = agg.cache_miss_tokens;
			next.input_cost = agg.input_cost;
			next.output_cost = agg.output_cost;
			next.rounds = agg.rounds;
			next.startTime = count ? earliest : Date.now();
		} catch {}
		else {
			next.history = [];
			next.total_tokens = 0;
			next.total_cost = 0;
			next.input_tokens = 0;
			next.output_tokens = 0;
			next.cache_hit_tokens = 0;
			next.cache_miss_tokens = 0;
			next.input_cost = 0;
			next.output_cost = 0;
			next.rounds = 0;
			next.startTime = Date.now();
		}
		if (settingsRaw) try {
			next.settings = JSON.parse(settingsRaw);
		} catch {}
		if (balanceRaw) try {
			next.balance = JSON.parse(balanceRaw);
		} catch {
			next.balance = balanceRaw;
		}
		if (customBal) next.customBalance = customBal;
		if (msgCount) next.messageCount = parseInt(msgCount, 10) || 0;
		saveExtensionSettings({
			...cur || {},
			...next
		});
	} catch {}
}
async function loadHot() {
	await migrateIfNeeded();
	return getExtensionSettings();
}
async function readHistoryColdRaw() {
	try {
		const raw = await dbGet("cold_history");
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) throw new Error("冷历史格式无效");
		return parsed;
	} catch (error) {
		log.error("冷历史读取失败", error);
		throw error;
	}
}
var coldWriteChain = Promise.resolve();
function enqueueColdWrite(task) {
	const run = coldWriteChain.then(task, task);
	coldWriteChain = run.catch(() => {});
	return run;
}
async function loadHistoryCold() {
	await coldWriteChain;
	return readHistoryColdRaw();
}
async function appendHistoryCold(entries) {
	if (!entries.length) return;
	return enqueueColdWrite(async () => {
		const cold = await readHistoryColdRaw();
		const keyOf = historyRecordKey;
		const seen = new Set(cold.map((h) => keyOf(h)));
		const toAdd = entries.filter((h) => !seen.has(keyOf(h)));
		if (!toAdd.length) return;
		const next = [...toAdd, ...cold];
		await dbSet("cold_history", JSON.stringify(next));
		try {
			const cur = getExtensionSettings();
			if (cur) saveExtensionSettings({
				...cur,
				_coldCount: next.length,
				_updated: Date.now()
			});
		} catch {}
	});
}
async function saveHistoryCold(entries) {
	const next = Array.isArray(entries) ? entries : [];
	return enqueueColdWrite(async () => {
		await dbSet("cold_history", JSON.stringify(next));
		try {
			const cur = getExtensionSettings();
			if (cur) saveExtensionSettings({
				...cur,
				_coldCount: next.length,
				_updated: Date.now()
			});
		} catch {}
	});
}
async function clearHistoryCold() {
	return enqueueColdWrite(async () => {
		await dbDelete("cold_history");
		try {
			const cur = getExtensionSettings();
			if (cur) saveExtensionSettings({
				...cur,
				_coldCount: 0,
				_updated: Date.now()
			});
		} catch {}
	});
}
async function getAllHistory() {
	const hot = getExtensionSettings()?.history || [];
	const cold = await loadHistoryCold();
	const merged = [...hot, ...cold].sort((a, b) => b.timestamp - a.timestamp);
	const keyOf = historyRecordKey;
	const seen = /* @__PURE__ */ new Set();
	const dedup = [];
	for (const h of merged) {
		const k = keyOf(h);
		if (!seen.has(k)) {
			seen.add(k);
			dedup.push(h);
		}
	}
	return dedup;
}
//#endregion
export { loadHistoryCold as a, saveExtensionSettings as c, historyRecordKey as d, getExtensionSettings as i, saveHistoryCold as l, clearHistoryCold as n, loadHot as o, getAllHistory as r, persistence_exports as s, appendHistoryCold as t, saveHot as u };
