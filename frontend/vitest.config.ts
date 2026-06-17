import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 60000,
    include: ["tests/**/*.test.ts"],
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "mongodb://127.0.0.1:27017/grand_central_liberty_bank_test",
      JWT_SECRET: process.env.JWT_SECRET ?? "test-secret-with-more-than-thirty-two-characters",
      CSRF_SECRET: process.env.CSRF_SECRET ?? "test-csrf-secret-at-least-32-characters-long-000"
    }
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  }
});
