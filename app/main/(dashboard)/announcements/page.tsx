"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DS,
  supabase,
  type Announcement,
} from "../../lib/shared";

export default function AnnouncementsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const phone = sessionStorage.getItem("user_phone");
    if (!phone) {
      router.replace("/main/login");
      return;
    }
    fetchAnnouncements();
  }, [router]);

  // 2, 3, 4. Renamed, removed unused uid param, unwrapped pointless Promise.all
  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supaError } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (supaError) throw supaError;
      setAnnouncements(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between backdrop-blur-xl"
        style={{ background: "rgba(11,13,20,0.8)", borderBottom: `1px solid ${DS.border.default}` }}
      >
        <div className="min-w-0">
          {/* 7. Contextual eyebrow instead of generic "welcome back" */}
          <p className="text-[10px] md:text-xs uppercase tracking-wider font-medium" style={{ color: DS.text.muted }}>
            latest updates
          </p>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight mt-0.5 truncate">Announcements</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
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
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${DS.accent}40`, borderTopColor: DS.accent }}></div>
            {/* 6. Fixed loading copy */}
            <p className="text-sm" style={{ color: DS.text.muted }}>Loading announcements...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-sm" style={{ color: "#EF4444" }}>{error}</p>
            <button
              onClick={fetchAnnouncements}
              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ background: DS.accentSoft, color: DS.accent }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:gap-8">
            {/* 8. Removed duplicate body h1 — sticky header already shows "Announcements" */}

            {announcements.length === 0 ? (
              <div
                className="rounded-xl p-8 md:p-12 text-center"
                style={{ background: DS.bg.card, border: `1px solid ${DS.border.default}` }}
              >
                <svg className="mx-auto mb-4" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={DS.text.dim} strokeWidth="1.5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <p className="text-xs md:text-sm" style={{ color: DS.text.dim }}>No announcements yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 md:gap-3">
                {announcements.map((a, i) => (
                  <div
                    key={a.id}
                    className="rounded-xl p-4 md:p-5 transition-all hover:translate-y-[-1px]"
                    style={{
                      background: DS.bg.card,
                      border: `1px solid ${DS.border.default}`,
                      borderLeft: i === 0 ? "2px solid rgba(99,102,241,0.5)" : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 md:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                          <p className="text-xs md:text-sm font-semibold">{a.title}</p>
                          {/* 5. "New" is based on sort order (newest first). For true unread state, store last_seen_announcements_at per user. */}
                          {i === 0 && (
                            <span
                              className="text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0"
                              style={{ background: DS.accentSoft, color: DS.accent }}
                            >
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] md:text-xs leading-relaxed" style={{ color: DS.text.muted }}>
                          {a.body}
                        </p>
                        <p className="text-[10px] md:text-[11px] mt-2 md:mt-3 font-mono" style={{ color: DS.text.dim }}>
                          {new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}