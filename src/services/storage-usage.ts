/**
 * 存储占用统计：统计本扩展在各类存储中占用的空间。
 *
 * 本扩展的数据实际分布在四个地方（见 store/persistence.ts）：
 *  1. SillyTavern 设置（extensionSettings.api_usage_stat）—— 热数据：最近 50 条历史 + 设置 + 汇总
 *     注：由酒馆统一序列化进其 settings.json，浏览器端拿不到落盘字节数，只能按 UTF-8 估算
 *  2. IndexedDB `api_usage_stat_db` / `kv` —— 冷历史、旧版迁移备份
 *  3. localStorage —— 零星小项（WebDAV 密码密文、峰值圆点位置、调试开关、更新检查时间、预测页偏好）
 *  4. 浏览器存储配额（navigator.storage.estimate）—— 全局参考，不是本扩展独占
 *
 * 兼容性要点：
 *  - `navigator.storage.estimate` 仅在安全上下文（https / localhost）可用；http 局域网访问时缺失，
 *    此时标记为“不可用”，不显示假数据。
 *  - `navigator.storage.persisted` 在 Safari 早期版本缺失，按未知处理。
 *  - 隐私模式 / 第三方 Cookie 被拦截时 IndexedDB 可能直接抛错，全部走 try/catch 降级。
 *  - 统一用 UTF-8 字节数（TextEncoder），不用 .length（UTF-16 码元数会低估中文占用）。
 */

const DB_NAME = 'api_usage_stat_db';
const STORE_NAME = 'kv';

export type StorageItem = {
  /** 稳定标识，用于 DOM id */
  key: string;
  /** 展示名称 */
  label: string;
  /** 字节数；null 表示不可用（环境不支持或读取失败） */
  bytes: number | null;
  /** 补充说明 */
  detail?: string;
};

export type StorageReport = {
  items: StorageItem[];
  /** 可统计项合计（不含全局配额） */
  totalBytes: number;
  /** 浏览器为该站点分配的配额，null 表示不支持 */
  quotaBytes: number | null;
  /** 站点已用（全站，非本扩展独占），null 表示不支持 */
  usageBytes: number | null;
  /** 是否已申请持久化存储；null 表示不支持 */
  persisted: boolean | null;
  /** 全局存储信息是否可读（Safari 隐私模式等会拒绝） */
  globalAvailable: boolean;
};

/** UTF-8 字节数（中文 3 字节，避免用 length 低估） */
export function utf8Bytes(text: string | null | undefined): number {
  if (!text) return 0;
  try {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
  } catch {}
  // 极老内核无 TextEncoder：按码点粗估
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

/** 人类可读的容量文本。始终用二进制单位（KB=1024），与系统/浏览器存储界面口径一致 */
export function formatBytes(bytes: number | null): string {
  if (bytes == null || !isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  // 小于 10 保留两位，其余一位，避免 1.00 MB 这种冗余零
  const digits = v < 10 ? 2 : v < 100 ? 1 : 0;
  return `${parseFloat(v.toFixed(digits))} ${units[i]}`;
}

const LS_PREFIX_KEYS: Array<{ key: string; label: string; match: (k: string) => boolean }> = [
  { key: 'webdav_pass', label: 'WebDAV 密码（XOR）', match: k => k === 'ds_ds_webdav_pass' },
  { key: 'peak_dot', label: '峰值圆点位置', match: k => k === 'ds_ds_peak_dot_pos' },
  { key: 'debug_log', label: '调试日志开关', match: k => k === 'ds_debug_log' },
  { key: 'update', label: '更新检查记录', match: k => k.startsWith('aus_update_') },
  { key: 'forecast_prefs', label: '预测页偏好', match: k => k === 'aus_forecast_prefs_v1' },
  // 降级副本的键形如 aus_cold_xxx：IndexedDB 写入失败时本模块把值落到 localStorage
  { key: 'idb_fallback', label: '本地存储降级副本', match: k => k.startsWith('aus_cold') },
];

function readLocalStorage(doc: Document): StorageItem[] {
  let ls: Storage | null = null;
  try { ls = (doc.defaultView as any)?.localStorage ?? null; } catch { ls = null; }
  if (!ls) return [];
  let keys: string[] = [];
  try {
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k) keys.push(k);
    }
  } catch { return []; }

  const items: StorageItem[] = [];
  const used = new Set<string>();
  for (const def of LS_PREFIX_KEYS) {
    let bytes = 0;
    let count = 0;
    for (const k of keys) {
      if (used.has(k) || !def.match(k)) continue;
      try { bytes += utf8Bytes(ls.getItem(k)) + utf8Bytes(k); } catch {}
      used.add(k);
      count++;
    }
    if (count > 0) items.push({ key: `ls-${def.key}`, label: def.label, bytes });
  }
  return items;
}

/**
 * 打开本扩展的 IndexedDB。读不到返回 null（隐私模式、被拦截、从未写入过）。
 * 用 openDatabase 时不会在全新浏览器上创建空库；但标准 indexedDB 只有 open()，
 * 而 open() 在库不存在时会触发 upgradeneeded 并真的建一个空库 —— 为避免“看一眼就建库”，
 * 先用 databases() 探测是否存在（Chrome 71+ / Safari 14+ / Firefox 126+），
 * 不支持 databases() 的环境退回 open()，且不写入任何数据（空库 0 字节，无害）。
 */
function openDb(doc: Document): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    let idb: IDBFactory | null = null;
    try { idb = (doc.defaultView as any)?.indexedDB ?? null; } catch { idb = null; }
    if (!idb) return resolve(null);
    let settled = false;
    const done = (db: IDBDatabase | null) => {
      if (settled) { try { db?.close(); } catch {} return; }
      settled = true;
      resolve(db);
    };

    const doOpen = () => {
      try {
        const req = idb!.open(DB_NAME, 1);
        req.onsuccess = (e: any) => done(e.target.result as IDBDatabase);
        req.onerror = () => done(null);
        req.onblocked = () => done(null);
        req.onupgradeneeded = () => {
          // 库不存在被创建：空库无数据，按 0 处理
        };
      } catch { done(null); }
    };

    const probe = (idb as any).databases;
    if (typeof probe === 'function') {
      try {
        probe.call(idb).then((list: Array<{ name?: string }>) => {
          if (settled) return;
          const exists = Array.isArray(list) && list.some(d => d && d.name === DB_NAME);
          if (exists) doOpen();
          else done(null);
        }).catch(() => doOpen());
        return;
      } catch { /* 继续走 open */ }
    }
    doOpen();
  });
}

async function readIndexedDb(doc: Document): Promise<StorageItem[]> {
  const db = await openDb(doc);
  if (!db) return [];
  try {
    if (!db.objectStoreNames.contains(STORE_NAME)) return [];
    const result = await new Promise<Array<{ k: string; bytes: number }>>(resolve => {
      const out: Array<{ k: string; bytes: number }> = [];
      try {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        req.onsuccess = (e: any) => {
          const cur = e.target.result;
          if (!cur) { resolve(out); return; }
          const v = cur.value;
          out.push({ k: String(cur.key), bytes: typeof v === 'string' ? utf8Bytes(v) : utf8Bytes(JSON.stringify(v)) });
          try { cur.continue(); } catch { resolve(out); }
        };
        req.onerror = () => resolve(out);
        tx.onabort = () => resolve(out);
      } catch { resolve(out); }
      setTimeout(() => resolve(out), 800);
    });
    const items: StorageItem[] = [];
    for (const r of result) {
      if (r.k === 'cold_history') items.push({ key: 'idb-cold', label: '历史记录（冷数据）', bytes: r.bytes });
      else if (r.k.startsWith('migration_backup_')) items.push({ key: 'idb-backup', label: '旧版迁移备份', bytes: r.bytes });
      else items.push({ key: 'idb-' + r.k.replace(/[^\w-]/g, '_'), label: r.k, bytes: r.bytes });
    }
    return items;
  } finally {
    try { db.close(); } catch {}
  }
}

/** 热数据：酒馆 extensionSettings 中被序列化的 JSON 体积（UTF-8 估算） */
export function estimateHotBytes(settings: any): number {
  if (settings == null) return 0;
  try { return utf8Bytes(JSON.stringify(settings)); } catch { return 0; }
}

export type CollectOptions = {
  doc?: Document;
  /** 酒馆设置里的本扩展节点（extensionSettings.api_usage_stat） */
  hotSettings?: any;
  /** 可选：读取 IndexedDB 的超时（毫秒），默认 1000 */
  idbTimeoutMs?: number;
};

/**
 * 汇总存储占用。任何单项失败都只影响该项（标记为 null），不会让整块 UI 失败。
 * 全程不使用 localStorage.clear / indexedDB.deleteDatabase 等破坏性操作。
 */
export async function collectStorageReport(opts: CollectOptions = {}): Promise<StorageReport> {
  const doc = opts.doc ?? (typeof document !== 'undefined' ? document : ({} as Document));
  const items: StorageItem[] = [];

  // 1. 热数据
  const hotBytes = estimateHotBytes(opts.hotSettings);
  items.push({
    key: 'hot',
    label: '设置与近期记录',
    bytes: hotBytes,
    detail: '保存在酒馆设置文件中',
  });

  // 2. IndexedDB（带超时，避免个别浏览器卡住导致面板一直转圈）
  let idbItems: StorageItem[] = [];
  try {
    const timeout = opts.idbTimeoutMs ?? 1000;
    idbItems = await Promise.race([
      readIndexedDb(doc),
      new Promise<StorageItem[]>(resolve => setTimeout(() => resolve([]), timeout)),
    ]);
  } catch { idbItems = []; }
  items.push(...idbItems);

  // 3. localStorage
  try { items.push(...readLocalStorage(doc)); } catch {}

  // 4. 浏览器配额与全站用量
  let quotaBytes: number | null = null;
  let usageBytes: number | null = null;
  let persisted: boolean | null = null;
  let globalAvailable = false;
  try {
    const nav: any = (doc.defaultView as any)?.navigator ?? (typeof navigator !== 'undefined' ? navigator : null);
    const storage = nav?.storage;
    if (storage && typeof storage.estimate === 'function') {
      const est = await storage.estimate();
      if (est && typeof est.quota === 'number') { quotaBytes = est.quota; usageBytes = typeof est.usage === 'number' ? est.usage : null; globalAvailable = true; }
    }
    if (storage && typeof storage.persisted === 'function') persisted = !!(await storage.persisted());
  } catch { /* Safari 隐私模式 / 权限被拒：保持不可用 */ }

  const totalBytes = items.reduce((sum, i) => sum + (i.bytes || 0), 0);
  return { items, totalBytes, quotaBytes, usageBytes, persisted, globalAvailable };
}
