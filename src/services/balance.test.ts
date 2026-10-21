import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryBalance, queryWalletBalance, restartBalanceTimer, stopBalanceTimer } from './balance';
import { createDeepSeekWallet } from '../data/wallets';
import { normalizeBalanceQuery } from '../data/balance-providers';
import { state } from '../store/index';
import { defaultSettings } from '../types/settings';

const mocks = vi.hoisted(() => ({ wallet: null as any, key: 'test-calibration-key', setSnapshot: vi.fn(), toast: vi.fn() }));
vi.mock('../data/repository', () => ({ repository: {
  getWallet: (id: string) => mocks.wallet?.id === id ? mocks.wallet : null,
  setWalletAccountSnapshot: (...args: any[]) => mocks.setSnapshot(...args),
} }));
vi.mock('./wallet-secrets', () => ({ getWalletApiKey: () => mocks.key, saveWalletApiKey: vi.fn() }));
vi.mock('../utils/logger', () => ({ toast: mocks.toast, log: { error: vi.fn() } }));

describe('余额查询请求', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.wallet = createDeepSeekWallet(defaultSettings());
    mocks.key = 'test-calibration-key';
    mocks.setSnapshot.mockReset().mockReturnValue(mocks.wallet);
    mocks.toast.mockReset();
    state.settings = defaultSettings();
    state.wallets = [mocks.wallet];
    state.walletIgnored = [];
  });
  afterEach(() => { stopBalanceTimer(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('只发 GET，不带 cookie，不跟随重定向，0 余额也保存', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ is_available: false, balance_infos: [{ currency: 'CNY', total_balance: '0' }] })));
    vi.stubGlobal('fetch', fetcher);
    expect(await queryWalletBalance(mocks.wallet.id)).toBe(mocks.wallet);
    expect(fetcher).toHaveBeenCalledWith('https://api.deepseek.com/user/balance', expect.objectContaining({ method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store' }));
    expect(mocks.setSnapshot).toHaveBeenCalledWith(mocks.wallet.id, expect.objectContaining({ amount: '0' }));
    expect(vi.getTimerCount()).toBe(0);
  });
  it('OpenRouter 403 提示管理密钥，不修改余额', async () => {
    mocks.wallet.balance.query = normalizeBalanceQuery({ provider: 'openrouter' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
    expect(await queryWalletBalance(mocks.wallet.id)).toBeNull();
    expect(mocks.setSnapshot).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('error', expect.stringContaining('管理密钥'));
  });
  it.each([401, 429, 500])('HTTP %s 不能校准', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    expect(await queryWalletBalance(mocks.wallet.id)).toBeNull();
    expect(mocks.setSnapshot).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('无密钥、未知来源时不发送请求', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    mocks.key = '';
    await queryWalletBalance(mocks.wallet.id);
    mocks.key = 'test-calibration-key';
    mocks.wallet.balance.query = normalizeBalanceQuery({ provider: 'manual' });
    await queryWalletBalance(mocks.wallet.id);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('网络失败、非法 JSON 和非法金额保留旧余额且清理超时器', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('not-json'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ balance_infos: [{ currency: 'CNY', total_balance: null }] })));
    vi.stubGlobal('fetch', fetcher);
    for (let i = 0; i < 3; i++) expect(await queryWalletBalance(mocks.wallet.id, true)).toBeNull();
    expect(mocks.setSnapshot).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('自定义接口发送 x-api-key，字段按配置读取', async () => {
    mocks.wallet.balance.query = normalizeBalanceQuery({ provider: 'custom', url: 'https://relay.example/balance', balancePath: 'data.balance', auth: 'x-api-key' });
    const fetcher = vi.fn().mockResolvedValue(new Response('{"data":{"balance":12}}'));
    vi.stubGlobal('fetch', fetcher);
    await queryWalletBalance(mocks.wallet.id, true);
    expect(fetcher).toHaveBeenCalledWith('https://relay.example/balance', expect.objectContaining({ headers: { 'x-api-key': mocks.key, Accept: 'application/json' } }));
    expect(mocks.setSnapshot).toHaveBeenCalledWith(mocks.wallet.id, expect.objectContaining({ amount: '12' }));
  });
  it('同钱包请求去重，切换配置后不应用旧响应', async () => {
    let resolve!: (response: Response) => void;
    const fetcher = vi.fn().mockReturnValue(new Promise<Response>((r) => { resolve = r; }));
    vi.stubGlobal('fetch', fetcher);
    const first = queryWalletBalance(mocks.wallet.id);
    expect(await queryWalletBalance(mocks.wallet.id)).toBeNull();
    mocks.wallet.balance.query = normalizeBalanceQuery({ provider: 'moonshot' });
    resolve(new Response('{"balance_infos":[{"currency":"CNY","total_balance":"100"}]}'));
    expect(await first).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mocks.setSnapshot).not.toHaveBeenCalled();
  });
  it('15 秒超时覆盖响应体读取并清理超时器', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => ({
      ok: true,
      json: () => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
    })));
    const pending = queryWalletBalance(mocks.wallet.id, true);
    await vi.advanceTimersByTimeAsync(15000);
    expect(await pending).toBeNull();
    expect(mocks.setSnapshot).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('定时查询只处理自动模式且未忽略的钱包', async () => {
    state.settings.autoBalance = true;
    state.settings.balanceInterval = 1;
    mocks.wallet.balance.mode = 'auto';
    const fetcher = vi.fn().mockResolvedValue(new Response('{"balance_infos":[{"currency":"CNY","total_balance":"1"}]}'));
    vi.stubGlobal('fetch', fetcher);
    restartBalanceTimer();
    state.walletIgnored = [mocks.wallet.id];
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetcher).not.toHaveBeenCalled();
    state.walletIgnored = [];
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('概览选择全部钱包时查询所有支持的钱包，跳过不支持和忽略的钱包', async () => {
    state.settings.overviewWalletId = 'all';
    state.wallets.push({ ...mocks.wallet, id: 'manual', balance: { ...mocks.wallet.balance, query: normalizeBalanceQuery({ provider: 'manual' }) } });
    state.wallets.push({ ...mocks.wallet, id: 'ignored' });
    state.walletIgnored = ['ignored'];
    const fetcher = vi.fn().mockResolvedValue(new Response('{"balance_infos":[{"currency":"CNY","total_balance":"1"}]}'));
    vi.stubGlobal('fetch', fetcher);
    expect(await queryBalance(true)).toEqual([mocks.wallet]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
