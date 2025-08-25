
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request) {
  try {
    const body = await request.json();
    const { faultType, faultLocation, date, time, data } = body;

    if (!faultType || !faultLocation || !date || !time || !Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const sanitizedDate = date.replace(/-/g, '_');
    const sanitizedTime = time.replace(/:/g, '');
    const filename = `fault_${faultType}_${faultLocation}_${sanitizedDate}_${sanitizedTime}.json`;
    const path = join(process.cwd(), 'data', filename);

    await writeFile(path, JSON.stringify(body));
    console.log(`File saved to ${path}`);
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json(
      { success: false, error: 'Error saving file' },
      { status: 500 }
    );
  }
}
