import { NextResponse } from "next/server";
import { join } from "path";
import { readSites } from "@/lib/sites";
import { readJSON, updateJSON } from "@/lib/json-store";

const DATA_DIR = join(process.cwd(), "data");
const HEARTBEAT_FILE = join(DATA_DIR, "heartbeat.json");
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export async function GET() {
  try {
    const [sites, heartbeat] = await Promise.all([
      readSites(),
      readJSON(HEARTBEAT_FILE),
    ]);
    const now = Date.now();
    const statuses = {};

    sites.forEach((site) => {
      site.devices?.forEach((device) => {
        const record = heartbeat[device.id];
        const lastSeen = record?.lastSeen ? Date.parse(record.lastSeen) : null;
        const online =
          typeof lastSeen === "number" && now - lastSeen <= ONLINE_WINDOW_MS;
        statuses[device.id] = {
          online,
          lastSeen: record?.lastSeen || null,
          firmwareVersion: record?.firmwareVersion || null,
          rssi: record?.rssi ?? null,
          uptime: record?.uptime ?? null,
          freeHeap: record?.freeHeap ?? null,
        };
      });
    });

    return NextResponse.json({ statuses, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load status" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const espId = typeof body.espId === "string" ? body.espId.trim() : "";
    if (!espId) {
      return NextResponse.json(
        { error: "espId is required" },
        { status: 400 }
      );
    }

    const timestamp =
      typeof body.timestamp === "string" ? body.timestamp : null;
    const firmwareVersion =
      typeof body.firmwareVersion === "string"
        ? body.firmwareVersion.trim()
        : "";
    const rssi = typeof body.rssi === "number" ? body.rssi : undefined;
    const uptime = typeof body.uptime === "number" ? body.uptime : undefined;
    const freeHeap = typeof body.freeHeap === "number" ? body.freeHeap : undefined;

    await updateJSON(HEARTBEAT_FILE, (heartbeat) => {
      heartbeat[espId] = {
        ...heartbeat[espId],
        lastSeen: timestamp || new Date().toISOString(),
        firmwareVersion: firmwareVersion || heartbeat[espId]?.firmwareVersion,
        ...(rssi !== undefined && { rssi }),
        ...(uptime !== undefined && { uptime }),
        ...(freeHeap !== undefined && { freeHeap }),
      };
      return heartbeat;
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update heartbeat" },
      { status: 500 }
    );
  }
}
