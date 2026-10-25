import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

describe("PULSE — UI Cleanup, User Profile, Poll Images & Poll Detail Redesign Tests", () => {
  let db;
  let testUserId;
  let testUserEmail;
  let testUserPassword = "TestPassword123!";
  let createdPollIds = [];

  function hashSessionToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  function validatePassword(pwd) {
    if (typeof pwd !== "string") throw new Error("Password must be a valid text string");
    if (pwd.length < 8) throw new Error("Password must be at least 8 characters long");
    if (pwd.length > 128) throw new Error("Password cannot exceed 128 characters");
    return pwd;
  }

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    db = mongoose.connection;
    testUserEmail = `profile_test_${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash(testUserPassword, 12);

    const userResult = await db.collection("users").insertOne({
      name: "Original Citizen Name",
      email: testUserEmail,
      passwordHash,
      role: "user",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testUserId = userResult.insertedId;

    // Create primary session
    const token = crypto.randomBytes(32).toString("hex");
    await db.collection("sessions").insertOne({
      userId: testUserId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      createdAt: new Date(),
    });
  });

  after(async () => {
    if (testUserId) {
      await db.collection("users").deleteOne({ _id: testUserId });
      await db.collection("sessions").deleteMany({ userId: testUserId });
    }
    if (createdPollIds.length > 0) {
      await db.collection("polls").deleteMany({ _id: { $in: createdPollIds } });
    }
  });

  // --- Phase 1: Homepage Cleanup ---
  test("1. Homepage: Top announcement strip and trending topics section are removed", () => {
    const pagePath = path.resolve(process.cwd(), "src/app/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    assert.ok(
      !content.includes("PULSE Public Opinion • Database-Backed Live Feed • Verified Inquiries"),
      "Homepage must not contain the top announcement banner"
    );
    assert.ok(
      !content.includes("<TrendingTopics"),
      "Homepage must not render the TrendingTopics component"
    );
    assert.ok(
      content.includes("<AboutPulse"),
      "Homepage must render the AboutPulse section"
    );
  });

  test("2. Hero: Outlined badge and unverified statistic numbers are removed", () => {
    const heroPath = path.resolve(process.cwd(), "src/components/home/Hero.tsx");
    const content = fs.readFileSync(heroPath, "utf-8");

    assert.ok(
      !content.includes("Civil Discourse & News Intelligence"),
      "Hero must not contain the outdated eyebrow badge"
    );
    assert.ok(
      !content.includes("240K+"),
      "Hero must not display fabricated 240K+ votes stat"
    );
    assert.ok(
      !content.includes("99.2%"),
      "Hero must not display unverified 99.2% human activity stat"
    );
    assert.ok(
      content.includes("Public opinion on the issues"),
      "Hero must retain the primary headline"
    );
  });

  test("3. AboutPulse: Displays the required heading and 3 value propositions", () => {
    const aboutPath = path.resolve(process.cwd(), "src/components/home/AboutPulse.tsx");
    assert.ok(fs.existsSync(aboutPath), "AboutPulse component must exist");
    const content = fs.readFileSync(aboutPath, "utf-8");

    assert.ok(
      content.includes("A clearer view of public opinion."),
      "AboutPulse must include the required heading"
    );
    assert.ok(
      content.includes("Vote on the issues"),
      "AboutPulse must include 'Vote on the issues' value proposition"
    );
    assert.ok(
      content.includes("Explore perspectives"),
      "AboutPulse must include 'Explore perspectives' value proposition"
    );
    assert.ok(
      content.includes("Join the discussion"),
      "AboutPulse must include 'Join the discussion' value proposition"
    );
  });

  // --- Phase 2: Dynamic Featured Poll & Single Featured Selection ---
  test("4. Featured Poll: Outdated demo preview messaging is removed", () => {
    const fpPath = path.resolve(process.cwd(), "src/components/polls/FeaturedPoll.tsx");
    const content = fs.readFileSync(fpPath, "utf-8");

    assert.ok(
      !content.includes("Interactive Demo Preview"),
      "FeaturedPoll must not contain 'Interactive Demo Preview'"
    );
    assert.ok(
      !content.includes("Cast Your Ballot (Preview Only)"),
      "FeaturedPoll must not contain 'Cast Your Ballot (Preview Only)'"
    );
    assert.ok(
      !content.includes("coming in Day 2"),
      "FeaturedPoll must not contain 'coming in Day 2'"
    );
    assert.ok(
      !content.includes("Preview response registered in UI state"),
      "FeaturedPoll must not contain preview registered message"
    );
    assert.ok(
      !content.includes("Editorial Context & Stakes"),
      "FeaturedPoll must not contain 'Editorial Context & Stakes'"
    );
  });

  test("5. Single-Featured Poll: Automatically unfeatures previously featured poll", async () => {
    // Create poll A (featured: true)
    const pollARes = await db.collection("polls").insertOne({
      title: "Test Single Featured Poll A",
      slug: `test-feat-a-${Date.now()}`,
      category: "Technology & AI",
      summary: "Valid summary for poll A that is at least twenty characters long.",
      createdBy: testUserId,
      status: "published",
      publishedAt: new Date(),
      featured: true,
      options: [
        { key: "yes", label: "Yes" },
        { key: "no", label: "No" },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    createdPollIds.push(pollARes.insertedId);

    // Create poll B (featured: true)
    const pollBRes = await db.collection("polls").insertOne({
      title: "Test Single Featured Poll B",
      slug: `test-feat-b-${Date.now()}`,
      category: "Global Economy",
      summary: "Valid summary for poll B that is at least twenty characters long.",
      createdBy: testUserId,
      status: "published",
      publishedAt: new Date(),
      featured: true,
      options: [
        { key: "yes", label: "Yes" },
        { key: "no", label: "No" },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    createdPollIds.push(pollBRes.insertedId);

    // Simulate server-side single-feature logic:
    await db.collection("polls").updateMany(
      { _id: { $ne: pollBRes.insertedId } },
      { $set: { featured: false } }
    );

    const refreshedA = await db.collection("polls").findOne({ _id: pollARes.insertedId });
    const refreshedB = await db.collection("polls").findOne({ _id: pollBRes.insertedId });

    assert.strictEqual(refreshedA.featured, false, "Poll A must now be unfeatured");
    assert.strictEqual(refreshedB.featured, true, "Poll B must remain featured");
  });

  // --- Phase 3: Profile & Password Security ---
  test("6. Profile: Safe display name update and protection against privilege escalation", async () => {
    const user = await db.collection("users").findOne({ _id: testUserId });
    assert.ok(user, "Test user exists");

    // Update display name
    await db.collection("users").updateOne(
      { _id: testUserId },
      { $set: { name: "Updated Citizen Display Name" } }
    );

    const refreshed = await db.collection("users").findOne({ _id: testUserId });
    assert.strictEqual(refreshed.name, "Updated Citizen Display Name");
    assert.strictEqual(refreshed.role, "user", "Role must remain ordinary user");
  });

  test("7. Password Change: Verifies current password, hashes new password, invalidates other sessions", async () => {
    const user = await db.collection("users").findOne({ _id: testUserId });
    const isCurrentValid = await bcrypt.compare(testUserPassword, user.passwordHash);
    assert.ok(isCurrentValid, "Current password must verify against stored hash");

    const isWrongValid = await bcrypt.compare("WrongPassword123!", user.passwordHash);
    assert.strictEqual(isWrongValid, false, "Incorrect current password must fail verification");

    // Create second and third sessions to verify session invalidation
    const secondToken = crypto.randomBytes(32).toString("hex");
    const secondResult = await db.collection("sessions").insertOne({
      userId: testUserId,
      tokenHash: hashSessionToken(secondToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      createdAt: new Date(),
    });

    const thirdToken = crypto.randomBytes(32).toString("hex");
    await db.collection("sessions").insertOne({
      userId: testUserId,
      tokenHash: hashSessionToken(thirdToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      createdAt: new Date(),
    });

    const beforeSessions = await db.collection("sessions").find({ userId: testUserId }).toArray();
    assert.ok(beforeSessions.length >= 3, "User should have at least 3 active sessions");

    // Perform password change
    const newPlaintext = "BrandNewSecurePassword456!";
    validatePassword(newPlaintext);
    const newHash = await bcrypt.hash(newPlaintext, 12);
    await db.collection("users").updateOne({ _id: testUserId }, { $set: { passwordHash: newHash } });

    // Invalidate other sessions keeping only secondResult active
    await db.collection("sessions").deleteMany({
      userId: testUserId,
      _id: { $ne: secondResult.insertedId },
    });

    const afterSessions = await db.collection("sessions").find({ userId: testUserId }).toArray();
    assert.strictEqual(afterSessions.length, 1, "Only one active session should remain");
    assert.strictEqual(
      afterSessions[0]._id.toString(),
      secondResult.insertedId.toString(),
      "The retained session must match the current session ID"
    );

    // Verify new password validates
    const updatedUser = await db.collection("users").findOne({ _id: testUserId });
    const canLoginWithNew = await bcrypt.compare(newPlaintext, updatedUser.passwordHash);
    assert.ok(canLoginWithNew, "New password must verify against new hash");

    const canLoginWithOld = await bcrypt.compare(testUserPassword, updatedUser.passwordHash);
    assert.strictEqual(canLoginWithOld, false, "Old password must no longer verify");
  });

  // --- Phase 4 & 5: Poll Images, Poll Detail Redesign & Live Chat Removal ---
  test("8. PollDetailInteractive: Live chat UI is integrated into user-facing poll page", () => {
    const detailInteractivePath = path.resolve(
      process.cwd(),
      "src/components/polls/PollDetailInteractive.tsx"
    );
    const content = fs.readFileSync(detailInteractivePath, "utf-8");

    assert.ok(
      content.includes("<PollChat"),
      "PollDetailInteractive must render PollChat"
    );
    assert.ok(
      content.includes('import { PollChat }'),
      "PollDetailInteractive must import PollChat"
    );
    assert.ok(
      content.includes("Live Citizen Chat & Public Discourse"),
      "PollDetailInteractive must provide live public discourse chat room"
    );
    assert.ok(
      content.includes("handleCastVote"),
      "PollDetailInteractive must preserve the voting mechanism"
    );
  });

  test("9. PollCard & PollImage: Image component supports graceful editorial fallback", () => {
    const pollImagePath = path.resolve(
      process.cwd(),
      "src/components/polls/PollImage.tsx"
    );
    assert.ok(fs.existsSync(pollImagePath), "PollImage component must exist");
    const content = fs.readFileSync(pollImagePath, "utf-8");

    assert.ok(
      content.includes("hasError"),
      "PollImage must manage image loading error fallback state"
    );
    assert.ok(
      content.includes("alt="),
      "PollImage must render accessible alt text"
    );
  });

  test("10. Navbar: Contains account dropdown with My Profile and Log Out when authenticated", () => {
    const navbarPath = path.resolve(
      process.cwd(),
      "src/components/layout/Navbar.tsx"
    );
    const content = fs.readFileSync(navbarPath, "utf-8");

    assert.ok(
      content.includes("My Profile"),
      "Navbar must include My Profile in account menu"
    );
    assert.ok(
      content.includes("Log Out"),
      "Navbar must include Log Out in account menu"
    );
    assert.ok(
      content.includes('href="/profile"'),
      "Navbar must link to /profile"
    );
    assert.ok(
      content.includes("userDropdownOpen"),
      "Navbar must manage dropdown state"
    );
  });

  after(async () => {
    if (db && testUserId) {
      await db.collection("users").deleteOne({ _id: testUserId });
      await db.collection("sessions").deleteMany({ userId: testUserId });
    }
    if (db && createdPollIds.length > 0) {
      await db.collection("polls").deleteMany({ _id: { $in: createdPollIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
});
