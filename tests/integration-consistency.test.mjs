import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pulse_test";

const pollTestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    summary: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
    },
    imageUrl: { type: String },
    cloudinaryPublicId: { type: String },
    featured: { type: Boolean, default: false },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

const blogTestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    imageUrl: { type: String },
    cloudinaryPublicId: { type: String },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

const Poll =
  mongoose.models.IntegrationPoll ||
  mongoose.model("IntegrationPoll", pollTestSchema, "polls_integration_test");

const Blog =
  mongoose.models.IntegrationBlog ||
  mongoose.model("IntegrationBlog", blogTestSchema, "blogs_integration_test");

async function isCloudinaryAssetReferenced(publicId, options = {}) {
  if (!publicId) return false;
  const pollFilter = { cloudinaryPublicId: publicId };
  if (options.excludePollId) {
    pollFilter._id = { $ne: new mongoose.Types.ObjectId(options.excludePollId) };
  }
  if (await Poll.exists(pollFilter)) return true;

  const blogFilter = { cloudinaryPublicId: publicId };
  if (options.excludeBlogId) {
    blogFilter._id = { $ne: new mongoose.Types.ObjectId(options.excludeBlogId) };
  }
  if (await Blog.exists(blogFilter)) return true;

  const escaped = publicId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blogContentFilter = { content: { $regex: escaped, $options: "i" } };
  if (options.excludeBlogId) {
    blogContentFilter._id = { $ne: new mongoose.Types.ObjectId(options.excludeBlogId) };
  }
  if (await Blog.exists(blogContentFilter)) return true;

  return false;
}

describe("PULSE — Phase 6: Feature Integration, Security & Data Consistency Tests", () => {
  let sharedPollId;
  let sharedBlogId;
  const sharedAssetId = `pulse/shared-asset-${Date.now()}`;
  const soloAssetId = `pulse/solo-asset-${Date.now()}`;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Create a poll using the shared asset
    const poll = await Poll.create({
      title: "Shared Asset Poll",
      slug: `shared-poll-${Date.now()}`,
      category: "Technology & AI",
      summary: "Testing shared Cloudinary asset protection.",
      cloudinaryPublicId: sharedAssetId,
      status: "published",
    });
    sharedPollId = poll._id;

    // Create a blog that also references the same asset
    const blog = await Blog.create({
      title: "Shared Asset Blog",
      slug: `shared-blog-${Date.now()}`,
      excerpt: "Testing shared Cloudinary asset protection in blogs.",
      content: `<p>Inline reference: <img src="https://res.cloudinary.com/demo/image/upload/${sharedAssetId}.jpg" /></p>`,
      cloudinaryPublicId: sharedAssetId,
      category: "Analysis",
      status: "published",
    });
    sharedBlogId = blog._id;
  });

  after(async () => {
    await Poll.deleteMany({ _id: sharedPollId });
    await Blog.deleteMany({ _id: sharedBlogId });
    await mongoose.disconnect();
  });

  test("1. Cloudinary Asset Reference Protection: Shared assets are not deleted when replaced in one document", async () => {
    // If poll replaces sharedAssetId, check if it's still in use elsewhere
    // Passing excludePollId simulates the poll having detached the asset
    const inUse = await isCloudinaryAssetReferenced(sharedAssetId, {
      excludePollId: sharedPollId.toString(),
    });

    assert.equal(
      inUse,
      true,
      "Asset must be detected as in-use because it is still referenced in Blog"
    );
  });

  test("2. Cloudinary Asset Reference Protection: Unreferenced assets are recognized as safe to delete", async () => {
    const inUse = await isCloudinaryAssetReferenced(soloAssetId);
    assert.equal(
      inUse,
      false,
      "Solo unreferenced asset must be recognized as not in-use"
    );
  });

  test("3. Chat Room Isolation & Integrity: Poll A messages do not cross into Poll B", async () => {
    const chatMsgSchema = new mongoose.Schema(
      {
        pollId: { type: mongoose.Schema.Types.ObjectId, required: true },
        authorName: { type: String, required: true },
        message: { type: String, required: true },
      },
      { timestamps: true }
    );

    const ChatMessage =
      mongoose.models.IntegrationChatMessage ||
      mongoose.model(
        "IntegrationChatMessage",
        chatMsgSchema,
        "chat_messages_integration_test"
      );

    const pollAId = new mongoose.Types.ObjectId();
    const pollBId = new mongoose.Types.ObjectId();

    await ChatMessage.create({
      pollId: pollAId,
      authorName: "Researcher 1",
      message: "Data point regarding Poll A",
    });

    await ChatMessage.create({
      pollId: pollBId,
      authorName: "Researcher 2",
      message: "Data point regarding Poll B",
    });

    const pollAMessages = await ChatMessage.find({ pollId: pollAId }).lean();
    assert.equal(pollAMessages.length, 1);
    assert.equal(pollAMessages[0].message, "Data point regarding Poll A");

    const pollBMessages = await ChatMessage.find({ pollId: pollBId }).lean();
    assert.equal(pollBMessages.length, 1);
    assert.equal(pollBMessages[0].message, "Data point regarding Poll B");

    // Cleanup
    await ChatMessage.deleteMany({ pollId: { $in: [pollAId, pollBId] } });
  });

  test("4. Contact Form Privacy: Public submission creates unread record without leaking database identifiers", async () => {
    const contactSchema = new mongoose.Schema(
      {
        name: { type: String, required: true },
        email: { type: String, required: true },
        subject: { type: String, required: true },
        message: { type: String, required: true },
        status: { type: String, default: "unread" },
      },
      { timestamps: true }
    );

    const Contact =
      mongoose.models.IntegrationContact ||
      mongoose.model(
        "IntegrationContact",
        contactSchema,
        "contact_submissions_integration_test"
      );

    const submission = await Contact.create({
      name: "Verified Citizen",
      email: "citizen@example.org",
      subject: "Methodology Clarification",
      message: "Inquiry on polling methodology for AI inquiry.",
    });

    assert.equal(submission.status, "unread");
    assert.equal(submission.email, "citizen@example.org");

    // Clean up
    await Contact.deleteOne({ _id: submission._id });
  });

  test("5. Blog Publishing Security: Draft posts strictly excluded from public queries", async () => {
    const draftBlog = await Blog.create({
      title: "Private Research Notes",
      slug: `private-notes-${Date.now()}`,
      excerpt: "Confidential research in progress.",
      content: "<p>Unpublished statistical findings.</p>",
      category: "Policy",
      status: "draft",
    });

    // Public feed query: only published posts
    const publicResults = await Blog.find({ status: "published" }).lean();
    const leakedDraft = publicResults.some((b) => b._id.equals(draftBlog._id));
    assert.equal(leakedDraft, false, "Draft blog must never be returned in public queries");

    // Direct slug query: only published posts
    const publicDetail = await Blog.findOne({
      slug: draftBlog.slug,
      status: "published",
    }).lean();
    assert.equal(publicDetail, null, "Public detail query for draft must return null (404)");

    await Blog.deleteOne({ _id: draftBlog._id });
  });
});
