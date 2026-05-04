import { mkdir, readFile, writeFile, unlink } from "fs/promises";
import path from "path";

const storageRoot = process.env.VERCEL
  ? path.join("/tmp", "storage")
  : path.join(process.cwd(), "storage");
const uploadRoot = path.join(storageRoot, "uploads");
const exportRoot = path.join(storageRoot, "exports");

/** Resolves path and ensures it is within the given root. Throws if path escapes. */
export function resolvePathWithinRoot(root: string, relativePath: string): string {
  const rootResolved = path.resolve(root);
  const resolved = path.resolve(rootResolved, relativePath);
  const relative = path.relative(rootResolved, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid path");
  }
  return resolved;
}

export async function ensureStorageDirs() {
  await mkdir(uploadRoot, { recursive: true });
  await mkdir(exportRoot, { recursive: true });
}

/** Sanitizes user-provided file names to prevent path traversal. */
export function sanitizeFileName(fileName: string): string {
  const base = path.basename(fileName);
  if (!base || base === "." || base === ".." || base.includes("..")) {
    return "upload";
  }
  return base.replace(/[<>:"|?*\x00-\x1f]/g, "_").slice(0, 255);
}

export function getUploadPath(fileName: string) {
  return path.join(uploadRoot, sanitizeFileName(fileName));
}

export function getExportPath(fileName: string) {
  return path.join(exportRoot, fileName);
}

export async function saveBufferToPath(filePath: string, buffer: Buffer) {
  await ensureStorageDirs();
  await writeFile(filePath, buffer);
}

export async function readBufferFromPath(filePath: string) {
  return readFile(filePath);
}
export async function deleteFileFromPath(filePath: string) {
  try {
    await unlink(filePath);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code !== "ENOENT") {
      throw error;
    }
  }
}
