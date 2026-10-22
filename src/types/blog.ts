export type BlogStatus = "draft" | "published";

export interface BlogAuthor {
  id: string;
  name: string;
  role: "user" | "admin";
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  cloudinaryPublicId?: string;
  imageAlt?: string;
  category: string;
  tags: string[];
  status: BlogStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author: BlogAuthor;
  seoTitle?: string;
  seoDescription?: string;
  readingTimeMinutes?: number;
}

export interface BlogListResponse {
  blogs: BlogPost[];
  totalCount: number;
  page: number;
  totalPages: number;
  counts?: {
    total: number;
    published: number;
    draft: number;
  };
}
