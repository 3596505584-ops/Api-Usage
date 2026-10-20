import { pn as __exportAll } from "./graphic-BAx7jeh4.js";
import { t as log } from "./logger-8RGXnvfI.js";
import { O as initConnectionIdentity, k as resolveRuntimeConnectionContext, t as repository } from "./repository-JvxNaSRi.js";
//#region src/services/include-usage.ts
/**
* 流式 usage 注入的纯逻辑：把 stream_options.include_usage 合并进用户/预设自定义的请求体参数。
*
* 背景：酒馆只对 custom 源透传 custom_include_body（YAML 合并进上游请求体），
* 且服务端 mergeObjectWithYaml 解析失败时会静默丢弃整段参数。
* 因此这里不能做简单字符串拼接——预设完全可能把参数写成 JSON（如 `{"thinking":{"type":"disabled"}}`），
* 在 JSON 后追加块状 YAML 会得到非法文档，导致预设自己的参数（例如关闭原生思考）一起失效。
*
* 规则：
* - 空值直接写入 YAML；
* - 顶层是 JSON/flow 对象时，用 JSON 解析后合并再序列化，保持合法；
* - 无法安全解析的 flow 写法（非 JSON）、数组/列表、已有 stream_options、文档结束标记一律不介入；
* - 顶层是块状映射时才允许追加 YAML 键。
*/
var INCLUDE_USAGE_YAML = "stream_options:\n  include_usage: true";
var INCLUDE_USAGE_OBJECT = { include_usage: true };
/** 跳过开头的空行、注释行与 YAML 文档起始标记，返回第一个内容字符的下标 */
function contentStart(text) {
	let offset = 0;
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (trimmed === "" || trimmed.startsWith("#") || trimmed === "---") {
			offset += line.length + 1;
			continue;
		}
		return offset + (line.length - line.trimStart().length);
	}
	return text.length;
}
function hasOwn(obj, key) {
	return !!obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, key);
}
/**
* 返回合并后的 custom_include_body 字符串。
* changed=false 时调用方必须保持原值不变（宁可拿不到 usage，也不能破坏预设参数）。
*/
function mergeIncludeUsage(raw) {
	const current = String(raw ?? "").trim();
	if (!current) return {
		changed: true,
		value: `${INCLUDE_USAGE_YAML}\n`
	};
	const head = current.slice(contentStart(current));
	if (!head) return {
		changed: false,
		value: current
	};
	if (head.startsWith("{")) try {
		const parsed = JSON.parse(head);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {
			changed: false,
			value: current
		};
		if (hasOwn(parsed, "stream_options")) return {
			changed: false,
			value: current
		};
		parsed.stream_options = { ...INCLUDE_USAGE_OBJECT };
		return {
			changed: true,
			value: JSON.stringify(parsed)
		};
	} catch {
		return {
			changed: false,
			value: current
		};
	}
	if (head.startsWith("[") || head.startsWith("-")) return {
		changed: false,
		value: current
	};
	if (/(^|\n)\s*stream_options\s*:/.test(current)) return {
		changed: false,
		value: current
	};
	if (/(^|\n)\s*\.\.\.\s*(\n|$)/.test(current)) return {
		changed: false,
		value: current
	};
	return {
		changed: true,
		value: `${current}\n${INCLUDE_USAGE_YAML}\n`
	};
}
//#endregion
//#region src/services/interception.ts
var interception_exports = /* @__PURE__ */ __exportAll({
	installInterception: () => installInterception,
	processUsage: () => processUsage,
	recalcAllCosts: () => recalcAllCosts,
	setLastRequest: () => setLastRequest,
	uninstallInterception: () => uninstallInterception
});
var lastMessages = [];
var lastStart = 0;
var lastFetchUsage = null;
var lastFetchModel = null;
var lastFetchTime = 0;
var lastFetchConnection = null;
var lastFetchConnectionTime = 0;
var requestSequence = 0;
var lastRequestId = null;
var lastRequestIdTime = 0;
function setLastRequest(messages, start) {
	lastMessages = messages || [];
	lastStart = start || Date.now();
}
var TARGET_API = "/api/backends/chat-completions/generate";
var STREAM_TEXT_LIMIT = 1e6;
/** 应急逃生阀：控制台执行 localStorage.setItem('ds_include_usage','0') 可整体关闭该注入 */
function includeUsageSwitchOn() {
	try {
		return localStorage.getItem("ds_include_usage") !== "0";
	} catch {
		return true;
	}
}
/** 尝试让上游在流式响应里返回 usage，返回是否改动了请求体 */
function injectIncludeUsage(reqBody, source) {
	try {
		if (!reqBody || typeof reqBody !== "object") return false;
		if (reqBody.stream !== true) return false;
		if (!includeUsageSwitchOn()) return false;
		if (source !== "custom") return false;
		const merged = mergeIncludeUsage(reqBody.custom_include_body);
		if (!merged.changed) return false;
		reqBody.custom_include_body = merged.value;
		return true;
	} catch {
		return false;
	}
}
function safeRequestSnapshot(body, connection) {
	if (!body || typeof body !== "object") return null;
	const keep = {};
	for (const key of [
		"model",
		"stream",
		"temperature",
		"max_tokens",
		"top_p",
		"stream_options",
		"chat_completion_source"
	]) if (body[key] !== void 0) keep[key] = body[key];
	if (connection?.endpointLabel) keep.endpoint = connection.endpointLabel;
	if (Array.isArray(body.messages)) keep.messages_length = body.messages.length;
	return keep;
}
function recentConnection(maxAge = 12e4) {
	try {
		if (lastFetchConnection && Date.now() - lastFetchConnectionTime < maxAge && lastFetchConnectionTime >= lastFetchTime) return lastFetchConnection;
		if (lastFetchUsage?.connection && Date.now() - lastFetchTime < maxAge) return lastFetchUsage.connection;
	} catch {}
	return null;
}
function recentRequestId(maxAge = 5e3) {
	if (lastRequestId && Date.now() - lastRequestIdTime < maxAge) return lastRequestId;
	return null;
}
function estimateThinkTokens(text, usage) {
	if (!usage || typeof usage !== "object") return;
	const detail = usage.completion_tokens_details;
	if (detail && typeof detail.reasoning_tokens === "number" && detail.reasoning_tokens > 0) return;
	let thinkChars = 0, contentChars = 0;
	for (const raw of String(text || "").split("\n")) {
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
		const d = chunk?.choices?.[0]?.delta;
		if (!d) continue;
		if (typeof d.reasoning_content === "string") thinkChars += d.reasoning_content.length;
		else if (typeof d.reasoning === "string") thinkChars += d.reasoning.length;
		if (typeof d.content === "string") contentChars += d.content.length;
	}
	if (thinkChars > 0) {
		const comp = usage.completion_tokens || usage.output_tokens || 0;
		const total = thinkChars + contentChars;
		usage.__think_tokens_est = total > 0 ? Math.round(comp * (thinkChars / total)) : 0;
	}
}
function installFetchCapture() {
	try {
		const p = window.parent || window;
		if (!p || !p.fetch || p.fetch.__aus_patched) return;
		const rawFetch = p.fetch.bind(p);
		const patched = function() {
			const args = arguments;
			const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
			if (typeof url === "string" && url.indexOf(TARGET_API) !== -1) {
				let reqBody = null;
				try {
					reqBody = JSON.parse(args[1]?.body || "null");
				} catch {}
				const requestConnection = resolveRuntimeConnectionContext(reqBody || {});
				const fullReq = safeRequestSnapshot(reqBody, requestConnection);
				const requestId = `req:${Date.now()}:${++requestSequence}`;
				try {
					lastFetchConnection = requestConnection;
					lastFetchConnectionTime = Date.now();
					lastRequestId = requestId;
					lastRequestIdTime = Date.now();
				} catch {}
				let msgs = [];
				try {
					if (reqBody?.messages?.length) msgs = reqBody.messages.slice(-10);
				} catch {}
				const startTime = Date.now();
				try {
					lastMessages = msgs;
					lastStart = startTime;
				} catch {}
				const injected = injectIncludeUsage(reqBody, reqBody?.chat_completion_source ?? null);
				const performFetch = (init) => rawFetch.apply(p, init);
				return performFetch(injected ? [args[0], {
					...args[1],
					body: JSON.stringify(reqBody)
				}] : args).then((firstRes) => {
					if (injected && !firstRes.ok && (firstRes.status === 400 || firstRes.status === 422)) {
						log.debug("上游不接受 include_usage，按原请求重试");
						try {
							return performFetch(args);
						} catch {
							return firstRes;
						}
					}
					return firstRes;
				}).then((res) => {
					try {
						const clone = res.clone();
						const requestedStream = reqBody?.stream === true;
						const parseAndProcess = (text, ttftVal, thinkTimeVal, streamed = null) => {
							let data = null;
							let finishReason = null;
							try {
								const trimmed = text.trim();
								if (trimmed.startsWith("{")) {
									data = JSON.parse(trimmed);
									try {
										finishReason = data?.choices?.[0]?.finish_reason ?? null;
									} catch {}
								} else {
									text.split("\n").forEach((line) => {
										if (line.startsWith("data:")) {
											const payload = line.slice(5).trim();
											if (!payload || payload === "[DONE]") return;
											try {
												const chunk = JSON.parse(payload);
												if (chunk.usage) data = chunk;
												if (!data && chunk.choices?.[0]?.usage) data = {
													usage: chunk.choices[0].usage,
													model: chunk.model
												};
												const fr = chunk?.choices?.[0]?.finish_reason;
												if (fr != null) finishReason = fr;
											} catch {}
										}
									});
									if (!data || !data.usage) {
										const m = text.match(/"usage"\s*:\s*(\{[^\}]+\})/);
										if (m) try {
											const u = JSON.parse(m[1]);
											if (u && typeof u === "object") data = {
												usage: u,
												model: data?.model
											};
										} catch {}
									}
								}
							} catch (e) {
								log.debug("用量响应解析失败", e?.message || e);
								return;
							}
							if (data && data.usage) {
								const model = data?.model || reqBody?.model || fullReq?.model || lastFetchModel || "deepseek-v4-flash";
								const usage = data.usage;
								try {
									if (finishReason) usage.__finish_reason = finishReason;
								} catch {}
								try {
									estimateThinkTokens(text, usage);
								} catch {}
								lastFetchUsage = {
									usage,
									model,
									msgs,
									startTime,
									fullReq,
									fullResponse: text,
									ttft: ttftVal,
									thinkTime: thinkTimeVal,
									finishReason,
									streamed,
									connection: requestConnection,
									requestId
								};
								lastFetchModel = typeof model === "string" ? model : null;
								lastFetchTime = Date.now();
								log.debug("fetch 捕获 usage", {
									model,
									hasUsage: !!usage,
									finishReason,
									streamed
								});
								try {
									processUsage(usage, model, msgs, startTime, fullReq, text, ttftVal, thinkTimeVal, finishReason, requestConnection, requestId, streamed);
								} catch (e) {
									log.error("fetch 用量记录失败 " + (e?.message || e));
								}
							}
						};
						try {
							const t0 = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
							const nowMs = () => typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
							let ttft = 0;
							let thinkStart = 0, thinkEnd = 0;
							let fullText = "";
							let contentFrames = 0;
							const judgeStreamed = () => {
								if (!requestedStream) return false;
								if (!contentFrames) return null;
								return contentFrames > 1;
							};
							const finish = () => {
								try {
									parseAndProcess(fullText, ttft, thinkEnd && thinkStart ? thinkEnd - thinkStart : 0, judgeStreamed());
								} catch {}
							};
							const scanThink = (chunk) => {
								for (const line of chunk.split("\n")) {
									if (!line.startsWith("data:")) continue;
									const payload = line.slice(5).trim();
									if (!payload || payload === "[DONE]") continue;
									if (!thinkStart && line.indexOf("\"reasoning_content\"") !== -1) thinkStart = nowMs() - t0;
									if (thinkStart && !thinkEnd && line.indexOf("\"content\"") !== -1) thinkEnd = nowMs() - t0;
									if (line.indexOf("\"content\"") !== -1 || line.indexOf("\"reasoning_content\"") !== -1) contentFrames++;
								}
							};
							const readStream = async (body) => {
								const reader = body.getReader();
								const dec = new TextDecoder();
								let first = true, buf = "";
								for (;;) {
									const { done, value } = await reader.read();
									if (done) break;
									if (first && value && value.byteLength) {
										ttft = Date.now() - startTime;
										first = false;
									}
									const piece = dec.decode(value, { stream: true });
									fullText += piece;
									buf += piece;
									if (fullText.length > STREAM_TEXT_LIMIT) fullText = fullText.slice(-1e6);
									const nl = buf.lastIndexOf("\n");
									if (nl !== -1) {
										const lines = buf.slice(0, nl);
										buf = buf.slice(nl + 1);
										scanThink(lines);
									}
								}
								if (buf) scanThink(buf);
								finish();
							};
							const streamBody = clone.body;
							if (streamBody && typeof streamBody.getReader === "function") readStream(streamBody).catch(() => {
								try {
									finish();
								} catch {}
							});
							else clone.text().then((t) => {
								ttft = Date.now() - startTime;
								parseAndProcess(t, ttft, 0, false);
							}).catch(() => {});
						} catch (innerErr) {
							log.debug("fetch 流式读取异常，不影响原请求", innerErr?.message || innerErr);
							try {
								clone.text().then((t) => {
									parseAndProcess(t, 0, 0, requestedStream ? null : false);
								}).catch(() => {});
							} catch {}
						}
					} catch (e) {
						log.debug("fetch 克隆解析异常，不影响原请求", e?.message || e);
					}
					return res;
				}).catch((e) => {
					throw e;
				});
			}
			return rawFetch.apply(p, args);
		};
		patched.__aus_patched = true;
		p.fetch = patched;
		log.debug("fetch 捕获已安装 TARGET_API=" + TARGET_API);
	} catch {}
}
var interceptionInstalled = false;
var rawFetchRef = null;
var messageReceivedHandler = null;
function installInterception() {
	try {
		try {
			initConnectionIdentity();
		} catch {}
		const ctx = globalThis.SillyTavern?.getContext?.();
		const es = ctx?.eventSource;
		const et = ctx?.event_types;
		if (!es || !et) return false;
		if (interceptionInstalled) return true;
		try {
			const p = window.parent || window;
			if (p?.fetch && !p.fetch.__aus_patched) rawFetchRef = p.fetch.bind(p);
		} catch {}
		es.on(et.GENERATION_ENDED, onGenerationEnded);
		messageReceivedHandler = () => setTimeout(refresh, 400);
		es.on(et.MESSAGE_RECEIVED, messageReceivedHandler);
		globalThis.ApiUsageStatInterceptor = (chat, _ctxSize, _abort, _type) => {
			try {
				setLastRequest(chat?.slice(-10) || [], Date.now());
			} catch {}
		};
		try {
			installFetchCapture();
		} catch {}
		interceptionInstalled = true;
		return true;
	} catch {
		return false;
	}
}
function uninstallInterception() {
	try {
		const ctx = globalThis.SillyTavern?.getContext?.();
		const es = ctx?.eventSource;
		const et = ctx?.event_types;
		if (es && et && messageReceivedHandler) {
			try {
				es.off?.(et.GENERATION_ENDED, onGenerationEnded);
			} catch {}
			try {
				es.off?.(et.MESSAGE_RECEIVED, messageReceivedHandler);
			} catch {}
		}
		try {
			const p = window.parent || window;
			if (p && rawFetchRef && p.fetch.__aus_patched) p.fetch = rawFetchRef;
		} catch {}
		interceptionInstalled = false;
	} catch {}
}
function isValidUsage(u) {
	if (!u || typeof u !== "object" || Array.isArray(u)) return false;
	return typeof u.prompt_tokens === "number" || typeof u.completion_tokens === "number" || typeof u.total_tokens === "number" || typeof u.input_tokens === "number" || typeof u.output_tokens === "number" || typeof u.prompt_cache_hit_tokens === "number" || typeof u.cached_tokens === "number" || u.prompt_tokens_details && typeof u.prompt_tokens_details.cached_tokens === "number";
}
function pickUsageFromExtra(extra) {
	if (!extra || typeof extra !== "object") return null;
	const candidates = [
		extra.api_usage,
		extra.usage,
		extra.openai_usage,
		extra.token_usage,
		extra.data?.usage,
		extra.response?.usage
	];
	for (const c of candidates) if (isValidUsage(c)) return c;
	if (isValidUsage(extra)) return extra;
	return null;
}
function onGenerationEnded(...args) {
	try {
		const ctx = globalThis.SillyTavern?.getContext?.();
		const chat = ctx?.chat || [];
		const tail = chat[chat.length - 1];
		const extra = tail?.extra || {};
		const tailModel = tail?.model || null;
		const extraModel = extra.model || tailModel || ctx?.model || "deepseek-v4-flash";
		log.debug("onGenerationEnded 触发", {
			chatLen: chat.length,
			hasApiUsage: !!extra.api_usage
		});
		let usage = pickUsageFromExtra(extra);
		let model = extraModel;
		log.debug("pickUsageFromExtra 结果", {
			hasUsage: !!usage,
			isValid: usage ? isValidUsage(usage) : false
		});
		if (usage && isValidUsage(usage)) {
			log.debug("命中主路径 extra usage");
			let ttft = 0, think = 0, streamed = null, fr = usage?.__finish_reason ?? usage?.finish_reason ?? null;
			try {
				const fp = lastFetchUsage;
				if (fp && Date.now() - lastFetchTime < 5e3) {
					if (!ttft) ttft = fp.ttft || 0;
					if (!think) think = fp.thinkTime || 0;
					if (!fr) fr = fp.finishReason ?? null;
					if (fp.streamed != null) streamed = fp.streamed;
					if (!fr) try {
						const extraFr = extra?.finish_reason ?? tail?.finish_reason ?? null;
						if (extraFr) fr = extraFr;
					} catch {}
				}
			} catch {}
			processUsage(usage, model, lastMessages, lastStart, null, null, ttft, think, fr, recentConnection(5e3), recentRequestId(), streamed);
			lastFetchUsage = null;
			return;
		}
		if (tail?.swipe_info && typeof tail.swipe_info === "object") {
			log.debug("尝试 swipe_info 路径");
			for (const v of Object.values(tail.swipe_info)) {
				const cand = v?.extra?.api_usage || v?.extra?.usage;
				if (isValidUsage(cand)) {
					usage = cand;
					model = v?.extra?.model || model;
					log.debug("swipe_info 命中", { model });
					let ttft = 0, think = 0, streamed = null, fr = cand?.__finish_reason ?? null;
					try {
						const fp = lastFetchUsage;
						if (fp && Date.now() - lastFetchTime < 5e3) {
							ttft = fp.ttft || 0;
							think = fp.thinkTime || 0;
							if (!fr) fr = fp.finishReason ?? null;
							if (fp.streamed != null) streamed = fp.streamed;
						}
					} catch {}
					processUsage(usage, model, lastMessages, lastStart, null, null, ttft, think, fr, recentConnection(5e3), recentRequestId(), streamed);
					lastFetchUsage = null;
					return;
				}
			}
			log.debug("swipe_info 未命中有效 usage");
		}
		const maybeUsage = args[0]?.usage || args[0]?.api_usage;
		log.debug("尝试 args 兜底", {
			hasMaybeUsage: !!maybeUsage,
			isValid: maybeUsage ? isValidUsage(maybeUsage) : false
		});
		if (isValidUsage(maybeUsage)) {
			const m = args[0]?.model || model;
			log.debug("args 命中", { model: m });
			let ttft = 0, think = 0, streamed = null, fr = maybeUsage?.__finish_reason ?? null;
			try {
				const fp = lastFetchUsage;
				if (fp && Date.now() - lastFetchTime < 5e3) {
					ttft = fp.ttft || 0;
					think = fp.thinkTime || 0;
					if (!fr) fr = fp.finishReason ?? null;
					if (fp.streamed != null) streamed = fp.streamed;
				}
			} catch {}
			processUsage(maybeUsage, m, lastMessages, lastStart, null, null, ttft, think, fr, recentConnection(5e3), recentRequestId(), streamed);
			lastFetchUsage = null;
			return;
		}
		{
			let fetchPack = lastFetchUsage;
			let fetchUsage = fetchPack && fetchPack.usage ? fetchPack.usage : fetchPack;
			if (fetchUsage && isValidUsage(fetchUsage) && Date.now() - lastFetchTime < 12e4) {
				const fetchedModel = fetchPack && fetchPack.model || lastFetchModel || model;
				const fetchedMsgs = fetchPack && fetchPack.msgs || lastMessages;
				const fetchedStart = fetchPack && fetchPack.startTime || lastStart;
				const fetchedReq = fetchPack && fetchPack.fullReq || null;
				const fetchedRes = fetchPack && fetchPack.fullResponse || null;
				const fTtft = fetchPack && fetchPack.ttft || 0;
				const fThink = fetchPack && fetchPack.thinkTime || 0;
				const fFr = fetchPack && fetchPack.finishReason || fetchUsage?.__finish_reason || null;
				const fStreamed = fetchPack && fetchPack.streamed != null ? fetchPack.streamed : null;
				log.debug("fetch 兜底命中", { model: fetchedModel });
				lastFetchUsage = null;
				processUsage(fetchUsage, fetchedModel, fetchedMsgs, fetchedStart, fetchedReq, fetchedRes, fTtft, fThink, fFr, fetchPack?.connection || recentConnection(), fetchPack?.requestId || recentRequestId(12e4), fStreamed);
				return;
			} else if (lastFetchUsage) {
				const fu = fetchPack && fetchPack.usage ? fetchPack.usage : fetchPack;
				log.debug("fetch 有缓存但无效或超时", {
					has: !!lastFetchUsage,
					isValid: fu ? isValidUsage(fu) : false,
					age: Date.now() - lastFetchTime
				});
			}
		}
		if (extra.token_count != null && !usage) {
			log.debug("跳过无效 usage：仅有本地 token_count=" + extra.token_count + " model=" + model);
			return;
		}
		log.debug("未找到任何有效 usage，丢弃本次记录");
	} catch (e) {
		log.error("onGenerationEnded 异常 " + e?.message || e);
	}
}
function refresh() {
	try {
		globalThis.ApiUsageStat?.refreshUI?.();
	} catch {}
}
function processUsage(usage, model, messages, startTime, fullRequest = null, fullResponse = null, ttft = 0, thinkTime = 0, finishReason = null, connection = null, requestId = null, streamed = null) {
	try {
		const fp = lastFetchUsage;
		if (fp?.usage && Date.now() - lastFetchTime < 5e3) {
			const est = fp.usage.__think_tokens_est;
			const hasReal = usage?.completion_tokens_details && typeof usage.completion_tokens_details.reasoning_tokens === "number" && usage.completion_tokens_details.reasoning_tokens > 0;
			if (est && !hasReal && !usage?.__think_tokens_est) usage.__think_tokens_est = est;
		}
	} catch {}
	repository.addEntry(usage, model, messages, startTime, fullRequest, fullResponse, ttft, thinkTime, finishReason, connection, requestId, streamed);
	refresh();
}
function recalcAllCosts() {
	return repository.recalcAll();
}
//#endregion
export { interception_exports as n, recalcAllCosts as r, installInterception as t };
