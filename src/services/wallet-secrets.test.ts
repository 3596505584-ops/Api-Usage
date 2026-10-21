import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWalletApiKey, saveWalletApiKey } from './wallet-secrets';
import { DEEPSEEK_WALLET_ID } from '../types/wallet';
import { encryptKey } from '../utils/crypto';

const storage = vi.hoisted(() => ({ value: {} as any }));
vi.mock('../store/persistence', () => ({
  getExtensionSettings: () => storage.value,
  saveExtensionSettings: (value: any) => { storage.value = value; },
}));

describe('校准密钥与目标地址绑定', () => {
  beforeEach(() => { storage.value = {}; });
  it('只能向保存时绑定的地址发送；导入不同地址的配置不能复用本地密钥', () => {
    saveWalletApiKey('wallet:test', 'test-only-secret', 'https://example.com/balance');
    expect(getWalletApiKey('wallet:test', 'https://example.com/balance')).toBe('test-only-secret');
    expect(getWalletApiKey('wallet:test', 'https://other.example/balance')).toBe('');
    expect(storage.value.walletSecrets['wallet:test']).not.toContain('test-only-secret');
    saveWalletApiKey('wallet:test', '');
    expect(getWalletApiKey('wallet:test')).toBe('');
    expect(storage.value.walletSecretTargets['wallet:test']).toBeUndefined();
  });
  it('旧 DeepSeek 密钥仅兼容原官方地址', () => {
    storage.value.walletSecrets = { [DEEPSEEK_WALLET_ID]: encryptKey('test-legacy-secret') };
    expect(getWalletApiKey(DEEPSEEK_WALLET_ID, 'https://api.deepseek.com/user/balance')).toBe('test-legacy-secret');
    expect(getWalletApiKey(DEEPSEEK_WALLET_ID, 'https://openrouter.ai/api/v1/credits')).toBe('');
  });
});
