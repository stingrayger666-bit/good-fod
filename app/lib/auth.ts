import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById } from '@/app/lib/server-store';
import type { User } from '@/app/lib/types';

export const sessionCookieName = 'snackrank_session';
const sessionDurationSeconds = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be configured in production');
  }

  return 'local-development-secret-change-before-deploying';
}

export function getClientIpHash(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const forwardedAddresses = forwardedFor?.split(',').map((address) => address.trim()).filter(Boolean);
  const clientAddress =
    request.headers.get('cf-connecting-ip')?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    forwardedAddresses?.[0] ||
    'unknown';

  return createHmac('sha256', getSessionSecret()).update(clientAddress.toLowerCase()).digest('hex');
}

function sign(payload: string) {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function createSession(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({ userId, expiresAt: Date.now() + sessionDurationSeconds * 1000 }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readSession(token: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expectedSignature = Buffer.from(sign(payload));
  const receivedSignature = Buffer.from(signature);
  if (expectedSignature.length !== receivedSignature.length || !timingSafeEqual(expectedSignature, receivedSignature)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      userId: string;
      expiresAt: number;
    };
    return session.expiresAt > Date.now() ? session.userId : null;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(sessionCookieName, createSession(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionDurationSeconds,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function getAuthenticatedUser(): Promise<User | null> {
  const token = cookies().get(sessionCookieName)?.value;
  if (!token) return null;

  const userId = readSession(token);
  return userId ? getUserById(userId) : null;
}