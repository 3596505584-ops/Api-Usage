import { pn as __exportAll } from "./graphic-BAx7jeh4.js";
import { a as defaultSettings, n as getSelectedSave, r as state } from "./store-Cc2SGj8q.js";
import { a as HIDDEN_PRICING_MODELS, c as PRICE_HISTORY, l as PRICING, r as DEFAULT_PEAK_HOURS, s as MAX_HISTORY, t as DEFAULT_CONTEXT_LIMIT } from "./pricing-Bc-qEvy8.js";
import { a as loadHistoryCold, c as saveExtensionSettings, d as historyRecordKey, i as getExtensionSettings, l as saveHistoryCold, n as clearHistoryCold, o as loadHot, r as getAllHistory, t as appendHistoryCold, u as saveHot } from "./persistence-C4IJVd-B.js";
import { r as toast, t as log } from "./logger-8RGXnvfI.js";
import { a as isUnsafeKey, c as localDay, i as isPeakHour$1, n as isChinaHoliday, o as isValidDayKey, r as isExtraOffDay, s as isWeekendDay } from "./date-BJI2m6dS.js";
import { a as getWalletExchangeRate } from "./currency-BZt-7TC7.js";
//#region src/types/wallet.ts
var DEEPSEEK_WALLET_ID = "wallet:deepseek-official";
var WALLET_CATALOG_PROVIDERS = [
	{
		id: "deepseek",
		label: "DeepSeek"
	},
	{
		id: "openai",
		label: "OpenAI"
	},
	{
		id: "anthropic",
		label: "Anthropic"
	},
	{
		id: "google",
		label: "Google"
	},
	{
		id: "mistral",
		label: "Mistral"
	},
	{
		id: "xai",
		label: "xAI"
	},
	{
		id: "moonshotai",
		label: "Moonshot AI"
	},
	{
		id: "zai",
		label: "Z.AI"
	},
	{
		id: "minimax",
		label: "MiniMax"
	},
	{
		id: "cohere",
		label: "Cohere"
	}
];
function isFirstPartyCatalogProvider(value) {
	const id = String(value || "").trim().toLowerCase();
	return WALLET_CATALOG_PROVIDERS.some((provider) => provider.id === id);
}
function defaultCatalogProvider(sourceType) {
	return {
		deepseek: "deepseek",
		openai: "openai",
		claude: "anthropic",
		makersuite: "google",
		vertexai: "google",
		mistralai: "mistral",
		xai: "xai",
		moonshot: "moonshotai",
		zai: "zai",
		minimax: "minimax",
		cohere: "cohere"
	}[String(sourceType || "").trim().toLowerCase()] || null;
}
function walletCurrencyOrDefault(value) {
	return String(value || "").trim().toUpperCase() === "USD" ? "USD" : "CNY";
}
function emptyWalletPriceRule() {
	return {
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
	};
}
//#endregion
//#region src/services/connection-identity.ts
var FALLBACK_SECRET_KEYS = {
	OPENAI: "api_key_openai",
	CLAUDE: "api_key_claude",
	OPENROUTER: "api_key_openrouter",
	AI21: "api_key_ai21",
	MAKERSUITE: "api_key_makersuite",
	VERTEXAI: "api_key_vertexai",
	MISTRALAI: "api_key_mistralai",
	CUSTOM: "api_key_custom",
	COHERE: "api_key_cohere",
	PERPLEXITY: "api_key_perplexity",
	GROQ: "api_key_groq",
	ELECTRONHUB: "api_key_electronhub",
	NANOGPT: "api_key_nanogpt",
	DEEPSEEK: "api_key_deepseek",
	AIMLAPI: "api_key_aimlapi",
	XAI: "api_key_xai",
	MOONSHOT: "api_key_moonshot",
	FIREWORKS: "api_key_fireworks",
	COMETAPI: "api_key_cometapi",
	AZURE_OPENAI: "api_key_azure_openai",
	ZAI: "api_key_zai",
	SILICONFLOW: "api_key_siliconflow",
	CHUTES: "api_key_chutes",
	POLLINATIONS: "api_key_pollinations",
	WORKERS_AI: "api_key_workers_ai",
	MINIMAX: "api_key_minimax"
};
var SOURCE_SECRET_KEYS = {
	openai: "OPENAI",
	claude: "CLAUDE",
	openrouter: "OPENROUTER",
	ai21: "AI21",
	makersuite: "MAKERSUITE",
	vertexai: "VERTEXAI",
	mistralai: "MISTRALAI",
	custom: "CUSTOM",
	cohere: "COHERE",
	perplexity: "PERPLEXITY",
	groq: "GROQ",
	electronhub: "ELECTRONHUB",
	nanogpt: "NANOGPT",
	deepseek: "DEEPSEEK",
	aimlapi: "AIMLAPI",
	xai: "XAI",
	moonshot: "MOONSHOT",
	fireworks: "FIREWORKS",
	cometapi: "COMETAPI",
	azure_openai: "AZURE_OPENAI",
	zai: "ZAI",
	siliconflow: "SILICONFLOW",
	chutes: "CHUTES",
	pollinations: "POLLINATIONS",
	workers_ai: "WORKERS_AI",
	minimax: "MINIMAX"
};
var OFFICIAL_LABELS = {
	deepseek: "DeepSeek 官方",
	openai: "OpenAI 官方",
	claude: "Claude 官方",
	openrouter: "OpenRouter 官方",
	groq: "Groq 官方",
	mistralai: "Mistral 官方",
	makersuite: "Google AI Studio 官方",
	vertexai: "Vertex AI 官方",
	cohere: "Cohere 官方",
	siliconflow: "SiliconFlow 官方",
	fireworks: "Fireworks 官方",
	chutes: "Chutes 官方",
	minimax: "MiniMax 官方",
	xai: "xAI 官方",
	zai: "Z.AI 官方",
	moonshot: "Moonshot 官方",
	custom: "自定义接口"
};
var secretsModulePromise = null;
var secretsModule = null;
function initConnectionIdentity() {
	if (!secretsModulePromise) secretsModulePromise = import(
		/* @vite-ignore */
		"/scripts/secrets.js"
).then((mod) => {
		secretsModule = mod;
		try {
			(mod.readSecretState?.())?.catch?.(() => {});
		} catch {}
		return mod;
	}).catch(() => null);
	return secretsModulePromise.then(() => void 0);
}
function hash32(text, seed) {
	let h = seed >>> 0;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 1540483477);
		h ^= h >>> 15;
	}
	h = Math.imul(h ^ h >>> 16, 2246822507);
	h = Math.imul(h ^ h >>> 13, 3266489909);
	return (h ^ h >>> 16) >>> 0;
}
function shortHash(text) {
	return hash32(text, 2166136261).toString(16).padStart(8, "0") + hash32(text, 2654435769).toString(16).padStart(8, "0");
}
function officialEndpointId(sourceType) {
	return shortHash(`${sourceType}|official:${sourceType}`);
}
function isDeepSeekOfficialEndpoint(value) {
	const text = String(value ?? "").trim();
	if (!text) return false;
	const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : "https://" + text;
	try {
		return new URL(candidate).hostname.replace(/\.$/, "").toLowerCase() === "api.deepseek.com";
	} catch {
		return false;
	}
}
function normalizeEndpoint(raw) {
	const value = String(raw || "").trim();
	if (!value) return null;
	const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : "https://" + value;
	try {
		const url = new URL(candidate);
		const host = url.host;
		return {
			canonical: `${url.protocol}//${host}`,
			label: host
		};
	} catch {
		const fallback = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/+$/, "");
		return fallback ? {
			canonical: fallback,
			label: fallback
		} : null;
	}
}
function buildEndpointIdentity(sourceType, rawEndpoint) {
	const endpoint = rawEndpoint ? normalizeEndpoint(rawEndpoint) : null;
	const sourceIsOfficial = String(sourceType || "").trim().toLowerCase() === "deepseek" && !endpoint;
	const endpointIsOfficial = isDeepSeekOfficialEndpoint(endpoint?.canonical) || isDeepSeekOfficialEndpoint(endpoint?.label);
	const isOfficial = sourceIsOfficial || endpointIsOfficial;
	return {
		sourceType,
		endpointId: isOfficial ? officialEndpointId("deepseek") : sourceType || endpoint ? shortHash(`${sourceType || "unknown"}|${endpoint?.canonical || "official:" + (sourceType || "unknown")}`) : null,
		endpointLabel: isOfficial ? "DeepSeek 官方" : endpoint?.label || (sourceType ? OFFICIAL_LABELS[sourceType] || `${sourceType} 接口` : null)
	};
}
function normalizeConnectionEndpoint(connection) {
	if (!connection) return null;
	const sourceType = connection.sourceType ?? null;
	const endpointLabel = String(connection.endpointLabel || "").trim();
	if (endpointLabel === "DeepSeek 官方") return {
		...connection,
		sourceType,
		endpointId: officialEndpointId("deepseek"),
		endpointLabel: "DeepSeek 官方"
	};
	if (!endpointLabel) return {
		...connection,
		sourceType
	};
	const identity = buildEndpointIdentity(sourceType, endpointLabel);
	return {
		...connection,
		sourceType,
		endpointId: identity.endpointId,
		endpointLabel: identity.endpointLabel
	};
}
function resolveSecretKey(sourceType, secretKeys) {
	if (!sourceType) return null;
	const keyName = SOURCE_SECRET_KEYS[sourceType];
	if (!keyName) return null;
	return secretKeys?.[keyName] || FALLBACK_SECRET_KEYS[keyName] || null;
}
function findSecret(state, preferredKey, id) {
	if (!state || typeof state !== "object") return null;
	const search = (key) => {
		const list = state[key];
		if (!Array.isArray(list)) return null;
		const entry = id ? list.find((item) => item?.id === id) : list.find((item) => item?.active);
		return entry?.id ? {
			ownerKey: key,
			entry
		} : null;
	};
	if (preferredKey) {
		const found = search(preferredKey);
		if (found) return found;
	}
	if (id) for (const key of Object.keys(state)) {
		const found = search(key);
		if (found) return found;
	}
	return null;
}
function credentialLabel(entry) {
	const id = String(entry.id || "");
	const base = String(entry.label || "").trim() || `密钥 ${id.slice(0, 6).toUpperCase()}`;
	const tail = String(entry.value || "").replace(/[^a-zA-Z0-9]/g, "").slice(-3);
	return tail ? `${base} •••${tail}` : base;
}
function buildEndpointContext(body) {
	return buildEndpointIdentity(typeof body?.chat_completion_source === "string" && body.chat_completion_source.trim() ? body.chat_completion_source.trim() : null, typeof body?.custom_url === "string" && body.custom_url.trim() ? body.custom_url.trim() : typeof body?.reverse_proxy === "string" ? body.reverse_proxy.trim() : "");
}
function buildConnectionContext(body, secretState, secretKeys) {
	const endpoint = buildEndpointContext(body);
	if (typeof body?.reverse_proxy === "string" ? body.reverse_proxy.trim() : "") return {
		...endpoint,
		credentialId: null,
		credentialLabel: null
	};
	const secretId = typeof body?.secret_id === "string" && body.secret_id.trim() ? body.secret_id.trim() : null;
	const preferredKey = resolveSecretKey(endpoint.sourceType, secretKeys);
	const found = findSecret(secretState || {}, preferredKey, secretId);
	if (!found) return {
		...endpoint,
		credentialId: null,
		credentialLabel: null
	};
	return {
		...endpoint,
		credentialId: `secret:${found.ownerKey}:${found.entry.id}`,
		credentialLabel: credentialLabel(found.entry)
	};
}
function resolveRuntimeConnectionContext(body) {
	initConnectionIdentity();
	return buildConnectionContext(body, secretsModule?.secret_state || null, secretsModule?.SECRET_KEYS);
}
//#endregion
//#region src/data/balance-providers.ts
var BALANCE_PROVIDERS = [
	{
		id: "auto",
		label: "按接入地址自动识别"
	},
	{
		id: "manual",
		label: "仅手工余额"
	},
	{
		id: "deepseek",
		label: "DeepSeek"
	},
	{
		id: "openrouter",
		label: "OpenRouter 账户（管理密钥）"
	},
	{
		id: "openrouter-key",
		label: "OpenRouter 密钥用量/额度"
	},
	{
		id: "siliconflow",
		label: "硅基流动（中国站）"
	},
	{
		id: "moonshot",
		label: "Moonshot（中国站）"
	},
	{
		id: "moonshot-intl",
		label: "Moonshot（国际站）"
	},
	{
		id: "custom",
		label: "自定义 JSON 接口"
	}
];
function normalizeBalanceQuery(raw) {
	return {
		provider: BALANCE_PROVIDERS.some((p) => p.id === raw?.provider) ? raw.provider : "auto",
		url: safeBalanceUrl(raw?.url) || "",
		balancePath: String(raw?.balancePath || "").trim(),
		usagePath: String(raw?.usagePath || "").trim(),
		totalPath: String(raw?.totalPath || "").trim(),
		multiplier: typeof raw?.multiplier === "number" && Number.isFinite(raw.multiplier) && raw.multiplier > 0 ? raw.multiplier : 1,
		currency: raw?.currency === "USD" ? "USD" : "CNY",
		auth: raw?.auth === "x-api-key" ? "x-api-key" : "bearer"
	};
}
/** 查询地址不包含密钥；禁止用户信息、查询参数和重定向转发凭证。 */
function safeBalanceUrl(value) {
	try {
		const url = new URL(String(value || ""));
		const local = [
			"localhost",
			"127.0.0.1",
			"[::1]"
		].includes(url.hostname);
		if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
		if (url.username || url.password || url.search || url.hash) return null;
		return url.href;
	} catch {
		return null;
	}
}
function detectBalanceProvider(wallet) {
	const hosts = {
		"api.deepseek.com": "deepseek",
		"openrouter.ai": "openrouter",
		"api.siliconflow.cn": "siliconflow",
		"api.moonshot.cn": "moonshot",
		"api.moonshot.ai": "moonshot-intl"
	};
	for (const field of [wallet.endpointLabel, wallet.endpointId]) try {
		const text = String(field || "");
		const url = new URL(text.includes("://") ? text : `https://${text}`);
		if (url.username || url.password || url.port) continue;
		const provider = hosts[url.hostname.toLowerCase()];
		if (provider) return provider;
	} catch {}
	const source = String(wallet.sourceType || "").toLowerCase();
	if (wallet.endpointId === officialEndpointId(source)) return {
		deepseek: "deepseek",
		openrouter: "openrouter",
		siliconflow: "siliconflow",
		moonshot: "moonshot"
	}[source] || null;
	return null;
}
function resolvedBalanceProvider(wallet) {
	const provider = wallet.balance.query?.provider || "auto";
	return provider === "auto" ? detectBalanceProvider(wallet) : provider;
}
function balanceQueryUrl(wallet) {
	const urls = {
		deepseek: "https://api.deepseek.com/user/balance",
		openrouter: "https://openrouter.ai/api/v1/credits",
		"openrouter-key": "https://openrouter.ai/api/v1/key",
		siliconflow: "https://api.siliconflow.cn/v1/user/info",
		moonshot: "https://api.moonshot.cn/v1/users/me/balance",
		"moonshot-intl": "https://api.moonshot.ai/v1/users/me/balance"
	};
	const provider = resolvedBalanceProvider(wallet);
	return provider === "custom" ? safeBalanceUrl(wallet.balance.query?.url) : provider ? urls[provider] || null : null;
}
function moneyNumber(value) {
	if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}
/** 只读取自有属性，不执行表达式；支持 data.items[0].balance。 */
function jsonField(data, path) {
	if (!path || !/^[\w-]+(?:\[\d+\]|\.[\w-]+)*$/.test(path)) return void 0;
	let value = data;
	for (const key of path.replace(/\[(\d+)\]/g, ".$1").split(".")) {
		if ([
			"__proto__",
			"prototype",
			"constructor"
		].includes(key) || !value || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(value, key)) return void 0;
		value = value[key];
	}
	return value;
}
function parseAccountSnapshot(wallet, data) {
	if (data?.error || data?.success === false || data?.status === false) throw new Error("平台返回查询失败");
	const provider = resolvedBalanceProvider(wallet);
	let amount = null;
	let usage = null;
	let currency = "CNY";
	let keyRemaining = null;
	let scope = "account";
	if (provider === "deepseek") {
		const infos = Array.isArray(data?.balance_infos) ? data.balance_infos : [];
		const info = infos.find((i) => i.currency === wallet.balance.currency) || infos[0];
		if (!info || !["CNY", "USD"].includes(info.currency)) throw new Error("余额响应缺少有效币种");
		amount = moneyNumber(info.total_balance);
		currency = info.currency;
	} else if (provider === "openrouter") {
		currency = "USD";
		const credits = moneyNumber(data?.data?.total_credits);
		usage = moneyNumber(data?.data?.total_usage);
		if (credits !== null && usage !== null) amount = credits - usage;
	} else if (provider === "openrouter-key") {
		currency = "USD";
		scope = "key";
		usage = moneyNumber(data?.data?.usage);
		keyRemaining = moneyNumber(data?.data?.limit_remaining);
	} else if (provider === "siliconflow") amount = moneyNumber(data?.data?.totalBalance);
	else if (provider === "moonshot" || provider === "moonshot-intl") {
		amount = moneyNumber(data?.data?.available_balance);
		currency = provider === "moonshot-intl" ? "USD" : "CNY";
	} else if (provider === "custom") {
		const q = normalizeBalanceQuery(wallet.balance.query);
		currency = q.currency;
		const rawUsage = q.usagePath ? moneyNumber(jsonField(data, q.usagePath)) : null;
		if (q.usagePath && rawUsage === null) throw new Error("已用金额字段不存在或不是有效数字");
		usage = rawUsage === null ? null : rawUsage * q.multiplier;
		const rawAmount = moneyNumber(jsonField(data, q.totalPath || q.balancePath));
		if (rawAmount !== null && (!q.totalPath || rawUsage !== null)) amount = (rawAmount - (q.totalPath ? rawUsage : 0)) * q.multiplier;
	}
	if (scope === "account" ? amount === null || !Number.isFinite(amount) : usage === null) throw new Error("未找到有效余额/用量，请检查接口和字段配置");
	if (usage !== null && (!Number.isFinite(usage) || usage < 0)) throw new Error("平台已用金额无效");
	return {
		amount: amount === null ? null : String(amount),
		currency,
		usage,
		scope,
		keyRemaining
	};
}
//#endregion
//#region src/data/wallets.ts
var DEEPSEEK_OFFICIAL_ENDPOINT_ID = officialEndpointId("deepseek");
function cleanText(value) {
	return String(value == null ? "" : value).trim();
}
function finiteNumber(value, fallback = 0) {
	const n = typeof value === "number" ? value : parseFloat(String(value));
	return Number.isFinite(n) ? n : fallback;
}
function positiveNumberOrNull(value) {
	const n = typeof value === "number" ? value : parseFloat(String(value));
	return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
function builtinContextLimit(model) {
	const key = String(model || "").toLowerCase();
	if (key.includes("128k")) return 128e3;
	if (key.includes("64k")) return 64e3;
	if (key.includes("32k")) return 32e3;
	if (key.includes("deepseek")) return DEFAULT_CONTEXT_LIMIT;
	return null;
}
/** 钱包页清空手动上限后恢复的自动推断值 */
function defaultContextLimitForModel(model) {
	return builtinContextLimit(model);
}
function safeId(s) {
	return s.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 100);
}
function walletIdForEndpoint(endpointId) {
	const id = cleanText(endpointId);
	return id ? `wallet:${safeId(id)}` : null;
}
function isDeepSeekOfficialConnection(connection) {
	if (!connection) return false;
	const sourceType = cleanText(connection.sourceType).toLowerCase();
	const endpointId = cleanText(connection.endpointId);
	const endpointLabel = cleanText(connection.endpointLabel);
	if (endpointId === DEEPSEEK_OFFICIAL_ENDPOINT_ID || isDeepSeekOfficialEndpoint(endpointId) || isDeepSeekOfficialEndpoint(endpointLabel) || endpointLabel === "DeepSeek 官方") return true;
	return sourceType === "deepseek" && !endpointId;
}
function walletMatchesConnection(wallet, connection) {
	if (!wallet || !connection) return false;
	if (wallet.id === "wallet:deepseek-official") return isDeepSeekOfficialConnection(connection);
	if (wallet.endpointId && connection.endpointId) return wallet.endpointId === connection.endpointId;
	if (wallet.sourceType && connection.sourceType) return wallet.sourceType === connection.sourceType && !wallet.endpointId && !connection.endpointId;
	return false;
}
function findWalletForConnection(wallets, connection) {
	if (!connection) return null;
	for (const wallet of wallets || []) if (walletMatchesConnection(wallet, connection)) return wallet;
	return null;
}
function findWalletForHistory(wallets, history) {
	if (!history) return null;
	if (history.walletId) {
		const exact = (wallets || []).find((wallet) => wallet.id === history.walletId);
		if (exact) return exact;
	}
	if (history.endpointId) {
		const byEndpoint = (wallets || []).find((wallet) => wallet.endpointId === history.endpointId);
		if (byEndpoint) return byEndpoint;
	}
	if (cleanText(history.sourceType).toLowerCase() === "deepseek") return (wallets || []).find((wallet) => wallet.id === "wallet:deepseek-official") || null;
	return null;
}
function clonePriceTier(tier, fallback) {
	const src = tier && typeof tier === "object" ? tier : {};
	return {
		hit: finiteNumber(src.hit, finiteNumber(fallback?.hit, 0)),
		miss: finiteNumber(src.miss, finiteNumber(fallback?.miss, 0)),
		output: finiteNumber(src.output, finiteNumber(fallback?.output, 0))
	};
}
function normalizeWalletPriceRule(raw) {
	const src = raw && typeof raw === "object" ? raw : {};
	const configured = src.priceConfigured === true;
	return {
		usePeakPricing: src.usePeakPricing !== false,
		offpeak: clonePriceTier(src.offpeak),
		peak: clonePriceTier(src.peak),
		priceConfigured: configured
	};
}
function cloneWalletPriceRule(rule) {
	return {
		usePeakPricing: rule.usePeakPricing !== false,
		offpeak: { ...rule.offpeak },
		peak: { ...rule.peak },
		priceConfigured: rule.priceConfigured === true
	};
}
function normalizeAliases(raw, current) {
	if (!Array.isArray(raw)) return [];
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const value of raw) {
		const item = cleanText(value);
		if (!item || item === current || seen.has(item)) continue;
		seen.add(item);
		out.push(item);
	}
	return out;
}
function normalizeWalletModel(raw, now = Date.now()) {
	if (!raw || typeof raw !== "object") return null;
	const sourceModel = cleanText(raw.sourceModel || raw.model);
	if (!sourceModel) return null;
	const model = cleanText(raw.model || sourceModel);
	const source = [
		"builtin",
		"manual",
		"sync",
		"discovered"
	].includes(raw.source) ? raw.source : "discovered";
	const discoveredAt = finiteNumber(raw.discoveredAt, now);
	const contextLimitManual = raw.contextLimitManual === true;
	const rawContextLimit = positiveNumberOrNull(raw.contextLimit);
	const legacyDeepseekAuto = !contextLimitManual && rawContextLimit === 128e3 && sourceModel.toLowerCase().includes("deepseek");
	return {
		id: cleanText(raw.id) || `${sourceModel}:${discoveredAt}`,
		sourceModel,
		model,
		aliases: normalizeAliases(raw.aliases, model),
		contextLimit: contextLimitManual ? rawContextLimit : legacyDeepseekAuto ? DEFAULT_CONTEXT_LIMIT : rawContextLimit ?? builtinContextLimit(sourceModel),
		contextLimitManual,
		price: normalizeWalletPriceRule(raw.price),
		source,
		locked: raw.locked === true,
		discoveredAt,
		lastSeen: finiteNumber(raw.lastSeen, discoveredAt),
		updatedAt: finiteNumber(raw.updatedAt, discoveredAt)
	};
}
function normalizeCredential(raw) {
	if (!raw || typeof raw !== "object") return null;
	const id = cleanText(raw.id);
	if (!id) return null;
	return {
		id,
		label: cleanText(raw.label) || "未命名密钥",
		lastSeen: finiteNumber(raw.lastSeen, 0)
	};
}
function normalizePeakHours(raw, fallback) {
	const list = Array.isArray(raw) ? raw : fallback;
	const out = [];
	for (const item of list || []) {
		if (!item || typeof item !== "object") continue;
		const start = cleanText(item.start);
		const end = cleanText(item.end);
		if (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)) out.push({
			start,
			end
		});
	}
	return out.length ? out : fallback.map((item) => ({ ...item }));
}
function normalizeWallet(raw, settings, now = Date.now()) {
	if (!raw || typeof raw !== "object") return null;
	const id = cleanText(raw.id);
	if (!id) return null;
	for (const key of Object.keys(raw)) if (isUnsafeKey(key)) delete raw[key];
	const endpointId = cleanText(raw.endpointId) || null;
	const sourceType = cleanText(raw.sourceType) || null;
	const kind = id === "wallet:deepseek-official" ? "official" : raw.kind === "official" ? "official" : "relay";
	const name = cleanText(raw.name) || cleanText(raw.endpointLabel) || (kind === "official" ? "官方接口" : "未命名钱包");
	const balanceRaw = raw.balance && typeof raw.balance === "object" ? raw.balance : {};
	const models = Array.isArray(raw.models) ? raw.models.map((item) => normalizeWalletModel(item, now)).filter(Boolean) : [];
	const credentials = Array.isArray(raw.credentials) ? raw.credentials.map((item) => normalizeCredential(item)).filter(Boolean) : [];
	const modelMap = /* @__PURE__ */ new Map();
	for (const model of models) {
		const key = model.id || `${model.sourceModel}:${model.discoveredAt}`;
		if (!modelMap.has(key)) modelMap.set(key, model);
	}
	const credentialMap = /* @__PURE__ */ new Map();
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
		responseCost: [
			"CNY",
			"USD",
			"off"
		].includes(raw.responseCost) ? raw.responseCost : "auto",
		balance: {
			query: normalizeBalanceQuery(balanceRaw.query),
			...balanceRaw.snapshot && typeof balanceRaw.snapshot === "object" ? { snapshot: {
				amount: moneyNumber(balanceRaw.snapshot.amount) === null ? null : String(balanceRaw.snapshot.amount),
				currency: walletCurrencyOrDefault(balanceRaw.snapshot.currency),
				usage: moneyNumber(balanceRaw.snapshot.usage),
				scope: balanceRaw.snapshot.scope === "key" ? "key" : "account",
				keyRemaining: moneyNumber(balanceRaw.snapshot.keyRemaining),
				checkedAt: finiteNumber(balanceRaw.snapshot.checkedAt, 0)
			} } : {},
			mode: balanceRaw.mode === "auto" ? "auto" : "manual",
			amount: balanceRaw.amount == null || balanceRaw.amount === "" ? null : String(balanceRaw.amount),
			currency: walletCurrencyOrDefault(balanceRaw.currency),
			primaryCredentialId: cleanText(balanceRaw.primaryCredentialId) || null,
			lastCalibrated: balanceRaw.lastCalibrated == null ? null : finiteNumber(balanceRaw.lastCalibrated, 0)
		},
		peakHours: normalizePeakHours(raw.peakHours, settings.peakHours?.length ? settings.peakHours : DEFAULT_PEAK_HOURS),
		weekendOffpeak: raw.weekendOffpeak !== false,
		credentials: Array.from(credentialMap.values()),
		models: Array.from(modelMap.values()),
		collapsed: raw.collapsed !== false,
		createdAt,
		updatedAt: finiteNumber(raw.updatedAt, createdAt),
		lastUsedAt: raw.lastUsedAt == null ? null : finiteNumber(raw.lastUsedAt, 0),
		legacyPricingImported: raw.legacyPricingImported === true
	};
}
function visibleBuiltinModels() {
	return Object.keys(PRICING).filter((model) => HIDDEN_PRICING_MODELS.indexOf(model) === -1);
}
function currentBuiltinPrice(model, now) {
	const segments = PRICE_HISTORY[model];
	let segment = null;
	for (const item of segments || []) if (item && now >= item.since) segment = item;
	else break;
	const fallback = PRICING[model] || PRICING["deepseek-flash"];
	const price = segment || fallback;
	return {
		usePeakPricing: price?.usePeakPricing !== false,
		offpeak: clonePriceTier(price?.offpeak, fallback?.offpeak),
		peak: clonePriceTier(price?.peak, fallback?.peak),
		priceConfigured: true
	};
}
function createDeepSeekWallet(settings, now = Date.now()) {
	const models = visibleBuiltinModels().map((model) => ({
		id: `builtin:${model}`,
		sourceModel: model,
		model,
		aliases: [],
		contextLimit: builtinContextLimit(model),
		contextLimitManual: false,
		price: currentBuiltinPrice(model, now),
		source: "builtin",
		locked: false,
		discoveredAt: now,
		lastSeen: now,
		updatedAt: now
	}));
	return {
		id: DEEPSEEK_WALLET_ID,
		name: "DeepSeek 官方",
		kind: "official",
		sourceType: "deepseek",
		endpointId: DEEPSEEK_OFFICIAL_ENDPOINT_ID,
		endpointLabel: "DeepSeek 官方 API",
		endpointDisplay: "DeepSeek 官方 API",
		catalogProvider: "deepseek",
		balance: {
			mode: "manual",
			amount: null,
			currency: "CNY",
			primaryCredentialId: null,
			lastCalibrated: null
		},
		peakHours: (settings.peakHours?.length ? settings.peakHours : DEFAULT_PEAK_HOURS).map((item) => ({ ...item })),
		weekendOffpeak: true,
		credentials: [],
		models,
		collapsed: true,
		createdAt: now,
		updatedAt: now,
		lastUsedAt: null,
		legacyPricingImported: false
	};
}
function createWalletFromConnection(connection, settings, now = Date.now()) {
	if (!connection || !connection.endpointId) return null;
	if (isDeepSeekOfficialConnection(connection)) return createDeepSeekWallet(settings, now);
	const sourceType = cleanText(connection.sourceType) || null;
	const label = cleanText(connection.endpointLabel) || (sourceType ? `${sourceType} 接口` : "未命名接入");
	const id = walletIdForEndpoint(connection.endpointId);
	if (!id) return null;
	return {
		id,
		name: label,
		kind: "relay",
		sourceType,
		endpointId: connection.endpointId,
		endpointLabel: label,
		endpointDisplay: label,
		catalogProvider: defaultCatalogProvider(sourceType),
		balance: {
			mode: "manual",
			amount: null,
			currency: "CNY",
			primaryCredentialId: null,
			lastCalibrated: null
		},
		peakHours: (settings.peakHours?.length ? settings.peakHours : DEFAULT_PEAK_HOURS).map((item) => ({ ...item })),
		weekendOffpeak: false,
		credentials: [],
		models: [],
		collapsed: true,
		createdAt: now,
		updatedAt: now,
		lastUsedAt: null,
		legacyPricingImported: true
	};
}
function ensureDeepSeekWallet(wallets, settings, now = Date.now()) {
	const list = Array.isArray(wallets) ? wallets : [];
	if (!list.find((wallet) => wallet.id === "wallet:deepseek-official")) return [createDeepSeekWallet(settings, now), ...list];
	return list;
}
function normalizeWallets(raw, settings, now = Date.now()) {
	const list = Array.isArray(raw) ? raw.map((item) => normalizeWallet(item, settings, now)).filter(Boolean) : [];
	const map = /* @__PURE__ */ new Map();
	for (const wallet of list) map.set(wallet.id, wallet);
	return ensureDeepSeekWallet(Array.from(map.values()), settings, now);
}
function cloneWallet(wallet) {
	return {
		...wallet,
		balance: {
			...wallet.balance,
			query: normalizeBalanceQuery(wallet.balance.query),
			snapshot: wallet.balance.snapshot ? { ...wallet.balance.snapshot } : void 0
		},
		peakHours: wallet.peakHours.map((item) => ({ ...item })),
		credentials: wallet.credentials.map((item) => ({ ...item })),
		models: wallet.models.map((item) => ({
			...item,
			aliases: [...item.aliases],
			price: cloneWalletPriceRule(item.price)
		}))
	};
}
function observeCredential(wallet, credentialId, credentialLabel, now = Date.now()) {
	const id = cleanText(credentialId);
	if (!id) return false;
	const label = cleanText(credentialLabel) || "未命名密钥";
	const current = wallet.credentials.find((item) => item.id === id);
	if (!current) {
		wallet.credentials.push({
			id,
			label,
			lastSeen: now
		});
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
function normalizeModelKey(value) {
	const key = cleanText(value).replace(/^\[[^\]]+\]/, "").trim().toLowerCase();
	if (key === "deepseek-v4.1-flash") return "deepseek-flash";
	if (key === "deepseek-v4-flash-vision") return "deepseek-v4-flash-vision-exp";
	return key;
}
function walletModelMatches(model, requested) {
	const target = normalizeModelKey(requested);
	if (!target) return false;
	return [
		model.model,
		model.sourceModel,
		...model.aliases || []
	].some((candidate) => normalizeModelKey(candidate) === target);
}
function findWalletModel(wallet, model) {
	if (!wallet || !model) return null;
	for (const item of wallet.models || []) if (walletModelMatches(item, model)) return item;
	return null;
}
function observeModel(wallet, modelName, now = Date.now()) {
	const name = cleanText(modelName);
	if (!name) return {
		changed: false,
		model: null
	};
	const existing = findWalletModel(wallet, name);
	if (existing) {
		let changed = false;
		if (now > existing.lastSeen) {
			existing.lastSeen = now;
			changed = true;
		}
		return {
			changed,
			model: existing
		};
	}
	const created = {
		id: `model:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
		sourceModel: name,
		model: name,
		aliases: [],
		contextLimit: builtinContextLimit(name),
		contextLimitManual: false,
		price: emptyWalletPriceRule(),
		source: "discovered",
		locked: false,
		discoveredAt: now,
		lastSeen: now,
		updatedAt: now
	};
	wallet.models.push(created);
	return {
		changed: true,
		model: created
	};
}
function walletBalanceToCny(wallet, exchangeRate) {
	const amount = wallet.balance.amount == null || wallet.balance.amount === "" ? NaN : parseFloat(String(wallet.balance.amount));
	if (!Number.isFinite(amount)) return null;
	const rate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 1;
	return wallet.balance.currency === "USD" ? amount * rate : amount;
}
function walletPendingModelCount(wallet) {
	return (wallet.models || []).filter((model) => {
		if (wallet.id === "wallet:deepseek-official" && model.source === "builtin") return false;
		return model.price.priceConfigured !== true;
	}).length;
}
/** 仅用于旧数据回填：按完整模型名查找已启用计价的模型，不做别名或归一化匹配。 */
function findExactPricedModelMatch(wallets, model, ignoredWalletIds = []) {
	const requested = String(model || "");
	if (!requested) return null;
	const ignored = new Set(ignoredWalletIds);
	const candidates = [];
	for (const wallet of wallets || []) {
		if (ignored.has(wallet.id)) continue;
		for (const item of wallet.models || []) {
			if (!item.price.priceConfigured || item.model !== requested) continue;
			candidates.push({
				walletId: wallet.id,
				model: item.model,
				official: wallet.id === "wallet:deepseek-official" ? 1 : 0,
				updatedAt: item.updatedAt || 0
			});
		}
	}
	const official = (wallets || []).find((wallet) => wallet.id === DEEPSEEK_WALLET_ID);
	if (official && !ignored.has(official.id) && PRICING[requested]) candidates.push({
		walletId: official.id,
		model: requested,
		official: 1,
		updatedAt: Number.MAX_SAFE_INTEGER
	});
	candidates.sort((a, b) => b.official - a.official || b.updatedAt - a.updatedAt);
	if (!candidates.length) return null;
	return {
		walletId: candidates[0].walletId,
		model: candidates[0].model
	};
}
function mergeWalletCollections(local, remote) {
	const map = /* @__PURE__ */ new Map();
	for (const wallet of normalizeWallets(local, { peakHours: DEFAULT_PEAK_HOURS })) map.set(wallet.id, wallet);
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
					if (!existing || item.updatedAt > existing.updatedAt) modelMap.set(key, {
						...item,
						aliases: [...item.aliases]
					});
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
			if (!existing || item.updatedAt > existing.updatedAt) modelMap.set(key, {
				...item,
				aliases: [...item.aliases]
			});
		}
		current.models = Array.from(modelMap.values());
	}
	return Array.from(map.values());
}
//#endregion
//#region src/services/pricing.ts
var LEGACY_PEAK_PRICING_DATE = (/* @__PURE__ */ new Date("2026-08-17T00:00:00+08:00")).getTime();
function mergePrices(base, custom) {
	if (!custom) return base;
	return {
		hit: custom.hit !== void 0 && custom.hit !== "" ? parseFloat(custom.hit) : base.hit,
		miss: custom.miss !== void 0 && custom.miss !== "" ? parseFloat(custom.miss) : base.miss,
		output: custom.output !== void 0 && custom.output !== "" ? parseFloat(custom.output) : base.output
	};
}
function normalizeWalletTier(tier) {
	return {
		hit: Number.isFinite(Number(tier?.hit)) ? Number(tier?.hit) : 0,
		miss: Number.isFinite(Number(tier?.miss)) ? Number(tier?.miss) : 0,
		output: Number.isFinite(Number(tier?.output)) ? Number(tier?.output) : 0
	};
}
function walletPricing(rule) {
	return {
		usePeakPricing: rule.price.usePeakPricing !== false,
		offpeak: normalizeWalletTier(rule.price.offpeak),
		peak: normalizeWalletTier(rule.price.peak)
	};
}
var MODEL_ALIASES = {
	"deepseek-v4-flash-vision": "deepseek-v4-flash-vision-exp",
	"deepseek-v4.1-flash": "deepseek-flash"
};
function normalizeModel(model) {
	if (!model) return "deepseek-v4-flash";
	let m = String(model).trim().replace(/^\[[^\]]+\]/, "").trim();
	const low = m.toLowerCase();
	if (MODEL_ALIASES[low]) return MODEL_ALIASES[low];
	if (low === "deepseek-flash") return "deepseek-flash";
	if (low === "deepseek-v4-flash") return "deepseek-v4-flash";
	if (low === "deepseek-v4-pro") return "deepseek-v4-pro";
	if (low === "deepseek-v4-flash-vision-exp") return "deepseek-v4-flash-vision-exp";
	return m;
}
function matchCustom(cm, m, raw) {
	if (!cm || !cm.model) return false;
	if (raw && cm.model === raw) return true;
	if (cm.model === m) return true;
	return normalizeModel(cm.model) === m;
}
function getPricing(model, settings, wallet) {
	const raw = model || "deepseek-v4-flash";
	const m = normalizeModel(raw);
	const base = PRICING[m] || PRICING["deepseek-v4-flash"];
	const walletRule = wallet ? findWalletModel(wallet, raw) : null;
	if (walletRule) {
		if (walletRule.source === "builtin" && wallet?.id === "wallet:deepseek-official") {
			const seg = findSegment(m, Date.now());
			if (seg) return {
				usePeakPricing: seg.usePeakPricing !== false,
				offpeak: seg.offpeak,
				peak: seg.peak
			};
			return base;
		}
		if (walletRule.price.priceConfigured) return walletPricing(walletRule);
		if (wallet?.id === "wallet:deepseek-official" && PRICING[m]) {
			const seg = findSegment(m, Date.now());
			if (seg) return {
				usePeakPricing: seg.usePeakPricing !== false,
				offpeak: seg.offpeak,
				peak: seg.peak
			};
			return base;
		}
		return {
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
			pending: true
		};
	}
	if (wallet && wallet.id !== "wallet:deepseek-official") return {
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
		pending: true
	};
	for (const cm of settings.customModels || []) if (matchCustom(cm, m, raw)) return {
		usePeakPricing: cm.usePeakPricing !== false,
		offpeak: mergePrices(base.offpeak, cm.offpeak),
		peak: mergePrices(base.peak, cm.peak)
	};
	const seg = findSegment(m, Date.now());
	if (seg) return {
		usePeakPricing: seg.usePeakPricing !== false,
		offpeak: seg.offpeak,
		peak: seg.peak
	};
	return base;
}
function hasPriceForModel(model, settings, wallet) {
	const raw = model || "deepseek-v4-flash";
	const m = normalizeModel(raw);
	if (wallet) {
		const rule = findWalletModel(wallet, raw);
		if (rule) {
			if (rule.source === "builtin" && wallet.id === "wallet:deepseek-official") return !!PRICING[m];
			return rule.price.priceConfigured === true || wallet.id === "wallet:deepseek-official" && !!PRICING[m];
		}
		if (wallet.id === "wallet:deepseek-official") return !!PRICING[m];
		return false;
	}
	if (PRICING[m]) return true;
	for (const cm of settings.customModels || []) if (matchCustom(cm, m, raw)) return true;
	return false;
}
function isDeepSeekOfficialModel(m) {
	if (typeof m !== "string") return false;
	return normalizeModel(m).toLowerCase().indexOf("deepseek") === 0 || String(m).toLowerCase().includes("deepseek");
}
function isPeakHour(timestamp, settings) {
	const hours = settings && settings.peakHours || DEFAULT_PEAK_HOURS;
	return isPeakHour$1(timestamp, hours, settings?.extraOffDays);
}
function isWithinPeakHours(timestamp, peakHours) {
	const d = new Date(timestamp);
	const totalMinutes = d.getHours() * 60 + d.getMinutes();
	for (const h of peakHours || []) {
		if (!h || !h.start || !h.end) continue;
		const p = h.start.split(":");
		const q = h.end.split(":");
		const sp = parseInt(p[0]) * 60 + parseInt(p[1] || "0");
		const ep = parseInt(q[0]) * 60 + parseInt(q[1] || "0");
		if (sp < ep) {
			if (totalMinutes >= sp && totalMinutes < ep) return true;
		} else if (totalMinutes >= sp || totalMinutes < ep) return true;
	}
	return false;
}
function isOfficialPricingWallet(wallet) {
	return wallet.id === "wallet:deepseek-official" || wallet.kind === "official";
}
function isWalletPeakHour(timestamp, wallet, settings) {
	if (wallet.weekendOffpeak !== false && isWeekendDay(timestamp)) return false;
	if (isOfficialPricingWallet(wallet) && isChinaHoliday(timestamp)) return false;
	if (isExtraOffDay(timestamp, settings?.extraOffDays)) return false;
	return isWithinPeakHours(timestamp, wallet.peakHours?.length ? wallet.peakHours : DEFAULT_PEAK_HOURS);
}
function findSegment(normalizedModel, uTs) {
	const segs = PRICE_HISTORY[normalizedModel];
	if (!segs || !segs.length) return null;
	let hit = null;
	for (const s of segs) if (uTs >= s.since) hit = s;
	else break;
	return hit;
}
function peakHoursFor(seg, settings) {
	if (seg?.peakHours?.length) return seg.peakHours;
	return settings && settings.peakHours || DEFAULT_PEAK_HOURS;
}
function hasCustomForModel(model, settings) {
	const raw = model || "deepseek-v4-flash";
	const m = normalizeModel(raw);
	for (const cm of settings.customModels || []) if (matchCustom(cm, m, raw)) return true;
	return false;
}
function effectivePricingFor(model, uTs, settings, base) {
	const m = normalizeModel(model || "deepseek-v4-flash");
	if (hasCustomForModel(model, settings)) return base;
	const seg = findSegment(m, uTs);
	if (seg) return {
		usePeakPricing: seg.usePeakPricing !== false,
		offpeak: seg.offpeak,
		peak: seg.peak
	};
	return base;
}
function calcCost(u, settings, wallet) {
	const model = u.model || "deepseek-v4-flash";
	const walletRule = wallet ? findWalletModel(wallet, model) : null;
	const useWalletRule = !!walletRule && walletRule.price.priceConfigured && walletRule.source !== "builtin";
	if (!wallet && !hasPriceForModel(model, settings)) return {
		input: 0,
		output: 0,
		total: 0,
		priceType: "old",
		source: "legacy-unassigned"
	};
	if (wallet && !hasPriceForModel(model, settings, wallet)) return {
		input: 0,
		output: 0,
		total: 0,
		priceType: "unpriced",
		source: "unpriced"
	};
	if (useWalletRule && wallet) {
		const pricing = walletPricing(walletRule);
		const usePeak = pricing.usePeakPricing !== false && isWalletPeakHour(u.timestamp, wallet, settings);
		const p = usePeak ? pricing.peak : pricing.offpeak;
		const ih = u.prompt_cache_hit_tokens / 1e6 * p.hit;
		const im = u.prompt_cache_miss_tokens / 1e6 * p.miss;
		const o = u.completion_tokens / 1e6 * p.output;
		return {
			input: ih + im,
			output: o,
			total: ih + im + o,
			priceType: usePeak ? "wallet-peak" : "wallet-offpeak",
			source: "wallet"
		};
	}
	const basePricing = getPricing(model, settings, wallet);
	const pricing = effectivePricingFor(model, u.timestamp, settings, basePricing);
	const hours = peakHoursFor(hasCustomForModel(model, settings) ? null : findSegment(normalizeModel(model), u.timestamp), settings);
	const useNewPricing = u.timestamp >= LEGACY_PEAK_PRICING_DATE;
	let p;
	let priceType;
	if (useNewPricing && pricing.usePeakPricing !== false && isDeepSeekOfficialModel(model)) {
		const isPeak = isPeakHour$1(u.timestamp, hours, settings?.extraOffDays);
		p = isPeak ? pricing.peak : pricing.offpeak;
		priceType = isPeak ? "new-peak" : "new-offpeak";
	} else {
		p = pricing.offpeak;
		priceType = useNewPricing ? "new-offpeak" : "old";
	}
	const ih = u.prompt_cache_hit_tokens / 1e6 * p.hit;
	const im = u.prompt_cache_miss_tokens / 1e6 * p.miss;
	const o = u.completion_tokens / 1e6 * p.output;
	return {
		input: ih + im,
		output: o,
		total: ih + im + o,
		priceType,
		source: wallet ? wallet.id === "wallet:deepseek-official" ? "builtin" : "unpriced" : hasCustomForModel(model, settings) ? "legacy" : "legacy-unassigned"
	};
}
function calcSavings(u, settings, wallet) {
	const model = u.model || "deepseek-v4-flash";
	const walletRule = wallet ? findWalletModel(wallet, model) : null;
	const useWalletRule = !!walletRule && walletRule.price.priceConfigured && walletRule.source !== "builtin";
	if (!hasPriceForModel(model, settings, wallet)) return 0;
	if (useWalletRule && wallet) {
		const pricing = walletPricing(walletRule);
		const p = pricing.usePeakPricing !== false && isWalletPeakHour(u.timestamp, wallet, settings) ? pricing.peak : pricing.offpeak;
		return (u.prompt_cache_hit_tokens || 0) / 1e6 * (p.miss - p.hit);
	}
	const basePricing = getPricing(model, settings, wallet);
	const pricing = effectivePricingFor(model, u.timestamp, settings, basePricing);
	const hours = peakHoursFor(hasCustomForModel(model, settings) ? null : findSegment(normalizeModel(model), u.timestamp), settings);
	const useNewPricing = u.timestamp >= LEGACY_PEAK_PRICING_DATE;
	let p;
	if (useNewPricing && pricing.usePeakPricing !== false && isDeepSeekOfficialModel(model)) p = isPeakHour$1(u.timestamp, hours, settings?.extraOffDays) ? pricing.peak : pricing.offpeak;
	else p = pricing.offpeak;
	return (u.prompt_cache_hit_tokens || 0) / 1e6 * (p.miss - p.hit);
}
//#endregion
//#region src/data/reported-cost.ts
function extractReportedCost(usage, wallet) {
	if (!wallet || wallet.responseCost === "off") return null;
	if ((!wallet.responseCost || wallet.responseCost === "auto") && usage?.cost_currency != null && !["CNY", "USD"].includes(usage.cost_currency)) return null;
	const currency = wallet.responseCost === "CNY" || wallet.responseCost === "USD" ? wallet.responseCost : usage?.cost_currency === "USD" || usage?.cost_currency === "CNY" ? usage.cost_currency : detectBalanceProvider(wallet) === "openrouter" ? "USD" : null;
	const amount = moneyNumber(usage?.cost);
	return currency && amount !== null && amount >= 0 ? {
		amount,
		currency
	} : null;
}
function reportedCostInCny(reported, rate) {
	const amount = moneyNumber(reported?.amount);
	if (amount === null || amount < 0 || !["USD", "CNY"].includes(reported?.currency)) return null;
	if (reported.currency === "USD" && (!Number.isFinite(rate) || rate <= 0)) return null;
	const cny = reported.currency === "USD" ? amount * rate : amount;
	return Number.isFinite(cny) ? cny : null;
}
//#endregion
//#region src/data/events.ts
var map = /* @__PURE__ */ new Map();
var DataEvents = {
	UPDATED: "data:updated",
	HISTORY_ADDED: "data:history:added",
	SETTINGS_CHANGED: "data:settings:changed",
	BALANCE_CHANGED: "data:balance:changed"
};
function on(event, fn) {
	if (!map.has(event)) map.set(event, /* @__PURE__ */ new Set());
	map.get(event).add(fn);
	return () => off(event, fn);
}
function off(event, fn) {
	map.get(event)?.delete(fn);
}
function emit(event, payload) {
	map.get(event)?.forEach((fn) => {
		try {
			fn(payload);
		} catch {}
	});
}
//#endregion
//#region src/utils/finish.ts
var NORMAL_FINISH = /* @__PURE__ */ new Set([
	"stop",
	"eos",
	"end_turn",
	"stop_sequence",
	"tool_calls",
	"function_call",
	"tool_use"
]);
function isTruncatedFinish(fr) {
	if (!fr) return false;
	return !NORMAL_FINISH.has(String(fr).toLowerCase());
}
//#endregion
//#region src/data/fingerprint.ts
function usageFingerprint(model, total, hit, miss, completion, connection, requestId) {
	return [
		requestId || "",
		model,
		total,
		hit,
		miss,
		completion,
		connection?.endpointId || "",
		connection?.credentialId || ""
	].join("|");
}
/**
* 清洗历史遗留的速率：非有限值或超过上限一律归 0。
* 用于 hydrate 迁移与导入数据清洗。
*/
function sanitizeRate(rate) {
	const value = typeof rate === "number" ? rate : parseFloat(String(rate));
	if (!Number.isFinite(value) || value < 0) return 0;
	if (value > 1e3) return 0;
	return Math.round(value);
}
/**
* 计算输出速率（t/s）。
* @param duration 整轮耗时（ms）
* @param ttft 首字延迟（ms）
* @param completionTokens 输出 Token 数
* @param streamed 是否为真实流式；false 表示非流式/假流式，速率不可测
*/
function computeTokenRate(opts) {
	const { duration, ttft, completionTokens, streamed } = opts;
	if (streamed === false) return 0;
	const dur = Number.isFinite(duration) ? duration : 0;
	const first = Number.isFinite(ttft) ? ttft : 0;
	const comp = Number.isFinite(completionTokens) ? completionTokens : 0;
	if (dur <= 0 || comp <= 0) return 0;
	if (first <= 0) return 0;
	const window = dur - first;
	if (window < 200) return 0;
	return sanitizeRate(comp / window * 1e3);
}
/**
* 迁移清洗：把一次性返回造成的异常速率与失真 TTFT 归零。
* @returns 是否有条目被修改
*/
function sanitizeHistoryTiming(entry) {
	if (!entry || typeof entry !== "object") return false;
	let changed = false;
	const rate = entry.tokenRate;
	if (typeof rate === "number" && Number.isFinite(rate) && (rate > 1e3 || rate < 0)) {
		entry.tokenRate = 0;
		changed = true;
	}
	const dur = typeof entry.duration === "number" ? entry.duration : 0;
	const first = typeof entry.ttft === "number" ? entry.ttft : 0;
	if (dur > 0 && first > 0 && first >= dur * .98) {
		entry.ttft = 0;
		entry.tokenRate = 0;
		changed = true;
	}
	return changed;
}
//#endregion
//#region src/utils/crypto.ts
var XOR_KEY = "ds-stats-v1-xor-key!@#$%^&*";
function encryptKey(plaintext) {
	if (!plaintext) return "";
	try {
		const utf8 = unescape(encodeURIComponent(plaintext));
		let result = "";
		for (let i = 0; i < utf8.length; i++) result += String.fromCharCode(utf8.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % 27));
		return btoa(result);
	} catch {
		let result = "";
		for (let i = 0; i < plaintext.length; i++) result += String.fromCharCode(plaintext.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % 27));
		try {
			return btoa(result);
		} catch {
			return "";
		}
	}
}
function decryptKey(ciphertext) {
	if (!ciphertext) return "";
	try {
		const decoded = atob(ciphertext);
		let result = "";
		for (let i = 0; i < decoded.length; i++) result += String.fromCharCode(decoded.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % 27));
		try {
			return decodeURIComponent(escape(result));
		} catch {
			return result;
		}
	} catch {
		return ciphertext;
	}
}
//#endregion
//#region src/services/wallet-secrets.ts
var SECRETS_KEY = "walletSecrets";
var TARGETS_KEY = "walletSecretTargets";
var LEGACY_DEEPSEEK_URL = "https://api.deepseek.com/user/balance";
function readMap() {
	try {
		const value = (getExtensionSettings() || {})[SECRETS_KEY];
		return value && typeof value === "object" ? { ...value } : {};
	} catch {
		return {};
	}
}
function getWalletApiKey(walletId, targetUrl) {
	if (!walletId) return "";
	try {
		if (targetUrl) {
			const bound = getExtensionSettings()?.[TARGETS_KEY]?.[walletId];
			if (bound ? bound !== targetUrl : walletId !== "wallet:deepseek-official" || targetUrl !== LEGACY_DEEPSEEK_URL) return "";
		}
		const encrypted = readMap()[walletId];
		return encrypted ? decryptKey(encrypted) : "";
	} catch {
		return "";
	}
}
function saveWalletApiKey(walletId, key, targetUrl) {
	if (!walletId) return;
	const settings = getExtensionSettings() || {};
	const map = readMap();
	const targets = { ...settings[TARGETS_KEY] || {} };
	const value = String(key || "").trim();
	if (value) {
		map[walletId] = encryptKey(value);
		const target = targetUrl || (walletId === "wallet:deepseek-official" ? LEGACY_DEEPSEEK_URL : "");
		if (target) targets[walletId] = target;
		else delete targets[walletId];
	} else {
		delete map[walletId];
		delete targets[walletId];
	}
	saveExtensionSettings({
		...settings,
		[SECRETS_KEY]: map,
		[TARGETS_KEY]: targets,
		_updated: Date.now()
	});
}
function migrateLegacyWalletApiKey(walletId = DEEPSEEK_WALLET_ID) {
	if (!walletId || getWalletApiKey(walletId)) return;
	try {
		const encrypted = (getExtensionSettings() || {}).apiKey;
		if (!encrypted) return;
		const plain = decryptKey(encrypted);
		if (plain) {
			saveWalletApiKey(walletId, plain);
			const latest = getExtensionSettings() || {};
			delete latest.apiKey;
			saveExtensionSettings({
				...latest,
				_updated: Date.now()
			});
		}
	} catch {}
}
//#endregion
//#region src/data/repository.ts
/**
* 统一仓库 — 单一历史的唯一 储存/调用/修改 入口
* 已废弃多存档，所有数据归一至 state.history + 聚合字段
*/
var repository_exports = /* @__PURE__ */ __exportAll({ repository: () => repository });
function getCurrentChatId() {
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
function getCurrentChatName() {
	const id = getCurrentChatId();
	return id ? String(id) : null;
}
var recentUsageFingerprints = /* @__PURE__ */ new Map();
var storageFailureNotified = false;
function notifyStorageFailure(error) {
	log.error("冷历史写入失败", error);
	if (storageFailureNotified) return;
	storageFailureNotified = true;
	toast("warning", "冷历史写入失败，统计可能不完整；请检查浏览器存储空间");
}
function numericPrice(value, fallback) {
	const n = typeof value === "number" ? value : parseFloat(String(value));
	return Number.isFinite(n) ? n : fallback;
}
function legacyCustomPriceRule(custom) {
	const normalized = normalizeModel(String(custom?.model || ""));
	const base = PRICING[normalized] || PRICING["deepseek-flash"];
	return normalizeWalletPriceRule({
		usePeakPricing: custom?.usePeakPricing !== false,
		offpeak: {
			hit: numericPrice(custom?.offpeak?.hit, base.offpeak.hit),
			miss: numericPrice(custom?.offpeak?.miss, base.offpeak.miss),
			output: numericPrice(custom?.offpeak?.output, base.offpeak.output)
		},
		peak: {
			hit: numericPrice(custom?.peak?.hit, base.peak.hit),
			miss: numericPrice(custom?.peak?.miss, base.peak.miss),
			output: numericPrice(custom?.peak?.output, base.peak.output)
		},
		priceConfigured: true
	});
}
function migrateLegacyPricing(wallet, customModels) {
	if (wallet.legacyPricingImported) return false;
	const now = Date.now();
	for (const custom of customModels || []) {
		const sourceModel = String(custom?.model || "").trim();
		if (!sourceModel) continue;
		const existing = findWalletModel(wallet, sourceModel);
		const source = custom?.synced === true ? "sync" : "manual";
		if (existing) {
			existing.price = legacyCustomPriceRule(custom);
			existing.source = source;
			existing.locked = false;
			existing.updatedAt = now;
		} else wallet.models.push({
			id: `legacy:${sourceModel}`,
			sourceModel,
			model: sourceModel,
			aliases: [],
			price: legacyCustomPriceRule(custom),
			source,
			locked: false,
			discoveredAt: now,
			lastSeen: now,
			updatedAt: now
		});
	}
	wallet.legacyPricingImported = true;
	wallet.updatedAt = now;
	return true;
}
function migrateLegacyBalance(wallet) {
	if (wallet.balance.amount != null && String(wallet.balance.amount).trim() !== "") return false;
	const custom = state.customBalance != null && String(state.customBalance).trim() !== "" ? String(state.customBalance) : state.balance?.balance != null ? String(state.balance.balance) : "";
	if (!custom) return false;
	wallet.balance.amount = custom;
	wallet.balance.currency = String(state.balance?.currency || "").toUpperCase() === "USD" ? "USD" : "CNY";
	wallet.balance.mode = "manual";
	wallet.balance.lastCalibrated = Number(state.balance?.timestamp) || null;
	wallet.updatedAt = Date.now();
	return true;
}
function historyConnection(entry) {
	if (!entry || !entry.endpointId && !entry.sourceType) return null;
	return normalizeConnectionEndpoint({
		sourceType: entry.sourceType ?? null,
		endpointId: entry.endpointId ?? null,
		endpointLabel: entry.endpointLabel ?? null,
		credentialId: entry.credentialId ?? null,
		credentialLabel: entry.credentialLabel ?? null
	});
}
function ensureWalletForConnection(wallets, ignored, connection, now = Date.now()) {
	if (!connection || !connection.endpointId) return {
		wallet: null,
		changed: false
	};
	let wallet = findWalletForConnection(wallets, connection);
	let changed = false;
	if (!wallet) {
		const id = isDeepSeekOfficialConnection(connection) ? DEEPSEEK_WALLET_ID : walletIdForEndpoint(connection.endpointId);
		if (!id || ignored.has(id)) return {
			wallet: null,
			changed: false
		};
		const created = isDeepSeekOfficialConnection(connection) ? createDeepSeekWallet(state.settings, now) : createWalletFromConnection(connection, state.settings, now);
		if (!created) return {
			wallet: null,
			changed: false
		};
		wallets.push(created);
		wallet = created;
		changed = true;
	}
	if (connection.endpointId && wallet.endpointId !== connection.endpointId && wallet.id !== "wallet:deepseek-official") {
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
	return {
		wallet,
		changed
	};
}
function refreshBuiltinWalletModels(wallet, now = Date.now()) {
	if (wallet.id !== "wallet:deepseek-official") return false;
	let changed = false;
	const defaults = createDeepSeekWallet(state.settings, wallet.createdAt || now);
	for (const builtin of defaults.models) {
		const existing = wallet.models.find((item) => item.sourceModel === builtin.sourceModel);
		if (!existing) {
			wallet.models.push(builtin);
			changed = true;
			continue;
		}
		if (existing.source !== "builtin" || existing.locked) continue;
		if (JSON.stringify(existing.price) !== JSON.stringify(builtin.price)) {
			existing.price = builtin.price;
			existing.updatedAt = now;
			changed = true;
		}
	}
	return changed;
}
function migrateHistoryModels(entries) {
	let changed = false;
	for (const entry of entries || []) {
		if (!entry || typeof entry.model !== "string") continue;
		const normalized = normalizeModel(entry.model);
		if (normalized === entry.model) continue;
		if (entry.rawModel == null) entry.rawModel = entry.model;
		entry.model = normalized;
		changed = true;
	}
	return changed;
}
function mergeWalletConfiguration(duplicate, target, now = Date.now()) {
	let changed = false;
	if ((target.balance.amount == null || String(target.balance.amount).trim() === "") && duplicate.balance.amount != null && String(duplicate.balance.amount).trim() !== "") {
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
	for (const credential of duplicate.credentials || []) if (observeCredential(target, credential.id, credential.label, credential.lastSeen || now)) changed = true;
	for (const model of duplicate.models || []) {
		if (!model.price?.priceConfigured || model.source !== "manual" && model.source !== "sync") continue;
		const existing = findWalletModel(target, model.sourceModel) || findWalletModel(target, model.model);
		if (!existing) {
			target.models.push({
				...model,
				id: `legacy-official:${model.id}`,
				aliases: [...model.aliases || []],
				price: cloneWalletPriceRule(model.price)
			});
			changed = true;
			continue;
		}
		if (existing.source !== "manual" || model.source === "manual") {
			existing.price = cloneWalletPriceRule(model.price);
			existing.source = model.source;
			existing.locked = model.locked === true;
			existing.aliases = Array.from(/* @__PURE__ */ new Set([...existing.aliases || [], ...model.aliases || []]));
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
function migrateWalletEndpoints(ignored, now = Date.now()) {
	const byEndpoint = /* @__PURE__ */ new Map();
	const next = [];
	const duplicateIds = /* @__PURE__ */ new Set();
	let changed = false;
	for (const wallet of state.wallets) {
		if (wallet.id === "wallet:deepseek-official") {
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
			credentialLabel: null
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
function migrateWallets(hot, cold = []) {
	const now = Date.now();
	const normalized = normalizeWallets(state.wallets, state.settings, now);
	let changed = normalized !== state.wallets;
	state.wallets = normalized;
	state.walletIgnored = Array.isArray(state.walletIgnored) ? Array.from(new Set(state.walletIgnored.map((id) => String(id || "").trim()).filter(Boolean))) : [];
	const ignored = new Set(state.walletIgnored);
	const official = state.wallets.find((wallet) => wallet.id === "wallet:deepseek-official") || createDeepSeekWallet(state.settings, now);
	if (!state.wallets.some((wallet) => wallet.id === official.id)) state.wallets.unshift(official);
	changed = migrateLegacyPricing(official, state.settings.customModels || []) || changed;
	changed = migrateLegacyBalance(official) || changed;
	changed = refreshBuiltinWalletModels(official, now) || changed;
	migrateLegacyWalletApiKey(official.id);
	changed = migrateWalletEndpoints(ignored, now) || changed;
	const allHistory = [...cold || [], ...state.history || []];
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
		if (shouldTrackWalletModel(observed.wallet, String(entry.model || ""))) {
			const model = observeModel(observed.wallet, String(entry.model || ""), Number(entry.timestamp) || now);
			if (model.model && model.model.price.priceConfigured !== true) {
				const legacy = (state.settings.customModels || []).find((custom) => {
					try {
						return normalizeModel(String(custom?.model || "")) === normalizeModel(String(entry.model || "")) || String(custom?.model || "") === String(entry.model || "");
					} catch {
						return false;
					}
				});
				if (legacy) {
					model.model.price = legacyCustomPriceRule(legacy);
					model.model.source = legacy.synced === true ? "sync" : "manual";
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
	if (!(Number(hot?._walletPricingBackfillVersion || 0) >= WALLET_PRICING_BACKFILL_VERSION)) {
		changed = backfillLegacyExactPricing(allHistory) || changed;
		if (hot && typeof hot === "object") hot._walletPricingBackfillVersion = WALLET_PRICING_BACKFILL_VERSION;
		changed = true;
	}
	if (hot && Array.isArray(hot.wallets) && state.wallets.length === 0) {
		state.wallets = normalizeWallets(hot.wallets, state.settings, now);
		changed = true;
	}
	return changed;
}
var WALLET_PRICING_BACKFILL_VERSION = 1;
/**
* Agent 模式条目的重算：一次 Run 可能跨多个钱包、多个时段，
* 因此按 raw_usage.agent.walletBreakdown 逐项计价后求和。
* 返回 null 表示不是 Agent 条目（或缺少分项），调用方继续走原有单钱包逻辑。
*/
function recalcAgentRunCost(entry) {
	if (!entry || entry.origin !== "agent") return null;
	const shares = entry?.raw_usage?.agent?.walletBreakdown;
	if (!Array.isArray(shares) || !shares.length) return null;
	let input = 0;
	let output = 0;
	let priceType = "";
	let source = "unpriced";
	for (const share of shares) {
		const shareWallet = share?.walletId ? (state.wallets || []).find((item) => item.id === share.walletId) || null : null;
		const c = calcCost({
			timestamp: Number(share?.timestamp) || entry.timestamp,
			model: typeof share?.model === "string" && share.model ? share.model : entry.model,
			prompt_cache_hit_tokens: Number(share?.hit) || 0,
			prompt_cache_miss_tokens: Number(share?.miss) || 0,
			completion_tokens: Number(share?.comp) || 0
		}, state.settings, shareWallet);
		input += c.input;
		output += c.output;
		if (shares.length === 1) {
			priceType = c.priceType;
			source = c.source;
		}
	}
	return {
		input,
		output,
		total: input + output,
		priceType: priceType || entry.priceType || "old",
		source
	};
}
function recalcEntryCost(entry, wallet) {
	const reported = reportedCostInCny(entry.reportedCost, entry.reportedCost?.exchangeRate || getWalletExchangeRate());
	if (reported !== null) return {
		input: 0,
		output: 0,
		total: reported,
		priceType: "api",
		source: "api"
	};
	const agentCost = recalcAgentRunCost(entry);
	if (agentCost) return agentCost;
	const legacyWallet = entry?.legacyPricingWalletId ? state.wallets.find((item) => item.id === entry.legacyPricingWalletId) || null : null;
	return calcCost({
		timestamp: entry.timestamp,
		model: entry.model,
		prompt_cache_hit_tokens: entry.cache_hit_tokens || 0,
		prompt_cache_miss_tokens: entry.cache_miss_tokens || 0,
		completion_tokens: entry.completion_tokens || 0
	}, state.settings, legacyWallet || wallet);
}
/** 钱包余额增减（sign=-1 为回滚）；只调整已填写余额的钱包，与 addEntry 的预扣口径一致 */
function adjustWalletBalance(walletId, cost, sign) {
	if (!walletId) return;
	const amount = Number(cost);
	if (!Number.isFinite(amount) || amount === 0) return;
	const wallet = (state.wallets || []).find((item) => item.id === walletId);
	if (!wallet) return;
	const current = wallet.balance.amount == null || wallet.balance.amount === "" ? NaN : parseFloat(String(wallet.balance.amount));
	if (!Number.isFinite(current)) return;
	const delta = wallet.balance.currency === "USD" ? amount / getWalletExchangeRate() : amount;
	wallet.balance.amount = (current - sign * delta).toFixed(4);
	wallet.updatedAt = Date.now();
}
/** 回滚一条 Agent 历史对聚合、轮次与钱包余额的贡献（用于同 Run 重采 upsert） */
function rollbackAgentRunEntry(entry) {
	if (!entry) return;
	state.total_tokens -= Number(entry.total_tokens) || 0;
	state.total_cost -= Number(entry.cost) || 0;
	state.input_tokens -= Number(entry.prompt_tokens) || 0;
	state.output_tokens -= Number(entry.completion_tokens) || 0;
	state.cache_hit_tokens -= Number(entry.cache_hit_tokens) || 0;
	state.cache_miss_tokens -= Number(entry.cache_miss_tokens) || 0;
	state.input_cost -= Number(entry.input_cost) || 0;
	state.output_cost -= Number(entry.output_cost) || 0;
	const shares = entry?.raw_usage?.agent?.walletBreakdown;
	if (Array.isArray(shares) && shares.length) for (const share of shares) adjustWalletBalance(share?.walletId ?? null, Number(share?.cost) || 0, -1);
	else adjustWalletBalance(entry.walletId ?? null, Number(entry.cost) || 0, -1);
	if (isDeepSeekOfficialModel(entry.model) && state.rounds > 0) state.rounds -= 1;
}
function applyCostPatch(entry, cost) {
	entry.input_cost = cost.input;
	entry.output_cost = cost.output;
	entry.cost = cost.total;
	entry.priceType = cost.priceType;
	entry.pricingSource = cost.source === "api" ? "api" : entry.legacyPricingWalletId ? "legacy-match" : cost.source;
}
function applyTotalDelta(previous, next) {
	state.input_cost += (next.input || 0) - (previous.input || 0);
	state.output_cost += (next.output || 0) - (previous.output || 0);
	state.total_cost += (next.total || 0) - (previous.total || 0);
}
function aggregateHistory(entries) {
	const result = {
		total_tokens: 0,
		total_cost: 0,
		input_tokens: 0,
		output_tokens: 0,
		cache_hit_tokens: 0,
		cache_miss_tokens: 0,
		input_cost: 0,
		output_cost: 0,
		rounds: 0
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
function applyAggregate(next) {
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
async function rebuildAggregates() {
	const cold = await loadHistoryCold();
	const merged = [...state.history || [], ...cold].sort((a, b) => b.timestamp - a.timestamp);
	const keyOf = historyRecordKey;
	const seen = /* @__PURE__ */ new Set();
	const unique = [];
	for (const entry of merged) {
		const key = keyOf(entry);
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push(entry);
	}
	applyAggregate(aggregateHistory(unique));
}
function shouldTrackWalletModel(wallet, model) {
	if (wallet.id !== "wallet:deepseek-official") return true;
	try {
		return !PRICING[normalizeModel(model)];
	} catch {
		return true;
	}
}
function backfillLegacyExactPricing(allHistory) {
	let changed = false;
	const ignored = new Set(state.walletIgnored || []);
	for (const entry of allHistory || []) {
		if (!entry || entry.legacyPricingWalletId) continue;
		const sourceWallet = findWalletForHistory(state.wallets, entry);
		if (!sourceWallet) continue;
		if (calcCost({
			timestamp: entry.timestamp,
			model: entry.model,
			prompt_cache_hit_tokens: entry.cache_hit_tokens || 0,
			prompt_cache_miss_tokens: entry.cache_miss_tokens || 0,
			completion_tokens: entry.completion_tokens || 0
		}, state.settings, sourceWallet).source !== "unpriced") continue;
		const match = findExactPricedModelMatch(state.wallets, String(entry.model || ""), ignored);
		if (!match || match.walletId === sourceWallet.id) continue;
		entry.legacyPricingWalletId = match.walletId;
		entry.legacyPricingModel = match.model;
		const previous = {
			input: Number(entry.input_cost) || 0,
			output: Number(entry.output_cost) || 0,
			total: Number(entry.cost) || 0
		};
		const cost = recalcEntryCost(entry, state.wallets.find((wallet) => wallet.id === match.walletId) || null);
		applyCostPatch(entry, cost);
		applyTotalDelta(previous, cost);
		changed = true;
	}
	return changed;
}
function normalizeSettings(incoming) {
	const def = defaultSettings();
	const src = incoming && typeof incoming === "object" ? incoming : {};
	const merged = { ...def };
	for (const k of Object.keys(def)) if (src[k] !== void 0) merged[k] = src[k];
	merged.webdav = {
		...def.webdav,
		...src.webdav || {}
	};
	merged.pricingSync = {
		...def.pricingSync,
		...src.pricingSync || {}
	};
	if (!isFinite(parseFloat(String(merged.pricingSync.exchangeRate))) || parseFloat(String(merged.pricingSync.exchangeRate)) <= 0) merged.pricingSync.exchangeRate = 7.2;
	if (typeof merged.pricingSync.showSyncedModels !== "boolean") merged.pricingSync.showSyncedModels = false;
	if (!isFinite(parseFloat(String(merged.pricingSync.syncedMarkVersion)))) merged.pricingSync.syncedMarkVersion = 0;
	if (!Array.isArray(merged.peakHours) || !merged.peakHours.length) merged.peakHours = def.peakHours;
	merged.extraOffDays = Array.isArray(merged.extraOffDays) ? Array.from(new Set(merged.extraOffDays.filter((day) => isValidDayKey(day)))).sort() : def.extraOffDays;
	if (!Array.isArray(merged.customModels)) merged.customModels = def.customModels;
	if (!merged.historyScope) merged.historyScope = def.historyScope;
	if (!merged.theme) merged.theme = def.theme;
	if (typeof merged.modelsPricingCollapsed !== "boolean") merged.modelsPricingCollapsed = true;
	if (!Array.isArray(merged.overviewFour) || merged.overviewFour.length !== 8 && merged.overviewFour.length !== 4) merged.overviewFour = def.overviewFour;
	if (Array.isArray(merged.overviewFour) && merged.overviewFour.length === 4) merged.overviewFour = [...merged.overviewFour, ...def.overviewFour.slice(4)];
	try {
		const valid = /* @__PURE__ */ new Set([
			"avg_cost",
			"avg_tokens",
			"avg_duration",
			"avg_rate",
			"avg_ttft",
			"avg_input_cost",
			"avg_input_tokens",
			"avg_output_cost",
			"avg_output_tokens",
			"avg_think_time",
			"avg_think_tokens",
			"avg_hit_rate",
			"latest_hit_rate",
			"max_output",
			"max_input",
			"max_total",
			"avg_think_ratio",
			"truncation_rate"
		]);
		if (Array.isArray(merged.overviewFour)) merged.overviewFour = merged.overviewFour.map((k) => valid.has(k) ? k : "avg_cost");
		if (merged.overviewFour.length !== 8) merged.overviewFour = def.overviewFour;
		if (!Array.isArray(merged.statsFour) || merged.statsFour.length !== 4) merged.statsFour = def.statsFour;
		const validStats = /* @__PURE__ */ new Set([
			"avg_cost",
			"avg_tokens",
			"avg_duration",
			"avg_rate",
			"avg_ttft",
			"avg_input_cost",
			"avg_input_tokens",
			"avg_output_cost",
			"avg_output_tokens",
			"avg_think_time",
			"avg_think_tokens",
			"avg_think_ratio",
			"truncation_rate",
			"avg_hit_rate",
			"latest_hit_rate",
			"max_output",
			"max_input",
			"max_total"
		]);
		if (Array.isArray(merged.statsFour)) merged.statsFour = merged.statsFour.map((k) => validStats.has(k) ? k : "avg_cost");
		if (merged.statsFour.length !== 4) merged.statsFour = def.statsFour;
	} catch {}
	return merged;
}
function sanitizeFullRequest(fr) {
	if (!fr || typeof fr !== "object") return fr;
	const keep = {};
	for (const k of [
		"model",
		"stream",
		"temperature",
		"max_tokens",
		"top_p",
		"stream_options",
		"chat_completion_source",
		"endpoint"
	]) if (fr[k] !== void 0) keep[k] = fr[k];
	if (Array.isArray(fr.messages)) keep.messages_length = fr.messages.length;
	else if (typeof fr.messages_length === "number") keep.messages_length = fr.messages_length;
	else if (typeof fr.messages === "number") keep.messages_length = fr.messages;
	return keep;
}
function clampMessage(m) {
	if (!m || typeof m !== "object") return m;
	const c = typeof m.content === "string" ? m.content.length > 600 ? m.content.slice(0, 600) + "…[截断]" : m.content : m.content;
	return {
		...m,
		content: c
	};
}
var RESPONSE_KEEP = 2e5;
function clampResponse(resp) {
	if (resp == null) return null;
	if (typeof resp === "string") return resp.length > RESPONSE_KEEP ? resp.slice(0, RESPONSE_KEEP) + "\n…[响应过长已截断]" : resp;
	try {
		const s = JSON.stringify(resp);
		if (s.length > RESPONSE_KEEP) return s.slice(0, RESPONSE_KEEP) + "\n…[响应过长已截断]";
	} catch {}
	return resp;
}
function pruneDetails() {
	if (!state.history || !state.history.length) return;
	const hs = [...state.history].sort((a, b) => b.timestamp - a.timestamp);
	for (let i = 0; i < hs.length; i++) {
		const e = hs[i];
		if (i >= 5) {
			delete e.messages;
			delete e.fullRequest;
			delete e.fullResponse;
		} else if (e.fullRequest && typeof e.fullRequest === "object" && Array.isArray(e.fullRequest.messages)) e.fullRequest = sanitizeFullRequest(e.fullRequest);
	}
}
function persist() {
	pruneDetails();
	let safeLastUsage = state.lastUsage;
	if (safeLastUsage) try {
		const c = { ...safeLastUsage };
		delete c.messages;
		delete c.fullRequest;
		delete c.fullResponse;
		safeLastUsage = c;
	} catch {}
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
		lastUsage: safeLastUsage
	});
	emit(DataEvents.UPDATED);
}
var repository = {
	snapshot() {
		return {
			saves: {},
			currentSave: null,
			settings: state.settings,
			balance: state.balance,
			customBalance: state.customBalance,
			wallets: state.wallets,
			walletIgnored: state.walletIgnored,
			messageCount: state.messageCount,
			lastUsage: state.lastUsage,
			history: state.history,
			total_tokens: state.total_tokens,
			total_cost: state.total_cost
		};
	},
	getAggregated() {
		return getSelectedSave();
	},
	getHistoryByRange(range) {
		const s = getSelectedSave();
		if (!s?.history) return [];
		const toDay = (ts) => {
			const d = new Date(ts);
			const pad = (n) => String(n).padStart(2, "0");
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		};
		return s.history.filter((h) => {
			const k = toDay(h.timestamp);
			return k >= range.start && k <= range.end;
		});
	},
	async getColdHistory() {
		return loadHistoryCold();
	},
	async getAllHistory() {
		return getAllHistory();
	},
	async deleteHistoryByFilter(filter = {}) {
		const start = filter.start && isValidDayKey(filter.start) ? filter.start : "";
		const end = filter.end && isValidDayKey(filter.end) ? filter.end : "";
		const model = String(filter.model || "").trim();
		const chat = String(filter.chat || "").trim();
		const all = await getAllHistory();
		const remains = (all || []).filter((entry) => {
			if (!entry) return false;
			if (start || end) {
				const day = localDay(entry.timestamp);
				if (start && day < start) return true;
				if (end && day > end) return true;
			}
			if (model && String(entry.model || "") !== model) return true;
			if (chat) {
				const chatId = String(entry.chatId || "");
				const chatName = String(entry.chatName || "");
				if (chatId !== chat && chatName !== chat) return true;
			}
			return false;
		});
		const removed = Math.max(0, (all || []).length - remains.length);
		if (!removed) return 0;
		await this.replaceAll({ history: remains }, { clearCold: true });
		await this.recalcAll();
		await rebuildAggregates();
		persist();
		emit(DataEvents.UPDATED);
		return removed;
	},
	getWallets() {
		return state.wallets || [];
	},
	getWallet(walletId) {
		return (state.wallets || []).find((wallet) => wallet.id === walletId) || null;
	},
	getIgnoredWalletIds() {
		return [...state.walletIgnored || []];
	},
	replaceWallets(next, ignored) {
		state.wallets = ensureDeepSeekWallet(normalizeWallets(next, state.settings, Date.now()), state.settings, Date.now());
		if (ignored !== void 0) state.walletIgnored = Array.from(new Set(ignored.map((id) => String(id || "").trim()).filter((id) => id && id !== "wallet:deepseek-official")));
		persist();
		emit(DataEvents.SETTINGS_CHANGED);
	},
	updateWallet(walletId, updater) {
		const wallet = (state.wallets || []).find((item) => item.id === walletId);
		if (!wallet) return null;
		updater(wallet);
		wallet.updatedAt = Date.now();
		persist();
		emit(DataEvents.SETTINGS_CHANGED);
		return wallet;
	},
	/** 收起所有已展开的钱包（离开钱包页时调用），一次落盘 */
	collapseAllWallets() {
		let changed = false;
		for (const wallet of state.wallets || []) if (wallet.collapsed !== true) {
			wallet.collapsed = true;
			wallet.updatedAt = Date.now();
			changed = true;
		}
		if (changed) {
			persist();
			emit(DataEvents.SETTINGS_CHANGED);
		}
		return changed;
	},
	setWalletIgnored(walletId, ignored) {
		if (!walletId || walletId === "wallet:deepseek-official") return false;
		if (ignored) {
			if (!state.walletIgnored.includes(walletId)) state.walletIgnored.push(walletId);
		} else state.walletIgnored = state.walletIgnored.filter((id) => id !== walletId);
		persist();
		emit(DataEvents.SETTINGS_CHANGED);
		return true;
	},
	setWalletBalance(walletId, amount, currency = "CNY", calibrated = false) {
		return this.updateWallet(walletId, (wallet) => {
			wallet.balance.amount = amount == null || String(amount).trim() === "" ? null : String(amount);
			wallet.balance.currency = currency === "USD" ? "USD" : "CNY";
			wallet.balance.mode = calibrated ? "auto" : "manual";
			if (calibrated) wallet.balance.lastCalibrated = Date.now();
		});
	},
	setWalletAccountSnapshot(walletId, snapshot) {
		return this.updateWallet(walletId, (wallet) => {
			wallet.balance.snapshot = {
				...snapshot,
				checkedAt: Date.now()
			};
			if (snapshot.scope === "account" && snapshot.amount !== null) {
				wallet.balance.amount = snapshot.amount;
				wallet.balance.currency = snapshot.currency;
				wallet.balance.lastCalibrated = Date.now();
			}
		});
	},
	recalcEntryWallet(entry) {
		return findWalletForHistory(state.wallets, entry);
	},
	addEntry(usage, model, messages, startTime, fullRequest, fullResponse, ttft = 0, thinkTime = 0, finishReason = null, connection = null, requestId = null, streamed = null) {
		messages = messages || [];
		if (!model) try {
			model = globalThis.SillyTavern?.getContext?.().model || "deepseek-v4-flash";
		} catch {
			model = "deepseek-v4-flash";
		}
		const rawModel = String(model);
		model = normalizeModel(rawModel);
		log.debug("addEntry 收到", {
			model,
			hasMessages: !!messages?.length
		});
		if (!usage || typeof usage !== "object" || Array.isArray(usage)) {
			log.debug("addEntry 跳过：usage 非对象 model=" + model);
			return null;
		}
		if (!(typeof usage.prompt_tokens === "number" || typeof usage.completion_tokens === "number" || typeof usage.total_tokens === "number" || typeof usage.input_tokens === "number" || typeof usage.output_tokens === "number" || typeof usage.prompt_cache_hit_tokens === "number" || usage.prompt_tokens_details && typeof usage.prompt_tokens_details.cached_tokens === "number")) {
			log.debug("addEntry 跳过：无 token 字段 model=" + model);
			return null;
		}
		let hit = usage.prompt_cache_hit_tokens || 0;
		if (!hit && usage.prompt_tokens_details?.cached_tokens) hit = usage.prompt_tokens_details.cached_tokens;
		let miss = usage.prompt_cache_miss_tokens;
		if (miss === void 0 || miss === null) {
			miss = (usage.prompt_tokens || usage.input_tokens || 0) - hit;
			if (miss < 0) miss = 0;
		}
		const comp = usage.completion_tokens || usage.output_tokens || 0;
		const total = usage.total_tokens || hit + miss + comp;
		if (hit === 0 && miss === 0 && comp === 0 && total === 0) {
			log.debug("addEntry 跳过：全 0 token model=" + model);
			return null;
		}
		log.debug("addEntry 解析", {
			model,
			hit,
			miss,
			comp,
			total
		});
		const fr = finishReason ?? usage?.__finish_reason ?? usage?.finish_reason ?? null;
		const nowTs = Date.now();
		let wallet = null;
		try {
			wallet = ensureWalletForConnection(state.wallets, new Set(state.walletIgnored || []), connection, nowTs).wallet;
			if (wallet) {
				if (shouldTrackWalletModel(wallet, model)) {
					const modelObservation = observeModel(wallet, model, nowTs);
					if (modelObservation.changed) wallet.updatedAt = nowTs;
					if (modelObservation.model?.source === "discovered" && modelObservation.model.price.priceConfigured !== true && state.settings.pricingSync?.enabled) try {
						import("./pricing-sync-4MD0EImp.js").then((n) => n.i).then((module) => module.syncPricingFromModelsDev({ silent: true })).then(() => this.recalcWallet(wallet.id)).catch(() => {});
					} catch {}
				}
				wallet.lastUsedAt = nowTs;
			}
		} catch {}
		try {
			const now = Date.now();
			const fp = requestId ? usageFingerprint(model, total, hit, miss, comp, connection, requestId) : `anonymous:${now}:${Math.random().toString(36).slice(2)}`;
			const lastFpTime = recentUsageFingerprints.get(fp);
			if (requestId && lastFpTime && now - lastFpTime < 5e3) {
				try {
					const head = requestId ? state.history.find((entry) => entry.requestId === requestId) || state.history[0] : state.history[0];
					if (head) {
						let changed = false;
						if (fullResponse && !head.fullResponse) {
							head.fullResponse = clampResponse(fullResponse);
							changed = true;
						}
						if (fr && !head.finishReason) {
							head.finishReason = fr;
							head.isTruncated = isTruncatedFinish(fr);
							changed = true;
						}
						const estThink = usage?.completion_tokens_details?.reasoning_tokens || usage?.__think_tokens_est || 0;
						if (estThink && !head.thinkTokens) {
							head.thinkTokens = estThink;
							changed = true;
						}
						if (ttft && !head.ttft) {
							if (streamed === false) {
								head.ttft = 0;
								head.tokenRate = 0;
								head.streamed = false;
							} else {
								head.ttft = ttft;
								head.tokenRate = computeTokenRate({
									duration: head.duration || 0,
									ttft,
									completionTokens: head.completion_tokens || 0,
									streamed
								});
								if (streamed != null) head.streamed = streamed;
							}
							changed = true;
						} else if (streamed === false && !head.streamed) {
							head.ttft = 0;
							head.tokenRate = 0;
							head.streamed = false;
							changed = true;
						}
						if (thinkTime && !head.thinkTime) {
							head.thinkTime = thinkTime;
							changed = true;
						}
						if (connection) {
							for (const key of [
								"sourceType",
								"endpointId",
								"endpointLabel",
								"credentialId",
								"credentialLabel"
							]) if (!head[key] && connection[key]) {
								head[key] = connection[key];
								changed = true;
							}
						}
						if (wallet && !head.walletId) {
							head.walletId = wallet.id;
							changed = true;
						}
						const reportedCost = extractReportedCost(usage, wallet);
						if (reportedCost && !head.reportedCost) {
							const previous = {
								input: head.input_cost || 0,
								output: head.output_cost || 0,
								total: head.cost || 0
							};
							head.reportedCost = {
								...reportedCost,
								exchangeRate: getWalletExchangeRate()
							};
							head.raw_usage = usage;
							const next = recalcEntryCost(head, wallet);
							applyCostPatch(head, next);
							applyTotalDelta(previous, next);
							adjustWalletBalance(head.walletId, next.total - previous.total, 1);
							if (state.lastUsage?.requestId === requestId) Object.assign(state.lastUsage, {
								reportedCost: head.reportedCost,
								cost: next.total,
								input_cost: next.input,
								output_cost: next.output,
								pricingSource: "api",
								priceType: "api"
							});
							changed = true;
						}
						if (changed) {
							if (state.lastUsage?.timestamp === head.timestamp) {
								if (head.fullResponse) state.lastUsage.fullResponse = head.fullResponse;
								if (head.finishReason) {
									state.lastUsage.finishReason = head.finishReason;
									state.lastUsage.isTruncated = head.isTruncated;
								}
								if (head.ttft) {
									state.lastUsage.ttft = head.ttft;
									state.lastUsage.tokenRate = head.tokenRate;
								}
								if (head.thinkTime) state.lastUsage.thinkTime = head.thinkTime;
								if (head.thinkTokens) state.lastUsage.thinkTokens = head.thinkTokens;
								if (head.sourceType) state.lastUsage.sourceType = head.sourceType;
								if (head.endpointId) state.lastUsage.endpointId = head.endpointId;
								if (head.endpointLabel) state.lastUsage.endpointLabel = head.endpointLabel;
								if (head.credentialId) state.lastUsage.credentialId = head.credentialId;
								if (head.credentialLabel) state.lastUsage.credentialLabel = head.credentialLabel;
							}
							persist();
						}
					}
				} catch {}
				log.debug("addEntry 去重跳过(5s指纹)", { fp });
				return null;
			}
			recentUsageFingerprints.set(fp, now);
			for (const [key, timestamp] of recentUsageFingerprints) if (now - timestamp > 3e4) recentUsageFingerprints.delete(key);
		} catch {}
		const lu = {
			timestamp: Date.now(),
			model,
			rawModel: rawModel !== model ? rawModel : null,
			prompt_tokens: hit + miss,
			prompt_cache_hit_tokens: hit,
			prompt_cache_miss_tokens: miss,
			completion_tokens: comp,
			total_tokens: total
		};
		const duration = startTime ? Date.now() - startTime : 0;
		const thinkTokens = usage.completion_tokens_details?.reasoning_tokens || usage?.__think_tokens_est || 0;
		lu.duration = duration;
		const nonStreamed = streamed === false;
		lu.streamed = streamed;
		lu.tokenRate = nonStreamed ? 0 : computeTokenRate({
			duration,
			ttft: ttft || 0,
			completionTokens: comp,
			streamed
		});
		lu.ttft = nonStreamed ? 0 : ttft || 0;
		lu.thinkTime = thinkTime || 0;
		lu.thinkTokens = thinkTokens;
		lu.finishReason = fr;
		lu.isTruncated = isTruncatedFinish(fr);
		lu.messages = (messages || []).map(clampMessage);
		const reportedCost = extractReportedCost(usage, wallet);
		if (reportedCost) lu.reportedCost = {
			...reportedCost,
			exchangeRate: getWalletExchangeRate()
		};
		const c = reportedCost ? recalcEntryCost(lu, wallet) : calcCost({
			timestamp: lu.timestamp,
			model,
			prompt_cache_hit_tokens: hit,
			prompt_cache_miss_tokens: miss,
			completion_tokens: comp
		}, state.settings, wallet);
		lu.cost = c.total;
		lu.input_cost = c.input;
		lu.output_cost = c.output;
		lu.priceType = c.priceType;
		lu.walletId = wallet?.id ?? null;
		lu.pricingSource = c.source;
		const safeResponse = clampResponse(fullResponse);
		lu.raw_usage = usage;
		lu.fullRequest = fullRequest;
		lu.fullResponse = safeResponse;
		const chatId = getCurrentChatId();
		const chatName = getCurrentChatName();
		lu.chatId = chatId;
		lu.chatName = chatName;
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
		const entry = {
			timestamp: lu.timestamp,
			model,
			rawModel: rawModel !== model ? rawModel : null,
			prompt_tokens: hit + miss,
			cache_hit_tokens: hit,
			cache_miss_tokens: miss,
			requestId,
			completion_tokens: comp,
			total_tokens: total,
			input_cost: lu.input_cost,
			output_cost: lu.output_cost,
			cost: lu.cost,
			cache_hit_rate: hit + miss > 0 ? hit / (hit + miss) * 100 : 0,
			priceType: lu.priceType,
			raw_usage: usage,
			messages: (messages || []).map(clampMessage),
			duration,
			ttft: lu.ttft,
			thinkTime,
			thinkTokens,
			tokenRate: lu.tokenRate,
			fullRequest,
			fullResponse: safeResponse,
			finishReason: fr2,
			isTruncated: isTruncatedFinish(fr2),
			streamed,
			chatId,
			chatName,
			sourceType: connection?.sourceType ?? null,
			endpointId: connection?.endpointId ?? null,
			endpointLabel: connection?.endpointLabel ?? null,
			credentialId: connection?.credentialId ?? null,
			credentialLabel: connection?.credentialLabel ?? null,
			walletId: wallet?.id ?? null,
			pricingSource: c.source,
			...lu.reportedCost ? { reportedCost: lu.reportedCost } : {}
		};
		log.debug("addEntry 即将写入", {
			model: entry.model,
			total: entry.total_tokens
		});
		state.history.unshift(entry);
		state.total_tokens += total;
		state.total_cost += lu.cost;
		state.input_tokens += hit + miss;
		state.output_tokens += comp;
		state.cache_hit_tokens += hit;
		state.cache_miss_tokens += miss;
		state.input_cost += lu.input_cost;
		state.output_cost += lu.output_cost;
		if (isDeepSeekOfficialModel(model)) state.rounds += 1;
		try {
			if (wallet) {
				const current = wallet.balance.amount == null || wallet.balance.amount === "" ? NaN : parseFloat(String(wallet.balance.amount));
				if (Number.isFinite(current)) {
					const cost = wallet.balance.currency === "USD" ? lu.cost / getWalletExchangeRate() : lu.cost;
					wallet.balance.amount = (current - cost).toFixed(4);
					wallet.updatedAt = Date.now();
				}
			} else if (state.customBalance != null && String(state.customBalance).trim() !== "") {
				const cur = parseFloat(String(state.customBalance));
				if (!isNaN(cur)) state.customBalance = (cur - lu.cost).toFixed(4);
			} else if (state.balance && state.balance.balance != null && String(state.balance.balance).trim() !== "") {
				const cur = parseFloat(String(state.balance.balance));
				if (!isNaN(cur)) {
					state.balance.balance = (cur - lu.cost).toFixed(4);
					state.balance.timestamp = Date.now();
				}
			}
		} catch {}
		if (state.history.length > 2e3) {
			const overflow = state.history.slice(MAX_HISTORY);
			appendHistoryCold(overflow).catch(notifyStorageFailure);
			state.history = state.history.slice(0, MAX_HISTORY);
		}
		state.startTime = state.startTime || Date.now();
		persist();
		emit(DataEvents.HISTORY_ADDED, entry);
		return entry;
	},
	/**
	* Agent 模式写入：一次 Run = 一条历史，按 agentRunId 幂等 upsert（不追加）。
	* 终态才调用；重复调用会先回滚旧条目贡献再写入新值。
	* 与 addEntry 完全独立，常规对话链路不受影响。
	*/
	async addAgentRunEntry(input) {
		if (!input || typeof input !== "object") return null;
		const runId = String(input.agentRunId || "").trim();
		if (!runId) return null;
		const hit = Number(input.hit) || 0;
		const miss = Number(input.miss) || 0;
		const comp = Number(input.comp) || 0;
		const total = Number(input.total) || hit + miss + comp;
		if (hit + miss + comp <= 0) {
			log.debug("addAgentRunEntry 跳过：全 0 token " + runId);
			return null;
		}
		const shares = Array.isArray(input.walletShares) && input.walletShares.length ? input.walletShares : [{
			walletId: input.walletId ?? null,
			timestamp: input.timestamp,
			model: input.model,
			hit,
			miss,
			comp,
			total,
			cost: Number(input.cost) || 0,
			inputCost: Number(input.inputCost) || 0,
			outputCost: Number(input.outputCost) || 0,
			priceType: input.priceType,
			pricingSource: input.pricingSource
		}];
		let existing = (state.history || []).findIndex((entry) => entry && entry.agentRunId === runId);
		if (existing >= 0) {
			rollbackAgentRunEntry(state.history[existing]);
			state.history.splice(existing, 1);
		} else try {
			const cold = await loadHistoryCold();
			const coldIndex = cold.findIndex((entry) => entry && entry.agentRunId === runId);
			if (coldIndex >= 0) {
				rollbackAgentRunEntry(cold[coldIndex]);
				cold.splice(coldIndex, 1);
				await saveHistoryCold(cold);
			}
		} catch {}
		const connection = input.connection;
		const now = Date.now();
		const entry = {
			timestamp: Number(input.timestamp) || now,
			model: normalizeModel(String(input.model || "unknown")),
			requestId: "agent:" + runId,
			prompt_tokens: hit + miss,
			cache_hit_tokens: hit,
			cache_miss_tokens: miss,
			completion_tokens: comp,
			total_tokens: total,
			input_cost: Number(input.inputCost) || 0,
			output_cost: Number(input.outputCost) || 0,
			cost: Number(input.cost) || 0,
			cache_hit_rate: hit + miss > 0 ? hit / (hit + miss) * 100 : 0,
			priceType: input.priceType || "old",
			raw_usage: {
				prompt_tokens: hit + miss,
				cache_hit_tokens: hit,
				cache_miss_tokens: miss,
				completion_tokens: comp,
				total_tokens: total,
				agent: {
					version: 1,
					runId,
					status: input.status,
					profileId: input.profileId ?? null,
					modelTurns: Number(input.modelTurns) || 0,
					invocationCount: Number(input.invocationCount) || 1,
					stableChatId: input.stableChatId ?? null,
					messageIndex: input.messageIndex ?? null,
					generationType: input.generationType ?? null,
					committed: !!input.committed,
					partial: !!input.partial,
					wallClockMs: Number(input.wallClockMs) || 0,
					turns: (input.turns || []).map((turn) => ({
						round: turn.round,
						invocationId: turn.invocationId,
						model: turn.model,
						source: turn.source ?? null,
						providerFormat: turn.providerFormat ?? null,
						usage: turn.rawUsage ?? null,
						durationMs: turn.durationMs,
						timestamp: turn.timestamp,
						cost: turn.cost
					})),
					walletBreakdown: shares.map((share) => ({
						walletId: share.walletId ?? null,
						timestamp: share.timestamp,
						model: share.model,
						hit: share.hit,
						miss: share.miss,
						comp: share.comp,
						total: share.total,
						cost: share.cost,
						inputCost: share.inputCost,
						outputCost: share.outputCost,
						priceType: share.priceType,
						pricingSource: share.pricingSource
					}))
				}
			},
			messages: [],
			duration: Number(input.duration) || 0,
			ttft: 0,
			thinkTime: 0,
			thinkTokens: Number(input.thinkTokens) || 0,
			tokenRate: 0,
			fullRequest: input.fullRequest ?? null,
			fullResponse: null,
			finishReason: null,
			isTruncated: false,
			streamed: null,
			chatId: input.chatId ?? getCurrentChatId(),
			chatName: input.chatName ?? getCurrentChatName(),
			sourceType: connection?.sourceType ?? null,
			endpointId: connection?.endpointId ?? null,
			endpointLabel: connection?.endpointLabel ?? null,
			credentialId: connection?.credentialId ?? null,
			credentialLabel: connection?.credentialLabel ?? null,
			walletId: input.walletId ?? shares[0]?.walletId ?? null,
			pricingSource: input.pricingSource || "unpriced",
			origin: "agent",
			agentRunId: runId,
			agentProfileId: input.profileId ?? null,
			agentStatus: input.status ?? null,
			agentModelTurns: Number(input.modelTurns) || 0,
			agentInvocationCount: Number(input.invocationCount) || 1,
			agentStableChatId: input.stableChatId ?? null,
			agentMessageIndex: input.messageIndex ?? null,
			agentGenerationType: input.generationType ?? null,
			agentCommitted: !!input.committed,
			agentPartial: !!input.partial,
			agentTimingSource: "events"
		};
		state.history.unshift(entry);
		state.total_tokens += total;
		state.total_cost += entry.cost;
		state.input_tokens += hit + miss;
		state.output_tokens += comp;
		state.cache_hit_tokens += hit;
		state.cache_miss_tokens += miss;
		state.input_cost += entry.input_cost;
		state.output_cost += entry.output_cost;
		if (isDeepSeekOfficialModel(entry.model)) state.rounds += 1;
		for (const share of shares) adjustWalletBalance(share?.walletId ?? null, Number(share?.cost) || 0, 1);
		if (state.history.length > 2e3) {
			const overflow = state.history.slice(MAX_HISTORY);
			appendHistoryCold(overflow).catch(notifyStorageFailure);
			state.history = state.history.slice(0, MAX_HISTORY);
		}
		state.startTime = state.startTime || Date.now();
		persist();
		emit(DataEvents.HISTORY_ADDED, entry);
		return entry;
	},
	async recalcAll() {
		for (const h of state.history || []) {
			const wallet = findWalletForHistory(state.wallets, h);
			const previous = {
				input: Number(h.input_cost) || 0,
				output: Number(h.output_cost) || 0,
				total: Number(h.cost) || 0
			};
			const c = recalcEntryCost(h, wallet);
			applyCostPatch(h, c);
			applyTotalDelta(previous, c);
			h.cache_hit_rate = (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0) > 0 ? (h.cache_hit_tokens || 0) / ((h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0)) * 100 : 0;
		}
		try {
			const cold = await loadHistoryCold();
			let coldChanged = false;
			for (const h of cold) {
				const wallet = findWalletForHistory(state.wallets, h);
				const previous = {
					input: Number(h.input_cost) || 0,
					output: Number(h.output_cost) || 0,
					total: Number(h.cost) || 0
				};
				const c = recalcEntryCost(h, wallet);
				applyCostPatch(h, c);
				applyTotalDelta(previous, c);
				h.cache_hit_rate = (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0) > 0 ? (h.cache_hit_tokens || 0) / ((h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0)) * 100 : 0;
				coldChanged = true;
			}
			if (coldChanged) await saveHistoryCold(cold);
		} catch (error) {
			log.error("冷历史重算失败", error);
		}
		persist();
	},
	async rebuildAggregates() {
		await rebuildAggregates();
		persist();
	},
	async recalcWallet(walletId) {
		const wallet = state.wallets.find((item) => item.id === walletId) || null;
		if (!wallet) return 0;
		let changed = 0;
		for (const h of state.history || []) {
			const sourceWallet = findWalletForHistory(state.wallets, h);
			if (sourceWallet?.id !== wallet.id && h.legacyPricingWalletId !== wallet.id) continue;
			const previous = {
				input: Number(h.input_cost) || 0,
				output: Number(h.output_cost) || 0,
				total: Number(h.cost) || 0
			};
			const c = recalcEntryCost(h, sourceWallet || wallet);
			applyCostPatch(h, c);
			applyTotalDelta(previous, c);
			h.cache_hit_rate = (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0) > 0 ? (h.cache_hit_tokens || 0) / ((h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0)) * 100 : 0;
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
					total: Number(h.cost) || 0
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
	async replaceAll(next, options = {}) {
		if (next.history !== void 0) {
			let h = next.history;
			h = h.map((e) => {
				if (!e || typeof e !== "object") return e;
				for (const k of Object.keys(e)) if (isUnsafeKey(k)) delete e[k];
				return e;
			});
			if (h.length > 2e3) {
				const overflow = h.slice(MAX_HISTORY);
				if (options.clearCold) await saveHistoryCold(overflow);
				else await appendHistoryCold(overflow);
				state.history = h.slice(0, MAX_HISTORY);
			} else {
				if (options.clearCold) await clearHistoryCold();
				state.history = h;
			}
		} else if (options.clearCold) await clearHistoryCold();
		if (next.total_tokens !== void 0) state.total_tokens = next.total_tokens;
		if (next.total_cost !== void 0) state.total_cost = next.total_cost;
		if (next.input_tokens !== void 0) state.input_tokens = next.input_tokens;
		if (next.output_tokens !== void 0) state.output_tokens = next.output_tokens;
		if (next.cache_hit_tokens !== void 0) state.cache_hit_tokens = next.cache_hit_tokens;
		if (next.cache_miss_tokens !== void 0) state.cache_miss_tokens = next.cache_miss_tokens;
		if (next.input_cost !== void 0) state.input_cost = next.input_cost;
		if (next.output_cost !== void 0) state.output_cost = next.output_cost;
		if (next.rounds !== void 0) state.rounds = next.rounds;
		if (next.startTime !== void 0) state.startTime = next.startTime;
		if (next.saves) {
			let all = [...state.history || []];
			for (const s of Object.values(next.saves)) {
				const h = s.history || [];
				all = all.concat(h);
			}
			all.sort((a, b) => b.timestamp - a.timestamp);
			const keyOf = historyRecordKey;
			const seen = /* @__PURE__ */ new Set();
			const dedup = [];
			for (const h of all) {
				const k = keyOf(h);
				if (!seen.has(k)) {
					seen.add(k);
					dedup.push(h);
				}
			}
			if (dedup.length > 2e3) {
				const overflow = dedup.slice(MAX_HISTORY);
				await appendHistoryCold(overflow);
			}
			state.history = dedup.slice(0, MAX_HISTORY);
			if (next.total_tokens === void 0) {
				let tt = 0, tc = 0, it = 0, ot = 0, ch = 0, cm = 0, ic = 0, oc = 0;
				for (const h of state.history) {
					tt += h.total_tokens || 0;
					tc += h.cost || 0;
					it += (h.cache_hit_tokens || 0) + (h.cache_miss_tokens || 0);
					ot += h.completion_tokens || 0;
					ch += h.cache_hit_tokens || 0;
					cm += h.cache_miss_tokens || 0;
					ic += h.input_cost || 0;
					oc += h.output_cost || 0;
				}
				state.total_tokens = tt;
				state.total_cost = tc;
				state.input_tokens = it;
				state.output_tokens = ot;
				state.cache_hit_tokens = ch;
				state.cache_miss_tokens = cm;
				state.input_cost = ic;
				state.output_cost = oc;
				state.rounds = state.history.length;
			}
		}
		if (next.settings !== void 0) {
			state.settings = normalizeSettings(next.settings);
			try {
				let need = false;
				for (const h of state.history) {
					if (h.finishReason === void 0) {
						h.finishReason = h.raw_usage?.__finish_reason ?? null;
						need = true;
					}
					const t = isTruncatedFinish(h.finishReason);
					if (h.isTruncated !== t) {
						h.isTruncated = t;
						need = true;
					}
				}
				if (need) saveHot({ history: state.history });
			} catch {}
		}
		if (next.balance !== void 0) state.balance = next.balance;
		if (next.customBalance !== void 0) state.customBalance = next.customBalance;
		if (next.wallets !== void 0) state.wallets = normalizeWallets(next.wallets, state.settings, Date.now());
		if (next.walletIgnored !== void 0) state.walletIgnored = Array.isArray(next.walletIgnored) ? Array.from(new Set(next.walletIgnored.map((id) => String(id || "").trim()).filter(Boolean))) : [];
		if (next.messageCount !== void 0) state.messageCount = next.messageCount;
		if (next.lastUsage !== void 0) state.lastUsage = next.lastUsage;
		persist();
		if (next.settings) emit(DataEvents.SETTINGS_CHANGED);
		if (next.wallets !== void 0 || next.walletIgnored !== void 0) emit(DataEvents.SETTINGS_CHANGED);
		if (next.balance !== void 0 || next.customBalance !== void 0) emit(DataEvents.BALANCE_CHANGED);
	},
	pruneZeroEntries() {
		const before = (state.history || []).length;
		const filtered = (state.history || []).filter((h) => {
			const isZero = h.total_tokens === 0 && h.prompt_tokens === 0 && h.completion_tokens === 0 && h.cache_hit_tokens === 0 && h.cache_miss_tokens === 0;
			const isFakeTokenCount = !!(h.raw_usage && h.raw_usage._from_token_count);
			const isDebug = h._debug === true;
			return !(isZero || isFakeTokenCount || isDebug);
		});
		if (filtered.length !== before) {
			state.history = filtered;
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
			state.total_tokens = total_tokens;
			state.total_cost = total_cost;
			state.input_tokens = input_tokens;
			state.output_tokens = output_tokens;
			state.cache_hit_tokens = cache_hit_tokens;
			state.cache_miss_tokens = cache_miss_tokens;
			state.input_cost = input_cost;
			state.output_cost = output_cost;
			state.rounds = rounds;
			persist();
			log.debug("已自动清理 " + (before - filtered.length) + " 条全 0 污染条目");
		}
		return filtered.length;
	},
	async hydrate() {
		const hot = await loadHot();
		if (hot) {
			if (hot.history) state.history = hot.history;
			if (hot.total_tokens !== void 0) state.total_tokens = hot.total_tokens;
			if (hot.total_cost !== void 0) state.total_cost = hot.total_cost;
			if (hot.input_tokens !== void 0) state.input_tokens = hot.input_tokens;
			if (hot.output_tokens !== void 0) state.output_tokens = hot.output_tokens;
			if (hot.cache_hit_tokens !== void 0) state.cache_hit_tokens = hot.cache_hit_tokens;
			if (hot.cache_miss_tokens !== void 0) state.cache_miss_tokens = hot.cache_miss_tokens;
			if (hot.input_cost !== void 0) state.input_cost = hot.input_cost;
			if (hot.output_cost !== void 0) state.output_cost = hot.output_cost;
			if (hot.rounds !== void 0) state.rounds = hot.rounds;
			if (hot.startTime !== void 0) state.startTime = hot.startTime;
			if (hot.settings) state.settings = normalizeSettings(hot.settings);
			if (hot.balance) state.balance = hot.balance;
			if (hot.customBalance) state.customBalance = hot.customBalance;
			if (hot.wallets) state.wallets = normalizeWallets(hot.wallets, state.settings, Date.now());
			if (Array.isArray(hot.walletIgnored)) state.walletIgnored = hot.walletIgnored;
			if (hot.messageCount) state.messageCount = hot.messageCount;
			if (hot.lastUsage) state.lastUsage = hot.lastUsage;
		}
		if (!state.settings.historyScope) {
			state.settings.historyScope = "all";
			try {
				saveHot({ settings: state.settings });
			} catch {}
		}
		if (!state.settings.overviewWalletId) {
			state.settings.overviewWalletId = DEEPSEEK_WALLET_ID;
			state.settings.overviewWalletManuallySet = false;
			try {
				saveHot({ settings: state.settings });
			} catch {}
		}
		if (state.settings.overviewWalletManuallySet !== true) {
			if (state.settings.overviewWalletId === "all") state.settings.overviewWalletId = DEEPSEEK_WALLET_ID;
			state.settings.overviewWalletManuallySet = true;
			try {
				saveHot({ settings: state.settings });
			} catch {}
		}
		if (!Array.isArray(state.settings.overviewFour) || state.settings.overviewFour.length !== 8 && state.settings.overviewFour.length !== 4) {
			state.settings.overviewFour = [
				"avg_cost",
				"avg_tokens",
				"avg_duration",
				"avg_rate",
				"avg_input_tokens",
				"avg_output_tokens",
				"avg_hit_rate",
				"max_total"
			];
			try {
				saveHot({ settings: state.settings });
			} catch {}
		} else if (state.settings.overviewFour.length === 4) {
			state.settings.overviewFour = [
				...state.settings.overviewFour,
				"avg_input_tokens",
				"avg_output_tokens",
				"avg_hit_rate",
				"max_total"
			];
			try {
				saveHot({ settings: state.settings });
			} catch {}
		}
		if (typeof state.settings.modelsPricingCollapsed !== "boolean") {
			state.settings.modelsPricingCollapsed = true;
			try {
				saveHot({ settings: state.settings });
			} catch {}
		}
		if (!Array.isArray(state.settings.statsFour) || state.settings.statsFour.length !== 4) {
			state.settings.statsFour = [
				"avg_cost",
				"avg_tokens",
				"avg_think_ratio",
				"truncation_rate"
			];
			try {
				saveHot({ settings: state.settings });
			} catch {}
		} else try {
			const validStats = /* @__PURE__ */ new Set([
				"avg_cost",
				"avg_tokens",
				"avg_duration",
				"avg_rate",
				"avg_ttft",
				"avg_input_cost",
				"avg_input_tokens",
				"avg_output_cost",
				"avg_output_tokens",
				"avg_think_time",
				"avg_think_tokens",
				"avg_think_ratio",
				"truncation_rate",
				"avg_hit_rate",
				"latest_hit_rate",
				"max_output",
				"max_input",
				"max_total"
			]);
			if (state.settings.statsFour.some((k) => !validStats.has(k))) {
				state.settings.statsFour = [
					"avg_cost",
					"avg_tokens",
					"avg_think_ratio",
					"truncation_rate"
				];
				try {
					saveHot({ settings: state.settings });
				} catch {}
			}
		} catch {}
		if (!state.settings.pricingSync) {
			state.settings.pricingSync = {
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
			};
			try {
				saveHot({ settings: state.settings });
			} catch {}
		} else try {
			const def = {
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
			};
			const ps = state.settings.pricingSync;
			for (const k of Object.keys(def)) if (ps[k] === void 0) ps[k] = def[k];
			const r = parseFloat(String(ps.exchangeRate));
			if (!isFinite(r) || r <= 0) ps.exchangeRate = 7.2;
			if (typeof ps.showSyncedModels !== "boolean") ps.showSyncedModels = false;
			if (!isFinite(parseFloat(String(ps.syncedMarkVersion)))) ps.syncedMarkVersion = 0;
			try {
				saveHot({ settings: state.settings });
			} catch {}
		} catch {}
		try {
			let need = false;
			for (const h of state.history) {
				if (h.finishReason === void 0) {
					h.finishReason = h.raw_usage?.__finish_reason ?? null;
					need = true;
				}
				const t = isTruncatedFinish(h.finishReason);
				if (h.isTruncated !== t) {
					h.isTruncated = t;
					need = true;
				}
			}
			if (need) try {
				saveHot({ history: state.history });
			} catch {}
		} catch {}
		let needPersistChatId = false;
		for (const h of state.history || []) if (h.chatId === void 0) {
			h.chatId = null;
			h.chatName = null;
			needPersistChatId = true;
		}
		if (needPersistChatId) try {
			saveHot({ history: state.history });
		} catch {}
		let coldForWalletMigration = [];
		try {
			coldForWalletMigration = await loadHistoryCold();
		} catch {}
		try {
			let hotFixed = false;
			for (const h of state.history || []) if (sanitizeHistoryTiming(h)) hotFixed = true;
			let coldFixed = false;
			for (const h of coldForWalletMigration || []) if (sanitizeHistoryTiming(h)) coldFixed = true;
			if (hotFixed) try {
				saveHot({ history: state.history });
			} catch {}
			if (coldFixed) try {
				await saveHistoryCold(coldForWalletMigration);
			} catch {}
		} catch {}
		if (migrateWallets(hot, coldForWalletMigration)) {
			try {
				saveHot({
					wallets: state.wallets,
					walletIgnored: state.walletIgnored
				});
			} catch {}
			if (coldForWalletMigration.length) try {
				await saveHistoryCold(coldForWalletMigration);
			} catch {}
		}
		try {
			this.pruneZeroEntries();
		} catch {}
		try {
			await this.recalcAll();
		} catch {}
		try {
			await rebuildAggregates();
			persist();
		} catch {}
		emit(DataEvents.UPDATED);
		return this.snapshot();
	}
};
//#endregion
export { resolvedBalanceProvider as A, mergeWalletCollections as C, balanceQueryUrl as D, BALANCE_PROVIDERS as E, DEEPSEEK_WALLET_ID as F, WALLET_CATALOG_PROVIDERS as I, buildEndpointContext as M, initConnectionIdentity as N, normalizeBalanceQuery as O, resolveRuntimeConnectionContext as P, findWalletModel as S, walletPendingModelCount as T, normalizeModel as _, decryptKey as a, findWalletForConnection as b, isTruncatedFinish as c, calcCost as d, calcSavings as f, isWalletPeakHour as g, isPeakHour as h, saveWalletApiKey as i, safeBalanceUrl as j, parseAccountSnapshot as k, DataEvents as l, isDeepSeekOfficialModel as m, repository_exports as n, encryptKey as o, getPricing as p, getWalletApiKey as r, sanitizeHistoryTiming as s, repository as t, on as u, cloneWallet as v, walletBalanceToCny as w, findWalletForHistory as x, defaultContextLimitForModel as y };
