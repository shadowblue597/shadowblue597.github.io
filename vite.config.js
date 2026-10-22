import { defineConfig } from 'vite'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contentPaths, readContent } from './lib/content.js'
import { renderPlaceholders } from './lib/render.js'

const root = dirname(fileURLToPath(import.meta.url))
const { contentFile, exampleFile } = contentPaths(root)

// 每次產生頁面時重新讀內容，填進版型的 <!-- render:… --> 位置。
// 你的內容在 content/site.json；還沒建立時用 content/site.example.json。
function siteContent() {
  let base = '/'
  return {
    name: 'site-content',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const file = existsSync(contentFile) ? contentFile : exampleFile
        return renderPlaceholders(html, readContent(file), { base })
      },
    },
    // 開發模式下改了內容檔，瀏覽器自動重新整理
    handleHotUpdate({ file, server }) {
      const changed = resolve(file)
      if (changed === contentFile || changed === exampleFile) {
        server.ws.send({ type: 'full-reload' })
        return []
      }
    },
  }
}

export default defineConfig({
  // 使用者站（帳號名.github.io）用 '/'；專案站改成 '/儲存庫名/'
  base: '/',
  plugins: [siteContent()],
  build: {
    rolldownOptions: {
      input: {
        home: resolve(root, 'index.html'),
        projects: resolve(root, 'projects/index.html'),
      },
    },
  },
})
