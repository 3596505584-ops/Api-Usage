import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeThemeMode,
  paintTheme,
  resolveTheme,
  systemPrefersDark,
  watchSystemTheme,
  unwatchSystemTheme,
  resolvedTheme,
} from './theme';
import { state } from '../store/index';

/**
 * 直接定义全局对象：vi.stubGlobal 会把对象属性包装成 mock 函数，
 * 导致 getElementById 返回的 null 被包成 mock 对象（恒为真），无法模拟“元素不存在”。
 */
function inject(name: 'window' | 'document' | 'ApiUsageStat', value: any) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

const stubWindow = (parent: any, prefersDark = false) =>
  inject('window', { parent, matchMedia: () => ({ matches: prefersDark }) });

const stubDoc = (getById: (id: string) => any) =>
  inject('document', {
    documentElement: { removeAttribute: () => {}, getAttribute: () => null },
    getElementById: getById,
  });

/** 构造最小可用的 matchMedia 假实现（可切换 matches 并派发 change） */
function fakeWindow(initialDark: boolean) {
  const listeners = new Set<(e: any) => void>();
  const mql: any = {
    matches: initialDark,
    addEventListener: (_: string, cb: (e: any) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: any) => void) => listeners.delete(cb),
  };
  const win: any = { matchMedia: vi.fn(() => mql) };
  win._setDark = (dark: boolean) => {
    mql.matches = dark;
    for (const cb of listeners) cb({ matches: dark });
  };
  win._listenerCount = () => listeners.size;
  return { win, mql };
}

afterEach(() => {
  unwatchSystemTheme();
  stubWindow(null);
  stubDoc(() => null);
  state.settings.theme = 'light';
});

describe('主题模式解析', () => {
  it('非法值与空值归一为 light，保持旧版本外观', () => {
    expect(normalizeThemeMode(undefined)).toBe('light');
    expect(normalizeThemeMode(null)).toBe('light');
    expect(normalizeThemeMode('')).toBe('light');
    expect(normalizeThemeMode('DARK')).toBe('light');
    expect(normalizeThemeMode('system')).toBe('light');
    expect(normalizeThemeMode(1)).toBe('light');
  });

  it('保留 light / dark / auto 三种合法值', () => {
    expect(normalizeThemeMode('light')).toBe('light');
    expect(normalizeThemeMode('dark')).toBe('dark');
    expect(normalizeThemeMode('auto')).toBe('auto');
  });

  it('dark / light 为强制模式，不受系统当前配色影响', () => {
    const { win } = fakeWindow(true);
    expect(resolveTheme('light', win)).toBe('light');
    expect(resolveTheme('dark', win)).toBe('dark');
  });

  it('auto 跟随 prefers-color-scheme', () => {
    expect(resolveTheme('auto', fakeWindow(true).win)).toBe('dark');
    expect(resolveTheme('auto', fakeWindow(false).win)).toBe('light');
  });

  it('宿主不支持 matchMedia（老 WebView / 无窗口环境）时回退浅色且不抛错', () => {
    expect(systemPrefersDark({})).toBe(false);
    expect(systemPrefersDark(null)).toBe(false);
    expect(resolveTheme('auto', {})).toBe('light');
  });

  it('matchMedia 抛错时回退浅色且不抛错', () => {
    const win = { matchMedia: () => { throw new Error('blocked'); } };
    expect(systemPrefersDark(win)).toBe(false);
    expect(resolveTheme('auto', win)).toBe('light');
  });
});

describe('paintTheme 只改面板属性、不污染宿主根元素', () => {
  const makeDoc = () => {
    const panel = { setAttribute: vi.fn(), getAttribute: vi.fn(() => null) };
    const overlay = { setAttribute: vi.fn() };
    const documentElement = { removeAttribute: vi.fn(), getAttribute: vi.fn(() => null) };
    const doc: any = {
      documentElement,
      getElementById: (id: string) => (id === 'aus-panel' ? panel : id === 'aus-overlay' ? overlay : null),
    };
    return { doc, panel, overlay, documentElement };
  };

  it('面板与遮罩写入的是解析后的实际配色（auto + 系统深色 → dark）', () => {
    const { doc, panel, overlay } = makeDoc();
    inject('document', doc);
    stubWindow({ document: doc }, true);
    paintTheme('auto');
    expect(panel.setAttribute).toHaveBeenCalledWith('data-ds-theme', 'dark');
    expect(overlay.setAttribute).toHaveBeenCalledWith('data-ds-theme', 'dark');
    expect(overlay.setAttribute).toHaveBeenCalledWith('data-extension', 'api-usage-stat');
  });

  it('auto + 系统浅色 → light', () => {
    const { doc, panel } = makeDoc();
    inject('document', doc);
    stubWindow({ document: doc }, false);
    paintTheme('auto');
    expect(panel.setAttribute).toHaveBeenCalledWith('data-ds-theme', 'light');
  });

  it('始终清理宿主 documentElement 上的主题属性，避免污染聊天输入框', () => {
    const { doc, documentElement } = makeDoc();
    inject('document', doc);
    stubWindow({ document: doc });
    paintTheme('dark');
    expect(documentElement.removeAttribute).toHaveBeenCalledWith('data-ds-theme');
    expect(documentElement.removeAttribute).toHaveBeenCalledWith('data-extension');
  });

  it('面板尚未创建时不抛错（扩展刚加载、DOM 未就绪）', () => {
    stubDoc(() => null);
    stubWindow(null);
    expect(() => paintTheme('auto')).not.toThrow();
  });
});

describe('跟随系统的实时监听', () => {
  beforeEach(() => {
    state.settings.theme = 'auto';
    inject('ApiUsageStat', { refreshTheme: vi.fn() });
  });

  it('同一窗口只绑定一次监听', () => {
    const { win } = fakeWindow(false);
    watchSystemTheme(win);
    watchSystemTheme(win);
    expect(win._listenerCount()).toBe(1);
  });

  it('系统切到深色时，auto 模式自动刷新界面', () => {
    stubDoc(() => ({ setAttribute: () => {} }));
    const { win } = fakeWindow(false);
    watchSystemTheme(win);
    win._setDark(true);
    expect((globalThis as any).ApiUsageStat.refreshTheme).toHaveBeenCalledTimes(1);
  });

  it('强制模式（light / dark）下系统切换不触发重绘', () => {
    stubDoc(() => ({ setAttribute: () => {} }));
    const { win } = fakeWindow(false);
    watchSystemTheme(win);
    state.settings.theme = 'dark';
    win._setDark(false);
    state.settings.theme = 'light';
    win._setDark(true);
    expect((globalThis as any).ApiUsageStat.refreshTheme).not.toHaveBeenCalled();
  });

  it('面板未创建时只更新属性、不触发重绘', () => {
    stubDoc(() => null);
    const { win } = fakeWindow(false);
    watchSystemTheme(win);
    win._setDark(true);
    expect((globalThis as any).ApiUsageStat.refreshTheme).not.toHaveBeenCalled();
  });

  it('解除监听后不再响应系统切换', () => {
    stubDoc(() => ({ setAttribute: () => {} }));
    const { win } = fakeWindow(false);
    watchSystemTheme(win);
    unwatchSystemTheme();
    expect(win._listenerCount()).toBe(0);
    win._setDark(true);
    expect((globalThis as any).ApiUsageStat.refreshTheme).not.toHaveBeenCalled();
  });

  it('不支持 addEventListener 的旧内核静默跳过，不抛错', () => {
    const win: any = { matchMedia: () => ({ matches: true, addListener: () => {} }) };
    expect(() => watchSystemTheme(win)).not.toThrow();
  });
});

describe('resolvedTheme 以面板属性为准', () => {
  it('面板已有 data-ds-theme 时直接返回，保证图表取色与当前渲染一致', () => {
    stubDoc(() => ({ getAttribute: () => 'dark' }));
    stubWindow(null, false);
    state.settings.theme = 'light';
    expect(resolvedTheme()).toBe('dark');
  });

  it('面板不存在时回退到设置解析', () => {
    stubDoc(() => null);
    stubWindow(null, true);
    state.settings.theme = 'auto';
    expect(resolvedTheme()).toBe('dark');
  });
});
