-- API用量统计 · 匿名使用统计：已有库补充设备最新状态列
-- 执行：
--   npx wrangler d1 execute api_usage_stat --remote --file cloudflare/migrate-device-metrics.sql
--
-- 新增 device.history_count 与 device.telemetry_off 两列，不改动既有数据。
-- 重复执行会报 duplicate column name，属正常提示（说明已迁移完成）。
-- 未执行也不影响上报：Worker 会自动降级为不含这些列的语句。
ALTER TABLE device ADD COLUMN history_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE device ADD COLUMN telemetry_off INTEGER NOT NULL DEFAULT 0;
