import { join } from "path";
import { prisma } from "@/lib/db";
import { isDbEnabled } from "@/lib/feature-flags";
import { readJSON, updateJSON } from "@/lib/json-store";

const DATA_DIR = join(process.cwd(), "data");
const HEARTBEAT_FILE = join(DATA_DIR, "heartbeat.json");

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function projectStatus(record, now = Date.now()) {
  const lastSeen = record?.lastSeen ? Date.parse(record.lastSeen) : null;
  return {
    online:
      typeof lastSeen === "number" && now - lastSeen <= ONLINE_WINDOW_MS,
    lastSeen: record?.lastSeen || null,
    firmwareVersion: record?.firmwareVersion || null,
    rssi: record?.rssi ?? null,
    uptime: record?.uptime ?? null,
    freeHeap: record?.freeHeap ?? null,
  };
}

export async function getStatuses(deviceIds) {
  const now = Date.now();

  if (!isDbEnabled()) {
    const heartbeat = await readJSON(HEARTBEAT_FILE);
    const out = {};
    for (const id of deviceIds) out[id] = projectStatus(heartbeat[id], now);
    return out;
  }

  if (deviceIds.length === 0) return {};

  // One indexed lookup per device. At current device counts this is fine; if
  // it grows, swap for a single groupBy-latest query.
  const rows = await Promise.all(
    deviceIds.map((espId) =>
      prisma.heartbeat.findFirst({
        where: { espId },
        orderBy: { ts: "desc" },
      })
    )
  );

  const out = {};
  deviceIds.forEach((id, i) => {
    const row = rows[i];
    out[id] = projectStatus(
      row
        ? {
            lastSeen: row.ts.toISOString(),
            firmwareVersion: row.firmwareVersion,
            rssi: row.rssi,
          }
        : null,
      now
    );
  });
  return out;
}

export async function recordHeartbeat(
  espId,
  { timestamp, firmwareVersion, rssi, uptime, freeHeap, ip } = {}
) {
  if (!isDbEnabled()) {
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
    return;
  }

  // Heartbeats FK into Device, so make sure the device row exists. Sites
  // create devices with a siteId; heartbeats from unknown devices just get
  // an orphan row with null siteId.
  await prisma.device.upsert({
    where: { espId },
    update: {},
    create: { espId },
  });

  await prisma.heartbeat.create({
    data: {
      espId,
      ts: timestamp ? new Date(timestamp) : new Date(),
      ip: ip || null,
      rssi: rssi ?? null,
      firmwareVersion: firmwareVersion || null,
    },
  });
}
