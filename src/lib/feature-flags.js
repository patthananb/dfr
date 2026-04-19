// Select the storage backend used by the repo layer.
// Flag off (default): reads and writes go to the legacy JSON files.
// Flag on: same API signatures, but they hit the Prisma-managed SQL database.
// Named `isDbEnabled` (not `useDb`) so ESLint's react-hooks/rules-of-hooks
// doesn't treat it as a React hook.
export function isDbEnabled() {
  const v = process.env.USE_DB;
  if (!v) return false;
  return /^(1|true|yes|on)$/i.test(v.trim());
}
