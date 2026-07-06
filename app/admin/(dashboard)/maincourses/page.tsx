"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DS, supabase } from "../../../main/lib/shared";

type User = { id: string; phone: string; created_at: string };
type Course = { id: string; title: string; emoji: string; tag: string; total_lessons: number; description: string; youtube_url: string };
type MainCourse = { id: string; name: string; description: string; image_url: string; total_lessons: number; created_at: string };

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

export default function MainCoursesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [mainCourses, setMainCourses] = useState<MainCourse[]>([]);
  const [loadingMainCourses, setLoadingMainCourses] = useState(true);
  const [mainCoursesError, setMainCoursesError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  
  // Track which main course dropdown is expanded
  const [expandedMcId, setExpandedMcId] = useState<string | null>(null);
  // Map of main_course_id -> linked subcourses
  const [mcLinks, setMcLinks] = useState<Record<string, Course[]>>({});
  const [loadingLinksId, setLoadingLinksId] = useState<string | null>(null);
  const [unlinkMsg, setUnlinkMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [mcForm, setMcForm] = useState({ name: "", description: "", total_lessons: "" });
  const [mcImageFile, setMcImageFile] = useState<File | null>(null);
  const [mcImagePreview, setMcImagePreview] = useState<string | null>(null);
  const [mcCreateLoading, setMcCreateLoading] = useState(false);
  const [mcCreateMsg, setMcCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const mcImageRef = useRef<HTMLInputElement>(null);

  const [mcAssignUserId, setMcAssignUserId] = useState("");
  const [mcAssignMainCourseId, setMcAssignMainCourseId] = useState("");
  const [mcAssignLoading, setMcAssignLoading] = useState(false);
  const [mcAssignMsg, setMcAssignMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Single link
  const [linkMainCourseId, setLinkMainCourseId] = useState("");
  const [linkSubcourseId, setLinkSubcourseId] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkMsg, setLinkMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // NEW: Bulk link multiple subcourses to one main course
  const [bulkLinkMainCourseId, setBulkLinkMainCourseId] = useState("");
  const [selectedSubcourseIds, setSelectedSubcourseIds] = useState<string[]>([]);
  const [bulkLinkLoading, setBulkLinkLoading] = useState(false);
  const [bulkLinkMsg, setBulkLinkMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [subcourseSearch, setSubcourseSearch] = useState("");

  // NEW: Emoji-based bulk link
  const [emojiSearchMainCourseId, setEmojiSearchMainCourseId] = useState("");
  const [emojiQuery, setEmojiQuery] = useState("");
  const [emojiSelectedIds, setEmojiSelectedIds] = useState<string[]>([]);
  const [emojiLinkLoading, setEmojiLinkLoading] = useState(false);
  const [emojiLinkMsg, setEmojiLinkMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    return () => {
      if (mcImagePreview) URL.revokeObjectURL(mcImagePreview);
    };
  }, [mcImagePreview]);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersError(null);
      const { data, error } = await supabase.from("users").select("id, phone, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setUsersError(err?.message || "Failed to load users.");
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      setCoursesError(null);
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setCourses(data || []);
    } catch (err: any) {
      setCoursesError(err?.message || "Failed to load courses.");
    }
  }, []);

  const fetchMainCourses = useCallback(async () => {
    setLoadingMainCourses(true);
    try {
      setMainCoursesError(null);
      const { data, error } = await supabase.from("main_courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setMainCourses(data || []);
    } catch (err: any) {
      setMainCoursesError(err?.message || "Failed to load main courses.");
    } finally {
      setLoadingMainCourses(false);
    }
  }, []);

  useEffect(() => {
    fetchMainCourses();
  }, [fetchMainCourses]);

  useEffect(() => {
    fetchUsers();
    fetchCourses();
  }, [fetchUsers, fetchCourses]);

  // Fetch linked subcourses for a specific main course
  const fetchLinkedSubcourses = useCallback(async (mainCourseId: string) => {
    setLoadingLinksId(mainCourseId);
    try {
      const { data: links, error: linksErr } = await supabase
        .from("main_course_subcourses")
        .select("course_id")
        .eq("main_course_id", mainCourseId);
      
      if (linksErr) throw linksErr;

      if (!links || links.length === 0) {
        setMcLinks(prev => ({ ...prev, [mainCourseId]: [] }));
        return;
      }

      const courseIds = links.map(l => l.course_id);
      const { data: subcourses, error: subErr } = await supabase
        .from("courses")
        .select("*")
        .in("id", courseIds);

      if (subErr) throw subErr;

      // Preserve order of links
      const courseMap = new Map(subcourses?.map(c => [c.id, c]));
      const ordered = courseIds.map(id => courseMap.get(id)).filter(Boolean) as Course[];
      
      setMcLinks(prev => ({ ...prev, [mainCourseId]: ordered }));
    } catch (err: any) {
      setUnlinkMsg({ type: "error", text: err?.message || "Failed to load linked subcourses." });
    } finally {
      setLoadingLinksId(null);
    }
  }, []);

  // Toggle dropdown and fetch if needed
  const toggleDropdown = (mcId: string) => {
    if (expandedMcId === mcId) {
      setExpandedMcId(null);
    } else {
      setExpandedMcId(mcId);
      if (!mcLinks[mcId]) {
        fetchLinkedSubcourses(mcId);
      }
    }
  };

  // Unlink a subcourse from a main course
  const handleUnlinkSubcourse = async (mainCourseId: string, courseId: string, courseTitle: string) => {
    if (!confirm(`Unlink "${courseTitle}" from this main course?`)) return;
    try {
      const { error } = await supabase
        .from("main_course_subcourses")
        .delete()
        .eq("main_course_id", mainCourseId)
        .eq("course_id", courseId);
      
      if (error) throw error;

      // Update local state to remove it
      setMcLinks(prev => ({
        ...prev,
        [mainCourseId]: prev[mainCourseId]?.filter(c => c.id !== courseId) || []
      }));
      setUnlinkMsg({ type: "success", text: "Unlinked successfully." });
    } catch (err: any) {
      setUnlinkMsg({ type: "error", text: err?.message || "Unlink failed." });
    }
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setMcCreateMsg({ type: "error", text: "Image must be under 5MB." });
      if (mcImageRef.current) mcImageRef.current.value = "";
      return;
    }
    setMcImageFile(file);
    setMcImagePreview(URL.createObjectURL(file));
  };

  const handleCreateMainCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setMcCreateLoading(true);
    setMcCreateMsg(null);
    let image_url = "";
    if (mcImageFile) {
      const formData = new FormData();
      formData.append("file", mcImageFile);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setMcCreateMsg({ type: "error", text: data.error || "Image upload failed." }); setMcCreateLoading(false); return; }
      image_url = data.url;
    }
    const { error } = await supabase.from("main_courses").insert([{ 
      name: mcForm.name, 
      description: mcForm.description, 
      image_url,
      total_lessons: parseInt(mcForm.total_lessons) || 0 
    }]);
    if (error) { setMcCreateMsg({ type: "error", text: error.message }); }
    else { 
      setMcCreateMsg({ type: "success", text: `Main course "${mcForm.name}" created.` }); 
      setMcForm({ name: "", description: "", total_lessons: "" }); 
      setMcImageFile(null); 
      setMcImagePreview(null); 
      fetchMainCourses(); 
    }
    setMcCreateLoading(false);
  };

  const handleDeleteMainCourse = async (id: string, name: string) => {
    if (!confirm(`Delete main course "${name}"?`)) return;
    try {
      const { error } = await supabase.from("main_courses").delete().eq("id", id);
      if (error) throw error;
      // Clean up links state
      setMcLinks(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (expandedMcId === id) setExpandedMcId(null);
      fetchMainCourses();
    } catch (err: any) {
      setMcCreateMsg({ type: "error", text: err?.message || "Delete failed." });
    }
  };

  const handleMcAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setMcAssignLoading(true);
    setMcAssignMsg(null);
    const { data: existing, error: checkErr } = await supabase.from("user_main_courses").select("id").eq("user_id", mcAssignUserId).eq("main_course_id", mcAssignMainCourseId).single();
    if (checkErr && checkErr.code !== "PGRST116") {
      setMcAssignMsg({ type: "error", text: checkErr.message });
      setMcAssignLoading(false);
      return;
    }
    if (existing) { setMcAssignMsg({ type: "error", text: "Already assigned to this user." }); setMcAssignLoading(false); return; }
    const { error } = await supabase.from("user_main_courses").insert([{ user_id: mcAssignUserId, main_course_id: mcAssignMainCourseId }]);
    if (error) { setMcAssignMsg({ type: "error", text: error.message }); setMcAssignLoading(false); return; }

    // NEW: auto-assign all linked subcourses too
    const { data: linked, error: linkErr } = await supabase
      .from("main_course_subcourses")
      .select("course_id")
      .eq("main_course_id", mcAssignMainCourseId);
    if (linkErr) { setMcAssignMsg({ type: "error", text: linkErr.message }); setMcAssignLoading(false); return; }

    if (linked && linked.length > 0) {
      const courseIds = linked.map(l => l.course_id);
      const { data: existingCourses, error: ecErr } = await supabase
        .from("user_courses")
        .select("course_id")
        .eq("user_id", mcAssignUserId)
        .in("course_id", courseIds);
      if (ecErr) { setMcAssignMsg({ type: "error", text: ecErr.message }); setMcAssignLoading(false); return; }

      const existingSet = new Set(existingCourses?.map(r => r.course_id) || []);
      const toInsert = courseIds
        .filter(cid => !existingSet.has(cid))
        .map(cid => ({ user_id: mcAssignUserId, course_id: cid }));

      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase.from("user_courses").insert(toInsert);
        if (insertErr) { setMcAssignMsg({ type: "error", text: insertErr.message }); setMcAssignLoading(false); return; }
      }
    }

    setMcAssignMsg({ type: "success", text: "Main course assigned." }); setMcAssignUserId(""); setMcAssignMainCourseId(""); setMcAssignLoading(false);
  };

  // Single link subcourse
  const handleLinkSubcourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkLoading(true);
    setLinkMsg(null);
    const { data: existing, error: checkErr } = await supabase.from("main_course_subcourses").select("id").eq("main_course_id", linkMainCourseId).eq("course_id", linkSubcourseId).single();
    if (checkErr && checkErr.code !== "PGRST116") {
      setLinkMsg({ type: "error", text: checkErr.message });
      setLinkLoading(false);
      return;
    }
    if (existing) { setLinkMsg({ type: "error", text: "Subcourse already linked to this main course." }); setLinkLoading(false); return; }
    const { error } = await supabase.from("main_course_subcourses").insert([{ main_course_id: linkMainCourseId, course_id: linkSubcourseId }]);
    if (error) { setLinkMsg({ type: "error", text: error.message }); }
    else { 
      setLinkMsg({ type: "success", text: "Subcourse linked successfully." }); 
      setLinkMainCourseId(""); 
      setLinkSubcourseId(""); 
      // Refresh links if dropdown is open for this main course
      if (expandedMcId === linkMainCourseId) {
        fetchLinkedSubcourses(linkMainCourseId);
      }
    }
    setLinkLoading(false);
  };

  // NEW: Bulk link multiple subcourses to one main course
  const toggleSubcourse = (id: string) => {
    setSelectedSubcourseIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleBulkLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubcourseIds.length === 0) { setBulkLinkMsg({ type: "error", text: "Select at least one subcourse." }); return; }
    setBulkLinkLoading(true);
    setBulkLinkMsg(null);
    try {
      // Check which subcourses are already linked to this main course
      const { data: existing, error: checkErr } = await supabase
        .from("main_course_subcourses")
        .select("course_id")
        .eq("main_course_id", bulkLinkMainCourseId)
        .in("course_id", selectedSubcourseIds);
      if (checkErr) throw checkErr;

      const existingSet = new Set(existing?.map(r => r.course_id) || []);
      const toLink = selectedSubcourseIds
        .filter(cid => !existingSet.has(cid))
        .map(cid => ({ main_course_id: bulkLinkMainCourseId, course_id: cid }));

      if (toLink.length === 0) {
        setBulkLinkMsg({ type: "error", text: "All selected subcourses are already linked to this main course." });
        setBulkLinkLoading(false);
        return;
      }

      const { error: insertErr } = await supabase.from("main_course_subcourses").insert(toLink);
      if (insertErr) throw insertErr;

      const skipped = selectedSubcourseIds.length - toLink.length;
      setBulkLinkMsg({
        type: "success",
        text: `Linked ${toLink.length} subcourse${toLink.length !== 1 ? "s" : ""}${skipped > 0 ? `, ${skipped} already linked` : ""}.`
      });
      setSelectedSubcourseIds([]);
      // Refresh links if dropdown is open for this main course
      if (expandedMcId === bulkLinkMainCourseId) {
        fetchLinkedSubcourses(bulkLinkMainCourseId);
      }
    } catch (err: any) {
      setBulkLinkMsg({ type: "error", text: err?.message || "Bulk link failed." });
    } finally {
      setBulkLinkLoading(false);
    }
  };

  // NEW: Emoji-based bulk link helpers
  const toggleEmojiSubcourse = (id: string) => {
    setEmojiSelectedIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleEmojiBulkLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emojiSelectedIds.length === 0) { setEmojiLinkMsg({ type: "error", text: "Select at least one subcourse." }); return; }
    if (!emojiSearchMainCourseId) { setEmojiLinkMsg({ type: "error", text: "Select a main course." }); return; }
    setEmojiLinkLoading(true);
    setEmojiLinkMsg(null);
    try {
      const { data: existing, error: checkErr } = await supabase
        .from("main_course_subcourses")
        .select("course_id")
        .eq("main_course_id", emojiSearchMainCourseId)
        .in("course_id", emojiSelectedIds);
      if (checkErr) throw checkErr;

      const existingSet = new Set(existing?.map(r => r.course_id) || []);
      const toLink = emojiSelectedIds
        .filter(cid => !existingSet.has(cid))
        .map(cid => ({ main_course_id: emojiSearchMainCourseId, course_id: cid }));

      if (toLink.length === 0) {
        setEmojiLinkMsg({ type: "error", text: "All selected subcourses are already linked to this main course." });
        setEmojiLinkLoading(false);
        return;
      }

      const { error: insertErr } = await supabase.from("main_course_subcourses").insert(toLink);
      if (insertErr) throw insertErr;

      const skipped = emojiSelectedIds.length - toLink.length;
      setEmojiLinkMsg({
        type: "success",
        text: `Linked ${toLink.length} subcourse${toLink.length !== 1 ? "s" : ""}${skipped > 0 ? `, ${skipped} already linked` : ""}.`
      });
      setEmojiSelectedIds([]);
      // Refresh links if dropdown is open for this main course
      if (expandedMcId === emojiSearchMainCourseId) {
        fetchLinkedSubcourses(emojiSearchMainCourseId);
      }
    } catch (err: any) {
      setEmojiLinkMsg({ type: "error", text: err?.message || "Bulk link failed." });
    } finally {
      setEmojiLinkLoading(false);
    }
  };

  const filteredSubcourses = courses.filter(c => `${c.emoji} ${c.title}`.toLowerCase().includes(subcourseSearch.toLowerCase()));
  const emojiFilteredSubcourses = courses.filter(c => emojiQuery.trim() === "" ? true : c.emoji.includes(emojiQuery.trim()));

  return (
    <div className="flex flex-col gap-8">
      {/* ═══ Create Main Course ═══ */}
      <div className="rounded-xl p-6" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: DS.accentSoft }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <h2 className="text-sm font-semibold">Create Main Course</h2>
        </div>
        <form onSubmit={handleCreateMainCourse} className="flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="Main course name" 
            value={mcForm.name} 
            onChange={(e) => setMcForm({ ...mcForm, name: e.target.value })} 
            required
            className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all" 
            style={inputStyle} 
            onFocus={focusAccent} 
            onBlur={blurReset} 
          />
          <textarea 
            placeholder="Description" 
            value={mcForm.description} 
            onChange={(e) => setMcForm({ ...mcForm, description: e.target.value })}
            rows={2} 
            className="w-full rounded-lg px-4 py-2.5 text-sm outline-none resize-none transition-all" 
            style={inputStyle} 
            onFocus={focusAccent} 
            onBlur={blurReset} 
          />
          
          <div>
            <label className="block text-xs mb-1.5" style={{ color: DS.text.muted }}>
              Total Lessons
            </label>
            <input 
              type="number" 
              min={0}
              placeholder="0" 
              value={mcForm.total_lessons} 
              onChange={(e) => setMcForm({ ...mcForm, total_lessons: e.target.value })} 
              required
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all" 
              style={inputStyle} 
              onFocus={focusAccent} 
              onBlur={blurReset} 
            />
          </div>

          <div>
            <input ref={mcImageRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
            {mcImagePreview ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden group">
                <img src={mcImagePreview} alt="preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button type="button" onClick={() => { setMcImageFile(null); setMcImagePreview(null); }}
                    className="text-xs px-4 py-2 rounded-lg backdrop-blur-md"
                    style={{ background: "rgba(0,0,0,0.6)", color: "#F0EEE8" }}>Remove image</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => mcImageRef.current?.click()}
                className="w-full h-32 rounded-xl border-dashed flex flex-col items-center justify-center gap-2 transition-all hover:bg-[rgba(255,255,255,0.02)]"
                style={{ border: "1.5px dashed rgba(255,255,255,0.15)", color: DS.text.muted }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span className="text-xs">Click to upload cover image</span>
              </button>
            )}
          </div>
          {mcCreateMsg && <div className="max-w-md"><Msg msg={mcCreateMsg} /></div>}
          <button type="submit" disabled={mcCreateLoading} className="w-full py-3 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: DS.accent, color: "#fff", opacity: mcCreateLoading ? 0.6 : 1 }}>
            {mcCreateLoading ? "Creating..." : "Create Main Course"}
          </button>
        </form>
      </div>

      {/* ═══ Assign Main Course to User ═══ */}
      <div className="rounded-xl p-6" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(77,200,122,0.1)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4DC87A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <h2 className="text-sm font-semibold">Assign Main Course to User</h2>
        </div>
        <form onSubmit={handleMcAssign} className="flex gap-3 flex-wrap">
          <select value={mcAssignUserId} onChange={(e) => setMcAssignUserId(e.target.value)} required
            className="flex-1 min-w-[180px] rounded-lg px-4 py-2.5 text-sm outline-none transition-all appearance-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset}>
            <option value="">— Select user —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.phone}</option>)}
          </select>
          <select value={mcAssignMainCourseId} onChange={(e) => setMcAssignMainCourseId(e.target.value)} required
            className="flex-1 min-w-[180px] rounded-lg px-4 py-2.5 text-sm outline-none transition-all appearance-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset}>
            <option value="">— Select main course —</option>
            {mainCourses.map((mc) => <option key={mc.id} value={mc.id}>{mc.name}</option>)}
          </select>
          <button type="submit" disabled={mcAssignLoading} className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: DS.accent, color: "#fff", opacity: mcAssignLoading ? 0.6 : 1 }}>
            {mcAssignLoading ? "Assigning..." : "Assign"}
          </button>
        </form>
        {usersError && <p className="mt-2 text-xs" style={{ color: "#EF4444" }}>{usersError}</p>}
        {mcAssignMsg && <div className="mt-3 max-w-md"><Msg msg={mcAssignMsg} /></div>}
      </div>

      {/* ═══ Link Subcourse to Main Course (Single) ═══ */}
      <div className="rounded-xl p-6" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(255,160,50,0.1)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFA032" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </div>
          <h2 className="text-sm font-semibold">Link Subcourse to Main Course</h2>
        </div>
        <form onSubmit={handleLinkSubcourse} className="flex gap-3 flex-wrap">
          <select value={linkMainCourseId} onChange={(e) => setLinkMainCourseId(e.target.value)} required
            className="flex-1 min-w-[180px] rounded-lg px-4 py-2.5 text-sm outline-none transition-all appearance-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset}>
            <option value="">— Select main course —</option>
            {mainCourses.map((mc) => <option key={mc.id} value={mc.id}>{mc.name}</option>)}
          </select>
          <select value={linkSubcourseId} onChange={(e) => setLinkSubcourseId(e.target.value)} required
            className="flex-1 min-w-[180px] rounded-lg px-4 py-2.5 text-sm outline-none transition-all appearance-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset}>
            <option value="">— Select subcourse —</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>)}
          </select>
          <button type="submit" disabled={linkLoading} className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: DS.accent, color: "#fff", opacity: linkLoading ? 0.6 : 1 }}>
            {linkLoading ? "Linking..." : "Link"}
          </button>
        </form>
        {coursesError && <p className="mt-2 text-xs" style={{ color: "#EF4444" }}>{coursesError}</p>}
        {linkMsg && <div className="mt-3 max-w-md"><Msg msg={linkMsg} /></div>}
      </div>

      {/* ═══ NEW: Bulk Link Multiple Subcourses to Main Course ═══ */}
      <div className="rounded-xl p-6" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(168,85,247,0.1)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              <line x1="18" y1="8" x2="23" y2="3"/>
              <polyline points="18 3 23 3 23 8"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold">Bulk Link: Multiple Subcourses → Main Course</h2>
        </div>
        <form onSubmit={handleBulkLink} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: DS.text.muted }}>Select Main Course</label>
            <select value={bulkLinkMainCourseId} onChange={(e) => setBulkLinkMainCourseId(e.target.value)} required
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all appearance-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset}>
              <option value="">— Pick a main course —</option>
              {mainCourses.map((mc) => <option key={mc.id} value={mc.id}>{mc.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" style={{ color: DS.text.muted }}>Select Subcourses ({selectedSubcourseIds.length} selected)</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSelectedSubcourseIds(filteredSubcourses.map(c => c.id))}
                  className="text-[10px] px-2 py-1 rounded transition-all hover:opacity-80" style={{ color: DS.accent }}>Select all visible</button>
                <button type="button" onClick={() => setSelectedSubcourseIds([])}
                  className="text-[10px] px-2 py-1 rounded transition-all hover:opacity-80" style={{ color: DS.text.muted }}>Clear</button>
              </div>
            </div>
            <input type="text" placeholder="Search subcourses..." value={subcourseSearch} onChange={(e) => setSubcourseSearch(e.target.value)}
              className="w-full rounded-lg px-4 py-2 text-xs outline-none transition-all mb-2" style={{ ...inputStyle, background: DS.bg.base }} onFocus={focusAccent} onBlur={blurReset} />
            <div className="max-h-48 overflow-y-auto rounded-lg" style={{ background: DS.bg.base, border: `1px solid ${DS.border.default}` }}>
              {filteredSubcourses.map(c => (
                <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ borderBottom: `1px solid ${DS.border.default}` }}>
                  <input type="checkbox" checked={selectedSubcourseIds.includes(c.id)} onChange={() => toggleSubcourse(c.id)}
                    className="w-3.5 h-3.5 rounded accent-[#FF3B3B]" />
                  <span className="text-xs" style={{ color: DS.text.primary }}>{c.emoji} {c.title}</span>
                  <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded" style={{ color: DS.text.muted, background: "rgba(255,255,255,0.04)" }}>{c.tag}</span>
                </label>
              ))}
            </div>
          </div>
          {bulkLinkMsg && <Msg msg={bulkLinkMsg} />}
          <button type="submit" disabled={bulkLinkLoading || !bulkLinkMainCourseId} className="w-full py-3 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: "#A855F7", color: "#fff", opacity: bulkLinkLoading || !bulkLinkMainCourseId ? 0.6 : 1 }}>
            {bulkLinkLoading ? "Linking..." : `Link ${selectedSubcourseIds.length} Subcourse${selectedSubcourseIds.length !== 1 ? "s" : ""}`}
          </button>
        </form>
      </div>

      {/* ═══ NEW: Bulk Link by Emoji ═══ */}
      <div className="rounded-xl p-6" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(255,160,50,0.1)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFA032" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold">Bulk Link by Emoji</h2>
        </div>
        <form onSubmit={handleEmojiBulkLink} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: DS.text.muted }}>Select Main Course</label>
            <select value={emojiSearchMainCourseId} onChange={(e) => setEmojiSearchMainCourseId(e.target.value)} required
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all appearance-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset}>
              <option value="">— Pick a main course —</option>
              {mainCourses.map((mc) => <option key={mc.id} value={mc.id}>{mc.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" style={{ color: DS.text.muted }}>Search by Emoji ({emojiSelectedIds.length} selected)</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setEmojiSelectedIds(emojiFilteredSubcourses.map(c => c.id))}
                  className="text-[10px] px-2 py-1 rounded transition-all hover:opacity-80" style={{ color: DS.accent }}>Select all visible</button>
                <button type="button" onClick={() => setEmojiSelectedIds([])}
                  className="text-[10px] px-2 py-1 rounded transition-all hover:opacity-80" style={{ color: DS.text.muted }}>Clear</button>
              </div>
            </div>
            <input type="text" placeholder="Paste or type an emoji... e.g. 🐍" value={emojiQuery} onChange={(e) => setEmojiQuery(e.target.value)}
              className="w-full rounded-lg px-4 py-2 text-xs outline-none transition-all mb-2" style={{ ...inputStyle, background: DS.bg.base }} onFocus={focusAccent} onBlur={blurReset} />
            <div className="max-h-48 overflow-y-auto rounded-lg" style={{ background: DS.bg.base, border: `1px solid ${DS.border.default}` }}>
              {emojiFilteredSubcourses.length === 0 ? (
                <p className="px-4 py-3 text-xs text-center" style={{ color: DS.text.dim }}>No subcourses match this emoji.</p>
              ) : (
                emojiFilteredSubcourses.map(c => (
                  <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                    style={{ borderBottom: `1px solid ${DS.border.default}` }}>
                    <input type="checkbox" checked={emojiSelectedIds.includes(c.id)} onChange={() => toggleEmojiSubcourse(c.id)}
                      className="w-3.5 h-3.5 rounded accent-[#FF3B3B]" />
                    <span className="text-xl shrink-0">{c.emoji}</span>
                    <span className="text-xs" style={{ color: DS.text.primary }}>{c.title}</span>
                    <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded" style={{ color: DS.text.muted, background: "rgba(255,255,255,0.04)" }}>{c.tag}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          {emojiLinkMsg && <Msg msg={emojiLinkMsg} />}
          <button type="submit" disabled={emojiLinkLoading || !emojiSearchMainCourseId} className="w-full py-3 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: "#FFA032", color: "#fff", opacity: emojiLinkLoading || !emojiSearchMainCourseId ? 0.6 : 1 }}>
            {emojiLinkLoading ? "Linking..." : `Link ${emojiSelectedIds.length} Subcourse${emojiSelectedIds.length !== 1 ? "s" : ""}`}
          </button>
        </form>
      </div>

      {/* ═══ All Main Courses Grid ═══ */}
      <div className="rounded-xl overflow-hidden" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${DS.border.default}` }}>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">All Main Courses</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: DS.accentSoft, color: DS.accent }}>{mainCourses.length} total</span>
          </div>
          {unlinkMsg && <div className="max-w-xs"><Msg msg={unlinkMsg} /></div>}
        </div>
        {mainCoursesError ? (
          <div className="px-6 py-12 text-center">
            <p className="text-xs" style={{ color: "#EF4444" }}>{mainCoursesError}</p>
          </div>
        ) : loadingMainCourses
          ? <div className="px-6 py-12 flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `${DS.accent}40`, borderTopColor: DS.accent }}></div><span className="text-xs" style={{ color: DS.text.muted }}>Loading...</span></div>
          : mainCourses.length === 0
            ? <div className="px-6 py-12 text-center"><p className="text-xs" style={{ color: DS.text.dim }}>No main courses yet.</p></div>
            : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {mainCourses.map((mc) => {
                  const isExpanded = expandedMcId === mc.id;
                  const linked = mcLinks[mc.id];
                  const isLoadingLinks = loadingLinksId === mc.id;

                  return (
                    <div key={mc.id} className="rounded-xl overflow-hidden group transition-all hover:translate-y-[-2px] hover:shadow-lg"
                      style={{ background: DS.bg.base, border: `1px solid ${DS.border.default}` }}>
                      <div className="relative h-40 overflow-hidden">
                        {mc.image_url
                          ? <img src={mc.image_url} alt={mc.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          : <div className="w-full h-full flex items-center justify-center" style={{ background: DS.accentSoft }}>
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                            </div>
                        }
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold">{mc.name}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: DS.accentSoft, color: DS.accent }}>
                            {mc.total_lessons || 0} lessons
                          </span>
                        </div>
                        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: DS.text.muted }}>{mc.description?.slice(0, 80)}{mc.description?.length > 80 ? "..." : ""}</p>
                        
                        {/* Dropdown toggle */}
                        <button 
                          onClick={() => toggleDropdown(mc.id)}
                          className="w-full mt-3 flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all hover:bg-[rgba(255,255,255,0.03)]"
                          style={{ border: `1px solid ${DS.border.default}`, color: DS.text.muted }}
                        >
                          <span className="flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                            Linked Subcourses
                            {linked && linked.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: DS.accentSoft, color: DS.accent }}>
                                {linked.length}
                              </span>
                            )}
                          </span>
                          <svg 
                            width="14" height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className="transition-transform duration-200"
                            style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>

                        {/* Dropdown content */}
                        {isExpanded && (
                          <div className="mt-2 rounded-lg overflow-hidden" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
                            {isLoadingLinks ? (
                              <div className="px-4 py-3 flex items-center gap-2">
                                <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: `${DS.accent}40`, borderTopColor: DS.accent }}></div>
                                <span className="text-xs" style={{ color: DS.text.muted }}>Loading...</span>
                              </div>
                            ) : !linked || linked.length === 0 ? (
                              <div className="px-4 py-3 text-xs text-center" style={{ color: DS.text.dim }}>
                                None
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                {linked.map((sub, idx) => (
                                  <div 
                                    key={sub.id} 
                                    className="flex items-center justify-between px-4 py-2.5"
                                    style={{ borderBottom: idx < linked.length - 1 ? `1px solid ${DS.border.default}` : "none" }}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-sm shrink-0">{sub.emoji}</span>
                                      <span className="text-xs truncate" style={{ color: DS.text.primary }}>{sub.title}</span>
                                    </div>
                                    <button
                                      onClick={() => handleUnlinkSubcourse(mc.id, sub.id, sub.title)}
                                      className="text-[10px] px-2 py-1 rounded-md transition-all hover:opacity-80 shrink-0 ml-2"
                                      style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.2)" }}
                                    >
                                      Unlink
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between items-center mt-4 pt-3" style={{ borderTop: `1px solid ${DS.border.default}` }}>
                          <p className="text-[11px]" style={{ color: DS.text.dim }}>{new Date(mc.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                          <button onClick={() => handleDeleteMainCourse(mc.id, mc.name)}
                            className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                            style={{ background: DS.accentSoft, color: DS.accent, border: `0.5px solid ${DS.accent}30` }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
      </div>
    </div>
  );
}