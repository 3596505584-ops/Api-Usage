import type { AccountSnapshot, BalanceProvider, BalanceQueryConfig, WalletConfig } from '../types/wallet';
import { officialEndpointId } from '../services/connection-identity';

export const BALANCE_PROVIDERS: Array<{ id: BalanceProvider; label: string }> = [
  { id: 'auto', label: '按接入地址自动识别' },
  { id: 'manual', label: '仅手工余额' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'openrouter', label: 'OpenRouter 账户（管理密钥）' },
  { id: 'openrouter-key', label: 'OpenRouter 密钥用量/额度' },
  { id: 'siliconflow', label: '硅基流动（中国站）' },
  { id: 'moonshot', label: 'Moonshot（中国站）' },
  { id: 'moonshot-intl', label: 'Moonshot（国际站）' },
  { id: 'custom', label: '自定义 JSON 接口' },
];

export function normalizeBalanceQuery(raw: any): BalanceQueryConfig {
  return {
    provider: BALANCE_PROVIDERS.some((p) => p.id === raw?.provider) ? raw.provider : 'auto',
    url: safeBalanceUrl(raw?.url) || '',
    balancePath: String(raw?.balancePath || '').trim(),
    usagePath: String(raw?.usagePath || '').trim(),
    totalPath: String(raw?.totalPath || '').trim(),
    multiplier: typeof raw?.multiplier === 'number' && Number.isFinite(raw.multiplier) && raw.multiplier > 0 ? raw.multiplier : 1,
    currency: raw?.currency === 'USD' ? 'USD' : 'CNY',
    auth: raw?.auth === 'x-api-key' ? 'x-api-key' : 'bearer',
  };
}

/** 查询地址不包含密钥；禁止用户信息、查询参数和重定向转发凭证。 */
export function safeBalanceUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value || ''));
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return url.href;
  } catch { return null; }
}

export function detectBalanceProvider(wallet: Pick<WalletConfig, 'sourceType' | 'endpointId' | 'endpointLabel'>): BalanceProvider | null {
  const hosts: Record<string, BalanceProvider> = {
    'api.deepseek.com': 'deepseek', 'openrouter.ai': 'openrouter',
    'api.siliconflow.cn': 'siliconflow', 'api.moonshot.cn': 'moonshot', 'api.moonshot.ai': 'moonshot-intl',
  };
  // 同源中转不能仅凭 sourceType 被误识别为官方接口。
  for (const field of [wallet.endpointLabel, wallet.endpointId]) {
    try {
      const text = String(field || '');
      const url = new URL(text.includes('://') ? text : `https://${text}`);
      if (url.username || url.password || url.port) continue;
      const provider = hosts[url.hostname.toLowerCase()];
      if (provider) return provider;
    } catch {}
  }
  const source = String(wallet.sourceType || '').toLowerCase();
  if (wallet.endpointId === officialEndpointId(source)) {
    const official: Record<string, BalanceProvider> = { deepseek: 'deepseek', openrouter: 'openrouter', siliconflow: 'siliconflow', moonshot: 'moonshot' };
    return official[source] || null;
  }
  return null;
}

export function resolvedBalanceProvider(wallet: WalletConfig): BalanceProvider | null {
  const provider = wallet.balance.query?.provider || 'auto';
  return provider === 'auto' ? detectBalanceProvider(wallet) : provider;
}

export function balanceQueryUrl(wallet: WalletConfig): string | null {
  const urls: Partial<Record<BalanceProvider, string>> = {
    deepseek: 'https://api.deepseek.com/user/balance',
    openrouter: 'https://openrouter.ai/api/v1/credits',
    'openrouter-key': 'https://openrouter.ai/api/v1/key',
    siliconflow: 'https://api.siliconflow.cn/v1/user/info',
    moonshot: 'https://api.moonshot.cn/v1/users/me/balance',
    'moonshot-intl': 'https://api.moonshot.ai/v1/users/me/balance',
  };
  const provider = resolvedBalanceProvider(wallet);
  return provider === 'custom' ? safeBalanceUrl(wallet.balance.query?.url) : (provider ? urls[provider] || null : null);
}

export function moneyNumber(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 只读取自有属性，不执行表达式；支持 data.items[0].balance。 */
export function jsonField(data: unknown, path: string): unknown {
  if (!path || !/^[\w-]+(?:\[\d+\]|\.[\w-]+)*$/.test(path)) return undefined;
  let value: any = data;
  for (const key of path.replace(/\[(\d+)\]/g, '.$1').split('.')) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || !value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, key)) return undefined;
    value = value[key];
  }
  return value;
}

export function parseAccountSnapshot(wallet: WalletConfig, data: any): AccountSnapshot {
  if (data?.error || data?.success === false || data?.status === false) throw new Error('平台返回查询失败');
  const provider = resolvedBalanceProvider(wallet);
  let amount: number | null = null;
  let usage: number | null = null;
  let currency: 'CNY' | 'USD' = 'CNY';
  let keyRemaining: number | null = null;
  let scope: 'account' | 'key' = 'account';
  if (provider === 'deepseek') {
    const infos = Array.isArray(data?.balance_infos) ? data.balance_infos : [];
    const info = infos.find((i: any) => i.currency === wallet.balance.currency) || infos[0];
    if (!info || !['CNY', 'USD'].includes(info.currency)) throw new Error('余额响应缺少有效币种');
    amount = moneyNumber(info.total_balance); currency = info.currency;
    // is_available=false 仍需更新已耗尽或为负数的余额。
  } else if (provider === 'openrouter') {
    currency = 'USD';
    const credits = moneyNumber(data?.data?.total_credits);
    usage = moneyNumber(data?.data?.total_usage);
    if (credits !== null && usage !== null) amount = credits - usage;
  } else if (provider === 'openrouter-key') {
    currency = 'USD'; scope = 'key';
    usage = moneyNumber(data?.data?.usage);
    keyRemaining = moneyNumber(data?.data?.limit_remaining);
    // 密钥额度不是账户余额；不覆盖钱包余额。
  } else if (provider === 'siliconflow') {
    amount = moneyNumber(data?.data?.totalBalance);
  } else if (provider === 'moonshot' || provider === 'moonshot-intl') {
    amount = moneyNumber(data?.data?.available_balance);
    currency = provider === 'moonshot-intl' ? 'USD' : 'CNY';
  } else if (provider === 'custom') {
    const q = normalizeBalanceQuery(wallet.balance.query);
    currency = q.currency;
    const rawUsage = q.usagePath ? moneyNumber(jsonField(data, q.usagePath)) : null;
    if (q.usagePath && rawUsage === null) throw new Error('已用金额字段不存在或不是有效数字');
    usage = rawUsage === null ? null : rawUsage * q.multiplier;
    const rawAmount = moneyNumber(jsonField(data, q.totalPath || q.balancePath));
    if (rawAmount !== null && (!q.totalPath || rawUsage !== null)) amount = (rawAmount - (q.totalPath ? rawUsage! : 0)) * q.multiplier;
  }
  if (scope === 'account' ? amount === null || !Number.isFinite(amount) : usage === null) throw new Error('未找到有效余额/用量，请检查接口和字段配置');
  if (usage !== null && (!Number.isFinite(usage) || usage < 0)) throw new Error('平台已用金额无效');
  return { amount: amount === null ? null : String(amount), currency, usage, scope, keyRemaining };
}
