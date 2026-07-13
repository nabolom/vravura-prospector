import { NextResponse } from "next/server";
import {
  authenticateCredentials,
  createSessionToken,
  safeReturnPath,
  sessionCookie,
} from "../../../../lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const returnTo = safeReturnPath(String(formData.get("returnTo") ?? "/"));

  try {
    const user = await authenticateCredentials(email, password);
    if (!user) return loginRedirect(request, returnTo, "credentials");

    const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
    response.cookies.set(sessionCookie(await createSessionToken(user.email)));
    return response;
  } catch (error) {
    console.error("Login failed", error instanceof Error ? error.message : "unknown error");
    return loginRedirect(request, returnTo, "credentials");
  }
}

function loginRedirect(request: Request, returnTo: string, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  if (returnTo !== "/") url.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(url, 303);
}
