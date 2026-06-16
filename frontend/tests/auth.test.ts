import { describe, expect, it } from "vitest";
import {
  hashPassword,
  signSessionToken,
  verifyPassword,
  verifySessionToken
} from "@/lib/auth";
import { sanitizeHtml } from "@/lib/sanitize";

describe("authentication helpers", () => {
  it("hashes passwords and rejects the wrong secret", async () => {
    const hash = await hashPassword("BankGradePassphrase!2026");

    await expect(verifyPassword("BankGradePassphrase!2026", hash)).resolves.toBe(true);
    await expect(verifyPassword("incorrect", hash)).resolves.toBe(false);
    expect(hash).not.toContain("BankGradePassphrase");
  });

  it("signs session tokens that preserve user identity and role", async () => {
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";

    const token = await signSessionToken({
      sessionId: "session_123",
      userId: "user_123",
      role: "ADMIN"
    });
    const payload = await verifySessionToken(token);

    expect(payload.userId).toBe("user_123");
    expect(payload.sessionId).toBe("session_123");
    expect(payload.role).toBe("ADMIN");
  });

  it("removes executable markup from rich text email content", () => {
    const html = sanitizeHtml('<h1>Offer</h1><script>alert("xss")</script><p onclick="bad()">Safe</p>');

    expect(html).toContain("<h1>Offer</h1>");
    expect(html).toContain("<p>Safe</p>");
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
  });
});
