import { NextResponse } from "next/server";
import { expiredSessionCookie } from "../../../../lib/auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(expiredSessionCookie());
  return response;
}
