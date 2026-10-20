import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state: any = { settings: { telemetryEnabled: true } };
  const storage: { settings: any } = { settings: {} };
  return { state, storage };
});

vi.mock('../store/index', () => ({ state: mocks.state }));
vi.mock('../store/persistence', () => ({
  getExtensionSettings: () => mocks.storage.settings,
  saveExtensionSettings: (data: any) => { mocks.storage.settings = data; },
}));

import {
  TELEMETRY_ENDPOINT,
  __peekCountersForTest,
  __resetTelemetryStateForTest,
  __setEndpointForTest,
  emptyCounters,
  countersAreEmpty,
  flushTelemetry,
  flushTelemetryOnDisable,
  historyRecordCount,
  isEndpointConfigured,
  isTelemetryEnabled,
  isTelemetryPageKey,
  mergeCounters,
  parseBrowser,
  parseOs,
  parseTavernVersionPayload,
  probeEnv,
  renderBucketIndex,
  resetIdentity,
  sanitizeVersion,
  roundTz,
  telemetryStatus,
  todayKey,
  trackOpen,
  trackPage,
  trackRender,
  widthBucket,
} from './telemetry';

const FIXED_NOW = new Date('2026-10-10T12:00:00+08:00').getTime();
/** 测试用端点：默认常量是占位符，需要覆盖后才能走通上报路径 */
const TEST_ENDPOINT = 'https://api-usage-stat.test.workers.dev/collect';

function stubWindow(options: any = {}) {
  const media: string[] = options.media || [];
  const win: any = {
    innerWidth: options.innerWidth ?? 1280,
    matchMedia: (query: string) => ({ matches: media.includes(query) }),
    addEventListener: () => {},
  };
  win.parent = win;
  vi.stubGlobal('window', win);
  return win;
}

function stubNavigator(options: any = {}) {
  const nav: any = {
    userAgent: options.ua ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    language: options.lang ?? 'zh-CN',
    maxTouchPoints: options.touchPoints ?? 0,
    sendBeacon: options.sendBeacon,
    userAgentData: options.userAgentData,
  };
  vi.stubGlobal('navigator', nav);
  return nav;
}

function readIdentity(): any {
  return mocks.storage.settings?.telemetry || null;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
  mocks.state.settings = { telemetryEnabled: true };
  mocks.storage.settings = {};
  __resetTelemetryStateForTest();
  __setEndpointForTest(TEST_ENDPOINT);
  stubWindow();
  stubNavigator();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('浏览器与系统解析', () => {
  it('识别常见浏览器与主版本', () => {
    expect(parseBrowser('Mozilla/5.0 Chrome/141.0.0.0 Safari/537.36')).toEqual({ name: 'Chrome', major: '141' });
    expect(parseBrowser('Mozilla/5.0 Chrome/141.0.0.0 Safari/537.36 Edg/141.0.1')).toEqual({ name: 'Edge', major: '141' });
    expect(parseBrowser('Mozilla/5.0 Firefox/133.0')).toEqual({ name: 'Firefox', major: '133' });
    expect(parseBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.4 Safari/605.1.15')).toEqual({ name: 'Safari', major: '17' });
    expect(parseBrowser('Mozilla/5.0 OPR/118.0.0.0')).toEqual({ name: 'Opera', major: '118' });
    expect(parseBrowser('Mozilla/5.0 SamsungBrowser/27.0 Chrome/125.0')).toEqual({ name: 'Samsung Internet', major: '27' });
    expect(parseBrowser('Mozilla/5.0 (iPhone) CriOS/141.0.0.0 Mobile')).toEqual({ name: 'Chrome', major: '141' });
    expect(parseBrowser('Mozilla/5.0 (iPhone) FxiOS/133.0 Mobile')).toEqual({ name: 'Firefox', major: '133' });
  });

  it('识别操作系统', () => {
    expect(parseOs('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows');
    expect(parseOs('Mozilla/5.0 (Linux; Android 14)')).toBe('Android');
    expect(parseOs('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('iOS');
    expect(parseOs('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('iPadOS');
    expect(parseOs('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('macOS');
    expect(parseOs('Mozilla/5.0 (X11; Linux x86_64)')).toBe('Linux');
  });
});

describe('分桶与归一', () => {
  it('面板宽度分桶覆盖边界', () => {
    expect(widthBucket(1280)).toBe('gt1024');
    expect(widthBucket(1025)).toBe('gt1024');
    expect(widthBucket(1024)).toBe('761-1024');
    expect(widthBucket(761)).toBe('761-1024');
    expect(widthBucket(760)).toBe('481-760');
    expect(widthBucket(481)).toBe('481-760');
    expect(widthBucket(480)).toBe('le480');
    expect(widthBucket(0)).toBe('le480');
  });

  it('渲染耗时分桶覆盖边界', () => {
    expect(renderBucketIndex(0)).toBe(0);
    expect(renderBucketIndex(99)).toBe(0);
    expect(renderBucketIndex(100)).toBe(1);
    expect(renderBucketIndex(299)).toBe(1);
    expect(renderBucketIndex(300)).toBe(2);
    expect(renderBucketIndex(800)).toBe(3);
    expect(renderBucketIndex(1999)).toBe(3);
    expect(renderBucketIndex(2000)).toBe(4);
    expect(renderBucketIndex(Number.NaN)).toBe(0);
  });

  it('时区偏移按 0.5 小时取整并钳制', () => {
    expect(roundTz(8)).toBe(8);
    expect(roundTz(5.5)).toBe(5.5);
    expect(roundTz(5.4)).toBe(5.5);
    expect(roundTz(-3.2)).toBe(-3);
    expect(roundTz(20)).toBe(14);
    expect(roundTz(-20)).toBe(-12);
  });

  it('本地日期键与页面 key 白名单', () => {
    // 日期键跟随运行环境时区（CI 为 UTC、本地可能为东八区），只校验格式与本地日期字段一致
    const key = todayKey(FIXED_NOW);
    const local = new Date(FIXED_NOW);
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(key.endsWith(String(local.getDate()).padStart(2, '0'))).toBe(true);
    expect(isTelemetryPageKey('overview')).toBe(true);
    expect(isTelemetryPageKey('wallet')).toBe(true);
    expect(isTelemetryPageKey('unknown')).toBe(false);
    expect(isTelemetryPageKey(1)).toBe(false);
  });

  it('计数合并会白名单化并忽略非法值', () => {
    const a: any = { opens: 1, dur_ms: 1000, pages: { overview: 2, 乱码: 99 }, render: [1, 0, 0, 0, 0] };
    const b: any = { opens: 2, dur_ms: 2000, pages: { overview: 3, stats: -5 }, render: [0, 2, 0, 0, 9] };
    const merged = mergeCounters(a, b);
    expect(merged.opens).toBe(3);
    expect(merged.dur_ms).toBe(3000);
    expect(merged.pages.overview).toBe(5);
    expect(merged.pages.stats).toBe(0);
    expect((merged.pages as any)['乱码']).toBeUndefined();
    expect(merged.render).toEqual([1, 2, 0, 0, 9]);
  });

  it('空计数判定', () => {
    expect(countersAreEmpty(emptyCounters())).toBe(true);
    expect(countersAreEmpty({ ...emptyCounters(), opens: 1 })).toBe(false);
    expect(countersAreEmpty({ ...emptyCounters(), render: [0, 0, 0, 0, 3] })).toBe(false);
  });

  it('占位符端点视为未配置', () => {
    // 已接入自有接收端：生产常量必须是可用的真实地址
    expect(isEndpointConfigured(TELEMETRY_ENDPOINT)).toBe(true);
    expect(isEndpointConfigured('https://api-usage-stat.<subdomain>.workers.dev/collect')).toBe(false);
    expect(isEndpointConfigured('https://api-usage-stat.demo.workers.dev/collect')).toBe(true);
    expect(isEndpointConfigured('http://insecure.example.com/collect')).toBe(false);
    expect(isEndpointConfigured('')).toBe(false);
  });
});

describe('环境探测', () => {
  it('采集分桶字段而不采集原始分辨率与 UA', () => {
    stubWindow({ innerWidth: 720, media: ['(prefers-color-scheme: dark)', '(pointer: coarse)'] });
    stubNavigator({ ua: 'Mozilla/5.0 (Linux; Android 14) Chrome/141.0.0.0 Mobile', lang: 'zh-CN' });
    const env = probeEnv();
    expect(env.b).toBe('Chrome');
    expect(env.bv).toBe('141');
    expect(env.os).toBe('Android');
    expect(env.w).toBe('481-760');
    expect(env.dark).toBe(true);
    expect(env.touch).toBe(true);
    expect(env.arch).toBe('unknown');
    expect(Object.keys(env).sort()).toEqual(['arch', 'b', 'bv', 'dark', 'lang', 'os', 'standalone', 'stv', 'touch', 'ttv', 'w']);
  });

  it('从酒馆上下文读取版本号并清洗非法字符', () => {
    expect(sanitizeVersion('1.13.5')).toBe('1.13.5');
    expect(sanitizeVersion('v1.13.5-beta/恶意')).toBe('v1.13.5-beta');
    expect(sanitizeVersion('SillyTavern')).toBe('');
    expect(sanitizeVersion('x'.repeat(40))).toBe('');

    vi.stubGlobal('SillyTavern', { getContext: () => ({ version: '1.13.5' }) });
    expect(probeEnv().stv).toBe('1.13.5');
    vi.stubGlobal('SillyTavern', undefined);
  });

  it('解析 /version 响应：SillyTavern 与 TauriTavern 都用 pkgVersion', () => {
    // 上游 SillyTavern：只有 pkgVersion，没有 version 字段
    expect(parseTavernVersionPayload(JSON.stringify({
      agent: 'SillyTavern:1.19.0:Cohee#1207',
      pkgVersion: '1.19.0',
      gitRevision: 'abc1234',
      gitBranch: 'release',
      commitDate: '2026-09-01',
      isLatest: true,
    }))).toEqual({ stv: '1.19.0', ttv: '' });

    // TauriTavern：pkgVersion 是内嵌前端基线版本，tauriVersion 才是 TT 自身版本
    expect(parseTavernVersionPayload(JSON.stringify({
      agent: 'SillyTavern:1.18.0:TauriTavern',
      pkgVersion: '1.18.0',
      tauriVersion: '2.3.0',
      gitRevision: 'def5678',
      gitBranch: 'main',
      defaultUpdateChannel: 'stable',
    }))).toEqual({ stv: '1.18.0', ttv: '2.3.0' });

    // 兼容旧的 version 字段与纯文本响应
    expect(parseTavernVersionPayload(JSON.stringify({ version: '1.12.14' }))).toEqual({ stv: '1.12.14', ttv: '' });
    expect(parseTavernVersionPayload('1.12.14')).toEqual({ stv: '1.12.14', ttv: '' });
  });

  it('解析 /version 响应：脏数据与非版本内容一律丢弃', () => {
    // 登录页/错误页 HTML 不能被当成版本号
    expect(parseTavernVersionPayload('<html><body>login</body></html>')).toEqual({ stv: '', ttv: '' });
    expect(parseTavernVersionPayload('')).toEqual({ stv: '', ttv: '' });
    expect(parseTavernVersionPayload('SillyTavern')).toEqual({ stv: '', ttv: '' });
    // 非法字符被清洗，超长被截断
    expect(parseTavernVersionPayload(JSON.stringify({ pkgVersion: 'v1.13.5-beta/恶意' }))).toEqual({ stv: 'v1.13.5-beta', ttv: '' });
    const huge = parseTavernVersionPayload(JSON.stringify({ pkgVersion: '1'.repeat(40), tauriVersion: '2'.repeat(40) }));
    expect(huge.stv.length).toBeLessThanOrEqual(16);
    expect(huge.ttv.length).toBeLessThanOrEqual(16);
    // 非对象 JSON
    expect(parseTavernVersionPayload('123')).toEqual({ stv: '', ttv: '' });
    expect(parseTavernVersionPayload('null')).toEqual({ stv: '', ttv: '' });
  });

  it('优先使用 UA-CH 品牌信息', () => {
    stubNavigator({
      ua: 'Mozilla/5.0 Chrome/141.0.0.0 Safari/537.36 Edg/141.0.1',
      userAgentData: { brands: [{ brand: 'Microsoft Edge', version: '141' }, { brand: 'Chromium', version: '141' }] },
    });
    expect(probeEnv().b).toBe('Edge');
  });
});

describe('开关与身份', () => {
  it('默认开启，关闭后不累加也不发送', async () => {
    expect(isTelemetryEnabled()).toBe(true);
    mocks.state.settings = { telemetryEnabled: false };
    expect(isTelemetryEnabled()).toBe(false);
    trackOpen();
    trackPage('stats');
    trackRender(120);
    expect(countersAreEmpty(__peekCountersForTest())).toBe(true);
    flushTelemetry('close');
    await vi.runAllTimersAsync();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('首次使用时生成 32 位十六进制匿名标识', () => {
    trackOpen();
    flushTelemetry('manual');
    const identity = readIdentity();
    expect(identity?.id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('重置标识会换新身份并归零序号', () => {
    trackOpen();
    flushTelemetry('manual');
    const first = readIdentity();
    resetIdentity();
    const second = readIdentity();
    expect(second.id).toMatch(/^[0-9a-f]{32}$/);
    expect(second.id).not.toBe(first.id);
    expect(second.seq).toBe(0);
    expect(telemetryStatus().id).toBe(second.id);
  });
});

describe('累加与上报', () => {
  it('会话内累计页面与渲染数据后一次上报', async () => {
    trackOpen();
    trackPage('overview');
    trackPage('overview');
    trackPage('wallet');
    trackRender(240);
    expect(__peekCountersForTest().opens).toBe(1);
    expect(__peekCountersForTest().pages.overview).toBe(2);
    expect(__peekCountersForTest().render[1]).toBe(1);

    flushTelemetry('close');
    await vi.runAllTimersAsync();

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as any[];
    expect(url).toBe(TEST_ENDPOINT);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('text/plain;charset=UTF-8');
    const payload = JSON.parse(init.body);
    expect(payload.v).toBe(1);
    expect(payload.id).toMatch(/^[0-9a-f]{32}$/);
    expect(payload.seq).toBe(1);
    // 日期与时区偏移都取决于运行环境时区，按同一时区规则计算期望值
    expect(payload.day).toBe(todayKey());
    expect(payload.tz).toBe(roundTz(-new Date().getTimezoneOffset() / 60));
    expect(payload.daily).toBe(true);
    expect(payload.hc).toBe(0);
    expect(payload.s.opens).toBe(1);
    expect(payload.s.pages).toEqual({
      overview: 2, stats: 0, history: 0, forecast: 0, wallet: 1, settings: 0, help: 0, about: 0,
    });
    expect(payload.s.render).toEqual([0, 1, 0, 0, 0]);
    expect(payload.s.dur_ms).toBe(0);
    expect(payload.env.b).toBe('Chrome');

    // 上报成功后累加器清空、序号落盘
    expect(countersAreEmpty(__peekCountersForTest())).toBe(true);
    expect(readIdentity().seq).toBe(1);
    expect(readIdentity().day).toBe(todayKey());
  });

  it('历史记录总条数为热区加冷区精确计数', () => {
    mocks.state.history = [{}, {}, {}];
    mocks.storage.settings = { _coldCount: 7 };
    expect(historyRecordCount()).toBe(10);

    mocks.state.history = [];
    mocks.storage.settings = {};
    expect(historyRecordCount()).toBe(0);
  });

  it('关闭开关时立刻发送带关闭标记的最后一次上报', async () => {
    trackOpen();
    flushTelemetry('close');
    await vi.runAllTimersAsync();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);

    // 处于 60 秒节流窗口内，关闭动作仍必须立即再发一次并带 off 标记
    trackPage('stats');
    flushTelemetryOnDisable();
    await vi.runAllTimersAsync();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    const payload = JSON.parse((vi.mocked(fetch).mock.calls[1] as any[])[1].body);
    expect(payload.off).toBe(true);
    expect(payload.s.pages.stats).toBe(1);
  });

  it('关闭开关没有新计数时也会发送最后一次上报', async () => {
    flushTelemetryOnDisable();
    await vi.runAllTimersAsync();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    const payload = JSON.parse((vi.mocked(fetch).mock.calls[0] as any[])[1].body);
    expect(payload.off).toBe(true);
    expect(payload.s.opens).toBe(0);
  });

  it('没有新数据时不再发起请求', async () => {
    trackOpen();
    flushTelemetry('close');
    await vi.runAllTimersAsync();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    vi.setSystemTime(FIXED_NOW + 2 * 60 * 1000);
    flushTelemetry('close');
    await vi.runAllTimersAsync();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('关闭面板的抖动间隔内不重复上报', async () => {
    trackOpen();
    flushTelemetry('close');
    await vi.runAllTimersAsync();
    trackOpen();
    flushTelemetry('close');
    await vi.runAllTimersAsync();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    vi.setSystemTime(FIXED_NOW + 61 * 1000);
    flushTelemetry('close');
    await vi.runAllTimersAsync();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('发送失败会退避重试，仍失败则留下一条待重试数据', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    trackOpen();
    trackPage('stats');
    flushTelemetry('close');
    await vi.runAllTimersAsync();
    // 首次 + 3 次重试
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(4);
    const identity = readIdentity();
    expect(identity.pending).toBeTruthy();
    expect(identity.seq).toBe(1);
    expect(countersAreEmpty(__peekCountersForTest())).toBe(true);
  });

  it('下次会话把待发数据与新数据合并成一条，且沿用同一序号', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    trackOpen();
    trackPage('stats');
    flushTelemetry('close');
    await vi.runAllTimersAsync();
    expect(readIdentity().pending.s.pages.stats).toBe(1);

    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    __resetTelemetryStateForTest();
    __setEndpointForTest(TEST_ENDPOINT);
    vi.setSystemTime(FIXED_NOW + 5 * 60 * 1000);
    trackOpen();
    trackPage('overview');
    flushTelemetry('close');
    await vi.runAllTimersAsync();

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0] as any[])[1].body);
    expect(body.seq).toBe(1);
    expect(body.s.opens).toBe(2);
    expect(body.s.pages.stats).toBe(1);
    expect(body.s.pages.overview).toBe(1);
    expect(readIdentity().pending).toBe(null);
    expect(readIdentity().seq).toBe(1);
  });

  it('页面隐藏时优先使用 sendBeacon', async () => {
    const sendBeacon = vi.fn(() => true);
    stubNavigator({ sendBeacon });
    trackOpen();
    flushTelemetry('hide');
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(readIdentity().seq).toBe(1);
    expect(countersAreEmpty(__peekCountersForTest())).toBe(true);
  });

  it('sendBeacon 不可用时回退 fetch', async () => {
    stubNavigator({ sendBeacon: vi.fn(() => false) });
    trackOpen();
    flushTelemetry('hide');
    await vi.runAllTimersAsync();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('未配置端点时只本地累加，不发任何请求', async () => {
    // 恢复占位符端点：视为未配置，只本地累加
    __setEndpointForTest('https://api-usage-stat.<subdomain>.workers.dev/collect');
    expect(isEndpointConfigured()).toBe(false);
    trackOpen();
    flushTelemetry('close');
    await vi.runAllTimersAsync();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(__peekCountersForTest().opens).toBe(1);
  });
});
