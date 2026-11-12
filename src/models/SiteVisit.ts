import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISiteVisit extends Document {
  path: string;
  referrer?: string;
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
    referrer: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SiteVisitSchema.index({ createdAt: -1 });

export const SiteVisit: Model<ISiteVisit> =
  (mongoose.models.SiteVisit as Model<ISiteVisit>) ||
  mongoose.model<ISiteVisit>("SiteVisit", SiteVisitSchema);

export default SiteVisit;
