import { prisma } from "@/lib/db";
import { isDbEnabled } from "@/lib/feature-flags";
import {
  FIRMWARE_DIR as SHARED_FIRMWARE_DIR,
  readManifest as jsonReadManifest,
  writeManifest as jsonWriteManifest,
} from "@/lib/firmware";

// Binaries always live on disk — the DB only tracks metadata.
export const FIRMWARE_DIR = SHARED_FIRMWARE_DIR;

// Manifest shape returned to callers (matches on-disk manifest.json):
// {
//   versions: [{ filename, version, size, sha256, signature, releaseNotes, uploadedAt }],
//   active: "<filename>" | null
// }

function rowToEntry(row) {
  return {
    filename: row.filename,
    version: row.version || null,
    size: row.sizeBytes,
    sha256: row.sha256,
    signature: row.hmacSignature,
    releaseNotes: row.releaseNotes || "",
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

export async function readManifest(espId) {
  if (!isDbEnabled()) return jsonReadManifest(espId);

  const rows = await prisma.firmwareVersion.findMany({
    where: { espId },
    orderBy: { uploadedAt: "asc" },
  });
  const active = rows.find((r) => r.isActive) || null;
  return {
    versions: rows.map(rowToEntry),
    active: active ? active.filename : null,
  };
}

export async function saveVersion(espId, entry) {
  if (!isDbEnabled()) {
    const manifest = await jsonReadManifest(espId);
    manifest.versions = manifest.versions.filter((v) => v.filename !== entry.filename);
    manifest.versions.push(entry);
    manifest.active = entry.filename;
    await jsonWriteManifest(espId, manifest);
    return manifest;
  }

  await prisma.device.upsert({
    where: { espId },
    update: {},
    create: { espId },
  });

  await prisma.$transaction([
    prisma.firmwareVersion.updateMany({
      where: { espId, isActive: true },
      data: { isActive: false },
    }),
    prisma.firmwareVersion.upsert({
      where: { espId_filename: { espId, filename: entry.filename } },
      update: {
        version: entry.version || null,
        sha256: entry.sha256,
        hmacSignature: entry.signature,
        sizeBytes: entry.size,
        releaseNotes: entry.releaseNotes || null,
        isActive: true,
      },
      create: {
        espId,
        filename: entry.filename,
        version: entry.version || null,
        sha256: entry.sha256,
        hmacSignature: entry.signature,
        sizeBytes: entry.size,
        releaseNotes: entry.releaseNotes || null,
        isActive: true,
        uploadedAt: entry.uploadedAt ? new Date(entry.uploadedAt) : new Date(),
      },
    }),
  ]);

  return readManifest(espId);
}

export async function setActive(espId, filename) {
  if (!isDbEnabled()) {
    const manifest = await jsonReadManifest(espId);
    const exists = manifest.versions.some((v) => v.filename === filename);
    if (!exists) return null;
    manifest.active = filename;
    await jsonWriteManifest(espId, manifest);
    return manifest;
  }

  const target = await prisma.firmwareVersion.findUnique({
    where: { espId_filename: { espId, filename } },
  });
  if (!target) return null;

  await prisma.$transaction([
    prisma.firmwareVersion.updateMany({
      where: { espId, isActive: true },
      data: { isActive: false },
    }),
    prisma.firmwareVersion.update({
      where: { espId_filename: { espId, filename } },
      data: { isActive: true },
    }),
  ]);

  return readManifest(espId);
}

export async function deleteVersion(espId, filename) {
  if (!isDbEnabled()) {
    const manifest = await jsonReadManifest(espId);
    const idx = manifest.versions.findIndex((v) => v.filename === filename);
    if (idx === -1) return null;
    manifest.versions.splice(idx, 1);
    if (manifest.active === filename) {
      const sorted = [...manifest.versions].sort(
        (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
      );
      manifest.active = sorted.length > 0 ? sorted[0].filename : null;
    }
    await jsonWriteManifest(espId, manifest);
    return manifest;
  }

  const existing = await prisma.firmwareVersion.findUnique({
    where: { espId_filename: { espId, filename } },
  });
  if (!existing) return null;

  await prisma.firmwareVersion.delete({
    where: { espId_filename: { espId, filename } },
  });

  if (existing.isActive) {
    const fallback = await prisma.firmwareVersion.findFirst({
      where: { espId },
      orderBy: { uploadedAt: "desc" },
    });
    if (fallback) {
      await prisma.firmwareVersion.update({
        where: { id: fallback.id },
        data: { isActive: true },
      });
    }
  }

  return readManifest(espId);
}

export async function rollbackActive(espId) {
  if (!isDbEnabled()) {
    const manifest = await jsonReadManifest(espId);
    if (manifest.versions.length < 2 || !manifest.active) return null;
    const sorted = [...manifest.versions].sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );
    const activeIdx = sorted.findIndex((v) => v.filename === manifest.active);
    if (activeIdx === -1 || activeIdx >= sorted.length - 1) return null;
    const previous = sorted[activeIdx + 1];
    manifest.active = previous.filename;
    await jsonWriteManifest(espId, manifest);
    return { manifest, previous };
  }

  const versions = await prisma.firmwareVersion.findMany({
    where: { espId },
    orderBy: { uploadedAt: "desc" },
  });
  if (versions.length < 2) return null;
  const activeIdx = versions.findIndex((v) => v.isActive);
  if (activeIdx === -1 || activeIdx >= versions.length - 1) return null;
  const previous = versions[activeIdx + 1];

  await prisma.$transaction([
    prisma.firmwareVersion.updateMany({
      where: { espId, isActive: true },
      data: { isActive: false },
    }),
    prisma.firmwareVersion.update({
      where: { id: previous.id },
      data: { isActive: true },
    }),
  ]);

  const manifest = await readManifest(espId);
  return { manifest, previous: rowToEntry(previous) };
}
