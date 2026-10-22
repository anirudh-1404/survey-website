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
import { FEATURED_POLL, LATEST_POLLS } from "@/data/mockPolls";

export const instant = false;

export default async function HomePage() {
  let featuredPoll = FEATURED_POLL;
  let latestPolls = LATEST_POLLS;
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
      const filtered = dbPublished.filter((p) => p.id !== featuredPoll.id);
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

      <main className="flex-1">
        {/* 2. Hero Section */}
        <Hero />

        {/* 3. Featured Poll Section (Database-Backed) */}
        <FeaturedPoll poll={featuredPoll} />

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
