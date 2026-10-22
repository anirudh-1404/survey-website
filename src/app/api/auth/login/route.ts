import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { verifyPassword } from "@/lib/password";
import {
  createSessionRecord,
  setSessionCookie,
  invalidateSession,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
import {
  verifyCsrfOrigin,
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 1. CSRF Protection
    if (!verifyCsrfOrigin(request)) {
      return createErrorResponse("Cross-site request validation failed", 403);
    }

    // 2. Rate Limiting (10 login attempts per minute per IP)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";
    const rateLimit = checkRateLimit(`login:${ip}`, 10, 60 * 1000);
    if (!rateLimit.allowed) {
      return createErrorResponse(
        "Too many login attempts. Please wait one minute before trying again.",
        429
      );
    }

    // 3. Parse JSON Body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Malformed JSON request payload", 400);
    }

    const { email, password } = body;

    // 4. Basic presence check
    if (
      !email ||
      typeof email !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return createErrorResponse("Email and password are required", 422);
    }

    // 5. Database Connection
    await connectToDatabase();
    const normalizedEmail = email.trim().toLowerCase();

    // 6. User Lookup
    const user = await User.findOne({ email: normalizedEmail });

    // 7. Generic credential failure to prevent user enumeration
    if (!user) {
      // Execute dummy password verification to maintain constant response timing
      await verifyPassword("dummy-password", "$2a$12$e8Y6/59g.3Z5P5Z5P5Z5P.dummyhashdummyhashdummyhash");
      return createErrorResponse("Invalid email or password", 401);
    }

    if (user.status !== "active") {
      return createErrorResponse(
        "This account has been deactivated. Please contact support.",
        403
      );
    }

    // 8. Password Verification
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return createErrorResponse("Invalid email or password", 401);
    }

    // 9. Session Fixation Defense: Invalidate any old session token in cookies
    const existingToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (existingToken) {
      await invalidateSession(existingToken);
    }

    // 10. Issue Fresh Server Session
    const userAgent = request.headers.get("user-agent") || undefined;
    const { token, expiresAt } = await createSessionRecord(user._id, {
      userAgent,
      ipAddress: ip,
    });

    await setSessionCookie(token, expiresAt);

    return createSuccessResponse({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch {
    return createErrorResponse("An internal server error occurred", 500);
  }
}
