/**
 * 看板页渲染测试：用最小 DOM 桩在 Node 里执行 dashboard.html 的内联脚本，
 * 覆盖「图表库可用」与「图表库不可用（自托管来源失败）」两条路径，
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
  // 历史记录条数：X 轴每 10 条一组（0 条不计），Y 轴为该组设备数（服务端固定生成 51 组）
  historyCount: Array.from({ length: 51 }, (_, index) => {
    const from = index === 0 ? 1 : index * 10;
    const to = index === 50 ? null : from + 9;
    return {
      from,
      to,
      label: index === 50 ? '500 条以上' : from + '–' + to + ' 条',
      count: index === 0 ? 2 : index === 1 ? 10 : index === 2 ? 18 : index === 5 ? 9 : index === 20 ? 3 : 0,
    };
  }),
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
    _listeners: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute(key, value) { el._attrs[key] = value; },
    getAttribute(key) { return Object.prototype.hasOwnProperty.call(el._attrs, key) ? el._attrs[key] : null; },
    appendChild(child) { el.children.push(child); return child; },
    remove() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { el._listeners.push({ type, fn }); },
    closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 600, height: 260 }; },
    /** 测试用：手动触发已注册的事件监听 */
    fire(type, event) {
      el._listeners.filter((item) => item.type === type).forEach((item) => item.fn(event));
    },
  };
  return el;
}

/**
 * 每个场景一套独立 DOM 桩。
 * mode：'no-lib'（自托管来源失败）/ 'echarts-ready'（页面已存在 echarts）/
 *       'self-host-ok'（自托管成功）/ 'late-ok'（脚本超时判负后才真正执行成功）
 */
function createHarness(mode) {
  const elements = new Map();
  const options = new Map();
  const instances = new Map();
  const actions = [];
  const mockEcharts = {
    init(host) {
      const instance = {
        setOption(option) { options.set(host && host.id ? host.id : 'unknown', option); },
        resize() {},
        dispose() {},
        dispatchAction(action) { actions.push(action); },
        convertFromPixel(finder, point) {
          // 简单线性映射：x=100 落在第 2 个数据点
          return [Math.round((point[0] - 20) / 40), point[1]];
        },
        getZr() { return { getDom: () => host, handler: { findHover: () => null } }; },
      };
      instances.set(host && host.id ? host.id : 'unknown', instance);
      return instance;
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
          // 自托管来源先报失败，但稍后 window.echarts 出现（模拟「脚本迟到」）
          setTimeout(() => { if (typeof script.onerror === 'function') script.onerror(); }, 0);
          if (!windowStub.echarts) {
            setTimeout(() => { windowStub.echarts = mockEcharts; }, 300);
          }
          return;
        }
        // 看板只加载同源自托管来源，任何非 /vendor/echarts.js 的请求都视为失败
        const success = mode === 'self-host-ok' && src.indexOf('/vendor/echarts.js') >= 0;
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
    instances,
    actions,
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

    // 历史记录条数改为曲线：X 轴条数分组、Y 轴该组设备数
    const historyCount = option('history-count');
    expect(historyCount.series[0].type).toBe('line');
    expect(historyCount.xAxis.data).toHaveLength(51);
    // 0 条不显示，X 轴从 1 开始
    expect(historyCount.xAxis.data[0]).toBe(1);
    expect(historyCount.xAxis.data).not.toContain(0);
    expect(historyCount.xAxis.data[50]).toBe(500);
    expect(historyCount.series[0].data.reduce((sum, value) => sum + value, 0)).toBe(42);
    expect(typeof historyCount.tooltip.formatter).toBe('function');

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

describe('图表库仅自托管加载', () => {
  it('看板页不再引用任何第三方图表库地址', () => {
    expect(html).not.toContain('npmmirror');
    expect(html).not.toContain('cdn.jsdelivr.net');
    expect(html).not.toContain('unpkg.com');
    expect(html).toContain("'/vendor/echarts.js?v=6.1.0-full'");
    // 加载 URL 不能指向 simple 构建：它不含 Tooltip 组件，tooltip 会被静默忽略
    expect(html).not.toMatch(/echarts\.js\?v=[^'"]*simple/);
  });

  it('自托管可用时使用自托管并正常渲染', async () => {
    const harness = createHarness('self-host-ok');
    await harness.settle();
    expect(harness.localGetEl('lib-badge').textContent).toContain('自托管');
    expect(harness.localGetEl('lib-banner').hidden).toBe(true);
    expect(harness.options.get('chart-pages')).toBeTruthy();
    expect(harness.options.get('chart-daily-pages').series).toHaveLength(8);
  });

  it('自托管失败时展示失败原因并退回纯文本列表', async () => {
    const harness = createHarness('no-lib');
    await harness.settle();
    expect(harness.localGetEl('lib-banner').hidden).toBe(false);
    const text = harness.localGetEl('lib-banner-text').textContent;
    expect(text).toContain('自托管：失败');
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

describe('看板页移动端触屏提示', () => {
  /** 模拟一次触屏点按：clientX=100 经 convertFromPixel 换算为第 2 个数据点 */
  function touchChart(harness, id, clientX) {
    const host = harness.localGetEl('chart-' + id);
    const instance = harness.instances.get('chart-' + id);
    host.fire('touchstart', { touches: [{ clientX: clientX === undefined ? 100 : clientX, clientY: 80 }] });
    return instance;
  }

  it('触屏点按图表后固定显示数值提示（抬手不消失）', async () => {
    const harness = createHarness('echarts-ready');
    await harness.settle();
    touchChart(harness, 'growth', 100);

    const show = harness.actions.filter((item) => item.type === 'showTip');
    expect(show).toHaveLength(1);
    expect(show[0]).toEqual({ type: 'showTip', seriesIndex: 0, dataIndex: 2 });

    // 抬手后延迟再钉一次，避免 ECharts 在 touchend 收起提示
    const before = harness.actions.length;
    harness.localGetEl('chart-growth').fire('touchend', {});
    await new Promise((resolve) => setTimeout(resolve, 160));
    expect(harness.actions.slice(before)).toEqual([{ type: 'showTip', seriesIndex: 0, dataIndex: 2 }]);
  });

  it('所有图表都绑定了触屏提示，折线、条形与饼图均可', async () => {
    const harness = createHarness('echarts-ready');
    await harness.settle();
    for (const id of ['growth', 'pages', 'os', 'duration']) {
      const host = harness.localGetEl('chart-' + id);
      expect(host._listeners.some((item) => item.type === 'touchstart')).toBe(true);
      touchChart(harness, id);
    }
    expect(harness.actions.filter((item) => item.type === 'showTip')).toHaveLength(4);
  });

  it('手指在图上滑动时逐点跟读，抬手后停止更新', async () => {
    const harness = createHarness('echarts-ready');
    await harness.settle();
    const host = harness.localGetEl('chart-growth');

    host.fire('touchstart', { touches: [{ clientX: 100, clientY: 80 }] });
    harness.actions.length = 0;
    host.fire('touchmove', { touches: [{ clientX: 140, clientY: 80 }] });
    expect(harness.actions.filter((item) => item.type === 'showTip')).toEqual([
      { type: 'showTip', seriesIndex: 0, dataIndex: 3 },
    ]);

    host.fire('touchend', {});
    harness.actions.length = 0;
    host.fire('touchmove', { touches: [{ clientX: 180, clientY: 80 }] });
    expect(harness.actions.filter((item) => item.type === 'showTip')).toHaveLength(0);
  });

  it('图表库不可用时不绑定触屏提示（无图表可提示）', async () => {
    const harness = createHarness('no-lib');
    await harness.settle();
    expect(harness.localGetEl('chart-growth')._listeners).toHaveLength(0);
    expect(harness.actions).toHaveLength(0);
  });
});
