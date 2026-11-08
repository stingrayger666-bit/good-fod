'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { reviewCategories } from '@/app/lib/review-categories';
import type { User } from '@/app/lib/types';

type AnonymousIdentity = {
  id: string;
  name: string;
  redraws: number;
  redrawsRemaining: number;
  expiresAt: string;
};

export default function NewReviewPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [product, setProduct] = useState('');
  const [store, setStore] = useState('7-11');
  const [category, setCategory] = useState('飲料');
  const [rating, setRating] = useState(50);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [anonymousIdentity, setAnonymousIdentity] = useState<AnonymousIdentity | null>(null);
  const [isIdentityLoading, setIsIdentityLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result: { user: User | null }) => setCurrentUser(result.user))
      .catch(() => setCurrentUser(null))
      .finally(() => setIsCheckingSession(false));
  }, []);

  const startAnonymousMode = async () => {
    setIsIdentityLoading(true);
    setError('');
    try {
      const response = await fetch('/api/anonymous', { cache: 'no-store' });
      const result = (await response.json()) as { identity?: AnonymousIdentity; error?: string };
      if (!response.ok || !result.identity) throw new Error(result.error ?? '無法建立匿名身份');
      setAnonymousIdentity(result.identity);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法建立匿名身份');
    } finally {
      setIsIdentityLoading(false);
    }
  };

  const redrawAnonymousName = async () => {
    setIsIdentityLoading(true);
    setError('');
    try {
      const response = await fetch('/api/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: anonymousIdentity?.id }),
      });
      const result = (await response.json()) as { identity?: AnonymousIdentity; error?: string };
      if (response.status === 409) {
        const replacementResponse = await fetch('/api/anonymous', { cache: 'no-store' });
        const replacement = (await replacementResponse.json()) as { identity?: AnonymousIdentity; error?: string };
        if (!replacementResponse.ok || !replacement.identity) {
          throw new Error(replacement.error ?? '無法取得新的匿名名稱');
        }
        setAnonymousIdentity(replacement.identity);
        setError('原匿名名稱已失效，已替換成新名稱。');
        return;
      }
      if (!response.ok || !result.identity) throw new Error(result.error ?? '無法重新產生匿名名稱');
      setAnonymousIdentity(result.identity);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法重新產生匿名名稱');
    } finally {
      setIsIdentityLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (images.length > 5 || images.some((image) => image.size > 5 * 1024 * 1024)) {
      setError('最多上傳 5 張圖片，每張不可超過 5 MB。');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('product', product);
      formData.set('store', store);
      formData.set('category', category);
      formData.set('rating', String(rating));
      formData.set('content', content);
      if (anonymousIdentity) {
        formData.set('anonymous', 'true');
        formData.set('anonymousIdentityId', anonymousIdentity.id);
      }
      images.forEach((image) => formData.append('images', image));

      const response = await fetch('/api/reviews', {
        method: 'POST',
        body: formData,
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? '發表失敗');

      window.dispatchEvent(new Event('snackrank:auth-changed'));
      router.replace('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : '發表失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return <div className="content-box">正在確認會員狀態...</div>;
  }

  if (!currentUser && !anonymousIdentity) {
    return (
      <div className="content-box">
        <h1 className="page-title">分享評價</h1>
        <p>登入會員或使用匿名身份分享商品心得；每篇匿名評價都會使用不同名稱。</p>
        <div className="row">
          <Link href="/login" className="button primary">會員登入</Link>
          <Link href="/signup" className="button secondary">註冊會員</Link>
          <button type="button" className="button secondary" onClick={() => void startAnonymousMode()} disabled={isIdentityLoading}>
            {isIdentityLoading ? '建立匿名身份中...' : '匿名發表'}
          </button>
        </div>
        {error ? <p className="form-error" style={{ marginTop: '1rem' }}>{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="content-box">
      <h1 className="page-title">分享評價</h1>
      {anonymousIdentity ? (
        <div className="row" style={{ alignItems: 'center', marginBottom: '1.25rem' }}>
          <span>匿名名稱：<strong>{anonymousIdentity.name}</strong></span>
          <span style={{ color: '#6b7280' }}>每篇評價使用不同名稱</span>
          <span style={{ color: '#6b7280' }}>可重抽 {anonymousIdentity.redrawsRemaining} 次</span>
          <button
            type="button"
            className="button secondary"
            onClick={() => void redrawAnonymousName()}
            disabled={isIdentityLoading || anonymousIdentity.redrawsRemaining === 0}
          >
            {isIdentityLoading ? '處理中...' : '重新抽名字'}
          </button>
          {currentUser ? (
            <button type="button" className="button secondary" onClick={() => setAnonymousIdentity(null)}>
              改用會員身份
            </button>
          ) : null}
        </div>
      ) : currentUser ? (
        <button type="button" className="button secondary" onClick={() => void startAnonymousMode()} disabled={isIdentityLoading}>
          {isIdentityLoading ? '建立匿名身份中...' : '改用匿名身份發表'}
        </button>
      ) : null}

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="store">超商名稱</label>
          <select id="store" value={store} onChange={(event) => setStore(event.target.value)}>
            <option value="7-11">7-11</option>
            <option value="FamilyMart">FamilyMart</option>
            <option value="OK Mart">OK Mart</option>
            <option value="萊爾富">萊爾富</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="category">商品類別</label>
          <select id="category" value={category} onChange={(event) => setCategory(event.target.value)}>
            {reviewCategories.map((reviewCategory) => (
              <option key={reviewCategory} value={reviewCategory}>{reviewCategory}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="product">商品名稱</label>
          <input id="product" type="text" value={product} onChange={(event) => setProduct(event.target.value)} placeholder="例如：抹茶拿鐵" />
        </div>

        <div className="field">
          <label htmlFor="rating">評分（0–100 分）</label>
          <input
            id="rating"
            type="number"
            min={0}
            max={100}
            step={1}
            required
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
          />
        </div>

        <div className="field">
          <label htmlFor="content">心得（選填）</label>
          <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="分享你的購買心得、口感、推薦程度..." />
        </div>

        <div className="field">
          <label htmlFor="images">商品照片</label>
          <input
            id="images"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setImages(Array.from(event.target.files ?? []).slice(0, 5))}
          />
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {images.length > 0
              ? `已選擇 ${images.length} 張：${images.map((image) => image.name).join('、')}`
              : '可選擇 JPG、PNG 或 WebP，最多 5 張、每張上限 5 MB'}
          </span>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
          經驗值：評分 1 點、心得文字 5 點；超過 20 字再加 10 點，每張圖片 5 點。消費積分獎勵另計。
        </p>

        <div className="form-actions">
          <button type="submit" className="button primary" disabled={isSubmitting}>
            {isSubmitting ? '發布中...' : '發布評價'}
          </button>
        </div>
      </form>
    </div>
  );
}
