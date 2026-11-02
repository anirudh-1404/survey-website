import connectToDatabase from "@/lib/mongodb";
import { AdModel, IAd } from "@/models/Ad";
import { Ad, AdPlacement, CreateAdInput, UpdateAdInput } from "@/types/ad";
import mongoose from "mongoose";

/**
 * Serialize Mongoose Ad document into safe API response object.
 */
export function formatAd(doc: IAd): Ad {
  return {
    id: doc._id.toString(),
    title: doc.title,
    mediaType: doc.mediaType,
    mediaUrl: doc.mediaUrl,
    cloudinaryPublicId: doc.cloudinaryPublicId || undefined,
    targetUrl: doc.targetUrl,
    placement: doc.placement,
    status: doc.status,
    altText: doc.altText,
    sponsorName: doc.sponsorName,
    startDate: doc.startDate ? doc.startDate.toISOString() : undefined,
    endDate: doc.endDate ? doc.endDate.toISOString() : undefined,
    impressions: doc.impressions || 0,
    clicks: doc.clicks || 0,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
  };
}

/**
 * Get active ad for a specific placement slot.
 * Automatically checks dates: startDate <= now and (no endDate or endDate >= now).
 * Increments impression count.
 */
export async function getActiveAdForPlacement(
  placement: AdPlacement
): Promise<Ad | null> {
  await connectToDatabase();

  const now = new Date();
  const query: Record<string, unknown> = {
    placement,
    status: "active",
    $and: [
      {
        $or: [
          { startDate: { $exists: false } },
          { startDate: null },
          { startDate: { $lte: now } },
        ],
      },
      {
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: now } },
        ],
      },
    ],
  };

  // Find active ads for this placement
  const activeAds = (await AdModel.find(query).sort({ updatedAt: -1 }).limit(10).exec()) as unknown as IAd[];

  if (!activeAds || activeAds.length === 0) {
    return null;
  }

  // Pick random or most recently updated to rotate if multiple active
  const selected = activeAds[Math.floor(Math.random() * activeAds.length)];

  // Increment impression counter in background without blocking response
  AdModel.findByIdAndUpdate(selected._id, { $inc: { impressions: 1 } }).catch((err) => {
    console.error("[Ads] Failed to increment impression count:", err);
  });

  return formatAd(selected);
}

/**
 * Fetch all ads for admin console with optional status or placement filter.
 */
export async function getAllAds(filters?: {
  placement?: AdPlacement;
  status?: string;
}): Promise<Ad[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (filters?.placement) query.placement = filters.placement;
  if (filters?.status && filters.status !== "all") query.status = filters.status;

  const docs = (await AdModel.find(query).sort({ createdAt: -1 }).exec()) as unknown as IAd[];
  return docs.map(formatAd);
}

/**
 * Get single ad by ID.
 */
export async function getAdById(id: string): Promise<Ad | null> {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const doc = (await AdModel.findById(id).exec()) as unknown as IAd | null;
  return doc ? formatAd(doc) : null;
}

/**
 * Create a new ad campaign.
 */
export async function createAd(
  input: CreateAdInput,
  authorId: string
): Promise<Ad> {
  await connectToDatabase();

  const doc = await AdModel.create({
    title: input.title.trim(),
    mediaType: input.mediaType,
    mediaUrl: input.mediaUrl.trim(),
    cloudinaryPublicId: input.cloudinaryPublicId?.trim(),
    targetUrl: input.targetUrl.trim(),
    placement: input.placement,
    status: input.status || "active",
    altText: input.altText?.trim() || "Sponsored Advertisement",
    sponsorName: input.sponsorName?.trim(),
    startDate: input.startDate ? new Date(input.startDate) : undefined,
    endDate: input.endDate ? new Date(input.endDate) : undefined,
    createdBy: new mongoose.Types.ObjectId(authorId),
    impressions: 0,
    clicks: 0,
  });

  return formatAd(doc);
}

/**
 * Update an existing ad campaign.
 */
export async function updateAd(input: UpdateAdInput): Promise<Ad | null> {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(input.id)) return null;

  const updateFields: Record<string, unknown> = {};
  if (input.title !== undefined) updateFields.title = input.title.trim();
  if (input.mediaType !== undefined) updateFields.mediaType = input.mediaType;
  if (input.mediaUrl !== undefined) updateFields.mediaUrl = input.mediaUrl.trim();
  if (input.cloudinaryPublicId !== undefined)
    updateFields.cloudinaryPublicId = input.cloudinaryPublicId.trim();
  if (input.targetUrl !== undefined) updateFields.targetUrl = input.targetUrl.trim();
  if (input.placement !== undefined) updateFields.placement = input.placement;
  if (input.status !== undefined) updateFields.status = input.status;
  if (input.altText !== undefined) updateFields.altText = input.altText.trim();
  if (input.sponsorName !== undefined) updateFields.sponsorName = input.sponsorName.trim();
  if (input.startDate !== undefined)
    updateFields.startDate = input.startDate ? new Date(input.startDate) : null;
  if (input.endDate !== undefined)
    updateFields.endDate = input.endDate ? new Date(input.endDate) : null;

  const doc = (await AdModel.findByIdAndUpdate(input.id, updateFields, {
    new: true,
  }).exec()) as unknown as IAd | null;

  return doc ? formatAd(doc) : null;
}

/**
 * Delete an ad by ID.
 */
export async function deleteAd(id: string): Promise<boolean> {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(id)) return false;

  const result = await AdModel.findByIdAndDelete(id).exec();
  return Boolean(result);
}

/**
 * Record a click on an ad and return target link URL.
 */
export async function recordAdClick(id: string): Promise<string | null> {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const doc = await AdModel.findByIdAndUpdate(
    id,
    { $inc: { clicks: 1 } },
    { new: true }
  ).exec();

  return doc ? doc.targetUrl : null;
}
