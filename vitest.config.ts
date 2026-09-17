import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // The markdown pipeline is pure and runs without a DOM.
    environment: 'node',
  },
})
