import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVote extends Document {
  _id: mongoose.Types.ObjectId;
  pollId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  option: string;
  createdAt: Date;
  updatedAt: Date;
}

const VoteSchema = new Schema<IVote>(
  {
    pollId: {
      type: Schema.Types.ObjectId,
      ref: "Poll",
      required: [true, "Poll ID is required"],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    option: {
      type: String,
      required: [true, "Vote option is required"],
      trim: true,
      lowercase: true,
      maxlength: [50, "Option key cannot exceed 50 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Enforce one vote per user per poll at the database level
VoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });

// Optimize option aggregation queries
VoteSchema.index({ pollId: 1, option: 1 });

export const VoteModel: Model<IVote> =
  mongoose.models.Vote || mongoose.model<IVote>("Vote", VoteSchema);
