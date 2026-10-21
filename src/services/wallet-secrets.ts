import { decryptKey, encryptKey } from '../utils/crypto';
import { saveExtensionSettings, getExtensionSettings } from '../store/persistence';
import { DEEPSEEK_WALLET_ID } from '../types/wallet';

const SECRETS_KEY = 'walletSecrets';
const TARGETS_KEY = 'walletSecretTargets';
const LEGACY_DEEPSEEK_URL = 'https://api.deepseek.com/user/balance';

function readMap(): Record<string, string> {
  try {
    const settings: any = getExtensionSettings() || {};
    const value = settings[SECRETS_KEY];
    return value && typeof value === 'object' ? { ...value } : {};
  } catch {
    return {};
  }
}

export function getWalletApiKey(walletId: string, targetUrl?: string): string {
  if (!walletId) return '';
  try {
    if (targetUrl) {
      const bound = (getExtensionSettings() as any)?.[TARGETS_KEY]?.[walletId];
      if (bound ? bound !== targetUrl : (walletId !== DEEPSEEK_WALLET_ID || targetUrl !== LEGACY_DEEPSEEK_URL)) return '';
    }
    const encrypted = readMap()[walletId];
    return encrypted ? decryptKey(encrypted) : '';
  } catch {
    return '';
  }
}

export function saveWalletApiKey(walletId: string, key: string, targetUrl?: string): void {
  if (!walletId) return;
  const settings: any = getExtensionSettings() || {};
  const map = readMap();
  const targets = { ...(settings[TARGETS_KEY] || {}) };
  const value = String(key || '').trim();
  if (value) {
    map[walletId] = encryptKey(value);
    const target = targetUrl || (walletId === DEEPSEEK_WALLET_ID ? LEGACY_DEEPSEEK_URL : '');
    if (target) targets[walletId] = target;
    else delete targets[walletId];
  } else {
    delete map[walletId];
    delete targets[walletId];
  }
  saveExtensionSettings({ ...settings, [SECRETS_KEY]: map, [TARGETS_KEY]: targets, _updated: Date.now() });
}

export function deleteWalletApiKey(walletId: string): void {
  saveWalletApiKey(walletId, '');
}

export function migrateLegacyWalletApiKey(walletId = DEEPSEEK_WALLET_ID): void {
  if (!walletId || getWalletApiKey(walletId)) return;
  try {
    const settings: any = getExtensionSettings() || {};
    const encrypted = settings.apiKey;
    if (!encrypted) return;
    const plain = decryptKey(encrypted);
    if (plain) {
      saveWalletApiKey(walletId, plain);
      const latest: any = getExtensionSettings() || {};
      delete latest.apiKey;
      saveExtensionSettings({ ...latest, _updated: Date.now() });
    }
  } catch {}
}
