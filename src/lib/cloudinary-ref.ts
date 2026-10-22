import { PollModel } from "@/models/Poll";
import { BlogModel } from "@/models/Blog";
import mongoose from "mongoose";

/**
 * Check whether a Cloudinary asset publicId is still in active use
 * across any Poll document or Blog document (featured image or inline content).
 *
 * Prevents accidental deletion of assets reused across multiple publications.
 */
export async function isCloudinaryAssetReferenced(
  publicId: string,
  options?: {
    excludePollId?: string;
    excludeBlogId?: string;
  }
): Promise<boolean> {
  if (!publicId || typeof publicId !== "string") {
    return false;
  }

  const trimmed = publicId.trim();

  // 1. Check Poll documents
  const pollFilter: Record<string, unknown> = { cloudinaryPublicId: trimmed };
  if (options?.excludePollId) {
    const isOid = mongoose.Types.ObjectId.isValid(options.excludePollId);
    pollFilter._id = isOid
      ? { $ne: new mongoose.Types.ObjectId(options.excludePollId) }
      : { $ne: options.excludePollId };
  }
  const pollInUse = await PollModel.exists(pollFilter);
  if (pollInUse) return true;

  // 2. Check Blog featured image documents
  const blogFilter: Record<string, unknown> = { cloudinaryPublicId: trimmed };
  if (options?.excludeBlogId) {
    const isOid = mongoose.Types.ObjectId.isValid(options.excludeBlogId);
    blogFilter._id = isOid
      ? { $ne: new mongoose.Types.ObjectId(options.excludeBlogId) }
      : { $ne: options.excludeBlogId };
  }
  const blogFeaturedInUse = await BlogModel.exists(blogFilter);
  if (blogFeaturedInUse) return true;

  // 3. Check Blog rich-text inline contents (case-insensitive substring)
  const escapedId = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blogContentFilter: Record<string, unknown> = {
    content: { $regex: escapedId, $options: "i" },
  };
  if (options?.excludeBlogId) {
    const isOid = mongoose.Types.ObjectId.isValid(options.excludeBlogId);
    blogContentFilter._id = isOid
      ? { $ne: new mongoose.Types.ObjectId(options.excludeBlogId) }
      : { $ne: options.excludeBlogId };
  }
  const blogInlineInUse = await BlogModel.exists(blogContentFilter);
  if (blogInlineInUse) return true;

  return false;
}
