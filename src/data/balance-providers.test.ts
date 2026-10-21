import { describe, expect, it } from 'vitest';
import { balanceQueryUrl, detectBalanceProvider, jsonField, normalizeBalanceQuery, parseAccountSnapshot, safeBalanceUrl } from './balance-providers';
import { createDeepSeekWallet, createWalletFromConnection, normalizeWallet, cloneWallet } from './wallets';
import { defaultSettings } from '../types/settings';
import { officialEndpointId } from '../services/connection-identity';
import type { BalanceProvider } from '../types/wallet';

function wallet(provider: BalanceProvider = 'auto') {
  const w = createDeepSeekWallet(defaultSettings());
  w.balance.query = normalizeBalanceQuery({ provider });
  return w;
}

describe('余额来源识别与配置', () => {
  it.each([
    ['deepseek', 'deepseek'], ['openrouter', 'openrouter'], ['siliconflow', 'siliconflow'], ['moonshot', 'moonshot'],
  ])('识别官方 %s', (sourceType, provider) => {
    expect(detectBalanceProvider({ sourceType, endpointId: officialEndpointId(sourceType), endpointLabel: '官方接口' })).toBe(provider);
  });
  it.each([
    ['https://openrouter.ai/api/v1', 'openrouter'], ['api.moonshot.ai/v1', 'moonshot-intl'],
    ['https://api.siliconflow.cn/v1', 'siliconflow'], ['https://api.deepseek.com', 'deepseek'],
    ['https://openrouter.ai.evil.example', null], ['https://evil.example/openrouter.ai', null],
    ['https://openrouter.ai@evil.example', null], ['https://openrouter.ai:8443', null],
    ['https://relay.example/v1', null],
  ])('严格按主机识别 %s', (endpointLabel, expected) => {
    expect(detectBalanceProvider({ sourceType: 'openrouter', endpointId: 'relay-hash', endpointLabel })).toBe(expected);
  });
  it('旧钱包获得默认配置，未知字段不会进入查询配置，克隆不共享配置', () => {
    const raw = wallet();
    delete raw.balance.query;
    const normalized = normalizeWallet(raw, defaultSettings())!;
    expect(normalized.balance.query?.provider).toBe('auto');
    const clone = cloneWallet(normalized);
    clone.balance.query!.url = 'https://example.com/balance';
    expect(normalized.balance.query!.url).toBe('');
    expect(normalizeBalanceQuery({ provider: 'unknown', apiKey: 'test-only', multiplier: Infinity })).toEqual({
      provider: 'auto', url: '', balancePath: '', usagePath: '', totalPath: '', multiplier: 1, currency: 'CNY', auth: 'bearer',
    });
  });
  it('中转钱包不会误用原厂余额地址，显式配置优先', () => {
    const w = createWalletFromConnection({ sourceType: 'openrouter', endpointId: 'relay', endpointLabel: 'relay.example' }, defaultSettings())!;
    expect(balanceQueryUrl(w)).toBeNull();
    w.balance.query = normalizeBalanceQuery({ provider: 'openrouter-key' });
    expect(balanceQueryUrl(w)).toBe('https://openrouter.ai/api/v1/key');
  });
  it.each(['https://user:pass@example.com/balance', 'https://example.com/balance?key=test', 'https://example.com/#key', 'http://example.com', 'javascript:alert(1)'])('拒绝不安全地址 %s', (url) => {
    expect(safeBalanceUrl(url)).toBeNull();
    expect(normalizeBalanceQuery({ url }).url).toBe('');
  });
  it('允许 HTTPS 和本机 HTTP', () => {
    expect(safeBalanceUrl('https://example.com/balance')).toBe('https://example.com/balance');
    expect(safeBalanceUrl('http://localhost:8080/balance')).toBe('http://localhost:8080/balance');
  });
});

describe('平台余额解析', () => {
  it('DeepSeek 余额耗尽仍校准为 0，并按钱包币种选择', () => {
    const w = wallet('deepseek');
    expect(parseAccountSnapshot(w, { is_available: false, balance_infos: [{ currency: 'USD', total_balance: '2' }, { currency: 'CNY', total_balance: '0.00' }] })).toMatchObject({ amount: '0', currency: 'CNY' });
  });
  it('OpenRouter 使用充值总额减去已消费总额，保留负余额', () => {
    expect(parseAccountSnapshot(wallet('openrouter'), { data: { total_credits: 100, total_usage: 25.75 } })).toMatchObject({ amount: '74.25', usage: 25.75, currency: 'USD', scope: 'account' });
    expect(parseAccountSnapshot(wallet('openrouter'), { data: { total_credits: 0, total_usage: 1 } }).amount).toBe('-1');
  });
  it('OpenRouter 密钥额度与账户余额分开；无限额度保持未知', () => {
    expect(parseAccountSnapshot(wallet('openrouter-key'), { data: { usage: 20, limit_remaining: 0 } })).toMatchObject({ amount: null, usage: 20, keyRemaining: 0, scope: 'key' });
    expect(parseAccountSnapshot(wallet('openrouter-key'), { data: { usage: 0, limit_remaining: null } }).keyRemaining).toBeNull();
  });
  it.each([
    ['siliconflow', { data: { totalBalance: '88.88', balance: '0.88' } }, '88.88', 'CNY'],
    ['moonshot', { data: { available_balance: 49.5 } }, '49.5', 'CNY'],
    ['moonshot-intl', { data: { available_balance: 49.5 } }, '49.5', 'USD'],
  ] as const)('解析 %s', (provider, data, amount, currency) => {
    expect(parseAccountSnapshot(wallet(provider), data)).toMatchObject({ amount, currency, usage: null });
  });
  it.each([null, '', true, false, {}, [], '2invalid', 'Infinity'])('无效金额 %j 不能当成 0', (value) => {
    expect(() => parseAccountSnapshot(wallet('moonshot'), { data: { available_balance: value } })).toThrow();
  });
  it('失败响应和不支持币种不能覆盖余额', () => {
    expect(() => parseAccountSnapshot(wallet('siliconflow'), { status: false, data: { totalBalance: 100 } })).toThrow();
    expect(() => parseAccountSnapshot(wallet('deepseek'), { balance_infos: [{ currency: 'EUR', total_balance: 100 }] })).toThrow();
  });
  it('自定义接口支持数组字段、单位换算、总额减用量', () => {
    const w = wallet('custom');
    w.balance.query = normalizeBalanceQuery({ provider: 'custom', balancePath: 'data.items[0].balance', usagePath: 'data.used', multiplier: 0.01, currency: 'USD' });
    expect(parseAccountSnapshot(w, { data: { items: [{ balance: '8000' }], used: 2000 } })).toMatchObject({ amount: '80', usage: 20, currency: 'USD' });
    w.balance.query.totalPath = 'data.total';
    expect(parseAccountSnapshot(w, { data: { total: 10000, used: 2500 } })).toMatchObject({ amount: '75', usage: 25 });
    expect(() => parseAccountSnapshot(w, { data: { total: 10000 } })).toThrow();
  });
  it('不读取继承属性、不执行表达式，字段缺失时失败', () => {
    expect(jsonField({}, '__proto__.polluted')).toBeUndefined();
    expect(jsonField(Object.create({ balance: 1 }), 'balance')).toBeUndefined();
    expect(jsonField({}, 'data.balance * 100')).toBeUndefined();
    expect(() => parseAccountSnapshot(wallet('custom'), { data: {} })).toThrow();
  });
});
