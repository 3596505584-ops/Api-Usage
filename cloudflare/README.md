# 匿名使用统计接收端（Cloudflare Worker + D1）

本目录是扩展「API用量统计」匿名使用统计的自建接收端与数据看板。整个方案只用 Cloudflare 免费额度：一个 Worker（接收上报、提供看板）+ 一个 D1 数据库（存聚合数据），不依赖任何第三方统计服务。

## 目录内容

| 文件 | 作用 |
| --- | --- |
| `worker.js` | Worker 入口：`POST /collect`、`GET /dashboard`、`GET /vendor/echarts.js`、`GET /api/summary`、`GET /api/trend`、`GET /health`，以及每月清理的定时任务 |
| `vendor/echarts.min.js` | 自托管图表库（ECharts 6.1.0 的 simple 构建，取自 `node_modules/echarts/dist/echarts.simple.min.js`），由 `/vendor/echarts.js` 同源提供 |
| `summary.js` | 看板聚合纯函数（日期基准、计数截断、时长分桶、渲染耗时估算、环境画像），`summary.test.js` 覆盖 |
| `payload.js` | 上报体白名单校验与数值钳制（纯函数，`payload.test.js` 覆盖） |
| `worker.test.js` | Worker 接口测试：鉴权、`/collect` 契约、总计/趋势口径、定时清理 |
| `schema.sql` | D1 建表脚本（`device` 设备维度汇总 + `device_daily` 逐设备日数据），新库直接执行 |
| `migrate-device-totals.sql` | 已有库的一次性迁移与回填脚本（新增累计列并用 `device_daily` 回填） |
| `migrate-backfill-device-totals.sql` | 只做累计列回填与校验（可安全重复执行），用于「列已存在」或需要重新回填时 |
| `wrangler.toml` | Worker 配置模板（D1 绑定、Cron、文本模块规则）；`database_id` 保持占位符，真实值放本地 `wrangler.local.toml` |
| `dashboard.html` | 看板页模板，作为文本模块打包进 Worker |

## 部署步骤

在仓库根目录（`cloudflare/` 的上一级）执行：

```bash
# 1. 登录 Cloudflare（浏览器授权一次）
npx wrangler login

# 2. 创建 D1 数据库，记下返回的 database_id
npx wrangler d1 create api_usage_stat

# 3. 生成本地部署配置（含账号私有信息，已在 .gitignore 中，切勿提交）
cp cloudflare/wrangler.toml cloudflare/wrangler.local.toml
#    并把 database_id 替换为上一步返回的真实值

# 4. 建表（新库）；已有库跳过这步，改跑下面的迁移脚本
npx wrangler d1 execute api_usage_stat --remote --file cloudflare/schema.sql

# 5. 设置看板访问口令（自定义一个足够长的随机串）
npx wrangler secret put DASHBOARD_TOKEN

# 6. 部署（使用本地配置，其中含真实 database_id）
cd cloudflare
npx wrangler deploy -c wrangler.local.toml
```

### 已有库升级（新增设备累计列）

看板的总计与画像依赖 `device` 表的累计列。若数据库是旧版本建的，先执行一次迁移，**再部署新版 Worker**：

```bash
npx wrangler d1 execute api_usage_stat --remote --file cloudflare/migrate-device-totals.sql
npx wrangler deploy -c cloudflare/wrangler.local.toml
```

- 迁移脚本一次完成三件事：A 加列、B 用 `device_daily` 整体回填、C 输出校验（`mismatch_rows` 应为 `0`）。
- Wrangler 执行 SQL 文件时遇到错误会中止整个文件。若 A 段报 `duplicate column name`（说明此前已加过列）或需要重新回填，请改跑 `cloudflare/migrate-backfill-device-totals.sql`——它只做回填与校验，可安全重复执行。
- 新库（第 4 步用 `schema.sql` 建的库）已包含全部列，不需要跑迁移。
- 顺序必须是「先回填、再部署」：新版 Worker 会把每次上报的增量累加进累计列，若先部署再回填，回填会整体覆盖累计值。
- 回填与部署之间的窗口（通常几分钟）内的上报不会计入累计列，建议在低活跃时段执行；`device_daily` 明细不受影响（趋势与当日数据照常统计）。

> 仓库内的 `wrangler.toml` 只保留占位符，请不要把真实的 `database_id`、账号 ID、API Token 等信息写进任何被提交的文件；`wrangler.local.toml` 与 `.dev.vars` 已在 `.gitignore` 中忽略。

部署成功后会输出访问地址：

- 未绑自定义域名时是 `https://api-usage-stat.<你的子域>.workers.dev`；**推荐同时绑定自有域名**（本仓库当前部署使用 `https://stat.janmk.us.ci`），原因见下文「大陆用户无法上报」。
- 看板：`<地址>/dashboard`（浏览器会弹出用户名/口令框，用户名任意，口令填上面设置的令牌）
- 上报端点：`<地址>/collect`

## 接入客户端

把上报端点写进扩展常量并重新构建：

1. 打开 `src/services/telemetry.ts`，把 `TELEMETRY_ENDPOINT` 改为你的 `/collect` 地址；
2. 在仓库根目录执行 `npm run build`，提交构建产物（`index.js` 与随之更新的分包）；
3. 扩展内「设置 → 匿名使用统计」应显示"已开启：成功上报 N 次"；此前显示"未配置上报端点"是预期行为（占位符不会发任何请求）。

## 看板

看板分五个分区，自上而下：

| 分区 | 内容 |
| --- | --- |
| 总计速览 | 不重复累计用户、累计打开面板、累计使用时长、人均使用时长；当日新增用户 / 打开 / 时长 / 不重复用户（按北京时间） |
| 增长与活跃趋势 | 累计用户趋势、每日打开面板次数、每日不重复用户数、每日面板打开占比（8 条线，按面板固定配色） |
| 面板使用构成 | 各面板全部时间累计打开次数（横向长条） |
| 用户与设备画像 | 扩展版本分布、CPU 架构饼图、操作系统饼图、浏览器 / 浏览器主版本 / 语言 / 宽度分桶 / 深浅色 / 显示形态 / 指针类型 / 时区（横向长条） |
| 使用时长与渲染性能 | 每设备累计使用时长分布（直方图）、按扩展版本区分的渲染耗时（横向长条） |

交互与口径：

- **每个趋势图有独立的时间控件**（30 / 90 / 365 天预设 + 自定义起止日期），默认最近 30 天，最长 730 天（与数据保留期一致）；总计类指标固定为全时段累计，不随时间控件变化。
- 「人均使用时长」= 累计使用时长 ÷ 不重复累计用户数。
- 「当日」按北京时间（UTC+8）计算，与多数用户客户端上报的本地日期一致。
- 环境维度取**每台设备最近一次上报的状态**（浏览器、系统、架构、语言、宽度、深浅色、独立窗口、触屏、时区都是设备维度去重值，一台设备只计一次）。
- 「当日新增用户」按设备首次出现的日期统计；历史设备的首次日期在迁移时用 `device_daily` 回填。
- 「当日不重复用户」= 当日在 `device_daily` 产生过数据的去重设备数（日活），老设备当天打开也计入；与「当日新增用户」（仅首次出现）互补。字段为 `/api/summary` 的 `totals.todayActiveUsers`。
- 渲染耗时由客户端 5 档（<100 / <300 / <800 / <2000 / ≥2000ms）按代表值 50 / 200 / 550 / 1400 / 3000ms 估算平均耗时，长条长度偏保守，用于版本间横向对比，不能当作精确 P50/P95。
- 使用时长分布按每台设备的累计时长分桶（未记录 / <1 分钟 / <10 分钟 / <30 分钟 / <1 小时 / <3 小时 / <10 小时 / <30 小时 / ≥30 小时）。

### 缓存与刷新

- `/api/summary` 与 `/api/trend` 默认走 Cloudflare Cache API 缓存 **600 秒**，响应头 `X-Cache: HIT|MISS|BYPASS` 标明本次来源。
- 看板右上角「刷新」按钮使用 `?force=1` 绕过缓存重新查询并回填缓存，页面顶部显示数据生成时间。
- 图表库 ECharts（固定 `6.1.0`）分两级加载：① **并发竞速**——Worker 同源自托管的 `GET /vendor/echarts.js`（返回 `cloudflare/vendor/echarts.min.js`，浏览器 brotli 压缩后约 380 KiB、缓存 24 小时）与 `registry.npmmirror.com` 同时开始，**先成功者胜出**；② 竞速都失败后再顺序尝试 `cdn.jsdelivr.net` → `unpkg.com`（单个来源 10 秒超时）。之所以竞速而不是固定顺序：不同网络拦截策略不同（有的挡第三方域名，有的会中断大响应），竞速能保证「只要有一条通就能画图」，总等待时间约等于最快来源。
- 看板页头会显示实际生效的来源徽标（`图表库：自托管 / npmmirror / jsdelivr / unpkg`）；若全部失败，顶部横幅会直接列出每个来源的尝试结果（成功/失败 + 耗时），可据此判断是网络拦截还是浏览器扩展屏蔽脚本。
- 页头「数据生成于 … · 看板构建 `2026-10-11.2`」里的构建标识用于确认浏览器拿到的是否为最新页面；改动看板后请同步更新 `dashboard.html` 中的 `BUILD_ID`。
- 若某个来源超时判负、但脚本随后仍下载并执行成功，看板会自动检测到（每 1.5 秒回看一次 `window.echarts`，最多 90 秒）并补画图表、收起失败提示，页头来源徽标显示「迟到加载」——不会出现「图表已经画出来、横幅还提示失败」的矛盾状态。
- 自托管文件用的是 ECharts **simple 构建**（含折线/柱状/饼图与 tooltip/legend/grid，500 KiB，brotli 后约 170 KiB，比全量构建小一半多）。升级时把 `node_modules/echarts/dist/echarts.simple.min.js` 覆盖到 `cloudflare/vendor/echarts.min.js`，同步 `dashboard.html` 里的 `?v=` 查询串与 CDN 兜底版本号，再重新部署（当前 Worker 约 560 KiB / gzip 188 KiB，仍在免费额度内）。

## 接口

| 接口 | 说明 |
| --- | --- |
| `POST /collect` | 接收匿名上报，返回 `204`；请求体契约与旧版完全一致（扩展端无需改动） |
| `GET /api/summary` | 总计、当日、累计用户序列、面板累计、版本分布、环境画像、时长直方图；支持 `?force=1` |
| `GET /api/trend?from=YYYY-MM-DD&to=YYYY-MM-DD&parts=daily\|render\|both` | 每日趋势（不重复用户 / 打开次数 / 使用时长 / 面板明细）与按版本渲染耗时；支持 `?force=1` |
| `GET /vendor/echarts.js` | 自托管图表库（公开、无需口令，仅返回 ECharts 静态文件） |
| `GET /dashboard` | 口令保护的看板页 |
| `GET /health` | 健康检查，无需口令 |

除 `/collect` 与 `/health` 外都需要 HTTP Basic 口令（用户名任意，口令为 `DASHBOARD_TOKEN`）。

## 本地调试

```bash
cd cloudflare
npx wrangler d1 execute api_usage_stat --local --file schema.sql          # 建本地库
npx wrangler d1 execute api_usage_stat --local --file migrate-device-totals.sql  # 演练迁移（可选）
npx wrangler dev --local -c wrangler.local.toml                           # 默认 http://127.0.0.1:8787
```

本地调试时可以把 `TELEMETRY_ENDPOINT` 临时指向本地地址（或直接用 curl 手工发上报体）：

```bash
curl -i -X POST http://127.0.0.1:8787/collect \
  -H 'Content-Type: text/plain;charset=UTF-8' \
  --data '{"v":1,"id":"0123456789abcdef0123456789abcdef","seq":1,"day":"2026-10-10","tz":8,"app":"3.1.1","env":{"b":"Chrome","bv":"141","os":"Windows","arch":"x86_64","lang":"zh-CN","w":"gt1024","dark":false,"standalone":false,"touch":false},"s":{"opens":1,"dur_ms":60000,"pages":{"overview":2,"stats":0,"history":0,"forecast":0,"wallet":0,"settings":0,"help":0,"about":0},"render":[1,0,0,0,0]},"daily":true}'

# 看板接口（口令任意用户名 + DASHBOARD_TOKEN）
curl -u 'user:你的口令' 'http://127.0.0.1:8787/api/summary'
curl -u 'user:你的口令' 'http://127.0.0.1:8787/api/trend?parts=both'
curl -u 'user:你的口令' 'http://127.0.0.1:8787/api/summary?force=1'
```

单元测试（含看板聚合与 Worker 接口契约，不需要网络）：

```bash
npm test          # 覆盖 cloudflare/*.test.js 与 src/**/*.test.ts
```

## 免费额度与省额度设计

Cloudflare 免费额度（2026 年 4 月官方文档）：Workers **10 万请求/天**；D1 **读 500 万行/天、写 10 万行/天、存储 5 GB**。本方案在几个环节做了压缩：

| 环节 | 做法 | 效果 |
| --- | --- | --- |
| 请求次数 | 客户端在会话内只累加，关闭面板/页面隐藏时才合并上报 | 每设备每天通常 1~3 个请求 |
| CORS | 上报体用 `text/plain` 简单请求 + `sendBeacon` | 不触发 OPTIONS 预检，一次上报只算 1 个请求 |
| 写入行数 | `device` 每次有效上报 1 行（累计列增量累加）+ `device_daily` 1 行 | 每次上报 2 行写，重复上报 0 行 |
| 幂等 | `device.last_seq < seq` 与 `device_daily.last_seq < seq` 双重判据 | 重发/重复提交不重复计数、不重复累加 |
| 读取行数 | 总计与画像走 `device` 表一次全表读（行数 = 设备数）；趋势按 `day` 索引范围扫描（行数 = 天数 × 日活） | 单次冷加载 ≈ 设备数 + 日活 + 2 × 天数 × 日活 |
| 缓存 | `/api/summary` 与 `/api/trend` 走 Cache API 600 秒 | 重复查看、切换范围都不会重复扫表；「刷新」按钮才强制重查 |
| 保留期 | 每月 1 号清理超过 730 天的逐设备日数据（设备维度汇总长期保留） | 长期占用远低于 5 GB |

读量估算：日活 5000、累计设备 2 万、趋势窗口 30 天时，单次冷加载约 `2 万 + 0.5 万 + 2 × 15 万 ≈ 33 万行`，配合 10 分钟缓存远低于 500 万行/天。若日后 30 天窗口的单次读行数逼近 100 万，可再加一层按日汇总表（本期未做）。

写量估算：日活 1 万台、每台每天上报 1 次时约 1 万次上报 → 2 万行写，远低于 10 万行/天。

## 隐私边界

采集字段严格限定为：匿名随机标识、上报序号、客户端本地日期、时区偏移、扩展版本、浏览器名与主版本、操作系统、CPU 架构、语言、窄屏分桶、深色偏好、standalone、触屏标记、8 个页面使用次数、打开面板次数、会话时长、面板渲染耗时分桶。

服务端存储：

- `device`：每台匿名设备一行，保存最近一次上报的环境状态与去标识化的累计计数（累计打开次数、累计使用时长、各面板累计次数、首次出现日期、最近序号）；这些累计值由同一份白名单上报数据累加得到，不新增任何采集字段。
- `device_daily`：每台设备每天一行，保存当天分桶与计数，730 天后自动清理。

不采集、不存库的内容包括：IP 地址、User-Agent 原文、对话名称或内容、模型名、密钥信息、余额与费用、接口地址、历史条数、精确屏幕分辨率。Worker 只把校验后的白名单字段写入 D1，原始请求体不做持久化，也不开启访问日志。

## 运维

```bash
# 看最近 7 天的整体情况
npx wrangler d1 execute api_usage_stat --remote --command \
  "SELECT day, COUNT(*) AS devices, SUM(opens) AS opens FROM device_daily WHERE day >= date('now','-7 day') GROUP BY day ORDER BY day"

# 查看某天的页面使用率
npx wrangler d1 execute api_usage_stat --remote --command \
  "SELECT SUM(p_overview) overview, SUM(p_stats) stats, SUM(p_history) history, SUM(p_forecast) forecast, SUM(p_wallet) wallet, SUM(p_settings) settings, SUM(p_help) help, SUM(p_about) about FROM device_daily WHERE day = date('now')"

# 校验设备累计列与逐设备日数据是否一致（迁移或排查时使用）
npx wrangler d1 execute api_usage_stat --remote --command \
  "SELECT COUNT(*) AS mismatch FROM device d JOIN (SELECT device_id, SUM(opens) o, SUM(dur_ms) m FROM device_daily GROUP BY device_id) a ON a.device_id = d.device_id WHERE d.opens_total <> a.o OR d.dur_ms_total <> a.m"

# 手动清理超过保留期的数据（正常由定时任务完成）
npx wrangler d1 execute api_usage_stat --remote --command \
  "DELETE FROM device_daily WHERE day < date('now','-730 day')"

# 用户要求删除其数据（需要对方提供设置页显示的匿名标识前 8 位）
npx wrangler d1 execute api_usage_stat --remote --command \
  "DELETE FROM device_daily WHERE device_id LIKE 'xxxxxxxx%'; DELETE FROM device WHERE device_id LIKE 'xxxxxxxx%'"
```

## 常见问题

- **大陆用户无法上报**：`*.workers.dev` 在大陆被定点阻断（DNS 污染 + SNI 阻断，实测换子域无效，而 Cloudflare 边缘自身可达），只用 workers.dev 时只有挂代理的客户端能上报。**推荐给 Worker 绑定自有域名**（本仓库当前部署使用 `stat.janmk.us.ci`），把域名的 NS 托管到 Cloudflare 后按下面配置：

  ```toml
  [[routes]]
  pattern = "stat.你的域名"
  custom_domain = true
  ```

  再执行 `npx wrangler deploy`，并把 `src/services/telemetry.ts` 的 `TELEMETRY_ENDPOINT` 换成 `https://stat.你的域名/collect` 后重新构建。
- **看板 401**：未设置 `DASHBOARD_TOKEN`，或浏览器缓存了错误口令；重新 `npx wrangler secret put DASHBOARD_TOKEN` 后换浏览器隐私窗口访问。
- **看板数字比预期略旧**：接口默认缓存 10 分钟，页面顶部显示数据生成时间；点「刷新」按钮会 `?force=1` 强制取最新数据。
- **看板图表不显示，顶部出现提示**：ECharts CDN 被网络拦截，可点提示里的「重试加载图表库」；此时的数值列表同样完整可用。
- **看板只有文本列表、没有图表**：先强制刷新一次（`Ctrl+Shift+R`），再看顶部横幅里列出的每个来源结果——它会直接告诉你哪个源失败、耗时多少。常见原因是浏览器扩展（广告拦截类）屏蔽了脚本请求，或本地网络对目标域名做了拦截；自托管源可用 `curl -I https://你的域名/vendor/echarts.js` 单独确认（应为 `200` 且 `Content-Type: text/javascript`）。
- **更新看板后浏览器仍是旧版**：看页头「看板构建」标识是否变化；`/dashboard` 响应为 `no-store` 不会缓存，旧页面通常只是没有刷新。
- **迁移脚本报 `duplicate column name`**：说明这些列此前已经加过，改跑 `cloudflare/migrate-backfill-device-totals.sql`（只做回填与校验、可重复执行）即可，不必再加列。
- **想重新计算累计列**：同样跑 `cloudflare/migrate-backfill-device-totals.sql`；它会把累计列整体重算为 `device_daily` 的汇总值，因此请在部署新版 Worker 之前执行（否则会覆盖上线后累加进去的增量）。
- **当日数据看起来比「昨天」少**：趋势图按客户端本地日期（`day`）归集，而「当日新增」按北京时间计算；跨时区用户在 0 点~8 点之间的上报可能归到前一天，属预期现象。
- **设置页一直显示"未配置上报端点"**：`TELEMETRY_ENDPOINT` 仍是占位符，按上文「接入客户端」修改后重新构建。
- **上报返回 400**：上报体被校验拒绝（字段非法、日期超出窗口、体长超过 4 KB），可先用上面的 curl 示例确认端点本身可用。
