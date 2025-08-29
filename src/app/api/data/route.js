
import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request) {
  const dataDir = join(process.cwd(), 'data');
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('file');
  const latest = searchParams.get('latest');

  try {
    if (filename) {
      // If a filename is provided, read and return that file's content
      const filePath = join(dataDir, filename);
      const fileContent = await readFile(filePath, 'utf-8');
      return NextResponse.json({ success: true, files: [fileContent] });
    } else if (latest === 'true') {
      // Return the latest fault data file
      const filenames = await readdir(dataDir);
      const faultFiles = filenames.filter(name => name.startsWith('fault_') && name.endsWith('.json'));
      
      if (faultFiles.length === 0) {
        return NextResponse.json({ success: false, error: 'No fault data files found' });
      }
      
      // Sort files by timestamp (embedded in filename) to get the latest
      const sortedFiles = faultFiles.sort((a, b) => {
        // Extract timestamp from filename: fault_type_location_YYYYMMDD_HHMMSS.json
        const timestampA = a.split('_').slice(-2).join('');
        const timestampB = b.split('_').slice(-2).join('');
        return timestampB.localeCompare(timestampA); // Descending order (latest first)
      });
      
      const latestFile = sortedFiles[0];
      const filePath = join(dataDir, latestFile);
      const fileContent = await readFile(filePath, 'utf-8');
      return NextResponse.json({ success: true, latestFile, files: [fileContent] });
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
