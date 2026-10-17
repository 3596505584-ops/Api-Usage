import { pn as __exportAll } from "./graphic-BAx7jeh4.js";
import "./pricing-bcKQQNo6.js";
//#region src/types/settings.ts
var defaultSettings = () => ({
	theme: "light",
	overviewWalletId: "wallet:deepseek-official",
	overviewWalletManuallySet: false,
	autoBalance: false,
	balanceInterval: 10,
	debug: false,
	debugHit: 1e4,
	debugMiss: 5e3,
	debugOutput: 2e3,
	debugModel: "deepseek-v4-flash",
	debugDateStart: "",
	debugDateEnd: "",
	debugBatchCount: 30,
	customModels: [],
	peakHours: [{
		start: "09:00",
		end: "12:00"
	}, {
		start: "14:00",
		end: "18:00"
	}],
	extraOffDays: [],
	peakDot: true,
	telemetryEnabled: true,
	webdav: {
		url: "https://dav.jianguoyun.com/dav/",
		username: "",
		path: "",
		proxy: ""
	},
	historyScope: "all",
	overviewFour: [
		"avg_cost",
		"avg_tokens",
		"avg_duration",
		"avg_rate",
		"avg_input_tokens",
		"avg_output_tokens",
		"avg_hit_rate",
		"max_total"
	],
	statsFour: [
		"avg_cost",
		"avg_tokens",
		"avg_think_ratio",
		"truncation_rate"
	],
	modelsPricingCollapsed: true,
	pricingSync: {
		enabled: false,
		mode: "add-missing",
		exchangeRate: 7.2,
		useLiveRate: true,
		autoIntervalHours: 0,
		lastSync: null,
		lastRateFetch: null,
		recalcOnSync: false,
		showSyncedModels: false,
		syncedMarkVersion: 0
	}
});
//#endregion
//#region src/store/index.ts
var store_exports = /* @__PURE__ */ __exportAll({
	getCurrentChatIdForStore: () => getCurrentChatIdForStore,
	getHistoryForDisplay: () => getHistoryForDisplay,
	getSelectedSave: () => getSelectedSave,
	state: () => state
});
var state = {
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
	startTime: Date.now(),
	lastUsage: null,
	settings: defaultSettings(),
	balance: null,
	customBalance: null,
	wallets: [],
	walletIgnored: [],
	messageCount: 0
};
function getSelectedSave() {
	return {
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
		startTime: state.startTime
	};
}
function getCurrentChatIdForStore() {
	try {
		const ctx = globalThis.SillyTavern?.getContext?.();
		if (ctx?.getCurrentChatId) {
			const v = ctx.getCurrentChatId();
			if (typeof v === "string" && v) return v;
		}
		const chid = globalThis.this_chid;
		const chars = globalThis.characters;
		if (typeof chid === "number" && Array.isArray(chars) && chars[chid]) {
			const c = chars[chid].chat;
			if (typeof c === "string" && c) return c;
		}
	} catch {}
	return null;
}
function getHistoryForDisplay() {
	if ((state.settings.historyScope || "all") !== "current") return state.history || [];
	const cur = getCurrentChatIdForStore();
	if (!cur) return state.history || [];
	return (state.history || []).filter((h) => h.chatId === cur);
}
//#endregion
export { defaultSettings as a, store_exports as i, getSelectedSave as n, state as r, getHistoryForDisplay as t };
