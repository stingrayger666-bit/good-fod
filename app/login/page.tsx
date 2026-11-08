'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? '登入失敗');

      window.dispatchEvent(new Event('snackrank:auth-changed'));
      router.replace('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="content-box">
      <h1 className="page-title">登入</h1>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">電子郵件</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>

        <div className="field">
          <label htmlFor="password">密碼</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-actions">
          <button type="submit" className="button primary" disabled={isSubmitting}>
            {isSubmitting ? '登入中...' : '登入'}
          </button>
        </div>
      </form>

      <p>
        還沒有帳號？{' '}
        <Link href="/signup" style={{ color: '#2f6fed', fontWeight: 700 }}>
          立即註冊
        </Link>
      </p>
    </div>
  );
}
