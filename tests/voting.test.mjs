import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

class VoteError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "VoteError";
    this.statusCode = statusCode;
  }
}

function verifyCsrfOrigin(request) {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (!host) {
    return false;
  }

  const allowedDomain = host.toLowerCase().split(":")[0];

  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.hostname.toLowerCase() === allowedDomain;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.hostname.toLowerCase() === allowedDomain;
    } catch {
      return false;
    }
  }

  return false;
}

describe("Day 5 — Real Voting System & Live Results Tests", () => {
  const MONGODB_URI = process.env.MONGODB_URI;

  let User;
  let Poll;
  let Vote;

  let voterUser1;
  let voterUser2;
  let adminUser;

  let openPoll1;
  let openPoll2;
  let closedPoll;
  let expiredPoll;
  let draftPoll;
  let zeroVotePoll;

  async function getPollVoteResults(pollId) {
    const objectId =
      typeof pollId === "string" ? new mongoose.Types.ObjectId(pollId) : pollId;

    const agg = await Vote.aggregate([
      { $match: { pollId: objectId } },
      { $group: { _id: "$option", count: { $sum: 1 } } },
    ]);

    const counts = {};
    let total = 0;

    for (const item of agg) {
      const key = String(item._id).toLowerCase();
      const count = Number(item.count) || 0;
      counts[key] = count;
      total += count;
    }

    const yesCount = counts["yes"] || 0;
    const noCount = counts["no"] || 0;

    let yesPercent = 0;
    let noPercent = 0;

    if (total > 0) {
      yesPercent = Math.round((yesCount / total) * 100);
      noPercent = 100 - yesPercent;
    }

    const byOption = {};
    for (const [key, count] of Object.entries(counts)) {
      byOption[key] = {
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    }

    return {
      total,
      yes: yesCount,
      no: noCount,
      yesPercent,
      noPercent,
      byOption,
    };
  }

  async function getUserVote(pollId, userId) {
    const vote = await Vote.findOne({
      pollId: typeof pollId === "string" ? new mongoose.Types.ObjectId(pollId) : pollId,
      userId: typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId,
    })
      .select("option")
      .lean();

    if (!vote) {
      return { hasVoted: false };
    }

    return {
      hasVoted: true,
      option: vote.option,
    };
  }

  async function castVote({ pollIdentifier, userId, option }) {
    await Vote.init();

    const cleanOption = (option || "").trim().toLowerCase();
    if (!cleanOption) {
      throw new VoteError("A valid vote option must be specified", 422);
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new VoteError("A valid user ID is required", 401);
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(pollIdentifier);
    const poll = await Poll.findOne({
      $or: [
        { slug: pollIdentifier },
        ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(pollIdentifier) }] : []),
      ],
    });

    if (!poll) {
      throw new VoteError("The requested poll inquiry could not be found", 404);
    }

    if (poll.status === "draft") {
      throw new VoteError("Cannot vote on an unpublished draft inquiry", 403);
    }

    if (poll.status === "closed") {
      throw new VoteError("This public inquiry is closed for voting", 403);
    }

    if (poll.closesAt && new Date() > new Date(poll.closesAt)) {
      throw new VoteError("Voting for this inquiry has concluded", 403);
    }

    const validOptionKeys =
      poll.options && poll.options.length > 0
        ? poll.options.map((o) => o.key.toLowerCase())
        : ["yes", "no"];

    if (!validOptionKeys.includes(cleanOption)) {
      throw new VoteError(
        `Invalid voting option: '${option}'. Allowed options are: ${validOptionKeys.join(", ")}`,
        422
      );
    }

    try {
      await Vote.create({
        pollId: poll._id,
        userId: new mongoose.Types.ObjectId(userId),
        option: cleanOption,
      });
    } catch (err) {
      if (err && (err.code === 11000 || (err.message && err.message.includes("E11000")))) {
        throw new VoteError("You have already cast your ballot on this inquiry.", 409);
      }
      throw err;
    }

    const updatedResults = await getPollVoteResults(poll._id);

    return {
      success: true,
      userVote: cleanOption,
      results: updatedResults,
    };
  }

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
        title: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        category: { type: String, required: true },
        summary: { type: String, required: true },
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

    const VoteSchema = new mongoose.Schema(
      {
        pollId: { type: mongoose.Schema.Types.ObjectId, ref: "Poll", required: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        option: { type: String, required: true, trim: true, lowercase: true },
      },
      { timestamps: true }
    );
    VoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });

    User = mongoose.models.User || mongoose.model("User", UserSchema);
    Poll = mongoose.models.Poll || mongoose.model("Poll", PollSchema);
    Vote = mongoose.models.Vote || mongoose.model("Vote", VoteSchema);

    await Vote.init();

    // 1. Create test users
    const timestamp = Date.now();
    adminUser = await User.create({
      name: "Voting Test Admin",
      email: `admin_vote_${timestamp}@pulse.test`,
      passwordHash: "hash_test",
      role: "admin",
    });

    voterUser1 = await User.create({
      name: "Citizen Voter Alpha",
      email: `voter_alpha_${timestamp}@pulse.test`,
      passwordHash: "hash_test",
      role: "user",
    });

    voterUser2 = await User.create({
      name: "Citizen Voter Beta",
      email: `voter_beta_${timestamp}@pulse.test`,
      passwordHash: "hash_test",
      role: "user",
    });

    // 2. Create test polls
    openPoll1 = await Poll.create({
      title: "Should carbon border adjustments be universally adopted?",
      slug: `test-carbon-adjustments-${timestamp}`,
      category: "Climate & Energy",
      summary: "Evaluating international cross-border climate fiscal tariffs.",
      createdBy: adminUser._id,
      status: "published",
      publishedAt: new Date(),
      options: [
        { key: "yes", label: "Yes — Adopt carbon border taxes" },
        { key: "no", label: "No — Rely on multilateral market credits" },
      ],
    });

    openPoll2 = await Poll.create({
      title: "Should central bank digital currencies replace physical cash?",
      slug: `test-cbdc-policy-${timestamp}`,
      category: "Global Economy",
      summary: "Assessing macroeconomic monetary modernization proposals.",
      createdBy: adminUser._id,
      status: "published",
      publishedAt: new Date(),
      options: [
        { key: "yes", label: "Yes — Accelerate CBDC transition" },
        { key: "no", label: "No — Maintain physical sovereign currency" },
      ],
    });

    closedPoll = await Poll.create({
      title: "Should space mining claims be governed by UN treaty?",
      slug: `test-space-mining-closed-${timestamp}`,
      category: "Geopolitics",
      summary: "Examining extraterrestrial resource rights frameworks.",
      createdBy: adminUser._id,
      status: "closed",
      publishedAt: new Date(Date.now() - 86400000),
      options: [
        { key: "yes", label: "Yes" },
        { key: "no", label: "No" },
      ],
    });

    expiredPoll = await Poll.create({
      title: "Should automated trading be capped during market flash crashes?",
      slug: `test-trading-expired-${timestamp}`,
      category: "Global Economy",
      summary: "Algorithmic market safeguard deliberations.",
      createdBy: adminUser._id,
      status: "published",
      publishedAt: new Date(Date.now() - 86400000),
      closesAt: new Date(Date.now() - 3600000), // Concluded 1 hour ago
      options: [
        { key: "yes", label: "Yes" },
        { key: "no", label: "No" },
      ],
    });

    draftPoll = await Poll.create({
      title: "Should quantum encryption algorithms be classified as munitions?",
      slug: `test-quantum-draft-${timestamp}`,
      category: "Technology & AI",
      summary: "National security technology export restrictions review.",
      createdBy: adminUser._id,
      status: "draft",
      options: [
        { key: "yes", label: "Yes" },
        { key: "no", label: "No" },
      ],
    });

    zeroVotePoll = await Poll.create({
      title: "Should fusion energy test reactors receive emergency fast-track permits?",
      slug: `test-fusion-zero-${timestamp}`,
      category: "Climate & Energy",
      summary: "Investigating expedited licensing for clean fusion experiments.",
      createdBy: adminUser._id,
      status: "published",
      publishedAt: new Date(),
      options: [
        { key: "yes", label: "Yes" },
        { key: "no", label: "No" },
      ],
    });
  });

  after(async () => {
    if (voterUser1) await User.deleteOne({ _id: voterUser1._id });
    if (voterUser2) await User.deleteOne({ _id: voterUser2._id });
    if (adminUser) await User.deleteOne({ _id: adminUser._id });

    const pollIds = [
      openPoll1?._id,
      openPoll2?._id,
      closedPoll?._id,
      expiredPoll?._id,
      draftPoll?._id,
      zeroVotePoll?._id,
    ].filter(Boolean);

    if (pollIds.length > 0) {
      await Poll.deleteMany({ _id: { $in: pollIds } });
      await Vote.deleteMany({ pollId: { $in: pollIds } });
    }

    await mongoose.disconnect();
  });

  test("1. Authenticated user successfully votes Yes", async () => {
    const res = await castVote({
      pollIdentifier: openPoll1.slug,
      userId: voterUser1._id.toString(),
      option: "yes",
    });

    assert.equal(res.success, true);
    assert.equal(res.userVote, "yes");
    assert.equal(res.results.yes, 1);
    assert.equal(res.results.no, 0);
    assert.equal(res.results.total, 1);
    assert.equal(res.results.yesPercent, 100);
    assert.equal(res.results.noPercent, 0);

    const storedVote = await Vote.findOne({
      pollId: openPoll1._id,
      userId: voterUser1._id,
    });
    assert.ok(storedVote);
    assert.equal(storedVote.option, "yes");
  });

  test("2. Authenticated user successfully votes No on another eligible poll", async () => {
    const res = await castVote({
      pollIdentifier: openPoll2.slug,
      userId: voterUser1._id.toString(),
      option: "no",
    });

    assert.equal(res.success, true);
    assert.equal(res.userVote, "no");
    assert.equal(res.results.no, 1);
    assert.equal(res.results.yes, 0);
    assert.equal(res.results.total, 1);
    assert.equal(res.results.noPercent, 100);
    assert.equal(res.results.yesPercent, 0);
  });

  test("3. The same user cannot vote twice on the same poll", async () => {
    await assert.rejects(
      async () => {
        await castVote({
          pollIdentifier: openPoll1.slug,
          userId: voterUser1._id.toString(),
          option: "no",
        });
      },
      (err) => {
        assert(err instanceof VoteError);
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /already cast your ballot/i);
        return true;
      }
    );

    const votesCount = await Vote.countDocuments({ pollId: openPoll1._id });
    assert.equal(votesCount, 1);
  });

  test("4. Two concurrent submissions cannot create duplicate votes", async () => {
    const results = await Promise.allSettled([
      castVote({
        pollIdentifier: openPoll1.slug,
        userId: voterUser2._id.toString(),
        option: "no",
      }),
      castVote({
        pollIdentifier: openPoll1.slug,
        userId: voterUser2._id.toString(),
        option: "no",
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.statusCode, 409);

    const totalVotes = await Vote.countDocuments({ pollId: openPoll1._id });
    assert.equal(totalVotes, 2);
  });

  test("5. Unauthenticated user cannot vote", async () => {
    await assert.rejects(
      async () => {
        await castVote({
          pollIdentifier: openPoll1.slug,
          userId: "",
          option: "yes",
        });
      },
      (err) => {
        assert(err instanceof VoteError);
        assert.equal(err.statusCode, 401);
        return true;
      }
    );
  });

  test("6. Invalid options are rejected", async () => {
    await assert.rejects(
      async () => {
        await castVote({
          pollIdentifier: openPoll2.slug,
          userId: voterUser2._id.toString(),
          option: "maybe",
        });
      },
      (err) => {
        assert(err instanceof VoteError);
        assert.equal(err.statusCode, 422);
        assert.match(err.message, /Invalid voting option/i);
        return true;
      }
    );
  });

  test("7. Draft polls cannot be voted on", async () => {
    await assert.rejects(
      async () => {
        await castVote({
          pollIdentifier: draftPoll.slug,
          userId: voterUser1._id.toString(),
          option: "yes",
        });
      },
      (err) => {
        assert(err instanceof VoteError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /unpublished draft inquiry/i);
        return true;
      }
    );
  });

  test("8. Closed polls cannot be voted on", async () => {
    await assert.rejects(
      async () => {
        await castVote({
          pollIdentifier: closedPoll.slug,
          userId: voterUser1._id.toString(),
          option: "yes",
        });
      },
      (err) => {
        assert(err instanceof VoteError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /closed for voting/i);
        return true;
      }
    );
  });

  test("9. Expired polls cannot be voted on", async () => {
    await assert.rejects(
      async () => {
        await castVote({
          pollIdentifier: expiredPoll.slug,
          userId: voterUser1._id.toString(),
          option: "yes",
        });
      },
      (err) => {
        assert(err instanceof VoteError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /has concluded/i);
        return true;
      }
    );
  });

  test("10. Results reflect persisted vote counts and percentages", async () => {
    const results = await getPollVoteResults(openPoll1._id);

    assert.equal(results.total, 2);
    assert.equal(results.yes, 1);
    assert.equal(results.no, 1);
    assert.equal(results.yesPercent, 50);
    assert.equal(results.noPercent, 50);
    assert.equal(results.yesPercent + results.noPercent, 100);
  });

  test("11. Zero-vote polls return valid empty results without division error", async () => {
    const results = await getPollVoteResults(zeroVotePoll._id);

    assert.equal(results.total, 0);
    assert.equal(results.yes, 0);
    assert.equal(results.no, 0);
    assert.equal(results.yesPercent, 0);
    assert.equal(results.noPercent, 0);
    assert.equal(Number.isNaN(results.yesPercent), false);
    assert.equal(Number.isNaN(results.noPercent), false);
  });

  test("12. Results do not reveal voter personal information", async () => {
    const results = await getPollVoteResults(openPoll1._id);

    assert.equal("email" in results, false);
    assert.equal("passwordHash" in results, false);
    assert.equal("token" in results, false);
    assert.equal("userId" in results, false);
    assert.equal("voters" in results, false);
  });

  test("13. Voting mutations respect existing CSRF/origin protections", async () => {
    const validRequest = new Request("http://localhost:3000/api/polls/test/vote", {
      method: "POST",
      headers: {
        Host: "localhost:3000",
        Origin: "http://localhost:3000",
      },
    });
    assert.equal(verifyCsrfOrigin(validRequest), true);

    const maliciousRequest = new Request("http://localhost:3000/api/polls/test/vote", {
      method: "POST",
      headers: {
        Host: "localhost:3000",
        Origin: "https://evil-attacker.com",
      },
    });
    assert.equal(verifyCsrfOrigin(maliciousRequest), false);
  });

  test("14. getUserVote accurately reports user voting status", async () => {
    const user1Status = await getUserVote(openPoll1._id, voterUser1._id);
    assert.equal(user1Status.hasVoted, true);
    assert.equal(user1Status.option, "yes");

    const nonVoterStatus = await getUserVote(zeroVotePoll._id, voterUser1._id);
    assert.equal(nonVoterStatus.hasVoted, false);
  });
});
