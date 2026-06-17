import { handleApi, ok } from "@/lib/api";
import { revokeCurrentSession, sessionCookieName } from "@/lib/auth";

export async function POST() {
  return handleApi(async () => {
    // Best-effort: always clear the cookie even if the DB revocation fails.
    // If revokeCurrentSession throws (e.g. P2031), the user must still be
    // signed out from the browser's perspective.
    await revokeCurrentSession().catch((err) => {
      console.error("[auth] revokeCurrentSession failed:", err);
    });
    const response = ok({ success: true });
    response.cookies.set(sessionCookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      path: "/"
    });
    return response;
  });
}
