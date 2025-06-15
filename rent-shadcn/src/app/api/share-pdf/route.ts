import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Ensure contracts directory exists
    const contractsDir = path.join(process.cwd(), 'public', 'contracts');
    await fs.mkdir(contractsDir, { recursive: true });
    // Generate unique filename
    const filename = `${randomUUID()}.pdf`;
    const filePath = path.join(contractsDir, filename);
    // Save file
    await fs.writeFile(filePath, buffer);
    const metadataJson = formData.get('metadata');
    if (metadataJson) {
      const metadataPath = filePath.replace(/\.pdf$/, '.json');
      await fs.writeFile(metadataPath, metadataJson);
    }
    // Return public URL
    const url = `/contracts/${filename}`;
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
} 