import { afterEach, describe, expect, it } from "vitest";
import { buildMongoDatabaseUrl } from "@/lib/db-url";
import { validateServerConfig } from "@/lib/config";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

describe("production configuration", () => {
  it("prefers the canonical Prisma MongoDB variable over a stale DATABASE_URL", () => {
    process.env.PRISMA_DATABASE_URL = "mongodb://127.0.0.1:27017/canonical";
    process.env.DATABASE_URL = "postgresql://old-host/stale";
    process.env.DB_NAME = "canonical";
    expect(buildMongoDatabaseUrl()).toMatch(/^mongodb:\/\/127\.0\.0\.1:27017\/canonical\?/);
  });

  it("fails critical production configuration with malformed secrets and URL", () => {
    const issues = validateServerConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://wrong/database",
      JWT_SECRET: "short",
      CSRF_SECRET: "short",
      APP_URL: "http://insecure.example.test"
    } as NodeJS.ProcessEnv);
    expect(issues.filter((issue) => issue.severity === "error").map((issue) => issue.key)).toEqual(
      expect.arrayContaining(["DATABASE_URL", "JWT_SECRET", "CSRF_SECRET", "APP_URL"])
    );
  });
});
