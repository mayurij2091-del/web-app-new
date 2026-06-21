import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("video") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No video uploaded" },
        { status: 400 }
      );
    }

    const storageZone = process.env.BUNNY_STORAGE_ZONE!;
    const accessKey = process.env.BUNNY_STORAGE_PASSWORD!;
    const region = process.env.BUNNY_REGION || "";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    const uploadUrl = region
      ? `https://${region}.storage.bunnycdn.com/${storageZone}/${fileName}`
      : `https://storage.bunnycdn.com/${storageZone}/${fileName}`;

    const bunnyResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: accessKey,
        "Content-Type": file.type,
      },
      body: buffer,
    });

    if (!bunnyResponse.ok) {
      const errorText = await bunnyResponse.text();

      return NextResponse.json(
        {
          error: "Bunny upload failed",
          details: errorText,
        },
        { status: 500 }
      );
    }

    const publicUrl = `${process.env.BUNNY_CDN_URL}/${fileName}`;

    return NextResponse.json({
      success: true,
      fileName,
      videoUrl: publicUrl,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error: error.message || "Upload failed",
      },
      { status: 500 }
    );
  }
}