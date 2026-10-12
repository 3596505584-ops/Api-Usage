import { describe, it, expect } from 'vitest';
import worker from './worker.js';
import { beijingDayKey, beijingHourKey, offsetDayKey, shiftHour } from './summary.js';

const TOKEN = 'test-token';
const MIN = 60 * 1000;
const TODAY = beijingDayKey();
const YESTERDAY = offsetDayKey(-1);

function authHeaders() {
  return { Authorization: 'Basic ' + btoa('user:' + TOKEN) };
}

/** 按 SQL 特征返回预置结果，避免测试里依赖真实 SQLite 引擎 */
function createDb(fixtures, options) {
  const opts = options || {};
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const stmt = {
        sql,
        params: [],
        bind(...params) {
          stmt.params = params;
          return stmt;
        },
        async all() {
          calls.push({ sql, params: stmt.params });
          if (sql.includes('strftime')) return { results: fixtures.growthHourly };
          if (sql.includes('first_seen <')) return { results: fixtures.growthBaseline };
          if (sql.includes('GROUP BY hour')) return { results: fixtures.hourly };
          if (sql.includes('GROUP BY day')) return { results: fixtures.daily };
          if (sql.includes('GROUP BY app_version')) return { results: fixtures.render };
          if (sql.includes('FROM device_daily')) return { results: fixtures.today };
          return { results: fixtures.devices };
        },
        async run() {
          calls.push({ sql, params: stmt.params });
          return {};
        },
      };
      return stmt;
    },
    async batch(stmts) {
      calls.push({
        batch: stmts.length,
        sqls: stmts.map((stmt) => stmt.sql),
        params: stmts.map((stmt) => stmt.params),
      });
      // 模拟既有库尚未执行 migrate-hourly.sql：带小时表的三条事务整体失败
      if (opts.failTripleBatch && stmts.length === 3) throw new Error('no such table: device_hourly');
      // 模拟既有库尚未执行 migrate-st-version.sql：含 st_version 列的语句整体失败
      if (opts.failStvColumn && stmts[0] && String(stmts[0].sql).includes('st_version')) {
        throw new Error('no such column: st_version');
      }
      return stmts.map(() => ({ success: true }));
    },
  };
}

function deviceRow(overrides) {
  const base = {
    app_version: '3.1.2',
    browser: 'Chrome', browser_major: '141', os: 'Windows', arch: 'x86_64',
    lang: 'zh-CN', width_bucket: 'gt1024', dark: 0, standalone: 0, touch: 0,
    tz_offset: 8, first_day: YESTERDAY, first_seen: 1000, st_version: '1.13.5',
    history_count: 128, telemetry_off: 0,
    opens_total: 5, dur_ms_total: 8 * MIN,
  };
  for (const key of ['overview', 'stats', 'history', 'forecast', 'wallet', 'settings', 'help', 'about']) {
    base['p_' + key + '_total'] = 0;
  }
  base.p_overview_total = 5;
  base.p_stats_total = 1;
  return Object.assign(base, overrides || {});
}

const DEVICES = [
  deviceRow({}),
  deviceRow({
    app_version: '3.1.1',
    browser: 'Firefox', browser_major: '128', os: 'Android', arch: 'arm64',
    lang: 'ja-JP', width_bucket: 'le480', dark: 1, standalone: 1, touch: 1,
    tz_offset: 9, first_day: TODAY, first_seen: 2000,
    history_count: 5, telemetry_off: 1,
    opens_total: 1, dur_ms_total: 1 * MIN,
    p_overview_total: 0, p_stats_total: 0, p_wallet_total: 4,
  }),
];

const DAILY = [
  {
    day: YESTERDAY, devices: 1, opens: 3, dur_ms: 5 * MIN, sessions: 1,
    p_overview: 3, p_stats: 1, p_history: 0, p_forecast: 0, p_wallet: 0,
    p_settings: 0, p_help: 0, p_about: 0,
  },
  {
    day: TODAY, devices: 2, opens: 3, dur_ms: 4 * MIN, sessions: 2,
    p_overview: 2, p_stats: 0, p_history: 0, p_forecast: 0, p_wallet: 4,
    p_settings: 0, p_help: 0, p_about: 0,
  },
];

const RENDER = [
  {
    version: '3.1.1', device_days: 1, samples: 1,
    r0: 1, r1: 0, r2: 0, r3: 0, r4: 0,
  },
  {
    version: '3.1.2', device_days: 2, samples: 3,
    r0: 0, r1: 2, r2: 0, r3: 0, r4: 1,
  },
];

const PREV_HOUR = shiftHour(beijingHourKey(), -1);
const NOW_HOUR = beijingHourKey();

const HOURLY = [
  {
    hour: PREV_HOUR, devices: 1, opens: 2, dur_ms: 2 * MIN, sessions: 1,
    p_overview: 2, p_stats: 0, p_history: 0, p_forecast: 0, p_wallet: 0,
    p_settings: 0, p_help: 0, p_about: 0,
  },
  {
    hour: NOW_HOUR, devices: 2, opens: 3, dur_ms: 3 * MIN, sessions: 2,
    p_overview: 1, p_stats: 1, p_history: 0, p_forecast: 0, p_wallet: 4,
    p_settings: 0, p_help: 0, p_about: 0,
  },
];

const GROWTH_HOURLY = [{ hour: NOW_HOUR, added: 1 }];

function makeEnv(fixtures = {}, options = {}) {
  const db = createDb({
    devices: DEVICES,
    daily: DAILY,
    today: [{ devices: 2, opens: 3, dur_ms: 4 * MIN }],
    render: RENDER,
    hourly: HOURLY,
    growthHourly: GROWTH_HOURLY,
    growthBaseline: [{ total: 5 }],
    ...fixtures,
  }, options);
  return { env: { DB: db, DASHBOARD_TOKEN: TOKEN }, db };
}

function get(path, env) {
  return worker.fetch(new Request('https://stat.example.com' + path, { headers: authHeaders() }), env, {
    waitUntil() {},
  });
}

describe('鉴权与健康检查', () => {
  it('缺少口令返回 401', async () => {
    const { env } = makeEnv();
    const res = await worker.fetch(new Request('https://stat.example.com/api/summary'), env, { waitUntil() {} });
    expect(res.status).toBe(401);
  });

  it('/health 无需口令', async () => {
    const { env } = makeEnv();
    const res = await worker.fetch(new Request('https://stat.example.com/health'), env, { waitUntil() {} });
    expect(res.status).toBe(200);
  });

  it('/dashboard 返回看板页并包含新版分区', async () => {
    const { env } = makeEnv();
    const res = await get('/dashboard', env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('总计速览');
    expect(html).toContain('/api/trend');
    // 四个趋势图可选按小时粒度，并提供最近 24 小时快捷选项
    expect(html).toContain('data-bucket="hour"');
    expect(html).toContain('最近 24 小时');
    // 图表库仅走同源自托管，不再引用任何第三方 CDN
    expect(html).toContain("'/vendor/echarts.js?v=6.1.0-full'");
    expect(html).not.toContain('echarts@6.1.0');
  });

  it('/vendor/echarts.js 自托管图表库无需口令且按 JS 返回', async () => {
    const { env } = makeEnv();
    const res = await worker.fetch(new Request('https://stat.example.com/vendor/echarts.js'), env, { waitUntil() {} });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/javascript');
    const body = await res.text();
    expect(body.length).toBeGreaterThan(100000);
    expect(body).toContain('echarts');
    // 必须是 full 构建：simple 构建不含 Tooltip 组件，数值提示会整个失效
    expect(body).toContain('showTip');
  });
});

/** 旧版本扩展的上报体：字段与 v1 契约一致，且没有新增的 ts 字段 */
function legacyBody(extra = {}) {
  return JSON.stringify({
    v: 1,
    id: '0123456789abcdef0123456789abcdef',
    seq: 7,
    day: TODAY,
    tz: 8,
    app: '3.1.2',
    env: {
      b: 'Chrome', bv: '141', os: 'Windows', arch: 'x86_64', lang: 'zh-CN',
      w: 'gt1024', dark: false, standalone: false, touch: false,
    },
    s: {
      opens: 2,
      dur_ms: 60000,
      pages: { overview: 2, stats: 0, history: 0, forecast: 0, wallet: 0, settings: 0, help: 0, about: 0 },
      render: [1, 0, 0, 0, 0],
    },
    daily: true,
    ...extra,
  });
}

describe('/collect 写入契约保持不变', () => {
  it('合法上报返回 204 且分别写入设备、日与小时数据', async () => {
    const { env, db } = makeEnv();
    const res = await worker.fetch(new Request('https://stat.example.com/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: legacyBody({
        ts: Date.now() - 61000,
        env: {
          b: 'Chrome', bv: '141', os: 'Windows', arch: 'x86_64', lang: 'zh-CN',
          w: 'gt1024', dark: false, standalone: false, touch: false, stv: '1.13.5',
        },
      }),
    }), env, { waitUntil() {} });
    expect(res.status).toBe(204);
    const batch = db.calls.find((call) => call.batch);
    expect(batch.batch).toBe(3);
    expect(batch.sqls[0]).toContain('INSERT INTO device');
    expect(batch.sqls[1]).toContain('INSERT INTO device_daily');
    expect(batch.sqls[2]).toContain('INSERT INTO device_hourly');
    // 酒馆版本号列在设备语句末位；小时桶为北京时间小时键；时间戳为分钟精度
    expect(batch.params[0][25]).toBe('1.13.5');
    expect(batch.params[0][26]).toBe(0);
    expect(batch.params[0][27]).toBe(0);
    expect(batch.params[2][0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}$/);
    expect(batch.params[2][19] % 60000).toBe(0);
  });

  it('旧版本上报（无 ts 字段）仍写入设备、日与小时数据', async () => {
    // 该上报体与旧版扩展完全一致：没有 ts 字段
    expect(JSON.parse(legacyBody()).ts).toBeUndefined();
    const { env, db } = makeEnv();
    const res = await worker.fetch(new Request('https://stat.example.com/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: legacyBody(),
    }), env, { waitUntil() {} });
    expect(res.status).toBe(204);
    expect(db.calls.find((call) => call.batch && call.batch === 3)).toBeTruthy();
  });

  it('小时表尚未迁移时降级为原有两条写入，上报仍返回 204', async () => {
    const { env, db } = makeEnv({}, { failTripleBatch: true });
    const res = await worker.fetch(new Request('https://stat.example.com/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: legacyBody(),
    }), env, { waitUntil() {} });
    expect(res.status).toBe(204);
    expect(db.calls.filter((call) => call.batch).map((call) => call.batch)).toEqual([3, 2]);
  });

  it('关闭开关的最终上报把设备最新开关状态记为已关闭', async () => {
    const { env, db } = makeEnv();
    const res = await worker.fetch(new Request('https://stat.example.com/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: legacyBody({ off: true, hc: 7 }),
    }), env, { waitUntil() {} });
    expect(res.status).toBe(204);
    const batch = db.calls.find((call) => call.batch);
    expect(batch.batch).toBe(3);
    expect(batch.params[0][26]).toBe(7);
    expect(batch.params[0][27]).toBe(1);
  });

  it('酒馆版本列尚未迁移时回退旧列集合，上报仍返回 204', async () => {
    const { env, db } = makeEnv({}, { failStvColumn: true });
    const res = await worker.fetch(new Request('https://stat.example.com/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: legacyBody(),
    }), env, { waitUntil() {} });
    expect(res.status).toBe(204);
    const batches = db.calls.filter((call) => call.batch);
    expect(batches.map((call) => call.batch)).toEqual([3, 2, 2]);
    expect(batches[2].sqls[0]).not.toContain('st_version');
  });

  it('非法上报返回 400 且不写库', async () => {
    const { env, db } = makeEnv();
    const res = await worker.fetch(new Request('https://stat.example.com/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ v: 2, id: 'bad' }),
    }), env, { waitUntil() {} });
    expect(res.status).toBe(400);
    expect(db.calls).toHaveLength(0);
  });
});

describe('/api/summary 总计口径', () => {
  it('累计、当日、画像、分布字段齐全且数值正确', async () => {
    const { env } = makeEnv();
    const res = await get('/api/summary', env);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.today).toBe(TODAY);
    expect(data.totals.users).toBe(2);
    expect(data.totals.opens).toBe(6);
    expect(data.totals.durMs).toBe(9 * MIN);
    expect(data.totals.avgDurMsPerUser).toBe(Math.round((9 * MIN) / 2));
    expect(data.totals.todayUsers).toBe(1);
    expect(data.totals.todayActiveUsers).toBe(2);
    expect(data.totals.todayOpens).toBe(3);
    expect(data.totals.todayDurMs).toBe(4 * MIN);
    expect(data.totals.disabledUsers).toBe(1);
    expect(data.totals.disabledRate).toBe(0.5);
    // 历史记录条数：X 轴每 10 条一组，Y 轴为该组设备数
    expect(data.historyCount).toHaveLength(51);
    const at = (from) => data.historyCount.find((item) => item.from === from);
    expect(at(0)).toEqual({ from: 0, to: 9, label: '0–9 条', count: 1 });
    expect(at(120)).toEqual({ from: 120, to: 129, label: '120–129 条', count: 1 });
    expect(at(500)).toEqual({ from: 500, to: null, label: '500 条以上', count: 0 });

    expect(data.userGrowth).toEqual([
      { day: YESTERDAY, added: 1, cumulative: 1 },
      { day: TODAY, added: 1, cumulative: 2 },
    ]);
    expect(data.pages.total).toBe(10);
    expect(data.pages.overview).toBe(5);
    expect(data.versions.map((item) => item.label).sort()).toEqual(['3.1.1', '3.1.2']);
    expect(data.env.browser).toEqual([
      { label: 'Chrome', count: 1 },
      { label: 'Firefox', count: 1 },
    ]);
    expect(data.env.browserVersion).toHaveLength(2);
    expect(data.env.stVersion).toEqual([{ label: '1.13.5', count: 2 }]);
    expect(data.env.dark[0]).toEqual({ label: '浅色偏好', count: 1 });
    expect(data.env.tz.map((item) => item.label)).toEqual(['UTC+8', 'UTC+9']);
    expect(data.durationHistogram).toHaveLength(9);
    expect(data.durationHistogram.reduce((sum, item) => sum + item.count, 0)).toBe(2);
    expect(data.durationHistogram[1]).toEqual({ label: '<1 分钟', count: 1 });
    expect(data.durationHistogram[2]).toEqual({ label: '<10 分钟', count: 1 });
  });

  it('空库时返回零值而不是报错', async () => {
    const { env } = makeEnv({ devices: [], today: [] });
    const res = await get('/api/summary', env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totals).toEqual({
      users: 0, opens: 0, durMs: 0, avgDurMsPerUser: 0,
      todayUsers: 0, todayActiveUsers: 0, todayOpens: 0, todayDurMs: 0,
      disabledUsers: 0, disabledRate: 0,
    });
    expect(data.historyCount.every((item) => item.count === 0)).toBe(true);
    expect(data.userGrowth).toEqual([]);
    expect(data.env.browser).toEqual([]);
  });
});

describe('/api/trend 趋势口径', () => {
  it('默认窗口为最近 30 天，dates 与面板明细正确', async () => {
    const { env } = makeEnv();
    const res = await get('/api/trend', env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.window).toEqual({
      from: offsetDayKey(-29),
      to: TODAY,
      days: 30,
    });
    expect(data.daily).toHaveLength(2);
    expect(data.daily[1].devices).toBe(2);
    expect(data.daily[1].pageTotal).toBe(6);
    expect(data.daily[1].pages.wallet).toBe(4);

    const versions = data.renderByVersion;
    expect(versions.map((item) => item.version)).toEqual(['3.1.2', '3.1.1']);
    expect(versions[0].avgMs).toBe(Math.round((2 * 200 + 3000) / 3));
    expect(versions[0].samples).toBe(3);
    expect(versions[1].avgMs).toBe(50);
  });

  it('parts 参数可单独取趋势或渲染数据', async () => {
    const { env } = makeEnv();
    const dailyOnly = await (await get('/api/trend?parts=daily&from=' + YESTERDAY + '&to=' + TODAY, env)).json();
    expect(dailyOnly.daily).toHaveLength(2);
    expect(dailyOnly.renderByVersion).toBeUndefined();
    expect(dailyOnly.window.days).toBe(2);

    const renderOnly = await (await get('/api/trend?parts=render&from=' + YESTERDAY + '&to=' + TODAY, env)).json();
    expect(renderOnly.daily).toBeUndefined();
    expect(renderOnly.renderByVersion).toHaveLength(2);
  });

  it('bucket=hour 返回连续小时序列与累计用户基线', async () => {
    const { env } = makeEnv();
    const res = await get('/api/trend?bucket=hour&from=' + PREV_HOUR + '&to=' + NOW_HOUR + '&parts=daily', env);
    const data = await res.json();
    expect(data.window).toEqual({ from: PREV_HOUR, to: NOW_HOUR, hours: 2, bucket: 'hour' });
    expect(data.hourly).toHaveLength(2);
    expect(data.hourly[0].hour).toBe(PREV_HOUR);
    expect(data.hourly[0].opens).toBe(2);
    expect(data.hourly[1].opens).toBe(3);
    expect(data.hourly[1].pages.wallet).toBe(4);
    expect(data.userGrowthHourly).toEqual([
      { hour: PREV_HOUR, added: 0, cumulative: 5 },
      { hour: NOW_HOUR, added: 1, cumulative: 6 },
    ]);
    expect(data.daily).toBeUndefined();
  });

  it('bucket=hour 缺省窗口为最近 24 小时并补全空桶', async () => {
    const { env } = makeEnv();
    const data = await (await get('/api/trend?bucket=hour&parts=daily', env)).json();
    expect(data.window.hours).toBe(24);
    expect(data.window.bucket).toBe('hour');
    expect(data.hourly).toHaveLength(24);
    expect(data.userGrowthHourly).toHaveLength(24);
  });

  it('非法与倒置区间被归一，末日期不晚于今天', async () => {
    const { env } = makeEnv();
    const future = await (await get('/api/trend?from=2026-10-05&to=2026-10-01', env)).json();
    expect(future.window.from).toBe('2026-10-01');
    expect(future.window.to).toBe('2026-10-01');
    expect(future.window.days).toBe(1);

    const bad = await (await get('/api/trend?from=not-a-day&to=also-bad', env)).json();
    expect(bad.window.to).toBe(TODAY);
    expect(bad.window.days).toBe(30);
  });
});

describe('定时清理', () => {
  it('按保留期删除过期的逐设备日数据', async () => {
    const { env, db } = makeEnv();
    const pending = [];
    await worker.scheduled({}, env, { waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending);
    const deletion = db.calls.find((call) => call.sql.includes('DELETE FROM device_daily'));
    expect(deletion).toBeTruthy();
    expect(deletion.params[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const hourDeletion = db.calls.find((call) => call.sql.includes('DELETE FROM device_hourly'));
    expect(hourDeletion).toBeTruthy();
    expect(hourDeletion.params[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}$/);
  });
});
