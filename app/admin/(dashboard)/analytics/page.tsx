"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { DS, supabase } from "../../../main/lib/shared";

type User = { id: string; phone: string; created_at: string };
type Course = { id: string; title: string; emoji: string; total_lessons: number };
type UserCourse = { id: string; user_id: string; course_id: string; progress: number; courses: Course };
type LessonCompletion = { id: string; user_id: string; course_id: string; lesson_number: number; completed_at: string };

// NOTE: Extract into app/admin/components/AdminUI.tsx
const inputStyle: React.CSSProperties = { background: "#0B0D14", border: "1px solid rgba(255,255,255,0.08)", color: "#F0EEE8", transition: "border-color 0.2s, box-shadow 0.2s" };
const focusAccent = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.target.style.borderColor = `${DS.accent}80`; e.target.style.boxShadow = `0 0 0 3px ${DS.accent}14`; };
const blurReset = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; };

export default function AnalyticsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [completions, setCompletions] = useState<LessonCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // 1. Error handling on fetch
  const fetchUsers = useCallback(async () => {
    try {
      setFetchError(null);
      const { data, error } = await supabase.from("users").select("id, phone, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setFetchError(err?.message || "Failed to load users.");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 2. Error handling + explicit columns + proper typing
  const fetchUserAnalytics = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const [{ data: uc, error: ucErr }, { data: lc, error: lcErr }] = await Promise.all([
        supabase
          .from("user_courses")
          .select("id, user_id, course_id, progress, courses(id, title, emoji, total_lessons)")
          .eq("user_id", userId),
        supabase
          .from("lesson_completions")
          .select("id, user_id, course_id, lesson_number, completed_at")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false }),
      ]);
      if (ucErr) throw ucErr;
      if (lcErr) throw lcErr;
      setUserCourses((uc as unknown as UserCourse[]) ?? []);
      setCompletions((lc as unknown as LessonCompletion[]) ?? []);
    } catch (err: any) {
      setFetchError(err?.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) fetchUserAnalytics(selectedUserId);
  }, [selectedUserId, fetchUserAnalytics]);

  const filteredUsers = users.filter(u => u.phone.toLowerCase().includes(userSearch.toLowerCase()));

  // 3. Memoize completions as a map keyed by course_id — O(1) lookup instead of O(n) filter per course
  const completionsByCourse = useMemo(() => {
    const map = new Map<string, LessonCompletion[]>();
    completions.forEach(c => {
      const existing = map.get(c.course_id) || [];
      existing.push(c);
      map.set(c.course_id, existing);
    });
    // Sort each array by completed_at desc
    map.forEach(arr => arr.sort((a, b) => b.completed_at.localeCompare(a.completed_at)));
    return map;
  }, [completions]);

  // 4. Derive completed lesson numbers once per course
  const completedLessonSets = useMemo(() => {
    const map = new Map<string, Set<number>>();
    completionsByCourse.forEach((arr, courseId) => {
      map.set(courseId, new Set(arr.map(c => c.lesson_number)));
    });
    return map;
  }, [completionsByCourse]);

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl p-6" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: DS.accentSoft }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <h2 className="text-sm font-semibold">Select User</h2>
        </div>
        <input type="text" placeholder="Search users by phone..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all mb-3" style={inputStyle} onFocus={focusAccent} onBlur={blurReset} />
        
        {/* 5. Show only first 50 users with a "show more" hint */}
        <div className="flex flex-wrap gap-2">
          {filteredUsers.slice(0, 50).map(u => (
            <button key={u.id} onClick={() => setSelectedUserId(u.id)}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={selectedUserId === u.id
                ? { background: DS.accentSoft, color: DS.accent, border: `0.5px solid ${DS.accent}30` }
                : { background: DS.bg.base, color: DS.text.secondary, border: `0.5px solid ${DS.border.default}` }}>
              {u.phone}
            </button>
          ))}
        </div>
        {filteredUsers.length > 50 && (
          <p className="text-[10px] mt-2" style={{ color: DS.text.dim }}>
            Showing 50 of {filteredUsers.length} — refine your search to see more.
          </p>
        )}

        {/* 6. Clear selection button */}
        {selectedUserId && (
          <button onClick={() => { setSelectedUserId(""); setUserCourses([]); setCompletions([]); }}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.04)", color: DS.text.muted, border: `0.5px solid ${DS.border.default}` }}>
            Clear selection
          </button>
        )}
      </div>

      {fetchError && (
        <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-xs" style={{ color: "#EF4444" }}>{fetchError}</p>
        </div>
      )}

      {selectedUserId && (
        <div className="flex flex-col gap-6">
          {loading ? (
            <div className="px-6 py-12 flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `${DS.accent}40`, borderTopColor: DS.accent }}></div><span className="text-xs" style={{ color: DS.text.muted }}>Loading analytics...</span></div>
          ) : userCourses.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
              <p className="text-xs" style={{ color: DS.text.dim }}>No courses assigned to this user.</p>
            </div>
          ) : (
            userCourses.map(uc => {
              const courseCompletions = completionsByCourse.get(uc.course_id) || [];
              const completedLessonNumbers = completedLessonSets.get(uc.course_id) || new Set<number>();
              return (
                <div key={uc.id} className="rounded-xl overflow-hidden" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
                  <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${DS.border.default}` }}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{uc.courses?.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold">{uc.courses?.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: DS.text.muted }}>{completedLessonNumbers.size} of {uc.courses?.total_lessons} lessons completed</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", height: "6px", width: "100px" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${uc.progress || 0}%`, background: DS.accent }} />
                      </div>
                      <span className="text-xs font-medium tabular-nums" style={{ color: DS.accent }}>{uc.progress || 0}%</span>
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    {courseCompletions.length === 0 ? (
                      <p className="text-xs" style={{ color: DS.text.dim }}>No lessons completed yet.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: DS.text.muted }}>Completed Lessons</p>
                        {courseCompletions.map(c => (
                          <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: DS.bg.base, border: `0.5px solid ${DS.border.default}` }}>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium" style={{ background: DS.successSoft, color: DS.success }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </div>
                              <span className="text-xs font-medium">Lesson {c.lesson_number}</span>
                            </div>
                            <span className="text-[10px] font-mono" style={{ color: DS.text.dim }}>
                              {new Date(c.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}