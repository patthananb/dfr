import { NextResponse } from "next/server";
import {
  listSites,
  createSite,
  updateSite,
  deleteSite,
  sanitizeSites,
} from "@/lib/repos/sites";

function parseDevices(raw) {
  return Array.isArray(raw)
    ? raw
        .map((device) => ({
          id: typeof device.id === "string" ? device.id.trim() : "",
          mac: typeof device.mac === "string" ? device.mac.trim() : "",
        }))
        .filter((d) => d.id && d.mac)
    : [];
}

export async function GET() {
  try {
    const sites = await listSites();
    return NextResponse.json({ sites: sanitizeSites(sites) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load sites" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const ssid = typeof body.wifi?.ssid === "string" ? body.wifi.ssid.trim() : "";
    const password = typeof body.wifi?.password === "string" ? body.wifi.password : "";
    const devices = parseDevices(body.devices);

    if (!name || !ssid || devices.length === 0) {
      return NextResponse.json(
        {
          error:
            "Site name, WiFi SSID, and at least one ESP32 ID and MAC address are required",
        },
        { status: 400 }
      );
    }

    await createSite({ name, wifi: { ssid, password }, devices });
    const sites = await listSites();
    return NextResponse.json({ sites: sanitizeSites(sites) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save site" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const ssid = typeof body.wifi?.ssid === "string" ? body.wifi.ssid.trim() : "";
    const password = typeof body.wifi?.password === "string" ? body.wifi.password : "";
    const devices = parseDevices(body.devices);

    if (!id || !name || !ssid || devices.length === 0) {
      return NextResponse.json(
        {
          error:
            "Site ID, name, WiFi SSID, and at least one ESP32 ID and MAC address are required",
        },
        { status: 400 }
      );
    }

    const updated = await updateSite(id, { name, wifi: { ssid, password }, devices });
    if (!updated) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }
    const sites = await listSites();
    return NextResponse.json({ sites: sanitizeSites(sites) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update site" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Site ID is required" }, { status: 400 });
    }

    const removed = await deleteSite(id);
    if (!removed) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }
    const sites = await listSites();
    return NextResponse.json({ sites: sanitizeSites(sites) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to remove site" }, { status: 500 });
  }
}
