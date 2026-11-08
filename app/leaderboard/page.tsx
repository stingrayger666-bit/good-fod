'use client';

import { useEffect, useState } from 'react';
import type { User } from '@/app/lib/types';

type LeaderboardData = {
  date: string;
  users: User[];
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData>({ date: '', users: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const refreshLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard', { cache: 'no-store' });
        if (!response.ok) throw new Error('排行榜載入失敗');
        setLeaderboard((await response.json()) as LeaderboardData);
      } finally {
        setIsLoading(false);
      }
    };

    void refreshLeaderboard();
    const interval = window.setInterval(() => void refreshLeaderboard(), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="page-stack">
      <div className="leaderboard-heading">
        <div>
          <span className="eyebrow">每日經驗排行</span>
          <h1 className="page-title">排行榜</h1>
        </div>
        <p>每日凌晨 0 點（台灣時間）更新</p>
      </div>

      {leaderboard.date ? <p className="activity-note">統計日期：{leaderboard.date}</p> : null}
      {isLoading ? <p>載入排行榜中...</p> : null}
      {!isLoading && leaderboard.users.length === 0 ? <p>今天還沒有人獲得經驗值。</p> : null}

      {leaderboard.users.length > 0 ? (
        <div className="leaderboard-list">
          {leaderboard.users.map((user, index) => (
            <article className="leaderboard-row" key={user.id}>
              <strong className="leaderboard-rank">{String(index + 1).padStart(2, '0')}</strong>
              <div className="leaderboard-member">
                <strong>{user.name}</strong>
                <span>{user.level} · 累積 {user.experience} 經驗值</span>
              </div>
              <strong className="leaderboard-score">{user.dailyExperience} <span>EXP</span></strong>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}