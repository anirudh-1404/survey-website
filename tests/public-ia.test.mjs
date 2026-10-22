import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import { getSafeRedirectUrl } from "../src/lib/url.ts";

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
  mongoose.models.PublicIAPoll ||
  mongoose.model("PublicIAPoll", pollTestSchema, "polls_public_ia_test");

const Blog =
  mongoose.models.PublicIABlog ||
  mongoose.model("PublicIABlog", blogTestSchema, "blogs_public_ia_test");

describe("PULSE — Phase 5: Final Public Information Architecture & Navbar Cleanup Tests", () => {
  let draftPollId;
  let publishedPollId;
  let draftBlogId;
  let publishedBlogId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Seed test polls
    const draftPoll = await Poll.create({
      title: "Draft IA Test Poll",
      slug: `draft-ia-poll-${Date.now()}`,
      category: "Technology & AI",
      summary: "This draft poll must never be visible publicly.",
      status: "draft",
    });
    draftPollId = draftPoll._id;

    const publishedPoll = await Poll.create({
      title: "Published IA Test Poll",
      slug: `published-ia-poll-${Date.now()}`,
      category: "Technology & AI",
      summary: "This published poll should be visible in polls feed.",
      status: "published",
      publishedAt: new Date(),
    });
    publishedPollId = publishedPoll._id;

    // Seed test blogs
    const draftBlog = await Blog.create({
      title: "Draft IA Test Blog",
      slug: `draft-ia-blog-${Date.now()}`,
      excerpt: "Draft blog excerpt.",
      content: "<p>Draft blog content.</p>",
      category: "Analysis",
      status: "draft",
    });
    draftBlogId = draftBlog._id;

    const publishedBlog = await Blog.create({
      title: "Published IA Test Blog",
      slug: `published-ia-blog-${Date.now()}`,
      excerpt: "Published blog excerpt.",
      content: "<p>Published blog content.</p>",
      category: "Analysis",
      status: "published",
      publishedAt: new Date(),
    });
    publishedBlogId = publishedBlog._id;
  });

  after(async () => {
    await Poll.deleteMany({
      _id: { $in: [draftPollId, publishedPollId] },
    });
    await Blog.deleteMany({
      _id: { $in: [draftBlogId, publishedBlogId] },
    });
    await mongoose.disconnect();
  });

  test("1. Navbar: Contains exactly 4 primary links in exact order (Home, Polls, Blogs, Contact Us)", () => {
    const navbarPath = path.resolve(
      process.cwd(),
      "src/components/layout/Navbar.tsx"
    );
    const content = fs.readFileSync(navbarPath, "utf-8");

    // Verify NAV_LINKS structure and exact ordering
    const expectedLinks = [
      '{ label: "Home", href: "/" }',
      '{ label: "Polls", href: "/polls" }',
      '{ label: "Blogs", href: "/blogs" }',
      '{ label: "Contact Us", href: "/contact-us" }',
    ];

    expectedLinks.forEach((linkStr) => {
      assert.ok(
        content.includes(linkStr),
        `Navbar NAV_LINKS must contain: ${linkStr}`
      );
    });

    // Check relative index order
    const homeIdx = content.indexOf('href: "/"');
    const pollsIdx = content.indexOf('href: "/polls"');
    const blogsIdx = content.indexOf('href: "/blogs"');
    const contactIdx = content.indexOf('href: "/contact-us"');

    assert.ok(homeIdx < pollsIdx, "Home must appear before Polls");
    assert.ok(pollsIdx < blogsIdx, "Polls must appear before Blogs");
    assert.ok(blogsIdx < contactIdx, "Blogs must appear before Contact Us");
  });

  test("2. Navbar: Admin navigation is not present in public navigation links", () => {
    const navbarPath = path.resolve(
      process.cwd(),
      "src/components/layout/Navbar.tsx"
    );
    const content = fs.readFileSync(navbarPath, "utf-8");

    // Admin Console / Dashboard links should NOT be in the navbar
    assert.ok(
      !content.includes('href="/admin"'),
      "Public navbar must not contain a link to /admin"
    );
    assert.ok(
      !content.includes("Admin Console"),
      "Public navbar must not display 'Admin Console'"
    );
    assert.ok(
      !content.includes("Admin Dashboard"),
      "Public navbar must not display 'Admin Dashboard'"
    );
  });

  test("3. Footer: Contains official navigation links and no obsolete entries", () => {
    const footerPath = path.resolve(
      process.cwd(),
      "src/components/layout/Footer.tsx"
    );
    const content = fs.readFileSync(footerPath, "utf-8");

    assert.ok(content.includes('href="/"'), "Footer must link to Home");
    assert.ok(content.includes('href="/polls"'), "Footer must link to Polls");
    assert.ok(content.includes('href="/blogs"'), "Footer must link to Blogs");
    assert.ok(content.includes('href="/contact-us"'), "Footer must link to Contact Us");

    // Obsolete entries removed
    assert.ok(!content.includes("Topic Archives"), "Obsolete 'Topic Archives' link must be removed");
    assert.ok(!content.includes("Day 1 UI Foundation"), "Obsolete 'Day 1 UI Foundation' text must be removed");
  });

  test("4. Contact Privacy: No hardcoded phone numbers, email addresses, or WhatsApp links in public UI", () => {
    const contactPagePath = path.resolve(process.cwd(), "src/app/contact-us/page.tsx");
    const navbarPath = path.resolve(process.cwd(), "src/components/layout/Navbar.tsx");
    const footerPath = path.resolve(process.cwd(), "src/components/layout/Footer.tsx");

    const files = [contactPagePath, navbarPath, footerPath];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");

      assert.ok(!content.includes("whatsapp"), `File ${file} must not contain WhatsApp references`);
      assert.ok(!content.includes("mailto:"), `File ${file} must not expose mailto: links`);
      assert.ok(!content.includes("tel:"), `File ${file} must not expose tel: links`);
      assert.ok(!/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(content), `File ${file} must not contain raw email addresses`);
      assert.ok(!/\+1[0-9]{10}/.test(content), `File ${file} must not contain phone numbers`);
    }
  });

  test("5. Poll Listing: Query excludes drafts from public feed", async () => {
    const query = { status: { $in: ["published", "closed"] } };
    const publicPolls = await Poll.find(query).lean();

    const containsDraft = publicPolls.some((p) => p._id.equals(draftPollId));
    assert.equal(containsDraft, false, "Draft polls must never be included in public feed query");

    const containsPublished = publicPolls.some((p) => p._id.equals(publishedPollId));
    assert.equal(containsPublished, true, "Published polls must be included in public feed query");
  });

  test("6. Blog Listing: Query excludes drafts from public blog feed", async () => {
    const query = { status: "published" };
    const publicBlogs = await Blog.find(query).lean();

    const containsDraft = publicBlogs.some((b) => b._id.equals(draftBlogId));
    assert.equal(containsDraft, false, "Draft blogs must never be included in public feed query");

    const containsPublished = publicBlogs.some((b) => b._id.equals(publishedBlogId));
    assert.equal(containsPublished, true, "Published blogs must be included in public feed query");
  });

  test("7. Open Redirect Defense: Safely sanitizes redirect parameter", () => {
    assert.equal(getSafeRedirectUrl("/polls"), "/polls");
    assert.equal(getSafeRedirectUrl("/blogs"), "/blogs");
    assert.equal(getSafeRedirectUrl("/contact-us"), "/contact-us");
    assert.equal(getSafeRedirectUrl("https://malicious.com"), "/");
    assert.equal(getSafeRedirectUrl("//malicious.com"), "/");
    assert.equal(getSafeRedirectUrl("/\\malicious.com"), "/");
  });

  test("8. Protected Admin Access: Admin routes require authentication and admin role", () => {
    const adminLayoutPath = path.resolve(process.cwd(), "src/app/admin/layout.tsx");
    const content = fs.readFileSync(adminLayoutPath, "utf-8");

    assert.ok(content.includes("getCurrentUser"), "Admin layout must verify authenticated session");
    assert.ok(content.includes("user.role !== \"admin\""), "Admin layout must restrict access to role === 'admin'");
    assert.ok(content.includes("redirect(\"/login"), "Unauthorized access must redirect to login");
  });
});
