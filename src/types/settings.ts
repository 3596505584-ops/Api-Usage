export type PeakHour = { start: string; end: string };
export type CustomModel = {
  model: string;
  usePeakPricing?: boolean;
  offpeak: { hit: string | number; miss: string | number; output: string | number };
  peak: { hit: string | number; miss: string | number; output: string | number };
  /**
   * models.dev 自动同步写入的价格条目：仅参与计价，默认不在“模型与价格”列表中显示。
   * 用户在设置页手工改价或调峰谷后，该标记会被移除（转为普通自定义模型）。
   */
  synced?: boolean;
};

export type WebdavSettings = {
  url: string;
  username: string;
  path: string;
  proxy: string;
};

/** light 浅色 / dark 深色 / auto 跟随系统（prefers-color-scheme） */
export type ThemeMode = 'light' | 'dark' | 'auto';

export type PricingSyncMode = 'add-missing' | 'overwrite-unlocked' | 'overwrite-all';
export type PricingSyncSettings = {
  enabled: boolean;
  mode: PricingSyncMode;
  exchangeRate: number;
  useLiveRate: boolean;
  autoIntervalHours: number;
  lastSync: number | null;
  lastRateFetch: number | null;
  recalcOnSync: boolean;
  /** 是否在“模型与价格”列表中展开显示已同步模型（默认 false，仅参与计价） */
  showSyncedModels: boolean;
  /** 旧数据同步模型标记迁移版本：0 表示尚未处理（用于版本更新后自动清理列表） */
  syncedMarkVersion: number;
};

export type HistoryScope = 'all' | 'current';
// 概览四块可自定义指标
export type OverviewFourKey =
  | 'avg_cost' | 'avg_tokens' | 'avg_duration' | 'avg_rate'
  | 'avg_ttft'
  | 'avg_input_cost' | 'avg_input_tokens' | 'avg_output_cost' | 'avg_output_tokens'
  | 'avg_think_time' | 'avg_think_tokens'
  | 'avg_hit_rate' | 'latest_hit_rate'
  | 'max_output' | 'max_input' | 'max_total'
  | 'avg_think_ratio' | 'truncation_rate';
// 统计页模型汇总上方 4 小块（与概览 8 块同体系，独立配置）
export type StatsFourKey = 'avg_cost' | 'avg_tokens' | 'avg_duration' | 'avg_rate'
  | 'avg_ttft'
  | 'avg_input_cost' | 'avg_input_tokens' | 'avg_output_cost' | 'avg_output_tokens'
  | 'avg_think_time' | 'avg_think_tokens' | 'avg_think_ratio' | 'truncation_rate'
  | 'avg_hit_rate' | 'latest_hit_rate' | 'max_output' | 'max_input' | 'max_total';
export type Settings = {
  theme: ThemeMode;
  overviewWalletId: string;
  overviewWalletManuallySet: boolean;
  autoBalance: boolean;
  balanceInterval: number;
  debug: boolean;
  debugHit: number;
  debugMiss: number;
  debugOutput: number;
  debugModel: string;
  debugDateStart: string;
  debugDateEnd: string;
  debugBatchCount: number;
  customModels: CustomModel[];
  peakHours: PeakHour[];
  // 用户补充的额外空闲日期（YYYY-MM-DD）：内置节假日数据未覆盖年份或特殊调整时使用
  extraOffDays: string[];
  peakDot: boolean;
  /** 匿名使用统计开关（默认开启，关闭后不再采集与上报） */
  telemetryEnabled: boolean;
  webdav: WebdavSettings;
  historyScope: HistoryScope;
  overviewFour: OverviewFourKey[];
  statsFour: StatsFourKey[];
  modelsPricingCollapsed?: boolean;
  pricingSync: PricingSyncSettings;
};

export const defaultSettings = (): Settings => ({
  theme: 'light',
  overviewWalletId: 'wallet:deepseek-official',
  overviewWalletManuallySet: false,
  autoBalance: false,
  balanceInterval: 10,
  debug: false,
  debugHit: 10000,
  debugMiss: 5000,
  debugOutput: 2000,
  debugModel: 'deepseek-v4-flash',
  debugDateStart: '',
  debugDateEnd: '',
  debugBatchCount: 30,
  customModels: [],
  peakHours: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
  extraOffDays: [],
  peakDot: true,
  telemetryEnabled: true,
  webdav: { url: 'https://dav.jianguoyun.com/dav/', username: '', path: '', proxy: '' },
  historyScope: 'all',
  overviewFour: ['avg_cost', 'avg_tokens', 'avg_duration', 'avg_rate', 'avg_input_tokens', 'avg_output_tokens', 'avg_hit_rate', 'max_total'],
  statsFour: ['avg_cost', 'avg_tokens', 'avg_think_ratio', 'truncation_rate'],
  modelsPricingCollapsed: true,
  pricingSync: {
    enabled: false,
    mode: 'add-missing',
    exchangeRate: 7.2,
    useLiveRate: true,
    autoIntervalHours: 0,
    lastSync: null,
    lastRateFetch: null,
    recalcOnSync: false,
    showSyncedModels: false,
    syncedMarkVersion: 0,
  },
});

export type Balance = {
  balance: string;
  currency: string;
  available: boolean;
  timestamp: number;
};

export type SyncMeta = Record<string, number>;
