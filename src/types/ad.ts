export type AdPlacement = "banner_top" | "feed_inline" | "sidebar" | "poll_detail";
export type AdMediaType = "image" | "video";
export type AdStatus = "active" | "paused" | "expired";

export interface Ad {
  id: string;
  title: string;
  mediaType: AdMediaType;
  mediaUrl: string;
  cloudinaryPublicId?: string;
  targetUrl: string;
  placement: AdPlacement;
  status: AdStatus;
  altText?: string;
  sponsorName?: string;
  startDate?: string;
  endDate?: string;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdInput {
  title: string;
  mediaType: AdMediaType;
  mediaUrl: string;
  cloudinaryPublicId?: string;
  targetUrl: string;
  placement: AdPlacement;
  status?: AdStatus;
  altText?: string;
  sponsorName?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateAdInput extends Partial<CreateAdInput> {
  id: string;
}
