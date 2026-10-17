import { pn as __exportAll } from "./graphic-BAx7jeh4.js";
//#region src/utils/logger.ts
var logger_exports = /* @__PURE__ */ __exportAll({
	log: () => log,
	toast: () => toast
});
var PREFIX = "[DS]";
var warned = /* @__PURE__ */ new Set();
var debugOn = false;
try {
	debugOn = localStorage.getItem("ds_debug_log") === "1";
} catch {}
var log = {
	debug(...args) {
		if (debugOn) console.log(PREFIX, ...args);
	},
	warn(msg, ...rest) {
		if (warned.has(msg)) return;
		warned.add(msg);
		console.warn(PREFIX, msg, ...rest);
	},
	error(...args) {
		console.error(PREFIX, ...args);
	}
};
function toast(type, msg) {
	try {
		const t = window.parent?.toastr ?? window.toastr;
		if (t?.[type]) {
			t[type](msg);
			return;
		}
	} catch {
		log.debug("toastr 不可用: " + msg);
	}
}
//#endregion
export { logger_exports as n, toast as r, log as t };
