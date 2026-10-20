import { pn as __exportAll } from "./graphic-BAx7jeh4.js";
import { r as state } from "./store-Cc2SGj8q.js";
import { i as EXCHANGE_RATE_FETCH_INTERVAL, n as DEFAULT_EXCHANGE_RATE } from "./pricing-Bc-qEvy8.js";
import { u as saveHot } from "./persistence-C4IJVd-B.js";
//#region src/services/currency.ts
var currency_exports = /* @__PURE__ */ __exportAll({
	cnyToDisplay: () => cnyToDisplay,
	fetchLiveRate: () => fetchLiveRate,
	formatMoney: () => formatMoney,
	getDisplayCurrency: () => getDisplayCurrency,
	getEffectiveRate: () => getEffectiveRate,
	getWalletExchangeRate: () => getWalletExchangeRate,
	restartRateTimer: () => restartRateTimer,
	stopRateTimer: () => stopRateTimer
});
function getEffectiveRate() {
	const ps = state.settings?.pricingSync;
	if (!ps?.enabled) return 1;
	const r = parseFloat(String(ps.exchangeRate));
	if (!isFinite(r) || r <= 0) return DEFAULT_EXCHANGE_RATE;
	return r;
}
/** 钱包余额汇总使用固定配置汇率，不随展示币种开关关闭而退回 1。 */
function getWalletExchangeRate() {
	const ps = state.settings?.pricingSync;
	const r = parseFloat(String(ps?.exchangeRate));
	return isFinite(r) && r > 0 ? r : DEFAULT_EXCHANGE_RATE;
}
function getDisplayCurrency() {
	if ((state.settings?.pricingSync)?.enabled) return {
		code: "USD",
		symbol: "$",
		rate: getEffectiveRate()
	};
	return {
		code: "CNY",
		symbol: "¥",
		rate: 1
	};
}
function cnyToDisplay(cny) {
	const cur = getDisplayCurrency();
	if (cur.code === "USD") return cny / cur.rate;
	return cny;
}
function formatMoney(cny, digits = 4) {
	const cur = getDisplayCurrency();
	const v = cnyToDisplay(cny);
	return `${cur.symbol}${v.toFixed(digits)} ${cur.code}`;
}
var rateInFlight = false;
async function fetchLiveRate(force = false) {
	const ps = state.settings?.pricingSync;
	if (!ps) return null;
	if (!force && ps.lastRateFetch && Date.now() - ps.lastRateFetch < 864e5) return ps.exchangeRate;
	if (rateInFlight) return null;
	rateInFlight = true;
	for (const u of ["https://open.er-api.com/v6/latest/USD", "https://api.exchangerate-api.com/v4/latest/USD"]) try {
		const ctrl = new AbortController();
		const to = setTimeout(() => ctrl.abort(), 6e3);
		const r = await fetch(u, { signal: ctrl.signal });
		clearTimeout(to);
		if (!r.ok) continue;
		const j = await r.json();
		const rate = j?.rates?.CNY ?? j?.rates?.["CNY"] ?? j?.conversion_rates?.CNY;
		const v = parseFloat(String(rate));
		if (isFinite(v) && v > 0) {
			ps.exchangeRate = Math.round(v * 1e4) / 1e4;
			ps.lastRateFetch = Date.now();
			saveHot({ settings: state.settings });
			rateInFlight = false;
			return ps.exchangeRate;
		}
	} catch {}
	rateInFlight = false;
	return null;
}
var rateTimer = null;
function restartRateTimer() {
	if (rateTimer) {
		try {
			clearInterval(rateTimer);
		} catch {}
		rateTimer = null;
	}
	const ps = state.settings?.pricingSync;
	if (!ps?.enabled || !ps?.useLiveRate) return;
	rateTimer = setInterval(() => {
		fetchLiveRate(false).catch(() => {});
	}, EXCHANGE_RATE_FETCH_INTERVAL);
	if (!ps.lastRateFetch || Date.now() - ps.lastRateFetch >= 864e5) fetchLiveRate(false).catch(() => {});
}
function stopRateTimer() {
	if (rateTimer) {
		try {
			clearInterval(rateTimer);
		} catch {}
		rateTimer = null;
	}
}
//#endregion
export { getWalletExchangeRate as a, getDisplayCurrency as i, fetchLiveRate as n, formatMoney as r, currency_exports as t };
