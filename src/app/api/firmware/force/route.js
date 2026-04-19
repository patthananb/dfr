import { NextResponse } from "next/server";
import { isSafePathSegment } from "@/lib/validate";
import { addFlags, listFlags } from "@/lib/repos/force-updates";
import { listSites, getAllDeviceIds } from "@/lib/repos/sites";

// POST /api/firmware/force  { espId } | { siteId } | { all: true }
export async function POST(request) {
  try {
    const body = await request.json();

    let targetIds = [];

    if (body.all) {
      const sites = await listSites();
      targetIds = getAllDeviceIds(sites);
    } else if (body.siteId) {
      const sites = await listSites();
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

    await addFlags(targetIds);
    return NextResponse.json({ success: true, flagged: targetIds });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to set force update" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const flags = await listFlags();
    return NextResponse.json({ flags });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to read force flags" }, { status: 500 });
  }
}
