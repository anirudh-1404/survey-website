import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { FeaturedPoll } from "@/components/polls/FeaturedPoll";
import { LatestPollsSection } from "@/components/polls/LatestPollsSection";
import { AboutPulse } from "@/components/home/AboutPulse";
import { RecentBlogsSection } from "@/components/home/RecentBlogsSection";
import { getPublishedPolls, getFeaturedPoll } from "@/lib/polls";
import { getPublishedBlogs } from "@/lib/blogs";
import { BlogPost } from "@/types/blog";
import { Poll } from "@/types/poll";
import { AdBanner } from "@/components/ads/AdBanner";
import { connection } from "next/server";

export const instant = false;

export default async function HomePage() {
  await connection();
  let featuredPoll: Poll | null = null;
  let latestPolls: Poll[] = [];
  let recentBlogs: BlogPost[] = [];

  try {
    const [dbFeatured, dbPublished, blogsRes] = await Promise.all([
      getFeaturedPoll(),
      getPublishedPolls({ limit: 12 }),
      getPublishedBlogs({ limit: 3 }),
    ]);

    if (dbFeatured) {
      featuredPoll = dbFeatured;
    }

    if (dbPublished && dbPublished.length > 0) {
      // Exclude featured poll from the general latest grid to prevent redundancy
      const currentFeaturedId = featuredPoll?.id;
      const filtered = currentFeaturedId
        ? dbPublished.filter((p) => p.id !== currentFeaturedId)
        : dbPublished;
      latestPolls = filtered.length > 0 ? filtered : dbPublished;
    }

    if (blogsRes && blogsRes.blogs) {
      recentBlogs = blogsRes.blogs;
    }
  } catch {
    // Graceful fallback if database connection is temporarily degraded
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#090a0f] text-zinc-100">
      {/* 1. Header & Navigation */}
      <Navbar />

      {/* 1.1 Top Sponsored Banner */}
      <AdBanner placement="banner_top" />

      <main className="flex-1">
        {/* 2. Hero Section */}
        <Hero />

        {/* 3. Featured Poll Section (Database-Backed) */}
        {featuredPoll && <FeaturedPoll poll={featuredPoll} />}

        {/* 4. Latest Polls Section (Database-Backed) */}
        <LatestPollsSection polls={latestPolls} />

        {/* 5. About PULSE Section */}
        <AboutPulse />

        {/* 6. Recent Editorial Blogs & Publications Entry */}
        <RecentBlogsSection blogs={recentBlogs} />

        {/* 7. Methodology / How It Works */}
        <HowItWorks />
      </main>

      {/* 8. Footer */}
      <Footer />
    </div>
  );
}
