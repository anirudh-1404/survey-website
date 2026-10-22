import mongoose, { Schema, Document, Model } from "mongoose";

export type ReportReason =
  | "spam"
  | "harassment"
  | "misinformation"
  | "inappropriate"
  | "other";

export type ReportStatus = "pending" | "reviewed" | "dismissed";

export interface IReport extends Document {
  _id: mongoose.Types.ObjectId;
  commentId: mongoose.Types.ObjectId;
  pollId: mongoose.Types.ObjectId;
  reporterId: mongoose.Types.ObjectId;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      required: [true, "Comment ID is required"],
      index: true,
    },
    pollId: {
      type: Schema.Types.ObjectId,
      ref: "Poll",
      required: [true, "Poll ID is required"],
      index: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter ID is required"],
      index: true,
    },
    reason: {
      type: String,
      enum: {
        values: [
          "spam",
          "harassment",
          "misinformation",
          "inappropriate",
          "other",
        ],
        message: "{VALUE} is not a valid reporting category",
      },
      required: [true, "A reporting reason must be specified"],
    },
    details: {
      type: String,
      trim: true,
      maxlength: [500, "Report details cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique report per user per comment
ReportSchema.index({ commentId: 1, reporterId: 1 }, { unique: true });

// Optimize moderation queries
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ pollId: 1, createdAt: -1 });

export const ReportModel: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
