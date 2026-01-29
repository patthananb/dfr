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
