"use client";

import { useEffect, useState, useCallback } from "react";
import { DS, supabase } from "../../../main/lib/shared";

type User = { id: string; phone: string; created_at: string };
type UserMainCourse = { 
  id: string; 
  main_course_id: string; 
  main_courses: { name: string; image_url: string } | null
};

type UserSubcourse = { 
  id: string; 
  course_id: string; 
  progress: number; 
  courses: { title: string; emoji: string; tag: string; total_lessons: number } | null
};

// NOTE: Extract these into app/admin/components/AdminUI.tsx
const inputStyle: React.CSSProperties = { background: "#0B0D14", border: "1px solid rgba(255,255,255,0.08)", color: "#F0EEE8", transition: "border-color 0.2s, box-shadow 0.2s" };
const focusAccent = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.target.style.borderColor = `${DS.accent}80`; e.target.style.boxShadow = `0 0 0 3px ${DS.accent}14`; };
const blurReset = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; };

const Msg = ({ msg }: { msg: { type: "success" | "error"; text: string } }) => (
  <div className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200" style={{
    background: msg.type === "success" ? DS.successSoft : DS.accentSoft,
    color: msg.type === "success" ? DS.success : DS.accent,
    border: `0.5px solid ${msg.type === "success" ? "rgba(52,211,153,0.2)" : `${DS.accent}30`}`,
  }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {msg.type === "success" ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></> : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
    </svg>
    {msg.text}
  </div>
);

const tagStyle = (tag: string): React.CSSProperties => {
  if (tag === "beginner") return { background: `${DS.success}14`, color: DS.success, border: `0.5px solid ${DS.success}26` };
  if (tag === "intermediate") return { background: `${DS.warning}14`, color: DS.warning, border: `0.5px solid ${DS.warning}26` };
  return { background: `${DS.accent}14`, color: DS.accent, border: `0.5px solid ${DS.accent}26` };
};

// 7. Stable avatar color derived from string hash (phone) instead of list index
function stringToHsl(str: string, s: number, l: number): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, ${s}%, ${l}%)`;
}

// Eye icon components
const EyeOpenIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeClosedIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(true); // Admin panel: visible by default
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserMsg, setCreateUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [resetPhone, setResetPhone] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(true); // Admin panel: visible by default
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userMainCourses, setUserMainCourses] = useState<Record<string, UserMainCourse[]>>({});
  const [userSubcourses, setUserSubcourses] = useState<Record<string, UserSubcourse[]>>({});
  const [loadingUserDetail, setLoadingUserDetail] = useState<string | null>(null);

  // 9. Error handling on fetch
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase.from("users").select("id, phone, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setFetchError(err?.message || "Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // 4. Properly typed Supabase responses instead of (mc as any)
  const fetchUserDetail = useCallback(async (userId: string) => {
    setLoadingUserDetail(userId);
    try {
      const [{ data: mc, error: mcErr }, { data: sc, error: scErr }] = await Promise.all([
        supabase.from("user_main_courses").select("id, main_course_id, main_courses(name, image_url)").eq("user_id", userId),
        supabase.from("user_courses").select("id, course_id, progress, courses(title, emoji, tag, total_lessons)").eq("user_id", userId),
      ]);
      if (mcErr) throw mcErr;
      if (scErr) throw scErr;
      setUserMainCourses((prev) => ({ ...prev, [userId]: (mc as unknown as UserMainCourse[]) ?? [] }));
      setUserSubcourses((prev) => ({ ...prev, [userId]: (sc as unknown as UserSubcourse[]) ?? [] }));
    } catch (err: any) {
      console.error("Failed to load user detail:", err);
    } finally {
      setLoadingUserDetail(null);
    }
  }, []);

  const handleExpandUser = useCallback((userId: string) => {
    if (expandedUserId === userId) { setExpandedUserId(null); return; }
    setExpandedUserId(userId);
    fetchUserDetail(userId);
  }, [expandedUserId, fetchUserDetail]);

  // 8. Error handling on unassign
  const handleUnassignMainCourse = useCallback(async (rowId: string, userId: string) => {
    if (!confirm("Unassign this main course from the user?")) return;
    try {
      const { error } = await supabase.from("user_main_courses").delete().eq("id", rowId);
      if (error) throw error;
      fetchUserDetail(userId);
    } catch (err: any) {
      setCreateUserMsg({ type: "error", text: err?.message || "Unassign failed." });
    }
  }, [fetchUserDetail]);

  const handleUnassignSubcourse = useCallback(async (rowId: string, userId: string) => {
    if (!confirm("Unassign this subcourse from the user?")) return;
    try {
      const { error } = await supabase.from("user_courses").delete().eq("id", rowId);
      if (error) throw error;
      fetchUserDetail(userId);
    } catch (err: any) {
      setCreateUserMsg({ type: "error", text: err?.message || "Unassign failed." });
    }
  }, [fetchUserDetail]);

  // 3. Rely on DB unique constraint instead of pre-check (avoids race condition)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserLoading(true);
    setCreateUserMsg(null);
    try {
      const { error } = await supabase.from("users").insert([{ phone: newPhone, password: newPassword }]);
      if (error) {
        if (error.code === "23505") {
          setCreateUserMsg({ type: "error", text: "Phone number already exists." });
        } else {
          throw error;
        }
      } else {
        setCreateUserMsg({ type: "success", text: `User ${newPhone} created.` });
        setNewPhone("");
        setNewPassword("");
        setShowNewPassword(true);
        fetchUsers();
      }
    } catch (err: any) {
      setCreateUserMsg({ type: "error", text: err?.message || "Create failed." });
    } finally {
      setCreateUserLoading(false);
    }
  };

  // 5. Clean up per-user state when deleting
  const handleDeleteUser = async (id: string, phone: string) => {
    if (!confirm(`Delete user ${phone}?`)) return;
    try {
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;
      if (expandedUserId === id) setExpandedUserId(null);
      setUserMainCourses(prev => { const next = { ...prev }; delete next[id]; return next; });
      setUserSubcourses(prev => { const next = { ...prev }; delete next[id]; return next; });
      fetchUsers();
    } catch (err: any) {
      setCreateUserMsg({ type: "error", text: err?.message || "Delete failed." });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMsg(null);
    try {
      const { error } = await supabase.from("users").update({ password: resetPassword }).eq("phone", resetPhone!);
      if (error) throw error;
      setResetMsg({ type: "success", text: "Password updated." });
      setResetPassword("");
      setShowResetPassword(true);
      setResetPhone(null);
    } catch (err: any) {
      setResetMsg({ type: "error", text: err?.message || "Reset failed." });
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(u => u.phone.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: "👥", accent: DS.accent },
          { label: "Latest Signup", value: users[0]?.phone ?? "—", icon: "📱", accent: "#4DC87A" },
          { label: "Joined On", value: users[0] ? new Date(users[0].created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—", icon: "📅", accent: "#FFA032" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-5 flex items-center gap-4 transition-all hover:translate-y-[-2px]"
            style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ background: `${s.accent}15` }}>
              {s.icon}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-medium" style={{ color: DS.text.muted }}>{s.label}</p>
              <p className="text-xl font-semibold mt-0.5" style={{ color: s.accent }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-6" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: DS.accentSoft }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <h2 className="text-sm font-semibold">Create New User</h2>
        </div>
        <form onSubmit={handleCreateUser} className="flex gap-3 flex-wrap items-center">
          <input type="tel" placeholder="Phone number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required
            className="flex-1 min-w-[180px] rounded-lg px-4 py-2.5 text-sm outline-none transition-all" style={inputStyle} onFocus={focusAccent} onBlur={blurReset} />

          {/* Password input with eye toggle */}
          <div className="flex-1 min-w-[180px] relative">
            <input 
              type={showNewPassword ? "text" : "password"} 
              placeholder="Set password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required
              className="w-full rounded-lg px-4 py-2.5 pr-10 text-sm outline-none transition-all" 
              style={inputStyle} 
              onFocus={focusAccent} 
              onBlur={blurReset} 
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
              style={{ color: DS.text.muted }}
              tabIndex={-1}
            >
              {showNewPassword ? <EyeOpenIcon size={16} /> : <EyeClosedIcon size={16} />}
            </button>
          </div>

          <button type="submit" disabled={createUserLoading} className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: DS.accent, color: "#fff", opacity: createUserLoading ? 0.6 : 1 }}>
            {createUserLoading ? "Creating..." : "Create User"}
          </button>
        </form>
        {createUserMsg && <div className="mt-3 max-w-md"><Msg msg={createUserMsg} /></div>}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${DS.border.default}` }}>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">All Users</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: DS.accentSoft, color: DS.accent }}>{filteredUsers.length} of {users.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DS.text.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search by phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 rounded-lg px-3 py-1.5 text-xs outline-none transition-all" style={{ ...inputStyle, background: DS.bg.base }} onFocus={focusAccent} onBlur={blurReset} />
          </div>
        </div>
        {fetchError ? (
          <div className="px-6 py-12 text-center">
            <p className="text-xs" style={{ color: "#EF4444" }}>{fetchError}</p>
          </div>
        ) : loadingUsers
          ? <div className="px-6 py-12 flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `${DS.accent}40`, borderTopColor: DS.accent }}></div><span className="text-xs" style={{ color: DS.text.muted }}>Loading users...</span></div>
          : filteredUsers.length === 0
            ? <div className="px-6 py-12 text-center"><p className="text-xs" style={{ color: DS.text.dim }}>{searchQuery ? "No users match your search." : "No users yet."}</p></div>
            : (
              <div>
                {filteredUsers.map((user) => (
                  <div key={user.id} className="transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                    style={{ borderBottom: `1px solid ${DS.border.default}` }}>
                    <div className="flex items-center px-6 py-4 gap-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                        style={{ background: stringToHsl(user.phone, 60, 20), color: stringToHsl(user.phone, 70, 75) }}>
                        {user.phone.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{user.phone}</p>
                        <p className="text-xs mt-0.5" style={{ color: DS.text.muted }}>
                          Joined {new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleExpandUser(user.id)}
                          className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80 flex items-center gap-1.5"
                          style={expandedUserId === user.id
                            ? { background: DS.accentSoft, color: DS.accent, border: `0.5px solid ${DS.accent}30` }
                            : { background: "rgba(255,255,255,0.04)", color: DS.text.secondary, border: "0.5px solid rgba(255,255,255,0.08)" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transform: expandedUserId === user.id ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                          {expandedUserId === user.id ? "Hide" : "View"} courses
                        </button>
                        <button onClick={() => { setResetPhone(user.phone); setResetMsg(null); setResetPassword(""); setShowResetPassword(true); }}
                          className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{ background: "rgba(255,255,255,0.04)", color: DS.text.secondary, border: "0.5px solid rgba(255,255,255,0.08)" }}>Reset pw</button>
                        <button onClick={() => handleDeleteUser(user.id, user.phone)}
                          className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{ background: DS.accentSoft, color: DS.accent, border: `0.5px solid ${DS.accent}30` }}>Delete</button>
                      </div>
                    </div>

                    {expandedUserId === user.id && (
                      <div className="px-6 pb-6" style={{ background: "rgba(0,0,0,0.2)" }}>
                        <div className="pt-4" style={{ borderTop: `1px solid ${DS.border.default}` }}>
                          {loadingUserDetail === user.id
                            ? <div className="flex items-center gap-2 py-4"><div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: `${DS.accent}40`, borderTopColor: DS.accent }}></div><span className="text-xs" style={{ color: DS.text.muted }}>Loading assignments...</span></div>
                            : (
                              <div className="flex flex-col gap-5">
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: DS.text.muted }}>Main Courses Assigned</p>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.05)", color: DS.text.muted }}>
                                      {userMainCourses[user.id]?.length ?? 0}
                                    </span>
                                  </div>
                                  {!userMainCourses[user.id]?.length
                                    ? <p className="text-xs py-2" style={{ color: DS.text.dim }}>No main courses assigned</p>
                                    : (
                                      <div className="flex flex-col gap-2">
                                        {userMainCourses[user.id].map((mc) => (
                                          <div key={mc.id} className="flex items-center justify-between px-4 py-3 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.03)]"
                                            style={{ background: DS.bg.base, border: `1px solid ${DS.border.default}` }}>
                                            <div className="flex items-center gap-3">
                                              {mc.main_courses?.image_url
                                                ? <img src={mc.main_courses.image_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                                                : <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: DS.accentSoft }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                                                  </div>
                                              }
                                              <p className="text-sm font-medium">{mc.main_courses?.name}</p>
                                            </div>
                                            <button onClick={() => handleUnassignMainCourse(mc.id, user.id)}
                                              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                                              style={{ background: DS.accentSoft, color: DS.accent, border: `0.5px solid ${DS.accent}30` }}>
                                              Unassign
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: DS.text.muted }}>Subcourses Assigned</p>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.05)", color: DS.text.muted }}>
                                      {userSubcourses[user.id]?.length ?? 0}
                                    </span>
                                  </div>
                                  {!userSubcourses[user.id]?.length
                                    ? <p className="text-xs py-2" style={{ color: DS.text.dim }}>No subcourses assigned</p>
                                    : (
                                      <div className="flex flex-col gap-2">
                                        {userSubcourses[user.id].map((sc) => (
                                          <div key={sc.id} className="flex items-center justify-between px-4 py-3 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.03)]"
                                            style={{ background: DS.bg.base, border: `1px solid ${DS.border.default}` }}>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                              <span className="text-xl shrink-0">{sc.courses?.emoji}</span>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <p className="text-sm font-medium">{sc.courses?.title}</p>
                                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={tagStyle(sc.courses?.tag ?? "")}>{sc.courses?.tag}</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-2">
                                                  <div className="flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", height: "5px", maxWidth: "140px" }}>
                                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${sc.progress || 0}%`, background: DS.accent }} />
                                                  </div>
                                                  <span className="text-[11px] tabular-nums" style={{ color: DS.text.muted }}>{sc.progress || 0}% · {sc.courses?.total_lessons} lessons</span>
                                                </div>
                                              </div>
                                            </div>
                                            <button onClick={() => handleUnassignSubcourse(sc.id, user.id)}
                                              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80 ml-4 shrink-0"
                                              style={{ background: DS.accentSoft, color: DS.accent, border: `0.5px solid ${DS.accent}30` }}>
                                              Unassign
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
      </div>

      {resetPhone && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
            style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}`, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: DS.accentSoft }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h3 className="text-sm font-semibold">Reset Password</h3>
            </div>
            <p className="text-xs mb-5 ml-7" style={{ color: DS.text.muted }}>For {resetPhone}</p>
            <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
              {/* Password input with eye toggle in modal */}
              <div className="relative">
                <input 
                  type={showResetPassword ? "text" : "password"} 
                  placeholder="New password" 
                  value={resetPassword} 
                  onChange={(e) => setResetPassword(e.target.value)} 
                  required
                  className="w-full rounded-lg px-4 py-2.5 pr-10 text-sm outline-none transition-all" 
                  style={inputStyle} 
                  onFocus={focusAccent} 
                  onBlur={blurReset} 
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: DS.text.muted }}
                  tabIndex={-1}
                >
                  {showResetPassword ? <EyeOpenIcon size={16} /> : <EyeClosedIcon size={16} />}
                </button>
              </div>

              {resetMsg && <Msg msg={resetMsg} />}
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setResetPhone(null)} className="flex-1 py-2.5 rounded-lg text-sm transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.06)", color: DS.text.secondary, border: `0.5px solid ${DS.border.default}` }}>Cancel</button>
                <button type="submit" disabled={resetLoading} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ background: DS.accent, color: "#fff", opacity: resetLoading ? 0.6 : 1 }}>
                  {resetLoading ? "Saving..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}