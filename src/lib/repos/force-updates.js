import { join } from "path";
import { prisma } from "@/lib/db";
import { isDbEnabled } from "@/lib/feature-flags";
import { readJSON, updateJSON } from "@/lib/json-store";

const DATA_DIR = join(process.cwd(), "data");
const FORCE_FILE = join(DATA_DIR, "force-updates.json");

// Flag shape exposed to callers: { [espId]: { flaggedAt: ISO string } }

export async function listFlags() {
  if (!isDbEnabled()) return readJSON(FORCE_FILE);
  const rows = await prisma.forceUpdate.findMany({ where: { espId: { not: null } } });
  const out = {};
  for (const r of rows) {
    if (r.espId) out[r.espId] = { flaggedAt: r.createdAt.toISOString() };
  }
  return out;
}

export async function addFlags(espIds) {
  if (!isDbEnabled()) {
    await updateJSON(FORCE_FILE, (flags) => {
      for (const id of espIds) flags[id] = { flaggedAt: new Date().toISOString() };
      return flags;
    });
    return;
  }

  // Ensure the device rows exist, then upsert a device-scoped force flag.
  await prisma.$transaction(
    espIds.map((espId) =>
      prisma.device.upsert({
        where: { espId },
        update: {},
        create: { espId },
      })
    )
  );

  await prisma.$transaction(
    espIds.map((espId) =>
      prisma.forceUpdate.create({
        data: { espId },
      })
    )
  );
}

export async function isFlagged(espId) {
  if (!isDbEnabled()) {
    const flags = await readJSON(FORCE_FILE);
    return Boolean(flags[espId]);
  }
  const row = await prisma.forceUpdate.findFirst({ where: { espId } });
  return row !== null;
}

export async function clearFlag(espId) {
  if (!isDbEnabled()) {
    await updateJSON(FORCE_FILE, (flags) => {
      delete flags[espId];
      return flags;
    });
    return;
  }
  await prisma.forceUpdate.deleteMany({ where: { espId } });
}
