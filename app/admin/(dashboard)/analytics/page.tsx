"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { DS, supabase } from "../../../main/lib/shared";

// ── Types aligned to your actual schema ──────────────────────────────────────
type User = { id: string; phone: string; created_at: string };

type Course = {
  id: string;
  title: string;
  emoji: string;
  tag: string;
  total_lessons: number;
  description: string;
};

type UserCourse = {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  courses: Course;
};

type MainCourse = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  total_lessons: number;
};

type UserMainCourse = {
  id: string;
  user_id: string;
  main_course_id: string;
  main_courses: MainCourse;
};

type McLink = { main_course_id: string; course_id: string };

// ── Shared input styles ───────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: "#0B0D14",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#F0EEE8",
  transition: "border-color 0.2s, box-shadow 0.2s",
};
const focusAccent = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = `${DS.accent}80`;
  e.target.style.boxShadow = `0 0 0 3px ${DS.accent}14`;
};
const blurReset = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "rgba(255,255,255,0.08)";
  e.target.style.boxShadow = "none";
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function progressColor(pct: number): string {
  if (pct >= 100) return DS.success ?? "#34D399";
  if (pct >= 50) return DS.accent;
  return DS.text?.muted ?? "#888";
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)", height: "5px" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: progressColor(value) }}
        />
      </div>
      <span
        className="text-[11px] tabular-nums font-medium w-8 text-right shrink-0"
        style={{ color: progressColor(value) }}
      >
        {value}%
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Per-user data
  const [userMainCourses, setUserMainCourses] = useState<UserMainCourse[]>([]);
  const [userSubCourses, setUserSubCourses] = useState<UserCourse[]>([]);
  const [mcLinks, setMcLinks] = useState<McLink[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Fetch all users on mount ────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      setFetchError(null);
      const { data, error } = await supabase
        .from("users")
        .select("id, phone, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data ?? []);
    } catch (err: any) {
      setFetchError(err?.message ?? "Failed to load users.");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Fetch analytics for selected user ──────────────────────────────────────
  const fetchUserAnalytics = useCallback(async (userId: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const [
        { data: umc, error: umcErr },
        { data: usc, error: uscErr },
        { data: links, error: linksErr },
      ] = await Promise.all([
        supabase
          .from("user_main_courses")
          .select(
            "id, user_id, main_course_id, main_courses(id, name, description, image_url, total_lessons)"
          )
          .eq("user_id", userId),
        supabase
          .from("user_courses")
          .select(
            "id, user_id, course_id, progress, courses(id, title, emoji, tag, total_lessons, description)"
          )
          .eq("user_id", userId)
          .order("progress", { ascending: false }),
        supabase
          .from("main_course_subcourses")
          .select("main_course_id, course_id"),
      ]);

      if (umcErr) throw umcErr;
      if (uscErr) throw uscErr;
      if (linksErr) throw linksErr;

      setUserMainCourses((umc as unknown as UserMainCourse[]) ?? []);
      setUserSubCourses((usc as unknown as UserCourse[]) ?? []);
      setMcLinks(links ?? []);
    } catch (err: any) {
      setFetchError(err?.message ?? "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) fetchUserAnalytics(selectedUserId);
    else {
      setUserMainCourses([]);
      setUserSubCourses([]);
      setMcLinks([]);
    }
  }, [selectedUserId, fetchUserAnalytics]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const filteredUsers = useMemo(
    () =>
      users.filter((u) =>
        u.phone.toLowerCase().includes(userSearch.toLowerCase())
      ),
    [users, userSearch]
  );

  // Map main_course_id → sub-courses for that main course
  const subCoursesByMain = useMemo(() => {
    const map = new Map<string, UserCourse[]>();
    userMainCourses.forEach((mc) => {
      const courseIds = new Set(
        mcLinks
          .filter((l) => l.main_course_id === mc.main_course_id)
          .map((l) => l.course_id)
      );
      map.set(
        mc.main_course_id,
        userSubCourses.filter((sc) => courseIds.has(sc.course_id))
      );
    });
    return map;
  }, [userMainCourses, userSubCourses, mcLinks]);

  // Overall progress per main course = average of sub-course progresses
  const mainCourseProgress = useMemo(() => {
    const map = new Map<string, number>();
    subCoursesByMain.forEach((subs, mcId) => {
      if (subs.length === 0) {
        map.set(mcId, 0);
      } else {
        const avg =
          subs.reduce((sum, s) => sum + (s.progress ?? 0), 0) / subs.length;
        map.set(mcId, Math.round(avg));
      }
    });
    return map;
  }, [subCoursesByMain]);

  // Overall stats for selected user
  const stats = useMemo(() => {
    if (!selectedUserId || userSubCourses.length === 0)
      return { completed: 0, inProgress: 0, notStarted: 0, avgProgress: 0 };
    const completed = userSubCourses.filter((s) => (s.progress ?? 0) >= 100).length;
    const inProgress = userSubCourses.filter(
      (s) => (s.progress ?? 0) > 0 && (s.progress ?? 0) < 100
    ).length;
    const notStarted = userSubCourses.filter((s) => (s.progress ?? 0) === 0).length;
    const avgProgress = Math.round(
      userSubCourses.reduce((sum, s) => sum + (s.progress ?? 0), 0) /
        userSubCourses.length
    );
    return { completed, inProgress, notStarted, avgProgress };
  }, [selectedUserId, userSubCourses]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId),
    [users, selectedUserId]
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* ── User selector ── */}
      <div
        className="rounded-xl p-6"
        style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: DS.accentSoft }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold">Select User</h2>
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: DS.accentSoft, color: DS.accent }}
          >
            {users.length} users
          </span>
        </div>

        <input
          type="text"
          placeholder="Search by phone number..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none mb-3"
          style={inputStyle}
          onFocus={focusAccent}
          onBlur={blurReset}
        />

        <div className="flex flex-wrap gap-2">
          {filteredUsers.slice(0, 50).map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={
                selectedUserId === u.id
                  ? {
                      background: DS.accentSoft,
                      color: DS.accent,
                      border: `0.5px solid ${DS.accent}40`,
                    }
                  : {
                      background: DS.bg.base,
                      color: DS.text.secondary,
                      border: `0.5px solid ${DS.border.default}`,
                    }
              }
            >
              {u.phone}
            </button>
          ))}
        </div>

        {filteredUsers.length > 50 && (
          <p className="text-[10px] mt-2" style={{ color: DS.text.dim }}>
            Showing 50 of {filteredUsers.length} — refine your search to see more.
          </p>
        )}

        {selectedUserId && (
          <button
            onClick={() => setSelectedUserId("")}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: DS.text.muted,
              border: `0.5px solid ${DS.border.default}`,
            }}
          >
            Clear selection
          </button>
        )}
      </div>

      {/* ── Error banner ── */}
      {fetchError && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <p className="text-xs" style={{ color: "#EF4444" }}>
            {fetchError}
          </p>
        </div>
      )}

      {/* ── Analytics panel ── */}
      {selectedUserId && (
        <>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16">
              <div
                className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{
                  borderColor: `${DS.accent}40`,
                  borderTopColor: DS.accent,
                }}
              />
              <span className="text-xs" style={{ color: DS.text.muted }}>
                Loading analytics...
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">

              {/* ── Summary stats ── */}
              {userSubCourses.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Overall progress", value: `${stats.avgProgress}%`, accent: true },
                    { label: "Completed", value: stats.completed, color: DS.success ?? "#34D399" },
                    { label: "In progress", value: stats.inProgress, color: DS.accent },
                    { label: "Not started", value: stats.notStarted, color: DS.text.muted },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl p-4"
                      style={{
                        background: DS.bg.card,
                        border: `1px solid ${DS.border.default}`,
                      }}
                    >
                      <p
                        className="text-[10px] uppercase tracking-wider mb-1"
                        style={{ color: DS.text.dim }}
                      >
                        {s.label}
                      </p>
                      <p
                        className="text-2xl font-bold tabular-nums"
                        style={{ color: s.accent ? DS.accent : s.color }}
                      >
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Per main-course breakdown ── */}
              {userMainCourses.length === 0 ? (
                <div
                  className="rounded-xl p-10 text-center"
                  style={{
                    background: DS.bg.card,
                    border: `1px solid ${DS.border.default}`,
                  }}
                >
                  <svg className="mx-auto mb-3" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={DS.text.dim} strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                  <p className="text-xs" style={{ color: DS.text.dim }}>
                    No courses assigned to{" "}
                    <span style={{ color: DS.text.secondary }}>
                      {selectedUser?.phone}
                    </span>
                    .
                  </p>
                </div>
              ) : (
                userMainCourses.map((mc) => {
                  const subs = subCoursesByMain.get(mc.main_course_id) ?? [];
                  const overallProgress = mainCourseProgress.get(mc.main_course_id) ?? 0;
                  const completedCount = subs.filter((s) => (s.progress ?? 0) >= 100).length;

                  return (
                    <div
                      key={mc.id}
                      className="rounded-xl overflow-hidden"
                      style={{
                        background: DS.bg.card,
                        border: `1px solid ${DS.border.default}`,
                      }}
                    >
                      {/* Main course header */}
                      <div
                        className="px-5 py-4 flex items-center gap-4"
                        style={{ borderBottom: `1px solid ${DS.border.default}` }}
                      >
                        {mc.main_courses?.image_url ? (
                          <img
                            src={mc.main_courses.image_url}
                            alt={mc.main_courses.name}
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: DS.accentSoft }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="1.5">
                              <rect x="2" y="3" width="20" height="14" rx="2" />
                              <path d="M8 21h8M12 17v4" />
                            </svg>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {mc.main_courses?.name}
                          </p>
                          <p
                            className="text-[10px] mt-0.5"
                            style={{ color: DS.text.muted }}
                          >
                            {completedCount} of {subs.length} sub-courses completed
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-3 w-40">
                          <ProgressBar value={overallProgress} />
                        </div>
                      </div>

                      {/* Sub-courses */}
                      <div className="divide-y" style={{ borderColor: DS.border.default }}>
                        {subs.length === 0 ? (
                          <p
                            className="px-5 py-4 text-xs"
                            style={{ color: DS.text.dim }}
                          >
                            No sub-courses linked to this main course.
                          </p>
                        ) : (
                          subs.map((sc) => {
                            const pct = sc.progress ?? 0;
                            const lessonsCompleted = Math.round(
                              (pct / 100) * (sc.courses?.total_lessons ?? 0)
                            );
                            const isComplete = pct >= 100;

                            return (
                              <div
                                key={sc.id}
                                className="px-5 py-3 flex items-center gap-3"
                              >
                                {/* Status icon */}
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                  style={{
                                    background: isComplete
                                      ? (DS.successSoft ?? "rgba(52,211,153,0.12)")
                                      : pct > 0
                                      ? DS.accentSoft
                                      : "rgba(255,255,255,0.04)",
                                  }}
                                >
                                  {isComplete ? (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={DS.success ?? "#34D399"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  ) : pct > 0 ? (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2.5" strokeLinecap="round">
                                      <path d="M8 5v14l11-7z" fill={DS.accent} />
                                    </svg>
                                  ) : (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={DS.text.dim} strokeWidth="2" strokeLinecap="round">
                                      <circle cx="12" cy="12" r="9" />
                                    </svg>
                                  )}
                                </div>

                                {/* Emoji + title */}
                                <div className="flex items-center gap-2 min-w-0 w-48 shrink-0">
                                  <span className="text-base shrink-0">
                                    {sc.courses?.emoji}
                                  </span>
                                  <p className="text-xs font-medium truncate">
                                    {sc.courses?.title}
                                  </p>
                                </div>

                                {/* Progress bar */}
                                <div className="flex-1">
                                  <ProgressBar value={pct} />
                                </div>

                                {/* Lessons count */}
                                <span
                                  className="text-[10px] tabular-nums shrink-0 w-24 text-right"
                                  style={{ color: DS.text.dim }}
                                >
                                  {lessonsCompleted}/{sc.courses?.total_lessons ?? 0} lessons
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}