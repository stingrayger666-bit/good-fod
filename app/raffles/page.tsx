'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { raffles } from '@/app/lib/point-activities';
import type { RaffleEntry, User } from '@/app/lib/types';

export default function RafflesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<RaffleEntry[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState('');

  useEffect(() => {
    fetch('/api/raffles', { cache: 'no-store' })
      .then(async (response) => {
        const result = (await response.json()) as { user?: User; entries?: RaffleEntry[] };
        if (response.ok) {
          setUser(result.user ?? null);
          setEntries(result.entries ?? []);
        }
      })
      .catch(() => setMessage('無法載入抽獎活動，請稍後再試。'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleJoin = async (raffleId: string) => {
    if (!user) {
      setMessage('請先登入會員才能參加抽獎');
      return;
    }

    setMessage('');
    setJoiningId(raffleId);
    try {
      const response = await fetch('/api/raffles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raffleId }),
      });
      const result = (await response.json()) as { error?: string; entry?: RaffleEntry; user?: User };
      if (!response.ok) throw new Error(result.error ?? '參加抽獎失敗');

      if (result.entry) setEntries((currentEntries) => [result.entry!, ...currentEntries]);
      if (result.user) setUser(result.user);
      window.dispatchEvent(new Event('snackrank:auth-changed'));
      setMessage('已成功參加，積分已從共用餘額扣除。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '參加抽獎失敗');
    } finally {
      setJoiningId('');
    }
  };

  return (
    <div className="page-stack">
      <h1 className="page-title">抽獎活動</h1>

      <div className="balance-banner">
        <div>
          <span>可用積分</span>
          <strong>{user ? user.points : '--'}</strong>
        </div>
        <Link href="/rewards" className="button secondary">前往積分兌換</Link>
      </div>

      {message ? <p className={message.includes('成功') ? 'form-success' : 'form-error'}>{message}</p> : null}
      {!user ? <p>登入後即可參加抽獎並使用積分兌換。</p> : null}

      {isLoading ? <p>載入活動中...</p> : null}
      <div className="activity-grid">
        {raffles.map((raffle) => (
          <div key={raffle.id} className="card activity-card">
            <div className="product-topline">
              <span className="tag">{raffle.status}</span>
              <strong>{raffle.points} 點</strong>
            </div>
            <h2>{raffle.name}</h2>
            <p>參加後將從兌換與抽獎共用的積分餘額扣除。</p>
            <button
              type="button"
              className="button primary"
              disabled={!user || isLoading || joiningId !== '' || user.points < raffle.points}
              onClick={() => void handleJoin(raffle.id)}
            >
              {joiningId === raffle.id ? '處理中...' : user && user.points < raffle.points ? '積分不足' : '參加抽獎'}
            </button>
          </div>
        ))}
      </div>

      {entries.length > 0 ? (
        <section className="activity-history">
          <h2>我的抽獎紀錄</h2>
          {entries.map((entry) => (
            <div key={entry.id} className="history-row">
              <div><strong>{entry.raffleName}</strong><span>{new Date(entry.createdAt).toLocaleDateString('zh-TW')}</span></div>
              <div><span>{entry.pointsSpent} 點</span><span className="tag">{entry.status}</span></div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
