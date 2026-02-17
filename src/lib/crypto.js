import { createHmac } from "crypto";

const SECRET = process.env.FIRMWARE_HMAC_SECRET || "default-dev-secret";

/**
 * Generate HMAC-SHA256 signature over firmware manifest fields.
 * @param {{ version: string, sha256: string, filename: string }} fields
 * @returns {string} hex-encoded HMAC signature
 */
export function signManifest({ version, sha256, filename }) {
  const payload = `${version || ""}:${sha256}:${filename}`;
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

/**
 * Verify an HMAC-SHA256 signature for given manifest fields.
 * @param {{ version: string, sha256: string, filename: string, signature: string }} fields
 * @returns {boolean}
 */
export function verifyManifest({ version, sha256, filename, signature }) {
  const expected = signManifest({ version, sha256, filename });
  return expected === signature;
}
