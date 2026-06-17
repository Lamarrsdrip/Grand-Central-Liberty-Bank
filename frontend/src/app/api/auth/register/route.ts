import { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { Role, type User } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { created, handleApi } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { createSession, hashPassword, requestIpAndAgent, sessionCookieName, sha256 } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/utils";
import { assertRateLimit } from "@/lib/security";
import { registrationSchema } from "@/lib/validators";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  detectLocaleFromAcceptLanguage,
  isSupportedLocale
} from "@/lib/locales";

function accountNumber(prefix: string) {
  return `${prefix}${Math.floor(1000000000 + Math.random() * 8999999999)}`;
}

function isMongoTransactionError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2031";
}

async function createUserRecord(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  dateOfBirth: Date;
  passwordHash: string;
  preferredLocale: string;
}): Promise<User> {
  try {
    return await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        country: input.country,
        address: input.address,
        dateOfBirth: input.dateOfBirth,
        passwordHash: input.passwordHash,
        role: Role.USER,
        preferredLocale: input.preferredLocale
      }
    });
  } catch (error) {
    if (!isMongoTransactionError(error)) {
      throw error;
    }

    const userId = randomBytes(12).toString("hex");
    const now = new Date();
    await prisma.$runCommandRaw({
      insert: "User",
      documents: [
        {
          _id: { $oid: userId },
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          country: input.country,
          address: input.address,
          dateOfBirth: { $date: input.dateOfBirth.toISOString() },
          passwordHash: input.passwordHash,
          role: Role.USER,
          status: "ACTIVE",
          twoFactorEnabled: false,
          preferredLocale: input.preferredLocale,
          themePreference: "system",
          createdAt: { $date: now.toISOString() },
          updatedAt: { $date: now.toISOString() }
        }
      ],
      writeConcern: { w: 1 }
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User creation failed.");
    }
    return user;
  }
}

async function createAccountRecord(input: {
  userId: string;
  type: "CHECKING" | "SAVINGS";
  accountNumber: string;
  balance: number;
  availableBalance: number;
}) {
  try {
    return await prisma.account.create({ data: input });
  } catch (error) {
    if (!isMongoTransactionError(error)) throw error;
    const id = randomBytes(12).toString("hex");
    const now = new Date();
    await prisma.$runCommandRaw({
      insert: "Account",
      documents: [
        {
          _id: { $oid: id },
          userId: { $oid: input.userId },
          type: input.type,
          currency: "USD",
          accountNumber: input.accountNumber,
          balance: input.balance,
          availableBalance: input.availableBalance,
          status: "ACTIVE",
          createdAt: { $date: now.toISOString() },
          updatedAt: { $date: now.toISOString() }
        }
      ],
      writeConcern: { w: 1 }
    });
    return { id, ...input };
  }
}

async function createRetirementAccountRecord(input: {
  userId: string;
  accountNumber: string;
  balance: number;
  vestedBalance: number;
  contributionYtd: number;
  employerMatchYtd: number;
  investmentGrowthPlaceholder: string;
  withdrawalEligibilityStatus: string;
  status: "ACTIVE";
}) {
  try {
    return await prisma.retirementAccount.create({ data: input });
  } catch (error) {
    if (!isMongoTransactionError(error)) throw error;
    const id = randomBytes(12).toString("hex");
    const now = new Date();
    await prisma.$runCommandRaw({
      insert: "RetirementAccount",
      documents: [
        {
          _id: { $oid: id },
          userId: { $oid: input.userId },
          accountNumber: input.accountNumber,
          balance: input.balance,
          vestedBalance: input.vestedBalance,
          contributionYtd: input.contributionYtd,
          employerMatchYtd: input.employerMatchYtd,
          investmentGrowthPlaceholder: input.investmentGrowthPlaceholder,
          withdrawalEligibilityStatus: input.withdrawalEligibilityStatus,
          status: input.status,
          createdAt: { $date: now.toISOString() },
          updatedAt: { $date: now.toISOString() }
        }
      ],
      writeConcern: { w: 1 }
    });
    return { id, ...input };
  }
}

async function createRetirementContributionRecord(input: {
  retirementAccountId: string;
  source: string;
  description: string;
  amount: number;
  growthAmount: number;
  contributionDate: Date;
}) {
  try {
    await prisma.retirementContribution.create({ data: input });
  } catch (error) {
    if (!isMongoTransactionError(error)) throw error;
    await prisma.$runCommandRaw({
      insert: "RetirementContribution",
      documents: [
        {
          _id: { $oid: randomBytes(12).toString("hex") },
          retirementAccountId: { $oid: input.retirementAccountId },
          source: input.source,
          description: input.description,
          amount: input.amount,
          growthAmount: input.growthAmount,
          currency: "USD",
          contributionDate: { $date: input.contributionDate.toISOString() },
          createdAt: { $date: new Date().toISOString() }
        }
      ],
      writeConcern: { w: 1 }
    });
  }
}

async function createEmailVerificationTokenRecord(input: { userId: string; tokenHash: string; expiresAt: Date }) {
  try {
    await prisma.emailVerificationToken.create({ data: input });
  } catch (error) {
    if (!isMongoTransactionError(error)) throw error;
    await prisma.$runCommandRaw({
      insert: "EmailVerificationToken",
      documents: [
        {
          _id: { $oid: randomBytes(12).toString("hex") },
          userId: { $oid: input.userId },
          tokenHash: input.tokenHash,
          expiresAt: { $date: input.expiresAt.toISOString() },
          createdAt: { $date: new Date().toISOString() }
        }
      ],
      writeConcern: { w: 1 }
    });
  }
}

async function createRetirementWelcomeAccount(userId: string) {
  const bankSettings = await prisma.bankSetting.findUnique({ where: { id: 1 } });
  const bonusEnabled = bankSettings?.welcomeBonusEnabled ?? true;
  const bonusAmount = bonusEnabled ? Number(bankSettings?.welcomeBonusAmount ?? 500) : 0;
  const welcomeBonus = Number.isFinite(bonusAmount) && bonusAmount > 0 ? bonusAmount : 0;

  const retirementAccount = await createRetirementAccountRecord({
    userId,
    accountNumber: accountNumber("401K"),
    balance: welcomeBonus,
    vestedBalance: welcomeBonus,
    contributionYtd: welcomeBonus,
    employerMatchYtd: 0,
    investmentGrowthPlaceholder: "Investment growth begins after portfolio allocation review",
    withdrawalEligibilityStatus: "Pending standard retirement compliance review",
    status: "ACTIVE"
  });

  if (welcomeBonus > 0) {
    await createRetirementContributionRecord({
      retirementAccountId: retirementAccount.id,
      source: "Grand Central Liberty Bank",
      description: "New account 401(k) welcome bonus",
      amount: welcomeBonus,
      growthAmount: 0,
      contributionDate: new Date()
    });
  }

  return { retirementAccount, welcomeBonus };
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    assertRateLimit(request, "register", 5);
    const input = registrationSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      throw new Response("Email address is already registered.", { status: 409 });
    }

    const cookieStore = await cookies();
    const headerStore = await headers();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const detectedLocale = isSupportedLocale(cookieLocale)
      ? cookieLocale
      : detectLocaleFromAcceptLanguage(headerStore.get("accept-language")) ?? DEFAULT_LOCALE;

    const user = await createUserRecord({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      country: input.country,
      address: input.address,
      dateOfBirth: new Date(input.dateOfBirth),
      passwordHash: await hashPassword(input.password),
      preferredLocale: detectedLocale
    });

    // Create accounts as separate operations — nested writes require MongoDB transactions
    // (replica set / P2031). Separate creates work on standalone MongoDB.
    try {
      await createAccountRecord({
        userId: user.id,
        type: "CHECKING",
        accountNumber: accountNumber("44"),
        balance: 0,
        availableBalance: 0
      });
      await createAccountRecord({
        userId: user.id,
        type: "SAVINGS",
        accountNumber: accountNumber("55"),
        balance: 0,
        availableBalance: 0
      });
    } catch (error) {
      console.error("[register] account creation failed:", error);
    }

    let retirementAccount: { id: string } | null = null;
    let welcomeBonus = 0;
    try {
      const retirement = await createRetirementWelcomeAccount(user.id);
      retirementAccount = retirement.retirementAccount;
      welcomeBonus = retirement.welcomeBonus;
    } catch (error) {
      console.error("[register] createRetirementWelcomeAccount failed:", error);
    }

    try {
      const rawToken = crypto.randomUUID();
      await createEmailVerificationTokenRecord({
        userId: user.id,
        tokenHash: await sha256(rawToken),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
      });
      await sendEmail({
        to: user.email,
        subject: "Verify your Grand Central Liberty Bank email",
        html: `<p>Welcome to Grand Central Liberty Bank.</p><p><a href="${absoluteUrl(`/verify-email?token=${rawToken}`)}">Verify your email address</a></p>`
      }).catch((error) => {
        console.error("[auth] verification email failed", error);
      });
    } catch (error) {
      console.error("[register] emailVerificationToken.create failed:", error);
    }

    const { ip, userAgent } = await requestIpAndAgent();
    const session = await createSession(user, { ip, userAgent });
    await auditLog({
      actorId: user.id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: user.id,
      metadata: {
        retirementAccountId: retirementAccount?.id ?? null,
        welcomeBonus401k: welcomeBonus
      },
      ip,
      userAgent
    });

    if (welcomeBonus > 0) {
      await auditLog({
        actorId: user.id,
        action: "WELCOME_BONUS_401K_CREDITED",
        entity: "RetirementAccount",
        entityId: retirementAccount?.id ?? null,
        metadata: { amount: welcomeBonus, currency: "USD" },
        ip,
        userAgent
      });
    }

    const response = created({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }
    });
    response.cookies.set(sessionCookieName, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: session.expiresAt,
      path: "/"
    });
    return response;
  });
}
