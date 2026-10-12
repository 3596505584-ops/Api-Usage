/**
 * 看板页渲染测试：用最小 DOM 桩在 Node 里执行 dashboard.html 的内联脚本，
 * 覆盖「图表库可用」与「图表库不可用（CDN 全部失败）」两条路径，
 * 确保数据加载、卡片、图表 option 与文本兜底都不会回归。
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it, expect } from 'vitest';

const html = readFileSync(new URL('./dashboard.html', import.meta.url), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) throw new Error('看板页未找到内联脚本');
const code = match[1];

const MIN = 60 * 1000;
const summaryData = {
  generatedAt: Date.UTC(2026, 9, 11, 4, 0, 0),
  today: '2026-10-11',
  totals: {
    users: 42, opens: 1234, durMs: 30 * 60 * 1000, avgDurMsPerUser: 44 * 1000,
    todayUsers: 3, todayActiveUsers: 28, todayOpens: 57, todayDurMs: 12 * 60 * 1000,
    disabledUsers: 5, disabledRate: 5 / 42,
  },
  userGrowth: [
    { day: '2026-10-09', added: 1, cumulative: 40 },
    { day: '2026-10-10', added: 1, cumulative: 41 },
    { day: '2026-10-11', added: 1, cumulative: 42 },
  ],
  pages: {
    overview: 12, stats: 9, history: 7, forecast: 5, wallet: 4, settings: 3, help: 2, about: 1, total: 43,
  },
  historyCount: [
    { label: '0 条', count: 2 },
    { label: '1–10 条', count: 10 },
    { label: '11–50 条', count: 18 },
    { label: '51–200 条', count: 9 },
    { label: '201–1000 条', count: 3 },
    { label: '1001 条以上', count: 0 },
  ],
  // 数量与版本高低故意逆序（低版本数量更高），用于验证展示层按版本号降序排列
  versions: [{ label: '3.1.1', count: 40 }, { label: '3.1.2', count: 2 }],
  env: {
    browser: [{ label: 'Chrome', count: 30 }, { label: 'Firefox', count: 12 }],
    browserVersion: [{ label: 'Firefox 128', count: 30 }, { label: 'Chrome 141', count: 12 }],
    stVersion: [{ label: '1.13.4', count: 30 }, { label: '1.13.5', count: 12 }],
    os: [{ label: 'Windows', count: 30 }, { label: 'Android', count: 12 }],
    arch: [{ label: 'x86_64', count: 33 }, { label: 'arm64', count: 9 }],
    lang: [{ label: 'zh-CN', count: 40 }, { label: 'en-US', count: 2 }],
    width: [{ label: '> 1024px', count: 36 }, { label: '≤ 480px', count: 6 }],
    dark: [{ label: '浅色偏好', count: 25 }, { label: '深色偏好', count: 17 }],
    standalone: [{ label: '浏览器标签', count: 39 }, { label: '独立窗口', count: 3 }],
    touch: [{ label: '鼠标 / 精确指针', count: 34 }, { label: '触屏 / 粗指针', count: 8 }],
    tz: [{ label: 'UTC+8', count: 38 }, { label: 'UTC+9', count: 4 }],
  },
  durationHistogram: [
    { label: '未记录', count: 1 },
    { label: '<1 分钟', count: 2 },
    { label: '<10 分钟', count: 10 },
    { label: '<30 分钟', count: 8 },
    { label: '<1 小时', count: 7 },
    { label: '<3 小时', count: 6 },
    { label: '<10 小时', count: 4 },
    { label: '<30 小时', count: 3 },
    { label: '≥30 小时', count: 1 },
  ],
};

const dailyData = {
  generatedAt: Date.now(),
  window: { from: '2026-09-12', to: '2026-10-11', days: 30 },
  daily: [
    {
      day: '2026-10-10', devices: 30, opens: 90, durMs: 20 * MIN, sessions: 40, pageTotal: 60,
      pages: { overview: 20, stats: 10, history: 10, forecast: 5, wallet: 5, settings: 5, help: 3, about: 2 },
    },
    {
      day: '2026-10-11', devices: 42, opens: 120, durMs: 30 * MIN, sessions: 55, pageTotal: 80,
      pages: { overview: 30, stats: 15, history: 12, forecast: 8, wallet: 6, settings: 5, help: 3, about: 0 },
    },
    {
      // 当天没有任何面板打开：占比应为断点（null），而不是 0%
      day: '2026-10-12', devices: 0, opens: 0, durMs: 0, sessions: 0, pageTotal: 0,
      pages: { overview: 0, stats: 0, history: 0, forecast: 0, wallet: 0, settings: 0, help: 0, about: 0 },
    },
  ],
};

const renderData = {
  generatedAt: Date.now(),
  renderByVersion: [
    { version: '3.1.2', deviceDays: 40, samples: 400, buckets: [300, 60, 30, 8, 2], avgMs: 262 },
    { version: '3.1.1', deviceDays: 5, samples: 50, buckets: [40, 8, 2, 0, 0], avgMs: 131 },
  ],
};

function makeEl(tag, id) {
  const el = {
    tagName: tag,
    id: id || '',
    children: [],
    innerHTML: '',
    textContent: '',
    hidden: false,
    className: '',
    style: {},
    _attrs: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute(key, value) { el._attrs[key] = value; },
    getAttribute(key) { return Object.prototype.hasOwnProperty.call(el._attrs, key) ? el._attrs[key] : null; },
    appendChild(child) { el.children.push(child); return child; },
    remove() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    closest() { return null; },
  };
  return el;
}

/**
 * 每个场景一套独立 DOM 桩。
 * mode：'no-lib'（全部来源失败）/ 'echarts-ready'（页面已存在 echarts）/
 *       'self-host-ok'（自托管成功）/ 'cdn-ok'（仅公共 CDN 成功）/
 *       'late-ok'（脚本超时判负后才真正执行成功）
 */
function createHarness(mode) {
  const elements = new Map();
  const options = new Map();
  const mockEcharts = {
    init(host) {
      return {
        setOption(option) { options.set(host && host.id ? host.id : 'unknown', option); },
        resize() {},
        dispose() {},
      };
    },
  };

  function localGetEl(id) {
    if (!elements.has(id)) elements.set(id, makeEl('div', id));
    return elements.get(id);
  }

  const documentStub = {
    body: makeEl('body'),
    head: {
      appendChild(script) {
        const src = String(script.src || '');
        if (mode === 'late-ok') {
          // 所有来源先报失败，但稍后 window.echarts 出现（模拟「脚本迟到」）
          setTimeout(() => { if (typeof script.onerror === 'function') script.onerror(); }, 0);
          if (!windowStub.echarts) {
            setTimeout(() => { windowStub.echarts = mockEcharts; }, 300);
          }
          return;
        }
        const success = mode === 'self-host-ok'
          ? src.indexOf('/vendor/echarts.js') >= 0
          : mode === 'cdn-ok'
            ? src.indexOf('npmmirror') >= 0
            : false;
        setTimeout(() => {
          if (success) {
            windowStub.echarts = mockEcharts;
            if (typeof script.onload === 'function') script.onload();
            return;
          }
          if (typeof script.onerror === 'function') script.onerror();
        }, 0);
      },
    },
    getElementById: (id) => localGetEl(id),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => makeEl(tag),
    addEventListener() {},
  };

  const windowStub = { addEventListener() {} };
  if (mode === 'echarts-ready') windowStub.echarts = mockEcharts;

  const fetchStub = async (input) => {
    const url = String(input);
    const body = url.includes('/api/summary')
      ? summaryData
      : url.includes('parts=render')
        ? renderData
        : dailyData;
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'MISS' },
      json: async () => body,
    };
  };

  const context = {
    window: windowStub,
    document: documentStub,
    fetch: fetchStub,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    Promise,
    Date,
    Math,
    JSON,
    Number,
    String,
    Array,
    Object,
    Map,
    Set,
    Error,
    isNaN,
    parseInt,
    parseFloat,
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
  };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'dashboard-inline.js' });

  return {
    localGetEl,
    options,
    text: (id) => localGetEl(id).innerHTML,
    settle: () => new Promise((resolve) => setTimeout(resolve, 320)),
  };
}

describe('看板页小时粒度控件', () => {
  it('四个趋势图提供按天/按小时切换与最近 24 小时选项', () => {
    expect(html).toContain('data-bucket="hour"');
    expect(html).toContain('data-hours="24"');
    expect(html).toContain('最近 24 小时');
    expect(html).toContain('bucket=hour');
    // 小时 X 轴标签精确到小时
    expect(html).toContain('function shortHour(');
  });
});

describe('看板页渲染（图表库不可用）', () => {
  it('渲染总计卡片、分布兜底列表与缓存徽标', async () => {
    const harness = createHarness('no-lib');
    await harness.settle();

    expect(harness.text('cards-life')).toContain('不重复累计用户');
    expect(harness.text('cards-life')).toContain('42');
    expect(harness.text('cards-life')).toContain('44 秒');
    expect(harness.text('cards-life')).toContain('匿名统计关闭率');
    expect(harness.text('cards-life')).toContain('11.9%');
    expect(harness.text('cards-life')).toContain('5 / 42');
    expect(harness.text('cards-today')).toContain('当日新增用户');
    expect(harness.text('cards-today')).toContain('57');
    expect(harness.text('cards-today')).toContain('当日不重复用户');
    expect(harness.text('cards-today')).toContain('28');

    expect(harness.text('fallback-pages')).toContain('用量概览');
    expect(harness.text('fallback-pages')).toContain('12');
    expect(harness.text('fallback-versions')).toContain('3.1.2');
    expect(harness.text('fallback-arch')).toContain('x86_64');
    expect(harness.text('fallback-duration')).toContain('≥30 小时');
    expect(harness.text('fallback-env-tz')).toContain('UTC+8');
    expect(harness.text('fallback-env-st-version')).toContain('1.13.5');

    const renderHtml = harness.text('fallback-render');
    expect(renderHtml.indexOf('3.1.2')).toBeLessThan(renderHtml.indexOf('3.1.1'));
    expect(renderHtml).toContain('262 ms');

    expect(harness.text('meta')).toContain('数据生成于');
    expect(harness.localGetEl('cache-badge').textContent).toContain('实时查询');
    expect(harness.localGetEl('lib-banner').hidden).toBe(false);
  });
});

describe('看板页渲染（图表库可用）', () => {
  it('生成正确的 ECharts option', async () => {
    const harness = createHarness('echarts-ready');
    await harness.settle();
    const option = (id) => harness.options.get('chart-' + id) || {};

    const pages = option('pages');
    expect(pages.yAxis.data).toHaveLength(8);
    expect(pages.series).toHaveLength(1);
    expect(pages.series[0].data).toHaveLength(8);
    expect(pages.tooltip.trigger).toBe('item');

    const growth = option('growth');
    expect(growth.series).toHaveLength(1);
    expect(growth.series[0].areaStyle).toBeDefined();
    expect(growth.yAxis.type).toBe('value');
    expect(growth.series[0].data).toEqual([40, 41, 42]);

    const dailyPages = option('daily-pages');
    expect(dailyPages.series).toHaveLength(8);
    expect(dailyPages.yAxis.max).toBe(100);
    expect(dailyPages.series[0].connectNulls).toBe(false);
    const aboutSeries = dailyPages.series.find((item) => item.name === '关于');
    expect(aboutSeries.data).toEqual([3.3, 0, null]);

    const historyCount = option('history-count');
    expect(historyCount.series[0].type).toBe('pie');
    expect(historyCount.series[0].data.map((item) => item.name)).toContain('1–10 条');
    expect(historyCount.series[0].data.map((item) => item.value).reduce((sum, value) => sum + value, 0)).toBe(42);

    const os = option('os');
    expect(os.series[0].type).toBe('pie');
    expect(os.series[0].data).toHaveLength(2);

    const duration = option('duration');
    expect(duration.series[0].data).toHaveLength(9);

    const render = option('render');
    const labels = render.yAxis.data;
    expect(labels[labels.length - 1]).toBe('3.1.2');
    expect(labels[0]).toBe('3.1.1');
    expect(typeof render.series[0].label.formatter).toBe('function');

    // 扩展版本分布：版本号降序（drawBar 反转后数组末项显示在最顶，故顶部应为高版本）
    const versionLabels = option('versions').yAxis.data;
    expect(versionLabels[versionLabels.length - 1]).toBe('3.1.2');
    expect(versionLabels[0]).toBe('3.1.1');
    // 浏览器主版本分布：主版本号降序
    const browserVersionLabels = option('env-browser-version').yAxis.data;
    expect(browserVersionLabels[browserVersionLabels.length - 1]).toBe('Chrome 141');
    expect(browserVersionLabels[0]).toBe('Firefox 128');

    // 酒馆版本分布：按版本号降序
    const stVersionLabels = option('env-st-version').yAxis.data;
    expect(stVersionLabels[stVersionLabels.length - 1]).toBe('1.13.5');
    expect(stVersionLabels[0]).toBe('1.13.4');

    expect(harness.localGetEl('lib-banner').hidden).toBe(true);
    expect(harness.localGetEl('fallback-pages').hidden).toBe(true);
  });
});

describe('图表库多源竞速', () => {
  it('自托管可用时使用自托管并正常渲染', async () => {
    const harness = createHarness('self-host-ok');
    await harness.settle();
    expect(harness.localGetEl('lib-badge').textContent).toContain('自托管');
    expect(harness.localGetEl('lib-banner').hidden).toBe(true);
    expect(harness.options.get('chart-pages')).toBeTruthy();
    expect(harness.options.get('chart-daily-pages').series).toHaveLength(8);
  });

  it('自托管不可用时自动切到公共 CDN', async () => {
    const harness = createHarness('cdn-ok');
    await harness.settle();
    expect(harness.localGetEl('lib-badge').textContent).toContain('npmmirror');
    expect(harness.localGetEl('lib-banner').hidden).toBe(true);
    expect(harness.options.get('chart-os')).toBeTruthy();
  });

  it('全部来源失败时把每个来源的结果显示出来', async () => {
    const harness = createHarness('no-lib');
    await harness.settle();
    expect(harness.localGetEl('lib-banner').hidden).toBe(false);
    const text = harness.localGetEl('lib-banner-text').textContent;
    expect(text).toContain('自托管：失败');
    expect(text).toContain('npmmirror：失败');
    expect(text).toContain('jsdelivr：失败');
    expect(text).toContain('unpkg：失败');
    expect(harness.localGetEl('lib-badge').hidden).toBe(true);
  });

  it('脚本迟到成功时自动补画图表并收起失败提示', async () => {
    const harness = createHarness('late-ok');
    await harness.settle();
    expect(harness.localGetEl('lib-banner').hidden).toBe(false);
    expect(harness.options.get('chart-pages')).toBeUndefined();

    await new Promise((resolve) => setTimeout(resolve, 2400));
    expect(harness.localGetEl('lib-banner').hidden).toBe(true);
    expect(harness.localGetEl('lib-badge').textContent).toContain('迟到加载');
    expect(harness.options.get('chart-pages')).toBeTruthy();
  }, 12000);
});
