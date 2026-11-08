import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getAuthenticatedUser, getClientIpHash } from '@/app/lib/auth';
import { reviewCategories } from '@/app/lib/review-categories';
import { createReviewForUser, getReviews } from '@/app/lib/server-store';

export const dynamic = 'force-dynamic';

const stores = new Set(['7-11', 'FamilyMart', 'OK Mart', '萊爾富']);
const categories = new Set<string>(reviewCategories);
const maxImageSize = 5 * 1024 * 1024;

function getImageExtension(type: string, bytes: Uint8Array) {
  if (type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (
    type === 'image/png' &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return 'png';
  if (
    type === 'image/webp' &&
    Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF' &&
    Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP'
  ) return 'webp';
  return null;
}

export async function GET() {
  return NextResponse.json({ reviews: await getReviews() });
}

export async function POST(request: Request) {
  const imagePaths: string[] = [];
  try {
    const formData = await request.formData();
    const useAnonymous = formData.get('anonymous') === 'true';
    const user = useAnonymous ? null : await getAuthenticatedUser();
    const anonymousIdentityId = formData.get('anonymousIdentityId');
    if (!user && typeof anonymousIdentityId !== 'string') {
      return NextResponse.json({ error: '請先取得匿名名稱，再發表評價。' }, { status: 409 });
    }

    const product = String(formData.get('product') ?? '').trim();
    const store = String(formData.get('store') ?? '');
    const category = String(formData.get('category') ?? '');
    const rating = Number(formData.get('rating'));
    const content = String(formData.get('content') ?? '').trim();
    const images = [...formData.getAll('images'), formData.get('image')].filter(
      (image): image is File => image instanceof File && image.size > 0,
    );

    if (!product || product.length > 80) {
      return NextResponse.json({ error: '商品名稱需為 1 到 80 個字。' }, { status: 400 });
    }
    if (!stores.has(store)) {
      return NextResponse.json({ error: '請選擇有效的超商。' }, { status: 400 });
    }
    if (!categories.has(category)) {
      return NextResponse.json({ error: '請選擇有效的商品類別。' }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 0 || rating > 100) {
      return NextResponse.json({ error: '評分需介於 0 到 100 分。' }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: '心得內容不可超過 2000 個字。' }, { status: 400 });
    }
    if (images.length > 5) {
      return NextResponse.json({ error: '每篇評價最多上傳 5 張圖片。' }, { status: 400 });
    }

    const validatedImages: { bytes: Uint8Array; extension: string }[] = [];
    for (const image of images) {
      if (image.size > maxImageSize) {
        return NextResponse.json({ error: '每張圖片大小不可超過 5 MB。' }, { status: 400 });
      }

      const imageBytes = new Uint8Array(await image.arrayBuffer());
      const extension = getImageExtension(image.type, imageBytes);
      if (!extension) {
        return NextResponse.json({ error: '圖片格式不符，請上傳 JPG、PNG 或 WebP。' }, { status: 400 });
      }

      validatedImages.push({ bytes: imageBytes, extension });
    }

    const imageUrls: string[] = [];
    for (const image of validatedImages) {
      const filename = `${randomUUID()}.${image.extension}`;
      const imagePath = path.join(process.cwd(), '.data', 'uploads', filename);
      await mkdir(path.dirname(imagePath), { recursive: true });
      await writeFile(imagePath, image.bytes, { flag: 'wx' });
      imagePaths.push(imagePath);
      imageUrls.push(`/api/reviews/images/${filename}`);
    }

    const result = await createReviewForUser({
      userId: user?.id ?? null,
      anonymousIdentityId: user ? undefined : anonymousIdentityId as string,
      anonymousIpHash: user ? undefined : getClientIpHash(request),
      product,
      category,
      store,
      rating,
      content,
      imageUrls,
    });
    if ('error' in result) {
      await Promise.all(imagePaths.map((imagePath) => unlink(imagePath).catch(() => {})));
      if (result.error === 'anonymous_reservation_invalid') {
        return NextResponse.json({ error: '匿名名稱已使用或逾時，請重新取得名稱。' }, { status: 409 });
      }
      return NextResponse.json({ error: '會員資料不存在，請重新登入。' }, { status: 401 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    await Promise.all(imagePaths.map((imagePath) => unlink(imagePath).catch(() => {})));
    return NextResponse.json({ error: '無法發表評價，請稍後再試。' }, { status: 400 });
  }
}