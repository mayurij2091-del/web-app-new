"use client";

import { useEffect, useState, useCallback } from "react";
import { DS, supabase } from "../../../main//lib/shared";

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

const MAX_BODY_LENGTH = 2000;

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; body: string; created_at: string }[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [annForm, setAnnForm] = useState({ title: "", body: "" });
  const [annLoading, setAnnLoading] = useState(false);
  const [annMsg, setAnnMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Error handling on fetch
  const fetchAnnouncements = useCallback(async () => {
    try {
      setFetchError(null);
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err: any) {
      setFetchError(err?.message || "Failed to load announcements.");
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnLoading(true);
    setAnnMsg(null);
    try {
      const { error } = await supabase.from("announcements").insert([{ title: annForm.title, body: annForm.body }]);
      if (error) throw error;
      setAnnMsg({ type: "success", text: "Announcement posted." });
      setAnnForm({ title: "", body: "" });
      fetchAnnouncements();
    } catch (err: any) {
      setAnnMsg({ type: "error", text: err?.message || "Failed to post announcement." });
    } finally {
      setAnnLoading(false);
    }
  };

  // 2. Error handling + confirm shows the title being deleted
  const handleDeleteAnn = async (id: string, title: string) => {
    if (!confirm(`Delete announcement "${title}"?`)) return;
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      fetchAnnouncements();
    } catch (err: any) {
      setAnnMsg({ type: "error", text: err?.message || "Delete failed." });
    }
  };

  const bodyChars = annForm.body.length;
  const bodyOverLimit = bodyChars > MAX_BODY_LENGTH;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl p-6" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: DS.accentSoft }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <h2 className="text-sm font-semibold">New Announcement</h2>
        </div>
        <form onSubmit={handleAnnouncement} className="flex flex-col gap-4">
          <input type="text" placeholder="Title" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} required
            className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all" style={inputStyle} onFocus={focusAccent} onBlur={blurReset} />
          <div>
            <textarea placeholder="Message body" value={annForm.body} onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })} required
              rows={4} maxLength={MAX_BODY_LENGTH + 100}  
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none resize-none transition-all" style={inputStyle} onFocus={focusAccent} onBlur={blurReset} />
            <div className="flex justify-end mt-1">
              <span className={`text-[10px] ${bodyOverLimit ? "font-medium" : ""}`} style={{ color: bodyOverLimit ? "#EF4444" : DS.text.dim }}>
                {bodyChars}/{MAX_BODY_LENGTH}
              </span>
            </div>
          </div>
          {annMsg && <Msg msg={annMsg} />}
          <button type="submit" disabled={annLoading || bodyOverLimit || !annForm.title.trim() || !annForm.body.trim()} 
            className="w-full py-3 rounded-lg text-sm font-medium transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: DS.accent, color: "#fff", opacity: (annLoading || bodyOverLimit) ? 0.6 : 1 }}>
            {annLoading ? "Posting..." : "Post Announcement"}
          </button>
        </form>
      </div>

      {/* 6. Section header with count badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">All Announcements</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: DS.accentSoft, color: DS.accent }}>{announcements.length} total</span>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-xs" style={{ color: "#EF4444" }}>{fetchError}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {announcements.length === 0
          ? <div className="rounded-xl p-8 text-center" style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
              <p className="text-xs" style={{ color: DS.text.dim }}>No announcements yet.</p>
            </div>
          : announcements.map((a) => (
            <div key={a.id} className="rounded-xl p-5 flex justify-between items-start gap-4 transition-all hover:translate-y-[-1px]"
              style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: DS.text.muted }}>{a.body}</p>
                <p className="text-[11px] mt-3 font-mono" style={{ color: DS.text.dim }}>{new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <button onClick={() => handleDeleteAnn(a.id, a.title)} className="text-xs px-3 py-1.5 rounded-lg shrink-0 transition-all hover:opacity-80"
                style={{ background: DS.accentSoft, color: DS.accent, border: `0.5px solid ${DS.accent}30` }}>Delete</button>
            </div>
          ))}
      </div>
    </div>
  );
}