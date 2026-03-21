import { getCategoryById } from "@/data/categories";
import { getInventionById } from "@/data/inventions";
import { resolveInventionImageFile } from "@/lib/invention-image-files";
import type { Invention } from "@/types";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8",
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildFallbackSvg(invention: Invention): string {
  const category = getCategoryById(invention.category);
  const title = escapeXml(invention.title);
  const origin = escapeXml(invention.stateOrProvince
    ? `${invention.stateOrProvince}, ${invention.country}`
    : invention.country);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="960" y2="720" gradientUnits="userSpaceOnUse">
          <stop stop-color="#06101c"/>
          <stop offset="1" stop-color="${category.color}"/>
        </linearGradient>
      </defs>
      <rect width="960" height="720" fill="url(#bg)"/>
      <rect x="48" y="48" width="864" height="624" rx="40" fill="#020817" fill-opacity="0.58" stroke="#FFFFFF" stroke-opacity="0.16"/>
      <text x="88" y="146" fill="#93C5FD" font-family="Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="6">ARCHIVAL IMAGE PENDING</text>
      <text x="88" y="228" fill="white" font-family="Arial, sans-serif" font-size="54" font-weight="700">${title}</text>
      <text x="88" y="284" fill="rgba(255,255,255,0.72)" font-family="Arial, sans-serif" font-size="28">${origin}</text>
      <text x="88" y="350" fill="rgba(255,255,255,0.52)" font-family="Arial, sans-serif" font-size="24">A real local image is still being curated for this invention.</text>
    </svg>
  `.trim();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const invention = getInventionById(id);

  if (!invention) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = resolveInventionImageFile(id);
  if (filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";
    const data = await fs.readFile(filePath);

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new NextResponse(buildFallbackSvg(invention), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
