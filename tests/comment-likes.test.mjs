import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

describe("PULSE — Comment Unique Like System (LinkedIn Style) Tests", () => {
  const MONGODB_URI = process.env.MONGODB_URI;

  let db;
  let User;
  let Poll;
  let Comment;

  let testUser1Id;
  let testUser2Id;
  let testPollId;
  let topLevelCommentId;
  let replyCommentId;
  let legacyCommentId;

  // Local re-creation of schema if not already compiled in mongoose
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

  const CommentSchema = new mongoose.Schema(
    {
      pollId: { type: mongoose.Schema.Types.ObjectId, ref: "Poll", required: true, index: true },
      authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
      content: { type: String, required: true },
      parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null, index: true },
      likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
      status: { type: String, enum: ["visible", "hidden", "removed"], default: "visible", index: true },
    },
    { timestamps: true }
  );

  const PollSchema = new mongoose.Schema(
    {
      title: String,
      slug: { type: String, unique: true },
      category: String,
      summary: String,
      status: { type: String, enum: ["draft", "published", "closed"], default: "published" },
      options: [{ key: String, label: String }],
    },
    { timestamps: true }
  );

  // Helper matching src/lib/comments.ts
  function extractLikesCount(likes) {
    if (Array.isArray(likes)) return likes.length;
    if (typeof likes === "number" && !Number.isNaN(likes) && likes >= 0) return Math.floor(likes);
    return 0;
  }

  function checkIsLiked(likes, userId) {
    if (!userId || !Array.isArray(likes)) return false;
    const idStr = userId.toString();
    return likes.some((item) => item && item.toString() === idStr);
  }

  async function toggleCommentLike({ commentId, userId, action = "toggle" }) {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      const err = new Error("Invalid comment reference");
      err.statusCode = 400;
      throw err;
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const err = new Error("Invalid user identity");
      err.statusCode = 401;
      throw err;
    }

    const commentObjectId = new mongoose.Types.ObjectId(commentId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const comment = await Comment.findById(commentObjectId);
    if (!comment) {
      const err = new Error("Perspective comment could not be found");
      err.statusCode = 404;
      throw err;
    }

    if (comment.status === "removed") {
      const err = new Error("Cannot like a removed perspective");
      err.statusCode = 400;
      throw err;
    }

    // Normalize legacy data if likes is not an array
    if (!Array.isArray(comment.likes)) {
      await Comment.updateOne({ _id: commentObjectId }, { $set: { likes: [] } });
    }

    if (action === "like") {
      const updated = await Comment.findByIdAndUpdate(
        commentObjectId,
        { $addToSet: { likes: userObjectId } },
        { returnDocument: "after" }
      );
      return {
        commentId: commentObjectId.toString(),
        liked: true,
        likesCount: extractLikesCount(updated?.likes),
      };
    }

    if (action === "unlike") {
      const updated = await Comment.findByIdAndUpdate(
        commentObjectId,
        { $pull: { likes: userObjectId } },
        { returnDocument: "after" }
      );
      return {
        commentId: commentObjectId.toString(),
        liked: false,
        likesCount: extractLikesCount(updated?.likes),
      };
    }

    // Toggle logic
    const isCurrentlyLiked = checkIsLiked(comment.likes, userId);
    if (isCurrentlyLiked) {
      const updated = await Comment.findOneAndUpdate(
        { _id: commentObjectId, likes: userObjectId },
        { $pull: { likes: userObjectId } },
        { returnDocument: "after" }
      );
      if (updated) {
        return {
          commentId: commentObjectId.toString(),
          liked: false,
          likesCount: extractLikesCount(updated.likes),
        };
      }
    }

    const updated = await Comment.findByIdAndUpdate(
      commentObjectId,
      { $addToSet: { likes: userObjectId } },
      { returnDocument: "after" }
    );
    const finalLiked = checkIsLiked(updated?.likes, userId);
    return {
      commentId: commentObjectId.toString(),
      liked: finalLiked,
      likesCount: extractLikesCount(updated?.likes),
    };
  }

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
    db = mongoose.connection;

    User = mongoose.models.User || mongoose.model("User", UserSchema);
    Comment = mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
    Poll = mongoose.models.Poll || mongoose.model("Poll", PollSchema);

    // Create 2 test users
    const u1 = await User.create({
      name: "Citizen Voter One",
      email: `like_test_user1_${Date.now()}@pulse.test`,
      passwordHash: "hash1",
      role: "user",
    });
    testUser1Id = u1._id;

    const u2 = await User.create({
      name: "Citizen Voter Two",
      email: `like_test_user2_${Date.now()}@pulse.test`,
      passwordHash: "hash2",
      role: "user",
    });
    testUser2Id = u2._id;

    // Create a published test poll
    const p = await Poll.create({
      title: "Public Inquiry on Civic Engagement",
      slug: `like-test-poll-${Date.now()}`,
      category: "Society & Culture",
      summary: "Assessing civic perspective quality and debate.",
      status: "published",
      options: [
        { key: "yes", label: "Yes" },
        { key: "no", label: "No" },
      ],
    });
    testPollId = p._id;

    // Create top-level comment
    const c1 = await Comment.create({
      pollId: testPollId,
      authorId: testUser1Id,
      content: "This is a thoughtful argument regarding democratic participation.",
      likes: [],
      status: "visible",
    });
    topLevelCommentId = c1._id;

    // Create nested reply
    const r1 = await Comment.create({
      pollId: testPollId,
      authorId: testUser2Id,
      parentId: topLevelCommentId,
      content: "I agree with the main premise and want to add further nuance.",
      likes: [],
      status: "visible",
    });
    replyCommentId = r1._id;

    // Create legacy comment with no likes array (simulates pre-existing database records)
    const leg = await db.collection("comments").insertOne({
      pollId: testPollId,
      authorId: testUser1Id,
      content: "Legacy comment from prior system version without likes field.",
      status: "visible",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    legacyCommentId = leg.insertedId;
  });

  test("1. A user can Like a comment", async () => {
    const result = await toggleCommentLike({
      commentId: topLevelCommentId.toString(),
      userId: testUser1Id.toString(),
      action: "like",
    });

    assert.equal(result.liked, true, "User must be marked as liked");
    assert.equal(result.likesCount, 1, "Likes count must be 1");

    const inDb = await Comment.findById(topLevelCommentId);
    assert.equal(inDb.likes.length, 1);
    assert.equal(inDb.likes[0].toString(), testUser1Id.toString());
  });

  test("2. Repeating the same Like request does not increase the count", async () => {
    // User 1 requests 'like' again
    const result = await toggleCommentLike({
      commentId: topLevelCommentId.toString(),
      userId: testUser1Id.toString(),
      action: "like",
    });

    assert.equal(result.liked, true, "User remains liked");
    assert.equal(result.likesCount, 1, "Likes count must remain 1 and not duplicate");

    const inDb = await Comment.findById(topLevelCommentId);
    assert.equal(inDb.likes.length, 1, "User ID must only appear once in likes array");
  });

  test("3. Clicking Like again removes that user's Like (Unlike)", async () => {
    // Toggle action when already liked triggers unlike
    const result = await toggleCommentLike({
      commentId: topLevelCommentId.toString(),
      userId: testUser1Id.toString(),
      action: "toggle",
    });

    assert.equal(result.liked, false, "Status must transition to unliked");
    assert.equal(result.likesCount, 0, "Likes count must decrement back to 0");

    const inDb = await Comment.findById(topLevelCommentId);
    assert.equal(inDb.likes.length, 0, "Likes array must be empty after unlike");
  });

  test("4. Two different users can independently Like the same comment", async () => {
    // User 1 likes
    const r1 = await toggleCommentLike({
      commentId: topLevelCommentId.toString(),
      userId: testUser1Id.toString(),
      action: "like",
    });
    assert.equal(r1.likesCount, 1);

    // User 2 likes
    const r2 = await toggleCommentLike({
      commentId: topLevelCommentId.toString(),
      userId: testUser2Id.toString(),
      action: "like",
    });
    assert.equal(r2.liked, true);
    assert.equal(r2.likesCount, 2, "Likes count must reflect 2 unique users");

    // User 1 unlikes, User 2 remains
    const r3 = await toggleCommentLike({
      commentId: topLevelCommentId.toString(),
      userId: testUser1Id.toString(),
      action: "unlike",
    });
    assert.equal(r3.liked, false);
    assert.equal(r3.likesCount, 1, "Likes count must be 1 after User 1 unlikes");

    const inDb = await Comment.findById(topLevelCommentId);
    assert.equal(inDb.likes.length, 1);
    assert.equal(inDb.likes[0].toString(), testUser2Id.toString());
  });

  test("5. One user cannot Like multiple times under rapid concurrent requests", async () => {
    // Reset likes
    await Comment.findByIdAndUpdate(topLevelCommentId, { $set: { likes: [] } });

    // Fire 10 concurrent like operations for the same user
    const concurrentRequests = Array.from({ length: 10 }).map(() =>
      toggleCommentLike({
        commentId: topLevelCommentId.toString(),
        userId: testUser1Id.toString(),
        action: "like",
      })
    );

    const outcomes = await Promise.all(concurrentRequests);
    for (const res of outcomes) {
      assert.equal(res.liked, true);
      assert.equal(res.likesCount, 1, "Every concurrent response must report 1 unique like");
    }

    const inDb = await Comment.findById(topLevelCommentId);
    assert.equal(inDb.likes.length, 1, "Database array must contain exactly 1 entry for this user");
  });

  test("6. An unauthenticated user cannot Like or Unlike a comment", async () => {
    await assert.rejects(
      async () => {
        await toggleCommentLike({
          commentId: topLevelCommentId.toString(),
          userId: null,
          action: "like",
        });
      },
      (err) => err.statusCode === 401 || /Invalid user identity/.test(err.message)
    );

    await assert.rejects(
      async () => {
        await toggleCommentLike({
          commentId: topLevelCommentId.toString(),
          userId: "not-an-objectid",
          action: "like",
        });
      },
      (err) => err.statusCode === 401 || /Invalid user identity/.test(err.message)
    );
  });

  test("7. The Like count and active UI state are properly derived for authenticated vs unauthenticated viewers", async () => {
    // Ensure User 1 has liked, User 2 has not
    await Comment.findByIdAndUpdate(topLevelCommentId, { $set: { likes: [testUser1Id] } });
    const inDb = await Comment.findById(topLevelCommentId);

    // When User 1 views the discussion
    const isLikedUser1 = checkIsLiked(inDb.likes, testUser1Id.toString());
    const countUser1 = extractLikesCount(inDb.likes);
    assert.equal(isLikedUser1, true, "Viewer User 1 must see active liked state");
    assert.equal(countUser1, 1, "Viewer User 1 must see count of 1");

    // When User 2 views the discussion
    const isLikedUser2 = checkIsLiked(inDb.likes, testUser2Id.toString());
    const countUser2 = extractLikesCount(inDb.likes);
    assert.equal(isLikedUser2, false, "Viewer User 2 must see unliked state");
    assert.equal(countUser2, 1, "Viewer User 2 must see count of 1");

    // When anonymous viewer views the discussion
    const isLikedAnon = checkIsLiked(inDb.likes, undefined);
    const countAnon = extractLikesCount(inDb.likes);
    assert.equal(isLikedAnon, false, "Anonymous visitor must see unliked state");
    assert.equal(countAnon, 1, "Anonymous visitor must see count of 1");
  });

  test("8. Existing legacy comments and replies continue to work seamlessly", async () => {
    // 1. Reply can be liked independently
    const replyRes = await toggleCommentLike({
      commentId: replyCommentId.toString(),
      userId: testUser1Id.toString(),
      action: "like",
    });
    assert.equal(replyRes.liked, true);
    assert.equal(replyRes.likesCount, 1);

    // 2. Legacy comment without likes array is normalized and liked safely without errors
    const legRes = await toggleCommentLike({
      commentId: legacyCommentId.toString(),
      userId: testUser2Id.toString(),
      action: "like",
    });
    assert.equal(legRes.liked, true);
    assert.equal(legRes.likesCount, 1);

    const legInDb = await db.collection("comments").findOne({ _id: legacyCommentId });
    assert.ok(Array.isArray(legInDb.likes), "Legacy comment likes field must now be an array");
    assert.equal(legInDb.content, "Legacy comment from prior system version without likes field.", "Content preserved");
  });

  after(async () => {
    if (db) {
      if (testUser1Id && testUser2Id) {
        await User.deleteMany({ _id: { $in: [testUser1Id, testUser2Id] } });
      }
      if (testPollId) {
        await Poll.deleteOne({ _id: testPollId });
      }
      if (topLevelCommentId || replyCommentId || legacyCommentId) {
        await db.collection("comments").deleteMany({
          _id: { $in: [topLevelCommentId, replyCommentId, legacyCommentId].filter(Boolean) },
        });
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  });
});
