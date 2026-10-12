-- API用量统计 · 匿名使用统计：已有库补充酒馆版本号列
-- 执行：
--   npx wrangler d1 execute api_usage_stat --remote --file cloudflare/migrate-st-version.sql
--
-- 只新增 device.st_version 一列，不改动既有数据。
-- 重复执行会报 duplicate column name，属正常提示（说明已迁移完成）。
-- 未执行也不影响上报：Worker 写入失败时会自动降级为不含该列的语句。
ALTER TABLE device ADD COLUMN st_version TEXT;
