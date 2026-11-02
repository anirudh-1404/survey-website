import mongoose, { Schema, Document, Model } from "mongoose";
import { AdPlacement, AdMediaType, AdStatus } from "@/types/ad";

export interface IAd extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  mediaType: AdMediaType;
  mediaUrl: string;
  cloudinaryPublicId?: string;
  targetUrl: string;
  placement: AdPlacement;
  status: AdStatus;
  altText?: string;
  sponsorName?: string;
  startDate?: Date;
  endDate?: Date;
  impressions: number;
  clicks: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdSchema = new Schema<IAd>(
  {
    title: {
      type: String,
      required: [true, "Ad campaign title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    mediaType: {
      type: String,
      required: [true, "Media type is required"],
      enum: ["image", "video"],
      default: "image",
    },
    mediaUrl: {
      type: String,
      required: [true, "Media URL is required"],
      trim: true,
    },
    cloudinaryPublicId: {
      type: String,
      trim: true,
    },
    targetUrl: {
      type: String,
      required: [true, "Target link URL is required"],
      trim: true,
    },
    placement: {
      type: String,
      required: [true, "Placement slot is required"],
      enum: ["banner_top", "feed_inline", "sidebar", "poll_detail"],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "paused", "expired"],
      default: "active",
      index: true,
    },
    altText: {
      type: String,
      trim: true,
      maxlength: [200, "Alt text cannot exceed 200 characters"],
      default: "Sponsored Advertisement",
    },
    sponsorName: {
      type: String,
      trim: true,
      maxlength: [100, "Sponsor name cannot exceed 100 characters"],
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    impressions: {
      type: Number,
      default: 0,
      min: 0,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active ads lookup by placement
AdSchema.index({ placement: 1, status: 1, createdAt: -1 });

export const AdModel: Model<IAd> =
  mongoose.models.Ad || mongoose.model<IAd>("Ad", AdSchema);
