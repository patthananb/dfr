import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.FIRMWARE_HMAC_SECRET;
if (!SECRET) {
  console.warn("WARNING: FIRMWARE_HMAC_SECRET is not set. Firmware signing will fail.");
}

/**
 * Generate HMAC-SHA256 signature over firmware manifest fields.
 * @param {{ version: string, sha256: string, filename: string }} fields
 * @returns {string} hex-encoded HMAC signature
 */
export function signManifest({ version, sha256, filename }) {
  if (!SECRET) {
    throw new Error("FIRMWARE_HMAC_SECRET environment variable is required");
  }
  const payload = `${version || ""}:${sha256}:${filename}`;
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

/**
 * Verify an HMAC-SHA256 signature for given manifest fields.
 * Uses timing-safe comparison to prevent timing attacks.
 * @param {{ version: string, sha256: string, filename: string, signature: string }} fields
 * @returns {boolean}
 */
export function verifyManifest({ version, sha256, filename, signature }) {
  const expected = signManifest({ version, sha256, filename });
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
