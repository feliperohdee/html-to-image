import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
}

const testResourcesPlugin = (): Plugin => {
  return {
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url || '', 'http://localhost').pathname

        if (!pathname.startsWith('/test/resources/')) {
          return next()
        }

        const filePath = join(server.config.root, pathname)
        const ext = extname(pathname)
        const mimeType = MIME_TYPES[ext] || 'text/plain'

        try {
          if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
            const content = readFileSync(filePath)
            res.setHeader('Content-Type', mimeType)
            res.end(content)
          } else {
            const content = readFileSync(filePath, 'utf-8')
            res.setHeader('Content-Type', mimeType)
            res.end(content)
          }
        } catch {
          next()
        }
      })
    },
    name: 'serve-test-resources',
  }
}

export default defineConfig({
  plugins: [testResourcesPlugin()],
  test: {
    browser: {
      enabled: true,
      instances: [{ browser: 'chromium' }],
      provider: 'playwright',
    },
    include: ['test/spec/**/*.{spec,sepc}.ts'],
    setupFiles: ['test/spec/setup.ts'],
    testTimeout: 20000,
  },
})
