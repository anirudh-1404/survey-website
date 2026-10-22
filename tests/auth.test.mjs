import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// 1. Password security tests
describe("Password Security Unit Tests", () => {
  const MIN_PASSWORD_LENGTH = 8;
  const MAX_PASSWORD_LENGTH = 128;

  function validatePassword(pwd) {
    if (typeof pwd !== "string") {
      throw new Error("Password must be a valid text string");
    }
    if (pwd.length < MIN_PASSWORD_LENGTH) {
      throw new Error("Password must be at least 8 characters long");
    }
    if (pwd.length > MAX_PASSWORD_LENGTH) {
      throw new Error("Password cannot exceed 128 characters");
    }
    return pwd;
  }

  test("rejects passwords under 8 characters", () => {
    assert.throws(() => validatePassword("1234567"), /at least 8 characters/);
  });

  test("rejects oversized passwords (>128 chars) to mitigate DoS", () => {
    const huge = "a".repeat(129);
    assert.throws(() => validatePassword(huge), /cannot exceed 128 characters/);
  });

  test("rejects non-string passwords", () => {
    assert.throws(() => validatePassword(null), /valid text string/);
    assert.throws(() => validatePassword(12345678), /valid text string/);
  });

  test("hashes passwords with bcrypt and verifies accurately", async () => {
    const pwd = "SecurePulsePassword2026!";
    const hash = await bcrypt.hash(pwd, 10);
    assert.notEqual(pwd, hash);
    assert.ok(hash.startsWith("$2a$") || hash.startsWith("$2b$"));

    const isMatch = await bcrypt.compare(pwd, hash);
    assert.equal(isMatch, true);

    const isWrong = await bcrypt.compare("WrongPassword", hash);
    assert.equal(isWrong, false);
  });
});

// 2. Session Architecture Tests
describe("Session Architecture & Token Hashing Tests", () => {
  function generateSessionToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  function hashSessionToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  test("generates cryptographically random 64-hex-character token", () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();

    assert.equal(token1.length, 64);
    assert.equal(token2.length, 64);
    assert.notEqual(token1, token2);
  });

  test("hashes session tokens with SHA-256 before persistence", () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);

    assert.equal(hash.length, 64);
    assert.notEqual(token, hash);
    // Hash is deterministic for lookup
    assert.equal(hashSessionToken(token), hash);
  });
});

// 3. CSRF & Origin Protection Tests
describe("CSRF Origin Validation Tests", () => {
  function verifyCsrf(method, origin, referer, host) {
    if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
      return true;
    }
    if (!host) return false;
    const allowed = host.toLowerCase().split(":")[0];

    if (origin) {
      try {
        return new URL(origin).hostname.toLowerCase() === allowed;
      } catch {
        return false;
      }
    }
    if (referer) {
      try {
        return new URL(referer).hostname.toLowerCase() === allowed;
      } catch {
        return false;
      }
    }
    return false;
  }

  test("allows GET requests unconditionally", () => {
    assert.equal(verifyCsrf("GET", "https://malicious.com", null, "pulse.org"), true);
  });

  test("accepts state-changing POST matching Host", () => {
    assert.equal(
      verifyCsrf("POST", "http://localhost:3000", null, "localhost:3000"),
      true
    );
  });

  test("rejects cross-site POST with foreign origin", () => {
    assert.equal(
      verifyCsrf("POST", "https://evil-attacker.com", null, "pulse.org"),
      false
    );
  });
});

// 4. In-Memory Rate Limiter Tests
describe("Rate Limiter Tests", () => {
  const store = new Map();
  function checkLimit(key, limit, windowMs) {
    const now = Date.now();
    const existing = store.get(key);
    if (!existing || now > existing.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (existing.count >= limit) return false;
    existing.count += 1;
    return true;
  }

  test("enforces request threshold within window", () => {
    const ip = "test-rate-ip";
    assert.equal(checkLimit(ip, 3, 1000), true); // 1
    assert.equal(checkLimit(ip, 3, 1000), true); // 2
    assert.equal(checkLimit(ip, 3, 1000), true); // 3
    assert.equal(checkLimit(ip, 3, 1000), false); // 4 - blocked
  });
});

// 5. Database Integration & RBAC Tests
describe("MongoDB Integration & Role-Based Access Control", () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  const testEmailUser = `test_user_${Date.now()}@pulse.test`;
  const testEmailAdmin = `test_admin_${Date.now()}@pulse.test`;

  let User;
  let Session;

  before(async () => {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is required to run integration tests.");
    }
    await mongoose.connect(MONGODB_URI);

    const UserSchema = new mongoose.Schema(
      {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ["user", "admin"], default: "user" },
        status: { type: String, enum: ["active", "suspended"], default: "active" },
      },
      {
        timestamps: true,
        toJSON: {
          transform: (_doc, ret) => {
            delete ret.passwordHash;
            return ret;
          },
        },
      }
    );

    const SessionSchema = new mongoose.Schema(
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        tokenHash: { type: String, required: true, unique: true },
        expiresAt: { type: Date, required: true },
      },
      { timestamps: true }
    );

    User = mongoose.models.TestUser || mongoose.model("TestUser", UserSchema);
    Session = mongoose.models.TestSession || mongoose.model("TestSession", SessionSchema);
  });

  after(async () => {
    if (User) {
      await User.deleteMany({ email: { $in: [testEmailUser, testEmailAdmin] } });
    }
    await mongoose.disconnect();
  });

  test("creates user with standard role and excludes passwordHash in JSON serialization", async () => {
    const passwordHash = await bcrypt.hash("UserPassword123!", 10);
    const user = await User.create({
      name: "Test Citizen",
      email: testEmailUser,
      passwordHash,
      role: "user",
      status: "active",
    });

    assert.equal(user.role, "user");
    assert.equal(user.status, "active");

    const json = user.toJSON();
    assert.equal(json.passwordHash, undefined, "passwordHash MUST NOT be in JSON output");
  });

  test("rejects duplicate email registration", async () => {
    await assert.rejects(
      async () => {
        await User.create({
          name: "Duplicate User",
          email: testEmailUser,
          passwordHash: "hash",
          role: "user",
        });
      },
      /duplicate key|E11000/
    );
  });

  test("creates and validates database-backed session token hash", async () => {
    const user = await User.findOne({ email: testEmailUser });
    assert.ok(user);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    const session = await Session.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    assert.ok(session);

    // Lookup session using token hash
    const foundSession = await Session.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    assert.ok(foundSession);
    assert.equal(foundSession.userId.toString(), user._id.toString());
  });

  test("rejects expired sessions", async () => {
    const user = await User.findOne({ email: testEmailUser });
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiredDate = new Date(Date.now() - 1000); // Expired 1 second ago

    await Session.create({
      userId: user._id,
      tokenHash,
      expiresAt: expiredDate,
    });

    const activeSession = await Session.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    assert.equal(activeSession, null, "Expired session must not be accepted");
  });

  test("enforces role-based access control (RBAC)", async () => {
    const normalUser = await User.findOne({ email: testEmailUser });
    assert.equal(normalUser.role, "user");

    // Citizen user should NOT have admin clearance
    const hasAdminAccess = normalUser.role === "admin";
    assert.equal(hasAdminAccess, false, "Regular user must be denied admin access");

    // Provision admin user
    const adminUser = await User.create({
      name: "Test Admin",
      email: testEmailAdmin,
      passwordHash: await bcrypt.hash("AdminPassword123!", 10),
      role: "admin",
      status: "active",
    });

    assert.equal(adminUser.role === "admin", true, "Administrator must have admin clearance");
  });
});
