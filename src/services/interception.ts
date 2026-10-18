import { state } from '../store/index';
import { repository } from '../data/repository';
import { log } from '../utils/logger';
import { initConnectionIdentity, resolveRuntimeConnectionContext, type HistoryConnection } from './connection-identity';
import { mergeIncludeUsage } from './include-usage';

let lastMessages: any[] = [];
let lastStart = 0;
let lastFetchUsage: any = null;
let lastFetchModel: string | null = null;
let lastFetchTime = 0;
let lastFetchConnection: HistoryConnection | null = null;
let lastFetchConnectionTime = 0;
let requestSequence = 0;
let lastRequestId: string | null = null;
let lastRequestIdTime = 0;

export function setLastRequest(messages: any[], start: number) {
  lastMessages = messages || [];
  lastStart = start || Date.now();
}

const TARGET_API = '/api/backends/chat-completions/generate';
const STREAM_TEXT_LIMIT = 1_000_000;

// 多数上游在流式响应里默认不返回 usage，必须显式声明 stream_options.include_usage。
// 酒馆自身不发送该参数，服务端也只对 custom 源透传 custom_include_body（YAML 合并进上游请求体），
// 因此这里借该通道补上 include_usage，换取可计费的真实用量；
// 合并逻辑见 include-usage.ts：预设可能把参数写成 JSON，直接字符串追加会让整段 YAML 失效。

/** 应急逃生阀：控制台执行 localStorage.setItem('ds_include_usage','0') 可整体关闭该注入 */
function includeUsageSwitchOn(): boolean {
  try {
    return localStorage.getItem('ds_include_usage') !== '0';
  } catch {
    return true;
  }
}

/** 尝试让上游在流式响应里返回 usage，返回是否改动了请求体 */
function injectIncludeUsage(reqBody: any, source: string | null): boolean {
  try {
    if (!reqBody || typeof reqBody !== 'object') return false;
    if (reqBody.stream !== true) return false;
    if (!includeUsageSwitchOn()) return false;
    if (source !== 'custom') return false;
    const merged = mergeIncludeUsage(reqBody.custom_include_body);
    // 无法安全合并时保持原值：宁可拿不到 usage，也不能破坏预设的请求体参数
    if (!merged.changed) return false;
    reqBody.custom_include_body = merged.value;
    return true;
  } catch {
    return false;
  }
}

function safeRequestSnapshot(body: any, connection: HistoryConnection | null): any {
  if (!body || typeof body !== 'object') return null;
  const keep: any = {};
  for (const key of ['model', 'stream', 'temperature', 'max_tokens', 'top_p', 'stream_options', 'chat_completion_source']) {
    if (body[key] !== undefined) keep[key] = body[key];
  }
  if (connection?.endpointLabel) keep.endpoint = connection.endpointLabel;
  if (Array.isArray(body.messages)) keep.messages_length = body.messages.length;
  return keep;
}

function recentConnection(maxAge = 120000): HistoryConnection | null {
  try {
    if (lastFetchConnection && Date.now() - lastFetchConnectionTime < maxAge && lastFetchConnectionTime >= lastFetchTime) {
      return lastFetchConnection;
    }
    if (lastFetchUsage?.connection && Date.now() - lastFetchTime < maxAge) return lastFetchUsage.connection as HistoryConnection;
  } catch {}
  return null;
}

function recentRequestId(maxAge = 5000): string | null {
  if (lastRequestId && Date.now() - lastRequestIdTime < maxAge) return lastRequestId;
  return null;
}

// 部分厂商（如 GLM）usage 不返回 reasoning_tokens，但 SSE 含 reasoning_content；
// 按思维链/正文的字符占比从 completion_tokens 中估算思维链 token
function estimateThinkTokens(text: string, usage: any) {
  if (!usage || typeof usage !== 'object') return;
  const detail = usage.completion_tokens_details;
  if (detail && typeof detail.reasoning_tokens === 'number' && detail.reasoning_tokens > 0) return;
  let thinkChars = 0, contentChars = 0;
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    let chunk: any;
    try { chunk = JSON.parse(payload); } catch { continue; }
    const d = chunk?.choices?.[0]?.delta;
    if (!d) continue;
    if (typeof d.reasoning_content === 'string') thinkChars += d.reasoning_content.length;
    else if (typeof d.reasoning === 'string') thinkChars += d.reasoning.length;
    if (typeof d.content === 'string') contentChars += d.content.length;
  }
  if (thinkChars > 0) {
    const comp = usage.completion_tokens || usage.output_tokens || 0;
    const total = thinkChars + contentChars;
    usage.__think_tokens_est = total > 0 ? Math.round(comp * (thinkChars / total)) : 0;
  }
}

function installFetchCapture() {
  try {
    const p: any = (window as any).parent || window;
    if (!p || !p.fetch || (p.fetch as any).__aus_patched) {
      return;
    }
    const rawFetch = p.fetch.bind(p);
    const patched: any = function(this: any) {
      const args: any = arguments;
      const url: string = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (typeof url === 'string' && url.indexOf(TARGET_API) !== -1) {
        let reqBody: any = null;
        try { reqBody = JSON.parse(args[1]?.body || 'null'); } catch {}
        const requestConnection = resolveRuntimeConnectionContext(reqBody || {});
        const fullReq = safeRequestSnapshot(reqBody, requestConnection);
        const requestId = `req:${Date.now()}:${++requestSequence}`;
        try {
          lastFetchConnection = requestConnection;
          lastFetchConnectionTime = Date.now();
          lastRequestId = requestId;
          lastRequestIdTime = Date.now();
        } catch {}
        let msgs: any[] = [];
        try { if (reqBody?.messages?.length) msgs = reqBody.messages.slice(-10); } catch {}
        const startTime = Date.now();
        try { lastMessages = msgs; lastStart = startTime; } catch {}
        // 通过 custom_include_body 让上游返回流式 usage；上游若不认这个参数则原样重试
        const injected = injectIncludeUsage(reqBody, (reqBody as any)?.chat_completion_source ?? null);
        const performFetch = (init: any) => rawFetch.apply(p, init);
        const fetchArgs = injected
          ? [args[0], { ...(args[1] as any), body: JSON.stringify(reqBody) }]
          : args;
        return performFetch(fetchArgs).then((firstRes: Response) => {
          if (injected && !firstRes.ok && (firstRes.status === 400 || firstRes.status === 422)) {
            log.debug('上游不接受 include_usage，按原请求重试');
            try { return performFetch(args); } catch { return firstRes; }
          }
          return firstRes;
        }).then((res: Response) => {
          try {
            const clone = res.clone();
            // 请求体未声明流式 → 明确非流式，全程不测速
            const requestedStream = reqBody?.stream === true;
            const parseAndProcess = (text: string, ttftVal: number, thinkTimeVal: number, streamed: boolean | null = null) => {
            let data: any = null;
            let finishReason: string | null = null;
            try {
              const trimmed = text.trim();
              if (trimmed.startsWith('{')) {
                data = JSON.parse(trimmed);
                try { finishReason = (data as any)?.choices?.[0]?.finish_reason ?? null; } catch {}
              } else {
                text.split('\n').forEach((line: string) => {
                  if (line.startsWith('data:')) {
                    const payload = line.slice(5).trim();
                    if (!payload || payload === '[DONE]') return;
                    try {
                      const chunk = JSON.parse(payload);
                      if (chunk.usage) data = chunk;
                      if (!data && chunk.choices?.[0]?.usage) data = { usage: chunk.choices[0].usage, model: chunk.model };
                      const fr = chunk?.choices?.[0]?.finish_reason;
                      if (fr != null) finishReason = fr;
                    } catch {}
                  }
                });
                if (!data || !data.usage) {
                  const m = text.match(/"usage"\s*:\s*(\{[^\}]+\})/);
                  if (m) { try { const u = JSON.parse(m[1]); if (u && typeof u === 'object') data = { usage: u, model: data?.model }; } catch {} }
                }
              }
            } catch (e) {
              log.debug('用量响应解析失败', (e as any)?.message || e);
              return;
            }
            if (data && data.usage) {
              const model = (data as any)?.model || reqBody?.model || fullReq?.model || lastFetchModel || 'deepseek-v4-flash';
              const usage = (data as any).usage;
              // 将 finish_reason 挂到 usage 以便 repository 统一处理
              try { if (finishReason) (usage as any).__finish_reason = finishReason; } catch {}
              try { estimateThinkTokens(text, usage); } catch {}
              // 完整响应文本（非流式为完整 JSON，流式为 SSE 原文）供历史详情展示
              lastFetchUsage = { usage, model, msgs, startTime, fullReq, fullResponse: text, ttft: ttftVal, thinkTime: thinkTimeVal, finishReason, streamed, connection: requestConnection, requestId };
              lastFetchModel = typeof model === 'string' ? model : null;
              lastFetchTime = Date.now();
              log.debug('fetch 捕获 usage', { model, hasUsage: !!usage, finishReason, streamed });
              try { processUsage(usage, model, msgs, startTime, fullReq, text, ttftVal, thinkTimeVal, finishReason, requestConnection, requestId, streamed); } catch (e) { log.error('fetch 用量记录失败 ' + ((e as any)?.message || e)); }
            }
          };
          // 流式测量 TTFT 与思维链耗时：后台消费 clone 的 body 流，不阻塞原始响应透传
          try {
            const t0 = (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
            const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
            let ttft = 0;
            let thinkStart = 0, thinkEnd = 0;
            let fullText = '';
            // 假流式检测：统计承载正文的增量帧数
            let contentFrames = 0;
            const judgeStreamed = (): boolean | null => {
              // 请求未声明流式：明确非流式
              if (!requestedStream) return false;
              // 未观测到正文帧（可能是纯 usage 帧或异常响应）：未知，交给数值兜底
              if (!contentFrames) return null;
              // 真正的流式会持续吐出多帧正文；只有一帧说明上游一次性返回全文
              return contentFrames > 1;
            };
            const finish = () => { try { parseAndProcess(fullText, ttft, thinkEnd && thinkStart ? thinkEnd - thinkStart : 0, judgeStreamed()); } catch {} };
            const scanThink = (chunk: string) => {
              for (const line of chunk.split('\n')) {
                if (!line.startsWith('data:')) continue;
                const payload = line.slice(5).trim();
                if (!payload || payload === '[DONE]') continue;
                if (!thinkStart && line.indexOf('"reasoning_content"') !== -1) thinkStart = nowMs() - t0;
                if (thinkStart && !thinkEnd && line.indexOf('"content"') !== -1) thinkEnd = nowMs() - t0;
                if (line.indexOf('"content"') !== -1 || line.indexOf('"reasoning_content"') !== -1) contentFrames++;
              }
            };
            const readStream = async (body: ReadableStream<Uint8Array>) => {
              const reader = body.getReader();
              const dec = new TextDecoder();
              let first = true, buf = '';
              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                // 首字延迟：相对请求发出时刻（startTime），而非 clone 流开始读取时刻
                if (first && value && value.byteLength) { ttft = Date.now() - startTime; first = false; }
                const piece = dec.decode(value, { stream: true });
                fullText += piece; buf += piece;
                if (fullText.length > STREAM_TEXT_LIMIT) fullText = fullText.slice(-STREAM_TEXT_LIMIT);
                const nl = buf.lastIndexOf('\n');
                if (nl !== -1) {
                  const lines = buf.slice(0, nl); buf = buf.slice(nl + 1);
                  scanThink(lines);
                }
              }
              if (buf) scanThink(buf);
              finish();
            };
            const streamBody = (clone.body as ReadableStream<Uint8Array> | null);
            if (streamBody && typeof (streamBody as any).getReader === 'function') {
              readStream(streamBody).catch(() => { try { finish(); } catch {} });
            } else {
              // 无流式 body：整段文本一次性读取，明确非流式
              clone.text().then((t) => { ttft = Date.now() - startTime; parseAndProcess(t, ttft, 0, false); }).catch(()=>{});
            }
          } catch (innerErr) {
            log.debug('fetch 流式读取异常，不影响原请求', (innerErr as any)?.message || innerErr);
            try { clone.text().then((t) => { parseAndProcess(t, 0, 0, requestedStream ? null : false); }).catch(()=>{}); } catch {}
          }
          } catch (e) {
            log.debug('fetch 克隆解析异常，不影响原请求', (e as any)?.message || e);
          }
          return res;
        }).catch((e: any) => { throw e; });
      }
      return rawFetch.apply(p, args);
    };
    patched.__aus_patched = true;
    p.fetch = patched;
    log.debug('fetch 捕获已安装 TARGET_API=' + TARGET_API);
  } catch {}
}

let interceptionInstalled = false;
let rawFetchRef: any = null;
let messageReceivedHandler: any = null;

export function installInterception() {
  try {
    try { initConnectionIdentity(); } catch {}
    const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
    const es = ctx?.eventSource;
    const et = ctx?.event_types;
    if (!es || !et) {
      return false;
    }
    if (interceptionInstalled) {
      return true;
    }
    try {
      const p: any = (window as any).parent || window;
      if (p?.fetch && !(p.fetch as any).__aus_patched) rawFetchRef = p.fetch.bind(p);
    } catch {}
    es.on(et.GENERATION_ENDED, onGenerationEnded);
    messageReceivedHandler = () => setTimeout(refresh, 400);
    es.on(et.MESSAGE_RECEIVED, messageReceivedHandler);
    (globalThis as any).ApiUsageStatInterceptor = (chat: any[], _ctxSize: number, _abort: any, _type: string) => {
      try { setLastRequest(chat?.slice(-10) || [], Date.now()); } catch {}
    };
    try { installFetchCapture(); } catch {}
    interceptionInstalled = true;
    return true;
  } catch { return false; }
}

export function uninstallInterception() {
  try {
    const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
    const es = ctx?.eventSource;
    const et = ctx?.event_types;
    if (es && et && messageReceivedHandler) {
      try { es.off?.(et.GENERATION_ENDED, onGenerationEnded); } catch {}
      try { es.off?.(et.MESSAGE_RECEIVED, messageReceivedHandler); } catch {}
    }
    try {
      const p: any = (window as any).parent || window;
      if (p && rawFetchRef && (p.fetch as any).__aus_patched) {
        p.fetch = rawFetchRef;
      }
    } catch {}
    interceptionInstalled = false;
  } catch {}
}

function isValidUsage(u: any): boolean {
  if (!u || typeof u !== 'object' || Array.isArray(u)) return false;
  return (
    typeof u.prompt_tokens === 'number' ||
    typeof u.completion_tokens === 'number' ||
    typeof u.total_tokens === 'number' ||
    typeof u.input_tokens === 'number' ||
    typeof u.output_tokens === 'number' ||
    typeof u.prompt_cache_hit_tokens === 'number' ||
    typeof u.cached_tokens === 'number' ||
    (u.prompt_tokens_details && typeof u.prompt_tokens_details.cached_tokens === 'number')
  );
}

function pickUsageFromExtra(extra: any): any {
  if (!extra || typeof extra !== 'object') return null;
  const candidates = [
    extra.api_usage,
    extra.usage,
    extra.openai_usage,
    extra.token_usage,
    extra.data?.usage,
    extra.response?.usage,
  ];
  for (const c of candidates) {
    if (isValidUsage(c)) return c;
  }
  if (isValidUsage(extra)) return extra;
  return null;
}

function onGenerationEnded(...args: any[]) {
  try {
    const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
    const chat: any[] = ctx?.chat || [];
    const tail = chat[chat.length - 1];
    const extra = tail?.extra || {};
    const tailModel = (tail as any)?.model || null;
    const extraModel = extra.model || tailModel || ctx?.model || 'deepseek-v4-flash';
    log.debug('onGenerationEnded 触发', { chatLen: chat.length, hasApiUsage: !!extra.api_usage });
    let usage = pickUsageFromExtra(extra);
    let model = extraModel;
    log.debug('pickUsageFromExtra 结果', { hasUsage: !!usage, isValid: usage ? isValidUsage(usage) : false });
    if (usage && isValidUsage(usage)) {
      log.debug('命中主路径 extra usage');
      // 主路径也尝试携带最近 fetch 的 TTFT/思维链/截断信息（fetch 已在后台流式测量）
      let ttft = 0, think = 0, streamed: boolean | null = null, fr: string | null = (usage as any)?.__finish_reason ?? (usage as any)?.finish_reason ?? null;
      try {
        const fp: any = lastFetchUsage;
        if (fp && Date.now() - lastFetchTime < 5000) {
          if (!ttft) ttft = fp.ttft || 0;
          if (!think) think = fp.thinkTime || 0;
          if (!fr) fr = fp.finishReason ?? null;
          if (fp.streamed != null) streamed = fp.streamed;
          // 尝试从 tail SSE 最后一个 chunk 补 finish_reason（若 usage 未带）
          if (!fr) {
            try {
              const extraFr = (extra as any)?.finish_reason ?? (tail as any)?.finish_reason ?? null;
              if (extraFr) fr = extraFr;
            } catch {}
          }
        }
      } catch {}
      processUsage(usage, model, lastMessages, lastStart, null, null, ttft, think, fr, recentConnection(5000), recentRequestId(), streamed);
      lastFetchUsage = null;
      return;
    }
    if (tail?.swipe_info && typeof tail.swipe_info === 'object') {
      log.debug('尝试 swipe_info 路径');
      for (const v of Object.values(tail.swipe_info as any)) {
        const cand = (v as any)?.extra?.api_usage || (v as any)?.extra?.usage;
        if (isValidUsage(cand)) {
          usage = cand;
          model = (v as any)?.extra?.model || model;
          log.debug('swipe_info 命中', { model });
          let ttft = 0, think = 0, streamed: boolean | null = null, fr: string | null = (cand as any)?.__finish_reason ?? null;
          try { const fp:any=lastFetchUsage; if (fp && Date.now()-lastFetchTime<5000){ ttft=fp.ttft||0; think=fp.thinkTime||0; if(!fr) fr=fp.finishReason??null; if (fp.streamed != null) streamed = fp.streamed; } } catch {}
          processUsage(usage, model, lastMessages, lastStart, null, null, ttft, think, fr, recentConnection(5000), recentRequestId(), streamed);
          lastFetchUsage = null;
          return;
        }
      }
      log.debug('swipe_info 未命中有效 usage');
    }
    const maybeUsage = args[0]?.usage || args[0]?.api_usage;
    log.debug('尝试 args 兜底', { hasMaybeUsage: !!maybeUsage, isValid: maybeUsage ? isValidUsage(maybeUsage) : false });
    if (isValidUsage(maybeUsage)) {
      const m = args[0]?.model || model;
      log.debug('args 命中', { model: m });
      let ttft = 0, think = 0, streamed: boolean | null = null, fr: string | null = (maybeUsage as any)?.__finish_reason ?? null;
      try { const fp:any=lastFetchUsage; if (fp && Date.now()-lastFetchTime<5000){ ttft=fp.ttft||0; think=fp.thinkTime||0; if(!fr) fr=fp.finishReason??null; if (fp.streamed != null) streamed = fp.streamed; } } catch {}
      processUsage(maybeUsage, m, lastMessages, lastStart, null, null, ttft, think, fr, recentConnection(5000), recentRequestId(), streamed);
      lastFetchUsage = null;
      return;
    }
    {
      let fetchPack: any = lastFetchUsage as any;
      let fetchUsage = fetchPack && fetchPack.usage ? fetchPack.usage : fetchPack;
      if (fetchUsage && isValidUsage(fetchUsage) && Date.now() - lastFetchTime < 120000) {
        const fetchedModel = (fetchPack && fetchPack.model) || lastFetchModel || model;
        const fetchedMsgs = (fetchPack && fetchPack.msgs) || lastMessages;
        const fetchedStart = (fetchPack && fetchPack.startTime) || lastStart;
        const fetchedReq = (fetchPack && fetchPack.fullReq) || null;
        const fetchedRes = (fetchPack && fetchPack.fullResponse) || null;
        const fTtft = (fetchPack && fetchPack.ttft) || 0;
        const fThink = (fetchPack && fetchPack.thinkTime) || 0;
        const fFr = (fetchPack && fetchPack.finishReason) || (fetchUsage as any)?.__finish_reason || null;
        const fStreamed: boolean | null = fetchPack && fetchPack.streamed != null ? fetchPack.streamed : null;
        log.debug('fetch 兜底命中', { model: fetchedModel });
        lastFetchUsage = null;
        processUsage(fetchUsage, fetchedModel, fetchedMsgs, fetchedStart, fetchedReq, fetchedRes, fTtft, fThink, fFr, fetchPack?.connection || recentConnection(), fetchPack?.requestId || recentRequestId(120000), fStreamed);
        return;
      } else if (lastFetchUsage) {
        const fu = fetchPack && fetchPack.usage ? fetchPack.usage : fetchPack;
        log.debug('fetch 有缓存但无效或超时', { has: !!lastFetchUsage, isValid: fu ? isValidUsage(fu) : false, age: Date.now() - lastFetchTime });
      }
    }
    if (extra.token_count != null && !usage) {
      log.debug('跳过无效 usage：仅有本地 token_count=' + extra.token_count + ' model=' + model);
      return;
    }
    log.debug('未找到任何有效 usage，丢弃本次记录');
  } catch (e) {
    log.error('onGenerationEnded 异常 ' + (e as any)?.message || e);
  }
}

function refresh() {
  try { (globalThis as any).ApiUsageStat?.refreshUI?.(); } catch {}
}

export function processUsage(usage: any, model: string, messages: any[], startTime: number, fullRequest: any = null, fullResponse: any = null, ttft = 0, thinkTime = 0, finishReason: string | null = null, connection: HistoryConnection | null = null, requestId: string | null = null, streamed: boolean | null = null) {
  // 主路径 usage 多来自 ST，可能缺 reasoning_tokens；从最近 fetch 的估算值补上
  try {
    const fp: any = lastFetchUsage;
    if (fp?.usage && Date.now() - lastFetchTime < 5000) {
      const est = (fp.usage as any).__think_tokens_est;
      const hasReal = usage?.completion_tokens_details && typeof usage.completion_tokens_details.reasoning_tokens === 'number' && usage.completion_tokens_details.reasoning_tokens > 0;
      if (est && !hasReal && !(usage as any)?.__think_tokens_est) (usage as any).__think_tokens_est = est;
    }
  } catch {}
  repository.addEntry(usage, model, messages, startTime, fullRequest, fullResponse, ttft, thinkTime, finishReason, connection, requestId, streamed);
  refresh();
}

export function recalcAllCosts(): Promise<void> {
  return repository.recalcAll();
}
