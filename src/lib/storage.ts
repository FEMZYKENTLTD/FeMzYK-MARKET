import fs from "node:fs";
import path from "node:path";

/** Resolve a configured private file store and refuse paths that overlap the public web root. */
export function privateStorageRoot(): string {
  const configured = process.env.STORAGE_ROOT || "data/files";
  const root = path.isAbsolute(configured) ? path.resolve(configured) : path.resolve(process.cwd(), configured);
  const publicRoot = path.resolve(process.cwd(), "public");
  const inside = (base: string, value: string) => value === base || value.startsWith(base + path.sep);
  if (inside(publicRoot, root) || inside(root, publicRoot)) {
    throw new Error("STORAGE_ROOT must be separate from the public web directory.");
  }
  return root;
}

/** Resolve an existing file and ensure neither traversal nor symlinks escape private storage. */
export function resolvePrivateFile(storedPath: string): string {
  const root = privateStorageRoot();
  const candidate = path.resolve(storedPath);
  const inside = (base: string, value: string) => value === base || value.startsWith(base + path.sep);
  if (!inside(root, candidate)) throw new Error("File path is outside private storage.");
  const realRoot = fs.realpathSync(root);
  const realFile = fs.realpathSync(candidate);
  if (!inside(realRoot, realFile)) throw new Error("File path resolves outside private storage.");
  if (!fs.statSync(realFile).isFile()) throw new Error("Stored asset is not a regular file.");
  return realFile;
}

export function safeUploadName(name: string): string {
  const basename = path.basename(name || "file").replace(/[^\w.\-]+/g, "_").slice(0, 160);
  return basename || "file";
}
