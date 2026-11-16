import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVote extends Document {
  _id: mongoose.Types.ObjectId;
  pollId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  voterId?: string;
  ipAddress?: string;
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
      required: false,
      index: true,
    },
    voterId: {
      type: String,
      trim: true,
      maxlength: 120,
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
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

// Unique compound indexes with sparse to allow either userId or voterId
VoteSchema.index({ pollId: 1, userId: 1 }, { unique: true, sparse: true });
VoteSchema.index({ pollId: 1, voterId: 1 }, { unique: true, sparse: true });

// Optimize option aggregation queries
VoteSchema.index({ pollId: 1, option: 1 });

export const VoteModel: Model<IVote> =
  mongoose.models.Vote || mongoose.model<IVote>("Vote", VoteSchema);

export default VoteModel;
