import type { MetadataRoute } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { PollModel } from "@/models/Poll";
import { BlogModel } from "@/models/Blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pulse.org";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/polls`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blogs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/contact-us`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  try {
    await connectToDatabase();
    // Strictly published polls and blogs only! Never drafts or unverified content.
    const [publishedPolls, publishedBlogs] = await Promise.all([
      PollModel.find({ status: "published" })
        .select("slug updatedAt publishedAt")
        .lean(),
      BlogModel.find({ status: "published" })
        .select("slug updatedAt publishedAt")
        .lean(),
    ]);

    const pollRoutes: MetadataRoute.Sitemap = publishedPolls.map((poll) => ({
      url: `${siteUrl}/polls/${poll.slug}`,
      lastModified: poll.updatedAt || poll.publishedAt || new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    }));

    const blogRoutes: MetadataRoute.Sitemap = publishedBlogs.map((blog) => ({
      url: `${siteUrl}/blogs/${blog.slug}`,
      lastModified: blog.updatedAt || blog.publishedAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticRoutes, ...pollRoutes, ...blogRoutes];
  } catch {
    // If DB is unreachable during static compilation, return safe static routes
    return staticRoutes;
  }
}
