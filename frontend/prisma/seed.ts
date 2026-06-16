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

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@gclbank.local";
  const userEmail = process.env.SEED_USER_EMAIL ?? "client@gclbank.local";
  const adminPassword = requiredEnv("SEED_ADMIN_PASSWORD");
  const userPassword = requiredEnv("SEED_USER_PASSWORD");

  await prisma.bankSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
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
  });

  await prisma.transferSetting.upsert({
    where: { id: 1 },
    update: defaultTransferSettings,
    create: { id: 1, ...defaultTransferSettings }
  });

  await prisma.retirementFeeSetting.upsert({
    where: { id: 1 },
    update: {
      feeName: defaultRetirementFeeSettings.feeName,
      feePercentage: defaultRetirementFeeSettings.feePercentage,
      feeReason: defaultRetirementFeeSettings.feeReason,
      paymentMethod: defaultRetirementFeeSettings.paymentMethod,
      enabled: defaultRetirementFeeSettings.enabled,
      complianceMessage: defaultRetirementFeeSettings.complianceMessage
    },
    create: { id: 1, ...defaultRetirementFeeSettings }
  });

  await prisma.emailSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      smtpHost: process.env.SMTP_HOST ?? "smtp.gmail.com",
      smtpPort: Number(process.env.SMTP_PORT ?? 465),
      smtpSecure: process.env.SMTP_SECURE !== "false",
      senderName: "Grand Central Liberty Bank"
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
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

  const client = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      firstName: "Idris",
      lastName: "Morgan",
      email: userEmail,
      phone: "+12025550211",
      country: "United States",
      address: "51 Park Avenue, New York, NY",
      dateOfBirth: new Date("1990-05-20"),
      passwordHash: await bcrypt.hash(userPassword, 12),
      role: "USER",
      emailVerifiedAt: new Date(),
      accounts: {
        create: [
          {
            type: "CHECKING",
            accountNumber: "4582009044",
            balance: 28420.45,
            availableBalance: 28420.45,
            transactions: {
              create: [
                { type: "DEBIT", amount: -6.45, description: "Starbucks Coffee", reference: "TXN-SBUX-0645", status: "POSTED" },
                { type: "DEBIT", amount: -89.99, description: "Amazon.com", reference: "TXN-AMZN-8999", status: "POSTED" },
                { type: "CREDIT", amount: 3250, description: "Salary Deposit", reference: "TXN-SALARY-3250", status: "POSTED" },
                { type: "DEBIT", amount: -18.32, description: "Uber Technologies", reference: "TXN-UBER-1832", status: "POSTED" },
                { type: "DEBIT", amount: -250, description: "Crypto Purchase", reference: "TXN-CRYPTO-250", status: "POSTED" }
              ]
            }
          },
          {
            type: "SAVINGS",
            accountNumber: "2047008821",
            balance: 67880.30,
            availableBalance: 67880.30,
            transactions: {
              create: [
                { type: "CREDIT", amount: 625, description: "Liberty Reserve Interest", reference: "TXN-INTEREST-625", status: "POSTED" }
              ]
            }
          },
          {
            type: "CRYPTO",
            accountNumber: "0011004412",
            balance: 34250.15,
            availableBalance: 34250.15
          }
        ]
      }
    }
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
  for (const w of wallets) {
    await prisma.cryptoWallet.upsert({
      where: { symbol_network: { symbol: w.symbol, network: w.network } },
      update: {},
      create: w
    });
  }

  const kyc = await prisma.kycSubmission.create({
    data: {
      userId: client.id,
      documentType: "PASSPORT",
      documentUrl: "/seed/passport.pdf",
      selfieUrl: "/seed/selfie.jpg",
      status: "PENDING",
      notesHistory: {
        create: {
          authorId: admin.id,
          body: "Initial documents received. Proof of address may be requested during review.",
          visibleToUser: true
        }
      }
    }
  });

  await prisma.cardApplication.create({
    data: {
      userId: client.id,
      type: "SIGNATURE",
      occupation: "Technology Executive",
      annualIncome: 240000,
      employer: "Morgan Holdings",
      address: "51 Park Avenue, New York, NY",
      governmentIdUrl: "/seed/government-id.pdf",
      status: "UNDER_REVIEW"
    }
  });

  const retirementAccount = await prisma.retirementAccount.upsert({
    where: { accountNumber: "401K778812" },
    update: {},
    create: {
      userId: client.id,
      accountNumber: "401K778812",
      balance: 56500.20,
      vestedBalance: 48200.12,
      contributionYtd: 9500,
      employerMatchYtd: 6400,
      investmentGrowthPlaceholder: "+8.4% projected annualized growth",
      withdrawalEligibilityStatus: "Eligible for hardship review after compliance approval",
      status: "ACTIVE",
      contributions: {
        create: [
          {
            source: "Employee",
            description: "Payroll contribution",
            amount: 1500,
            growthAmount: 126.42,
            contributionDate: new Date("2026-06-01")
          },
          {
            source: "Employer Match",
            description: "Morgan Holdings match",
            amount: 600,
            growthAmount: 52.12,
            contributionDate: new Date("2026-06-01")
          },
          {
            source: "Employee",
            description: "Payroll contribution",
            amount: 1500,
            growthAmount: 118.75,
            contributionDate: new Date("2026-05-01")
          }
        ]
      }
    }
  });

  await prisma.retirementWithdrawalRequest.create({
    data: {
      retirementAccountId: retirementAccount.id,
      userId: client.id,
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
      feeEnabled: true,
      notes: {
        create: {
          authorId: admin.id,
          body: "Pending compliance review. Crypto deposit requirement disclosed before submission.",
          visibleToUser: false
        }
      }
    }
  });

  const checking = await prisma.account.findFirstOrThrow({ where: { userId: client.id, type: "CHECKING" } });
  await prisma.transferRequest.create({
    data: {
      userId: client.id,
      fromAccountId: checking.id,
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

  await prisma.supportTicket.create({
    data: {
      userId: client.id,
      assignedAdminId: admin.id,
      subject: "Wire transfer review",
      status: "ACTIVE",
      messages: {
        create: [
          { senderId: admin.id, body: "Hello Alexander. I can help verify the wire transfer you initiated." },
          { senderId: client.id, body: "I need help with the international wire transfer I initiated." }
        ]
      }
    }
  });

  await prisma.announcementBanner.create({
    data: {
      createdById: admin.id,
      title: "Enhanced transfer review is active",
      body: "International transfers may require additional verification before release.",
      tone: "INFO",
      audience: "USER",
      locale: "en",
      active: true,
      href: "/support"
    }
  });

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

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
