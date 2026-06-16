import { cookies } from "next/headers";
import { handleApi, ok } from "@/lib/api";
import { issueCsrfToken, verifyCsrfToken } from "@/lib/csrf";

export async function GET() {
  return handleApi(async () => {
    const cookieStore = await cookies();
    let token = cookieStore.get("gclb_csrf")?.value;

    // Re-issue if missing or signature no longer valid.
    if (!token || !(await verifyCsrfToken(token))) {
      token = await issueCsrfToken();
    }

    const response = ok({ token });
    response.cookies.set("gclb_csrf", token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
    return response;
  });
}
