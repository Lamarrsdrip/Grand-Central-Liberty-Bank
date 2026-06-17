import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  defaultRetirementFeeSettings,
  defaultRetirementWithdrawalMessage,
  defaultTransferSettings
} from "../src/lib/domain";

const prisma = new PrismaClient();

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for seeding.`);
  }
  return value;
}

async function ensureSingleton<T extends { id: number }>(
  find: () => Promise<T | null>,
  create: () => Promise<T>,
  update: () => Promise<T>
) {
  return (await find()) ? update() : create();
}

async function ensureTransaction(accountId: string, data: {
  type: string;
  amount: number;
  description: string;
  reference: string;
  status: "POSTED" | "PENDING" | "REVIEW" | "DECLINED";
}) {
  const existing = await prisma.transaction.findUnique({ where: { reference: data.reference } });
  if (existing) return existing;
  return prisma.transaction.create({ data: { accountId, ...data } });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@gclbank.local";
  const userEmail = process.env.SEED_USER_EMAIL ?? "client@gclbank.local";
  const adminPassword = requiredEnv("SEED_ADMIN_PASSWORD");
  const userPassword = requiredEnv("SEED_USER_PASSWORD");

  await ensureSingleton(
    () => prisma.bankSetting.findUnique({ where: { id: 1 } }),
    () => prisma.bankSetting.create({
      data: {
        id: 1,
        bankName: "Grand Central Liberty Bank",
        bankAddress: "200 Liberty Plaza, New York, NY 10006",
        supportEmail: "support@gclbank.com",
        supportPhone: "+1 (800) 555-0199",
        websiteUrl: "https://grandcentrallibertybank.com",
        defaultLocale: "en",
        supportedLocales: ["en", "es", "fr"],
        terms:
          "Grand Central Liberty Bank provides digital account services subject to customer verification, account controls, and bank review procedures.",
        privacyPolicy:
          "Grand Central Liberty Bank protects customer data using role-based access, audit logging, encryption-aware storage, and secure operational processes."
      }
    }),
    () => prisma.bankSetting.update({ where: { id: 1 }, data: {} })
  );

  await ensureSingleton(
    () => prisma.transferSetting.findUnique({ where: { id: 1 } }),
    () => prisma.transferSetting.create({ data: { id: 1, ...defaultTransferSettings } }),
    () => prisma.transferSetting.update({ where: { id: 1 }, data: defaultTransferSettings })
  );

  await ensureSingleton(
    () => prisma.retirementFeeSetting.findUnique({ where: { id: 1 } }),
    () => prisma.retirementFeeSetting.create({ data: { id: 1, ...defaultRetirementFeeSettings } }),
    () => prisma.retirementFeeSetting.update({ where: { id: 1 }, data: defaultRetirementFeeSettings })
  );

  await ensureSingleton(
    () => prisma.emailSetting.findUnique({ where: { id: 1 } }),
    () => prisma.emailSetting.create({
      data: {
        id: 1,
        smtpHost: process.env.SMTP_HOST ?? "smtp.gmail.com",
        smtpPort: Number(process.env.SMTP_PORT ?? 465),
        smtpSecure: process.env.SMTP_SECURE !== "false",
        senderName: "Grand Central Liberty Bank"
      }
    }),
    () => prisma.emailSetting.update({ where: { id: 1 }, data: {} })
  );

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const admin = existingAdmin ?? await prisma.user.create({
    data: {
      firstName: "Avery",
      lastName: "Sterling",
      email: adminEmail,
      phone: "+12025550199",
      country: "United States",
      address: "200 Liberty Plaza, New York, NY",
      dateOfBirth: new Date("1984-02-14"),
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
      emailVerifiedAt: new Date()
    }
  });

  const existingClient = await prisma.user.findUnique({ where: { email: userEmail } });
  const client = existingClient ?? await prisma.user.create({
    data: {
      firstName: "Idris",
      lastName: "Morgan",
      email: userEmail,
      phone: "+12025550211",
      country: "United States",
      address: "51 Park Avenue, New York, NY",
      dateOfBirth: new Date("1990-05-20"),
      passwordHash: await bcrypt.hash(userPassword, 12),
      role: "USER",
      emailVerifiedAt: new Date()
    }
  });

  const checking = await ensureAccount(client.id, {
    type: "CHECKING",
    accountNumber: "4582009044",
    balance: 28420.45,
    availableBalance: 28420.45
  });
  await ensureTransaction(checking.id, { type: "DEBIT", amount: -6.45, description: "Starbucks Coffee", reference: "TXN-SBUX-0645", status: "POSTED" });
  await ensureTransaction(checking.id, { type: "DEBIT", amount: -89.99, description: "Amazon.com", reference: "TXN-AMZN-8999", status: "POSTED" });
  await ensureTransaction(checking.id, { type: "CREDIT", amount: 3250, description: "Salary Deposit", reference: "TXN-SALARY-3250", status: "POSTED" });
  await ensureTransaction(checking.id, { type: "DEBIT", amount: -18.32, description: "Uber Technologies", reference: "TXN-UBER-1832", status: "POSTED" });
  await ensureTransaction(checking.id, { type: "DEBIT", amount: -250, description: "Crypto Purchase", reference: "TXN-CRYPTO-250", status: "POSTED" });

  const savings = await ensureAccount(client.id, {
    type: "SAVINGS",
    accountNumber: "2047008821",
    balance: 67880.30,
    availableBalance: 67880.30
  });
  await ensureTransaction(savings.id, { type: "CREDIT", amount: 625, description: "Liberty Reserve Interest", reference: "TXN-INTEREST-625", status: "POSTED" });

  await ensureAccount(client.id, {
    type: "CRYPTO",
    accountNumber: "0011004412",
    balance: 34250.15,
    availableBalance: 34250.15
  });

  const wallets = [
    { coin: "Bitcoin", symbol: "BTC", address: "bc1qgrandcentrallibertybankdeposit0001", network: "Bitcoin", label: "BTC Treasury", enabled: true },
    { coin: "Ethereum", symbol: "ETH", address: "0xGrandCentralLibertyBankEthDeposit001", network: "Ethereum ERC20", label: "ETH Treasury", enabled: true },
    { coin: "Tether", symbol: "USDT", address: "TGrandCentralLibertyBankTronDeposit001", network: "TRC20", label: "USDT Treasury", enabled: true },
    { coin: "BNB", symbol: "BNB", address: "bnb1grandcentrallibertybankdeposit001", network: "BEP20", label: "BNB Treasury", enabled: true },
    { coin: "Solana", symbol: "SOL", address: "GCLBSolanaDepositAddress111111111111111111", network: "Solana", label: "SOL Treasury", enabled: true },
    { coin: "XRP", symbol: "XRP", address: "rGrandCentralLibertyBankXrpDeposit001", network: "XRP Ledger", label: "XRP Treasury", enabled: true },
    { coin: "Dogecoin", symbol: "DOGE", address: "DGrandCentralLibertyBankDogeDeposit001", network: "Dogecoin", label: "DOGE Treasury", enabled: true }
  ];
  for (const wallet of wallets) {
    const existing = await prisma.cryptoWallet.findUnique({
      where: { symbol_network: { symbol: wallet.symbol, network: wallet.network } }
    });
    if (existing) {
      await prisma.cryptoWallet.update({
        where: { id: existing.id },
        data: {
          address: wallet.address,
          label: wallet.label,
          enabled: wallet.enabled,
          depositInstructions: `Send only ${wallet.symbol} on ${wallet.network}. Deposits are reviewed before crediting.`
        }
      });
    } else {
      await prisma.cryptoWallet.create({
        data: {
          ...wallet,
          depositInstructions: `Send only ${wallet.symbol} on ${wallet.network}. Deposits are reviewed before crediting.`
        }
      });
    }
  }

  const kyc = await ensureKyc(client.id, admin.id);
  await ensureCardApplication(client.id);
  const retirementAccount = await ensureRetirementAccount(client.id);
  await ensureRetirementContribution(retirementAccount.id, "Employee", "Payroll contribution", 1500, 126.42, new Date("2026-06-01"));
  await ensureRetirementContribution(retirementAccount.id, "Employer Match", "Morgan Holdings match", 600, 52.12, new Date("2026-06-01"));
  await ensureRetirementContribution(retirementAccount.id, "Employee", "Payroll contribution", 1500, 118.75, new Date("2026-05-01"));
  await ensureRetirementWithdrawal(retirementAccount.id, client.id, admin.id);
  await ensureTransferRequest(client.id, checking.id);
  await ensureSupportTicket(client.id, admin.id);
  await ensureAnnouncement(admin.id);

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "SEED_COMPLETED",
      entity: "System",
      entityId: kyc.id,
      metadata: { userEmail, adminEmail }
    }
  });

  console.log("Grand Central Liberty Bank seed complete.");
}

async function ensureAccount(userId: string, data: {
  type: "CHECKING" | "SAVINGS" | "CRYPTO";
  accountNumber: string;
  balance: number;
  availableBalance: number;
}) {
  const existing = await prisma.account.findUnique({ where: { accountNumber: data.accountNumber } });
  if (existing) return existing;
  return prisma.account.create({
    data: {
      userId,
      type: data.type,
      accountNumber: data.accountNumber,
      balance: data.balance,
      availableBalance: data.availableBalance
    }
  });
}

async function ensureKyc(userId: string, adminId: string) {
  const existing = await prisma.kycSubmission.findFirst({ where: { userId, documentType: "PASSPORT" } });
  if (existing) return existing;
  const kyc = await prisma.kycSubmission.create({
    data: {
      userId,
      documentType: "PASSPORT",
      documentUrl: "/seed/passport.pdf",
      selfieUrl: "/seed/selfie.jpg",
      status: "PENDING"
    }
  });
  await prisma.kycNote.create({
    data: {
      kycSubmissionId: kyc.id,
      authorId: adminId,
      body: "Initial documents received. Proof of address may be requested during review.",
      visibleToUser: true
    }
  });
  return kyc;
}

async function ensureCardApplication(userId: string) {
  const existing = await prisma.cardApplication.findFirst({ where: { userId, type: "SIGNATURE" } });
  if (existing) return existing;
  return prisma.cardApplication.create({
    data: {
      userId,
      type: "SIGNATURE",
      occupation: "Technology Executive",
      annualIncome: 240000,
      employer: "Morgan Holdings",
      address: "51 Park Avenue, New York, NY",
      governmentIdUrl: "/seed/government-id.pdf",
      status: "UNDER_REVIEW"
    }
  });
}

async function ensureRetirementAccount(userId: string) {
  const existing = await prisma.retirementAccount.findUnique({ where: { accountNumber: "401K778812" } });
  if (existing) return existing;
  return prisma.retirementAccount.create({
    data: {
      userId,
      accountNumber: "401K778812",
      balance: 56500.20,
      vestedBalance: 48200.12,
      contributionYtd: 9500,
      employerMatchYtd: 6400,
      investmentGrowthPlaceholder: "+8.4% projected annualized growth",
      withdrawalEligibilityStatus: "Eligible for hardship review after compliance approval",
      status: "ACTIVE"
    }
  });
}

async function ensureRetirementContribution(
  retirementAccountId: string,
  source: string,
  description: string,
  amount: number,
  growthAmount: number,
  contributionDate: Date
) {
  const existing = await prisma.retirementContribution.findFirst({
    where: { retirementAccountId, source, amount, contributionDate }
  });
  if (existing) return existing;
  return prisma.retirementContribution.create({
    data: { retirementAccountId, source, description, amount, growthAmount, contributionDate }
  });
}

async function ensureRetirementWithdrawal(retirementAccountId: string, userId: string, adminId: string) {
  const existing = await prisma.retirementWithdrawalRequest.findFirst({
    where: { retirementAccountId, amount: 25000, reason: "Hardship withdrawal request for family medical expenses" }
  });
  if (existing) return existing;
  const withdrawal = await prisma.retirementWithdrawalRequest.create({
    data: {
      retirementAccountId,
      userId,
      amount: 25000,
      currency: "USD",
      reason: "Hardship withdrawal request for family medical expenses",
      status: "SUBMITTED",
      complianceMessage: defaultRetirementWithdrawalMessage,
      feeName: defaultRetirementFeeSettings.feeName,
      feePercentage: defaultRetirementFeeSettings.feePercentage,
      feeAmount: 875,
      feeReason: defaultRetirementFeeSettings.feeReason,
      paymentMethod: defaultRetirementFeeSettings.paymentMethod,
      feeEnabled: true
    }
  });
  await prisma.retirementWithdrawalNote.create({
    data: {
      retirementWithdrawalRequestId: withdrawal.id,
      authorId: adminId,
      body: "Pending compliance review. Crypto deposit requirement disclosed before submission.",
      visibleToUser: false
    }
  });
  return withdrawal;
}

async function ensureTransferRequest(userId: string, fromAccountId: string) {
  const existing = await prisma.transferRequest.findFirst({
    where: { userId, fromAccountId, beneficiaryName: "Olivia Bennett", amount: 5000 }
  });
  if (existing) return existing;
  return prisma.transferRequest.create({
    data: {
      userId,
      fromAccountId,
      type: "INTERNATIONAL",
      beneficiaryName: "Olivia Bennett",
      beneficiaryBank: "Liberty Correspondent Bank",
      beneficiaryAccount: "9044558800",
      ibanSwift: "LIBCUS33",
      amount: 5000,
      currency: "USD",
      purpose: "Investment funding",
      status: "SUBMITTED"
    }
  });
}

async function ensureSupportTicket(userId: string, adminId: string) {
  const existing = await prisma.supportTicket.findFirst({ where: { userId, subject: "Wire transfer review" } });
  if (existing) return existing;
  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      assignedAdminId: adminId,
      subject: "Wire transfer review",
      status: "ACTIVE"
    }
  });
  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: adminId,
      body: "Hello Alexander. I can help verify the wire transfer you initiated."
    }
  });
  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: userId,
      body: "I need help with the international wire transfer I initiated."
    }
  });
  return ticket;
}

async function ensureAnnouncement(adminId: string) {
  const existing = await prisma.announcementBanner.findFirst({ where: { title: "Enhanced transfer review is active" } });
  if (existing) return existing;
  return prisma.announcementBanner.create({
    data: {
      createdById: adminId,
      title: "Enhanced transfer review is active",
      body: "International transfers may require additional verification before release.",
      tone: "INFO",
      audience: "USER",
      locale: "en",
      active: true,
      href: "/support"
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
