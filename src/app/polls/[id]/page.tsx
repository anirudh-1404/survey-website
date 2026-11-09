import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PollCard } from "@/components/polls/PollCard";
import { PollDetailInteractive } from "@/components/polls/PollDetailInteractive";
import {
  getPublicPollByIdOrSlug,
  getPublishedPolls,
} from "@/lib/polls";
import { getCurrentUser } from "@/lib/auth";
import { getUserVote } from "@/lib/votes";
import { PollModel } from "@/models/Poll";
import mongoose from "mongoose";
import { getPollDiscussion } from "@/lib/comments";
import { connection } from "next/server";

interface PollPageProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export async function generateMetadata({
  params,
}: PollPageProps): Promise<Metadata> {
  const { id } = await params;
  const poll = await getPublicPollByIdOrSlug(id);

  if (!poll || poll.status === "Draft") {
    return {
      title: "Survey Not Found — PULSE",
      description: "The requested news poll inquiry could not be found.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pulse.org";
  const canonicalUrl = `${siteUrl}/polls/${poll.id}`;

  return {
    title: `${poll.title} — PULSE Survey`,
    description: poll.summary,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${poll.title} — PULSE Survey`,
      description: poll.summary,
      url: canonicalUrl,
      siteName: "PULSE",
      type: "article",
      publishedTime: poll.publishedAt,
      ...(poll.imageUrl ? { images: [{ url: poll.imageUrl, alt: poll.imageAlt || poll.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${poll.title} — PULSE Survey`,
      description: poll.summary,
      ...(poll.imageUrl ? { images: [poll.imageUrl] } : {}),
    },
  };
}

export default async function PollDetailPage({ params }: PollPageProps) {
  await connection();
  const { id } = await params;

  // 1. Fetch from live database (strictly published or closed; drafts return null)
  const poll = await getPublicPollByIdOrSlug(id);

  // Handle unknown poll ID or draft status gracefully with 404
  if (!poll) {
    notFound();
  }

  // Check authenticated user vote state
  const currentUser = await getCurrentUser();
  let hasVoted = false;
  let userVoteOption: string | undefined = undefined;

  const isObjectId = mongoose.Types.ObjectId.isValid(poll.id);
  const dbPoll = await PollModel.findOne({
    $or: [
      { slug: poll.id },
      ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(poll.id) }] : []),
    ],
  })
    .select("_id status closesAt")
    .lean();

  const isClosed =
    poll.status === "Closed" ||
    Boolean(dbPoll?.closesAt && new Date() > new Date(dbPoll.closesAt));

  if (currentUser && dbPoll) {
    const userVoteCheck = await getUserVote(dbPoll._id, currentUser.user.id);
    if (userVoteCheck?.hasVoted) {
      hasVoted = true;
      userVoteOption = userVoteCheck.option;
    }
  }

  const discussion = await getPollDiscussion(poll.id, undefined, currentUser?.user.id);
  const comments = discussion ? discussion.comments : [];

  // Fetch real related published polls from database
  let relatedPolls = await getPublishedPolls({ category: poll.category, limit: 4 });
  relatedPolls = relatedPolls.filter((p) => p.id !== poll.id).slice(0, 3);

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pulse.org";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: poll.title,
    description: poll.summary,
    articleSection: poll.category,
    datePublished: poll.publishedAt,
    author: {
      "@type": "Organization",
      name: "PULSE Editorial Team",
    },
    publisher: {
      "@type": "Organization",
      name: "PULSE",
      url: siteUrl,
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#090a0f] text-zinc-100">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1 py-10 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Two-Column Redesigned Poll Content & Sticky Voting Panel, plus Discussion */}
          <PollDetailInteractive
            poll={poll}
            initialComments={comments}
            isAuthenticated={Boolean(currentUser)}
            initialHasVoted={hasVoted}
            initialUserVote={userVoteOption}
            isClosed={isClosed}
            currentUser={
              currentUser
                ? {
                    id: currentUser.user.id,
                    name: currentUser.user.name,
                    role: currentUser.user.role,
                  }
                : null
            }
          />

          {/* Related Polls Section */}
          {relatedPolls.length > 0 && (
            <section className="mt-20 pt-12 border-t border-white/10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                    Related Public Inquiries
                  </h2>
                  <p className="text-xl font-bold tracking-tight text-white mt-1">
                    Further debates shaping {poll.category}
                  </p>
                </div>
                <Link
                  href="/polls"
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                >
                  View all polls →
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {relatedPolls.map((rp) => (
                  <PollCard key={rp.id} poll={rp} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
