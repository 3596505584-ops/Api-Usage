// 热力图 — GitHub 贡献风格，统计 token 用量，复刻原脚本效果
import { localDay } from '../utils/date';

function getDoc(): Document { return (window.parent as any)?.document ?? document; }

function themeIsDark(): boolean {
  try {
    const doc = getDoc();
    const p = doc.getElementById('aus-panel');
    return p?.getAttribute('data-ds-theme') === 'dark';
  } catch { return false; }
}

export function renderHeatmap(filtered: any[]) {
  const doc = getDoc();
  // 兼容：优先概览页容器（当前主位），回退统计页旧容器
  const container = (doc.getElementById('aus-heatmap-container-overview') || doc.getElementById('aus-heatmap-container')) as HTMLElement | null;
  const legendEl = (doc.getElementById('aus-heatmap-legend-overview') || doc.getElementById('aus-heatmap-legend')) as HTMLElement | null;
  const labelsEl = (doc.getElementById('aus-heatmap-labels-overview') || doc.getElementById('aus-heatmap-labels')) as HTMLElement | null;
  const scrollEl = (doc.getElementById('aus-heatmap-scroll-overview') || doc.getElementById('aus-heatmap-scroll')) as HTMLElement | null;
  if (!container) return;

  if (!filtered || filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ds-text-3);font-size:var(--aus-fs-base)">暂无数据</div>';
    if (legendEl) legendEl.innerHTML = '';
    if (labelsEl) labelsEl.innerHTML = '';
    return;
  }

  // 按日聚合 token
  const dayMap: Record<string, number> = {};
  for (const h of filtered) {
    const k = localDay(h.timestamp);
    dayMap[k] = (dayMap[k] || 0) + (h.total_tokens || 0);
  }
  const keys = Object.keys(dayMap).sort();
  const isDark = themeIsDark();

  // 时间范围：近 2 年（本地时区）
  const now = new Date();
  const endStr = localDay(now.getTime());
  const endDate = new Date(endStr + 'T00:00:00');
  let startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - 2);
  if (keys.length > 0) {
    const earliest = new Date(keys[0] + 'T00:00:00');
    if (earliest < startDate) startDate = earliest;
  }
  const sd = startDate.getDay();
  startDate.setDate(startDate.getDate() + (sd === 0 ? -6 : 1 - sd));
  const ed = endDate.getDay();
  endDate.setDate(endDate.getDate() + (ed === 0 ? 0 : 7 - ed));
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
  const totalWeeks = Math.ceil(totalDays / 7);

  // 分位计算阈值
  const vals: number[] = [];
  for (const k in dayMap) if (dayMap[k] > 0) vals.push(dayMap[k]);
  vals.sort((a, b) => a - b);
  const pct = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const idx = Math.ceil(arr.length * p / 100) - 1;
    return arr[Math.max(0, Math.min(idx, arr.length - 1))];
  };
  let p25 = pct(vals, 25), p50 = pct(vals, 50), p75 = pct(vals, 75);
  if (p25 === 0 && p50 === 0 && p75 === 0) { p25 = 1; p50 = 1000; p75 = 10000; }
  else if (p25 === p50 && p50 === p75) { p25 = Math.max(1, Math.floor(p50 / 2)); p75 = p50 * 2; }
  const getLevel = (t: number) => {
    if (t <= 0) return 0;
    if (t <= p25) return 1;
    if (t <= p50) return 2;
    if (t <= p75) return 3;
    return 4;
  };

  // 颜色：深色用原脚本绿阶，浅色用更柔和绿阶+浅灰底
  const colorsDark = ['#161b22', '#0d3b20', '#1a7f37', '#3fb950', '#aceebb'];
  const colorsLight = ['#EBEDF0', '#9BE9A8', '#40C463', '#30A14E', '#216E39'];
  const clr = isDark ? colorsDark : colorsLight;
  const borderClr = isDark ? '#1f2937' : '#E5E7EB';

  const mn = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const dl = ['周一','','周三','','周五','','周日'];
  const cs = 12; // 单元格尺寸

  // 左侧星期标签
  if (labelsEl) {
    let lhtml = '<div style="display:flex;flex-direction:column">';
    lhtml += '<div style="height:16px;width:28px;"></div>';
    for (let d = 0; d < 7; d++) {
      const lh = cs + 2;
      lhtml += '<div style="height:' + lh + 'px;width:28px;padding:0 4px 0 0;line-height:' + lh + 'px;font-size:var(--aus-fs-xs);color:var(--ds-text-3);text-align:right;box-sizing:border-box">' + (d % 2 === 0 ? dl[d] : '') + '</div>';
    }
    lhtml += '</div>';
    labelsEl.innerHTML = lhtml;
  }

  let html = '<table style="border-collapse:collapse;font-size:var(--aus-fs-sm);color:var(--ds-text-3)"><tr><td style="height:16px;padding:0;line-height:16px"></td>';
  let lastM = -1;
  for (let w = 0; w < totalWeeks; w++) {
    const ws = new Date(startDate); ws.setDate(startDate.getDate() + w * 7);
    const mk = ws.getFullYear() * 12 + ws.getMonth();
    if (mk !== lastM) {
      let span = 1;
      for (let w2 = w + 1; w2 < totalWeeks; w2++) {
        const ws2 = new Date(startDate); ws2.setDate(startDate.getDate() + w2 * 7);
        if (ws2.getFullYear() * 12 + ws2.getMonth() === mk) span++; else break;
      }
      let label = mn[ws.getMonth()];
      if (ws.getMonth() === 0) label = ws.getFullYear() + '年';
      html += '<td colspan="' + span + '" style="padding:0 0 0 2px;line-height:16px;height:16px;font-size:var(--aus-fs-sm);color:var(--ds-text-3);white-space:nowrap">' + label + '</td>';
      lastM = mk;
    }
  }
  html += '</tr>';
  for (let d = 0; d < 7; d++) {
    html += '<tr>';
    for (let w = 0; w < totalWeeks; w++) {
      const cd = new Date(startDate); cd.setDate(startDate.getDate() + w * 7 + d);
      const key = localDay(cd.getTime());
      const t = dayMap[key] || 0;
      const lv = getLevel(t);
      const tip = cd.getFullYear() + '年' + (cd.getMonth() + 1) + '月' + cd.getDate() + '日' + (t > 0 ? ' · ' + t.toLocaleString() + ' Token' : ' · 无记录');
      html += '<td style="padding:1px;line-height:0;font-size:0"><div style="width:' + cs + 'px;height:' + cs + 'px;border-radius:2px;background:' + clr[lv] + ';border:1px solid ' + borderClr + ';cursor:pointer;box-sizing:border-box;" title="' + tip + '"></div></td>';
    }
    html += '</tr>';
  }
  html += '</table>';
  container.innerHTML = html;

  if (legendEl) {
    let lhtml = '更少 ';
    for (let i = 0; i < 5; i++) {
      lhtml += '<span style="display:inline-block;width:11px;height:11px;border-radius:2px;background:' + clr[i] + ';border:1px solid ' + borderClr + ';vertical-align:middle;margin:0 0 0 3px"></span>';
    }
    lhtml += ' 更多';
    legendEl.innerHTML = lhtml;
  }

  // 滚动到最右（最近）
  setTimeout(() => { if (scrollEl) scrollEl.scrollLeft = scrollEl.scrollWidth; }, 50);
}
