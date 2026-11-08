'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Review, User } from '@/app/lib/types';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteCodeCopied, setInviteCodeCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me', { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/reviews', { cache: 'no-store' }).then((response) => response.json()),
    ])
      .then(([userResult, reviewResult]: [{ user: User | null }, { reviews: Review[] }]) => {
        setUser(userResult.user);
        setReviews(reviewResult.reviews.filter((review) => review.userId === userResult.user?.id));
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="content-box">正在載入會員資料...</div>;
  }

  if (!user) {
    return (
      <div className="content-box">
        <h1 className="page-title">個人頁面</h1>
        <p>請先登入會員才能查看你的個人資料。</p>
        <Link href="/login" className="button primary" style={{ marginTop: '1rem' }}>
          前往登入
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <h1 className="page-title">個人頁面</h1>

      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>{user.name}</h2>
            <p style={{ margin: '0.5rem 0 0', color: '#6b7280' }}>會員階級：{user.level}</p>
            <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>
              會員代碼：{String(user.memberNumber).padStart(8, '0')}
            </p>
          </div>
          <div className="tag">{user.points} 積分</div>
        </div>

        <div className="invite-code-row">
          <div>
            <span className="stat-label">你的邀請碼</span>
            <strong className="invite-code">{user.inviteCode}</strong>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(user.inviteCode);
              setInviteCodeCopied(true);
            }}
          >
            {inviteCodeCopied ? '已複製' : '複製邀請碼'}
          </button>
        </div>
        <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
          朋友使用你的邀請碼註冊後，你可獲得 20 點。
        </p>

        <div className="kpi-row">
          <div className="kpi">
            <span>發文數</span>
            <strong>{reviews.length}</strong>
          </div>
          <div className="kpi">
            <span>累積積分</span>
            <strong>{user.points}</strong>
          </div>
          <div className="kpi">
            <span>累積經驗值</span>
            <strong>{user.experience}</strong>
          </div>
          <div className="kpi">
            <span>今日經驗值</span>
            <strong>{user.dailyExperience}</strong>
          </div>
          <div className="kpi">
            <span>會員階級</span>
            <strong>{user.level}</strong>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>我的評價</h3>
        {reviews.length === 0 ? (
          <p style={{ color: '#6b7280' }}>還沒有發表過評價。</p>
        ) : (
          <div className="page-stack">
            {reviews.map((review) => (
              <div key={review.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem' }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{review.product}</strong>
                  <div className="row" style={{ gap: '0.5rem' }}>
                    <span className="tag">{review.category ?? '未分類'}</span>
                    <span className="tag">{review.store}</span>
                  </div>
                </div>
                <p style={{ margin: '0.5rem 0' }}>評分：{review.rating} / 100</p>
                {review.content ? <p style={{ margin: 0, color: '#4b5563' }}>{review.content}</p> : null}
                {(review.imageUrls?.length ? review.imageUrls : review.imageUrl ? [review.imageUrl] : []).length > 0 ? (
                  <div className="review-photos">
                    {(review.imageUrls?.length ? review.imageUrls : review.imageUrl ? [review.imageUrl] : []).map((imageUrl, index) => (
                      <Image
                        key={imageUrl}
                        src={imageUrl}
                        alt={`${review.product} 商品照片 ${index + 1}`}
                        width={960}
                        height={720}
                        unoptimized
                        className="review-photo"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
