import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts", "test/integration/**/*.test.ts"],
    testTimeout: 60000, // 60 seconds for integration tests
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["integration/**/*.ts", "scripts/**/*.ts"],
    },
  },
});

