import { esc, localDay } from '../utils/date';
import { X_OPTIONS } from './chart-config';

type XKey = 'round'|'hour'|'day'|'week'|'month';
type TrendId = 'token'|'req';

const MODEL_COLORS = [
  '#0BA25E','#6366F1','#FF6A00','#10B981','#F59E0B','#8B5CF6',
  '#EF4444','#06B6D4','#84CC16','#E11D48','#0EA5E9','#F97316',
  '#14B8A6','#A855F7','#EAB308','#22C55E',
];

const state: Record<TrendId, { x: XKey }> = {
  token: { x: 'day' },
  req: { x: 'day' },
};

function getDoc(){ return (window.parent as any)?.document ?? document; }
function themeColor(name: string, fallback: string) {
  try {
    const doc = getDoc();
    const el = doc.getElementById('aus-panel') || doc.documentElement;
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fallback;
  } catch { return fallback; }
}

function bucketKey(ts:number, x:XKey, idx:number):string {
  if (x==='round') return `#${idx+1}`;
  if (x==='hour') { const d=new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`; }
  if (x==='day') return localDay(ts);
  if (x==='week') { const d=new Date(ts); const tmp=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const dayNum=tmp.getUTCDay()||7; tmp.setUTCDate(tmp.getUTCDate()+4-dayNum); const yearStart=new Date(Date.UTC(tmp.getUTCFullYear(),0,1)); const weekNo=Math.ceil((((tmp as any)-(yearStart as any))/86400000+1)/7); return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`; }
  if (x==='month') { const d=new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
  return localDay(ts);
}

async function getEcharts(){
  const ec:any = await import('echarts/core');
  const { LineChart } = await import('echarts/charts');
  const { GridComponent, TooltipComponent, LegendComponent } = await import('echarts/components');
  const { CanvasRenderer } = await import('echarts/renderers');
  ec.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);
  return ec;
}

const charts: Record<string, any> = {};
let lastFiltered: any[] = [];

export function renderModelTrends(filtered:any[]){
  lastFiltered = filtered || [];
  renderOne('token', filtered);
  renderOne('req', filtered);
}

async function renderOne(id:TrendId, filtered:any[]){
  try {
  const doc=getDoc();
  const el=doc.getElementById(`aus-chart-model-${id}`) as HTMLElement | null;
  if (!el) return;
  const xKey = state[id].x;

  if (!filtered.length){
    if (charts[id]) try{ charts[id].dispose(); }catch{} charts[id]=null;
    el.innerHTML='<div style="text-align:center;padding:40px;color:var(--ds-text-3);font-size:var(--aus-fs-sm);">暂无数据</div>';
    return;
  }

  // 收集模型列表（按出现顺序 + 字母序稳定）
  const modelSet = new Set<string>();
  for (const e of filtered) modelSet.add(e.model || 'unknown');
  const models = Array.from(modelSet).sort();
  const colorMap = new Map<string,string>();
  models.forEach((m,i)=> colorMap.set(m, MODEL_COLORS[i % MODEL_COLORS.length]));

  // 分桶
  let labels:string[] = [];
  let seriesData: Array<{name:string,data:number[],color:string}> = [];

  if (xKey==='round'){
    labels = filtered.map((_,i)=>`#${i+1}`);
    // round 时每点即每条记录，按模型在该点是否匹配赋值
    seriesData = models.map(m=>{
      const col = colorMap.get(m)!;
      const data = filtered.map(e=>{
        if ((e.model||'unknown')!==m) return 0;
        return id==='token' ? (e.total_tokens||0) : 1;
      });
      return { name:m, data, color:col };
    });
  } else {
    const buckets = new Map<string, any[]>();
    filtered.forEach((_, idx)=>{
      const e = filtered[idx];
      const key = bucketKey(e.timestamp, xKey, idx);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(e);
    });
    const sortedKeys = Array.from(buckets.keys()).sort();
    labels = sortedKeys.map(k=> xKey==='day'?k.slice(5).replace('-','/'):xKey==='hour'?k.slice(5):k);
    seriesData = models.map(m=>{
      const col = colorMap.get(m)!;
      const data = sortedKeys.map(key=>{
        const arr=buckets.get(key)!;
        let sum=0;
        for (const e of arr) if ((e.model||'unknown')===m) sum += id==='token' ? (e.total_tokens||0) : 1;
        return sum;
      });
      return { name:m, data, color:col };
    });
  }

  // 过滤全 0 系列在筛选为单模型时仍保留单系（above 已处理）
  const w = (el as HTMLElement).clientWidth;
  const h = (el as HTMLElement).clientHeight;
  if (w===0 || h===0){
    const statsView = doc.querySelector('[data-view="stats"]') as HTMLElement | null;
    const isHidden = statsView ? (statsView.style.display==='none' || (statsView as any).offsetParent===null) : false;
    if (isHidden) return;
    const tries=(renderOne as any)._retryCount||0;
    if (tries>=20){ el.innerHTML='<div style="text-align:center;padding:20px;color:var(--ds-text-3);font-size:var(--aus-fs-sm);">图表容器未就绪</div>'; return; }
    (renderOne as any)._retryCount=(tries+1);
    setTimeout(()=>renderOne(id, filtered),120);
    return;
  }
  (renderOne as any)._retryCount=0;

  const ec = await getEcharts();
  let c = charts[id];
  if (!c || (c as any).isDisposed?.()) {
    el.innerHTML=''; (el as any).style.height='220px';
    c = charts[id]=ec.init(el);
  }

  const cBorder = themeColor('--ds-border','#E5E7EB');
  const cCard = themeColor('--ds-card','#F6F7F8');
  const cText3 = themeColor('--ds-text-3','#9CA3AF');
  const cCardInner = themeColor('--ds-card-inner','#FFFFFF');
  const cText = themeColor('--ds-text','#111827');

  const cw = w || 320;
  const minPerLabel = cw < 500 ? 42 : cw < 760 ? 56 : 68;
  const maxLabels = Math.max(8, Math.floor(cw / minPerLabel));
  const xInterval = labels.length <= maxLabels ? 0 : Math.ceil(labels.length / maxLabels) - 1;
  const needZoom = labels.length > maxLabels;

  const legendTop = models.length > 4 ? 2 : 0;
  c.setOption({
    backgroundColor:'transparent',
    tooltip:{
      trigger:'axis',
      backgroundColor:cCardInner,
      borderColor:cBorder,
      borderWidth:1,
      textStyle:{ color:cText, fontSize: 12 },
      formatter:(params:any)=>{
        if (!params?.length) return '';
        const idx=params[0].dataIndex;
        const label=labels[idx];
        let sum=0; for(const p of params) sum+=Number(p.value||0);
        let html=`<div style="font-weight:600;margin-bottom:6px;">${esc(label)}<span style="margin-left:8px;color:var(--ds-text-2);font-weight:400;">合计 ${id==='token'? sum.toLocaleString()+' tokens' : sum+' 次'}</span></div>`;
        for(const p of params){
          if (Number(p.value)===0) continue;
          html+=`<div style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:8px;height:8px;background:${p.color};border-radius:2px;"></span>${esc(p.seriesName)}<span style="margin-left:auto;font-weight:600;">${id==='token' ? Number(p.value).toLocaleString()+' tokens' : p.value+' 次'}</span></div>`;
        }
        if (!params.some((p:any)=>Number(p.value)>0)) html+=`<div style="color:var(--ds-text-3);font-size:var(--aus-fs-sm);">本${xKey==='day'?'日':xKey==='hour'?'时段':xKey==='week'?'周':xKey==='month'?'月':'轮次'}无数据</div>`;
        return `<div style="padding:4px 2px;min-width:180px;max-width:280px;">${html}</div>`;
      }
    },
    legend:{
      top: legendTop,
      type:'scroll' as any,
      textStyle:{ fontSize: 12, color:cText3 },
      pageIconColor:cText3,
      pageTextStyle:{ color:cText3 },
      itemWidth:10, itemHeight:6,
    },
    grid:{ left:42, right:16, top: 22 + (models.length>4?8:0), bottom: 24 },
    dataZoom: needZoom ? [{ type:'inside', xAxisIndex:0, start: Math.max(0, (labels.length - maxLabels)/labels.length*100), end:100, zoomOnMouseWheel:false, moveOnMouseMove:true }] : undefined,
    xAxis:{ type:'category', data: labels, boundaryGap:false, axisLine:{lineStyle:{color:cBorder}}, axisLabel:{ color:cText3, fontSize: 12, interval: xInterval, rotate: labels.length>12?30:0, hideOverlap:false } },
    yAxis:{ type:'value', axisLabel:{ color:cText3, fontSize: 12, formatter:(v:number)=> id==='token' ? (v>=1000? (v/1000).toFixed(0)+'k' : String(v)) : String(v) }, splitLine:{lineStyle:{color:cCard}} },
    series: seriesData.map(s=>({
      name: s.name,
      type:'line',
      smooth:true,
      symbol:'none',
      lineStyle:{ width:1.5, color:s.color },
      itemStyle:{ color:s.color },
      areaStyle:{ color:s.color, opacity:0.18 },
      emphasis:{ focus:'series' },
      data: s.data,
    })),
  }, true);
  setTimeout(()=>{ try{ c.resize(); }catch{} }, 60);
  } catch(e:any){
    try{ const doc2=getDoc(); const el2=doc2.getElementById(`aus-chart-model-${id}`) as HTMLElement | null; if(el2) el2.innerHTML='<div style="text-align:center;padding:20px;color:#DC2626;font-size:var(--aus-fs-sm);">图表加载失败</div>'; }catch{}
    try{ console.error('[Api-Usage] renderModelTrends failed', id, e); }catch{}
  }
}

export function initModelTrends(){
  const doc=getDoc();
  for (const id of ['token','req'] as TrendId[]){
    const btn=doc.getElementById(`aus-modeltrends-x-${id}`);
    const drop=doc.getElementById(`aus-modeltrends-x-drop-${id}`);
    if (btn && drop){
      btn.onclick=()=>{
        drop.style.display = drop.style.display==='block'?'none':'block';
        if (drop.style.display==='block') renderXDrop(id);
      };
    }
  }
  doc.addEventListener('click', (e:any)=>{
    const t=e.target as HTMLElement;
    for (const id of ['token','req'] as TrendId[]){
      const btn=doc.getElementById(`aus-modeltrends-x-${id}`);
      const drop=doc.getElementById(`aus-modeltrends-x-drop-${id}`);
      if (btn && drop && !t.closest(`#aus-modeltrends-x-${id}`) && !t.closest(`#aus-modeltrends-x-drop-${id}`)) drop.style.display='none';
    }
  });
}

function renderXDrop(id:TrendId){
  const doc=getDoc();
  const drop=doc.getElementById(`aus-modeltrends-x-drop-${id}`);
  const label=doc.getElementById(`aus-modeltrends-x-label-${id}`);
  if (!drop) return;
  const cur = state[id].x;
  if (label) label.textContent = X_OPTIONS.find(o=>o.key===cur)?.label || cur;
  drop.innerHTML = X_OPTIONS.map(o=>{
    const active=o.key===cur;
    return `<div data-x="${o.key}" data-trend="${id}" style="padding:8px 10px;border-radius:8px;cursor:pointer;font-size:var(--aus-fs-base);${active?'background:var(--ds-card);font-weight:600;':''}">${o.label}</div>`;
  }).join('');
  drop.querySelectorAll('[data-x]').forEach((el:any)=>{
    el.onclick=()=>{
      const k=el.getAttribute('data-x') as XKey, tid=el.getAttribute('data-trend') as TrendId;
      state[tid].x = k;
      drop.style.display='none';
      renderXDrop(tid);
      renderOne(tid, lastFiltered);
    };
  });
}
