import { describe, expect, it } from 'vitest';
import { extractReportedCost, reportedCostInCny } from './reported-cost';
import { createDeepSeekWallet } from './wallets';
import { defaultSettings } from '../types/settings';
import { officialEndpointId } from '../services/connection-identity';

describe('平台实际费用口径', () => {
  const wallet = () => ({ ...createDeepSeekWallet(defaultSettings()), sourceType: 'openrouter', endpointId: officialEndpointId('openrouter'), endpointLabel: 'OpenRouter 官方' });
  it('显式未知币种、负数、空值与错误值不当作美元', () => {
    expect(extractReportedCost({ cost: 1, cost_currency: 'EUR' }, wallet())).toBeNull();
    for (const cost of [-1, null, true, '', Infinity, 'invalid']) expect(extractReportedCost({ cost }, wallet())).toBeNull();
  });
  it('0 是有效实扣费用，明确的币种优先', () => {
    expect(extractReportedCost({ cost: 0 }, wallet())).toEqual({ amount: 0, currency: 'USD' });
    expect(extractReportedCost({ cost: '0.1', cost_currency: 'CNY' }, wallet())).toEqual({ amount: 0.1, currency: 'CNY' });
  });
  it('支持关闭实扣价，不接受无效汇率', () => {
    expect(extractReportedCost({ cost: 1 }, { ...wallet(), responseCost: 'off' })).toBeNull();
    expect(reportedCostInCny({ amount: 1, currency: 'USD' }, -7)).toBeNull();
    expect(reportedCostInCny({ amount: 1, currency: 'USD' }, Infinity)).toBeNull();
  });
});
