import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Session must belong to a user"],
      index: true,
    },
    tokenHash: {
      type: String,
      required: [true, "Session token hash is required"],
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "Session expiry is required"],
      index: { expires: 0 }, // MongoDB TTL index to auto-remove expired documents
    },
    userAgent: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation of model across Next.js hot reloads
export const Session: Model<ISession> =
  (mongoose.models.Session as Model<ISession>) ||
  mongoose.model<ISession>("Session", SessionSchema);

export default Session;
