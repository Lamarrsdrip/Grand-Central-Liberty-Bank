import { beforeAll, describe, expect, it } from "vitest";
import { issueCsrfToken, verifyCsrfToken } from "@/lib/csrf";

beforeAll(() => {
  process.env.CSRF_SECRET = "test-csrf-secret-at-least-32-characters-long-000";
});

describe("signed CSRF tokens", () => {
  it("issues a token that verifies against the same secret", async () => {
    const token = await issueCsrfToken();
    expect(token).toContain(".");
    expect(await verifyCsrfToken(token)).toBe(true);
  });

  it("rejects a tampered token", async () => {
    const token = await issueCsrfToken();
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(await verifyCsrfToken(tampered)).toBe(false);
  });

  it("rejects empty, malformed, or unsigned values", async () => {
    expect(await verifyCsrfToken(null)).toBe(false);
    expect(await verifyCsrfToken("")).toBe(false);
    expect(await verifyCsrfToken("no-dot-here")).toBe(false);
    expect(await verifyCsrfToken("nonce.")).toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await issueCsrfToken();
    process.env.CSRF_SECRET = "a-completely-different-secret-key-32-chars-min!!";
    expect(await verifyCsrfToken(token)).toBe(false);
    process.env.CSRF_SECRET = "test-csrf-secret-at-least-32-characters-long-000";
  });
});
