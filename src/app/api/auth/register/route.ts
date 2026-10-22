import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashPassword, validatePassword, PasswordValidationError } from "@/lib/password";
import { createSessionRecord, setSessionCookie } from "@/lib/session";
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

    // 2. Rate Limiting (5 registrations per minute per IP)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";
    const rateLimit = checkRateLimit(`register:${ip}`, 5, 60 * 1000);
    if (!rateLimit.allowed) {
      return createErrorResponse(
        "Too many registration attempts. Please try again in one minute.",
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

    const { name, email, password, confirmPassword } = body;
    const errors: Record<string, string> = {};

    // 4. Server-Side Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      errors.name = "Full name must be at least 2 characters long";
    } else if (name.trim().length > 100) {
      errors.name = "Full name cannot exceed 100 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      errors.email = "Please provide a valid email format";
    }

    try {
      validatePassword(password);
    } catch (err) {
      errors.password =
        err instanceof PasswordValidationError
          ? err.message
          : "Invalid password requirements";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      return createErrorResponse("Validation failed", 422, errors);
    }

    // 5. Database Connection
    await connectToDatabase();
    const normalizedEmail = (email as string).trim().toLowerCase();

    // 6. Duplicate Email Check
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return createErrorResponse(
        "An account with this email address already exists. Please log in.",
        409
      );
    }

    // 7. Secure Hashing & Persistence
    // Role is strictly locked to "user" — client input cannot escalate roles
    const passwordHash = await hashPassword(password as string);
    const user = await User.create({
      name: (name as string).trim(),
      email: normalizedEmail,
      passwordHash,
      role: "user",
      status: "active",
    });

    // 8. Session Establishment
    const userAgent = request.headers.get("user-agent") || undefined;
    const { token, expiresAt } = await createSessionRecord(user._id, {
      userAgent,
      ipAddress: ip,
    });

    await setSessionCookie(token, expiresAt);

    return createSuccessResponse(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      201
    );
  } catch (error) {
    const isMongooseDuplicate =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000;

    if (isMongooseDuplicate) {
      return createErrorResponse(
        "An account with this email address already exists.",
        409
      );
    }

    // Do not leak stack traces or internal DB error details to clients
    return createErrorResponse("An internal server error occurred", 500);
  }
}
