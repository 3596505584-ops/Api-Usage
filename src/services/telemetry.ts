/**
 * 匿名使用统计（客户端）
 *
 * 设计要点：
 * - 只在本地内存累加事件，面板关闭或页面隐藏时才合并成一次上报，避免频繁消耗免费额度；
 * - 上报体经 text/plain 发出（跨域简单请求，不触发 CORS 预检，一次上报只消耗 1 个请求）；
 * - 只采集浏览器环境分桶、页面使用次数、活跃度与面板渲染耗时分桶，不采集任何隐私数据；
 * - 匿名标识与待发缓存存放于 extensionSettings 的独立键（不会进入 state.settings，因而不参与导出与 WebDAV 同步）；
 * - 开关关闭后立即停止累加与发送；标识重置是独立动作，用于让用户随时更换匿名身份。
 */
import { getExtensionSettings, saveExtensionSettings } from '../store/persistence';
import { state } from '../store/index';
import { log } from '../utils/logger';

/**
 * 上报端点（部署在自有的 Cloudflare Worker 上，详见 cloudflare/README.md）。
 * 使用自有域名而不是 `*.workers.dev`：后者在大陆被定点阻断（DNS 污染 + SNI），无代理用户无法上报。
 * 仍为占位符时只做本地累加，不发任何请求。
 */
export const TELEMETRY_ENDPOINT = 'https://stat.janmk.us.ci/collect';

const IDENTITY_KEY = 'telemetry';
/** 关闭面板触发上报的最小间隔（吃掉反复开关面板造成的抖动） */
const CLOSE_FLUSH_GAP = 60 * 1000;
/** 页面隐藏/卸载触发上报的最小间隔（合并间隔，避免同一次使用反复发送） */
const PASSIVE_FLUSH_GAP = 30 * 60 * 1000;
/** 失败重试退避（首次发送 + 3 次重试） */
const RETRY_DELAYS = [1000, 5000, 30000];
/** 单次会话时长上限，超出按上限计入 */
const MAX_DURATION_MS = 12 * 60 * 60 * 1000;

export type TelemetryPageKey =
  | 'overview' | 'stats' | 'history' | 'forecast'
  | 'wallet' | 'settings' | 'help' | 'about';

export const TELEMETRY_PAGE_KEYS: TelemetryPageKey[] = [
  'overview', 'stats', 'history', 'forecast', 'wallet', 'settings', 'help', 'about',
];

export type TelemetryWidthBucket = 'gt1024' | '761-1024' | '481-760' | 'le480';
export type TelemetryArch = 'x86_64' | 'x86' | 'arm64' | 'unknown';

export type TelemetryEnv = {
  /** 浏览器名 */
  b: string;
  /** 浏览器主版本 */
  bv: string;
  /** 操作系统 */
  os: string;
  /** CPU 架构（无法确定时为 unknown） */
  arch: TelemetryArch;
  /** 语言标签 */
  lang: string;
  /** 面板宽度分桶 */
  w: TelemetryWidthBucket;
  /** 系统深色偏好 */
  dark: boolean;
  /** 是否以独立窗口（standalone）形态运行 */
  standalone: boolean;
  /** 是否粗指针/触屏设备 */
  touch: boolean;
  /** 酒馆版本号（无法探测时为空字符串） */
  stv: string;
};

export type TelemetryCounters = {
  opens: number;
  dur_ms: number;
  pages: Record<TelemetryPageKey, number>;
  render: number[];
};

export type TelemetryPayload = {
  v: 1;
  id: string;
  seq: number;
  day: string;
  /** 上报时刻（毫秒），服务端归一为分钟精度用于小时粒度趋势；旧版本客户端不含该字段 */
  ts: number;
  tz: number;
  app: string;
  env: TelemetryEnv;
  s: TelemetryCounters;
  daily: boolean;
  /** 关闭匿名统计开关时的最后一次上报标记（仅该次为 true，服务端用于知晓关闭行为） */
  off?: boolean;
};

type TelemetryIdentity = {
  id: string;
  seq: number;
  /** 上一次成功上报的本地日期，用于判断当日首报 */
  day?: string;
  /** 上一次发送失败、等待下次合并重发的上报体 */
  pending?: TelemetryPayload | null;
};

export type TelemetryFlushReason = 'close' | 'hide' | 'manual';

/* ---------------------------------- 纯函数 ---------------------------------- */

export function emptyPages(): Record<TelemetryPageKey, number> {
  const pages = {} as Record<TelemetryPageKey, number>;
  for (const key of TELEMETRY_PAGE_KEYS) pages[key] = 0;
  return pages;
}

export function emptyCounters(): TelemetryCounters {
  return { opens: 0, dur_ms: 0, pages: emptyPages(), render: [0, 0, 0, 0, 0] };
}

export function isTelemetryPageKey(value: unknown): value is TelemetryPageKey {
  return typeof value === 'string' && (TELEMETRY_PAGE_KEYS as string[]).includes(value);
}

/** 面板可用宽度分桶 */
export function widthBucket(width: number): TelemetryWidthBucket {
  const w = Number.isFinite(width) ? Number(width) : 0;
  if (w > 1024) return 'gt1024';
  if (w > 760) return '761-1024';
  if (w > 480) return '481-760';
  return 'le480';
}

/** 面板首帧渲染耗时分桶下标：<100 / <300 / <800 / <2000 / ≥2000 毫秒 */
export function renderBucketIndex(ms: number): number {
  const value = Number.isFinite(ms) ? Math.max(0, Number(ms)) : 0;
  if (value < 100) return 0;
  if (value < 300) return 1;
  if (value < 800) return 2;
  if (value < 2000) return 3;
  return 4;
}

/** 时区偏移按 0.5 小时取整并钳制到 [-12, 14] */
export function roundTz(hours: number): number {
  const value = Number.isFinite(hours) ? Number(hours) : 0;
  const rounded = Math.round(value * 2) / 2;
  const clamped = Math.min(14, Math.max(-12, rounded));
  // 归一时区的负零（例如 UTC 下 -0），避免与 JSON 序列化后的 0 比较时出现差异
  return clamped === 0 ? 0 : clamped;
}

/** 本地日期（YYYY-MM-DD） */
export function todayKey(now: number = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 从 UA 解析浏览器名与主版本。UA-CH（userAgentData）在调用侧优先，这里只做字符串回退。
 */
export function parseBrowser(ua: string): { name: string; major: string } {
  const source = String(ua || '');
  const pick = (pattern: RegExp): string => {
    const m = source.match(pattern);
    if (!m) return '';
    return String(m[1] || '').split('.')[0];
  };
  const edge = pick(/\bEdg(?:e|A|iOS)?\/(\d+)/);
  if (edge) return { name: 'Edge', major: edge };
  const opera = pick(/\b(?:OPR|OPT)\/(\d+)/);
  if (opera) return { name: 'Opera', major: opera };
  const samsung = pick(/\bSamsungBrowser\/(\d+)/);
  if (samsung) return { name: 'Samsung Internet', major: samsung };
  const firefox = pick(/\b(?:Firefox|FxiOS)\/(\d+)/);
  if (firefox) return { name: 'Firefox', major: firefox };
  const chrome = pick(/\b(?:Chrome|CriOS|Chromium)\/(\d+)/);
  if (chrome) return { name: 'Chrome', major: chrome };
  const safari = pick(/\bVersion\/(\d+)[.\d]*\s+Mobile\/\w+\s+Safari\//) || pick(/\bVersion\/(\d+)[.\d]*\s+Safari\//);
  if (safari) return { name: 'Safari', major: safari };
  if (/\bSafari\//.test(source)) return { name: 'Safari', major: '' };
  return { name: source ? 'Other' : '', major: '' };
}

/** 从 UA 解析操作系统 */
export function parseOs(ua: string): string {
  const source = String(ua || '');
  if (/\bWindows NT\b/.test(source)) return 'Windows';
  if (/\bAndroid\b/.test(source)) return 'Android';
  if (/\b(?:iPhone|iPod)\b/.test(source)) return 'iOS';
  if (/\biPad\b/.test(source)) return 'iPadOS';
  if (/\bCrOS\b/.test(source)) return 'ChromeOS';
  if (/\bMac OS X\b/.test(source)) return 'macOS';
  if (/\bLinux\b/.test(source)) return 'Linux';
  return source ? 'Other' : '';
}

/** 合并两份计数（用于把上次发送失败的上报体与本次新数据合并成一条） */
export function mergeCounters(a: TelemetryCounters, b: TelemetryCounters): TelemetryCounters {
  const pages = emptyPages();
  for (const key of TELEMETRY_PAGE_KEYS) {
    pages[key] = Math.max(0, Number(a?.pages?.[key]) || 0) + Math.max(0, Number(b?.pages?.[key]) || 0);
  }
  const render = [0, 0, 0, 0, 0];
  for (let i = 0; i < render.length; i++) {
    render[i] = Math.max(0, Number(a?.render?.[i]) || 0) + Math.max(0, Number(b?.render?.[i]) || 0);
  }
  return {
    opens: Math.max(0, Number(a?.opens) || 0) + Math.max(0, Number(b?.opens) || 0),
    dur_ms: Math.max(0, Number(a?.dur_ms) || 0) + Math.max(0, Number(b?.dur_ms) || 0),
    pages,
    render,
  };
}

export function countersAreEmpty(counters: TelemetryCounters): boolean {
  if ((counters?.opens || 0) > 0 || (counters?.dur_ms || 0) > 0) return false;
  for (const key of TELEMETRY_PAGE_KEYS) if ((counters?.pages?.[key] || 0) > 0) return false;
  for (const value of counters?.render || []) if ((value || 0) > 0) return false;
  return true;
}

/** 上报端点是否已配置（占位符视为未配置，此时只本地累加） */
export function isEndpointConfigured(endpoint: string = currentEndpoint()): boolean {
  const value = String(endpoint || '').trim();
  if (!/^https:\/\/[^\s<>]+$/i.test(value)) return false;
  return !value.includes('<') && !value.includes('>');
}

/** 测试用端点覆盖；生产环境始终使用 TELEMETRY_ENDPOINT */
let endpointOverride: string | null = null;

function currentEndpoint(): string {
  return endpointOverride ?? TELEMETRY_ENDPOINT;
}

/** 仅测试使用：覆盖上报端点（传 null 恢复常量端点） */
export function __setEndpointForTest(endpoint: string | null): void {
  endpointOverride = endpoint;
}

/* ---------------------------------- 运行时状态 ---------------------------------- */

let counters: TelemetryCounters = emptyCounters();
let sessionStart: number | null = null;
let lastActivity: number | null = null;
let envCache: TelemetryEnv | null = null;
let lastFlushAt = 0;
let inFlight = false;
let retryTimer: any = null;
let bound = false;

function appVersion(): string {
  try {
    return typeof __APP_VERSION__ !== 'undefined' ? String(__APP_VERSION__) : '';
  } catch {
    return '';
  }
}

function safeWindow(): any {
  try {
    return typeof window === 'undefined' ? null : window;
  } catch {
    return null;
  }
}

function parentWindow(): any {
  try {
    const win: any = safeWindow();
    if (!win) return null;
    const parent: any = win.parent;
    return parent && parent !== win ? parent : null;
  } catch {
    return null;
  }
}

/** 面板宽度取自酒馆主窗口（面板渲染在主文档中），失败时退回当前窗口 */
export function currentViewportWidth(): number {
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

function mediaMatches(query: string): boolean {
  try {
    const win: any = safeWindow();
    if (typeof win?.matchMedia !== 'function') return false;
    return !!win.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function nav(): any {
  try {
    return typeof navigator === 'undefined' ? null : navigator;
  } catch {
    return null;
  }
}

/** 探测浏览器环境（只保留分桶与主版本，不含任何可定位到个人的信息） */
export function probeEnv(): TelemetryEnv {
  const n: any = nav();
  const ua = String(n?.userAgent || '');
  let browser = parseBrowser(ua);
  try {
    const brands: any[] = Array.isArray(n?.userAgentData?.brands) ? n.userAgentData.brands : [];
    const known: Array<[RegExp, string]> = [
      [/Microsoft Edge/i, 'Edge'],
      [/Opera|OPR/i, 'Opera'],
      [/Samsung/i, 'Samsung Internet'],
      [/Google Chrome/i, 'Chrome'],
      [/Chromium/i, 'Chrome'],
      [/Firefox/i, 'Firefox'],
      [/Safari/i, 'Safari'],
    ];
    for (const [pattern, name] of known) {
      const hit = brands.find((item) => pattern.test(String(item?.brand || '')));
      if (hit) {
        const major = String(hit.version || '').split('.')[0];
        browser = { name, major: major || browser.major };
        break;
      }
    }
  } catch {}
  const lang = String(n?.language || n?.languages?.[0] || '').slice(0, 12);
  return {
    b: browser.name,
    bv: browser.major,
    os: parseOs(ua),
    arch: 'unknown',
    lang,
    w: widthBucket(currentViewportWidth()),
    dark: mediaMatches('(prefers-color-scheme: dark)'),
    standalone: mediaMatches('(display-mode: standalone)') || n?.standalone === true,
    touch: mediaMatches('(pointer: coarse)') || Number(n?.maxTouchPoints || 0) > 0,
    stv: tavernVersionFromContext(),
  };
}

/** 版本号清洗：只保留数字、字母与 . + -，最长 16 字符；不含数字视为无效 */
export function sanitizeVersion(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const text = String(value).trim().replace(/[^0-9A-Za-z.+-]/g, '').slice(0, 16);
  return /\d/.test(text) ? text : '';
}

/** 从酒馆上下文/文档元信息同步读取版本号（取不到返回空字符串） */
function tavernVersionFromContext(): string {
  try {
    const g: any = globalThis as any;
    const st: any = g?.SillyTavern;
    const ctx: any = typeof st?.getContext === 'function' ? st.getContext() : null;
    const candidates = [ctx?.version, ctx?.stVersion, st?.version, g?.__ST_VERSION__];
    for (const candidate of candidates) {
      const version = sanitizeVersion(candidate);
      if (version) return version;
    }
  } catch {}
  try {
    const doc: any = typeof document === 'undefined' ? null : document;
    const meta = doc?.querySelector?.('meta[name="version"]');
    const version = sanitizeVersion(meta?.getAttribute?.('content'));
    if (version) return version;
  } catch {}
  return '';
}

/**
 * 异步兜底：上下文没有版本号时读一次酒馆同源 `/version` 接口并缓存。
 * 只发这一个本地请求，不携带任何统计内容；失败静默忽略。
 */
async function refineTavernVersion(): Promise<void> {
  try {
    if (!envCache || envCache.stv) return;
    const g: any = globalThis as any;
    const ctx: any = g?.SillyTavern?.getContext?.();
    const headers = typeof ctx?.getRequestHeaders === 'function' ? ctx.getRequestHeaders() : undefined;
    const res = await fetch('/version', { headers, credentials: 'same-origin' });
    if (!res?.ok) return;
    const text = await res.text();
    let version = '';
    try {
      const data: any = JSON.parse(text);
      version = sanitizeVersion(data?.version);
    } catch {
      // 非 JSON 响应只接受很短的文本，避免把登录页/错误页的 HTML 误当版本号
      version = text.trim().length <= 16 ? sanitizeVersion(text) : '';
    }
    if (envCache && version) envCache.stv = version;
  } catch {}
}

/** 尽力补充 CPU 架构（Chromium 高熵值，失败保持 unknown） */
function refineArch(): void {
  try {
    const n: any = nav();
    const uad = n?.userAgentData;
    if (!uad || typeof uad.getHighEntropyValues !== 'function') return;
    uad.getHighEntropyValues(['architecture', 'bitness']).then((values: any) => {
      if (!envCache) return;
      const arch = String(values?.architecture || '').toLowerCase();
      const bitness = String(values?.bitness || '');
      let next: TelemetryArch = 'unknown';
      if (arch.includes('arm')) next = arch.includes('32') || bitness === '32' ? 'unknown' : 'arm64';
      else if (arch === 'x86' && bitness === '64') next = 'x86_64';
      else if (arch === 'x86') next = 'x86';
      if (next !== 'unknown') envCache.arch = next;
    }).catch(() => {});
  } catch {}
}

/* ---------------------------------- 身份存取 ---------------------------------- */

function randomId(): string {
  try {
    const buf = new Uint8Array(16);
    const cryptoObj: any = (globalThis as any)?.crypto;
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      cryptoObj.getRandomValues(buf);
    } else {
      for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(buf, (byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    let fallback = '';
    for (let i = 0; i < 32; i++) fallback += Math.floor(Math.random() * 16).toString(16);
    return fallback;
  }
}

function isIdentityShape(value: any): boolean {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && /^[0-9a-f]{32}$/.test(value.id);
}

function readIdentity(): TelemetryIdentity {
  try {
    const settings: any = getExtensionSettings() || {};
    const stored = settings[IDENTITY_KEY];
    if (isIdentityShape(stored)) {
      return {
        id: stored.id,
        seq: Number.isFinite(Number(stored.seq)) ? Number(stored.seq) : 0,
        day: typeof stored.day === 'string' ? stored.day : undefined,
        pending: stored.pending && typeof stored.pending === 'object' ? stored.pending : null,
      };
    }
  } catch {}
  return { id: '', seq: 0 };
}

function writeIdentity(identity: TelemetryIdentity): void {
  try {
    const settings: any = getExtensionSettings() || {};
    saveExtensionSettings({
      ...settings,
      [IDENTITY_KEY]: {
        id: identity.id,
        seq: identity.seq,
        day: identity.day,
        pending: identity.pending ?? null,
        updatedAt: Date.now(),
      },
      _updated: Date.now(),
    });
  } catch {}
}

function ensureIdentity(): TelemetryIdentity {
  const identity = readIdentity();
  if (identity.id) return identity;
  const created: TelemetryIdentity = { id: randomId(), seq: 0 };
  writeIdentity(created);
  return created;
}

/** 重置匿名标识：下次上报会被计为一台新设备 */
export function resetIdentity(): void {
  try {
    resetCounters();
    writeIdentity({ id: randomId(), seq: 0 });
  } catch {}
}

/* ---------------------------------- 开关与状态 ---------------------------------- */

export function isTelemetryEnabled(): boolean {
  try {
    const settings: any = state?.settings;
    if (!settings) return true;
    return settings.telemetryEnabled !== false;
  } catch {
    return true;
  }
}

export type TelemetryStatus = {
  enabled: boolean;
  configured: boolean;
  id: string;
  /** 已成功上报的累计条数 */
  seq: number;
  hasPending: boolean;
};

export function telemetryStatus(): TelemetryStatus {
  const identity = readIdentity();
  return {
    enabled: isTelemetryEnabled(),
    configured: isEndpointConfigured(currentEndpoint()),
    id: identity.id,
    seq: identity.seq,
    hasPending: !!identity.pending,
  };
}

/* ---------------------------------- 事件累加 ---------------------------------- */

function resetCounters(): void {
  counters = emptyCounters();
  sessionStart = null;
  lastActivity = null;
}

function touchActivity(now: number): void {
  if (sessionStart === null) sessionStart = now;
  lastActivity = now;
}

function currentDuration(now: number): number {
  if (sessionStart === null) return 0;
  return Math.max(0, Math.min(MAX_DURATION_MS, now - sessionStart));
}

/** 打开面板：计一次打开，并开始一个使用时段 */
export function trackOpen(): void {
  try {
    if (!isTelemetryEnabled()) return;
    const now = Date.now();
    counters.opens += 1;
    touchActivity(now);
    if (!envCache) envCache = probeEnv();
  } catch {}
}

/** 切换视图：对应页面计数 +1 */
export function trackPage(view: string): void {
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
export function trackRender(ms: number): void {
  try {
    if (!isTelemetryEnabled()) return;
    if (!Number.isFinite(ms)) return;
    counters.render[renderBucketIndex(ms)] += 1;
    if (!envCache) envCache = probeEnv();
  } catch {}
}

/* ---------------------------------- 发送 ---------------------------------- */

function buildPayload(
  identity: TelemetryIdentity,
  incoming: TelemetryCounters,
  pending: TelemetryPayload | null,
  now: number,
  final = false,
): TelemetryPayload {
  const day = todayKey(now);
  // 上次发送失败的计数按白名单重新归一后再与本次合并，避免脏字段进入上报体
  const pendingCounters = pending
    ? mergeCounters(emptyCounters(), {
      opens: pending?.s?.opens,
      dur_ms: pending?.s?.dur_ms,
      pages: (pending?.s?.pages as any) || {},
      render: Array.isArray(pending?.s?.render) ? pending.s.render : [],
    } as any)
    : emptyCounters();
  const merged = pending ? mergeCounters(pendingCounters, incoming) : incoming;
  const seq = pending && Number.isFinite(Number(pending.seq)) ? Number(pending.seq) : identity.seq + 1;
  const env = envCache ?? probeEnv();
  // 异步补全可能还没回来，发送前再尝试一次同步来源，尽量让首报也带上酒馆版本号
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
      render: merged.render,
    },
    daily: pending ? pending.daily === true : identity.day !== day,
    ...(final ? { off: true } : {}),
  };
}

/**
 * 发送前先把序号写盘：即使响应丢失导致本地状态未更新，下一次上报也会使用更大的 seq，
 * 不会因为服务端已记录该序号而永久丢弃后续数据（同一 seq 的重复提交由服务端幂等丢弃）。
 */
function reserveSeq(payload: TelemetryPayload): void {
  try {
    const identity = ensureIdentity();
    if (identity.seq < payload.seq) {
      identity.seq = payload.seq;
      writeIdentity(identity);
    }
  } catch {}
}

function commitSuccess(payload: TelemetryPayload): void {
  lastFlushAt = Date.now();
  const identity = ensureIdentity();
  if (identity.seq < payload.seq) identity.seq = payload.seq;
  identity.day = payload.day;
  identity.pending = null;
  writeIdentity(identity);
  resetCounters();
}

function commitPending(payload: TelemetryPayload): void {
  try {
    const identity = ensureIdentity();
    identity.pending = payload;
    writeIdentity(identity);
  } catch {}
  resetCounters();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    retryTimer = setTimeout(resolve, ms);
  });
}

async function postPayload(body: string): Promise<boolean> {
  try {
    const res = await fetch(currentEndpoint(), {
      method: 'POST',
      mode: 'cors',
      keepalive: true,
      credentials: 'omit',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
    });
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

function sendBeaconOnce(body: string): boolean {
  try {
    const n: any = nav();
    if (typeof n?.sendBeacon !== 'function') return false;
    if (typeof Blob === 'undefined') return false;
    return !!n.sendBeacon(currentEndpoint(), new Blob([body], { type: 'text/plain;charset=UTF-8' }));
  } catch {
    return false;
  }
}

async function sendWithRetry(payload: TelemetryPayload): Promise<void> {
  const body = JSON.stringify(payload);
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const ok = await postPayload(body);
    if (ok) {
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
export function flushTelemetry(reason: TelemetryFlushReason = 'close', options?: { final?: boolean }): void {
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
    const gap = reason === 'hide' ? PASSIVE_FLUSH_GAP : CLOSE_FLUSH_GAP;
    // 关闭开关的最后一次上报必须立即发出：不受节流与空数据判断限制
    if (!final && lastFlushAt && now - lastFlushAt < gap) return;
    const identity = ensureIdentity();
    const pending = identity.pending && typeof identity.pending === 'object' ? identity.pending : null;
    if (!final && !pending && countersAreEmpty(counters)) return;
    const payload = buildPayload(identity, counters, pending, now, final);
    inFlight = true;
    reserveSeq(payload);
    if (reason === 'hide') {
      if (sendBeaconOnce(JSON.stringify(payload))) {
        commitSuccess(payload);
        inFlight = false;
        return;
      }
    }
    void sendWithRetry(payload).catch(() => { inFlight = false; });
  } catch (error) {
    inFlight = false;
    log.warn('匿名统计上报失败', error);
  }
}

/**
 * 关闭匿名统计开关时的最后一次上报。
 * 必须在把 telemetryEnabled 写为 false 之前调用：本次会带上关闭标记并立即发送。
 */
export function flushTelemetryOnDisable(): void {
  flushTelemetry('manual', { final: true });
}

/* ---------------------------------- 初始化 ---------------------------------- */

function bindLifecycle(): void {
  if (bound) return;
  const win: any = safeWindow();
  if (!win || typeof win.addEventListener !== 'function') return;
  bound = true;
  const onHide = () => { try { flushTelemetry('hide'); } catch {} };
  const onVisibility = (event: any) => {
    try {
      const doc: any = event?.target ?? win.document;
      if (doc?.visibilityState === 'hidden') onHide();
    } catch {}
  };
  const targets: any[] = [win];
  const parent = parentWindow();
  if (parent && typeof parent.addEventListener === 'function') targets.push(parent);
  for (const target of targets) {
    try { target.addEventListener('pagehide', onHide); } catch {}
    try { target.addEventListener('visibilitychange', onVisibility); } catch {}
  }
}

/** 初始化：生成匿名标识、缓存环境、绑定生命周期上报时机（幂等） */
export function initTelemetry(): void {
  try {
    const identity = ensureIdentity();
    if (!identity.id) return;
    if (!envCache) envCache = probeEnv();
    refineArch();
    void refineTavernVersion();
    bindLifecycle();
  } catch (error) {
    log.warn('匿名统计初始化失败', error);
  }
}

/** 仅测试使用：清空模块级运行时状态 */
export function __resetTelemetryStateForTest(): void {
  counters = emptyCounters();
  sessionStart = null;
  lastActivity = null;
  envCache = null;
  lastFlushAt = 0;
  inFlight = false;
  bound = false;
  if (retryTimer) {
    try { clearTimeout(retryTimer); } catch {}
    retryTimer = null;
  }
}

/** 仅测试使用：直接读取当前累加器快照 */
export function __peekCountersForTest(): TelemetryCounters {
  return {
    opens: counters.opens,
    dur_ms: counters.dur_ms,
    pages: { ...counters.pages },
    render: [...counters.render],
  };
}
