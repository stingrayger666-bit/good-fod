'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { reviewCategories } from '@/app/lib/review-categories';
import type { Review, User } from '@/app/lib/types';

const stores = ['7-11', 'FamilyMart', 'OK Mart', '萊爾富'];

export default function FeedPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/reviews', { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/auth/me', { cache: 'no-store' }).then((response) => response.json()),
    ])
      .then(([reviewResult, userResult]: [{ reviews: Review[] }, { user: User | null }]) => {
        setReviews(reviewResult.reviews);
        setCurrentUser(userResult.user);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredReviews = categoryFilter
    ? reviews.filter((review) => review.category === categoryFilter)
    : reviews;

  return (
    <div className="page-stack">
      <div className="catalog-heading">
        <div>
          <span className="eyebrow">按超商分類瀏覽</span>
          <h1 className="page-title">評價圖鑑</h1>
        </div>
        <div className="catalog-tools">
          <label className="catalog-filter" htmlFor="catalog-category">
            <span>商品類別</span>
            <select id="catalog-category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">全部類別</option>
              {reviewCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <span className="catalog-total">共 {filteredReviews.length} 則評價</span>
        </div>
      </div>
      {isLoading ? <p>載入評價中...</p> : null}
      <div className="store-review-sections">
        {stores.map((store) => {
          const storeReviews = filteredReviews.filter((review) => review.store === store);
          const sectionId = `store-${store.replace(/[^a-z0-9]/gi, '-')}`;

          return (
            <section className="store-review-section" key={store} aria-labelledby={sectionId}>
              <header className="store-section-heading">
                <h2 id={sectionId}>{store}</h2>
                <span>{storeReviews.length} 則評價</span>
              </header>
              {storeReviews.length > 0 ? (
                <div className="review-catalog-grid">
                  {storeReviews.map((review) => (
                    <article key={review.id} className="card review-catalog-card">
                      <div className="review-catalog-meta">
                        <span className="tag">{review.category ?? '未分類'}</span>
                        <span className="catalog-rating">{review.rating}<small> / 100</small></span>
                      </div>
                      <h3>{review.product}</h3>
                      <p className="catalog-author">{review.isAnonymous ? `${review.userName}（匿名）` : review.userName}</p>
                      {review.content ? <p className="catalog-review-text">{review.content}</p> : null}
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
                    </article>
                  ))}
                </div>
              ) : (
                <p className="store-review-empty">
                  {isLoading ? '載入評價中...' : '目前還沒有評價'}
                </p>
              )}
            </section>
          );
        })}
      </div>

      {!currentUser ? (
        <p style={{ color: '#6b7280' }}>登入或匿名發表評價，和大家分享超商好物。</p>
      ) : null}
    </div>
  );
}
