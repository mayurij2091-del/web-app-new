"use client";

import { useState } from "react";
import { DS, getYouTubeThumbnail } from "../lib/shared";

export default function VideoThumbnailCard({
  courseId,
  title,
  youtubeUrl,
  emoji,
  onWatch,
}: {
  courseId: string;
  title: string;
  youtubeUrl: string | null;
  emoji: string;
  onWatch: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const thumbnail = getYouTubeThumbnail(youtubeUrl);

  return (
    <div
      className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group"
      style={{ background: DS.bg.base }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onWatch}
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: DS.accentSoft }}>
          <span className="text-3xl">{emoji}</span>
        </div>
      )}

      <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: DS.accent }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />

      <div className="absolute bottom-2 right-2">
        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
          ▶ Watch
        </span>
      </div>
    </div>
  );
}