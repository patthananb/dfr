
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request) {
  const data = await request.formData();
  const file = data.get('file');

  if (!file) {
    return NextResponse.json({ success: false, error: 'No file uploaded' });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Generate a unique filename
  const filename = `${Date.now()}-${file.name}`;
  const path = join(process.cwd(), 'data', filename);

  try {
    await writeFile(path, buffer);
    console.log(`File saved to ${path}`);
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json({ success: false, error: 'Error saving file' });
  }
}
