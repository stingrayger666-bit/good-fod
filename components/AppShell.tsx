'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { User } from '@/app/lib/types';

const navItems = [
  { href: '/', label: '首頁' },
  { href: '/feed', label: '評價圖鑑' },
  { href: '/review/new', label: '分享評價' },
  { href: '/raffles', label: '抽獎' },
  { href: '/rewards', label: '積分兌換' },
  { href: '/leaderboard', label: '排行榜' },
  { href: '/map', label: '超商地圖' },
  { href: '/profile', label: '個人頁面' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const refreshUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        const result = (await response.json()) as { user: User | null };
        setUser(result.user);
      } catch {
        setUser(null);
      }
    };

    void refreshUser();
    window.addEventListener('snackrank:auth-changed', refreshUser);
    return () => window.removeEventListener('snackrank:auth-changed', refreshUser);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/';
  };

  return (
    <>
      <header className="topbar">
        <div className="brand-wrap">
          <Link href="/" className="brand">
            食飲超商
          </Link>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="auth-actions">
          {user ? (
            <>
              <Link href="/profile" className="button secondary">
                {user.name} · {user.points} 點
              </Link>
              <button type="button" className="button primary" onClick={handleLogout}>
                登出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="button secondary">
                登入
              </Link>
              <Link href="/signup" className="button primary">
                註冊
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="page-shell">{children}</main>
    </>
  );
}
