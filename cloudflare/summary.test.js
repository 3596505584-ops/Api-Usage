import { describe, it, expect } from 'vitest';
import {
  CACHE_TTL_SECONDS,
  DEFAULT_WINDOW_HOURS,
  MAX_WINDOW_HOURS,
  beijingDayKey,
  beijingHourKey,
  hoursBetween,
  cumulativeGrowth,
  daysBetween,
  durationBucketIndex,
  durationHistogram,
  envBreakdown,
  estimateRenderMs,
  isDayKey,
  isHourKey,
  mergeTail,
  normalizeHourWindow,
  normalizeWindow,
  numberOrZero,
  offsetDayKey,
  renderSampleCount,
  shiftDay,
  shiftHour,
  sumBy,
  tally,
  tzLabel,
  widthLabel,
} from './summary.js';

/** 北京时间已是 2026-10-11，UTC 仍是 2026-10-10 */
const NOW = Date.parse('2026-10-10T20:00:00Z');

describe('北京时间日期基准', () => {
  it('按 UTC+8 计算今天，与 UTC 日期不同', () => {
    expect(beijingDayKey(NOW)).toBe('2026-10-11');
    expect(new Date(NOW).toISOString().slice(0, 10)).toBe('2026-10-10');
  });

  it('相对偏移与日期位移跨月正确', () => {
    expect(offsetDayKey(-29, NOW)).toBe('2026-09-12');
    expect(offsetDayKey(0, NOW)).toBe('2026-10-11');
    expect(shiftDay('2026-10-01', -1)).toBe('2026-09-30');
    expect(shiftDay('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('日期键校验与天数差', () => {
    expect(isDayKey('2026-10-11')).toBe(true);
    expect(isDayKey('2026-10-32')).toBe(false);
    expect(isDayKey('2026-10-11T00:00:00Z')).toBe(false);
    expect(daysBetween('2026-09-12', '2026-10-11')).toBe(29);
  });
});

describe('北京时间小时基准', () => {
  it('按 UTC+8 计算小时键，与 UTC 小时不同', () => {
    expect(beijingHourKey(NOW)).toBe('2026-10-11T04');
    expect(new Date(NOW).toISOString().slice(0, 13)).toBe('2026-10-10T20');
  });

  it('小时键校验、平移与差值跨天正确', () => {
    expect(isHourKey('2026-10-11T00')).toBe(true);
    expect(isHourKey('2026-10-11T24')).toBe(false);
    expect(isHourKey('2026-10-11')).toBe(false);
    expect(shiftHour('2026-10-11T23', 1)).toBe('2026-10-12T00');
    expect(shiftHour('2026-10-12T00', -1)).toBe('2026-10-11T23');
    expect(hoursBetween('2026-10-11T00', '2026-10-11T23')).toBe(23);
  });
});

describe('小时粒度窗口归一', () => {
  it('缺省参数回退最近 24 小时', () => {
    expect(normalizeHourWindow(null, null, NOW)).toEqual({ from: '2026-10-10T05', to: '2026-10-11T04', hours: DEFAULT_WINDOW_HOURS });
  });

  it('末小时不晚于当前小时，起止倒置时收成同一小时', () => {
    expect(normalizeHourWindow('2026-10-01T00', '2026-12-31T23', NOW).to).toBe('2026-10-11T04');
    expect(normalizeHourWindow('2026-10-11T03', '2026-10-11T01', NOW)).toEqual({
      from: '2026-10-11T01',
      to: '2026-10-11T01',
      hours: 1,
    });
  });

  it('跨度上限与保留期一致', () => {
    const window = normalizeHourWindow('2000-01-01T00', '2026-10-11T04', NOW);
    expect(window.hours).toBe(MAX_WINDOW_HOURS);
    expect(window.to).toBe('2026-10-11T04');
    expect(window.from).toBe(shiftHour('2026-10-11T04', -(MAX_WINDOW_HOURS - 1)));
  });
});

describe('趋势窗口归一', () => {
  it('缺省参数回退最近 30 天', () => {
    expect(normalizeWindow(null, null, NOW)).toEqual({ from: '2026-09-12', to: '2026-10-11', days: 30 });
  });

  it('末日期不晚于今天，起止倒置时收成同一天', () => {
    expect(normalizeWindow('2026-09-01', '2026-12-31', NOW).to).toBe('2026-10-11');
    expect(normalizeWindow('2026-10-05', '2026-10-01', NOW)).toEqual({
      from: '2026-10-01',
      to: '2026-10-01',
      days: 1,
    });
  });

  it('跨度上限 730 天', () => {
    const window = normalizeWindow('2000-01-01', '2026-10-11', NOW);
    expect(window.days).toBe(730);
    expect(window.to).toBe('2026-10-11');
    expect(window.from).toBe(shiftDay('2026-10-11', -729));
  });

  it('非法日期回退默认窗口', () => {
    expect(normalizeWindow('2026-13-01', 'invalid', NOW).to).toBe('2026-10-11');
  });
});

describe('计数与截断', () => {
  it('空值归入未知并按数量倒序', () => {
    expect(tally(['Chrome', 'Chrome', 'Chrome', '', null, 'Edge'])).toEqual([
      { label: 'Chrome', count: 3 },
      { label: '未知', count: 2 },
      { label: 'Edge', count: 1 },
    ]);
  });

  it('数量相同按标签排序，limit 生效', () => {
    const items = tally(['b', 'a', 'c', 'd'], { limit: 2 });
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.label)).toEqual(['a', 'b']);
    expect(tally(['b', 'a'], { limit: 0 })).toHaveLength(2);
  });

  it('其余合并为「其他」', () => {
    const items = mergeTail([
      { label: 'a', count: 10 },
      { label: 'b', count: 5 },
      { label: 'c', count: 3 },
      { label: 'd', count: 2 },
    ], 2);
    expect(items).toEqual([
      { label: 'a', count: 10 },
      { label: 'b', count: 5 },
      { label: '其他', count: 5, merged: true },
    ]);
    expect(mergeTail([{ label: 'a', count: 1 }], 2)).toHaveLength(1);
  });

  it('求和与数值兜底', () => {
    expect(sumBy([{ n: 1 }, { n: '2' }, { n: null }, {}], 'n')).toBe(3);
    expect(numberOrZero('abc')).toBe(0);
    expect(numberOrZero('12')).toBe(12);
  });
});

describe('使用时长直方图分桶', () => {
  it('边界值归入含上界的桶', () => {
    expect(durationBucketIndex(0)).toBe(0);
    expect(durationBucketIndex(-5)).toBe(0);
    expect(durationBucketIndex(1)).toBe(1);
    expect(durationBucketIndex(60 * 1000)).toBe(1);
    expect(durationBucketIndex(60 * 1000 + 1)).toBe(2);
    expect(durationBucketIndex(1000 * 60 * 60 * 24)).toBe(7);
    expect(durationBucketIndex(1000 * 60 * 60 * 100)).toBe(8);
  });

  it('直方图统计与标签齐全', () => {
    const items = durationHistogram([0, null, 30 * 1000, 61 * 1000, 1000 * 60 * 60 * 40]);
    expect(items).toHaveLength(9);
    expect(items[0]).toEqual({ label: '未记录', count: 2 });
    expect(items[1]).toEqual({ label: '<1 分钟', count: 1 });
    expect(items[2]).toEqual({ label: '<10 分钟', count: 1 });
    expect(items[8]).toEqual({ label: '≥30 小时', count: 1 });
    expect(items.reduce((sum, item) => sum + item.count, 0)).toBe(5);
  });
});

describe('渲染耗时估算', () => {
  it('无样本返回 null', () => {
    expect(estimateRenderMs([0, 0, 0, 0, 0])).toBeNull();
    expect(estimateRenderMs([])).toBeNull();
    expect(renderSampleCount([0, 0, 0, 0, 0])).toBe(0);
  });

  it('按档位代表值加权估算', () => {
    expect(estimateRenderMs([1, 0, 0, 0, 0])).toBe(50);
    expect(estimateRenderMs([1, 1, 0, 0, 0])).toBe(125);
    expect(estimateRenderMs([0, 0, 0, 0, 2])).toBe(3000);
    expect(renderSampleCount([1, 2, 3, 4, 5])).toBe(15);
  });
});

describe('累计用户序列', () => {
  it('按日期升序累加并保留每日新增', () => {
    expect(cumulativeGrowth([
      { day: '2026-10-11', count: 2 },
      { day: 'bad-day', count: 9 },
      { day: '2026-10-09', count: 3 },
      { day: '2026-10-11', count: 1 },
    ])).toEqual([
      { day: '2026-10-09', added: 3, cumulative: 3 },
      { day: '2026-10-11', added: 2, cumulative: 5 },
      { day: '2026-10-11', added: 1, cumulative: 6 },
    ]);
  });

  it('空输入返回空数组', () => {
    expect(cumulativeGrowth(null)).toEqual([]);
  });
});

describe('环境画像聚合', () => {
  it('输出全部维度并给宽度/时区/开关加标签', () => {
    const env = envBreakdown([
      {
        browser: 'Chrome', browser_major: '141', os: 'Windows', arch: 'x86_64',
        lang: 'zh-CN', width_bucket: 'gt1024', dark: 1, standalone: 0, touch: 0, tz_offset: 8,
        st_version: '1.13.5',
      },
      {
        browser: 'Chrome', browser_major: '141', os: 'Windows', arch: 'x86_64',
        lang: 'zh-CN', width_bucket: 'le480', dark: 0, standalone: 0, touch: 0, tz_offset: 8,
        st_version: '1.13.5',
      },
      {
        browser: 'Firefox', browser_major: '128', os: 'Android', arch: 'arm64',
        lang: 'ja-JP', width_bucket: 'le480', dark: 0, standalone: 1, touch: 1, tz_offset: 5.5,
        st_version: '1.13.5',
      },
    ]);
    expect(env.browserVersion[0]).toEqual({ label: 'Chrome 141', count: 2 });
    expect(env.browser).toEqual([
      { label: 'Chrome', count: 2 },
      { label: 'Firefox', count: 1 },
    ]);
    expect(env.width).toEqual([
      { label: '≤ 480px', count: 2 },
      { label: '> 1024px', count: 1 },
    ]);
    expect(env.os[0]).toEqual({ label: 'Windows', count: 2 });
    expect(env.lang[0]).toEqual({ label: 'zh-CN', count: 2 });
    expect(env.arch[0]).toEqual({ label: 'x86_64', count: 2 });
    expect(env.dark).toEqual([
      { label: '浅色偏好', count: 2 },
      { label: '深色偏好', count: 1 },
    ]);
    expect(env.touch[0]).toEqual({ label: '鼠标 / 精确指针', count: 2 });
    expect(env.standalone[0]).toEqual({ label: '浏览器标签', count: 2 });
    expect(env.tz).toEqual([
      { label: 'UTC+8', count: 2 },
      { label: 'UTC+5.5', count: 1 },
    ]);
    expect(env.stVersion).toEqual([{ label: '1.13.5', count: 3 }]);
  });

  it('标签格式化', () => {
    expect(tzLabel(-3.5)).toBe('UTC-3.5');
    expect(tzLabel(0)).toBe('UTC+0');
    expect(widthLabel('761-1024')).toBe('761–1024px');
    expect(widthLabel('other')).toBe('other');
  });

  it('缓存时长常量为 10 分钟', () => {
    expect(CACHE_TTL_SECONDS).toBe(600);
  });
});
