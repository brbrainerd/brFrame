import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"], // Use the same setup file
    include: ["tests/e2e/**/*.test.ts"], // ONLY run E2E tests
    testTimeout: 30000, // Long timeout for real network calls
  },
});
