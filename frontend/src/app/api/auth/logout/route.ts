import { handleApi, ok } from "@/lib/api";
import { revokeCurrentSession, sessionCookieName } from "@/lib/auth";

export async function POST() {
  return handleApi(async () => {
    await revokeCurrentSession();
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
