"use client";

import { useEffect, useState, useCallback } from "react";
import { DS, supabase } from "../../../main/lib/shared";

type User = { id: string; phone: string; created_at: string };
type Course = { id: string; title: string; emoji: string; tag: string; total_lessons: number; description: string; youtube_url: string };

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

export default function AssignPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Single assign
  const [assignUserId, setAssignUserId] = useState("");
  const [assignCourseId, setAssignCourseId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Bulk: 1 course → many users
  const [bulkCourseId, setBulkCourseId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [userSearch, setUserSearch] = useState("");

  // NEW: Bulk: many courses → 1 user
  const [multiUserId, setMultiUserId] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [multiLoading, setMultiLoading] = useState(false);
  const [multiMsg, setMultiMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [courseSearch, setCourseSearch] = useState("");

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

  const fetchCourses = useCallback(async () => {
    try {
      setFetchError(null);
      const { data, error } = await supabase.from("courses").select("id, title, emoji, tag, total_lessons, description, youtube_url").order("created_at", { ascending: false });
      if (error) throw error;
      setCourses(data || []);
    } catch (err: any) {
      setFetchError(err?.message || "Failed to load courses.");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchCourses();
  }, [fetchUsers, fetchCourses]);

  // Single assign
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignLoading(true);
    setAssignMsg(null);
    try {
      const { error } = await supabase.from("user_courses").insert([{ user_id: assignUserId, course_id: assignCourseId, progress: 0 }]);
      if (error) {
        if (error.code === "23505") {
          setAssignMsg({ type: "error", text: "Already assigned to this user." });
        } else {
          throw error;
        }
      } else {
        setAssignMsg({ type: "success", text: "Subcourse assigned." });
        setAssignUserId("");
        setAssignCourseId("");
      }
    } catch (err: any) {
      setAssignMsg({ type: "error", text: err?.message || "Assignment failed." });
    } finally {
      setAssignLoading(false);
    }
  };

  // Bulk: 1 course → many users
  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) { setBulkMsg({ type: "error", text: "Select at least one user." }); return; }
    setBulkLoading(true);
    setBulkMsg(null);
    try {
      const { data: existing, error: checkErr } = await supabase
        .from("user_courses")
        .select("user_id")
        .eq("course_id", bulkCourseId)
        .in("user_id", selectedUserIds);
      if (checkErr) throw checkErr;

      const existingSet = new Set(existing?.map(r => r.user_id) || []);
      const toAssign = selectedUserIds
        .filter(uid => !existingSet.has(uid))
        .map(uid => ({ user_id: uid, course_id: bulkCourseId, progress: 0 }));

      if (toAssign.length === 0) {
        setBulkMsg({ type: "error", text: "All selected users already have this course." });
        setBulkLoading(false);
        return;
      }

      const { error: insertErr } = await supabase.from("user_courses").insert(toAssign);
      if (insertErr) throw insertErr;

      const skipped = selectedUserIds.length - toAssign.length;
      setBulkMsg({
        type: "success",
        text: `Assigned to ${toAssign.length} user${toAssign.length !== 1 ? "s" : ""}${skipped > 0 ? `, ${skipped} already had it` : ""}.`
      });
      setSelectedUserIds([]);
    } catch (err: any) {
      setBulkMsg({ type: "error", text: err?.message || "Bulk assignment failed." });
    } finally {
      setBulkLoading(false);
    }
  };

  // NEW: Bulk: many courses → 1 user
  const toggleCourse = (id: string) => {
    setSelectedCourseIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleMultiAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCourseIds.length === 0) { setMultiMsg({ type: "error", text: "Select at least one subcourse." }); return; }
    setMultiLoading(true);
    setMultiMsg(null);
    try {
      // Check which courses this user already has
      const { data: existing, error: checkErr } = await supabase
        .from("user_courses")
        .select("course_id")
        .eq("user_id", multiUserId)
        .in("course_id", selectedCourseIds);
      if (checkErr) throw checkErr;

      const existingSet = new Set(existing?.map(r => r.course_id) || []);
      const toAssign = selectedCourseIds
        .filter(cid => !existingSet.has(cid))
        .map(cid => ({ user_id: multiUserId, course_id: cid, progress: 0 }));

      if (toAssign.length === 0) {
        setMultiMsg({ type: "error", text: "User already has all selected subcourses." });
        setMultiLoading(false);
        return;
      }

      const { error: insertErr } = await supabase.from("user_courses").insert(toAssign);
      if (insertErr) throw insertErr;

      const skipped = selectedCourseIds.length - toAssign.length;
      setMultiMsg({
        type: "success",
        text: `Assigned ${toAssign.length} subcourse${toAssign.length !== 1 ? "s" : ""}${skipped > 0 ? `, ${skipped} already existed` : ""}.`
      });
      setSelectedCourseIds([]);
    } catch (err: any) {
      setMultiMsg({ type: "error", text: err?.message || "Multi assignment failed." });
    } finally {
      setMultiLoading(false);
    }
  };

  const filteredUsers = users.filter(u => u.phone.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredCourses = courses.filter(c => `${c.emoji} ${c.title}`.toLowerCase().includes(courseSearch.toLowerCase()));

  return (
    <div className="flex flex-col gap-8 max-w-xl">
      {fetchError && (
        <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-xs" style={{ color: "#EF4444" }}>{fetchError}</p>
        </div>
      )}

      {/* 1. Single Assign */}
      <div className="rounded-xl p-6" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(77,200,122,0.1)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4DC87A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <h2 className="text-sm font-semibold">Assign Subcourse to User</h2>
        </div>
        <form onSubmit={handleAssign} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: DS.text.muted }}>Select User</label>
            <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} required
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all appearance-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset}>
              <option value="">— Pick a user —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.phone}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: DS.text.muted }}>Select Subcourse</label>
            <select value={assignCourseId} onChange={(e) => setAssignCourseId(e.target.value)} required
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all appearance-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset}>
              <option value="">— Pick a subcourse —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>)}
            </select>
          </div>
          {assignMsg && <Msg msg={assignMsg} />}
          <button type="submit" disabled={assignLoading} className="w-full py-3 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: DS.accent, color: "#fff", opacity: assignLoading ? 0.6 : 1 }}>
            {assignLoading ? "Assigning..." : "Assign Subcourse"}
          </button>
        </form>
      </div>

      {/* 2. Bulk: 1 course → many users */}
      <div className="rounded-xl p-6" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: DS.accentSoft }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h2 className="text-sm font-semibold">Bulk Assign: One Subcourse → Multiple Users</h2>
        </div>
        <form onSubmit={handleBulkAssign} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: DS.text.muted }}>Select Subcourse</label>
            <select value={bulkCourseId} onChange={(e) => setBulkCourseId(e.target.value)} required
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all appearance-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset}>
              <option value="">— Pick a subcourse —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" style={{ color: DS.text.muted }}>Select Users ({selectedUserIds.length} selected)</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSelectedUserIds(filteredUsers.map(u => u.id))}
                  className="text-[10px] px-2 py-1 rounded transition-all hover:opacity-80" style={{ color: DS.accent }}>Select all visible</button>
                <button type="button" onClick={() => setSelectedUserIds([])}
                  className="text-[10px] px-2 py-1 rounded transition-all hover:opacity-80" style={{ color: DS.text.muted }}>Clear</button>
              </div>
            </div>
            <input type="text" placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
              className="w-full rounded-lg px-4 py-2 text-xs outline-none transition-all mb-2" style={{ ...inputStyle, background: DS.bg.base }} onFocus={focusAccent} onBlur={blurReset} />
            <div className="max-h-48 overflow-y-auto rounded-lg" style={{ background: DS.bg.base, border: `1px solid ${DS.border.default}` }}>
              {filteredUsers.map(u => (
                <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ borderBottom: `1px solid ${DS.border.default}` }}>
                  <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleUser(u.id)}
                    className="w-3.5 h-3.5 rounded accent-[#FF3B3B]" />
                  <span className="text-xs" style={{ color: DS.text.primary }}>{u.phone}</span>
                </label>
              ))}
            </div>
          </div>
          {bulkMsg && <Msg msg={bulkMsg} />}
          <button type="submit" disabled={bulkLoading} className="w-full py-3 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: DS.accent, color: "#fff", opacity: bulkLoading ? 0.6 : 1 }}>
            {bulkLoading ? "Assigning..." : `Assign to ${selectedUserIds.length} User${selectedUserIds.length !== 1 ? "s" : ""}`}
          </button>
        </form>
      </div>

      {/* 3. NEW: Bulk: many courses → 1 user */}
      <div className="rounded-xl p-6" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold">Bulk Assign: Multiple Subcourses → One User</h2>
        </div>
        <form onSubmit={handleMultiAssign} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: DS.text.muted }}>Select User</label>
            <select value={multiUserId} onChange={(e) => setMultiUserId(e.target.value)} required
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all appearance-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset}>
              <option value="">— Pick a user —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.phone}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" style={{ color: DS.text.muted }}>Select Subcourses ({selectedCourseIds.length} selected)</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSelectedCourseIds(filteredCourses.map(c => c.id))}
                  className="text-[10px] px-2 py-1 rounded transition-all hover:opacity-80" style={{ color: DS.accent }}>Select all visible</button>
                <button type="button" onClick={() => setSelectedCourseIds([])}
                  className="text-[10px] px-2 py-1 rounded transition-all hover:opacity-80" style={{ color: DS.text.muted }}>Clear</button>
              </div>
            </div>
            <input type="text" placeholder="Search subcourses..." value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)}
              className="w-full rounded-lg px-4 py-2 text-xs outline-none transition-all mb-2" style={{ ...inputStyle, background: DS.bg.base }} onFocus={focusAccent} onBlur={blurReset} />
            <div className="max-h-48 overflow-y-auto rounded-lg" style={{ background: DS.bg.base, border: `1px solid ${DS.border.default}` }}>
              {filteredCourses.map(c => (
                <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ borderBottom: `1px solid ${DS.border.default}` }}>
                  <input type="checkbox" checked={selectedCourseIds.includes(c.id)} onChange={() => toggleCourse(c.id)}
                    className="w-3.5 h-3.5 rounded accent-[#FF3B3B]" />
                  <span className="text-xs" style={{ color: DS.text.primary }}>{c.emoji} {c.title}</span>
                  <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded" style={{ color: DS.text.muted, background: "rgba(255,255,255,0.04)" }}>{c.tag}</span>
                </label>
              ))}
            </div>
          </div>
          {multiMsg && <Msg msg={multiMsg} />}
          <button type="submit" disabled={multiLoading || !multiUserId} className="w-full py-3 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: "#3B82F6", color: "#fff", opacity: multiLoading || !multiUserId ? 0.6 : 1 }}>
            {multiLoading ? "Assigning..." : `Assign ${selectedCourseIds.length} Subcourse${selectedCourseIds.length !== 1 ? "s" : ""}`}
          </button>
        </form>
      </div>
    </div>
  );
}