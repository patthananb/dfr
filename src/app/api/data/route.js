
import { NextResponse } from 'next/server';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { join, basename } from 'path';

const DATA_DIR = join(process.cwd(), 'data');

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('file');
  const latest = searchParams.get('latest');

  try {
    if (filename) {
      // If a filename is provided, read and return that file's content
      const safe = basename(filename);
      const filePath = join(DATA_DIR, safe);
      const fileContent = await readFile(filePath, 'utf-8');
      return NextResponse.json({ success: true, files: [fileContent] });
    }

    // List all data files
    const filenames = (await readdir(DATA_DIR)).filter(
      f => f.endsWith('.json') && f !== 'heartbeat.json' && f !== 'sites.json' && f !== 'force-updates.json'
    );

    // ?latest=adc_live — return the most recent file matching the prefix
    if (latest) {
      const matching = filenames
        .filter(f => f.startsWith(latest))
        .sort()
        .reverse();
      if (matching.length > 0) {
        return NextResponse.json({ success: true, latestFile: matching[0] });
      }
      return NextResponse.json({ success: true, latestFile: null });
    }

    return NextResponse.json({ success: true, filenames });
  } catch (error) {
    console.error('Error reading data files:', error);
    return NextResponse.json({ success: false, error: 'Error reading data files' });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    const { espId, faultType, faultLocation, date, time, data } = body;
    if (!espId || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'espId and data[] are required' },
        { status: 400 }
      );
    }

    // Build filename: {faultType}_{faultLocation}_{YYYYMMDD}_{HHmmss}.json
    const safeType = (faultType || 'adc_live').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeLoc  = (faultLocation || espId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const now = new Date();
    const datePart = date
      ? date.replace(/-/g, '')
      : now.toISOString().slice(0, 10).replace(/-/g, '');
    const timePart = time
      ? time.replace(/:/g, '')
      : now.toISOString().slice(11, 19).replace(/:/g, '');

    const filename = `${safeType}_${safeLoc}_${datePart}_${timePart}.json`;
    const filePath = join(DATA_DIR, filename);

    // Write the data file (same schema as existing fault files)
    const fileContent = {
      faultType: faultType || 'adc_live',
      faultLocation: faultLocation || espId,
      date: date || now.toISOString().slice(0, 10),
      time: time || now.toISOString().slice(11, 19),
      ...(body.sampleRateHz && { sampleRateHz: body.sampleRateHz }),
      data,
    };

    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(filePath, JSON.stringify(fileContent, null, 2));

    console.log(`[data] Saved ${filename} (${data.length} samples from ${espId})`);
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error('Error saving data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save data' },
      { status: 500 }
    );
  }
}
