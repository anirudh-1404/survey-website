import { getSessionFromCookies, SessionWithUser } from "@/lib/session";
import { NextResponse } from "next/server";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Retrieve current authenticated user and session, or null if unauthenticated.
 */
export async function getCurrentUser(): Promise<SessionWithUser | null> {
  return await getSessionFromCookies();
}

/**
 * Require valid authentication for Server Components or Route Handlers.
 * Throws AuthError(401) if not logged in.
 */
export async function requireAuth(): Promise<SessionWithUser> {
  const sessionWithUser = await getCurrentUser();
  if (!sessionWithUser) {
    throw new AuthError("Authentication required to access this resource", 401);
  }
  return sessionWithUser;
}

/**
 * Require administrator role for Server Components or Route Handlers.
 * Throws AuthError(401) if not logged in, or AuthError(403) if not an admin.
 */
export async function requireAdmin(): Promise<SessionWithUser> {
  const sessionWithUser = await requireAuth();
  if (sessionWithUser.user.role !== "admin") {
    throw new AuthError(
      "Forbidden: Administrator privileges required to access this resource",
      403
    );
  }
  return sessionWithUser;
}

/**
 * Origin / CSRF verification for state-changing HTTP requests.
 * Compares Origin or Referer against the Host / X-Forwarded-Host header.
 */
export function verifyCsrfOrigin(request: Request): boolean {
  // Only state-changing methods require CSRF validation
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (!host) {
    return false;
  }

  const allowedDomain = host.toLowerCase().split(":")[0];

  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.hostname.toLowerCase() === allowedDomain;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.hostname.toLowerCase() === allowedDomain;
    } catch {
      return false;
    }
  }

  // If both origin and referer are missing in a browser POST, reject
  return false;
}

/**
 * Simple in-memory sliding window rate limiter.
 *
 * NOTE FOR PRODUCTION:
 * This in-memory store operates on a single process instance. In multi-container,
 * edge, or distributed serverless deployments, rate limiting should be backed
 * by Redis (e.g. Upstash) or an API Gateway / Cloudflare WAF.
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60 * 1000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetAt) {
    const record: RateLimitRecord = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, record);
    return { allowed: true, remaining: limit - 1, resetAt: record.resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Standardized JSON error response for API routes.
 */
export function createErrorResponse(
  message: string,
  statusCode = 400,
  errors?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(errors ? { errors } : {}),
    },
    { status: statusCode }
  );
}

/**
 * Standardized JSON success response for API routes.
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: statusCode }
  );
}

/**
 * Validate redirect path to prevent Open Redirect attacks.
 * Only internal relative paths starting with a single '/' are permitted.
 */
export function getSafeRedirectUrl(target: string | null | undefined): string {
  if (!target || typeof target !== "string") return "/";
  const trimmed = target.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes(":")
  ) {
    return trimmed;
  }
  return "/";
}

