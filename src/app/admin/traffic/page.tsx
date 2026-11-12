"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  Globe,
  Users2,
  Smartphone,
  Laptop,
  Search,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Compass,
} from "lucide-react";

interface VisitRecord {
  id: string;
  path: string;
  pollSlug?: string;
  pollTitle?: string;
  user?: {
    id?: string;
    name: string;
    email: string;
    role: string;
  } | null;
  visitorId?: string;
  device: string;
  browser: string;
  os: string;
  ip?: string;
  city?: string;
  country?: string;
  timezone?: string;
  referrer?: string;
  source: string;
  createdAt: string;
}

interface StatsData {
  totalVisits: number;
  todayVisits: number;
  userVisits: number;
  guestVisits: number;
}

export default function AdminTrafficPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalVisits: 0,
    todayVisits: 0,
    userVisits: 0,
    guestVisits: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTraffic = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        filter,
      });
      if (search.trim()) {
        params.append("search", search.trim());
      }

      const res = await fetch(`/api/admin/traffic?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        setVisits(data.data.visits || []);
        setTotalPages(data.data.totalPages || 1);
        setTotalCount(data.data.totalCount || 0);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load traffic activity:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    fetchTraffic();
  }, [fetchTraffic]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTraffic();
  };

  const getSourceBadgeStyle = (source: string) => {
    switch (source.toLowerCase()) {
      case "whatsapp":
        return "bg-emerald-950/40 text-emerald-400 border-emerald-500/30";
      case "google":
        return "bg-sky-950/40 text-sky-400 border-sky-500/30";
      case "instagram":
        return "bg-pink-950/40 text-pink-400 border-pink-500/30";
      case "facebook":
        return "bg-blue-950/40 text-blue-400 border-blue-500/30";
      case "twitter / x":
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
      case "direct":
        return "bg-white/5 text-zinc-300 border-white/10";
      default:
        return "bg-purple-950/40 text-purple-400 border-purple-500/30";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              Audience & Traffic Intelligence
            </h2>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Feed
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time activity logs of citizens and visitors browsing surveys, with verified identity, device breakdown, and traffic attribution.
          </p>
        </div>

        <button
          onClick={() => fetchTraffic()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-rose-400" : ""}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Page Hits */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Total Site Visits</span>
            <Globe className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {stats.totalVisits.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>Recorded in MongoDB</span>
            <span className="text-[10px] text-emerald-400 font-medium">All Time</span>
          </div>
        </div>

        {/* Today's Visits */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Today&apos;s Traffic</span>
            <Activity className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            +{stats.todayVisits.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>Since 12:00 AM</span>
            <span className="text-[10px] text-sky-400 font-medium">Daily</span>
          </div>
        </div>

        {/* Identified Citizens (Logged In) */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Identified Citizens</span>
            <Users2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {stats.userVisits.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>Logged-in visits</span>
            <span className="text-[10px] text-emerald-400 font-medium">Verified ID</span>
          </div>
        </div>

        {/* Anonymous Guests */}
        <div className="rounded-xl border border-white/10 bg-[#10121a] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Guest Visitors</span>
            <Smartphone className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {stats.guestVisits.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
            <span>Device/OS fingerprint</span>
            <span className="text-[10px] text-amber-400 font-medium">Anonymous</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-white/10 bg-[#10121a] p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-500 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter:</span>
          </span>
          {[
            { id: "all", label: "All Traffic" },
            { id: "users", label: "Registered Citizens Only" },
            { id: "guests", label: "Guest Visitors Only" },
            { id: "polls", label: "Survey Views Only" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === tab.id
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search citizen, page, or device..."
            className="w-full rounded-lg border border-white/10 bg-[#090a0f] pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </form>
      </div>

      {/* Visitor Activity Table */}
      <div className="rounded-xl border border-white/10 bg-[#10121a] overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Real-Time Audience Log ({totalCount.toLocaleString()} events)
            </h3>
          </div>
          {totalPages > 1 && (
            <div className="text-xs text-zinc-400">
              Page {page} of {totalPages}
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-rose-400" />
            <span>Loading live audience records...</span>
          </div>
        ) : visits.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500">
            No visitor records match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 uppercase tracking-wider font-semibold bg-white/[0.02]">
                  <th className="py-3 px-4">Citizen / Visitor Identity</th>
                  <th className="py-3 px-4">Target Content / Poll</th>
                  <th className="py-3 px-4">Platform & Device</th>
                  <th className="py-3 px-4">Region / Location</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {visits.map((record) => {
                  const isUser = Boolean(record.user && record.user.name);

                  return (
                    <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Identity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isUser ? (
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-[11px]">
                              {record.user?.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white">
                                  {record.user?.name}
                                </span>
                                <span className="rounded bg-emerald-950/50 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-400 border border-emerald-500/30 uppercase">
                                  {record.user?.role || "Citizen"}
                                </span>
                              </div>
                              <span className="text-[11px] text-zinc-400 font-mono block">
                                {record.user?.email}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 border border-white/10 text-zinc-400 text-[10px]">
                              {record.device.includes("Phone") || record.device === "iPhone" ? (
                                <Smartphone className="h-3.5 w-3.5 text-zinc-300" />
                              ) : (
                                <Laptop className="h-3.5 w-3.5 text-zinc-300" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-zinc-300">Guest Visitor</span>
                                <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[9px] font-mono text-zinc-400 border border-white/5">
                                  #{record.visitorId ? record.visitorId.slice(-6) : "anon"}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-500">
                                {record.device}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Content / Poll */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {record.pollTitle ? (
                          <div className="space-y-0.5">
                            <Link
                              href={`/polls/${record.pollSlug}`}
                              target="_blank"
                              className="font-medium text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 truncate"
                            >
                              <Layers className="h-3 w-3 shrink-0" />
                              <span className="truncate">{record.pollTitle}</span>
                              <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
                            </Link>
                            <span className="text-[10px] text-zinc-500 font-mono block">
                              /polls/{record.pollSlug}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-zinc-300 font-mono">
                            <Compass className="h-3 w-3 text-zinc-400" />
                            <span>{record.path === "/" ? "Home (/)" : record.path}</span>
                          </div>
                        )}
                      </td>

                      {/* Device & Browser */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-zinc-300">
                          <span className="font-medium">{record.device}</span>
                          <span className="text-zinc-500 text-[11px] block">
                            {record.browser} • {record.os}
                          </span>
                        </div>
                      </td>

                      {/* Region / Location */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                        {record.city ? (
                          <div>
                            <span className="text-zinc-200 font-sans">{record.city}</span>
                            {record.country && <span>, {record.country}</span>}
                          </div>
                        ) : record.timezone ? (
                          <span>{record.timezone}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${getSourceBadgeStyle(
                            record.source
                          )}`}
                        >
                          {record.source}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-zinc-400 text-[11px]">
                        <div>
                          {new Date(record.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {new Date(record.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Showing {visits.length} of {totalCount} records
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 rounded border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 rounded border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
