
import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request) {
  const dataDir = join(process.cwd(), 'data');
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('file');

  try {
    if (filename) {
      // If a filename is provided, read and return that file's content
      const filePath = join(dataDir, filename);
      const fileContent = await readFile(filePath, 'utf-8');
      return NextResponse.json({ success: true, files: [fileContent] });
    } else {
      // Otherwise, return the list of filenames
      const filenames = await readdir(dataDir);
      return NextResponse.json({ success: true, filenames });
    }
  } catch (error) {
    console.error('Error reading data files:', error);
    return NextResponse.json({ success: false, error: 'Error reading data files' });
  }
}
