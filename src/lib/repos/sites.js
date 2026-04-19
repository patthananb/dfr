import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { isDbEnabled } from "@/lib/feature-flags";
import {
  readSites as jsonReadSites,
  writeSites as jsonWriteSites,
  sanitizeSites as sharedSanitize,
  getAllDeviceIds as sharedGetAllDeviceIds,
} from "@/lib/sites";

// Pure helpers — identical in both backends.
export const sanitizeSites = sharedSanitize;
export const getAllDeviceIds = sharedGetAllDeviceIds;

// Internal shape used by callers (matches the existing sites.json layout).
// { id, name, createdAt, wifi: { ssid, password }, devices: [{ id, mac }] }

function dbToSite(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    wifi: {
      ssid: row.ssid || "",
      password: row.passwordEnc || "",
    },
    devices: (row.devices || []).map((d) => ({ id: d.espId, mac: d.label || "" })),
  };
}

export async function listSites() {
  if (!isDbEnabled()) return jsonReadSites();
  const rows = await prisma.site.findMany({
    include: { devices: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(dbToSite);
}

export async function getSite(id) {
  if (!isDbEnabled()) {
    const sites = await jsonReadSites();
    return sites.find((s) => s.id === id) || null;
  }
  const row = await prisma.site.findUnique({
    where: { id },
    include: { devices: true },
  });
  return row ? dbToSite(row) : null;
}

export async function createSite({ name, wifi, devices }) {
  const now = new Date();
  const id = randomUUID();
  const password = wifi?.password || "";
  const ssid = wifi?.ssid || "";

  if (!isDbEnabled()) {
    const sites = await jsonReadSites();
    const newSite = {
      id,
      name,
      createdAt: now.toISOString(),
      wifi: { ssid, password },
      devices,
    };
    await jsonWriteSites([...sites, newSite]);
    return newSite;
  }

  const row = await prisma.site.create({
    data: {
      id,
      name,
      ssid,
      passwordEnc: password,
      devices: {
        create: devices.map((d) => ({ espId: d.id, label: d.mac })),
      },
    },
    include: { devices: true },
  });
  return dbToSite(row);
}

export async function updateSite(id, { name, wifi, devices }) {
  if (!isDbEnabled()) {
    const sites = await jsonReadSites();
    const idx = sites.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const existing = sites[idx];
    const updated = {
      ...existing,
      name,
      wifi: {
        ssid: wifi?.ssid || "",
        password: wifi?.password?.length ? wifi.password : existing.wifi?.password,
      },
      devices,
    };
    const next = [...sites];
    next[idx] = updated;
    await jsonWriteSites(next);
    return updated;
  }

  const existing = await prisma.site.findUnique({ where: { id } });
  if (!existing) return null;

  const nextPassword = wifi?.password?.length ? wifi.password : existing.passwordEnc;

  const row = await prisma.$transaction(async (tx) => {
    // Replace device set: delete then recreate. Simple and matches JSON
    // semantics (the request body is authoritative). Fine at current device
    // counts; if this grows, switch to a diff.
    await tx.device.deleteMany({ where: { siteId: id } });
    return tx.site.update({
      where: { id },
      data: {
        name,
        ssid: wifi?.ssid || "",
        passwordEnc: nextPassword,
        devices: {
          create: devices.map((d) => ({ espId: d.id, label: d.mac })),
        },
      },
      include: { devices: true },
    });
  });

  return dbToSite(row);
}

export async function deleteSite(id) {
  if (!isDbEnabled()) {
    const sites = await jsonReadSites();
    const next = sites.filter((s) => s.id !== id);
    if (next.length === sites.length) return false;
    await jsonWriteSites(next);
    return true;
  }

  try {
    // Device FK is onDelete: SetNull in the schema, so we cascade-delete
    // devices explicitly to match JSON semantics (devices live with a site).
    await prisma.$transaction([
      prisma.device.deleteMany({ where: { siteId: id } }),
      prisma.site.delete({ where: { id } }),
    ]);
    return true;
  } catch (err) {
    if (err.code === "P2025") return false; // record not found
    throw err;
  }
}
