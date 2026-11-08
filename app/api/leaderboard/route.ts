import { NextResponse } from 'next/server';
import { getDailyLeaderboard } from '@/app/lib/server-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getDailyLeaderboard());
}