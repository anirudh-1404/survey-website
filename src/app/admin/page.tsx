import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import { PollModel } from "@/models/Poll";
import { User } from "@/models/User";
import { getSiteAnalytics, getRecentVisits } from "@/lib/analytics";
import {
  Layers,
  CheckCircle2,
  FileEdit,
  Users2,
  PlusCircle,
  ArrowRight,
  ExternalLink,
  Edit,
  Globe,
  Eye,
  Activity,
  Smartphone,
  Laptop,
} from "lucide-react";

export default async function AdminOverviewPage() {
  await connectToDatabase();

  const [
    totalPolls,
    publishedPolls,
    draftPolls,
    closedPolls,
    totalUsers,
    siteAnalytics,
    pollViewsAgg,
    recentPolls,
    recentVisits,
  ] = await Promise.all([
    PollModel.countDocuments(),
    PollModel.countDocuments({ status: "published" }),
    PollModel.countDocuments({ status: "draft" }),
    PollModel.countDocuments({ status: "closed" }),
    User.countDocuments(),
    getSiteAnalytics(),
    PollModel.aggregate([
      { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]),
    PollModel.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("createdBy", "name email")
      .lean(),
    getRecentVisits(6),
  ]);

  const totalPollViews = pollViewsAgg[0]?.totalViews || 0;

  return (
    <div className="space-y-8">
      {/* Header and Quick Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            Editorial Operations Overview
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time status of civic surveys, publishing pipeline, and verified citizen metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/polls/new"
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create New Survey</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards with Real MongoDB Counts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Website Traffic */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Website Visits</span>
            <Globe className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {siteAnalytics.totalVisits.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>+{siteAnalytics.todayVisits.toLocaleString()} today</span>
            <span className="text-[10px] text-emerald-400 font-medium">Traffic</span>
          </div>
        </div>

        {/* Total Poll Views */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Poll Views</span>
            <Eye className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {totalPollViews.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>Across surveys</span>
            <span className="text-[10px] text-rose-400 font-medium">Views</span>
          </div>
        </div>

        {/* Total Polls */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Total Inquiries</span>
            <Layers className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {totalPolls}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>In catalog</span>
            <span className="text-[10px] text-emerald-400 font-medium">Live DB</span>
          </div>
        </div>

        {/* Published Polls */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Published Live</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {publishedPolls}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>Visible to public</span>
            <span className="text-[10px] text-emerald-400 font-medium">Live Feed</span>
          </div>
        </div>

        {/* Draft Polls */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Internal Drafts</span>
            <FileEdit className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {draftPolls}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>{closedPolls} closed</span>
            <span className="text-[10px] text-amber-400/80 uppercase">Private</span>
          </div>
        </div>

        {/* Registered Users */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Registered Citizens</span>
            <Users2 className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {totalUsers}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>Active accounts</span>
            <span className="text-[10px] text-sky-400/80 font-medium">MongoDB</span>
          </div>
        </div>
      </div>

      {/* Recent Polls Table */}
      <div className="rounded-xl border border-white/10 bg-[#10121a] p-6 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Recent Survey Records
            </h3>
            <p className="text-xs text-zinc-400">
              Latest editorial inquiries created in the database.
            </p>
          </div>

          <Link
            href="/admin/polls"
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
          >
            <span>Manage All Catalog ({totalPolls})</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentPolls.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No survey records found in the database. Use &quot;Create New Survey&quot; to formulate the first question.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 uppercase tracking-wider font-semibold">
                  <th className="pb-3 pr-4">Survey Title</th>
                  <th className="pb-3 px-4">Category</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Views</th>
                  <th className="pb-3 px-4">Created Date</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {recentPolls.map((poll) => {
                  const isPublished = poll.status === "published";
                  const isDraft = poll.status === "draft";

                  return (
                    <tr key={poll._id.toString()} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 pr-4 max-w-xs font-medium text-white truncate">
                        {isPublished ? (
                          <Link
                            href={`/polls/${poll.slug}`}
                            className="hover:text-rose-400 transition-colors"
                            target="_blank"
                          >
                            {poll.title}
                          </Link>
                        ) : (
                          <span>{poll.title}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 uppercase">
                          {poll.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isPublished
                              ? "border border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                              : isDraft
                              ? "border border-amber-500/30 bg-amber-950/20 text-amber-300"
                              : "border border-zinc-700 bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPublished
                                ? "bg-emerald-400"
                                : isDraft
                                ? "bg-amber-400"
                                : "bg-zinc-500"
                            }`}
                          />
                          {poll.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{(poll.views || 0).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 max-w-xs font-medium text-white truncate">
                        {isPublished ? (
                          <Link
                            href={`/polls/${poll.slug}`}
                            className="hover:text-rose-400 transition-colors"
                            target="_blank"
                          >
                            {poll.title}
                          </Link>
                        ) : (
                          <span>{poll.title}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 uppercase">
                          {poll.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isPublished
                              ? "border border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                              : isDraft
                              ? "border border-amber-500/30 bg-amber-950/20 text-amber-300"
                              : "border border-zinc-700 bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPublished
                                ? "bg-emerald-400"
                                : isDraft
                                ? "bg-amber-400"
                                : "bg-zinc-500"
                            }`}
                          />
                          {poll.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap text-zinc-400">
                        {new Date(poll.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isPublished && (
                            <Link
                              href={`/polls/${poll.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 rounded bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>View</span>
                            </Link>
                          )}
                          <Link
                            href={`/admin/polls/${poll._id.toString()}/edit`}
                            className="inline-flex items-center gap-1 rounded border border-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors"
                          >
                            <Edit className="h-3 w-3" />
                            <span>Edit</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Audience Activity Stream */}
      <div className="rounded-xl border border-white/10 bg-[#10121a] p-6 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Live Citizen & Audience Activity
              </h3>
              <p className="text-xs text-zinc-400">
                Real-time activity of citizens and guest visitors interacting with polls and website content.
              </p>
            </div>
          </div>

          <Link
            href="/admin/traffic"
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
          >
            <span>View All Traffic Logs ({siteAnalytics.totalVisits})</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentVisits.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No live visitor records logged yet. New visitor activity will appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 uppercase tracking-wider font-semibold">
                  <th className="pb-3 pr-4">Citizen / Visitor</th>
                  <th className="pb-3 px-4">Visited Page / Poll</th>
                  <th className="pb-3 px-4">Device & Browser</th>
                  <th className="pb-3 px-4">Source</th>
                  <th className="pb-3 pl-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {recentVisits.map((visit) => {
                  const isUser = Boolean(visit.user?.name);

                  return (
                    <tr key={visit._id.toString()} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        {isUser ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">
                              {visit.user?.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white">
                                  {visit.user?.name}
                                </span>
                                <span className="rounded bg-emerald-950/50 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-400 border border-emerald-500/30 uppercase">
                                  {visit.user?.role || "Citizen"}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {visit.user?.email}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 border border-white/10 text-zinc-400 text-[9px]">
                              {visit.device?.includes("Phone") || visit.device === "iPhone" ? (
                                <Smartphone className="h-3 w-3 text-zinc-300" />
                              ) : (
                                <Laptop className="h-3 w-3 text-zinc-300" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-zinc-300">Guest Visitor</span>
                                <span className="rounded bg-zinc-800 px-1 py-0.2 text-[9px] font-mono text-zinc-400">
                                  #{visit.visitorId ? visit.visitorId.slice(-5) : "anon"}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-500">{visit.device || "Desktop"}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate">
                        {visit.pollTitle ? (
                          <Link
                            href={`/polls/${visit.pollSlug}`}
                            target="_blank"
                            className="font-medium text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 truncate"
                          >
                            <span className="truncate">{visit.pollTitle}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
                          </Link>
                        ) : (
                          <span className="font-mono text-zinc-300">
                            {visit.path === "/" ? "Home (/)" : visit.path}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-zinc-300">
                        <span className="font-medium">{visit.device || "Desktop"}</span>
                        <span className="text-zinc-500 text-[10px] block">
                          {visit.browser} • {visit.os}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                          {visit.source || "Direct"}
                        </span>
                      </td>

                      <td className="py-3.5 pl-4 text-right whitespace-nowrap font-mono text-zinc-400 text-[11px]">
                        {new Date(visit.createdAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
