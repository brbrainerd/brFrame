import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node', // Crucial for API route testing
    globals: true,
    setupFiles: ['./tests/setup.ts'], // Load global mocks
    include: ['tests/unit/**/*.test.ts'], // Only run our unit tests
    exclude: ['tests/e2e/**', 'node_modules/**'], // Exclude E2E tests and node_modules
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app/api/cron/route.ts'],
      exclude: ['node_modules/**', 'tests/**'],
      thresholds: {
        lines: 95,
        statements: 90, // Helper functions have some uncovered branches
        branches: 75, // Date pattern matching has many branches
      },
    },
  },
})

