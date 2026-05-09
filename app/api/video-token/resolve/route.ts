import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.VIDEO_TOKEN_SECRET!);

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return NextResponse.json({ embedUrl: payload.embedUrl });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}