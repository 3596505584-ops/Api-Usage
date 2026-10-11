-- API用量统计 · 匿名使用统计：device 表累计列迁移（一次性执行）
--
-- 用途：把已有库的 device 表补齐累计列，并用 device_daily 的历史数据回填，
--       使看板的总计、环境画像、版本分布与时长分布只需一次设备表全表读。
--
-- 执行（仓库根目录）：
--   npx wrangler d1 execute api_usage_stat --remote --file cloudflare/migrate-device-totals.sql
-- 本地演练：
--   npx wrangler d1 execute api_usage_stat --local --file cloudflare/migrate-device-totals.sql
--
-- 执行顺序建议：先跑本脚本，再部署新版 Worker。
-- 原因：新版 Worker 会在每次上报时把增量写进这些累计列；若先部署再回填，
--       回填会整体覆盖累计列，因此推荐「先回填 → 再部署」，切换窗口内（几分钟）
--       的增量会漏计，建议在低活跃时段执行。
--
-- 重复执行说明：Wrangler 执行 SQL 文件时遇到错误会中止整个文件，因此本脚本按
--       A 段（加列）→ B 段（回填）→ C 段（校验）一次性完成。
--       若 A 段报 `duplicate column name`（列已存在，说明之前加过列），
--       请改跑 `cloudflare/migrate-backfill-device-totals.sql`：
--       那个文件只做回填与校验，可安全重复执行。

-- ============ A 段：新增列（新建库可跳过，schema.sql 已包含） ============
ALTER TABLE device ADD COLUMN first_day TEXT;
ALTER TABLE device ADD COLUMN last_seq INTEGER NOT NULL DEFAULT 0;
ALTER TABLE device ADD COLUMN opens_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE device ADD COLUMN dur_ms_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE device ADD COLUMN p_overview_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE device ADD COLUMN p_stats_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE device ADD COLUMN p_history_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE device ADD COLUMN p_forecast_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE device ADD COLUMN p_wallet_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE device ADD COLUMN p_settings_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE device ADD COLUMN p_help_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE device ADD COLUMN p_about_total INTEGER NOT NULL DEFAULT 0;

-- ============ B 段：用 device_daily 回填（整体重算，可重复执行） ============
DROP TABLE IF EXISTS device_totals_backfill;
CREATE TABLE device_totals_backfill AS
SELECT
  device_id,
  MIN(day) AS min_day,
  MAX(last_seq) AS max_seq,
  SUM(opens) AS opens,
  SUM(dur_ms) AS dur_ms,
  SUM(p_overview) AS p_overview,
  SUM(p_stats) AS p_stats,
  SUM(p_history) AS p_history,
  SUM(p_forecast) AS p_forecast,
  SUM(p_wallet) AS p_wallet,
  SUM(p_settings) AS p_settings,
  SUM(p_help) AS p_help,
  SUM(p_about) AS p_about
FROM device_daily
GROUP BY device_id;

UPDATE device SET
  first_day = COALESCE(
    first_day,
    (SELECT b.min_day FROM device_totals_backfill b WHERE b.device_id = device.device_id)
  ),
  last_seq = COALESCE(
    (SELECT b.max_seq FROM device_totals_backfill b WHERE b.device_id = device.device_id),
    0
  ),
  opens_total = COALESCE(
    (SELECT b.opens FROM device_totals_backfill b WHERE b.device_id = device.device_id),
    0
  ),
  dur_ms_total = COALESCE(
    (SELECT b.dur_ms FROM device_totals_backfill b WHERE b.device_id = device.device_id),
    0
  ),
  p_overview_total = COALESCE(
    (SELECT b.p_overview FROM device_totals_backfill b WHERE b.device_id = device.device_id),
    0
  ),
  p_stats_total = COALESCE(
    (SELECT b.p_stats FROM device_totals_backfill b WHERE b.device_id = device.device_id),
    0
  ),
  p_history_total = COALESCE(
    (SELECT b.p_history FROM device_totals_backfill b WHERE b.device_id = device.device_id),
    0
  ),
  p_forecast_total = COALESCE(
    (SELECT b.p_forecast FROM device_totals_backfill b WHERE b.device_id = device.device_id),
    0
  ),
  p_wallet_total = COALESCE(
    (SELECT b.p_wallet FROM device_totals_backfill b WHERE b.device_id = device.device_id),
    0
  ),
  p_settings_total = COALESCE(
    (SELECT b.p_settings FROM device_totals_backfill b WHERE b.device_id = device.device_id),
    0
  ),
  p_help_total = COALESCE(
    (SELECT b.p_help FROM device_totals_backfill b WHERE b.device_id = device.device_id),
    0
  ),
  p_about_total = COALESCE(
    (SELECT b.p_about FROM device_totals_backfill b WHERE b.device_id = device.device_id),
    0
  )
WHERE device_id IN (SELECT device_id FROM device_totals_backfill);

-- ============ C 段：校验（mismatch 应为 0） ============
SELECT
  (SELECT COUNT(*) FROM device) AS device_rows,
  (SELECT COUNT(*) FROM device_totals_backfill) AS device_rows_with_daily,
  (SELECT COUNT(*) FROM device d JOIN device_totals_backfill b ON b.device_id = d.device_id
     WHERE d.opens_total <> b.opens
        OR d.dur_ms_total <> b.dur_ms
        OR d.p_overview_total <> b.p_overview
        OR d.p_stats_total <> b.p_stats
        OR d.p_history_total <> b.p_history
        OR d.p_forecast_total <> b.p_forecast
        OR d.p_wallet_total <> b.p_wallet
        OR d.p_settings_total <> b.p_settings
        OR d.p_help_total <> b.p_help
        OR d.p_about_total <> b.p_about) AS mismatch_rows;

DROP TABLE IF EXISTS device_totals_backfill;
