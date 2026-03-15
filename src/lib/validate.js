import { resolve, join } from "path";

/**
 * Validate that a user-supplied identifier (espId, filename, etc.)
 * does not contain path traversal sequences.
 * Returns true if the value is safe to use in file paths.
 */
export function isSafePathSegment(value) {
  if (!value || typeof value !== "string") return false;
  if (value.includes("..") || value.includes("/") || value.includes("\\")) return false;
  if (value.includes("\0")) return false;
  return true;
}

/**
 * Validate that joining baseDir + segments stays within baseDir.
 * Returns the resolved path if safe, or null if traversal detected.
 */
export function safePath(baseDir, ...segments) {
  const resolved = resolve(join(baseDir, ...segments));
  if (!resolved.startsWith(resolve(baseDir) + "/") && resolved !== resolve(baseDir)) {
    return null;
  }
  return resolved;
}
