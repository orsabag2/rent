import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { rgb } from 'pdf-lib';

export async function POST(req: NextRequest) {
  try {
    const { summaryText } = await req.json();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 14;
    // Split summaryText into lines
    const lines = summaryText.split('\n');
    let y = height - 40;
    for (const line of lines) {
      page.drawText(line, {
        x: width - 40,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= fontSize + 6;
    }
    const pdfBytes = await pdfDoc.save();
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="contract.pdf"',
      },
    });
  } catch (err) {
    const error = err as Error;
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
