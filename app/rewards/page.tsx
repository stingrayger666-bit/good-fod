'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { pointRewards } from '@/app/lib/point-activities';
import type { PointRedemption, User } from '@/app/lib/types';

export default function RewardsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [redemptions, setRedemptions] = useState<PointRedemption[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState('');

  useEffect(() => {
    fetch('/api/rewards', { cache: 'no-store' })
      .then(async (response) => {
        const result = (await response.json()) as { user?: User; redemptions?: PointRedemption[] };
        if (response.ok) {
          setUser(result.user ?? null);
          setRedemptions(result.redemptions ?? []);
        }
      })
      .catch(() => setMessage('無法載入兌換項目，請稍後再試。'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleRedeem = async (rewardId: string) => {
    if (!user) return;

    setMessage('');
    setRedeemingId(rewardId);
    try {
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId }),
      });
      const result = (await response.json()) as {
        error?: string;
        redemption?: PointRedemption;
        user?: User;
      };
      if (!response.ok) throw new Error(result.error ?? '兌換失敗');

      if (result.redemption) setRedemptions((current) => [result.redemption!, ...current]);
      if (result.user) setUser(result.user);
      window.dispatchEvent(new Event('snackrank:auth-changed'));
      setMessage('兌換申請已建立，積分已從共用餘額扣除。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '兌換失敗');
    } finally {
      setRedeemingId('');
    }
  };

  return (
    <div className="page-stack">
      <h1 className="page-title">積分兌換</h1>

      <div className="balance-banner">
        <div>
          <span>可用積分</span>
          <strong>{user ? user.points : '--'}</strong>
        </div>
        <Link href="/raffles" className="button secondary">前往抽獎活動</Link>
      </div>

      <p className="activity-note">兌換和抽獎共用同一個積分餘額；送出兌換後會建立待核發紀錄。</p>
      {message ? <p className={message.includes('已建立') ? 'form-success' : 'form-error'}>{message}</p> : null}
      {!user ? <p>登入後即可使用積分兌換或參加抽獎。</p> : null}
      {isLoading ? <p>載入兌換項目中...</p> : null}

      <div className="activity-grid">
        {pointRewards.map((reward) => (
          <div key={reward.id} className="card activity-card">
            <div className="product-topline"><span className="tag">兌換申請</span><strong>{reward.points} 點</strong></div>
            <h2>{reward.name}</h2>
            <p>{reward.description}</p>
            {user ? (
              <button
                type="button"
                className="button primary"
                disabled={isLoading || redeemingId !== '' || user.points < reward.points}
                onClick={() => void handleRedeem(reward.id)}
              >
                {redeemingId === reward.id ? '處理中...' : user.points < reward.points ? '積分不足' : '申請兌換'}
              </button>
            ) : (
              <Link href="/login" className="button secondary">登入後兌換</Link>
            )}
          </div>
        ))}
      </div>

      {redemptions.length > 0 ? (
        <section className="activity-history">
          <h2>我的兌換紀錄</h2>
          {redemptions.map((redemption) => (
            <div key={redemption.id} className="history-row">
              <div><strong>{redemption.rewardName}</strong><span>{new Date(redemption.createdAt).toLocaleDateString('zh-TW')}</span></div>
              <div><span>{redemption.pointsSpent} 點</span><span className="tag">{redemption.status}</span></div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}