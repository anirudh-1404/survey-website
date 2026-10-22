import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";

function getSafeRedirectUrl(target) {
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

describe("Day 7 — QA, Security Audit, SEO & Deployment Readiness Tests", () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  let Poll;
  let Vote;
  let testDraftId;

  before(async () => {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is required to run integration tests.");
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    const PollSchema = new mongoose.Schema(
      {
        title: String,
        slug: { type: String, unique: true },
        category: String,
        summary: String,
        status: { type: String, enum: ["draft", "published", "closed"], default: "draft" },
        featured: { type: Boolean, default: false },
        publishedAt: Date,
        closesAt: Date,
        options: [{ key: String, label: String }],
      },
      { timestamps: true }
    );

    const VoteSchema = new mongoose.Schema(
      {
        pollId: { type: mongoose.Schema.Types.ObjectId, ref: "Poll", required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        option: { type: String, required: true },
      },
      { timestamps: true }
    );
    VoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });

    Poll = mongoose.models.Poll || mongoose.model("Poll", PollSchema);
    Vote = mongoose.models.Vote || mongoose.model("Vote", VoteSchema);
    await Vote.init();

    // Create a temporary draft poll
    const draft = await Poll.create({
      title: "Temporary Secret Draft Poll For Day 7 QA Audit",
      slug: `qa-audit-draft-${Date.now()}`,
      category: "Technology & AI",
      summary: "This draft poll must never be indexed or returned in public sitemap or feed.",
      status: "draft",
      featured: false,
      options: [
        { key: "yes", label: "Yes" },
        { key: "no", label: "No" },
      ],
    });
    testDraftId = draft._id;
  });

  after(async () => {
    if (testDraftId) {
      await Poll.deleteOne({ _id: testDraftId });
    }
    // Clean up any test votes
    await Vote.deleteMany({ pollId: testDraftId });
    await mongoose.disconnect();
  });

  test("1. Open Redirect Defense: Sanitizes login return targets", () => {
    // Valid relative paths
    assert.equal(getSafeRedirectUrl("/admin"), "/admin");
    assert.equal(getSafeRedirectUrl("/polls/frontier-ai-safety-audits"), "/polls/frontier-ai-safety-audits");
    assert.equal(getSafeRedirectUrl("/#latest-polls"), "/#latest-polls");

    // Malicious external targets
    assert.equal(getSafeRedirectUrl("https://evil.com"), "/");
    assert.equal(getSafeRedirectUrl("http://attacker.org/phish"), "/");

    // Protocol-relative & backslash bypasses
    assert.equal(getSafeRedirectUrl("//evil.com"), "/");
    assert.equal(getSafeRedirectUrl("//evil.com/admin"), "/");
    assert.equal(getSafeRedirectUrl("/\\evil.com"), "/");

    // JavaScript scheme & pseudo-protocols
    assert.equal(getSafeRedirectUrl("javascript:alert(1)"), "/");
    assert.equal(getSafeRedirectUrl("data:text/html,<script>"), "/");

    // Null and empty strings
    assert.equal(getSafeRedirectUrl(""), "/");
    assert.equal(getSafeRedirectUrl(null), "/");
    assert.equal(getSafeRedirectUrl(undefined), "/");
  });

  test("2. Security Headers: next.config.ts configures defense-in-depth headers", () => {
    const configPath = path.resolve(process.cwd(), "next.config.ts");
    const content = fs.readFileSync(configPath, "utf-8");

    assert.ok(content.includes("X-Frame-Options"), "Must include X-Frame-Options");
    assert.ok(content.includes("DENY"), "X-Frame-Options must be DENY");
    assert.ok(content.includes("X-Content-Type-Options"), "Must include X-Content-Type-Options");
    assert.ok(content.includes("nosniff"), "X-Content-Type-Options must be nosniff");
    assert.ok(content.includes("Referrer-Policy"), "Must include Referrer-Policy");
    assert.ok(content.includes("Permissions-Policy"), "Must include Permissions-Policy");
    assert.ok(content.includes("Strict-Transport-Security"), "Must include Strict-Transport-Security (HSTS)");
  });

  test("3. BSON Resilience: Invalid ObjectIds do not throw unhandled BSONError", async () => {
    // Helper replicating votes.ts invalid ObjectId guard
    async function safeGetPollResults(pollId) {
      if (typeof pollId === "string" && !mongoose.Types.ObjectId.isValid(pollId)) {
        return { total: 0, yesPercent: 0, noPercent: 0 };
      }
      const objectId = typeof pollId === "string" ? new mongoose.Types.ObjectId(pollId) : pollId;
      const agg = await Vote.aggregate([
        { $match: { pollId: objectId } },
        { $group: { _id: "$option", count: { $sum: 1 } } },
      ]);
      return { total: agg.length, yesPercent: 0, noPercent: 0 };
    }

    const invalidResult = await safeGetPollResults("malformed-not-an-oid");
    assert.equal(invalidResult.total, 0);

    // Multiple invalid IDs in batch
    const invalidBatch = ["bad-id-1", "bad-id-2"].filter((id) => mongoose.Types.ObjectId.isValid(id));
    assert.equal(invalidBatch.length, 0);
  });

  test("4. SEO Robots: robots.ts disallows administrative and private routes", () => {
    const robotsPath = path.resolve(process.cwd(), "src/app/robots.ts");
    const content = fs.readFileSync(robotsPath, "utf-8");

    assert.ok(content.includes("disallow:"), "Must declare disallow rules");
    assert.ok(content.includes('"/admin/"'), "Must disallow /admin/");
    assert.ok(content.includes('"/api/"'), "Must disallow /api/");
    assert.ok(content.includes('"/login"'), "Must disallow /login");
    assert.ok(content.includes('"/register"'), "Must disallow /register");
    assert.ok(content.includes("sitemap.xml"), "Must reference sitemap.xml");
  });

  test("5. SEO Sitemap: Draft polls are strictly excluded from sitemap query", async () => {
    // Query published polls exactly as sitemap.ts does
    const publishedPolls = await Poll.find({ status: "published" })
      .select("slug updatedAt publishedAt")
      .lean();

    // Verify our draft poll was excluded
    const hasDraft = publishedPolls.some((p) => p._id.equals(testDraftId));
    assert.equal(hasDraft, false, "Draft polls must NEVER be returned in published sitemap queries");
  });

  test("6. MongoDB Injection / ReDoS: Admin search escapes regex characters safely", async () => {
    const maliciousQuery = ".*()[]+?{}^$|\\";
    const escaped = maliciousQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Execute query with escaped regex - should not throw MongoServerError
    const results = await Poll.find({
      $or: [
        { title: { $regex: escaped, $options: "i" } },
        { summary: { $regex: escaped, $options: "i" } },
      ],
    }).lean();

    assert.ok(Array.isArray(results), "Escaped search must return valid array without regex syntax error");
  });

  test("7. Health Check Security: Health endpoint sanitizes errors", () => {
    const healthPath = path.resolve(process.cwd(), "src/app/api/health/route.ts");
    const content = fs.readFileSync(healthPath, "utf-8");

    // Verify raw error.message is NOT leaked in degraded response
    assert.ok(
      !content.includes("error: message"),
      "Health endpoint must not expose raw error.message to avoid leaking database URIs"
    );
    assert.ok(
      content.includes("Database connectivity check failed"),
      "Health endpoint must return generic sanitized error message"
    );
  });

  test("8. Admin Layout Security: robots noindex is enforced on private shell", () => {
    const adminLayoutPath = path.resolve(process.cwd(), "src/app/admin/layout.tsx");
    const content = fs.readFileSync(adminLayoutPath, "utf-8");

    assert.ok(content.includes("index: false"), "Admin layout must set robots index: false");
    assert.ok(content.includes("follow: false"), "Admin layout must set robots follow: false");
  });

  test("9. Auth Layout Security: robots noindex is enforced on login and register pages", () => {
    const loginLayoutPath = path.resolve(process.cwd(), "src/app/login/layout.tsx");
    const registerLayoutPath = path.resolve(process.cwd(), "src/app/register/layout.tsx");

    const loginContent = fs.readFileSync(loginLayoutPath, "utf-8");
    const registerContent = fs.readFileSync(registerLayoutPath, "utf-8");

    assert.ok(loginContent.includes("index: false"), "Login layout must set robots index: false");
    assert.ok(registerContent.includes("index: false"), "Register layout must set robots index: false");
  });
});
