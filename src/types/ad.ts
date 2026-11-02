export type AdPlacement = "banner_top" | "feed_inline" | "sidebar" | "poll_detail";
export type AdMediaType = "image" | "video";
export type AdStatus = "active" | "paused" | "expired";

export interface AdPlacementSpec {
  name: string;
  ratio: string;
  aspectRatioValue: number; // width / height
  recommendedWidth: number;
  recommendedHeight: number;
  minWidth: number;
  minHeight: number;
  tolerance: number; // e.g. 0.15 allows minor deviation
  description: string;
}

export const PLACEMENT_SPECS: Record<AdPlacement, AdPlacementSpec> = {
  banner_top: {
    name: "Top Banner (Header)",
    ratio: "8:1 (or 728x90 to 1200x150)",
    aspectRatioValue: 8.0,
    recommendedWidth: 1200,
    recommendedHeight: 150,
    minWidth: 700,
    minHeight: 80,
    tolerance: 0.35, // Allows 5:1 to 10:1 wide banners
    description: "Ultra-wide horizontal banner displayed directly beneath the main navbar",
  },
  feed_inline: {
    name: "In-Feed Sponsored Card",
    ratio: "16:9 (Landscape)",
    aspectRatioValue: 16 / 9, // ~1.77
    recommendedWidth: 1200,
    recommendedHeight: 675,
    minWidth: 480,
    minHeight: 270,
    tolerance: 0.2, // ~1.5 to ~2.0
    description: "Standard 16:9 landscape image or video card displayed in poll listings",
  },
  sidebar: {
    name: "Sidebar Column",
    ratio: "1:1 or 4:5 (Square / Portrait)",
    aspectRatioValue: 1.0,
    recommendedWidth: 600,
    recommendedHeight: 600,
    minWidth: 300,
    minHeight: 300,
    tolerance: 0.3, // Square to slight portrait
    description: "Compact square or vertical card for desktop sidebars",
  },
  poll_detail: {
    name: "Poll Detail Bottom",
    ratio: "16:9 or 21:9 (Wide Landscape)",
    aspectRatioValue: 16 / 9,
    recommendedWidth: 1200,
    recommendedHeight: 675,
    minWidth: 600,
    minHeight: 250,
    tolerance: 0.35,
    description: "Wide banner situated between voting analytics and live chat discourse",
  },
};


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
