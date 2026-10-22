import crypto from "crypto";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { Session, ISession } from "@/models/Session";
import { User, UserSafeResponse } from "@/models/User";
import mongoose from "mongoose";

export const SESSION_COOKIE_NAME = "pulse_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Generate a cryptographically random 32-byte opaque session token (64 hex characters).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Compute SHA-256 hash of session token for database storage.
 * Only the hash is stored in MongoDB, ensuring tokens cannot be compromised from a DB breach.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface SessionWithUser {
  session: ISession;
  user: UserSafeResponse;
}

/**
 * Persist a new server session in MongoDB and return the unhashed token.
 */
export async function createSessionRecord(
  userId: string | mongoose.Types.ObjectId,
  metadata?: { userAgent?: string; ipAddress?: string }
): Promise<{ token: string; expiresAt: Date; session: ISession }> {
  await connectToDatabase();

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const session = await Session.create({
    userId,
    tokenHash,
    expiresAt,
    userAgent: metadata?.userAgent,
    ipAddress: metadata?.ipAddress,
  });

  return { token, expiresAt, session };
}

/**
 * Validate an unhashed session token against MongoDB.
 * Ensures the session exists, has not expired, and belongs to an active user.
 */
export async function validateSessionToken(
  token: string
): Promise<SessionWithUser | null> {
  if (!token || typeof token !== "string" || token.length < 32) {
    return null;
  }

  await connectToDatabase();

  const tokenHash = hashSessionToken(token);
  const session = await Session.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    return null;
  }

  const user = await User.findById(session.userId);
  if (!user || user.status !== "active") {
    // If user is inactive or deleted, remove the orphan session
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  const userSafe: UserSafeResponse = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };

  return { session, user: userSafe };
}

/**
 * Invalidate a session by its unhashed token.
 */
export async function invalidateSession(token: string): Promise<boolean> {
  if (!token) return false;
  await connectToDatabase();

  const tokenHash = hashSessionToken(token);
  const result = await Session.deleteOne({ tokenHash });
  return (result.deletedCount ?? 0) > 0;
}

/**
 * Invalidate all active sessions for a user (e.g. on password reset or account security event).
 */
export async function invalidateAllUserSessions(
  userId: string | mongoose.Types.ObjectId
): Promise<number> {
  await connectToDatabase();
  const result = await Session.deleteMany({ userId });
  return result.deletedCount ?? 0;
}

/**
 * Helper to set HttpOnly session cookie in Next.js Server Actions or Route Handlers.
 */
export async function setSessionCookie(
  token: string,
  expiresAt: Date
): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Helper to clear session cookie in Next.js.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Retrieve and validate the current session from incoming cookies.
 */
export async function getSessionFromCookies(): Promise<SessionWithUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await validateSessionToken(token);
  } catch {
    return null;
  }
}
