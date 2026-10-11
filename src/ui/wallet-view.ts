import { repository } from '../data/repository';
import {
  walletBalanceToCny,
  walletPendingModelCount,
} from '../data/wallets';
import { formatMoney, getDisplayCurrency, getWalletExchangeRate } from '../services/currency';
import { queryWalletBalance } from '../services/balance';
import { getWalletApiKey, saveWalletApiKey } from '../services/wallet-secrets';
import { syncPricingFromModelsDev } from '../services/pricing-sync';
import { toast } from '../utils/logger';
import { esc } from '../utils/date';
import { CN_HOLIDAY_COVERAGE_LABEL } from '../constants/holidays';
import {
  DEEPSEEK_WALLET_ID,
  WALLET_CATALOG_PROVIDERS,
  type WalletConfig,
  type WalletCurrency,
  type WalletModel,
  type WalletPriceTier,
} from '../types/wallet';

function getDoc(): Document {
  return (window.parent as any)?.document ?? document;
}

function money(cny: number, digits = 4): string {
  try { return formatMoney(cny, digits); } catch { return `¥${cny.toFixed(digits)} CNY`; }
}

function walletBalanceText(wallet: WalletConfig): string {
  const amount = wallet.balance.amount == null || wallet.balance.amount === ''
    ? NaN
    : parseFloat(String(wallet.balance.amount));
  if (!Number.isFinite(amount)) return '未设置';
  return `${wallet.balance.currency === 'USD' ? '$' : '¥'}${amount.toFixed(4)} ${wallet.balance.currency}`;
}

function displayToCny(value: unknown): number {
  const number = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(number)) return 0;
  const currency = getDisplayCurrency();
  return currency.code === 'USD' ? number * currency.rate : number;
}

function cnyToDisplay(value: unknown): string {
  const number = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(number)) return '0';
  const currency = getDisplayCurrency();
  const result = currency.code === 'USD' ? number / currency.rate : number;
  return String(Math.round(result * 1000000) / 1000000);
}

function closeDropdowns(): void {
  const doc = getDoc();
  doc.querySelectorAll('[data-wallet-dropdown]').forEach((el: any) => {
    el.style.display = 'none';
  });
}

function closeOtherDropdowns(id: string): void {
  const doc = getDoc();
  doc.querySelectorAll('[data-wallet-dropdown]').forEach((el: any) => {
    if (el.id !== id) el.style.display = 'none';
  });
}

function dropdownHtml(
  walletId: string,
  kind: string,
  options: Array<{ id: string; label: string; active?: boolean }>,
): string {
  return options.map((option) => `
    <div data-wallet-select="${esc(kind)}" data-wallet-id="${esc(walletId)}" data-value="${esc(option.id)}"
      style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:11px;${option.active ? 'background:var(--ds-card);font-weight:600;' : ''}">
      ${esc(option.label)}
    </div>
  `).join('');
}

function sourceLabel(model: WalletModel): string {
  if (model.source === 'builtin') return '内置';
  if (model.source === 'sync') return '同步';
  if (model.source === 'manual') return '自定义';
  return '待定价';
}

function priceField(walletId: string, modelId: string, tier: 'offpeak' | 'peak', key: keyof WalletPriceTier, value: number): string {
  return `<input type="number" step="0.000001" min="0" data-wallet-price="1" data-wallet-id="${esc(walletId)}"
    data-model-id="${esc(modelId)}" data-tier="${tier}" data-key="${key}" value="${esc(cnyToDisplay(value))}"
    style="width:100%;min-width:72px;padding:5px 6px;border:1px solid var(--ds-border);border-radius:7px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;" />`;
}

function renderModelRows(wallet: WalletConfig): string {
  const models = [...wallet.models].sort((a, b) => {
    const pending = Number(!a.price.priceConfigured) - Number(!b.price.priceConfigured);
    return pending || a.model.localeCompare(b.model, 'zh-CN');
  });
  if (!models.length) {
    return '<tr><td colspan="7" style="padding:14px;text-align:center;color:var(--ds-text-3);">尚未识别到模型，可手动添加或等待请求接入</td></tr>';
  }
  return models.map((model) => {
    const pending = !model.price.priceConfigured;
    const canDelete = model.source !== 'builtin';
    return `
      <tr data-wallet-model-row="${esc(model.id)}" style="border-top:1px solid var(--ds-border);">
        <td style="padding:8px 6px;min-width:180px;">
          <input data-wallet-model-name="1" data-wallet-id="${esc(wallet.id)}" data-model-id="${esc(model.id)}"
            value="${esc(model.model)}"
            style="width:100%;padding:6px 7px;border:1px solid var(--ds-border);border-radius:7px;background:${model.source === 'builtin' ? 'var(--ds-sidebar-bg)' : 'var(--ds-card-inner)'};color:var(--ds-text);font-size:11px;" />
          <div style="font-size:10px;color:var(--ds-text-3);margin-top:3px;">${esc(model.sourceModel)}${model.aliases.length ? ` · 别名 ${esc(model.aliases.join('、'))}` : ''}</div>
          <label style="display:flex;align-items:center;gap:5px;margin-top:5px;font-size:10px;color:var(--ds-text-3);">
            上下文上限
            <input type="number" min="1" step="1000" data-wallet-context-limit="1" data-wallet-id="${esc(wallet.id)}" data-model-id="${esc(model.id)}"
              value="${model.contextLimit ?? ''}" placeholder="未知"
              style="width:80px;padding:3px 5px;border:1px solid var(--ds-border);border-radius:6px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;" />
          </label>
        </td>
        <td style="padding:8px 6px;white-space:nowrap;">
          <span style="padding:2px 7px;border-radius:999px;background:${pending ? 'var(--ds-red-bg)' : model.source === 'sync' ? 'var(--ds-green-bg)' : 'var(--ds-card)'};color:${pending ? 'var(--ds-red)' : model.source === 'sync' ? 'var(--ds-green)' : 'var(--ds-text-2)'};font-size:10px;">${sourceLabel(model)}</span>
        </td>
        <td style="padding:8px 6px;min-width:224px;">
          <div style="display:grid;grid-template-columns:repeat(3,minmax(68px,1fr));gap:4px;">${priceField(wallet.id, model.id, 'offpeak', 'hit', model.price.offpeak.hit)}${priceField(wallet.id, model.id, 'offpeak', 'miss', model.price.offpeak.miss)}${priceField(wallet.id, model.id, 'offpeak', 'output', model.price.offpeak.output)}</div>
        </td>
        <td style="padding:8px 6px;min-width:224px;opacity:${model.price.usePeakPricing ? '1' : '0.45'};">
          <div style="display:grid;grid-template-columns:repeat(3,minmax(68px,1fr));gap:4px;">${priceField(wallet.id, model.id, 'peak', 'hit', model.price.peak.hit)}${priceField(wallet.id, model.id, 'peak', 'miss', model.price.peak.miss)}${priceField(wallet.id, model.id, 'peak', 'output', model.price.peak.output)}</div>
        </td>
        <td style="padding:8px 6px;text-align:center;"><input type="checkbox" data-wallet-model-peak="1" data-wallet-id="${esc(wallet.id)}" data-model-id="${esc(model.id)}" ${model.price.usePeakPricing ? 'checked' : ''} /></td>
        <td style="padding:8px 6px;text-align:center;"><input type="checkbox" data-wallet-model-lock="1" data-wallet-id="${esc(wallet.id)}" data-model-id="${esc(model.id)}" ${model.locked ? 'checked' : ''} /></td>
        <td style="padding:8px 6px;text-align:center;">${canDelete ? `<button data-wallet-model-delete="1" data-wallet-id="${esc(wallet.id)}" data-model-id="${esc(model.id)}" style="padding:4px 8px;border:1px solid var(--ds-red-border);border-radius:7px;background:var(--ds-red-bg);color:var(--ds-red);font-size:10px;cursor:pointer;">删除</button>` : '—'}</td>
      </tr>`;
  }).join('');
}

function renderPeakRows(wallet: WalletConfig): string {
  if (!wallet.peakHours.length) return '<div style="font-size:11px;color:var(--ds-text-3);">暂无高峰时段</div>';
  return wallet.peakHours.map((item, index) => `
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="time" data-wallet-peak="1" data-wallet-id="${esc(wallet.id)}" data-peak-index="${index}" data-peak-field="start" value="${esc(item.start)}" style="flex:1;padding:6px 8px;border:1px solid var(--ds-border);border-radius:7px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;" />
      <span style="font-size:10px;color:var(--ds-text-3);">至</span>
      <input type="time" data-wallet-peak="1" data-wallet-id="${esc(wallet.id)}" data-peak-index="${index}" data-peak-field="end" value="${esc(item.end)}" style="flex:1;padding:6px 8px;border:1px solid var(--ds-border);border-radius:7px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;" />
      <button data-wallet-peak-delete="1" data-wallet-id="${esc(wallet.id)}" data-peak-index="${index}" style="padding:5px 8px;border:1px solid var(--ds-red-border);border-radius:7px;background:var(--ds-red-bg);color:var(--ds-red);font-size:10px;cursor:pointer;">删除</button>
    </div>
  `).join('');
}

function renderCredentialPicker(wallet: WalletConfig): string {
  const current = wallet.credentials.find((item) => item.id === wallet.balance.primaryCredentialId);
  return `
    <button data-wallet-credential-btn="1" data-wallet-id="${esc(wallet.id)}" style="display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;max-width:100%;">
      <span style="color:var(--ds-text-2);">主密钥</span>
      <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px;">${esc(current?.label || '未指定')}</span>
      <span>▼</span>
    </button>
    <div id="aus-wallet-credential-drop-${esc(wallet.id)}" data-wallet-dropdown="1" style="display:none;position:absolute;top:38px;left:0;z-index:30;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:220px;max-width:320px;">
      ${dropdownHtml(wallet.id, 'credential', [
        { id: '', label: '无（使用钱包内校准密钥）', active: !wallet.balance.primaryCredentialId },
        ...wallet.credentials.map((item) => ({ id: item.id, label: item.label, active: item.id === wallet.balance.primaryCredentialId })),
      ])}
    </div>`;
}

function renderCatalogPicker(wallet: WalletConfig): string {
  const current = WALLET_CATALOG_PROVIDERS.find((item) => item.id === wallet.catalogProvider);
  return `
    <button data-wallet-catalog-btn="1" data-wallet-id="${esc(wallet.id)}" style="display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">
      <span style="color:var(--ds-text-2);">价格来源</span>
      <span style="font-weight:600;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(current?.label || '不自动同步')}</span>
      <span>▼</span>
    </button>
    <div id="aus-wallet-catalog-drop-${esc(wallet.id)}" data-wallet-dropdown="1" style="display:none;position:absolute;top:38px;right:0;z-index:30;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:6px;min-width:180px;max-height:260px;overflow:auto;">
      ${dropdownHtml(wallet.id, 'catalog', [
        { id: '', label: '不自动同步', active: !wallet.catalogProvider },
        ...WALLET_CATALOG_PROVIDERS.map((item) => ({ id: item.id, label: item.label, active: item.id === wallet.catalogProvider })),
      ])}
    </div>`;
}

function renderWalletCard(wallet: WalletConfig, history: any[]): string {
  // 收起态左侧方块标识：取钱包名称中第一个有意义的字符（剥离协议与 api./www. 前缀）
  const avatarLetter = (() => {
    const raw = String(wallet.name || wallet.endpointDisplay || wallet.endpointLabel || '').trim();
    const cleaned = raw
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/^api\./i, '')
      .replace(/^[^0-9a-zA-Z\u4e00-\u9fa5]+/, '');
    const first = cleaned.charAt(0);
    return first ? first.toUpperCase() : '?';
  })();
  const pending = walletPendingModelCount(wallet);
  const isOfficial = wallet.id === DEEPSEEK_WALLET_ID;
  const selectedCredential = wallet.credentials.find((item) => item.id === wallet.balance.primaryCredentialId);
  const collapsed = wallet.collapsed !== false;
  // 收起态只外显余额与模型数，密钥数/请求数/费用不外显（展开后按需查看）
  const metrics = [
    { label: '余额', value: walletBalanceText(wallet), title: walletBalanceText(wallet) },
    { label: '模型', value: `${wallet.models.length} 个`, title: '已识别模型数量' },
  ];
  return `
    <section class="ds-card" data-wallet-card="${esc(wallet.id)}" style="display:grid;gap:12px;">
      <div class="aus-wallet-header">
        <div class="aus-wallet-avatar" title="${esc(wallet.name)}">${esc(avatarLetter)}</div>
        <div class="aus-wallet-identity">
          <div class="aus-wallet-name-row">
            <input data-wallet-name="1" data-wallet-id="${esc(wallet.id)}" value="${esc(wallet.name)}" />
            <span style="padding:3px 8px;border-radius:999px;background:${isOfficial ? 'var(--ds-green-bg)' : 'var(--ds-card-inner)'};color:${isOfficial ? 'var(--ds-green)' : 'var(--ds-text-2)'};font-size:10px;white-space:nowrap;">${isOfficial ? 'DeepSeek 官方' : '中转/自定义'}</span>
            ${pending ? `<span style="padding:3px 8px;border-radius:999px;background:var(--ds-red-bg);color:var(--ds-red);font-size:10px;white-space:nowrap;">${pending} 个待定价</span>` : ''}
          </div>
          <div class="aus-wallet-sub">${esc(wallet.endpointDisplay || wallet.endpointLabel || '本机官方接口')} · ${esc(wallet.sourceType || '未识别')}</div>
        </div>
        <div class="aus-wallet-metrics">
          ${metrics.map((item) => `<div class="aus-wallet-metric" title="${esc(item.title)}"><div class="aus-wallet-metric-label">${esc(item.label)}</div><div class="aus-wallet-metric-value">${esc(item.value)}</div></div>`).join('')}
        </div>
        <div class="aus-wallet-actions">
          <button class="aus-wallet-icon-btn" data-wallet-toggle="1" data-wallet-id="${esc(wallet.id)}" title="${collapsed ? '展开钱包详情' : '收起钱包详情'}" aria-label="${collapsed ? '展开钱包详情' : '收起钱包详情'}">${collapsed ? '▼' : '▲'}</button>
          ${wallet.catalogProvider ? `<button class="aus-wallet-icon-btn" data-wallet-sync="1" data-wallet-id="${esc(wallet.id)}" title="按价格来源同步模型价格" aria-label="同步价格">↻</button>` : ''}
          ${isOfficial ? '' : `<button class="aus-wallet-icon-btn is-danger" data-wallet-ignore="1" data-wallet-id="${esc(wallet.id)}" title="忽略该钱包（历史与统计保留）" aria-label="忽略钱包">✕</button>`}
        </div>
      </div>

      <div data-wallet-body="1" style="display:${collapsed ? 'none' : 'grid'};gap:12px;">
      <div class="aus-wallet-two-col" style="display:grid;grid-template-columns:minmax(250px,1fr) minmax(260px,1fr);gap:10px;">
        <div style="border:1px solid var(--ds-border);border-radius:10px;padding:10px;display:grid;gap:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <div><div style="font-size:11px;color:var(--ds-text-2);">钱包余额</div><div style="font-size:17px;font-weight:700;color:var(--ds-text);">${esc(walletBalanceText(wallet))}</div></div>
            <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ds-text-2);cursor:${isOfficial ? 'pointer' : 'not-allowed'};">
              <input type="checkbox" data-wallet-auto-balance="1" data-wallet-id="${esc(wallet.id)}" ${wallet.balance.mode === 'auto' ? 'checked' : ''} ${isOfficial ? '' : 'disabled'} /> 自动校准
            </label>
          </div>
          <div style="display:flex;gap:6px;align-items:center;position:relative;">
            <input data-wallet-balance-amount="1" data-wallet-id="${esc(wallet.id)}" value="${esc(wallet.balance.amount ?? '')}" placeholder="手工余额" style="flex:1;min-width:0;padding:7px 9px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;" />
            <button data-wallet-currency-btn="1" data-wallet-id="${esc(wallet.id)}" style="padding:7px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">${wallet.balance.currency} ▼</button>
            <div id="aus-wallet-currency-drop-${esc(wallet.id)}" data-wallet-dropdown="1" style="display:none;position:absolute;top:38px;right:0;z-index:30;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:10px;padding:6px;min-width:110px;">
              ${dropdownHtml(wallet.id, 'currency', [{ id: 'CNY', label: 'CNY', active: wallet.balance.currency === 'CNY' }, { id: 'USD', label: 'USD', active: wallet.balance.currency === 'USD' }])}
            </div>
          </div>
          ${isOfficial ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;position:relative;">
              ${renderCredentialPicker(wallet)}
              <button data-wallet-calibrate="1" data-wallet-id="${esc(wallet.id)}" style="padding:7px 11px;border:1px solid var(--ds-black);border-radius:999px;background:var(--ds-black);color:var(--ds-black-text);font-size:11px;cursor:pointer;">立即校准</button>
            </div>
            <div style="display:flex;gap:6px;">
              <input type="password" data-wallet-api-key="1" data-wallet-id="${esc(wallet.id)}" value="" placeholder="${getWalletApiKey(wallet.id) ? '已保存钱包校准密钥（留空不修改）' : '填写钱包校准密钥'}" style="flex:1;min-width:0;padding:7px 9px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;" />
              <button data-wallet-save-key="1" data-wallet-id="${esc(wallet.id)}" style="padding:7px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:11px;cursor:pointer;">保存密钥</button>
            </div>
            <div style="font-size:10px;color:var(--ds-text-3);">自动校准仅支持 DeepSeek 官方直连，并需在设置开启自动校准总开关；主密钥：${esc(selectedCredential?.label || '未指定')}</div>
            <div style="font-size:10px;color:var(--ds-text-3);word-break:break-all;">已识别密钥：${wallet.credentials.length ? wallet.credentials.map((item) => esc(item.label)).join('、') : '未识别'}</div>
          ` : `<div style="font-size:10px;color:var(--ds-text-3);">该接入暂不支持自动余额校准，请手工维护余额。</div><div style="font-size:10px;color:var(--ds-text-3);word-break:break-all;">已识别密钥：${wallet.credentials.length ? wallet.credentials.map((item) => esc(item.label)).join('、') : '未识别'}</div>`}
        </div>

        <div style="border:1px solid var(--ds-border);border-radius:10px;padding:10px;display:grid;gap:8px;position:relative;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <div style="font-size:11px;font-weight:600;color:var(--ds-text);">峰谷规则</div>
            ${renderCatalogPicker(wallet)}
          </div>
          <div style="display:grid;gap:6px;">${renderPeakRows(wallet)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ds-text-2);cursor:pointer;"><input type="checkbox" data-wallet-weekend="1" data-wallet-id="${esc(wallet.id)}" ${wallet.weekendOffpeak ? 'checked' : ''} /> 周末全天按低谷</label>
            <button data-wallet-add-peak="1" data-wallet-id="${esc(wallet.id)}" style="padding:6px 9px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;">+ 添加时段</button>
          </div>
          ${isOfficial ? `<div style="font-size:10px;color:var(--ds-text-3);line-height:1.6;">官方接口按 DeepSeek 规则计费：中国法定节假日全天空闲（内置数据覆盖 ${CN_HOLIDAY_COVERAGE_LABEL}），调休上班的周末同样按空闲计价，可在设置中补充额外空闲日期。</div>` : ''}
        </div>
      </div>

      <div style="border:1px solid var(--ds-border);border-radius:10px;padding:10px;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <div><div style="font-size:11px;font-weight:600;color:var(--ds-text);">模型与价格</div><div style="font-size:10px;color:var(--ds-text-3);">单位 ${getDisplayCurrency().code}/百万 tokens；模型改名会保留旧名别名</div></div>
          <button data-wallet-add-model="1" data-wallet-id="${esc(wallet.id)}" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;">+ 添加模型</button>
        </div>
        <div style="width:100%;overflow-x:auto;">
          <table style="width:100%;min-width:900px;border-collapse:collapse;font-size:10px;">
            <thead><tr style="text-align:center;color:var(--ds-text-2);"><th style="text-align:left;padding:5px 6px;">模型</th><th style="padding:5px 6px;">来源</th><th style="padding:5px 6px;">非峰（命中/未命中/输出）</th><th style="padding:5px 6px;">高峰（命中/未命中/输出）</th><th style="padding:5px 6px;">峰谷</th><th style="padding:5px 6px;">锁定</th><th style="padding:5px 6px;">操作</th></tr></thead>
            <tbody>${renderModelRows(wallet)}</tbody>
          </table>
        </div>
      </div>
      </div>
    </section>`;
}

function renderIgnoredWallets(ignored: string[], wallets: WalletConfig[]): string {
  const rows = ignored.map((id) => {
    const wallet = wallets.find((item) => item.id === id);
    if (!wallet) return '';
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid var(--ds-border);">
      <div><div style="font-size:11px;font-weight:600;color:var(--ds-text);">${esc(wallet.name)}</div><div style="font-size:10px;color:var(--ds-text-3);">${esc(wallet.endpointDisplay || wallet.endpointLabel || '')}</div></div>
      <button data-wallet-restore="1" data-wallet-id="${esc(wallet.id)}" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:10px;cursor:pointer;">恢复显示</button>
    </div>`;
  }).filter(Boolean).join('');
  return rows || '<div style="font-size:10px;color:var(--ds-text-3);">暂无已忽略接入</div>';
}

let walletRenderToken = 0;

export async function renderWalletView(): Promise<void> {
  const doc = getDoc();
  const host = doc.getElementById('aus-wallet');
  if (!host) return;
  const token = ++walletRenderToken;
  const history = await repository.getAllHistory();
  if (token !== walletRenderToken || !host.isConnected) return;
  const wallets = repository.getWallets();
  const ignored = repository.getIgnoredWalletIds();
  const ignoredSet = new Set(ignored);
  const active = wallets.filter((wallet) => !ignoredSet.has(wallet.id));
  let balanceCny = 0;
  let balanceCount = 0;
  let pending = 0;
  for (const wallet of active) {
    const value = walletBalanceToCny(wallet, getWalletExchangeRate());
    if (value != null) {
      balanceCny += value;
      balanceCount++;
    }
    pending += walletPendingModelCount(wallet);
  }
  host.innerHTML = `
    <div style="display:grid;gap:12px;">
      <div class="ds-card aus-wallet-summary" id="aus-wallet-summary" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
        <div><div style="font-size:11px;color:var(--ds-text-2);">钱包余额合计</div><div style="font-size:20px;font-weight:700;color:var(--ds-text);margin-top:4px;">${money(balanceCny, 2)}</div><div style="font-size:10px;color:var(--ds-text-3);margin-top:2px;">${balanceCount} 个钱包已设置余额</div></div>
        <div><div style="font-size:11px;color:var(--ds-text-2);">钱包数量</div><div style="font-size:20px;font-weight:700;color:var(--ds-text);margin-top:4px;">${active.length}</div><div style="font-size:10px;color:var(--ds-text-3);margin-top:2px;">已忽略 ${ignored.length} 个</div></div>
        <div><div style="font-size:11px;color:var(--ds-text-2);">待定价模型</div><div style="font-size:20px;font-weight:700;color:${pending ? 'var(--ds-red)' : 'var(--ds-green)'};margin-top:4px;">${pending}</div><div style="font-size:10px;color:var(--ds-text-3);margin-top:2px;">保存价格后自动重算</div></div>
      </div>
      ${active.map((wallet) => renderWalletCard(wallet, history)).join('')}
      <div class="ds-card">
        <div style="font-size:11px;font-weight:600;color:var(--ds-text);margin-bottom:2px;">已忽略接入</div>
        ${renderIgnoredWallets(ignored, wallets)}
      </div>
    </div>`;
  bindWalletView(doc);
}

function readModelPrices(row: HTMLElement): Record<'offpeak' | 'peak', WalletPriceTier> {
  const result: any = {
    offpeak: { hit: 0, miss: 0, output: 0 },
    peak: { hit: 0, miss: 0, output: 0 },
  };
  row.querySelectorAll('input[data-wallet-price]').forEach((input: any) => {
    const tier = input.getAttribute('data-tier');
    const key = input.getAttribute('data-key');
    if ((tier === 'offpeak' || tier === 'peak') && (key === 'hit' || key === 'miss' || key === 'output')) {
      result[tier][key] = displayToCny(input.value);
    }
  });
  return result;
}

function bindWalletView(doc: Document): void {
  doc.querySelectorAll('[data-wallet-toggle]').forEach((button: any) => {
    button.onclick = () => {
      const walletId = button.getAttribute('data-wallet-id');
      if (!walletId) return;
      repository.updateWallet(walletId, (wallet) => {
        wallet.collapsed = wallet.collapsed === false;
      });
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-name]').forEach((input: any) => {
    input.onchange = () => {
      const walletId = input.getAttribute('data-wallet-id');
      const name = String(input.value || '').trim();
      if (!walletId || !name) return renderWalletView();
      repository.updateWallet(walletId, (wallet) => { wallet.name = name; });
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-balance-amount]').forEach((input: any) => {
    input.onchange = () => {
      const walletId = input.getAttribute('data-wallet-id');
      if (!walletId) return;
      repository.updateWallet(walletId, (wallet) => {
        wallet.balance.amount = String(input.value || '').trim() || null;
        wallet.balance.mode = wallet.balance.mode === 'auto' ? 'auto' : 'manual';
      });
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-auto-balance]').forEach((input: any) => {
    input.onchange = () => {
      const walletId = input.getAttribute('data-wallet-id');
      if (!walletId) return;
      repository.updateWallet(walletId, (wallet) => {
        wallet.balance.mode = input.checked ? 'auto' : 'manual';
      });
      try { import('../services/balance').then((mod: any) => mod.restartBalanceTimer?.()); } catch {}
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-weekend]').forEach((input: any) => {
    input.onchange = () => {
      const walletId = input.getAttribute('data-wallet-id');
      if (!walletId) return;
      repository.updateWallet(walletId, (wallet) => { wallet.weekendOffpeak = !!input.checked; });
      repository.recalcWallet(walletId).catch(() => {});
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-save-key]').forEach((button: any) => {
    button.onclick = () => {
      const walletId = button.getAttribute('data-wallet-id');
      const input = doc.querySelector(`[data-wallet-api-key][data-wallet-id="${walletId}"]`) as HTMLInputElement | null;
      if (!walletId || !input) return;
      saveWalletApiKey(walletId, input.value.trim());
      toast('success', input.value.trim() ? '钱包校准密钥已保存' : '钱包校准密钥已清除');
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-calibrate]').forEach((button: any) => {
    button.onclick = async () => {
      const walletId = button.getAttribute('data-wallet-id');
      if (!walletId) return;
      button.textContent = '校准中…';
      await queryWalletBalance(walletId, false);
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-sync]').forEach((button: any) => {
    button.onclick = async () => {
      button.textContent = '同步中…';
      await syncPricingFromModelsDev({ silent: false });
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-ignore]').forEach((button: any) => {
    button.onclick = () => {
      const walletId = button.getAttribute('data-wallet-id');
      if (!walletId) return;
      repository.setWalletIgnored(walletId, true);
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-restore]').forEach((button: any) => {
    button.onclick = () => {
      const walletId = button.getAttribute('data-wallet-id');
      if (!walletId) return;
      repository.setWalletIgnored(walletId, false);
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-add-peak]').forEach((button: any) => {
    button.onclick = () => {
      const walletId = button.getAttribute('data-wallet-id');
      if (!walletId) return;
      repository.updateWallet(walletId, (wallet) => {
        wallet.peakHours.push({ start: '09:00', end: '12:00' });
      });
      repository.recalcWallet(walletId).catch(() => {});
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-peak]').forEach((input: any) => {
    input.onchange = () => {
      const walletId = input.getAttribute('data-wallet-id');
      const index = parseInt(input.getAttribute('data-peak-index') || '-1', 10);
      const field = input.getAttribute('data-peak-field');
      if (!walletId || index < 0 || (field !== 'start' && field !== 'end')) return;
      repository.updateWallet(walletId, (wallet) => {
        const item = wallet.peakHours[index];
        if (!item) return;
        if (field === 'start') item.start = input.value;
        else item.end = input.value;
      });
      repository.recalcWallet(walletId).catch(() => {});
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-peak-delete]').forEach((button: any) => {
    button.onclick = () => {
      const walletId = button.getAttribute('data-wallet-id');
      const index = parseInt(button.getAttribute('data-peak-index') || '-1', 10);
      if (!walletId || index < 0) return;
      repository.updateWallet(walletId, (wallet) => {
        if (wallet.peakHours.length <= 1) return;
        wallet.peakHours.splice(index, 1);
      });
      repository.recalcWallet(walletId).catch(() => {});
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-add-model]').forEach((button: any) => {
    button.onclick = () => {
      const walletId = button.getAttribute('data-wallet-id');
      if (!walletId) return;
      const modelName = window.prompt('输入模型名');
      if (!modelName || !modelName.trim()) return;
      const name = modelName.trim();
      repository.updateWallet(walletId, (wallet) => {
        if (wallet.models.some((item) => item.model === name)) return;
        const now = Date.now();
        wallet.models.push({
          id: `manual:${now}:${Math.random().toString(36).slice(2, 8)}`,
          sourceModel: name,
          model: name,
          aliases: [],
          price: {
            usePeakPricing: true,
            offpeak: { hit: 0, miss: 0, output: 0 },
            peak: { hit: 0, miss: 0, output: 0 },
            priceConfigured: false,
          },
          source: 'discovered',
          locked: false,
          discoveredAt: now,
          lastSeen: now,
          updatedAt: now,
        });
      });
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-model-name]').forEach((input: any) => {
    input.onchange = () => {
      const walletId = input.getAttribute('data-wallet-id');
      const modelId = input.getAttribute('data-model-id');
      const nextName = String(input.value || '').trim();
      if (!walletId || !modelId || !nextName) return renderWalletView();
      repository.updateWallet(walletId, (wallet) => {
        const model = wallet.models.find((item) => item.id === modelId);
        if (!model || model.model === nextName) return;
        if (model.model && !model.aliases.includes(model.model)) model.aliases.push(model.model);
        model.model = nextName;
        model.source = model.source === 'builtin' ? 'manual' : model.source;
        model.updatedAt = Date.now();
      });
      repository.recalcWallet(walletId).catch(() => {});
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-context-limit]').forEach((input: any) => {
    input.onchange = () => {
      const walletId = input.getAttribute('data-wallet-id');
      const modelId = input.getAttribute('data-model-id');
      if (!walletId || !modelId) return;
      const value = parseFloat(String(input.value || ''));
      const contextLimit = Number.isFinite(value) && value > 0 ? Math.round(value) : null;
      repository.updateWallet(walletId, (wallet) => {
        const model = wallet.models.find((item) => item.id === modelId);
        if (model) model.contextLimit = contextLimit;
      });
      renderWalletView();
    };
  });

  doc.querySelectorAll('input[data-wallet-price]').forEach((input: any) => {
    input.onchange = () => {
      const row = input.closest('[data-wallet-model-row]') as HTMLElement | null;
      const walletId = input.getAttribute('data-wallet-id');
      const modelId = input.getAttribute('data-model-id');
      if (!row || !walletId || !modelId) return;
      const prices = readModelPrices(row);
      repository.updateWallet(walletId, (wallet) => {
        const model = wallet.models.find((item) => item.id === modelId);
        if (!model) return;
        model.price.offpeak = prices.offpeak;
        model.price.peak = prices.peak;
        model.price.priceConfigured = true;
        model.source = 'manual';
        model.updatedAt = Date.now();
      });
      repository.recalcWallet(walletId).catch(() => {});
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-model-peak]').forEach((input: any) => {
    input.onchange = () => {
      const walletId = input.getAttribute('data-wallet-id');
      const modelId = input.getAttribute('data-model-id');
      if (!walletId || !modelId) return;
      repository.updateWallet(walletId, (wallet) => {
        const model = wallet.models.find((item) => item.id === modelId);
        if (!model) return;
        model.price.usePeakPricing = !!input.checked;
        model.updatedAt = Date.now();
      });
      repository.recalcWallet(walletId).catch(() => {});
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-model-lock]').forEach((input: any) => {
    input.onchange = () => {
      const walletId = input.getAttribute('data-wallet-id');
      const modelId = input.getAttribute('data-model-id');
      if (!walletId || !modelId) return;
      repository.updateWallet(walletId, (wallet) => {
        const model = wallet.models.find((item) => item.id === modelId);
        if (model) model.locked = !!input.checked;
      });
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-model-delete]').forEach((button: any) => {
    button.onclick = () => {
      const walletId = button.getAttribute('data-wallet-id');
      const modelId = button.getAttribute('data-model-id');
      if (!walletId || !modelId) return;
      repository.updateWallet(walletId, (wallet) => {
        wallet.models = wallet.models.filter((item) => item.id !== modelId || item.source === 'builtin');
      });
      repository.recalcWallet(walletId).catch(() => {});
      renderWalletView();
    };
  });

  doc.querySelectorAll('[data-wallet-currency-btn]').forEach((button: any) => {
    button.onclick = (event: Event) => {
      event.stopPropagation();
      const walletId = button.getAttribute('data-wallet-id');
      const dropdown = doc.getElementById(`aus-wallet-currency-drop-${walletId}`) as HTMLElement | null;
      if (!dropdown) return;
      closeOtherDropdowns(dropdown.id);
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    };
  });

  doc.querySelectorAll('[data-wallet-catalog-btn]').forEach((button: any) => {
    button.onclick = (event: Event) => {
      event.stopPropagation();
      const walletId = button.getAttribute('data-wallet-id');
      const dropdown = doc.getElementById(`aus-wallet-catalog-drop-${walletId}`) as HTMLElement | null;
      if (!dropdown) return;
      closeOtherDropdowns(dropdown.id);
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    };
  });

  doc.querySelectorAll('[data-wallet-credential-btn]').forEach((button: any) => {
    button.onclick = (event: Event) => {
      event.stopPropagation();
      const walletId = button.getAttribute('data-wallet-id');
      const dropdown = doc.getElementById(`aus-wallet-credential-drop-${walletId}`) as HTMLElement | null;
      if (!dropdown) return;
      closeOtherDropdowns(dropdown.id);
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    };
  });

  doc.querySelectorAll('[data-wallet-select]').forEach((item: any) => {
    item.onclick = (event: Event) => {
      event.stopPropagation();
      const walletId = item.getAttribute('data-wallet-id');
      const kind = item.getAttribute('data-wallet-select');
      const value = item.getAttribute('data-value') || '';
      if (!walletId) return;
      if (kind === 'currency') {
        repository.updateWallet(walletId, (wallet) => { wallet.balance.currency = value as WalletCurrency; });
      } else if (kind === 'catalog') {
        repository.updateWallet(walletId, (wallet) => { wallet.catalogProvider = value || null; });
      } else if (kind === 'credential') {
        repository.updateWallet(walletId, (wallet) => { wallet.balance.primaryCredentialId = value || null; });
      }
      closeDropdowns();
      renderWalletView();
    };
  });

  if (!(bindWalletView as any)._outsideBound) {
    (bindWalletView as any)._outsideBound = true;
    doc.addEventListener('click', (event: any) => {
      const target = event.target as HTMLElement;
      if (!target?.closest?.('[data-wallet-dropdown]') && !target?.closest?.('[data-wallet-currency-btn]') && !target?.closest?.('[data-wallet-catalog-btn]') && !target?.closest?.('[data-wallet-credential-btn]')) {
        closeDropdowns();
      }
    });
  }
}
