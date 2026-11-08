'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, inviteCode }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? '註冊失敗');

      window.dispatchEvent(new Event('snackrank:auth-changed'));
      router.replace('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : '註冊失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="content-box">
      <h1 className="page-title">註冊</h1>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">暱稱</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：阿麟" />
        </div>

        <div className="field">
          <label htmlFor="email">電子郵件</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>

        <div className="field">
          <label htmlFor="password">密碼</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 碼" />
        </div>

        <div className="field">
          <label htmlFor="inviteCode">邀請碼（選填）</label>
          <input
            id="inviteCode"
            type="text"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            placeholder="輸入朋友分享的 10 碼邀請碼"
            maxLength={10}
            autoCapitalize="characters"
          />
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-actions">
          <button type="submit" className="button primary" disabled={isSubmitting}>
            {isSubmitting ? '建立中...' : '建立帳號'}
          </button>
        </div>
      </form>

      <p>
        已有帳號？{' '}
        <Link href="/login" style={{ color: '#2f6fed', fontWeight: 700 }}>
          前往登入
        </Link>
      </p>
    </div>
  );
}
