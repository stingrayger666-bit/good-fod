import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/lib/auth';

export async function GET() {
  return NextResponse.json({ user: await getAuthenticatedUser() });
}