import { state } from '../store/index';
import { saveHot } from '../store/persistence';
import type { ThemeMode } from '../types/settings';

/**
 * 主题服务：light / dark / auto（跟随系统）。
 *
 * - 历史数据只有 'light' | 'dark'，默认值保持 'light'，老用户升级后外观不变。
 * - 'auto' 依赖 `prefers-color-scheme` 媒体查询：桌面（Windows 10+ / macOS / Linux 桌面）与
 *   移动端（iOS 13+ Safari、Android Chrome 76+、主流国产套壳 WebView）均支持；
 *   不支持的环境回退为浅色，与旧版本表现一致。
 * - 媒体查询本身可能抛错（老 WebView、被 CSP/测试桩替换），所有调用都包在 try/catch 内。
 */

export type ResolvedTheme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** 归一化用户设置值，非法值一律视为 light（保持旧版本行为） */
export function normalizeThemeMode(v: unknown): ThemeMode {
  return v === 'dark' || v === 'auto' ? v : 'light';
}

/** 取宿主窗口：面板可能运行在 iframe 中，优先 parent */
function hostWindow(): any {
  try {
    const p: any = (window as any)?.parent;
    if (p && typeof p.matchMedia === 'function') return p;
  } catch {}
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') return window;
  } catch {}
  return null;
}

/** 系统是否处于深色（不支持 prefers-color-scheme 时返回 false） */
export function systemPrefersDark(win?: any): boolean {
  const w = win ?? hostWindow();
  try {
    if (!w || typeof w.matchMedia !== 'function') return false;
    return !!w.matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

/** 把设置值解析为真正生效的 light / dark */
export function resolveTheme(mode: unknown, win?: any): ResolvedTheme {
  const m = normalizeThemeMode(mode);
  if (m === 'dark') return 'dark';
  if (m === 'auto') return systemPrefersDark(win) ? 'dark' : 'light';
  return 'light';
}

function getDoc(): Document {
  try {
    const parentDoc = (window.parent as any)?.document;
    if (parentDoc) return parentDoc as Document;
  } catch {}
  try { return document; } catch { return {} as Document; }
}

/** 仅同步 DOM 属性，不读设置、不落盘 */
export function paintTheme(mode: unknown, resolved?: ResolvedTheme) {
  const r = resolved ?? resolveTheme(mode);
  try {
    const doc = getDoc();
    const panel = doc.getElementById('aus-panel') as HTMLElement | null;
    if (panel) panel.setAttribute('data-ds-theme', r);
    const overlay = doc.getElementById('aus-overlay') as HTMLElement | null;
    if (overlay) {
      overlay.setAttribute('data-extension', 'api-usage-stat');
      overlay.setAttribute('data-ds-theme', r);
    }
    // 修复：严禁在宿主 documentElement 上设置 data-ds-theme / data-extension，避免全局样式污染（如 #send_textarea 跟随主题变白）
    // 之前 document.documentElement.setAttribute('data-ds-theme', ...) 会使 [data-extension]input 选择器命中全站输入框
    try {
      document.documentElement.removeAttribute('data-ds-theme');
      document.documentElement.removeAttribute('data-extension');
    } catch {}
    try {
      doc.documentElement.removeAttribute('data-ds-theme');
      // 仅当宿主根意外被污染时才移除，不影响面板本身的 data-extension
      if (doc.documentElement.getAttribute('data-extension') === 'api-usage-stat') {
        const hasPanel = !!doc.getElementById('aus-panel');
        if (hasPanel) doc.documentElement.removeAttribute('data-extension');
      }
    } catch {}
  } catch {}
}

export function applyTheme(theme?: string) {
  const t = normalizeThemeMode(theme ?? (state.settings as any)?.theme);
  paintTheme(t);
  // auto 模式下确保系统配色变化监听已建立（幂等，重复调用无副作用）
  if (t === 'auto') { try { watchSystemTheme(); } catch {} }
}

export function setTheme(mode: ThemeMode) {
  const m = normalizeThemeMode(mode);
  (state.settings as any).theme = m;
  try { saveHot({ settings: state.settings }); } catch {}
  applyTheme(m);
}

/* ---------------- 跟随系统的实时监听 ---------------- */

let boundWin: any = null;
let boundMql: any = null;
let boundHandler: ((e: any) => void) | null = null;

/**
 * 主题实际变化后需要重绘的动态内容。
 * ECharts 的配色在绘制时就已固化进 option，不随 CSS 变量更新，必须重建实例再重绘；
 * 热力图等内联色值同理。refreshUI 会在面板打开时重绘 概览/统计/预测/钱包 四个视图。
 */
function repaintDynamic() {
  try { (globalThis as any).ApiUsageStat?.refreshTheme?.(); } catch {}
}

/**
 * 监听系统配色变化：仅在 auto 模式下响应。
 * 同一 window 只绑一次；宿主不支持 addEventListener 时静默降级（不抛错）。
 */
export function watchSystemTheme(win?: any) {
  const w = win ?? hostWindow();
  if (!w || typeof w.matchMedia !== 'function') return;
  if (boundWin === w) return;
  // 切换宿主窗口前先解除旧绑定，避免在旧 window 上留下失效的监听
  unwatchSystemTheme();
  try {
    const mql = w.matchMedia(DARK_QUERY);
    if (!mql || typeof mql.addEventListener !== 'function') return; // 老 Safari 无 addEventListener 分支，静默跳过
    boundHandler = (e: any) => {
      if (normalizeThemeMode((state.settings as any)?.theme) !== 'auto') return;
      const next: ResolvedTheme = e?.matches ? 'dark' : 'light';
      paintTheme('auto', next);
      // 面板尚未创建时无需重绘，等创建时会直接读到最新值
      let hasPanel = false;
      try { hasPanel = !!getDoc().getElementById('aus-panel'); } catch {}
      if (hasPanel) repaintDynamic();
    };
    mql.addEventListener('change', boundHandler);
    boundWin = w;
    // matchMedia 每次调用返回新的 MediaQueryList，必须保存绑定时拿到的那一个才能正确解绑
    boundMql = mql;
  } catch {}
}

/** 解除监听（扩展禁用时调用，避免热重载后重复触发） */
export function unwatchSystemTheme() {
  try {
    if (boundMql && boundHandler) boundMql.removeEventListener('change', boundHandler);
  } catch {}
  boundMql = null;
  boundWin = null;
  boundHandler = null;
}

/** 设置切换后调用：auto 时确保监听已建立 */
export function syncThemeWatcher() {
  if (normalizeThemeMode((state.settings as any)?.theme) === 'auto') watchSystemTheme();
}
