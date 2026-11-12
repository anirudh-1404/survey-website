import mongoose, { Schema, Document, Model } from "mongoose";
import { PollCategory } from "@/types/poll";

export interface IPollOption {
  key: string;
  label: string;
}

export interface IPoll extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  category: PollCategory;
  summary: string;
  context?: string;
  sourceReference?: string;
  editorialNote?: string;
  createdBy: mongoose.Types.ObjectId;
  status: "draft" | "published" | "closed";
  publishedAt?: Date;
  closesAt?: Date;
  featured: boolean;
  views: number;
  options: IPollOption[];
  imageUrl?: string;
  cloudinaryPublicId?: string;
  imageAlt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PollOptionSchema = new Schema<IPollOption>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Option label cannot exceed 200 characters"],
    },
  },
  { _id: false }
);

const PollSchema = new Schema<IPoll>(
  {
    title: {
      type: String,
      required: [true, "Poll question/title is required"],
      trim: true,
      minlength: [10, "Title must be at least 10 characters long"],
      maxlength: [300, "Title cannot exceed 300 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Technology & AI",
        "Global Economy",
        "Geopolitics",
        "Climate & Energy",
        "Society & Culture",
        "Health & Science",
      ],
      index: true,
    },
    summary: {
      type: String,
      required: [true, "Summary is required"],
      trim: true,
      minlength: [20, "Summary must be at least 20 characters long"],
      maxlength: [600, "Summary cannot exceed 600 characters"],
    },
    context: {
      type: String,
      trim: true,
      maxlength: [3000, "Editorial context cannot exceed 3000 characters"],
    },
    sourceReference: {
      type: String,
      trim: true,
      maxlength: [300, "Source reference cannot exceed 300 characters"],
    },
    editorialNote: {
      type: String,
      trim: true,
      maxlength: [200, "Editorial note cannot exceed 200 characters"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Poll creator is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
      index: true,
    },
    publishedAt: {
      type: Date,
      index: true,
    },
    closesAt: {
      type: Date,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    options: {
      type: [PollOptionSchema],
      default: [
        { key: "yes", label: "Yes — In favor of the proposed measure" },
        { key: "no", label: "No — Opposed to the proposed measure" },
      ],
      validate: {
        validator: function (v: IPollOption[]) {
          return Array.isArray(v) && v.length >= 2;
        },
        message: "A poll must have at least two options",
      },
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: [1000, "Image URL cannot exceed 1000 characters"],
    },
    cloudinaryPublicId: {
      type: String,
      trim: true,
      maxlength: [200, "Cloudinary public ID cannot exceed 200 characters"],
    },
    imageAlt: {
      type: String,
      trim: true,
      maxlength: [200, "Image description cannot exceed 200 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

// Compound index for public listings: only published polls sorted by date
PollSchema.index({ status: 1, publishedAt: -1 });
PollSchema.index({ category: 1, status: 1, publishedAt: -1 });

// Prevent re-compilation of model across Next.js hot reloads
export const PollModel: Model<IPoll> =
  (mongoose.models.Poll as Model<IPoll>) ||
  mongoose.model<IPoll>("Poll", PollSchema);

export default PollModel;
