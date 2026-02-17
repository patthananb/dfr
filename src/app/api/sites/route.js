import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readSites, sanitizeSites, writeSites } from "@/lib/sites";

export async function GET() {
  try {
    const sites = await readSites();
    return NextResponse.json({ sites: sanitizeSites(sites) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load sites" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const wifiSsid =
      typeof body.wifi?.ssid === "string" ? body.wifi.ssid.trim() : "";
    const wifiPassword =
      typeof body.wifi?.password === "string" ? body.wifi.password : "";

    const devices = Array.isArray(body.devices)
      ? body.devices
          .map((device) => ({
            id: typeof device.id === "string" ? device.id.trim() : "",
            mac: typeof device.mac === "string" ? device.mac.trim() : "",
          }))
          .filter((device) => device.id && device.mac)
      : [];

    if (!name || !wifiSsid || devices.length === 0) {
      return NextResponse.json(
        {
          error:
            "Site name, WiFi SSID, and at least one ESP32 ID and MAC address are required",
        },
        { status: 400 }
      );
    }

    const sites = await readSites();
    const newSite = {
      id: randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      wifi: {
        ssid: wifiSsid,
        password: wifiPassword,
      },
      devices,
    };

    const updatedSites = [...sites, newSite];
    await writeSites(updatedSites);

    return NextResponse.json({ sites: sanitizeSites(updatedSites) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save site" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const siteId = typeof body.id === "string" ? body.id.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const wifiSsid =
      typeof body.wifi?.ssid === "string" ? body.wifi.ssid.trim() : "";
    const wifiPassword =
      typeof body.wifi?.password === "string" ? body.wifi.password : "";

    const devices = Array.isArray(body.devices)
      ? body.devices
          .map((device) => ({
            id: typeof device.id === "string" ? device.id.trim() : "",
            mac: typeof device.mac === "string" ? device.mac.trim() : "",
          }))
          .filter((device) => device.id && device.mac)
      : [];

    if (!siteId || !name || !wifiSsid || devices.length === 0) {
      return NextResponse.json(
        {
          error:
            "Site ID, name, WiFi SSID, and at least one ESP32 ID and MAC address are required",
        },
        { status: 400 }
      );
    }

    const sites = await readSites();
    const siteIndex = sites.findIndex((site) => site.id === siteId);
    if (siteIndex === -1) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const existing = sites[siteIndex];
    const updatedSite = {
      ...existing,
      name,
      wifi: {
        ssid: wifiSsid,
        password: wifiPassword.length > 0 ? wifiPassword : existing.wifi?.password,
      },
      devices,
    };

    const updatedSites = [...sites];
    updatedSites[siteIndex] = updatedSite;
    await writeSites(updatedSites);

    return NextResponse.json({ sites: sanitizeSites(updatedSites) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update site" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("id");
    if (!siteId) {
      return NextResponse.json({ error: "Site ID is required" }, { status: 400 });
    }

    const sites = await readSites();
    const updatedSites = sites.filter((site) => site.id !== siteId);
    if (updatedSites.length === sites.length) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    await writeSites(updatedSites);
    return NextResponse.json({ sites: sanitizeSites(updatedSites) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to remove site" },
      { status: 500 }
    );
  }
}
