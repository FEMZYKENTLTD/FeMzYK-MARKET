import fs from "node:fs";
import { q1 } from "@/lib/db";
import { resolvePrivateFile } from "@/lib/storage";

export function isDigitalType(type: string) {
  return type === "DIGITAL_PRODUCT" || type === "DOWNLOADABLE_RESOURCE";
}

/** Returns only a private, present delivery asset. Products without a file cannot be sold. */
export function getActiveDigitalFile(productId: number) {
  const file = q1<any>("SELECT * FROM digital_files WHERE product_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1", productId);
  if (!file) return null;
  try {
    const fullPath = resolvePrivateFile(file.stored_path);
    if (!fs.existsSync(fullPath)) return null;
    return { ...file, stored_path: fullPath };
  } catch {
    return null;
  }
}
