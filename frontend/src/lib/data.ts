import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  defaultRetirementFeeSettings,
  defaultTransferSettings,
  getActiveAnnouncements,
  latestKycStatus
} from "@/lib/domain";
import { SUPPORTED_LOCALES } from "@/lib/locales";

export async function getBankSettings() {
  return (
    (await prisma.bankSetting.findUnique({ where: { id: 1 } })) ?? {
      id: 1,
      bankName: "Grand Central Liberty Bank",
      bankAddress: "200 Liberty Plaza, New York, NY",
      supportEmail: "support@gclbank.com",
      supportPhone: "+1 (800) 555-0199",
      websiteUrl: "https://grandcentrallibertybank.com",
      defaultLocale: "en",
      supportedLocales: [...SUPPORTED_LOCALES],
      welcomeBonusEnabled: true,
      welcomeBonusAmount: 500,
      terms: "Grand Central Liberty Bank terms are managed by the bank operations team.",
      privacyPolicy: "Grand Central Liberty Bank privacy policy is managed by the bank operations team.",
      updatedAt: new Date()
    }
  );
}

export async function getAnnouncements(role: Role, locale: string) {
  const banners = await prisma.announcementBanner.findMany({ orderBy: { createdAt: "desc" } });
  return getActiveAnnouncements(banners, role, locale);
}

export async function getUserDashboardData(userId: string) {
  const [
    user,
    accounts,
    notifications,
    tickets,
    transferSettings,
    wallets,
    cards,
    retirementAccounts,
    retirementFeeSettings
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        kycSubmissions: { orderBy: { createdAt: "desc" }, include: { notesHistory: { orderBy: { createdAt: "desc" } } } },
        transferRequests: { orderBy: { createdAt: "desc" } },
        loginHistory: { orderBy: { createdAt: "desc" }, take: 5 }
      }
    }),
    prisma.account.findMany({
      where: { userId },
      orderBy: { type: "asc" },
      include: {
        transactions: { orderBy: { createdAt: "desc" }, take: 8 },
        freezeEvents: { orderBy: { createdAt: "desc" } }
      }
    }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { messages: { orderBy: { createdAt: "asc" } }, assignedAdmin: true }
    }),
    prisma.transferSetting.findUnique({ where: { id: 1 } }),
    prisma.cryptoWallet.findMany({ where: { enabled: true }, orderBy: [{ symbol: "asc" }] }),
    prisma.cardApplication.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.retirementAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        contributions: { orderBy: { contributionDate: "desc" } },
        withdrawalRequests: { orderBy: { createdAt: "desc" }, include: { notes: { where: { visibleToUser: true }, orderBy: { createdAt: "desc" } } } }
      }
    }),
    prisma.retirementFeeSetting.findUnique({ where: { id: 1 } })
  ]);

  const allTransactions = accounts
    .flatMap((account) =>
      account.transactions.map((transaction) => ({
        ...transaction,
        accountType: account.type,
        accountNumber: account.accountNumber
      }))
    )
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  return {
    user,
    accounts,
    transactions: allTransactions,
    notifications,
    tickets,
    transferSettings: transferSettings ?? defaultTransferSettings,
    wallets,
    cards,
    retirementAccounts,
    retirementFeeSettings: retirementFeeSettings ?? defaultRetirementFeeSettings,
    kycStatus: latestKycStatus(user?.kycSubmissions ?? [])
  };
}

export async function getUserSupportTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      assignedAdmin: {
        select: { id: true, firstName: true, lastName: true, email: true }
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, role: true }
          }
        }
      }
    }
  });
}

export async function getUnreadSupportReplyCount(userId: string) {
  return prisma.supportMessage.count({
    where: {
      readAt: null,
      senderId: { not: userId },
      ticket: { userId }
    }
  });
}

function settled<T>(result: PromiseSettledResult<T>, fallback: T, label: string): T {
  if (result.status === "fulfilled") return result.value;
  console.error(`[admin-data] ${label} failed:`, result.reason);
  return fallback;
}

export async function getAdminData() {
  const results = await Promise.allSettled([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { accounts: true, kycSubmissions: { orderBy: { createdAt: "desc" }, take: 1 } }
    }),
    prisma.kycSubmission.findMany({ orderBy: { createdAt: "desc" }, include: { user: true, notesHistory: true }, take: 50 }),
    prisma.transferRequest.findMany({ orderBy: { createdAt: "desc" }, include: { user: true, fromAccount: true }, take: 50 }),
    prisma.cardApplication.findMany({ orderBy: { createdAt: "desc" }, include: { user: true }, take: 50 }),
    prisma.cryptoWallet.findMany({ orderBy: [{ symbol: "asc" }] }),
    prisma.supportTicket.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: true,
        assignedAdmin: true,
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, role: true }
            }
          }
        }
      },
      take: 50
    }),
    prisma.emailSetting.findUnique({ where: { id: 1 } }),
    getBankSettings(),
    prisma.transferSetting.findUnique({ where: { id: 1 } }),
    prisma.announcementBanner.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.broadcastEmail.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { createdBy: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: true } }),
    prisma.retirementAccount.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        contributions: { orderBy: { contributionDate: "desc" } },
        withdrawalRequests: { orderBy: { createdAt: "desc" }, include: { notes: { orderBy: { createdAt: "desc" } } } }
      }
    }),
    prisma.retirementWithdrawalRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        retirementAccount: true,
        reviewedBy: true,
        notes: { orderBy: { createdAt: "desc" }, include: { author: true } }
      }
    }),
    prisma.retirementFeeSetting.findUnique({ where: { id: 1 } }),
    prisma.savedBeneficiary.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
    }),
    prisma.cryptoAssetPrice.findMany({ orderBy: { symbol: "asc" } }),
    prisma.cryptoWithdrawalRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
    })
  ]);

  const [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17] = results;

  const defaultBankSettings = {
    id: 1, bankName: "Grand Central Liberty Bank", bankAddress: "200 Liberty Plaza, New York, NY",
    supportEmail: "support@gclbank.com", supportPhone: "+1 (800) 555-0199",
    websiteUrl: "https://grandcentrallibertybank.com", defaultLocale: "en",
    supportedLocales: ["en"] as string[], welcomeBonusEnabled: true, welcomeBonusAmount: 500,
    terms: "Grand Central Liberty Bank terms are managed by the bank operations team.",
    privacyPolicy: "Grand Central Liberty Bank privacy policy is managed by the bank operations team.",
    updatedAt: new Date()
  };

  return {
    users:               settled(r0,  [], "users"),
    kycSubmissions:      settled(r1,  [], "kycSubmissions"),
    transfers:           settled(r2,  [], "transfers"),
    cards:               settled(r3,  [], "cards"),
    wallets:             settled(r4,  [], "wallets"),
    tickets:             settled(r5,  [], "tickets"),
    emailSettings:       settled(r6,  null, "emailSettings"),
    bankSettings:        settled(r7,  defaultBankSettings, "bankSettings"),
    transferSettings:    (settled(r8,  null, "transferSettings")) ?? defaultTransferSettings,
    announcements:       settled(r9,  [], "announcements"),
    broadcasts:          settled(r10, [], "broadcasts"),
    auditLogs:           settled(r11, [], "auditLogs"),
    retirementAccounts:  settled(r12, [], "retirementAccounts"),
    retirementWithdrawals: settled(r13, [], "retirementWithdrawals"),
    retirementFeeSettings: (settled(r14, null, "retirementFeeSettings")) ?? defaultRetirementFeeSettings,
    savedBeneficiaries:   settled(r15, [], "savedBeneficiaries"),
    cryptoAssetPrices:    settled(r16, [], "cryptoAssetPrices") as Array<{ id: string; symbol: string; priceUSD: number; updatedAt: Date; createdAt: Date }>,
    cryptoWithdrawals:    settled(r17, [], "cryptoWithdrawals") as Array<{
      id: string; userId: string; asset: string; network: string; amount: number;
      recipientAddress: string; notes: string | null; status: string;
      adminMessage: string | null; reference: string; createdAt: Date; updatedAt: Date;
      user: { id: string; firstName: string; lastName: string; email: string };
    }>
  };
}
