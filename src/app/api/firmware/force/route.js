import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const FORCE_FILE = join(DATA_DIR, "force-updates.json");

async function readForceFlags() {
  try {
    return JSON.parse(await readFile(FORCE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

async function writeForceFlags(data) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FORCE_FILE, JSON.stringify(data, null, 2));
}

// POST /api/firmware/force  { espId } | { siteId } | { all: true }
// Sets force update flag for targeted devices
export async function POST(request) {
  try {
    const body = await request.json();
    const flags = await readForceFlags();

    let targetIds = [];

    if (body.all) {
      // Get all device IDs from sites
      const { readSites } = await import("@/lib/sites");
      const sites = await readSites();
      sites.forEach((s) => s.devices?.forEach((d) => d.id && targetIds.push(d.id)));
    } else if (body.siteId) {
      const { readSites } = await import("@/lib/sites");
      const sites = await readSites();
      const site = sites.find((s) => s.id === body.siteId);
      if (!site) {
        return NextResponse.json({ error: "Site not found" }, { status: 404 });
      }
      targetIds = site.devices?.map((d) => d.id).filter(Boolean) || [];
    } else if (body.espId) {
      targetIds = [body.espId];
    } else {
      return NextResponse.json(
        { error: "Provide espId, siteId, or all: true" },
        { status: 400 }
      );
    }

    for (const id of targetIds) {
      flags[id] = { flaggedAt: new Date().toISOString() };
    }
    await writeForceFlags(flags);

    return NextResponse.json({ success: true, flagged: targetIds });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to set force update" }, { status: 500 });
  }
}

// GET /api/firmware/force — list current force update flags
export async function GET() {
  try {
    const flags = await readForceFlags();
    return NextResponse.json({ flags });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to read force flags" }, { status: 500 });
  }
}
