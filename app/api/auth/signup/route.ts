import { NextResponse } from 'next/server';
import { setSessionCookie } from '@/app/lib/auth';
import { createUser } from '@/app/lib/server-store';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown; email?: unknown; password?: unknown; inviteCode?: unknown };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode.trim().toUpperCase() : '';

    if (name.length < 2 || name.length > 30) {
      return NextResponse.json({ error: '暱稱需為 2 到 30 個字。' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '請輸入有效的電子郵件地址。' }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: '密碼長度需為 8 到 128 個字元。' }, { status: 400 });
    }
    if (inviteCode && !/^[A-F0-9]{10}$/.test(inviteCode)) {
      return NextResponse.json({ error: '邀請碼格式不正確，請確認後再試。' }, { status: 400 });
    }

    const result = await createUser({ name, email, password, inviteCode });
    if ('error' in result) {
      if (result.error === 'invalid_invite_code') {
        return NextResponse.json({ error: '找不到這組邀請碼，請確認後再試。' }, { status: 400 });
      }
      return NextResponse.json({ error: '此電子郵件已註冊，請直接登入。' }, { status: 409 });
    }

    const response = NextResponse.json(result, { status: 201 });
    setSessionCookie(response, result.user.id);
    return response;
  } catch {
    return NextResponse.json({ error: '無法建立帳號，請稍後再試。' }, { status: 400 });
  }
}