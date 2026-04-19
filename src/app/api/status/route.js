import { NextResponse } from "next/server";
import { listSites, getAllDeviceIds } from "@/lib/repos/sites";
import { getStatuses, recordHeartbeat } from "@/lib/repos/status";

export async function GET() {
  try {
    const sites = await listSites();
    const statuses = await getStatuses(getAllDeviceIds(sites));
    return NextResponse.json({ statuses, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const espId = typeof body.espId === "string" ? body.espId.trim() : "";
    if (!espId) {
      return NextResponse.json({ error: "espId is required" }, { status: 400 });
    }

    await recordHeartbeat(espId, {
      timestamp: typeof body.timestamp === "string" ? body.timestamp : null,
      firmwareVersion:
        typeof body.firmwareVersion === "string" ? body.firmwareVersion.trim() : "",
      rssi: typeof body.rssi === "number" ? body.rssi : undefined,
      uptime: typeof body.uptime === "number" ? body.uptime : undefined,
      freeHeap: typeof body.freeHeap === "number" ? body.freeHeap : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update heartbeat" }, { status: 500 });
  }
}
