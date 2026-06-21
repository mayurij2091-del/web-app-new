"use client";

import { useEffect, useState, useRef } from "react";
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
  const [token, setToken] = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const getToken = async () => {
      const userPhone = sessionStorage.getItem("user_phone");
      if (!userPhone) {
        setError("Not logged in");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/video-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, userPhone }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load video");
          setLoading(false);
          return;
        }
        setToken(data.token);
      } catch {
        setError("Network error");
        setLoading(false);
      }
    };
    getToken();
  }, [courseId]);

  useEffect(() => {
    if (!token) return;
    const resolveToken = async () => {
      try {
        const res = await fetch("/api/video-token/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid token");
          setLoading(false);
          return;
        }
        setResolvedUrl(data.embedUrl);
        setLoading(false);
      } catch {
        setError("Failed to resolve video");
        setLoading(false);
      }
    };
    resolveToken();
  }, [token]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data === 'string' && event.data.includes('onStateChange')) {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'onStateChange' && data.info === 0) {
            onTimeUpdate?.(100);
          }
        } catch {}
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onTimeUpdate]);

  if (loading) {
    return (
      <div className="w-full aspect-video rounded-xl flex items-center justify-center gap-2" style={{ background: DS.bg.base, border: `1px solid ${DS.border.default}` }}>
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${DS.accent}40`, borderTopColor: DS.accent }}></div>
        <span className="text-xs" style={{ color: DS.text.muted }}>Loading video securely...</span>
      </div>
    );
  }

  if (error || !resolvedUrl) {
    return (
      <div className="w-full aspect-video rounded-xl flex flex-col items-center justify-center gap-2" style={{ background: DS.bg.base, border: `1px solid ${DS.border.default}` }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={DS.text.dim} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span className="text-xs" style={{ color: DS.text.dim }}>{error || "Video unavailable"}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden" style={{ background: "#000" }}>
<video
  controls
  controlsList="nodownload"
  className="absolute inset-0 w-full h-full"
>
  <source src={resolvedUrl} type="video/mp4" />
</video>
    </div>
  );
}