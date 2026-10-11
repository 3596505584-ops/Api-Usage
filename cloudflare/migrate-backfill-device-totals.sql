-- API用量统计 · 匿名使用统计：device 累计列回填（可安全重复执行）
--
-- 用途：只用 device_daily 的历史数据整体重算 device 表的累计列，不新增列。
--       适用于两种情况：
--       1) 已经执行过 migrate-device-totals.sql 的 A 段（加列）后需要重新回填；
--       2) 主脚本在 A 段报 `duplicate column name` 中止（列已存在）时，改跑本脚本。
--
-- 执行（仓库根目录）：
--   npx wrangler d1 execute api_usage_stat --remote --file cloudflare/migrate-backfill-device-totals.sql
-- 本地演练：
--   npx wrangler d1 execute api_usage_stat --local --file cloudflare/migrate-backfill-device-totals.sql
--
-- 注意：本脚本会整体覆盖累计列（等于 device_daily 的汇总值）。它按「回填历史 +
--       覆盖增量」设计，因此请在部署新版 Worker 之前执行，或接受覆盖带来的增量损失。

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

-- 校验：mismatch_rows 应为 0
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
