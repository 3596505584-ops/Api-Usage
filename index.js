import { pn as __exportAll } from "./graphic-BAx7jeh4.js";
import { n as getSelectedSave, r as state$2, t as getHistoryForDisplay } from "./store-Cc2SGj8q.js";
import { a as HIDDEN_PRICING_MODELS, l as PRICING, p as WEBDAV_SYNC_FILE, r as DEFAULT_PEAK_HOURS, t as DEFAULT_CONTEXT_LIMIT } from "./pricing-Bc-qEvy8.js";
import { c as saveExtensionSettings, d as historyRecordKey, i as getExtensionSettings, u as saveHot } from "./persistence-C4IJVd-B.js";
import { r as toast, t as log } from "./logger-8RGXnvfI.js";
import { A as DEEPSEEK_WALLET_ID, C as findWalletModel, E as walletPendingModelCount, S as findWalletForHistory, T as walletBalanceToCny, _ as normalizeModel, a as decryptKey, b as defaultContextLimitForModel, c as isTruncatedFinish, d as calcCost, f as calcSavings, g as isWalletPeakHour, h as isPeakHour, i as saveWalletApiKey, j as WALLET_CATALOG_PROVIDERS, l as DataEvents, m as isDeepSeekOfficialModel, o as encryptKey, p as getPricing$1, r as getWalletApiKey, s as sanitizeHistoryTiming, t as repository, u as on, w as mergeWalletCollections } from "./repository-JvxNaSRi.js";
import { a as isUnsafeKey$1, c as localDay$1, i as isPeakHour$1, l as localTimeHM, n as isChinaHoliday, o as isValidDayKey, r as isExtraOffDay, s as isWeekendDay, t as esc$2, u as CN_HOLIDAY_COVERAGE_LABEL } from "./date-BJI2m6dS.js";
import { a as getWalletExchangeRate, i as getDisplayCurrency, n as fetchLiveRate, r as formatMoney } from "./currency-BZt-7TC7.js";
import { r as recalcAllCosts, t as installInterception } from "./interception-BoETqAOw.js";
import { i as saveApiKey, n as queryBalance, r as queryWalletBalance } from "./balance-C3MhaV_X.js";
import { a as removeSyncedModels, n as isSyncedCustomModel, o as syncPricingFromModelsDev, r as previewSync, t as fetchModelsDevCatalog } from "./pricing-sync-CADPKT9h.js";
//#region src/services/import-export.ts
function isUnsafeKey(k) {
	return k === "__proto__" || k === "constructor" || k === "prototype";
}
function finiteNonNegative(value, fallback = 0) {
	const number = typeof value === "number" ? value : parseFloat(String(value));
	return Number.isFinite(number) && number >= 0 ? number : fallback;
}
function cleanText(value) {
	return String(value ?? "").trim() || null;
}
function sanitizeImportedValue(value, depth = 0) {
	if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
	if (depth >= 6) return null;
	if (Array.isArray(value)) return value.map((item) => sanitizeImportedValue(item, depth + 1));
	if (typeof value !== "object") return null;
	const clean = {};
	for (const [key, item] of Object.entries(value)) {
		if (isUnsafeKey(key)) continue;
		clean[key] = sanitizeImportedValue(item, depth + 1);
	}
	return clean;
}
function stripHistory$1(history) {
	return history.filter((h) => h && h._debug !== true).map((h) => {
		const c = { ...h };
		delete c.messages;
		delete c.fullRequest;
		delete c.fullResponse;
		return c;
	});
}
async function exportHistory() {
	const doc = window.parent?.document ?? document;
	const d = /* @__PURE__ */ new Date();
	const pad = (n) => n < 10 ? "0" + n : "" + n;
	const safeSettings = JSON.parse(JSON.stringify(state$2.settings || {}));
	if (safeSettings.webdav) safeSettings.webdav = {
		url: "",
		username: "",
		path: "",
		proxy: ""
	};
	const _appVer = "3.1.5";
	let fullHist = [];
	try {
		fullHist = await repository.getAllHistory();
	} catch (error) {
		alert("导出失败：无法读取完整历史（" + (error?.message || error) + "）");
		return;
	}
	const payload = {
		format: "deepseek-stat-export",
		version: 1,
		exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
		appVersion: _appVer,
		scope: "full",
		walletFormat: 2,
		data: {
			history: stripHistory$1(fullHist),
			total_tokens: state$2.total_tokens,
			total_cost: state$2.total_cost,
			input_tokens: state$2.input_tokens,
			output_tokens: state$2.output_tokens,
			cache_hit_tokens: state$2.cache_hit_tokens,
			cache_miss_tokens: state$2.cache_miss_tokens,
			input_cost: state$2.input_cost,
			output_cost: state$2.output_cost,
			rounds: state$2.rounds,
			startTime: state$2.startTime,
			balance: state$2.balance,
			customBalance: state$2.customBalance,
			wallets: state$2.wallets,
			walletIgnored: state$2.walletIgnored,
			settings: safeSettings,
			messageCount: state$2.messageCount,
			saves: { default: {
				name: "default",
				history: stripHistory$1(fullHist),
				total_tokens: state$2.total_tokens,
				total_cost: state$2.total_cost,
				input_tokens: state$2.input_tokens,
				output_tokens: state$2.output_tokens,
				cache_hit_tokens: state$2.cache_hit_tokens,
				cache_miss_tokens: state$2.cache_miss_tokens,
				input_cost: state$2.input_cost,
				output_cost: state$2.output_cost,
				rounds: state$2.rounds,
				startTime: state$2.startTime
			} },
			currentSave: "default"
		}
	};
	const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = doc.createElement("a");
	a.href = url;
	a.download = `API用量统计_导出_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`;
	doc.body.appendChild(a);
	a.click();
	doc.body.removeChild(a);
	setTimeout(() => {
		try {
			URL.revokeObjectURL(url);
		} catch {}
	}, 1e3);
}
function normalizeImportData(raw) {
	if (!raw || typeof raw !== "object") return { error: "文件格式不正确" };
	let version = raw.version ?? 1;
	if (typeof version !== "number" || isNaN(version) || version < 1) version = 1;
	if (version > 1) return { error: `文件版本 v${version} 高于当前 v1，请升级扩展` };
	const d = raw.data;
	if (!d || typeof d !== "object") return { error: "文件中缺少数据" };
	let history = [];
	if (Array.isArray(d.history)) history = d.history;
	else if (d.saves && typeof d.saves === "object") for (const s of Object.values(d.saves)) {
		const h = s.history || [];
		history = history.concat(h);
	}
	const cleaned = [];
	let skipped = 0;
	for (const h of history) {
		if (!h || typeof h !== "object") {
			skipped++;
			continue;
		}
		const timestamp = finiteNonNegative(h.timestamp, NaN);
		const rawModel = cleanText(h.model);
		if (!Number.isFinite(timestamp) || timestamp <= 0 || !rawModel) {
			skipped++;
			continue;
		}
		const model = normalizeModel(rawModel);
		const nh = {
			timestamp,
			model,
			rawModel: rawModel !== model ? rawModel : null,
			prompt_tokens: finiteNonNegative(h.prompt_tokens),
			cache_hit_tokens: finiteNonNegative(h.cache_hit_tokens),
			cache_miss_tokens: finiteNonNegative(h.cache_miss_tokens),
			completion_tokens: finiteNonNegative(h.completion_tokens),
			total_tokens: finiteNonNegative(h.total_tokens),
			priceType: cleanText(h.priceType) || "old"
		};
		const SKIP_IMPORT = /* @__PURE__ */ new Set([
			"messages",
			"fullRequest",
			"fullResponse",
			"raw_usage"
		]);
		for (const f of Object.keys(h)) {
			if (isUnsafeKey(f) || SKIP_IMPORT.has(f)) continue;
			if (nh[f] === void 0) nh[f] = sanitizeImportedValue(h[f]);
		}
		for (const field of [
			"cost",
			"input_cost",
			"output_cost"
		]) if (nh[field] !== void 0) nh[field] = finiteNonNegative(nh[field]);
		sanitizeHistoryTiming(nh);
		cleaned.push(nh);
	}
	cleaned.sort((a, b) => b.timestamp - a.timestamp);
	return {
		data: {
			history: cleaned,
			balance: sanitizeImportedValue(d.balance),
			customBalance: sanitizeImportedValue(d.customBalance),
			wallets: Array.isArray(d.wallets) ? sanitizeImportedValue(d.wallets) : void 0,
			walletIgnored: Array.isArray(d.walletIgnored) ? sanitizeImportedValue(d.walletIgnored) : void 0,
			settings: sanitizeImportedValue(d.settings),
			messageCount: finiteNonNegative(d.messageCount),
			total_tokens: finiteNonNegative(d.total_tokens),
			total_cost: finiteNonNegative(d.total_cost),
			input_tokens: finiteNonNegative(d.input_tokens),
			output_tokens: finiteNonNegative(d.output_tokens),
			cache_hit_tokens: finiteNonNegative(d.cache_hit_tokens),
			cache_miss_tokens: finiteNonNegative(d.cache_miss_tokens),
			input_cost: finiteNonNegative(d.input_cost),
			output_cost: finiteNonNegative(d.output_cost),
			rounds: finiteNonNegative(d.rounds),
			startTime: finiteNonNegative(d.startTime, Date.now())
		},
		skipped: { entries: skipped }
	};
}
async function applyImportedData(d, mode) {
	if (mode === "overwrite") await repository.replaceAll({
		history: d.history || [],
		total_tokens: d.total_tokens ?? (d.history || []).reduce((a, h) => a + (h.total_tokens || 0), 0),
		total_cost: d.total_cost ?? (d.history || []).reduce((a, h) => a + (h.cost || 0), 0),
		input_tokens: d.input_tokens ?? 0,
		output_tokens: d.output_tokens ?? 0,
		cache_hit_tokens: d.cache_hit_tokens ?? 0,
		cache_miss_tokens: d.cache_miss_tokens ?? 0,
		input_cost: d.input_cost ?? 0,
		output_cost: d.output_cost ?? 0,
		rounds: d.rounds ?? 0,
		startTime: d.startTime ?? Date.now(),
		balance: d.balance,
		customBalance: d.customBalance,
		wallets: d.wallets,
		walletIgnored: d.walletIgnored,
		settings: d.settings,
		messageCount: d.messageCount
	}, { clearCold: true });
	else {
		const existing = await repository.getAllHistory();
		const seen = new Set(existing.map((h) => historyRecordKey(h)));
		const toAdd = [];
		for (const h of d.history || []) {
			const key = historyRecordKey(h);
			if (!seen.has(key)) {
				seen.add(key);
				toAdd.push(h);
			}
		}
		const merged = [...toAdd, ...existing].sort((a, b) => b.timestamp - a.timestamp);
		await repository.replaceAll({ history: merged });
		if (Array.isArray(d.wallets)) await repository.replaceAll({
			wallets: mergeWalletCollections(repository.getWallets(), d.wallets),
			walletIgnored: Array.from(/* @__PURE__ */ new Set([...state$2.walletIgnored || [], ...d.walletIgnored || []]))
		});
	}
	await repository.recalcAll();
	await repository.rebuildAggregates();
	try {
		globalThis.ApiUsageStat?.refreshUI?.();
	} catch {}
}
function bindImportExport(doc) {
	const exp = doc.getElementById("aus-btn-export");
	if (exp) exp.onclick = () => exportHistory();
	const imp = doc.getElementById("aus-btn-import");
	if (imp) imp.onclick = () => triggerImport();
}
function triggerImport() {
	const doc = window.parent?.document ?? document;
	let inputEl = doc.getElementById("aus-import-file");
	if (!inputEl) {
		const el = doc.createElement("input");
		el.type = "file";
		el.id = "aus-import-file";
		el.accept = ".json,application/json";
		el.style.display = "none";
		doc.body.appendChild(el);
		el.addEventListener("change", () => {
			const inp = el;
			const file = inp.files?.[0];
			inp.value = "";
			if (!file) return;
			const reader = new FileReader();
			reader.onload = async () => {
				let raw = null;
				try {
					raw = JSON.parse(reader.result);
				} catch {}
				if (!raw || raw.format !== "deepseek-stat-export") return alert("导入失败：文件格式不正确");
				const res = normalizeImportData(raw);
				if (res.error) return alert("导入失败：" + res.error);
				const mode = confirm("导入方式：\n确定 = 合并导入（推荐，按时间戳去重）\n取消 = 覆盖导入（替换全部数据）") ? "merge" : "overwrite";
				if (mode === "overwrite" && !confirm("覆盖将删除现有全部统计并无法恢复，确定要覆盖？")) return;
				try {
					await applyImportedData(res.data, mode);
					alert(mode === "overwrite" ? "已覆盖导入" : "已合并导入");
				} catch (error) {
					alert("导入失败：" + (error?.message || error));
				}
			};
			reader.readAsText(file, "utf-8");
		});
		inputEl = el;
	}
	inputEl.click();
}
//#endregion
//#region src/ui/icons.ts
var PATHS = {
	overview: "<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/>",
	stats: "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/><path d=\"M18 17V9\"/><path d=\"M13 17V5\"/><path d=\"M8 17v-3\"/>",
	history: "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/><path d=\"M12 7v5l4 2\"/>",
	forecast: "<path d=\"M16 7h6v6\"/><path d=\"m22 7-8.5 8.5-5-5L2 17\"/>",
	wallet: "<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\"/>",
	settings: "<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
	help: "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"/><path d=\"M12 17h.01\"/>",
	about: "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4\"/><path d=\"M12 8h.01\"/>",
	"chevron-down": "<path d=\"m6 9 6 6 6-6\"/>",
	"chevron-up": "<path d=\"m18 15-6-6-6 6\"/>",
	"chevron-left": "<path d=\"m15 18-6-6 6-6\"/>",
	"chevron-right": "<path d=\"m9 18 6-6-6-6\"/>",
	refresh: "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"/><path d=\"M21 3v5h-5\"/><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"/><path d=\"M8 16H3v5\"/>",
	close: "<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>",
	menu: "<path d=\"M4 6h16\"/><path d=\"M4 12h16\"/><path d=\"M4 18h16\"/>",
	brand: "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"4\"/><path d=\"M8 15v-3\"/><path d=\"M12 15V9\"/><path d=\"M16 15v-2\"/>"
};
/**
* 生成内联 SVG；尺寸默认 20px、线宽 1.9，颜色继承 currentColor。
* 用 inline-block + vertical-align 保证既能进 flex 容器居中，也能跟在文字旁边不换行。
*/
function icon(name, size = 20, strokeWidth = 1.9) {
	return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="display:inline-block;vertical-align:middle;flex-shrink:0;">${PATHS[name]}</svg>`;
}
//#endregion
//#region src/services/sync.ts
function b64(s) {
	try {
		return btoa(unescape(encodeURIComponent(s)));
	} catch {
		return btoa(s);
	}
}
function rawFetch() {
	try {
		const p = window.parent;
		return p?.fetch?.bind(p) ?? fetch.bind(window);
	} catch {
		return fetch.bind(window);
	}
}
function authHeader() {
	const cfg = state$2.settings.webdav || {};
	let pass = "";
	try {
		pass = decryptKey(localStorage.getItem("ds_ds_webdav_pass") || "");
	} catch {}
	try {
		const v = globalThis.SillyTavern?.getContext?.().extensionSettings?.["api_usage_stat"]?.webdavPass;
		if (v) pass = decryptKey(v);
	} catch {}
	return "Basic " + b64((cfg.username || "") + ":" + pass);
}
function realUrl() {
	const cfg = state$2.settings.webdav || {};
	const base = (cfg.url || "").trim().replace(/\/+$/, "");
	const path = (cfg.path || "").trim().replace(/^\/+|\/+$/g, "");
	let u = base + "/";
	if (path) u += path + "/";
	u += WEBDAV_SYNC_FILE;
	return u;
}
function reqUrl(u) {
	const proxy = (state$2.settings.webdav?.proxy || "").trim();
	if (!proxy) return u;
	if (proxy.indexOf("?") !== -1) return proxy + encodeURIComponent(u);
	return proxy.replace(/\/+$/, "") + "/" + encodeURIComponent(u);
}
function dirs() {
	const cfg = state$2.settings.webdav || {};
	const base = (cfg.url || "").trim().replace(/\/+$/, "");
	const path = (cfg.path || "").trim().replace(/^\/+|\/+$/g, "");
	const out = [];
	if (path) {
		let acc = base;
		path.split("/").forEach((seg) => {
			if (seg) {
				acc += "/" + seg;
				out.push(acc);
			}
		});
	}
	return out;
}
async function webdavGet() {
	const url = reqUrl(realUrl());
	try {
		const r = await rawFetch()(url, {
			method: "GET",
			headers: {
				Authorization: authHeader(),
				Accept: "*/*"
			}
		});
		if (r.status === 404) return { exists: false };
		if (!r.ok) return {
			exists: true,
			error: true,
			status: r.status
		};
		return {
			exists: true,
			text: await r.text()
		};
	} catch (e) {
		return {
			exists: false,
			netError: true,
			errName: e?.name || "",
			errMsg: e?.message || String(e)
		};
	}
}
async function webdavMkcol(dir) {
	const url = reqUrl(dir);
	try {
		const r = await rawFetch()(url, {
			method: "MKCOL",
			headers: { Authorization: authHeader() }
		});
		if (r.status === 201 || r.status === 405 || r.status === 204) return true;
		if (r.status === 409) return false;
		return false;
	} catch {
		return false;
	}
}
async function webdavPut(text) {
	for (const d of dirs()) await webdavMkcol(d);
	const url = reqUrl(realUrl());
	const r = await rawFetch()(url, {
		method: "PUT",
		headers: {
			Authorization: authHeader(),
			"Content-Type": "application/json; charset=utf-8"
		},
		body: text
	});
	if (!r.ok) throw new Error("上传失败 HTTP " + r.status);
}
function stripHistory(history) {
	return history.filter((h) => h && h._debug !== true).map((h) => {
		const c = { ...h };
		delete c.messages;
		delete c.fullRequest;
		delete c.fullResponse;
		return c;
	});
}
async function buildLocalBundle() {
	const history = await repository.getAllHistory();
	const settings = JSON.parse(JSON.stringify(state$2.settings));
	if (settings.webdav) settings.webdav = {
		url: "",
		username: "",
		path: "",
		proxy: ""
	};
	return {
		format: "deepseek-stat-sync",
		version: 2,
		walletFormat: 2,
		syncedAt: Date.now(),
		data: {
			history: stripHistory(history),
			total_tokens: state$2.total_tokens,
			total_cost: state$2.total_cost,
			input_tokens: state$2.input_tokens,
			output_tokens: state$2.output_tokens,
			cache_hit_tokens: state$2.cache_hit_tokens,
			cache_miss_tokens: state$2.cache_miss_tokens,
			input_cost: state$2.input_cost,
			output_cost: state$2.output_cost,
			rounds: state$2.rounds,
			startTime: state$2.startTime,
			balance: state$2.balance,
			customBalance: state$2.customBalance,
			wallets: state$2.wallets,
			walletIgnored: state$2.walletIgnored,
			settings,
			messageCount: state$2.messageCount
		},
		_ts: {}
	};
}
function mergeBundles(remote, local) {
	const rd = remote.data || {}, ld = local.data || {};
	const toHistory = (d) => {
		if (Array.isArray(d.history)) return d.history;
		if (d.saves && typeof d.saves === "object") {
			let arr = [];
			for (const s of Object.values(d.saves)) arr = arr.concat(s.history || []);
			return arr;
		}
		return [];
	};
	const clean = (arr) => arr.map((e) => {
		if (e && typeof e === "object") {
			for (const k of Object.keys(e)) if (isUnsafeKey$1(k)) delete e[k];
		}
		return e;
	});
	const lh = clean(toHistory(ld)), rh = clean(toHistory(rd));
	const keyOf = historyRecordKey;
	const lseen = new Set(lh.map((h) => keyOf(h)));
	const rseen = new Set(rh.map((h) => keyOf(h)));
	let pulled = 0, pushed = 0;
	const merged = [
		...rh.filter((h) => {
			if (!lseen.has(keyOf(h))) {
				pulled++;
				return true;
			}
			return false;
		}),
		...lh.filter((h) => {
			if (!rseen.has(keyOf(h))) {
				pushed++;
				return true;
			}
			return false;
		}),
		...lh.filter((h) => rseen.has(keyOf(h)))
	];
	const dedup = /* @__PURE__ */ new Map();
	for (const h of merged) dedup.set(keyOf(h), h);
	let hist = Array.from(dedup.values()).sort((a, b) => b.timestamp - a.timestamp);
	return {
		mergedData: {
			history: hist,
			total_tokens: ld.total_tokens ?? rd.total_tokens ?? hist.reduce((a, h) => a + (h.total_tokens || 0), 0),
			total_cost: ld.total_cost ?? rd.total_cost ?? hist.reduce((a, h) => a + (h.cost || 0), 0),
			input_tokens: ld.input_tokens ?? rd.input_tokens ?? 0,
			output_tokens: ld.output_tokens ?? rd.output_tokens ?? 0,
			cache_hit_tokens: ld.cache_hit_tokens ?? rd.cache_hit_tokens ?? 0,
			cache_miss_tokens: ld.cache_miss_tokens ?? rd.cache_miss_tokens ?? 0,
			input_cost: ld.input_cost ?? rd.input_cost ?? 0,
			output_cost: ld.output_cost ?? rd.output_cost ?? 0,
			rounds: ld.rounds ?? rd.rounds ?? hist.length,
			startTime: ld.startTime ?? rd.startTime ?? Date.now(),
			balance: ld.balance ?? rd.balance,
			customBalance: ld.customBalance ?? rd.customBalance,
			wallets: mergeWalletCollections(ld.wallets || repository.getWallets(), rd.wallets || []),
			walletIgnored: Array.from(/* @__PURE__ */ new Set([...ld.walletIgnored || [], ...rd.walletIgnored || []])),
			messageCount: ld.messageCount ?? rd.messageCount,
			settings: ld.settings ?? rd.settings
		},
		pulled,
		pushed
	};
}
var syncing = false;
async function doSyncNow() {
	if (syncing) return alert("同步进行中");
	const cfg = state$2.settings.webdav || {};
	if (!cfg.url || !cfg.username) return alert("请先在设置中填写 WebDAV 地址与用户名");
	if (!/^https:\/\//i.test(cfg.url)) return alert("WebDAV 地址必须为 https");
	const proxy = (cfg.proxy || "").trim();
	if (proxy && !/^https:\/\//i.test(proxy)) {
		if (!confirm("CORS 代理非 https，WebDAV 用户名密码将以可被截获的方式经该代理传输。\n仍要继续？")) return;
	}
	syncing = true;
	const btn = window.parent?.document?.getElementById("aus-webdav-sync");
	if (btn) {
		btn.disabled = true;
		btn.textContent = "同步中…";
	}
	try {
		const local = await buildLocalBundle();
		const res = await webdavGet();
		if (res.netError) {
			const isCors = res.errName === "TypeError" || /Failed to fetch|NetworkError|CORS/i.test(res.errMsg || "");
			throw new Error(isCors ? "CORS 被拦截，请配置 CORS 代理" : "网络错误: " + (res.errMsg || "未知"));
		}
		if (res.error) throw new Error("读取云端失败 HTTP " + res.status);
		let merged;
		if (!res.exists) merged = {
			mergedData: local.data,
			pulled: 0,
			pushed: 0
		};
		else {
			let remote;
			try {
				remote = JSON.parse(res.text);
			} catch {
				throw new Error("云端文件解析失败");
			}
			if (remote.format !== "deepseek-stat-sync") throw new Error("云端格式不符");
			if (remote.version > 2) throw new Error("云端版本过高，请升级扩展");
			merged = mergeBundles(remote, local);
		}
		await repository.replaceAll(merged.mergedData);
		await repository.recalcAll();
		await repository.rebuildAggregates();
		const uploaded = await buildLocalBundle();
		await webdavPut(JSON.stringify(uploaded));
		alert(`同步完成${merged.pulled ? `（拉取 ${merged.pulled} 条）` : ""}${merged.pushed ? `（上传 ${merged.pushed} 条）` : ""}`);
		try {
			globalThis.ApiUsageStat?.refreshUI?.();
		} catch {}
	} catch (e) {
		alert("同步失败: " + (e?.message || e));
	} finally {
		syncing = false;
		if (btn) {
			btn.disabled = false;
			btn.textContent = "☁️ 立即同步";
		}
	}
}
function saveWebdavPass(pass) {
	try {
		if (pass) localStorage.setItem("ds_ds_webdav_pass", encryptKey(pass));
		else localStorage.removeItem("ds_ds_webdav_pass");
		const ctx = globalThis.SillyTavern?.getContext?.();
		if (ctx?.extensionSettings) {
			ctx.extensionSettings["api_usage_stat"] = ctx.extensionSettings["api_usage_stat"] || {};
			if (pass) ctx.extensionSettings["api_usage_stat"].webdavPass = encryptKey(pass);
			else delete ctx.extensionSettings["api_usage_stat"].webdavPass;
			ctx.saveSettingsDebounced?.();
		}
	} catch {}
}
//#endregion
//#region src/services/theme.ts
var DARK_QUERY = "(prefers-color-scheme: dark)";
/** 归一化用户设置值，非法值一律视为 light（保持旧版本行为） */
function normalizeThemeMode(v) {
	return v === "dark" || v === "auto" ? v : "light";
}
/** 取宿主窗口：面板可能运行在 iframe 中，优先 parent */
function hostWindow() {
	try {
		const p = window?.parent;
		if (p && typeof p.matchMedia === "function") return p;
	} catch {}
	try {
		if (typeof window !== "undefined" && typeof window.matchMedia === "function") return window;
	} catch {}
	return null;
}
/** 系统是否处于深色（不支持 prefers-color-scheme 时返回 false） */
function systemPrefersDark(win) {
	const w = win ?? hostWindow();
	try {
		if (!w || typeof w.matchMedia !== "function") return false;
		return !!w.matchMedia(DARK_QUERY).matches;
	} catch {
		return false;
	}
}
/** 把设置值解析为真正生效的 light / dark */
function resolveTheme(mode, win) {
	const m = normalizeThemeMode(mode);
	if (m === "dark") return "dark";
	if (m === "auto") return systemPrefersDark(win) ? "dark" : "light";
	return "light";
}
function getDoc$11() {
	try {
		const parentDoc = window.parent?.document;
		if (parentDoc) return parentDoc;
	} catch {}
	try {
		return document;
	} catch {
		return {};
	}
}
/** 仅同步 DOM 属性，不读设置、不落盘 */
function paintTheme(mode, resolved) {
	const r = resolved ?? resolveTheme(mode);
	try {
		const doc = getDoc$11();
		const panel = doc.getElementById("aus-panel");
		if (panel) panel.setAttribute("data-ds-theme", r);
		const overlay = doc.getElementById("aus-overlay");
		if (overlay) {
			overlay.setAttribute("data-extension", "api-usage-stat");
			overlay.setAttribute("data-ds-theme", r);
		}
		try {
			document.documentElement.removeAttribute("data-ds-theme");
			document.documentElement.removeAttribute("data-extension");
		} catch {}
		try {
			doc.documentElement.removeAttribute("data-ds-theme");
			if (doc.documentElement.getAttribute("data-extension") === "api-usage-stat") {
				if (!!doc.getElementById("aus-panel")) doc.documentElement.removeAttribute("data-extension");
			}
		} catch {}
	} catch {}
}
function applyTheme(theme) {
	const t = normalizeThemeMode(theme ?? state$2.settings?.theme);
	paintTheme(t);
	if (t === "auto") try {
		watchSystemTheme();
	} catch {}
}
var boundWin = null;
var boundMql = null;
var boundHandler = null;
/**
* 主题实际变化后需要重绘的动态内容。
* ECharts 的配色在绘制时就已固化进 option，不随 CSS 变量更新，必须重建实例再重绘；
* 热力图等内联色值同理。refreshUI 会在面板打开时重绘 概览/统计/预测/钱包 四个视图。
*/
function repaintDynamic() {
	try {
		globalThis.ApiUsageStat?.refreshTheme?.();
	} catch {}
}
/**
* 监听系统配色变化：仅在 auto 模式下响应。
* 同一 window 只绑一次；宿主不支持 addEventListener 时静默降级（不抛错）。
*/
function watchSystemTheme(win) {
	const w = win ?? hostWindow();
	if (!w || typeof w.matchMedia !== "function") return;
	if (boundWin === w) return;
	unwatchSystemTheme();
	try {
		const mql = w.matchMedia(DARK_QUERY);
		if (!mql || typeof mql.addEventListener !== "function") return;
		boundHandler = (e) => {
			if (normalizeThemeMode(state$2.settings?.theme) !== "auto") return;
			paintTheme("auto", e?.matches ? "dark" : "light");
			let hasPanel = false;
			try {
				hasPanel = !!getDoc$11().getElementById("aus-panel");
			} catch {}
			if (hasPanel) repaintDynamic();
		};
		mql.addEventListener("change", boundHandler);
		boundWin = w;
		boundMql = mql;
	} catch {}
}
/** 解除监听（扩展禁用时调用，避免热重载后重复触发） */
function unwatchSystemTheme() {
	try {
		if (boundMql && boundHandler) boundMql.removeEventListener("change", boundHandler);
	} catch {}
	boundMql = null;
	boundWin = null;
	boundHandler = null;
}
/** 设置切换后调用：auto 时确保监听已建立 */
function syncThemeWatcher() {
	if (normalizeThemeMode(state$2.settings?.theme) === "auto") watchSystemTheme();
}
//#endregion
//#region src/services/storage-usage.ts
/**
* 存储占用统计：统计本扩展在各类存储中占用的空间。
*
* 本扩展的数据实际分布在四个地方（见 store/persistence.ts）：
*  1. SillyTavern 设置（extensionSettings.api_usage_stat）—— 热数据：最近 50 条历史 + 设置 + 汇总
*     注：由酒馆统一序列化进其 settings.json，浏览器端拿不到落盘字节数，只能按 UTF-8 估算
*  2. IndexedDB `api_usage_stat_db` / `kv` —— 冷历史、旧版迁移备份
*  3. localStorage —— 零星小项（WebDAV 密码密文、峰值圆点位置、调试开关、更新检查时间、预测页偏好）
*  4. 浏览器存储配额（navigator.storage.estimate）—— 全局参考，不是本扩展独占
*
* 兼容性要点：
*  - `navigator.storage.estimate` 仅在安全上下文（https / localhost）可用；http 局域网访问时缺失，
*    此时标记为“不可用”，不显示假数据。
*  - `navigator.storage.persisted` 在 Safari 早期版本缺失，按未知处理。
*  - 隐私模式 / 第三方 Cookie 被拦截时 IndexedDB 可能直接抛错，全部走 try/catch 降级。
*  - 统一用 UTF-8 字节数（TextEncoder），不用 .length（UTF-16 码元数会低估中文占用）。
*/
var DB_NAME = "api_usage_stat_db";
var STORE_NAME = "kv";
/** UTF-8 字节数（中文 3 字节，避免用 length 低估） */
function utf8Bytes(text) {
	if (!text) return 0;
	try {
		if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text).length;
	} catch {}
	let n = 0;
	for (let i = 0; i < text.length; i++) {
		const c = text.charCodeAt(i);
		if (c < 128) n += 1;
		else if (c < 2048) n += 2;
		else if (c >= 55296 && c <= 56319) {
			n += 4;
			i++;
		} else n += 3;
	}
	return n;
}
/** 人类可读的容量文本。始终用二进制单位（KB=1024），与系统/浏览器存储界面口径一致 */
function formatBytes(bytes) {
	if (bytes == null || !isFinite(bytes) || bytes < 0) return "—";
	if (bytes < 1024) return `${Math.round(bytes)} B`;
	const units = [
		"KB",
		"MB",
		"GB",
		"TB"
	];
	let v = bytes / 1024;
	let i = 0;
	while (v >= 1024 && i < units.length - 1) {
		v /= 1024;
		i++;
	}
	const digits = v < 10 ? 2 : v < 100 ? 1 : 0;
	return `${parseFloat(v.toFixed(digits))} ${units[i]}`;
}
var LS_PREFIX_KEYS = [
	{
		key: "webdav_pass",
		label: "WebDAV 密码（XOR）",
		match: (k) => k === "ds_ds_webdav_pass"
	},
	{
		key: "peak_dot",
		label: "峰值圆点位置",
		match: (k) => k === "ds_ds_peak_dot_pos"
	},
	{
		key: "debug_log",
		label: "调试日志开关",
		match: (k) => k === "ds_debug_log"
	},
	{
		key: "update",
		label: "更新检查记录",
		match: (k) => k.startsWith("aus_update_")
	},
	{
		key: "forecast_prefs",
		label: "预测页偏好",
		match: (k) => k === "aus_forecast_prefs_v1"
	},
	{
		key: "idb_fallback",
		label: "本地存储降级副本",
		match: (k) => k.startsWith("aus_cold")
	}
];
function readLocalStorage(doc) {
	let ls = null;
	try {
		ls = doc.defaultView?.localStorage ?? null;
	} catch {
		ls = null;
	}
	if (!ls) return [];
	let keys = [];
	try {
		for (let i = 0; i < ls.length; i++) {
			const k = ls.key(i);
			if (k) keys.push(k);
		}
	} catch {
		return [];
	}
	const items = [];
	const used = /* @__PURE__ */ new Set();
	for (const def of LS_PREFIX_KEYS) {
		let bytes = 0;
		let count = 0;
		for (const k of keys) {
			if (used.has(k) || !def.match(k)) continue;
			try {
				bytes += utf8Bytes(ls.getItem(k)) + utf8Bytes(k);
			} catch {}
			used.add(k);
			count++;
		}
		if (count > 0) items.push({
			key: `ls-${def.key}`,
			label: def.label,
			bytes
		});
	}
	return items;
}
/**
* 打开本扩展的 IndexedDB。读不到返回 null（隐私模式、被拦截、从未写入过）。
* 用 openDatabase 时不会在全新浏览器上创建空库；但标准 indexedDB 只有 open()，
* 而 open() 在库不存在时会触发 upgradeneeded 并真的建一个空库 —— 为避免“看一眼就建库”，
* 先用 databases() 探测是否存在（Chrome 71+ / Safari 14+ / Firefox 126+），
* 不支持 databases() 的环境退回 open()，且不写入任何数据（空库 0 字节，无害）。
*/
function openDb(doc) {
	return new Promise((resolve) => {
		let idb = null;
		try {
			idb = doc.defaultView?.indexedDB ?? null;
		} catch {
			idb = null;
		}
		if (!idb) return resolve(null);
		let settled = false;
		const done = (db) => {
			if (settled) {
				try {
					db?.close();
				} catch {}
				return;
			}
			settled = true;
			resolve(db);
		};
		const doOpen = () => {
			try {
				const req = idb.open(DB_NAME, 1);
				req.onsuccess = (e) => done(e.target.result);
				req.onerror = () => done(null);
				req.onblocked = () => done(null);
				req.onupgradeneeded = () => {
					try {
						req.result.createObjectStore(STORE_NAME);
					} catch {}
				};
			} catch {
				done(null);
			}
		};
		const probe = idb.databases;
		if (typeof probe === "function") try {
			probe.call(idb).then((list) => {
				if (settled) return;
				if (Array.isArray(list) && list.some((d) => d && d.name === DB_NAME)) doOpen();
				else done(null);
			}).catch(() => done(null));
			return;
		} catch {}
		done(null);
	});
}
async function readIndexedDb(doc) {
	const db = await openDb(doc);
	if (!db) return [];
	try {
		if (!db.objectStoreNames.contains(STORE_NAME)) return [];
		const result = await new Promise((resolve) => {
			const out = [];
			try {
				const tx = db.transaction([STORE_NAME], "readonly");
				const req = tx.objectStore(STORE_NAME).openCursor();
				req.onsuccess = (e) => {
					const cur = e.target.result;
					if (!cur) {
						resolve(out);
						return;
					}
					const v = cur.value;
					out.push({
						k: String(cur.key),
						bytes: typeof v === "string" ? utf8Bytes(v) : utf8Bytes(JSON.stringify(v))
					});
					try {
						cur.continue();
					} catch {
						resolve(out);
					}
				};
				req.onerror = () => resolve(out);
				tx.onabort = () => resolve(out);
			} catch {
				resolve(out);
			}
			setTimeout(() => resolve(out), 800);
		});
		const items = [];
		for (const r of result) if (r.k === "cold_history") items.push({
			key: "idb-cold",
			label: "历史记录（冷数据）",
			bytes: r.bytes
		});
		else if (r.k.startsWith("migration_backup_")) items.push({
			key: "idb-backup",
			label: "旧版迁移备份",
			bytes: r.bytes
		});
		else items.push({
			key: "idb-" + r.k.replace(/[^\w-]/g, "_"),
			label: r.k,
			bytes: r.bytes
		});
		return items;
	} finally {
		try {
			db.close();
		} catch {}
	}
}
/** 热数据：酒馆 extensionSettings 中被序列化的 JSON 体积（UTF-8 估算） */
function estimateHotBytes(settings) {
	if (settings == null) return 0;
	try {
		return utf8Bytes(JSON.stringify(settings));
	} catch {
		return 0;
	}
}
/**
* 汇总存储占用。任何单项失败都只影响该项（标记为 null），不会让整块 UI 失败。
* 全程不使用 localStorage.clear / indexedDB.deleteDatabase 等破坏性操作。
*/
async function collectStorageReport(opts = {}) {
	const doc = opts.doc ?? (typeof document !== "undefined" ? document : {});
	const items = [];
	const hotBytes = estimateHotBytes(opts.hotSettings);
	items.push({
		key: "hot",
		label: "设置与近期记录",
		bytes: hotBytes,
		detail: "保存在酒馆设置文件中"
	});
	let idbItems = [];
	let idbTimer = null;
	try {
		const timeout = opts.idbTimeoutMs ?? 1e3;
		idbItems = await Promise.race([readIndexedDb(doc), new Promise((resolve) => {
			idbTimer = setTimeout(() => resolve([]), timeout);
		})]);
	} catch {
		idbItems = [];
	} finally {
		if (idbTimer) try {
			clearTimeout(idbTimer);
		} catch {}
	}
	items.push(...idbItems);
	try {
		items.push(...readLocalStorage(doc));
	} catch {}
	let quotaBytes = null;
	let usageBytes = null;
	let persisted = null;
	let globalAvailable = false;
	try {
		const storage = (doc.defaultView?.navigator ?? (typeof navigator !== "undefined" ? navigator : null))?.storage;
		if (storage && typeof storage.estimate === "function") {
			const est = await storage.estimate();
			if (est && typeof est.quota === "number") {
				quotaBytes = est.quota;
				usageBytes = typeof est.usage === "number" ? est.usage : null;
				globalAvailable = true;
			}
		}
		if (storage && typeof storage.persisted === "function") persisted = !!await storage.persisted();
	} catch {}
	return {
		items,
		totalBytes: items.reduce((sum, i) => sum + (i.bytes || 0), 0),
		quotaBytes,
		usageBytes,
		persisted,
		globalAvailable
	};
}
//#endregion
//#region src/ui/storage-usage-card.ts
/**
* 设置页「存储占用」卡片渲染。
*
* 结构：标题行（标题 + 刷新按钮） → 合计数字 → 细分条目列表 → 浏览器配额（可缺失）→ 说明。
* 细分行用 grid 两列（名称 / 数值），窄屏下名称自动换行，数值右对齐，不会撑破容器。
*/
var MODULE$1 = "api_usage_stat";
/** 小于该体积的条目归入「其他」，避免十几个几十字节的小项把列表撑长 */
var SMALL_ITEM_BYTES = 1024;
function esc$1(s) {
	return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
/** 单项行：名称 + 数值，数值用等宽数字避免跳动 */
function row(item, total, opts = {}) {
	const pctRaw = total > 0 && item.bytes != null ? item.bytes / total * 100 : null;
	const pct = pctRaw != null && !opts.sub && pctRaw >= .5 ? Math.round(pctRaw) : null;
	const detailHtml = item.detail && opts.toggle ? `<span data-others-count>${esc$1(item.detail)}</span>` : esc$1(item.detail || "");
	const sub = item.detail ? `<div ${opts.toggle ? "data-others-hint" : ""} style="font-size:var(--aus-fs-xs);color:var(--ds-text-3);margin-top:2px;line-height:1.4;">${detailHtml}</div>` : "";
	const indent = opts.sub ? "padding-left:16px;background:color-mix(in srgb, var(--ds-text) 3%, transparent);" : "";
	const clickStyle = opts.toggle ? "cursor:pointer;user-select:none;" : "";
	return `<div class="aus-storage-row"${opts.toggle ? ` id="${opts.toggle.id}" role="button" tabindex="0" aria-expanded="${opts.toggle.expanded}"` : ""} style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--ds-border);${indent}${clickStyle}">
    <div style="min-width:0;flex:1 1 auto;">
      <div class="aus-storage-row-label" style="font-size:var(--aus-fs-base);color:var(--ds-text);line-height:1.5;overflow-wrap:anywhere;">${esc$1(item.label)}</div>
      ${sub}
    </div>
    <div style="flex:0 0 auto;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;">
      <div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">${formatBytes(item.bytes)}</div>
      ${pct != null ? `<div style="font-size:var(--aus-fs-xs);color:var(--ds-text-3);margin-top:2px;">${pct}%</div>` : ""}
    </div>
  </div>`;
}
function renderStorageUsageCard(doc) {
	return `<div class="ds-card" id="aus-storage-card">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">存储占用</span>
      <button id="aus-storage-refresh" title="重新统计" style="display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text-2);font-size:var(--aus-fs-sm);cursor:pointer;line-height:1;">${icon("refresh", 13)}<span>刷新</span></button>
    </div>
    <div id="aus-storage-body" style="margin-top:6px;">
      <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);padding:10px 0;">正在统计…</div>
    </div>
  </div>`;
}
function bodyHtml(r) {
	const parts = [];
	parts.push(`<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;padding-bottom:10px;">
    <span class="ds-card-val" style="font-size:clamp(20px,4.2cqi,26px);">${formatBytes(r.totalBytes)}</span>
    <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">本扩展占用合计</span>
  </div>`);
	if (r.items.length === 0) parts.push(`<div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);padding:6px 0;">暂无数据</div>`);
	else {
		const major = r.items.filter((i) => (i.bytes ?? 0) >= SMALL_ITEM_BYTES);
		const minor = r.items.filter((i) => (i.bytes ?? 0) < SMALL_ITEM_BYTES);
		const rows = major.map((i) => row(i, r.totalBytes));
		if (minor.length) {
			const minorTotal = minor.reduce((a, i) => a + (i.bytes || 0), 0);
			rows.push(row({
				label: "其他",
				bytes: minorTotal,
				detail: `${minor.length} 项小数据，点击展开`
			}, r.totalBytes, { toggle: {
				id: "aus-storage-others",
				expanded: false
			} }));
			rows.push(`<div id="aus-storage-others-detail" style="display:none;">${minor.map((i) => row(i, r.totalBytes, { sub: true })).join("")}</div>`);
		}
		parts.push(`<div>${rows.join("")}</div>`);
	}
	if (r.globalAvailable && r.quotaBytes != null) {
		const usagePct = r.usageBytes != null && r.quotaBytes > 0 ? Math.min(100, r.usageBytes / r.quotaBytes * 100) : null;
		const persistLabel = r.persisted == null ? "" : r.persisted ? "已启用持久化存储" : "未申请持久化存储";
		parts.push(`<div style="margin-top:10px;padding:9px 11px;border-radius:10px;background:var(--ds-card-inner);border:1px solid var(--ds-border);">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);">浏览器站点用量</span>
        <span style="font-size:var(--aus-fs-sm);color:var(--ds-text);font-variant-numeric:tabular-nums;white-space:nowrap;">
          ${r.usageBytes != null ? formatBytes(r.usageBytes) : "—"} / ${formatBytes(r.quotaBytes)}
        </span>
      </div>
      ${usagePct != null ? `<div class="aus-storage-quota-bar" style="margin-top:7px;">
        <div class="aus-storage-quota-fill" style="width:${usagePct.toFixed(2)}%;"></div>
      </div>` : ""}
      <div style="font-size:var(--aus-fs-xs);color:var(--ds-text-3);margin-top:6px;line-height:1.5;">该数值由浏览器统计，包含酒馆与所有扩展的占用，本扩展只占其中一部分。${persistLabel ? `<span style="margin-left:4px;">${persistLabel}</span>` : ""}</div>
    </div>`);
	}
	parts.push(`<div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:9px;line-height:1.6;">
    历史记录按最近 50 条保存在酒馆设置中，更早的进入浏览器 IndexedDB；设置为 UTF-8 估算体积，与实际落盘大小可能略有差异。
  </div>`);
	return parts.join("");
}
/** 统计并渲染到指定卡片。多次调用会取消上一次的过期结果 */
var renderSeq = 0;
async function refreshStorageUsage(doc) {
	const body = doc.getElementById("aus-storage-body");
	if (!body) return;
	const seq = ++renderSeq;
	const btn = doc.getElementById("aus-storage-refresh");
	if (btn) {
		btn.disabled = true;
		btn.style.opacity = "0.6";
	}
	try {
		const report = await collectStorageReport({
			doc,
			hotSettings: (globalThis.SillyTavern?.getContext?.())?.extensionSettings?.[MODULE$1] ?? getExtensionSettings()
		});
		if (seq !== renderSeq) return;
		body.innerHTML = bodyHtml(report);
		bindStorageUsageCard(doc);
	} catch (e) {
		if (seq === renderSeq) body.innerHTML = `<div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);padding:8px 0;">统计失败：${esc$1(e?.message || "未知错误")}</div>`;
	} finally {
		if (seq === renderSeq && btn) {
			btn.disabled = false;
			btn.style.opacity = "";
		}
	}
}
/** 绑定刷新按钮 */
function bindStorageUsageCard(doc) {
	const btn = doc.getElementById("aus-storage-refresh");
	if (btn) btn.onclick = () => {
		refreshStorageUsage(doc);
	};
	const toggle = doc.getElementById("aus-storage-others");
	const detail = doc.getElementById("aus-storage-others-detail");
	if (!toggle || !detail) return;
	const flip = () => {
		const open = detail.style.display !== "none";
		detail.style.display = open ? "none" : "block";
		toggle.setAttribute("aria-expanded", open ? "false" : "true");
		const hint = toggle.querySelector("[data-others-hint] [data-others-count]");
		if (hint) hint.textContent = hint.textContent.replace(open ? "点击收起" : "点击展开", open ? "点击展开" : "点击收起");
	};
	toggle.onclick = flip;
	toggle.onkeydown = (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			flip();
		}
	};
}
//#endregion
//#region src/services/debug.ts
function generateDebugBatch() {
	const startStr = state$2.settings.debugDateStart;
	const endStr = state$2.settings.debugDateEnd;
	if (!startStr || !endStr) return alert("请设置起始与结束日期");
	const startDate = /* @__PURE__ */ new Date(startStr + "T00:00:00");
	const endDate = /* @__PURE__ */ new Date(endStr + "T00:00:00");
	if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) return alert("日期范围无效");
	const count = state$2.settings.debugBatchCount || 30;
	const model = state$2.settings.debugModel || "deepseek-v4-flash";
	const hit = state$2.settings.debugHit || 1e4;
	const miss = state$2.settings.debugMiss || 5e3;
	const output = state$2.settings.debugOutput || 2e3;
	const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 864e5) + 1;
	const perDay = Math.ceil(count / totalDays);
	let generated = 0;
	for (let d = 0; d < totalDays && generated < count; d++) {
		const curDate = new Date(startDate);
		curDate.setDate(startDate.getDate() + d);
		for (let i = 0; i < perDay && generated < count; i++) {
			const rv = (base) => Math.round(base * (.3 + Math.random() * 1.4));
			const h = rv(hit), m = rv(miss), o = rv(output);
			const total = h + m + o;
			const ts = new Date(curDate);
			ts.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
			const dur = Math.floor(Math.random() * 5e3) + 500;
			const ttft = Math.floor(Math.random() * 1e3) + 100;
			const c = calcCost({
				timestamp: ts.getTime(),
				model,
				prompt_cache_hit_tokens: h,
				prompt_cache_miss_tokens: m,
				completion_tokens: o
			}, state$2.settings);
			state$2.total_tokens += total;
			state$2.total_cost += c.total;
			state$2.input_tokens += h + m;
			state$2.output_tokens += o;
			state$2.cache_hit_tokens += h;
			state$2.cache_miss_tokens += m;
			state$2.input_cost += c.input;
			state$2.output_cost += c.output;
			if (isDeepSeekOfficialModel(model)) state$2.rounds += 1;
			const isTrunc = Math.random() < .08;
			const fr = isTrunc ? "length" : "stop";
			state$2.history.unshift({
				timestamp: ts.getTime(),
				model,
				prompt_tokens: h + m,
				cache_hit_tokens: h,
				cache_miss_tokens: m,
				completion_tokens: o,
				total_tokens: total,
				input_cost: c.input,
				output_cost: c.output,
				cost: c.total,
				cache_hit_rate: h + m > 0 ? h / (h + m) * 100 : 0,
				priceType: c.priceType,
				raw_usage: {
					prompt_cache_hit_tokens: h,
					prompt_cache_miss_tokens: m,
					completion_tokens: o,
					total_tokens: total,
					__finish_reason: fr
				},
				messages: [],
				duration: dur,
				ttft,
				thinkTime: 300,
				thinkTokens: Math.floor(o * .2),
				tokenRate: Math.round(o / (dur - ttft) * 1e3),
				fullRequest: null,
				fullResponse: null,
				finishReason: fr,
				isTruncated: isTrunc,
				_debug: true
			});
			generated++;
		}
	}
	state$2.history.sort((a, b) => b.timestamp - a.timestamp);
	repository.recalcAll();
	try {
		globalThis.ApiUsageStat?.refreshUI?.();
	} catch {}
	alert("已生成 " + generated + " 条模拟数据");
}
var IDENTITY_KEY = "telemetry";
/** 关闭面板触发上报的最小间隔（吃掉反复开关面板造成的抖动） */
var CLOSE_FLUSH_GAP = 6e4;
/** 页面隐藏/卸载触发上报的最小间隔（合并间隔，避免同一次使用反复发送） */
var PASSIVE_FLUSH_GAP = 18e5;
/** 失败重试退避（首次发送 + 3 次重试） */
var RETRY_DELAYS = [
	1e3,
	5e3,
	3e4
];
/** 单次会话时长上限，超出按上限计入 */
var MAX_DURATION_MS = 432e5;
var TELEMETRY_PAGE_KEYS = [
	"overview",
	"stats",
	"history",
	"forecast",
	"wallet",
	"settings",
	"help",
	"about"
];
function emptyPages() {
	const pages = {};
	for (const key of TELEMETRY_PAGE_KEYS) pages[key] = 0;
	return pages;
}
function emptyCounters() {
	return {
		opens: 0,
		dur_ms: 0,
		pages: emptyPages(),
		render: [
			0,
			0,
			0,
			0,
			0
		]
	};
}
function isTelemetryPageKey(value) {
	return typeof value === "string" && TELEMETRY_PAGE_KEYS.includes(value);
}
/** 面板可用宽度分桶 */
function widthBucket(width) {
	const w = Number.isFinite(width) ? Number(width) : 0;
	if (w > 1024) return "gt1024";
	if (w > 760) return "761-1024";
	if (w > 480) return "481-760";
	return "le480";
}
/** 面板首帧渲染耗时分桶下标：<100 / <300 / <800 / <2000 / ≥2000 毫秒 */
function renderBucketIndex(ms) {
	const value = Number.isFinite(ms) ? Math.max(0, Number(ms)) : 0;
	if (value < 100) return 0;
	if (value < 300) return 1;
	if (value < 800) return 2;
	if (value < 2e3) return 3;
	return 4;
}
/** 时区偏移按 0.5 小时取整并钳制到 [-12, 14] */
function roundTz(hours) {
	const value = Number.isFinite(hours) ? Number(hours) : 0;
	const rounded = Math.round(value * 2) / 2;
	const clamped = Math.min(14, Math.max(-12, rounded));
	return clamped === 0 ? 0 : clamped;
}
/** 本地日期（YYYY-MM-DD） */
function todayKey(now = Date.now()) {
	const d = new Date(now);
	const pad = (n) => n < 10 ? "0" + n : String(n);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/**
* 从 UA 解析浏览器名与主版本。UA-CH（userAgentData）在调用侧优先，这里只做字符串回退。
*/
function parseBrowser(ua) {
	const source = String(ua || "");
	const pick = (pattern) => {
		const m = source.match(pattern);
		if (!m) return "";
		return String(m[1] || "").split(".")[0];
	};
	const edge = pick(/\bEdg(?:e|A|iOS)?\/(\d+)/);
	if (edge) return {
		name: "Edge",
		major: edge
	};
	const opera = pick(/\b(?:OPR|OPT)\/(\d+)/);
	if (opera) return {
		name: "Opera",
		major: opera
	};
	const samsung = pick(/\bSamsungBrowser\/(\d+)/);
	if (samsung) return {
		name: "Samsung Internet",
		major: samsung
	};
	const firefox = pick(/\b(?:Firefox|FxiOS)\/(\d+)/);
	if (firefox) return {
		name: "Firefox",
		major: firefox
	};
	const chrome = pick(/\b(?:Chrome|CriOS|Chromium)\/(\d+)/);
	if (chrome) return {
		name: "Chrome",
		major: chrome
	};
	const safari = pick(/\bVersion\/(\d+)[.\d]*\s+Mobile\/\w+\s+Safari\//) || pick(/\bVersion\/(\d+)[.\d]*\s+Safari\//);
	if (safari) return {
		name: "Safari",
		major: safari
	};
	if (/\bSafari\//.test(source)) return {
		name: "Safari",
		major: ""
	};
	return {
		name: source ? "Other" : "",
		major: ""
	};
}
/** 从 UA 解析操作系统 */
function parseOs(ua) {
	const source = String(ua || "");
	if (/\bWindows NT\b/.test(source)) return "Windows";
	if (/\bAndroid\b/.test(source)) return "Android";
	if (/\b(?:iPhone|iPod)\b/.test(source)) return "iOS";
	if (/\biPad\b/.test(source)) return "iPadOS";
	if (/\bCrOS\b/.test(source)) return "ChromeOS";
	if (/\bMac OS X\b/.test(source)) return "macOS";
	if (/\bLinux\b/.test(source)) return "Linux";
	return source ? "Other" : "";
}
/** 合并两份计数（用于把上次发送失败的上报体与本次新数据合并成一条） */
function mergeCounters(a, b) {
	const pages = emptyPages();
	for (const key of TELEMETRY_PAGE_KEYS) pages[key] = Math.max(0, Number(a?.pages?.[key]) || 0) + Math.max(0, Number(b?.pages?.[key]) || 0);
	const render = [
		0,
		0,
		0,
		0,
		0
	];
	for (let i = 0; i < render.length; i++) render[i] = Math.max(0, Number(a?.render?.[i]) || 0) + Math.max(0, Number(b?.render?.[i]) || 0);
	return {
		opens: Math.max(0, Number(a?.opens) || 0) + Math.max(0, Number(b?.opens) || 0),
		dur_ms: Math.max(0, Number(a?.dur_ms) || 0) + Math.max(0, Number(b?.dur_ms) || 0),
		pages,
		render
	};
}
function countersAreEmpty(counters) {
	if ((counters?.opens || 0) > 0 || (counters?.dur_ms || 0) > 0) return false;
	for (const key of TELEMETRY_PAGE_KEYS) if ((counters?.pages?.[key] || 0) > 0) return false;
	for (const value of counters?.render || []) if ((value || 0) > 0) return false;
	return true;
}
/** 上报端点是否已配置（占位符视为未配置，此时只本地累加） */
function isEndpointConfigured(endpoint = currentEndpoint()) {
	const value = String(endpoint || "").trim();
	if (!/^https:\/\/[^\s<>]+$/i.test(value)) return false;
	return !value.includes("<") && !value.includes(">");
}
/** 测试用端点覆盖；生产环境始终使用 TELEMETRY_ENDPOINT */
var endpointOverride = null;
function currentEndpoint() {
	return endpointOverride ?? "https://stat.janmk.us.ci/collect";
}
/**
* 扩展内历史记录总条数（热区 state.history + 冷区 _coldCount）。
* 冷计数由 store/persistence 在各写入路径同步维护，因此这里可同步取到精确值。
*/
function historyRecordCount() {
	try {
		const hot = Array.isArray(state$2?.history) ? state$2.history.length : 0;
		const settings = getExtensionSettings() || {};
		const cold = Number(settings?._coldCount);
		return hot + (Number.isFinite(cold) && cold > 0 ? Math.floor(cold) : 0);
	} catch {
		return 0;
	}
}
var counters = emptyCounters();
var sessionStart = null;
var envCache = null;
var lastFlushAt = 0;
var inFlight = false;
var bound = false;
function appVersion() {
	try {
		return String("3.1.5");
	} catch {
		return "";
	}
}
function safeWindow() {
	try {
		return typeof window === "undefined" ? null : window;
	} catch {
		return null;
	}
}
function parentWindow() {
	try {
		const win = safeWindow();
		if (!win) return null;
		const parent = win.parent;
		return parent && parent !== win ? parent : null;
	} catch {
		return null;
	}
}
/** 面板宽度取自酒馆主窗口（面板渲染在主文档中），失败时退回当前窗口 */
function currentViewportWidth() {
	try {
		const parent = parentWindow();
		const parentWidth = Number(parent?.innerWidth);
		if (Number.isFinite(parentWidth) && parentWidth > 0) return parentWidth;
	} catch {}
	try {
		const width = Number(safeWindow()?.innerWidth);
		if (Number.isFinite(width) && width > 0) return width;
	} catch {}
	return 0;
}
function mediaMatches(query) {
	try {
		const win = safeWindow();
		if (typeof win?.matchMedia !== "function") return false;
		return !!win.matchMedia(query).matches;
	} catch {
		return false;
	}
}
function nav() {
	try {
		return typeof navigator === "undefined" ? null : navigator;
	} catch {
		return null;
	}
}
/** 探测浏览器环境（只保留分桶与主版本，不含任何可定位到个人的信息） */
function probeEnv() {
	const n = nav();
	const ua = String(n?.userAgent || "");
	let browser = parseBrowser(ua);
	try {
		const brands = Array.isArray(n?.userAgentData?.brands) ? n.userAgentData.brands : [];
		for (const [pattern, name] of [
			[/Microsoft Edge/i, "Edge"],
			[/Opera|OPR/i, "Opera"],
			[/Samsung/i, "Samsung Internet"],
			[/Google Chrome/i, "Chrome"],
			[/Chromium/i, "Chrome"],
			[/Firefox/i, "Firefox"],
			[/Safari/i, "Safari"]
		]) {
			const hit = brands.find((item) => pattern.test(String(item?.brand || "")));
			if (hit) {
				browser = {
					name,
					major: String(hit.version || "").split(".")[0] || browser.major
				};
				break;
			}
		}
	} catch {}
	const lang = String(n?.language || n?.languages?.[0] || "").slice(0, 12);
	return {
		b: browser.name,
		bv: browser.major,
		os: parseOs(ua),
		arch: "unknown",
		lang,
		w: widthBucket(currentViewportWidth()),
		dark: mediaMatches("(prefers-color-scheme: dark)"),
		standalone: mediaMatches("(display-mode: standalone)") || n?.standalone === true,
		touch: mediaMatches("(pointer: coarse)") || Number(n?.maxTouchPoints || 0) > 0,
		stv: tavernVersionFromContext()
	};
}
/** 版本号清洗：只保留数字、字母与 . + -，最长 16 字符；不含数字视为无效 */
function sanitizeVersion(value) {
	if (typeof value !== "string" && typeof value !== "number") return "";
	const text = String(value).trim().replace(/[^0-9A-Za-z.+-]/g, "").slice(0, 16);
	return /\d/.test(text) ? text : "";
}
/** 从酒馆上下文/文档元信息同步读取版本号（取不到返回空字符串） */
function tavernVersionFromContext() {
	try {
		const g = globalThis;
		const st = g?.SillyTavern;
		const ctx = typeof st?.getContext === "function" ? st.getContext() : null;
		const candidates = [
			ctx?.version,
			ctx?.stVersion,
			st?.version,
			g?.__ST_VERSION__
		];
		for (const candidate of candidates) {
			const version = sanitizeVersion(candidate);
			if (version) return version;
		}
	} catch {}
	try {
		const meta = (typeof document === "undefined" ? null : document)?.querySelector?.("meta[name=\"version\"]");
		const version = sanitizeVersion(meta?.getAttribute?.("content"));
		if (version) return version;
	} catch {}
	return "";
}
/**
* 异步兜底：上下文没有版本号时读一次酒馆同源 `/version` 接口并缓存。
* 只发这一个本地请求，不携带任何统计内容；失败静默忽略。
*/
async function refineTavernVersion() {
	try {
		if (!envCache || envCache.stv) return;
		const ctx = globalThis?.SillyTavern?.getContext?.();
		const headers = typeof ctx?.getRequestHeaders === "function" ? ctx.getRequestHeaders() : void 0;
		const res = await fetch("/version", {
			headers,
			credentials: "same-origin"
		});
		if (!res?.ok) return;
		const text = await res.text();
		let version = "";
		try {
			version = sanitizeVersion(JSON.parse(text)?.version);
		} catch {
			version = text.trim().length <= 16 ? sanitizeVersion(text) : "";
		}
		if (envCache && version) envCache.stv = version;
	} catch {}
}
/** 尽力补充 CPU 架构（Chromium 高熵值，失败保持 unknown） */
function refineArch() {
	try {
		const uad = nav()?.userAgentData;
		if (!uad || typeof uad.getHighEntropyValues !== "function") return;
		uad.getHighEntropyValues(["architecture", "bitness"]).then((values) => {
			if (!envCache) return;
			const arch = String(values?.architecture || "").toLowerCase();
			const bitness = String(values?.bitness || "");
			let next = "unknown";
			if (arch.includes("arm")) next = arch.includes("32") || bitness === "32" ? "unknown" : "arm64";
			else if (arch === "x86" && bitness === "64") next = "x86_64";
			else if (arch === "x86") next = "x86";
			if (next !== "unknown") envCache.arch = next;
		}).catch(() => {});
	} catch {}
}
function randomId() {
	try {
		const buf = /* @__PURE__ */ new Uint8Array(16);
		const cryptoObj = globalThis?.crypto;
		if (cryptoObj && typeof cryptoObj.getRandomValues === "function") cryptoObj.getRandomValues(buf);
		else for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
		return Array.from(buf, (byte) => byte.toString(16).padStart(2, "0")).join("");
	} catch {
		let fallback = "";
		for (let i = 0; i < 32; i++) fallback += Math.floor(Math.random() * 16).toString(16);
		return fallback;
	}
}
function isIdentityShape(value) {
	return !!value && typeof value === "object" && typeof value.id === "string" && /^[0-9a-f]{32}$/.test(value.id);
}
function readIdentity() {
	try {
		const stored = (getExtensionSettings() || {})[IDENTITY_KEY];
		if (isIdentityShape(stored)) return {
			id: stored.id,
			seq: Number.isFinite(Number(stored.seq)) ? Number(stored.seq) : 0,
			day: typeof stored.day === "string" ? stored.day : void 0,
			pending: stored.pending && typeof stored.pending === "object" ? stored.pending : null
		};
	} catch {}
	return {
		id: "",
		seq: 0
	};
}
function writeIdentity(identity) {
	try {
		const settings = getExtensionSettings() || {};
		saveExtensionSettings({
			...settings,
			[IDENTITY_KEY]: {
				id: identity.id,
				seq: identity.seq,
				day: identity.day,
				pending: identity.pending ?? null,
				updatedAt: Date.now()
			},
			_updated: Date.now()
		});
	} catch {}
}
function ensureIdentity() {
	const identity = readIdentity();
	if (identity.id) return identity;
	const created = {
		id: randomId(),
		seq: 0
	};
	writeIdentity(created);
	return created;
}
/** 重置匿名标识：下次上报会被计为一台新设备 */
function resetIdentity() {
	try {
		resetCounters();
		writeIdentity({
			id: randomId(),
			seq: 0
		});
	} catch {}
}
function isTelemetryEnabled() {
	try {
		const settings = state$2?.settings;
		if (!settings) return true;
		return settings.telemetryEnabled !== false;
	} catch {
		return true;
	}
}
function telemetryStatus() {
	const identity = readIdentity();
	return {
		enabled: isTelemetryEnabled(),
		configured: isEndpointConfigured(currentEndpoint()),
		id: identity.id,
		seq: identity.seq,
		hasPending: !!identity.pending
	};
}
function resetCounters() {
	counters = emptyCounters();
	sessionStart = null;
}
function touchActivity(now) {
	if (sessionStart === null) sessionStart = now;
}
function currentDuration(now) {
	if (sessionStart === null) return 0;
	return Math.max(0, Math.min(MAX_DURATION_MS, now - sessionStart));
}
/** 打开面板：计一次打开，并开始一个使用时段 */
function trackOpen() {
	try {
		if (!isTelemetryEnabled()) return;
		const now = Date.now();
		counters.opens += 1;
		touchActivity(now);
		if (!envCache) envCache = probeEnv();
	} catch {}
}
/** 切换视图：对应页面计数 +1 */
function trackPage(view) {
	try {
		if (!isTelemetryEnabled()) return;
		if (!isTelemetryPageKey(view)) return;
		const now = Date.now();
		counters.pages[view] += 1;
		touchActivity(now);
		if (!envCache) envCache = probeEnv();
	} catch {}
}
/** 记录面板首帧渲染耗时（毫秒） */
function trackRender(ms) {
	try {
		if (!isTelemetryEnabled()) return;
		if (!Number.isFinite(ms)) return;
		counters.render[renderBucketIndex(ms)] += 1;
		if (!envCache) envCache = probeEnv();
	} catch {}
}
function buildPayload(identity, incoming, pending, now, final = false) {
	const day = todayKey(now);
	const pendingCounters = pending ? mergeCounters(emptyCounters(), {
		opens: pending?.s?.opens,
		dur_ms: pending?.s?.dur_ms,
		pages: pending?.s?.pages || {},
		render: Array.isArray(pending?.s?.render) ? pending.s.render : []
	}) : emptyCounters();
	const merged = pending ? mergeCounters(pendingCounters, incoming) : incoming;
	const seq = pending && Number.isFinite(Number(pending.seq)) ? Number(pending.seq) : identity.seq + 1;
	const env = envCache ?? probeEnv();
	if (!env.stv) env.stv = tavernVersionFromContext();
	return {
		v: 1,
		id: identity.id,
		seq: Math.max(1, seq),
		day,
		ts: now,
		tz: roundTz(-new Date(now).getTimezoneOffset() / 60),
		app: appVersion(),
		env,
		s: {
			opens: Math.max(0, Number(merged.opens) || 0),
			dur_ms: Math.max(0, Math.min(MAX_DURATION_MS, Number(merged.dur_ms) || 0)),
			pages: merged.pages,
			render: merged.render
		},
		daily: pending ? pending.daily === true : identity.day !== day,
		hc: historyRecordCount(),
		...final ? { off: true } : {}
	};
}
/**
* 发送前先把序号写盘：即使响应丢失导致本地状态未更新，下一次上报也会使用更大的 seq，
* 不会因为服务端已记录该序号而永久丢弃后续数据（同一 seq 的重复提交由服务端幂等丢弃）。
*/
function reserveSeq(payload) {
	try {
		const identity = ensureIdentity();
		if (identity.seq < payload.seq) {
			identity.seq = payload.seq;
			writeIdentity(identity);
		}
	} catch {}
}
function commitSuccess(payload) {
	lastFlushAt = Date.now();
	const identity = ensureIdentity();
	if (identity.seq < payload.seq) identity.seq = payload.seq;
	identity.day = payload.day;
	identity.pending = null;
	writeIdentity(identity);
	resetCounters();
}
function commitPending(payload) {
	try {
		const identity = ensureIdentity();
		identity.pending = payload;
		writeIdentity(identity);
	} catch {}
	resetCounters();
}
function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
async function postPayload(body) {
	try {
		const res = await fetch(currentEndpoint(), {
			method: "POST",
			mode: "cors",
			keepalive: true,
			credentials: "omit",
			headers: { "Content-Type": "text/plain;charset=UTF-8" },
			body
		});
		return res.status === 204 || res.ok;
	} catch {
		return false;
	}
}
function sendBeaconOnce(body) {
	try {
		const n = nav();
		if (typeof n?.sendBeacon !== "function") return false;
		if (typeof Blob === "undefined") return false;
		return !!n.sendBeacon(currentEndpoint(), new Blob([body], { type: "text/plain;charset=UTF-8" }));
	} catch {
		return false;
	}
}
async function sendWithRetry(payload) {
	const body = JSON.stringify(payload);
	for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
		if (await postPayload(body)) {
			commitSuccess(payload);
			inFlight = false;
			return;
		}
		if (attempt < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[attempt]);
	}
	commitPending(payload);
	inFlight = false;
}
/**
* 上报入口。数据为空且没有待发缓存时直接返回，不发请求。
* close：关闭面板触发（主要路径）；hide：页面隐藏/卸载触发；manual：设置页手动触发。
*/
function flushTelemetry(reason = "close", options) {
	try {
		const final = options?.final === true;
		if (!isTelemetryEnabled() && !final) {
			resetCounters();
			return;
		}
		if (!isEndpointConfigured(currentEndpoint())) return;
		if (inFlight) return;
		const now = Date.now();
		counters.dur_ms = currentDuration(now);
		const gap = reason === "hide" ? PASSIVE_FLUSH_GAP : CLOSE_FLUSH_GAP;
		if (!final && lastFlushAt && now - lastFlushAt < gap) return;
		const identity = ensureIdentity();
		const pending = identity.pending && typeof identity.pending === "object" ? identity.pending : null;
		if (!final && !pending && countersAreEmpty(counters)) return;
		const payload = buildPayload(identity, counters, pending, now, final);
		inFlight = true;
		reserveSeq(payload);
		if (reason === "hide") {
			if (sendBeaconOnce(JSON.stringify(payload))) {
				commitSuccess(payload);
				inFlight = false;
				return;
			}
		}
		sendWithRetry(payload).catch(() => {
			inFlight = false;
		});
	} catch (error) {
		inFlight = false;
		log.warn("匿名统计上报失败", error);
	}
}
/**
* 关闭匿名统计开关时的最后一次上报。
* 必须在把 telemetryEnabled 写为 false 之前调用：本次会带上关闭标记并立即发送。
*/
function flushTelemetryOnDisable() {
	flushTelemetry("manual", { final: true });
}
function bindLifecycle() {
	if (bound) return;
	const win = safeWindow();
	if (!win || typeof win.addEventListener !== "function") return;
	bound = true;
	const onHide = () => {
		try {
			flushTelemetry("hide");
		} catch {}
	};
	const onVisibility = (event) => {
		try {
			if ((event?.target ?? win.document)?.visibilityState === "hidden") onHide();
		} catch {}
	};
	const targets = [win];
	const parent = parentWindow();
	if (parent && typeof parent.addEventListener === "function") targets.push(parent);
	for (const target of targets) {
		try {
			target.addEventListener("pagehide", onHide);
		} catch {}
		try {
			target.addEventListener("visibilitychange", onVisibility);
		} catch {}
	}
}
/** 初始化：生成匿名标识、缓存环境、绑定生命周期上报时机（幂等） */
function initTelemetry() {
	try {
		if (!ensureIdentity().id) return;
		if (!envCache) envCache = probeEnv();
		refineArch();
		refineTavernVersion();
		bindLifecycle();
	} catch (error) {
		log.warn("匿名统计初始化失败", error);
	}
}
//#endregion
//#region src/ui/settings.ts
var settings_exports = /* @__PURE__ */ __exportAll({ renderSettings: () => renderSettings });
function esc(s) {
	return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
/** 刷新「匿名使用统计」卡片上的标识与状态文案 */
function renderTelemetryStatus(doc) {
	const idEl = doc.getElementById("aus-telemetry-id");
	const statusEl = doc.getElementById("aus-telemetry-status");
	let status = null;
	try {
		status = telemetryStatus();
	} catch {}
	if (idEl) idEl.textContent = status?.id ? `匿名标识：${String(status.id).slice(0, 8)}…` : "匿名标识：待生成";
	if (!statusEl) return;
	let hint = "";
	if (!status?.configured) hint = "未配置上报端点：仅本地累计，不会发送任何数据";
	else if (!status.enabled) hint = "已关闭：不再采集，也不再发送";
	statusEl.textContent = hint;
	statusEl.style.display = hint ? "block" : "none";
}
var docClickBound = false;
function bindSettingsOutsideClick(doc) {
	if (docClickBound) return;
	docClickBound = true;
	doc.addEventListener("click", (e) => {
		const t = e.target;
		const td = doc.getElementById("aus-theme-dropdown");
		if (td && td.style.display === "block" && !t.closest("#aus-theme-dropdown") && !t.closest("#aus-theme-btn")) td.style.display = "none";
		const sd = doc.getElementById("aus-history-scope-dropdown");
		if (sd && sd.style.display === "block" && !t.closest("#aus-history-scope-dropdown") && !t.closest("#aus-history-scope-btn")) sd.style.display = "none";
		const md = doc.getElementById("aus-pricing-sync-mode-dropdown");
		if (md && md.style.display === "block" && !t.closest("#aus-pricing-sync-mode-dropdown") && !t.closest("#aus-pricing-sync-mode-btn")) md.style.display = "none";
		const idd = doc.getElementById("aus-pricing-sync-interval-dropdown");
		if (idd && idd.style.display === "block" && !t.closest("#aus-pricing-sync-interval-dropdown") && !t.closest("#aus-pricing-sync-interval-btn")) idd.style.display = "none";
	});
}
function localDay(ts) {
	const d = new Date(ts);
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
async function recalcCostsAndRefresh() {
	try {
		await recalcAllCosts();
		await repository.rebuildAggregates();
		globalThis.ApiUsageStat?.refreshUI?.();
	} catch (error) {
		toast("error", "历史费用重算失败：" + (error?.message || error));
	}
}
function readHistoryDeleteFilter(doc) {
	const startEl = doc.getElementById("aus-delete-start");
	const endEl = doc.getElementById("aus-delete-end");
	const modelEl = doc.getElementById("aus-delete-model");
	const chatEl = doc.getElementById("aus-delete-chat");
	const start = String(startEl?.value || "").trim();
	const end = String(endEl?.value || "").trim();
	return {
		start: start && isValidDayKey(start) ? start : "",
		end: end && isValidDayKey(end) ? end : "",
		model: String(modelEl?.value || "").trim(),
		chat: String(chatEl?.value || "").trim()
	};
}
async function countHistoryDeleteMatches(filter) {
	return (await repository.getAllHistory() || []).filter((entry) => {
		if (filter.start || filter.end) {
			const day = localDay(entry.timestamp);
			if (filter.start && day < filter.start) return false;
			if (filter.end && day > filter.end) return false;
		}
		if (filter.model && String(entry.model || "") !== filter.model) return false;
		if (filter.chat) {
			const chatId = String(entry.chatId || "");
			const chatName = String(entry.chatName || "");
			if (chatId !== filter.chat && chatName !== filter.chat) return false;
		}
		return true;
	}).length;
}
function bindHistoryDelete(doc) {
	const previewBtn = doc.getElementById("aus-delete-preview");
	const deleteBtn = doc.getElementById("aus-delete-run");
	const status = doc.getElementById("aus-delete-status");
	if (!previewBtn || !deleteBtn) return;
	let armed = false;
	let armTimer = null;
	let armedFilter = null;
	const resetArmed = () => {
		armed = false;
		armedFilter = null;
		try {
			deleteBtn.textContent = "删除匹配记录";
		} catch {}
	};
	previewBtn.onclick = async () => {
		previewBtn.disabled = true;
		const old = previewBtn.textContent;
		previewBtn.textContent = "统计中…";
		try {
			const count = await countHistoryDeleteMatches(readHistoryDeleteFilter(doc));
			if (status) status.textContent = `匹配 ${count} 条记录${count ? "，点击“删除匹配记录”后会二次确认" : ""}`;
		} catch (error) {
			if (status) status.textContent = "统计失败：" + (error?.message || error);
		} finally {
			previewBtn.disabled = false;
			previewBtn.textContent = old || "统计匹配记录";
		}
	};
	deleteBtn.onclick = async () => {
		const filter = readHistoryDeleteFilter(doc);
		if (!armed) {
			const count = await countHistoryDeleteMatches(filter).catch(() => -1);
			if (count <= 0) {
				if (status) status.textContent = count === 0 ? "当前范围没有可删除记录" : "匹配数量检查失败，请重试";
				return;
			}
			armed = true;
			armedFilter = filter;
			deleteBtn.textContent = `确认删除 ${count} 条？再点一次`;
			if (status) status.textContent = `本次将删除 ${count} 条记录，再次点击执行`;
			if (armTimer) clearTimeout(armTimer);
			armTimer = setTimeout(() => {
				armTimer = null;
				resetArmed();
			}, 5e3);
			return;
		}
		if (armTimer) {
			clearTimeout(armTimer);
			armTimer = null;
		}
		const targetFilter = armedFilter || filter;
		resetArmed();
		deleteBtn.disabled = true;
		if (status) status.textContent = "正在删除并重算…";
		try {
			const removed = await repository.deleteHistoryByFilter(targetFilter);
			await recalcCostsAndRefresh();
			if (status) status.textContent = removed ? `已删除 ${removed} 条记录并完成重算` : "当前范围没有可删除记录";
			if (removed) toast("success", `已删除 ${removed} 条记录`);
		} catch (error) {
			if (status) status.textContent = "删除失败：" + (error?.message || error);
		} finally {
			deleteBtn.disabled = false;
		}
	};
}
function renderSettings(doc) {
	const host = doc.getElementById("aus-settings");
	if (!host) return;
	const s = state$2.settings;
	host.innerHTML = `
    <div style="display:grid;gap:12px;">
      <!-- 匿名使用统计（默认开启，可随时关闭） -->
      <div class="ds-card">
        <div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">匿名使用统计</span><label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;"><input type="checkbox" id="aus-telemetry-enabled" style="opacity:0;width:0;height:0;"><span style="position:absolute;inset:0;background:var(--ds-border);border-radius:12px;transition:0.2s;"><span id="aus-telemetry-slider" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:var(--ds-card-inner);border-radius:50%;transition:0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.15);"></span></span></label></div>
        <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:6px;line-height:1.6;">仅匿名上报浏览器环境参数（浏览器版本、系统、架构、语言、屏幕等）、渲染性能等开发数据；<strong>不含对话内容、密钥等任何隐私信息，数据经过匿名化处理，仅用于开发与完善兼容性。</strong>关闭后立即停止采集与上报。<a href="https://janmk1453.github.io/Api-Usage/#privacy" target="_blank" rel="noreferrer" style="color:var(--ds-text);text-decoration:underline;">隐私声明</a></div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;flex-wrap:wrap;"><span id="aus-telemetry-id" style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">匿名标识：待生成</span><button id="aus-telemetry-reset" style="padding:6px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">重置匿名标识</button></div>
        <div id="aus-telemetry-status" style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:6px;"></div>
      </div>
      <!-- 颜色模式（与用量统计·模型选择一致的胶囊下拉） -->
      <div class="ds-card" style="position:relative;"><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">颜色模式</span><div id="aus-theme-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">模式</span><span id="aus-theme-label" style="font-weight:600;color:var(--ds-text);">浅色</span>${icon("chevron-down", 14)}</div></div><div id="aus-theme-dropdown" style="display:none;position:absolute;top:44px;right:12px;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:140px;padding:8px;"></div><div id="aus-theme-hint" style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:6px;">切换后立即生效，深色模式针对夜间可读性优化</div></div>

      <!-- 历史显示范围 -->
      <div class="ds-card" style="position:relative;"><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">历史显示范围</span><div id="aus-history-scope-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">范围</span><span id="aus-history-scope-label" style="font-weight:600;color:var(--ds-text);">全部历史</span>${icon("chevron-down", 14)}</div></div><div id="aus-history-scope-dropdown" style="display:none;position:absolute;top:44px;right:12px;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:160px;padding:8px;"></div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:6px;">全部历史展示所有对话的记录，当前对话仅展示与当前聊天文件关联的记录</div></div>

      <!-- API 密钥 -->
      <div class="ds-card" style="display:none;"><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);font-weight:500;margin-bottom:6px;">API 密钥</div><div style="display:flex;gap:8px;"><input id="aus-api-key" type="password" placeholder="输入 DeepSeek API 密钥" style="flex:1;padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);outline:none;" /><button id="aus-save-key" class="ds-btn-pill" style="padding:8px 14px;">保存</button></div><div id="aus-key-status" style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:6px;"></div></div>

      <!-- 余额 -->
      <div class="ds-card">
        <div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">自动校准余额（全局开关）</span><label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;"><input type="checkbox" id="aus-auto-balance" style="opacity:0;width:0;height:0;"><span style="position:absolute;inset:0;background:var(--ds-border);border-radius:12px;transition:0.2s;"><span id="aus-auto-balance-slider" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:var(--ds-card-inner);border-radius:50%;transition:0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.15);"></span></span></label></div>
        <div id="aus-auto-balance-interval" style="display:${s.autoBalance ? "block" : "none"};margin-top:8px;"><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);color:var(--ds-text);">校准间隔（分钟）</span><input type="number" id="aus-balance-interval" min="1" max="1440" style="width:90px;padding:6px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);text-align:center;" /></div></div>
        <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:6px;">仅钱包页中启用了自动校准且支持该能力的钱包会在间隔到期后查询。</div>
        <div style="display:none;margin-top:12px;"><input id="aus-custom-balance" /><button id="aus-save-balance"></button><button id="aus-clear-balance"></button><div id="aus-balance-status"></div></div>
      </div>

      <!-- 高峰时段 -->
      <div class="ds-card"><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">新钱包默认峰谷时段</span><button id="aus-btn-add-peak-hour" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">+ 添加</button></div><div id="aus-peak-hours-list" style="display:grid;gap:6px;margin-top:8px;"></div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:6px;line-height:1.6;">支持跨天（如 22:00-02:00）；钱包页可分别覆盖时段和周末规则。<br />DeepSeek 官方规则：周一至周五（不含中国法定节假日）9:00-12:00、14:00-18:00 为高峰，其余时段（含周末和法定节假日全天）为空闲；调休上班的周末同样按空闲计费。</div><div style="margin-top:10px;"><div style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">额外空闲日期</div><textarea id="aus-extra-off-days" rows="3" placeholder="每行一个日期，如 2027-01-01" style="width:100%;margin-top:6px;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);resize:vertical;box-sizing:border-box;"></textarea><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:4px;">内置法定节假日数据覆盖 ${CN_HOLIDAY_COVERAGE_LABEL}；超出范围的日期可按 YYYY-MM-DD 每行一条补充，全天按空闲计费。</div></div></div>

      <!-- 模型与价格（可折叠，默认收起） -->
      <div class="ds-card" style="display:none;"><div id="aus-models-header" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">模型与价格（<span id="aus-model-price-unit">${getDisplayCurrency().code}/百万 tokens</span>）</span><div style="display:flex;align-items:center;gap:8px;"><button id="aus-btn-clear-custom-models" style="padding:6px 10px;border:1px solid var(--ds-red-border);border-radius:999px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">清空自定义模型</button><button id="aus-btn-add-model" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">+ 自定义模型</button><span id="aus-models-toggle" style="flex-shrink:0;padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;user-select:none;line-height:1;">${icon("chevron-down", 14)} 展开</span></div></div><div id="aus-models-sync-note" style="display:none;margin-top:8px;padding:8px 10px;border:1px dashed var(--ds-border);border-radius:10px;background:var(--ds-sidebar-bg);font-size:var(--aus-fs-sm);color:var(--ds-text-2);line-height:1.6;"></div><div id="aus-custom-models-list" style="display:grid;gap:8px;margin-top:8px;"></div></div>

      <!-- 模型价格自动同步（models.dev） -->
      <div class="ds-card" style="position:relative;"><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">模型价格自动同步（models.dev）</span><label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;"><input type="checkbox" id="aus-pricing-sync-enabled" style="opacity:0;width:0;height:0;"><span style="position:absolute;inset:0;background:var(--ds-border);border-radius:12px;transition:0.2s;"><span id="aus-pricing-sync-slider" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:var(--ds-card-inner);border-radius:50%;transition:0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.15);"></span></span></label></div>
        <div id="aus-pricing-sync-panel" style="display:${s.pricingSync?.enabled ? "grid" : "none"};margin-top:10px;gap:10px;">
          <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);line-height:1.6;">开启后所有价格、余额、图表将以 <b style="color:var(--ds-text);">美元 $/USD</b> 展示（按汇率动态换算），自动从 <a href="https://models.dev" target="_blank" style="color:var(--ds-text);text-decoration:underline;">models.dev</a> 拉取模型价格。各钱包在钱包页选择“价格来源供应商”，同步只写入对应钱包；DeepSeek 峰价按谷价 2× 合成。功能默认关闭。<br />钱包中锁定或手工维护的价格受同步模式保护；<b style="color:var(--ds-text);">关闭本开关会移除未锁定的同步价格</b>。</div>
          <div style="display:flex;align-items:center;justify-content:space-between;position:relative;"><span style="font-size:var(--aus-fs-base);color:var(--ds-text);">同步模式</span><div id="aus-pricing-sync-mode-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);cursor:pointer;"><span id="aus-pricing-sync-mode-label" style="font-weight:600;color:var(--ds-text);">仅新增</span>${icon("chevron-down", 14)}</div><div id="aus-pricing-sync-mode-dropdown" style="display:none;position:absolute;top:40px;right:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:160px;padding:8px;"></div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">汇率 USD→CNY</div><input id="aus-exchange-rate" type="number" step="0.0001" min="0" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /></div>
            <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">自动同步间隔</div><div id="aus-pricing-sync-interval-btn" style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);cursor:pointer;"><span id="aus-pricing-sync-interval-label" style="font-weight:600;">仅手动</span>${icon("chevron-down", 14)}</div><div id="aus-pricing-sync-interval-dropdown" style="display:none;position:absolute;right:12px;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:140px;padding:8px;"></div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;"><label style="display:flex;align-items:center;gap:6px;font-size:var(--aus-fs-sm);color:var(--ds-text-2);cursor:pointer;"><input type="checkbox" id="aus-use-live-rate" style="accent-color:var(--ds-text);" /> 每24小时自动联网获取最新汇率</label><button id="aus-fetch-rate" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">立即获取</button></div>
          <div id="aus-rate-status" style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);"></div>
          <label style="display:flex;align-items:center;gap:6px;font-size:var(--aus-fs-sm);color:var(--ds-text-2);cursor:pointer;"><input type="checkbox" id="aus-recalc-on-sync" style="accent-color:var(--ds-text);" /> 同步后重算历史费用（否则仅新请求生效）</label>
          <div style="display:flex;gap:8px;"><button id="aus-btn-sync-pricing" class="ds-btn-pill" style="flex:1;">立即同步</button><button id="aus-btn-preview-pricing" style="flex:1;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">预览</button></div>
          <div id="aus-pricing-sync-status" style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);"></div>
          <div id="aus-pricing-sync-preview" style="display:none;max-height:160px;overflow:auto;border:1px solid var(--ds-border);border-radius:8px;padding:8px;background:var(--ds-sidebar-bg);font-size:var(--aus-fs-sm);"></div>
        </div>
      </div>

      <!-- 调试 -->
      <div class="ds-card">
        <div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">调试模式（模拟数据，不计费）</span><label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;"><input type="checkbox" id="aus-debug-mode" style="opacity:0;width:0;height:0;"><span style="position:absolute;inset:0;background:var(--ds-border);border-radius:12px;transition:0.2s;"><span id="aus-debug-mode-slider" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:var(--ds-card-inner);border-radius:50%;transition:0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.15);"></span></span></label></div>
        <div id="aus-debug-panel" style="display:${s.debug ? "grid" : "none"};margin-top:10px;gap:8px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">命中</div><input type="number" id="aus-debug-hit" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /></div><div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">未命中</div><input type="number" id="aus-debug-miss" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /></div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">输出</div><input type="number" id="aus-debug-output" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /></div><div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">模型</div><select id="aus-debug-model" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);"></select></div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;"><input type="date" id="aus-debug-date-start" style="padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /><input type="date" id="aus-debug-date-end" style="padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /><input type="number" id="aus-debug-batch-count" min="1" placeholder="条数" style="padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /></div>
          <button id="aus-btn-debug-batch" class="ds-btn-pill" style="width:100%;">生成模拟数据</button>
          <button id="aus-btn-debug-clear" style="width:100%;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">清除调试数据</button><div id="aus-debug-status" style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);"></div>
        </div>
      </div>

      <!-- 峰值圆点 -->
      <div class="ds-card"><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">峰值提示小圆点</span><label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;"><input type="checkbox" id="aus-peak-dot" style="opacity:0;width:0;height:0;"><span style="position:absolute;inset:0;background:var(--ds-border);border-radius:12px;transition:0.2s;"><span id="aus-peak-dot-slider" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:var(--ds-card-inner);border-radius:50%;transition:0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.15);"></span></span></label></div><button id="aus-reset-dot" style="margin-top:8px;padding:6px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">重置位置</button></div>

      <!-- 记录数据管理 -->
      <div class="ds-card">
        <div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);margin-bottom:6px;">按范围删除记录</div>
        <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);line-height:1.7;margin-bottom:8px;">可删除全部记录，或按日期、模型、对话缩小范围。日期留空表示不限；模型与对话需完全匹配，留空表示不限。删除会同时处理热记录与冷记录，并立即重算统计。</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">开始日期</div><input type="date" id="aus-delete-start" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);box-sizing:border-box;" /></div>
          <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">结束日期</div><input type="date" id="aus-delete-end" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);box-sizing:border-box;" /></div>
          <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">模型</div><input id="aus-delete-model" placeholder="如 deepseek-flash" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);box-sizing:border-box;" /></div>
          <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">对话</div><input id="aus-delete-chat" placeholder="对话名称或 chatId" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);box-sizing:border-box;" /></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="aus-delete-preview" style="padding:7px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">统计匹配记录</button>
          <button id="aus-delete-run" style="padding:7px 12px;border:1px solid var(--ds-red-border);border-radius:999px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">删除匹配记录</button>
        </div>
        <div id="aus-delete-status" style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:8px;"></div>
      </div>

      <!-- 存储占用 -->
      ${renderStorageUsageCard(doc)}

      <!-- WebDAV -->
      <div class="ds-card"><div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);margin-bottom:6px;">WebDAV 云同步</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:8px;">双向合并，仅同步统计/设置/余额，不含聊天内容与密钥。强制 https。</div>
        <div style="display:grid;gap:8px;">
          <input id="aus-webdav-url" placeholder="https://dav.jianguoyun.com/dav/" style="padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" />
          <div style="display:flex;gap:8px;"><input id="aus-webdav-user" placeholder="用户名" style="flex:1;padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /><input id="aus-webdav-pass" type="password" placeholder="应用密码" style="flex:1;padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /><button id="aus-webdav-pass-clear" type="button" style="padding:8px 12px;border:1px solid var(--ds-red-border);border-radius:999px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">清除密码</button></div>
          <input id="aus-webdav-path" placeholder="远程子路径（可空）" style="padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" />
          <input id="aus-webdav-proxy" placeholder="CORS 代理（可选，http://127.0.0.1:8000/proxy?url=）" style="padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" />
          <button id="aus-webdav-sync" class="ds-btn-pill">☁️ 立即同步</button>
        </div>
      </div>
    </div>
  `;
	const apiKeyEl = doc.getElementById("aus-api-key");
	try {
		if ((globalThis.SillyTavern?.getContext?.())?.extensionSettings?.["api_usage_stat"]?.apiKey && apiKeyEl) {
			apiKeyEl.value = "";
			apiKeyEl.placeholder = "已保存 ●●●●（留空不修改）";
			apiKeyEl.dataset.hasKey = "1";
		}
	} catch {}
	doc.getElementById("aus-custom-balance").value = state$2.customBalance || "";
	const telemetryCb = doc.getElementById("aus-telemetry-enabled");
	const telemetrySlider = doc.getElementById("aus-telemetry-slider");
	if (telemetryCb) telemetryCb.checked = s.telemetryEnabled !== false;
	if (telemetrySlider) telemetrySlider.style.left = s.telemetryEnabled !== false ? "23px" : "3px";
	renderTelemetryStatus(doc);
	doc.getElementById("aus-peak-dot").checked = state$2.settings.peakDot !== false;
	const peakSlider = doc.getElementById("aus-peak-dot-slider");
	if (peakSlider) peakSlider.style.left = state$2.settings.peakDot !== false ? "23px" : "3px";
	const autoCb = doc.getElementById("aus-auto-balance");
	const autoSlider = doc.getElementById("aus-auto-balance-slider");
	if (autoCb) autoCb.checked = !!s.autoBalance;
	if (autoSlider) autoSlider.style.left = s.autoBalance ? "23px" : "3px";
	doc.getElementById("aus-balance-interval").value = String(s.balanceInterval ?? 10);
	const dbgCb = doc.getElementById("aus-debug-mode");
	const dbgSlider = doc.getElementById("aus-debug-mode-slider");
	if (dbgCb) dbgCb.checked = !!s.debug;
	if (dbgSlider) dbgSlider.style.left = s.debug ? "23px" : "3px";
	doc.getElementById("aus-debug-hit").value = String(s.debugHit ?? 1e4);
	doc.getElementById("aus-debug-miss").value = String(s.debugMiss ?? 5e3);
	doc.getElementById("aus-debug-output").value = String(s.debugOutput ?? 2e3);
	doc.getElementById("aus-debug-date-start").value = s.debugDateStart || "";
	doc.getElementById("aus-debug-date-end").value = s.debugDateEnd || "";
	doc.getElementById("aus-debug-batch-count").value = String(s.debugBatchCount ?? 30);
	doc.getElementById("aus-webdav-url").value = s.webdav?.url || "";
	doc.getElementById("aus-webdav-user").value = s.webdav?.username || "";
	doc.getElementById("aus-webdav-path").value = s.webdav?.path || "";
	doc.getElementById("aus-webdav-proxy").value = s.webdav?.proxy || "";
	try {
		const pass = localStorage.getItem("ds_ds_webdav_pass") || "";
		const el = doc.getElementById("aus-webdav-pass");
		if (pass && el) {
			el.value = "";
			el.placeholder = "已保存 ●●●●（留空不修改）";
			el.dataset.hasKey = "1";
		} else if ((globalThis.SillyTavern?.getContext?.())?.extensionSettings?.["api_usage_stat"]?.webdavPass && el) {
			el.value = "";
			el.placeholder = "已保存 ●●●●（留空不修改）";
			el.dataset.hasKey = "1";
		}
	} catch {}
	function renderThemePicker() {
		const dropdown = doc.getElementById("aus-theme-dropdown");
		const label = doc.getElementById("aus-theme-label");
		if (!label) return;
		const cur = state$2.settings.theme || "light";
		label.textContent = cur === "dark" ? "深色" : cur === "auto" ? "跟随系统" : "浅色";
		const hint = doc.getElementById("aus-theme-hint");
		if (hint) {
			const sysDark = resolveTheme("auto") === "dark";
			hint.textContent = cur === "auto" ? `跟随系统：当前系统为${sysDark ? "深色" : "浅色"}，系统切换后自动同步` : "切换后立即生效，深色模式针对夜间可读性优化";
		}
		if (!dropdown) return;
		dropdown.innerHTML = [
			{
				v: "light",
				l: "浅色"
			},
			{
				v: "dark",
				l: "深色"
			},
			{
				v: "auto",
				l: "跟随系统"
			}
		].map((o) => {
			const active = o.v === cur ? "background:var(--ds-card);font-weight:600;" : "";
			return `<div data-theme="${o.v}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}">${o.l}</div>`;
		}).join("");
		dropdown.querySelectorAll("[data-theme]").forEach((el) => {
			el.onclick = () => {
				const v = el.getAttribute("data-theme");
				state$2.settings.theme = v;
				saveHot({ settings: state$2.settings });
				applyTheme(v);
				syncThemeWatcher();
				dropdown.style.display = "none";
				renderThemePicker();
				try {
					globalThis.ApiUsageStat?.refreshUI?.();
				} catch {}
			};
		});
	}
	renderThemePicker();
	const themeBtn = doc.getElementById("aus-theme-btn");
	const themeDropdown = doc.getElementById("aus-theme-dropdown");
	if (themeBtn && themeDropdown) themeBtn.onclick = () => {
		const open = themeDropdown.style.display === "block";
		themeDropdown.style.display = open ? "none" : "block";
		if (!open) renderThemePicker();
	};
	bindSettingsOutsideClick(doc);
	function renderScopePicker() {
		const dropdown = doc.getElementById("aus-history-scope-dropdown");
		const label = doc.getElementById("aus-history-scope-label");
		if (!label) return;
		const cur = state$2.settings.historyScope || "all";
		label.textContent = cur === "current" ? "当前对话" : "全部历史";
		if (!dropdown) return;
		dropdown.innerHTML = [{
			v: "all",
			l: "全部历史"
		}, {
			v: "current",
			l: "当前对话"
		}].map((o) => {
			const active = o.v === cur ? "background:var(--ds-card);font-weight:600;" : "";
			return `<div data-scope="${o.v}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}">${o.l}</div>`;
		}).join("");
		dropdown.querySelectorAll("[data-scope]").forEach((el) => {
			el.onclick = () => {
				const v = el.getAttribute("data-scope");
				state$2.settings.historyScope = v;
				saveHot({ settings: state$2.settings });
				dropdown.style.display = "none";
				renderScopePicker();
				try {
					globalThis.ApiUsageStat?.refreshUI?.();
				} catch {}
			};
		});
	}
	renderScopePicker();
	bindStorageUsageCard(doc);
	refreshStorageUsage(doc);
	const scopeBtn = doc.getElementById("aus-history-scope-btn");
	const scopeDropdown = doc.getElementById("aus-history-scope-dropdown");
	if (scopeBtn && scopeDropdown) scopeBtn.onclick = () => {
		const open = scopeDropdown.style.display === "block";
		scopeDropdown.style.display = open ? "none" : "block";
		if (!open) renderScopePicker();
	};
	doc.getElementById("aus-save-key").onclick = () => {
		const el = doc.getElementById("aus-api-key");
		const v = el.value.trim();
		if (!v && el.dataset.hasKey === "1") {
			const sEl = doc.getElementById("aus-key-status");
			sEl.textContent = "未修改，已保留原密钥";
			return;
		}
		saveApiKey(v);
		const sEl = doc.getElementById("aus-key-status");
		sEl.textContent = v ? "已保存" : "已清空";
		if (v) {
			el.value = "";
			el.placeholder = "已保存 ●●●●（留空不修改）";
			el.dataset.hasKey = "1";
		} else {
			el.placeholder = "输入 DeepSeek API 密钥";
			el.dataset.hasKey = "";
		}
	};
	doc.getElementById("aus-save-balance").onclick = () => {
		const v = doc.getElementById("aus-custom-balance").value.trim();
		if (v && isNaN(parseFloat(v))) return alert("请输入有效金额");
		state$2.customBalance = v || null;
		saveHot({ customBalance: state$2.customBalance });
		try {
			globalThis.ApiUsageStat?.refreshUI?.();
		} catch {}
		doc.getElementById("aus-balance-status").textContent = v ? "已保存" : "已清除";
	};
	doc.getElementById("aus-clear-balance").onclick = () => {
		state$2.customBalance = null;
		saveHot({ customBalance: null });
		doc.getElementById("aus-custom-balance").value = "";
		doc.getElementById("aus-balance-status").textContent = "已清除";
		try {
			globalThis.ApiUsageStat?.refreshUI?.();
		} catch {}
	};
	if (autoCb) autoCb.onchange = () => {
		state$2.settings.autoBalance = autoCb.checked;
		if (autoSlider) autoSlider.style.left = autoCb.checked ? "23px" : "3px";
		doc.getElementById("aus-auto-balance-interval").style.display = autoCb.checked ? "block" : "none";
		saveHot({ settings: state$2.settings });
		try {
			import("./balance-C3MhaV_X.js").then((n) => n.t).then((m) => m.restartBalanceTimer?.());
		} catch {}
	};
	doc.getElementById("aus-balance-interval").onchange = (e) => {
		state$2.settings.balanceInterval = parseInt(e.target.value) || 10;
		saveHot({ settings: state$2.settings });
		try {
			import("./balance-C3MhaV_X.js").then((n) => n.t).then((m) => m.restartBalanceTimer?.());
		} catch {}
	};
	if (dbgCb) dbgCb.onchange = () => {
		state$2.settings.debug = dbgCb.checked;
		if (dbgSlider) dbgSlider.style.left = dbgCb.checked ? "23px" : "3px";
		doc.getElementById("aus-debug-panel").style.display = dbgCb.checked ? "grid" : "none";
		const st = doc.getElementById("aus-debug-status");
		if (st) st.textContent = dbgCb.checked ? "调试模式已开启，下次对话将使用模拟参数，不计费" : "";
		saveHot({ settings: state$2.settings });
	};
	doc.getElementById("aus-debug-hit").onchange = (e) => {
		state$2.settings.debugHit = parseInt(e.target.value) || 0;
		saveHot({ settings: state$2.settings });
	};
	doc.getElementById("aus-debug-miss").onchange = (e) => {
		state$2.settings.debugMiss = parseInt(e.target.value) || 0;
		saveHot({ settings: state$2.settings });
	};
	doc.getElementById("aus-debug-output").onchange = (e) => {
		state$2.settings.debugOutput = parseInt(e.target.value) || 0;
		saveHot({ settings: state$2.settings });
	};
	const dbgModel = doc.getElementById("aus-debug-model");
	if (dbgModel) dbgModel.onchange = (e) => {
		state$2.settings.debugModel = e.target.value;
		saveHot({ settings: state$2.settings });
	};
	doc.getElementById("aus-debug-date-start").onchange = (e) => {
		state$2.settings.debugDateStart = e.target.value;
		saveHot({ settings: state$2.settings });
	};
	doc.getElementById("aus-debug-date-end").onchange = (e) => {
		state$2.settings.debugDateEnd = e.target.value;
		saveHot({ settings: state$2.settings });
	};
	doc.getElementById("aus-debug-batch-count").onchange = (e) => {
		state$2.settings.debugBatchCount = parseInt(e.target.value) || 1;
		saveHot({ settings: state$2.settings });
	};
	doc.getElementById("aus-btn-debug-batch").onclick = () => generateDebugBatch();
	try {
		const clearBtn = doc.getElementById("aus-btn-debug-clear");
		if (clearBtn) clearBtn.onclick = async () => {
			try {
				const { repository } = await import("./repository-JvxNaSRi.js").then((n) => n.n);
				const { state: st } = await import("./store-Cc2SGj8q.js").then((n) => n.i);
				await repository.replaceAll({ history: (st.history || []).filter((h) => h._debug !== true) });
				await repository.recalcAll();
				await repository.rebuildAggregates();
				try {
					globalThis.ApiUsageStat?.refreshUI?.();
				} catch {}
				const el = doc.getElementById("aus-debug-status");
				if (el) el.textContent = "已清除调试数据";
			} catch {}
		};
	} catch {}
	doc.getElementById("aus-peak-dot").onchange = (e) => {
		state$2.settings.peakDot = e.target.checked;
		const sl = doc.getElementById("aus-peak-dot-slider");
		if (sl) sl.style.left = e.target.checked ? "23px" : "3px";
		saveHot({ settings: state$2.settings });
		try {
			globalThis.ApiUsageStat?.updatePeakDot?.();
		} catch {}
	};
	doc.getElementById("aus-reset-dot").onclick = () => {
		try {
			localStorage.removeItem("ds_ds_peak_dot_pos");
			const dot = window.parent?.document?.getElementById("aus-peak-dot-indicator");
			if (dot) {
				dot.style.left = "";
				dot.style.top = "60px";
				dot.style.right = "16px";
			}
		} catch {}
		alert("已重置");
	};
	const telemetryToggle = doc.getElementById("aus-telemetry-enabled");
	if (telemetryToggle) telemetryToggle.onchange = (e) => {
		const enabled = !!e.target.checked;
		if (!enabled) try {
			flushTelemetryOnDisable();
		} catch {}
		state$2.settings.telemetryEnabled = enabled;
		const slider = doc.getElementById("aus-telemetry-slider");
		if (slider) slider.style.left = enabled ? "23px" : "3px";
		saveHot({ settings: state$2.settings });
		renderTelemetryStatus(doc);
	};
	const telemetryReset = doc.getElementById("aus-telemetry-reset");
	if (telemetryReset) telemetryReset.onclick = () => {
		try {
			resetIdentity();
		} catch {}
		renderTelemetryStatus(doc);
		toast("info", "已重置匿名标识，后续上报将按新设备计入");
	};
	bindHistoryDelete(doc);
	const wUrl = doc.getElementById("aus-webdav-url");
	const wUser = doc.getElementById("aus-webdav-user");
	const wPath = doc.getElementById("aus-webdav-path");
	const wProxy = doc.getElementById("aus-webdav-proxy");
	const wPass = doc.getElementById("aus-webdav-pass");
	if (wUrl) wUrl.onchange = () => {
		state$2.settings.webdav.url = wUrl.value.trim();
		saveHot({ settings: state$2.settings });
	};
	if (wUser) wUser.onchange = () => {
		state$2.settings.webdav.username = wUser.value.trim();
		saveHot({ settings: state$2.settings });
	};
	if (wPath) wPath.onchange = () => {
		state$2.settings.webdav.path = wPath.value.trim();
		saveHot({ settings: state$2.settings });
	};
	if (wProxy) wProxy.onchange = () => {
		state$2.settings.webdav.proxy = wProxy.value.trim();
		saveHot({ settings: state$2.settings });
	};
	if (wPass) wPass.onchange = () => {
		const vv = wPass.value.trim();
		if (!vv && wPass.dataset.hasKey === "1") return;
		saveWebdavPass(wPass.value);
		if (vv) {
			wPass.value = "";
			wPass.placeholder = "已保存 ●●●●（留空不修改）";
			wPass.dataset.hasKey = "1";
		}
	};
	const wPassClear = doc.getElementById("aus-webdav-pass-clear");
	if (wPassClear && wPass) wPassClear.onclick = () => {
		saveWebdavPass("");
		wPass.value = "";
		wPass.placeholder = "应用密码";
		wPass.dataset.hasKey = "";
	};
	doc.getElementById("aus-webdav-sync").onclick = () => doSyncNow();
	try {
		const ps = state$2.settings.pricingSync || {};
		const enabledEl = doc.getElementById("aus-pricing-sync-enabled");
		const slider = doc.getElementById("aus-pricing-sync-slider");
		const panel = doc.getElementById("aus-pricing-sync-panel");
		if (enabledEl) enabledEl.checked = !!ps.enabled;
		if (slider) slider.style.left = ps.enabled ? "23px" : "3px";
		if (panel) panel.style.display = ps.enabled ? "grid" : "none";
		const modeBtn = doc.getElementById("aus-pricing-sync-mode-btn");
		const modeLabel = doc.getElementById("aus-pricing-sync-mode-label");
		const modeDrop = doc.getElementById("aus-pricing-sync-mode-dropdown");
		const modeMap = {
			"add-missing": "仅新增",
			"overwrite-unlocked": "覆盖未锁定",
			"overwrite-all": "全部覆盖"
		};
		if (modeLabel) modeLabel.textContent = modeMap[ps.mode] || "仅新增";
		if (modeDrop) {
			modeDrop.innerHTML = Object.entries(modeMap).map(([k, l]) => `<div data-mode="${k}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${ps.mode === k ? "background:var(--ds-card);font-weight:600;" : ""}">${l}</div>`).join("");
			modeDrop.querySelectorAll("[data-mode]").forEach((el) => {
				el.onclick = () => {
					state$2.settings.pricingSync.mode = el.getAttribute("data-mode");
					saveHot({ settings: state$2.settings });
					modeDrop.style.display = "none";
					if (modeLabel) modeLabel.textContent = modeMap[state$2.settings.pricingSync.mode] || el.getAttribute("data-mode");
					modeDrop.innerHTML = Object.entries(modeMap).map(([k, l]) => `<div data-mode="${k}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${state$2.settings.pricingSync.mode === k ? "background:var(--ds-card);font-weight:600;" : ""}">${l}</div>`).join("");
				};
			});
		}
		if (modeBtn && modeDrop) modeBtn.onclick = () => {
			modeDrop.style.display = modeDrop.style.display === "block" ? "none" : "block";
		};
		const rateEl = doc.getElementById("aus-exchange-rate");
		if (rateEl) rateEl.value = String(ps.exchangeRate ?? 7.2);
		const liveEl = doc.getElementById("aus-use-live-rate");
		if (liveEl) liveEl.checked = !!ps.useLiveRate;
		const recalcEl = doc.getElementById("aus-recalc-on-sync");
		if (recalcEl) recalcEl.checked = !!ps.recalcOnSync;
		const intervalBtn = doc.getElementById("aus-pricing-sync-interval-btn");
		const intervalLabel = doc.getElementById("aus-pricing-sync-interval-label");
		const intervalDrop = doc.getElementById("aus-pricing-sync-interval-dropdown");
		const intervalMap = {
			"0": "仅手动",
			"24": "每天",
			"168": "每周"
		};
		if (intervalLabel) intervalLabel.textContent = intervalMap[String(ps.autoIntervalHours ?? 0)] || "仅手动";
		if (intervalDrop) {
			intervalDrop.innerHTML = Object.entries(intervalMap).map(([k, l]) => `<div data-interval="${k}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${String(ps.autoIntervalHours) === k ? "background:var(--ds-card);font-weight:600;" : ""}">${l}</div>`).join("");
			intervalDrop.querySelectorAll("[data-interval]").forEach((el) => {
				el.onclick = () => {
					state$2.settings.pricingSync.autoIntervalHours = parseInt(el.getAttribute("data-interval")) || 0;
					saveHot({ settings: state$2.settings });
					intervalDrop.style.display = "none";
					if (intervalLabel) intervalLabel.textContent = intervalMap[el.getAttribute("data-interval")] || el.getAttribute("data-interval");
					try {
						import("./pricing-sync-CADPKT9h.js").then((n) => n.i).then((m) => m.restartPricingSyncTimer?.());
						import("./currency-BZt-7TC7.js").then((n) => n.t).then((m) => m.restartRateTimer?.());
					} catch {}
				};
			});
		}
		if (intervalBtn && intervalDrop) intervalBtn.onclick = () => {
			intervalDrop.style.display = intervalDrop.style.display === "block" ? "none" : "block";
		};
		const rateStatus = doc.getElementById("aus-rate-status");
		if (rateStatus) {
			const last = ps.lastRateFetch ? new Date(ps.lastRateFetch).toLocaleString("zh-CN") : "—";
			rateStatus.textContent = `1 USD ≈ ${Number(ps.exchangeRate || 7.2).toFixed(4)} CNY（更新于 ${last}）`;
		}
		const syncStatus = doc.getElementById("aus-pricing-sync-status");
		if (syncStatus) syncStatus.textContent = `上次同步：${ps.lastSync ? new Date(ps.lastSync).toLocaleString("zh-CN") : "未同步"} · 模式：${modeMap[ps.mode] || ps.mode}`;
		if (enabledEl) enabledEl.onchange = async () => {
			state$2.settings.pricingSync.enabled = enabledEl.checked;
			if (slider) slider.style.left = enabledEl.checked ? "23px" : "3px";
			if (panel) panel.style.display = enabledEl.checked ? "grid" : "none";
			let removed = 0;
			if (!enabledEl.checked) try {
				const m = await import("./pricing-sync-CADPKT9h.js").then((n) => n.i);
				try {
					await m.markLegacySyncedModels?.({ skipRerender: true });
				} catch {}
				removed = m.removeSyncedModels ? m.removeSyncedModels() : 0;
			} catch {
				removed = 0;
			}
			saveHot({ settings: state$2.settings });
			try {
				import("./currency-BZt-7TC7.js").then((n) => n.t).then((m) => m.restartRateTimer?.());
				import("./pricing-sync-CADPKT9h.js").then((n) => n.i).then((m) => m.restartPricingSyncTimer?.());
			} catch {}
			if (removed) {
				renderModelsEditor(doc);
				fillDebugModelSelect(doc);
				recalcCostsAndRefresh();
				toast("success", `已移除 ${removed} 个同步模型价格`);
			}
			try {
				globalThis.ApiUsageStat?.refreshUI?.();
			} catch {}
			const unitEl = doc.getElementById("aus-model-price-unit");
			if (unitEl) try {
				unitEl.textContent = getDisplayCurrency().code + "/百万 tokens";
			} catch {}
		};
		if (rateEl) rateEl.onchange = () => {
			const v = parseFloat(rateEl.value);
			if (!isFinite(v) || v <= 0) return;
			state$2.settings.pricingSync.exchangeRate = Math.round(v * 1e4) / 1e4;
			saveHot({ settings: state$2.settings });
			if (rateStatus) rateStatus.textContent = `1 USD ≈ ${v.toFixed(4)} CNY（更新于 ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN")}）`;
			try {
				globalThis.ApiUsageStat?.refreshUI?.();
			} catch {}
		};
		if (liveEl) liveEl.onchange = () => {
			state$2.settings.pricingSync.useLiveRate = liveEl.checked;
			saveHot({ settings: state$2.settings });
			try {
				import("./currency-BZt-7TC7.js").then((n) => n.t).then((m) => m.restartRateTimer?.());
			} catch {}
		};
		if (recalcEl) recalcEl.onchange = () => {
			state$2.settings.pricingSync.recalcOnSync = recalcEl.checked;
			saveHot({ settings: state$2.settings });
		};
		const fetchBtn = doc.getElementById("aus-fetch-rate");
		if (fetchBtn) fetchBtn.onclick = async () => {
			fetchBtn.textContent = "获取中…";
			fetchBtn.disabled = true;
			try {
				const r = await fetchLiveRate(true);
				if (r && rateEl) {
					rateEl.value = String(r);
					if (rateStatus) rateStatus.textContent = `1 USD ≈ ${Number(r).toFixed(4)} CNY（更新于 ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN")}）`;
					try {
						globalThis.ApiUsageStat?.refreshUI?.();
					} catch {}
				}
			} finally {
				fetchBtn.textContent = "立即获取";
				fetchBtn.disabled = false;
			}
		};
		const syncBtn = doc.getElementById("aus-btn-sync-pricing");
		if (syncBtn) syncBtn.onclick = async () => {
			syncBtn.textContent = "同步中…";
			syncBtn.disabled = true;
			try {
				await syncPricingFromModelsDev({ silent: false });
				if (syncStatus) {
					const ps2 = state$2.settings.pricingSync;
					syncStatus.textContent = `上次同步：${new Date(ps2.lastSync).toLocaleString("zh-CN")} · 模式：${modeMap[ps2.mode] || ps2.mode}`;
				}
				try {
					globalThis.ApiUsageStat?.refreshUI?.();
					renderModelsEditor(doc);
				} catch {}
			} finally {
				syncBtn.textContent = "立即同步";
				syncBtn.disabled = false;
			}
		};
		const previewBtn = doc.getElementById("aus-btn-preview-pricing");
		const previewHost = doc.getElementById("aus-pricing-sync-preview");
		if (previewBtn && previewHost) previewBtn.onclick = async () => {
			previewBtn.textContent = "预览中…";
			previewBtn.disabled = true;
			try {
				const catalog = await fetchModelsDevCatalog();
				const p = previewSync(catalog);
				previewHost.style.display = "block";
				previewHost.innerHTML = `<div style="font-weight:600;margin-bottom:6px;">共 ${p.total} 模型 · 新增 ${p.added} 更新 ${p.updated} 跳过 ${p.skipped}</div>` + p.samples.map((s) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--ds-border);padding:4px 0;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;">${esc(s.model)}</span><span>${s.hit.toFixed(4)}/${s.miss.toFixed(4)}/${s.output.toFixed(4)}</span></div>`).join("") + `<div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:6px;">单位 ${getDisplayCurrency().code}/百万 · 峰价为谷价 2×（DeepSeek）</div>`;
			} catch (e) {
				previewHost.style.display = "block";
				previewHost.textContent = "预览失败：" + (e?.message || e);
			} finally {
				previewBtn.textContent = "预览";
				previewBtn.disabled = false;
			}
		};
	} catch {}
	renderPeakHoursEditor(doc);
	renderModelsEditor(doc);
	fillDebugModelSelect(doc);
	try {
		const listEl = doc.getElementById("aus-custom-models-list");
		const toggleEl = doc.getElementById("aus-models-toggle");
		const headerEl = doc.getElementById("aus-models-header");
		const addBtn = doc.getElementById("aus-btn-add-model");
		const collapsed = s.modelsPricingCollapsed !== false;
		if (listEl) listEl.style.display = collapsed ? "none" : "grid";
		if (toggleEl) toggleEl.innerHTML = collapsed ? icon("chevron-down", 14) + " 展开" : icon("chevron-up", 14) + " 收起";
		const applyCollapsed = (next) => {
			state$2.settings.modelsPricingCollapsed = next;
			try {
				saveHot({ settings: state$2.settings });
			} catch {}
			if (listEl) listEl.style.display = next ? "none" : "grid";
			if (toggleEl) toggleEl.innerHTML = next ? icon("chevron-down", 14) + " 展开" : icon("chevron-up", 14) + " 收起";
		};
		if (toggleEl) toggleEl.onclick = (e) => {
			e.stopPropagation();
			applyCollapsed(listEl?.style.display !== "none" ? true : false);
		};
		if (headerEl) headerEl.onclick = (e) => {
			const target = e.target;
			if (target.closest("#aus-btn-add-model") || target.closest("#aus-btn-clear-custom-models") || target.closest("#aus-models-toggle")) return;
			applyCollapsed(listEl?.style.display !== "none" ? true : false);
		};
		const clearAllBtn = doc.getElementById("aus-btn-clear-custom-models");
		if (clearAllBtn) {
			let armed = false;
			let armTimer = null;
			const resetLabel = () => {
				armed = false;
				try {
					clearAllBtn.textContent = "清空自定义模型";
				} catch {}
			};
			clearAllBtn.onclick = () => {
				if (!armed) {
					armed = true;
					clearAllBtn.textContent = "确认清空？再点一次";
					armTimer = setTimeout(() => {
						armTimer = null;
						resetLabel();
					}, 4e3);
					return;
				}
				if (armTimer) {
					clearTimeout(armTimer);
					armTimer = null;
				}
				resetLabel();
				const n = clearAllCustomModels();
				renderModelsEditor(doc);
				fillDebugModelSelect(doc);
				recalcCostsAndRefresh();
				if (n) toast("success", `已清空 ${n} 项自定义模型与价格，内置模型计价规则保持不变`);
				else toast("info", "当前没有自定义模型可清空");
			};
		}
		if (addBtn) addBtn.addEventListener("click", () => {
			if (listEl?.style.display === "none") applyCollapsed(false);
			setTimeout(() => {
				const l = doc.getElementById("aus-custom-models-list");
				const t = doc.getElementById("aus-models-toggle");
				if (l) l.style.display = "grid";
				if (t) t.innerHTML = icon("chevron-up", 14) + " 收起";
			}, 30);
		});
	} catch {}
}
function renderPeakHoursEditor(doc) {
	const list = doc.getElementById("aus-peak-hours-list");
	if (!list) return;
	list.innerHTML = (state$2.settings.peakHours || []).map((h, i) => `
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="time" value="${esc(h.start || "")}" data-idx="${i}" data-field="start" style="flex:1;padding:6px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" />
      <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);">至</span>
      <input type="time" value="${esc(h.end || "")}" data-idx="${i}" data-field="end" style="flex:1;padding:6px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" />
      <button data-del="${i}" style="padding:6px 8px;border:1px solid var(--ds-red-border);border-radius:8px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">删除</button>
    </div>
  `).join("");
	list.querySelectorAll("input[type=\"time\"]").forEach((el) => {
		el.onchange = () => {
			const idx = parseInt(el.getAttribute("data-idx"));
			const field = el.getAttribute("data-field");
			state$2.settings.peakHours[idx][field] = el.value;
			saveHot({ settings: state$2.settings });
			recalcCostsAndRefresh();
		};
	});
	list.querySelectorAll("button[data-del]").forEach((el) => {
		el.onclick = () => {
			const idx = parseInt(el.getAttribute("data-del"));
			state$2.settings.peakHours.splice(idx, 1);
			if (!state$2.settings.peakHours.length) state$2.settings.peakHours = JSON.parse(JSON.stringify(DEFAULT_PEAK_HOURS));
			saveHot({ settings: state$2.settings });
			renderPeakHoursEditor(doc);
			recalcCostsAndRefresh();
		};
	});
	const addBtn = doc.getElementById("aus-btn-add-peak-hour");
	if (addBtn) addBtn.onclick = () => {
		state$2.settings.peakHours.push({
			start: "09:00",
			end: "12:00"
		});
		saveHot({ settings: state$2.settings });
		renderPeakHoursEditor(doc);
	};
	bindExtraOffDays(doc);
}
function bindExtraOffDays(doc) {
	const el = doc.getElementById("aus-extra-off-days");
	if (!el) return;
	el.value = (state$2.settings.extraOffDays || []).join("\n");
	el.onchange = () => {
		const raw = String(el.value || "").split(/[\s,，;；]+/).filter(Boolean);
		const valid = [];
		const invalid = [];
		for (const day of raw) if (isValidDayKey(day)) {
			if (valid.indexOf(day) === -1) valid.push(day);
		} else invalid.push(day);
		valid.sort();
		state$2.settings.extraOffDays = valid;
		saveHot({ settings: state$2.settings });
		renderPeakHoursEditor(doc);
		recalcCostsAndRefresh();
		if (invalid.length) toast("warning", `已保存 ${valid.length} 个日期，忽略 ${invalid.length} 个非法日期：${invalid.slice(0, 3).join("、")}`);
		else toast("success", `已保存 ${valid.length} 个额外空闲日期`);
	};
}
function renderModelsEditor(doc) {
	const list = doc.getElementById("aus-custom-models-list");
	if (!list) return;
	const builtin = Object.keys(PRICING).filter((m) => HIDDEN_PRICING_MODELS.indexOf(m) === -1);
	const cms = state$2.settings.customModels || [];
	const showSynced = state$2.settings.pricingSync?.showSyncedModels === true;
	const syncedCount = cms.filter((c) => isSyncedCustomModel(c)).length;
	const rows = [];
	for (const m of builtin) {
		const p = getPricing(m);
		const usePeak = p.usePeakPricing !== false;
		rows.push(modelRow(m, p, true, usePeak));
	}
	for (const e of cms) {
		if (isSyncedCustomModel(e) && !showSynced) continue;
		if (e?.model && builtin.indexOf(e.model) === -1 && HIDDEN_PRICING_MODELS.indexOf(e.model) === -1) {
			const p = getPricing(e.model);
			rows.push(modelRow(e.model, p, false, p.usePeakPricing !== false, isSyncedCustomModel(e)));
		}
	}
	list.innerHTML = rows.join("");
	renderModelsSyncNote(doc, syncedCount, showSynced);
	list.querySelectorAll("input[type=\"checkbox\"].aus-cm-peak").forEach((el) => {
		el.onchange = () => {
			const model = el.closest("[data-model]").getAttribute("data-model") || "";
			const usePeak = el.checked;
			upsertCustom(model, { usePeakPricing: usePeak });
			saveHot({ settings: state$2.settings });
			renderModelsEditor(doc);
			recalcCostsAndRefresh();
		};
	});
	list.querySelectorAll("input[data-price]").forEach((el) => {
		el.onchange = () => {
			const row = el.closest("[data-model]");
			const model = row.getAttribute("data-model") || "";
			const isBuiltin = row.getAttribute("data-builtin") === "1";
			saveCustomRow(model, readRow(row), isBuiltin);
		};
	});
	list.querySelectorAll("button[data-del]").forEach((el) => {
		el.onclick = () => {
			const model = el.closest("[data-model]").getAttribute("data-model") || "";
			state$2.settings.customModels = state$2.settings.customModels.filter((c) => c.model !== model);
			saveHot({ settings: state$2.settings });
			renderModelsEditor(doc);
			fillDebugModelSelect(doc);
			recalcCostsAndRefresh();
		};
	});
	const addBtn = doc.getElementById("aus-btn-add-model");
	if (addBtn) addBtn.onclick = () => {
		const name = "custom-model-" + (state$2.settings.customModels.length + 1);
		state$2.settings.customModels.push({
			model: name,
			usePeakPricing: true,
			offpeak: {},
			peak: {}
		});
		saveHot({ settings: state$2.settings });
		renderModelsEditor(doc);
		fillDebugModelSelect(doc);
	};
}
/** 已同步模型提示条：说明隐藏原因，并提供展开查看 / 一次性移除入口 */
function renderModelsSyncNote(doc, syncedCount, showSynced) {
	const note = doc.getElementById("aus-models-sync-note");
	if (!note) return;
	if (!syncedCount) {
		note.style.display = "none";
		note.innerHTML = "";
		return;
	}
	note.style.display = "block";
	note.innerHTML = `已从 models.dev 同步 <b style="color:var(--ds-text);">${syncedCount}</b> 个模型价格，默认隐藏不显示（仍照常参与计费）。
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
      <button id="aus-toggle-synced-models" style="padding:5px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">${showSynced ? "隐藏同步模型" : "显示同步模型"}</button>
      <button id="aus-clear-synced-models" style="padding:5px 10px;border:1px solid var(--ds-red-border);border-radius:999px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">移除全部同步模型</button>
    </div>`;
	const toggleBtn = doc.getElementById("aus-toggle-synced-models");
	if (toggleBtn) toggleBtn.onclick = () => {
		state$2.settings.pricingSync.showSyncedModels = !showSynced;
		saveHot({ settings: state$2.settings });
		renderModelsEditor(doc);
	};
	const clearBtn = doc.getElementById("aus-clear-synced-models");
	if (clearBtn) {
		let armed = false;
		clearBtn.onclick = () => {
			if (!armed) {
				armed = true;
				clearBtn.textContent = "确认移除？再点一次";
				setTimeout(() => {
					armed = false;
					try {
						clearBtn.textContent = "移除全部同步模型";
					} catch {}
				}, 4e3);
				return;
			}
			const n = removeSyncedModels();
			renderModelsEditor(doc);
			fillDebugModelSelect(doc);
			recalcCostsAndRefresh();
			if (n) toast("success", `已移除 ${n} 个同步模型价格`);
		};
	}
}
function modelRow(model, p, isBuiltin, usePeak, synced = false) {
	const cur = (() => {
		try {
			return getDisplayCurrency();
		} catch {
			return {
				code: "CNY",
				symbol: "¥",
				rate: 1
			};
		}
	})();
	const toDisplay = (v) => {
		if (v === "" || v == null) return "";
		const num = parseFloat(String(v));
		if (!isFinite(num)) return String(v);
		const d = cur.code === "USD" ? num / cur.rate : num;
		return String(Math.round(d * 1e4) / 1e4);
	};
	const hit = (v) => v !== void 0 && v !== "" ? toDisplay(v) : "";
	return `<div data-model="${esc(model)}" data-builtin="${isBuiltin ? "1" : "0"}" data-synced="${synced ? "1" : "0"}" style="border:1px solid var(--ds-border);border-radius:10px;padding:10px;background:var(--ds-card-inner);display:grid;gap:8px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <input value="${esc(model)}" ${isBuiltin ? "readonly" : ""} style="flex:1;padding:6px 8px;border:1px solid var(--ds-border);border-radius:8px;background:${isBuiltin ? "var(--ds-sidebar-bg)" : "var(--ds-card-inner)"};font-size:var(--aus-fs-base);" />
      ${synced ? "<span title=\"来自 models.dev 自动同步\" style=\"flex-shrink:0;padding:2px 8px;border-radius:999px;background:var(--ds-green-bg);color:var(--ds-green);font-size:var(--aus-fs-sm);font-weight:600;\">已同步</span>" : ""}
      <label style="display:flex;align-items:center;gap:6px;font-size:var(--aus-fs-sm);color:var(--ds-text-2);cursor:pointer;"><input type="checkbox" class="aus-cm-peak" ${usePeak ? "checked" : ""} /> 峰谷</label>
      ${isBuiltin ? "" : "<button data-del=\"1\" style=\"padding:4px 8px;border:1px solid var(--ds-red-border);border-radius:6px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;\">删除</button>"}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div style="background:var(--ds-sidebar-bg);border-radius:8px;padding:8px;display:grid;gap:6px;">
        <div style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-green);">非峰</div>
        ${field("offpeak.hit", hit(p.offpeak.hit))}${field("offpeak.miss", hit(p.offpeak.miss))}${field("offpeak.output", hit(p.offpeak.output))}
      </div>
      <div style="background:var(--ds-card-inner);border-radius:8px;padding:8px;display:grid;gap:6px;${usePeak ? "" : "opacity:0.45;pointer-events:none;"}">
        <div style="font-size:var(--aus-fs-sm);font-weight:600;color:#D97706;">高峰</div>
        ${field("peak.hit", hit(p.peak.hit))}${field("peak.miss", hit(p.peak.miss))}${field("peak.output", hit(p.peak.output))}
      </div>
    </div>
    <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">单位：${cur.code}/百万 tokens（${cur.symbol}）· ${synced ? "同步模型：手动改价后转为自定义模型" : "内置模型不可删除，价格可覆盖"}</div>
  </div>`;
}
function field(key, val) {
	return `<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);width:44px;">${key.endsWith(".hit") ? "命中" : key.endsWith(".miss") ? "未命中" : "输出"}</span><input type="number" step="0.001" min="0" data-price="${key}" value="${esc(val)}" style="flex:1;padding:6px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /></div>`;
}
function readRow(row) {
	const out = {
		usePeakPricing: row.querySelector(".aus-cm-peak")?.checked ?? true,
		offpeak: {},
		peak: {}
	};
	const cur = (() => {
		try {
			return getDisplayCurrency();
		} catch {
			return {
				code: "CNY",
				rate: 1
			};
		}
	})();
	row.querySelectorAll("input[data-price]").forEach((el) => {
		const k = el.getAttribute("data-price");
		const v = el.value.trim();
		if (v === "") return;
		const num = parseFloat(v);
		if (isNaN(num)) return;
		const cny = cur.code === "USD" ? Math.round(num * cur.rate * 1e4) / 1e4 : num;
		const [zone, field] = k.split(".");
		out[zone][field] = cny;
	});
	return out;
}
function upsertCustom(model, patch) {
	const cms = state$2.settings.customModels;
	let found = cms.find((c) => c.model === model);
	if (found) {
		Object.assign(found, patch);
		delete found.synced;
	} else cms.push({
		model,
		usePeakPricing: patch.usePeakPricing,
		offpeak: {},
		peak: {}
	});
}
/**
* 清空全部自定义模型与覆盖价格（含 models.dev 同步项）。
* 仅清空 settings.customModels —— 脚本内置的 PRICING / PRICE_HISTORY 完全不动，
* 因此未外显模型（如已下架/旧键）以及过去/现在/未来的多段计价规则都照常生效。
*/
function clearAllCustomModels() {
	const n = (state$2.settings.customModels || []).length;
	state$2.settings.customModels = [];
	const ps = state$2.settings.pricingSync;
	if (ps) ps.showSyncedModels = false;
	saveHot({ settings: state$2.settings });
	return n;
}
function saveCustomRow(model, prices, isBuiltin) {
	const base = PRICING[model];
	let same = true;
	for (const f of [
		"hit",
		"miss",
		"output"
	]) {
		if (prices.offpeak[f] !== void 0 && prices.offpeak[f] !== base?.offpeak?.[f]) same = false;
		if (prices.peak[f] !== void 0 && prices.peak[f] !== base?.peak?.[f]) same = false;
	}
	const cms = state$2.settings.customModels;
	const idx = cms.findIndex((c) => c.model === model);
	if (isBuiltin && prices.usePeakPricing && same) {
		if (idx !== -1) cms.splice(idx, 1);
	} else {
		const entry = {
			model,
			usePeakPricing: prices.usePeakPricing,
			offpeak: prices.offpeak,
			peak: prices.peak
		};
		if (idx !== -1) cms[idx] = entry;
		else cms.push(entry);
	}
	saveHot({ settings: state$2.settings });
	recalcCostsAndRefresh();
}
function getPricing(model) {
	const m = model || "deepseek-flash";
	try {
		return getPricing$1(m, state$2.settings);
	} catch {
		return PRICING[m] || PRICING["deepseek-v4-flash"];
	}
}
function fillDebugModelSelect(doc) {
	const sel = doc.getElementById("aus-debug-model");
	if (!sel) return;
	const models = Object.keys(PRICING).concat((state$2.settings.customModels || []).filter((c) => !isSyncedCustomModel(c)).map((c) => c.model).filter(Boolean)).concat(repository.getWallets().flatMap((wallet) => wallet.models.map((model) => model.model)).filter(Boolean)).filter((m) => HIDDEN_PRICING_MODELS.indexOf(m) === -1);
	const uniq = Array.from(new Set(models));
	sel.innerHTML = uniq.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("");
	const cur = state$2.settings.debugModel;
	if (uniq.indexOf(cur) === -1) {
		state$2.settings.debugModel = uniq[0] || "deepseek-flash";
		try {
			saveHot({ settings: state$2.settings });
		} catch {}
	}
	sel.value = state$2.settings.debugModel;
}
//#endregion
//#region src/ui/compare.ts
var selOld = null;
var selNew = null;
function getDoc$10() {
	return window.parent?.document ?? document;
}
function diffMessages(oldMsgs, newMsgs) {
	const toText = (m) => `${m.role || ""}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`;
	const a = (oldMsgs || []).map(toText).join("\n");
	const b = (newMsgs || []).map(toText).join("\n");
	let i = 0;
	while (i < a.length && i < b.length && a[i] === b[i]) i++;
	if (i === a.length && i === b.length) return "<span style=\"color:var(--ds-text-2);\">两条请求完全一致（缓存命中段完整）</span>";
	const ctx = 80;
	return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div style="background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:10px;font-size:var(--aus-fs-sm);white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">旧：${esc$2(a.slice(Math.max(0, i - ctx), i)) + "<span style=\"background:var(--ds-red-bg);color:var(--ds-red);padding:0 2px;border-radius:3px;\">" + esc$2(a.slice(i, i + 200)) + "</span>" + esc$2(a.slice(i + 200, i + 280))}</div><div style="background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:10px;font-size:var(--aus-fs-sm);white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">新：${esc$2(b.slice(Math.max(0, i - ctx), i)) + "<span style=\"background:var(--ds-green-bg);color:var(--ds-green);padding:0 2px;border-radius:3px;\">" + esc$2(b.slice(i, i + 200)) + "</span>" + esc$2(b.slice(i + 200, i + 280))}</div></div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:8px;">差异起点即缓存发散位置，前 ${i} 字符一致为命中段</div>`;
}
function bindHistoryCompare() {
	const doc = getDoc$10();
	doc.addEventListener("click", (e) => {
		const t = e.target;
		if (!t) return;
		if (t.classList.contains("aus-compare-old") || t.classList.contains("aus-compare-new")) {
			const ts = parseInt(t.getAttribute("data-ts") || "0");
			if (t.classList.contains("aus-compare-old")) selOld = ts;
			else selNew = ts;
			renderDiff();
		}
		if (t.id === "aus-diff-fullscreen") {
			const m = doc.getElementById("aus-diff");
			if (m) m.classList.toggle("aus-diff-full");
		}
	});
}
function renderDiff() {
	const host = getDoc$10().getElementById("aus-diff");
	if (!host) return;
	if (selOld == null || selNew == null) {
		host.innerHTML = "<div style=\"text-align:center;padding:16px;color:var(--ds-text-3);font-size:var(--aus-fs-base);\">已选 " + (selOld != null ? "旧 " : "") + (selNew != null ? "新 " : "") + "，请在历史中各选一条 旧/新 进行对比</div>";
		return;
	}
	const s = getSelectedSave();
	const oldEntry = (s?.history || []).find((h) => h.timestamp === selOld);
	const newEntry = (s?.history || []).find((h) => h.timestamp === selNew);
	if (!oldEntry || !newEntry) {
		host.innerHTML = "<div style=\"color:var(--ds-red);font-size:var(--aus-fs-base);\">未找到对应记录</div>";
		return;
	}
	host.innerHTML = diffMessages(oldEntry.messages || [], newEntry.messages || []);
}
function clamp01$1(value) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(1, value));
}
function average(values) {
	if (!values.length) return 0;
	let sum = 0;
	for (const value of values) sum += value;
	return sum / values.length;
}
function standardDeviation(values) {
	if (values.length <= 1) return 0;
	const mean = average(values);
	let sum = 0;
	for (const value of values) sum += (value - mean) ** 2;
	return Math.sqrt(sum / values.length);
}
function median(values) {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function quantile(values, q) {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	if (sorted.length === 1) return sorted[0];
	const pos = (sorted.length - 1) * q;
	const base = Math.floor(pos);
	const rest = pos - base;
	const next = sorted[Math.min(sorted.length - 1, base + 1)];
	return sorted[base] + rest * (next - sorted[base]);
}
function medianAbsoluteDeviation(values) {
	if (!values.length) return 0;
	const med = median(values);
	return median(values.map((value) => Math.abs(value - med)));
}
/**
* 数据准备：按时间升序、过滤空 prompt、计算命中率与截断标记。
* 无缓存字段时 hit=0、miss=prompt，仅用于堆叠图展示，不伪造命中率。
*/
function prepareEntries(history) {
	const sorted = [...history || []].sort((a, b) => (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0));
	const prepared = [];
	for (const entry of sorted) {
		const rawHit = Math.max(0, Number(entry?.cache_hit_tokens) || 0);
		const rawMiss = Math.max(0, Number(entry?.cache_miss_tokens) || 0);
		const cacheSamples = rawHit + rawMiss;
		const prompt = Math.max(0, Number(entry?.prompt_tokens) || cacheSamples);
		if (prompt <= 0) continue;
		const output = Math.max(0, Number(entry?.completion_tokens) || 0);
		const hitRate = cacheSamples > 0 ? clamp01$1(rawHit / cacheSamples) : null;
		prepared.push({
			index: prepared.length,
			timestamp: Number(entry?.timestamp) || 0,
			model: entry?.model || "unknown",
			prompt,
			hit: cacheSamples > 0 ? rawHit : 0,
			miss: cacheSamples > 0 ? rawMiss : prompt,
			output,
			total: Math.max(0, Number(entry?.total_tokens) || prompt + output),
			cost: Number(entry?.cost) || 0,
			inputCost: Number(entry?.input_cost) || 0,
			outputCost: Number(entry?.output_cost) || 0,
			hitRate,
			cacheSamples,
			truncated: entry?.isTruncated === true || isTruncatedFinish(entry?.finishReason),
			round: prepared.length + 1
		});
	}
	return prepared;
}
/**
* 识别上下文回落点。连续回落只记录第一次，避免一次压缩被拆成多个点。
*/
function detectCompactions(prepared) {
	const points = [];
	let lastRound = 0;
	for (let i = 1; i < prepared.length; i++) {
		if (points.length && points[points.length - 1].index === i - 1) continue;
		const previous = prepared[i - 1];
		const current = prepared[i];
		const drop = previous.prompt - current.prompt;
		if (previous.prompt <= 0) continue;
		if (current.prompt / previous.prompt > .8) continue;
		if (drop < 1500) continue;
		const gapRounds = lastRound ? current.round - lastRound : current.round;
		points.push({
			index: i,
			round: current.round,
			before: previous.prompt,
			after: current.prompt,
			dropPct: drop / previous.prompt,
			gapRounds,
			postHitRate: current.hitRate
		});
		lastRound = current.round;
	}
	return points;
}
function regression(xs, ys) {
	const n = xs.length;
	let sx = 0;
	let sy = 0;
	let sxx = 0;
	let sxy = 0;
	for (let i = 0; i < n; i += 1) {
		sx += xs[i];
		sy += ys[i];
		sxx += xs[i] * xs[i];
		sxy += xs[i] * ys[i];
	}
	const xMean = n ? sx / n : 0;
	const yMean = n ? sy / n : 0;
	const centeredXX = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
	const denominator = centeredXX;
	const slope = denominator > 1e-9 ? xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0) / denominator : 0;
	const intercept = yMean - slope * xMean;
	let rss = 0;
	let tss = 0;
	for (let i = 0; i < n; i += 1) {
		const predicted = intercept + slope * xs[i];
		rss += (ys[i] - predicted) ** 2;
		tss += (ys[i] - yMean) ** 2;
	}
	const variance = n > 2 ? rss / (n - 2) : 0;
	const sigma = Math.sqrt(Math.max(0, variance));
	return {
		slope,
		intercept,
		r2: tss > 1e-9 ? 1 - rss / tss : 1,
		sigma,
		xMean,
		sxx: centeredXX
	};
}
function averageIntervalMs$1(prepared) {
	if (prepared.length < 2) return 0;
	const recent = prepared.slice(-21);
	const diffs = [];
	for (let i = 1; i < recent.length; i += 1) {
		const diff = recent[i].timestamp - recent[i - 1].timestamp;
		if (diff > 0) diffs.push(diff);
	}
	return diffs.length ? average(diffs) : 0;
}
/**
* 对最后一个压缩点之后的当前段做增长拟合。
* 样本 >= 12 时先用中位绝对偏差剔除离群点，再回归。
*/
function computeGrowthFit(prepared, compactions) {
	const segStart = compactions.length ? compactions[compactions.length - 1].index : 0;
	const segment = prepared.slice(segStart);
	const n = segment.length;
	const interval = averageIntervalMs$1(prepared);
	if (!n) return {
		model: "recent-mean",
		c0: 0,
		delta: 0,
		sigma: 0,
		r2: 0,
		n: 0,
		segStart,
		lastPrompt: 0,
		avgIntervalMs: interval,
		xMean: 0,
		sxx: 0
	};
	const y = segment.map((entry) => entry.prompt);
	const lastPrompt = y[n - 1];
	if (n === 1) return {
		model: "recent-mean",
		c0: lastPrompt,
		delta: 0,
		sigma: Math.max(1, lastPrompt * .01),
		r2: 0,
		n,
		segStart,
		lastPrompt,
		avgIntervalMs: interval,
		xMean: 0,
		sxx: 0
	};
	if (n === 2) {
		const delta = Math.max(0, y[1] - y[0]);
		return {
			model: "linear",
			c0: y[0],
			delta,
			sigma: Math.max(1, standardDeviation(y), lastPrompt * .01),
			r2: 0,
			n,
			segStart,
			lastPrompt,
			avgIntervalMs: interval,
			xMean: .5,
			sxx: .5
		};
	}
	let xs = y.map((_, index) => index);
	let ys = y.slice();
	if (n >= 12) {
		const med = median(y);
		const mad = medianAbsoluteDeviation(y) * 1.4826;
		if (mad > 0) {
			const filtered = y.map((value, index) => ({
				value,
				index
			})).filter((point) => Math.abs(point.value - med) <= 3 * mad);
			if (filtered.length >= 6) {
				xs = filtered.map((point) => point.index);
				ys = filtered.map((point) => point.value);
			}
		}
	}
	const fit = regression(xs, ys);
	const sigmaFloor = Math.max(1, lastPrompt * .01);
	const sigma = Math.max(fit.sigma, sigmaFloor);
	if (fit.r2 < .35 && n >= 6) {
		const recent = y.slice(-Math.min(5, n));
		return {
			model: "recent-mean",
			c0: median(recent),
			delta: 0,
			sigma: Math.max(standardDeviation(recent), sigmaFloor),
			r2: fit.r2,
			n,
			segStart,
			lastPrompt,
			avgIntervalMs: interval,
			xMean: 0,
			sxx: 0
		};
	}
	return {
		model: "linear",
		c0: Math.max(0, fit.intercept),
		delta: Math.max(0, fit.slope),
		sigma,
		r2: fit.r2,
		n,
		segStart,
		lastPrompt,
		avgIntervalMs: interval,
		xMean: fit.xMean,
		sxx: fit.sxx
	};
}
/** 当前段内第 offset 轮的拟合 prompt（offset 从当前段起点算） */
function promptAt(fit, offset) {
	if (fit.model === "recent-mean") return Math.max(0, fit.c0);
	return Math.max(0, fit.c0 + fit.delta * offset);
}
/** 95% 预测区间半宽 */
function predictionBand(fit, offset) {
	if (fit.n <= 0) return 0;
	const base = fit.sigma * Math.sqrt(1 + 1 / fit.n);
	if (fit.model === "recent-mean" || fit.sxx <= 1e-9) return 1.96 * base;
	const distance = offset - fit.xMean;
	const factor = Math.sqrt(1 + 1 / fit.n + distance * distance / fit.sxx);
	return 1.96 * fit.sigma * factor;
}
/** 全量历史的有效缓存命中率（hit / (hit + miss)） */
function computeGlobalHitRate$1(history) {
	let hit = 0;
	let samples = 0;
	for (const entry of history || []) {
		const h = Math.max(0, Number(entry?.cache_hit_tokens) || 0);
		const m = Math.max(0, Number(entry?.cache_miss_tokens) || 0);
		if (h + m <= 0) continue;
		hit += h;
		samples += h + m;
	}
	return samples > 0 ? clamp01$1(hit / samples) : null;
}
/** 指定模型的有效缓存命中率 */
function computeModelHitRate$1(history, model) {
	let hit = 0;
	let samples = 0;
	for (const entry of history || []) {
		if ((entry?.model || "") !== model) continue;
		const h = Math.max(0, Number(entry?.cache_hit_tokens) || 0);
		const m = Math.max(0, Number(entry?.cache_miss_tokens) || 0);
		if (h + m <= 0) continue;
		hit += h;
		samples += h + m;
	}
	return samples > 0 ? clamp01$1(hit / samples) : null;
}
function pickWeightedHitRate(entries) {
	const recent = entries.slice(-10);
	let hit = 0;
	let samples = 0;
	for (const entry of recent) {
		if (entry.hitRate == null || entry.cacheSamples <= 0) continue;
		hit += entry.hit;
		samples += entry.cacheSamples;
	}
	return samples > 0 ? {
		rate: clamp01$1(hit / samples),
		samples
	} : null;
}
/**
* 命中率测算：
* 1. 当前段有有效样本 → token 加权（最近 10 个有效样本）；
* 2. 当前段无、但对话更早有样本 → 用对话最近的有效样本；
* 3. 完全没有样本 → 按选项回退（全站/同模型/手动），都没有则为 0。
*/
function computeHitEstimate(prepared, compactions, fallback) {
	const segStart = compactions.length ? compactions[compactions.length - 1].index : 0;
	const segmentData = prepared.slice(segStart).filter((entry) => entry.hitRate != null && entry.cacheSamples > 0);
	const allData = prepared.filter((entry) => entry.hitRate != null && entry.cacheSamples > 0);
	const segmentPick = pickWeightedHitRate(segmentData);
	if (segmentPick) return {
		rate: segmentPick.rate,
		source: "data",
		samples: segmentPick.samples,
		segmentSamples: segmentData.length,
		hasData: true
	};
	const allPick = pickWeightedHitRate(allData);
	if (allPick) return {
		rate: allPick.rate,
		source: "data",
		samples: allPick.samples,
		segmentSamples: 0,
		hasData: true
	};
	if (fallback.mode === "manual" && fallback.manualRate != null) return {
		rate: clamp01$1(fallback.manualRate),
		source: "manual",
		samples: 0,
		segmentSamples: 0,
		hasData: false
	};
	if (fallback.mode === "model" && fallback.modelRate != null) return {
		rate: clamp01$1(fallback.modelRate),
		source: "model",
		samples: 0,
		segmentSamples: 0,
		hasData: false
	};
	if (fallback.globalRate != null) return {
		rate: clamp01$1(fallback.globalRate),
		source: "global",
		samples: 0,
		segmentSamples: 0,
		hasData: false
	};
	return {
		rate: 0,
		source: "none",
		samples: 0,
		segmentSamples: 0,
		hasData: false
	};
}
/** 输出 token 估计：当前段非截断样本的中位数，MAD 作为波动半宽 */
function computeOutputEstimate(prepared, compactions) {
	const segStart = compactions.length ? compactions[compactions.length - 1].index : 0;
	const segment = prepared.slice(segStart);
	const excluded = prepared.filter((entry) => entry.truncated).length;
	const segmentCandidates = segment.filter((entry) => !entry.truncated && entry.output > 0);
	const allCandidates = prepared.filter((entry) => !entry.truncated && entry.output > 0);
	const list = (segmentCandidates.length ? segmentCandidates : allCandidates).slice(-10);
	if (!list.length) return {
		value: 0,
		low: 0,
		high: 0,
		samples: 0,
		excluded
	};
	const values = list.map((entry) => entry.output);
	const med = median(values);
	const mad = medianAbsoluteDeviation(values) * 1.4826;
	const spread = mad > 0 ? mad : Math.max(0, quantile(values, .75) - quantile(values, .25)) / 2;
	return {
		value: med,
		low: Math.max(0, med - spread),
		high: med + spread,
		samples: values.length,
		excluded
	};
}
/**
* 压缩预测：用最近一次压缩的“压缩前段长度”作为周期。
* 即使只有一次压缩，也能给出下次压缩的估计。
*/
function computeCompactionForecast(prepared, compactions) {
	if (!compactions.length) return {
		detected: false,
		count: 0,
		lastRound: null,
		period: null,
		retention: null,
		postHitRate: null,
		segmentAge: prepared.length,
		roundsUntilNext: null,
		nextRound: null,
		medianGap: null
	};
	const last = compactions[compactions.length - 1];
	const currentRound = prepared.length;
	const period = last.gapRounds > 0 ? last.gapRounds : null;
	const segmentAge = Math.max(0, currentRound - last.round);
	const roundsUntilNext = period != null ? Math.max(1, period - segmentAge) : null;
	const retention = last.before > 0 ? Math.max(.05, Math.min(.95, last.after / last.before)) : null;
	const medianGap = compactions.length >= 2 ? median(compactions.map((point) => point.gapRounds)) : null;
	return {
		detected: true,
		count: compactions.length,
		lastRound: last.round,
		period,
		retention,
		postHitRate: last.postHitRate,
		segmentAge,
		roundsUntilNext,
		nextRound: roundsUntilNext != null ? currentRound + roundsUntilNext : null,
		medianGap
	};
}
function buildHistoryPoints(prepared, compactions) {
	const compactionRounds = new Set(compactions.map((point) => point.round));
	let cumulative = 0;
	return prepared.map((entry) => {
		cumulative += entry.cost;
		return {
			round: entry.round,
			input: entry.prompt,
			hit: entry.hit,
			miss: entry.miss,
			output: entry.output,
			cost: entry.cost,
			cumulativeCost: cumulative,
			hitRate: entry.hitRate,
			compaction: compactionRounds.has(entry.round)
		};
	});
}
function projectRounds(prepared, fit, hit, output, pricing, ctxLimit, compactionForecast, compactionEnabled, maxRounds) {
	const out = [];
	const currentRound = prepared.length;
	let cumulative = prepared.reduce((sum, entry) => sum + entry.cost, 0);
	let factor = 1;
	let currentHit = hit.rate;
	const retention = compactionForecast.retention ?? .5;
	let nextCompactionRound = compactionEnabled && compactionForecast.detected ? compactionForecast.nextRound : null;
	for (let k = 0; k < maxRounds; k += 1) {
		const round = currentRound + k + 1;
		const offset = fit.n + k;
		const base = promptAt(fit, offset);
		const baseBand = predictionBand(fit, offset);
		let input = base * factor;
		let overLimit = ctxLimit != null && input > ctxLimit;
		let isCompaction = false;
		if (compactionEnabled && nextCompactionRound != null && round >= nextCompactionRound) {
			isCompaction = true;
			factor *= retention;
			input = base * factor;
			currentHit = compactionForecast.postHitRate ?? hit.rate;
			nextCompactionRound = compactionForecast.period != null ? round + compactionForecast.period : null;
		} else if (compactionEnabled && compactionForecast.postHitRate != null && currentHit < hit.rate) currentHit = Math.min(hit.rate, currentHit + (hit.rate - currentHit) * .35);
		const hitRate = clamp01$1(currentHit);
		const hitTokens = input * hitRate;
		const missTokens = input * (1 - hitRate);
		let cost = null;
		let costLow = null;
		let costHigh = null;
		if (pricing) {
			const costAt = (rate) => (input * rate * pricing.hit + input * (1 - rate) * pricing.miss + output.value * pricing.output) / 1e6;
			cost = costAt(hitRate);
			const low = costAt(clamp01$1(hitRate + .1));
			const high = costAt(clamp01$1(hitRate - .1));
			costLow = Math.min(low, high);
			costHigh = Math.max(low, high);
			cumulative += cost;
		}
		const band = baseBand * factor;
		out.push({
			round,
			input,
			inputLow: Math.max(0, input - band),
			inputHigh: input + band,
			hit: hitTokens,
			miss: missTokens,
			output: output.value,
			hitRate,
			cost,
			costLow,
			costHigh,
			cumulativeCost: pricing ? cumulative : null,
			compaction: isCompaction,
			overLimit
		});
		if (overLimit) break;
	}
	return out;
}
/**
* 构建完整预测序列。历史点完整保留，未来点按 horizon 生成。
* 无任何有效历史时返回 null。
*/
function buildForecastSeries(history, options) {
	const prepared = prepareEntries(history);
	if (!prepared.length) return null;
	const compactions = detectCompactions(prepared);
	const fit = computeGrowthFit(prepared, compactions);
	const hit = computeHitEstimate(prepared, compactions, options.hitFallback);
	const output = computeOutputEstimate(prepared, compactions);
	const compactionForecast = computeCompactionForecast(prepared, compactions);
	const historyPoints = buildHistoryPoints(prepared, compactions);
	const horizon = Math.max(1, Math.floor(options.horizon) || 10);
	const future = projectRounds(prepared, fit, hit, output, options.pricing, options.ctxLimit, compactionForecast, options.compaction, horizon);
	const first = future[0];
	const last = prepared[prepared.length - 1];
	const totalCost = prepared.reduce((sum, entry) => sum + entry.cost, 0);
	const next = first ? {
		input: first.input,
		inputLow: first.inputLow,
		inputHigh: first.inputHigh,
		output: first.output,
		hitRate: first.hitRate,
		cost: first.cost,
		costLow: first.costLow,
		costHigh: first.costHigh
	} : {
		input: promptAt(fit, fit.n),
		inputLow: promptAt(fit, fit.n),
		inputHigh: promptAt(fit, fit.n),
		output: output.value,
		hitRate: hit.rate,
		cost: null,
		costLow: null,
		costHigh: null
	};
	return {
		prepared,
		history: historyPoints,
		future,
		compactions,
		fit,
		hit,
		output,
		compactionForecast,
		currentRound: prepared.length,
		currentPrompt: last?.prompt || 0,
		totalCost,
		averageCost: prepared.length ? totalCost / prepared.length : 0,
		next
	};
}
/**
* 逐轮模拟余额可支撑轮数。与图表共用 projectRounds，保证口径一致。
* 返回 null 表示无法估算（价格未知）。
*/
function simulateRemainingRounds(budget, series, options, maxRounds = 1e4) {
	if (!options.pricing) return null;
	if (!Number.isFinite(budget) || budget <= 0) return {
		R: 0,
		low: 0,
		high: 0,
		ctxLimited: false
	};
	const run = (deltaScale, hitDelta) => {
		const fit = {
			...series.fit,
			delta: series.fit.delta * deltaScale
		};
		const hit = {
			...series.hit,
			rate: clamp01$1(series.hit.rate + hitDelta)
		};
		const points = projectRounds(series.prepared, fit, hit, series.output, options.pricing, options.ctxLimit, series.compactionForecast, options.compaction, maxRounds);
		let spent = 0;
		let rounds = 0;
		let ctxLimited = false;
		for (const point of points) {
			if (point.overLimit) {
				ctxLimited = true;
				break;
			}
			if (point.cost == null) break;
			if (spent + point.cost > budget) break;
			spent += point.cost;
			rounds += 1;
		}
		return {
			R: rounds,
			ctxLimited
		};
	};
	const base = run(1, 0);
	const optimistic = run(.5, .05);
	const pessimistic = run(1.5, -.05);
	return {
		R: base.R,
		low: Math.min(base.R, pessimistic.R),
		high: Math.max(base.R, optimistic.R),
		ctxLimited: base.ctxLimited
	};
}
/**
* 上下文可支撑轮数。
* - 未启用压缩预测：按当前段 Δ 线性外推；
* - 启用且检测到压缩：返回 null，由“距下次压缩”表达（压缩会主动回落）。
*/
function contextRoundsFor(series, ctxLimit, compactionEnabled) {
	if (!ctxLimit) return null;
	if (compactionEnabled && series.compactionForecast.detected) return null;
	if (series.fit.delta <= 0) return null;
	const remain = ctxLimit - series.currentPrompt;
	return remain <= 0 ? 0 : Math.max(0, Math.floor(remain / series.fit.delta));
}
//#endregion
//#region src/stats/model-efficiency.ts
/**
* 模型效率/性价比聚合 — 纯函数。
*
* 输入输出比只说明“单位产出的上下文开销”，不能单独代表便宜；
* 每 1k 输出 token 成本才是产出成本的直接度量。两者并列展示。
*/
function clamp01(value) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(1, value));
}
function compareNullableAsc(a, b) {
	if (a == null && b == null) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	return a - b;
}
/**
* 按模型聚合效率指标，默认按每 1k 输出成本升序（无价排最后）。
*/
function aggregateModelEfficiency(history, options = {}) {
	const prepared = prepareEntries(history);
	const map = /* @__PURE__ */ new Map();
	for (const entry of prepared) {
		const model = entry.model || "unknown";
		let acc = map.get(model);
		if (!acc) {
			acc = {
				model,
				rounds: 0,
				inputTokens: 0,
				outputTokens: 0,
				totalTokens: 0,
				cost: 0,
				inputCost: 0,
				outputCost: 0,
				hit: 0,
				hitSamples: 0
			};
			map.set(model, acc);
		}
		acc.rounds += 1;
		acc.inputTokens += entry.prompt;
		acc.outputTokens += entry.output;
		acc.totalTokens += entry.total;
		acc.cost += entry.cost;
		acc.inputCost += entry.inputCost;
		acc.outputCost += entry.outputCost;
		if (entry.cacheSamples > 0) {
			acc.hit += entry.hit;
			acc.hitSamples += entry.cacheSamples;
		}
	}
	const rows = [];
	for (const acc of map.values()) {
		const price = options.priceForModel ? options.priceForModel(acc.model) : null;
		const priced = acc.cost > 0 || acc.inputCost > 0 || acc.outputCost > 0;
		const ioRatio = acc.outputTokens > 0 ? acc.inputTokens / acc.outputTokens : null;
		const outputShare = acc.totalTokens > 0 ? acc.outputTokens / acc.totalTokens : 0;
		const costPer1kOutput = priced && acc.outputTokens > 0 ? acc.cost / acc.outputTokens * 1e3 : null;
		const avgCost = priced && acc.rounds > 0 ? acc.cost / acc.rounds : null;
		const hitRate = acc.hitSamples > 0 ? clamp01(acc.hit / acc.hitSamples) : null;
		let cacheSaving = null;
		if (price && price.miss > 0 && acc.inputTokens > 0 && (acc.cost > 0 || acc.inputCost > 0)) {
			const expected = acc.inputTokens * price.miss / 1e6;
			if (expected > 0) cacheSaving = clamp01(1 - acc.inputCost / expected);
		}
		rows.push({
			model: acc.model,
			rounds: acc.rounds,
			inputTokens: acc.inputTokens,
			outputTokens: acc.outputTokens,
			totalTokens: acc.totalTokens,
			cost: acc.cost,
			inputCost: acc.inputCost,
			outputCost: acc.outputCost,
			ioRatio,
			outputShare,
			costPer1kOutput,
			avgCost,
			hitRate,
			cacheSaving,
			priced
		});
	}
	rows.sort((a, b) => {
		const byCost = compareNullableAsc(a.costPer1kOutput, b.costPer1kOutput);
		if (byCost !== 0) return byCost;
		const byRatio = compareNullableAsc(a.ioRatio, b.ioRatio);
		if (byRatio !== 0) return byRatio;
		return a.model.localeCompare(b.model);
	});
	return rows;
}
//#endregion
//#region src/data/computed.ts
/**
* 统一计算层 — 所有展示/统计的唯一来源
* 禁止在 UI 中直接对 history 做过滤/求和，所有派生在此定义
*/
var STATS_FILTER_ALL = "__all__";
var STATS_FILTER_UNKNOWN = "__unknown__";
function numberValue(value) {
	const n = typeof value === "number" ? value : parseFloat(String(value));
	return Number.isFinite(n) ? n : 0;
}
function averagePositive(values) {
	const valid = values.filter((value) => Number.isFinite(value) && value > 0);
	if (!valid.length) return 0;
	return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}
function filterStatsHistory(entries, filter = {}) {
	return (entries || []).filter((entry) => {
		if (!entry) return false;
		if (filter.start || filter.end) {
			const day = localDay$1(entry.timestamp);
			if (filter.start && day < filter.start) return false;
			if (filter.end && day > filter.end) return false;
		}
		if (filter.model && filter.model !== "__all__") {
			const models = Array.isArray(filter.model) ? filter.model : [filter.model];
			if (!models.length || !models.includes(entry.model)) return false;
		}
		if (filter.chat && filter.chat !== "__all__") {
			if (filter.chat === "__null__") {
				if (entry.chatId) return false;
			} else if ((entry.chatId ?? null) !== filter.chat) return false;
		}
		if (filter.endpoint && filter.endpoint !== "__all__") {
			if (filter.endpoint === "__unknown__") {
				if (entry.endpointId) return false;
			} else if (entry.endpointId !== filter.endpoint) return false;
		}
		if (filter.credential && filter.credential !== "__all__") {
			if (filter.credential === "__unknown__") {
				if (entry.credentialId) return false;
			} else if (entry.credentialId !== filter.credential) return false;
		}
		return true;
	});
}
function addLabelCollisionSuffix(options) {
	const counts = /* @__PURE__ */ new Map();
	for (const option of options) counts.set(option.label, (counts.get(option.label) || 0) + 1);
	return options.map((option) => {
		if (option.unknown || (counts.get(option.label) || 0) < 2) return option;
		return {
			...option,
			label: `${option.label} · ${option.id.slice(0, 4)}`
		};
	});
}
function getEndpointFilterOptions(history) {
	const map = /* @__PURE__ */ new Map();
	for (const entry of history || []) {
		const unknown = !entry?.endpointId;
		const id = unknown ? STATS_FILTER_UNKNOWN : entry.endpointId;
		const timestamp = Number(entry?.timestamp) || 0;
		const label = unknown ? "未记录接入" : entry.endpointLabel || `接入 ${String(id).slice(0, 6)}`;
		const current = map.get(id);
		if (!current) map.set(id, {
			id,
			label,
			count: 1,
			unknown,
			lastSeen: timestamp
		});
		else {
			current.count++;
			if (timestamp >= current.lastSeen && label) {
				current.label = label;
				current.lastSeen = timestamp;
			}
		}
	}
	const options = Array.from(map.values()).map(({ id, label, count, unknown }) => ({
		id,
		label,
		count,
		unknown
	}));
	options.sort((a, b) => Number(!!a.unknown) - Number(!!b.unknown) || a.label.localeCompare(b.label, "zh-CN"));
	return addLabelCollisionSuffix(options);
}
function getCredentialFilterOptions(history, endpoint = STATS_FILTER_ALL) {
	const map = /* @__PURE__ */ new Map();
	for (const entry of history || []) {
		if (endpoint === "__unknown__") {
			if (entry?.endpointId) continue;
		} else if (endpoint !== "__all__" && entry?.endpointId !== endpoint) continue;
		const unknown = !entry?.credentialId;
		const id = unknown ? STATS_FILTER_UNKNOWN : entry.credentialId;
		const timestamp = Number(entry?.timestamp) || 0;
		const label = unknown ? "未识别密钥" : entry.credentialLabel || `密钥 ${String(id).slice(0, 6)}`;
		const current = map.get(id);
		if (!current) map.set(id, {
			id,
			label,
			count: 1,
			unknown,
			lastSeen: timestamp
		});
		else {
			current.count++;
			if (timestamp >= current.lastSeen && label) {
				current.label = label;
				current.lastSeen = timestamp;
			}
		}
	}
	return addLabelCollisionSuffix(Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen || a.label.localeCompare(b.label, "zh-CN")).map(({ id, label, count, unknown }) => ({
		id,
		label,
		count,
		unknown
	})));
}
function computeOverview(balanceWalletId = "all", historyOverride) {
	const s = getSelectedSave();
	if (!s) return {
		balanceText: "¥0.00 CNY",
		hasBalance: false,
		walletBalanceCount: 0,
		totalCost: 0,
		totalTokens: 0,
		hit: 0,
		miss: 0,
		output: 0,
		hitRate: 0,
		savings: 0,
		inputCost: 0,
		outputCost: 0,
		avgCost: 0,
		avgTokens: 0,
		avgDuration: 0,
		avgRate: 0,
		avgTtft: 0,
		rounds: 0,
		remainingRounds: null,
		avgInputCost: 0,
		avgInputTokens: 0,
		avgOutputCost: 0,
		avgOutputTokens: 0,
		avgThinkTime: 0,
		avgThinkTokens: 0,
		avgHitRate: 0,
		latestHitRate: null,
		maxOutput: 0,
		maxInput: 0,
		maxTotal: 0,
		avgThinkRatio: 0,
		truncationRate: 0
	};
	const totalCost = s.total_cost || 0;
	const totalTokens = s.total_tokens || 0;
	const hist = historyOverride || s.history || [];
	let viewTotalCost = totalCost;
	let viewTotalTokens = totalTokens;
	let viewInputCost = s.input_cost || 0;
	let viewOutputCost = s.output_cost || 0;
	let viewHit = s.cache_hit_tokens || 0;
	let viewMiss = s.cache_miss_tokens || 0;
	let viewOutput = s.output_tokens || 0;
	let viewRounds = s.rounds || 0;
	if (historyOverride) {
		viewTotalCost = 0;
		viewTotalTokens = 0;
		viewInputCost = 0;
		viewOutputCost = 0;
		viewHit = 0;
		viewMiss = 0;
		viewOutput = 0;
		viewRounds = hist.length;
		for (const h of hist) {
			viewTotalCost += Number(h.cost) || 0;
			viewTotalTokens += Number(h.total_tokens) || 0;
			viewInputCost += Number(h.input_cost) || 0;
			viewOutputCost += Number(h.output_cost) || 0;
			viewHit += Number(h.cache_hit_tokens) || 0;
			viewMiss += Number(h.cache_miss_tokens) || 0;
			viewOutput += Number(h.completion_tokens) || 0;
		}
	}
	const hitRate = viewHit + viewMiss > 0 ? viewHit / (viewHit + viewMiss) * 100 : 0;
	let savings = 0;
	try {
		for (const h of hist) savings += calcSavings({
			timestamp: h.timestamp,
			model: h.model,
			prompt_cache_hit_tokens: h.cache_hit_tokens || 0,
			prompt_cache_miss_tokens: h.cache_miss_tokens || 0,
			completion_tokens: h.completion_tokens || 0
		}, state$2.settings, findWalletForHistory(state$2.wallets, h));
	} catch {}
	const rounds = viewRounds;
	const avgCost = averagePositive(hist.map((h) => numberValue(h.cost)));
	const avgTokens = averagePositive(hist.map((h) => numberValue(h.total_tokens)));
	const avgDuration = averagePositive(hist.map((h) => numberValue(h.duration))) / 1e3;
	const avgRate = averagePositive(hist.map((h) => numberValue(h.tokenRate)));
	const avgTtft = averagePositive(hist.map((h) => numberValue(h.ttft))) / 1e3;
	const avgInputCost = averagePositive(hist.map((h) => numberValue(h.input_cost)));
	const avgInputTokens = averagePositive(hist.map((h) => numberValue(h.cache_hit_tokens) + numberValue(h.cache_miss_tokens)));
	const avgOutputCost = averagePositive(hist.map((h) => numberValue(h.output_cost)));
	const avgOutputTokens = averagePositive(hist.map((h) => numberValue(h.completion_tokens)));
	const thinkTimes = hist.map((h) => h.thinkTime || 0).filter((v) => v > 0);
	const thinkTokensArr = hist.map((h) => h.thinkTokens || 0).filter((v) => v > 0);
	const avgThinkTime = thinkTimes.length ? thinkTimes.reduce((a, b) => a + b, 0) / thinkTimes.length / 1e3 : 0;
	const avgThinkTokens = thinkTokensArr.length ? thinkTokensArr.reduce((a, b) => a + b, 0) / thinkTokensArr.length : 0;
	const hitRates = hist.map((h) => {
		const ch = h.cache_hit_tokens || 0, tot = ch + (h.cache_miss_tokens || 0);
		return tot > 0 ? ch / tot * 100 : 0;
	}).filter((v) => v > 0);
	const avgHitRate = hitRates.length ? hitRates.reduce((a, b) => a + b, 0) / hitRates.length : 0;
	let latestHitRate = null;
	if (hist.length) {
		const latest = [...hist].sort((a, b) => b.timestamp - a.timestamp)[0];
		const ch = latest.cache_hit_tokens || 0, tot = ch + (latest.cache_miss_tokens || 0);
		latestHitRate = tot > 0 ? ch / tot * 100 : 0;
	}
	let maxOutput = 0, maxInput = 0, maxTotal = 0;
	for (const h of hist) {
		const out = h.completion_tokens || 0;
		const inp = (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0) || h.prompt_tokens || 0;
		const tot = h.total_tokens || 0;
		if (out > maxOutput) maxOutput = out;
		if (inp > maxInput) maxInput = inp;
		if (tot > maxTotal) maxTotal = tot;
	}
	let sumThink = 0, sumOut = 0;
	for (const h of hist) {
		sumThink += h.thinkTokens || 0;
		sumOut += h.completion_tokens || 0;
	}
	const avgThinkRatio = sumOut > 0 ? sumThink / sumOut * 100 : 0;
	const truncCnt = hist.filter((h) => isTruncatedFinish(h.finishReason) || h.isTruncated).length;
	const truncationRate = hist.length ? truncCnt / hist.length * 100 : 0;
	const ignored = new Set(state$2.walletIgnored || []);
	const activeWallets = (state$2.wallets || []).filter((wallet) => !ignored.has(wallet.id));
	const selectedWallet = balanceWalletId !== "all" ? activeWallets.find((wallet) => wallet.id === balanceWalletId) || null : null;
	const balanceWallets = selectedWallet ? [selectedWallet] : activeWallets;
	let balanceCny = null;
	let walletBalanceCount = 0;
	for (const wallet of balanceWallets) {
		const value = walletBalanceToCny(wallet, getWalletExchangeRate());
		if (value == null) continue;
		walletBalanceCount++;
		balanceCny = (balanceCny ?? 0) + value;
	}
	if (balanceCny == null && !selectedWallet) {
		const legacy = state$2.customBalance || state$2.balance?.balance;
		const value = legacy != null && legacy !== "" ? parseFloat(String(legacy)) : NaN;
		if (Number.isFinite(value)) {
			balanceCny = value;
			walletBalanceCount = 1;
		}
	}
	let remainingRounds = null;
	try {
		const balNum = balanceCny == null ? NaN : balanceCny;
		if (!isNaN(balNum) && hist.length) {
			const scopedHist = hist.filter((h) => !selectedWallet || h.walletId === selectedWallet.id);
			if (scopedHist.length) {
				const alpha = .3;
				let ewma = scopedHist[scopedHist.length - 1].cost || 0;
				for (let i = scopedHist.length - 2; i >= 0; i--) ewma = alpha * (scopedHist[i].cost || 0) + .7 * ewma;
				if (ewma > 0) remainingRounds = Math.floor(balNum / ewma);
			}
		}
	} catch {}
	return {
		balanceText: (() => {
			try {
				return formatMoney(balanceCny == null ? 0 : balanceCny, 2);
			} catch {
				return "¥" + (balanceCny || 0).toFixed(2) + " CNY";
			}
		})(),
		hasBalance: balanceCny != null,
		walletBalanceCount,
		totalCost: viewTotalCost,
		totalTokens: viewTotalTokens,
		hit: viewHit,
		miss: viewMiss,
		output: viewOutput,
		hitRate,
		savings,
		inputCost: viewInputCost,
		outputCost: viewOutputCost,
		avgCost,
		avgTokens,
		avgDuration,
		avgRate,
		avgTtft,
		rounds,
		remainingRounds,
		avgInputCost,
		avgInputTokens,
		avgOutputCost,
		avgOutputTokens,
		avgThinkTime,
		avgThinkTokens,
		avgHitRate,
		latestHitRate,
		maxOutput,
		maxInput,
		maxTotal,
		avgThinkRatio,
		truncationRate
	};
}
function computeChatStats(hist) {
	const s = getSelectedSave();
	const history = hist ?? (s?.history || []);
	if (!history.length) return [];
	const map = /* @__PURE__ */ new Map();
	for (const h of history) {
		const cid = h.chatId ?? null;
		const cname = h.chatName ?? null;
		const key = cid ?? "__null__";
		if (!map.has(key)) map.set(key, {
			chatId: cid,
			chatName: cname,
			count: 0,
			hit: 0,
			miss: 0,
			out: 0,
			total: 0,
			cost: 0
		});
		const e = map.get(key);
		if (cname && !e.chatName) e.chatName = cname;
		e.count++;
		e.hit += h.cache_hit_tokens || 0;
		e.miss += h.cache_miss_tokens || 0;
		e.out += h.completion_tokens || 0;
		e.total += h.total_tokens || 0;
		e.cost += h.cost || 0;
	}
	const rows = Array.from(map.values()).map((e) => {
		let display = e.chatName || "";
		if (!display) {
			if (e.chatId) display = e.chatId.length > 18 ? e.chatId.slice(0, 8) + "…" + e.chatId.slice(-4) : e.chatId;
			else display = "未分组/旧数据";
		}
		const totIn = e.hit + e.miss;
		const avgHitRate = totIn > 0 ? e.hit / totIn * 100 : 0;
		return {
			chatId: e.chatId,
			chatName: e.chatName,
			displayName: display,
			count: e.count,
			hit: e.hit,
			miss: e.miss,
			out: e.out,
			total: e.total,
			cost: e.cost,
			avgTokens: e.count ? e.total / e.count : 0,
			avgHitRate
		};
	});
	rows.sort((a, b) => b.total - a.total);
	return rows;
}
function computeStatsFour(filtered) {
	if (!filtered || !filtered.length) return {
		avgCost: 0,
		avgTokens: 0,
		avgDuration: 0,
		avgRate: 0,
		avgTtft: 0,
		avgInputCost: 0,
		avgInputTokens: 0,
		avgOutputCost: 0,
		avgOutputTokens: 0,
		avgThinkTime: 0,
		avgThinkTokens: 0,
		avgHitRate: 0,
		latestHitRate: null,
		maxOutput: 0,
		maxInput: 0,
		maxTotal: 0,
		avgThinkRatio: 0,
		truncationRate: 0,
		rounds: 0
	};
	const rounds = filtered.length;
	let costSum = 0, costCnt = 0, tokensSum = 0, tokensCnt = 0, durSum = 0, durCnt = 0, rateSum = 0, rateCnt = 0;
	let inputCostSum = 0, inputCostCnt = 0, inputTokensSum = 0, inputTokensCnt = 0, outputCostSum = 0, outputCostCnt = 0, outputTokensSum = 0, outputTokensCnt = 0;
	let ttftSum = 0, ttftCnt = 0;
	let thinkTimeSum = 0, thinkTokensSum = 0, thinkTimeCnt = 0, thinkTokensCnt = 0;
	let hitRateSum = 0, hitRateCnt = 0;
	let maxOutput = 0, maxInput = 0, maxTotal = 0;
	let sumThink = 0, sumOut = 0, truncCnt = 0;
	for (const h of filtered) {
		const cost = numberValue(h.cost);
		if (cost > 0) {
			costSum += cost;
			costCnt++;
		}
		const tokens = numberValue(h.total_tokens);
		if (tokens > 0) {
			tokensSum += tokens;
			tokensCnt++;
		}
		const duration = numberValue(h.duration);
		if (duration > 0) {
			durSum += duration;
			durCnt++;
		}
		const rate = numberValue(h.tokenRate);
		if (rate > 0) {
			rateSum += rate;
			rateCnt++;
		}
		const inputCost = numberValue(h.input_cost);
		if (inputCost > 0) {
			inputCostSum += inputCost;
			inputCostCnt++;
		}
		const inputTokens = numberValue(h.cache_hit_tokens) + numberValue(h.cache_miss_tokens);
		if (inputTokens > 0) {
			inputTokensSum += inputTokens;
			inputTokensCnt++;
		}
		const outputCost = numberValue(h.output_cost);
		if (outputCost > 0) {
			outputCostSum += outputCost;
			outputCostCnt++;
		}
		const outputTokens = numberValue(h.completion_tokens);
		if (outputTokens > 0) {
			outputTokensSum += outputTokens;
			outputTokensCnt++;
		}
		if ((h.ttft || 0) > 0) {
			ttftSum += h.ttft;
			ttftCnt++;
		}
		if ((h.thinkTime || 0) > 0) {
			thinkTimeSum += h.thinkTime;
			thinkTimeCnt++;
		}
		if ((h.thinkTokens || 0) > 0) {
			thinkTokensSum += h.thinkTokens;
			thinkTokensCnt++;
		}
		const ch = h.cache_hit_tokens || 0, tot = ch + (h.cache_miss_tokens || 0);
		if (tot > 0) {
			hitRateSum += ch / tot * 100;
			hitRateCnt++;
		}
		const out = h.completion_tokens || 0, inp = (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0), totTok = h.total_tokens || 0;
		if (out > maxOutput) maxOutput = out;
		if (inp > maxInput) maxInput = inp;
		if (totTok > maxTotal) maxTotal = totTok;
		sumThink += h.thinkTokens || 0;
		sumOut += h.completion_tokens || 0;
		if (isTruncatedFinish(h.finishReason) || h.isTruncated) truncCnt++;
	}
	return {
		avgCost: costCnt ? costSum / costCnt : 0,
		avgTokens: tokensCnt ? tokensSum / tokensCnt : 0,
		avgDuration: durCnt ? durSum / durCnt / 1e3 : 0,
		avgRate: rateCnt ? rateSum / rateCnt : 0,
		avgTtft: ttftCnt ? ttftSum / ttftCnt / 1e3 : 0,
		avgInputCost: inputCostCnt ? inputCostSum / inputCostCnt : 0,
		avgInputTokens: inputTokensCnt ? inputTokensSum / inputTokensCnt : 0,
		avgOutputCost: outputCostCnt ? outputCostSum / outputCostCnt : 0,
		avgOutputTokens: outputTokensCnt ? outputTokensSum / outputTokensCnt : 0,
		avgThinkTime: thinkTimeCnt ? thinkTimeSum / thinkTimeCnt / 1e3 : 0,
		avgThinkTokens: thinkTokensCnt ? thinkTokensSum / thinkTokensCnt : 0,
		avgHitRate: hitRateCnt ? hitRateSum / hitRateCnt : 0,
		latestHitRate: (() => {
			const latest = [...filtered].sort((a, b) => b.timestamp - a.timestamp)[0];
			const ch = latest.cache_hit_tokens || 0, tot = ch + (latest.cache_miss_tokens || 0);
			return tot > 0 ? ch / tot * 100 : 0;
		})(),
		maxOutput,
		maxInput,
		maxTotal,
		avgThinkRatio: sumOut > 0 ? sumThink / sumOut * 100 : 0,
		truncationRate: truncCnt / rounds * 100,
		rounds
	};
}
/** 全量历史有效缓存命中率；无样本时返回 null */
function computeGlobalHitRate(history) {
	return computeGlobalHitRate$1(history || []);
}
/** 指定模型的有效缓存命中率；无样本时返回 null */
function computeModelHitRate(history, model) {
	return computeModelHitRate$1(history || [], model);
}
/** 模型效率对比（按每 1k 输出成本升序，无价排最后） */
function computeModelEfficiency(history, options = {}) {
	return aggregateModelEfficiency(history || [], options);
}
//#endregion
//#region src/ui/heatmap.ts
function getDoc$9() {
	return window.parent?.document ?? document;
}
function themeIsDark() {
	try {
		return getDoc$9().getElementById("aus-panel")?.getAttribute("data-ds-theme") === "dark";
	} catch {
		return false;
	}
}
function renderHeatmap(filtered) {
	const doc = getDoc$9();
	const container = doc.getElementById("aus-heatmap-container-overview") || doc.getElementById("aus-heatmap-container");
	const legendEl = doc.getElementById("aus-heatmap-legend-overview") || doc.getElementById("aus-heatmap-legend");
	const labelsEl = doc.getElementById("aus-heatmap-labels-overview") || doc.getElementById("aus-heatmap-labels");
	const scrollEl = doc.getElementById("aus-heatmap-scroll-overview") || doc.getElementById("aus-heatmap-scroll");
	if (!container) return;
	if (!filtered || filtered.length === 0) {
		container.innerHTML = "<div style=\"text-align:center;padding:20px;color:var(--ds-text-3);font-size:var(--aus-fs-base)\">暂无数据</div>";
		if (legendEl) legendEl.innerHTML = "";
		if (labelsEl) labelsEl.innerHTML = "";
		return;
	}
	const dayMap = {};
	for (const h of filtered) {
		const k = localDay$1(h.timestamp);
		dayMap[k] = (dayMap[k] || 0) + (h.total_tokens || 0);
	}
	const keys = Object.keys(dayMap).sort();
	const isDark = themeIsDark();
	const endStr = localDay$1((/* @__PURE__ */ new Date()).getTime());
	const endDate = /* @__PURE__ */ new Date(endStr + "T00:00:00");
	let startDate = new Date(endDate);
	startDate.setFullYear(startDate.getFullYear() - 2);
	if (keys.length > 0) {
		const earliest = /* @__PURE__ */ new Date(keys[0] + "T00:00:00");
		if (earliest < startDate) startDate = earliest;
	}
	const sd = startDate.getDay();
	startDate.setDate(startDate.getDate() + (sd === 0 ? -6 : 1 - sd));
	const ed = endDate.getDay();
	endDate.setDate(endDate.getDate() + (ed === 0 ? 0 : 7 - ed));
	const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 864e5);
	const totalWeeks = Math.ceil(totalDays / 7);
	const vals = [];
	for (const k in dayMap) if (dayMap[k] > 0) vals.push(dayMap[k]);
	vals.sort((a, b) => a - b);
	const pct = (arr, p) => {
		if (arr.length === 0) return 0;
		const idx = Math.ceil(arr.length * p / 100) - 1;
		return arr[Math.max(0, Math.min(idx, arr.length - 1))];
	};
	let p25 = pct(vals, 25), p50 = pct(vals, 50), p75 = pct(vals, 75);
	if (p25 === 0 && p50 === 0 && p75 === 0) {
		p25 = 1;
		p50 = 1e3;
		p75 = 1e4;
	} else if (p25 === p50 && p50 === p75) {
		p25 = Math.max(1, Math.floor(p50 / 2));
		p75 = p50 * 2;
	}
	const getLevel = (t) => {
		if (t <= 0) return 0;
		if (t <= p25) return 1;
		if (t <= p50) return 2;
		if (t <= p75) return 3;
		return 4;
	};
	const clr = isDark ? [
		"#161b22",
		"#0d3b20",
		"#1a7f37",
		"#3fb950",
		"#aceebb"
	] : [
		"#EBEDF0",
		"#9BE9A8",
		"#40C463",
		"#30A14E",
		"#216E39"
	];
	const borderClr = isDark ? "#1f2937" : "#E5E7EB";
	const mn = [
		"1月",
		"2月",
		"3月",
		"4月",
		"5月",
		"6月",
		"7月",
		"8月",
		"9月",
		"10月",
		"11月",
		"12月"
	];
	const dl = [
		"周一",
		"",
		"周三",
		"",
		"周五",
		"",
		"周日"
	];
	if (labelsEl) {
		let lhtml = "<div style=\"display:flex;flex-direction:column\">";
		lhtml += "<div style=\"height:16px;width:28px;\"></div>";
		for (let d = 0; d < 7; d++) lhtml += "<div style=\"height:14px;width:28px;padding:0 4px 0 0;line-height:14px;font-size:var(--aus-fs-xs);color:var(--ds-text-3);text-align:right;box-sizing:border-box\">" + (d % 2 === 0 ? dl[d] : "") + "</div>";
		lhtml += "</div>";
		labelsEl.innerHTML = lhtml;
	}
	let html = "<table style=\"border-collapse:collapse;font-size:var(--aus-fs-sm);color:var(--ds-text-3)\"><tr><td style=\"height:16px;padding:0;line-height:16px\"></td>";
	let lastM = -1;
	for (let w = 0; w < totalWeeks; w++) {
		const ws = new Date(startDate);
		ws.setDate(startDate.getDate() + w * 7);
		const mk = ws.getFullYear() * 12 + ws.getMonth();
		if (mk !== lastM) {
			let span = 1;
			for (let w2 = w + 1; w2 < totalWeeks; w2++) {
				const ws2 = new Date(startDate);
				ws2.setDate(startDate.getDate() + w2 * 7);
				if (ws2.getFullYear() * 12 + ws2.getMonth() === mk) span++;
				else break;
			}
			let label = mn[ws.getMonth()];
			if (ws.getMonth() === 0) label = ws.getFullYear() + "年";
			html += "<td colspan=\"" + span + "\" style=\"padding:0 0 0 2px;line-height:16px;height:16px;font-size:var(--aus-fs-sm);color:var(--ds-text-3);white-space:nowrap\">" + label + "</td>";
			lastM = mk;
		}
	}
	html += "</tr>";
	for (let d = 0; d < 7; d++) {
		html += "<tr>";
		for (let w = 0; w < totalWeeks; w++) {
			const cd = new Date(startDate);
			cd.setDate(startDate.getDate() + w * 7 + d);
			const t = dayMap[localDay$1(cd.getTime())] || 0;
			const lv = getLevel(t);
			const tip = cd.getFullYear() + "年" + (cd.getMonth() + 1) + "月" + cd.getDate() + "日" + (t > 0 ? " · " + t.toLocaleString() + " Token" : " · 无记录");
			html += "<td style=\"padding:1px;line-height:0;font-size:0\"><div style=\"width:12px;height:12px;border-radius:2px;background:" + clr[lv] + ";border:1px solid " + borderClr + ";cursor:pointer;box-sizing:border-box;\" title=\"" + tip + "\"></div></td>";
		}
		html += "</tr>";
	}
	html += "</table>";
	container.innerHTML = html;
	if (legendEl) {
		let lhtml = "更少 ";
		for (let i = 0; i < 5; i++) lhtml += "<span style=\"display:inline-block;width:11px;height:11px;border-radius:2px;background:" + clr[i] + ";border:1px solid " + borderClr + ";vertical-align:middle;margin:0 0 0 3px\"></span>";
		lhtml += " 更多";
		legendEl.innerHTML = lhtml;
	}
	setTimeout(() => {
		if (scrollEl) scrollEl.scrollLeft = scrollEl.scrollWidth;
	}, 50);
}
//#endregion
//#region src/ui/overview.ts
function getDoc$8() {
	return window.parent?.document ?? document;
}
function fmt(n) {
	return n.toLocaleString("zh-CN");
}
function CNY(n) {
	try {
		return formatMoney(n, 4);
	} catch {
		return "¥" + n.toFixed(4) + " CNY";
	}
}
function moneyHtml(cny, digits = 4) {
	try {
		const cur = getDisplayCurrency();
		const v = cur.code === "USD" ? cny / cur.rate : cny;
		return `${cur.symbol}${v.toFixed(digits)} <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">${cur.code}</span>`;
	} catch {
		return `¥${(cny || 0).toFixed(digits)} <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">CNY</span>`;
	}
}
var FOUR_OPTIONS = [
	{
		key: "avg_cost",
		label: "每轮费用"
	},
	{
		key: "avg_tokens",
		label: "每轮 Token"
	},
	{
		key: "avg_duration",
		label: "平均耗时"
	},
	{
		key: "avg_ttft",
		label: "平均首字延迟"
	},
	{
		key: "avg_rate",
		label: "输出速率"
	},
	{
		key: "avg_input_cost",
		label: "每轮平均输入费用"
	},
	{
		key: "avg_input_tokens",
		label: "每轮平均输入 Token"
	},
	{
		key: "avg_output_cost",
		label: "每轮平均输出费用"
	},
	{
		key: "avg_output_tokens",
		label: "每轮平均输出 Token"
	},
	{
		key: "avg_think_time",
		label: "思维链平均耗时"
	},
	{
		key: "avg_think_tokens",
		label: "思维链平均 Token"
	},
	{
		key: "avg_hit_rate",
		label: "平均缓存命中率"
	},
	{
		key: "latest_hit_rate",
		label: "最新命中率"
	},
	{
		key: "max_output",
		label: "单轮最大输出"
	},
	{
		key: "max_input",
		label: "单轮最大输入"
	},
	{
		key: "max_total",
		label: "单轮最大总 Token"
	},
	{
		key: "avg_think_ratio",
		label: "思维链占比"
	},
	{
		key: "truncation_rate",
		label: "截断率"
	}
];
var FOUR_LABEL_MAP = new Map(FOUR_OPTIONS.map((o) => [o.key, o.label]));
function ensureFour() {
	let cur = state$2.settings.overviewFour;
	const valid = new Set(FOUR_OPTIONS.map((o) => o.key));
	const defaults = [
		"avg_cost",
		"avg_tokens",
		"avg_duration",
		"avg_rate",
		"avg_input_tokens",
		"avg_output_tokens",
		"avg_hit_rate",
		"max_total"
	];
	if (!Array.isArray(cur) || cur.some((k) => !valid.has(k))) {
		cur = defaults.slice();
		state$2.settings.overviewFour = cur;
		try {
			saveHot({ settings: state$2.settings });
		} catch {}
		return cur;
	}
	if (cur.length === 4) {
		cur = [...cur, ...defaults.slice(4)];
		state$2.settings.overviewFour = cur;
		try {
			saveHot({ settings: state$2.settings });
		} catch {}
	}
	if (cur.length !== 8) {
		cur = defaults.slice();
		state$2.settings.overviewFour = cur;
		try {
			saveHot({ settings: state$2.settings });
		} catch {}
	}
	return cur;
}
function getFourDisplay(key, v) {
	const title = FOUR_LABEL_MAP.get(key) || key;
	switch (key) {
		case "avg_cost": return {
			title,
			html: moneyHtml(v.avgCost || 0, 4)
		};
		case "avg_tokens": return {
			title,
			html: `${Math.round(v.avgTokens || 0).toLocaleString("zh-CN")}`
		};
		case "avg_duration": return {
			title,
			html: `${(v.avgDuration || 0).toFixed(1)} <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">s</span>`
		};
		case "avg_ttft": return {
			title,
			html: (v.avgTtft || 0) > 0 ? `${v.avgTtft.toFixed(1)} <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">s</span>` : `<span style="color:var(--ds-text-3);">—</span>`
		};
		case "avg_rate": return {
			title,
			html: (v.avgRate || 0) > 0 ? `${Math.round(v.avgRate)} <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">t/s</span>` : `<span style="color:var(--ds-text-3);">—</span>`
		};
		case "avg_input_cost": return {
			title,
			html: moneyHtml(v.avgInputCost || 0, 4)
		};
		case "avg_input_tokens": return {
			title,
			html: `${Math.round(v.avgInputTokens || 0).toLocaleString("zh-CN")}`
		};
		case "avg_output_cost": return {
			title,
			html: moneyHtml(v.avgOutputCost || 0, 4)
		};
		case "avg_output_tokens": return {
			title,
			html: `${Math.round(v.avgOutputTokens || 0).toLocaleString("zh-CN")}`
		};
		case "avg_think_time": return {
			title,
			html: (v.avgThinkTime || 0) > 0 ? `${v.avgThinkTime.toFixed(1)} <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">s</span>` : `<span style="color:var(--ds-text-3);">—</span>`
		};
		case "avg_think_tokens": return {
			title,
			html: (v.avgThinkTokens || 0) > 0 ? `${Math.round(v.avgThinkTokens).toLocaleString("zh-CN")}` : `<span style="color:var(--ds-text-3);">—</span>`
		};
		case "avg_hit_rate": return {
			title,
			html: (v.avgHitRate || 0) > 0 ? `${v.avgHitRate.toFixed(1)}<span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">%</span>` : `<span style="color:var(--ds-text-3);">—</span>`
		};
		case "latest_hit_rate": {
			const val = v.latestHitRate;
			if (val == null) return {
				title,
				html: `<span style="color:var(--ds-text-3);">—</span>`
			};
			return {
				title,
				html: `${val.toFixed(1)}<span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">%</span>`
			};
		}
		case "max_output": return {
			title,
			html: `${(v.maxOutput || 0).toLocaleString("zh-CN")}`
		};
		case "max_input": return {
			title,
			html: `${(v.maxInput || 0).toLocaleString("zh-CN")}`
		};
		case "max_total": return {
			title,
			html: `${(v.maxTotal || 0).toLocaleString("zh-CN")}`
		};
		case "avg_think_ratio": {
			const has = (v.avgThinkRatio || 0) > 0 || (v.rounds || 0) > 0;
			const val = v.avgThinkRatio || 0;
			return {
				title,
				html: has && val > 0 ? `${val.toFixed(1)}<span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">%</span>` : `<span style="color:var(--ds-text-3);">—</span>`
			};
		}
		case "truncation_rate": {
			const has = (v.rounds || 0) > 0;
			const val = v.truncationRate || 0;
			return {
				title,
				html: has ? `${val.toFixed(1)}<span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:400;">%</span>` : `<span style="color:var(--ds-text-3);">—</span>`
			};
		}
		default: return {
			title,
			html: "—"
		};
	}
}
var fourBound = false;
var overviewWalletBound = false;
var overviewWalletViewportBound = false;
var overviewAsyncToken = 0;
function closeOverviewWalletDropdown() {
	const dropdown = getDoc$8().getElementById("aus-overview-wallet-dropdown");
	if (dropdown) dropdown.style.display = "none";
}
function bindOverviewWalletViewport() {
	if (overviewWalletViewportBound) return;
	overviewWalletViewportBound = true;
	try {
		(window.parent || window).addEventListener("resize", closeOverviewWalletDropdown, { passive: true });
	} catch {}
	try {
		window.addEventListener("resize", closeOverviewWalletDropdown, { passive: true });
	} catch {}
	try {
		getDoc$8().getElementById("aus-main")?.addEventListener("scroll", closeOverviewWalletDropdown, { passive: true });
	} catch {}
}
function positionOverviewWalletDropdown(btn, dropdown) {
	try {
		const panelRect = getDoc$8().getElementById("aus-panel")?.getBoundingClientRect();
		const btnRect = btn.getBoundingClientRect();
		const viewportWidth = window.parent?.innerWidth ?? window.innerWidth;
		const viewportHeight = window.parent?.innerHeight ?? window.innerHeight;
		const available = Math.max(180, Math.min(280, viewportWidth - 16));
		dropdown.style.position = "fixed";
		dropdown.style.width = `${available}px`;
		dropdown.style.minWidth = "0";
		dropdown.style.maxWidth = `${viewportWidth - 16}px`;
		dropdown.style.maxHeight = `${Math.max(120, viewportHeight - 24)}px`;
		const left = Math.max(8, Math.min(btnRect.right - available, viewportWidth - available - 8));
		const estimatedHeight = Math.min(dropdown.scrollHeight || 220, viewportHeight - 24);
		const top = btnRect.bottom + 6 + estimatedHeight > viewportHeight - 8 ? Math.max(8, btnRect.top - estimatedHeight - 6) : btnRect.bottom + 6;
		dropdown.style.top = `${Math.round(top)}px`;
		dropdown.style.left = `${Math.round(left)}px`;
		dropdown.style.right = "auto";
		dropdown.style.zIndex = "100500";
		if (panelRect) dropdown.style.pointerEvents = "auto";
	} catch {}
}
function bindFour() {
	if (fourBound) return;
	fourBound = true;
	const doc = window.parent?.document ?? document;
	doc.addEventListener("click", (e) => {
		const t = e.target;
		for (let i = 0; i < 8; i++) {
			const drop = doc.getElementById(`aus-four-drop-${i}`);
			const btn = doc.getElementById(`aus-four-btn-${i}`);
			if (drop && btn && !t.closest(`#aus-four-drop-${i}`) && !t.closest(`#aus-four-btn-${i}`)) drop.style.display = "none";
		}
	});
}
function openFourDrop(idx, v) {
	const drop = (window.parent?.document ?? document).getElementById(`aus-four-drop-${idx}`);
	if (!drop) return;
	const cur = ensureFour()[idx];
	drop.innerHTML = FOUR_OPTIONS.map((o) => {
		const active = o.key === cur;
		return `<div data-four="${idx}" data-key="${o.key}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-sm);${active ? "background:var(--ds-card);font-weight:600;color:var(--ds-text);" : ""}">${o.label}</div>`;
	}).join("");
	drop.querySelectorAll("[data-four]").forEach((el) => {
		el.onclick = () => {
			const key = el.getAttribute("data-key");
			const at = Number(el.getAttribute("data-four"));
			const arr = ensureFour().slice();
			arr[at] = key;
			state$2.settings.overviewFour = arr;
			try {
				saveHot({ settings: state$2.settings });
			} catch {}
			drop.style.display = "none";
			renderOverview();
		};
	});
	drop.style.display = drop.style.display === "block" ? "none" : "block";
}
function renderOverview(fullHistory) {
	const doc = window.parent?.document ?? document;
	const ignored = new Set(repository.getIgnoredWalletIds());
	const wallets = repository.getWallets().filter((wallet) => !ignored.has(wallet.id));
	const selectedWalletId = String(state$2.settings.overviewWalletId || "all");
	const activeWalletId = selectedWalletId !== "all" && wallets.some((wallet) => wallet.id === selectedWalletId) ? selectedWalletId : "all";
	const v = computeOverview(activeWalletId, fullHistory);
	const walletBtn = doc.getElementById("aus-overview-wallet-btn");
	const walletLabel = doc.getElementById("aus-overview-wallet-label");
	const walletDrop = doc.getElementById("aus-overview-wallet-dropdown");
	if (walletLabel) walletLabel.textContent = activeWalletId === "all" ? "全部钱包合计" : wallets.find((wallet) => wallet.id === activeWalletId)?.name || "全部钱包合计";
	if (walletDrop) {
		const item = (id, label) => {
			const active = id === activeWalletId;
			return `<div data-overview-wallet="${esc$2(id)}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-sm);${active ? "background:var(--ds-card);font-weight:600;" : ""}">${esc$2(label)}</div>`;
		};
		walletDrop.innerHTML = item("all", "全部钱包合计") + wallets.map((wallet) => item(wallet.id, wallet.name)).join("");
		walletDrop.querySelectorAll("[data-overview-wallet]").forEach((el) => {
			el.onclick = () => {
				state$2.settings.overviewWalletId = el.getAttribute("data-overview-wallet") || "all";
				state$2.settings.overviewWalletManuallySet = true;
				try {
					saveHot({ settings: state$2.settings });
				} catch {}
				walletDrop.style.display = "none";
				renderOverview();
			};
		});
	}
	if (walletBtn && walletDrop) walletBtn.onclick = (event) => {
		event.stopPropagation();
		const open = walletDrop.style.display !== "block";
		walletDrop.style.display = open ? "block" : "none";
		if (open) {
			bindOverviewWalletViewport();
			positionOverviewWalletDropdown(walletBtn, walletDrop);
		}
	};
	if (!overviewWalletBound) {
		overviewWalletBound = true;
		doc.addEventListener("click", (event) => {
			const target = event.target;
			const drop = doc.getElementById("aus-overview-wallet-dropdown");
			if (drop && !target?.closest?.("#aus-overview-wallet-dropdown") && !target?.closest?.("#aus-overview-wallet-btn")) drop.style.display = "none";
		});
	}
	const balEl = doc.getElementById("aus-balance");
	if (balEl) balEl.textContent = v.balanceText;
	const remEl = doc.getElementById("aus-balance-remaining");
	if (remEl) {
		if (v.remainingRounds != null) remEl.textContent = "预计还可进行 " + v.remainingRounds.toLocaleString("zh-CN") + " 轮对话";
		else remEl.textContent = v.hasBalance ? "暂无可用于预测的费用记录" : "设置钱包余额后可预测剩余轮次";
	}
	const costEl = doc.getElementById("aus-total-cost");
	if (costEl) try {
		costEl.textContent = formatMoney(v.totalCost, 4);
	} catch {
		costEl.textContent = "¥" + v.totalCost.toFixed(4) + " CNY";
	}
	const tokEl = doc.getElementById("aus-total-tokens");
	if (tokEl) tokEl.textContent = fmt(v.totalTokens) + " tokens";
	const histHost = doc.getElementById("aus-overview-history");
	if (histHost) histHost.innerHTML = `
      <div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);margin-bottom:8px;">历史消耗</div>
      <div style="display:grid;gap:10px;font-size:var(--aus-fs-sm);">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;"><span style="color:var(--ds-text-2);">Token 历史消耗</span><span style="font-weight:600;color:var(--ds-text);">${fmt(v.totalTokens)} tokens</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;"><span style="color:var(--ds-text-2);">输入（命中缓存）</span><span style="font-weight:600;color:var(--ds-green);">${fmt(v.hit)} tokens</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;"><span style="color:var(--ds-text-2);">输入（未命中缓存）</span><span style="font-weight:600;color:var(--ds-red);">${fmt(v.miss)} tokens</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;"><span style="color:var(--ds-text-2);">输出</span><span style="font-weight:600;color:var(--ds-text);">${fmt(v.output)} tokens</span></div>
      </div>
    `;
	const spendHost = doc.getElementById("aus-overview-spend");
	if (spendHost) spendHost.innerHTML = `
      <div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);margin-bottom:8px;">支出明细</div>
      <div style="display:grid;gap:10px;font-size:var(--aus-fs-sm);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;"><span style="color:var(--ds-text-2);padding-top:2px;">预计节省</span><span style="text-align:right;"><div style="font-weight:600;color:var(--ds-green);">${CNY(v.savings)}</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:1px;">${fmt(v.hit)} tokens</div></span></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;"><span style="color:var(--ds-text-2);padding-top:2px;">支出在输入</span><span style="text-align:right;"><div style="font-weight:600;color:var(--ds-text);">${CNY(v.inputCost)}</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:1px;">${fmt(v.hit + v.miss)} tokens</div></span></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;"><span style="color:var(--ds-text-2);padding-top:2px;">支出在输出</span><span style="text-align:right;"><div style="font-weight:600;color:var(--ds-text);">${CNY(v.outputCost)}</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:1px;">${fmt(v.output)} tokens</div></span></div>
      </div>
    `;
	const fourHost = doc.getElementById("aus-overview-four");
	if (fourHost) {
		const keys = ensureFour();
		bindFour();
		fourHost.innerHTML = keys.map((k, i) => {
			const d = getFourDisplay(k, v);
			const valColor = k === "avg_rate" ? "var(--ds-green)" : "var(--ds-text)";
			return `<div class="ds-card" style="padding:14px;position:relative;overflow:visible;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
          <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.title}</div>
          <button id="aus-four-btn-${i}" title="切换指标" style="flex-shrink:0;padding:4px 7px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text-2);font-size:var(--aus-fs-sm);cursor:pointer;line-height:1;">${icon("chevron-down", 14)}</button>
          <div id="aus-four-drop-${i}" style="display:none;position:absolute;top:38px;right:8px;z-index:6;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:180px;max-height:260px;overflow:auto;"></div>
        </div>
        <div style="font-size:18px;font-weight:600;color:${valColor};margin-top:6px;word-break:break-all;">${d.html}</div>
      </div>`;
		}).join("");
		keys.forEach((_, i) => {
			const btn = doc.getElementById(`aus-four-btn-${i}`);
			if (btn) btn.onclick = () => openFourDrop(i, v);
		});
	}
	try {
		renderHeatmap(fullHistory || state$2.history || []);
	} catch {}
	try {
		renderChatSummaryOverview(fullHistory);
	} catch {}
	if (!fullHistory) {
		const token = ++overviewAsyncToken;
		repository.getAllHistory().then((all) => {
			if (token === overviewAsyncToken && all?.length) renderOverview(all);
		}).catch(() => {});
	}
}
function renderChatSummaryOverview(fullHistory) {
	const doc = window.parent?.document ?? document;
	const tbody = doc.getElementById("aus-chat-summary-tbody");
	if (!doc.getElementById("aus-chat-summary-overview")) return;
	if (!tbody) return;
	const renderRows = (rows) => {
		if (!rows.length) {
			tbody.innerHTML = "<tr><td colspan=\"9\" style=\"text-align:center;padding:16px;color:var(--ds-text-3);\">暂无数据</td></tr>";
			return;
		}
		tbody.innerHTML = rows.map((r) => {
			const avgRate = r.avgHitRate > 0 ? r.avgHitRate.toFixed(1) + "%" : "—";
			const colorRate = r.avgHitRate >= 50 ? "var(--ds-green)" : r.avgHitRate > 0 ? "var(--ds-text)" : "var(--ds-text-3)";
			let costTxt = `¥${r.cost.toFixed(4)}`;
			try {
				costTxt = formatMoney(r.cost, 4);
			} catch {}
			return `<tr style="border-bottom:1px solid var(--ds-card);">
        <td style="padding:6px 8px;text-align:left;color:var(--ds-text);font-weight:500;max-width:160px;overflow:hidden;text-overflow:ellipsis;" title="${esc$2(r.chatId || "null")}">${esc$2(r.displayName)}</td>
        <td style="padding:6px 8px;text-align:right;">${r.count}</td>
        <td style="padding:6px 8px;text-align:right;color:#0BA25E;">${r.hit.toLocaleString("zh-CN")}</td>
        <td style="padding:6px 8px;text-align:right;color:#DC2626;">${r.miss.toLocaleString("zh-CN")}</td>
        <td style="padding:6px 8px;text-align:right;color:#6366F1;">${r.out.toLocaleString("zh-CN")}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:600;">${r.total.toLocaleString("zh-CN")}</td>
        <td style="padding:6px 8px;text-align:right;color:var(--ds-text);">${costTxt}</td>
        <td style="padding:6px 8px;text-align:right;">${Math.round(r.avgTokens).toLocaleString("zh-CN")}</td>
        <td style="padding:6px 8px;text-align:right;color:${colorRate};">${avgRate}</td>
      </tr>`;
		}).join("");
	};
	const hotRows = computeChatStats(fullHistory);
	renderRows(hotRows);
	if (fullHistory) return;
	(async () => {
		try {
			const mod = await import("./persistence-C4IJVd-B.js").then((n) => n.s);
			if (!mod.getAllHistory) return;
			const all = await mod.getAllHistory();
			if (!all || all.length <= (state$2.history?.length || 0)) return;
			const fullRows = computeChatStats(all);
			if (fullRows.length !== hotRows.length || fullRows.some((r, i) => r.total !== hotRows[i]?.total)) renderRows(fullRows);
		} catch {}
	})();
}
//#endregion
//#region src/ui/chart-config.ts
var Y_OPTIONS = [
	{
		key: "input_hit_token",
		label: "输入(命中) token",
		unit: "tokens",
		kind: "token",
		agg: "sum",
		group: "token",
		color: "#0BA25E"
	},
	{
		key: "input_miss_token",
		label: "输入(未命中) token",
		unit: "tokens",
		kind: "token",
		agg: "sum",
		group: "token",
		color: "#F87171"
	},
	{
		key: "output_token",
		label: "输出 token",
		unit: "tokens",
		kind: "token",
		agg: "sum",
		group: "token",
		color: "#6366F1"
	},
	{
		key: "total_token",
		label: "总 Token",
		unit: "tokens",
		kind: "token",
		agg: "sum",
		group: "token",
		color: "#111827"
	},
	{
		key: "avg_tokens",
		label: "平均每轮 Token",
		unit: "tokens",
		kind: "token",
		agg: "avg",
		group: "token",
		color: "#0EA5E9"
	},
	{
		key: "input_hit_cost",
		label: "输入(命中)费用",
		unit: "CNY",
		kind: "cost",
		agg: "sum",
		group: "cost",
		color: "#10B981"
	},
	{
		key: "input_miss_cost",
		label: "输入(未命中)费用",
		unit: "CNY",
		kind: "cost",
		agg: "sum",
		group: "cost",
		color: "#F59E0B"
	},
	{
		key: "output_cost",
		label: "输出费用",
		unit: "CNY",
		kind: "cost",
		agg: "sum",
		group: "cost",
		color: "#8B5CF6"
	},
	{
		key: "total_cost",
		label: "总费用",
		unit: "CNY",
		kind: "cost",
		agg: "sum",
		group: "cost",
		color: "#FF6A00"
	},
	{
		key: "avg_cost",
		label: "平均每轮成本",
		unit: "CNY",
		kind: "cost",
		agg: "avg",
		group: "cost",
		color: "#EA580C"
	},
	{
		key: "request_count",
		label: "请求数",
		unit: "次",
		kind: "count",
		agg: "sum",
		group: "perf",
		color: "#64748B"
	},
	{
		key: "avg_ttft",
		label: "平均首字延迟",
		unit: "s",
		kind: "duration",
		agg: "avg",
		group: "perf",
		color: "#06B6D4"
	},
	{
		key: "avg_duration",
		label: "平均耗时",
		unit: "s",
		kind: "duration",
		agg: "avg",
		group: "perf",
		color: "#0EA5E9"
	},
	{
		key: "avg_rate",
		label: "平均速率",
		unit: "t/s",
		kind: "rate",
		agg: "avg",
		group: "perf",
		color: "#14B8A6"
	},
	{
		key: "hit_rate",
		label: "缓存命中率",
		unit: "%",
		kind: "percent",
		agg: "ratio",
		group: "ratio",
		color: "#22C55E"
	},
	{
		key: "think_ratio",
		label: "思维链占比",
		unit: "%",
		kind: "percent",
		agg: "ratio",
		group: "ratio",
		color: "#A855F7"
	},
	{
		key: "truncation_rate",
		label: "截断率",
		unit: "%",
		kind: "percent",
		agg: "ratio",
		group: "ratio",
		color: "#EF4444"
	}
];
var Y_GROUPS = [
	{
		key: "token",
		label: "Token"
	},
	{
		key: "cost",
		label: "费用"
	},
	{
		key: "perf",
		label: "请求与性能"
	},
	{
		key: "ratio",
		label: "比率"
	}
];
var X_OPTIONS = [
	{
		key: "round",
		label: "轮次"
	},
	{
		key: "hour",
		label: "每小时"
	},
	{
		key: "day",
		label: "每日"
	},
	{
		key: "week",
		label: "每周"
	},
	{
		key: "month",
		label: "每月"
	}
];
var X_OPTIONS_WITHOUT_ROUND = X_OPTIONS.filter((option) => option.key !== "round");
/** 默认组合：缓存命中/未命中/输出三段 Token + 总费用曲线 + 命中率曲线，一屏内同时看用量、成本与缓存效果 */
var DEFAULT_Y_KEYS = [
	"input_hit_token",
	"input_miss_token",
	"output_token",
	"total_cost",
	"hit_rate"
];
var DEFAULT_X_KEY = "round";
var DEFAULT_CHART_TYPE = "auto";
var DEFAULT_AXIS_LABEL_MODE = "auto";
var ySelected = new Set(DEFAULT_Y_KEYS);
var axisLabelMode = DEFAULT_AXIS_LABEL_MODE;
var xSelected = DEFAULT_X_KEY;
var chartType = DEFAULT_CHART_TYPE;
function getYSelected() {
	return Array.from(ySelected);
}
function getXSelected() {
	return xSelected;
}
function getChartType() {
	return chartType;
}
function setXSelected(k) {
	xSelected = k;
}
function setChartType(t) {
	chartType = t === "bar" || t === "line" || t === "area" ? t : "auto";
}
function getAxisLabelMode() {
	return axisLabelMode;
}
function setAxisLabelMode(m) {
	axisLabelMode = m === "all" || m === "hide" ? m : "auto";
}
function toggleY(key) {
	if (ySelected.has(key)) {
		if (ySelected.size > 1) ySelected.delete(key);
	} else ySelected.add(key);
}
function toHourKey(ts) {
	const d = new Date(ts);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:00`;
}
function toWeekKey(ts) {
	const d = new Date(ts);
	const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	const dayNum = tmp.getUTCDay() || 7;
	tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
	const weekNo = Math.ceil(((tmp - yearStart) / 864e5 + 1) / 7);
	return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
function toMonthKey(ts) {
	const d = new Date(ts);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getBucketKey(e, x, idx) {
	if (x === "round") return `#${idx + 1}`;
	if (x === "hour") return toHourKey(e.timestamp);
	if (x === "day") return localDay$1(e.timestamp);
	if (x === "week") return toWeekKey(e.timestamp);
	if (x === "month") return toMonthKey(e.timestamp);
	return localDay$1(e.timestamp);
}
/** 单条记录对应的数值（比率类返回 0-100） */
function getYValue$1(e, y) {
	switch (y) {
		case "input_hit_token": return e.cache_hit_tokens || 0;
		case "input_miss_token": return e.cache_miss_tokens || 0;
		case "output_token": return e.completion_tokens || 0;
		case "total_token": return e.total_tokens || 0;
		case "avg_tokens": return e.total_tokens || 0;
		case "input_hit_cost": {
			const hit = e.cache_hit_tokens || 0, tot = hit + (e.cache_miss_tokens || 0);
			const ic = e.input_cost || 0;
			return tot ? ic * (hit / tot) : 0;
		}
		case "input_miss_cost": {
			const hit = e.cache_hit_tokens || 0, miss = e.cache_miss_tokens || 0, tot = hit + miss;
			const ic = e.input_cost || 0;
			return tot ? ic * (miss / tot) : 0;
		}
		case "output_cost": return e.output_cost || 0;
		case "total_cost": return e.cost || 0;
		case "avg_cost": return e.cost || 0;
		case "request_count": return 1;
		case "avg_ttft": return e.ttft ? e.ttft / 1e3 : 0;
		case "avg_duration": return e.duration ? e.duration / 1e3 : 0;
		case "avg_rate": return e.tokenRate || 0;
		case "hit_rate": {
			const hit = e.cache_hit_tokens || 0;
			const tot = hit + (e.cache_miss_tokens || 0);
			return tot ? hit / tot * 100 : 0;
		}
		case "think_ratio": {
			const out = e.completion_tokens || 0, think = e.thinkTokens || 0;
			return out ? think / out * 100 : 0;
		}
		case "truncation_rate": return e.isTruncated ? 100 : 0;
	}
	return 0;
}
function bucketValue(arr, opt) {
	if (opt.agg === "sum") {
		let sum = 0;
		for (const e of arr) sum += getYValue$1(e, opt.key);
		return sum;
	}
	if (opt.agg === "avg") {
		let sum = 0, n = 0;
		for (const e of arr) {
			const v = getYValue$1(e, opt.key);
			if (v > 0) {
				sum += v;
				n++;
			}
		}
		return n ? sum / n : 0;
	}
	if (opt.key === "hit_rate") {
		let hit = 0, miss = 0;
		for (const e of arr) {
			hit += e.cache_hit_tokens || 0;
			miss += e.cache_miss_tokens || 0;
		}
		const tot = hit + miss;
		return tot ? hit / tot * 100 : 0;
	}
	if (opt.key === "think_ratio") {
		let think = 0, out = 0;
		for (const e of arr) {
			think += e.thinkTokens || 0;
			out += e.completion_tokens || 0;
		}
		return out ? think / out * 100 : 0;
	}
	if (opt.key === "truncation_rate") {
		let n = 0;
		for (const e of arr) if (e.isTruncated) n++;
		return arr.length ? n / arr.length * 100 : 0;
	}
	return 0;
}
function precisionFor(kind) {
	if (kind === "cost") return 4;
	if (kind === "percent" || kind === "duration") return 2;
	if (kind === "rate") return 1;
	return 0;
}
function aggregateForChart(entries, yKeys, xKey) {
	const meta = new Map(Y_OPTIONS.map((o) => [o.key, o]));
	if (!yKeys.length) yKeys = DEFAULT_Y_KEYS;
	const round = xKey === "round";
	const labels = [];
	let buckets = null;
	let sortedKeys = [];
	if (round) labels.push(...entries.map((_, i) => `#${i + 1}`));
	else {
		buckets = /* @__PURE__ */ new Map();
		for (const e of entries) {
			const key = getBucketKey(e, xKey, 0);
			if (!buckets.has(key)) buckets.set(key, []);
			buckets.get(key).push(e);
		}
		sortedKeys = Array.from(buckets.keys()).sort();
		labels.push(...sortedKeys.map((k) => {
			if (xKey === "hour") return k.slice(5);
			if (xKey === "day") return k.slice(5).replace("-", "/");
			return k;
		}));
	}
	return {
		labels,
		series: yKeys.map((k) => {
			const opt = meta.get(k);
			const data = round ? entries.map((e) => Number(getYValue$1(e, k).toFixed(precisionFor(opt.kind)))) : sortedKeys.map((b) => Number(bucketValue(buckets.get(b), opt).toFixed(precisionFor(opt.kind))));
			return {
				name: opt.label,
				data,
				kind: opt.kind,
				agg: opt.agg,
				unit: opt.unit,
				group: opt.group,
				color: opt.color
			};
		})
	};
}
//#endregion
//#region src/ui/extra-charts.ts
var CHART_DEFS = {
	token: {
		title: "Token 趋势",
		yOpts: Y_OPTIONS.filter((o) => o.kind === "token"),
		hasX: true
	},
	cost: {
		title: "费用 趋势",
		yOpts: Y_OPTIONS.filter((o) => o.kind === "cost"),
		hasX: true
	},
	hit: {
		title: "缓存命中 趋势",
		yOpts: [{
			key: "hit_rate",
			label: "命中率",
			unit: "%",
			kind: "cost",
			color: "#0BA25E"
		}],
		hasX: true
	},
	req: {
		title: "API请求数 趋势",
		yOpts: [{
			key: "req_count",
			label: "请求数",
			unit: "次",
			kind: "token",
			color: "#6366F1"
		}],
		hasX: true
	},
	dur: {
		title: "耗时与速率 趋势",
		yOpts: [{
			key: "duration",
			label: "耗时",
			unit: "s",
			kind: "token",
			color: "#2563EB"
		}, {
			key: "rate",
			label: "速率",
			unit: "t/s",
			kind: "cost",
			color: "#10B981"
		}],
		hasX: true
	},
	pie: {
		title: "模型用量占比",
		yOpts: [],
		hasX: false
	}
};
var state$1 = {
	token: {
		y: /* @__PURE__ */ new Set([
			"input_hit_token",
			"input_miss_token",
			"output_token"
		]),
		x: "round",
		pieMode: "token"
	},
	cost: {
		y: /* @__PURE__ */ new Set(["total_cost"]),
		x: "round",
		pieMode: "token"
	},
	hit: {
		y: /* @__PURE__ */ new Set(["hit_rate"]),
		x: "round",
		pieMode: "token"
	},
	req: {
		y: /* @__PURE__ */ new Set(["req_count"]),
		x: "day",
		pieMode: "token"
	},
	dur: {
		y: /* @__PURE__ */ new Set(["duration", "rate"]),
		x: "round",
		pieMode: "token"
	},
	pie: {
		y: /* @__PURE__ */ new Set([]),
		x: "day",
		pieMode: "token"
	}
};
function getDoc$7() {
	return window.parent?.document ?? document;
}
function themeColor$3(name, fallback) {
	try {
		const doc = getDoc$7();
		const el = doc.getElementById("aus-panel") || doc.documentElement;
		return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
	} catch {
		return fallback;
	}
}
function bucketKey$1(ts, x, idx) {
	if (x === "round") return `#${idx + 1}`;
	if (x === "hour") {
		const d = new Date(ts);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:00`;
	}
	if (x === "day") return localDay$1(ts);
	if (x === "week") {
		const d = new Date(ts);
		const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
		const dayNum = tmp.getUTCDay() || 7;
		tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
		const weekNo = Math.ceil(((tmp - yearStart) / 864e5 + 1) / 7);
		return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
	}
	if (x === "month") {
		const d = new Date(ts);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
	}
	return localDay$1(ts);
}
function getYValue(e, key) {
	switch (key) {
		case "input_hit_token": return e.cache_hit_tokens || 0;
		case "input_miss_token": return e.cache_miss_tokens || 0;
		case "output_token": return e.completion_tokens || 0;
		case "total_token": return e.total_tokens || 0;
		case "input_hit_cost": {
			const hit = e.cache_hit_tokens || 0, tot = hit + (e.cache_miss_tokens || 0);
			return tot ? (e.input_cost || 0) * (hit / tot) : 0;
		}
		case "input_miss_cost": {
			const hit = e.cache_hit_tokens || 0, miss = e.cache_miss_tokens || 0, tot = hit + miss;
			return tot ? (e.input_cost || 0) * (miss / tot) : 0;
		}
		case "output_cost": return e.output_cost || 0;
		case "total_cost": return e.cost || 0;
		case "hit_rate": {
			const h = e.cache_hit_tokens || 0, tot = h + (e.cache_miss_tokens || 0);
			return tot ? h / tot * 100 : 0;
		}
		case "req_count": return 1;
		case "duration": return (e.duration || 0) / 1e3;
		case "rate": return e.tokenRate || 0;
	}
	return 0;
}
async function getEcharts$1() {
	const ec = await import("./core-ooVr14Lq.js");
	const { BarChart, LineChart, PieChart } = await import("./charts-6tQsz9zF.js");
	const { GridComponent, TooltipComponent, LegendComponent } = await import("./components-jF_EZHLs.js");
	const { CanvasRenderer } = await import("./renderers-DtxFY9_W.js");
	ec.use([
		BarChart,
		LineChart,
		PieChart,
		GridComponent,
		TooltipComponent,
		LegendComponent,
		CanvasRenderer
	]);
	return ec;
}
var charts$1 = {};
/**
* 主题重绘：ECharts 实例在跨主题切换时复用，option 中的颜色是绘制时取值的，
* 不会随 CSS 变量自动更新，因此「跟随系统」实时切换后需要主动重绘。
* 仅释放本模块内部持有的实例，实例容器留在 DOM 中，各视图自身的 render 会重新 init 并取新配色。
*/
function resetChartThemeCache() {
	for (const id of Object.keys(charts$1)) {
		try {
			charts$1[id]?.dispose?.();
		} catch {}
		charts$1[id] = null;
	}
}
var lastFiltered$1 = [];
function renderExtraCharts(filtered) {
	lastFiltered$1 = filtered || [];
	for (const id of Object.keys(CHART_DEFS)) renderOne$1(id, filtered);
}
async function renderOne$1(id, filtered) {
	try {
		const el = getDoc$7().getElementById(`aus-chart-${id}`);
		if (!el) return;
		if (id === "req" && state$1[id].x === "round") state$1[id].x = "day";
		if (id === "pie") {
			const mode = state$1.pie.pieMode;
			if (!filtered.length) {
				el.innerHTML = "<div style=\"text-align:center;padding:40px;color:var(--ds-text-3);\">暂无数据</div>";
				return;
			}
			const map = {};
			for (const e of filtered) {
				const m = e.model || "unknown";
				const v = mode === "token" ? e.total_tokens || 0 : 1;
				map[m] = (map[m] || 0) + v;
			}
			const data = Object.entries(map).map(([name, value]) => ({
				name,
				value
			}));
			const ec = await getEcharts$1();
			let c = charts$1[id];
			if (!c || c.isDisposed?.()) {
				el.innerHTML = "";
				el.style.height = "260px";
				c = charts$1[id] = ec.init(el);
			}
			c.setOption({
				backgroundColor: "transparent",
				tooltip: {
					trigger: "item",
					backgroundColor: themeColor$3("--ds-card-inner", "#FFFFFF"),
					borderColor: themeColor$3("--ds-border", "#E5E7EB"),
					textStyle: {
						fontSize: 12,
						color: themeColor$3("--ds-text", "#111827")
					}
				},
				legend: {
					bottom: 0,
					textStyle: {
						fontSize: 12,
						color: themeColor$3("--ds-text-2", "#6B7280")
					}
				},
				series: [{
					type: "pie",
					radius: ["40%", "70%"],
					itemStyle: {
						borderRadius: 6,
						borderColor: themeColor$3("--ds-card-inner", "#FFFFFF"),
						borderWidth: 2
					},
					label: { fontSize: 12 },
					data
				}]
			}, true);
			return;
		}
		const yKeys = Array.from(state$1[id].y);
		const xKey = state$1[id].x;
		if (!yKeys.length) {
			el.innerHTML = "<div style=\"text-align:center;padding:30px;color:var(--ds-text-3);font-size:var(--aus-fs-sm);\">请选择 Y 轴</div>";
			return;
		}
		if (xKey === "round") {
			const labels = filtered.map((_, i) => `#${i + 1}`);
			const yMeta = new Map(CHART_DEFS[id].yOpts.map((o) => [o.key, o]));
			await drawBarLine(el, id, labels, yKeys.map((k) => {
				const meta = yMeta.get(k) || Y_OPTIONS.find((o) => o.key === k) || {
					label: k,
					color: "var(--ds-text-2)"
				};
				const data = filtered.map((e) => {
					const v = getYValue(e, k);
					return Number(v.toFixed(k.includes("cost") || k === "hit_rate" ? 2 : 0));
				});
				return {
					name: meta.label,
					data,
					color: meta.color,
					kind: meta.kind || "token"
				};
			}));
			return;
		}
		const buckets = /* @__PURE__ */ new Map();
		filtered.forEach((e) => {
			const key = bucketKey$1(e.timestamp, xKey, 0);
			if (!buckets.has(key)) buckets.set(key, []);
			buckets.get(key).push(e);
		});
		const sortedKeys = Array.from(buckets.keys()).sort();
		const labels = sortedKeys.map((k) => xKey === "day" ? k.slice(5).replace("-", "/") : xKey === "hour" ? k.slice(5) : k);
		new Map(CHART_DEFS[id].yOpts.map((o) => [o.key, o]));
		const fullMap = new Map([...Y_OPTIONS, ...CHART_DEFS[id].yOpts].map((o) => [o.key, o]));
		await drawBarLine(el, id, labels, yKeys.map((k) => {
			const meta = fullMap.get(k) || {
				label: k,
				color: "var(--ds-text-2)",
				kind: "token"
			};
			let data;
			if (k === "hit_rate") data = sortedKeys.map((key) => {
				const arr = buckets.get(key);
				let hit = 0, tot = 0;
				for (const e of arr) {
					hit += e.cache_hit_tokens || 0;
					tot += (e.cache_hit_tokens || 0) + (e.cache_miss_tokens || 0);
				}
				return tot ? Number((hit / tot * 100).toFixed(1)) : 0;
			});
			else if (k === "duration") data = sortedKeys.map((key) => {
				const arr = buckets.get(key);
				const avg = arr.reduce((a, c) => a + (c.duration || 0), 0) / arr.length / 1e3;
				return Number(avg.toFixed(1));
			});
			else if (k === "rate") data = sortedKeys.map((key) => {
				const valid = buckets.get(key).map((c) => c.tokenRate || 0).filter((v) => v > 0);
				if (!valid.length) return 0;
				const avg = valid.reduce((a, c) => a + c, 0) / valid.length;
				return Math.round(avg);
			});
			else if (k === "req_count") data = sortedKeys.map((key) => buckets.get(key).length);
			else data = sortedKeys.map((key) => {
				const arr = buckets.get(key);
				let sum = 0;
				for (const e of arr) sum += getYValue(e, k);
				return Number(sum.toFixed(k.includes("cost") ? 2 : 0));
			});
			return {
				name: meta.label,
				data,
				color: meta.color,
				kind: meta.kind || "token"
			};
		}));
	} catch (e) {
		try {
			const el2 = getDoc$7().getElementById(`aus-chart-${id}`);
			if (el2) el2.innerHTML = "<div style=\"text-align:center;padding:20px;color:#DC2626;font-size:var(--aus-fs-sm);\">图表加载失败: " + (e?.message || e) + "</div>";
		} catch {}
		try {
			console.error("[Api-Usage] renderOne failed", id, e);
		} catch {}
	}
}
function calcXInterval(labels, el) {
	const w = el.clientWidth || 320;
	const maxLabels = Math.max(8, Math.floor(w / (w < 500 ? 42 : w < 760 ? 56 : 68)));
	if (labels.length <= maxLabels) return 0;
	return Math.ceil(labels.length / maxLabels) - 1;
}
async function drawBarLine(el, id, labels, series) {
	try {
		const curCur = (() => {
			try {
				return getDisplayCurrency();
			} catch {
				return {
					code: "CNY",
					symbol: "¥",
					rate: 1
				};
			}
		})();
		if (curCur.code === "USD") {
			for (const s of series) if (s.kind === "cost" || s.name.includes("费用") || s.name.toLowerCase().includes("cost")) s.data = s.data.map((v) => Number((Number(v) / curCur.rate).toFixed(4)));
		}
		const ec = await getEcharts$1();
		let c = charts$1[id];
		if (!c || c.isDisposed?.()) {
			el.innerHTML = "";
			el.style.height = "260px";
			c = charts$1[id] = ec.init(el);
		}
		const isTokenCost = id === "token" || id === "cost";
		const interval = calcXInterval(labels, el);
		const opts = {
			backgroundColor: "transparent",
			tooltip: {
				trigger: "axis",
				backgroundColor: themeColor$3("--ds-card-inner", "#FFFFFF"),
				borderColor: themeColor$3("--ds-border", "#E5E7EB"),
				textStyle: { fontSize: 12 }
			},
			grid: {
				left: 40,
				right: 20,
				top: 8,
				bottom: 24
			},
			xAxis: {
				type: "category",
				data: labels,
				axisLine: { lineStyle: { color: themeColor$3("--ds-border", "#E5E7EB") } },
				axisLabel: {
					fontSize: 12,
					color: themeColor$3("--ds-text-3", "#9CA3AF"),
					rotate: labels.length > 12 ? 30 : 0,
					interval,
					hideOverlap: false
				}
			},
			yAxis: {
				type: "value",
				axisLabel: {
					fontSize: 12,
					color: themeColor$3("--ds-text-3", "#9CA3AF")
				},
				splitLine: { lineStyle: { color: themeColor$3("--ds-card", "#F6F7F8") } }
			},
			dataZoom: labels.length > 8 ? [{
				type: "inside",
				xAxisIndex: 0,
				start: Math.max(0, (labels.length - Math.max(8, Math.min(labels.length, Math.floor((el.clientWidth || 320) / 44)))) / labels.length * 100),
				end: 100,
				zoomOnMouseWheel: false,
				moveOnMouseMove: true
			}] : void 0,
			series: (() => {
				const barIndices = series.map((s, i) => ({
					s,
					i
				})).filter(({ s }) => !(isTokenCost && s.name.includes("总"))).map(({ i }) => i);
				const topIdx = barIndices.length ? barIndices[barIndices.length - 1] : -1;
				return series.map((s, idx) => {
					const isTotal = s.name.includes("总");
					if (isTokenCost && isTotal) return {
						name: s.name,
						type: "line",
						data: s.data,
						smooth: true,
						lineStyle: {
							color: s.color,
							width: 2
						},
						itemStyle: { color: s.color },
						symbolSize: 2
					};
					const isTop = idx === topIdx;
					return {
						name: s.name,
						type: "bar",
						stack: "total",
						data: s.data,
						itemStyle: {
							color: s.color,
							borderRadius: isTop ? [
								4,
								4,
								0,
								0
							] : [
								0,
								0,
								0,
								0
							]
						},
						barMaxWidth: 16,
						barGap: "-100%"
					};
				});
			})()
		};
		if (id === "cost") {
			opts.yAxis = {
				type: "value",
				axisLabel: {
					fontSize: 12,
					color: themeColor$3("--ds-text-3", "#9CA3AF"),
					formatter: (v) => curCur.symbol + Number(v).toFixed(2)
				},
				splitLine: { lineStyle: { color: themeColor$3("--ds-card", "#F6F7F8") } }
			};
			opts.tooltip = {
				trigger: "axis",
				backgroundColor: themeColor$3("--ds-card-inner", "#FFFFFF"),
				borderColor: themeColor$3("--ds-border", "#E5E7EB"),
				textStyle: { fontSize: 12 },
				formatter: (params) => {
					let html = `<div style="font-weight:600;margin-bottom:6px;">${params[0]?.axisValueLabel || ""}</div>`;
					for (const p of params) html += `<div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;background:${p.color};border-radius:2px;"></span>${p.seriesName}<span style="margin-left:auto;font-weight:600;">${curCur.symbol}${Number(p.value).toFixed(4)} ${curCur.code}</span></div>`;
					return `<div style="padding:4px 2px;min-width:160px;">${html}</div>`;
				}
			};
		}
		if (id === "hit") {
			opts.series = [{
				name: "命中率",
				type: "line",
				data: series[0].data,
				areaStyle: {
					opacity: .12,
					color: series[0].color
				},
				lineStyle: { color: series[0].color },
				itemStyle: { color: series[0].color },
				smooth: true
			}];
			opts.yAxis = {
				max: 100,
				axisLabel: { formatter: (v) => v + "%" }
			};
		}
		if (id === "dur") {
			opts.yAxis = [{
				type: "value",
				name: "耗时 s",
				position: "left",
				axisLabel: {
					fontSize: 12,
					color: themeColor$3("--ds-text-3", "#9CA3AF")
				},
				splitLine: { lineStyle: { color: themeColor$3("--ds-card", "#F6F7F8") } }
			}, {
				type: "value",
				name: "速率 t/s",
				position: "right",
				axisLabel: {
					fontSize: 12,
					color: themeColor$3("--ds-text-3", "#9CA3AF")
				},
				splitLine: { show: false }
			}];
			opts.series = series.map((s) => ({
				name: s.name,
				type: "line",
				yAxisIndex: s.name.includes("速率") || s.name.toLowerCase().includes("rate") ? 1 : 0,
				data: s.data,
				smooth: true,
				symbolSize: 4,
				lineStyle: {
					color: s.color,
					width: 2
				},
				itemStyle: { color: s.color },
				areaStyle: s.name.includes("耗时") ? {
					opacity: .08,
					color: s.color
				} : void 0
			}));
		}
		c.setOption(opts, true);
	} catch (e) {
		try {
			el.innerHTML = "<div style=\"text-align:center;padding:20px;color:#DC2626;font-size:var(--aus-fs-sm);\">图表渲染失败</div>";
		} catch {}
		try {
			console.error("[Api-Usage] drawBarLine failed", id, e);
		} catch {}
	}
}
function initExtraCharts() {
	const doc = getDoc$7();
	for (const id of Object.keys(CHART_DEFS)) {
		if (!CHART_DEFS[id].hasX) continue;
		const yBtn = doc.getElementById(`aus-extra-y-${id}`);
		const yDrop = doc.getElementById(`aus-extra-y-drop-${id}`);
		const xBtn = doc.getElementById(`aus-extra-x-${id}`);
		const xDrop = doc.getElementById(`aus-extra-x-drop-${id}`);
		if (yBtn && yDrop) yBtn.onclick = () => {
			yDrop.style.display = yDrop.style.display === "block" ? "none" : "block";
			if (yDrop.style.display === "block") renderExtraY(id);
		};
		if (xBtn && xDrop) xBtn.onclick = () => {
			xDrop.style.display = xDrop.style.display === "block" ? "none" : "block";
			if (xDrop.style.display === "block") renderExtraX(id);
		};
	}
	const pieToggle = doc.getElementById("aus-pie-toggle");
	if (pieToggle) pieToggle.onclick = () => {
		state$1.pie.pieMode = state$1.pie.pieMode === "token" ? "count" : "token";
		pieToggle.textContent = state$1.pie.pieMode === "token" ? "Token" : "次数";
		renderOne$1("pie", lastFiltered$1);
	};
	doc.addEventListener("click", (e) => {
		const t = e.target;
		for (const id of Object.keys(CHART_DEFS)) {
			if (!CHART_DEFS[id].hasX) continue;
			const yDrop = doc.getElementById(`aus-extra-y-drop-${id}`);
			const yBtn = doc.getElementById(`aus-extra-y-${id}`);
			const xDrop = doc.getElementById(`aus-extra-x-drop-${id}`);
			const xBtn = doc.getElementById(`aus-extra-x-${id}`);
			if (yDrop && yBtn && !t.closest(`#aus-extra-y-drop-${id}`) && !t.closest(`#aus-extra-y-${id}`)) yDrop.style.display = "none";
			if (xDrop && xBtn && !t.closest(`#aus-extra-x-drop-${id}`) && !t.closest(`#aus-extra-x-${id}`)) xDrop.style.display = "none";
		}
	});
}
function renderExtraY(id) {
	const doc = getDoc$7();
	const drop = doc.getElementById(`aus-extra-y-drop-${id}`);
	const label = doc.getElementById(`aus-extra-y-label-${id}`);
	if (!drop) return;
	const opts = CHART_DEFS[id].yOpts;
	const sel = state$1[id].y;
	if (label) label.textContent = sel.size ? `${sel.size} 项` : "选择";
	drop.innerHTML = opts.map((o) => {
		const checked = sel.has(o.key);
		return `<label style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:var(--aus-fs-sm);${checked ? "background:var(--ds-active-bg);" : ""}"><input type="checkbox" data-y="${o.key}" data-chart="${id}" ${checked ? "checked" : ""} style="accent-color:var(--ds-text);" /><span style="width:8px;height:8px;background:${o.color};border-radius:2px;"></span>${o.label}</label>`;
	}).join("");
	drop.querySelectorAll("input[data-y]").forEach((el) => {
		el.onchange = () => {
			const k = el.getAttribute("data-y"), cid = el.getAttribute("data-chart");
			if (el.checked) state$1[cid].y.add(k);
			else if (state$1[cid].y.size > 1) state$1[cid].y.delete(k);
			else el.checked = true;
			renderExtraY(cid);
			renderOne$1(cid, lastFiltered$1);
		};
	});
}
function renderExtraX(id) {
	const doc = getDoc$7();
	const drop = doc.getElementById(`aus-extra-x-drop-${id}`);
	const label = doc.getElementById(`aus-extra-x-label-${id}`);
	if (!drop) return;
	const options = id === "req" ? X_OPTIONS_WITHOUT_ROUND : X_OPTIONS;
	const cur = state$1[id].x;
	if (label) label.textContent = options.find((o) => o.key === cur)?.label || cur;
	drop.innerHTML = options.map((o) => {
		const active = o.key === cur;
		return `<div data-x="${o.key}" data-chart="${id}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active ? "background:var(--ds-active-bg);font-weight:600;" : ""}">${o.label}</div>`;
	}).join("");
	drop.querySelectorAll("[data-x]").forEach((el) => {
		el.onclick = () => {
			const k = el.getAttribute("data-x"), cid = el.getAttribute("data-chart");
			state$1[cid].x = k;
			drop.style.display = "none";
			renderExtraX(cid);
			renderOne$1(cid, lastFiltered$1);
		};
	});
}
//#endregion
//#region src/ui/model-trends.ts
var MODEL_COLORS = [
	"#0BA25E",
	"#6366F1",
	"#FF6A00",
	"#10B981",
	"#F59E0B",
	"#8B5CF6",
	"#EF4444",
	"#06B6D4",
	"#84CC16",
	"#E11D48",
	"#0EA5E9",
	"#F97316",
	"#14B8A6",
	"#A855F7",
	"#EAB308",
	"#22C55E"
];
var state = {
	token: { x: "day" },
	req: { x: "day" }
};
function getDoc$6() {
	return window.parent?.document ?? document;
}
function themeColor$2(name, fallback) {
	try {
		const doc = getDoc$6();
		const el = doc.getElementById("aus-panel") || doc.documentElement;
		return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
	} catch {
		return fallback;
	}
}
function bucketKey(ts, x, idx) {
	if (x === "round") return `#${idx + 1}`;
	if (x === "hour") {
		const d = new Date(ts);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:00`;
	}
	if (x === "day") return localDay$1(ts);
	if (x === "week") {
		const d = new Date(ts);
		const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
		const dayNum = tmp.getUTCDay() || 7;
		tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
		const weekNo = Math.ceil(((tmp - yearStart) / 864e5 + 1) / 7);
		return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
	}
	if (x === "month") {
		const d = new Date(ts);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
	}
	return localDay$1(ts);
}
async function getEcharts() {
	const ec = await import("./core-ooVr14Lq.js");
	const { LineChart } = await import("./charts-6tQsz9zF.js");
	const { GridComponent, TooltipComponent, LegendComponent } = await import("./components-jF_EZHLs.js");
	const { CanvasRenderer } = await import("./renderers-DtxFY9_W.js");
	ec.use([
		LineChart,
		GridComponent,
		TooltipComponent,
		LegendComponent,
		CanvasRenderer
	]);
	return ec;
}
var charts = {};
var lastFiltered = [];
function renderModelTrends(filtered) {
	lastFiltered = filtered || [];
	renderOne("token", filtered);
	renderOne("req", filtered);
}
async function renderOne(id, filtered) {
	try {
		const doc = getDoc$6();
		const el = doc.getElementById(`aus-chart-model-${id}`);
		if (!el) return;
		const xKey = state[id].x;
		if (!filtered.length) {
			if (charts[id]) try {
				charts[id].dispose();
			} catch {}
			charts[id] = null;
			el.innerHTML = "<div style=\"text-align:center;padding:40px;color:var(--ds-text-3);font-size:var(--aus-fs-sm);\">暂无数据</div>";
			return;
		}
		const modelSet = /* @__PURE__ */ new Set();
		for (const e of filtered) modelSet.add(e.model || "unknown");
		const models = Array.from(modelSet).sort();
		const colorMap = /* @__PURE__ */ new Map();
		models.forEach((m, i) => colorMap.set(m, MODEL_COLORS[i % MODEL_COLORS.length]));
		let labels = [];
		let seriesData = [];
		if (xKey === "round") {
			labels = filtered.map((_, i) => `#${i + 1}`);
			seriesData = models.map((m) => {
				const col = colorMap.get(m);
				return {
					name: m,
					data: filtered.map((e) => {
						if ((e.model || "unknown") !== m) return 0;
						return id === "token" ? e.total_tokens || 0 : 1;
					}),
					color: col
				};
			});
		} else {
			const buckets = /* @__PURE__ */ new Map();
			filtered.forEach((_, idx) => {
				const e = filtered[idx];
				const key = bucketKey(e.timestamp, xKey, idx);
				if (!buckets.has(key)) buckets.set(key, []);
				buckets.get(key).push(e);
			});
			const sortedKeys = Array.from(buckets.keys()).sort();
			labels = sortedKeys.map((k) => xKey === "day" ? k.slice(5).replace("-", "/") : xKey === "hour" ? k.slice(5) : k);
			seriesData = models.map((m) => {
				const col = colorMap.get(m);
				return {
					name: m,
					data: sortedKeys.map((key) => {
						const arr = buckets.get(key);
						let sum = 0;
						for (const e of arr) if ((e.model || "unknown") === m) sum += id === "token" ? e.total_tokens || 0 : 1;
						return sum;
					}),
					color: col
				};
			});
		}
		const w = el.clientWidth;
		const h = el.clientHeight;
		if (w === 0 || h === 0) {
			const statsView = doc.querySelector("[data-view=\"stats\"]");
			if (statsView ? statsView.style.display === "none" || statsView.offsetParent === null : false) return;
			const tries = renderOne._retryCount || 0;
			if (tries >= 20) {
				el.innerHTML = "<div style=\"text-align:center;padding:20px;color:var(--ds-text-3);font-size:var(--aus-fs-sm);\">图表容器未就绪</div>";
				return;
			}
			renderOne._retryCount = tries + 1;
			setTimeout(() => renderOne(id, filtered), 120);
			return;
		}
		renderOne._retryCount = 0;
		const ec = await getEcharts();
		let c = charts[id];
		if (!c || c.isDisposed?.()) {
			el.innerHTML = "";
			el.style.height = "220px";
			c = charts[id] = ec.init(el);
		}
		const cBorder = themeColor$2("--ds-border", "#E5E7EB");
		const cCard = themeColor$2("--ds-card", "#F6F7F8");
		const cText3 = themeColor$2("--ds-text-3", "#9CA3AF");
		const cCardInner = themeColor$2("--ds-card-inner", "#FFFFFF");
		const cText = themeColor$2("--ds-text", "#111827");
		const cw = w || 320;
		const maxLabels = Math.max(8, Math.floor(cw / (cw < 500 ? 42 : cw < 760 ? 56 : 68)));
		const xInterval = labels.length <= maxLabels ? 0 : Math.ceil(labels.length / maxLabels) - 1;
		const needZoom = labels.length > maxLabels;
		const legendTop = models.length > 4 ? 2 : 0;
		c.setOption({
			backgroundColor: "transparent",
			tooltip: {
				trigger: "axis",
				backgroundColor: cCardInner,
				borderColor: cBorder,
				borderWidth: 1,
				textStyle: {
					color: cText,
					fontSize: 12
				},
				formatter: (params) => {
					if (!params?.length) return "";
					const idx = params[0].dataIndex;
					const label = labels[idx];
					let sum = 0;
					for (const p of params) sum += Number(p.value || 0);
					let html = `<div style="font-weight:600;margin-bottom:6px;">${esc$2(label)}<span style="margin-left:8px;color:var(--ds-text-2);font-weight:400;">合计 ${id === "token" ? sum.toLocaleString() + " tokens" : sum + " 次"}</span></div>`;
					for (const p of params) {
						if (Number(p.value) === 0) continue;
						html += `<div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;background:${p.color};border-radius:2px;"></span>${esc$2(p.seriesName)}<span style="margin-left:auto;font-weight:600;">${id === "token" ? Number(p.value).toLocaleString() + " tokens" : p.value + " 次"}</span></div>`;
					}
					if (!params.some((p) => Number(p.value) > 0)) html += `<div style="color:var(--ds-text-3);font-size:var(--aus-fs-sm);">本${xKey === "day" ? "日" : xKey === "hour" ? "时段" : xKey === "week" ? "周" : xKey === "month" ? "月" : "轮次"}无数据</div>`;
					return `<div style="padding:4px 2px;min-width:180px;max-width:280px;">${html}</div>`;
				}
			},
			legend: {
				top: legendTop,
				type: "scroll",
				textStyle: {
					fontSize: 12,
					color: cText3
				},
				pageIconColor: cText3,
				pageTextStyle: { color: cText3 },
				itemWidth: 10,
				itemHeight: 6
			},
			grid: {
				left: 42,
				right: 16,
				top: 22 + (models.length > 4 ? 8 : 0),
				bottom: 24
			},
			dataZoom: needZoom ? [{
				type: "inside",
				xAxisIndex: 0,
				start: Math.max(0, (labels.length - maxLabels) / labels.length * 100),
				end: 100,
				zoomOnMouseWheel: false,
				moveOnMouseMove: true
			}] : void 0,
			xAxis: {
				type: "category",
				data: labels,
				boundaryGap: false,
				axisLine: { lineStyle: { color: cBorder } },
				axisLabel: {
					color: cText3,
					fontSize: 12,
					interval: xInterval,
					rotate: labels.length > 12 ? 30 : 0,
					hideOverlap: false
				}
			},
			yAxis: {
				type: "value",
				axisLabel: {
					color: cText3,
					fontSize: 12,
					formatter: (v) => id === "token" ? v >= 1e3 ? (v / 1e3).toFixed(0) + "k" : String(v) : String(v)
				},
				splitLine: { lineStyle: { color: cCard } }
			},
			series: seriesData.map((s) => ({
				name: s.name,
				type: "line",
				smooth: true,
				symbol: "none",
				lineStyle: {
					width: 1.5,
					color: s.color
				},
				itemStyle: { color: s.color },
				areaStyle: {
					color: s.color,
					opacity: .18
				},
				emphasis: { focus: "series" },
				data: s.data
			}))
		}, true);
		setTimeout(() => {
			try {
				c.resize();
			} catch {}
		}, 60);
	} catch (e) {
		try {
			const el2 = getDoc$6().getElementById(`aus-chart-model-${id}`);
			if (el2) el2.innerHTML = "<div style=\"text-align:center;padding:20px;color:#DC2626;font-size:var(--aus-fs-sm);\">图表加载失败</div>";
		} catch {}
		try {
			console.error("[Api-Usage] renderModelTrends failed", id, e);
		} catch {}
	}
}
function initModelTrends() {
	const doc = getDoc$6();
	for (const id of ["token", "req"]) {
		const btn = doc.getElementById(`aus-modeltrends-x-${id}`);
		const drop = doc.getElementById(`aus-modeltrends-x-drop-${id}`);
		if (btn && drop) btn.onclick = () => {
			drop.style.display = drop.style.display === "block" ? "none" : "block";
			if (drop.style.display === "block") renderXDrop(id);
		};
	}
	doc.addEventListener("click", (e) => {
		const t = e.target;
		for (const id of ["token", "req"]) {
			const btn = doc.getElementById(`aus-modeltrends-x-${id}`);
			const drop = doc.getElementById(`aus-modeltrends-x-drop-${id}`);
			if (btn && drop && !t.closest(`#aus-modeltrends-x-${id}`) && !t.closest(`#aus-modeltrends-x-drop-${id}`)) drop.style.display = "none";
		}
	});
}
function renderXDrop(id) {
	const doc = getDoc$6();
	const drop = doc.getElementById(`aus-modeltrends-x-drop-${id}`);
	const label = doc.getElementById(`aus-modeltrends-x-label-${id}`);
	if (!drop) return;
	const cur = state[id].x;
	if (label) label.textContent = X_OPTIONS.find((o) => o.key === cur)?.label || cur;
	drop.innerHTML = X_OPTIONS.map((o) => {
		const active = o.key === cur;
		return `<div data-x="${o.key}" data-trend="${id}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active ? "background:var(--ds-card);font-weight:600;" : ""}">${o.label}</div>`;
	}).join("");
	drop.querySelectorAll("[data-x]").forEach((el) => {
		el.onclick = () => {
			const k = el.getAttribute("data-x"), tid = el.getAttribute("data-trend");
			state[tid].x = k;
			drop.style.display = "none";
			renderXDrop(tid);
			renderOne(tid, lastFiltered);
		};
	});
}
//#endregion
//#region src/ui/stats-view.ts
var currentRange = "30d";
var customStart = "";
var customEnd = "";
var pickerOpen = false;
var selectedModels = [];
var modelPickerOpen = false;
var selectedChat = STATS_FILTER_ALL;
var chatPickerOpen = false;
var selectedEndpoint = STATS_FILTER_ALL;
var endpointPickerOpen = false;
var selectedCredential = STATS_FILTER_ALL;
var credentialPickerOpen = false;
var lastStatsHistory = [];
var summarySortKey = null;
var summarySortDir = "desc";
var lastSummaryFiltered = null;
function updateSummarySortHeader() {
	const doc = getDoc$5();
	doc.querySelectorAll("#aus-model-summary thead th[data-sort-key]").forEach((th) => {
		th.style.color = "";
		th.style.fontWeight = "";
		const ind = th.querySelector(".aus-sort-ind");
		if (ind) ind.textContent = "";
	});
	if (summarySortKey) {
		const cur = doc.querySelector(`#aus-model-summary thead th[data-sort-key="${summarySortKey}"]`);
		if (cur) {
			cur.style.color = "var(--ds-text)";
			cur.style.fontWeight = "600";
			const ind = cur.querySelector(".aus-sort-ind");
			if (ind) ind.innerHTML = summarySortDir === "asc" ? icon("chevron-up", 14) : icon("chevron-down", 14);
		}
	}
}
function bindSummarySort() {
	const ths = getDoc$5().querySelectorAll("#aus-model-summary thead th[data-sort-key]");
	if (!ths.length) return;
	if (bindSummarySort._bound) return;
	bindSummarySort._bound = true;
	ths.forEach((th) => {
		th.addEventListener("click", () => {
			const key = th.getAttribute("data-sort-key");
			if (!key) return;
			if (summarySortKey === key) summarySortDir = summarySortDir === "asc" ? "desc" : "asc";
			else {
				summarySortKey = key;
				summarySortDir = "desc";
			}
			updateSummarySortHeader();
			if (lastSummaryFiltered) renderModelSummary(lastSummaryFiltered);
		});
		th.addEventListener("mouseenter", () => {
			if (th.getAttribute("data-sort-key") !== summarySortKey) th.style.color = "var(--ds-text)";
		});
		th.addEventListener("mouseleave", () => {
			if (th.getAttribute("data-sort-key") !== summarySortKey) th.style.color = "";
		});
	});
}
function getDoc$5() {
	return window.parent?.document ?? document;
}
function themeColor$1(name, fallback) {
	try {
		const doc = getDoc$5();
		const el = doc.getElementById("aus-panel") || doc.documentElement;
		return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
	} catch {
		return fallback;
	}
}
function getRangeDates() {
	const today = localDay$1(Date.now());
	const d = /* @__PURE__ */ new Date(today + "T00:00:00");
	const fmt = (x) => localDay$1(x.getTime());
	switch (currentRange) {
		case "today": return {
			start: today,
			end: today
		};
		case "yesterday": {
			const y = new Date(d);
			y.setDate(y.getDate() - 1);
			const s = fmt(y);
			return {
				start: s,
				end: s
			};
		}
		case "7d": {
			const s = new Date(d);
			s.setDate(s.getDate() - 6);
			return {
				start: fmt(s),
				end: today
			};
		}
		case "30d": {
			const s = new Date(d);
			s.setDate(s.getDate() - 29);
			return {
				start: fmt(s),
				end: today
			};
		}
		case "month": return {
			start: fmt(new Date(d.getFullYear(), d.getMonth(), 1)),
			end: today
		};
		case "lastMonth": {
			const s = new Date(d.getFullYear(), d.getMonth() - 1, 1);
			const e = new Date(d.getFullYear(), d.getMonth(), 0);
			return {
				start: fmt(s),
				end: fmt(e)
			};
		}
		case "custom": return {
			start: customStart || today,
			end: customEnd || today
		};
		case "all": return {
			start: "2020-01-01",
			end: today
		};
	}
	return {
		start: today,
		end: today
	};
}
function getRecordedModels(history) {
	const set = /* @__PURE__ */ new Set();
	for (const h of history || []) if (h?.model) set.add(h.model);
	return Array.from(set).sort();
}
function getRecordedChatsFrom(list) {
	const map = /* @__PURE__ */ new Map();
	for (const h of list || []) {
		const cid = h.chatId ?? null;
		const cname = h.chatName ?? null;
		const key = cid ?? "__null__";
		const timestamp = Number(h?.timestamp) || 0;
		if (!map.has(key)) map.set(key, {
			chatId: cid,
			chatName: cname,
			lastSeen: timestamp
		});
		else {
			const current = map.get(key);
			if (timestamp >= current.lastSeen && cname) current.chatName = cname;
			if (timestamp > current.lastSeen) current.lastSeen = timestamp;
		}
	}
	return Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen).map((v) => {
		let display = v.chatName || "";
		if (!display) {
			if (v.chatId) display = v.chatId.length > 18 ? v.chatId.slice(0, 8) + "…" + v.chatId.slice(-4) : v.chatId;
			else display = "未分组/旧数据";
		}
		return {
			chatId: v.chatId,
			chatName: v.chatName,
			displayName: display
		};
	});
}
function currentStatsFilter() {
	const { start, end } = getRangeDates();
	return {
		start,
		end,
		model: selectedModels.length ? selectedModels : STATS_FILTER_ALL,
		chat: selectedChat,
		endpoint: selectedEndpoint,
		credential: selectedCredential
	};
}
function updateRangeHighlight() {
	const doc = getDoc$5();
	doc.querySelectorAll("[data-range]").forEach((el) => {
		if (el.getAttribute("data-range") === currentRange) {
			el.style.background = "var(--ds-card)";
			el.style.fontWeight = "600";
		} else {
			el.style.background = "";
			el.style.fontWeight = "";
		}
	});
	const calWrap = doc.getElementById("aus-date-calendar");
	if (calWrap) calWrap.style.display = currentRange === "custom" ? "block" : "none";
}
function renderCalendar() {
	const doc = getDoc$5();
	const cal = doc.getElementById("aus-date-calendar");
	if (!cal) return;
	updateRangeHighlight();
	if (currentRange !== "custom") return;
	const todayStr = localDay$1(Date.now());
	if (!customStart) customStart = todayStr;
	if (!customEnd) customEnd = todayStr;
	cal.innerHTML = `<div style="padding:12px;min-width:260px;display:grid;gap:10px;">
    <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">开始日期</div><input type="date" id="aus-custom-start" value="${customStart}" max="${todayStr}" style="width:100%;padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);box-sizing:border-box;"></div>
    <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">结束日期</div><input type="date" id="aus-custom-end" value="${customEnd}" max="${todayStr}" style="width:100%;padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);box-sizing:border-box;"></div>
    <button id="aus-custom-apply" style="padding:8px 12px;border-radius:999px;background:var(--ds-black);color:var(--ds-black-text);border:none;font-size:var(--aus-fs-base);cursor:pointer;">应用</button>
  </div>`;
	const startEl = doc.getElementById("aus-custom-start");
	const endEl = doc.getElementById("aus-custom-end");
	const applyBtn = doc.getElementById("aus-custom-apply");
	const apply = () => {
		if (startEl) customStart = startEl.value || todayStr;
		if (endEl) customEnd = endEl.value || todayStr;
		if (customStart > customEnd) {
			const t = customStart;
			customStart = customEnd;
			customEnd = t;
			if (startEl) startEl.value = customStart;
			if (endEl) endEl.value = customEnd;
		}
		updatePickerLabel();
		updateRangeHighlight();
		renderStatsView();
	};
	if (startEl) startEl.onchange = apply;
	if (endEl) endEl.onchange = apply;
	if (applyBtn) applyBtn.onclick = apply;
}
function updatePickerLabel() {
	const label = getDoc$5().getElementById("aus-range-label");
	if (!label) return;
	const map = {
		all: "全部",
		today: "今天",
		yesterday: "昨天",
		"7d": "近 7 天",
		"30d": "近 30 天",
		month: "本月",
		lastMonth: "上月",
		custom: "自定义"
	};
	if (currentRange === "custom" && customStart && customEnd) label.textContent = customStart === customEnd ? customStart : `${customStart} ~ ${customEnd}`;
	else label.textContent = map[currentRange] || "近 30 天";
	updateRangeHighlight();
}
function renderModelPicker(modelsHist) {
	const doc = getDoc$5();
	const dropdown = doc.getElementById("aus-model-dropdown");
	const label = doc.getElementById("aus-model-label");
	if (!dropdown || !label) return;
	const models = getRecordedModels(modelsHist);
	const validModels = new Set(models);
	selectedModels = selectedModels.filter((model) => validModels.has(model));
	const allSelected = selectedModels.length === 0;
	label.textContent = allSelected ? "全部" : selectedModels.length === 1 ? selectedModels[0] : `已选 ${selectedModels.length} 项`;
	label.title = allSelected ? "全部模型" : selectedModels.join("、");
	let html = `<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${allSelected ? "background:var(--ds-card);font-weight:600;" : ""}"><input type="checkbox" data-model-all ${allSelected ? "checked" : ""} style="accent-color:var(--ds-text);" /><span>全部模型</span></label>`;
	for (const m of models) {
		const checked = selectedModels.includes(m);
		html += `<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${checked ? "background:var(--ds-card);font-weight:600;" : ""}"><input type="checkbox" data-model="${esc$2(m)}" ${checked ? "checked" : ""} style="accent-color:var(--ds-text);" /><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc$2(m)}</span></label>`;
	}
	if (!models.length) html += "<div style=\"padding:8px 10px;color:var(--ds-text-3);font-size:var(--aus-fs-base);\">暂无模型</div>";
	dropdown.innerHTML = html;
	const allInput = dropdown.querySelector("[data-model-all]");
	if (allInput) allInput.onchange = () => {
		selectedModels = [];
		renderStatsView();
	};
	dropdown.querySelectorAll("input[data-model]").forEach((el) => {
		el.onchange = () => {
			const model = el.getAttribute("data-model") || "";
			if (!model) return;
			if (el.checked) {
				if (!selectedModels.includes(model)) selectedModels.push(model);
			} else selectedModels = selectedModels.filter((item) => item !== model);
			renderStatsView();
		};
	});
}
function renderChatPicker(chatHist) {
	const doc = getDoc$5();
	const dropdown = doc.getElementById("aus-chat-dropdown");
	const label = doc.getElementById("aus-chat-label");
	if (!dropdown || !label) return;
	const list = chatHist ? getRecordedChatsFrom(chatHist) : getRecordedChatsFrom(getSelectedSave()?.history || []);
	const find = list.find((c) => (c.chatId ?? "__null__") === selectedChat);
	label.textContent = selectedChat === "__all__" ? "全部" : find?.displayName || selectedChat;
	label.title = find?.chatId || find?.displayName || "";
	let html = `<div data-chat="__all__" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${selectedChat === "__all__" ? "background:var(--ds-card);font-weight:600;" : ""}">全部</div>`;
	for (const c of list) {
		const key = c.chatId ?? "__null__";
		const active = key === selectedChat ? "background:var(--ds-card);font-weight:600;" : "";
		html += `<div data-chat="${esc$2(key)}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}" title="${esc$2(c.chatId || "")}">${esc$2(c.displayName)}</div>`;
	}
	if (!list.length) html += "<div style=\"padding:8px 10px;color:var(--ds-text-3);font-size:var(--aus-fs-base);\">暂无对话</div>";
	dropdown.innerHTML = html;
	dropdown.querySelectorAll("[data-chat]").forEach((el) => {
		el.onclick = () => {
			selectedChat = el.getAttribute("data-chat") || "__all__";
			chatPickerOpen = false;
			dropdown.style.display = "none";
			renderChatPicker(chatHist);
			renderStatsView();
		};
	});
}
function renderEndpointPicker(history) {
	const doc = getDoc$5();
	const dropdown = doc.getElementById("aus-endpoint-dropdown");
	const label = doc.getElementById("aus-endpoint-label");
	if (!dropdown || !label) return;
	const options = getEndpointFilterOptions(history || []);
	const current = options.find((option) => option.id === selectedEndpoint);
	label.textContent = selectedEndpoint === "__all__" ? "全部" : selectedEndpoint === "__unknown__" ? "未记录接入" : current?.label || selectedEndpoint;
	label.title = label.textContent;
	const optionHtml = (id, text, title) => {
		const active = id === selectedEndpoint ? "background:var(--ds-card);font-weight:600;" : "";
		return `<div data-endpoint="${esc$2(id)}" title="${esc$2(title)}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}">${esc$2(text)}</div>`;
	};
	let html = optionHtml(STATS_FILTER_ALL, "全部", "全部");
	for (const option of options) html += optionHtml(option.id, option.label, option.label);
	if (!options.length) html += "<div style=\"padding:8px 10px;color:var(--ds-text-3);font-size:var(--aus-fs-base);\">暂无接入记录</div>";
	dropdown.innerHTML = html;
	dropdown.querySelectorAll("[data-endpoint]").forEach((el) => {
		el.onclick = () => {
			selectedEndpoint = el.getAttribute("data-endpoint") || "__all__";
			selectedCredential = STATS_FILTER_ALL;
			endpointPickerOpen = false;
			dropdown.style.display = "none";
			renderStatsView();
		};
	});
}
function renderCredentialPicker$1(history, endpoint = selectedEndpoint) {
	const doc = getDoc$5();
	const dropdown = doc.getElementById("aus-credential-dropdown");
	const label = doc.getElementById("aus-credential-label");
	if (!dropdown || !label) return;
	const options = getCredentialFilterOptions(history || [], endpoint);
	const current = options.find((option) => option.id === selectedCredential);
	label.textContent = selectedCredential === "__all__" ? "全部" : selectedCredential === "__unknown__" ? "未识别密钥" : current?.label || selectedCredential;
	label.title = label.textContent;
	const optionHtml = (id, text, title) => {
		const active = id === selectedCredential ? "background:var(--ds-card);font-weight:600;" : "";
		return `<div data-credential="${esc$2(id)}" title="${esc$2(title)}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}">${esc$2(text)}</div>`;
	};
	let html = optionHtml(STATS_FILTER_ALL, "全部", "全部");
	for (const option of options) html += optionHtml(option.id, option.label, option.label);
	if (!options.length) html += "<div style=\"padding:8px 10px;color:var(--ds-text-3);font-size:var(--aus-fs-base);\">暂无密钥记录</div>";
	dropdown.innerHTML = html;
	dropdown.querySelectorAll("[data-credential]").forEach((el) => {
		el.onclick = () => {
			selectedCredential = el.getAttribute("data-credential") || "__all__";
			credentialPickerOpen = false;
			dropdown.style.display = "none";
			renderStatsView();
		};
	});
}
function positionFilterDropdown(btn, dropdown) {
	try {
		const panel = getDoc$5().getElementById("aus-panel");
		if (!panel) return;
		const panelRect = panel.getBoundingClientRect();
		const btnRect = btn.getBoundingClientRect();
		const available = Math.max(160, panelRect.width - 16);
		dropdown.style.maxWidth = `${available}px`;
		dropdown.style.boxSizing = "border-box";
		const width = Math.min(dropdown.offsetWidth || 220, available);
		const buttonLeft = btnRect.left - panelRect.left;
		const desiredLeft = Math.max(8, Math.min(buttonLeft, panelRect.width - width - 8));
		dropdown.style.left = `${desiredLeft - buttonLeft}px`;
		dropdown.style.right = "auto";
	} catch {}
}
function closeFilterDropdowns(except) {
	const doc = getDoc$5();
	if (except !== "range") {
		pickerOpen = false;
		const el = doc.getElementById("aus-range-dropdown");
		if (el) el.style.display = "none";
	}
	if (except !== "model") {
		modelPickerOpen = false;
		const el = doc.getElementById("aus-model-dropdown");
		if (el) el.style.display = "none";
	}
	if (except !== "chat") {
		chatPickerOpen = false;
		const el = doc.getElementById("aus-chat-dropdown");
		if (el) el.style.display = "none";
	}
	if (except !== "endpoint") {
		endpointPickerOpen = false;
		const el = doc.getElementById("aus-endpoint-dropdown");
		if (el) el.style.display = "none";
	}
	if (except !== "credential") {
		credentialPickerOpen = false;
		const el = doc.getElementById("aus-credential-dropdown");
		if (el) el.style.display = "none";
	}
}
function bindPicker() {
	const doc = getDoc$5();
	const btn = doc.getElementById("aus-range-btn");
	const dropdown = doc.getElementById("aus-range-dropdown");
	if (btn && dropdown) {
		btn.onclick = () => {
			pickerOpen = !pickerOpen;
			closeFilterDropdowns("range");
			dropdown.style.display = pickerOpen ? "flex" : "none";
			if (pickerOpen) {
				renderCalendar();
				positionFilterDropdown(btn, dropdown);
			}
		};
		doc.querySelectorAll("[data-range]").forEach((el) => {
			el.onclick = () => {
				const r = el.getAttribute("data-range");
				currentRange = r;
				if (r !== "custom") {
					customStart = "";
					customEnd = "";
				}
				pickerOpen = false;
				dropdown.style.display = "none";
				updatePickerLabel();
				renderStatsView();
			};
		});
	}
	const mBtn = doc.getElementById("aus-model-btn");
	const mDropdown = doc.getElementById("aus-model-dropdown");
	if (mBtn && mDropdown) mBtn.onclick = () => {
		modelPickerOpen = !modelPickerOpen;
		closeFilterDropdowns("model");
		mDropdown.style.display = modelPickerOpen ? "block" : "none";
		if (modelPickerOpen) {
			renderModelPicker(lastStatsHistory);
			positionFilterDropdown(mBtn, mDropdown);
		}
	};
	const cBtn = doc.getElementById("aus-chat-btn");
	const cDropdown = doc.getElementById("aus-chat-dropdown");
	if (cBtn && cDropdown) cBtn.onclick = () => {
		chatPickerOpen = !chatPickerOpen;
		closeFilterDropdowns("chat");
		cDropdown.style.display = chatPickerOpen ? "block" : "none";
		if (chatPickerOpen) (async () => {
			try {
				renderChatPicker(await getHistoryForStats());
			} catch {
				renderChatPicker();
			}
			positionFilterDropdown(cBtn, cDropdown);
		})();
	};
	const eBtn = doc.getElementById("aus-endpoint-btn");
	const eDropdown = doc.getElementById("aus-endpoint-dropdown");
	if (eBtn && eDropdown) eBtn.onclick = () => {
		endpointPickerOpen = !endpointPickerOpen;
		closeFilterDropdowns("endpoint");
		eDropdown.style.display = endpointPickerOpen ? "block" : "none";
		if (endpointPickerOpen) {
			renderEndpointPicker(lastStatsHistory);
			positionFilterDropdown(eBtn, eDropdown);
		}
	};
	const kBtn = doc.getElementById("aus-credential-btn");
	const kDropdown = doc.getElementById("aus-credential-dropdown");
	if (kBtn && kDropdown) kBtn.onclick = () => {
		credentialPickerOpen = !credentialPickerOpen;
		closeFilterDropdowns("credential");
		kDropdown.style.display = credentialPickerOpen ? "block" : "none";
		if (credentialPickerOpen) {
			renderCredentialPicker$1(lastStatsHistory);
			positionFilterDropdown(kBtn, kDropdown);
		}
	};
	doc.addEventListener("click", (e) => {
		const t = e.target;
		if (pickerOpen && !t.closest("#aus-range-dropdown") && !t.closest("#aus-range-btn")) {
			pickerOpen = false;
			const d = doc.getElementById("aus-range-dropdown");
			if (d) d.style.display = "none";
		}
		if (modelPickerOpen && !t.closest("#aus-model-dropdown") && !t.closest("#aus-model-btn")) {
			modelPickerOpen = false;
			const d = doc.getElementById("aus-model-dropdown");
			if (d) d.style.display = "none";
		}
		if (chatPickerOpen && !t.closest("#aus-chat-dropdown") && !t.closest("#aus-chat-btn")) {
			chatPickerOpen = false;
			const d = doc.getElementById("aus-chat-dropdown");
			if (d) d.style.display = "none";
		}
		if (endpointPickerOpen && !t.closest("#aus-endpoint-dropdown") && !t.closest("#aus-endpoint-btn")) {
			endpointPickerOpen = false;
			const d = doc.getElementById("aus-endpoint-dropdown");
			if (d) d.style.display = "none";
		}
		if (credentialPickerOpen && !t.closest("#aus-credential-dropdown") && !t.closest("#aus-credential-btn")) {
			credentialPickerOpen = false;
			const d = doc.getElementById("aus-credential-dropdown");
			if (d) d.style.display = "none";
		}
	});
}
var chartYOpen = false;
var chartXOpen = false;
function renderChartSelectors() {
	const doc = getDoc$5();
	const yBtn = doc.getElementById("aus-chart-y-btn");
	const xBtn = doc.getElementById("aus-chart-x-btn");
	const yDrop = doc.getElementById("aus-chart-y-dropdown");
	const xDrop = doc.getElementById("aus-chart-x-dropdown");
	const yLabel = doc.getElementById("aus-chart-y-label");
	const xLabel = doc.getElementById("aus-chart-x-label");
	if (!yBtn || !xBtn || !yDrop || !xDrop) return;
	const ySel = getYSelected();
	if (yLabel) yLabel.textContent = ySel.length ? `${ySel.length} 项` : "选择";
	let yHtml = "";
	for (const group of Y_GROUPS) {
		const opts = Y_OPTIONS.filter((o) => o.group === group.key);
		if (!opts.length) continue;
		yHtml += `<div style="padding:6px 8px 2px;font-size:var(--aus-fs-xs);color:var(--ds-text-3);font-weight:600;">${group.label}</div>`;
		for (const opt of opts) {
			const checked = ySel.includes(opt.key);
			yHtml += `<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:var(--aus-fs-sm);${checked ? "background:var(--ds-card);" : ""}"><input type="checkbox" data-ykey="${opt.key}" ${checked ? "checked" : ""} style="accent-color:var(--ds-text);" /><span style="display:inline-block;width:8px;height:8px;background:${opt.color};border-radius:2px;"></span>${opt.label}<span style="margin-left:auto;color:var(--ds-text-3);font-size:var(--aus-fs-sm);">${opt.unit}</span></label>`;
		}
	}
	const typeSel = getChartType();
	const typeOpts = [
		{
			v: "auto",
			l: "自动"
		},
		{
			v: "bar",
			l: "柱状"
		},
		{
			v: "line",
			l: "曲线"
		},
		{
			v: "area",
			l: "面积"
		}
	];
	yHtml += `<div style="margin-top:4px;border-top:1px solid var(--ds-border);padding:6px 8px 2px;font-size:var(--aus-fs-xs);color:var(--ds-text-3);font-weight:600;">展示方式</div>`;
	yHtml += `<div style="display:flex;gap:4px;flex-wrap:wrap;padding:2px 6px 6px;">${typeOpts.map((t) => `<div data-chart-type="${t.v}" style="padding:4px 9px;border-radius:999px;border:1px solid var(--ds-border);font-size:var(--aus-fs-sm);cursor:pointer;${typeSel === t.v ? "background:var(--ds-card);font-weight:600;" : ""}">${t.l}</div>`).join("")}</div>`;
	const axisSel = getAxisLabelMode();
	const axisOpts = [
		{
			v: "auto",
			l: "自动"
		},
		{
			v: "all",
			l: "全部"
		},
		{
			v: "hide",
			l: "隐藏"
		}
	];
	yHtml += `<div style="padding:2px 8px 2px;font-size:var(--aus-fs-xs);color:var(--ds-text-3);font-weight:600;">轴标签</div>`;
	yHtml += `<div style="display:flex;gap:4px;flex-wrap:wrap;padding:2px 6px 8px;align-items:center;"><span style="font-size:var(--aus-fs-xs);color:var(--ds-text-3);">左右轴合计 &gt; 2 时默认隐藏叠加</span>${axisOpts.map((a) => `<div data-axis-label="${a.v}" style="padding:4px 9px;border-radius:999px;border:1px solid var(--ds-border);font-size:var(--aus-fs-sm);cursor:pointer;${axisSel === a.v ? "background:var(--ds-card);font-weight:600;" : ""}">${a.l}</div>`).join("")}</div>`;
	yDrop.innerHTML = yHtml;
	yDrop.querySelectorAll("input[data-ykey]").forEach((el) => {
		el.onchange = () => {
			toggleY(el.getAttribute("data-ykey"));
			renderChartSelectors();
			renderStatsView();
		};
	});
	yDrop.querySelectorAll("[data-chart-type]").forEach((el) => {
		el.onclick = () => {
			setChartType(el.getAttribute("data-chart-type"));
			renderChartSelectors();
			renderStatsView();
		};
	});
	yDrop.querySelectorAll("[data-axis-label]").forEach((el) => {
		el.onclick = () => {
			setAxisLabelMode(el.getAttribute("data-axis-label"));
			renderChartSelectors();
			renderStatsView();
		};
	});
	const xSel = getXSelected();
	const xMap = {
		round: "轮次",
		hour: "每小时",
		day: "每日",
		week: "每周",
		month: "每月"
	};
	if (xLabel) xLabel.textContent = xMap[xSel] || xSel;
	let xHtml = "";
	for (const opt of X_OPTIONS) {
		const active = opt.key === xSel;
		xHtml += `<div data-xkey="${opt.key}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active ? "background:var(--ds-card);font-weight:600;" : ""}">${opt.label}</div>`;
	}
	xDrop.innerHTML = xHtml;
	xDrop.querySelectorAll("[data-xkey]").forEach((el) => {
		el.onclick = () => {
			setXSelected(el.getAttribute("data-xkey"));
			chartXOpen = false;
			xDrop.style.display = "none";
			renderChartSelectors();
			renderStatsView();
		};
	});
}
function bindChartSelectors() {
	const doc = getDoc$5();
	const yBtn = doc.getElementById("aus-chart-y-btn");
	const yDrop = doc.getElementById("aus-chart-y-dropdown");
	const xBtn = doc.getElementById("aus-chart-x-btn");
	const xDrop = doc.getElementById("aus-chart-x-dropdown");
	if (yBtn && yDrop) yBtn.onclick = () => {
		chartYOpen = !chartYOpen;
		yDrop.style.display = chartYOpen ? "block" : "none";
		if (chartYOpen) {
			const xD = doc.getElementById("aus-chart-x-dropdown");
			if (xD) {
				xD.style.display = "none";
				chartXOpen = false;
			}
			renderChartSelectors();
		}
	};
	if (xBtn && xDrop) xBtn.onclick = () => {
		chartXOpen = !chartXOpen;
		xDrop.style.display = chartXOpen ? "block" : "none";
		if (chartXOpen) {
			const yD = doc.getElementById("aus-chart-y-dropdown");
			if (yD) {
				yD.style.display = "none";
				chartYOpen = false;
			}
			renderChartSelectors();
		}
	};
	doc.addEventListener("click", (e) => {
		const t = e.target;
		if (chartYOpen && !t.closest("#aus-chart-y-dropdown") && !t.closest("#aus-chart-y-btn")) {
			chartYOpen = false;
			const d = doc.getElementById("aus-chart-y-dropdown");
			if (d) d.style.display = "none";
		}
		if (chartXOpen && !t.closest("#aus-chart-x-dropdown") && !t.closest("#aus-chart-x-btn")) {
			chartXOpen = false;
			const d = doc.getElementById("aus-chart-x-dropdown");
			if (d) d.style.display = "none";
		}
	});
}
var chart = null;
async function renderChart(filteredRaw) {
	const doc = getDoc$5();
	const el = doc.getElementById("aus-stats-chart");
	if (!el) return;
	const { labels, series } = aggregateForChart(filteredRaw, getYSelected(), getXSelected());
	if (!labels.length) {
		if (chart) {
			try {
				chart.dispose();
			} catch {}
			chart = null;
		}
		el.innerHTML = "<div style=\"text-align:center;padding:40px;color:var(--ds-text-3);font-size:var(--aus-fs-base);\">该筛选无数据（历史 " + filteredRaw.length + " 条）</div>";
		return;
	}
	const w = el.clientWidth, h = el.clientHeight;
	if (w === 0 || h === 0) {
		const statsView = doc.querySelector("[data-view=\"stats\"]");
		if (statsView ? statsView.style.display === "none" || statsView.offsetParent === null : false) {
			try {
				const { log } = await import("./logger-8RGXnvfI.js").then((n) => n.n);
				log.debug("renderChart 容器隐藏，等待切换");
			} catch {}
			return;
		}
		const tries = renderChart._retryCount || 0;
		if (tries >= 80) {
			el.innerHTML = "<div style=\"text-align:center;padding:20px;color:var(--ds-text-3);font-size:var(--aus-fs-sm);\">图表容器未就绪，请切换视图重试</div>";
			return;
		}
		renderChart._retryCount = tries + 1;
		setTimeout(() => renderChart(filteredRaw), 120);
		return;
	}
	renderChart._retryCount = 0;
	let echarts;
	try {
		echarts = await import("./core-ooVr14Lq.js").then(async (ec) => {
			const { BarChart, LineChart } = await import("./charts-6tQsz9zF.js");
			const { GridComponent, TooltipComponent } = await import("./components-jF_EZHLs.js");
			const { CanvasRenderer } = await import("./renderers-DtxFY9_W.js");
			ec.use([
				BarChart,
				LineChart,
				GridComponent,
				TooltipComponent,
				CanvasRenderer
			]);
			return ec;
		});
	} catch (e) {
		el.innerHTML = "<div style=\"text-align:center;padding:20px;color:#DC2626;font-size:var(--aus-fs-base);\">图表加载失败，请检查网络后重试</div>";
		console.error("[Api-Usage] echarts load failed", e);
		return;
	}
	if (!chart) chart = echarts.init(el);
	else try {
		chart.resize();
	} catch {}
	const kinds = new Set(series.map((s) => s.kind));
	const hasToken = kinds.has("token");
	const hasCost = kinds.has("cost");
	const hasCount = kinds.has("count");
	const hasDuration = kinds.has("duration");
	const hasRate = kinds.has("rate");
	const hasPercent = kinds.has("percent");
	const chartType = getChartType();
	const cBorder = themeColor$1("--ds-border", "#E5E7EB");
	const cCard = themeColor$1("--ds-card", "#F6F7F8");
	const cText3 = themeColor$1("--ds-text-3", "#9CA3AF");
	const curCur = (() => {
		try {
			return getDisplayCurrency();
		} catch {
			return {
				code: "CNY",
				symbol: "¥",
				rate: 1
			};
		}
	})();
	if (hasCost) {
		for (const s of series) if (s.kind === "cost") s.data = s.data.map((v) => curCur.code === "USD" ? Number((Number(v) / curCur.rate).toFixed(4)) : v);
	}
	const narrow = w < 560;
	const labelSize = narrow ? 10 : 12;
	const axisGap = narrow ? 40 : 46;
	const compactNum = (v) => {
		const n = Number(v);
		if (!isFinite(n)) return "0";
		if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(Math.abs(n) % 1e4 ? 1 : 0) + "万";
		if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(Math.abs(n) % 1e3 ? 1 : 0) + "k";
		return String(Math.round(n));
	};
	const yAxis = [];
	const axisIndex = {};
	let rightOffset = 0;
	const labelStyle = {
		color: cText3,
		fontSize: labelSize
	};
	const addAxis = (key, cfg, left = false, gap = axisGap) => {
		const axis = {
			type: "value",
			...cfg
		};
		if (left) axis.position = "left";
		else {
			axis.position = "right";
			axis.offset = rightOffset;
			rightOffset += gap;
		}
		axisIndex[key] = yAxis.length;
		yAxis.push(axis);
	};
	if (hasToken) addAxis("token", {
		name: narrow ? "" : "tokens",
		axisLine: { show: false },
		splitLine: { lineStyle: { color: cCard } },
		axisLabel: {
			...labelStyle,
			formatter: compactNum
		}
	}, true);
	if (hasCount) addAxis("count", {
		name: narrow ? "" : "次",
		minInterval: 1,
		axisLine: { show: false },
		splitLine: { show: false },
		axisLabel: narrow ? { show: false } : labelStyle
	}, !hasToken, narrow ? 12 : axisGap);
	if (hasCost) addAxis("cost", {
		name: narrow ? "" : curCur.code,
		axisLine: { show: false },
		splitLine: { show: false },
		axisLabel: {
			...labelStyle,
			formatter: (v) => curCur.symbol + Number(v).toFixed(narrow ? 3 : 4)
		}
	});
	if (hasDuration) addAxis("duration", {
		name: narrow ? "" : "耗时 s",
		axisLine: { show: false },
		splitLine: { show: false },
		axisLabel: {
			...labelStyle,
			formatter: (v) => Number(v).toFixed(1)
		}
	});
	if (hasRate) addAxis("rate", {
		name: narrow ? "" : "速率 t/s",
		axisLine: { show: false },
		splitLine: { show: false },
		axisLabel: {
			...labelStyle,
			formatter: (v) => Math.round(v)
		}
	});
	if (hasPercent) addAxis("percent", {
		name: narrow ? "" : "%",
		min: 0,
		max: 100,
		axisLine: { show: false },
		splitLine: { show: false },
		axisLabel: {
			...labelStyle,
			formatter: (v) => v + "%"
		}
	});
	const axisMode = getAxisLabelMode();
	const totalAxisCount = yAxis.length;
	if (axisMode === "hide" || axisMode === "auto" && totalAxisCount > 2) {
		for (const axis of yAxis) {
			if (axis.position !== "right") continue;
			axis.name = "";
			axis.axisLabel = {
				...axis.axisLabel || {},
				show: false
			};
			axis.axisLine = { show: false };
			axis.axisTick = { show: false };
			axis.offset = 0;
		}
		rightOffset = 0;
	}
	const tokenSeries = series.filter((s) => s.kind === "token");
	const lastTokenIdx = tokenSeries.length ? series.indexOf(tokenSeries[tokenSeries.length - 1]) : -1;
	const seriesOpt = series.map((s, idx) => {
		const kind = s.kind;
		let type;
		if (chartType === "bar") type = "bar";
		else if (chartType === "line" || chartType === "area") type = "line";
		else type = kind === "token" || kind === "count" ? "bar" : "line";
		const isStack = kind === "token" && type === "bar";
		const isTop = idx === lastTokenIdx;
		let col = s.color;
		if (col === "#111827" || typeof col === "string" && col.indexOf("var(") === 0) col = themeColor$1("--ds-text", "#111827");
		const base = {
			name: s.name,
			type,
			yAxisIndex: axisIndex[kind] ?? 0,
			data: s.data,
			emphasis: { focus: "series" },
			itemStyle: { color: col }
		};
		if (type === "bar") {
			base.barMaxWidth = 18;
			if (isStack) {
				base.stack = "token";
				base.barGap = "-100%";
			}
			base.itemStyle.borderRadius = isStack ? isTop ? [
				4,
				4,
				0,
				0
			] : [
				0,
				0,
				0,
				0
			] : [
				4,
				4,
				0,
				0
			];
		} else {
			base.smooth = true;
			base.symbol = "circle";
			base.symbolSize = 4;
			base.lineStyle = {
				color: col,
				width: kind === "percent" ? 1.6 : 2,
				type: kind === "percent" ? "dashed" : "solid"
			};
			if (chartType === "area" || chartType === "auto" && kind === "percent") base.areaStyle = {
				color: col,
				opacity: .08
			};
		}
		return base;
	});
	const cCardInner = themeColor$1("--ds-card-inner", "#FFFFFF");
	const cText = themeColor$1("--ds-text", "#111827");
	const cw = w || 320;
	const maxLabels = Math.max(8, Math.floor(cw / (cw < 500 ? 42 : cw < 760 ? 56 : 68)));
	const xInterval = labels.length <= maxLabels ? 0 : Math.ceil(labels.length / maxLabels) - 1;
	const needZoom = labels.length > maxLabels;
	chart.setOption({
		backgroundColor: "transparent",
		tooltip: {
			trigger: "axis",
			backgroundColor: cCardInner,
			borderColor: cBorder,
			borderWidth: 1,
			textStyle: {
				color: cText,
				fontSize: 12
			},
			formatter: (params) => {
				if (!params?.length) return "";
				const idx = params[0].dataIndex;
				const label = labels[idx];
				let html = `<div style="font-weight:600;margin-bottom:6px;">${esc$2(label)}</div>`;
				for (const p of params) {
					const v = p.value;
					const meta = Y_OPTIONS.find((o) => o.label === p.seriesName);
					const kind = meta?.kind;
					let disp;
					if (kind === "cost") disp = curCur.symbol + Number(v).toFixed(4) + " " + curCur.code;
					else if (kind === "percent") disp = Number(v).toFixed(1) + " %";
					else if (kind === "duration") disp = Number(v).toFixed(2) + " s";
					else if (kind === "rate") disp = Math.round(Number(v)) + " t/s";
					else if (kind === "count") disp = Number(v).toLocaleString() + " 次";
					else disp = Number(v).toLocaleString() + " " + (meta?.unit || "");
					html += `<div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;background:${p.color};border-radius:2px;"></span>${esc$2(p.seriesName)}<span style="margin-left:auto;font-weight:600;">${disp}</span></div>`;
				}
				return `<div style="padding:4px 2px;min-width:180px;">${html}</div>`;
			}
		},
		grid: {
			left: narrow ? 40 : 50,
			right: 12 + rightOffset,
			top: 8,
			bottom: 28
		},
		dataZoom: needZoom ? [{
			type: "inside",
			xAxisIndex: 0,
			start: Math.max(0, (labels.length - maxLabels) / labels.length * 100),
			end: 100,
			zoomOnMouseWheel: false,
			moveOnMouseMove: true
		}] : void 0,
		xAxis: {
			type: "category",
			data: labels,
			axisLine: { lineStyle: { color: cBorder } },
			axisLabel: {
				color: cText3,
				fontSize: 12,
				interval: xInterval,
				rotate: labels.length > 12 ? 30 : 0,
				hideOverlap: false
			}
		},
		yAxis: yAxis.length ? yAxis : {
			type: "value",
			axisLabel: {
				color: cText3,
				fontSize: 12
			}
		},
		series: seriesOpt
	}, true);
	setTimeout(() => {
		try {
			chart.resize();
		} catch {}
	}, 60);
}
function renderModelSummary(filtered) {
	const tbody = getDoc$5().getElementById("aus-summary-tbody");
	if (!tbody) return;
	lastSummaryFiltered = filtered;
	try {
		bindSummarySort();
	} catch {}
	try {
		updateSummarySortHeader();
	} catch {}
	if (!filtered.length) {
		tbody.innerHTML = "<tr><td colspan=\"10\" style=\"text-align:center;padding:16px;color:var(--ds-text-3);\">暂无数据</td></tr>";
		return;
	}
	const map = {};
	for (const h of filtered) {
		const m = h.model || "unknown";
		if (!map[m]) map[m] = {
			count: 0,
			hit: 0,
			miss: 0,
			out: 0,
			total: 0,
			cost: 0,
			dur: 0,
			rate: 0,
			rateCnt: 0
		};
		const e = map[m];
		e.count++;
		e.hit += h.cache_hit_tokens || 0;
		e.miss += h.cache_miss_tokens || 0;
		e.out += h.completion_tokens || 0;
		e.total += h.total_tokens || 0;
		e.cost += h.cost || 0;
		if (h.duration) e.dur += h.duration;
		if (h.tokenRate) {
			e.rate += h.tokenRate;
			e.rateCnt++;
		}
	}
	let list = Object.keys(map).map((m) => {
		const e = map[m];
		const avgCost = e.count ? e.cost / e.count : 0;
		const avgDurVal = e.count && e.dur ? e.dur / e.count : -1;
		const avgDurStr = e.count && e.dur ? (e.dur / e.count / 1e3).toFixed(1) + "s" : "—";
		const avgRateVal = e.rateCnt ? e.rate / e.rateCnt : -1;
		const avgRateStr = e.rateCnt ? Math.round(e.rate / e.rateCnt) + " t/s" : "—";
		return {
			m,
			count: e.count,
			hit: e.hit,
			miss: e.miss,
			out: e.out,
			total: e.total,
			cost: e.cost,
			avgCost,
			avgDurVal,
			avgRateVal,
			avgDurStr,
			avgRateStr
		};
	});
	if (summarySortKey) {
		const dir = summarySortDir === "asc" ? 1 : -1;
		const getVal = (r) => {
			switch (summarySortKey) {
				case "count": return r.count;
				case "hit": return r.hit;
				case "miss": return r.miss;
				case "out": return r.out;
				case "total": return r.total;
				case "cost": return r.cost;
				case "avgCost": return r.avgCost;
				case "avgDur": return r.avgDurVal;
				case "avgRate": return r.avgRateVal;
				default: return 0;
			}
		};
		list.sort((a, b) => {
			const av = getVal(a), bv = getVal(b);
			if (av === bv) return a.m.localeCompare(b.m);
			return (av - bv) * dir;
		});
	} else list.sort((a, b) => a.m.localeCompare(b.m));
	const fmtC = (v) => {
		try {
			return formatMoney(v || 0, 4);
		} catch {
			return "¥" + (v || 0).toFixed(4) + " CNY";
		}
	};
	tbody.innerHTML = list.map((r) => {
		return `<tr style="border-bottom:1px solid var(--ds-card);"><td style="padding:6px 8px;text-align:left;color:var(--ds-text);font-weight:500;max-width:140px;overflow:hidden;text-overflow:ellipsis;">${esc$2(r.m)}</td><td style="padding:6px 8px;text-align:right;">${r.count}</td><td style="padding:6px 8px;text-align:right;color:#0BA25E;">${r.hit.toLocaleString()}</td><td style="padding:6px 8px;text-align:right;color:#DC2626;">${r.miss.toLocaleString()}</td><td style="padding:6px 8px;text-align:right;color:#6366F1;">${r.out.toLocaleString()}</td><td style="padding:6px 8px;text-align:right;font-weight:600;">${r.total.toLocaleString()}</td><td style="padding:6px 8px;text-align:right;color:var(--ds-text);">${fmtC(r.cost)}</td><td style="padding:6px 8px;text-align:right;">${fmtC(r.avgCost)}</td><td style="padding:6px 8px;text-align:right;color:var(--ds-text-2);">${r.avgDurStr}</td><td style="padding:6px 8px;text-align:right;color:#0BA25E;">${r.avgRateStr}</td></tr>`;
	}).join("");
}
var cachedAllHistory = null;
var allHistoryPromise = null;
var statsHistoryWarningShown = false;
function invalidateStatsCache() {
	cachedAllHistory = null;
	lastStatsHistory = [];
}
try {
	on(DataEvents.HISTORY_ADDED, invalidateStatsCache);
	on(DataEvents.UPDATED, invalidateStatsCache);
} catch {}
async function getHistoryForStats() {
	const hot = getSelectedSave()?.history || [];
	if (cachedAllHistory) {
		const keyOf = historyRecordKey;
		const seen = new Set(cachedAllHistory.map(keyOf));
		const fresh = hot.filter((h) => !seen.has(keyOf(h)));
		if (fresh.length) cachedAllHistory = [...fresh, ...cachedAllHistory].sort((a, b) => b.timestamp - a.timestamp);
		return cachedAllHistory;
	}
	if (allHistoryPromise) return allHistoryPromise;
	allHistoryPromise = (async () => {
		try {
			const mod = await import("./persistence-C4IJVd-B.js").then((n) => n.s);
			if (mod.getAllHistory) {
				const result = await mod.getAllHistory() || hot;
				cachedAllHistory = result;
				return result;
			}
		} catch (error) {
			if (!statsHistoryWarningShown) {
				statsHistoryWarningShown = true;
				toast("warning", "冷历史读取失败，当前统计可能只包含近期记录");
			}
			console.error("[Api-Usage] 全量历史读取失败", error);
		} finally {
			allHistoryPromise = null;
		}
		cachedAllHistory = hot;
		return hot;
	})();
	return allHistoryPromise;
}
async function renderStatsView() {
	const doc = getDoc$5();
	if (!getSelectedSave()) return;
	const allHistory = await getHistoryForStats();
	lastStatsHistory = allHistory;
	const endpointOptions = getEndpointFilterOptions(allHistory);
	if (!(/* @__PURE__ */ new Set(["__all__", ...endpointOptions.map((option) => option.id)])).has(selectedEndpoint)) {
		selectedEndpoint = STATS_FILTER_ALL;
		selectedCredential = STATS_FILTER_ALL;
	}
	const credentialOptions = getCredentialFilterOptions(allHistory, selectedEndpoint);
	if (!(/* @__PURE__ */ new Set(["__all__", ...credentialOptions.map((option) => option.id)])).has(selectedCredential)) selectedCredential = STATS_FILTER_ALL;
	const summaryFiltered = filterStatsHistory(allHistory, currentStatsFilter());
	const chartFiltered = summaryFiltered;
	let totalCost = 0, totalReq = summaryFiltered.length, totalTok = 0;
	for (const e of summaryFiltered) {
		totalCost += e.cost || 0;
		totalTok += e.total_tokens || 0;
	}
	const costEl = doc.getElementById("aus-stats-cost");
	if (costEl) try {
		costEl.textContent = formatMoney(totalCost, 2);
	} catch {
		costEl.textContent = "¥" + totalCost.toFixed(2) + " CNY";
	}
	const reqEl = doc.getElementById("aus-stats-req");
	if (reqEl) reqEl.textContent = String(totalReq);
	const tokEl = doc.getElementById("aus-stats-tok");
	if (tokEl) tokEl.textContent = totalTok.toLocaleString("zh-CN");
	renderStatsFour(summaryFiltered);
	renderModelSummary(summaryFiltered);
	renderModelPicker(allHistory);
	renderChatPicker(allHistory);
	renderEndpointPicker(allHistory);
	renderCredentialPicker$1(allHistory);
	renderChartSelectors();
	const statsViewEl = doc.querySelector("[data-view=\"stats\"]");
	if (!(statsViewEl ? statsViewEl.style.display === "none" || statsViewEl.offsetParent === null : false)) {
		renderChart(chartFiltered);
		renderExtraCharts(chartFiltered);
		renderModelTrends(chartFiltered);
	} else try {
		const { log } = await import("./logger-8RGXnvfI.js").then((n) => n.n);
		log.debug("stats 隐藏，跳过图表初始化");
	} catch {}
}
function ensureStatsFour() {
	const def = [
		"avg_cost",
		"avg_tokens",
		"avg_think_ratio",
		"truncation_rate"
	];
	let cur = state$2.settings.statsFour;
	const valid = new Set(FOUR_OPTIONS.map((o) => o.key));
	if (!Array.isArray(cur) || cur.length !== 4 || cur.some((k) => !valid.has(k))) {
		cur = def.slice();
		state$2.settings.statsFour = cur;
		try {
			saveHot({ settings: state$2.settings });
		} catch {}
		return cur;
	}
	return cur;
}
var statsFourBound = false;
function bindStatsFour() {
	if (statsFourBound) return;
	statsFourBound = true;
	const doc = getDoc$5();
	doc.addEventListener("click", (e) => {
		const t = e.target;
		for (let i = 0; i < 4; i++) {
			const drop = doc.getElementById(`aus-stats-four-drop-${i}`);
			const btn = doc.getElementById(`aus-stats-four-btn-${i}`);
			if (drop && btn && !t.closest(`#aus-stats-four-drop-${i}`) && !t.closest(`#aus-stats-four-btn-${i}`)) drop.style.display = "none";
		}
	});
}
function openStatsFourDrop(idx, v) {
	const drop = getDoc$5().getElementById(`aus-stats-four-drop-${idx}`);
	if (!drop) return;
	const cur = ensureStatsFour()[idx];
	drop.innerHTML = FOUR_OPTIONS.map((o) => {
		const active = o.key === cur;
		return `<div data-sfour="${idx}" data-key="${o.key}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-sm);${active ? "background:var(--ds-card);font-weight:600;color:var(--ds-text);" : ""}">${o.label}</div>`;
	}).join("");
	drop.querySelectorAll("[data-sfour]").forEach((el) => {
		el.onclick = () => {
			const key = el.getAttribute("data-key");
			const at = Number(el.getAttribute("data-sfour"));
			const arr = ensureStatsFour().slice();
			arr[at] = key;
			state$2.settings.statsFour = arr;
			try {
				saveHot({ settings: state$2.settings });
			} catch {}
			drop.style.display = "none";
			renderStatsView();
		};
	});
	drop.style.display = drop.style.display === "block" ? "none" : "block";
}
function renderStatsFour(filtered) {
	const doc = getDoc$5();
	const host = doc.getElementById("aus-stats-four");
	if (!host) return;
	const v = computeStatsFour(filtered || []);
	const keys = ensureStatsFour();
	bindStatsFour();
	host.innerHTML = keys.map((k, i) => {
		const d = getFourDisplay(k, v);
		const valColor = k === "avg_rate" ? "var(--ds-green)" : "var(--ds-text)";
		return `<div class="ds-card" style="padding:14px;position:relative;overflow:visible;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
        <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.title}</div>
        <button id="aus-stats-four-btn-${i}" title="切换指标" style="flex-shrink:0;padding:4px 7px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text-2);font-size:var(--aus-fs-sm);cursor:pointer;line-height:1;">${icon("chevron-down", 14)}</button>
        <div id="aus-stats-four-drop-${i}" style="display:none;position:absolute;top:38px;right:8px;z-index:6;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:180px;max-height:260px;overflow:auto;"></div>
      </div>
      <div style="font-size:18px;font-weight:600;color:${valColor};margin-top:6px;word-break:break-all;">${d.html}</div>
    </div>`;
	}).join("");
	keys.forEach((_, i) => {
		const btn = doc.getElementById(`aus-stats-four-btn-${i}`);
		if (btn) btn.onclick = () => openStatsFourDrop(i, v);
	});
}
function initStatsView() {
	bindPicker();
	bindChartSelectors();
	try {
		bindSummarySort();
	} catch {}
	try {
		initModelTrends();
	} catch {}
	updatePickerLabel();
	renderStatsView();
}
//#endregion
//#region src/stats/forecast.ts
function ewma(arr, alpha = .3) {
	if (!arr.length) return 0;
	let v = arr[arr.length - 1];
	for (let i = arr.length - 2; i >= 0; i--) v = alpha * arr[i] + (1 - alpha) * v;
	return v;
}
/** 检测回落点：prompt 骤降 >=30% 则分段，只用最后一段 */
function segmentByDrop(sorted) {
	if (sorted.length < 2) return {
		seg: sorted,
		segStart: 0
	};
	let cut = 0;
	for (let i = 1; i < sorted.length; i++) {
		const prev = sorted[i - 1].prompt_tokens ?? (sorted[i - 1].cache_hit_tokens || 0) + (sorted[i - 1].cache_miss_tokens || 0);
		const cur = sorted[i].prompt_tokens ?? (sorted[i].cache_hit_tokens || 0) + (sorted[i].cache_miss_tokens || 0);
		if (prev > 0 && cur / prev <= .7) cut = i;
	}
	return {
		seg: sorted.slice(cut),
		segStart: cut
	};
}
function linearFit(y) {
	const n = y.length;
	if (n < 3) {
		const deltas = [];
		for (let i = 1; i < n; i++) deltas.push(y[i] - y[i - 1]);
		const delta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
		return {
			C0: n ? y[0] : 0,
			delta,
			sigma: 0,
			r2: 0
		};
	}
	let sx = 0, sy = 0, sxx = 0, sxy = 0;
	for (let i = 0; i < n; i++) {
		sx += i;
		sy += y[i];
		sxx += i * i;
		sxy += i * y[i];
	}
	const denom = n * sxx - sx * sx;
	const delta = denom ? (n * sxy - sx * sy) / denom : 0;
	const C0 = (sy - delta * sx) / n;
	let rss = 0, tss = 0;
	const mean = sy / n;
	for (let i = 0; i < n; i++) {
		const pred = C0 + delta * i;
		rss += (y[i] - pred) ** 2;
		tss += (y[i] - mean) ** 2;
	}
	return {
		C0,
		delta,
		sigma: Math.sqrt(rss / n),
		r2: tss ? 1 - rss / tss : 0
	};
}
function logFit(y) {
	const n = y.length;
	if (n < 6) return {
		C0: y[0] || 0,
		delta: 0,
		sigma: 0,
		r2: -1,
		a: 0,
		b: y[0] || 0
	};
	const xs = y.map((_, i) => Math.log(i + 1));
	let sx = 0, sy = 0, sxx = 0, sxy = 0;
	for (let i = 0; i < n; i++) {
		sx += xs[i];
		sy += y[i];
		sxx += xs[i] * xs[i];
		sxy += xs[i] * y[i];
	}
	const denom = n * sxx - sx * sx;
	const a = denom ? (n * sxy - sx * sy) / denom : 0;
	const b = (sy - a * sx) / n;
	let rss = 0, tss = 0;
	const mean = sy / n;
	for (let i = 0; i < n; i++) {
		const pred = a * xs[i] + b;
		rss += (y[i] - pred) ** 2;
		tss += (y[i] - mean) ** 2;
	}
	return {
		C0: b,
		delta: a,
		sigma: Math.sqrt(rss / n),
		r2: tss ? 1 - rss / tss : 0,
		a,
		b
	};
}
function fitSegments(history, chatId) {
	const filtered = chatId ? history.filter((h) => (h.chatId ?? null) === chatId) : history.slice();
	if (filtered.length < 1) return null;
	const sorted = [...filtered].sort((a, b) => a.timestamp - b.timestamp);
	const promptOf = (h) => h.prompt_tokens ?? (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0);
	const { seg, segStart } = segmentByDrop(sorted);
	const y = seg.map(promptOf);
	if (y.length < 6) {
		const C0 = y[0] || 0;
		const delta = y.length >= 2 ? (y[y.length - 1] - y[0]) / (y.length - 1) : 0;
		const mean = y.reduce((a, b) => a + b, 0) / y.length;
		return finalize(seg, sorted, C0, delta, Math.sqrt(y.reduce((a, b) => a + (b - mean) ** 2, 0) / y.length), 0, "recent-mean", segStart);
	}
	const lf = linearFit(y);
	const gf = logFit(y);
	if (gf.r2 > lf.r2 && gf.r2 > .5) {
		const approxDelta = y.length >= 2 ? y[y.length - 1] - y[y.length - 2] : 0;
		return finalize(seg, sorted, gf.b, approxDelta, gf.sigma, gf.r2, "log", segStart, {
			C0: gf.b,
			delta: approxDelta,
			sigma: gf.sigma,
			r2: gf.r2
		});
	}
	return finalize(seg, sorted, lf.C0, lf.delta, lf.sigma, lf.r2, "linear", segStart);
}
function finalize(seg, sorted, C0, delta, sigma, r2, model, segStart, extra) {
	const hitRates = seg.map((h) => {
		const ch = h.cache_hit_tokens || 0, tot = ch + (h.cache_miss_tokens || 0);
		return tot ? ch / tot : 0;
	});
	const outTokens = seg.map((h) => h.completion_tokens || 0);
	const hitEwma = ewma(hitRates.slice(-5));
	const outEwma = ewma(outTokens.slice(-5));
	let avgIntervalMs = 0;
	if (sorted.length >= 2) {
		const diffs = [];
		for (let i = 1; i < sorted.length; i++) diffs.push(sorted[i].timestamp - sorted[i - 1].timestamp);
		avgIntervalMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
	}
	return {
		chatId: seg[0]?.chatId ?? null,
		C0: Math.max(0, C0),
		delta: Math.max(0, delta),
		sigma: Math.max(0, sigma),
		r2,
		segStart,
		segLen: seg.length,
		model,
		hitEwma,
		outEwma,
		avgIntervalMs
	};
}
function ctxLimitForModel(model, configuredLimit) {
	if (configuredLimit != null && Number.isFinite(configuredLimit) && configuredLimit > 0) return Math.round(configuredLimit);
	const m = (model || "").toLowerCase();
	if (m.includes("128k")) return 128e3;
	if (m.includes("64k")) return 64e3;
	if (m.includes("32k")) return 32e3;
	return DEFAULT_CONTEXT_LIMIT;
}
//#endregion
//#region src/stats/energyScore.ts
/**
* Q4 RP 能耗效率评分 — 基于 6 指标加权分档 A-G
*/
function percentileAbs(value, thresholds, reverse) {
	const n = thresholds.length;
	for (let i = 0; i < n; i++) if (value <= thresholds[i]) {
		const score = 100 - i / n * 100;
		return reverse ? 100 - score : score;
	}
	return reverse ? 100 : 0;
}
var ABS_THRESHOLDS = {
	delta: [
		800,
		1500,
		3e3,
		5e3,
		8e3,
		12e3
	],
	out: [
		600,
		900,
		1300,
		1800,
		2400,
		3200
	],
	efficiency: [
		.4,
		.3,
		.25,
		.2,
		.15,
		.1
	],
	hitRate: [
		.9,
		.8,
		.65,
		.5,
		.35,
		.2
	],
	truncRate: [
		.01,
		.03,
		.06,
		.1,
		.15,
		.25
	],
	thinkRatio: [
		.1,
		.2,
		.3,
		.4,
		.5,
		.6
	]
};
var WEIGHTS = {
	delta: .25,
	out: .2,
	efficiency: .2,
	hitRate: .15,
	truncRate: .1,
	thinkRatio: .1
};
function computeMetricsForChat(history, chatId) {
	const filtered = chatId ? history.filter((h) => (h.chatId ?? null) === chatId) : history.slice();
	if (!filtered.length) return {
		delta: 0,
		out: 0,
		efficiency: 0,
		hitRate: .5,
		truncRate: 0,
		thinkRatio: 0
	};
	const fit = fitSegments(history, chatId);
	const delta = fit?.delta ?? 0;
	const out = fit?.outEwma ?? filtered.reduce((a, b) => a + (b.completion_tokens || 0), 0) / filtered.length;
	const totalTok = filtered.reduce((a, b) => a + (b.total_tokens || 0), 0);
	const sumOut = filtered.reduce((a, b) => a + (b.completion_tokens || 0), 0);
	const efficiency = totalTok ? sumOut / totalTok : 0;
	const hitRates = filtered.map((h) => {
		const ch = h.cache_hit_tokens || 0, tot = ch + (h.cache_miss_tokens || 0);
		return tot ? ch / tot : .5;
	});
	return {
		delta,
		out,
		efficiency,
		hitRate: hitRates.length ? hitRates.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, hitRates.length) : .5,
		truncRate: filtered.filter((h) => isTruncatedFinish(h.finishReason) || h.isTruncated).length / filtered.length,
		thinkRatio: (() => {
			const sOut = filtered.reduce((a, b) => a + (b.completion_tokens || 0), 0);
			const sThink = filtered.reduce((a, b) => a + (b.thinkTokens || 0), 0);
			return sOut ? sThink / sOut : 0;
		})()
	};
}
function scoreFromMetrics(m) {
	const sDelta = percentileAbs(m.delta, ABS_THRESHOLDS.delta, false);
	const sOut = percentileAbs(m.out, ABS_THRESHOLDS.out, false);
	100 - percentileAbs(m.efficiency, [
		.1,
		.15,
		.2,
		.25,
		.3,
		.4
	].reverse(), false);
	100 - percentileAbs(m.hitRate, [
		.2,
		.35,
		.5,
		.65,
		.8,
		.9
	], false);
	const sTrunc = percentileAbs(m.truncRate, ABS_THRESHOLDS.truncRate, false);
	const sThink = percentileAbs(m.thinkRatio, ABS_THRESHOLDS.thinkRatio, false);
	100 - percentileAbs(m.hitRate, [
		.2,
		.35,
		.5,
		.65,
		.8,
		.9
	], false);
	function scoreLargerBetter(v, thr) {
		for (let i = thr.length - 1; i >= 0; i--) if (v >= thr[i]) return (i + 1) / thr.length * 100;
		return 0;
	}
	const effScore = scoreLargerBetter(m.efficiency, [
		.1,
		.15,
		.2,
		.25,
		.3,
		.4
	]);
	const hitScore2 = scoreLargerBetter(m.hitRate, [
		.2,
		.35,
		.5,
		.65,
		.8,
		.9
	]);
	return WEIGHTS.delta * sDelta + WEIGHTS.out * sOut + WEIGHTS.efficiency * effScore + WEIGHTS.hitRate * hitScore2 + WEIGHTS.truncRate * sTrunc + WEIGHTS.thinkRatio * sThink;
}
function gradeFromScore(score) {
	if (score >= 85) return "A";
	if (score >= 75) return "B";
	if (score >= 65) return "C";
	if (score >= 55) return "D";
	if (score >= 45) return "E";
	if (score >= 35) return "F";
	return "G";
}
function energyScore(history, chatId) {
	const metrics = computeMetricsForChat(history, chatId);
	const score = scoreFromMetrics(metrics);
	return {
		metrics,
		score,
		grade: gradeFromScore(score)
	};
}
function topPowerChats(history, limit = 10) {
	const list = Array.from(new Set(history.map((h) => h.chatId ?? null))).map((id) => {
		const r = energyScore(history, id);
		return {
			chatId: id,
			grade: r.grade,
			score: r.score,
			delta: r.metrics.delta
		};
	});
	list.sort((a, b) => b.delta - a.delta);
	return list.slice(0, limit);
}
//#endregion
//#region src/ui/forecast-chart.ts
var instances = {};
var echartsPromise = null;
var resizeObserver = null;
var resizeBound = false;
function getDoc$4() {
	return window.parent?.document ?? document;
}
function themeColor(name, fallback) {
	try {
		const doc = getDoc$4();
		const el = doc.getElementById("aus-panel") || doc.documentElement;
		return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
	} catch {
		return fallback;
	}
}
async function loadECharts() {
	if (!echartsPromise) echartsPromise = (async () => {
		const echarts = await import("./core-ooVr14Lq.js");
		const { LineChart, ScatterChart } = await import("./charts-6tQsz9zF.js");
		const { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkPointComponent, GraphicComponent } = await import("./components-jF_EZHLs.js");
		const { CanvasRenderer } = await import("./renderers-DtxFY9_W.js");
		echarts.use([
			LineChart,
			ScatterChart,
			GridComponent,
			TooltipComponent,
			LegendComponent,
			MarkLineComponent,
			MarkPointComponent,
			GraphicComponent,
			CanvasRenderer
		]);
		return echarts;
	})();
	return echartsPromise;
}
function compactNumber(value) {
	const n = Number(value) || 0;
	if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + "亿";
	if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + "万";
	return Math.round(n).toLocaleString("zh-CN");
}
function axisMoney(currency, cnyValue) {
	const n = currency.code === "USD" ? (Number(cnyValue) || 0) / (currency.rate || 1) : Number(cnyValue) || 0;
	if (currency.code === "USD") {
		if (Math.abs(n) >= 1) return currency.symbol + n.toFixed(2);
		if (Math.abs(n) >= .01) return currency.symbol + n.toFixed(4);
		return currency.symbol + n.toFixed(5);
	}
	if (Math.abs(n) >= 1) return currency.symbol + n.toFixed(2);
	return currency.symbol + n.toFixed(4);
}
async function initChart(id, echarts) {
	const el = getDoc$4().getElementById(id);
	if (!el) return null;
	if (!el.clientWidth || !el.clientHeight) return null;
	if (instances[id]) {
		try {
			instances[id].dispose();
		} catch {}
		delete instances[id];
	}
	try {
		const existing = echarts.getInstanceByDom?.(el);
		if (existing) existing.dispose();
	} catch {}
	el.innerHTML = "";
	const chart = echarts.init(el);
	instances[id] = chart;
	return chart;
}
function ensureResizeObserver() {
	if (resizeObserver || typeof ResizeObserver === "undefined") return;
	const doc = getDoc$4();
	const targets = [
		"aus-forecast-main-chart",
		"aus-forecast-hit-chart",
		"aus-forecast-cost-chart"
	];
	const observed = [];
	for (const id of targets) {
		const el = doc.getElementById(id);
		if (el) observed.push(el);
	}
	if (!observed.length) return;
	resizeObserver = new ResizeObserver(() => {
		try {
			resizeForecastCharts();
		} catch {}
	});
	observed.forEach((el) => resizeObserver.observe(el));
	if (!resizeBound) {
		resizeBound = true;
		try {
			window.addEventListener("resize", () => {
				try {
					resizeForecastCharts();
				} catch {}
			});
			const parentWindow = window.parent;
			if (parentWindow && parentWindow !== window && parentWindow.addEventListener) parentWindow.addEventListener("resize", () => {
				try {
					resizeForecastCharts();
				} catch {}
			});
		} catch {}
	}
}
function resizeForecastCharts() {
	for (const id of Object.keys(instances)) try {
		instances[id]?.resize();
	} catch {}
}
function disposeForecastCharts() {
	for (const id of Object.keys(instances)) {
		try {
			instances[id]?.dispose();
		} catch {}
		delete instances[id];
	}
	if (resizeObserver) {
		try {
			resizeObserver.disconnect();
		} catch {}
		resizeObserver = null;
	}
}
function buildLabels(series) {
	return {
		labels: [...series.history.map((point) => `#${point.round}`), ...series.future.map((point) => `+${point.round - series.currentRound}`)],
		historyLength: series.history.length,
		futureLength: series.future.length
	};
}
function futureOnlySeries(historyLength, futureValues, connection) {
	const result = new Array(historyLength + futureValues.length).fill(null);
	if (historyLength > 0 && connection != null) result[historyLength - 1] = connection;
	for (let i = 0; i < futureValues.length; i += 1) result[historyLength + i] = futureValues[i];
	return result;
}
function baseAxisStyle(border, text3) {
	return {
		axisLine: { lineStyle: { color: border } },
		axisTick: { show: false },
		axisLabel: {
			color: text3,
			fontSize: 12,
			hideOverlap: true
		}
	};
}
function compactionTooltip(point) {
	if (!point) return "";
	return `<div style="font-size:11px;color:#9CA3AF;">压缩前 ${compactNumber(point.before)} → 后 ${compactNumber(point.after)}（降 ${Math.round(point.dropPct * 100)}%）</div>`;
}
async function renderMainChart(echarts, options) {
	const chart = await initChart("aus-forecast-main-chart", echarts);
	if (!chart) return;
	const { series, ctxLimit, currency, formatCost } = options;
	const { labels, historyLength } = buildLabels(series);
	if (!labels.length) return;
	const border = themeColor("--ds-border", "#E5E7EB");
	const text3 = themeColor("--ds-text-3", "#9CA3AF");
	const text = themeColor("--ds-text", "#111827");
	const cardInner = themeColor("--ds-card-inner", "#FFFFFF");
	const historyHit = series.history.map((point) => point.hit);
	const historyMiss = series.history.map((point) => point.miss);
	const historyInput = series.history.map((point) => point.input);
	const historyOutput = series.history.map((point) => point.output);
	const historyCost = series.history.map((point) => point.cost);
	const futureInput = series.future.map((point) => point.input);
	const futureOutput = series.future.map((point) => point.output);
	const futureCost = series.future.map((point) => point.cost ?? 0);
	const lastInput = historyLength ? historyInput[historyLength - 1] : null;
	const lastOutput = historyLength ? historyOutput[historyLength - 1] : null;
	const lastCost = historyLength ? historyCost[historyLength - 1] : null;
	const predInput = futureOnlySeries(historyLength, futureInput, lastInput);
	const predOutput = futureOnlySeries(historyLength, futureOutput, lastOutput);
	const predCost = series.future.some((point) => point.cost != null) ? futureOnlySeries(historyLength, futureCost, lastCost) : null;
	const bandLow = futureOnlySeries(historyLength, series.future.map((point) => point.inputLow), lastInput);
	const bandHigh = futureOnlySeries(historyLength, series.future.map((point) => Math.max(0, point.inputHigh - point.inputLow)), 0);
	const historyCompactions = series.history.filter((point) => point.compaction).map((point) => {
		const detail = series.compactions.find((item) => item.round === point.round);
		return {
			value: [`#${point.round}`, point.input],
			compaction: detail
		};
	});
	const futureCompactions = series.future.filter((point) => point.compaction).map((point) => ({
		value: [`+${point.round - series.currentRound}`, point.input],
		compaction: null
	}));
	const markLineData = [];
	for (const compaction of series.compactions) markLineData.push({
		xAxis: `#${compaction.round}`,
		lineStyle: {
			color: "#F59E0B",
			width: 1,
			type: "dashed",
			opacity: .45
		},
		label: { show: false }
	});
	for (const point of series.future.filter((item) => item.compaction)) markLineData.push({
		xAxis: `+${point.round - series.currentRound}`,
		lineStyle: {
			color: "#F59E0B",
			width: 1,
			type: "dotted",
			opacity: .6
		},
		label: { show: false }
	});
	if (ctxLimit != null) markLineData.push({
		yAxis: ctxLimit,
		lineStyle: {
			color: "#DC2626",
			width: 1,
			type: "dashed",
			opacity: .75
		},
		label: {
			show: true,
			position: "insideEndTop",
			formatter: `参考上限 ${compactNumber(ctxLimit)}`,
			color: "#DC2626",
			fontSize: 10
		}
	});
	const markArea = historyLength && series.future.length ? {
		silent: true,
		itemStyle: { color: "rgba(16, 185, 129, 0.06)" },
		label: { show: false },
		data: [[{ xAxis: labels[historyLength - 1] }, { xAxis: labels[labels.length - 1] }]]
	} : void 0;
	const legendData = [
		"历史输入(命中)",
		"历史输入(未命中)",
		"历史输出",
		...series.future.length ? ["预测输入", "预测输出"] : [],
		...predCost ? ["历史成本", "预测成本"] : [],
		...historyCompactions.length ? ["历史压缩"] : [],
		...futureCompactions.length ? ["预测压缩"] : []
	];
	const hasCost = predCost != null;
	const yAxis = [{
		type: "value",
		name: "tokens",
		position: "left",
		nameTextStyle: {
			color: text3,
			fontSize: 11
		},
		axisLine: { show: false },
		splitLine: { lineStyle: { color: border } },
		axisLabel: {
			color: text3,
			fontSize: 12,
			formatter: (value) => compactNumber(value)
		}
	}];
	if (hasCost) yAxis.push({
		type: "value",
		name: currency.code,
		position: "right",
		nameTextStyle: {
			color: text3,
			fontSize: 11
		},
		axisLine: { show: false },
		splitLine: { show: false },
		axisLabel: {
			color: text3,
			fontSize: 12,
			formatter: (value) => axisMoney(currency, value)
		}
	});
	const seriesOption = [
		{
			name: "历史输入(命中)",
			type: "line",
			stack: "input",
			data: historyHit,
			smooth: false,
			showSymbol: false,
			lineStyle: {
				width: 1,
				color: "#0BA25E"
			},
			itemStyle: { color: "#0BA25E" },
			areaStyle: { color: "rgba(11, 162, 94, 0.28)" },
			sampling: "lttb",
			markLine: markLineData.length ? {
				silent: true,
				symbol: "none",
				data: markLineData
			} : void 0,
			markArea
		},
		{
			name: "历史输入(未命中)",
			type: "line",
			stack: "input",
			data: historyMiss,
			smooth: false,
			showSymbol: false,
			lineStyle: {
				width: 1,
				color: "#F87171"
			},
			itemStyle: { color: "#F87171" },
			areaStyle: { color: "rgba(248, 113, 113, 0.26)" },
			sampling: "lttb"
		},
		{
			name: "历史输出",
			type: "line",
			data: historyOutput,
			smooth: false,
			showSymbol: false,
			lineStyle: {
				width: 1.6,
				color: "#6366F1"
			},
			itemStyle: { color: "#6366F1" },
			sampling: "lttb"
		}
	];
	if (series.future.length) seriesOption.push({
		name: "预测输入",
		type: "line",
		data: predInput,
		smooth: false,
		showSymbol: false,
		lineStyle: {
			width: 1.8,
			color: "#0BA25E",
			type: "dashed"
		},
		itemStyle: { color: "#0BA25E" }
	}, {
		name: "预测输出",
		type: "line",
		data: predOutput,
		smooth: false,
		showSymbol: false,
		lineStyle: {
			width: 1.4,
			color: "#8B5CF6",
			type: "dashed"
		},
		itemStyle: { color: "#8B5CF6" }
	}, {
		name: "__bandLow",
		type: "line",
		stack: "band",
		data: bandLow,
		showSymbol: false,
		lineStyle: { opacity: 0 },
		areaStyle: { opacity: 0 },
		silent: true,
		tooltip: { show: false }
	}, {
		name: "__bandHigh",
		type: "line",
		stack: "band",
		data: bandHigh,
		showSymbol: false,
		lineStyle: { opacity: 0 },
		areaStyle: { color: "rgba(11, 162, 94, 0.12)" },
		silent: true,
		tooltip: { show: false }
	});
	if (predCost) seriesOption.push({
		name: "历史成本",
		type: "line",
		yAxisIndex: 1,
		data: historyCost,
		smooth: false,
		showSymbol: false,
		lineStyle: {
			width: 1.8,
			color: "#FF6A00"
		},
		itemStyle: { color: "#FF6A00" },
		sampling: "lttb"
	}, {
		name: "预测成本",
		type: "line",
		yAxisIndex: 1,
		data: predCost,
		smooth: false,
		showSymbol: false,
		lineStyle: {
			width: 1.8,
			color: "#FF6A00",
			type: "dashed"
		},
		itemStyle: { color: "#FF6A00" }
	});
	if (historyCompactions.length) seriesOption.push({
		name: "历史压缩",
		type: "scatter",
		data: historyCompactions,
		symbol: "triangle",
		symbolSize: 9,
		itemStyle: { color: "#F59E0B" },
		z: 8
	});
	if (futureCompactions.length) seriesOption.push({
		name: "预测压缩",
		type: "scatter",
		data: futureCompactions,
		symbol: "diamond",
		symbolSize: 8,
		itemStyle: {
			color: "#F59E0B",
			opacity: .8
		},
		z: 8
	});
	const maxLabels = 12;
	const interval = labels.length <= maxLabels ? 0 : Math.ceil(labels.length / maxLabels) - 1;
	chart.setOption({
		animation: false,
		backgroundColor: "transparent",
		legend: {
			type: "scroll",
			top: 0,
			left: 0,
			right: 0,
			data: legendData,
			textStyle: {
				color: text3,
				fontSize: 11
			},
			itemWidth: 14,
			itemHeight: 8,
			pageIconColor: text3,
			pageIconInactiveColor: border,
			pageTextStyle: {
				color: text3,
				fontSize: 11
			}
		},
		tooltip: {
			trigger: "axis",
			backgroundColor: cardInner,
			borderColor: border,
			borderWidth: 1,
			textStyle: {
				color: text,
				fontSize: 12
			},
			axisPointer: {
				type: "line",
				lineStyle: { color: border }
			},
			formatter: (params) => {
				if (!Array.isArray(params) || !params.length) return "";
				const index = params[0].dataIndex;
				const label = labels[index] || "";
				const isFuture = index >= historyLength;
				let html = `<div style="font-weight:600;margin-bottom:6px;">第 ${isFuture ? series.currentRound + (index - historyLength) + 1 : index + 1} 轮${isFuture ? "（预测）" : ""}</div>`;
				for (const param of params) {
					if (!param || String(param.seriesName).startsWith("__")) continue;
					if (param.seriesName === "历史压缩" || param.seriesName === "预测压缩") continue;
					const value = Array.isArray(param.value) ? param.value[1] : param.value;
					if (value == null || !Number.isFinite(Number(value))) continue;
					const display = param.seriesName.includes("成本") ? formatCost(Number(value), 4) : compactNumber(Number(value)) + " tok";
					html += `<div style="display:flex;align-items:center;gap:6px;line-height:1.7;"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${param.color};"></span><span>${param.seriesName}</span><span style="margin-left:auto;font-weight:600;">${display}</span></div>`;
				}
				const hitPoint = historyCompactions.find((point) => point.value[0] === label);
				if (hitPoint?.compaction) html += compactionTooltip(hitPoint.compaction);
				if (futureCompactions.find((point) => point.value[0] === label)) html += "<div style=\"font-size:11px;color:#F59E0B;\">预测压缩点（按历史压缩节奏）</div>";
				return `<div style="padding:2px 4px;min-width:190px;">${html}</div>`;
			}
		},
		grid: {
			left: 52,
			right: hasCost ? 58 : 20,
			top: 42,
			bottom: 30
		},
		xAxis: {
			type: "category",
			data: labels,
			boundaryGap: false,
			...baseAxisStyle(border, text3),
			axisLabel: {
				color: text3,
				fontSize: 12,
				interval,
				hideOverlap: true
			}
		},
		yAxis,
		series: seriesOption
	}, true);
}
async function renderHitChart(echarts, options) {
	const chart = await initChart("aus-forecast-hit-chart", echarts);
	if (!chart) return;
	const { series } = options;
	const { labels, historyLength } = buildLabels(series);
	if (!labels.length) return;
	const border = themeColor("--ds-border", "#E5E7EB");
	const text3 = themeColor("--ds-text-3", "#9CA3AF");
	const text = themeColor("--ds-text", "#111827");
	const cardInner = themeColor("--ds-card-inner", "#FFFFFF");
	const historyRate = series.history.map((point) => point.hitRate == null ? null : point.hitRate * 100);
	const lastRate = historyLength ? historyRate[historyLength - 1] : null;
	const futureRate = futureOnlySeries(historyLength, series.future.map((point) => point.hitRate * 100), lastRate);
	const fallbackLine = !series.hit.hasData ? [{
		yAxis: series.hit.rate * 100,
		lineStyle: {
			color: "#0BA25E",
			width: 1,
			type: "dashed",
			opacity: .7
		},
		label: {
			show: true,
			position: "insideEndTop",
			formatter: `回退命中率 ${Math.round(series.hit.rate * 100)}%`,
			color: "#0BA25E",
			fontSize: 10
		}
	}] : [];
	const compactionLines = series.compactions.map((point) => ({
		xAxis: `#${point.round}`,
		lineStyle: {
			color: "#F59E0B",
			width: 1,
			type: "dashed",
			opacity: .35
		},
		label: { show: false }
	}));
	const interval = labels.length <= 12 ? 0 : Math.ceil(labels.length / 12) - 1;
	chart.setOption({
		animation: false,
		backgroundColor: "transparent",
		tooltip: {
			trigger: "axis",
			backgroundColor: cardInner,
			borderColor: border,
			borderWidth: 1,
			textStyle: {
				color: text,
				fontSize: 12
			},
			formatter: (params) => {
				if (!Array.isArray(params) || !params.length) return "";
				const index = params[0].dataIndex;
				labels[index];
				const isFuture = index >= historyLength;
				let html = `<div style="font-weight:600;margin-bottom:4px;">第 ${isFuture ? series.currentRound + (index - historyLength) + 1 : index + 1} 轮${isFuture ? "（预测）" : ""}</div>`;
				for (const param of params) {
					if (!param || String(param.seriesName).startsWith("__")) continue;
					const value = Array.isArray(param.value) ? param.value[1] : param.value;
					if (value == null || !Number.isFinite(Number(value))) continue;
					html += `<div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${param.color};"></span><span>${param.seriesName}</span><span style="margin-left:auto;font-weight:600;">${Number(value).toFixed(1)}%</span></div>`;
				}
				return `<div style="padding:2px 4px;min-width:160px;">${html}</div>`;
			}
		},
		grid: {
			left: 42,
			right: 18,
			top: 18,
			bottom: 26
		},
		xAxis: {
			type: "category",
			data: labels,
			boundaryGap: false,
			...baseAxisStyle(border, text3),
			axisLabel: {
				color: text3,
				fontSize: 12,
				interval,
				hideOverlap: true
			}
		},
		yAxis: {
			type: "value",
			min: 0,
			max: 100,
			axisLine: { show: false },
			splitLine: { lineStyle: { color: border } },
			axisLabel: {
				color: text3,
				fontSize: 12,
				formatter: (value) => `${value}%`
			}
		},
		series: [{
			name: "缓存命中率",
			type: "line",
			data: historyRate,
			showSymbol: false,
			connectNulls: false,
			lineStyle: {
				width: 1.8,
				color: "#0BA25E"
			},
			itemStyle: { color: "#0BA25E" },
			markLine: {
				silent: true,
				symbol: "none",
				data: [...compactionLines, ...fallbackLine]
			}
		}, ...series.future.length ? [{
			name: "预测命中率",
			type: "line",
			data: futureRate,
			showSymbol: false,
			lineStyle: {
				width: 1.8,
				color: "#0BA25E",
				type: "dashed"
			},
			itemStyle: { color: "#0BA25E" }
		}] : []]
	}, true);
}
async function renderCostChart(echarts, options) {
	const chart = await initChart("aus-forecast-cost-chart", echarts);
	if (!chart) return;
	const { series, currency, formatCost } = options;
	const { labels, historyLength } = buildLabels(series);
	if (!labels.length) return;
	const border = themeColor("--ds-border", "#E5E7EB");
	const text3 = themeColor("--ds-text-3", "#9CA3AF");
	const text = themeColor("--ds-text", "#111827");
	const cardInner = themeColor("--ds-card-inner", "#FFFFFF");
	if (!series.future.some((point) => point.cost != null)) {
		chart.setOption({
			animation: false,
			backgroundColor: "transparent",
			graphic: [{
				type: "text",
				left: "center",
				top: "middle",
				style: {
					text: "未配置价格，无法估算成本",
					fill: text3,
					fontSize: 12
				}
			}],
			xAxis: {
				type: "category",
				data: labels,
				show: false
			},
			yAxis: {
				type: "value",
				show: false
			},
			series: []
		}, true);
		return;
	}
	const historyCumulative = series.history.map((point) => point.cumulativeCost);
	const lastCumulative = historyLength ? historyCumulative[historyLength - 1] : 0;
	const futureCumulative = futureOnlySeries(historyLength, series.future.map((point) => point.cumulativeCost ?? lastCumulative), lastCumulative);
	const futureTotal = series.future.reduce((sum, point) => sum + (point.cost ?? 0), 0);
	const interval = labels.length <= 12 ? 0 : Math.ceil(labels.length / 12) - 1;
	chart.setOption({
		animation: false,
		backgroundColor: "transparent",
		tooltip: {
			trigger: "axis",
			backgroundColor: cardInner,
			borderColor: border,
			borderWidth: 1,
			textStyle: {
				color: text,
				fontSize: 12
			},
			formatter: (params) => {
				if (!Array.isArray(params) || !params.length) return "";
				const index = params[0].dataIndex;
				const isFuture = index >= historyLength;
				let html = `<div style="font-weight:600;margin-bottom:4px;">第 ${isFuture ? series.currentRound + (index - historyLength) + 1 : index + 1} 轮${isFuture ? "（预测）" : ""}</div>`;
				for (const param of params) {
					const value = Array.isArray(param.value) ? param.value[1] : param.value;
					if (value == null || !Number.isFinite(Number(value))) continue;
					html += `<div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${param.color};"></span><span>${param.seriesName}</span><span style="margin-left:auto;font-weight:600;">${formatCost(Number(value), 4)}</span></div>`;
				}
				return `<div style="padding:2px 4px;min-width:170px;">${html}</div>`;
			}
		},
		graphic: futureTotal > 0 ? [{
			type: "text",
			right: 10,
			top: 0,
			style: {
				text: `未来 ${series.future.length} 轮 ≈ ${formatCost(futureTotal, 4)}`,
				fill: text3,
				fontSize: 11
			}
		}] : void 0,
		grid: {
			left: 58,
			right: 22,
			top: 28,
			bottom: 26
		},
		xAxis: {
			type: "category",
			data: labels,
			boundaryGap: false,
			...baseAxisStyle(border, text3),
			axisLabel: {
				color: text3,
				fontSize: 12,
				interval,
				hideOverlap: true
			}
		},
		yAxis: {
			type: "value",
			axisLine: { show: false },
			splitLine: { lineStyle: { color: border } },
			axisLabel: {
				color: text3,
				fontSize: 12,
				formatter: (value) => axisMoney(currency, value)
			}
		},
		series: [{
			name: "累计成本",
			type: "line",
			data: historyCumulative,
			showSymbol: false,
			smooth: false,
			lineStyle: {
				width: 1.8,
				color: "#FF6A00"
			},
			itemStyle: { color: "#FF6A00" },
			areaStyle: { color: "rgba(255, 106, 0, 0.12)" },
			sampling: "lttb"
		}, {
			name: "预测累计成本",
			type: "line",
			data: futureCumulative,
			showSymbol: false,
			lineStyle: {
				width: 1.8,
				color: "#FF6A00",
				type: "dashed"
			},
			itemStyle: { color: "#FF6A00" }
		}]
	}, true);
}
async function renderForecastCharts(options) {
	let echarts;
	try {
		echarts = await loadECharts();
	} catch (error) {
		console.error("[Api-Usage] 预测图表加载失败", error);
		return;
	}
	ensureResizeObserver();
	await Promise.all([
		renderMainChart(echarts, options),
		renderHitChart(echarts, options),
		renderCostChart(echarts, options)
	]);
}
//#endregion
//#region src/ui/forecast-view.ts
var PREFS_KEY = "aus_forecast_prefs_v1";
var HORIZONS = [
	5,
	10,
	20,
	50,
	100
];
var selectedForecastKey = "__current__";
var selectedForecastModel = null;
var horizon = 10;
var hitMode = "global";
var manualHitRate = 50;
var compactionEnabled = true;
var efficiencyScope = "all";
var showTop = false;
var openDropdown = null;
var renderToken = 0;
var globalCloseBound = false;
var hitRefreshTimer = null;
var lastFullHistory = [];
var lastEffectiveHistory = [];
var lastEfficiencyHistory = [];
var lastEfficiencyLabel = "全部历史";
var efficiencySort = null;
function getDoc$3() {
	return window.parent?.document ?? document;
}
function currentChatId() {
	try {
		return (globalThis.SillyTavern?.getContext?.())?.getCurrentChatId?.() || null;
	} catch {
		return null;
	}
}
function loadPreferences() {
	try {
		const raw = localStorage.getItem(PREFS_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw);
		if (HORIZONS.includes(Number(parsed.horizon))) horizon = Number(parsed.horizon);
		if (parsed.hitMode === "global" || parsed.hitMode === "model" || parsed.hitMode === "manual") hitMode = parsed.hitMode;
		const manual = Number(parsed.manualHit);
		if (Number.isFinite(manual)) manualHitRate = Math.max(0, Math.min(100, manual));
		if (typeof parsed.compaction === "boolean") compactionEnabled = parsed.compaction;
		if (parsed.scope === "all" || parsed.scope === "chat") efficiencyScope = parsed.scope;
		if (typeof parsed.showTop === "boolean") showTop = parsed.showTop;
	} catch {}
}
function savePreferences() {
	try {
		const prefs = {
			horizon,
			hitMode,
			manualHit: manualHitRate,
			compaction: compactionEnabled,
			scope: efficiencyScope,
			showTop
		};
		localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
	} catch {}
}
function balanceNum() {
	const ignored = new Set(state$2.walletIgnored || []);
	const selected = String(state$2.settings.overviewWalletId || "all");
	const wallets = (state$2.wallets || []).filter((wallet) => !ignored.has(wallet.id));
	const target = selected === "all" ? wallets : wallets.filter((wallet) => wallet.id === selected);
	let total = null;
	for (const wallet of target) {
		const value = walletBalanceToCny(wallet, getWalletExchangeRate());
		if (value == null) continue;
		total = (total ?? 0) + value;
	}
	if (total == null) {
		const fallback = state$2.customBalance || state$2.balance?.balance;
		if (fallback == null || fallback === "") return null;
		const value = parseFloat(String(fallback));
		if (Number.isFinite(value)) total = value;
	}
	return total;
}
function getRecordedChatsForForecast(list) {
	const map = /* @__PURE__ */ new Map();
	for (const entry of list || []) {
		const chatId = entry.chatId ?? null;
		const chatName = entry.chatName ?? null;
		const key = chatId ?? "__null__";
		const timestamp = Number(entry?.timestamp) || 0;
		if (!map.has(key)) map.set(key, {
			chatId,
			chatName,
			lastSeen: timestamp
		});
		else {
			const current = map.get(key);
			if (timestamp >= current.lastSeen && chatName) current.chatName = chatName;
			if (timestamp > current.lastSeen) current.lastSeen = timestamp;
		}
	}
	return Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen).map((value) => {
		let display = value.chatName || "";
		if (!display) {
			if (value.chatId) display = value.chatId.length > 18 ? value.chatId.slice(0, 8) + "…" + value.chatId.slice(-4) : value.chatId;
			else display = "未分组/旧数据";
		}
		return {
			chatId: value.chatId,
			chatName: value.chatName,
			displayName: display
		};
	});
}
function getEffectiveHist(fullHist) {
	if (selectedForecastKey === "__all__") return fullHist.slice();
	if (selectedForecastKey === "__current__") return getCurrentChatHist(fullHist);
	if (selectedForecastKey === "__null__") return fullHist.filter((entry) => !entry.chatId);
	return fullHist.filter((entry) => (entry.chatId ?? null) === selectedForecastKey);
}
function getCurrentChatHist(fullHist) {
	const current = currentChatId();
	if (!current) return [];
	return fullHist.filter((entry) => (entry.chatId ?? null) === current);
}
function getForecastLabel(fullHist) {
	if (selectedForecastKey === "__current__") return currentChatId() ? "当前对话" : "当前对话（未打开）";
	if (selectedForecastKey === "__all__") return "全部";
	if (selectedForecastKey === "__null__") return "未分组/旧数据";
	return getRecordedChatsForForecast(fullHist).find((chat) => (chat.chatId ?? "__null__") === selectedForecastKey)?.displayName || selectedForecastKey;
}
function getModelOptions(history) {
	const map = /* @__PURE__ */ new Map();
	for (const entry of history || []) {
		const model = entry?.model;
		if (!model) continue;
		const timestamp = Number(entry?.timestamp) || 0;
		const current = map.get(model);
		if (current) {
			current.count += 1;
			if (timestamp > current.lastSeen) current.lastSeen = timestamp;
		} else map.set(model, {
			model,
			count: 1,
			lastSeen: timestamp
		});
	}
	return Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen);
}
function latestEntryForModel(history, model) {
	if (!history.length) return null;
	if (!model) return [...history].sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)).slice(-1)[0] || null;
	const filtered = history.filter((entry) => entry.model === model);
	if (!filtered.length) return null;
	return [...filtered].sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)).slice(-1)[0] || null;
}
function averageIntervalMs(history) {
	if (history.length < 2) return 0;
	const sorted = [...history].sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)).slice(-21);
	const diffs = [];
	for (let i = 1; i < sorted.length; i += 1) {
		const diff = (Number(sorted[i].timestamp) || 0) - (Number(sorted[i - 1].timestamp) || 0);
		if (diff > 0) diffs.push(diff);
	}
	return diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
}
function resolvePriceContext(history, model) {
	if (!model) return null;
	const latest = latestEntryForModel(history, model);
	if (!latest && !history.length) return null;
	const wallet = findWalletForHistory(state$2.wallets || [], latest || history[history.length - 1] || {});
	const walletModel = findWalletModel(wallet, model);
	const pricing = getPricing$1(model, state$2.settings, wallet);
	const pending = pricing?.pending === true;
	const avgInterval = averageIntervalMs(history);
	const nextTs = latest?.timestamp ? Number(latest.timestamp) + avgInterval : Date.now();
	const usePeak = pricing?.usePeakPricing !== false && (wallet ? isWalletPeakHour(nextTs, wallet, state$2.settings) : isPeakHour(nextTs, state$2.settings));
	const tier = usePeak ? pricing?.peak : pricing?.offpeak;
	const trio = pending || !tier ? null : {
		hit: Number(tier.hit) || 0,
		miss: Number(tier.miss) || 0,
		output: Number(tier.output) || 0
	};
	return {
		model,
		wallet,
		walletModel,
		pricing,
		trio,
		known: !pending && trio != null,
		usePeak,
		label: pending ? "未配置价格" : pricing?.usePeakPricing === false ? "固定价" : usePeak ? "高峰价" : "低谷价",
		walletLabel: wallet?.name || "未归属钱包",
		nextTs
	};
}
function formatCost(value, digits = 4) {
	try {
		return formatMoney(value || 0, digits);
	} catch {
		return "¥" + (value || 0).toFixed(digits) + " CNY";
	}
}
function compactTok(value) {
	return Math.round(Number(value) || 0).toLocaleString("zh-CN");
}
function pct(value, digits = 1) {
	return (Number(value) * 100).toFixed(digits) + "%";
}
function currencyInfo() {
	const currency = getDisplayCurrency();
	return {
		code: currency.code,
		symbol: currency.symbol,
		rate: currency.rate
	};
}
function hitSourceText(series) {
	switch (series.hit.source) {
		case "data": return series.hit.segmentSamples > 0 ? `自动测算 · 当前段 ${series.hit.segmentSamples} 条记录` : "自动测算 · 对话历史有效样本";
		case "global": return "无缓存数据 · 全站平均";
		case "model": return "无缓存数据 · 同模型平均";
		case "manual": return "无缓存数据 · 手动假设";
		default: return "无缓存数据 · 按 0% 保守估算";
	}
}
function closeAllDropdowns() {
	const doc = getDoc$3();
	for (const name of [
		"chat",
		"model",
		"horizon",
		"hit",
		"scope"
	]) {
		const dropdown = doc.getElementById(`aus-forecast-${name}-dropdown`);
		if (dropdown) dropdown.style.display = "none";
	}
	openDropdown = null;
}
function toggleDropdown(name) {
	const doc = getDoc$3();
	if (openDropdown === name) {
		closeAllDropdowns();
		return;
	}
	closeAllDropdowns();
	const dropdown = doc.getElementById(`aus-forecast-${name}-dropdown`);
	if (!dropdown) return;
	dropdown.style.display = "block";
	openDropdown = name;
}
function bindGlobalClose() {
	if (globalCloseBound) return;
	globalCloseBound = true;
	try {
		getDoc$3().addEventListener("click", () => closeAllDropdowns());
	} catch {}
}
function dropdownItem(attr, value, label, active, meta = "") {
	return `<div class="aus-forecast-dropdown-item${active ? " is-active" : ""}" ${attr}="${esc$2(value)}" title="${esc$2(label)}">
    <span class="aus-forecast-dropdown-label">${esc$2(label)}</span>
    ${meta ? `<span class="aus-forecast-dropdown-meta">${esc$2(meta)}</span>` : ""}
  </div>`;
}
function renderChatDropdown(fullHist) {
	const dropdown = getDoc$3().getElementById("aus-forecast-chat-dropdown");
	if (!dropdown) return;
	const chats = getRecordedChatsForForecast(fullHist);
	let html = dropdownItem("data-fchat", "__current__", "当前对话", selectedForecastKey === "__current__");
	html += dropdownItem("data-fchat", "__all__", "全部", selectedForecastKey === "__all__");
	for (const chat of chats) {
		const key = chat.chatId ?? "__null__";
		html += dropdownItem("data-fchat", key, chat.displayName, selectedForecastKey === key, chat.chatId ? "" : "旧数据");
	}
	if (!chats.length) html += "<div class=\"aus-forecast-dropdown-empty\">暂无对话</div>";
	dropdown.innerHTML = html;
	dropdown.querySelectorAll("[data-fchat]").forEach((el) => {
		el.onclick = (event) => {
			event.stopPropagation();
			selectedForecastKey = el.getAttribute("data-fchat") || "__current__";
			selectedForecastModel = null;
			closeAllDropdowns();
			renderForecastView();
		};
	});
}
function renderModelDropdown(options) {
	const dropdown = getDoc$3().getElementById("aus-forecast-model-dropdown");
	if (!dropdown) return;
	dropdown.innerHTML = options.map((option) => dropdownItem("data-fmodel", option.model, option.model, selectedForecastModel === option.model, `${option.count} 轮`)).join("") || "<div class=\"aus-forecast-dropdown-empty\">暂无模型</div>";
	dropdown.querySelectorAll("[data-fmodel]").forEach((el) => {
		el.onclick = (event) => {
			event.stopPropagation();
			selectedForecastModel = el.getAttribute("data-fmodel") || null;
			closeAllDropdowns();
			renderForecastView();
		};
	});
}
function renderHorizonDropdown() {
	const dropdown = getDoc$3().getElementById("aus-forecast-horizon-dropdown");
	if (!dropdown) return;
	dropdown.innerHTML = HORIZONS.map((value) => dropdownItem("data-fhorizon", String(value), `${value} 轮`, horizon === value, value === 10 ? "默认" : "")).join("");
	dropdown.querySelectorAll("[data-fhorizon]").forEach((el) => {
		el.onclick = (event) => {
			event.stopPropagation();
			const value = Number(el.getAttribute("data-fhorizon"));
			if (HORIZONS.includes(value)) horizon = value;
			savePreferences();
			closeAllDropdowns();
			renderForecastView();
		};
	});
}
function hitModeLabel(mode, globalRate, modelRate) {
	if (mode === "manual") return `手动 ${Math.round(manualHitRate)}%`;
	if (mode === "model") return modelRate == null ? "同模型平均 —" : `同模型平均 ${pct(modelRate)}`;
	return globalRate == null ? "全站平均 —" : `全站平均 ${pct(globalRate)}`;
}
function renderHitControl(fullHist, model, series, globalRate, modelRate) {
	const doc = getDoc$3();
	const host = doc.getElementById("aus-forecast-hit-control");
	if (!host) return;
	if (selectedForecastKey === "__all__" || !model) {
		host.innerHTML = "";
		return;
	}
	if (series?.hit.hasData) {
		host.innerHTML = `<span class="aus-forecast-badge" title="命中率来自当前对话的缓存命中 token，不提供手动设置">自动测算 · ${pct(series.hit.rate)}</span>`;
		return;
	}
	host.innerHTML = `
    <div class="aus-forecast-picker" style="position:relative;">
      <div id="aus-forecast-hit-btn" class="aus-forecast-pill" title="该对话没有缓存命中数据，可选择平均命中率">
        <span class="aus-forecast-pill-label">平均命中率</span>
        <span class="aus-forecast-pill-value">${esc$2(hitModeLabel(hitMode, globalRate, modelRate))}</span>
        ${icon("chevron-down", 14)}
      </div>
      <div id="aus-forecast-hit-dropdown" class="aus-forecast-dropdown"></div>
    </div>
    ${hitMode === "manual" ? `<div class="aus-forecast-hit-range">
      <input id="aus-forecast-hit-range" type="range" min="0" max="100" value="${Math.round(manualHitRate)}">
      <span id="aus-forecast-hit-range-val">${Math.round(manualHitRate)}%</span>
    </div>` : ""}
  `;
	const button = doc.getElementById("aus-forecast-hit-btn");
	const dropdown = doc.getElementById("aus-forecast-hit-dropdown");
	if (button) button.onclick = (event) => {
		event.stopPropagation();
		toggleDropdown("hit");
	};
	if (dropdown) {
		dropdown.innerHTML = [
			dropdownItem("data-fhit", "global", "全站平均", hitMode === "global", globalRate == null ? "无样本" : pct(globalRate)),
			dropdownItem("data-fhit", "model", "同模型平均", hitMode === "model", modelRate == null ? "无样本" : pct(modelRate)),
			dropdownItem("data-fhit", "manual", "手动假设", hitMode === "manual", `${Math.round(manualHitRate)}%`)
		].join("");
		dropdown.querySelectorAll("[data-fhit]").forEach((el) => {
			el.onclick = (event) => {
				event.stopPropagation();
				const mode = el.getAttribute("data-fhit");
				if (mode === "global" || mode === "model" || mode === "manual") hitMode = mode;
				savePreferences();
				closeAllDropdowns();
				renderForecastView();
			};
		});
	}
	const range = doc.getElementById("aus-forecast-hit-range");
	const valueLabel = doc.getElementById("aus-forecast-hit-range-val");
	if (range) {
		range.oninput = (event) => {
			event.stopPropagation();
			manualHitRate = Math.max(0, Math.min(100, Number(range.value) || 0));
			if (valueLabel) valueLabel.textContent = `${Math.round(manualHitRate)}%`;
			if (hitRefreshTimer) clearTimeout(hitRefreshTimer);
			hitRefreshTimer = setTimeout(() => {
				savePreferences();
				renderForecastView();
			}, 180);
		};
		range.onchange = () => savePreferences();
	}
}
function renderToolbar(fullHist, effective, modelOptions, model, priceContext, series, globalRate, modelRate) {
	const doc = getDoc$3();
	bindGlobalClose();
	const chatLabel = doc.getElementById("aus-forecast-chat-label");
	if (chatLabel) chatLabel.textContent = getForecastLabel(fullHist);
	renderChatDropdown(fullHist);
	const chatButton = doc.getElementById("aus-forecast-chat-btn");
	if (chatButton) chatButton.onclick = (event) => {
		event.stopPropagation();
		toggleDropdown("chat");
	};
	const modelWrap = doc.getElementById("aus-forecast-model-wrap");
	if (modelWrap) modelWrap.style.display = modelOptions.length > 1 && selectedForecastKey !== "__all__" ? "flex" : "none";
	const modelLabel = doc.getElementById("aus-forecast-model-label");
	if (modelLabel) modelLabel.textContent = model || "—";
	renderModelDropdown(modelOptions);
	const modelButton = doc.getElementById("aus-forecast-model-btn");
	if (modelButton) modelButton.onclick = (event) => {
		event.stopPropagation();
		toggleDropdown("model");
	};
	const horizonLabel = doc.getElementById("aus-forecast-horizon-label");
	if (horizonLabel) horizonLabel.textContent = `${horizon} 轮`;
	renderHorizonDropdown();
	const horizonButton = doc.getElementById("aus-forecast-horizon-btn");
	if (horizonButton) horizonButton.onclick = (event) => {
		event.stopPropagation();
		toggleDropdown("horizon");
	};
	renderHitControl(fullHist, model, series, globalRate, modelRate);
	const compactionToggle = doc.getElementById("aus-forecast-compaction-toggle");
	const compactionLabel = doc.getElementById("aus-forecast-compaction-label");
	if (compactionToggle) {
		compactionToggle.checked = compactionEnabled;
		compactionToggle.onchange = () => {
			compactionEnabled = compactionToggle.checked;
			savePreferences();
			renderForecastView();
		};
	}
	if (compactionLabel) compactionLabel.textContent = series?.compactionForecast.detected ? `压缩情景（检测到 ${series?.compactionForecast.count} 次）` : "压缩情景（未检测到）";
	const sub = doc.getElementById("aus-forecast-sub");
	if (sub) {
		const parts = [];
		if (selectedForecastKey === "__all__") parts.push(`全部历史 ${fullHist.length} 条`, "逐轮预测需选择单个对话");
		else {
			parts.push(`样本 ${effective.length} 轮`);
			if (series) {
				parts.push(`当前段 ${series.fit.n} 轮`);
				if (series.compactionForecast.detected) parts.push(`最近压缩第 ${series.compactionForecast.lastRound} 轮`);
			}
			if (priceContext?.known) parts.push(`计价 ${priceContext.walletLabel} · ${model || "—"} · ${priceContext.label}`);
			else parts.push("未配置价格，成本类不可用");
		}
		sub.textContent = parts.join(" · ");
	}
}
function kpiCard(label, value, sub, tone = "default", title = "") {
	return `<div class="ds-card aus-forecast-kpi aus-forecast-kpi-${tone}"${title ? ` title="${esc$2(title)}"` : ""}>
    <div class="aus-forecast-kpi-label">${esc$2(label)}</div>
    <div class="aus-forecast-kpi-value">${value}</div>
    <div class="aus-forecast-kpi-sub">${sub}</div>
  </div>`;
}
function renderKpis(series, priceContext, ctxLimit, options, balance) {
	const host = getDoc$3().getElementById("aus-forecast-kpis");
	if (!host) return;
	const remaining = balance != null ? simulateRemainingRounds(balance, series, options) : null;
	const ctxRounds = contextRoundsFor(series, ctxLimit, options.compaction);
	const futureCost = series.future.reduce((sum, point) => sum + (point.cost ?? 0), 0);
	const futureInput = series.future.reduce((sum, point) => sum + point.input, 0);
	const pricingKnown = priceContext?.known === true;
	const costValue = series.next.cost == null || !pricingKnown ? "—" : formatCost(series.next.cost, 4);
	const costSub = series.next.cost == null || !pricingKnown ? "未配置价格，成本类不可用" : series.next.costLow != null && series.next.costHigh != null ? `区间 ${formatCost(series.next.costLow, 4)} – ${formatCost(series.next.costHigh, 4)}` : "按当前模型与时段价格";
	const ctxCompaction = options.compaction && series.compactionForecast.detected;
	const promptOverLimit = ctxLimit != null && series.currentPrompt > ctxLimit;
	const ctxValue = ctxCompaction ? series.compactionForecast.roundsUntilNext != null ? `距下次压缩 ${series.compactionForecast.roundsUntilNext} 轮` : "距下次压缩 —" : ctxRounds != null ? `${ctxRounds} 轮` : ctxLimit != null && series.fit.delta <= 0 ? "可维持" : "—";
	const ctxSub = ctxCompaction ? `预计第 ${series.compactionForecast.nextRound ?? "—"} 轮 · 本次压缩前 ${series.compactionForecast.period ?? "—"} 轮` : ctxLimit != null ? promptOverLimit ? `当前输入 ${compactTok(series.currentPrompt)} 已超过参考上限 ${compactTok(ctxLimit)} tok` : series.fit.delta <= 0 ? "Δ≈0，上下文不再增长" : `上下文上限 ${compactTok(ctxLimit)} tok` : "上下文上限未知";
	const remainingValue = remaining == null ? "—" : `${remaining.R} 轮`;
	const remainingSub = balance == null ? "未设置余额，可在钱包页填写" : !pricingKnown ? "未配置价格，无法估算" : `区间 ${remaining?.low ?? 0} – ${remaining?.high ?? 0} 轮${remaining?.ctxLimited ? " · 受上下文上限限制" : ""}`;
	host.innerHTML = [
		kpiCard("下一轮输入", `${compactTok(series.next.input)} tok`, `区间 ${compactTok(series.next.inputLow)} – ${compactTok(series.next.inputHigh)}`, "default", "基于当前段增长拟合，95% 预测区间"),
		kpiCard("下一轮输出", `${compactTok(series.next.output)} tok`, `非截断样本 ${series.output.samples} 条`, "default", "已剔除截断/异常输出样本"),
		kpiCard("下一轮成本", costValue, costSub, "orange", "按当前计价模型、钱包与下一轮预计时段价格"),
		kpiCard("命中率", pct(series.hit.rate), hitSourceText(series), series.hit.hasData ? "green" : "orange", "有缓存数据时自动测算；无数据时才使用平均命中率"),
		kpiCard("每轮增量 Δ", `${compactTok(series.fit.delta)} tok/轮`, `当前段 ${series.fit.n} 轮 · ${series.fit.model === "linear" ? "线性拟合" : "近期均值"}`, "default", "当前压缩后段的平均每轮新增"),
		kpiCard("余额可撑", remainingValue, remainingSub, remaining != null && remaining.R <= 0 ? "red" : "default", "按预测成本逐轮累加，直到余额不足"),
		kpiCard("上下文可撑", ctxValue, ctxSub, ctxCompaction ? "green" : "default", "未启用压缩预测时按当前 Δ 线性外推"),
		kpiCard("未来 N 轮总成本", pricingKnown ? formatCost(futureCost, 4) : "—", pricingKnown ? `未来 ${series.future.length} 轮 · 输入 ${compactTok(futureInput)} tok` : "未配置价格，成本类不可用", "orange", "按当前视界累加预测成本")
	].join("");
}
function renderHealth(history, model) {
	const host = getDoc$3().getElementById("aus-forecast-health");
	if (!host) return;
	if (!history.length) {
		host.innerHTML = "<div class=\"aus-forecast-empty\">暂无数据</div>";
		return;
	}
	const result = energyScore([...history].sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)), null);
	const colors = {
		A: "#16a34a",
		B: "#22c55e",
		C: "#84cc16",
		D: "#eab308",
		E: "#f97316",
		F: "#ef4444",
		G: "#dc2626"
	};
	const grades = [
		"A",
		"B",
		"C",
		"D",
		"E",
		"F",
		"G"
	];
	const metrics = result.metrics;
	host.innerHTML = `
    <div class="aus-forecast-health-grades">
      ${grades.map((grade) => `<span class="aus-forecast-grade${grade === result.grade ? " is-current" : ""}" style="background:${colors[grade]};">${grade}</span>`).join("")}
    </div>
    <div class="aus-forecast-health-score">
      <span class="aus-forecast-health-score-value" style="color:${colors[result.grade]};">${result.score.toFixed(0)}</span>
      <span class="aus-forecast-health-score-label">综合评分 · ${result.grade} 级</span>
    </div>
    <div class="aus-forecast-health-metrics">
      <div><span>增速 Δ</span><b>${compactTok(metrics.delta)} tok/轮</b></div>
      <div><span>输出</span><b>${compactTok(metrics.out)} tok/轮</b></div>
      <div><span>效率</span><b>${pct(metrics.efficiency)}</b></div>
      <div><span>命中</span><b>${pct(metrics.hitRate)}</b></div>
      <div><span>截断</span><b>${pct(metrics.truncRate)}</b></div>
      <div><span>思维链</span><b>${pct(metrics.thinkRatio)}</b></div>
    </div>
    <div class="aus-forecast-health-foot">样本 ${history.length} 轮 · ${esc$2(model || "—")} · ${esc$2(getForecastLabel(lastFullHistory))}</div>
  `;
}
function renderCompaction(series, options) {
	const host = getDoc$3().getElementById("aus-forecast-compaction");
	if (!host) return;
	const forecast = series.compactionForecast;
	if (!forecast.detected) {
		host.innerHTML = `<div class="aus-forecast-empty">
      未检测到上下文压缩。判定规则：prompt 环比回落 ≥20% 且绝对降幅 ≥1500 tok；若酒馆使用总结/隐藏楼层，压缩点会在这里自动标记。
    </div>`;
		return;
	}
	const list = series.compactions.slice(-3).reverse().map((point) => {
		const gapLabel = point.gapRounds === point.round ? `累计 ${point.gapRounds} 轮` : `间隔 ${point.gapRounds} 轮`;
		return `<div class="aus-forecast-compaction-row">
    <span class="aus-forecast-compaction-round">第 ${point.round} 轮</span>
    <span class="aus-forecast-compaction-change">${compactTok(point.before)} → ${compactTok(point.after)}</span>
    <span class="aus-forecast-compaction-drop">-${Math.round(point.dropPct * 100)}%</span>
    <span class="aus-forecast-compaction-gap">${gapLabel}</span>
  </div>`;
	}).join("");
	host.innerHTML = `
    <div class="aus-forecast-compaction-grid">
      <div><span>本次压缩前</span><b>${forecast.period ?? "—"} 轮</b></div>
      <div><span>压缩后保留</span><b>${forecast.retention != null ? Math.round(forecast.retention * 100) + "%" : "—"}</b></div>
      <div><span>当前段已持续</span><b>${forecast.segmentAge} 轮</b></div>
      <div><span>预计下次压缩</span><b>${forecast.nextRound != null ? `第 ${forecast.nextRound} 轮` : "—"}</b></div>
    </div>
    <div class="aus-forecast-compaction-note">
      ${options.compaction ? `按最近一次压缩前 ${forecast.period ?? "—"} 轮推算，约 ${forecast.roundsUntilNext ?? "—"} 轮后触发。` : "压缩情景已关闭，当前预测按线性外推。"}
      ${forecast.postHitRate != null ? ` 压缩后首轮命中率 ${pct(forecast.postHitRate)}。` : ""}
      ${forecast.medianGap != null ? ` 历史间隔中位 ${forecast.medianGap} 轮。` : ""}
    </div>
    <div class="aus-forecast-compaction-list">${list}</div>
    <div class="aus-forecast-compaction-foot">样本较少时压缩周期仅供参考；预测压缩点会在主图中以橙色虚线标出。</div>
  `;
}
function sortEfficiencyRows(rows) {
	if (!efficiencySort) return rows;
	const { key, dir } = efficiencySort;
	const sign = dir === "asc" ? 1 : -1;
	return [...rows].sort((a, b) => {
		const left = a[key];
		const right = b[key];
		if (left == null && right == null) return 0;
		if (left == null) return 1;
		if (right == null) return -1;
		if (typeof left === "string") return String(left).localeCompare(String(right)) * sign;
		return (Number(left) - Number(right)) * sign;
	});
}
function renderEfficiency(history, scopeLabel) {
	const doc = getDoc$3();
	const host = doc.getElementById("aus-forecast-efficiency");
	const sub = doc.getElementById("aus-forecast-efficiency-sub");
	const scopeButton = doc.getElementById("aus-forecast-scope-btn");
	if (scopeButton) {
		scopeButton.innerHTML = `<span class="aus-forecast-pill-label">范围</span><span class="aus-forecast-pill-value">${scopeLabel}</span>${icon("chevron-down", 14)}`;
		scopeButton.onclick = (event) => {
			event.stopPropagation();
			toggleDropdown("scope");
		};
	}
	const scopeDropdown = doc.getElementById("aus-forecast-scope-dropdown");
	if (scopeDropdown) {
		scopeDropdown.innerHTML = [dropdownItem("data-fscope", "all", "全部历史", efficiencyScope === "all", `${lastFullHistory.length} 条`), dropdownItem("data-fscope", "chat", "当前对话", efficiencyScope === "chat", `${getCurrentChatHist(lastFullHistory).length} 条`)].join("");
		scopeDropdown.querySelectorAll("[data-fscope]").forEach((el) => {
			el.onclick = (event) => {
				event.stopPropagation();
				const value = el.getAttribute("data-fscope");
				if (value === "all" || value === "chat") efficiencyScope = value;
				savePreferences();
				closeAllDropdowns();
				renderForecastView();
			};
		});
	}
	if (!host) return;
	const rows = computeModelEfficiency(history, { priceForModel: (model) => resolvePriceContext(history, model)?.trio ?? null });
	lastEfficiencyHistory = history;
	lastEfficiencyLabel = scopeLabel;
	if (!rows.length) {
		host.innerHTML = "<div class=\"aus-forecast-empty\">暂无模型效率数据</div>";
		if (sub) sub.textContent = `范围：${scopeLabel} · 暂无记录`;
		return;
	}
	const sorted = sortEfficiencyRows(rows);
	const selectableModels = new Set(getModelOptions(lastEffectiveHistory).map((option) => option.model));
	const pricedCosts = sorted.map((row) => row.costPer1kOutput).filter((value) => value != null && value > 0);
	const maxCost = pricedCosts.length ? Math.max(...pricedCosts) : 0;
	const sortArrow = (key) => {
		if (!efficiencySort || efficiencySort.key !== key) return "<span class=\"aus-forecast-sort-arrow\">↕</span>";
		return `<span class="aus-forecast-sort-arrow is-active">${efficiencySort.dir === "asc" ? "↑" : "↓"}</span>`;
	};
	const header = (key, label) => `<th class="aus-forecast-eff-th" data-sort="${key}">${label}${sortArrow(key)}</th>`;
	const firstPriced = sorted.find((row) => row.costPer1kOutput != null);
	const body = sorted.map((row) => {
		const isBest = firstPriced === row;
		const cost = row.costPer1kOutput == null ? "—" : formatCost(row.costPer1kOutput, 4);
		const width = row.costPer1kOutput != null && maxCost > 0 ? Math.max(3, Math.min(100, row.costPer1kOutput / maxCost * 100)) : 0;
		const hit = row.hitRate == null ? "—" : pct(row.hitRate);
		const saving = row.cacheSaving == null ? "—" : pct(row.cacheSaving);
		const avg = row.avgCost == null ? "—" : formatCost(row.avgCost, 4);
		const ratio = row.ioRatio == null ? "—" : `${row.ioRatio.toFixed(1)} : 1`;
		const selectable = selectableModels.has(row.model);
		return `<tr class="aus-forecast-eff-row${row.model === selectedForecastModel ? " is-selected" : ""}" data-eff-model="${esc$2(row.model)}" title="${selectable ? "点击切换为计价模型" : "该模型不在当前对话中，仅作全量对比"}">
      <td><div class="aus-forecast-eff-model"><span>${esc$2(row.model)}</span>${isBest ? "<span class=\"aus-forecast-eff-best\">最省</span>" : ""}</div></td>
      <td>${row.rounds}</td>
      <td>${ratio}</td>
      <td><div class="aus-forecast-eff-cost"><span>${cost}</span><span class="aus-forecast-eff-bar"><i style="width:${width}%"></i></span></div></td>
      <td>${hit}</td>
      <td>${saving}</td>
      <td>${avg}</td>
    </tr>`;
	}).join("");
	host.innerHTML = `<div class="aus-forecast-eff-wrap">
    <table class="aus-forecast-eff-table">
      <thead><tr>
        <th class="aus-forecast-eff-th" data-sort="model">模型${sortArrow("model")}</th>
        ${header("rounds", "轮次")}
        ${header("ioRatio", "输入/输出")}
        ${header("costPer1kOutput", "每 1k 输出成本")}
        ${header("hitRate", "命中率")}
        ${header("cacheSaving", "缓存节省")}
        ${header("avgCost", "平均每轮")}
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
	if (sub) sub.textContent = `范围：${scopeLabel}（${history.length} 条）· 按每 1k 输出成本升序 · 点击行可切换计价模型`;
	host.querySelectorAll("th[data-sort]").forEach((th) => {
		th.onclick = (event) => {
			event.stopPropagation();
			const key = th.getAttribute("data-sort");
			if (!key) return;
			if (efficiencySort && efficiencySort.key === key) efficiencySort = {
				key,
				dir: efficiencySort.dir === "asc" ? "desc" : "asc"
			};
			else efficiencySort = {
				key,
				dir: key === "model" ? "asc" : "asc"
			};
			renderEfficiency(lastEfficiencyHistory, lastEfficiencyLabel);
		};
	});
	host.querySelectorAll("[data-eff-model]").forEach((tr) => {
		tr.onclick = (event) => {
			event.stopPropagation();
			const model = tr.getAttribute("data-eff-model");
			if (!model) return;
			if (!getModelOptions(lastEffectiveHistory).some((option) => option.model === model)) return;
			selectedForecastModel = model;
			closeAllDropdowns();
			renderForecastView();
		};
	});
}
function chatDisplayNameMap(fullHist) {
	const map = /* @__PURE__ */ new Map();
	for (const chat of getRecordedChatsForForecast(fullHist)) map.set(chat.chatId ?? "__null__", chat.displayName);
	return map;
}
function renderTop(fullHist) {
	const doc = getDoc$3();
	const host = doc.getElementById("aus-forecast-top");
	const toggle = doc.getElementById("aus-forecast-top-toggle");
	if (!host || !toggle) return;
	toggle.textContent = `${showTop ? "▾" : "▸"} 最耗对话 Top`;
	toggle.onclick = (event) => {
		event.stopPropagation();
		showTop = !showTop;
		savePreferences();
		renderTop(fullHist);
	};
	host.style.display = showTop ? "block" : "none";
	if (!showTop) return;
	const list = topPowerChats(fullHist, 8);
	if (!list.length) {
		host.innerHTML = "<div class=\"aus-forecast-empty\">暂无对话</div>";
		return;
	}
	const names = chatDisplayNameMap(fullHist);
	const colors = {
		A: "#16a34a",
		B: "#22c55e",
		C: "#84cc16",
		D: "#eab308",
		E: "#f97316",
		F: "#ef4444",
		G: "#dc2626"
	};
	host.innerHTML = list.map((row) => {
		const key = row.chatId ?? "__null__";
		const name = names.get(key) || row.chatId || "未分组/旧数据";
		const entries = fullHist.filter((entry) => (entry.chatId ?? null) === row.chatId);
		const avgCost = entries.length ? entries.reduce((sum, entry) => sum + (Number(entry.cost) || 0), 0) / entries.length : 0;
		const pctWidth = Math.max(4, Math.min(100, row.delta / Math.max(1, list[0].delta) * 100));
		return `<div class="aus-forecast-top-row">
      <span class="aus-forecast-top-name" title="${esc$2(row.chatId || "未分组/旧数据")}">${esc$2(name)}</span>
      <span class="aus-forecast-grade aus-forecast-grade-sm" style="background:${colors[row.grade] || "#9CA3AF"};">${row.grade}</span>
      <span class="aus-forecast-top-bar"><span style="width:${pctWidth}%"></span></span>
      <span class="aus-forecast-top-delta">${compactTok(row.delta)} tok/轮</span>
      <span class="aus-forecast-top-cost">${formatCost(avgCost, 4)}/轮</span>
    </div>`;
	}).join("");
}
function clearCharts(message) {
	disposeForecastCharts();
	const doc = getDoc$3();
	for (const id of [
		"aus-forecast-main-chart",
		"aus-forecast-hit-chart",
		"aus-forecast-cost-chart"
	]) {
		const el = doc.getElementById(id);
		if (el) el.innerHTML = `<div class="aus-forecast-chart-empty">${esc$2(message)}</div>`;
	}
}
function renderNoticeCards(message) {
	const doc = getDoc$3();
	const kpis = doc.getElementById("aus-forecast-kpis");
	if (kpis) kpis.innerHTML = `<div class="ds-card aus-forecast-notice">${esc$2(message)}</div>`;
	const health = doc.getElementById("aus-forecast-health");
	if (health) health.innerHTML = "<div class=\"aus-forecast-empty\">需要单个对话的逐轮数据</div>";
	const compaction = doc.getElementById("aus-forecast-compaction");
	if (compaction) compaction.innerHTML = "<div class=\"aus-forecast-empty\">需要单个对话的逐轮数据</div>";
}
function renderAllNotice() {
	renderNoticeCards("当前选择“全部”历史。逐轮预测、压缩与健康度需要单个对话的时间序列；请从上方对话胶囊选择具体对话。下方模型效率对比仍可查看。");
	clearCharts("请选择单个对话以查看逐轮预测");
	const mainSub = getDoc$3().getElementById("aus-forecast-main-sub");
	if (mainSub) mainSub.textContent = "逐轮预测需要指定单个对话";
}
function renderNoSeries(message) {
	renderNoticeCards(message);
	clearCharts(message);
	const mainSub = getDoc$3().getElementById("aus-forecast-main-sub");
	if (mainSub) mainSub.textContent = message;
}
function renderMainSub(series, ctxLimit) {
	const mainSub = getDoc$3().getElementById("aus-forecast-main-sub");
	if (!mainSub) return;
	const future = series.future.length;
	const parts = [
		`历史 ${series.history.length} 轮`,
		future ? `未来 ${future} 轮` : "未来预测受上下文上限限制",
		"虚线为预测 · 阴影为 95% 区间"
	];
	if (series.compactionForecast.detected) parts.push("橙色标记为压缩点");
	if (ctxLimit != null && series.history.some((point) => point.input > ctxLimit)) parts.push("历史输入已超过参考上限，参考线按当前计价模型估算");
	mainSub.textContent = parts.join(" · ");
}
async function renderForecastView() {
	const token = ++renderToken;
	let fullHist = [];
	try {
		fullHist = await repository.getAllHistory();
	} catch {
		fullHist = state$2.history || [];
	}
	if (token !== renderToken) return;
	lastFullHistory = fullHist;
	bindGlobalClose();
	const effective = getEffectiveHist(fullHist);
	lastEffectiveHistory = effective;
	const modelOptions = getModelOptions(effective);
	if (!selectedForecastModel || !modelOptions.some((option) => option.model === selectedForecastModel)) selectedForecastModel = modelOptions[0]?.model || null;
	const model = selectedForecastModel;
	const priceContext = model ? resolvePriceContext(effective, model) : null;
	const ctxLimit = model ? ctxLimitForModel(model, (priceContext?.walletModel)?.contextLimit) : null;
	const globalRate = computeGlobalHitRate(fullHist);
	const modelRate = model ? computeModelHitRate(fullHist, model) : null;
	const hitFallback = {
		mode: hitMode,
		globalRate,
		modelRate,
		manualRate: manualHitRate / 100
	};
	const options = {
		horizon,
		pricing: priceContext?.known && priceContext.trio ? priceContext.trio : null,
		ctxLimit,
		hitFallback,
		compaction: compactionEnabled
	};
	const series = selectedForecastKey !== "__all__" && effective.length ? buildForecastSeries(effective, options) : null;
	renderToolbar(fullHist, effective, modelOptions, model, priceContext, series, globalRate, modelRate);
	if (!fullHist.length) {
		renderNoSeries("暂无数据，发起一次对话后自动统计");
		renderEfficiency(fullHist, "全部历史");
		renderTop(fullHist);
		return;
	}
	if (selectedForecastKey === "__all__") {
		renderAllNotice();
		renderEfficiency(efficiencyScope === "all" ? fullHist : getCurrentChatHist(fullHist), efficiencyScope === "all" ? "全部历史" : "当前对话");
		renderTop(fullHist);
		return;
	}
	if (!series) {
		renderNoSeries(selectedForecastKey === "__current__" && !currentChatId() ? "未打开对话。请先进入一个聊天，或从上方选择一个具体对话。" : "当前对话暂无可用于预测的记录，继续对话后自动启用。");
		renderEfficiency(efficiencyScope === "all" ? fullHist : effective, efficiencyScope === "all" ? "全部历史" : "当前对话");
		renderTop(fullHist);
		return;
	}
	renderMainSub(series, ctxLimit);
	renderKpis(series, priceContext, ctxLimit, options, balanceNum());
	renderHealth(effective, model);
	renderCompaction(series, options);
	renderEfficiency(efficiencyScope === "all" ? fullHist : effective, efficiencyScope === "all" ? "全部历史" : "当前对话");
	renderTop(fullHist);
	try {
		await renderForecastCharts({
			series,
			ctxLimit,
			currency: currencyInfo(),
			formatCost: (value, digits) => formatCost(value, digits ?? 4)
		});
	} catch (error) {
		console.error("[Api-Usage] 趋势预测图表渲染失败", error);
	}
}
function initForecastView() {
	loadPreferences();
	bindGlobalClose();
}
//#endregion
//#region src/ui/wallet-view.ts
function getDoc$2() {
	return window.parent?.document ?? document;
}
function money(cny, digits = 4) {
	try {
		return formatMoney(cny, digits);
	} catch {
		return `¥${cny.toFixed(digits)} CNY`;
	}
}
function walletBalanceText(wallet) {
	const amount = wallet.balance.amount == null || wallet.balance.amount === "" ? NaN : parseFloat(String(wallet.balance.amount));
	if (!Number.isFinite(amount)) return "未设置";
	return `${wallet.balance.currency === "USD" ? "$" : "¥"}${amount.toFixed(4)} ${wallet.balance.currency}`;
}
function displayToCny(value) {
	const number = typeof value === "number" ? value : parseFloat(String(value));
	if (!Number.isFinite(number)) return 0;
	const currency = getDisplayCurrency();
	return currency.code === "USD" ? number * currency.rate : number;
}
function cnyToDisplay(value) {
	const number = typeof value === "number" ? value : parseFloat(String(value));
	if (!Number.isFinite(number)) return "0";
	const currency = getDisplayCurrency();
	const result = currency.code === "USD" ? number / currency.rate : number;
	return String(Math.round(result * 1e6) / 1e6);
}
function closeDropdowns() {
	getDoc$2().querySelectorAll("[data-wallet-dropdown]").forEach((el) => {
		el.style.display = "none";
	});
}
function closeOtherDropdowns(id) {
	getDoc$2().querySelectorAll("[data-wallet-dropdown]").forEach((el) => {
		if (el.id !== id) el.style.display = "none";
	});
}
function dropdownHtml(walletId, kind, options) {
	return options.map((option) => `
    <div data-wallet-select="${esc$2(kind)}" data-wallet-id="${esc$2(walletId)}" data-value="${esc$2(option.id)}"
      style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-sm);${option.active ? "background:var(--ds-card);font-weight:600;" : ""}">
      ${esc$2(option.label)}
    </div>
  `).join("");
}
function sourceLabel(model) {
	if (model.source === "builtin") return "内置";
	if (model.source === "sync") return "同步";
	if (model.source === "manual") return "自定义";
	return "待定价";
}
function priceField(walletId, modelId, tier, key, value) {
	return `<input type="number" step="0.000001" min="0" data-wallet-price="1" data-wallet-id="${esc$2(walletId)}"
    data-model-id="${esc$2(modelId)}" data-tier="${tier}" data-key="${key}" value="${esc$2(cnyToDisplay(value))}"
    style="width:100%;min-width:72px;padding:5px 6px;border:1px solid var(--ds-border);border-radius:7px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);" />`;
}
function renderModelRows(wallet) {
	const models = [...wallet.models].sort((a, b) => {
		return Number(!a.price.priceConfigured) - Number(!b.price.priceConfigured) || a.model.localeCompare(b.model, "zh-CN");
	});
	if (!models.length) return "<tr><td colspan=\"7\" style=\"padding:14px;text-align:center;color:var(--ds-text-3);\">尚未识别到模型，可手动添加或等待请求接入</td></tr>";
	return models.map((model) => {
		const pending = !model.price.priceConfigured;
		const canDelete = model.source !== "builtin";
		return `
      <tr data-wallet-model-row="${esc$2(model.id)}" style="border-top:1px solid var(--ds-border);">
        <td style="padding:8px 6px;min-width:180px;">
          <input data-wallet-model-name="1" data-wallet-id="${esc$2(wallet.id)}" data-model-id="${esc$2(model.id)}"
            value="${esc$2(model.model)}"
            style="width:100%;padding:6px 7px;border:1px solid var(--ds-border);border-radius:7px;background:${model.source === "builtin" ? "var(--ds-sidebar-bg)" : "var(--ds-card-inner)"};color:var(--ds-text);font-size:var(--aus-fs-sm);" />
          <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:3px;">${esc$2(model.sourceModel)}${model.aliases.length ? ` · 别名 ${esc$2(model.aliases.join("、"))}` : ""}</div>
          <label style="display:flex;align-items:center;gap:5px;margin-top:5px;font-size:var(--aus-fs-sm);color:var(--ds-text-3);">
            上下文上限
            <input type="number" min="1" step="1000" data-wallet-context-limit="1" data-wallet-id="${esc$2(wallet.id)}" data-model-id="${esc$2(model.id)}"
              value="${model.contextLimit ?? ""}" placeholder="未知"
              style="width:80px;padding:3px 5px;border:1px solid var(--ds-border);border-radius:6px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);" />
          </label>
        </td>
        <td style="padding:8px 6px;white-space:nowrap;">
          <span style="padding:2px 7px;border-radius:999px;background:${pending ? "var(--ds-red-bg)" : model.source === "sync" ? "var(--ds-green-bg)" : "var(--ds-card)"};color:${pending ? "var(--ds-red)" : model.source === "sync" ? "var(--ds-green)" : "var(--ds-text-2)"};font-size:var(--aus-fs-sm);">${sourceLabel(model)}</span>
        </td>
        <td style="padding:8px 6px;min-width:224px;">
          <div style="display:grid;grid-template-columns:repeat(3,minmax(68px,1fr));gap:4px;">${priceField(wallet.id, model.id, "offpeak", "hit", model.price.offpeak.hit)}${priceField(wallet.id, model.id, "offpeak", "miss", model.price.offpeak.miss)}${priceField(wallet.id, model.id, "offpeak", "output", model.price.offpeak.output)}</div>
        </td>
        <td style="padding:8px 6px;min-width:224px;opacity:${model.price.usePeakPricing ? "1" : "0.45"};">
          <div style="display:grid;grid-template-columns:repeat(3,minmax(68px,1fr));gap:4px;">${priceField(wallet.id, model.id, "peak", "hit", model.price.peak.hit)}${priceField(wallet.id, model.id, "peak", "miss", model.price.peak.miss)}${priceField(wallet.id, model.id, "peak", "output", model.price.peak.output)}</div>
        </td>
        <td style="padding:8px 6px;text-align:center;"><input type="checkbox" data-wallet-model-peak="1" data-wallet-id="${esc$2(wallet.id)}" data-model-id="${esc$2(model.id)}" ${model.price.usePeakPricing ? "checked" : ""} /></td>
        <td style="padding:8px 6px;text-align:center;"><input type="checkbox" data-wallet-model-lock="1" data-wallet-id="${esc$2(wallet.id)}" data-model-id="${esc$2(model.id)}" ${model.locked ? "checked" : ""} /></td>
        <td style="padding:8px 6px;text-align:center;">${canDelete ? `<button data-wallet-model-delete="1" data-wallet-id="${esc$2(wallet.id)}" data-model-id="${esc$2(model.id)}" style="padding:4px 8px;border:1px solid var(--ds-red-border);border-radius:7px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">删除</button>` : "—"}</td>
      </tr>`;
	}).join("");
}
function renderPeakRows(wallet) {
	if (!wallet.peakHours.length) return "<div style=\"font-size:var(--aus-fs-sm);color:var(--ds-text-3);\">暂无高峰时段</div>";
	return wallet.peakHours.map((item, index) => `
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="time" data-wallet-peak="1" data-wallet-id="${esc$2(wallet.id)}" data-peak-index="${index}" data-peak-field="start" value="${esc$2(item.start)}" style="flex:1;padding:6px 8px;border:1px solid var(--ds-border);border-radius:7px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);" />
      <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">至</span>
      <input type="time" data-wallet-peak="1" data-wallet-id="${esc$2(wallet.id)}" data-peak-index="${index}" data-peak-field="end" value="${esc$2(item.end)}" style="flex:1;padding:6px 8px;border:1px solid var(--ds-border);border-radius:7px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);" />
      <button data-wallet-peak-delete="1" data-wallet-id="${esc$2(wallet.id)}" data-peak-index="${index}" style="padding:5px 8px;border:1px solid var(--ds-red-border);border-radius:7px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">删除</button>
    </div>
  `).join("");
}
function renderCredentialPicker(wallet) {
	const current = wallet.credentials.find((item) => item.id === wallet.balance.primaryCredentialId);
	return `
    <button data-wallet-credential-btn="1" data-wallet-id="${esc$2(wallet.id)}" style="display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;max-width:100%;">
      <span style="color:var(--ds-text-2);">主密钥</span>
      <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px;">${esc$2(current?.label || "未指定")}</span>
      ${icon("chevron-down", 14)}
    </button>
    <div id="aus-wallet-credential-drop-${esc$2(wallet.id)}" data-wallet-dropdown="1" style="display:none;position:absolute;top:38px;left:0;z-index:30;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:220px;max-width:320px;">
      ${dropdownHtml(wallet.id, "credential", [{
		id: "",
		label: "无（使用钱包内校准密钥）",
		active: !wallet.balance.primaryCredentialId
	}, ...wallet.credentials.map((item) => ({
		id: item.id,
		label: item.label,
		active: item.id === wallet.balance.primaryCredentialId
	}))])}
    </div>`;
}
function renderCatalogPicker(wallet) {
	const current = WALLET_CATALOG_PROVIDERS.find((item) => item.id === wallet.catalogProvider);
	return `
    <button data-wallet-catalog-btn="1" data-wallet-id="${esc$2(wallet.id)}" style="display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">
      <span style="color:var(--ds-text-2);">价格来源</span>
      <span style="font-weight:600;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc$2(current?.label || "不自动同步")}</span>
      ${icon("chevron-down", 14)}
    </button>
    <div id="aus-wallet-catalog-drop-${esc$2(wallet.id)}" data-wallet-dropdown="1" style="display:none;position:absolute;top:38px;right:0;z-index:30;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:180px;max-height:260px;overflow:auto;">
      ${dropdownHtml(wallet.id, "catalog", [{
		id: "",
		label: "不自动同步",
		active: !wallet.catalogProvider
	}, ...WALLET_CATALOG_PROVIDERS.map((item) => ({
		id: item.id,
		label: item.label,
		active: item.id === wallet.catalogProvider
	}))])}
    </div>`;
}
function renderWalletCard(wallet, history) {
	const avatarLetter = (() => {
		const first = String(wallet.name || wallet.endpointDisplay || wallet.endpointLabel || "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^api\./i, "").replace(/^[^0-9a-zA-Z\u4e00-\u9fa5]+/, "").charAt(0);
		return first ? first.toUpperCase() : "?";
	})();
	const pending = walletPendingModelCount(wallet);
	const isOfficial = wallet.id === DEEPSEEK_WALLET_ID;
	const selectedCredential = wallet.credentials.find((item) => item.id === wallet.balance.primaryCredentialId);
	const collapsed = wallet.collapsed !== false;
	const metrics = [{
		label: "余额",
		value: walletBalanceText(wallet),
		title: walletBalanceText(wallet)
	}, {
		label: "模型",
		value: `${wallet.models.length} 个`,
		title: "已识别模型数量"
	}];
	return `
    <section class="ds-card" data-wallet-card="${esc$2(wallet.id)}" style="display:grid;gap:12px;">
      <div class="aus-wallet-header">
        <div class="aus-wallet-avatar" title="${esc$2(wallet.name)}">${esc$2(avatarLetter)}</div>
        <div class="aus-wallet-identity">
          <div class="aus-wallet-name-row">
            <input data-wallet-name="1" data-wallet-id="${esc$2(wallet.id)}" value="${esc$2(wallet.name)}" />
            <span class="${isOfficial ? "aus-wallet-badge-official" : "aus-wallet-badge-relay"}" style="padding:3px 8px;border-radius:999px;background:${isOfficial ? "var(--ds-green-bg)" : "var(--ds-card-inner)"};color:${isOfficial ? "var(--ds-green)" : "var(--ds-text-2)"};font-size:var(--aus-fs-sm);white-space:nowrap;">${isOfficial ? "DeepSeek 官方" : "中转/自定义"}</span>
            ${pending ? `<span style="padding:3px 8px;border-radius:999px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);white-space:nowrap;">${pending} 个待定价</span>` : ""}
          </div>
          <div class="aus-wallet-sub">${esc$2(wallet.endpointDisplay || wallet.endpointLabel || "本机官方接口")} · ${esc$2(wallet.sourceType || "未识别")}</div>
        </div>
        <div class="aus-wallet-metrics">
          ${metrics.map((item) => `<div class="aus-wallet-metric" title="${esc$2(item.title)}"><div class="aus-wallet-metric-label">${esc$2(item.label)}</div><div class="aus-wallet-metric-value">${esc$2(item.value)}</div></div>`).join("")}
        </div>
        <div class="aus-wallet-actions">
          <button class="aus-wallet-icon-btn" data-wallet-toggle="1" data-wallet-id="${esc$2(wallet.id)}" title="${collapsed ? "展开钱包详情" : "收起钱包详情"}" aria-label="${collapsed ? "展开钱包详情" : "收起钱包详情"}">${collapsed ? icon("chevron-down", 16) : icon("chevron-up", 16)}</button>
          ${wallet.catalogProvider ? `<button class="aus-wallet-icon-btn" data-wallet-sync="1" data-wallet-id="${esc$2(wallet.id)}" title="按价格来源同步模型价格" aria-label="同步价格">${icon("refresh", 16)}</button>` : ""}
          ${isOfficial ? "" : `<button class="aus-wallet-icon-btn is-danger" data-wallet-ignore="1" data-wallet-id="${esc$2(wallet.id)}" title="忽略该钱包（历史与统计保留）" aria-label="忽略钱包">${icon("close", 16)}</button>`}
        </div>
      </div>

      <div data-wallet-body="1" style="display:${collapsed ? "none" : "grid"};gap:12px;">
      <div class="aus-wallet-two-col" style="display:grid;grid-template-columns:minmax(250px,1fr) minmax(260px,1fr);gap:10px;">
        <div style="border:1px solid var(--ds-border);border-radius:10px;padding:10px;display:grid;gap:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);">钱包余额</div><div style="font-size:17px;font-weight:700;color:var(--ds-text);">${esc$2(walletBalanceText(wallet))}</div></div>
            <label style="display:flex;align-items:center;gap:6px;font-size:var(--aus-fs-sm);color:var(--ds-text-2);cursor:${isOfficial ? "pointer" : "not-allowed"};">
              <input type="checkbox" data-wallet-auto-balance="1" data-wallet-id="${esc$2(wallet.id)}" ${wallet.balance.mode === "auto" ? "checked" : ""} ${isOfficial ? "" : "disabled"} /> 自动校准
            </label>
          </div>
          <div style="display:flex;gap:6px;align-items:center;position:relative;">
            <input data-wallet-balance-amount="1" data-wallet-id="${esc$2(wallet.id)}" value="${esc$2(wallet.balance.amount ?? "")}" placeholder="手工余额" style="flex:1;min-width:0;padding:7px 9px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);" />
            <button data-wallet-currency-btn="1" data-wallet-id="${esc$2(wallet.id)}" style="padding:7px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">${wallet.balance.currency}${icon("chevron-down", 14)}</button>
            <div id="aus-wallet-currency-drop-${esc$2(wallet.id)}" data-wallet-dropdown="1" style="display:none;position:absolute;top:38px;right:0;z-index:30;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:6px;min-width:110px;">
              ${dropdownHtml(wallet.id, "currency", [{
		id: "CNY",
		label: "CNY",
		active: wallet.balance.currency === "CNY"
	}, {
		id: "USD",
		label: "USD",
		active: wallet.balance.currency === "USD"
	}])}
            </div>
          </div>
          ${isOfficial ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;position:relative;">
              ${renderCredentialPicker(wallet)}
              <button data-wallet-calibrate="1" data-wallet-id="${esc$2(wallet.id)}" style="padding:7px 11px;border:1px solid var(--ds-black);border-radius:999px;background:var(--ds-black);color:var(--ds-black-text);font-size:var(--aus-fs-sm);cursor:pointer;">立即校准</button>
            </div>
            <div style="display:flex;gap:6px;">
              <input type="password" data-wallet-api-key="1" data-wallet-id="${esc$2(wallet.id)}" value="" placeholder="${getWalletApiKey(wallet.id) ? "已保存钱包校准密钥（留空不修改）" : "填写钱包校准密钥"}" style="flex:1;min-width:0;padding:7px 9px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);" />
              <button data-wallet-save-key="1" data-wallet-id="${esc$2(wallet.id)}" style="padding:7px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">保存密钥</button>
            </div>
            <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">自动校准仅支持 DeepSeek 官方直连，并需在设置开启自动校准总开关；主密钥：${esc$2(selectedCredential?.label || "未指定")}</div>
            <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);word-break:break-all;">已识别密钥：${wallet.credentials.length ? wallet.credentials.map((item) => esc$2(item.label)).join("、") : "未识别"}</div>
          ` : `<div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">该接入暂不支持自动余额校准，请手工维护余额。</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);word-break:break-all;">已识别密钥：${wallet.credentials.length ? wallet.credentials.map((item) => esc$2(item.label)).join("、") : "未识别"}</div>`}
        </div>

        <div style="border:1px solid var(--ds-border);border-radius:10px;padding:10px;display:grid;gap:8px;position:relative;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <div style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">峰谷规则</div>
            ${renderCatalogPicker(wallet)}
          </div>
          <div style="display:grid;gap:6px;">${renderPeakRows(wallet)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <label style="display:flex;align-items:center;gap:6px;font-size:var(--aus-fs-sm);color:var(--ds-text-2);cursor:pointer;"><input type="checkbox" data-wallet-weekend="1" data-wallet-id="${esc$2(wallet.id)}" ${wallet.weekendOffpeak ? "checked" : ""} /> 周末全天按低谷</label>
            <button data-wallet-add-peak="1" data-wallet-id="${esc$2(wallet.id)}" style="padding:6px 9px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">+ 添加时段</button>
          </div>
          ${isOfficial ? `<div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);line-height:1.6;">官方接口按 DeepSeek 规则计费：中国法定节假日全天空闲（内置数据覆盖 ${CN_HOLIDAY_COVERAGE_LABEL}），调休上班的周末同样按空闲计价，可在设置中补充额外空闲日期。</div>` : ""}
        </div>
      </div>

      <div style="border:1px solid var(--ds-border);border-radius:10px;padding:10px;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <div><div style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">模型与价格</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">单位 ${getDisplayCurrency().code}/百万 tokens；模型改名会保留旧名别名</div></div>
          <button data-wallet-add-model="1" data-wallet-id="${esc$2(wallet.id)}" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">+ 添加模型</button>
        </div>
        <div style="width:100%;overflow-x:auto;">
          <table style="width:100%;min-width:900px;border-collapse:collapse;font-size:var(--aus-fs-sm);">
            <thead><tr style="text-align:center;color:var(--ds-text-2);"><th style="text-align:left;padding:5px 6px;">模型</th><th style="padding:5px 6px;">来源</th><th style="padding:5px 6px;">非峰（命中/未命中/输出）</th><th style="padding:5px 6px;">高峰（命中/未命中/输出）</th><th style="padding:5px 6px;">峰谷</th><th style="padding:5px 6px;">锁定</th><th style="padding:5px 6px;">操作</th></tr></thead>
            <tbody>${renderModelRows(wallet)}</tbody>
          </table>
        </div>
      </div>
      </div>
    </section>`;
}
function renderIgnoredWallets(ignored, wallets) {
	return ignored.map((id) => {
		const wallet = wallets.find((item) => item.id === id);
		if (!wallet) return "";
		return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid var(--ds-border);">
      <div><div style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">${esc$2(wallet.name)}</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">${esc$2(wallet.endpointDisplay || wallet.endpointLabel || "")}</div></div>
      <button data-wallet-restore="1" data-wallet-id="${esc$2(wallet.id)}" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">恢复显示</button>
    </div>`;
	}).filter(Boolean).join("") || "<div style=\"font-size:var(--aus-fs-sm);color:var(--ds-text-3);\">暂无已忽略接入</div>";
}
var walletRenderToken = 0;
async function renderWalletView() {
	const doc = getDoc$2();
	const host = doc.getElementById("aus-wallet");
	if (!host) return;
	const token = ++walletRenderToken;
	const history = await repository.getAllHistory();
	if (token !== walletRenderToken || !host.isConnected) return;
	const wallets = repository.getWallets();
	const ignored = repository.getIgnoredWalletIds();
	const ignoredSet = new Set(ignored);
	const active = wallets.filter((wallet) => !ignoredSet.has(wallet.id));
	let balanceCny = 0;
	let balanceCount = 0;
	let pending = 0;
	for (const wallet of active) {
		const value = walletBalanceToCny(wallet, getWalletExchangeRate());
		if (value != null) {
			balanceCny += value;
			balanceCount++;
		}
		pending += walletPendingModelCount(wallet);
	}
	host.innerHTML = `
    <div style="display:grid;gap:12px;">
      <div class="ds-card aus-wallet-summary" id="aus-wallet-summary" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
        <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);">钱包余额合计</div><div style="font-size:20px;font-weight:700;color:var(--ds-text);margin-top:4px;">${money(balanceCny, 2)}</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:2px;">${balanceCount} 个钱包已设置余额</div></div>
        <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);">钱包数量</div><div style="font-size:20px;font-weight:700;color:var(--ds-text);margin-top:4px;">${active.length}</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:2px;">已忽略 ${ignored.length} 个</div></div>
        <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);">待定价模型</div><div style="font-size:20px;font-weight:700;color:${pending ? "var(--ds-red)" : "var(--ds-green)"};margin-top:4px;">${pending}</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:2px;">保存价格后自动重算</div></div>
      </div>
      ${active.map((wallet) => renderWalletCard(wallet, history)).join("")}
      <div class="ds-card">
        <div style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);margin-bottom:2px;">已忽略接入</div>
        ${renderIgnoredWallets(ignored, wallets)}
      </div>
    </div>`;
	bindWalletView(doc);
}
function readModelPrices(row) {
	const result = {
		offpeak: {
			hit: 0,
			miss: 0,
			output: 0
		},
		peak: {
			hit: 0,
			miss: 0,
			output: 0
		}
	};
	row.querySelectorAll("input[data-wallet-price]").forEach((input) => {
		const tier = input.getAttribute("data-tier");
		const key = input.getAttribute("data-key");
		if ((tier === "offpeak" || tier === "peak") && (key === "hit" || key === "miss" || key === "output")) result[tier][key] = displayToCny(input.value);
	});
	return result;
}
function bindWalletView(doc) {
	doc.querySelectorAll("[data-wallet-toggle]").forEach((button) => {
		button.onclick = () => {
			const walletId = button.getAttribute("data-wallet-id");
			if (!walletId) return;
			repository.updateWallet(walletId, (wallet) => {
				wallet.collapsed = wallet.collapsed === false;
			});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-name]").forEach((input) => {
		input.onchange = () => {
			const walletId = input.getAttribute("data-wallet-id");
			const name = String(input.value || "").trim();
			if (!walletId || !name) return renderWalletView();
			repository.updateWallet(walletId, (wallet) => {
				wallet.name = name;
			});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-balance-amount]").forEach((input) => {
		input.onchange = () => {
			const walletId = input.getAttribute("data-wallet-id");
			if (!walletId) return;
			repository.updateWallet(walletId, (wallet) => {
				wallet.balance.amount = String(input.value || "").trim() || null;
				wallet.balance.mode = wallet.balance.mode === "auto" ? "auto" : "manual";
			});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-auto-balance]").forEach((input) => {
		input.onchange = () => {
			const walletId = input.getAttribute("data-wallet-id");
			if (!walletId) return;
			repository.updateWallet(walletId, (wallet) => {
				wallet.balance.mode = input.checked ? "auto" : "manual";
			});
			try {
				import("./balance-C3MhaV_X.js").then((n) => n.t).then((mod) => mod.restartBalanceTimer?.());
			} catch {}
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-weekend]").forEach((input) => {
		input.onchange = () => {
			const walletId = input.getAttribute("data-wallet-id");
			if (!walletId) return;
			repository.updateWallet(walletId, (wallet) => {
				wallet.weekendOffpeak = !!input.checked;
			});
			repository.recalcWallet(walletId).catch(() => {});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-save-key]").forEach((button) => {
		button.onclick = () => {
			const walletId = button.getAttribute("data-wallet-id");
			const input = doc.querySelector(`[data-wallet-api-key][data-wallet-id="${walletId}"]`);
			if (!walletId || !input) return;
			saveWalletApiKey(walletId, input.value.trim());
			toast("success", input.value.trim() ? "钱包校准密钥已保存" : "钱包校准密钥已清除");
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-calibrate]").forEach((button) => {
		button.onclick = async () => {
			const walletId = button.getAttribute("data-wallet-id");
			if (!walletId) return;
			button.textContent = "校准中…";
			await queryWalletBalance(walletId, false);
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-sync]").forEach((button) => {
		button.onclick = async () => {
			button.textContent = "同步中…";
			await syncPricingFromModelsDev({ silent: false });
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-ignore]").forEach((button) => {
		button.onclick = () => {
			const walletId = button.getAttribute("data-wallet-id");
			if (!walletId) return;
			repository.setWalletIgnored(walletId, true);
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-restore]").forEach((button) => {
		button.onclick = () => {
			const walletId = button.getAttribute("data-wallet-id");
			if (!walletId) return;
			repository.setWalletIgnored(walletId, false);
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-add-peak]").forEach((button) => {
		button.onclick = () => {
			const walletId = button.getAttribute("data-wallet-id");
			if (!walletId) return;
			repository.updateWallet(walletId, (wallet) => {
				wallet.peakHours.push({
					start: "09:00",
					end: "12:00"
				});
			});
			repository.recalcWallet(walletId).catch(() => {});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-peak]").forEach((input) => {
		input.onchange = () => {
			const walletId = input.getAttribute("data-wallet-id");
			const index = parseInt(input.getAttribute("data-peak-index") || "-1", 10);
			const field = input.getAttribute("data-peak-field");
			if (!walletId || index < 0 || field !== "start" && field !== "end") return;
			repository.updateWallet(walletId, (wallet) => {
				const item = wallet.peakHours[index];
				if (!item) return;
				if (field === "start") item.start = input.value;
				else item.end = input.value;
			});
			repository.recalcWallet(walletId).catch(() => {});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-peak-delete]").forEach((button) => {
		button.onclick = () => {
			const walletId = button.getAttribute("data-wallet-id");
			const index = parseInt(button.getAttribute("data-peak-index") || "-1", 10);
			if (!walletId || index < 0) return;
			repository.updateWallet(walletId, (wallet) => {
				if (wallet.peakHours.length <= 1) return;
				wallet.peakHours.splice(index, 1);
			});
			repository.recalcWallet(walletId).catch(() => {});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-add-model]").forEach((button) => {
		button.onclick = () => {
			const walletId = button.getAttribute("data-wallet-id");
			if (!walletId) return;
			const modelName = window.prompt("输入模型名");
			if (!modelName || !modelName.trim()) return;
			const name = modelName.trim();
			repository.updateWallet(walletId, (wallet) => {
				if (wallet.models.some((item) => item.model === name)) return;
				const now = Date.now();
				wallet.models.push({
					id: `manual:${now}:${Math.random().toString(36).slice(2, 8)}`,
					sourceModel: name,
					model: name,
					aliases: [],
					price: {
						usePeakPricing: true,
						offpeak: {
							hit: 0,
							miss: 0,
							output: 0
						},
						peak: {
							hit: 0,
							miss: 0,
							output: 0
						},
						priceConfigured: false
					},
					source: "discovered",
					locked: false,
					discoveredAt: now,
					lastSeen: now,
					updatedAt: now
				});
			});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-model-name]").forEach((input) => {
		input.onchange = () => {
			const walletId = input.getAttribute("data-wallet-id");
			const modelId = input.getAttribute("data-model-id");
			const nextName = String(input.value || "").trim();
			if (!walletId || !modelId || !nextName) return renderWalletView();
			repository.updateWallet(walletId, (wallet) => {
				const model = wallet.models.find((item) => item.id === modelId);
				if (!model || model.model === nextName) return;
				if (model.model && !model.aliases.includes(model.model)) model.aliases.push(model.model);
				model.model = nextName;
				model.source = model.source === "builtin" ? "manual" : model.source;
				model.updatedAt = Date.now();
			});
			repository.recalcWallet(walletId).catch(() => {});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-context-limit]").forEach((input) => {
		input.onchange = () => {
			const walletId = input.getAttribute("data-wallet-id");
			const modelId = input.getAttribute("data-model-id");
			if (!walletId || !modelId) return;
			const value = parseFloat(String(input.value || ""));
			const contextLimit = Number.isFinite(value) && value > 0 ? Math.round(value) : null;
			repository.updateWallet(walletId, (wallet) => {
				const model = wallet.models.find((item) => item.id === modelId);
				if (model) {
					model.contextLimit = contextLimit ?? defaultContextLimitForModel(model.sourceModel);
					model.contextLimitManual = contextLimit != null;
				}
			});
			renderWalletView();
		};
	});
	doc.querySelectorAll("input[data-wallet-price]").forEach((input) => {
		input.onchange = () => {
			const row = input.closest("[data-wallet-model-row]");
			const walletId = input.getAttribute("data-wallet-id");
			const modelId = input.getAttribute("data-model-id");
			if (!row || !walletId || !modelId) return;
			const prices = readModelPrices(row);
			repository.updateWallet(walletId, (wallet) => {
				const model = wallet.models.find((item) => item.id === modelId);
				if (!model) return;
				model.price.offpeak = prices.offpeak;
				model.price.peak = prices.peak;
				model.price.priceConfigured = true;
				model.source = "manual";
				model.updatedAt = Date.now();
			});
			repository.recalcWallet(walletId).catch(() => {});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-model-peak]").forEach((input) => {
		input.onchange = () => {
			const walletId = input.getAttribute("data-wallet-id");
			const modelId = input.getAttribute("data-model-id");
			if (!walletId || !modelId) return;
			repository.updateWallet(walletId, (wallet) => {
				const model = wallet.models.find((item) => item.id === modelId);
				if (!model) return;
				model.price.usePeakPricing = !!input.checked;
				model.updatedAt = Date.now();
			});
			repository.recalcWallet(walletId).catch(() => {});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-model-lock]").forEach((input) => {
		input.onchange = () => {
			const walletId = input.getAttribute("data-wallet-id");
			const modelId = input.getAttribute("data-model-id");
			if (!walletId || !modelId) return;
			repository.updateWallet(walletId, (wallet) => {
				const model = wallet.models.find((item) => item.id === modelId);
				if (model) model.locked = !!input.checked;
			});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-model-delete]").forEach((button) => {
		button.onclick = () => {
			const walletId = button.getAttribute("data-wallet-id");
			const modelId = button.getAttribute("data-model-id");
			if (!walletId || !modelId) return;
			repository.updateWallet(walletId, (wallet) => {
				wallet.models = wallet.models.filter((item) => item.id !== modelId || item.source === "builtin");
			});
			repository.recalcWallet(walletId).catch(() => {});
			renderWalletView();
		};
	});
	doc.querySelectorAll("[data-wallet-currency-btn]").forEach((button) => {
		button.onclick = (event) => {
			event.stopPropagation();
			const walletId = button.getAttribute("data-wallet-id");
			const dropdown = doc.getElementById(`aus-wallet-currency-drop-${walletId}`);
			if (!dropdown) return;
			closeOtherDropdowns(dropdown.id);
			dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
		};
	});
	doc.querySelectorAll("[data-wallet-catalog-btn]").forEach((button) => {
		button.onclick = (event) => {
			event.stopPropagation();
			const walletId = button.getAttribute("data-wallet-id");
			const dropdown = doc.getElementById(`aus-wallet-catalog-drop-${walletId}`);
			if (!dropdown) return;
			closeOtherDropdowns(dropdown.id);
			dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
		};
	});
	doc.querySelectorAll("[data-wallet-credential-btn]").forEach((button) => {
		button.onclick = (event) => {
			event.stopPropagation();
			const walletId = button.getAttribute("data-wallet-id");
			const dropdown = doc.getElementById(`aus-wallet-credential-drop-${walletId}`);
			if (!dropdown) return;
			closeOtherDropdowns(dropdown.id);
			dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
		};
	});
	doc.querySelectorAll("[data-wallet-select]").forEach((item) => {
		item.onclick = (event) => {
			event.stopPropagation();
			const walletId = item.getAttribute("data-wallet-id");
			const kind = item.getAttribute("data-wallet-select");
			const value = item.getAttribute("data-value") || "";
			if (!walletId) return;
			if (kind === "currency") repository.updateWallet(walletId, (wallet) => {
				wallet.balance.currency = value;
			});
			else if (kind === "catalog") repository.updateWallet(walletId, (wallet) => {
				wallet.catalogProvider = value || null;
			});
			else if (kind === "credential") repository.updateWallet(walletId, (wallet) => {
				wallet.balance.primaryCredentialId = value || null;
			});
			closeDropdowns();
			renderWalletView();
		};
	});
	if (!bindWalletView._outsideBound) {
		bindWalletView._outsideBound = true;
		doc.addEventListener("click", (event) => {
			const target = event.target;
			if (!target?.closest?.("[data-wallet-dropdown]") && !target?.closest?.("[data-wallet-currency-btn]") && !target?.closest?.("[data-wallet-catalog-btn]") && !target?.closest?.("[data-wallet-credential-btn]")) closeDropdowns();
		});
	}
}
//#endregion
//#region src/ui/panel.ts
/** 面板首帧渲染耗时的起点（用于匿名统计里的渲染耗时分桶） */
var panelOpenStartTs = 0;
function nowTs() {
	try {
		return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
	} catch {
		return Date.now();
	}
}
function getDoc$1() {
	return window.parent?.document ?? document;
}
function prettyFullResponse(resp) {
	if (resp == null) return "（原文已清理）";
	if (typeof resp !== "string") try {
		return JSON.stringify(resp, null, 2);
	} catch {
		return String(resp);
	}
	const text = resp.trim();
	if (text.indexOf("data:") === -1) try {
		return JSON.stringify(JSON.parse(text), null, 2);
	} catch {
		return text;
	}
	let id = "", model = "", finish = null, usage = null;
	let content = "", reasoning = "", chunks = 0;
	for (const raw of text.split("\n")) {
		const line = raw.trim();
		if (!line.startsWith("data:")) continue;
		const payload = line.slice(5).trim();
		if (!payload || payload === "[DONE]") continue;
		let chunk;
		try {
			chunk = JSON.parse(payload);
		} catch {
			continue;
		}
		chunks++;
		if (chunk.id) id = chunk.id;
		if (chunk.model) model = chunk.model;
		if (chunk.usage) usage = chunk.usage;
		const ch = Array.isArray(chunk.choices) ? chunk.choices[0] : null;
		if (ch) {
			const d = ch.delta || {};
			if (typeof d.reasoning_content === "string") reasoning += d.reasoning_content;
			else if (typeof d.reasoning === "string") reasoning += d.reasoning;
			if (typeof d.content === "string") content += d.content;
			if (ch.finish_reason) finish = ch.finish_reason;
		}
	}
	const head = [];
	if (id) head.push(`id: ${id}`);
	if (model) head.push(`model: ${model}`);
	head.push(`chunks: ${chunks}`);
	head.push(`finish_reason: ${finish ?? "（无）"}`);
	if (usage) head.push(`usage: ${JSON.stringify(usage)}`);
	const body = [];
	if (reasoning) body.push(`【思维链】\n${reasoning}`);
	body.push(`【正文】\n${content || "（无内容）"}`);
	return `${head.join("\n")}\n\n${body.join("\n\n")}\n\n—— 已合并 SSE 增量并隐藏重复字段 ——`;
}
var panelCreated = false;
var panelOpen = false;
var currentView = "overview";
var collapsed = false;
function refreshUI() {
	try {
		if (!panelOpen) return;
		const doc = getDoc$1();
		const s = getSelectedSave();
		if (!s) return;
		const bal = state$2.customBalance || state$2.balance?.balance;
		const balEl = doc.getElementById("aus-balance");
		if (balEl) try {
			const v = bal ? parseFloat(String(bal)) : NaN;
			balEl.textContent = !isNaN(v) ? formatMoney(v, 2) : formatMoney(0, 2);
		} catch {
			balEl.textContent = bal ? "¥" + bal + " CNY" : "¥0.00 CNY";
		}
		const totalCostEl = doc.getElementById("aus-total-cost");
		if (totalCostEl) try {
			totalCostEl.textContent = formatMoney(s.total_cost || 0, 4);
		} catch {
			totalCostEl.textContent = "¥" + (s.total_cost || 0).toFixed(4) + " CNY";
		}
		const tokEl = doc.getElementById("aus-total-tokens");
		if (tokEl) tokEl.textContent = (s.total_tokens || 0).toLocaleString("zh-CN") + " tokens";
		renderHistory(doc, s);
		renderOverview();
		renderStatsView();
		try {
			renderForecastView();
		} catch {}
		try {
			renderWalletView();
		} catch {}
	} catch {}
}
/**
* 主题切换后的整体重绘（跟随系统时由 prefers-color-scheme 变化触发）。
* 面板关闭时无需处理：下次打开由 createPanel/refreshUI 重新取色。
*/
function refreshTheme() {
	try {
		if (!panelOpen) return;
		try {
			resetChartThemeCache();
		} catch {}
		try {
			disposeForecastCharts();
		} catch {}
		refreshUI();
	} catch {}
}
var historyPage = 1;
var HISTORY_PAGE_SIZE = 30;
var historyFullCache = null;
var historyCacheScope = "";
var historyLoading = false;
var invalidateHistoryCache = () => {
	historyFullCache = null;
	historyCacheScope = "";
	historyPage = 1;
};
var historyFilters = {
	model: STATS_FILTER_ALL,
	chat: STATS_FILTER_ALL,
	endpoint: STATS_FILTER_ALL,
	credential: STATS_FILTER_ALL
};
var historyFilterBase = [];
try {
	on(DataEvents.HISTORY_ADDED, invalidateHistoryCache);
	on(DataEvents.UPDATED, invalidateHistoryCache);
} catch {}
function resetHistoryFilters() {
	historyFilters.model = STATS_FILTER_ALL;
	historyFilters.chat = STATS_FILTER_ALL;
	historyFilters.endpoint = STATS_FILTER_ALL;
	historyFilters.credential = STATS_FILTER_ALL;
	historyPage = 1;
}
function getHistoryChatOptions(history) {
	const map = /* @__PURE__ */ new Map();
	for (const entry of history || []) {
		const chatId = entry?.chatId ?? null;
		const id = chatId ?? "__null__";
		const chatName = String(entry?.chatName || "").trim();
		const label = chatName || (chatId ? String(chatId).length > 18 ? `${String(chatId).slice(0, 8)}…${String(chatId).slice(-4)}` : String(chatId) : "未分组/旧数据");
		const timestamp = Number(entry?.timestamp) || 0;
		const current = map.get(id);
		if (!current) map.set(id, {
			id,
			label,
			title: String(chatId || label),
			lastSeen: timestamp
		});
		else {
			if (timestamp >= current.lastSeen && chatName) {
				current.label = chatName;
				current.title = String(chatId || chatName);
			}
			if (timestamp > current.lastSeen) current.lastSeen = timestamp;
		}
	}
	return Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen || a.label.localeCompare(b.label, "zh-CN")).map(({ id, label, title }) => ({
		id,
		label,
		title
	}));
}
function closeHistoryFilterDropdowns() {
	const doc = getDoc$1();
	for (const kind of [
		"model",
		"chat",
		"endpoint",
		"credential"
	]) {
		const dropdown = doc.getElementById(`aus-history-${kind}-dropdown`);
		if (dropdown) dropdown.style.display = "none";
	}
}
function renderHistoryFilterDropdown(kind, selected, options, emptyText, onSelect) {
	const dropdown = getDoc$1().getElementById(`aus-history-${kind}-dropdown`);
	if (!dropdown) return;
	const item = (id, label, title = label) => {
		const active = id === selected ? "background:var(--ds-card);font-weight:600;" : "";
		return `<div data-history-value="${esc$2(id)}" title="${esc$2(title)}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}">${esc$2(label)}</div>`;
	};
	let html = item(STATS_FILTER_ALL, "全部");
	for (const option of options) html += item(option.id, option.label, option.title || option.label);
	if (!options.length) html += `<div style="padding:8px 10px;color:var(--ds-text-3);font-size:var(--aus-fs-base);">${esc$2(emptyText)}</div>`;
	dropdown.innerHTML = html;
	dropdown.querySelectorAll("[data-history-value]").forEach((element) => {
		element.onclick = () => onSelect(element.getAttribute("data-history-value") || "__all__");
	});
}
function renderHistoryFilters(history) {
	historyFilterBase = history || [];
	const doc = getDoc$1();
	const models = Array.from(new Set(historyFilterBase.map((entry) => String(entry?.model || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN")).map((id) => ({
		id,
		label: id
	}));
	if (historyFilters.model !== "__all__" && !models.some((option) => option.id === historyFilters.model)) historyFilters.model = STATS_FILTER_ALL;
	const chats = getHistoryChatOptions(historyFilterBase);
	if (historyFilters.chat !== "__all__" && !chats.some((option) => option.id === historyFilters.chat)) historyFilters.chat = STATS_FILTER_ALL;
	const endpoints = getEndpointFilterOptions(historyFilterBase);
	if (historyFilters.endpoint !== "__all__" && !endpoints.some((option) => option.id === historyFilters.endpoint)) {
		historyFilters.endpoint = STATS_FILTER_ALL;
		historyFilters.credential = STATS_FILTER_ALL;
	}
	const credentials = getCredentialFilterOptions(historyFilterBase, historyFilters.endpoint);
	if (historyFilters.credential !== "__all__" && !credentials.some((option) => option.id === historyFilters.credential)) historyFilters.credential = STATS_FILTER_ALL;
	const labelMap = {
		model: historyFilters.model === "__all__" ? "全部" : historyFilters.model,
		chat: historyFilters.chat === "__all__" ? "全部" : chats.find((option) => option.id === historyFilters.chat)?.label || historyFilters.chat,
		endpoint: historyFilters.endpoint === "__all__" ? "全部" : historyFilters.endpoint === "__unknown__" ? "未记录接入" : endpoints.find((option) => option.id === historyFilters.endpoint)?.label || historyFilters.endpoint,
		credential: historyFilters.credential === "__all__" ? "全部" : historyFilters.credential === "__unknown__" ? "未识别密钥" : credentials.find((option) => option.id === historyFilters.credential)?.label || historyFilters.credential
	};
	for (const kind of [
		"model",
		"chat",
		"endpoint",
		"credential"
	]) {
		const label = doc.getElementById(`aus-history-${kind}-label`);
		if (label) {
			label.textContent = labelMap[kind];
			label.title = labelMap[kind];
		}
	}
	renderHistoryFilterDropdown("model", historyFilters.model, models, "暂无模型", (value) => {
		historyFilters.model = value;
		historyPage = 1;
		closeHistoryFilterDropdowns();
		renderHistory(doc, getSelectedSave());
	});
	renderHistoryFilterDropdown("chat", historyFilters.chat, chats, "暂无对话", (value) => {
		historyFilters.chat = value;
		historyPage = 1;
		closeHistoryFilterDropdowns();
		renderHistory(doc, getSelectedSave());
	});
	renderHistoryFilterDropdown("endpoint", historyFilters.endpoint, endpoints, "暂无接入记录", (value) => {
		historyFilters.endpoint = value;
		historyFilters.credential = STATS_FILTER_ALL;
		historyPage = 1;
		closeHistoryFilterDropdowns();
		renderHistory(doc, getSelectedSave());
	});
	renderHistoryFilterDropdown("credential", historyFilters.credential, credentials, "暂无密钥记录", (value) => {
		historyFilters.credential = value;
		historyPage = 1;
		closeHistoryFilterDropdowns();
		renderHistory(doc, getSelectedSave());
	});
}
function filteredHistoryForDisplay(history) {
	return filterStatsHistory(history, {
		model: historyFilters.model,
		chat: historyFilters.chat,
		endpoint: historyFilters.endpoint,
		credential: historyFilters.credential
	});
}
function bindHistoryFilters(doc) {
	for (const [kind, selector] of [
		["model", "#aus-history-model-btn"],
		["chat", "#aus-history-chat-btn"],
		["endpoint", "#aus-history-endpoint-btn"],
		["credential", "#aus-history-credential-btn"]
	]) {
		const button = doc.querySelector(selector);
		const dropdown = doc.getElementById(`aus-history-${kind}-dropdown`);
		if (!button || !dropdown) continue;
		button.onclick = () => {
			const willOpen = dropdown.style.display !== "block";
			closeHistoryFilterDropdowns();
			if (!willOpen) return;
			renderHistoryFilters(historyFilterBase);
			dropdown.style.display = "block";
			positionFilterDropdown(button, dropdown);
		};
	}
	doc.addEventListener("click", (event) => {
		if (!event.target.closest("#aus-history-filter-host")) closeHistoryFilterDropdowns();
	});
}
var activeHistoryDetailTs = null;
var activeHistoryDetailPanel = null;
var activeHistoryDetailHost = null;
var activeHistoryDetailBtn = null;
function resetHistoryDetailState(doc, clearBody = false) {
	try {
		const body = doc.getElementById("aus-history-detail-body");
		if (body && clearBody) body.innerHTML = "";
		const drawer = doc.getElementById("aus-history-detail");
		if (drawer) drawer.style.display = "none";
		const content = doc.getElementById("aus-content-body");
		if (content) content.classList.remove("has-history-detail");
	} catch {}
	activeHistoryDetailTs = null;
	activeHistoryDetailPanel = null;
	activeHistoryDetailHost = null;
	activeHistoryDetailBtn = null;
}
function closeHistoryDetail(doc) {
	const panel = activeHistoryDetailPanel;
	const host = activeHistoryDetailHost;
	if (panel) {
		try {
			if (panel.parentElement && panel.parentElement.id === "aus-history-detail-body" && host) host.appendChild(panel);
		} catch {}
		panel.style.display = "none";
		panel.style.flexDirection = "column";
		panel.style.maxHeight = "min(520px,60vh)";
		panel.style.overflowY = "auto";
		panel.style.overflowX = "hidden";
		panel.style.marginTop = "8px";
		panel.style.borderTop = "1px solid var(--ds-border)";
		panel.style.paddingTop = "8px";
	}
	const btn = activeHistoryDetailBtn;
	if (btn && btn.isConnected) {
		btn.textContent = "详情";
		btn.style.background = "var(--ds-black)";
		btn.style.color = "var(--ds-black-text)";
		btn.style.borderColor = "var(--ds-black)";
	}
	resetHistoryDetailState(doc);
}
function openHistoryDetail(doc, panel, btn) {
	const ts = btn.getAttribute("data-ts") || "";
	if (activeHistoryDetailTs === ts && activeHistoryDetailPanel === panel) {
		closeHistoryDetail(doc);
		return;
	}
	if (activeHistoryDetailPanel && activeHistoryDetailPanel !== panel) closeHistoryDetail(doc);
	const body = doc.getElementById("aus-history-detail-body");
	const drawer = doc.getElementById("aus-history-detail");
	const title = doc.getElementById("aus-history-detail-title");
	if (!body || !drawer) return;
	activeHistoryDetailHost = panel.parentElement;
	activeHistoryDetailTs = ts;
	activeHistoryDetailPanel = panel;
	activeHistoryDetailBtn = btn;
	panel.style.display = "flex";
	panel.style.flexDirection = "column";
	panel.style.maxHeight = "none";
	panel.style.overflow = "visible";
	panel.style.marginTop = "0";
	panel.style.borderTop = "none";
	panel.style.paddingTop = "0";
	try {
		body.appendChild(panel);
	} catch {}
	if (title) {
		const model = btn.getAttribute("data-model") || "记录详情";
		const time = btn.getAttribute("data-time") || "";
		title.textContent = time ? `${model} · ${time}` : model;
	}
	btn.textContent = "收起";
	btn.style.background = "var(--ds-card-inner)";
	btn.style.color = "var(--ds-text)";
	btn.style.borderColor = "var(--ds-black)";
	drawer.style.display = "flex";
	const content = doc.getElementById("aus-content-body");
	if (content) content.classList.add("has-history-detail");
}
function renderHistoryInner(doc, fullHist) {
	const host = doc.getElementById("aus-history");
	if (!host) return;
	const reopenDetailTs = activeHistoryDetailTs;
	resetHistoryDetailState(doc, true);
	const total = fullHist.length;
	if (!total) {
		host.innerHTML = `<div style="text-align:center;padding:24px;color:var(--ds-text-3);font-size:var(--aus-fs-base);line-height:1.8;">当前筛选无记录<br/><button id="aus-history-filter-reset" style="margin-top:8px;padding:6px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">清除筛选</button></div>`;
		const reset = doc.getElementById("aus-history-filter-reset");
		if (reset) reset.onclick = () => {
			resetHistoryFilters();
			closeHistoryFilterDropdowns();
			renderHistory(doc, getSelectedSave());
		};
		return;
	}
	const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
	if (historyPage > totalPages) historyPage = totalPages;
	if (historyPage < 1) historyPage = 1;
	const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
	const pageHist = fullHist.slice(start, start + HISTORY_PAGE_SIZE);
	const pagerTop = total > HISTORY_PAGE_SIZE ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:var(--aus-fs-sm);color:var(--ds-text-2);">
      <span>共 ${total} 条 · 第 ${historyPage}/${totalPages} 页</span>
      <span style="display:flex;gap:6px;">
        <button id="aus-history-prev" ${historyPage <= 1 ? "disabled" : ""} style="padding:4px 10px;border:1px solid var(--ds-border);border-radius:999px;background:${historyPage <= 1 ? "var(--ds-card)" : "var(--ds-card-inner)"};color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:${historyPage <= 1 ? "not-allowed" : "pointer"};opacity:${historyPage <= 1 ? "0.5" : "1"};display:inline-flex;align-items:center;gap:4px;">${icon("chevron-left", 14)} 上一页</button>
        <button id="aus-history-next" ${historyPage >= totalPages ? "disabled" : ""} style="padding:4px 10px;border:1px solid var(--ds-border);border-radius:999px;background:${historyPage >= totalPages ? "var(--ds-card)" : "var(--ds-card-inner)"};color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:${historyPage >= totalPages ? "not-allowed" : "pointer"};opacity:${historyPage >= totalPages ? "0.5" : "1"};display:inline-flex;align-items:center;gap:4px;">下一页 ${icon("chevron-right", 14)}</button>
      </span>
    </div>` : "";
	const pagerBottom = total > HISTORY_PAGE_SIZE ? `<div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-top:10px;font-size:var(--aus-fs-sm);">
      <button id="aus-history-prev-b" ${historyPage <= 1 ? "disabled" : ""} style="padding:4px 12px;border:1px solid var(--ds-border);border-radius:999px;background:${historyPage <= 1 ? "var(--ds-card)" : "var(--ds-card-inner)"};color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:${historyPage <= 1 ? "not-allowed" : "pointer"};opacity:${historyPage <= 1 ? "0.5" : "1"};display:inline-flex;align-items:center;gap:4px;">${icon("chevron-left", 14)} 上一页</button>
      <span style="color:var(--ds-text-2);">第 ${historyPage}/${totalPages} 页</span>
      <button id="aus-history-next-b" ${historyPage >= totalPages ? "disabled" : ""} style="padding:4px 12px;border:1px solid var(--ds-border);border-radius:999px;background:${historyPage >= totalPages ? "var(--ds-card)" : "var(--ds-card-inner)"};color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:${historyPage >= totalPages ? "not-allowed" : "pointer"};opacity:${historyPage >= totalPages ? "0.5" : "1"};display:inline-flex;align-items:center;gap:4px;">下一页 ${icon("chevron-right", 14)}</button>
    </div>` : "";
	host.innerHTML = pagerTop + pageHist.map((h) => {
		const total = h.total_tokens || 1;
		const hp = (h.cache_hit_tokens || 0) / total * 100;
		const mp = (h.cache_miss_tokens || 0) / total * 100;
		const op = (h.completion_tokens || 0) / total * 100;
		const hps = hp.toFixed(1), mps = mp.toFixed(1), ops = op.toFixed(1);
		const fmtMoney = (v, d = 4) => {
			try {
				return formatMoney(v || 0, d);
			} catch {
				return "¥" + (v || 0).toFixed(d) + " CNY";
			}
		};
		const c4 = fmtMoney(h.cost || 0, 4);
		const c6 = fmtMoney(h.cost || 0, 6);
		const in6 = fmtMoney(h.input_cost || 0, 6);
		const out6 = fmtMoney(h.output_cost || 0, 6);
		const isAgentRecord = String(h.origin || "") === "agent";
		const agentTurnCount = Number(h.agentModelTurns) || 0;
		const agentStatusKey = String(h.agentStatus || "");
		const originTitle = isAgentRecord ? [
			"Agent 模式",
			agentTurnCount > 0 ? agentTurnCount + " 个模型回合" : "",
			{
				completed: "已完成",
				partial_success: "部分完成",
				cancelled: "已取消",
				failed: "失败"
			}[agentStatusKey] || ""
		].filter(Boolean).join(" · ") : "常规对话";
		const originBadge = isAgentRecord ? `<span class="aus-origin-badge" title="${esc$2(originTitle)}" style="flex-shrink:0;display:inline-block;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:600;line-height:16px;background:var(--ds-green-bg);color:var(--ds-green);">Agent</span>` : `<span class="aus-origin-badge" title="${esc$2(originTitle)}" style="flex-shrink:0;display:inline-block;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:600;line-height:16px;background:var(--ds-card-inner);color:var(--ds-text-3);">常规</span>`;
		const recordDate = new Date(h.timestamp);
		const recordDateText = recordDate.toLocaleDateString("zh-CN");
		const recordTimeText = recordDate.toLocaleTimeString("zh-CN", { hour12: false });
		return `
    <div style="padding:10px 12px;background:var(--ds-card);border-radius:10px;margin-bottom:8px;font-size:var(--aus-fs-base);">
      <div class="aus-history-card-head" style="display:flex;justify-content:space-between;align-items:center;">
        <div class="aus-history-card-main" style="min-width:0;flex:1;">
          <div class="aus-history-card-title" style="display:flex;align-items:center;gap:6px;font-weight:600;color:var(--ds-text);white-space:nowrap;overflow:hidden;">${originBadge}<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc$2(h.model)} · ${esc$2(localTimeHM(h.timestamp))}</span></div>
          <div style="color:var(--ds-text-2);margin-top:2px;">${h.prompt_tokens || 0} in · ${h.completion_tokens || 0} out · ${h.duration || 0}ms · ${(h.tokenRate || 0) > 0 ? h.tokenRate + " t/s" : "未测速"}</div>
        </div>
        <div class="aus-history-card-actions" style="text-align:right;flex-shrink:0;margin-left:8px;display:flex;gap:6px;align-items:center;">
          <div class="aus-history-card-cost">
            <div style="font-weight:700;color:var(--ds-text);">${c4}</div>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="aus-compare-old" data-ts="${h.timestamp}" style="padding:4px 6px;border:1px solid var(--ds-border);border-radius:6px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">旧</button>
            <button class="aus-compare-new" data-ts="${h.timestamp}" style="padding:4px 6px;border:1px solid var(--ds-border);border-radius:6px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">新</button>
            <button class="aus-detail-toggle" data-ts="${h.timestamp}" data-model="${esc$2(h.model || "")}" data-time="${esc$2(recordDateText + " " + recordTimeText)}" style="padding:4px 8px;border:1px solid var(--ds-black);border-radius:6px;background:var(--ds-black);color:var(--ds-black-text);font-size:var(--aus-fs-sm);cursor:pointer;">详情</button>
          </div>
        </div>
      </div>
      <div style="background:var(--ds-border);border-radius:999px;height:6px;overflow:hidden;margin-top:8px;display:flex;">
        <div style="background:var(--ds-green);width:${hp}%;height:100%;"></div>
        <div style="background:var(--ds-red-border);width:${mp}%;height:100%;"></div>
        <div style="background:var(--ds-purple-bg);width:${op}%;height:100%;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:var(--aus-fs-sm);margin-top:4px;">
        <div style="display:flex;gap:8px;"><span style="color:var(--ds-green);font-weight:500;">${hps}% 命中</span><span style="color:var(--ds-red);font-weight:500;">${mps}% 未命中</span><span style="color:var(--ds-purple);font-weight:500;">${ops}% 输出</span></div>
        <span style="color:var(--ds-text-2);">${total.toLocaleString()}t</span>
      </div>
      <div class="aus-detail-panel" data-detail="${h.timestamp}" style="display:none;margin-top:8px;border-top:1px solid var(--ds-border);padding-top:8px;max-height:min(520px,60vh);overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;flex-direction:column;gap:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:10px;">
            <div style="font-size:10px;color:var(--ds-text-3);font-weight:600;letter-spacing:0.5px;">基础信息</div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:6px;font-size:11px;">
              <div><div style="color:var(--ds-text-2);font-size:10px;">模型</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;word-break:break-all;">${esc$2(h.model || "—")}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">时段</div><div style="font-weight:600;margin-top:2px;color:var(--ds-text);">${h.priceType === "new-peak" || h.priceType === "wallet-peak" ? "高峰" : h.priceType === "new-offpeak" || h.priceType === "wallet-offpeak" ? "非高峰" : h.priceType === "unpriced" ? "待定价" : "旧价格"}</div></div>
              <div style="min-width:0;"><div style="color:var(--ds-text-2);font-size:10px;">钱包</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;word-break:break-all;">${esc$2(repository.getWallet(String(h.walletId || ""))?.name || h.endpointLabel || "未归属钱包")}</div></div>
              <div style="min-width:0;"><div style="color:var(--ds-text-2);font-size:10px;">计价来源</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;word-break:break-all;">${h.pricingSource === "wallet" ? "钱包规则" : h.pricingSource === "builtin" ? "DeepSeek 内置" : h.pricingSource === "unpriced" ? "待定价" : h.pricingSource === "legacy-match" ? "旧数据同名价" : h.pricingSource === "legacy" ? "旧全局规则" : "旧记录兜底"}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">日期</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${esc$2(recordDateText)}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">时间</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${esc$2(recordTimeText)}</div></div>
            </div>
          </div>
            <div style="background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:10px;">
            <div style="font-size:10px;color:var(--ds-text-3);font-weight:600;letter-spacing:0.5px;">性能</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px;font-size:11px;">
              <div><div style="color:var(--ds-text-2);font-size:10px;">耗时</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${((h.duration || 0) / 1e3).toFixed(1)}s</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">首字延迟</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${(h.ttft || 0) > 0 ? ((h.ttft || 0) / 1e3).toFixed(1) + "s" : "—"}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">速率</div><div style="font-weight:600;margin-top:2px;color:${(h.tokenRate || 0) > 0 ? "var(--ds-green)" : "var(--ds-text-3)"};">${(h.tokenRate || 0) > 0 ? h.tokenRate + " t/s" : h.streamed === false ? "非流式" : "—"}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">思维链耗时</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${(h.thinkTime || 0) > 0 ? ((h.thinkTime || 0) / 1e3).toFixed(1) + "s" : "—"}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">思维链占比</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${(() => {
			const comp = h.completion_tokens || 0, th = h.thinkTokens || 0;
			if (!comp || !th) return "—";
			return (th / comp * 100).toFixed(1) + "%";
		})()}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">是否截断</div><div style="font-weight:600;margin-top:2px;color:${isTruncatedFinish(h.finishReason) || h.isTruncated ? "var(--ds-red)" : "var(--ds-text)"};">${isTruncatedFinish(h.finishReason) || h.isTruncated ? "是 (" + esc$2(h.finishReason || "length") + ")" : "否"}</div></div>
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:10px;">
            <div style="font-size:10px;color:var(--ds-text-3);font-weight:600;letter-spacing:0.5px;">Token 消耗</div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:6px;font-size:11px;">
              <div><div style="color:var(--ds-text-2);font-size:10px;">缓存命中</div><div style="font-weight:600;color:var(--ds-green);margin-top:2px;">${(h.cache_hit_tokens || 0).toLocaleString()}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">缓存未命中</div><div style="font-weight:600;color:var(--ds-red);margin-top:2px;">${(h.cache_miss_tokens || 0).toLocaleString()}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">输出 Token</div><div style="font-weight:600;color:var(--ds-purple);margin-top:2px;">${(h.completion_tokens || 0).toLocaleString()}</div></div>
              <div><div style="color:var(--ds-text-2);font-size:10px;">总 Token</div><div style="font-weight:700;color:var(--ds-text);margin-top:2px;">${(h.total_tokens || 0).toLocaleString()}</div></div>
              <div style="grid-column:1/-1;"><div style="color:var(--ds-text-2);font-size:10px;">思维链 Token</div><div style="font-weight:600;color:var(--ds-text);margin-top:2px;">${h.thinkTokens || 0}</div></div>
            </div>
          </div>
          <div style="background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:10px;">
            <div style="font-size:10px;color:var(--ds-text-3);font-weight:600;letter-spacing:0.5px;">费用明细</div>
            <div style="display:grid;gap:6px;margin-top:6px;font-size:11px;">
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--ds-text-2);">输入费用</span><span style="font-weight:600;color:var(--ds-text);">${in6}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--ds-text-2);">输出费用</span><span style="font-weight:600;color:var(--ds-text);">${out6}</span></div>
              <div style="display:flex;justify-content:space-between;border-top:1px solid var(--ds-card);padding-top:6px;margin-top:2px;"><span style="color:var(--ds-text);font-weight:600;">总费用</span><span style="font-weight:700;color:var(--ds-text);">${c6}</span></div>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="aus-tab-btn" data-tab="req" data-ts="${h.timestamp}" style="padding:6px 10px;border:1px solid var(--ds-black);border-radius:999px;background:var(--ds-black);color:var(--ds-black-text);font-size:11px;cursor:pointer;">请求参数 (Request Body)</button>
          <button class="aus-tab-btn" data-tab="res" data-ts="${h.timestamp}" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">API 完整响应 (Full Response)</button>
          <button class="aus-tab-btn" data-tab="raw" data-ts="${h.timestamp}" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">原始 Token 用量 (Raw Usage)</button>
          <button class="aus-tab-btn" data-tab="msg" data-ts="${h.timestamp}" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">消息内容 (Messages)</button>
        </div>
        <pre class="aus-tab-content" data-content="req-${h.timestamp}" style="flex:1;min-height:160px;margin-top:2px;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:10px;font-size:11px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">${esc$2(h.fullRequest ? JSON.stringify(h.fullRequest, null, 2) : h.raw_usage ? JSON.stringify(h.raw_usage, null, 2) : "（原文已清理，仅保留统计）")}</pre>
        <div class="aus-tab-content" data-content="res-${h.timestamp}" style="display:none;margin-top:2px;">
          <pre style="margin:0;min-height:160px;max-height:360px;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:10px;font-size:11px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">${esc$2(prettyFullResponse(h.fullResponse))}</pre>
          ${h.fullResponse ? `<div style="display:flex;justify-content:flex-end;margin-top:6px;"><button class="aus-res-raw-btn" data-ts="${h.timestamp}" style="padding:4px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">查看原始完整数据</button></div><pre class="aus-res-raw" data-ts="${h.timestamp}" style="display:none;margin:6px 0 0;max-height:360px;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:10px;font-size:11px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">${esc$2(typeof h.fullResponse === "string" ? h.fullResponse : JSON.stringify(h.fullResponse, null, 2))}</pre>` : ""}
        </div>
        <pre class="aus-tab-content" data-content="raw-${h.timestamp}" style="display:none;flex:1;min-height:160px;margin-top:2px;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:10px;font-size:11px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">${esc$2(JSON.stringify(h.raw_usage || {}, null, 2))}</pre>
        <pre class="aus-tab-content" data-content="msg-${h.timestamp}" style="display:none;flex:1;min-height:160px;margin-top:2px;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:10px;font-size:11px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--ds-text);">${esc$2(h.messages && h.messages.length ? JSON.stringify(h.messages, null, 2) : "（原文已清理——仅最近 5 条保留，其余仅统计可用）")}</pre>
      </div>
    </div>
  `;
	}).join("") + pagerBottom;
	const bindPager = (id) => {
		const b = doc.getElementById(id);
		if (!b) return;
		if (id.includes("prev")) b.onclick = () => {
			if (historyPage > 1) {
				historyPage--;
				renderHistoryInner(doc, fullHist);
				try {
					doc.getElementById("aus-history")?.scrollIntoView({
						behavior: "smooth",
						block: "start"
					});
				} catch {}
			}
		};
		else b.onclick = () => {
			const tp = Math.max(1, Math.ceil(fullHist.length / HISTORY_PAGE_SIZE));
			if (historyPage < tp) {
				historyPage++;
				renderHistoryInner(doc, fullHist);
				try {
					doc.getElementById("aus-history")?.scrollIntoView({
						behavior: "smooth",
						block: "start"
					});
				} catch {}
			}
		};
	};
	bindPager("aus-history-prev");
	bindPager("aus-history-next");
	bindPager("aus-history-prev-b");
	bindPager("aus-history-next-b");
	host.querySelectorAll(".aus-detail-toggle").forEach((btn) => {
		btn.addEventListener("click", () => {
			const ts = btn.getAttribute("data-ts");
			if (activeHistoryDetailBtn === btn && activeHistoryDetailPanel) {
				closeHistoryDetail(doc);
				return;
			}
			const panel = host.querySelector(`[data-detail="${ts}"]`);
			if (!panel) return;
			openHistoryDetail(doc, panel, btn);
		});
	});
	host.querySelectorAll(".aus-tab-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const ts = btn.getAttribute("data-ts");
			const tab = btn.getAttribute("data-tab");
			const root = btn.closest(".aus-detail-panel");
			if (!root) return;
			root.querySelectorAll(".aus-tab-btn").forEach((b) => {
				b.style.background = "var(--ds-card-inner)";
				b.style.color = "var(--ds-text)";
				b.style.borderColor = "var(--ds-border)";
			});
			btn.style.background = "var(--ds-black)";
			btn.style.color = "var(--ds-black-text)";
			btn.style.borderColor = "var(--ds-black)";
			root.querySelectorAll(".aus-tab-content").forEach((c) => {
				c.style.display = "none";
			});
			const target = root.querySelector(`[data-content="${tab}-${ts}"]`);
			if (target) target.style.display = "block";
		});
	});
	host.querySelectorAll(".aus-res-raw-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const ts = btn.getAttribute("data-ts");
			const pre = btn.closest(".aus-detail-panel")?.querySelector(`.aus-res-raw[data-ts="${ts}"]`);
			if (!pre) return;
			const show = pre.style.display === "none";
			pre.style.display = show ? "block" : "none";
			btn.textContent = show ? "隐藏原始完整数据" : "查看原始完整数据";
		});
	});
	if (reopenDetailTs) {
		const panel = host.querySelector(`[data-detail="${reopenDetailTs}"]`);
		const btn = host.querySelector(`.aus-detail-toggle[data-ts="${reopenDetailTs}"]`);
		if (panel && btn) openHistoryDetail(doc, panel, btn);
	}
}
function renderHistory(doc, s) {
	const host = doc.getElementById("aus-history");
	if (!host) return;
	let hist = s.history || [];
	let scope = "all";
	try {
		scope = state$2.settings.historyScope || "all";
		if (scope === "current") hist = getHistoryForDisplay();
	} catch {}
	if (!hist.length) {
		historyPage = 1;
		historyFullCache = null;
		historyCacheScope = "";
		host.innerHTML = scope === "current" ? "<div style=\"text-align:center;padding:16px;color:var(--ds-text-3);font-size:var(--aus-fs-base);line-height:1.8;\">当前对话暂无记录<br/><span style=\"font-size:var(--aus-fs-sm);\">已按“当前对话”过滤，旧记录（未关联对话）仅在“全部历史”中可见</span><br/><button id=\"aus-history-scope-switch\" style=\"margin-top:8px;padding:6px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;\">切换为全部历史</button></div>" : "<div style=\"text-align:center;padding:16px;color:var(--ds-text-3);font-size:var(--aus-fs-base);\">暂无历史记录</div>";
		const btn = doc.getElementById("aus-history-scope-switch");
		if (btn) btn.onclick = () => {
			state$2.settings.historyScope = "all";
			try {
				saveHot({ settings: state$2.settings });
			} catch {}
			historyPage = 1;
			try {
				refreshUI();
			} catch {}
		};
		return;
	}
	let curChatId = null;
	try {
		curChatId = globalThis.SillyTavern?.getContext?.()?.getCurrentChatId?.() || globalThis.SillyTavern?.getContext?.().getCurrentChatId?.call?.(null) || null;
	} catch {}
	try {
		if (!curChatId) curChatId = globalThis.SillyTavern?.getContext?.().getCurrentChatId?.() || null;
	} catch {}
	const scopeKey = scope === "current" ? `current:${curChatId || ""}` : "all";
	if (historyCacheScope !== scopeKey) {
		historyPage = 1;
		historyCacheScope = scopeKey;
		historyFullCache = null;
	}
	let fullForRender = hist;
	if (historyFullCache && historyFullCache.length > hist.length) fullForRender = historyFullCache;
	renderHistoryFilters(fullForRender);
	renderHistoryInner(doc, filteredHistoryForDisplay(fullForRender));
	if (historyLoading) return;
	if (!(hist.length >= HISTORY_PAGE_SIZE || historyFullCache !== null || fullForRender.length >= HISTORY_PAGE_SIZE) && hist.length < HISTORY_PAGE_SIZE) return;
	historyLoading = true;
	(async () => {
		try {
			const mod = await import("./persistence-C4IJVd-B.js").then((n) => n.s);
			if (!mod.getAllHistory) return;
			const all = await mod.getAllHistory();
			if (!all || !all.length) return;
			let full = all;
			try {
				if (scope === "current" && curChatId) full = all.filter((h) => h.chatId === curChatId);
			} catch {}
			if (full.length <= hist.length) return;
			historyFullCache = full;
			renderHistoryFilters(full);
			renderHistoryInner(doc, filteredHistoryForDisplay(full));
		} catch {} finally {
			historyLoading = false;
		}
	})();
}
function bindPanel(doc) {
	const q = doc.getElementById("aus-btn-query-balance");
	if (q) q.onclick = () => queryBalance();
}
function switchView(view) {
	const prevView = currentView;
	currentView = view;
	if (prevView === "wallet" && view !== "wallet") try {
		repository.collapseAllWallets();
	} catch {}
	try {
		trackPage(view);
	} catch {}
	const doc = getDoc$1();
	if (view !== "history") closeHistoryDetail(doc);
	doc.querySelectorAll("[data-view]").forEach((el) => {
		const on = el.getAttribute("data-view") === view;
		el.style.display = on ? "block" : "none";
		if (on) {
			el.style.transition = "none";
			el.style.opacity = "1";
		}
	});
	doc.querySelectorAll(".aus-nav-item").forEach((el) => {
		if (el.getAttribute("data-nav") === view) el.classList.add("active");
		else el.classList.remove("active");
	});
	const titleText = {
		overview: "用量概览",
		stats: "用量统计",
		history: "历史记录",
		forecast: "趋势预测",
		wallet: "钱包",
		settings: "设置",
		help: "使用说明",
		about: "关于"
	}[view] || "";
	const titleEl = doc.getElementById("aus-page-title");
	const mobileTitleEl = doc.getElementById("aus-mobile-page-title");
	if (titleEl) titleEl.textContent = titleText;
	if (mobileTitleEl) mobileTitleEl.textContent = titleText;
	try {
		if (view === "overview") renderOverview();
		else if (view === "stats") renderStatsView();
		else if (view === "forecast") Promise.resolve(renderForecastView()).catch(() => {});
		else if (view === "wallet") Promise.resolve(renderWalletView()).catch(() => {});
		else if (view === "history") {
			const s = getSelectedSave();
			if (s) renderHistory(doc, s);
		}
	} catch {}
	if (view === "stats" || view === "forecast") requestAnimationFrame(() => {
		try {
			const chartEl = doc.getElementById(view === "stats" ? "aus-stats-chart" : "aus-forecast-main-chart");
			if (chartEl && (chartEl.clientWidth === 0 || chartEl.clientHeight === 0)) {
				if (view === "stats") renderStatsView();
				else Promise.resolve(renderForecastView()).catch(() => {});
			}
		} catch {}
	});
}
function positionPanel() {
	try {
		const doc = getDoc$1();
		for (const id of [
			"aus-stats-chart",
			"aus-chart-token",
			"aus-chart-cost",
			"aus-chart-hit",
			"aus-chart-req",
			"aus-chart-dur",
			"aus-chart-pie",
			"aus-chart-model-token",
			"aus-chart-model-req",
			"aus-forecast-main-chart",
			"aus-forecast-hit-chart",
			"aus-forecast-cost-chart"
		]) {
			const el = doc.getElementById(id);
			if (el && el.__echarts_instance) try {
				el.__echarts_instance.resize();
			} catch {}
		}
	} catch {}
}
function createPanel() {
	if (panelCreated) return;
	const doc = getDoc$1();
	if (doc.getElementById("aus-panel")) {
		panelCreated = true;
		return;
	}
	panelCreated = true;
	const theme = state$2.settings.theme || "light";
	const overlay = doc.createElement("div");
	overlay.id = "aus-overlay";
	overlay.setAttribute("data-extension", "api-usage-stat");
	overlay.setAttribute("data-ds-theme", theme);
	overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:var(--ds-overlay);z-index:100000;display:none;opacity:0;transition:opacity 0.2s;";
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) closePanel();
	});
	const panel = doc.createElement("div");
	panel.id = "aus-panel";
	panel.setAttribute("data-extension", "api-usage-stat");
	panel.setAttribute("data-ds-theme", theme);
	panel.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:100001;background:var(--ds-panel-bg);color:var(--ds-text);font-family:'Microsoft YaHei','微软雅黑',system-ui,-apple-system,sans-serif;display:none;flex-direction:column;overflow:hidden;transform:none;filter:none;will-change:auto;";
	panel.innerHTML = `
    <div id="aus-mobile-header" style="display:none;height:56px;align-items:center;padding:0 16px;flex-shrink:0;border-bottom:1px solid var(--ds-border);background:var(--ds-card-inner);">
      <button id="aus-hamburger-btn" title="菜单" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;cursor:pointer;color:var(--ds-text);font-size:18px;line-height:1;padding:0;">${icon("menu", 20)}</button>
      <span style="margin-left:12px;font-size:var(--aus-fs-base);font-weight:700;color:var(--ds-text);white-space:nowrap;flex-shrink:0;">API用量统计</span>
      <span id="aus-mobile-page-title" style="margin-left:10px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text-2);">用量概览</span>
      <button id="aus-mobile-panel-close" title="关闭" style="margin-left:auto;width:32px;height:32px;flex-shrink:0;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text-2);cursor:pointer;font-size:var(--aus-fs-base);">${icon("close", 16)}</button>
    </div>
    <div id="aus-panel-body" style="flex:1;display:flex;flex-direction:row;overflow:hidden;min-height:0;">
    <div id="aus-sidebar" style="width:260px;flex-shrink:0;background:var(--ds-sidebar-bg);border-right:1px solid var(--ds-border);display:flex;flex-direction:column;overflow:hidden;">
      <div style="height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;" id="aus-brand">
          <span class="aus-brand-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--ds-orange);">${icon("brand", 20)}</span>
          <div style="display:flex;flex-direction:column;min-width:0;">
            <span style="font-size:15px;font-weight:700;color:var(--ds-text);white-space:nowrap;">API用量统计</span>
            <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);white-space:nowrap;">v3.1.5</span>
          </div>
        </div>
        <button id="aus-sidebar-toggle" style="width:30px;height:30px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text-2);cursor:pointer;flex-shrink:0;font-size:var(--aus-fs-base);padding:0;line-height:1;">${icon("chevron-left", 14)}</button>
      </div>
      <div style="flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:4px;">
        <div class="aus-nav-group" style="display:flex;flex-direction:column;gap:4px;">
          <div class="aus-nav-item active" data-nav="overview" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:var(--aus-fs-base);line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;">${icon("overview")}</span><span class="aus-nav-label">用量概览</span></div>
          <div class="aus-nav-item" data-nav="stats" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:var(--aus-fs-base);line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;">${icon("stats")}</span><span class="aus-nav-label">用量统计</span></div>
          <div class="aus-nav-item" data-nav="history" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:var(--aus-fs-base);line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;">${icon("history")}</span><span class="aus-nav-label">历史记录</span></div>
          <div class="aus-nav-item" data-nav="forecast" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:var(--aus-fs-base);line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;">${icon("forecast")}</span><span class="aus-nav-label">趋势预测</span></div>
          <div class="aus-nav-item" data-nav="wallet" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:var(--aus-fs-base);line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;">${icon("wallet")}</span><span class="aus-nav-label">钱包</span></div>
        </div>
        <div style="flex:1;"></div>
        <div class="aus-nav-group" style="display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--ds-border);padding-top:10px;">
          <div class="aus-nav-item" data-nav="settings" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:var(--aus-fs-base);line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;">${icon("settings")}</span><span class="aus-nav-label">设置</span></div>
          <div class="aus-nav-item" data-nav="help" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:var(--aus-fs-base);line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;">${icon("help")}</span><span class="aus-nav-label">使用说明</span></div>
          <div class="aus-nav-item" data-nav="about" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:var(--aus-fs-base);line-height:1.5;"><span class="aus-nav-icon" style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:1;">${icon("about")}</span><span class="aus-nav-label">关于</span></div>
        </div>
      </div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--ds-panel-bg);">
      <div id="aus-page-header" style="flex-shrink:0;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid var(--ds-border);background:var(--ds-card-inner);">
        <span id="aus-page-title" style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">用量概览</span>
        <button id="aus-panel-close" style="width:32px;height:32px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text-2);cursor:pointer;font-size:var(--aus-fs-base);">${icon("close", 16)}</button>
      </div>
      <div id="aus-content-body" style="flex:1;display:flex;flex-direction:row;overflow:hidden;min-height:0;position:relative;">
      <div id="aus-main" style="flex:1;min-width:0;overflow:auto;padding:20px;background:var(--ds-panel-bg);">
        <div style="max-width:1100px;margin:0 auto;display:grid;gap:16px;">
          <div data-view="overview">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="ds-card aus-overview-balance-card" style="position:relative;"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;"><div class="ds-card-title">充值余额</div><div id="aus-overview-wallet-btn" style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;"><span style="color:var(--ds-text-2);">余额口径</span><span id="aus-overview-wallet-label" style="font-weight:600;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部钱包合计</span>${icon("chevron-down", 14)}</div><div id="aus-overview-wallet-dropdown" style="display:none;position:absolute;top:44px;right:10px;z-index:20;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:190px;max-height:260px;overflow:auto;"></div></div><div class="ds-card-val" id="aus-balance">¥0.00<small>CNY</small></div><div id="aus-balance-remaining" style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:6px;min-height:16px;"></div><div style="margin-top:8px;display:flex;gap:6px;"><button id="aus-btn-query-balance" class="ds-btn-pill" style="padding:6px 12px;font-size:var(--aus-fs-sm);">查询余额</button><button id="aus-btn-export" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">导出记录</button><button id="aus-btn-import" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">导入记录</button></div></div>
              <div class="ds-card"><div class="ds-card-title">累计消费</div><div class="ds-card-val" id="aus-total-cost">¥0.0000<small>CNY</small></div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:2px;" id="aus-total-tokens">0 tokens</div></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
              <div class="ds-card" id="aus-overview-history"></div>
              <div class="ds-card" id="aus-overview-spend"></div>
            </div>
            <div id="aus-overview-four" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px;"></div>
            <div id="aus-heatmap-card-overview" class="ds-card" style="margin-top:12px;width:100%;max-width:100%;overflow:hidden;box-sizing:border-box;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                <div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">Token 使用量热力图</div>
                <div id="aus-heatmap-legend-overview" style="display:flex;align-items:center;gap:3px;font-size:var(--aus-fs-sm);color:var(--ds-text-3);"></div>
              </div>
              <div style="display:flex;gap:0;overflow:hidden;max-width:100%;box-sizing:border-box;">
                <div id="aus-heatmap-labels-overview" style="flex-shrink:0;padding:4px 0"></div>
                <div id="aus-heatmap-scroll-overview" style="overflow-x:auto;overflow-y:hidden;flex:1;min-width:0;max-width:100%;padding:4px 0;cursor:grab;scrollbar-width:thin;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;">
                  <div id="aus-heatmap-container-overview" style="display:inline-block;min-width:max-content;"></div>
                </div>
              </div>
              <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:6px;display:flex;justify-content:space-between;">
                <span>按日聚合 Token（深绿=高用量，展示近 2 年）</span>
                <span style="color:var(--ds-text-2);">悬停查看日期</span>
              </div>
            </div>
            <div id="aus-chat-summary-overview" class="ds-card" style="margin-top:12px;overflow:auto;">
              <div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);margin-bottom:8px;">按对话统计</div>
              <table style="width:100%;border-collapse:collapse;font-size:var(--aus-fs-sm);white-space:nowrap;min-width:720px;">
                <thead><tr style="color:var(--ds-text-2);border-bottom:1px solid var(--ds-border);text-align:right;"><th style="text-align:left;padding:6px 8px;">对话</th><th style="padding:6px 8px;">轮次</th><th style="padding:6px 8px;">命中</th><th style="padding:6px 8px;">未命中</th><th style="padding:6px 8px;">输出</th><th style="padding:6px 8px;">总 Tokens</th><th style="padding:6px 8px;">总费用</th><th style="padding:6px 8px;">平均 Token/轮</th><th style="padding:6px 8px;">平均命中率</th></tr></thead>
                <tbody id="aus-chat-summary-tbody"><tr><td colspan="9" style="text-align:center;padding:16px;color:var(--ds-text-3);">暂无数据</td></tr></tbody>
              </table>
              <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:6px;">按总 Token 倒序 · 数据来源为全部历史（不受统计页筛选影响）</div>
            </div>
            </div>
           <div data-view="stats" style="display:none;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;position:relative;flex-wrap:wrap;">
              <div class="aus-stats-filter">
                <div id="aus-range-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">时间维度</span><span id="aus-range-label" style="font-weight:600;color:var(--ds-text);">近 30 天</span>${icon("chevron-down", 14)}</div>
                <div id="aus-range-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);overflow:hidden;flex-direction:row;">
                  <div style="min-width:120px;border-right:1px solid var(--ds-card);padding:8px;display:grid;gap:2px;">
                    <div data-range="all" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);color:var(--ds-text);">全部</div>
                    <div data-range="today" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);color:var(--ds-text);">今天</div>
                    <div data-range="yesterday" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);color:var(--ds-text);">昨天</div>
                    <div data-range="7d" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);color:var(--ds-text);">近 7 天</div>
                    <div data-range="30d" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);color:var(--ds-text);">近 30 天</div>
                    <div data-range="month" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);color:var(--ds-text);">本月</div>
                    <div data-range="lastMonth" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);color:var(--ds-text);">上月</div>
                    <div data-range="custom" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);color:var(--ds-text);">自定义</div>
                  </div>
                  <div id="aus-date-calendar" style="padding:12px;display:none;"></div>
                </div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-model-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">模型</span><span id="aus-model-label" style="font-weight:600;color:var(--ds-text);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span>${icon("chevron-down", 14)}</div>
                <div id="aus-model-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:180px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-chat-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">对话</span><span id="aus-chat-label" style="font-weight:600;color:var(--ds-text);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span>${icon("chevron-down", 14)}</div>
                <div id="aus-chat-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-endpoint-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">接入类型</span><span id="aus-endpoint-label" style="font-weight:600;color:var(--ds-text);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span>${icon("chevron-down", 14)}</div>
                <div id="aus-endpoint-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;max-width:320px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-credential-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">API 密钥</span><span id="aus-credential-label" style="font-weight:600;color:var(--ds-text);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span>${icon("chevron-down", 14)}</div>
                <div id="aus-credential-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;max-width:320px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
              <div class="ds-card"><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);">消费金额</div><div id="aus-stats-cost" style="font-size:22px;font-weight:700;color:var(--ds-text);margin-top:6px;">¥0.00 CNY</div></div>
              <div class="ds-card"><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);">API 请求次数</div><div id="aus-stats-req" style="font-size:22px;font-weight:700;color:var(--ds-text);margin-top:6px;">0</div></div>
              <div class="ds-card"><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);">Tokens</div><div id="aus-stats-tok" style="font-size:22px;font-weight:700;color:var(--ds-text);margin-top:6px;">0</div></div>
            </div>
            <div id="aus-stats-four" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px;"></div>
            <div id="aus-model-summary" class="ds-card" style="margin-top:12px;overflow:auto;">
              <div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);margin-bottom:8px;">模型汇总</div>
              <table style="width:100%;border-collapse:collapse;font-size:var(--aus-fs-sm);white-space:nowrap;">
                <thead><tr style="color:var(--ds-text-2);border-bottom:1px solid var(--ds-border);text-align:right;"><th style="text-align:left;padding:6px 8px;">模型</th><th data-sort-key="count" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">调用次数<span class="aus-sort-ind"></span></th><th data-sort-key="hit" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">输入(命中)<span class="aus-sort-ind"></span></th><th data-sort-key="miss" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">输入(未命中)<span class="aus-sort-ind"></span></th><th data-sort-key="out" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">输出<span class="aus-sort-ind"></span></th><th data-sort-key="total" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">总 Tokens<span class="aus-sort-ind"></span></th><th data-sort-key="cost" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">总成本<span class="aus-sort-ind"></span></th><th data-sort-key="avgCost" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">平均成本<span class="aus-sort-ind"></span></th><th data-sort-key="avgDur" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">平均耗时<span class="aus-sort-ind"></span></th><th data-sort-key="avgRate" title="点击排序" style="padding:6px 8px;cursor:pointer;user-select:none;white-space:nowrap;">平均速率<span class="aus-sort-ind"></span></th></tr></thead>
                <tbody id="aus-summary-tbody"><tr><td colspan="10" style="text-align:center;padding:16px;color:var(--ds-text-3);">暂无数据</td></tr></tbody>
              </table>
            </div>
            <div class="ds-card" style="margin-top:12px;position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">自定义图表</span><div style="display:flex;gap:8px;position:relative;"><div id="aus-chart-y-btn" style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;"><span style="color:var(--ds-text-2);">Y</span><span id="aus-chart-y-label" style="font-weight:600;color:var(--ds-text);">总费用</span>${icon("chevron-down", 14)}</div><div id="aus-chart-x-btn" style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;"><span style="color:var(--ds-text-2);">X</span><span id="aus-chart-x-label" style="font-weight:600;color:var(--ds-text);">每日</span>${icon("chevron-down", 14)}</div><div id="aus-chart-y-dropdown" style="display:none;position:absolute;top:34px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:220px;max-height:280px;overflow:auto;"></div><div id="aus-chart-x-dropdown" style="display:none;position:absolute;top:34px;right:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:140px;"></div></div></div><div id="aus-stats-chart" style="height:300px;"></div></div>
            <div id="aus-extra-charts" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px;">
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">Token 趋势</span><div style="display:flex;gap:6px;"><div id="aus-extra-y-token" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;"><span id="aus-extra-y-label-token">3 项</span>${icon("chevron-down", 14)}</div><div id="aus-extra-x-token" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;"><span id="aus-extra-x-label-token">轮次</span>${icon("chevron-down", 14)}</div></div></div><div id="aus-extra-y-drop-token" style="display:none;position:absolute;top:32px;left:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:180px;max-height:200px;overflow:auto;"></div><div id="aus-extra-x-drop-token" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-token" style="height:220px;"></div></div>
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">费用 趋势</span><div style="display:flex;gap:6px;"><div id="aus-extra-y-cost" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;"><span id="aus-extra-y-label-cost">1 项</span>${icon("chevron-down", 14)}</div><div id="aus-extra-x-cost" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;"><span id="aus-extra-x-label-cost">轮次</span>${icon("chevron-down", 14)}</div></div></div><div id="aus-extra-y-drop-cost" style="display:none;position:absolute;top:32px;left:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:180px;max-height:200px;overflow:auto;"></div><div id="aus-extra-x-drop-cost" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-cost" style="height:220px;"></div></div>
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">缓存命中 趋势</span><div style="display:flex;gap:6px;"><div id="aus-extra-x-hit" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;"><span id="aus-extra-x-label-hit">轮次</span>${icon("chevron-down", 14)}</div></div></div><div id="aus-extra-x-drop-hit" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-hit" style="height:220px;"></div></div>
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">API请求数 趋势</span><div style="display:flex;gap:6px;"><div id="aus-extra-x-req" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;"><span id="aus-extra-x-label-req">每日</span>${icon("chevron-down", 14)}</div></div></div><div id="aus-extra-x-drop-req" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-req" style="height:220px;"></div></div>
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">耗时与速率 趋势</span><div style="display:flex;gap:6px;"><div id="aus-extra-x-dur" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;"><span id="aus-extra-x-label-dur">轮次</span>${icon("chevron-down", 14)}</div></div></div><div id="aus-extra-x-drop-dur" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-dur" style="height:220px;"></div></div>
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">模型用量占比</span><div id="aus-pie-toggle" style="padding:4px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-black);color:var(--ds-black-text);font-size:var(--aus-fs-sm);cursor:pointer;">Token</div></div><div id="aus-chart-pie" style="height:220px;"></div></div>
            </div>
            <div id="aus-model-trends" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px;">
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">模型 Token 趋势</span><div style="display:flex;gap:6px;"><div id="aus-modeltrends-x-token" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;"><span id="aus-modeltrends-x-label-token">每日</span>${icon("chevron-down", 14)}</div></div></div><div id="aus-modeltrends-x-drop-token" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-model-token" style="height:220px;"></div></div>
              <div class="ds-card" style="position:relative;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;"><span style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">模型调用次数趋势</span><div style="display:flex;gap:6px;"><div id="aus-modeltrends-x-req" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;"><span id="aus-modeltrends-x-label-req">每日</span>${icon("chevron-down", 14)}</div></div></div><div id="aus-modeltrends-x-drop-req" style="display:none;position:absolute;top:32px;right:8px;z-index:5;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:8px;padding:4px;min-width:120px;"></div><div id="aus-chart-model-req" style="height:220px;"></div></div>
            </div>
          </div>
          <div data-view="forecast" style="display:none;">
            <div id="aus-forecast-root" class="aus-forecast-root">
              <div class="aus-forecast-toolbar">
                <div class="aus-forecast-toolbar-main">
                  <div class="aus-forecast-picker">
                    <div id="aus-forecast-chat-btn" class="aus-forecast-pill" title="选择要预测的对话">
                      <span class="aus-forecast-pill-label">对话</span><span id="aus-forecast-chat-label" class="aus-forecast-pill-value">当前对话</span>${icon("chevron-down", 14)}
                    </div>
                    <div id="aus-forecast-chat-dropdown" class="aus-forecast-dropdown"></div>
                  </div>
                  <div id="aus-forecast-model-wrap" class="aus-forecast-picker" style="display:none;">
                    <div id="aus-forecast-model-btn" class="aus-forecast-pill" title="选择计价模型">
                      <span class="aus-forecast-pill-label">计价模型</span><span id="aus-forecast-model-label" class="aus-forecast-pill-value">—</span>${icon("chevron-down", 14)}
                    </div>
                    <div id="aus-forecast-model-dropdown" class="aus-forecast-dropdown"></div>
                  </div>
                  <div class="aus-forecast-picker">
                    <div id="aus-forecast-horizon-btn" class="aus-forecast-pill" title="选择未来预测轮数">
                      <span class="aus-forecast-pill-label">视界</span><span id="aus-forecast-horizon-label" class="aus-forecast-pill-value">10 轮</span>${icon("chevron-down", 14)}
                    </div>
                    <div id="aus-forecast-horizon-dropdown" class="aus-forecast-dropdown"></div>
                  </div>
                  <div id="aus-forecast-hit-control" class="aus-forecast-hit-control"></div>
                  <label class="aus-forecast-toggle">
                    <input id="aus-forecast-compaction-toggle" type="checkbox" checked>
                    <span class="aus-forecast-checkbox" aria-hidden="true"></span>
                    <span id="aus-forecast-compaction-label">压缩情景</span>
                  </label>
                </div>
                <div id="aus-forecast-sub" class="aus-forecast-sub"></div>
              </div>
              <div id="aus-forecast-kpis" class="aus-forecast-kpis"></div>
              <div class="ds-card aus-forecast-chart-card">
                <div class="aus-forecast-card-head">
                  <div>
                    <div class="aus-forecast-card-title">轮次趋势与预测</div>
                    <div id="aus-forecast-main-sub" class="aus-forecast-card-sub"></div>
                  </div>
                </div>
                <div id="aus-forecast-main-chart" class="aus-forecast-chart" style="height:300px;"></div>
              </div>
              <div class="aus-forecast-chart-grid">
                <div class="ds-card aus-forecast-chart-card">
                  <div class="aus-forecast-card-title">缓存命中率趋势</div>
                  <div id="aus-forecast-hit-chart" class="aus-forecast-chart" style="height:220px;"></div>
                </div>
                <div class="ds-card aus-forecast-chart-card">
                  <div class="aus-forecast-card-title">累计成本趋势</div>
                  <div id="aus-forecast-cost-chart" class="aus-forecast-chart" style="height:220px;"></div>
                </div>
              </div>
              <div class="aus-forecast-two-col">
                <div class="ds-card">
                  <div class="aus-forecast-card-title">对话健康</div>
                  <div id="aus-forecast-health"></div>
                </div>
                <div class="ds-card">
                  <div class="aus-forecast-card-title">上下文压缩</div>
                  <div id="aus-forecast-compaction"></div>
                </div>
              </div>
              <div class="ds-card" id="aus-forecast-efficiency-card">
                <div class="aus-forecast-card-head">
                  <div>
                    <div class="aus-forecast-card-title">模型效率对比</div>
                    <div id="aus-forecast-efficiency-sub" class="aus-forecast-card-sub"></div>
                  </div>
                  <div class="aus-forecast-picker">
                    <div id="aus-forecast-scope-btn" class="aus-forecast-pill">
                      <span class="aus-forecast-pill-label">范围</span><span class="aus-forecast-pill-value">全部历史</span>${icon("chevron-down", 14)}
                    </div>
                    <div id="aus-forecast-scope-dropdown" class="aus-forecast-dropdown"></div>
                  </div>
                </div>
                <div id="aus-forecast-efficiency"></div>
              </div>
              <div class="ds-card">
                <button id="aus-forecast-top-toggle" class="aus-forecast-top-toggle" type="button">▸ 最耗对话 Top</button>
                <div id="aus-forecast-top" style="display:none;"></div>
              </div>
            </div>
          </div>
          <div data-view="wallet" style="display:none;">
            <div id="aus-wallet"></div>
          </div>
          <div data-view="history" style="display:none;">
            <div id="aus-history-filter-host" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;position:relative;flex-wrap:wrap;">
              <div class="aus-stats-filter">
                <div id="aus-history-model-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">模型</span><span id="aus-history-model-label" style="font-weight:600;color:var(--ds-text);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span>${icon("chevron-down", 14)}</div>
                <div id="aus-history-model-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:180px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-history-chat-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">对话</span><span id="aus-history-chat-label" style="font-weight:600;color:var(--ds-text);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span>${icon("chevron-down", 14)}</div>
                <div id="aus-history-chat-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-history-endpoint-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">接入类型</span><span id="aus-history-endpoint-label" style="font-weight:600;color:var(--ds-text);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span>${icon("chevron-down", 14)}</div>
                <div id="aus-history-endpoint-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;max-width:320px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
              <div class="aus-stats-filter">
                <div id="aus-history-credential-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">API 密钥</span><span id="aus-history-credential-label" style="font-weight:600;color:var(--ds-text);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">全部</span>${icon("chevron-down", 14)}</div>
                <div id="aus-history-credential-dropdown" style="display:none;position:absolute;top:40px;left:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;max-width:320px;max-height:260px;overflow:auto;padding:8px;"></div>
              </div>
            </div>
            <div id="aus-diff" class="ds-card" style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">缓存断点</span><button id="aus-diff-fullscreen" style="padding:4px 8px;border:1px solid var(--ds-border);border-radius:6px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">全屏</button></div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">在历史中各选一条 旧/新 对比，橙/绿高亮即发散点</div></div>
            <div id="aus-history"></div>
          </div>
          <div data-view="settings" style="display:none;">
            <div id="aus-settings"></div>
          </div>
          <div data-view="help" style="display:none;">
            <div style="display:grid;gap:12px;">
              <div class="ds-card" style="line-height:1.7;font-size:var(--aus-fs-base);"><div style="font-size:var(--aus-fs-sm);color:#FF6A00;font-weight:600;margin-bottom:6px;">完整使用文档</div><div style="color:var(--ds-text-2);">详细说明各页面、筛选、钱包、定价、同步、隐私与常见问题。</div><a href="https://janmk1453.github.io/Api-Usage/" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;justify-content:center;margin-top:10px;padding:8px 14px;border-radius:999px;background:var(--ds-black);color:var(--ds-black-text);text-decoration:none;font-size:var(--aus-fs-base);font-weight:600;">前往完整使用文档</a></div>
              <div class="ds-card" style="line-height:1.7;font-size:var(--aus-fs-base);"><div style="font-size:var(--aus-fs-sm);color:#DC2626;font-weight:600;margin-bottom:6px;">隐私声明（完整版：<a href="https://janmk1453.github.io/Api-Usage/#privacy" target="_blank" rel="noreferrer" style="color:#DC2626;text-decoration:underline;">https://janmk1453.github.io/Api-Usage/#privacy</a>）</div><div style="color:var(--ds-text-2);display:grid;gap:6px;"><div>本扩展有且只能获得用户在酒馆本身中填写的：密钥条目的编号、用户备注和掩码末三位，仅用于独立区分请求来源，不会且无法读取、保存或上传完整明文密钥。</div><div>用户储存在酒馆本身的密钥是安全的，本扩展无法获取真实密钥。</div><div>用户主动填入本扩展的校准密钥是实际可用的密钥，且仅会被用于查询 DeepSeek 官方余额，不会额外造成扣费或消耗；它仅经 XOR 混淆后存放于 SillyTavern，不进入历史记录、统计、日志、导入导出或 WebDAV。自动校准时仅由浏览器直接发送至 <a href="https://api.deepseek.com/user/balance" target="_blank" rel="noreferrer" style="color:var(--ds-text);text-decoration:underline;">https://api.deepseek.com/user/balance</a> API 查询。</div><div>XOR 不是安全加密，请使用权限受限的密钥并自行评估风险。</div><div>本扩展完整代码开源可审查。</div><div style="margin-top:2px;padding-top:6px;border-top:1px solid var(--ds-border);font-weight:600;color:#DC2626;">免责声明（完整版见上方链接）</div><div>本扩展不对功能“价格来源”、“自动同步”等利用 <a href="https://models.dev" target="_blank" rel="noreferrer" style="color:var(--ds-text);text-decoration:underline;">models.dev</a> 获取的数据中出现或可能出现的商业化中转站负责；我们不建议使用任何商业化中转站，尽管我们已经尽力筛选数据，但由于对大量数据进行完全筛选难以实现，因此我们不对可能出现的任何商业化中转站名称负责，不构成推荐，和 models.dev 或任何中转站没有商业往来，坚定不移的反对商业化。</div><div>我们将尽可能维护扩展的安全和隐私性，但本扩展不对因酒馆/本扩展的安全漏洞或因间接原因导致的任何形式的密钥泄露及产生的损失负责。</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:var(--aus-fs-base);"><div style="font-size:var(--aus-fs-sm);color:#0BA25E;font-weight:600;margin-bottom:6px;">钱包</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 扩展按识别到的接入链接自动创建和汇总钱包，默认始终保留 DeepSeek 官方钱包；同名链接下识别的密钥和模型会归入同一钱包。</div><div>2. 每个钱包可独立维护名称、余额、模型价格、峰谷规则和价格来源；钱包默认收起，展开状态按钱包记忆。价格来源仅展示第一方模型厂商，不展示中转站或聚合平台。</div><div>3. 请求进入后会先匹配所属钱包，再使用该钱包的模型价格和峰谷规则计费，并从对应钱包余额预扣；未配置价格的模型先记零费用，保存或同步价格后自动重算冷热历史。</div><div>4. 自动余额校准仅支持 DeepSeek 官方直连，校准密钥需在钱包内单独填写；其他接入可使用手工余额，多个密钥不会自动相加。</div><div>5. 删除钱包会进入“已忽略接入”，后续请求不会自动重建、不参与余额合计，历史记录仍保留归属，需要时可恢复显示。</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:var(--aus-fs-base);"><div style="font-size:var(--aus-fs-sm);color:#2563EB;font-weight:600;margin-bottom:6px;">📊 使用统计 / 预测</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 输入 API 密钥并保存后点击“查询”获取余额（余额查询仅支持 DeepSeek 官方）</div><div>2. 正常对话，扩展自动记录每次请求的费用、token 数及缓存命中等统计数据</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:var(--aus-fs-base);"><div style="font-size:var(--aus-fs-sm);color:var(--ds-green);font-weight:600;margin-bottom:6px;">💡 高峰时间提示</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 设置中可开启峰值提示小圆点，直观显示当前（DeepSeek）高低峰状态</div><div>2. 圆点可拖动，位置自动记忆，找不到时可在设置中重置</div><div>3. DeepSeek 官方规则：周一至周五（不含中国法定节假日）9:00-12:00、14:00-18:00 为高峰，其余时段（含周末、中国法定节假日全天）为空闲；调休上班的周末同样按空闲计费</div><div>4. 内置中国法定节假日数据覆盖 ${CN_HOLIDAY_COVERAGE_LABEL}，超出范围的年份可在设置中按日期补充“额外空闲日期”</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:var(--aus-fs-base);"><div style="font-size:var(--aus-fs-sm);color:#DB2777;font-weight:600;margin-bottom:6px;">🔄 消息对比</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 在历史记录中找到想对比的两条消息，前者点“旧”，后者点“新”</div><div>2. 系统并排显示请求消息的文字差异</div><div>3. 差异点即缓存发散起始位置（前 N 条相同为缓存命中段）</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:var(--aus-fs-base);"><div style="font-size:var(--aus-fs-sm);color:#D97706;font-weight:600;margin-bottom:6px;">📈 统计图表</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 切换时间、模型（可多选）、对话、接入类型和 API 密钥查看不同范围的统计</div><div>2. 多图表展示多模请求参数，悬浮查看分模型明细</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:var(--aus-fs-base);"><div style="font-size:var(--aus-fs-sm);color:#7C3AED;font-weight:600;margin-bottom:6px;">💾 请求详细参数</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 在历史记录中点击某条的“详情”，电脑端会在右侧打开约四分之一宽的窗口并压缩列表宽度，手机端会在屏幕下部弹出约四分之三高度的悬浮窗口</div><div>2. 查看：模型/时间/耗时/首字延迟/思维链/费用/Token 等详情及四类原始数据（请求参数/完整响应/Raw Usage/Messages）</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:var(--aus-fs-base);"><div style="font-size:var(--aus-fs-sm);color:#0891B2;font-weight:600;margin-bottom:6px;">🧡 模型兼容</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>1. 完全兼容 DeepSeek 官方 API</div><div>2. 尽量兼容不同厂商/渠道的请求格式，部分模型可能无缓存命中</div><div>3. 如数据异常，请携带完整请求与响应反馈</div></div></div>
              <div class="ds-card" style="line-height:1.7;font-size:var(--aus-fs-base);"><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);font-weight:600;margin-bottom:6px;">✨ 关于</div><div style="color:var(--ds-text-2);display:grid;gap:4px;"><div>本扩展由原脚本（<a href="https://github.com/janmk1453/deepseek-tavern-script" target="_blank" style="color:var(--ds-text);text-decoration:underline;">deepseek-tavern-script</a>）迁移重构。</div><div><span style="color:var(--ds-text);">@janmk</span> · 仓库 <a href="https://github.com/janmk1453/Api-Usage" target="_blank" style="color:var(--ds-text);text-decoration:underline;">janmk1453/Api-Usage</a></div></div></div>
            </div>
          </div>
          <div data-view="about" style="display:none;">
            <div style="display:grid;gap:12px;">
              <div class="ds-card" style="line-height:1.7;font-size:var(--aus-fs-base);color:var(--ds-text);">
                <div style="font-size:var(--aus-fs-base);font-weight:600;">关于<br/>API用量统计 · SillyTavern 扩展</div>
                <div style="margin-top:8px;color:var(--ds-text-2);">迁移至原 DeepSeek使用预测 脚本<br/>致力于实现最全面的用量可视化统计<br/><br/>仓库：<a href="https://github.com/janmk1453/Api-Usage" target="_blank" style="color:var(--ds-text);">janmk1453/Api-Usage</a></div>
              </div>
              <div class="ds-card" style="display:grid;gap:8px;">
                <div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">检查更新</div>
                <div id="aus-update-banner" style="display:none;padding:8px 10px;border-radius:8px;background:var(--ds-yellow-bg);border:1px solid var(--ds-yellow-border);font-size:var(--aus-fs-sm);color:var(--ds-text);"></div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <div style="position:relative;z-index:5;">
                    <button id="aus-update-branch-btn" class="ds-btn-pill" style="padding:6px 14px;font-size:var(--aus-fs-sm);">更新分支：<span id="aus-update-branch-label">main</span></button>
                    <div id="aus-update-branch-dropdown" style="display:none;position:absolute;top:calc(100% + 6px);left:0;min-width:150px;padding:6px;background:var(--ds-bg);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:60;flex-direction:column;gap:4px;">
                      <div data-update-branch="main" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);">main（稳定）</div>
                      <div data-update-branch="dev" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);">dev（测试）</div>
                    </div>
                  </div>
                  <button id="aus-check-update" class="ds-btn-pill" style="padding:6px 14px;font-size:var(--aus-fs-sm);">检查更新</button>
                  <button id="aus-run-update" class="ds-btn-pill" style="display:none;padding:6px 14px;font-size:var(--aus-fs-sm);">立即更新</button>
                  <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">当前 v3.1.5 · 每 1 小时自动检查</span>
                </div>
                <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">可选择 main 或 dev 分支直接更新，默认 main；更新完成后自动刷新网页。非 Git 安装请使用“管理扩展程序”。</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <aside id="aus-history-detail" style="display:none;flex-direction:column;width:25%;min-width:300px;max-width:480px;flex-shrink:0;border-left:1px solid var(--ds-border);background:var(--ds-card-inner);overflow:hidden;">
        <div style="flex-shrink:0;height:48px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;border-bottom:1px solid var(--ds-border);">
          <span id="aus-history-detail-title" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">记录详情</span>
          <button id="aus-history-detail-close" title="关闭" style="width:28px;height:28px;flex-shrink:0;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card);color:var(--ds-text-2);cursor:pointer;line-height:1;display:inline-flex;align-items:center;justify-content:center;">${icon("close", 16)}</button>
        </div>
        <div id="aus-history-detail-body" style="flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:12px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;"></div>
      </aside>
    </div>
    </div>
    </div>
  `;
	const sbOverlay = doc.createElement("div");
	sbOverlay.id = "aus-sidebar-overlay";
	sbOverlay.style.cssText = "display:none;";
	panel.appendChild(sbOverlay);
	doc.body.appendChild(overlay);
	doc.body.appendChild(panel);
	try {
		applyTheme(theme);
	} catch {}
	try {
		(window.parent || window).addEventListener("resize", positionPanel, { passive: true });
	} catch {}
	doc.getElementById("aus-panel-close")?.addEventListener("click", closePanel);
	doc.getElementById("aus-mobile-panel-close")?.addEventListener("click", closePanel);
	doc.getElementById("aus-history-detail-close")?.addEventListener("click", () => closeHistoryDetail(doc));
	doc.querySelectorAll(".aus-nav-item").forEach((el) => {
		el.addEventListener("click", () => {
			const v = el.getAttribute("data-nav");
			if (v) switchView(v);
		});
	});
	let mobileOpen = false;
	const isMobile = () => {
		try {
			const body = doc.getElementById("aus-panel-body");
			if (body && body.clientWidth > 0) return body.clientWidth <= 760;
			return (window.parent?.innerWidth ?? window.innerWidth) <= 760;
		} catch {
			return window.innerWidth <= 760;
		}
	};
	const syncMobileSidebar = () => {
		const sb = doc.getElementById("aus-sidebar");
		if (!sb) return;
		const ov = doc.getElementById("aus-sidebar-overlay");
		if (isMobile()) {
			if (mobileOpen) sb.classList.add("is-open");
			else sb.classList.remove("is-open");
			if (ov) {
				ov.classList.toggle("is-open", mobileOpen);
				ov.style.display = "";
				if (mobileOpen) ov.onclick = () => {
					mobileOpen = false;
					syncMobileSidebar();
				};
				else ov.onclick = null;
			}
			const brand = doc.getElementById("aus-brand");
			if (brand) brand.style.removeProperty("display");
			doc.querySelectorAll(".aus-nav-label").forEach((el) => {
				el.style.removeProperty("display");
			});
			doc.querySelectorAll("#aus-sidebar .aus-nav-item").forEach((el) => {
				const c = el;
				c.style.removeProperty("justify-content");
				c.style.removeProperty("padding");
			});
			if (sb) {
				sb.style.removeProperty("width");
				sb.style.removeProperty("min-width");
				sb.style.removeProperty("max-width");
			}
		} else {
			sb.classList.remove("is-open");
			if (ov) {
				ov.classList.remove("is-open");
				ov.style.display = "none";
				ov.onclick = null;
			}
		}
	};
	const applyCollapsed = (v) => {
		collapsed = v;
		const sb = doc.getElementById("aus-sidebar");
		const brand = doc.getElementById("aus-brand");
		const btn = doc.getElementById("aus-sidebar-toggle");
		if (!sb) return;
		if (isMobile()) {
			syncMobileSidebar();
			return;
		}
		sb.style.setProperty("width", collapsed ? "60px" : "260px", "important");
		sb.style.setProperty("min-width", collapsed ? "60px" : "260px", "important");
		sb.style.setProperty("max-width", collapsed ? "60px" : "260px", "important");
		if (brand) brand.style.setProperty("display", collapsed ? "none" : "flex", "important");
		if (btn) btn.innerHTML = collapsed ? icon("chevron-right", 14) : icon("chevron-left", 14);
		doc.querySelectorAll(".aus-nav-label").forEach((el) => {
			el.style.setProperty("display", collapsed ? "none" : "inline", "important");
		});
		doc.querySelectorAll(".aus-nav-item").forEach((el) => {
			el.style.justifyContent = collapsed ? "center" : "flex-start";
		});
		doc.querySelectorAll("#aus-sidebar .aus-nav-item").forEach((el) => {
			el.style.padding = collapsed ? "10px 0" : "10px 12px";
		});
	};
	doc.getElementById("aus-sidebar-toggle")?.addEventListener("click", () => applyCollapsed(!collapsed));
	doc.getElementById("aus-hamburger-btn")?.addEventListener("click", () => {
		mobileOpen = !mobileOpen;
		syncMobileSidebar();
	});
	doc.querySelectorAll(".aus-nav-item").forEach((el) => {
		el.addEventListener("click", () => {
			if (isMobile() && mobileOpen) {
				mobileOpen = false;
				syncMobileSidebar();
			}
		});
	});
	try {
		if (isMobile()) {
			mobileOpen = false;
			syncMobileSidebar();
		}
		let rzT = null;
		const onResize = () => {
			if (rzT) return;
			rzT = setTimeout(() => {
				rzT = null;
				if (isMobile()) syncMobileSidebar();
				else {
					mobileOpen = false;
					syncMobileSidebar();
					applyCollapsed(collapsed);
				}
				try {
					positionPanel();
				} catch {}
			}, 150);
		};
		window.parent?.addEventListener("resize", onResize);
		window.addEventListener("resize", onResize);
	} catch {}
	bindPanel(doc);
	bindHistoryFilters(doc);
	bindImportExport(doc);
	renderSettings(doc);
	bindHistoryCompare();
	initStatsView();
	initExtraCharts();
	try {
		initForecastView();
	} catch {}
	try {
		import("./update-Ca6URPP_.js").then((m) => {
			const branchBtn = doc.getElementById("aus-update-branch-btn");
			const branchLabel = doc.getElementById("aus-update-branch-label");
			const branchDrop = doc.getElementById("aus-update-branch-dropdown");
			if (!branchBtn || !branchLabel || !branchDrop) return;
			const renderBranch = () => {
				const branch = m.getUpdateBranch();
				branchLabel.textContent = branch;
				branchDrop.querySelectorAll("[data-update-branch]").forEach((el) => {
					const active = el.getAttribute("data-update-branch") === branch;
					el.style.background = active ? "var(--ds-card)" : "transparent";
					el.style.fontWeight = active ? "600" : "400";
				});
			};
			renderBranch();
			branchBtn.onclick = (e) => {
				e.stopPropagation();
				branchDrop.style.display = branchDrop.style.display === "flex" ? "none" : "flex";
			};
			branchDrop.querySelectorAll("[data-update-branch]").forEach((el) => {
				el.onclick = () => {
					const branch = el.getAttribute("data-update-branch");
					if (branch !== "main" && branch !== "dev") return;
					m.setUpdateBranch(branch);
					renderBranch();
					branchDrop.style.display = "none";
					m.checkUpdate(true);
				};
			});
			doc.addEventListener("click", (ev) => {
				const drop = doc.getElementById("aus-update-branch-dropdown");
				if (!drop) return;
				if (!ev?.target?.closest?.("#aus-update-branch-dropdown") && !ev?.target?.closest?.("#aus-update-branch-btn")) drop.style.display = "none";
			});
		}).catch(() => {});
		const updBtn = doc.getElementById("aus-check-update");
		if (updBtn) updBtn.onclick = () => {
			updBtn.textContent = "检查中…";
			updBtn.setAttribute("disabled", "");
			import("./update-Ca6URPP_.js").then((m) => m.checkUpdate(true).finally(() => {
				updBtn.textContent = "检查更新";
				updBtn.removeAttribute("disabled");
			}));
		};
		const runUpdBtn = doc.getElementById("aus-run-update");
		if (runUpdBtn) runUpdBtn.onclick = () => {
			if (runUpdBtn.hasAttribute("disabled")) return;
			runUpdBtn.textContent = "更新中…";
			runUpdBtn.setAttribute("disabled", "");
			import("./update-Ca6URPP_.js").then((m) => m.updateSelf()).then((res) => {
				if (res.ok && res.changed) {
					const bannerEl = doc.getElementById("aus-update-banner");
					if (bannerEl) {
						bannerEl.style.display = "block";
						bannerEl.style.background = "var(--ds-green-bg)";
						bannerEl.style.borderColor = "var(--ds-green)";
						bannerEl.textContent = `已更新到 ${res.branch} 分支，正在刷新页面…`;
					}
					runUpdBtn.textContent = "即将刷新…";
					setTimeout(() => {
						try {
							window.parent?.location?.reload?.();
						} catch {
							try {
								location.reload();
							} catch {}
						}
					}, 1500);
					return;
				}
				runUpdBtn.textContent = "立即更新";
				runUpdBtn.removeAttribute("disabled");
				if (res.ok && !res.changed) {
					const bannerEl = doc.getElementById("aus-update-banner");
					if (bannerEl) {
						bannerEl.style.display = "block";
						bannerEl.style.background = "var(--ds-green-bg)";
						bannerEl.style.borderColor = "var(--ds-green)";
						bannerEl.textContent = `已是最新版本（${res.branch}），无需更新` + (res.commit ? "（" + res.commit + "）" : "");
					}
					runUpdBtn.style.display = "none";
				}
			}).catch(() => {
				runUpdBtn.textContent = "立即更新";
				runUpdBtn.removeAttribute("disabled");
			});
		};
	} catch {}
	switchView("overview");
	refreshUI();
}
function resetPanelState() {
	panelCreated = false;
	panelOpen = false;
}
function openPanel() {
	const doc = getDoc$1();
	panelOpenStartTs = nowTs();
	try {
		trackOpen();
	} catch {}
	let ov = doc.getElementById("aus-overlay");
	let pn = doc.getElementById("aus-panel");
	if (!ov || !pn) {
		createPanel();
		ov = doc.getElementById("aus-overlay");
		pn = doc.getElementById("aus-panel");
		if (!ov || !pn) return;
	}
	ov.style.display = "block";
	pn.style.display = "flex";
	try {
		const sb = doc.getElementById("aus-sidebar");
		const isMobile = (() => {
			try {
				const b = doc.getElementById("aus-panel-body");
				if (b && b.clientWidth > 0) return b.clientWidth <= 760;
				return (window.parent?.innerWidth ?? window.innerWidth) <= 760;
			} catch {
				return window.innerWidth <= 760;
			}
		})();
		if (sb) {
			if (isMobile) {
				if (sb.classList.contains("is-open") && !doc._aus_mobileOpen) sb.classList.remove("is-open");
			} else sb.classList.remove("is-open");
		}
	} catch {}
	positionPanel();
	requestAnimationFrame(() => {
		ov.style.opacity = "1";
		positionPanel();
		try {
			if (panelOpenStartTs) trackRender(nowTs() - panelOpenStartTs);
		} catch {}
	});
	panelOpen = true;
	refreshUI();
	try {
		import("./collector--RBIRrJR.js").then((m) => m.reconcileOnPanelOpen()).catch(() => {});
	} catch {}
	try {
		import("./update-Ca6URPP_.js").then((m) => m.maybeAutoCheck());
	} catch {}
}
function closePanel() {
	const doc = getDoc$1();
	const ov = doc.getElementById("aus-overlay");
	const pn = doc.getElementById("aus-panel");
	if (ov) {
		ov.style.opacity = "0";
		setTimeout(() => {
			ov.style.display = "none";
		}, 200);
	}
	if (pn) pn.style.display = "none";
	panelOpen = false;
	try {
		flushTelemetry("close");
	} catch {}
}
function togglePanel() {
	if (panelOpen) closePanel();
	else openPanel();
}
//#endregion
//#region src/ui/peak-dot.ts
function isPeak(ts) {
	const hours = state$2.settings.peakHours || [];
	return isPeakHour$1(ts, hours, state$2.settings.extraOffDays);
}
function getPeakStatus(now = Date.now()) {
	const extraOffDays = state$2.settings.extraOffDays;
	if (isWeekendDay(now)) return {
		color: "#22c55e",
		label: "周末全天低谷"
	};
	if (isChinaHoliday(now)) return {
		color: "#22c55e",
		label: "法定节假日全天低谷"
	};
	if (isExtraOffDay(now, extraOffDays)) return {
		color: "#22c55e",
		label: "自定义空闲日全天低谷"
	};
	if (isPeak(now)) return {
		color: "#ef4444",
		label: "高峰时段"
	};
	const d = new Date(now);
	const mins = d.getHours() * 60 + d.getMinutes();
	let nearest = 1440;
	for (const h of state$2.settings.peakHours || []) {
		let diff = parseInt(h.start.split(":")[0]) * 60 + parseInt(h.start.split(":")[1] || "0") - mins;
		if (diff < 0) diff += 1440;
		if (diff < nearest) nearest = diff;
	}
	if (nearest <= 10) return {
		color: "#eab308",
		label: `距高峰 ${nearest} 分`
	};
	return {
		color: "#22c55e",
		label: "非高峰"
	};
}
function updatePeakDot() {
	const dot = (window.parent?.document ?? document).getElementById("aus-peak-dot-indicator");
	if (!dot) return;
	if (state$2.settings.peakDot === false) {
		dot.style.display = "none";
		return;
	}
	dot.style.display = "block";
	const st = getPeakStatus();
	dot.style.background = st.color;
	dot.style.boxShadow = `0 0 8px ${st.color}`;
	dot.title = `API用量统计 · ${st.label}`;
}
var peakTimer = null;
function clampPos(left, top) {
	const w = window.parent?.innerWidth ?? window.innerWidth;
	const h = window.parent?.innerHeight ?? window.innerHeight;
	return {
		left: Math.min(Math.max(left, 0), w - 40),
		top: Math.min(Math.max(top, 0), h - 40)
	};
}
function stopPeakDot() {
	if (peakTimer) {
		try {
			clearInterval(peakTimer);
		} catch {}
		peakTimer = null;
	}
	try {
		(window.parent?.document ?? document).getElementById("aus-peak-dot-indicator")?.remove();
	} catch {}
}
function createPeakDot() {
	const doc = window.parent?.document ?? document;
	if (doc.getElementById("aus-peak-dot-indicator")) return;
	const dot = doc.createElement("div");
	dot.id = "aus-peak-dot-indicator";
	dot.style.cssText = "position:fixed;width:18px;height:18px;border-radius:50%;z-index:3000;cursor:grab;opacity:0.85;border:2px solid rgba(0,0,0,0.25);transition:opacity 0.2s;user-select:none;touch-action:none;";
	let saved = null;
	try {
		const v = localStorage.getItem("ds_ds_peak_dot_pos");
		if (v) saved = JSON.parse(v);
	} catch {}
	if (saved && typeof saved.left === "number" && typeof saved.top === "number") {
		const c = clampPos(saved.left, saved.top);
		dot.style.left = c.left + "px";
		dot.style.top = c.top + "px";
	} else {
		dot.style.right = "16px";
		dot.style.top = "60px";
	}
	doc.body.appendChild(dot);
	updatePeakDot();
	peakTimer = setInterval(updatePeakDot, 3e4);
	dot.addEventListener("pointerdown", (e) => {
		e.preventDefault();
		try {
			dot.setPointerCapture(e.pointerId);
		} catch {}
		dot.style.cursor = "grabbing";
		const rect = dot.getBoundingClientRect();
		const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
		const onMove = (ev) => {
			dot.style.right = "auto";
			dot.style.left = ev.clientX - sx + "px";
			dot.style.top = ev.clientY - sy + "px";
		};
		const onUp = (ev) => {
			dot.style.cursor = "grab";
			dot.removeEventListener("pointermove", onMove);
			dot.removeEventListener("pointerup", onUp);
			try {
				dot.releasePointerCapture(ev.pointerId);
			} catch {}
			const c = clampPos(parseInt(dot.style.left) || 0, parseInt(dot.style.top) || 0);
			dot.style.left = c.left + "px";
			dot.style.top = c.top + "px";
			try {
				localStorage.setItem("ds_ds_peak_dot_pos", JSON.stringify({
					left: c.left,
					top: c.top
				}));
			} catch {}
		};
		dot.addEventListener("pointermove", onMove);
		dot.addEventListener("pointerup", onUp);
	});
}
//#endregion
//#region src/index.ts
/**
* API用量统计 — 全屏独立面板 + 魔法棒入口
* 入口：酒馆左下角魔法棒（#extensionsMenu） → 点击打开全屏用量页
* 面板：独立于酒馆的 #aus-overlay + #aus-panel 全屏页面，DeepSeek 浅色风格
*/
var MODULE = "api_usage_stat";
var wandRetryTimer = null;
var mountRetryTimer = null;
var interceptionRetryTimer = null;
function onEscapeKey(e) {
	if (e.key === "Escape") closePanel();
}
function onPageHide() {
	try {
		import("./persistence-C4IJVd-B.js").then((n) => n.s).then((m) => m.flushSaveHot()).catch(() => {});
	} catch {}
}
function cleanupRuntimeBindings() {
	if (wandRetryTimer) {
		try {
			clearInterval(wandRetryTimer);
		} catch {}
		wandRetryTimer = null;
	}
	if (mountRetryTimer) {
		try {
			clearTimeout(mountRetryTimer);
		} catch {}
		mountRetryTimer = null;
	}
	if (interceptionRetryTimer) {
		try {
			clearInterval(interceptionRetryTimer);
		} catch {}
		interceptionRetryTimer = null;
	}
	try {
		const ctx = globalThis.SillyTavern?.getContext?.();
		if (ctx?.eventSource?.off) {
			ctx.eventSource.off(ctx.event_types?.APP_READY, onAppReady);
			ctx.eventSource.off(ctx.event_types?.APP_INITIALIZED, onAppInitialized);
			ctx.eventSource.off(ctx.event_types?.CHAT_CHANGED, onChatChanged);
		}
	} catch {}
	try {
		getDoc().removeEventListener("keydown", onEscapeKey);
	} catch {}
	try {
		window.removeEventListener("pagehide", onPageHide);
	} catch {}
}
function onAppReady() {
	try {
		createPanel();
	} catch {}
	try {
		ensureWandEntry();
	} catch {}
	try {
		refreshUI();
	} catch {}
	try {
		import("./interception-BoETqAOw.js").then((n) => n.n).then((m) => m.installInterception()).catch(() => {});
	} catch {}
	try {
		import("./collector--RBIRrJR.js").then((m) => m.initAgentUsage()).catch(() => {});
	} catch {}
}
function onAppInitialized() {
	try {
		ensureWandEntry();
	} catch {}
	try {
		import("./interception-BoETqAOw.js").then((n) => n.n).then((m) => m.installInterception()).catch(() => {});
	} catch {}
	try {
		import("./collector--RBIRrJR.js").then((m) => m.initAgentUsage()).catch(() => {});
	} catch {}
}
function onChatChanged() {
	try {
		if (state$2.settings.historyScope === "current") refreshUI();
	} catch {}
}
function getDoc() {
	return window.parent?.document ?? document;
}
function ensureStyleScope() {
	try {
		document.documentElement.removeAttribute("data-extension");
		document.documentElement.removeAttribute("data-ds-theme");
		const doc = getDoc();
		doc.documentElement.removeAttribute("data-ds-theme");
		if (doc.documentElement.getAttribute("data-extension") === "api-usage-stat" && doc.getElementById("aus-panel")) doc.documentElement.removeAttribute("data-extension");
	} catch {}
}
async function initStore() {
	await repository.hydrate();
}
function injectWandEntry() {
	const doc = getDoc();
	const menu = doc.getElementById("extensionsMenu") || doc.getElementById("extensions_menu") || doc.querySelector("#extensionsMenu") || doc.querySelector("#extensions_menu") || doc.querySelector(".extensionsMenu") || doc.getElementById("extensions_settings") || doc.querySelector("#rm_extensions_block");
	if (!menu) return false;
	if (doc.getElementById("aus_wand_container")) return true;
	const container = doc.createElement("div");
	container.id = "aus_wand_container";
	container.className = "extension_container";
	container.innerHTML = "<div id=\"aus_wand_entry\" class=\"list-group-item flex-container flexGap5\" style=\"cursor:pointer;\"><div class=\"fa-solid fa-chart-column extensionsMenuExtensionButton\"></div>API用量统计</div>";
	try {
		menu.appendChild(container);
	} catch {
		return false;
	}
	const btn = doc.getElementById("aus_wand_entry");
	if (btn) btn.addEventListener("click", () => togglePanel());
	log.debug("魔法棒入口已注入");
	return true;
}
function ensureWandEntry() {
	if (injectWandEntry()) {
		if (wandRetryTimer) {
			clearInterval(wandRetryTimer);
			wandRetryTimer = null;
		}
		return;
	}
	if (wandRetryTimer) clearInterval(wandRetryTimer);
	let tries = 0;
	wandRetryTimer = setInterval(() => {
		tries++;
		if (injectWandEntry() || tries > 20) {
			clearInterval(wandRetryTimer);
			wandRetryTimer = null;
		}
	}, 500);
}
async function onInstall() {
	log.debug("installed");
	try {
		const { loadHot } = await import("./persistence-C4IJVd-B.js").then((n) => n.s);
		await loadHot();
	} catch {}
}
async function onUpdate() {
	log.debug("updated");
}
async function onDelete() {
	log.debug("deleted");
	try {
		const { flushSaveHot } = await import("./persistence-C4IJVd-B.js").then((n) => n.s);
		flushSaveHot();
	} catch {}
	try {
		const doc = getDoc();
		doc.getElementById("aus-overlay")?.remove();
		doc.getElementById("aus-panel")?.remove();
		doc.getElementById("aus_wand_container")?.remove();
		doc.getElementById("aus-peak-dot-indicator")?.remove();
	} catch {}
	try {
		resetPanelState();
	} catch {}
	try {
		stopPeakDot();
	} catch {}
	try {
		(await import("./balance-C3MhaV_X.js").then((n) => n.t)).stopBalanceTimer?.();
	} catch {}
	try {
		(await import("./currency-BZt-7TC7.js").then((n) => n.t)).stopRateTimer?.();
	} catch {}
	try {
		(await import("./pricing-sync-CADPKT9h.js").then((n) => n.i)).stopPricingSyncTimer?.();
	} catch {}
	cleanupRuntimeBindings();
	try {
		localStorage.removeItem("ds_ds_webdav_pass");
	} catch {}
	try {
		localStorage.removeItem("ds_ds_peak_dot_pos");
	} catch {}
	try {
		localStorage.removeItem("ds_debug_log");
	} catch {}
	try {
		const ctx = globalThis.SillyTavern?.getContext?.();
		if (ctx?.extensionSettings) {
			delete ctx.extensionSettings["api_usage_stat"];
			ctx.saveSettingsDebounced?.();
		}
	} catch {}
	try {
		delete globalThis.ApiUsageStat;
		delete globalThis.ApiUsageStatInterceptor;
	} catch {}
}
function onEnable() {
	log.debug("enabled");
	try {
		import("./interception-BoETqAOw.js").then((n) => n.n).then((m) => m.installInterception());
	} catch {}
	try {
		import("./collector--RBIRrJR.js").then((m) => m.initAgentUsage()).catch(() => {});
	} catch {}
	try {
		import("./balance-C3MhaV_X.js").then((n) => n.t).then((m) => m.restartBalanceTimer?.());
	} catch {}
	try {
		import("./currency-BZt-7TC7.js").then((n) => n.t).then((m) => m.restartRateTimer?.());
	} catch {}
	try {
		import("./pricing-sync-CADPKT9h.js").then((n) => n.i).then((m) => m.restartPricingSyncTimer?.());
	} catch {}
}
async function onDisable() {
	log.debug("disabled");
	try {
		const { flushSaveHot } = await import("./persistence-C4IJVd-B.js").then((n) => n.s);
		flushSaveHot();
	} catch {}
	try {
		import("./interception-BoETqAOw.js").then((n) => n.n).then((m) => m.uninstallInterception?.());
	} catch {}
	try {
		import("./collector--RBIRrJR.js").then((m) => m.uninstallAgentUsage?.()).catch(() => {});
	} catch {}
	try {
		const doc = getDoc();
		doc.getElementById("aus-overlay")?.remove();
		doc.getElementById("aus-panel")?.remove();
		doc.getElementById("aus_wand_container")?.remove();
		doc.getElementById("aus-peak-dot-indicator")?.remove();
	} catch {}
	try {
		resetPanelState();
	} catch {}
	try {
		stopPeakDot();
	} catch {}
	try {
		unwatchSystemTheme();
	} catch {}
	try {
		(await import("./balance-C3MhaV_X.js").then((n) => n.t)).stopBalanceTimer?.();
	} catch {}
	try {
		(await import("./currency-BZt-7TC7.js").then((n) => n.t)).stopRateTimer?.();
	} catch {}
	try {
		(await import("./pricing-sync-CADPKT9h.js").then((n) => n.i)).stopPricingSyncTimer?.();
	} catch {}
	cleanupRuntimeBindings();
}
async function onActivate() {
	ensureStyleScope();
	try {
		injectWandEntry();
		ensureWandEntry();
	} catch {}
	try {
		installInterception();
	} catch {}
}
async function init() {
	ensureStyleScope();
	try {
		applyTheme(state$2.settings.theme);
	} catch {}
	try {
		await initStore();
	} catch (e) {
		console.error("[API用量统计] initStore 失败", e);
	}
	try {
		initTelemetry();
	} catch {}
	try {
		(await import("./balance-C3MhaV_X.js").then((n) => n.t)).restartBalanceTimer?.();
	} catch {}
	try {
		(await import("./currency-BZt-7TC7.js").then((n) => n.t)).restartRateTimer?.();
	} catch {}
	try {
		(await import("./pricing-sync-CADPKT9h.js").then((n) => n.i)).restartPricingSyncTimer?.();
	} catch {}
	try {
		installInterception();
	} catch {}
	try {
		import("./collector--RBIRrJR.js").then((m) => m.initAgentUsage()).catch(() => {});
	} catch {}
	const mount = () => {
		try {
			applyTheme(state$2.settings.theme);
		} catch {}
		try {
			watchSystemTheme();
		} catch {}
		try {
			createPanel();
		} catch {}
		try {
			ensureWandEntry();
		} catch {}
		try {
			createPeakDot();
		} catch {}
		try {
			refreshUI();
		} catch {}
		try {
			import("./pricing-sync-CADPKT9h.js").then((n) => n.i).then((m) => m.markLegacySyncedModels?.()).catch(() => {});
		} catch {}
	};
	if (globalThis.SillyTavern?.getContext) mount();
	else mountRetryTimer = window.setTimeout(mount, 1500);
	try {
		const ctx = globalThis.SillyTavern?.getContext?.();
		ctx?.eventSource?.on?.(ctx?.event_types?.APP_READY, onAppReady);
		ctx?.eventSource?.on?.(ctx?.event_types?.APP_INITIALIZED, onAppInitialized);
		ctx?.eventSource?.on?.(ctx?.event_types?.CHAT_CHANGED, onChatChanged);
		let retry = 0;
		interceptionRetryTimer = setInterval(() => {
			retry++;
			try {
				if (globalThis.SillyTavern?.getContext?.()?.eventSource) try {
					if (installInterception()) {
						clearInterval(interceptionRetryTimer);
						interceptionRetryTimer = null;
					}
				} catch {}
			} catch {}
			if (retry > 6 && interceptionRetryTimer) {
				clearInterval(interceptionRetryTimer);
				interceptionRetryTimer = null;
			}
		}, 1500);
	} catch {}
	try {
		getDoc().addEventListener("keydown", onEscapeKey);
	} catch {}
	try {
		window.addEventListener("pagehide", onPageHide);
	} catch {}
	globalThis.ApiUsageStat = {
		MODULE,
		refreshUI,
		refreshTheme,
		updatePeakDot,
		openPanel,
		closePanel,
		togglePanel,
		state: state$2,
		injectWandEntry: ensureWandEntry
	};
}
init();
//#endregion
export { onActivate, onDelete, onDisable, onEnable, onInstall, onUpdate, settings_exports as t };
