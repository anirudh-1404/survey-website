import mongoose, { Schema, Document, Model } from "mongoose";

export type BlogStatus = "draft" | "published";

export interface IBlog extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  cloudinaryPublicId?: string;
  imageAlt?: string;
  authorId: mongoose.Types.ObjectId;
  category: string;
  tags: string[];
  status: BlogStatus;
  publishedAt?: Date | null;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: [true, "Blog slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    excerpt: {
      type: String,
      required: [true, "Excerpt summary is required"],
      trim: true,
      minlength: [10, "Excerpt must be at least 10 characters"],
      maxlength: [500, "Excerpt cannot exceed 500 characters"],
    },
    content: {
      type: String,
      required: [true, "Blog rich-text content is required"],
      trim: true,
      minlength: [20, "Content must be at least 20 characters long"],
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: [1000, "Image URL cannot exceed 1000 characters"],
      default: undefined,
    },
    cloudinaryPublicId: {
      type: String,
      trim: true,
      maxlength: [200, "Cloudinary public ID cannot exceed 200 characters"],
      default: undefined,
    },
    imageAlt: {
      type: String,
      trim: true,
      maxlength: [200, "Image alt text cannot exceed 200 characters"],
      default: undefined,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author ID is required"],
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: "Analysis",
      maxlength: [50, "Category cannot exceed 50 characters"],
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "published"],
        message: "{VALUE} is not a valid blog status",
      },
      default: "draft",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: [100, "SEO title cannot exceed 100 characters"],
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: [200, "SEO description cannot exceed 200 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// High-efficiency compound indexes for public blog feed and author archives
BlogSchema.index({ status: 1, publishedAt: -1 });
BlogSchema.index({ category: 1, status: 1, publishedAt: -1 });

export const BlogModel: Model<IBlog> =
  mongoose.models.Blog || mongoose.model<IBlog>("Blog", BlogSchema);

export default BlogModel;
