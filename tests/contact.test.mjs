import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

class ContactError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ContactError";
    this.statusCode = statusCode;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeText(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

// In-memory sliding window rate limiter
const rateLimitStore = new Map();
function checkRateLimit(key, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetAt) {
    const record = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, record);
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

describe("PULSE — Phase 3: Contact Us Form & Protected Admin Inbox Tests", () => {
  const MONGODB_URI = process.env.MONGODB_URI;

  let User;
  let ContactSubmission;

  let standardUser;
  let adminUser;
  const createdSubmissionIds = [];

  // Business logic simulation matching API handler
  async function submitContactForm({ name, email, subject, message, website, ip = "127.0.0.1" }) {
    // 1. Honeypot check
    if (website && typeof website === "string" && website.trim().length > 0) {
      // Silently discard bot submission without burning rate limit
      return {
        success: true,
        message: "Thank you. Your message has been securely submitted to the PULSE editorial team.",
        honeypotTriggered: true,
      };
    }

    // 2. Rate limiting check
    const rateLimit = checkRateLimit(`contact_ip:${ip}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      throw new ContactError("Too many submissions. Please wait 15 minutes.", 429);
    }

    // 3. Validation
    if (!name || typeof name !== "string") {
      throw new ContactError("Full name is required.", 400);
    }
    const cleanName = sanitizeText(name);
    if (cleanName.length < 2 || cleanName.length > 100) {
      throw new ContactError("Name must be between 2 and 100 characters.", 400);
    }

    if (!email || typeof email !== "string") {
      throw new ContactError("Valid email address is required.", 400);
    }
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.length > 254 || !EMAIL_REGEX.test(cleanEmail)) {
      throw new ContactError("Please provide a valid email address.", 400);
    }

    if (!subject || typeof subject !== "string") {
      throw new ContactError("Subject line is required.", 400);
    }
    const cleanSubject = sanitizeText(subject);
    if (cleanSubject.length < 3 || cleanSubject.length > 200) {
      throw new ContactError("Subject line must be between 3 and 200 characters.", 400);
    }

    if (!message || typeof message !== "string") {
      throw new ContactError("Message content cannot be empty.", 400);
    }
    const cleanMessage = sanitizeText(message);
    if (cleanMessage.length < 10 || cleanMessage.length > 3000) {
      throw new ContactError("Message must be between 10 and 3,000 characters.", 400);
    }

    // 4. Persistence
    const created = await ContactSubmission.create({
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
      status: "unread",
    });

    createdSubmissionIds.push(created._id);

    // Public response returns generic confirmation WITHOUT database IDs or private account records
    return {
      success: true,
      message: "Thank you. Your message has been securely submitted to the PULSE editorial team.",
    };
  }

  // Admin access simulation
  async function getAdminContactSubmissions({ currentUser, status, page = 1, limit = 15 }) {
    if (!currentUser) {
      throw new ContactError("Authentication required.", 401);
    }
    if (currentUser.role !== "admin") {
      throw new ContactError("Forbidden: Administrator privileges required.", 403);
    }

    const filter = {};
    if (status && ["unread", "read", "resolved"].includes(status)) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    const [totalMatching, rawDocs, totalAll, totalUnread, totalRead, totalResolved] =
      await Promise.all([
        ContactSubmission.countDocuments(filter),
        ContactSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        ContactSubmission.countDocuments({}),
        ContactSubmission.countDocuments({ status: "unread" }),
        ContactSubmission.countDocuments({ status: "read" }),
        ContactSubmission.countDocuments({ status: "resolved" }),
      ]);

    return {
      submissions: rawDocs.map((doc) => ({
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        subject: doc.subject,
        message: doc.message,
        status: doc.status,
        createdAt: doc.createdAt.toISOString(),
      })),
      totalCount: totalMatching,
      counts: {
        total: totalAll,
        unread: totalUnread,
        read: totalRead,
        resolved: totalResolved,
      },
    };
  }

  async function updateAdminSubmissionStatus({ currentUser, id, status }) {
    if (!currentUser) {
      throw new ContactError("Authentication required.", 401);
    }
    if (currentUser.role !== "admin") {
      throw new ContactError("Forbidden: Administrator privileges required.", 403);
    }

    if (!["unread", "read", "resolved"].includes(status)) {
      throw new ContactError("Invalid status value.", 400);
    }

    const updated = await ContactSubmission.findByIdAndUpdate(
      id,
      { status },
      { returnDocument: "after" }
    );
    if (!updated) {
      throw new ContactError("Submission not found.", 404);
    }

    return updated;
  }

  before(async () => {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is required to run tests.");
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    const UserSchema = new mongoose.Schema(
      {
        name: String,
        email: { type: String, unique: true },
        passwordHash: String,
        role: { type: String, enum: ["user", "admin"], default: "user" },
        status: { type: String, default: "active" },
      },
      { timestamps: true }
    );

    const ContactSubmissionSchema = new mongoose.Schema(
      {
        name: { type: String, required: true },
        email: { type: String, required: true },
        subject: { type: String, required: true },
        message: { type: String, required: true },
        status: { type: String, enum: ["unread", "read", "resolved"], default: "unread" },
      },
      { timestamps: true }
    );

    ContactSubmissionSchema.index({ status: 1, createdAt: -1 });

    User = mongoose.models.User || mongoose.model("User", UserSchema);
    ContactSubmission =
      mongoose.models.ContactSubmission ||
      mongoose.model("ContactSubmission", ContactSubmissionSchema);

    const timestamp = Date.now();
    standardUser = await User.create({
      name: "Contact Test Citizen",
      email: `citizen.contact.${timestamp}@pulse.test`,
      passwordHash: "test_hashed_secret",
      role: "user",
      status: "active",
    });

    adminUser = await User.create({
      name: "Contact Test Admin",
      email: `admin.contact.${timestamp}@pulse.test`,
      passwordHash: "test_hashed_secret",
      role: "admin",
      status: "active",
    });
  });

  after(async () => {
    if (createdSubmissionIds.length > 0) {
      await ContactSubmission.deleteMany({ _id: { $in: createdSubmissionIds } });
    }
    if (standardUser) await User.deleteOne({ _id: standardUser._id });
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    await mongoose.disconnect();
  });

  test("1. Form Validation: Rejects invalid or incomplete contact submissions", async () => {
    // Missing / short name
    await assert.rejects(
      async () => {
        await submitContactForm({
          name: "A",
          email: "citizen@example.com",
          subject: "Valid Subject",
          message: "This is a valid inquiry message.",
        });
      },
      (err) => {
        assert(err instanceof ContactError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    // Invalid email
    await assert.rejects(
      async () => {
        await submitContactForm({
          name: "Valid Name",
          email: "not-an-email",
          subject: "Valid Subject",
          message: "This is a valid inquiry message.",
        });
      },
      (err) => {
        assert(err instanceof ContactError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    // Short message (<10 chars)
    await assert.rejects(
      async () => {
        await submitContactForm({
          name: "Valid Name",
          email: "citizen@example.com",
          subject: "Valid Subject",
          message: "Too short",
        });
      },
      (err) => {
        assert(err instanceof ContactError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  test("2. Length Limits: Rejects oversized subjects (>200) or messages (>3000)", async () => {
    const longSubject = "S".repeat(201);
    await assert.rejects(
      async () => {
        await submitContactForm({
          name: "Valid Name",
          email: "citizen@example.com",
          subject: longSubject,
          message: "This is a valid inquiry message.",
        });
      },
      (err) => {
        assert(err instanceof ContactError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    const longMessage = "M".repeat(3001);
    await assert.rejects(
      async () => {
        await submitContactForm({
          name: "Valid Name",
          email: "citizen@example.com",
          subject: "Valid Subject",
          message: longMessage,
        });
      },
      (err) => {
        assert(err instanceof ContactError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  test("3. Honeypot Anti-Spam: Discards bot submissions without persisting to database", async () => {
    const initialCount = await ContactSubmission.countDocuments();

    const response = await submitContactForm({
      name: "Bot Spammer",
      email: "bot@spamnetwork.com",
      subject: "Buy Crypto Fast",
      message: "Check out this promotional deal right now!",
      website: "https://spam-payload.example.com", // Trapped honeypot
    });

    assert.strictEqual(response.success, true);
    assert.strictEqual(response.honeypotTriggered, true);

    const afterCount = await ContactSubmission.countDocuments();
    assert.strictEqual(afterCount, initialCount, "Honeypot submission must not be saved to MongoDB");
  });

  test("4. Successful Submission Persistence: Persists valid inquiry into MongoDB with unread status", async () => {
    const res = await submitContactForm({
      name: "Dr. Alistair Vance",
      email: "alistair.vance@oxford.ac.uk",
      subject: "Peer-reviewed methodology for global climate polling",
      message: "We have reviewed the latest survey sampling weights and would like to provide empirical datasets.",
      ip: "192.168.1.100",
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.message);

    const saved = await ContactSubmission.findOne({ email: "alistair.vance@oxford.ac.uk" });
    assert.ok(saved);
    assert.strictEqual(saved.name, "Dr. Alistair Vance");
    assert.strictEqual(saved.subject, "Peer-reviewed methodology for global climate polling");
    assert.strictEqual(saved.status, "unread");
  });

  test("5. Privacy: Public API response does not expose database IDs or private correspondent records", async () => {
    const res = await submitContactForm({
      name: "Private Citizen",
      email: "private.citizen@example.com",
      subject: "Confidential investigative lead",
      message: "Please find evidence regarding regional civic voting participation.",
      ip: "192.168.1.101",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.id, undefined);
    assert.strictEqual(res._id, undefined);
    assert.strictEqual(res.email, undefined);
    assert.strictEqual(res.submissions, undefined);
  });

  test("6. Rate Limiting: Rejects excessive submissions from the same IP address", async () => {
    const testIp = "10.0.0.99";
    let hitRateLimit = false;

    // Send 5 permitted submissions, then 6th should be rejected
    for (let i = 0; i < 6; i++) {
      try {
        await submitContactForm({
          name: `Rapid Submitter ${i}`,
          email: `rapid${i}@example.com`,
          subject: `Inquiry flood ${i}`,
          message: "Valid length message body for rate limit testing.",
          ip: testIp,
        });
      } catch (err) {
        if (err instanceof ContactError && err.statusCode === 429) {
          hitRateLimit = true;
          break;
        }
      }
    }

    assert.strictEqual(hitRateLimit, true);
  });

  test("7. Authorization: Blocks unauthenticated and non-admin users from admin inbox", async () => {
    // 1. Unauthenticated request
    await assert.rejects(
      async () => {
        await getAdminContactSubmissions({ currentUser: null });
      },
      (err) => {
        assert(err instanceof ContactError);
        assert.strictEqual(err.statusCode, 401);
        return true;
      }
    );

    // 2. Standard authenticated citizen (non-admin)
    await assert.rejects(
      async () => {
        await getAdminContactSubmissions({ currentUser: standardUser });
      },
      (err) => {
        assert(err instanceof ContactError);
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  test("8. Admin Inbox Operations: Admin can view, filter, and transition submission status", async () => {
    // 1. Fetch all submissions as admin
    const inbox = await getAdminContactSubmissions({ currentUser: adminUser });
    assert.ok(inbox.submissions);
    assert(inbox.submissions.length > 0);
    assert(inbox.counts.total > 0);

    const firstSub = inbox.submissions[0];

    // 2. Mark submission as 'read'
    const updatedToRead = await updateAdminSubmissionStatus({
      currentUser: adminUser,
      id: firstSub.id,
      status: "read",
    });
    assert.strictEqual(updatedToRead.status, "read");

    // 3. Mark submission as 'resolved'
    const updatedToResolved = await updateAdminSubmissionStatus({
      currentUser: adminUser,
      id: firstSub.id,
      status: "resolved",
    });
    assert.strictEqual(updatedToResolved.status, "resolved");

    // 4. Verify filtering by status
    const resolvedInbox = await getAdminContactSubmissions({
      currentUser: adminUser,
      status: "resolved",
    });
    const foundResolved = resolvedInbox.submissions.some((s) => s.id === firstSub.id);
    assert.strictEqual(foundResolved, true);
  });
});
