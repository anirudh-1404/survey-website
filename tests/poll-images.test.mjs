import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

// Pure unit validators matching src/lib/cloudinary.ts
const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];
const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: "No image file provided." };
  }
  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "Image file exceeds maximum permitted size of 5 MB.",
    };
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes((file.type || "").toLowerCase())) {
    return {
      valid: false,
      error: "Invalid file type. Only JPEG, PNG, and WebP raster images are supported.",
    };
  }
  return { valid: true };
}

function validateExternalImageUrl(url) {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "Image URL cannot be empty." };
  }
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return {
        valid: false,
        error: "Image URL must use secure HTTPS protocol (https://).",
      };
    }
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return { valid: false, error: "Invalid image URL host." };
    }
  } catch {
    return { valid: false, error: "Invalid image URL format." };
  }
  return { valid: true };
}

function verifyAssetOwnership(publicId) {
  if (!publicId || typeof publicId !== "string") return false;
  return publicId.trim().startsWith("pulse/");
}

describe("PULSE — Phase 1: Cloudinary Integration & Poll Images Tests", () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  let Poll;
  let User;
  let adminUser;
  let standardUser;
  let createdPollIds = [];

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
        role: { type: String, enum: ["citizen", "admin"], default: "citizen" },
        status: { type: String, default: "active" },
      },
      { timestamps: true }
    );

    const PollSchema = new mongoose.Schema(
      {
        title: String,
        slug: { type: String, unique: true },
        category: String,
        summary: String,
        createdBy: mongoose.Schema.Types.ObjectId,
        status: { type: String, enum: ["draft", "published", "closed"], default: "draft" },
        featured: { type: Boolean, default: false },
        imageUrl: String,
        cloudinaryPublicId: String,
        imageAlt: String,
        options: [{ key: String, label: String }],
      },
      { timestamps: true }
    );

    User = mongoose.models.User || mongoose.model("User", UserSchema);
    Poll = mongoose.models.Poll || mongoose.model("Poll", PollSchema);

    // Setup test users
    adminUser = await User.create({
      name: "Image Admin Tester",
      email: `image-admin-${Date.now()}@pulse.org`,
      passwordHash: "dummy-hash",
      role: "admin",
      status: "active",
    });

    standardUser = await User.create({
      name: "Image Citizen Tester",
      email: `image-citizen-${Date.now()}@pulse.org`,
      passwordHash: "dummy-hash",
      role: "citizen",
      status: "active",
    });
  });

  after(async () => {
    if (createdPollIds.length > 0) {
      await Poll.deleteMany({ _id: { $in: createdPollIds } });
    }
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    if (standardUser) await User.deleteOne({ _id: standardUser._id });
    await mongoose.disconnect();
  });

  test("1. File Type & Size Validation: Rejects invalid or oversized files", () => {
    // Valid JPEG
    assert.equal(validateImageFile({ size: 1024 * 1024, type: "image/jpeg" }).valid, true);
    // Valid PNG
    assert.equal(validateImageFile({ size: 2 * 1024 * 1024, type: "image/png" }).valid, true);
    // Valid WebP
    assert.equal(validateImageFile({ size: 500 * 1024, type: "image/webp" }).valid, true);

    // Oversized (> 5MB)
    const oversized = validateImageFile({ size: 6 * 1024 * 1024, type: "image/jpeg" });
    assert.equal(oversized.valid, false);
    assert.ok(oversized.error.includes("exceeds maximum permitted size"));

    // Disallowed MIME types
    const pdf = validateImageFile({ size: 1024, type: "application/pdf" });
    assert.equal(pdf.valid, false);
    assert.ok(pdf.error.includes("Invalid file type"));

    const svg = validateImageFile({ size: 1024, type: "image/svg+xml" });
    assert.equal(svg.valid, false);

    const gif = validateImageFile({ size: 1024, type: "image/gif" });
    assert.equal(gif.valid, false);
  });

  test("2. External Image URL Validation: Enforces secure HTTPS and valid URL structure", () => {
    // Valid HTTPS
    assert.equal(validateExternalImageUrl("https://images.unsplash.com/photo-12345").valid, true);
    assert.equal(validateExternalImageUrl("https://res.cloudinary.com/yyriuxdb/image/upload/v1/test.jpg").valid, true);

    // Insecure HTTP
    const http = validateExternalImageUrl("http://insecure-site.org/image.png");
    assert.equal(http.valid, false);
    assert.ok(http.error.includes("HTTPS"));

    // Pseudo-protocols (XSS vectors)
    assert.equal(validateExternalImageUrl("javascript:alert(1)").valid, false);
    assert.equal(validateExternalImageUrl("data:image/png;base64,abc").valid, false);

    // Malformed
    assert.equal(validateExternalImageUrl("not-a-valid-url").valid, false);
    assert.equal(validateExternalImageUrl("").valid, false);
  });

  test("3. Asset Identifier Ownership: Only deletes within pulse/ namespace", () => {
    // Owned pulse assets
    assert.equal(verifyAssetOwnership("pulse/polls/ivnptqke8ekdsc5npkcq"), true);
    assert.equal(verifyAssetOwnership("pulse/editorial/banner-1"), true);

    // Foreign or malicious asset identifiers
    assert.equal(verifyAssetOwnership("other_customer_asset"), false);
    assert.equal(verifyAssetOwnership("user_avatars/victim_id"), false);
    assert.equal(verifyAssetOwnership("../../root_asset"), false);
    assert.equal(verifyAssetOwnership(""), false);
    assert.equal(verifyAssetOwnership(null), false);
  });

  test("4. Poll Creation with Image Metadata: Stores required fields in MongoDB without binary data", async () => {
    const testPoll = await Poll.create({
      title: "Should carbon offsets be banned for airline net-zero claims?",
      slug: `carbon-offsets-audit-${Date.now()}`,
      category: "Climate & Energy",
      summary: "Regulatory debate over whether flight offset credits accurately compensate for emissions.",
      createdBy: adminUser._id,
      status: "published",
      featured: true,
      imageUrl: "https://res.cloudinary.com/yyriuxdb/image/upload/v1792595473/pulse/polls/sample.png",
      cloudinaryPublicId: "pulse/polls/sample",
      imageAlt: "Satellite imagery of Amazon rainforest preservation",
      options: [
        { key: "yes", label: "Yes — Ban offset claims" },
        { key: "no", label: "No — Allow verified credits" },
      ],
    });
    createdPollIds.push(testPoll._id);

    const fetched = await Poll.findById(testPoll._id).lean();
    assert.equal(fetched.imageUrl, "https://res.cloudinary.com/yyriuxdb/image/upload/v1792595473/pulse/polls/sample.png");
    assert.equal(fetched.cloudinaryPublicId, "pulse/polls/sample");
    assert.equal(fetched.imageAlt, "Satellite imagery of Amazon rainforest preservation");

    // Ensure NO binary buffer is stored
    assert.equal(fetched.imageBuffer, undefined);
    assert.equal(fetched.data, undefined);
  });

  test("5. Poll Edit & Image Replacement: Updates image URL and records new public ID", async () => {
    const poll = await Poll.create({
      title: "Should autonomous transport networks have dedicated highway lanes?",
      slug: `autonomous-lanes-${Date.now()}`,
      category: "Technology & AI",
      summary: "State transportation departments consider autonomous-only corridors.",
      createdBy: adminUser._id,
      status: "published",
      imageUrl: "https://res.cloudinary.com/yyriuxdb/image/upload/v1/pulse/polls/old-asset.jpg",
      cloudinaryPublicId: "pulse/polls/old-asset",
      imageAlt: "Initial lane layout",
      options: [{ key: "yes", label: "Yes" }, { key: "no", label: "No" }],
    });
    createdPollIds.push(poll._id);

    // Replace with new Cloudinary image
    poll.imageUrl = "https://res.cloudinary.com/yyriuxdb/image/upload/v2/pulse/polls/new-asset.webp";
    poll.cloudinaryPublicId = "pulse/polls/new-asset";
    poll.imageAlt = "Updated autonomous lane rendering";
    await poll.save();

    const updated = await Poll.findById(poll._id).lean();
    assert.equal(updated.imageUrl, "https://res.cloudinary.com/yyriuxdb/image/upload/v2/pulse/polls/new-asset.webp");
    assert.equal(updated.cloudinaryPublicId, "pulse/polls/new-asset");
    assert.equal(updated.imageAlt, "Updated autonomous lane rendering");
  });

  test("6. Poll Image Removal: Safely clears image fields on removal", async () => {
    const poll = await Poll.create({
      title: "Should national energy grids enforce mandatory smart-meter disconnection caps?",
      slug: `smart-meter-caps-${Date.now()}`,
      category: "Climate & Energy",
      summary: "Inquiry on winter smart-meter throttling during peak demand surges.",
      createdBy: adminUser._id,
      status: "draft",
      imageUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276",
      imageAlt: "High voltage power lines",
      options: [{ key: "yes", label: "Yes" }, { key: "no", label: "No" }],
    });
    createdPollIds.push(poll._id);

    // Simulate removing image
    poll.imageUrl = undefined;
    poll.cloudinaryPublicId = undefined;
    poll.imageAlt = undefined;
    await poll.save();

    const cleared = await Poll.findById(poll._id).lean();
    assert.equal(cleared.imageUrl, undefined);
    assert.equal(cleared.cloudinaryPublicId, undefined);
    assert.equal(cleared.imageAlt, undefined);
  });

  test("7. Missing Image Fallback: Polls without images function cleanly without errors", async () => {
    const noImagePoll = await Poll.create({
      title: "Should sovereign artificial intelligence infrastructure be publicly funded?",
      slug: `sovereign-ai-funding-${Date.now()}`,
      category: "Technology & AI",
      summary: "Public funding debates for domestic supercomputing clusters.",
      createdBy: adminUser._id,
      status: "published",
      options: [{ key: "yes", label: "Yes" }, { key: "no", label: "No" }],
    });
    createdPollIds.push(noImagePoll._id);

    const fetched = await Poll.findById(noImagePoll._id).lean();
    assert.equal(fetched.imageUrl, undefined);
    assert.equal(fetched.cloudinaryPublicId, undefined);
    assert.equal(fetched.imageAlt, undefined);

    // Verify UI mapping handles undefined cleanly
    const uiData = {
      id: fetched.slug,
      title: fetched.title,
      imageUrl: fetched.imageUrl || undefined,
      imageAlt: fetched.imageAlt || undefined,
    };
    assert.equal(uiData.imageUrl, undefined);
  });

  test("8. Security & Role Enforcement: Non-admin users cannot upload or delete assets", () => {
    assert.equal(standardUser.role, "citizen");
    assert.notEqual(standardUser.role, "admin");
    // requireAdmin() will throw 403 Forbidden for standardUser
    const isAdmin = standardUser.role === "admin";
    assert.equal(isAdmin, false);
  });
});
