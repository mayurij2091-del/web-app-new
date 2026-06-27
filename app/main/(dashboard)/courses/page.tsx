"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DS,
  supabase,
  type UserMainCourse,
  type UserSubCourse,
  tagStyle,
  getSubCoursesForMain,
  calculateMainCourseProgress,
} from "../../lib/shared";
import SecureVideoPlayer from "../../components/SecureVideoPlayer";
import VideoThumbnailCard from "../../components/VideoThumbnailCard";

export default function CoursesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainCourses, setMainCourses] = useState<UserMainCourse[]>([]);
  const [subCourses, setSubCourses] = useState<UserSubCourse[]>([]);
  const [mcLinks, setMcLinks] = useState<{ main_course_id: string; course_id: string }[]>([]);
  const [selectedMainCourse, setSelectedMainCourse] = useState<string | null>(null);
  const [watchingVideo, setWatchingVideo] = useState<{ subCourseId: string; title: string } | null>(null);

  // Tracks the highest progress % we've already saved per sub-course so we
  // never write a lower value than what's already in the DB (user rewinds, etc.)
  const savedProgressRef = useRef<Map<string, number>>(new Map());

  // ── Auth + initial load ───────────────────────────────────────────────────
  useEffect(() => {
    const phone = sessionStorage.getItem("user_phone");
    if (!phone) { router.replace("/main/login"); return; }
    loadCourses(phone);
  }, [router]);

  useEffect(() => {
    const mc = searchParams.get("mc");
    if (mc) setSelectedMainCourse(mc);
  }, [searchParams]);

  const loadCourses = useCallback(async (phone: string) => {
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
      await fetchCourses(userData.id);
    } catch (err: any) {
      setError(err?.message || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchCourses = useCallback(async (uid: string) => {
    try {
      const [
        { data: userMainCourses, error: mcErr },
        { data: userSubCourses, error: scErr },
        { data: links, error: linksErr },
      ] = await Promise.all([
        supabase
          .from("user_main_courses")
          .select(`id, main_course_id, main_courses(id, name, description, image_url, total_lessons, created_at)`)
          .eq("user_id", uid)
          .order("id", { ascending: false }),
        supabase
          .from("user_courses")
          .select(`id, course_id, progress, courses(id, title, description, emoji, tag, total_lessons, youtube_url, created_at)`)
          .eq("user_id", uid)
          .order("id", { ascending: false }),
        supabase.from("main_course_subcourses").select("main_course_id, course_id"),
      ]);

      if (mcErr) throw mcErr;
      if (scErr) throw scErr;
      if (linksErr) throw linksErr;

      // Seed savedProgressRef so we never overwrite DB progress with a lower value
      (userSubCourses ?? []).forEach((sc: any) => {
        const existing = savedProgressRef.current.get(sc.course_id) ?? 0;
        if ((sc.progress ?? 0) > existing) {
          savedProgressRef.current.set(sc.course_id, sc.progress ?? 0);
        }
      });

      setMcLinks(links || []);
      setMainCourses((userMainCourses as unknown as UserMainCourse[]) ?? []);
      setSubCourses((userSubCourses as unknown as UserSubCourse[]) ?? []);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch course data.");
    }
  }, []);

  // ── Progress update ───────────────────────────────────────────────────────
  const handleUpdateProgress = useCallback(async (subCourseId: string, progress: number) => {
    if (!userId) return;

    const clamped = Math.max(0, Math.min(100, progress));

    // Never write a value lower than what's already saved
    const alreadySaved = savedProgressRef.current.get(subCourseId) ?? 0;
    if (clamped <= alreadySaved) return;

    // Optimistically update local state immediately so the UI feels instant
    setSubCourses(prev =>
      prev.map(sc =>
        sc.course_id === subCourseId ? { ...sc, progress: clamped } : sc
      )
    );
    savedProgressRef.current.set(subCourseId, clamped);

    try {
      const { error } = await supabase
        .from("user_courses")
        .update({ progress: clamped })
        .eq("user_id", userId)
        .eq("course_id", subCourseId);

      if (error) throw error;

      // Quietly re-sync in background to keep totals accurate
      await fetchCourses(userId);
    } catch (err: any) {
      setError(err?.message || "Failed to save progress.");
      // Roll back optimistic update on failure
      setSubCourses(prev =>
        prev.map(sc =>
          sc.course_id === subCourseId ? { ...sc, progress: alreadySaved } : sc
        )
      );
      savedProgressRef.current.set(subCourseId, alreadySaved);
    }
  }, [userId, fetchCourses]);

  // ── Auto-tracking from SecureVideoPlayer ─────────────────────────────────
  // SecureVideoPlayer fires percent in 10% buckets (10, 20 … 100).
  // We just forward it — handleUpdateProgress guards against going backwards.
  const handleTimeUpdate = useCallback((subCourseId: string, percent: number) => {
    handleUpdateProgress(subCourseId, percent);
  }, [handleUpdateProgress]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    setSelectedMainCourse(null);
    setWatchingVideo(null);
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const subCoursesByMain = useMemo(() => {
    const map = new Map<string, UserSubCourse[]>();
    mainCourses.forEach((mc) => {
      map.set(mc.main_course_id, getSubCoursesForMain(mc.main_course_id, mcLinks, subCourses));
    });
    if (selectedMainCourse) {
      map.set(selectedMainCourse, getSubCoursesForMain(selectedMainCourse, mcLinks, subCourses));
    }
    return map;
  }, [mainCourses, selectedMainCourse, mcLinks, subCourses]);

  const mainCourseProgress = useMemo(() => {
    const map = new Map<string, number>();
    mainCourses.forEach((mc) => {
      map.set(mc.main_course_id, calculateMainCourseProgress(mc.main_course_id, mcLinks, subCourses));
    });
    return map;
  }, [mainCourses, mcLinks, subCourses]);

  const selectedMainCourseInfo = useMemo(() =>
    mainCourses.find(m => m.main_course_id === selectedMainCourse),
  [mainCourses, selectedMainCourse]);

  const watchingSubCourse = useMemo(() =>
    watchingVideo ? subCourses.find(s => s.course_id === watchingVideo.subCourseId) : null,
  [watchingVideo, subCourses]);

  // ── Render ────────────────────────────────────────────────────────────────
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
          <h1 className="text-lg md:text-xl font-semibold tracking-tight mt-0.5 truncate">
            {selectedMainCourse
              ? (selectedMainCourseInfo?.main_courses?.name || "Course Content")
              : "My Courses"}
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {selectedMainCourse && (
            <button
              onClick={handleBack}
              className="text-[10px] md:text-xs px-2.5 md:px-3 py-1.5 rounded-lg transition-all hover:opacity-80 flex items-center gap-1"
              style={{ background: "rgba(255,255,255,0.06)", color: DS.text.secondary, border: `0.5px solid ${DS.border.default}` }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
              </svg>
              <span className="hidden sm:inline">Back to courses</span>
            </button>
          )}
          <div
            className="px-2.5 md:px-3 py-1.5 rounded-full text-[10px] md:text-xs"
            style={{ background: "rgba(255,255,255,0.04)", border: `0.5px solid ${DS.border.default}`, color: DS.text.muted }}
          >
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${DS.accent}40`, borderTopColor: DS.accent }} />
            <p className="text-sm" style={{ color: DS.text.muted }}>Loading your courses...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-sm" style={{ color: "#EF4444" }}>{error}</p>
            <button
              onClick={() => { const p = sessionStorage.getItem("user_phone"); if (p) loadCourses(p); }}
              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ background: DS.accentSoft, color: DS.accent }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:gap-8">

            {/* ── Main course grid ── */}
            {!selectedMainCourse ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl md:text-2xl font-semibold tracking-tight">My Courses</h1>
                    <p className="text-xs md:text-sm mt-1" style={{ color: DS.text.muted }}>
                      Click a course to view its content
                    </p>
                  </div>
                  <span
                    className="text-[10px] md:text-xs px-2.5 md:px-3 py-1 md:py-1.5 rounded-full font-medium"
                    style={{ background: DS.accentSoft, color: DS.accent }}
                  >
                    {mainCourses.length} main courses
                  </span>
                </div>

                {mainCourses.length === 0 ? (
                  <div
                    className="rounded-xl p-8 md:p-12 text-center"
                    style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}
                  >
                    <svg className="mx-auto mb-4" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={DS.text.dim} strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    </svg>
                    <p className="text-xs md:text-sm" style={{ color: DS.text.dim }}>No main courses assigned yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {mainCourses.map((mc) => {
                      const progress = mainCourseProgress.get(mc.main_course_id) ?? 0;
                      const subs = subCoursesByMain.get(mc.main_course_id) ?? [];
                      return (
                        <div
                          key={mc.id}
                          className="rounded-xl overflow-hidden group cursor-pointer transition-all hover:translate-y-[-3px]"
                          style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}
                          onClick={() => setSelectedMainCourse(mc.main_course_id)}
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
                                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                                </svg>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-2.5 left-2.5 right-2.5">
                              <p className="text-xs md:text-sm font-semibold text-white line-clamp-2">{mc.main_courses?.name}</p>
                              {mc.main_courses?.description && (
                                <p className="text-[9px] md:text-[10px] text-white/70 mt-0.5 line-clamp-1">{mc.main_courses.description}</p>
                              )}
                            </div>
                            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                              <span className="text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 rounded-md font-medium" style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)" }}>
                                {mc.main_courses?.total_lessons || 0} lessons
                              </span>
                              <span className="text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 rounded-md font-medium" style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)" }}>
                                {subs.length} videos
                              </span>
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: DS.accent }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                              </div>
                            </div>
                          </div>
                          <div className="p-2.5 md:p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", height: "4px" }}>
                                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: DS.accent }} />
                              </div>
                              <span className="text-[10px] md:text-[11px]" style={{ color: DS.text.muted }}>{progress}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              /* ── Sub-course list + video player ── */
              <>
                <div className="flex items-center gap-2 md:gap-3 mb-1">
                  <button
                    onClick={handleBack}
                    className="p-1.5 md:p-2 rounded-lg transition-all hover:bg-white/5"
                    style={{ border: `0.5px solid ${DS.border.default}` }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <div className="min-w-0">
                    <h2 className="text-base md:text-lg font-semibold truncate">
                      {selectedMainCourseInfo?.main_courses?.name}
                    </h2>
                    <p className="text-[10px] md:text-xs" style={{ color: DS.text.muted }}>
                      {(subCoursesByMain.get(selectedMainCourse) ?? []).length} sub courses available
                    </p>
                  </div>
                </div>

                {/* Video player */}
                {watchingVideo && (
                  <div
                    className="rounded-xl overflow-hidden mb-4 md:mb-6"
                    style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}
                  >
                    <div className="p-3 md:p-4" style={{ borderBottom: `1px solid ${DS.border.default}` }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base md:text-lg shrink-0">
                            {watchingSubCourse?.courses?.emoji}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs md:text-sm font-semibold truncate">{watchingVideo.title}</p>
                            <p className="text-[9px] md:text-[10px]" style={{ color: DS.text.muted }}>
                              Progress saves automatically as you watch
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setWatchingVideo(null)}
                          className="text-[10px] md:text-xs px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg transition-all hover:opacity-80 shrink-0"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.2)" }}
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    <SecureVideoPlayer
                      courseId={watchingVideo.subCourseId}
                      title={watchingVideo.title}
                      onTimeUpdate={(percent) => handleTimeUpdate(watchingVideo.subCourseId, percent)}
                    />

                    {/* Progress indicator — read only, no manual buttons */}
                    <div className="p-3 md:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] md:text-xs font-medium flex items-center gap-1.5" style={{ color: DS.text.muted }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                            <polyline points="17 6 23 6 23 12"/>
                          </svg>
                          Auto-tracked progress
                        </span>
                        <span className="text-[10px] md:text-xs font-bold" style={{ color: DS.accent }}>
                          {watchingSubCourse?.progress || 0}%
                        </span>
                      </div>
                      <div className="rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", height: "5px" }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${watchingSubCourse?.progress || 0}%`, background: DS.accent }}
                        />
                      </div>
                      {(watchingSubCourse?.progress || 0) >= 100 && (
                        <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: DS.success ?? "#34D399" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Completed
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-course cards */}
                <div className="flex flex-col gap-3 md:gap-4">
                  {(subCoursesByMain.get(selectedMainCourse) ?? []).length === 0 ? (
                    <div
                      className="rounded-xl p-6 md:p-8 text-center"
                      style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}
                    >
                      <p className="text-xs md:text-sm" style={{ color: DS.text.dim }}>
                        No sub courses in this main course yet.
                      </p>
                    </div>
                  ) : (
                    (subCoursesByMain.get(selectedMainCourse) ?? []).map((sc) => {
                      const isWatching = watchingVideo?.subCourseId === sc.course_id;
                      const pct = sc.progress || 0;
                      const lessonsCompleted = Math.round((pct / 100) * (sc.courses?.total_lessons || 0));
                      const isComplete = pct >= 100;

                      return (
                        <div
                          key={sc.id}
                          className={`rounded-xl overflow-hidden transition-all ${isWatching ? "ring-1" : ""}`}
                          style={{
                            background: DS.bg.card,
                            border: `1px solid ${isWatching ? DS.accent : DS.border.default}`,
                          }}
                        >
                          <div className="p-3 md:p-5">
                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                              <div className="shrink-0 w-full sm:w-auto">
                                <VideoThumbnailCard
                                  courseId={sc.course_id}
                                  title={sc.courses?.title || ""}
                                  youtubeUrl={sc.courses?.youtube_url || null}
                                  emoji={sc.courses?.emoji || "📚"}
                                  onWatch={() => setWatchingVideo({ subCourseId: sc.course_id, title: sc.courses?.title || "" })}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                                  <p className="text-xs md:text-sm font-semibold truncate">{sc.courses?.title}</p>
                                  <span
                                    className="text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full font-medium uppercase tracking-wide shrink-0"
                                    style={tagStyle(sc.courses?.tag || "beginner")}
                                  >
                                    {sc.courses?.tag}
                                  </span>
                                  {isComplete && (
                                    <span
                                      className="text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full font-medium shrink-0"
                                      style={{ background: "rgba(52,211,153,0.12)", color: DS.success ?? "#34D399" }}
                                    >
                                      ✓ Done
                                    </span>
                                  )}
                                </div>

                                {sc.courses?.description && (
                                  <p
                                    className="text-[10px] md:text-xs leading-relaxed mb-1.5 md:mb-2 line-clamp-2"
                                    style={{ color: DS.text.muted }}
                                  >
                                    {sc.courses.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2">
                                  <div
                                    className="flex-1 rounded-full overflow-hidden"
                                    style={{ background: "rgba(255,255,255,0.06)", height: "3px", maxWidth: "200px" }}
                                  >
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${pct}%`,
                                        background: isComplete ? (DS.success ?? "#34D399") : DS.accent,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className="text-[9px] md:text-[11px] tabular-nums shrink-0"
                                    style={{ color: DS.text.muted }}
                                  >
                                    {pct}% · {lessonsCompleted}/{sc.courses?.total_lessons || 0} lessons
                                  </span>
                                </div>

                                <div className="hidden sm:flex mt-3">
                                  <button
                                    onClick={() => setWatchingVideo({ subCourseId: sc.course_id, title: sc.courses?.title || "" })}
                                    className="text-[10px] md:text-xs px-3 md:px-4 py-2 rounded-lg transition-all hover:brightness-110 flex items-center gap-1.5"
                                    style={{ background: DS.accent, color: "#fff" }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                    {isWatching ? "Watching" : isComplete ? "Rewatch" : "Watch"}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="sm:hidden mt-2">
                              <button
                                onClick={() => setWatchingVideo({ subCourseId: sc.course_id, title: sc.courses?.title || "" })}
                                className="w-full text-[10px] px-3 py-2 rounded-lg transition-all hover:brightness-110 flex items-center justify-center gap-1.5"
                                style={{ background: DS.accent, color: "#fff" }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                {isWatching ? "Watching" : isComplete ? "Rewatch" : "Watch Video"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}