-- API用量统计 · 匿名使用统计：已有库新增关闭标记表
-- 执行：
--   npx wrangler d1 execute api_usage_stat --remote --file cloudflare/migrate-device-off.sql
--
-- 只新增 device_off 表，可安全重复执行。
-- 未执行也不影响上报：Worker 会自动降级为核心写入，仅缺少关闭标记统计。
CREATE TABLE IF NOT EXISTS device_off (
  device_id TEXT PRIMARY KEY,
  off_at INTEGER NOT NULL,
  last_seq INTEGER NOT NULL DEFAULT 0
);
