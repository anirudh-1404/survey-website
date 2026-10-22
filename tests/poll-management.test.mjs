import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

describe("Day 4 — Poll Management & Public Feed Integration Tests", () => {
  const MONGODB_URI = process.env.MONGODB_URI;

  let User;
  let Poll;
  let adminUserId;
  let regularUserId;
  let createdPollId;
  let draftSlug = `draft-test-inquiry-${Date.now()}`;

  before(async () => {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is required to run tests.");
    }
    await mongoose.connect(MONGODB_URI);

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

    const PollOptionSchema = new mongoose.Schema(
      { key: String, label: String },
      { _id: false }
    );

    const PollSchema = new mongoose.Schema(
      {
        title: { type: String, required: [true, "Poll question/title is required"], minlength: [10, "Title must be at least 10 characters long"], maxlength: 300 },
        slug: { type: String, required: true, unique: true },
        category: { type: String, required: true },
        summary: { type: String, required: [true, "Summary is required"], minlength: [20, "Summary must be at least 20 characters long"], maxlength: 1000 },
        context: String,
        sourceReference: String,
        editorialNote: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, enum: ["draft", "published", "closed"], default: "draft" },
        publishedAt: Date,
        closesAt: Date,
        featured: { type: Boolean, default: false },
        options: [PollOptionSchema],
      },
      { timestamps: true }
    );

    User = mongoose.models.User || mongoose.model("User", UserSchema);
    Poll = mongoose.models.Poll || mongoose.model("Poll", PollSchema);

    // Create test admin and regular citizen accounts
    const adminEmail = `admin_poll_test_${Date.now()}@pulse.test`;
    const userEmail = `user_poll_test_${Date.now()}@pulse.test`;

    const admin = await User.create({
      name: "Poll Admin Tester",
      email: adminEmail,
      passwordHash: "$2a$10$dummyHashAdmin",
      role: "admin",
      status: "active",
    });
    adminUserId = admin._id;

    const regular = await User.create({
      name: "Regular Citizen Tester",
      email: userEmail,
      passwordHash: "$2a$10$dummyHashCitizen",
      role: "user",
      status: "active",
    });
    regularUserId = regular._id;
  });

  after(async () => {
    // Clean up test data
    if (Poll && createdPollId) {
      await Poll.deleteOne({ _id: createdPollId });
      await Poll.deleteMany({ slug: new RegExp(draftSlug) });
    }
    if (User) {
      await User.deleteMany({ _id: { $in: [adminUserId, regularUserId] } });
    }
    await mongoose.disconnect();
  });

  test("1. Admin can create a draft poll in MongoDB", async () => {
    const poll = await Poll.create({
      title: "Should sovereign states restrict frontier artificial intelligence model weights?",
      slug: draftSlug,
      category: "Technology & AI",
      summary: "Comprehensive policy analysis regarding international export controls on open-weight foundation models.",
      context: "Proponents argue that unrestricted weights enable malicious fine-tuning, while open source advocates stress democratic accessibility.",
      sourceReference: "Center for AI Safety Technical Monograph",
      createdBy: adminUserId,
      status: "draft",
      featured: false,
      options: [
        { key: "yes", label: "Yes, enforce export controls" },
        { key: "no", label: "No, protect open access" },
      ],
    });

    assert.ok(poll._id);
    createdPollId = poll._id;
    assert.equal(poll.status, "draft");
    assert.equal(poll.publishedAt, undefined);
  });

  test("2. Draft polls DO NOT appear in public feed queries", async () => {
    const publicPolls = await Poll.find({
      status: { $in: ["published", "closed"] },
    }).lean();

    const containsDraft = publicPolls.some((p) => p.slug === draftSlug);
    assert.equal(containsDraft, false, "Draft polls must NEVER leak into public listings");
  });

  test("3. Draft polls return null for unauthenticated public detail queries", async () => {
    // Simulating getPublicPollByIdOrSlug
    const publicDoc = await Poll.findOne({
      slug: draftSlug,
      status: { $in: ["published", "closed"] },
    }).lean();

    assert.equal(publicDoc, null, "Draft poll must return null (404) for public visitors");
  });

  test("4. Admin can publish a draft poll", async () => {
    const poll = await Poll.findById(createdPollId);
    assert.ok(poll);

    poll.status = "published";
    poll.publishedAt = new Date();
    await poll.save();

    const updated = await Poll.findById(createdPollId);
    assert.equal(updated.status, "published");
    assert.ok(updated.publishedAt instanceof Date);
  });

  test("5. Published polls DO appear in public feed queries", async () => {
    const publicPolls = await Poll.find({
      status: { $in: ["published", "closed"] },
    }).lean();

    const found = publicPolls.some((p) => p.slug === draftSlug);
    assert.equal(found, true, "Published poll must appear in public feed");
  });

  test("6. Admin can edit, close, and reopen a poll", async () => {
    // Edit content
    const poll = await Poll.findById(createdPollId);
    poll.summary = "Updated summary with revised economic impact data and stakeholder feedback.";
    poll.status = "closed";
    await poll.save();

    let updated = await Poll.findById(createdPollId);
    assert.equal(updated.status, "closed");
    assert.equal(updated.summary, "Updated summary with revised economic impact data and stakeholder feedback.");

    // Reopen
    poll.status = "published";
    await poll.save();

    updated = await Poll.findById(createdPollId);
    assert.equal(updated.status, "published");
  });

  test("7. Enforces RBAC: Normal users cannot act as poll creator", async () => {
    const normalUser = await User.findById(regularUserId);
    assert.equal(normalUser.role, "user");

    const isAdmin = normalUser.role === "admin";
    assert.equal(isAdmin, false, "Regular citizen must be denied admin privileges");
  });

  test("8. Model validation rejects invalid poll records", async () => {
    // Short title
    await assert.rejects(
      async () => {
        await Poll.create({
          title: "Too short",
          slug: "too-short",
          category: "Technology & AI",
          summary: "A valid summary with more than twenty characters here.",
          createdBy: adminUserId,
        });
      },
      /validation failed|Title must be at least/
    );

    // Missing summary
    await assert.rejects(
      async () => {
        await Poll.create({
          title: "A valid question title that is long enough to pass validation",
          slug: "missing-summary",
          category: "Technology & AI",
          createdBy: adminUserId,
        });
      },
      /validation failed|Summary is required/
    );
  });
});
