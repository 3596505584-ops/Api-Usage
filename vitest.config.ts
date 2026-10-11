import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';

export default defineConfig({
  plugins: [
    {
      // cloudflare/worker.js 通过 Text 模块导入看板页（wrangler.toml 的 rules 已声明），
      // 测试环境用同样的「文本即模块」语义加载 .html，保证导入行为一致。
      name: 'html-as-text',
      enforce: 'pre',
      load(id: string) {
        // 与 wrangler.toml 的 Text 模块规则保持一致：
        //   **/*.html        → 看板页
        //   vendor/*.js      → 自托管图表库
        const isTextModule = id.endsWith('.html') || /[/\\]vendor[/\\][^/\\]+\.js$/.test(id);
        if (!isTextModule) return null;
        return `export default ${JSON.stringify(readFileSync(id, 'utf8'))};`;
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'cloudflare/**/*.test.js'],
    clearMocks: true,
    restoreMocks: true,
  },
});
