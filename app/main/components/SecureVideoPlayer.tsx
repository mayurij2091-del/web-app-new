"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { DS } from "../lib/shared";

export default function SecureVideoPlayer({
  courseId,
  title,
  onTimeUpdate,
}: {
  courseId: string;
  title: string;
  onTimeUpdate?: (percent: number) => void;
}) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Track the highest 10% threshold we've already reported so we never go
  // backwards and never spam Supabase with duplicate saves.
  const highWaterRef = useRef<number>(0);

  // ── Token fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const userPhone = sessionStorage.getItem("user_phone");
      if (!userPhone) {
        setError("Not logged in");
        setLoading(false);
        return;
      }

      try {
        // Step 1 — get a short-lived token
        const tokenRes = await fetch("/api/video-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, userPhone }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || cancelled) {
          setError(tokenData.error || "Failed to load video");
          setLoading(false);
          return;
        }

        // Step 2 — resolve token → embed URL
        const resolveRes = await fetch("/api/video-token/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenData.token }),
        });
        const resolveData = await resolveRes.json();
        if (!resolveRes.ok || cancelled) {
          setError(resolveData.error || "Invalid token");
          setLoading(false);
          return;
        }

        setResolvedUrl(resolveData.embedUrl);
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [courseId]);

  // ── Progress tracking ──────────────────────────────────────────────────────
  // Reset high-water mark whenever a new video loads so switching courses
  // doesn't carry over the previous video's state.
  useEffect(() => {
    highWaterRef.current = 0;
  }, [courseId]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration || !onTimeUpdate) return;

    const rawPercent = (video.currentTime / video.duration) * 100;

    // Snap to the nearest completed 10% bucket (floor to multiple of 10)
    const bucket = Math.floor(rawPercent / 10) * 10;

    // Only fire when we cross into a new bucket and it's higher than before
    if (bucket > highWaterRef.current) {
      highWaterRef.current = bucket;
      // Clamp: treat the 90–100% bucket as full completion
      onTimeUpdate(bucket >= 90 ? 100 : bucket);
    }
  }, [onTimeUpdate]);

  const handleEnded = useCallback(() => {
    if (!onTimeUpdate) return;
    highWaterRef.current = 100;
    onTimeUpdate(100);
  }, [onTimeUpdate]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="w-full aspect-video rounded-xl flex items-center justify-center gap-2"
        style={{ background: DS.bg.base, border: `1px solid ${DS.border.default}` }}
      >
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: `${DS.accent}40`, borderTopColor: DS.accent }}
        />
        <span className="text-xs" style={{ color: DS.text.muted }}>
          Loading video securely...
        </span>
      </div>
    );
  }

  if (error || !resolvedUrl) {
    return (
      <div
        className="w-full aspect-video rounded-xl flex flex-col items-center justify-center gap-2"
        style={{ background: DS.bg.base, border: `1px solid ${DS.border.default}` }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={DS.text.dim} strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-xs" style={{ color: DS.text.dim }}>
          {error || "Video unavailable"}
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-video rounded-xl overflow-hidden"
      style={{ background: "#000" }}
    >
      <video
        ref={videoRef}
        controls
        controlsList="nodownload"
        className="absolute inset-0 w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      >
        <source src={resolvedUrl} type="video/mp4" />
      </video>
    </div>
  );
}