-- API用量统计 · 匿名使用统计：为 device 表补充 TauriTavern 版本号列
-- 背景：扩展在 TauriTavern 宿主下会额外上报 `ttv`（TauriTavern 自身版本），
--       与既有的 `stv`（SillyTavern 前端版本）分列存储，便于看板区分宿主与版本分布。
-- 用法：npx wrangler d1 execute api_usage_stat --remote --file cloudflare/migrate-tt-version.sql
-- 说明：
--   1. 本脚本只加列、不改旧数据，可重复执行；
--   2. 未执行的库不受影响：Worker 会自动降级到「无 tt_version」的列集合，仍写入 st_version；
--   3. 历史行保持 NULL 直到该设备下次上报，看板显示为「未知」属于预期。

ALTER TABLE device ADD COLUMN tt_version TEXT;
