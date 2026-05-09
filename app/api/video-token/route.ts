import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SECRET = new TextEncoder().encode(process.env.VIDEO_TOKEN_SECRET!);

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) return match[2];
  const shortsMatch = url.match(/youtube.com\/shorts\/([^?&]+)/);
  if (shortsMatch) return shortsMatch[1];
  return null;
}

export async function POST(req: NextRequest) {
  const { courseId, userPhone } = await req.json();

  // verify user exists
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("phone", userPhone)
    .single();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // verify user is assigned this course
  const { data: assignment } = await supabase
    .from("user_courses")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single();

  if (!assignment) return NextResponse.json({ error: "Not assigned" }, { status: 403 });

  // get youtube URL server-side only
  const { data: course } = await supabase
    .from("courses")
    .select("youtube_url")
    .eq("id", courseId)
    .single();

  if (!course?.youtube_url) return NextResponse.json({ error: "No video" }, { status: 404 });

  // extract ID and build embed URL right here, never send raw URL
  const videoId = extractYouTubeId(course.youtube_url);
  if (!videoId) return NextResponse.json({ error: "Invalid URL" }, { status: 400 });

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`;

  // sign a JWT with the embed URL, expires in 2 hours
  const token = await new SignJWT({ embedUrl, courseId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2h")
    .sign(SECRET);

  return NextResponse.json({ token });
}