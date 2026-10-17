//#region src/constants/pricing.ts
var FLASH_PRICE_CUTOFF = (/* @__PURE__ */ new Date("2026-09-10T12:00:00+08:00")).getTime();
var FLASH_OLD_PRICING = {
	offpeak: {
		hit: .05,
		miss: 1.5,
		output: 4.5
	},
	peak: {
		hit: .1,
		miss: 3,
		output: 9
	}
};
var V4_PRO_PRICING = {
	offpeak: {
		hit: .15,
		miss: 4.5,
		output: 13.5
	},
	peak: {
		hit: .3,
		miss: 9,
		output: 27
	}
};
var V41_FLASH_PRICING = {
	offpeak: {
		hit: .02,
		miss: 1,
		output: 4
	},
	peak: {
		hit: .04,
		miss: 2,
		output: 8
	}
};
/** 未配置或无法识别模型时的上下文参考兜底（1M token） */
var DEFAULT_CONTEXT_LIMIT = 1e6;
/** 旧版 DeepSeek 自动推断的上下文上限，仅用于一次性迁移到 1M */
var LEGACY_DEEPSEEK_CONTEXT_LIMIT = 128e3;
var PRICING = {
	"deepseek-v4-flash": {
		usePeakPricing: true,
		offpeak: { ...V41_FLASH_PRICING.offpeak },
		peak: { ...V41_FLASH_PRICING.peak }
	},
	"deepseek-flash": {
		usePeakPricing: true,
		offpeak: { ...V41_FLASH_PRICING.offpeak },
		peak: { ...V41_FLASH_PRICING.peak }
	},
	"deepseek-v4-pro": {
		usePeakPricing: true,
		offpeak: { ...V4_PRO_PRICING.offpeak },
		peak: { ...V4_PRO_PRICING.peak }
	},
	"deepseek-v4-flash-vision-exp": {
		usePeakPricing: true,
		offpeak: {
			hit: .05,
			miss: 1.5,
			output: 4.5
		},
		peak: {
			hit: .1,
			miss: 3,
			output: 9
		}
	}
};
var DEFAULT_PEAK_HOURS = [{
	start: "09:00",
	end: "12:00"
}, {
	start: "14:00",
	end: "18:00"
}];
var PRICE_HISTORY = {
	"deepseek-v4-flash": [{
		since: 0,
		offpeak: { ...FLASH_OLD_PRICING.offpeak },
		peak: { ...FLASH_OLD_PRICING.peak },
		usePeakPricing: true,
		label: "2026-09-10 12:00 前旧价"
	}, {
		since: FLASH_PRICE_CUTOFF,
		offpeak: { ...PRICING["deepseek-v4-flash"].offpeak },
		peak: { ...PRICING["deepseek-v4-flash"].peak },
		usePeakPricing: true,
		label: "2026-09-10 12:00 起新价"
	}],
	"deepseek-flash": [{
		since: 0,
		offpeak: { ...PRICING["deepseek-flash"].offpeak },
		peak: { ...PRICING["deepseek-flash"].peak },
		usePeakPricing: true,
		label: "V4.1 Flash：空闲 0.02/1/4，高峰 2×"
	}],
	"deepseek-v4-pro": [{
		since: 0,
		offpeak: { ...V4_PRO_PRICING.offpeak },
		peak: { ...V4_PRO_PRICING.peak },
		usePeakPricing: true,
		label: "V4 Pro 持续定价：空闲 0.15/4.5/13.5，高峰 2×"
	}],
	"deepseek-v4-flash-vision-exp": [{
		since: 0,
		offpeak: { ...PRICING["deepseek-v4-flash-vision-exp"].offpeak },
		peak: { ...PRICING["deepseek-v4-flash-vision-exp"].peak },
		usePeakPricing: true
	}]
};
var HIDDEN_PRICING_MODELS = [
	"deepseek-v4-flash",
	"deepseek-v4-flash-vision-exp",
	"deepseek-v4.1-flash"
];
var MAX_HISTORY = 2e3;
var STORAGE_KEYS = {
	KEY: "ds_api_key",
	BALANCE: "ds_balance_data",
	SAVES: "ds_saves",
	CURRENT_SAVE: "ds_current_save",
	SETTINGS: "ds_settings",
	MESSAGE_COUNT: "ds_message_count",
	CUSTOM_BALANCE: "ds_custom_balance",
	LAST_VERSION: "ds_last_version",
	SYNC_META: "ds_sync_meta",
	WEBDAV_PASS: "ds_webdav_pass",
	PEAK_DOT_POS: "ds_peak_dot_pos"
};
var WEBDAV_SYNC_FILE = "DeepSeekStatSync.json";
var PRICING_SYNC_SOURCE = "https://models.dev/api.json";
var PRICING_SYNC_FALLBACK = "https://raw.githubusercontent.com/anomalyco/opencode/main/models.json";
var DEFAULT_EXCHANGE_RATE = 7.2;
var EXCHANGE_RATE_FETCH_INTERVAL = 864e5;
//#endregion
export { HIDDEN_PRICING_MODELS as a, PRICE_HISTORY as c, PRICING_SYNC_SOURCE as d, STORAGE_KEYS as f, EXCHANGE_RATE_FETCH_INTERVAL as i, PRICING as l, DEFAULT_EXCHANGE_RATE as n, LEGACY_DEEPSEEK_CONTEXT_LIMIT as o, WEBDAV_SYNC_FILE as p, DEFAULT_PEAK_HOURS as r, MAX_HISTORY as s, DEFAULT_CONTEXT_LIMIT as t, PRICING_SYNC_FALLBACK as u };
