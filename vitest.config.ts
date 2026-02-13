import { defineConfig } from 'vitest/config'

export default defineConfig({
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
