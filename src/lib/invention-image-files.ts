import fs from "node:fs";
import path from "node:path";

const IMAGE_DIR = path.join(process.cwd(), "public", "images", "inventions");
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".svg"];

export function resolveInventionImageFile(id: string): string | null {
  for (const extension of ALLOWED_EXTENSIONS) {
    const filePath = path.join(IMAGE_DIR, `${id}${extension}`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

export function hasLocalInventionImage(id: string): boolean {
  return resolveInventionImageFile(id) !== null;
}
