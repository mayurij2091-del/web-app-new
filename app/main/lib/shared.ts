import { createClient } from "@supabase/supabase-js";
import { CSSProperties } from "react";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const DS = {
  bg: { base: "#0B0D14", sidebar: "#11131E", card: "#151724", hover: "#1A1D2A", active: "rgba(99,102,241,0.12)" },
  text: { primary: "#E8E6F1", secondary: "rgba(232,230,241,0.55)", muted: "rgba(232,230,241,0.35)", dim: "rgba(232,230,241,0.25)" },
  border: { default: "rgba(255,255,255,0.06)", hover: "rgba(255,255,255,0.1)", focus: "rgba(99,102,241,0.5)" },
  accent: "#6366F1", accentSoft: "rgba(99,102,241,0.1)", success: "#34D399", successSoft: "rgba(16,185,129,0.1)", warning: "#F59E0B",
};

export type SubCourse = {
  id: string;
  title: string;
  description: string | null;
  emoji: string;
  tag: string;
  total_lessons: number;
  youtube_url: string | null;
  created_at: string;
};

export type MainCourse = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  total_lessons: number;   // ← ADD THIS
  created_at: string;
};

export type UserMainCourse = {
  id: string;
  main_course_id: string;
  main_courses: MainCourse;
};

export type UserSubCourse = {
  id: string;
  course_id: string;
  progress: number;
  courses: SubCourse;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export const getYouTubeThumbnail = (url: string | null): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  let id: string | null = null;
  if (match && match[2].length === 11) id = match[2];
  if (!id) {
    const shortsMatch = url.match(/youtube.com\/shorts\/([^?&]+)/);
    if (shortsMatch) id = shortsMatch[1];
  }
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
};

export const tagStyle = (tag: string): CSSProperties => {
  if (tag === "beginner") return { background: "rgba(52,211,153,0.08)", color: "#34D399", border: "0.5px solid rgba(52,211,153,0.15)" };
  if (tag === "intermediate") return { background: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "0.5px solid rgba(245,158,11,0.15)" };
  return { background: "rgba(99,102,241,0.08)", color: "#818CF8", border: "0.5px solid rgba(99,102,241,0.15)" };
};

export const getSubCoursesForMain = (
  mainCourseId: string,
  mcLinks: { main_course_id: string; course_id: string }[],
  subCourses: UserSubCourse[]
) => {
  const linkedCourseIds = mcLinks
    .filter((link) => link.main_course_id === mainCourseId)
    .map((link) => link.course_id);
  return subCourses.filter((sc) => linkedCourseIds.includes(sc.course_id));
};

export const calculateMainCourseProgress = (
  mainCourseId: string,
  mcLinks: { main_course_id: string; course_id: string }[],
  subCourses: UserSubCourse[]
) => {
  const relatedSubCourses = getSubCoursesForMain(mainCourseId, mcLinks, subCourses);
  if (!relatedSubCourses.length) return 0;
  const total = relatedSubCourses.reduce((acc, sc) => acc + (sc.progress || 0), 0);
  return Math.round(total / relatedSubCourses.length);
};