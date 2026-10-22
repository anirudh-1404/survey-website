import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

class BlogError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "BlogError";
    this.statusCode = statusCode;
  }
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeRichTextHtml(raw) {
  if (typeof raw !== "string") return "";
  let cleaned = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "");

  cleaned = cleaned.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  cleaned = cleaned.replace(
    /(href|src)\s*=\s*["']?\s*(?:javascript|data|vbscript):[^"'>\s]*/gi,
    '$1="#"'
  );
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  return cleaned.trim();
}

describe("PULSE — Phase 4: Blog CMS, Rich-Text Editor & Public Blog Pages Tests", () => {
  const MONGODB_URI = process.env.MONGODB_URI;

  let User;
  let Blog;

  let adminUser;
  let standardUser;
  const createdBlogIds = [];

  // Admin creation handler simulation
  async function createBlog({ currentUser, title, slug, excerpt, content, category, tags, status = "draft", imageUrl, cloudinaryPublicId, imageAlt }) {
    if (!currentUser) {
      throw new BlogError("Authentication required.", 401);
    }
    if (currentUser.role !== "admin") {
      throw new BlogError("Forbidden: Administrator privileges required.", 403);
    }

    if (!title || title.trim().length < 3) {
      throw new BlogError("Title must be at least 3 characters long.", 400);
    }
    if (!excerpt || excerpt.trim().length < 10) {
      throw new BlogError("Excerpt must be at least 10 characters long.", 400);
    }
    if (!content || content.trim().length < 20) {
      throw new BlogError("Content must be at least 20 characters long.", 400);
    }

    let finalSlug = slug ? generateSlug(slug) : generateSlug(title);
    if (!finalSlug) {
      finalSlug = `post-${Date.now()}`;
    }

    const conflict = await Blog.findOne({ slug: finalSlug });
    if (conflict) {
      throw new BlogError("Slug already exists.", 409);
    }

    const cleanContent = sanitizeRichTextHtml(content);
    const targetStatus = status === "published" ? "published" : "draft";
    const publishedAt = targetStatus === "published" ? new Date() : null;

    const created = await Blog.create({
      title: title.trim(),
      slug: finalSlug,
      excerpt: excerpt.trim(),
      content: cleanContent,
      category: category || "Analysis",
      tags: tags || [],
      status: targetStatus,
      publishedAt,
      authorId: currentUser._id,
      imageUrl,
      cloudinaryPublicId,
      imageAlt,
    });

    createdBlogIds.push(created._id);
    return created;
  }

  // Admin update handler simulation
  async function updateBlog({ currentUser, id, updates }) {
    if (!currentUser) {
      throw new BlogError("Authentication required.", 401);
    }
    if (currentUser.role !== "admin") {
      throw new BlogError("Forbidden: Administrator privileges required.", 403);
    }

    const existing = await Blog.findById(id);
    if (!existing) {
      throw new BlogError("Blog post not found.", 404);
    }

    if (updates.title) existing.title = updates.title.trim();
    if (updates.excerpt) existing.excerpt = updates.excerpt.trim();
    if (updates.content) existing.content = sanitizeRichTextHtml(updates.content);
    if (updates.category) existing.category = updates.category.trim();
    if (updates.tags) existing.tags = updates.tags;

    if (updates.status) {
      if (updates.status === "published" && existing.status !== "published") {
        existing.status = "published";
        existing.publishedAt = existing.publishedAt || new Date();
      } else if (updates.status === "draft" && existing.status === "published") {
        existing.status = "draft";
      }
    }

    if (updates.imageUrl !== undefined) existing.imageUrl = updates.imageUrl;
    if (updates.cloudinaryPublicId !== undefined) existing.cloudinaryPublicId = updates.cloudinaryPublicId;
    if (updates.imageAlt !== undefined) existing.imageAlt = updates.imageAlt;

    await existing.save();
    return existing;
  }

  // Public retrieval simulation (strictly published)
  async function getPublicBlogBySlug(slug) {
    const doc = await Blog.findOne({
      slug: slug.toLowerCase().trim(),
      status: "published",
    }).populate("authorId", "name role");

    return doc;
  }

  async function getPublicBlogsList() {
    return Blog.find({ status: "published" }).sort({ publishedAt: -1 });
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

    const BlogSchema = new mongoose.Schema(
      {
        title: { type: String, required: true },
        slug: { type: String, unique: true, required: true },
        excerpt: { type: String, required: true },
        content: { type: String, required: true },
        imageUrl: String,
        cloudinaryPublicId: String,
        imageAlt: String,
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        category: { type: String, default: "Analysis" },
        tags: [String],
        status: { type: String, enum: ["draft", "published"], default: "draft" },
        publishedAt: Date,
      },
      { timestamps: true }
    );

    BlogSchema.index({ status: 1, publishedAt: -1 });

    User = mongoose.models.User || mongoose.model("User", UserSchema);
    Blog = mongoose.models.Blog || mongoose.model("Blog", BlogSchema);

    const timestamp = Date.now();
    adminUser = await User.create({
      name: "Blog Editor Admin",
      email: `admin.blog.${timestamp}@pulse.test`,
      passwordHash: "test_hashed_secret",
      role: "admin",
      status: "active",
    });

    standardUser = await User.create({
      name: "Standard Citizen Reader",
      email: `citizen.blog.${timestamp}@pulse.test`,
      passwordHash: "test_hashed_secret",
      role: "user",
      status: "active",
    });
  });

  after(async () => {
    if (createdBlogIds.length > 0) {
      await Blog.deleteMany({ _id: { $in: createdBlogIds } });
    }
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    if (standardUser) await User.deleteOne({ _id: standardUser._id });
    await mongoose.disconnect();
  });

  test("1. Slug Generation & Disambiguation: Generates clean lowercase slugs", () => {
    const slug1 = generateSlug("Empirical Analysis: Global AI Governance in 2026!");
    assert.strictEqual(slug1, "empirical-analysis-global-ai-governance-in-2026");

    const slug2 = generateSlug("  Spaces, -- dashes, and symbols ###  ");
    assert.strictEqual(slug2, "spaces-dashes-and-symbols");
  });

  test("2. Rich-Text HTML Sanitization: Eliminates scripts, dangerous tags, and inline handlers", () => {
    const dangerousHtml = `
      <h2>Valid Heading</h2>
      <p>Clean text paragraph.</p>
      <script>alert('pwned')</script>
      <img src="https://pulse.org/chart.png" onload="alert('hack')" alt="Valid Chart" />
      <a href="javascript:stealCookie()">Click here</a>
      <iframe src="https://malicious.example.com"></iframe>
    `;

    const cleaned = sanitizeRichTextHtml(dangerousHtml);
    assert.strictEqual(cleaned.includes("<script>"), false);
    assert.strictEqual(cleaned.includes("alert("), false);
    assert.strictEqual(cleaned.includes("<iframe"), false);
    assert.strictEqual(cleaned.includes("onload="), false);
    assert.strictEqual(cleaned.includes("javascript:"), false);
    assert.strictEqual(cleaned.includes("<h2>Valid Heading</h2>"), true);
    assert.strictEqual(cleaned.includes("Clean text paragraph."), true);
  });

  test("3. Blog Creation: Persists draft blog with author reference and image metadata", async () => {
    const blog = await createBlog({
      currentUser: adminUser,
      title: "The Shifting Landscape of Global Civic Trust",
      slug: `global-civic-trust-${Date.now()}`,
      excerpt: "Examining three decades of empirical polling on public institutions and democratic engagement.",
      content: "<h2>Introduction</h2><p>Public confidence in deliberative bodies has undergone marked fluctuations over the past electoral cycles.</p>",
      category: "Analysis",
      tags: ["Democracy", "Institutions", "Statistics"],
      status: "draft",
      imageUrl: "https://res.cloudinary.com/pulse/image/upload/sample.jpg",
      cloudinaryPublicId: "pulse/blogs/sample_1",
      imageAlt: "Statistical charts",
    });

    assert.ok(blog._id);
    assert.strictEqual(blog.status, "draft");
    assert.strictEqual(blog.publishedAt, null);
    assert.strictEqual(blog.authorId.toString(), adminUser._id.toString());
    assert.strictEqual(blog.cloudinaryPublicId, "pulse/blogs/sample_1");
  });

  test("4. Duplicate Slug Rejection: Enforces unique slug constraints", async () => {
    const fixedSlug = `fixed-unique-slug-${Date.now()}`;
    await createBlog({
      currentUser: adminUser,
      title: "First Article with Slug",
      slug: fixedSlug,
      excerpt: "Valid excerpt for initial slug verification test.",
      content: "Valid rich text content exceeding twenty characters.",
    });

    await assert.rejects(
      async () => {
        await createBlog({
          currentUser: adminUser,
          title: "Second Article Conflicting",
          slug: fixedSlug,
          excerpt: "Another valid excerpt for duplicate test.",
          content: "Valid rich text content exceeding twenty characters.",
        });
      },
      (err) => {
        assert(err instanceof BlogError);
        assert.strictEqual(err.statusCode, 409);
        return true;
      }
    );
  });

  test("5. Publish & Unpublish Transitions: Controls publication date and status", async () => {
    const blog = await createBlog({
      currentUser: adminUser,
      title: "Publication Transition Test",
      slug: `publish-transition-${Date.now()}`,
      excerpt: "Valid excerpt checking state machine transitions.",
      content: "Valid rich text content exceeding twenty characters.",
      status: "draft",
    });

    assert.strictEqual(blog.status, "draft");
    assert.strictEqual(blog.publishedAt, null);

    // Publish
    const published = await updateBlog({
      currentUser: adminUser,
      id: blog._id,
      updates: { status: "published" },
    });
    assert.strictEqual(published.status, "published");
    assert.ok(published.publishedAt);

    // Unpublish back to draft
    const unpublished = await updateBlog({
      currentUser: adminUser,
      id: blog._id,
      updates: { status: "draft" },
    });
    assert.strictEqual(unpublished.status, "draft");
  });

  test("6. Public Visibility: Draft posts strictly return null / 404 on public queries", async () => {
    const draftSlug = `draft-secret-article-${Date.now()}`;
    await createBlog({
      currentUser: adminUser,
      title: "Unreleased Draft Investigation",
      slug: draftSlug,
      excerpt: "This investigation is currently in peer review.",
      content: "Confidential empirical findings not yet approved for release.",
      status: "draft",
    });

    // Public detail lookup by slug must return null
    const publicDetail = await getPublicBlogBySlug(draftSlug);
    assert.strictEqual(publicDetail, null, "Draft blog must not be visible on public detail page");

    // Public list lookup must not contain draft
    const publicList = await getPublicBlogsList();
    const foundInList = publicList.some((b) => b.slug === draftSlug);
    assert.strictEqual(foundInList, false, "Draft blog must not appear in public blog feed");
  });

  test("7. Public Detail Page: Published articles are retrievable with author details", async () => {
    const publishedSlug = `published-public-article-${Date.now()}`;
    await createBlog({
      currentUser: adminUser,
      title: "Released Public Research",
      slug: publishedSlug,
      excerpt: "Publicly certified analysis of renewable infrastructure.",
      content: "Detailed analytical findings on green energy adoption and public sentiment.",
      status: "published",
    });

    const publicArticle = await getPublicBlogBySlug(publishedSlug);
    assert.ok(publicArticle);
    assert.strictEqual(publicArticle.slug, publishedSlug);
    assert.strictEqual(publicArticle.status, "published");
    assert.ok(publicArticle.authorId);
    assert.strictEqual(publicArticle.authorId.name, "Blog Editor Admin");
  });

  test("8. Authorization & RBAC: Blocks unauthenticated and non-admin users from creating or editing", async () => {
    // Unauthenticated attempt
    await assert.rejects(
      async () => {
        await createBlog({
          currentUser: null,
          title: "Hacker Post",
          excerpt: "Unauthorized submission.",
          content: "Unauthorized content body exceeding minimum limit.",
        });
      },
      (err) => {
        assert(err instanceof BlogError);
        assert.strictEqual(err.statusCode, 401);
        return true;
      }
    );

    // Standard citizen (non-admin) attempt
    await assert.rejects(
      async () => {
        await createBlog({
          currentUser: standardUser,
          title: "Citizen Post",
          excerpt: "Standard user trying to author blog post.",
          content: "Unauthorized content body exceeding minimum limit.",
        });
      },
      (err) => {
        assert(err instanceof BlogError);
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });
});
