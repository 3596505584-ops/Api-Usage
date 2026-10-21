import type { PeakHour } from './settings';

export type WalletCurrency = 'CNY' | 'USD';
export type WalletKind = 'official' | 'relay';
export type WalletBalanceMode = 'manual' | 'auto';
export type BalanceProvider = 'auto' | 'manual' | 'deepseek' | 'openrouter' | 'openrouter-key' | 'siliconflow' | 'moonshot' | 'moonshot-intl' | 'custom';
export type BalanceQueryConfig = {
  provider: BalanceProvider;
  url: string;
  balancePath: string;
  usagePath: string;
  /** 总额度字段；填写后余额为 (总额度 - 已用额度) × multiplier */
  totalPath: string;
  multiplier: number;
  currency: WalletCurrency;
  auth: 'bearer' | 'x-api-key';
};
export type AccountSnapshot = {
  amount: string | null;
  currency: WalletCurrency;
  usage: number | null;
  scope: 'account' | 'key';
  keyRemaining?: number | null;
};
export type WalletModelSource = 'builtin' | 'manual' | 'sync' | 'discovered';
export type WalletPriceTier = {
  hit: number;
  miss: number;
  output: number;
};
export type WalletPriceRule = {
  usePeakPricing: boolean;
  offpeak: WalletPriceTier;
  peak: WalletPriceTier;
  priceConfigured: boolean;
};
export type WalletBalance = {
  mode: WalletBalanceMode;
  amount: string | null;
  currency: WalletCurrency;
  primaryCredentialId: string | null;
  lastCalibrated: number | null;
  query?: BalanceQueryConfig;
  snapshot?: AccountSnapshot & { checkedAt: number };
};
export type WalletCredentialObservation = {
  id: string;
  label: string;
  lastSeen: number;
};
export type WalletModel = {
  id: string;
  sourceModel: string;
  model: string;
  aliases: string[];
  /** 模型上下文上限；未配置时由内置能力表推断 */
  contextLimit?: number | null;
  /** 上下文上限是否为用户手动设置；false/缺省表示自动推断 */
  contextLimitManual?: boolean;
  price: WalletPriceRule;
  source: WalletModelSource;
  locked: boolean;
  discoveredAt: number;
  lastSeen: number;
  updatedAt: number;
};
export type WalletConfig = {
  id: string;
  name: string;
  kind: WalletKind;
  sourceType: string | null;
  endpointId: string | null;
  endpointLabel: string | null;
  endpointDisplay: string | null;
  catalogProvider: string | null;
  /** usage.cost 的币种；auto 仅采信已知平台或响应明确提供的币种 */
  responseCost?: 'auto' | 'off' | WalletCurrency;
  balance: WalletBalance;
  peakHours: PeakHour[];
  weekendOffpeak: boolean;
  credentials: WalletCredentialObservation[];
  models: WalletModel[];
  collapsed: boolean;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  legacyPricingImported?: boolean;
};

export const DEEPSEEK_WALLET_ID = 'wallet:deepseek-official';

export const WALLET_CATALOG_PROVIDERS: Array<{ id: string; label: string }> = [
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'google', label: 'Google' },
  { id: 'mistral', label: 'Mistral' },
  { id: 'xai', label: 'xAI' },
  { id: 'moonshotai', label: 'Moonshot AI' },
  { id: 'zai', label: 'Z.AI' },
  { id: 'minimax', label: 'MiniMax' },
  { id: 'cohere', label: 'Cohere' },
];

export function isFirstPartyCatalogProvider(value: unknown): boolean {
  const id = String(value || '').trim().toLowerCase();
  return WALLET_CATALOG_PROVIDERS.some((provider) => provider.id === id);
}

export function defaultCatalogProvider(sourceType: string | null | undefined): string | null {
  const key = String(sourceType || '').trim().toLowerCase();
  const map: Record<string, string> = {
    deepseek: 'deepseek',
    openai: 'openai',
    claude: 'anthropic',
    makersuite: 'google',
    vertexai: 'google',
    mistralai: 'mistral',
    xai: 'xai',
    moonshot: 'moonshotai',
    zai: 'zai',
    minimax: 'minimax',
    cohere: 'cohere',
  };
  return map[key] || null;
}

export function walletCurrencyOrDefault(value: unknown): WalletCurrency {
  return String(value || '').trim().toUpperCase() === 'USD' ? 'USD' : 'CNY';
}

export function emptyWalletPriceRule(): WalletPriceRule {
  return {
    usePeakPricing: true,
    offpeak: { hit: 0, miss: 0, output: 0 },
    peak: { hit: 0, miss: 0, output: 0 },
    priceConfigured: false,
  };
}
