import { describe, expect, it } from "vitest";
import {
  canSubmitTransfer,
  computeApprovalDebit,
  isTransferTerminal
} from "@/lib/domain";

describe("canSubmitTransfer — user transfer balance validation", () => {
  const activeAccount = { availableBalance: 1000, currency: "USD", status: "ACTIVE" };

  it("allows a transfer within the available balance", () => {
    expect(canSubmitTransfer({ amount: 250, currency: "USD", account: activeAccount })).toEqual({ ok: true });
  });

  it("allows a transfer for the exact available balance", () => {
    expect(canSubmitTransfer({ amount: 1000, currency: "USD", account: activeAccount })).toEqual({ ok: true });
  });

  it("rejects a transfer that exceeds the available balance", () => {
    const result = canSubmitTransfer({ amount: 1000.01, currency: "USD", account: activeAccount });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/insufficient/i);
  });

  it("rejects a zero or negative amount", () => {
    expect(canSubmitTransfer({ amount: 0, currency: "USD", account: activeAccount }).ok).toBe(false);
    expect(canSubmitTransfer({ amount: -50, currency: "USD", account: activeAccount }).ok).toBe(false);
  });

  it("rejects a non-finite amount", () => {
    expect(canSubmitTransfer({ amount: Number.NaN, currency: "USD", account: activeAccount }).ok).toBe(false);
    expect(canSubmitTransfer({ amount: Number.POSITIVE_INFINITY, currency: "USD", account: activeAccount }).ok).toBe(false);
  });

  it("rejects a currency mismatch", () => {
    const result = canSubmitTransfer({ amount: 100, currency: "EUR", account: activeAccount });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/currency/i);
  });

  it("rejects a transfer from a frozen account", () => {
    const frozen = { ...activeAccount, status: "FROZEN" };
    expect(canSubmitTransfer({ amount: 10, currency: "USD", account: frozen }).ok).toBe(false);
  });
});

describe("computeApprovalDebit — admin approval debit logic", () => {
  const account = { availableBalance: 1000, balance: 1200, status: "ACTIVE" };

  it("debits both available and posted balance on approval", () => {
    const result = computeApprovalDebit({ currentStatus: "SUBMITTED", amount: 300, account });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.debit).toBe(300);
      expect(result.newAvailable).toBe(700);
      expect(result.newBalance).toBe(900);
    }
  });

  it("handles fractional amounts without floating point drift", () => {
    const result = computeApprovalDebit({
      currentStatus: "UNDER_REVIEW",
      amount: 0.1 + 0.2, // 0.30000000000000004
      account: { availableBalance: 1, balance: 1, status: "ACTIVE" }
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.newAvailable).toBe(0.7);
      expect(result.newBalance).toBe(0.7);
    }
  });

  it("prevents double approval of an already-approved transfer", () => {
    const result = computeApprovalDebit({ currentStatus: "APPROVED", amount: 100, account });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/already approved/i);
  });

  it("prevents processing a rejected or cancelled transfer", () => {
    expect(computeApprovalDebit({ currentStatus: "REJECTED", amount: 100, account }).ok).toBe(false);
    expect(computeApprovalDebit({ currentStatus: "CANCELLED", amount: 100, account }).ok).toBe(false);
  });

  it("rejects approval when funds are insufficient at approval time", () => {
    const result = computeApprovalDebit({ currentStatus: "SUBMITTED", amount: 1500, account });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/insufficient/i);
  });

  it("rejects approval when the source account is not active", () => {
    const result = computeApprovalDebit({
      currentStatus: "SUBMITTED",
      amount: 10,
      account: { ...account, status: "FROZEN" }
    });
    expect(result.ok).toBe(false);
  });
});

describe("isTransferTerminal", () => {
  it("flags terminal statuses", () => {
    expect(isTransferTerminal("APPROVED")).toBe(true);
    expect(isTransferTerminal("REJECTED")).toBe(true);
    expect(isTransferTerminal("CANCELLED")).toBe(true);
  });
  it("treats in-progress statuses as non-terminal", () => {
    expect(isTransferTerminal("SUBMITTED")).toBe(false);
    expect(isTransferTerminal("UNDER_REVIEW")).toBe(false);
  });
});
