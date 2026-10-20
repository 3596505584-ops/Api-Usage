import { afterEach, describe, expect, it } from 'vitest';
import { collectStorageReport, estimateHotBytes, formatBytes, utf8Bytes } from './storage-usage';

const defineGlobal = (name: string, value: any) => {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
};

/** 构造一个只带 localStorage 的假 document */
function docWithLocalStorage(entries: Record<string, string>) {
  const store = new Map(Object.entries(entries));
  const ls = {
    get length() { return store.size; },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
  return { defaultView: { localStorage: ls, indexedDB: undefined, navigator: {} } } as any;
}

afterEach(() => {
  defineGlobal('document', undefined);
});

describe('字节计算', () => {
  it('中文按 UTF-8 三字节计，而不是 length 的码元数', () => {
    expect(utf8Bytes('abc')).toBe(3);
    expect(utf8Bytes('中文')).toBe(6); // 2 个汉字 × 3 字节
    expect('中文'.length).toBe(2);      // 码元数只有 2，用它统计会低估一半
    expect(utf8Bytes('中文'.slice(0, 1))).toBe(3);
  });

  it('emoji 占 4 字节（代理对）', () => {
    expect(utf8Bytes('😀')).toBe(4);
  });

  it('空值与空串为 0', () => {
    expect(utf8Bytes('')).toBe(0);
    expect(utf8Bytes(null)).toBe(0);
    expect(utf8Bytes(undefined)).toBe(0);
  });
});

describe('容量格式化', () => {
  it('小于 1KB 显示 B', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('按 1024 进制进位', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('小数位随量级收紧，避免 1.00 这种冗余零', () => {
    expect(formatBytes(1024 * 1.234)).toBe('1.23 KB');
    expect(formatBytes(1024 * 15.6)).toBe('15.6 KB');
    expect(formatBytes(1024 * 128)).toBe('128 KB');
  });

  it('不可用值显示占位符而不是 NaN', () => {
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(NaN)).toBe('—');
    expect(formatBytes(-1)).toBe('—');
  });
});

describe('热数据估算', () => {
  it('按 JSON 的 UTF-8 体积计算', () => {
    expect(estimateHotBytes({ a: 1 })).toBe(utf8Bytes('{"a":1}'));
  });

  it('空值与不可序列化对象返回 0 而不抛错', () => {
    expect(estimateHotBytes(null)).toBe(0);
    const cyclic: any = {};
    cyclic.self = cyclic;
    expect(estimateHotBytes(cyclic)).toBe(0);
  });
});

describe('存储报告汇总', () => {
  it('只统计本扩展相关的 localStorage 键，忽略酒馆其它数据', async () => {
    const doc = docWithLocalStorage({
      ds_ds_webdav_pass: 'abc',
      aus_update_last_check: '1700000000000',
      aus_forecast_prefs_v1: '{"a":1}',
      'SillyTavern_other_plugin': 'x'.repeat(5000),
      'unrelated': 'y',
    });
    const report = await collectStorageReport({ doc, hotSettings: { history: [] } });
    const labels = report.items.map(i => i.label);
    expect(labels).toContain('WebDAV 密码（XOR）');
    expect(labels).toContain('更新检查记录');
    expect(labels).toContain('预测页偏好');
    expect(labels).not.toContain('SillyTavern_other_plugin');
    expect(report.items.every(i => i.label !== 'unrelated')).toBe(true);
  });

  it('合计等于各分项之和', async () => {
    const doc = docWithLocalStorage({ ds_debug_log: '1', ds_ds_peak_dot_pos: '{"left":1}' });
    const report = await collectStorageReport({ doc, hotSettings: { x: '中文' } });
    const sum = report.items.reduce((a, i) => a + (i.bytes || 0), 0);
    expect(report.totalBytes).toBe(sum);
    expect(report.totalBytes).toBeGreaterThan(0);
  });

  it('localStorage 被禁用（抛错）时不影响整体报告', async () => {
    const doc: any = {
      defaultView: {
        get localStorage() { throw new Error('SecurityError'); },
        indexedDB: undefined,
        navigator: {},
      },
    };
    const report = await collectStorageReport({ doc, hotSettings: { a: 1 } });
    expect(report.items.length).toBeGreaterThanOrEqual(1);
    expect(report.totalBytes).toBeGreaterThan(0);
    expect(report.globalAvailable).toBe(false);
  });

  it('indexedDB 不可用时跳过冷数据，不抛错', async () => {
    const doc = docWithLocalStorage({});
    const report = await collectStorageReport({ doc, hotSettings: {} });
    expect(report.items.some(i => i.key.startsWith('idb-'))).toBe(false);
  });

  it('navigator.storage 缺失时全局配额为 null（http 局域网访问场景）', async () => {
    const doc = docWithLocalStorage({ ds_debug_log: '1' });
    const report = await collectStorageReport({ doc, hotSettings: {} });
    expect(report.quotaBytes).toBeNull();
    expect(report.usageBytes).toBeNull();
    expect(report.persisted).toBeNull();
    expect(report.globalAvailable).toBe(false);
  });

  it('estimate 抛错（Safari 隐私模式）时降级为不可用，不影响分项', async () => {
    const doc: any = {
      defaultView: {
        localStorage: { length: 0, key: () => null, getItem: () => null },
        indexedDB: undefined,
        navigator: { storage: { estimate: () => Promise.reject(new Error('denied')), persisted: () => Promise.reject(new Error('denied')) } },
      },
    };
    const report = await collectStorageReport({ doc, hotSettings: { a: 1 } });
    expect(report.globalAvailable).toBe(false);
    expect(report.quotaBytes).toBeNull();
    expect(report.items.length).toBeGreaterThan(0);
  });

  it('正常读取配额与持久化状态', async () => {
    const doc: any = {
      defaultView: {
        localStorage: { length: 0, key: () => null, getItem: () => null },
        indexedDB: undefined,
        navigator: { storage: { estimate: async () => ({ usage: 2048, quota: 1024 * 1024 * 10 }), persisted: async () => true } },
      },
    };
    const report = await collectStorageReport({ doc, hotSettings: {} });
    expect(report.globalAvailable).toBe(true);
    expect(report.usageBytes).toBe(2048);
    expect(report.quotaBytes).toBe(1024 * 1024 * 10);
    expect(report.persisted).toBe(true);
  });

  it('无 document（极端环境）时仍返回可用结构', async () => {
    const report = await collectStorageReport({ doc: {} as any, hotSettings: { a: 1 } });
    expect(report.totalBytes).toBeGreaterThan(0);
    expect(Array.isArray(report.items)).toBe(true);
  });
});
