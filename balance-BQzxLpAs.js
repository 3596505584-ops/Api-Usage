import { cn as __exportAll } from "./Image-B5UjBJH1.js";
import { r as state } from "./store-DSiVmOSF.js";
import { r as toast, t as log } from "./logger-Bv-AT94O.js";
import { T as DEEPSEEK_WALLET_ID, g as DEEPSEEK_OFFICIAL_ENDPOINT_ID, i as saveWalletApiKey, r as getWalletApiKey, t as repository } from "./repository-B4yMLqkN.js";
//#region src/services/balance.ts
var balance_exports = /* @__PURE__ */ __exportAll({
	queryBalance: () => queryBalance,
	queryWalletBalance: () => queryWalletBalance,
	restartBalanceTimer: () => restartBalanceTimer,
	saveApiKey: () => saveApiKey,
	stopBalanceTimer: () => stopBalanceTimer
});
function saveApiKey(key) {
	saveWalletApiKey(DEEPSEEK_WALLET_ID, key);
}
function canAutoCalibrate(wallet) {
	return wallet.id === "wallet:deepseek-official" && wallet.sourceType === "deepseek" && wallet.endpointId === DEEPSEEK_OFFICIAL_ENDPOINT_ID;
}
function walletCurrencyLabel(wallet) {
	return `${wallet.balance.currency === "USD" ? "$" : "¥"}${wallet.balance.amount || "0"} ${wallet.balance.currency}`;
}
var balanceInFlight = /* @__PURE__ */ new Set();
async function queryWalletBalance(walletId, silent = false) {
	const wallet = repository.getWallet(walletId);
	if (!wallet) {
		if (!silent) toast("error", "钱包不存在");
		return null;
	}
	if (!canAutoCalibrate(wallet)) {
		if (!silent) toast("warning", "当前接入不支持自动校准，请使用手工余额");
		return null;
	}
	if (balanceInFlight.has(walletId)) return null;
	balanceInFlight.add(walletId);
	try {
		const key = getWalletApiKey(walletId);
		if (!key) {
			if (!silent) toast("error", "请先在该钱包填写 API 密钥");
			return null;
		}
		const ctrl = new AbortController();
		const to = setTimeout(() => {
			try {
				ctrl.abort();
			} catch {}
		}, 15e3);
		const response = await fetch("https://api.deepseek.com/user/balance", {
			method: "GET",
			headers: {
				Authorization: "Bearer " + key,
				"Content-Type": "application/json"
			},
			signal: ctrl.signal
		});
		clearTimeout(to);
		const data = await response.json();
		if (data.is_available && data.balance_infos?.length) {
			const info = data.balance_infos[0];
			const amount = String(info.total_balance ?? "0");
			const currency = String(info.currency || "").toUpperCase() === "USD" ? "USD" : "CNY";
			const updated = repository.setWalletBalance(walletId, amount, currency, true);
			if (walletId === "wallet:deepseek-official") {
				state.balance = {
					balance: amount,
					currency,
					available: data.is_available,
					timestamp: Date.now()
				};
				try {
					globalThis.ApiUsageStat?.refreshUI?.();
				} catch {}
			}
			if (!silent && updated) toast("success", "余额已更新 " + walletCurrencyLabel(updated));
			return updated;
		}
		if (!silent) toast("error", data.error?.message || "查询失败");
		return null;
	} catch (error) {
		const message = error?.name === "AbortError" ? "查询超时(15s)" : error?.message || error;
		log.error("余额查询失败", error);
		if (!silent) toast("error", "网络错误: " + message);
		return null;
	} finally {
		balanceInFlight.delete(walletId);
	}
}
/** 兼容旧调用：与概览选择器一致，默认校准 DeepSeek 官方钱包。 */
async function queryBalance(silent = false) {
	const selected = String(state.settings.overviewWalletId || "all");
	return queryWalletBalance(selected === "all" ? DEEPSEEK_WALLET_ID : selected, silent);
}
var balanceTimer = null;
function restartBalanceTimer() {
	if (balanceTimer) {
		try {
			clearInterval(balanceTimer);
		} catch {}
		balanceTimer = null;
	}
	const settings = state.settings;
	if (!settings.autoBalance) return;
	const minutes = Math.min(Math.max(parseInt(settings.balanceInterval) || 10, 1), 1440);
	balanceTimer = setInterval(() => {
		const ignored = new Set(state.walletIgnored || []);
		for (const wallet of state.wallets || []) {
			if (ignored.has(wallet.id) || wallet.balance.mode !== "auto") continue;
			queryWalletBalance(wallet.id, true).catch(() => {});
		}
	}, minutes * 60 * 1e3);
}
function stopBalanceTimer() {
	if (balanceTimer) {
		try {
			clearInterval(balanceTimer);
		} catch {}
		balanceTimer = null;
	}
}
//#endregion
export { saveApiKey as i, queryBalance as n, queryWalletBalance as r, balance_exports as t };
