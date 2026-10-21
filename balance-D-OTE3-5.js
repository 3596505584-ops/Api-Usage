import { pn as __exportAll } from "./graphic-BAx7jeh4.js";
import { r as state } from "./store-Cc2SGj8q.js";
import { r as toast, t as log } from "./logger-8RGXnvfI.js";
import { A as resolvedBalanceProvider, D as balanceQueryUrl, F as DEEPSEEK_WALLET_ID, i as saveWalletApiKey, k as parseAccountSnapshot, r as getWalletApiKey, t as repository } from "./repository-BdeEwY0n.js";
//#region src/services/balance.ts
var balance_exports = /* @__PURE__ */ __exportAll({
	canAutoCalibrate: () => canAutoCalibrate,
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
	return !!balanceQueryUrl(wallet);
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
		if (!silent) toast("warning", "请在钱包选择余额来源，或配置自定义查询地址");
		return null;
	}
	if (balanceInFlight.has(walletId)) return null;
	balanceInFlight.add(walletId);
	let timeout;
	try {
		const url = balanceQueryUrl(wallet);
		const key = getWalletApiKey(walletId, url);
		if (!key) {
			if (!silent) toast("error", "请先为当前查询地址保存该钱包的校准密钥");
			return null;
		}
		const ctrl = new AbortController();
		timeout = setTimeout(() => {
			try {
				ctrl.abort();
			} catch {}
		}, 15e3);
		const queryIdentity = JSON.stringify(wallet.balance.query);
		const provider = resolvedBalanceProvider(wallet);
		const response = await fetch(url, {
			method: "GET",
			headers: provider === "custom" && wallet.balance.query?.auth === "x-api-key" ? {
				"x-api-key": key,
				Accept: "application/json"
			} : {
				Authorization: "Bearer " + key,
				Accept: "application/json"
			},
			credentials: "omit",
			redirect: "error",
			cache: "no-store",
			signal: ctrl.signal
		});
		if (!response.ok) {
			if (response.status === 403 && provider === "openrouter") throw new Error("OpenRouter 账户余额需要管理密钥；普通密钥请选择「OpenRouter 密钥用量/额度」");
			throw new Error(`查询失败 HTTP ${response.status}${response.status === 401 ? "：请检查该钱包的校准密钥" : ""}`);
		}
		const data = await response.json();
		const current = repository.getWallet(walletId);
		if (!current || balanceQueryUrl(current) !== url || JSON.stringify(current.balance.query) !== queryIdentity || getWalletApiKey(walletId, url) !== key) return null;
		const snapshot = parseAccountSnapshot(current, data);
		const updated = repository.setWalletAccountSnapshot(walletId, snapshot);
		if (updated) {
			if (walletId === "wallet:deepseek-official" && snapshot.amount !== null) {
				state.balance = {
					balance: snapshot.amount,
					currency: snapshot.currency,
					available: Number(snapshot.amount) > 0,
					timestamp: Date.now()
				};
				try {
					globalThis.ApiUsageStat?.refreshUI?.();
				} catch {}
			}
			if (!silent) toast("success", snapshot.scope === "key" ? "密钥用量已更新（账户余额未修改）" : "余额已更新 " + walletCurrencyLabel(updated));
			return updated;
		}
		return null;
	} catch (error) {
		const message = error?.name === "AbortError" ? "查询超时(15s)" : error?.name === "SyntaxError" ? "平台未返回有效 JSON" : error?.name === "TypeError" ? "网络或跨域请求失败" : error?.message || "查询失败";
		log.error("余额查询失败", message);
		if (!silent) toast("error", "余额查询失败: " + message);
		return null;
	} finally {
		if (timeout !== void 0) clearTimeout(timeout);
		balanceInFlight.delete(walletId);
	}
}
/** 与概览选择器一致；全部钱包时逐钱包查询，不累加不同密钥的额度。 */
async function queryBalance(silent = false) {
	const selected = String(state.settings.overviewWalletId || "wallet:deepseek-official");
	if (selected !== "all") return queryWalletBalance(selected, silent);
	const ignored = new Set(state.walletIgnored || []);
	const eligible = (state.wallets || []).filter((wallet) => !ignored.has(wallet.id) && canAutoCalibrate(wallet));
	if (!eligible.length && !silent) toast("warning", "没有已配置余额接口的钱包");
	const results = [];
	for (const wallet of eligible) results.push(await queryWalletBalance(wallet.id, silent));
	return results;
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
export { saveApiKey as a, queryWalletBalance as i, canAutoCalibrate as n, queryBalance as r, balance_exports as t };
