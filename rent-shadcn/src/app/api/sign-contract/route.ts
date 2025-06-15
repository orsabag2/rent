import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';

export async function POST(req: NextRequest) {
  try {
    const { id, signature } = await req.json();
    if (!id || !signature) {
      return NextResponse.json({ error: 'Missing id or signature' }, { status: 400 });
    }
    // Load the original PDF
    const pdfPath = path.join(process.cwd(), 'public', 'contracts', `${id}.pdf`);
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    // Embed the signature image
    const pngImageBytes = Buffer.from(signature.split(',')[1], 'base64');
    const pngImage = await pdfDoc.embedPng(pngImageBytes);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    // RTL: Place signature at the bottom right for landlord
    const pageWidth = 595.28; // A4 width in points
    const rightMargin = 60;
    const sigWidth = 120;
    const sigHeight = 40;
    const landlordX = pageWidth - rightMargin - sigWidth; // 595.28 - 60 - 180 = 355.28
    // Read tenantRoleY from metadata JSON
    let tenantRoleY = 120; // default fallback
    try {
      const metadataPath = pdfPath.replace(/\.pdf$/, '.json');
      const metadataJson = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataJson);
      if (metadata.tenantRoleY) tenantRoleY = metadata.tenantRoleY;
    } catch (e) {
      // If metadata not found, use default
    }
    const tenantSigY = tenantRoleY - 5;
    lastPage.drawImage(pngImage, {
      x: landlordX,
      y: tenantSigY,
      width: sigWidth,
      height: sigHeight,
    });
    // Save the signed PDF
    const signedPdfBytes = await pdfDoc.save();
    const signedPdfPath = path.join(process.cwd(), 'public', 'contracts', `${id}-signed.pdf`);
    await fs.writeFile(signedPdfPath, signedPdfBytes);
    const signedPdfUrl = `/contracts/${id}-signed.pdf`;
    return NextResponse.json({ signedPdfUrl });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
} 