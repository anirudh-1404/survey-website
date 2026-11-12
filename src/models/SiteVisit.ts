import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISiteVisitUser {
  id?: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: string;
}

export interface ISiteVisit extends Document {
  path: string;
  pollSlug?: string;
  pollTitle?: string;
  user?: ISiteVisitUser;
  visitorId?: string;
  device?: string;
  browser?: string;
  os?: string;
  ip?: string;
  city?: string;
  country?: string;
  timezone?: string;
  referrer?: string;
  source?: string;
  createdAt: Date;
}

const SiteVisitSchema = new Schema<ISiteVisit>(
  {
    path: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
      index: true,
    },
    pollSlug: {
      type: String,
      trim: true,
      maxlength: 200,
      index: true,
    },
    pollTitle: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    user: {
      id: { type: Schema.Types.ObjectId, ref: "User" },
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      role: { type: String, trim: true },
    },
    visitorId: {
      type: String,
      trim: true,
      maxlength: 100,
      index: true,
    },
    device: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    browser: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    os: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    ip: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    timezone: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    referrer: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    source: {
      type: String,
      trim: true,
      maxlength: 100,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SiteVisitSchema.index({ createdAt: -1 });
SiteVisitSchema.index({ "user.id": 1 });

export const SiteVisit: Model<ISiteVisit> =
  (mongoose.models.SiteVisit as Model<ISiteVisit>) ||
  mongoose.model<ISiteVisit>("SiteVisit", SiteVisitSchema);

export default SiteVisit;
