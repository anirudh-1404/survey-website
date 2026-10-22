import { NextRequest } from "next/server";
import {
  invalidateSession,
  clearSessionCookie,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
import {
  verifyCsrfOrigin,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 1. CSRF Protection
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Cross-site request validation failed", 403);
    }

    // 2. Extract Token and Invalidate Server Session
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await invalidateSession(token);
    }

    // 3. Clear HttpOnly Cookie
    await clearSessionCookie();

    return createSuccessResponse({ message: "Successfully logged out" });
  } catch {
    return createErrorResponse("An internal server error occurred", 500);
  }
}
