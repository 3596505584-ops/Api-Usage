/**
 * API用量统计 · 匿名使用统计接收端（Cloudflare Worker + D1）
 *
 * 路由：
 *   POST /collect       接收匿名上报（跨域简单请求，返回 204）
 *   GET  /dashboard     口令保护的数据看板页
 *   GET  /vendor/echarts.js  自托管图表库（看板同源加载，不依赖第三方 CDN）
 *   GET  /api/summary   口令保护的总计类汇总（总计 / 画像 / 分布，Cache API 缓存）
 *   GET  /api/trend     口令保护的趋势汇总（from/to/parts，Cache API 缓存）
 *   GET  /health        健康检查
 * 定时：每月 1 号清理超过保留期的逐设备日数据。
 *
 * 省额度要点：
 *   1) 客户端会话内聚合后再上报（每设备每天通常 1~3 个请求）；
 *   2) device 表维护去标识化的累计列，看板「总计 + 画像」一次全表读即可（行数 = 设备数）；
 *   3) device_daily 只在需要日粒度趋势时按 day 索引范围扫描（行数 = 天数 × 日活）；
 *   4) 看板接口走 Cache API（默认 10 分钟），看板「刷新」按钮用 ?force=1 绕过并回填缓存；
 *   5) 上报体走 text/plain 简单请求，不触发 CORS 预检；device_daily.last_seq 与 device.last_seq 双重幂等。
 */
import dashboardHtml from './dashboard.html';
import echartsJs from './vendor/echarts.min.js';
import { MAX_BODY_BYTES, PAGE_KEYS, normalizePayload } from './payload.js';
import {
  CACHE_TTL_SECONDS,
  beijingDayKey,
  beijingHourKey,
  cumulativeGrowth,
  durationHistogram,
  envBreakdown,
  estimateRenderMs,
  historyCountCurve,
  hourKeyToMs,
  normalizeHourWindow,
  normalizeWindow,
  numberOrZero,
  renderSampleCount,
  shiftHour,
  sumBy,
  tally,
} from './summary.js';

/** 逐设备日数据保留天数（设备维度汇总表长期保留） */
const RETENTION_DAYS = 730;
/** 逐设备小时数据保留天数：只服务小时粒度趋势，按较短周期清理以省 D1 空间 */
const HOURLY_RETENTION_DAYS = 180;
const HOUR_MS = 60 * 60 * 1000;
/** 渲染耗时档位下标 */
const RENDER_INDEXES = [0, 1, 2, 3, 4];
/** 累计列（与 schema.sql 的 *_total 一一对应） */
const TOTAL_COLUMNS = PAGE_KEYS.map((key) => `p_${key}_total`);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/** 设备维度通用 UPSERT 片段：环境字段刷新为最近状态，累计列按本次上报增量累加 */
const DEVICE_UPSERT_SET = `ON CONFLICT(device_id) DO UPDATE SET
  last_seen = excluded.last_seen,
  last_seq = excluded.last_seq,
  app_version = COALESCE(NULLIF(excluded.app_version, ''), device.app_version),
  browser = COALESCE(NULLIF(excluded.browser, ''), device.browser),
  browser_major = COALESCE(NULLIF(excluded.browser_major, ''), device.browser_major),
  os = COALESCE(NULLIF(excluded.os, ''), device.os),
  arch = CASE WHEN excluded.arch = 'unknown' THEN COALESCE(device.arch, excluded.arch) ELSE excluded.arch END,
  lang = COALESCE(NULLIF(excluded.lang, ''), device.lang),
  width_bucket = COALESCE(NULLIF(excluded.width_bucket, ''), device.width_bucket),
  dark = excluded.dark,
  standalone = excluded.standalone,
  touch = excluded.touch,
  tz_offset = excluded.tz_offset,
  opens_total = device.opens_total + excluded.opens_total,
  dur_ms_total = device.dur_ms_total + excluded.dur_ms_total,
  ${TOTAL_COLUMNS.map((column) => `${column} = device.${column} + excluded.${column}`).join(',\n  ')}`;

const DEVICE_BASE_COLUMNS = `device_id, first_seen, last_seen, app_version, browser, browser_major, os, arch,
  lang, width_bucket, dark, standalone, touch, tz_offset,
  first_day, last_seq, opens_total, dur_ms_total`;

const DEVICE_BASE_VALUES = `?1, ?2, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13,
  ?14, ?15, ?16, ?17`;

/**
 * 设备维度汇总上行（含酒馆版本号）：
 * `WHERE excluded.last_seq > device.last_seq` 保证重复/重发上报不重复累加，
 * 与 device_daily / device_hourly 的幂等判据一致。
 */
const DEVICE_UPSERT_SQL = `
INSERT INTO device (
  ${DEVICE_BASE_COLUMNS},
  ${TOTAL_COLUMNS.join(', ')}, st_version, history_count, telemetry_off
) VALUES (
  ${DEVICE_BASE_VALUES},
  ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28
)
${DEVICE_UPSERT_SET},
  st_version = COALESCE(NULLIF(excluded.st_version, ''), device.st_version),
  history_count = excluded.history_count,
  telemetry_off = excluded.telemetry_off
WHERE excluded.last_seq > device.last_seq
`;

/** 未执行 migrate-st-version.sql 的旧库回退语句：列集合与旧版完全一致 */
const DEVICE_UPSERT_LEGACY_SQL = `
INSERT INTO device (
  ${DEVICE_BASE_COLUMNS},
  ${TOTAL_COLUMNS.join(', ')}
) VALUES (
  ${DEVICE_BASE_VALUES},
  ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25
)
${DEVICE_UPSERT_SET}
WHERE excluded.last_seq > device.last_seq
`;

const DEVICE_DAILY_UPSERT_SQL = `
INSERT INTO device_daily (
  day, device_id, sessions, opens, dur_ms,
  p_overview, p_stats, p_history, p_forecast, p_wallet, p_settings, p_help, p_about,
  r0, r1, r2, r3, r4, app_version, last_seq, first_ts, last_ts
) VALUES (
  ?1, ?2, 1, ?3, ?4,
  ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
  ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?20
)
ON CONFLICT(day, device_id) DO UPDATE SET
  sessions = device_daily.sessions + 1,
  opens = device_daily.opens + excluded.opens,
  dur_ms = device_daily.dur_ms + excluded.dur_ms,
  p_overview = device_daily.p_overview + excluded.p_overview,
  p_stats = device_daily.p_stats + excluded.p_stats,
  p_history = device_daily.p_history + excluded.p_history,
  p_forecast = device_daily.p_forecast + excluded.p_forecast,
  p_wallet = device_daily.p_wallet + excluded.p_wallet,
  p_settings = device_daily.p_settings + excluded.p_settings,
  p_help = device_daily.p_help + excluded.p_help,
  p_about = device_daily.p_about + excluded.p_about,
  r0 = device_daily.r0 + excluded.r0,
  r1 = device_daily.r1 + excluded.r1,
  r2 = device_daily.r2 + excluded.r2,
  r3 = device_daily.r3 + excluded.r3,
  r4 = device_daily.r4 + excluded.r4,
  app_version = excluded.app_version,
  last_seq = excluded.last_seq,
  last_ts = excluded.last_ts
WHERE device_daily.last_seq < excluded.last_seq
`;

const DEVICE_HOURLY_UPSERT_SQL = `
INSERT INTO device_hourly (
  hour, device_id, sessions, opens, dur_ms,
  p_overview, p_stats, p_history, p_forecast, p_wallet, p_settings, p_help, p_about,
  r0, r1, r2, r3, r4, app_version, last_seq, first_ts, last_ts
) VALUES (
  ?1, ?2, 1, ?3, ?4,
  ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
  ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?20
)
ON CONFLICT(hour, device_id) DO UPDATE SET
  sessions = device_hourly.sessions + 1,
  opens = device_hourly.opens + excluded.opens,
  dur_ms = device_hourly.dur_ms + excluded.dur_ms,
  p_overview = device_hourly.p_overview + excluded.p_overview,
  p_stats = device_hourly.p_stats + excluded.p_stats,
  p_history = device_hourly.p_history + excluded.p_history,
  p_forecast = device_hourly.p_forecast + excluded.p_forecast,
  p_wallet = device_hourly.p_wallet + excluded.p_wallet,
  p_settings = device_hourly.p_settings + excluded.p_settings,
  p_help = device_hourly.p_help + excluded.p_help,
  p_about = device_hourly.p_about + excluded.p_about,
  r0 = device_hourly.r0 + excluded.r0,
  r1 = device_hourly.r1 + excluded.r1,
  r2 = device_hourly.r2 + excluded.r2,
  r3 = device_hourly.r3 + excluded.r3,
  r4 = device_hourly.r4 + excluded.r4,
  app_version = excluded.app_version,
  last_seq = excluded.last_seq,
  last_ts = excluded.last_ts
WHERE device_hourly.last_seq < excluded.last_seq
`;

/** 设备维度汇总：一次全表读（行数 = 设备数）覆盖总计、环境画像、版本分布与时长分布 */
const DEVICE_SELECT_SQL = `
SELECT app_version, st_version, history_count, telemetry_off,
       browser, browser_major, os, arch, lang, width_bucket,
       dark, standalone, touch, tz_offset, first_day, first_seen,
       opens_total, dur_ms_total,
       ${TOTAL_COLUMNS.join(', ')}
FROM device
`;

/** 当日汇总：只扫当天行（行数 = 当日活跃设备数），同时给出当日去重设备数（日活） */
const TODAY_SELECT_SQL = `
SELECT COUNT(DISTINCT device_id) AS devices,
       COALESCE(SUM(opens), 0) AS opens, COALESCE(SUM(dur_ms), 0) AS dur_ms
FROM device_daily
WHERE day = ?1
`;

/** 日粒度趋势：按 day 索引范围扫描后按天聚合 */
const DAILY_SELECT_SQL = `
SELECT day,
       COUNT(*) AS devices,
       COALESCE(SUM(opens), 0) AS opens,
       COALESCE(SUM(dur_ms), 0) AS dur_ms,
       COALESCE(SUM(sessions), 0) AS sessions,
       ${PAGE_KEYS.map((key) => `COALESCE(SUM(p_${key}), 0) AS p_${key}`).join(',\n       ')}
FROM device_daily
WHERE day >= ?1 AND day <= ?2
GROUP BY day
ORDER BY day
`;

/** 小时粒度趋势：按 hour 索引范围扫描后按小时聚合（行数 = 小时数 × 小时活跃设备数） */
const HOURLY_SELECT_SQL = `
SELECT hour,
       COUNT(*) AS devices,
       COALESCE(SUM(opens), 0) AS opens,
       COALESCE(SUM(dur_ms), 0) AS dur_ms,
       COALESCE(SUM(sessions), 0) AS sessions,
       ${PAGE_KEYS.map((key) => `COALESCE(SUM(p_${key}), 0) AS p_${key}`).join(',\n       ')}
FROM device_hourly
WHERE hour >= ?1 AND hour <= ?2
GROUP BY hour
ORDER BY hour
`;

/** 小时粒度累计用户：窗口内按设备首次出现时间（分钟精度）分桶 */
const GROWTH_HOUR_SELECT_SQL = `
SELECT strftime('%Y-%m-%dT%H', CAST(first_seen / 1000 AS INTEGER), 'unixepoch', '+8 hours') AS hour,
       COUNT(*) AS added
FROM device
WHERE first_seen >= ?1 AND first_seen <= ?2
GROUP BY hour
ORDER BY hour
`;

/** 小时粒度累计用户基线：窗口开始前已出现的设备数 */
const GROWTH_BASELINE_SELECT_SQL = `
SELECT COUNT(*) AS total
FROM device
WHERE first_seen < ?1
`;

/** 按扩展版本聚合渲染耗时分桶（客户端只上报 5 档，均值由 summary.js 估算） */
const RENDER_SELECT_SQL = `
SELECT app_version AS version,
       COUNT(*) AS device_days,
       COALESCE(SUM(r0 + r1 + r2 + r3 + r4), 0) AS samples,
       ${RENDER_INDEXES.map((index) => `COALESCE(SUM(r${index}), 0) AS r${index}`).join(',\n       ')}
FROM device_daily
WHERE day >= ?1 AND day <= ?2
GROUP BY app_version
`;

export default {
  async fetch(request, env, ctx) {
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (path === '/collect') return handleCollect(request, env);
    if (path === '/health') {
      return jsonResponse({ ok: true, time: Date.now() }, { status: 200, headers: noStore() });
    }
    // 自托管图表库：同源、无需口令（公开库），避免看板依赖第三方 CDN 的可达性
    if (path === '/vendor/echarts.js') {
      return new Response(echartsJs, {
        status: 200,
        headers: {
          'Content-Type': 'text/javascript; charset=UTF-8',
          'X-Content-Type-Options': 'nosniff',
          // 内容随 Worker 部署变化，看板按版本号带 ?v= 查询串，可放心长缓存
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
    if (!isAuthorized(request, env)) return unauthorized();
    if (path === '/dashboard' || path === '/') {
      return new Response(dashboardHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store' },
      });
    }
    if (path === '/api/summary') return handleSummary(request, env);
    if (path === '/api/trend') return handleTrend(request, env);
    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(prune(env));
  },
};

/* ---------------------------------- /collect ---------------------------------- */

async function handleCollect(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }
  let body = '';
  try {
    body = await request.text();
  } catch {
    return new Response('Bad Request', { status: 400, headers: CORS_HEADERS });
  }
  if (!body || body.length > MAX_BODY_BYTES) {
    return new Response('Payload Too Large', { status: 413, headers: CORS_HEADERS });
  }
  let raw;
  try {
    raw = JSON.parse(body);
  } catch {
    return new Response('Bad Request', { status: 400, headers: CORS_HEADERS });
  }
  const normalized = normalizePayload(raw, Date.now());
  if (!normalized.ok) {
    return new Response('Bad Request', { status: 400, headers: CORS_HEADERS });
  }
  if (!env?.DB) {
    return new Response('Storage Unavailable', { status: 500, headers: CORS_HEADERS });
  }
  try {
    await writeRow(env.DB, normalized.value, Date.now());
  } catch {
    return new Response('Storage Error', { status: 500, headers: CORS_HEADERS });
  }
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function writeRow(db, payload, now) {
  const { env, counters } = payload;
  // 上报时间精确到分钟：ts 由客户端给出并在 payload.js 归一，旧客户端回退服务端当前分钟
  const ts = Number.isFinite(Number(payload.ts)) ? Number(payload.ts) : now;
  const hour = beijingHourKey(ts);
  // 设备最新状态：历史记录总条数（精确值）与匿名统计开关是否已关闭
  const historyCount = Number.isFinite(Number(payload.hc)) ? Math.max(0, Math.floor(Number(payload.hc))) : 0;
  const offFlag = Number(payload.off) === 1 ? 1 : 0;

  const deviceArgs = [
    payload.id, now, payload.app,
    env.b, env.bv, env.os, env.arch, env.lang,
    env.w, env.dark, env.standalone, env.touch, payload.tz,
    payload.day, payload.seq,
    counters.opens, counters.dur_ms,
    counters.pages.overview, counters.pages.stats, counters.pages.history, counters.pages.forecast,
    counters.pages.wallet, counters.pages.settings, counters.pages.help, counters.pages.about,
  ];
  const extendedDeviceArgs = [...deviceArgs, env.stv, historyCount, offFlag];
  const dailyArgs = [
    payload.day, payload.id,
    counters.opens, counters.dur_ms,
    counters.pages.overview, counters.pages.stats, counters.pages.history, counters.pages.forecast,
    counters.pages.wallet, counters.pages.settings, counters.pages.help, counters.pages.about,
    counters.render[0], counters.render[1], counters.render[2], counters.render[3], counters.render[4],
    payload.app, payload.seq, ts,
  ];
  const hourlyArgs = [hour, ...dailyArgs.slice(1)];

  // 每次重试重新 prepare：batch 事务失败会整体回滚，last_seq 判据保证重放不会重复累加
  const buildDevice = (withExtras) => db
    .prepare(withExtras ? DEVICE_UPSERT_SQL : DEVICE_UPSERT_LEGACY_SQL)
    .bind(...(withExtras ? extendedDeviceArgs : deviceArgs));
  const buildDaily = () => db.prepare(DEVICE_DAILY_UPSERT_SQL).bind(...dailyArgs);
  const buildHourly = () => db.prepare(DEVICE_HOURLY_UPSERT_SQL).bind(...hourlyArgs);

  try {
    await db.batch([buildDevice(true), buildDaily(), buildHourly()]);
    return;
  } catch {
    // 继续走降级链：可能是 device_hourly 表缺失，也可能是 device 扩展列缺失
  }
  try {
    // 小时表尚未迁移（migrate-hourly.sql）：保留原有的设备 + 日两条写入
    await db.batch([buildDevice(true), buildDaily()]);
    return;
  } catch {}
  // 设备扩展列（st_version/history_count/telemetry_off）尚未迁移：回退旧列集合。
  // 这一步保证未迁移的既有库与旧版本扩展照常上报，/collect 始终返回 204。
  await db.batch([buildDevice(false), buildDaily()]);
}

/* ---------------------------------- 看板接口 ---------------------------------- */

function handleSummary(request, env) {
  return respondWithCache(request, env, () => buildSummary(env));
}

function handleTrend(request, env) {
  return respondWithCache(request, env, async () => {
    const url = new URL(request.url);
    const parts = String(url.searchParams.get('parts') || 'both');
    // bucket=hour 时 from/to 为北京时间小时键（YYYY-MM-DDTHH），缺省为最近 24 小时
    if (url.searchParams.get('bucket') === 'hour') {
      const window = normalizeHourWindow(url.searchParams.get('from'), url.searchParams.get('to'), Date.now());
      return buildTrend(env, window, {
        hourly: parts === 'both' || parts === 'daily',
        render: parts === 'both' || parts === 'render',
      });
    }
    const window = normalizeWindow(url.searchParams.get('from'), url.searchParams.get('to'), Date.now());
    return buildTrend(env, window, {
      daily: parts === 'both' || parts === 'daily',
      render: parts === 'both' || parts === 'render',
    });
  });
}

/**
 * 总计类汇总：设备表一次全表读 + 一次当日聚合。
 * 「当日」按北京时间计算，与多数用户客户端上报的本地日期一致。
 */
async function buildSummary(env) {
  const now = Date.now();
  const today = beijingDayKey(now);
  const [deviceRows, todayRows] = await Promise.all([
    queryAll(env, DEVICE_SELECT_SQL),
    queryAll(env, TODAY_SELECT_SQL, [today]),
  ]);

  const users = deviceRows.length;
  const opens = sumBy(deviceRows, 'opens_total');
  const durMs = sumBy(deviceRows, 'dur_ms_total');
  const disabledUsers = sumBy(deviceRows, 'telemetry_off');

  const pages = {};
  let pageTotal = 0;
  for (const key of PAGE_KEYS) {
    const value = sumBy(deviceRows, `p_${key}_total`);
    pages[key] = value;
    pageTotal += value;
  }

  // 首次出现日期：优先用回填/首次上报写入的 first_day，缺失时用服务端首次见到的时间兜底
  const growthCounts = new Map();
  for (const row of deviceRows) {
    const rawDay = typeof row?.first_day === 'string' ? row.first_day : '';
    const day = /^\d{4}-\d{2}-\d{2}$/.test(rawDay)
      ? rawDay
      : (Number.isFinite(Number(row?.first_seen)) ? beijingDayKey(Number(row.first_seen)) : '');
    if (!day) continue;
    growthCounts.set(day, (growthCounts.get(day) || 0) + 1);
  }
  const userGrowth = cumulativeGrowth(
    Array.from(growthCounts.entries()).map(([day, count]) => ({ day, count })),
  );

  const todayAgg = todayRows[0] || {};
  return {
    generatedAt: now,
    today,
    totals: {
      users,
      opens,
      durMs,
      avgDurMsPerUser: users > 0 ? Math.round(durMs / users) : 0,
      todayUsers: growthCounts.get(today) || 0,
      todayActiveUsers: numberOrZero(todayAgg.devices),
      todayOpens: numberOrZero(todayAgg.opens),
      todayDurMs: numberOrZero(todayAgg.dur_ms),
      // 关闭率取每台设备最新一次上报的开关状态
      disabledUsers,
      disabledRate: users > 0 ? disabledUsers / users : 0,
    },
    userGrowth,
    pages: { ...pages, total: pageTotal },
    historyCount: historyCountCurve(deviceRows.map((row) => row?.history_count)),
    versions: tally(deviceRows.map((row) => row?.app_version), { limit: 12 }),
    env: envBreakdown(deviceRows),
    durationHistogram: durationHistogram(deviceRows.map((row) => row?.dur_ms_total)),
  };
}

/** 趋势类汇总：按天聚合（一次范围扫描）+ 按版本聚合渲染耗时（一次范围扫描） */
async function buildTrend(env, window, parts) {
  const hourlyMode = !!parts.hourly;
  const payload = {
    generatedAt: Date.now(),
    window: hourlyMode
      ? { from: window.from, to: window.to, hours: window.hours, bucket: 'hour' }
      : { from: window.from, to: window.to, days: window.days },
  };
  const tasks = [];

  if (parts.daily) {
    tasks.push(queryAll(env, DAILY_SELECT_SQL, [window.from, window.to]).then((rows) => {
      payload.daily = rows.map((row) => {
        const dayPages = {};
        let dayTotal = 0;
        for (const key of PAGE_KEYS) {
          const value = numberOrZero(row[`p_${key}`]);
          dayPages[key] = value;
          dayTotal += value;
        }
        return {
          day: String(row.day),
          devices: numberOrZero(row.devices),
          opens: numberOrZero(row.opens),
          durMs: numberOrZero(row.dur_ms),
          sessions: numberOrZero(row.sessions),
          pageTotal: dayTotal,
          pages: dayPages,
        };
      });
    }));
  }

  if (hourlyMode) {
    // 小时粒度：趋势行按小时补全（缺失补 0），累计用户以窗口开始前的设备数为基线
    const fromMs = hourKeyToMs(window.from);
    const toMs = hourKeyToMs(window.to) + HOUR_MS - 1;
    tasks.push(Promise.all([
      queryAll(env, HOURLY_SELECT_SQL, [window.from, window.to]),
      queryAll(env, GROWTH_HOUR_SELECT_SQL, [fromMs, toMs]),
      queryAll(env, GROWTH_BASELINE_SELECT_SQL, [fromMs]),
    ]).then(([rows, growthRows, baselineRows]) => {
      fillHourlyTrend(payload, window, rows, growthRows, baselineRows);
    }).catch(() => {
      // 既有库尚未执行 migrate-hourly.sql：返回全 0 曲线并标记，避免看板整体报错
      fillHourlyTrend(payload, window, [], [], []);
      payload.hourlyError = true;
    }));
  }

  if (parts.render) {
    // 小时模式的渲染图仍按天聚合：只取小时窗口覆盖到的日期范围
    const renderFrom = hourlyMode ? String(window.from).slice(0, 10) : window.from;
    const renderTo = hourlyMode ? String(window.to).slice(0, 10) : window.to;
    tasks.push(queryAll(env, RENDER_SELECT_SQL, [renderFrom, renderTo]).then((rows) => {
      payload.renderByVersion = rows
        .map((row) => {
          const buckets = RENDER_INDEXES.map((index) => numberOrZero(row[`r${index}`]));
          return {
            version: row.version ? String(row.version) : '未知',
            deviceDays: numberOrZero(row.device_days),
            samples: numberOrZero(row.samples) || renderSampleCount(buckets),
            buckets,
            avgMs: estimateRenderMs(buckets),
          };
        })
        .sort((a, b) => {
          if (a.avgMs === null && b.avgMs === null) return b.samples - a.samples;
          if (a.avgMs === null) return 1;
          if (b.avgMs === null) return -1;
          return b.avgMs - a.avgMs;
        });
    }));
  }

  await Promise.all(tasks);
  return payload;
}

/**
 * 把小时聚合结果补全为连续小时序列，并计算累计用户基线。
 * 独立成函数便于小时表缺失时以全 0 数据兜底。
 */
function fillHourlyTrend(payload, window, rows, growthRows, baselineRows) {
  const rowsByHour = new Map((rows || []).map((row) => [String(row.hour), row]));
  const addedByHour = new Map((growthRows || []).map((row) => [String(row.hour), numberOrZero(row.added)]));
  let running = numberOrZero(baselineRows?.[0]?.total);
  payload.hourly = [];
  payload.userGrowthHourly = [];
  let cursor = window.from;
  for (let i = 0; i < window.hours; i++) {
    const row = rowsByHour.get(cursor);
    const hourPages = {};
    let hourTotal = 0;
    for (const key of PAGE_KEYS) {
      const value = row ? numberOrZero(row[`p_${key}`]) : 0;
      hourPages[key] = value;
      hourTotal += value;
    }
    payload.hourly.push({
      hour: cursor,
      devices: row ? numberOrZero(row.devices) : 0,
      opens: row ? numberOrZero(row.opens) : 0,
      durMs: row ? numberOrZero(row.dur_ms) : 0,
      sessions: row ? numberOrZero(row.sessions) : 0,
      pageTotal: hourTotal,
      pages: hourPages,
    });
    const added = addedByHour.get(cursor) || 0;
    running += added;
    payload.userGrowthHourly.push({ hour: cursor, added, cumulative: running });
    cursor = shiftHour(cursor, 1);
  }
}

/**
 * Cache API 包装：默认按 URL（不含 force 参数）缓存 CACHE_TTL_SECONDS 秒。
 * 命中直接返回缓存快照；?force=1 绕过缓存重新查询并回填，便于看板「刷新」按钮取实时数据。
 */
async function respondWithCache(request, env, producer) {
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1';
  const keyUrl = new URL(url.toString());
  keyUrl.searchParams.delete('force');
  const cache = typeof caches !== 'undefined' && caches && caches.default ? caches.default : null;
  const cacheKey = cache ? new Request(keyUrl.toString(), { method: 'GET' }) : null;

  if (cache && !force) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const body = await hit.text();
        return jsonText(body, { headers: { ...noStore(), 'X-Cache': 'HIT' } });
      }
    } catch {}
  }

  let data;
  try {
    data = await producer();
  } catch {
    return jsonResponse({ ok: false, error: '查询失败' }, { status: 500, headers: noStore() });
  }
  const body = JSON.stringify(data);

  if (cache) {
    try {
      await cache.put(cacheKey, new Response(body, {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Cache-Control': `max-age=${CACHE_TTL_SECONDS}`,
        },
      }));
    } catch {}
  }

  return jsonText(body, { headers: { ...noStore(), 'X-Cache': force ? 'BYPASS' : 'MISS' } });
}

/* ---------------------------------- 定时清理 ---------------------------------- */

async function prune(env) {
  if (!env?.DB) return;
  const cutoff = beijingDayKey(Date.now() - RETENTION_DAYS * 86400000);
  try {
    await env.DB.prepare('DELETE FROM device_daily WHERE day < ?1').bind(cutoff).run();
  } catch {}
  const hourCutoff = beijingHourKey(Date.now() - HOURLY_RETENTION_DAYS * 86400000);
  try {
    await env.DB.prepare('DELETE FROM device_hourly WHERE hour < ?1').bind(hourCutoff).run();
  } catch {}
}

/* ---------------------------------- 工具 ---------------------------------- */

async function queryAll(env, sql, params = []) {
  const stmt = params.length ? env.DB.prepare(sql).bind(...params) : env.DB.prepare(sql);
  const res = await stmt.all();
  return res?.results || [];
}

function jsonResponse(data, init = {}) {
  return jsonText(JSON.stringify(data), init);
}

function jsonText(body, init = {}) {
  const headers = { 'Content-Type': 'application/json; charset=UTF-8', ...(init.headers || {}) };
  return new Response(body, { status: init.status || 200, headers });
}

function noStore() {
  return { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=UTF-8' };
}

function unauthorized() {
  return new Response('需要访问口令：请使用部署时设置的管理令牌登录。', {
    status: 401,
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Cache-Control': 'no-store',
      'WWW-Authenticate': 'Basic realm="api-usage-stat", charset="UTF-8"',
    },
  });
}

function isAuthorized(request, env) {
  const token = String(env?.DASHBOARD_TOKEN || '');
  if (!token) return false;
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded = '';
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const separator = decoded.indexOf(':');
  const password = separator >= 0 ? decoded.slice(separator + 1) : '';
  return timingSafeEqual(password, token);
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
