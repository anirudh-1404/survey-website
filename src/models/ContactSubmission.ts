import mongoose, { Schema, Document, Model } from "mongoose";

export type ContactStatus = "unread" | "read" | "resolved";

export interface IContactSubmission extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>(
  {
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
      maxlength: [254, "Email address cannot exceed 254 characters"],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Subject line is required"],
      trim: true,
      minlength: [3, "Subject must be at least 3 characters"],
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Message body cannot be empty"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [3000, "Message cannot exceed 3000 characters"],
    },
    status: {
      type: String,
      enum: {
        values: ["unread", "read", "resolved"],
        message: "{VALUE} is not a valid contact submission status",
      },
      default: "unread",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for admin inbox querying, filtering, and timestamp sorting
ContactSubmissionSchema.index({ status: 1, createdAt: -1 });
ContactSubmissionSchema.index({ createdAt: -1 });
ContactSubmissionSchema.index({ email: 1, createdAt: -1 });

export const ContactSubmissionModel: Model<IContactSubmission> =
  mongoose.models.ContactSubmission ||
  mongoose.model<IContactSubmission>("ContactSubmission", ContactSubmissionSchema);

export default ContactSubmissionModel;
