import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../types/settings';
import {
  createDeepSeekWallet,
  createWalletFromConnection,
  DEEPSEEK_OFFICIAL_ENDPOINT_ID,
  findExactPricedModelMatch,
  findWalletModel,
  mergeWalletCollections,
  normalizeWalletModel,
  normalizeWallets,
  observeCredential,
  observeModel,
  walletBalanceToCny,
  walletModelMatches,
} from './wallets';
import { DEEPSEEK_WALLET_ID, defaultCatalogProvider, isFirstPartyCatalogProvider } from '../types/wallet';

describe('钱包数据', () => {
  it('始终保留 DeepSeek 官方钱包并预置现役模型', () => {
    const settings = defaultSettings();
    const wallets = normalizeWallets([], settings, 1000);
    const official = wallets.find((wallet) => wallet.id === DEEPSEEK_WALLET_ID);

    expect(official).toBeTruthy();
    expect(official?.sourceType).toBe('deepseek');
    expect(official?.models.some((model) => model.model === 'deepseek-flash')).toBe(true);
    expect(official?.collapsed).toBe(true);
  });

  it('钱包默认收起并记忆展开状态', () => {
    const settings = defaultSettings();
    const wallet = createWalletFromConnection({
      sourceType: 'custom',
      endpointId: 'collapsed-endpoint',
      endpointLabel: 'relay.collapsed/v1',
      credentialId: null,
      credentialLabel: null,
    }, settings, 1000)!;
    expect(wallet.collapsed).toBe(true);
    wallet.collapsed = false;
    const normalized = normalizeWallets([wallet], settings, 1000)
      .find((item) => item.id === wallet.id)!;
    expect(normalized.collapsed).toBe(false);
  });

  it('官方地址的历史接入归入内置 DeepSeek 钱包', () => {
    const wallet = createWalletFromConnection({
      sourceType: 'custom',
      endpointId: DEEPSEEK_OFFICIAL_ENDPOINT_ID,
      endpointLabel: 'api.deepseek.com/v1',
      credentialId: null,
      credentialLabel: null,
    }, defaultSettings(), 1000);

    expect(wallet?.id).toBe(DEEPSEEK_WALLET_ID);
  });

  it('价格来源只保留第一方模型厂商', () => {
    expect(defaultCatalogProvider('deepseek')).toBe('deepseek');
    expect(defaultCatalogProvider('openai')).toBe('openai');
    expect(defaultCatalogProvider('openrouter')).toBeNull();
    expect(defaultCatalogProvider('groq')).toBeNull();
    expect(defaultCatalogProvider('siliconflow')).toBeNull();
    expect(defaultCatalogProvider('fireworks')).toBeNull();
    expect(isFirstPartyCatalogProvider('openrouter')).toBe(false);
    expect(isFirstPartyCatalogProvider('fireworks-ai')).toBe(false);
    expect(isFirstPartyCatalogProvider('anthropic')).toBe(true);

    const settings = defaultSettings();
    const wallet = createWalletFromConnection({
      sourceType: 'custom',
      endpointId: 'third-party-catalog',
      endpointLabel: 'relay.third/v1',
      credentialId: null,
      credentialLabel: null,
    }, settings, 1000)!;
    wallet.catalogProvider = 'openrouter';
    const normalized = normalizeWallets([wallet], settings, 1000)
      .find((item) => item.id === wallet.id)!;
    expect(normalized.catalogProvider).toBeNull();
  });

  it('按接入链接创建钱包并记录密钥与模型观测项', () => {
    const settings = defaultSettings();
    const wallet = createWalletFromConnection({
      sourceType: 'custom',
      endpointId: 'endpoint-a',
      endpointLabel: 'relay.example/v1',
      credentialId: 'secret:custom:a',
      credentialLabel: '主密钥 •••abc',
    }, settings, 1000);
    expect(wallet).toBeTruthy();

    observeCredential(wallet!, 'secret:custom:a', '主密钥 •••abc', 2000);
    const observed = observeModel(wallet!, 'vendor-model', 2000);
    expect(wallet!.credentials[0]).toMatchObject({ id: 'secret:custom:a', lastSeen: 2000 });
    expect(observed.model).toMatchObject({ model: 'vendor-model', source: 'discovered' });
    expect(observed.model?.price.priceConfigured).toBe(false);
  });

  it('模型改名保留旧名别名并继续命中', () => {
    const settings = defaultSettings();
    const wallet = createWalletFromConnection({
      sourceType: 'custom',
      endpointId: 'endpoint-b',
      endpointLabel: 'relay.example/v2',
      credentialId: null,
      credentialLabel: null,
    }, settings, 1000)!;
    observeModel(wallet, 'old-name', 1000);
    const model = wallet.models[0];
    model.aliases.push(model.model);
    model.model = 'new-name';

    expect(walletModelMatches(model, 'old-name')).toBe(true);
    expect(findWalletModel(wallet, 'new-name')?.id).toBe(model.id);
  });

  it('按币种换算钱包余额', () => {
    const wallet = createDeepSeekWallet(defaultSettings(), 1000);
    wallet.balance.amount = '10';
    wallet.balance.currency = 'USD';
    expect(walletBalanceToCny(wallet, 7.2)).toBeCloseTo(72, 8);
    wallet.balance.currency = 'CNY';
    expect(walletBalanceToCny(wallet, 7.2)).toBe(10);
  });

  it('仅按完整模型名查找旧数据可复用价格', () => {
    const settings = defaultSettings();
    const wallet = createWalletFromConnection({
      sourceType: 'custom',
      endpointId: 'exact-price-endpoint',
      endpointLabel: 'relay.exact/v1',
      credentialId: null,
      credentialLabel: null,
    }, settings, 1000)!;
    observeModel(wallet, 'shared-price-model', 1000);
    wallet.models[0].price.priceConfigured = true;
    const wallets = [createDeepSeekWallet(settings, 1000), wallet];

    expect(findExactPricedModelMatch(wallets, 'shared-price-model')).toEqual({
      walletId: wallet.id,
      model: 'shared-price-model',
    });
    expect(findExactPricedModelMatch(wallets, 'SHARED-PRICE-MODEL')).toBeNull();
    expect(findExactPricedModelMatch(wallets, ' shared-price-model ')).toBeNull();
  });

  it('合并钱包时保留较新价格并合并观测项', () => {
    const settings = defaultSettings();
    const local = createDeepSeekWallet(settings, 1000);
    local.updatedAt = 2000;
    local.credentials = [{ id: 'a', label: '本地密钥', lastSeen: 2000 }];
    const remote = createDeepSeekWallet(settings, 1000);
    remote.updatedAt = 3000;
    remote.credentials = [{ id: 'b', label: '远端密钥', lastSeen: 3000 }];

    const merged = mergeWalletCollections([local], [remote]);
    expect(merged[0].updatedAt).toBe(3000);
    expect(merged[0].credentials.map((item) => item.id).sort()).toEqual(['a', 'b']);
  });

  it('DeepSeek 上下文上限自动兜底为 1M，并迁移旧 128k 自动值', () => {
    const fresh = normalizeWalletModel({
      sourceModel: 'deepseek-flash',
      model: 'deepseek-flash',
      source: 'builtin',
    }, 1000);
    expect(fresh?.contextLimit).toBe(1_000_000);
    expect(fresh?.contextLimitManual).toBe(false);

    const legacy = normalizeWalletModel({
      sourceModel: 'deepseek-flash',
      model: 'deepseek-flash',
      source: 'builtin',
      contextLimit: 128_000,
    }, 1000);
    expect(legacy?.contextLimit).toBe(1_000_000);

    const manual = normalizeWalletModel({
      sourceModel: 'deepseek-flash',
      model: 'deepseek-flash',
      source: 'builtin',
      contextLimit: 128_000,
      contextLimitManual: true,
    }, 1000);
    expect(manual?.contextLimit).toBe(128_000);
    expect(manual?.contextLimitManual).toBe(true);
  });
});
