import { NextResponse } from "next/server";
import { listFaults } from "@/lib/repos/faults";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteFilter = searchParams.get("site") || "";
    const faults = await listFaults({ siteFilter });
    return NextResponse.json({ faults });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load faults" }, { status: 500 });
  }
}
