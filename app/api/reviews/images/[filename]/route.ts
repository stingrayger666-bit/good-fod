import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const imageTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function GET(_request: Request, { params }: { params: { filename: string } }) {
  const match = /^([0-9a-f-]{36})\.(jpg|png|webp)$/.exec(params.filename);
  if (!match) {
    return NextResponse.json({ error: '找不到圖片。' }, { status: 404 });
  }

  try {
    const imagePath = path.join(process.cwd(), '.data', 'uploads', params.filename);
    const image = await readFile(imagePath);
    return new NextResponse(image, {
      headers: {
        'Content-Type': imageTypes[match[2]],
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: '找不到圖片。' }, { status: 404 });
  }
}