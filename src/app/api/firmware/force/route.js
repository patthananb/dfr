import { NextResponse } from "next/server";
import { join } from "path";
import { isSafePathSegment } from "@/lib/validate";
import { readJSON, updateJSON } from "@/lib/json-store";
import { readSites, getAllDeviceIds } from "@/lib/sites";

const DATA_DIR = join(process.cwd(), "data");
const FORCE_FILE = join(DATA_DIR, "force-updates.json");

// POST /api/firmware/force  { espId } | { siteId } | { all: true }
// Sets force update flag for targeted devices
export async function POST(request) {
  try {
    const body = await request.json();

    let targetIds = [];

    if (body.all) {
      const sites = await readSites();
      targetIds = getAllDeviceIds(sites);
    } else if (body.siteId) {
      const sites = await readSites();
      const site = sites.find((s) => s.id === body.siteId);
      if (!site) {
        return NextResponse.json({ error: "Site not found" }, { status: 404 });
      }
      targetIds = site.devices?.map((d) => d.id).filter(Boolean) || [];
    } else if (body.espId) {
      if (!isSafePathSegment(body.espId)) {
        return NextResponse.json({ error: "Invalid ESP32 ID" }, { status: 400 });
      }
      targetIds = [body.espId];
    } else {
      return NextResponse.json(
        { error: "Provide espId, siteId, or all: true" },
        { status: 400 }
      );
    }

    await updateJSON(FORCE_FILE, (flags) => {
      for (const id of targetIds) {
        flags[id] = { flaggedAt: new Date().toISOString() };
      }
      return flags;
    });

    return NextResponse.json({ success: true, flagged: targetIds });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to set force update" }, { status: 500 });
  }
}

// GET /api/firmware/force — list current force update flags
export async function GET() {
  try {
    const flags = await readJSON(FORCE_FILE);
    return NextResponse.json({ flags });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to read force flags" }, { status: 500 });
  }
}
