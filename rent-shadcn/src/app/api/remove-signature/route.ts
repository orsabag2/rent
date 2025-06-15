import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const signedPdfPath = path.join(process.cwd(), 'public', 'contracts', `${id}-signed.pdf`);
    try {
      await fs.unlink(signedPdfPath);
    } catch (err) {
      // If file doesn't exist, ignore
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
} 