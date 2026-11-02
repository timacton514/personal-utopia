import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 部署说明：
 * - GitHub Pages 的项目站点地址是 https://<用户名>.github.io/<仓库名>/
 *   所以生产构建必须以仓库名作为基础路径，否则 JS/CSS 会 404。
 * - 本地开发（vite dev）使用根路径，方便直接用 http://localhost:5173/ 访问。
 * - vite preview 预览的是生产构建，必须使用与构建一致的基础路径。
 * - 如果以后改用自定义域名，把 PRODUCTION_BASE 改成 '/' 即可。
 */
const PRODUCTION_BASE = '/personal-utopia/'

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? PRODUCTION_BASE : '/',
  plugins: [vue()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 小说文本体积较大，适当放宽警告阈值
    chunkSizeWarningLimit: 1200,
  },
}))
