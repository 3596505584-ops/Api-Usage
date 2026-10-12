/**
 * 看板聚合纯函数（无运行时依赖，便于单元测试）
 *
 * 口径约定：
 * - 日期一律沿用客户端上报的本地日期（上报体 `day` 字段），看板里的「今天」按北京时间（UTC+8）计算；
 * - 设备维度指标（总计、环境画像、版本分布、时长分布、累计用户趋势）来自 `device` 表的累计列，
 *   因此一次全表读（行数 = 设备数）即可覆盖，不必扫描逐设备日数据；
 * - 日粒度趋势来自 `device_daily` 的按天聚合，读取量 = 所选天数 × 日活。
 */
import { PAGE_KEYS } from './payload.js';

export { PAGE_KEYS };

/** 看板趋势默认窗口（天） */
export const DEFAULT_WINDOW_DAYS = 30;
/** 看板趋势窗口上限（天），与 device_daily 保留期一致 */
export const MAX_WINDOW_DAYS = 730;
/** 小时粒度趋势默认窗口（小时） */
export const DEFAULT_WINDOW_HOURS = 24;
/** 小时粒度趋势窗口上限（小时），与 device_hourly 保留期一致 */
export const MAX_WINDOW_HOURS = 180 * 24;
/** 看板接口缓存时长（秒） */
export const CACHE_TTL_SECONDS = 600;

export const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const HOUR_KEY_RE = /^\d{4}-\d{2}-\d{2}T\d{2}$/;

export function numberOrZero(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/** 北京时间日期键（YYYY-MM-DD） */
export function beijingDayKey(now = Date.now()) {
  return new Date(now + BEIJING_OFFSET_MS).toISOString().slice(0, 10);
}

/** 相对北京时间今天偏移若干天的日期键（负数向前） */
export function offsetDayKey(offsetDays, now = Date.now()) {
  const days = Number.isFinite(Number(offsetDays)) ? Math.round(Number(offsetDays)) : 0;
  return beijingDayKey(now + days * DAY_MS);
}

/** 北京时间小时键（YYYY-MM-DDTHH，小时粒度趋势的时间基准） */
export function beijingHourKey(now = Date.now()) {
  return new Date(Number(now) + BEIJING_OFFSET_MS).toISOString().slice(0, 13);
}

/** 相对北京时间当前小时偏移若干小时的小时键（负数向前） */
export function offsetHourKey(offsetHours, now = Date.now()) {
  const hours = Number.isFinite(Number(offsetHours)) ? Math.round(Number(offsetHours)) : 0;
  return beijingHourKey(Number(now) + hours * HOUR_MS);
}

export function isHourKey(value) {
  if (typeof value !== 'string' || !HOUR_KEY_RE.test(value)) return false;
  if (!isDayKey(value.slice(0, 10))) return false;
  const hour = Number(value.slice(11, 13));
  return hour >= 0 && hour <= 23;
}

/** 把北京时间小时键理解为「墙上时间」，与时长换算互不依赖运行环境时区 */
export function hourKeyToMs(hour) {
  const base = Date.parse(String(hour) + ':00:00Z');
  return Number.isNaN(base) ? NaN : base - BEIJING_OFFSET_MS;
}

export function shiftHour(hour, deltaHours) {
  const base = hourKeyToMs(hour);
  if (!Number.isFinite(base)) return String(hour);
  const delta = Number.isFinite(Number(deltaHours)) ? Math.round(Number(deltaHours)) : 0;
  return beijingHourKey(base + delta * HOUR_MS);
}

/** 两个小时键之间相差的小时数（可正可负） */
export function hoursBetween(from, to) {
  const a = hourKeyToMs(from);
  const b = hourKeyToMs(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / HOUR_MS);
}

export function isDayKey(value) {
  if (typeof value !== 'string' || !DAY_KEY_RE.test(value)) return false;
  return !Number.isNaN(Date.parse(value + 'T00:00:00Z'));
}

export function shiftDay(day, deltaDays) {
  const base = Date.parse(String(day) + 'T00:00:00Z');
  if (Number.isNaN(base)) return String(day);
  return new Date(base + Number(deltaDays || 0) * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  const a = Date.parse(String(from) + 'T00:00:00Z');
  const b = Date.parse(String(to) + 'T00:00:00Z');
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / DAY_MS);
}

/**
 * 归一趋势窗口：非法值回退默认 30 天；末日期不晚于北京时间今天；
 * 起止倒置时收成同一天；跨度上限 MAX_WINDOW_DAYS 天。
 */
export function normalizeWindow(fromRaw, toRaw, now = Date.now()) {
  const today = beijingDayKey(now);
  const to = isDayKey(toRaw) && String(toRaw) <= today
    ? String(toRaw)
    : today;
  let from = isDayKey(fromRaw) ? String(fromRaw) : offsetDayKey(-(DEFAULT_WINDOW_DAYS - 1), now);
  if (from > to) from = to;
  if (daysBetween(from, to) > MAX_WINDOW_DAYS - 1) from = shiftDay(to, -(MAX_WINDOW_DAYS - 1));
  return { from, to, days: daysBetween(from, to) + 1 };
}

/**
 * 归一小时粒度窗口：非法值回退默认 24 小时；末小时不晚于北京时间当前小时；
 * 起止倒置时收成同一小时；跨度上限 MAX_WINDOW_HOURS 小时。
 */
export function normalizeHourWindow(fromRaw, toRaw, now = Date.now()) {
  const current = beijingHourKey(now);
  const to = isHourKey(toRaw) && String(toRaw) <= current ? String(toRaw) : current;
  let from = isHourKey(fromRaw) ? String(fromRaw) : shiftHour(to, -(DEFAULT_WINDOW_HOURS - 1));
  if (from > to) from = to;
  if (hoursBetween(from, to) > MAX_WINDOW_HOURS - 1) from = shiftHour(to, -(MAX_WINDOW_HOURS - 1));
  return { from, to, hours: hoursBetween(from, to) + 1 };
}

/** 取值计数：空值归入 unknown，按数量倒序，取前 limit 项（limit<=0 表示不截断） */
export function tally(values, options = {}) {
  const limit = Number.isFinite(Number(options.limit)) ? Math.floor(Number(options.limit)) : 12;
  const unknown = typeof options.unknown === 'string' ? options.unknown : '未知';
  const map = new Map();
  for (const raw of Array.isArray(values) ? values : []) {
    const label = raw === null || raw === undefined || raw === '' ? unknown : String(raw);
    map.set(label, (map.get(label) || 0) + 1);
  }
  const items = Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label, 'zh-Hans-CN'));
  return limit > 0 ? items.slice(0, limit) : items;
}

/** 取前 limit 项，其余合并为「其他」（保留在末尾） */
export function mergeTail(items, limit = 8, otherLabel = '其他') {
  const list = Array.isArray(items) ? items : [];
  if (list.length <= limit) return list.slice();
  const head = list.slice(0, limit);
  const rest = list.slice(limit).reduce((sum, item) => sum + numberOrZero(item?.count), 0);
  if (rest > 0) head.push({ label: otherLabel, count: rest, merged: true });
  return head;
}

export function sumBy(rows, key) {
  let total = 0;
  for (const row of Array.isArray(rows) ? rows : []) total += numberOrZero(row?.[key]);
  return total;
}

/** 每设备累计使用时长直方图分桶（毫秒，桶上界含等号） */
export const DURATION_BUCKETS = [
  { label: '未记录', max: 0 },
  { label: '<1 分钟', max: 60 * 1000 },
  { label: '<10 分钟', max: 10 * 60 * 1000 },
  { label: '<30 分钟', max: 30 * 60 * 1000 },
  { label: '<1 小时', max: 60 * 60 * 1000 },
  { label: '<3 小时', max: 3 * 60 * 60 * 1000 },
  { label: '<10 小时', max: 10 * 60 * 60 * 1000 },
  { label: '<30 小时', max: 30 * 60 * 60 * 1000 },
  { label: '≥30 小时', max: Infinity },
];

export function durationBucketIndex(ms) {
  const value = Math.max(0, numberOrZero(ms));
  for (let i = 0; i < DURATION_BUCKETS.length; i++) {
    if (value <= DURATION_BUCKETS[i].max) return i;
  }
  return DURATION_BUCKETS.length - 1;
}

export function durationHistogram(values) {
  const counts = DURATION_BUCKETS.map(() => 0);
  for (const raw of Array.isArray(values) ? values : []) {
    counts[durationBucketIndex(raw)] += 1;
  }
  return DURATION_BUCKETS.map((bucket, index) => ({ label: bucket.label, count: counts[index] }));
}

/**
 * 历史记录条数分布曲线（每台设备取最近一次上报的精确条数）
 *
 * X 轴 = 条数分组，固定每 10 条一组（0–9、10–19、…），Y 轴 = 该组设备数。
 * 条数跨度可能很大（见过 1600+ 的设备），直接按 10 条铺开会产出上百个点，
 * 因此 0–{@link HISTORY_COUNT_CURVE_MAX} 逐 10 条一组，更大的全部并入末组「{MAX} 条以上」。
 */
export const HISTORY_COUNT_CURVE_STEP = 10;
/** 逐 10 条展开的上限（条数）；超过此值的设备计入末组 */
export const HISTORY_COUNT_CURVE_MAX = 500;

export function historyCountCurve(values) {
  const groups = [];
  for (let from = 0; from < HISTORY_COUNT_CURVE_MAX; from += HISTORY_COUNT_CURVE_STEP) {
    groups.push({ from, to: from + HISTORY_COUNT_CURVE_STEP - 1, count: 0 });
  }
  // 末组吸收上限之上的设备，避免尾部出现空洞
  groups.push({ from: HISTORY_COUNT_CURVE_MAX, to: null, count: 0 });

  for (const raw of Array.isArray(values) ? values : []) {
    const value = Math.max(0, Math.floor(numberOrZero(raw)));
    const index = value >= HISTORY_COUNT_CURVE_MAX
      ? groups.length - 1
      : Math.min(groups.length - 1, Math.floor(value / HISTORY_COUNT_CURVE_STEP));
    groups[index].count += 1;
  }

  return groups.map((group) => ({
    from: group.from,
    to: group.to,
    label: group.to === null ? HISTORY_COUNT_CURVE_MAX + ' 条以上' : group.from + '–' + group.to + ' 条',
    count: group.count,
  }));
}

/**
 * 客户端只上报 5 档渲染耗时，这里用档位代表值估算平均耗时。
 * 代表值取各档区间内的保守取值，末档 ≥2000ms 按 3000ms 计，因此估算结果偏保守（不会高估）。
 */
export const RENDER_REPRESENTATIVES = [50, 200, 550, 1400, 3000];
export const RENDER_BUCKET_LABELS = ['<100ms', '<300ms', '<800ms', '<2000ms', '≥2000ms'];

export function renderSampleCount(buckets) {
  let samples = 0;
  for (let i = 0; i < RENDER_REPRESENTATIVES.length; i++) samples += numberOrZero(buckets?.[i]);
  return samples;
}

export function estimateRenderMs(buckets) {
  let samples = 0;
  let weighted = 0;
  for (let i = 0; i < RENDER_REPRESENTATIVES.length; i++) {
    const count = numberOrZero(buckets?.[i]);
    samples += count;
    weighted += count * RENDER_REPRESENTATIVES[i];
  }
  return samples > 0 ? Math.round(weighted / samples) : null;
}

/** 按天新增数 → 截至当日累计序列 */
export function cumulativeGrowth(dayCounts) {
  const rows = (Array.isArray(dayCounts) ? dayCounts : [])
    .map((row) => ({ day: String(row?.day ?? ''), count: numberOrZero(row?.count) }))
    .filter((row) => isDayKey(row.day))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  let running = 0;
  return rows.map((row) => {
    running += row.count;
    return { day: row.day, added: row.count, cumulative: running };
  });
}

export function tzLabel(offset) {
  const num = numberOrZero(offset);
  const sign = num >= 0 ? '+' : '-';
  const abs = Math.abs(num);
  return `UTC${sign}${Number.isInteger(abs) ? abs : abs.toFixed(1)}`;
}

export const WIDTH_LABELS = {
  gt1024: '> 1024px',
  '761-1024': '761–1024px',
  '481-760': '481–760px',
  le480: '≤ 480px',
};

export function widthLabel(bucket) {
  const key = String(bucket ?? '');
  return WIDTH_LABELS[key] || key || '未知';
}

/** 把 device 表行聚合成看板需要的画像维度（全部为「每设备最近一次上报的状态」） */
export function envBreakdown(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const browserVersion = list.map((row) => {
    const name = row?.browser ? String(row.browser) : '';
    const major = row?.browser_major ? String(row.browser_major) : '';
    return name && major ? `${name} ${major}` : name;
  });
  return {
    browser: tally(list.map((row) => row?.browser)),
    browserVersion: tally(browserVersion),
    stVersion: tally(list.map((row) => row?.st_version), { limit: 12 }),
    os: tally(list.map((row) => row?.os)),
    arch: tally(list.map((row) => row?.arch)),
    lang: tally(list.map((row) => row?.lang)),
    width: tally(list.map((row) => widthLabel(row?.width_bucket))),
    dark: tally(list.map((row) => (numberOrZero(row?.dark) === 1 ? '深色偏好' : '浅色偏好'))),
    standalone: tally(list.map((row) => (numberOrZero(row?.standalone) === 1 ? '独立窗口' : '浏览器标签'))),
    touch: tally(list.map((row) => (numberOrZero(row?.touch) === 1 ? '触屏 / 粗指针' : '鼠标 / 精确指针'))),
    tz: tally(list.map((row) => tzLabel(row?.tz_offset))),
  };
}
