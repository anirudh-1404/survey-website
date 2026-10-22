import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128; // Prevent oversized payload CPU exhaustion DoS

export class PasswordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordValidationError";
  }
}

/**
 * Validate password requirements prior to hashing.
 */
export function validatePassword(password: unknown): string {
  if (typeof password !== "string") {
    throw new PasswordValidationError("Password must be a valid text string");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new PasswordValidationError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    );
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new PasswordValidationError(
      `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`
    );
  }

  return password;
}

/**
 * Hash password securely with bcrypt using 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  const validated = validatePassword(password);
  return bcrypt.hash(validated, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(
  password: unknown,
  hash: unknown
): Promise<boolean> {
  if (typeof password !== "string" || typeof hash !== "string") {
    return false;
  }

  // Prevent bcrypt library processing of oversized strings
  if (password.length > MAX_PASSWORD_LENGTH) {
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
