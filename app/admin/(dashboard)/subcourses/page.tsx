"use client";

import { useEffect, useState, useCallback } from "react";
import { DS, supabase } from "../../../main/lib/shared";

type Course = { id: string; title: string; emoji: string; tag: string; total_lessons: number; description: string; youtube_url: string };

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

export default function SubcoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  // 2. Use Course | null instead of Partial<Course> so every field is guaranteed present
  const [editForm, setEditForm] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", emoji: "📚", tag: "beginner", total_lessons: "", youtube_url: "" });
  const [createCourseLoading, setCreateCourseLoading] = useState(false);
  const [createCourseMsg, setCreateCourseMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editMsg, setEditMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // 8. Inline confirmation state instead of window.confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 7. Error handling on fetch
  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setCourses(data || []);
    } catch (err: any) {
      setFetchError(err?.message || "Failed to load subcourses.");
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCourseLoading(true);
    setCreateCourseMsg(null);
    try {
      const { error } = await supabase.from("courses").insert([{ 
        title: courseForm.title, 
        description: courseForm.description, 
        emoji: courseForm.emoji, 
        tag: courseForm.tag, 
        total_lessons: parseInt(courseForm.total_lessons) || 0, 
        youtube_url: courseForm.youtube_url 
      }]);
      if (error) throw error;
      setCreateCourseMsg({ type: "success", text: `Subcourse "${courseForm.title}" created.` });
      setCourseForm({ title: "", description: "", emoji: "📚", tag: "beginner", total_lessons: "", youtube_url: "" });
      fetchCourses();
    } catch (err: any) {
      setCreateCourseMsg({ type: "error", text: err?.message || "Create failed." });
    } finally {
      setCreateCourseLoading(false);
    }
  };

  // 1, 8. Error handling + inline confirmation instead of window.confirm
  const handleDeleteCourse = async (id: string) => {
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      setDeleteConfirmId(null);
      fetchCourses();
    } catch (err: any) {
      setCreateCourseMsg({ type: "error", text: err?.message || "Delete failed." });
    }
  };

  // 4. Warn about unsaved changes before switching edit rows
  const startEdit = (c: Course) => {
    if (editingId && editingId !== c.id) {
      if (!confirm("You have unsaved changes. Discard them?")) return;
    }
    setEditingId(c.id);
    setEditForm({ ...c });
    setEditMsg(null);
    setDeleteConfirmId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditMsg(null);
  };

  // 1. Error handling on update
  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm) return;
    setEditMsg(null);
    try {
      const { error } = await supabase.from("courses").update({
        title: editForm.title,
        description: editForm.description,
        emoji: editForm.emoji,
        tag: editForm.tag,
        total_lessons: editForm.total_lessons,
        youtube_url: editForm.youtube_url,
      }).eq("id", editingId);
      if (error) throw error;
      setEditMsg({ type: "success", text: "Subcourse updated." });
      setEditingId(null);
      setEditForm(null);
      fetchCourses();
    } catch (err: any) {
      setEditMsg({ type: "error", text: err?.message || "Update failed." });
    }
  };

  // 3. Include description in search filter
  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl p-6" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: DS.accentSoft }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <h2 className="text-sm font-semibold">Create Subcourse</h2>
        </div>
        <form onSubmit={handleCreateCourse} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <input type="text" placeholder="Subcourse title" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} required
              className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none transition-all" style={inputStyle} onFocus={focusAccent} onBlur={blurReset} />
            <input type="text" placeholder="Emoji e.g. 📚" value={courseForm.emoji} onChange={(e) => setCourseForm({ ...courseForm, emoji: e.target.value })}
              className="w-24 rounded-lg px-4 py-2.5 text-sm outline-none text-center transition-all" style={inputStyle} onFocus={focusAccent} onBlur={blurReset} />
          </div>
          <textarea placeholder="Description" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
            rows={2} className="w-full rounded-lg px-4 py-2.5 text-sm outline-none resize-none transition-all" style={inputStyle} onFocus={focusAccent} onBlur={blurReset} />
          <div className="flex gap-3">
            <select value={courseForm.tag} onChange={(e) => setCourseForm({ ...courseForm, tag: e.target.value })}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none transition-all appearance-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <input type="number" placeholder="Total lessons" value={courseForm.total_lessons} onChange={(e) => setCourseForm({ ...courseForm, total_lessons: e.target.value })}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none transition-all" style={inputStyle} onFocus={focusAccent} onBlur={blurReset} />
          </div>
          <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all focus-within:border-[rgba(255,59,59,0.5)]"
            style={{ background: DS.bg.base, border: `1px solid ${DS.border.default}` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={DS.accent}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>
            <input type="url" placeholder="YouTube video or playlist URL" value={courseForm.youtube_url} onChange={(e) => setCourseForm({ ...courseForm, youtube_url: e.target.value })}
              className="flex-1 bg-transparent text-sm outline-none" style={{ color: DS.text.primary }} />
          </div>
          {createCourseMsg && <div className="max-w-md"><Msg msg={createCourseMsg} /></div>}
          <button type="submit" disabled={createCourseLoading} className="w-full py-3 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: DS.accent, color: "#fff", opacity: createCourseLoading ? 0.6 : 1 }}>
            {createCourseLoading ? "Creating..." : "Create Subcourse"}
          </button>
        </form>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${DS.border.default}` }}>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">All Subcourses</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: DS.accentSoft, color: DS.accent }}>{filteredCourses.length} of {courses.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DS.text.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search subcourses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 rounded-lg px-3 py-1.5 text-xs outline-none transition-all" style={{ ...inputStyle, background: DS.bg.base }} onFocus={focusAccent} onBlur={blurReset} />
          </div>
        </div>
        {fetchError ? (
          <div className="px-6 py-12 text-center">
            <p className="text-xs" style={{ color: "#EF4444" }}>{fetchError}</p>
          </div>
        ) : loadingCourses
          ? <div className="px-6 py-12 flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `${DS.accent}40`, borderTopColor: DS.accent }}></div><span className="text-xs" style={{ color: DS.text.muted }}>Loading...</span></div>
          : filteredCourses.length === 0
            ? <div className="px-6 py-12 text-center"><p className="text-xs" style={{ color: DS.text.dim }}>{searchQuery ? "No subcourses match your search." : "No subcourses yet."}</p></div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${DS.border.default}` }}>
                      {["Subcourse", "Tag", "Lessons", "Video", ""].map((h, i) => (
                        <th key={i} className={`px-6 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 4 ? "text-right" : "text-left"}`} style={{ color: DS.text.muted }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((c, i) => (
                      <tr key={c.id} className="transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                        style={{ borderBottom: i < filteredCourses.length - 1 ? `1px solid ${DS.border.default}` : "none" }}>
                        {editingId === c.id ? (
                          <td colSpan={5} className="px-6 py-4">
                            <form onSubmit={handleUpdateCourse} className="flex flex-col gap-3">
                              <div className="flex gap-3">
                                <input type="text" value={editForm?.title} onChange={(e) => setEditForm(prev => prev ? { ...prev, title: e.target.value } : prev)} required
                                  className="flex-1 rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset} />
                                <input type="text" value={editForm?.emoji} onChange={(e) => setEditForm(prev => prev ? { ...prev, emoji: e.target.value } : prev)}
                                  className="w-16 rounded-lg px-3 py-2 text-xs outline-none text-center" style={inputStyle} onFocus={focusAccent} onBlur={blurReset} />
                                <select value={editForm?.tag} onChange={(e) => setEditForm(prev => prev ? { ...prev, tag: e.target.value } : prev)}
                                  className="rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset}>
                                  <option value="beginner">Beginner</option>
                                  <option value="intermediate">Intermediate</option>
                                  <option value="advanced">Advanced</option>
                                </select>
                                <input type="number" value={editForm?.total_lessons} onChange={(e) => setEditForm(prev => prev ? { ...prev, total_lessons: parseInt(e.target.value) || 0 } : prev)}
                                  className="w-24 rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset} />
                              </div>
                              <input type="url" value={editForm?.youtube_url} onChange={(e) => setEditForm(prev => prev ? { ...prev, youtube_url: e.target.value } : prev)}
                                className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} onFocus={focusAccent} onBlur={blurReset} placeholder="YouTube URL" />
                              <div className="flex gap-2 items-center">
                                <button type="submit" className="text-xs px-4 py-2 rounded-lg font-medium transition-all hover:brightness-110"
                                  style={{ background: DS.success, color: "#fff" }}>Save</button>
                                <button type="button" onClick={cancelEdit} className="text-xs px-4 py-2 rounded-lg transition-all hover:opacity-80"
                                  style={{ background: "rgba(255,255,255,0.06)", color: DS.text.secondary, border: `0.5px solid ${DS.border.default}` }}>Cancel</button>
                                {editMsg && <Msg msg={editMsg} />}
                              </div>
                            </form>
                          </td>
                        ) : (
                          <>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{c.emoji}</span>
                                <div>
                                  <p className="text-sm font-medium">{c.title}</p>
                                  <p className="text-xs mt-0.5" style={{ color: DS.text.muted }}>{c.description?.slice(0, 40)}{c.description?.length > 40 ? "..." : ""}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] px-2.5 py-1 rounded-full font-medium uppercase tracking-wide" style={tagStyle(c.tag)}>{c.tag}</span>
                            </td>
                            <td className="px-6 py-4 text-xs" style={{ color: DS.text.muted }}>{c.total_lessons} lessons</td>
                            <td className="px-6 py-4">
                              {c.youtube_url
                                ? <a href={c.youtube_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs transition-all hover:opacity-80" style={{ color: DS.accent }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill={DS.accent}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>
                                    View
                                  </a>
                                : <span className="text-xs" style={{ color: DS.text.dim }}>—</span>}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {deleteConfirmId === c.id ? (
                                <div className="flex items-center gap-2 justify-end">
                                  <button onClick={() => setDeleteConfirmId(null)} className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                                    style={{ background: "rgba(255,255,255,0.06)", color: DS.text.secondary, border: `0.5px solid ${DS.border.default}` }}>Cancel</button>
                                  <button onClick={() => handleDeleteCourse(c.id)} className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                                    style={{ background: DS.accentSoft, color: DS.accent, border: `0.5px solid ${DS.accent}30` }}>Confirm</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 justify-end">
                                  <button onClick={() => startEdit(c)} className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                                    style={{ background: "rgba(255,255,255,0.06)", color: DS.text.secondary, border: `0.5px solid ${DS.border.default}` }}>Edit</button>
                                  <button onClick={() => setDeleteConfirmId(c.id)} className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                                    style={{ background: DS.accentSoft, color: DS.accent, border: `0.5px solid ${DS.accent}30` }}>Delete</button>
                                </div>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </div>
    </div>
  );
}