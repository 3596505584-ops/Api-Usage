-- API用量统计 · 匿名使用统计：已有库升级到小时粒度趋势
-- 执行：
--   npx wrangler d1 execute api_usage_stat --remote --file cloudflare/migrate-hourly.sql
--
-- 只新增逐设备小时表与索引，不修改既有表结构与数据，可安全重复执行。
-- 部署新 Worker 之后再执行即可；旧 Worker 不会读写该表。

CREATE TABLE IF NOT EXISTS device_hourly (
  hour TEXT NOT NULL,
  device_id TEXT NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 0,
  opens INTEGER NOT NULL DEFAULT 0,
  dur_ms INTEGER NOT NULL DEFAULT 0,
  p_overview INTEGER NOT NULL DEFAULT 0,
  p_stats INTEGER NOT NULL DEFAULT 0,
  p_history INTEGER NOT NULL DEFAULT 0,
  p_forecast INTEGER NOT NULL DEFAULT 0,
  p_wallet INTEGER NOT NULL DEFAULT 0,
  p_settings INTEGER NOT NULL DEFAULT 0,
  p_help INTEGER NOT NULL DEFAULT 0,
  p_about INTEGER NOT NULL DEFAULT 0,
  r0 INTEGER NOT NULL DEFAULT 0,
  r1 INTEGER NOT NULL DEFAULT 0,
  r2 INTEGER NOT NULL DEFAULT 0,
  r3 INTEGER NOT NULL DEFAULT 0,
  r4 INTEGER NOT NULL DEFAULT 0,
  app_version TEXT,
  last_seq INTEGER NOT NULL DEFAULT 0,
  first_ts INTEGER,
  last_ts INTEGER,
  PRIMARY KEY (hour, device_id)
);

CREATE INDEX IF NOT EXISTS idx_device_hourly_hour ON device_hourly (hour);
