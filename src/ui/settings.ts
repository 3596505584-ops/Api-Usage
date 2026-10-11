import { icon } from './icons';
import { state } from '../store/index';
import { saveHot } from '../store/persistence';
import { saveApiKey } from '../services/balance';
import { doSyncNow, saveWebdavPass } from '../services/sync';
import { decryptKey } from '../utils/crypto';
import { applyTheme } from '../services/theme';
import { PRICING, DEFAULT_PEAK_HOURS, HIDDEN_PRICING_MODELS } from '../constants/pricing';
import { CN_HOLIDAY_COVERAGE_LABEL } from '../constants/holidays';
import { isValidDayKey } from '../utils/date';
import { recalcAllCosts } from '../services/interception';
import { generateDebugBatch } from '../services/debug';
import { getDisplayCurrency } from '../services/currency';
import { getPricing as resolvePricing } from '../services/pricing';
import { syncPricingFromModelsDev, previewSync, fetchModelsDevCatalog, removeSyncedModels, isSyncedCustomModel } from '../services/pricing-sync';
import { fetchLiveRate } from '../services/currency';
import { toast } from '../utils/logger';
import { repository } from '../data/repository';
import { telemetryStatus, resetIdentity } from '../services/telemetry';

function esc(s: string) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

/** 刷新「匿名使用统计」卡片上的标识与状态文案 */
function renderTelemetryStatus(doc: Document) {
  const idEl = doc.getElementById('aus-telemetry-id');
  const statusEl = doc.getElementById('aus-telemetry-status');
  let status: any = null;
  try { status = telemetryStatus(); } catch {}
  if (idEl) idEl.textContent = status?.id ? `匿名标识：${String(status.id).slice(0, 8)}…` : '匿名标识：待生成';
  if (!statusEl) return;
  // 正常开启且端点已配置时不显示状态行；只在需要提示用户的情况下显示
  let hint = '';
  if (!status?.configured) hint = '未配置上报端点：仅本地累计，不会发送任何数据';
  else if (!status.enabled) hint = '已关闭：不再采集，也不再发送';
  statusEl.textContent = hint;
  statusEl.style.display = hint ? 'block' : 'none';
}

let docClickBound = false;
function bindSettingsOutsideClick(doc: Document) {
  if (docClickBound) return;
  docClickBound = true;
  doc.addEventListener('click', (e: any) => {
    const t = e.target as HTMLElement;
    const td = doc.getElementById('aus-theme-dropdown');
    if (td && td.style.display === 'block' && !t.closest('#aus-theme-dropdown') && !t.closest('#aus-theme-btn')) td.style.display = 'none';
    const sd = doc.getElementById('aus-history-scope-dropdown');
    if (sd && sd.style.display === 'block' && !t.closest('#aus-history-scope-dropdown') && !t.closest('#aus-history-scope-btn')) sd.style.display = 'none';
    const md = doc.getElementById('aus-pricing-sync-mode-dropdown');
    if (md && md.style.display === 'block' && !t.closest('#aus-pricing-sync-mode-dropdown') && !t.closest('#aus-pricing-sync-mode-btn')) md.style.display = 'none';
    const idd = doc.getElementById('aus-pricing-sync-interval-dropdown');
    if (idd && idd.style.display === 'block' && !t.closest('#aus-pricing-sync-interval-dropdown') && !t.closest('#aus-pricing-sync-interval-btn')) idd.style.display = 'none';
  });
}

function localDay(ts: number) { const d = new Date(ts); const pad=(n:number)=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

async function recalcCostsAndRefresh(): Promise<void> {
  try {
    await recalcAllCosts();
    await repository.rebuildAggregates();
    (globalThis as any).ApiUsageStat?.refreshUI?.();
  } catch (error: any) {
    toast('error', '历史费用重算失败：' + (error?.message || error));
  }
}

function readHistoryDeleteFilter(doc: Document) {
  const startEl = doc.getElementById('aus-delete-start') as HTMLInputElement | null;
  const endEl = doc.getElementById('aus-delete-end') as HTMLInputElement | null;
  const modelEl = doc.getElementById('aus-delete-model') as HTMLInputElement | null;
  const chatEl = doc.getElementById('aus-delete-chat') as HTMLInputElement | null;
  const start = String(startEl?.value || '').trim();
  const end = String(endEl?.value || '').trim();
  return {
    start: start && isValidDayKey(start) ? start : '',
    end: end && isValidDayKey(end) ? end : '',
    model: String(modelEl?.value || '').trim(),
    chat: String(chatEl?.value || '').trim(),
  };
}

async function countHistoryDeleteMatches(filter: ReturnType<typeof readHistoryDeleteFilter>): Promise<number> {
  const all = await repository.getAllHistory();
  return (all || []).filter((entry: any) => {
    if (filter.start || filter.end) {
      const day = localDay(entry.timestamp);
      if (filter.start && day < filter.start) return false;
      if (filter.end && day > filter.end) return false;
    }
    if (filter.model && String(entry.model || '') !== filter.model) return false;
    if (filter.chat) {
      const chatId = String(entry.chatId || '');
      const chatName = String(entry.chatName || '');
      if (chatId !== filter.chat && chatName !== filter.chat) return false;
    }
    return true;
  }).length;
}

function bindHistoryDelete(doc: Document) {
  const previewBtn = doc.getElementById('aus-delete-preview') as HTMLButtonElement | null;
  const deleteBtn = doc.getElementById('aus-delete-run') as HTMLButtonElement | null;
  const status = doc.getElementById('aus-delete-status') as HTMLElement | null;
  if (!previewBtn || !deleteBtn) return;
  let armed = false;
  let armTimer: any = null;
  let armedFilter: ReturnType<typeof readHistoryDeleteFilter> | null = null;
  const resetArmed = () => {
    armed = false;
    armedFilter = null;
    try { deleteBtn.textContent = '删除匹配记录'; } catch {}
  };
  previewBtn.onclick = async () => {
    previewBtn.disabled = true;
    const old = previewBtn.textContent;
    previewBtn.textContent = '统计中…';
    try {
      const filter = readHistoryDeleteFilter(doc);
      const count = await countHistoryDeleteMatches(filter);
      if (status) status.textContent = `匹配 ${count} 条记录${count ? '，点击“删除匹配记录”后会二次确认' : ''}`;
    } catch (error: any) {
      if (status) status.textContent = '统计失败：' + (error?.message || error);
    } finally {
      previewBtn.disabled = false;
      previewBtn.textContent = old || '统计匹配记录';
    }
  };
  deleteBtn.onclick = async () => {
    const filter = readHistoryDeleteFilter(doc);
    if (!armed) {
      const count = await countHistoryDeleteMatches(filter).catch(() => -1);
      if (count <= 0) {
        if (status) status.textContent = count === 0 ? '当前范围没有可删除记录' : '匹配数量检查失败，请重试';
        return;
      }
      armed = true;
      armedFilter = filter;
      deleteBtn.textContent = `确认删除 ${count} 条？再点一次`;
      if (status) status.textContent = `本次将删除 ${count} 条记录，再次点击执行`;
      if (armTimer) clearTimeout(armTimer);
      armTimer = setTimeout(() => { armTimer = null; resetArmed(); }, 5000);
      return;
    }
    if (armTimer) { clearTimeout(armTimer); armTimer = null; }
    const targetFilter = armedFilter || filter;
    resetArmed();
    deleteBtn.disabled = true;
    if (status) status.textContent = '正在删除并重算…';
    try {
      const removed = await repository.deleteHistoryByFilter(targetFilter);
      await recalcCostsAndRefresh();
      if (status) status.textContent = removed ? `已删除 ${removed} 条记录并完成重算` : '当前范围没有可删除记录';
      if (removed) toast('success', `已删除 ${removed} 条记录`);
    } catch (error: any) {
      if (status) status.textContent = '删除失败：' + (error?.message || error);
    } finally {
      deleteBtn.disabled = false;
    }
  };
}

export function renderSettings(doc: Document) {
  const host = doc.getElementById('aus-settings');
  if (!host) return;
  const s = state.settings as any;
  host.innerHTML = `
    <div style="display:grid;gap:12px;">
      <!-- 匿名使用统计（默认开启，可随时关闭） -->
      <div class="ds-card">
        <div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">匿名使用统计</span><label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;"><input type="checkbox" id="aus-telemetry-enabled" style="opacity:0;width:0;height:0;"><span style="position:absolute;inset:0;background:var(--ds-border);border-radius:12px;transition:0.2s;"><span id="aus-telemetry-slider" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:var(--ds-card-inner);border-radius:50%;transition:0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.15);"></span></span></label></div>
        <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:6px;line-height:1.6;">仅匿名上报浏览器环境参数（浏览器名与版本、系统、架构、语言、窄屏分桶、standalone、时区）、扩展版本与面板渲染耗时分桶等开发数据；<strong>不含对话内容、密钥等任何隐私信息，数据经过匿名化处理，仅用于开发与完善兼容性。</strong>关闭后立即停止采集与上报。<a href="https://janmk1453.github.io/Api-Usage/#privacy" target="_blank" rel="noreferrer" style="color:var(--ds-text);text-decoration:underline;">隐私声明</a></div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;flex-wrap:wrap;"><span id="aus-telemetry-id" style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">匿名标识：待生成</span><button id="aus-telemetry-reset" style="padding:6px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">重置匿名标识</button></div>
        <div id="aus-telemetry-status" style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:6px;"></div>
      </div>
      <!-- 颜色模式（与用量统计·模型选择一致的胶囊下拉） -->
      <div class="ds-card" style="position:relative;"><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">颜色模式</span><div id="aus-theme-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">模式</span><span id="aus-theme-label" style="font-weight:600;color:var(--ds-text);">浅色</span>${icon('chevron-down', 14)}</div></div><div id="aus-theme-dropdown" style="display:none;position:absolute;top:44px;right:12px;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:140px;padding:8px;"></div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:6px;">切换后立即生效，深色模式针对夜间可读性优化</div></div>

      <!-- 历史显示范围 -->
      <div class="ds-card" style="position:relative;"><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">历史显示范围</span><div id="aus-history-scope-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);cursor:pointer;"><span style="color:var(--ds-text-2);">范围</span><span id="aus-history-scope-label" style="font-weight:600;color:var(--ds-text);">全部历史</span>${icon('chevron-down', 14)}</div></div><div id="aus-history-scope-dropdown" style="display:none;position:absolute;top:44px;right:12px;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:160px;padding:8px;"></div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:6px;">全部历史展示所有对话的记录，当前对话仅展示与当前聊天文件关联的记录</div></div>

      <!-- API 密钥 -->
      <div class="ds-card" style="display:none;"><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);font-weight:500;margin-bottom:6px;">API 密钥</div><div style="display:flex;gap:8px;"><input id="aus-api-key" type="password" placeholder="输入 DeepSeek API 密钥" style="flex:1;padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);outline:none;" /><button id="aus-save-key" class="ds-btn-pill" style="padding:8px 14px;">保存</button></div><div id="aus-key-status" style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:6px;"></div></div>

      <!-- 余额 -->
      <div class="ds-card">
        <div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">自动校准余额（全局开关）</span><label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;"><input type="checkbox" id="aus-auto-balance" style="opacity:0;width:0;height:0;"><span style="position:absolute;inset:0;background:var(--ds-border);border-radius:12px;transition:0.2s;"><span id="aus-auto-balance-slider" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:var(--ds-card-inner);border-radius:50%;transition:0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.15);"></span></span></label></div>
        <div id="aus-auto-balance-interval" style="display:${s.autoBalance ? 'block':'none'};margin-top:8px;"><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);color:var(--ds-text);">校准间隔（分钟）</span><input type="number" id="aus-balance-interval" min="1" max="1440" style="width:90px;padding:6px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);text-align:center;" /></div></div>
        <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:6px;">仅钱包页中启用了自动校准且支持该能力的钱包会在间隔到期后查询。</div>
        <div style="display:none;margin-top:12px;"><input id="aus-custom-balance" /><button id="aus-save-balance"></button><button id="aus-clear-balance"></button><div id="aus-balance-status"></div></div>
      </div>

      <!-- 高峰时段 -->
      <div class="ds-card"><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">新钱包默认峰谷时段</span><button id="aus-btn-add-peak-hour" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">+ 添加</button></div><div id="aus-peak-hours-list" style="display:grid;gap:6px;margin-top:8px;"></div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:6px;line-height:1.6;">支持跨天（如 22:00-02:00）；钱包页可分别覆盖时段和周末规则。<br />DeepSeek 官方规则：周一至周五（不含中国法定节假日）9:00-12:00、14:00-18:00 为高峰，其余时段（含周末和法定节假日全天）为空闲；调休上班的周末同样按空闲计费。</div><div style="margin-top:10px;"><div style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-text);">额外空闲日期</div><textarea id="aus-extra-off-days" rows="3" placeholder="每行一个日期，如 2027-01-01" style="width:100%;margin-top:6px;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);resize:vertical;box-sizing:border-box;"></textarea><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:4px;">内置法定节假日数据覆盖 ${CN_HOLIDAY_COVERAGE_LABEL}；超出范围的日期可按 YYYY-MM-DD 每行一条补充，全天按空闲计费。</div></div></div>

      <!-- 模型与价格（可折叠，默认收起） -->
      <div class="ds-card" style="display:none;"><div id="aus-models-header" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">模型与价格（<span id="aus-model-price-unit">${getDisplayCurrency().code}/百万 tokens</span>）</span><div style="display:flex;align-items:center;gap:8px;"><button id="aus-btn-clear-custom-models" style="padding:6px 10px;border:1px solid var(--ds-red-border);border-radius:999px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">清空自定义模型</button><button id="aus-btn-add-model" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">+ 自定义模型</button><span id="aus-models-toggle" style="flex-shrink:0;padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;user-select:none;line-height:1;">${icon('chevron-down', 14)} 展开</span></div></div><div id="aus-models-sync-note" style="display:none;margin-top:8px;padding:8px 10px;border:1px dashed var(--ds-border);border-radius:10px;background:var(--ds-sidebar-bg);font-size:var(--aus-fs-sm);color:var(--ds-text-2);line-height:1.6;"></div><div id="aus-custom-models-list" style="display:grid;gap:8px;margin-top:8px;"></div></div>

      <!-- 模型价格自动同步（models.dev） -->
      <div class="ds-card" style="position:relative;"><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">模型价格自动同步（models.dev）</span><label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;"><input type="checkbox" id="aus-pricing-sync-enabled" style="opacity:0;width:0;height:0;"><span style="position:absolute;inset:0;background:var(--ds-border);border-radius:12px;transition:0.2s;"><span id="aus-pricing-sync-slider" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:var(--ds-card-inner);border-radius:50%;transition:0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.15);"></span></span></label></div>
        <div id="aus-pricing-sync-panel" style="display:${s.pricingSync?.enabled ? 'grid':'none'};margin-top:10px;gap:10px;">
          <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);line-height:1.6;">开启后所有价格、余额、图表将以 <b style="color:var(--ds-text);">美元 $/USD</b> 展示（按汇率动态换算），自动从 <a href="https://models.dev" target="_blank" style="color:var(--ds-text);text-decoration:underline;">models.dev</a> 拉取模型价格。各钱包在钱包页选择“价格来源供应商”，同步只写入对应钱包；DeepSeek 峰价按谷价 2× 合成。功能默认关闭。<br />钱包中锁定或手工维护的价格受同步模式保护；<b style="color:var(--ds-text);">关闭本开关会移除未锁定的同步价格</b>。</div>
          <div style="display:flex;align-items:center;justify-content:space-between;position:relative;"><span style="font-size:var(--aus-fs-base);color:var(--ds-text);">同步模式</span><div id="aus-pricing-sync-mode-btn" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);cursor:pointer;"><span id="aus-pricing-sync-mode-label" style="font-weight:600;color:var(--ds-text);">仅新增</span>${icon('chevron-down', 14)}</div><div id="aus-pricing-sync-mode-dropdown" style="display:none;position:absolute;top:40px;right:0;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:160px;padding:8px;"></div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">汇率 USD→CNY</div><input id="aus-exchange-rate" type="number" step="0.0001" min="0" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /></div>
            <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">自动同步间隔</div><div id="aus-pricing-sync-interval-btn" style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);cursor:pointer;"><span id="aus-pricing-sync-interval-label" style="font-weight:600;">仅手动</span>${icon('chevron-down', 14)}</div><div id="aus-pricing-sync-interval-dropdown" style="display:none;position:absolute;right:12px;z-index:10;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:140px;padding:8px;"></div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;"><label style="display:flex;align-items:center;gap:6px;font-size:var(--aus-fs-sm);color:var(--ds-text-2);cursor:pointer;"><input type="checkbox" id="aus-use-live-rate" style="accent-color:var(--ds-text);" /> 每24小时自动联网获取最新汇率</label><button id="aus-fetch-rate" style="padding:6px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">立即获取</button></div>
          <div id="aus-rate-status" style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);"></div>
          <label style="display:flex;align-items:center;gap:6px;font-size:var(--aus-fs-sm);color:var(--ds-text-2);cursor:pointer;"><input type="checkbox" id="aus-recalc-on-sync" style="accent-color:var(--ds-text);" /> 同步后重算历史费用（否则仅新请求生效）</label>
          <div style="display:flex;gap:8px;"><button id="aus-btn-sync-pricing" class="ds-btn-pill" style="flex:1;">立即同步</button><button id="aus-btn-preview-pricing" style="flex:1;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">预览</button></div>
          <div id="aus-pricing-sync-status" style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);"></div>
          <div id="aus-pricing-sync-preview" style="display:none;max-height:160px;overflow:auto;border:1px solid var(--ds-border);border-radius:8px;padding:8px;background:var(--ds-sidebar-bg);font-size:var(--aus-fs-sm);"></div>
        </div>
      </div>

      <!-- 调试 -->
      <div class="ds-card">
        <div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">调试模式（模拟数据，不计费）</span><label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;"><input type="checkbox" id="aus-debug-mode" style="opacity:0;width:0;height:0;"><span style="position:absolute;inset:0;background:var(--ds-border);border-radius:12px;transition:0.2s;"><span id="aus-debug-mode-slider" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:var(--ds-card-inner);border-radius:50%;transition:0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.15);"></span></span></label></div>
        <div id="aus-debug-panel" style="display:${s.debug ? 'grid':'none'};margin-top:10px;gap:8px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">命中</div><input type="number" id="aus-debug-hit" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /></div><div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">未命中</div><input type="number" id="aus-debug-miss" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /></div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">输出</div><input type="number" id="aus-debug-output" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /></div><div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">模型</div><select id="aus-debug-model" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);"></select></div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;"><input type="date" id="aus-debug-date-start" style="padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /><input type="date" id="aus-debug-date-end" style="padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /><input type="number" id="aus-debug-batch-count" min="1" placeholder="条数" style="padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /></div>
          <button id="aus-btn-debug-batch" class="ds-btn-pill" style="width:100%;">生成模拟数据</button>
          <button id="aus-btn-debug-clear" style="width:100%;padding:8px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">清除调试数据</button><div id="aus-debug-status" style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);"></div>
        </div>
      </div>

      <!-- 峰值圆点 -->
      <div class="ds-card"><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">峰值提示小圆点</span><label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;"><input type="checkbox" id="aus-peak-dot" style="opacity:0;width:0;height:0;"><span style="position:absolute;inset:0;background:var(--ds-border);border-radius:12px;transition:0.2s;"><span id="aus-peak-dot-slider" style="position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:var(--ds-card-inner);border-radius:50%;transition:0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.15);"></span></span></label></div><button id="aus-reset-dot" style="margin-top:8px;padding:6px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);font-size:var(--aus-fs-sm);cursor:pointer;">重置位置</button></div>

      <!-- 记录数据管理 -->
      <div class="ds-card">
        <div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);margin-bottom:6px;">按范围删除记录</div>
        <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);line-height:1.7;margin-bottom:8px;">可删除全部记录，或按日期、模型、对话缩小范围。日期留空表示不限；模型与对话需完全匹配，留空表示不限。删除会同时处理热记录与冷记录，并立即重算统计。</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">开始日期</div><input type="date" id="aus-delete-start" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);box-sizing:border-box;" /></div>
          <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">结束日期</div><input type="date" id="aus-delete-end" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);box-sizing:border-box;" /></div>
          <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">模型</div><input id="aus-delete-model" placeholder="如 deepseek-flash" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);box-sizing:border-box;" /></div>
          <div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:4px;">对话</div><input id="aus-delete-chat" placeholder="对话名称或 chatId" style="width:100%;padding:7px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);box-sizing:border-box;" /></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="aus-delete-preview" style="padding:7px 12px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">统计匹配记录</button>
          <button id="aus-delete-run" style="padding:7px 12px;border:1px solid var(--ds-red-border);border-radius:999px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">删除匹配记录</button>
        </div>
        <div id="aus-delete-status" style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:8px;"></div>
      </div>

      <!-- WebDAV -->
      <div class="ds-card"><div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);margin-bottom:6px;">WebDAV 云同步</div><div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-bottom:8px;">双向合并，仅同步统计/设置/余额，不含聊天内容与密钥。强制 https。</div>
        <div style="display:grid;gap:8px;">
          <input id="aus-webdav-url" placeholder="https://dav.jianguoyun.com/dav/" style="padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" />
          <div style="display:flex;gap:8px;"><input id="aus-webdav-user" placeholder="用户名" style="flex:1;padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /><input id="aus-webdav-pass" type="password" placeholder="应用密码" style="flex:1;padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /><button id="aus-webdav-pass-clear" type="button" style="padding:8px 12px;border:1px solid var(--ds-red-border);border-radius:999px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">清除密码</button></div>
          <input id="aus-webdav-path" placeholder="远程子路径（可空）" style="padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" />
          <input id="aus-webdav-proxy" placeholder="CORS 代理（可选，http://127.0.0.1:8000/proxy?url=）" style="padding:8px 10px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" />
          <button id="aus-webdav-sync" class="ds-btn-pill">☁️ 立即同步</button>
        </div>
      </div>
    </div>
  `;

  // 填充 API Key：不回填明文，仅显示已保存状态（防 XSS/泄露）
  const apiKeyEl = doc.getElementById('aus-api-key') as HTMLInputElement | null;
  try {
    const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
    const v = ctx?.extensionSettings?.['api_usage_stat']?.apiKey;
    if (v && apiKeyEl) {
      apiKeyEl.value = '';
      apiKeyEl.placeholder = '已保存 ●●●●（留空不修改）';
      (apiKeyEl as any).dataset.hasKey = '1';
    }
  } catch {}
  (doc.getElementById('aus-custom-balance') as HTMLInputElement | null)!.value = state.customBalance || '';
  // 匿名使用统计：开关状态与标识展示
  const telemetryCb = doc.getElementById('aus-telemetry-enabled') as HTMLInputElement | null;
  const telemetrySlider = doc.getElementById('aus-telemetry-slider') as HTMLElement | null;
  if (telemetryCb) telemetryCb.checked = s.telemetryEnabled !== false;
  if (telemetrySlider) telemetrySlider.style.left = s.telemetryEnabled !== false ? '23px' : '3px';
  renderTelemetryStatus(doc);
  (doc.getElementById('aus-peak-dot') as HTMLInputElement | null)!.checked = state.settings.peakDot !== false;
  const peakSlider = doc.getElementById('aus-peak-dot-slider') as HTMLElement | null;
  if (peakSlider) peakSlider.style.left = state.settings.peakDot !== false ? '23px' : '3px';

  const autoCb = doc.getElementById('aus-auto-balance') as HTMLInputElement | null;
  const autoSlider = doc.getElementById('aus-auto-balance-slider') as HTMLElement | null;
  if (autoCb) autoCb.checked = !!s.autoBalance;
  if (autoSlider) autoSlider.style.left = s.autoBalance ? '23px' : '3px';
  (doc.getElementById('aus-balance-interval') as HTMLInputElement | null)!.value = String(s.balanceInterval ?? 10);
  const dbgCb = doc.getElementById('aus-debug-mode') as HTMLInputElement | null;
  const dbgSlider = doc.getElementById('aus-debug-mode-slider') as HTMLElement | null;
  if (dbgCb) dbgCb.checked = !!s.debug;
  if (dbgSlider) dbgSlider.style.left = s.debug ? '23px' : '3px';
  (doc.getElementById('aus-debug-hit') as HTMLInputElement | null)!.value = String(s.debugHit ?? 10000);
  (doc.getElementById('aus-debug-miss') as HTMLInputElement | null)!.value = String(s.debugMiss ?? 5000);
  (doc.getElementById('aus-debug-output') as HTMLInputElement | null)!.value = String(s.debugOutput ?? 2000);
  (doc.getElementById('aus-debug-date-start') as HTMLInputElement | null)!.value = s.debugDateStart || '';
  (doc.getElementById('aus-debug-date-end') as HTMLInputElement | null)!.value = s.debugDateEnd || '';
  (doc.getElementById('aus-debug-batch-count') as HTMLInputElement | null)!.value = String(s.debugBatchCount ?? 30);
  (doc.getElementById('aus-webdav-url') as HTMLInputElement | null)!.value = (s.webdav as any)?.url || '';
  (doc.getElementById('aus-webdav-user') as HTMLInputElement | null)!.value = (s.webdav as any)?.username || '';
  (doc.getElementById('aus-webdav-path') as HTMLInputElement | null)!.value = (s.webdav as any)?.path || '';
  (doc.getElementById('aus-webdav-proxy') as HTMLInputElement | null)!.value = (s.webdav as any)?.proxy || '';
  try {
    const pass = localStorage.getItem('ds_ds_webdav_pass') || '';
    const el = doc.getElementById('aus-webdav-pass') as HTMLInputElement | null;
    if (pass && el) {
      el.value = '';
      el.placeholder = '已保存 ●●●●（留空不修改）';
      (el as any).dataset.hasKey = '1';
    } else {
      // 兼容 extensionSettings.webdavPass
      const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
      const v2 = ctx?.extensionSettings?.['api_usage_stat']?.webdavPass;
      if (v2 && el) {
        el.value = '';
        el.placeholder = '已保存 ●●●●（留空不修改）';
        (el as any).dataset.hasKey = '1';
      }
    }
  } catch {}

  // 颜色模式（胶囊下拉，与用量统计·模型选择一致）
  function renderThemePicker() {
    const dropdown = doc.getElementById('aus-theme-dropdown');
    const label = doc.getElementById('aus-theme-label');
    if (!label) return;
    const cur = (state.settings as any).theme || 'light';
    label.textContent = cur === 'dark' ? '深色' : '浅色';
    if (!dropdown) return;
    const opts: Array<{v:string,l:string}> = [{v:'light',l:'浅色'}, {v:'dark',l:'深色'}];
    dropdown.innerHTML = opts.map(o => {
      const active = o.v === cur ? 'background:var(--ds-card);font-weight:600;' : '';
      return `<div data-theme="${o.v}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}">${o.l}</div>`;
    }).join('');
    dropdown.querySelectorAll('[data-theme]').forEach((el: any) => {
      el.onclick = () => {
        const v = el.getAttribute('data-theme') as any;
        (state.settings as any).theme = v;
        saveHot({ settings: state.settings });
        applyTheme(v);
        dropdown.style.display = 'none';
        renderThemePicker();
        try { (globalThis as any).ApiUsageStat?.refreshUI?.(); } catch {}
      };
    });
  }
  renderThemePicker();
  const themeBtn = doc.getElementById('aus-theme-btn');
  const themeDropdown = doc.getElementById('aus-theme-dropdown');
  if (themeBtn && themeDropdown) {
    themeBtn.onclick = () => {
      const open = themeDropdown.style.display === 'block';
      themeDropdown.style.display = open ? 'none' : 'block';
      if (!open) renderThemePicker();
    };
  }
  bindSettingsOutsideClick(doc);
  // 历史显示范围（胶囊下拉，与颜色模式同款）
  function renderScopePicker() {
    const dropdown = doc.getElementById('aus-history-scope-dropdown');
    const label = doc.getElementById('aus-history-scope-label');
    if (!label) return;
    const cur = (state.settings as any).historyScope || 'all';
    label.textContent = cur === 'current' ? '当前对话' : '全部历史';
    if (!dropdown) return;
    const opts: Array<{v:string,l:string}> = [{v:'all',l:'全部历史'}, {v:'current',l:'当前对话'}];
    dropdown.innerHTML = opts.map(o => {
      const active = o.v === cur ? 'background:var(--ds-card);font-weight:600;' : '';
      return `<div data-scope="${o.v}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active}">${o.l}</div>`;
    }).join('');
    dropdown.querySelectorAll('[data-scope]').forEach((el: any) => {
      el.onclick = () => {
        const v = el.getAttribute('data-scope') as any;
        (state.settings as any).historyScope = v;
        saveHot({ settings: state.settings });
        dropdown.style.display = 'none';
        renderScopePicker();
        try { (globalThis as any).ApiUsageStat?.refreshUI?.(); } catch {}
      };
    });
  }
  renderScopePicker();
  const scopeBtn = doc.getElementById('aus-history-scope-btn');
  const scopeDropdown = doc.getElementById('aus-history-scope-dropdown');
  if (scopeBtn && scopeDropdown) {
    scopeBtn.onclick = () => {
      const open = scopeDropdown.style.display === 'block';
      scopeDropdown.style.display = open ? 'none' : 'block';
      if (!open) renderScopePicker();
    };
  }

  // 绑定
  doc.getElementById('aus-save-key')!.onclick = () => {
    const el = doc.getElementById('aus-api-key') as HTMLInputElement;
    const v = el.value.trim();
    if (!v && (el as any).dataset.hasKey === '1') {
      const sEl = doc.getElementById('aus-key-status')!;
      sEl.textContent = '未修改，已保留原密钥';
      return;
    }
    saveApiKey(v);
    const sEl = doc.getElementById('aus-key-status')!;
    sEl.textContent = v ? '已保存' : '已清空';
    if (v) {
      el.value = '';
      el.placeholder = '已保存 ●●●●（留空不修改）';
      (el as any).dataset.hasKey = '1';
    } else {
      el.placeholder = '输入 DeepSeek API 密钥';
      (el as any).dataset.hasKey = '';
    }
  };
  doc.getElementById('aus-save-balance')!.onclick = () => {
    const v = (doc.getElementById('aus-custom-balance') as HTMLInputElement).value.trim();
    if (v && isNaN(parseFloat(v))) return alert('请输入有效金额');
    state.customBalance = v || null; saveHot({ customBalance: state.customBalance }); try { (globalThis as any).ApiUsageStat?.refreshUI?.(); } catch {}
    doc.getElementById('aus-balance-status')!.textContent = v ? '已保存' : '已清除';
  };
  doc.getElementById('aus-clear-balance')!.onclick = () => {
    state.customBalance = null; saveHot({ customBalance: null }); (doc.getElementById('aus-custom-balance') as HTMLInputElement).value = ''; doc.getElementById('aus-balance-status')!.textContent = '已清除';
    try { (globalThis as any).ApiUsageStat?.refreshUI?.(); } catch {}
  };
  if (autoCb) autoCb.onchange = () => {
    state.settings.autoBalance = autoCb.checked;
    if (autoSlider) autoSlider.style.left = autoCb.checked ? '23px' : '3px';
    (doc.getElementById('aus-auto-balance-interval') as HTMLElement).style.display = autoCb.checked ? 'block' : 'none';
    saveHot({ settings: state.settings });
    try { import('../services/balance').then(m=> (m as any).restartBalanceTimer?.()); } catch {}
  };
  (doc.getElementById('aus-balance-interval') as HTMLInputElement).onchange = (e: any) => {
    state.settings.balanceInterval = parseInt(e.target.value) || 10;
    saveHot({ settings: state.settings });
    try { import('../services/balance').then(m=> (m as any).restartBalanceTimer?.()); } catch {}
  };
  if (dbgCb) dbgCb.onchange = () => {
    state.settings.debug = dbgCb.checked;
    if (dbgSlider) dbgSlider.style.left = dbgCb.checked ? '23px' : '3px';
    (doc.getElementById('aus-debug-panel') as HTMLElement).style.display = dbgCb.checked ? 'grid' : 'none';
    const st = doc.getElementById('aus-debug-status') as HTMLElement | null;
    if (st) st.textContent = dbgCb.checked ? '调试模式已开启，下次对话将使用模拟参数，不计费' : '';
    saveHot({ settings: state.settings });
  };
  (doc.getElementById('aus-debug-hit') as HTMLInputElement).onchange = (e: any) => { state.settings.debugHit = parseInt(e.target.value) || 0; saveHot({ settings: state.settings }); };
  (doc.getElementById('aus-debug-miss') as HTMLInputElement).onchange = (e: any) => { state.settings.debugMiss = parseInt(e.target.value) || 0; saveHot({ settings: state.settings }); };
  (doc.getElementById('aus-debug-output') as HTMLInputElement).onchange = (e: any) => { state.settings.debugOutput = parseInt(e.target.value) || 0; saveHot({ settings: state.settings }); };
  const dbgModel = doc.getElementById('aus-debug-model') as HTMLSelectElement | null;
  if (dbgModel) dbgModel.onchange = (e: any) => { state.settings.debugModel = e.target.value; saveHot({ settings: state.settings }); };
  (doc.getElementById('aus-debug-date-start') as HTMLInputElement).onchange = (e: any) => { state.settings.debugDateStart = e.target.value; saveHot({ settings: state.settings }); };
  (doc.getElementById('aus-debug-date-end') as HTMLInputElement).onchange = (e: any) => { state.settings.debugDateEnd = e.target.value; saveHot({ settings: state.settings }); };
  (doc.getElementById('aus-debug-batch-count') as HTMLInputElement).onchange = (e: any) => { state.settings.debugBatchCount = parseInt(e.target.value) || 1; saveHot({ settings: state.settings }); };
  doc.getElementById('aus-btn-debug-batch')!.onclick = () => generateDebugBatch();
  try {
    const clearBtn = doc.getElementById('aus-btn-debug-clear') as HTMLButtonElement | null;
    if (clearBtn) clearBtn.onclick = async () => {
      try {
        const { repository } = await import('../data/repository');
        const { state: st } = await import('../store/index');
        await repository.replaceAll({ history: (st.history || []).filter((h: any) => (h as any)._debug !== true) } as any);
        await repository.recalcAll();
        await repository.rebuildAggregates();
        try { (globalThis as any).ApiUsageStat?.refreshUI?.(); } catch {}
        const el = doc.getElementById('aus-debug-status');
        if (el) el.textContent = '已清除调试数据';
      } catch {}
    };
  } catch {}
  doc.getElementById('aus-peak-dot')!.onchange = (e: any) => { state.settings.peakDot = e.target.checked; const sl = doc.getElementById('aus-peak-dot-slider') as HTMLElement | null; if (sl) sl.style.left = e.target.checked ? '23px' : '3px'; saveHot({ settings: state.settings }); try { (globalThis as any).ApiUsageStat?.updatePeakDot?.(); } catch {} };
  doc.getElementById('aus-reset-dot')!.onclick = () => { try { localStorage.removeItem('ds_ds_peak_dot_pos'); const dot = (window.parent as any)?.document?.getElementById('aus-peak-dot-indicator') as HTMLElement | null; if (dot) { dot.style.left = ''; dot.style.top = '60px'; dot.style.right = '16px'; } } catch {} alert('已重置'); };
  const telemetryToggle = doc.getElementById('aus-telemetry-enabled') as HTMLInputElement | null;
  if (telemetryToggle) telemetryToggle.onchange = (e: any) => {
    (state.settings as any).telemetryEnabled = !!e.target.checked;
    const slider = doc.getElementById('aus-telemetry-slider') as HTMLElement | null;
    if (slider) slider.style.left = e.target.checked ? '23px' : '3px';
    saveHot({ settings: state.settings });
    renderTelemetryStatus(doc);
  };
  const telemetryReset = doc.getElementById('aus-telemetry-reset') as HTMLButtonElement | null;
  if (telemetryReset) telemetryReset.onclick = () => {
    try { resetIdentity(); } catch {}
    renderTelemetryStatus(doc);
    toast('info', '已重置匿名标识，后续上报将按新设备计入');
  };
  bindHistoryDelete(doc);
  const wUrl = doc.getElementById('aus-webdav-url') as HTMLInputElement | null;
  const wUser = doc.getElementById('aus-webdav-user') as HTMLInputElement | null;
  const wPath = doc.getElementById('aus-webdav-path') as HTMLInputElement | null;
  const wProxy = doc.getElementById('aus-webdav-proxy') as HTMLInputElement | null;
  const wPass = doc.getElementById('aus-webdav-pass') as HTMLInputElement | null;
  if (wUrl) wUrl.onchange = () => { (state.settings.webdav as any).url = wUrl.value.trim(); saveHot({ settings: state.settings }); };
  if (wUser) wUser.onchange = () => { (state.settings.webdav as any).username = wUser.value.trim(); saveHot({ settings: state.settings }); };
  if (wPath) wPath.onchange = () => { (state.settings.webdav as any).path = wPath.value.trim(); saveHot({ settings: state.settings }); };
  if (wProxy) wProxy.onchange = () => { (state.settings.webdav as any).proxy = wProxy.value.trim(); saveHot({ settings: state.settings }); };
  if (wPass) wPass.onchange = () => {
    const vv = wPass.value.trim();
    if (!vv && (wPass as any).dataset.hasKey === '1') return;
    saveWebdavPass(wPass.value);
    if (vv) {
      wPass.value = '';
      wPass.placeholder = '已保存 ●●●●（留空不修改）';
      (wPass as any).dataset.hasKey = '1';
    }
  };
  const wPassClear = doc.getElementById('aus-webdav-pass-clear') as HTMLButtonElement | null;
  if (wPassClear && wPass) {
    wPassClear.onclick = () => {
      saveWebdavPass('');
      wPass.value = '';
      wPass.placeholder = '应用密码';
      (wPass as any).dataset.hasKey = '';
    };
  }
  doc.getElementById('aus-webdav-sync')!.onclick = () => doSyncNow();

  // 模型价格自动同步（models.dev）
  try {
    const ps: any = (state.settings as any).pricingSync || {};
    const enabledEl = doc.getElementById('aus-pricing-sync-enabled') as HTMLInputElement | null;
    const slider = doc.getElementById('aus-pricing-sync-slider') as HTMLElement | null;
    const panel = doc.getElementById('aus-pricing-sync-panel') as HTMLElement | null;
    if (enabledEl) enabledEl.checked = !!ps.enabled;
    if (slider) slider.style.left = ps.enabled ? '23px' : '3px';
    if (panel) panel.style.display = ps.enabled ? 'grid' : 'none';
    const modeBtn = doc.getElementById('aus-pricing-sync-mode-btn') as HTMLElement | null;
    const modeLabel = doc.getElementById('aus-pricing-sync-mode-label') as HTMLElement | null;
    const modeDrop = doc.getElementById('aus-pricing-sync-mode-dropdown') as HTMLElement | null;
    const modeMap: any = { 'add-missing': '仅新增', 'overwrite-unlocked': '覆盖未锁定', 'overwrite-all': '全部覆盖' };
    if (modeLabel) modeLabel.textContent = modeMap[ps.mode] || '仅新增';
    if (modeDrop) {
      modeDrop.innerHTML = Object.entries(modeMap).map(([k, l]: any) => `<div data-mode="${k}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${ps.mode===k?'background:var(--ds-card);font-weight:600;':''}">${l}</div>`).join('');
      modeDrop.querySelectorAll('[data-mode]').forEach((el: any) => {
        el.onclick = () => {
          (state.settings as any).pricingSync.mode = el.getAttribute('data-mode');
          saveHot({ settings: state.settings });
          modeDrop.style.display = 'none';
          if (modeLabel) modeLabel.textContent = modeMap[(state.settings as any).pricingSync.mode] || el.getAttribute('data-mode');
          modeDrop.innerHTML = Object.entries(modeMap).map(([k, l]: any) => `<div data-mode="${k}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${(state.settings as any).pricingSync.mode===k?'background:var(--ds-card);font-weight:600;':''}">${l}</div>`).join('');
        };
      });
    }
    if (modeBtn && modeDrop) modeBtn.onclick = () => { modeDrop.style.display = modeDrop.style.display==='block'?'none':'block'; };
    const rateEl = doc.getElementById('aus-exchange-rate') as HTMLInputElement | null;
    if (rateEl) rateEl.value = String(ps.exchangeRate ?? 7.2);
    const liveEl = doc.getElementById('aus-use-live-rate') as HTMLInputElement | null;
    if (liveEl) liveEl.checked = !!ps.useLiveRate;
    const recalcEl = doc.getElementById('aus-recalc-on-sync') as HTMLInputElement | null;
    if (recalcEl) recalcEl.checked = !!ps.recalcOnSync;
    const intervalBtn = doc.getElementById('aus-pricing-sync-interval-btn') as HTMLElement | null;
    const intervalLabel = doc.getElementById('aus-pricing-sync-interval-label') as HTMLElement | null;
    const intervalDrop = doc.getElementById('aus-pricing-sync-interval-dropdown') as HTMLElement | null;
    const intervalMap: any = { '0': '仅手动', '24': '每天', '168': '每周' };
    if (intervalLabel) intervalLabel.textContent = intervalMap[String(ps.autoIntervalHours ?? 0)] || '仅手动';
    if (intervalDrop) {
      intervalDrop.innerHTML = Object.entries(intervalMap).map(([k,l]: any)=> `<div data-interval="${k}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${String(ps.autoIntervalHours)===k?'background:var(--ds-card);font-weight:600;':''}">${l}</div>`).join('');
      intervalDrop.querySelectorAll('[data-interval]').forEach((el:any)=>{
        el.onclick=()=>{
          (state.settings as any).pricingSync.autoIntervalHours = parseInt(el.getAttribute('data-interval'))||0;
          saveHot({settings:state.settings});
          intervalDrop.style.display='none';
          if(intervalLabel) intervalLabel.textContent = intervalMap[el.getAttribute('data-interval')]||el.getAttribute('data-interval');
          try{ import('../services/pricing-sync').then(m=> (m as any).restartPricingSyncTimer?.()); import('../services/currency').then(m=> (m as any).restartRateTimer?.()); }catch{}
        };
      });
    }
    if (intervalBtn && intervalDrop) intervalBtn.onclick = () => { intervalDrop.style.display = intervalDrop.style.display==='block'?'none':'block'; };
    const rateStatus = doc.getElementById('aus-rate-status') as HTMLElement | null;
    if (rateStatus) {
      const last = ps.lastRateFetch ? new Date(ps.lastRateFetch).toLocaleString('zh-CN') : '—';
      rateStatus.textContent = `1 USD ≈ ${Number(ps.exchangeRate||7.2).toFixed(4)} CNY（更新于 ${last}）`;
    }
    const syncStatus = doc.getElementById('aus-pricing-sync-status') as HTMLElement | null;
    if (syncStatus) {
      const lastSync = ps.lastSync ? new Date(ps.lastSync).toLocaleString('zh-CN') : '未同步';
      syncStatus.textContent = `上次同步：${lastSync} · 模式：${modeMap[ps.mode]||ps.mode}`;
    }
    if (enabledEl) enabledEl.onchange = async () => {
      (state.settings as any).pricingSync.enabled = enabledEl.checked;
      if (slider) slider.style.left = enabledEl.checked ? '23px' : '3px';
      if (panel) panel.style.display = enabledEl.checked ? 'grid' : 'none';
      // 关闭自动同步时清理同步进来的模型价格（否则会以隐藏态残留，影响计价口径）
      let removed = 0;
      if (!enabledEl.checked) {
        try {
          const m: any = await import('../services/pricing-sync');
          // 先补做旧数据识别（避免未标记的残留项漏删），再统一移除同步条目
          try { await m.markLegacySyncedModels?.({ skipRerender: true }); } catch {}
          removed = m.removeSyncedModels ? m.removeSyncedModels() : 0;
        } catch { removed = 0; }
      }
      saveHot({ settings: state.settings });
      try { import('../services/currency').then(m=> (m as any).restartRateTimer?.()); import('../services/pricing-sync').then(m=> (m as any).restartPricingSyncTimer?.()); } catch {}
      if (removed) { renderModelsEditor(doc); fillDebugModelSelect(doc); void recalcCostsAndRefresh(); toast('success', `已移除 ${removed} 个同步模型价格`); }
      try { (globalThis as any).ApiUsageStat?.refreshUI?.(); } catch {}
      const unitEl = doc.getElementById('aus-model-price-unit') as HTMLElement | null;
      if (unitEl) { try{  unitEl.textContent = getDisplayCurrency().code + '/百万 tokens'; }catch{} }
    };
    if (rateEl) rateEl.onchange = () => {
      const v = parseFloat(rateEl.value);
      if (!isFinite(v) || v <= 0) return;
      (state.settings as any).pricingSync.exchangeRate = Math.round(v*10000)/10000;
      saveHot({ settings: state.settings });
      if (rateStatus) rateStatus.textContent = `1 USD ≈ ${v.toFixed(4)} CNY（更新于 ${new Date().toLocaleString('zh-CN')}）`;
      try { (globalThis as any).ApiUsageStat?.refreshUI?.(); } catch {}
    };
    if (liveEl) liveEl.onchange = () => {
      (state.settings as any).pricingSync.useLiveRate = liveEl.checked;
      saveHot({ settings: state.settings });
      try { import('../services/currency').then(m=> (m as any).restartRateTimer?.()); } catch {}
    };
    if (recalcEl) recalcEl.onchange = () => {
      (state.settings as any).pricingSync.recalcOnSync = recalcEl.checked;
      saveHot({ settings: state.settings });
    };
    const fetchBtn = doc.getElementById('aus-fetch-rate') as HTMLElement | null;
    if (fetchBtn) fetchBtn.onclick = async () => {
      fetchBtn.textContent = '获取中…';
      (fetchBtn as any).disabled = true;
      try { const r = await fetchLiveRate(true); if (r && rateEl) { rateEl.value = String(r); if(rateStatus) rateStatus.textContent = `1 USD ≈ ${Number(r).toFixed(4)} CNY（更新于 ${new Date().toLocaleString('zh-CN')}）`; try{ (globalThis as any).ApiUsageStat?.refreshUI?.(); }catch{} } } finally { fetchBtn.textContent='立即获取'; (fetchBtn as any).disabled=false; }
    };
    const syncBtn = doc.getElementById('aus-btn-sync-pricing') as HTMLElement | null;
    if (syncBtn) syncBtn.onclick = async () => {
      syncBtn.textContent = '同步中…';
      (syncBtn as any).disabled = true;
      try { await syncPricingFromModelsDev({ silent:false }); if(syncStatus){ const ps2:any=(state.settings as any).pricingSync; syncStatus.textContent=`上次同步：${new Date(ps2.lastSync).toLocaleString('zh-CN')} · 模式：${modeMap[ps2.mode]||ps2.mode}`; } try{ (globalThis as any).ApiUsageStat?.refreshUI?.(); renderModelsEditor(doc); }catch{} } finally { syncBtn.textContent='立即同步'; (syncBtn as any).disabled=false; }
    };
    const previewBtn = doc.getElementById('aus-btn-preview-pricing') as HTMLElement | null;
    const previewHost = doc.getElementById('aus-pricing-sync-preview') as HTMLElement | null;
    if (previewBtn && previewHost) previewBtn.onclick = async () => {
      previewBtn.textContent='预览中…'; (previewBtn as any).disabled=true;
      try {
        const catalog = await fetchModelsDevCatalog();
        const p = previewSync(catalog);
        previewHost.style.display='block';
        previewHost.innerHTML = `<div style="font-weight:600;margin-bottom:6px;">共 ${p.total} 模型 · 新增 ${p.added} 更新 ${p.updated} 跳过 ${p.skipped}</div>` + p.samples.map((s:any)=>`<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--ds-border);padding:4px 0;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;">${esc(s.model)}</span><span>${s.hit.toFixed(4)}/${s.miss.toFixed(4)}/${s.output.toFixed(4)}</span></div>`).join('') + `<div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:6px;">单位 ${getDisplayCurrency().code}/百万 · 峰价为谷价 2×（DeepSeek）</div>`;
      } catch(e:any){ previewHost.style.display='block'; previewHost.textContent='预览失败：'+(e?.message||e); }
      finally { previewBtn.textContent='预览'; (previewBtn as any).disabled=false; }
    };
  } catch {}

  renderPeakHoursEditor(doc);
  renderModelsEditor(doc);
  fillDebugModelSelect(doc);

  // 模型与价格折叠（默认收起）
  try {
    const listEl = doc.getElementById('aus-custom-models-list') as HTMLElement | null;
    const toggleEl = doc.getElementById('aus-models-toggle') as HTMLElement | null;
    const headerEl = doc.getElementById('aus-models-header') as HTMLElement | null;
    const addBtn = doc.getElementById('aus-btn-add-model') as HTMLElement | null;
    const collapsed = (s as any).modelsPricingCollapsed !== false;
    if (listEl) listEl.style.display = collapsed ? 'none' : 'grid';
    if (toggleEl) toggleEl.innerHTML = collapsed ? icon('chevron-down', 14) + ' 展开' : icon('chevron-up', 14) + ' 收起';
    const applyCollapsed = (next: boolean) => {
      (state.settings as any).modelsPricingCollapsed = next;
      try { saveHot({ settings: state.settings }); } catch {}
      if (listEl) listEl.style.display = next ? 'none' : 'grid';
      if (toggleEl) toggleEl.innerHTML = next ? icon('chevron-down', 14) + ' 展开' : icon('chevron-up', 14) + ' 收起';
    };
    if (toggleEl) toggleEl.onclick = (e: any) => { e.stopPropagation(); applyCollapsed((listEl?.style.display !== 'none') ? true : false); };
    if (headerEl) headerEl.onclick = (e: any) => {
      const target = e.target as HTMLElement;
      if (target.closest('#aus-btn-add-model') || target.closest('#aus-btn-clear-custom-models') || target.closest('#aus-models-toggle')) return;
      applyCollapsed((listEl?.style.display !== 'none') ? true : false);
    };
    // 清空自定义模型（折叠状态即可用）：二次确认后仅清 settings.customModels，
    // 脚本内置的 PRICING / PRICE_HISTORY（含未外显模型与过去/现在/未来价格段）一律不动
    const clearAllBtn = doc.getElementById('aus-btn-clear-custom-models') as HTMLElement | null;
    if (clearAllBtn) {
      let armed = false;
      let armTimer: any = null;
      const resetLabel = () => { armed = false; try { clearAllBtn.textContent = '清空自定义模型'; } catch {} };
      clearAllBtn.onclick = () => {
        if (!armed) {
          armed = true;
          clearAllBtn.textContent = '确认清空？再点一次';
          armTimer = setTimeout(() => { armTimer = null; resetLabel(); }, 4000);
          return;
        }
        if (armTimer) { clearTimeout(armTimer); armTimer = null; }
        resetLabel();
        const n = clearAllCustomModels();
        renderModelsEditor(doc);
        fillDebugModelSelect(doc);
        void recalcCostsAndRefresh();
        if (n) toast('success', `已清空 ${n} 项自定义模型与价格，内置模型计价规则保持不变`);
        else toast('info', '当前没有自定义模型可清空');
      };
    }
    if (addBtn) addBtn.addEventListener('click', () => {
      const wasCollapsed = listEl?.style.display === 'none';
      if (wasCollapsed) applyCollapsed(false);
      setTimeout(() => {
        const l = doc.getElementById('aus-custom-models-list') as HTMLElement | null;
        const t = doc.getElementById('aus-models-toggle') as HTMLElement | null;
        if (l) l.style.display = 'grid';
        if (t) t.innerHTML = icon('chevron-up', 14) + ' 收起';
      }, 30);
    });
  } catch {}
}

function renderPeakHoursEditor(doc: Document) {
  const list = doc.getElementById('aus-peak-hours-list') as HTMLElement | null;
  if (!list) return;
  const hours: any[] = (state.settings as any).peakHours || [];
  list.innerHTML = hours.map((h: any, i: number) => `
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="time" value="${esc(h.start || '')}" data-idx="${i}" data-field="start" style="flex:1;padding:6px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" />
      <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);">至</span>
      <input type="time" value="${esc(h.end || '')}" data-idx="${i}" data-field="end" style="flex:1;padding:6px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" />
      <button data-del="${i}" style="padding:6px 8px;border:1px solid var(--ds-red-border);border-radius:8px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">删除</button>
    </div>
  `).join('');
  list.querySelectorAll('input[type="time"]').forEach((el: any) => {
    el.onchange = () => {
      const idx = parseInt(el.getAttribute('data-idx')); const field = el.getAttribute('data-field');
      (state.settings as any).peakHours[idx][field] = el.value;
      saveHot({ settings: state.settings }); void recalcCostsAndRefresh();
    };
  });
  list.querySelectorAll('button[data-del]').forEach((el: any) => {
    el.onclick = () => {
      const idx = parseInt(el.getAttribute('data-del'));
      (state.settings as any).peakHours.splice(idx, 1);
      if (!(state.settings as any).peakHours.length) (state.settings as any).peakHours = JSON.parse(JSON.stringify(DEFAULT_PEAK_HOURS));
      saveHot({ settings: state.settings });
      renderPeakHoursEditor(doc); void recalcCostsAndRefresh();
    };
  });
  const addBtn = doc.getElementById('aus-btn-add-peak-hour') as HTMLElement | null;
  if (addBtn) addBtn.onclick = () => {
    (state.settings as any).peakHours.push({ start: '09:00', end: '12:00' });
    saveHot({ settings: state.settings }); renderPeakHoursEditor(doc);
  };
  bindExtraOffDays(doc);
}

// 额外空闲日期：补充内置节假日数据未覆盖年份的法定节假日（YYYY-MM-DD 每行一条）
function bindExtraOffDays(doc: Document) {
  const el = doc.getElementById('aus-extra-off-days') as HTMLTextAreaElement | null;
  if (!el) return;
  el.value = (((state.settings as any).extraOffDays as string[]) || []).join('\n');
  el.onchange = () => {
    const raw = String(el.value || '').split(/[\s,，;；]+/).filter(Boolean);
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const day of raw) {
      if (isValidDayKey(day)) { if (valid.indexOf(day) === -1) valid.push(day); }
      else invalid.push(day);
    }
    valid.sort();
    (state.settings as any).extraOffDays = valid;
    saveHot({ settings: state.settings });
    renderPeakHoursEditor(doc);
    void recalcCostsAndRefresh();
    if (invalid.length) toast('warning', `已保存 ${valid.length} 个日期，忽略 ${invalid.length} 个非法日期：${invalid.slice(0, 3).join('、')}`);
    else toast('success', `已保存 ${valid.length} 个额外空闲日期`);
  };
}

function renderModelsEditor(doc: Document) {
  const list = doc.getElementById('aus-custom-models-list') as HTMLElement | null;
  if (!list) return;
  const builtin = Object.keys(PRICING).filter((m) => HIDDEN_PRICING_MODELS.indexOf(m) === -1);
  const cms: any[] = (state.settings as any).customModels || [];
  const showSynced = (state.settings as any).pricingSync?.showSyncedModels === true;
  const syncedCount = cms.filter((c: any) => isSyncedCustomModel(c)).length;
  const rows: string[] = [];
  for (const m of builtin) {
    const p: any = getPricing(m);
    const usePeak = p.usePeakPricing !== false;
    rows.push(modelRow(m, p, true, usePeak));
  }
  for (const e of cms) {
    // models.dev 同步模型默认隐藏，仅参与计价（可在提示条中展开查看）
    if (isSyncedCustomModel(e) && !showSynced) continue;
    if (e?.model && builtin.indexOf(e.model) === -1 && HIDDEN_PRICING_MODELS.indexOf(e.model) === -1) {
      const p: any = getPricing(e.model);
      rows.push(modelRow(e.model, p, false, p.usePeakPricing !== false, isSyncedCustomModel(e)));
    }
  }
  list.innerHTML = rows.join('');
  renderModelsSyncNote(doc, syncedCount, showSynced);
  list.querySelectorAll('input[type="checkbox"].aus-cm-peak').forEach((el: any) => {
    el.onchange = () => {
      const row = el.closest('[data-model]') as HTMLElement;
      const model = row.getAttribute('data-model') || '';
      const usePeak = el.checked;
      upsertCustom(model, { usePeakPricing: usePeak });
      saveHot({ settings: state.settings });
      renderModelsEditor(doc); void recalcCostsAndRefresh();
    };
  });
  list.querySelectorAll('input[data-price]').forEach((el: any) => {
    el.onchange = () => {
      const row = el.closest('[data-model]') as HTMLElement;
      const model = row.getAttribute('data-model') || '';
      const isBuiltin = row.getAttribute('data-builtin') === '1';
      const prices = readRow(row);
      saveCustomRow(model, prices, isBuiltin);
    };
  });
  list.querySelectorAll('button[data-del]').forEach((el: any) => {
    el.onclick = () => {
      const row = el.closest('[data-model]') as HTMLElement;
      const model = row.getAttribute('data-model') || '';
      (state.settings as any).customModels = (state.settings as any).customModels.filter((c: any) => c.model !== model);
      saveHot({ settings: state.settings });
      renderModelsEditor(doc); fillDebugModelSelect(doc); void recalcCostsAndRefresh();
    };
  });
  const addBtn = doc.getElementById('aus-btn-add-model') as HTMLElement | null;
  if (addBtn) addBtn.onclick = () => {
    const name = 'custom-model-' + ((state.settings as any).customModels.length + 1);
    (state.settings as any).customModels.push({ model: name, usePeakPricing: true, offpeak: {}, peak: {} });
    saveHot({ settings: state.settings }); renderModelsEditor(doc); fillDebugModelSelect(doc);
  };
}

/** 已同步模型提示条：说明隐藏原因，并提供展开查看 / 一次性移除入口 */
function renderModelsSyncNote(doc: Document, syncedCount: number, showSynced: boolean) {
  const note = doc.getElementById('aus-models-sync-note') as HTMLElement | null;
  if (!note) return;
  if (!syncedCount) { note.style.display = 'none'; note.innerHTML = ''; return; }
  note.style.display = 'block';
  note.innerHTML = `已从 models.dev 同步 <b style="color:var(--ds-text);">${syncedCount}</b> 个模型价格，默认隐藏不显示（仍照常参与计费）。
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
      <button id="aus-toggle-synced-models" style="padding:5px 10px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text);font-size:var(--aus-fs-sm);cursor:pointer;">${showSynced ? '隐藏同步模型' : '显示同步模型'}</button>
      <button id="aus-clear-synced-models" style="padding:5px 10px;border:1px solid var(--ds-red-border);border-radius:999px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">移除全部同步模型</button>
    </div>`;
  const toggleBtn = doc.getElementById('aus-toggle-synced-models') as HTMLElement | null;
  if (toggleBtn) toggleBtn.onclick = () => {
    (state.settings as any).pricingSync.showSyncedModels = !showSynced;
    saveHot({ settings: state.settings });
    renderModelsEditor(doc);
  };
  const clearBtn = doc.getElementById('aus-clear-synced-models') as HTMLElement | null;
  if (clearBtn) {
    let armed = false;
    clearBtn.onclick = () => {
      if (!armed) {
        armed = true;
        clearBtn.textContent = '确认移除？再点一次';
        setTimeout(() => { armed = false; try { clearBtn.textContent = '移除全部同步模型'; } catch {} }, 4000);
        return;
      }
      const n = removeSyncedModels();
      renderModelsEditor(doc);
      fillDebugModelSelect(doc);
      void recalcCostsAndRefresh();
      if (n) toast('success', `已移除 ${n} 个同步模型价格`);
    };
  }
}

function modelRow(model: string, p: any, isBuiltin: boolean, usePeak: boolean, synced = false) {
  const cur = (()=>{ try{ return getDisplayCurrency(); } catch{ return {code:'CNY',symbol:'¥',rate:1} as any; } })();
  const toDisplay = (v:any)=> {
    if (v===''||v==null) return '';
    const num=parseFloat(String(v));
    if(!isFinite(num)) return String(v);
    const d = cur.code==='USD' ? num / cur.rate : num;
    return String(Math.round(d*10000)/10000);
  };
  const hit = (v: any) => v !== undefined && v !== '' ? toDisplay(v) : '';
  return `<div data-model="${esc(model)}" data-builtin="${isBuiltin ? '1':'0'}" data-synced="${synced ? '1':'0'}" style="border:1px solid var(--ds-border);border-radius:10px;padding:10px;background:var(--ds-card-inner);display:grid;gap:8px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <input value="${esc(model)}" ${isBuiltin ? 'readonly' : ''} style="flex:1;padding:6px 8px;border:1px solid var(--ds-border);border-radius:8px;background:${isBuiltin ? 'var(--ds-sidebar-bg)':'var(--ds-card-inner)'};font-size:var(--aus-fs-base);" />
      ${synced ? '<span title="来自 models.dev 自动同步" style="flex-shrink:0;padding:2px 8px;border-radius:999px;background:var(--ds-green-bg);color:var(--ds-green);font-size:var(--aus-fs-sm);font-weight:600;">已同步</span>' : ''}
      <label style="display:flex;align-items:center;gap:6px;font-size:var(--aus-fs-sm);color:var(--ds-text-2);cursor:pointer;"><input type="checkbox" class="aus-cm-peak" ${usePeak ? 'checked':''} /> 峰谷</label>
      ${isBuiltin ? '' : '<button data-del="1" style="padding:4px 8px;border:1px solid var(--ds-red-border);border-radius:6px;background:var(--ds-red-bg);color:var(--ds-red);font-size:var(--aus-fs-sm);cursor:pointer;">删除</button>'}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div style="background:var(--ds-sidebar-bg);border-radius:8px;padding:8px;display:grid;gap:6px;">
        <div style="font-size:var(--aus-fs-sm);font-weight:600;color:var(--ds-green);">非峰</div>
        ${field('offpeak.hit', hit(p.offpeak.hit))}${field('offpeak.miss', hit(p.offpeak.miss))}${field('offpeak.output', hit(p.offpeak.output))}
      </div>
      <div style="background:var(--ds-card-inner);border-radius:8px;padding:8px;display:grid;gap:6px;${usePeak ? '' : 'opacity:0.45;pointer-events:none;'}">
        <div style="font-size:var(--aus-fs-sm);font-weight:600;color:#D97706;">高峰</div>
        ${field('peak.hit', hit(p.peak.hit))}${field('peak.miss', hit(p.peak.miss))}${field('peak.output', hit(p.peak.output))}
      </div>
    </div>
    <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">单位：${cur.code}/百万 tokens（${cur.symbol}）· ${synced ? '同步模型：手动改价后转为自定义模型' : '内置模型不可删除，价格可覆盖'}</div>
  </div>`;
}
function field(key: string, val: any) {
  const label = key.endsWith('.hit') ? '命中' : key.endsWith('.miss') ? '未命中' : '输出';
  return `<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);width:44px;">${label}</span><input type="number" step="0.001" min="0" data-price="${key}" value="${esc(val)}" style="flex:1;padding:6px 8px;border:1px solid var(--ds-border);border-radius:8px;background:var(--ds-card-inner);font-size:var(--aus-fs-base);" /></div>`;
}
function readRow(row: HTMLElement) {
  const peak = (row.querySelector('.aus-cm-peak') as HTMLInputElement)?.checked ?? true;
  const out: any = { usePeakPricing: peak, offpeak: {}, peak: {} };
  const cur = (()=>{ try{ return getDisplayCurrency(); } catch{ return {code:'CNY',rate:1} as any; } })();
  row.querySelectorAll('input[data-price]').forEach((el: any) => {
    const k = el.getAttribute('data-price'); const v = el.value.trim();
    if (v === '') return;
    const num = parseFloat(v);
    if (isNaN(num as any)) return;
    const cny = cur.code==='USD' ? Math.round(num * cur.rate * 10000)/10000 : num;
    const [zone, field] = k.split('.');
    out[zone][field] = cny;
  });
  return out;
}
function upsertCustom(model: string, patch: any) {
  const cms: any[] = (state.settings as any).customModels;
  let found = cms.find((c: any) => c.model === model);
  if (found) { Object.assign(found, patch); delete found.synced; } // 手动调整即转为自定义模型，不再隐藏
  else cms.push({ model, usePeakPricing: patch.usePeakPricing, offpeak: {}, peak: {} });
}

/**
 * 清空全部自定义模型与覆盖价格（含 models.dev 同步项）。
 * 仅清空 settings.customModels —— 脚本内置的 PRICING / PRICE_HISTORY 完全不动，
 * 因此未外显模型（如已下架/旧键）以及过去/现在/未来的多段计价规则都照常生效。
 */
function clearAllCustomModels(): number {
  const cms: any[] = (state.settings as any).customModels || [];
  const n = cms.length;
  (state.settings as any).customModels = [];
  const ps: any = (state.settings as any).pricingSync;
  if (ps) ps.showSyncedModels = false;
  saveHot({ settings: state.settings });
  return n;
}
function saveCustomRow(model: string, prices: any, isBuiltin: boolean) {
  const base: any = (PRICING as any)[model];
  let same = true;
  for (const f of ['hit','miss','output']) {
    if (prices.offpeak[f] !== undefined && prices.offpeak[f] !== base?.offpeak?.[f]) same = false;
    if (prices.peak[f] !== undefined && prices.peak[f] !== base?.peak?.[f]) same = false;
  }
  const cms: any[] = (state.settings as any).customModels;
  const idx = cms.findIndex((c: any) => c.model === model);
  if (isBuiltin && prices.usePeakPricing && same) {
    if (idx !== -1) cms.splice(idx, 1);
  } else {
    // 手工改价即视为自定义模型：不带 synced 标记，保持可见
    const entry = { model, usePeakPricing: prices.usePeakPricing, offpeak: prices.offpeak, peak: prices.peak };
    if (idx !== -1) cms[idx] = entry; else cms.push(entry);
  }
  saveHot({ settings: state.settings }); void recalcCostsAndRefresh();
}
function getPricing(model: string) {
  const m = model || 'deepseek-flash';
  // 走统一计价入口：按 PRICE_HISTORY 当前命中段展示
  try { return resolvePricing(m, state.settings); } catch { return (PRICING as any)[m] || (PRICING as any)['deepseek-v4-flash']; }
}
function fillDebugModelSelect(doc: Document) {
  const sel = doc.getElementById('aus-debug-model') as HTMLSelectElement | null;
  if (!sel) return;
  const models = Object.keys(PRICING)
    .concat(((state.settings as any).customModels || []).filter((c: any) => !isSyncedCustomModel(c)).map((c: any) => c.model).filter(Boolean))
    .concat(repository.getWallets().flatMap((wallet) => wallet.models.map((model) => model.model)).filter(Boolean))
    .filter((m: string) => HIDDEN_PRICING_MODELS.indexOf(m) === -1);
  const uniq = Array.from(new Set(models));
  sel.innerHTML = uniq.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
  const cur = (state.settings as any).debugModel;
  if (uniq.indexOf(cur) === -1) {
    (state.settings as any).debugModel = uniq[0] || 'deepseek-flash';
    try { saveHot({ settings: state.settings }); } catch {}
  }
  sel.value = (state.settings as any).debugModel;
}
