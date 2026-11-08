import { NextResponse } from 'next/server';
import { setSessionCookie } from '@/app/lib/auth';
import { authenticateUser } from '@/app/lib/server-store';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password || password.length > 128) {
      return NextResponse.json({ error: '請輸入有效的電子郵件與密碼。' }, { status: 400 });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json({ error: '電子郵件或密碼錯誤。' }, { status: 401 });
    }

    const response = NextResponse.json({ user });
    setSessionCookie(response, user.id);
    return response;
  } catch {
    return NextResponse.json({ error: '無法登入，請稍後再試。' }, { status: 400 });
  }
}