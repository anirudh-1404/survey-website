export type PollStatus = "Open" | "Closed" | "Live" | "Draft";

export const DEFAULT_POLL_CATEGORIES = [
  "Technology & AI",
  "Global Economy",
  "Geopolitics",
  "Climate & Energy",
  "Society & Culture",
  "Health & Science",
  "Entertainment & Cinema",
  "Politics & Governance",
  "Sports & Games",
  "Religion & Mythology",
  "Education & Career",
  "Business & Startups",
  "Crime & Justice",
  "Lifestyle & Travel",
] as const;

export type PollCategory = string;

export interface PollOption {
  id: string;
  label: string;
  votes: number;
  percentage?: number;
}

export interface CommentReply {
  id: string;
  author: string;
  authorRole?: string;
  isVerified: boolean;
  content: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
}

export interface PollComment {
  id: string;
  pollId: string;
  author: string;
  authorRole?: string;
  isVerified: boolean;
  userVote?: "Yes" | "No";
  content: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
  replies?: CommentReply[];
}

export interface Poll {
  id: string;
  title: string;
  category: PollCategory;
  summary: string;
  context?: string;
  status: PollStatus;
  totalVotes: number;
  publishedAt: string;
  closesAt?: string;
  options: PollOption[];
  featured?: boolean;
  views?: number;
  editorialNote?: string;
  sourceReference?: string;
  commentsCount?: number;
  imageUrl?: string;
  cloudinaryPublicId?: string;
  imageAlt?: string;
}

export interface TrendingTopic {
  id: string;
  title: string;
  category: PollCategory;
  pollCount: number;
  participantCount: number;
  isHot?: boolean;
}

export interface AdminMetrics {
  totalPolls: number;
  publishedPolls: number;
  draftPolls: number;
  closedPolls: number;
  totalVotes: number;
  verifiedUsers: number;
}
