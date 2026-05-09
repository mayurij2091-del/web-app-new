"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DS,
  supabase,
  type UserMainCourse,
  type UserSubCourse,
  type Announcement,
  getSubCoursesForMain,
  calculateMainCourseProgress,
} from "../../lib/shared";

// 1. Module-level cache for non-user-specific data so we don't re-fetch every mount
let cachedAnnouncements: Announcement[] | null = null;
let cachedMcLinks: { main_course_id: string; course_id: string }[] | null = null;

export default function DashboardPage() {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainCourses, setMainCourses] = useState<UserMainCourse[]>([]);
  const [subCourses, setSubCourses] = useState<UserSubCourse[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>(cachedAnnouncements ?? []);
  const [mcLinks, setMcLinks] = useState<{ main_course_id: string; course_id: string }[]>(cachedMcLinks ?? []);

  // 7. Extract date formatting so locale / format is easy to change later
  const todayStr = useMemo(
    () => new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
    []
  );

  useEffect(() => {
    const phone = sessionStorage.getItem("user_phone");
    if (!phone) {
      router.replace("/main/login");
      return;
    }
    setUserPhone(phone);
    loadDashboard(phone);
  }, [router]);

  // 4. Merged initDashboard + fetchDashboard into one flow
  // 6. Wrapped in try/catch so Supabase failures surface instead of silently showing empty data
  const loadDashboard = useCallback(async (phone: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phone)
        .single();

      if (userErr || !userData) {
        sessionStorage.removeItem("user_phone");
        router.replace("/main/login");
        return;
      }

      setUserId(userData.id);

      const [userMainCoursesRes, userSubCoursesRes, announcementsRes, linksRes] = await Promise.all([
        supabase
          .from("user_main_courses")
          .select(`id, main_course_id, main_courses (id, name, description, image_url, created_at)`)
          .eq("user_id", userData.id)
          .order("id", { ascending: false }),
        supabase
          .from("user_courses")
          .select(`id, course_id, progress, courses (id, title, description, emoji, tag, total_lessons, youtube_url, created_at)`)
          .eq("user_id", userData.id)
          .order("id", { ascending: false }),
        // 1. Skip refetching if we already have cached non-user-specific data
        cachedAnnouncements
          ? Promise.resolve({ data: cachedAnnouncements, error: null })
          : supabase.from("announcements").select("*").order("created_at", { ascending: false }),
        cachedMcLinks
          ? Promise.resolve({ data: cachedMcLinks, error: null })
          : supabase.from("main_course_subcourses").select("main_course_id, course_id"),
      ]);

      if (userMainCoursesRes.error) throw userMainCoursesRes.error;
      if (userSubCoursesRes.error) throw userSubCoursesRes.error;

      setMainCourses((userMainCoursesRes.data as unknown as UserMainCourse[]) ?? []);
      setSubCourses((userSubCoursesRes.data as unknown as UserSubCourse[]) ?? []);

      if (announcementsRes.error) throw announcementsRes.error;
      const ann = (announcementsRes.data as Announcement[]) || [];
      cachedAnnouncements = ann;
      setAnnouncements(ann);

      if (linksRes.error) throw linksRes.error;
      const links = (linksRes.data as { main_course_id: string; course_id: string }[]) || [];
      cachedMcLinks = links;
      setMcLinks(links);
    } catch (err: any) {
      setError(err?.message || "Something went wrong while loading your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const totalLessons = useMemo(
    () => subCourses.reduce((acc, i) => acc + (i.courses?.total_lessons || 0), 0),
    [subCourses]
  );

  // 2. Weighted average by total_lessons instead of uniform average
  const avgProgress = useMemo(() => {
    const totalWeight = subCourses.reduce((acc, i) => acc + (i.courses?.total_lessons || 0), 0);
    if (!totalWeight) return 0;
    const weightedSum = subCourses.reduce(
      (acc, i) => acc + (i.progress || 0) * (i.courses?.total_lessons || 0),
      0
    );
    return Math.round(weightedSum / totalWeight);
  }, [subCourses]);

  // 5. Pre-compute progress per main course so calculateMainCourseProgress isn't called twice per card
  const mainCourseProgress = useMemo(() => {
    const map = new Map<string, number>();
    mainCourses.forEach((mc) => {
      map.set(mc.main_course_id, calculateMainCourseProgress(mc.main_course_id, mcLinks, subCourses));
    });
    return map;
  }, [mainCourses, mcLinks, subCourses]);

  const hasContent = mainCourses.length > 0 || announcements.length > 0;

  return (
    <>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between backdrop-blur-xl"
        style={{ background: "rgba(11,13,20,0.8)", borderBottom: `1px solid ${DS.border.default}` }}
      >
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs uppercase tracking-wider font-medium" style={{ color: DS.text.muted }}>
            welcome back
          </p>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight mt-0.5 truncate">Your Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div
            className="px-2.5 md:px-3 py-1.5 rounded-full text-[10px] md:text-xs"
            style={{ background: "rgba(255,255,255,0.04)", border: `0.5px solid ${DS.border.default}`, color: DS.text.muted }}
          >
            {todayStr}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${DS.accent}40`, borderTopColor: DS.accent }}></div>
            <p className="text-sm" style={{ color: DS.text.muted }}>Loading your dashboard...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-sm" style={{ color: "#EF4444" }}>{error}</p>
            <button
              onClick={() => loadDashboard(userPhone)}
              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ background: DS.accentSoft, color: DS.accent }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:gap-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              {[
                { label: "Main Courses", value: mainCourses.length, icon: "📁", accent: DS.accent },
                { label: "Total Lessons", value: totalLessons, icon: "📚", accent: "#34D399" },
                { label: "Avg. Progress", value: `${avgProgress}%`, icon: "📊", accent: "#F59E0B" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 md:p-5 flex items-center gap-3 md:gap-4 transition-all hover:translate-y-[-2px]"
                  style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}
                >
                  <div
                    className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-base md:text-lg"
                    style={{ background: `${s.accent}15` }}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs uppercase tracking-wider font-medium" style={{ color: DS.text.muted }}>
                      {s.label}
                    </p>
                    <p className="text-lg md:text-xl font-semibold mt-0.5" style={{ color: s.accent }}>
                      {s.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 3. Empty state when there's nothing to show */}
            {!hasContent && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: DS.accentSoft }}>
                  📭
                </div>
                <p className="text-sm font-medium">Nothing here yet</p>
                <p className="text-xs max-w-xs" style={{ color: DS.text.muted }}>
                  Your courses and announcements will appear here once you're enrolled.
                </p>
                <Link
                  href="/main/courses"
                  className="text-xs px-4 py-2 rounded-lg mt-1 transition-all hover:opacity-80"
                  style={{ background: DS.accent, color: "#fff" }}
                >
                  Browse Courses
                </Link>
              </div>
            )}

            {/* Main Courses Grid */}
            {mainCourses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4 md:mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: DS.accentSoft }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2.5">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <path d="M8 21h8M12 17v4" />
                      </svg>
                    </div>
                    <h2 className="text-sm font-semibold">Your Courses</h2>
                  </div>
                  <Link
                    href="/main/courses"
                    className="text-xs transition-all hover:opacity-70 flex items-center gap-1"
                    style={{ color: DS.accent }}
                  >
                    View all <span>→</span>
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {mainCourses.map((mc) => {
                    const progress = mainCourseProgress.get(mc.main_course_id) ?? 0;
                    return (
                      <Link
                        key={mc.id}
                        href={`/main/courses?mc=${mc.main_course_id}`}
                        className="rounded-xl overflow-hidden group cursor-pointer transition-all hover:translate-y-[-3px] block"
                        style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}
                      >
                        <div className="relative aspect-video overflow-hidden">
                          {mc.main_courses?.image_url ? (
                            <img
                              src={mc.main_courses.image_url}
                              alt={mc.main_courses.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: DS.accentSoft }}>
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="1.5">
                                <rect x="2" y="3" width="20" height="14" rx="2" />
                                <path d="M8 21h8M12 17v4" />
                              </svg>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                          <div className="absolute bottom-2.5 left-2.5 right-2.5">
                            <p className="text-xs md:text-sm font-semibold text-white line-clamp-2">{mc.main_courses?.name}</p>
                            {mc.main_courses?.description && (
                              <p className="text-[9px] md:text-[10px] text-white/70 mt-0.5 line-clamp-1">
                                {mc.main_courses.description}
                              </p>
                            )}
                          </div>
                          <div className="absolute top-2 right-2">
                            <span
                              className="text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 rounded-md font-medium"
                              style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)" }}
                            >
                              {getSubCoursesForMain(mc.main_course_id, mcLinks, subCourses).length} videos
                            </span>
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: DS.accent }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="p-2.5 md:p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", height: "4px" }}>
                              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: DS.accent }} />
                            </div>
                            <span className="text-[10px] md:text-[11px]" style={{ color: DS.text.muted }}>
                              {progress}%
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Latest Announcement */}
            {announcements[0] && (
              <div
                className="rounded-xl p-4 md:p-6 transition-all hover:translate-y-[-1px]"
                style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}`, borderLeft: "2px solid rgba(99,102,241,0.5)" }}
              >
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: DS.accentSoft }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2.5">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    </div>
                    <h2 className="text-sm font-semibold">Latest Announcement</h2>
                  </div>
                  <span
                    className="text-[9px] md:text-[10px] px-2 py-0.5 md:px-2.5 md:py-1 rounded-full font-medium"
                    style={{ background: DS.accentSoft, color: DS.accent, border: "0.5px solid rgba(99,102,241,0.2)" }}
                  >
                    NEW
                  </span>
                </div>
                <p className="text-xs md:text-sm font-medium mb-1.5 md:mb-2">{announcements[0].title}</p>
                <p className="text-[11px] md:text-xs leading-relaxed" style={{ color: DS.text.muted }}>
                  {announcements[0].body}
                </p>
                <p className="text-[10px] md:text-[11px] mt-2 md:mt-3 font-mono" style={{ color: DS.text.dim }}>
                  {new Date(announcements[0].created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}