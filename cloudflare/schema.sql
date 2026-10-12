-- API用量统计 · 匿名使用统计（Cloudflare D1）
-- 首次部署执行：
--   npx wrangler d1 execute api_usage_stat --remote --file cloudflare/schema.sql

-- 设备维度汇总：每台匿名设备一行
--   - 环境字段（browser/os/arch/...）保存该设备「最近一次上报」的状态，空值不覆盖旧值；
--   - *_total 为去标识化的累计计数，每次有效上报（seq 递增）增量累加，供看板一次全表读即可出总计与画像；
--   - last_seq 为幂等判据，重复/重发上报不会重复累加累计列。
CREATE TABLE IF NOT EXISTS device (
  device_id TEXT PRIMARY KEY,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  app_version TEXT,
  st_version TEXT,
  browser TEXT,
  browser_major TEXT,
  os TEXT,
  arch TEXT,
  lang TEXT,
  width_bucket TEXT,
  dark INTEGER,
  standalone INTEGER,
  touch INTEGER,
  tz_offset REAL,
  first_day TEXT,
  last_seq INTEGER NOT NULL DEFAULT 0,
  opens_total INTEGER NOT NULL DEFAULT 0,
  dur_ms_total INTEGER NOT NULL DEFAULT 0,
  p_overview_total INTEGER NOT NULL DEFAULT 0,
  p_stats_total INTEGER NOT NULL DEFAULT 0,
  p_history_total INTEGER NOT NULL DEFAULT 0,
  p_forecast_total INTEGER NOT NULL DEFAULT 0,
  p_wallet_total INTEGER NOT NULL DEFAULT 0,
  p_settings_total INTEGER NOT NULL DEFAULT 0,
  p_help_total INTEGER NOT NULL DEFAULT 0,
  p_about_total INTEGER NOT NULL DEFAULT 0
);

-- 逐设备日数据：每设备每天一行，重复上报在库内累加（last_seq 保证幂等）
CREATE TABLE IF NOT EXISTS device_daily (
  day TEXT NOT NULL,
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
  PRIMARY KEY (day, device_id)
);

-- 按天聚合查询（日活、折线、窗口统计）走该索引，避免全表扫描
CREATE INDEX IF NOT EXISTS idx_device_daily_day ON device_daily (day);

-- 逐设备小时数据：每设备每「北京时间小时」一行，用于小时粒度趋势与最近 24 小时视图。
-- hour 为北京时间小时键（YYYY-MM-DDTHH）；last_seq 保证重复/重发上报不重复累加。
-- 只按较短保留期清理（见 worker.js），日粒度历史仍由 device_daily 长期保留。
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

-- 小时粒度趋势按 hour 索引范围扫描
CREATE INDEX IF NOT EXISTS idx_device_hourly_hour ON device_hourly (hour);

-- 关闭匿名统计开关的最终上报：每台曾关闭过的设备一行（用于知晓关闭行为，不含其他信息）
CREATE TABLE IF NOT EXISTS device_off (
  device_id TEXT PRIMARY KEY,
  off_at INTEGER NOT NULL,
  last_seq INTEGER NOT NULL DEFAULT 0
);

-- 设备表按最近活跃排序/清理时使用
CREATE INDEX IF NOT EXISTS idx_device_last_seen ON device (last_seen);
