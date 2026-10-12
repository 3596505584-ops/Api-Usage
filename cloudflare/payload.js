/**
 * 上报体校验与归一（纯函数，无运行时依赖，便于单元测试）
 *
 * 原则：只接受白名单字段，其余一律丢弃；所有数值钳制到合理上限；
 * 校验失败返回 { ok: false }，调用方直接拒绝，不写库。
 */

export const PAYLOAD_VERSION = 1;
/** 上报体最大字节数（超过直接拒绝，避免刷量与超大写入） */
export const MAX_BODY_BYTES = 4096;
export const PAGE_KEYS = [
  'overview', 'stats', 'history', 'forecast', 'wallet', 'settings', 'help', 'about',
];
export const WIDTH_BUCKETS = ['gt1024', '761-1024', '481-760', 'le480'];
export const ARCHES = ['x86_64', 'x86', 'arm64', 'unknown'];
export const RENDER_BUCKET_COUNT = 5;

const MAX_OPENS = 500;
const MAX_DURATION_MS = 12 * 60 * 60 * 1000;
const MAX_PAGE_COUNT = 2000;
const MAX_SEQ = 100000000;
const DAY_WINDOW_BEFORE = 2;
const DAY_WINDOW_AFTER = 1;
/** 上报时间戳允许的时钟偏差：向前 2 天（覆盖失败重发）、向后 10 分钟 */
const TS_WINDOW_BEFORE_MS = 2 * 86400000;
const TS_WINDOW_AFTER_MS = 10 * 60000;
const MINUTE_MS = 60000;

function fail(error) {
  return { ok: false, error };
}

function toInt(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  const floored = Math.floor(num);
  if (floored < min) return min;
  if (floored > max) return max;
  return floored;
}

function toStr(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

/** 版本号清洗：只保留数字、字母与 . + -，不含数字则视为无效 */
function toVersion(value, max) {
  const text = toStr(value, max).replace(/[^0-9A-Za-z.+-]/g, '');
  return /\d/.test(text) ? text : '';
}

export function isDayKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(value + 'T00:00:00Z'));
}

/**
 * 日期窗口校验：客户端上报的是本地日期，与 UTC 日期最多相差一天，
 * 因此允许 [UTC 今天 - 2, UTC 今天 + 1]。
 */
export function withinDayWindow(day, now = Date.now()) {
  const target = Date.parse(day + 'T00:00:00Z');
  const today = Date.parse(new Date(now).toISOString().slice(0, 10) + 'T00:00:00Z');
  const diffDays = Math.round((target - today) / 86400000);
  return diffDays >= -DAY_WINDOW_BEFORE && diffDays <= DAY_WINDOW_AFTER;
}

function clampTz(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const rounded = Math.round(num * 2) / 2;
  return Math.min(14, Math.max(-12, rounded));
}

/**
 * 把上报时间戳归一为分钟精度（毫秒）。
 * 非法值、超出允许时钟偏差的值一律回退到服务端当前分钟，保证写入的 hour 桶可信。
 */
export function normalizeMinute(ts, now = Date.now()) {
  const fallback = Math.floor(Number(now) / MINUTE_MS) * MINUTE_MS;
  const value = Number(ts);
  if (!Number.isFinite(value)) return fallback;
  const minute = Math.floor(value / MINUTE_MS) * MINUTE_MS;
  if (minute < Number(now) - TS_WINDOW_BEFORE_MS) return fallback;
  if (minute > Number(now) + TS_WINDOW_AFTER_MS) return fallback;
  return minute;
}

/**
 * 归一一条上报体。
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function normalizePayload(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('上报体不是对象');
  if (Number(raw.v) !== PAYLOAD_VERSION) return fail('上报体版本不支持');
  const id = typeof raw.id === 'string' ? raw.id.toLowerCase() : '';
  if (!/^[0-9a-f]{32}$/.test(id)) return fail('设备标识非法');
  const seq = toInt(raw.seq, 0, MAX_SEQ);
  if (seq < 1) return fail('序号非法');
  if (!isDayKey(raw.day)) return fail('日期非法');
  if (!withinDayWindow(raw.day, now)) return fail('日期超出允许范围');

  const envRaw = raw.env && typeof raw.env === 'object' ? raw.env : {};
  const countersRaw = raw.s && typeof raw.s === 'object' ? raw.s : {};
  const pagesRaw = countersRaw.pages && typeof countersRaw.pages === 'object' ? countersRaw.pages : {};
  const renderRaw = Array.isArray(countersRaw.render) ? countersRaw.render : [];

  const env = {
    b: toStr(envRaw.b, 24),
    bv: toStr(envRaw.bv, 8),
    os: toStr(envRaw.os, 24),
    arch: ARCHES.includes(envRaw.arch) ? envRaw.arch : 'unknown',
    lang: toStr(envRaw.lang, 12),
    w: WIDTH_BUCKETS.includes(envRaw.w) ? envRaw.w : 'gt1024',
    dark: envRaw.dark === true ? 1 : 0,
    standalone: envRaw.standalone === true ? 1 : 0,
    touch: envRaw.touch === true ? 1 : 0,
    stv: toVersion(envRaw.stv, 16),
  };

  const pages = {};
  for (const key of PAGE_KEYS) pages[key] = toInt(pagesRaw[key], 0, MAX_PAGE_COUNT);
  const render = [];
  for (let i = 0; i < RENDER_BUCKET_COUNT; i++) render.push(toInt(renderRaw[i], 0, MAX_PAGE_COUNT));

  return {
    ok: true,
    value: {
      id,
      seq,
      day: raw.day,
      /** 上报时刻（毫秒，分钟精度），用于小时粒度趋势；旧客户端缺失时回退服务端当前分钟 */
      ts: normalizeMinute(raw.ts, now),
      tz: clampTz(raw.tz),
      app: toStr(raw.app, 16),
      env,
      counters: {
        opens: toInt(countersRaw.opens, 0, MAX_OPENS),
        dur_ms: toInt(countersRaw.dur_ms, 0, MAX_DURATION_MS),
        pages,
        render,
      },
      daily: raw.daily === true ? 1 : 0,
      off: raw.off === true ? 1 : 0,
    },
  };
}
