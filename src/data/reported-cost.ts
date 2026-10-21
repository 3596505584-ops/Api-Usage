import type { WalletConfig, WalletCurrency } from '../types/wallet';
import { detectBalanceProvider, moneyNumber } from './balance-providers';

export type ReportedCost = { amount: number; currency: WalletCurrency };

export function extractReportedCost(usage: any, wallet: WalletConfig | null): ReportedCost | null {
  if (!wallet || wallet.responseCost === 'off') return null;
  if ((!wallet.responseCost || wallet.responseCost === 'auto') && usage?.cost_currency != null && !['CNY', 'USD'].includes(usage.cost_currency)) return null;
  const currency = wallet.responseCost === 'CNY' || wallet.responseCost === 'USD'
    ? wallet.responseCost
    : (usage?.cost_currency === 'USD' || usage?.cost_currency === 'CNY' ? usage.cost_currency
      : detectBalanceProvider(wallet) === 'openrouter' ? 'USD' : null);
  const amount = moneyNumber(usage?.cost);
  return currency && amount !== null && amount >= 0 ? { amount, currency } : null;
}

export function reportedCostInCny(reported: any, rate: number): number | null {
  const amount = moneyNumber(reported?.amount);
  if (amount === null || amount < 0 || !['USD', 'CNY'].includes(reported?.currency)) return null;
  if (reported.currency === 'USD' && (!Number.isFinite(rate) || rate <= 0)) return null;
  const cny = reported.currency === 'USD' ? amount * rate : amount;
  return Number.isFinite(cny) ? cny : null;
}
