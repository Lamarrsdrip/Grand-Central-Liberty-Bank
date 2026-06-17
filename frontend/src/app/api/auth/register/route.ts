import { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { Role } from "@prisma/client";
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

async function createRetirementWelcomeAccount(userId: string) {
  const bankSettings = await prisma.bankSetting.findUnique({ where: { id: 1 } });
  const bonusEnabled = bankSettings?.welcomeBonusEnabled ?? true;
  const bonusAmount = bonusEnabled ? Number(bankSettings?.welcomeBonusAmount ?? 500) : 0;
  const welcomeBonus = Number.isFinite(bonusAmount) && bonusAmount > 0 ? bonusAmount : 0;

  const retirementAccount = await prisma.retirementAccount.create({
    data: {
      userId,
      accountNumber: accountNumber("401K"),
      balance: welcomeBonus,
      vestedBalance: welcomeBonus,
      contributionYtd: welcomeBonus,
      employerMatchYtd: 0,
      investmentGrowthPlaceholder: "Investment growth begins after portfolio allocation review",
      withdrawalEligibilityStatus: "Pending standard retirement compliance review",
      status: "ACTIVE"
    }
  });

  if (welcomeBonus > 0) {
    await prisma.retirementContribution.create({
      data: {
        retirementAccountId: retirementAccount.id,
        source: "Grand Central Liberty Bank",
        description: "New account 401(k) welcome bonus",
        amount: welcomeBonus,
        growthAmount: 0,
        contributionDate: new Date()
      }
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

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        country: input.country,
        address: input.address,
        dateOfBirth: new Date(input.dateOfBirth),
        passwordHash: await hashPassword(input.password),
        role: Role.USER,
        preferredLocale: detectedLocale
      }
    });

    // Create accounts as separate operations — nested writes require MongoDB transactions
    // (replica set / P2031). Separate creates work on standalone MongoDB.
    try {
      await prisma.account.create({
        data: { userId: user.id, type: "CHECKING", accountNumber: accountNumber("44"), balance: 0, availableBalance: 0 }
      });
      await prisma.account.create({
        data: { userId: user.id, type: "SAVINGS", accountNumber: accountNumber("55"), balance: 0, availableBalance: 0 }
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
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: await sha256(rawToken),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
        }
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
