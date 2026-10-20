/**
 * 设置页「存储占用」卡片渲染。
 *
 * 结构：标题行（标题 + 刷新按钮） → 合计数字 → 细分条目列表 → 浏览器配额（可缺失）→ 说明。
 * 细分行用 grid 两列（名称 / 数值），窄屏下名称自动换行，数值右对齐，不会撑破容器。
 */
import { icon } from './icons';
import { collectStorageReport, formatBytes, type StorageReport } from '../services/storage-usage';
import { getExtensionSettings } from '../store/persistence';

const MODULE = 'api_usage_stat';
/** 小于该体积的条目归入「其他」，避免十几个几十字节的小项把列表撑长 */
const SMALL_ITEM_BYTES = 1024;

function esc(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type RowOpts = {
  /** 明细行：左侧留白 + 浅底，表示归属于上方条目 */
  sub?: boolean;
  /** 可点击展开的聚合行 */
  toggle?: { id: string; expanded: boolean };
};

/** 单项行：名称 + 数值，数值用等宽数字避免跳动 */
function row(item: { label: string; bytes: number | null; detail?: string }, total: number, opts: RowOpts = {}) {
  const pctRaw = total > 0 && item.bytes != null ? (item.bytes / total) * 100 : null;
  // 明细行（「其他」展开出来的子项）都在 1KB 以下，占比必然显示为 0%，是纯噪音，不显示
  const showPct = pctRaw != null && !opts.sub && pctRaw >= 0.5;
  const pct = showPct ? Math.round(pctRaw) : null;
  // 提示文案里的数字用 <span> 包住，展开/收起时只改这个 span，避免把「5」一起改掉
  const detailHtml = item.detail && opts.toggle
    ? `<span data-others-count>${esc(item.detail)}</span>`
    : esc(item.detail || '');
  const sub = item.detail
    ? `<div ${opts.toggle ? 'data-others-hint' : ''} style="font-size:var(--aus-fs-xs);color:var(--ds-text-3);margin-top:2px;line-height:1.4;">${detailHtml}</div>`
    : '';
  // 明细行用淡化的文本色做 3% 底：深色下不会像 --ds-sidebar-bg 那样接近纯黑而突兀
  const indent = opts.sub ? 'padding-left:16px;background:color-mix(in srgb, var(--ds-text) 3%, transparent);' : '';
  // 注意：可点击行的交互样式必须合并进同一个 style 属性。
  // 之前写成两个 style，浏览器只认第一个，display:flex 失效导致右侧数值掉到行底部。
  const clickStyle = opts.toggle ? 'cursor:pointer;user-select:none;' : '';
  const clickable = opts.toggle
    ? ` id="${opts.toggle.id}" role="button" tabindex="0" aria-expanded="${opts.toggle.expanded}"`
    : '';
  return `<div class="aus-storage-row"${clickable} style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--ds-border);${indent}${clickStyle}">
    <div style="min-width:0;flex:1 1 auto;">
      <div class="aus-storage-row-label" style="font-size:var(--aus-fs-base);color:var(--ds-text);line-height:1.5;overflow-wrap:anywhere;">${esc(item.label)}</div>
      ${sub}
    </div>
    <div style="flex:0 0 auto;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;">
      <div style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">${formatBytes(item.bytes)}</div>
      ${pct != null ? `<div style="font-size:var(--aus-fs-xs);color:var(--ds-text-3);margin-top:2px;">${pct}%</div>` : ''}
    </div>
  </div>`;
}

export function renderStorageUsageCard(doc: Document): string {
  return `<div class="ds-card" id="aus-storage-card">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);">存储占用</span>
      <button id="aus-storage-refresh" title="重新统计" style="display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border:1px solid var(--ds-border);border-radius:999px;background:var(--ds-card-inner);color:var(--ds-text-2);font-size:var(--aus-fs-sm);cursor:pointer;line-height:1;">${icon('refresh', 13)}<span>刷新</span></button>
    </div>
    <div id="aus-storage-body" style="margin-top:6px;">
      <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);padding:10px 0;">正在统计…</div>
    </div>
  </div>`;
}

function bodyHtml(r: StorageReport): string {
  const parts: string[] = [];

  // 合计
  parts.push(`<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;padding-bottom:10px;">
    <span class="ds-card-val" style="font-size:clamp(20px,4.2cqi,26px);">${formatBytes(r.totalBytes)}</span>
    <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);">本扩展占用合计</span>
  </div>`);

  // 细分：大项直接展示，小于 1KB 的零碎小项合并为「其他」，点开可看明细
  if (r.items.length === 0) {
    parts.push(`<div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);padding:6px 0;">暂无数据</div>`);
  } else {
    const major = r.items.filter(i => (i.bytes ?? 0) >= SMALL_ITEM_BYTES);
    const minor = r.items.filter(i => (i.bytes ?? 0) < SMALL_ITEM_BYTES);
    const rows = major.map(i => row(i, r.totalBytes));
    if (minor.length) {
      const minorTotal = minor.reduce((a, i) => a + (i.bytes || 0), 0);
      rows.push(row(
        { label: '其他', bytes: minorTotal, detail: `${minor.length} 项小数据，点击展开` },
        r.totalBytes,
        { toggle: { id: 'aus-storage-others', expanded: false } },
      ));
      rows.push(`<div id="aus-storage-others-detail" style="display:none;">${minor.map(i => row(i, r.totalBytes, { sub: true })).join('')}</div>`);
    }
    parts.push(`<div>${rows.join('')}</div>`);
  }

  // 浏览器配额：仅在本扩展有数据时才展示，避免与用户无关
  if (r.globalAvailable && r.quotaBytes != null) {
    const usagePct = r.usageBytes != null && r.quotaBytes > 0 ? Math.min(100, (r.usageBytes / r.quotaBytes) * 100) : null;
    // 持久化状态不跟数值挤在一行：它读起来会像数字的一部分，挪到下方说明行
    const persistLabel = r.persisted == null ? '' : (r.persisted ? '已启用持久化存储' : '未申请持久化存储');
    parts.push(`<div style="margin-top:10px;padding:9px 11px;border-radius:10px;background:var(--ds-card-inner);border:1px solid var(--ds-border);">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <span style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);">浏览器站点用量</span>
        <span style="font-size:var(--aus-fs-sm);color:var(--ds-text);font-variant-numeric:tabular-nums;white-space:nowrap;">
          ${r.usageBytes != null ? formatBytes(r.usageBytes) : '—'} / ${formatBytes(r.quotaBytes)}
        </span>
      </div>
      ${usagePct != null ? `<div class="aus-storage-quota-bar" style="margin-top:7px;">
        <div class="aus-storage-quota-fill" style="width:${usagePct.toFixed(2)}%;"></div>
      </div>` : ''}
      <div style="font-size:var(--aus-fs-xs);color:var(--ds-text-3);margin-top:6px;line-height:1.5;">该数值由浏览器统计，包含酒馆与所有扩展的占用，本扩展只占其中一部分。${persistLabel ? `<span style="margin-left:4px;">${persistLabel}</span>` : ''}</div>
    </div>`);
  }

  // 说明
  parts.push(`<div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);margin-top:9px;line-height:1.6;">
    历史记录按最近 50 条保存在酒馆设置中，更早的进入浏览器 IndexedDB；设置为 UTF-8 估算体积，与实际落盘大小可能略有差异。
  </div>`);

  return parts.join('');
}

/** 统计并渲染到指定卡片。多次调用会取消上一次的过期结果 */
let renderSeq = 0;
export async function refreshStorageUsage(doc: Document): Promise<void> {
  const body = doc.getElementById('aus-storage-body');
  if (!body) return;
  const seq = ++renderSeq;
  const btn = doc.getElementById('aus-storage-refresh') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
  try {
    const ctx: any = (globalThis as any).SillyTavern?.getContext?.();
    const hot = ctx?.extensionSettings?.[MODULE] ?? getExtensionSettings();
    const report = await collectStorageReport({ doc, hotSettings: hot });
    if (seq !== renderSeq) return; // 已有更新的请求，丢弃本次
    body.innerHTML = bodyHtml(report);
    // 统计完成后才生成「其他」行，必须在这里重新绑定展开/收起（首次 bind 时元素还不存在）
    bindStorageUsageCard(doc);
  } catch (e: any) {
    if (seq === renderSeq) {
      body.innerHTML = `<div style="font-size:var(--aus-fs-sm);color:var(--ds-text-3);padding:8px 0;">统计失败：${esc(e?.message || '未知错误')}</div>`;
    }
  } finally {
    if (seq === renderSeq && btn) { btn.disabled = false; btn.style.opacity = ''; }
  }
}

/** 绑定刷新按钮 */
export function bindStorageUsageCard(doc: Document): void {
  const btn = doc.getElementById('aus-storage-refresh');
  if (btn) (btn as HTMLElement).onclick = () => { void refreshStorageUsage(doc); };

  // 「其他」行的展开/收起：键盘 Enter / Space 同样可用（与酒馆一致的无障碍处理）
  const toggle = doc.getElementById('aus-storage-others');
  const detail = doc.getElementById('aus-storage-others-detail');
  if (!toggle || !detail) return;
  const flip = () => {
    const open = detail.style.display !== 'none';
    detail.style.display = open ? 'none' : 'block';
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    // 只替换动作词，保留「项小数据」前面的数字
    const hint = toggle.querySelector('[data-others-hint] [data-others-count]') as HTMLElement | null;
    if (hint) hint.textContent = hint.textContent!.replace(open ? '点击收起' : '点击展开', open ? '点击展开' : '点击收起');
  };
  (toggle as HTMLElement).onclick = flip;
  (toggle as HTMLElement).onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
  };
}
