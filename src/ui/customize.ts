import { state } from '../store/index';
import { saveHot } from '../store/persistence';

function getDoc(): Document { return (window.parent as any)?.document ?? document; }

export function renderCustomizer() {
  const doc = getDoc();
  const host = doc.getElementById('aus-customizer');
  if (!host) return;
  // 简化：仅提供“更多指标”折叠，默认全展开，与脚本 statsVisibility 对应
  const allKeys = ['总消耗','加权命中率','平均每轮','预计节省','输入费用','输出费用','总 Tokens','命中 Tokens','未命中 Tokens','对话轮数','单轮最大','单轮最小','最新命中率','平均输入','平均输出','平均耗时','平均速率','思维链'];
  host.innerHTML = `
    <details style="background:var(--ds-card);border-radius:10px;padding:10px 12px;">
      <summary style="font-size:var(--aus-fs-base);font-weight:600;color:var(--ds-text);cursor:pointer;list-style:none;">显示设置（${allKeys.length} 项）</summary>
      <div style="font-size:var(--aus-fs-sm);color:var(--ds-text-2);margin-top:8px;">后续可按需显隐，当前已按脚本 1:1 全部展示。对齐 DeepSeek 浅色卡，无删减。</div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
        ${allKeys.map(k => `<span style="padding:4px 8px;background:var(--ds-card-inner);border:1px solid var(--ds-border);border-radius:999px;font-size:var(--aus-fs-sm);color:var(--ds-text);">${k}</span>`).join('')}
      </div>
    </details>
  `;
}
