import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { id, email, role } = await req.json();
    if (!id || !email || !role) {
      return NextResponse.json({ error: 'Missing id, email, or role' }, { status: 400 });
    }
    const pdfPath = path.join(process.cwd(), 'public', 'contracts', `${id}-signed.pdf`);
    const pdfBytes = await fs.readFile(pdfPath);
    // Configure nodemailer (example with Gmail, replace with your SMTP config)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const subject = role === 'landlord' ? 'חוזה חתום מהשוכר' : 'עותק החוזה החתום שלך';
    const text = role === 'landlord'
      ? 'שלום, מצורף חוזה השכירות החתום מהשוכר.'
      : 'שלום, מצורף עותק החוזה החתום שלך.';
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      text,
      attachments: [
        {
          filename: 'signed-contract.pdf',
          content: pdfBytes,
        },
      ],
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
} 