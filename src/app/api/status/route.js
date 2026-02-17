import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { readSites } from "@/lib/sites";

const DATA_DIR = join(process.cwd(), "data");
const HEARTBEAT_FILE = join(DATA_DIR, "heartbeat.json");
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

async function readHeartbeat() {
  try {
    const raw = await readFile(HEARTBEAT_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeHeartbeat(data) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(HEARTBEAT_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  try {
    const [sites, heartbeat] = await Promise.all([
      readSites(),
      readHeartbeat(),
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

    const heartbeat = await readHeartbeat();
    heartbeat[espId] = {
      ...heartbeat[espId],
      lastSeen: timestamp || new Date().toISOString(),
      firmwareVersion: firmwareVersion || heartbeat[espId]?.firmwareVersion,
      ...(rssi !== undefined && { rssi }),
      ...(uptime !== undefined && { uptime }),
      ...(freeHeap !== undefined && { freeHeap }),
    };
    await writeHeartbeat(heartbeat);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update heartbeat" },
      { status: 500 }
    );
  }
}
