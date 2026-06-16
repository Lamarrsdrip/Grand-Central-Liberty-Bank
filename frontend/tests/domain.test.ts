import { describe, expect, it } from "vitest";
import {
  calculateRetirementFee,
  defaultRetirementFeeSettings,
  defaultRetirementWithdrawalMessage,
  defaultTransferSettings,
  getActiveAnnouncements,
  getTranslation,
  filterEnabledWallets,
  resolveBroadcastRecipients,
  summarizeFreezeStatus
} from "@/lib/domain";

describe("banking domain helpers", () => {
  it("uses the required transfer review message by default", () => {
    expect(defaultTransferSettings.reviewMessage).toBe(
      "Your transaction requires additional review. Please contact customer support for assistance."
    );
    expect(defaultTransferSettings.buttonText).toBe("CONTACT SUPPORT");
  });

  it("only exposes enabled crypto wallets to customers", () => {
    const wallets = filterEnabledWallets([
      { symbol: "BTC", enabled: true },
      { symbol: "ETH", enabled: false },
      { symbol: "USDT", enabled: true }
    ]);

    expect(wallets.map((wallet) => wallet.symbol)).toEqual(["BTC", "USDT"]);
  });

  it("resolves broadcast recipients by target segment", () => {
    const users = [
      { id: "u1", email: "approved@example.com", kycStatus: "APPROVED" as const },
      { id: "u2", email: "pending@example.com", kycStatus: "PENDING" as const },
      { id: "u3", email: "review@example.com", kycStatus: "UNDER_REVIEW" as const }
    ];

    expect(resolveBroadcastRecipients(users, "APPROVED_USERS")).toEqual(["approved@example.com"]);
    expect(resolveBroadcastRecipients(users, "KYC_PENDING_USERS")).toEqual([
      "pending@example.com",
      "review@example.com"
    ]);
    expect(resolveBroadcastRecipients(users, "SELECTED_USERS", ["u3"])).toEqual(["review@example.com"]);
  });

  it("filters active announcement banners by role, locale, and schedule", () => {
    const now = new Date("2026-06-16T12:00:00.000Z");
    const banners = getActiveAnnouncements(
      [
        { title: "Global", active: true, audience: null, locale: "en", startsAt: null, endsAt: null },
        { title: "Admin only", active: true, audience: "ADMIN", locale: "en", startsAt: null, endsAt: null },
        { title: "Expired", active: true, audience: null, locale: "en", startsAt: null, endsAt: "2026-06-15T12:00:00.000Z" },
        { title: "Francais", active: true, audience: null, locale: "fr", startsAt: null, endsAt: null }
      ],
      "USER",
      "en",
      now
    );

    expect(banners.map((banner) => banner.title)).toEqual(["Global"]);
  });

  it("summarizes account freeze state with the latest reason", () => {
    expect(
      summarizeFreezeStatus({
        status: "FROZEN",
        freezeReason: "Wire activity pending review",
        frozenAt: "2026-06-16T10:00:00.000Z"
      })
    ).toEqual({
      frozen: true,
      reason: "Wire activity pending review",
      frozenAt: "2026-06-16T10:00:00.000Z"
    });
  });

  it("falls back to English translations for unsupported locales", () => {
    expect(getTranslation("es", "dashboard")).toBe("Panel");
    expect(getTranslation("de", "dashboard")).toBe("Dashboard");
  });

  it("uses the required 401(k) withdrawal compliance message", () => {
    expect(defaultRetirementWithdrawalMessage).toBe(
      "Your 401(k) withdrawal request has been submitted for compliance review. Support may contact you if more information is required."
    );
    expect(defaultRetirementFeeSettings.paymentMethod).toBe("CRYPTO_DEPOSIT");
  });

  it("calculates enabled 401(k) compliance fees before submission", () => {
    expect(calculateRetirementFee(25000, { feePercentage: 3.5, enabled: true })).toEqual({
      amount: 875,
      enabled: true
    });
    expect(calculateRetirementFee(25000, { feePercentage: 3.5, enabled: false })).toEqual({
      amount: 0,
      enabled: false
    });
  });
});
