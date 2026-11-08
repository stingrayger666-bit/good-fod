import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/lib/auth';
import { raffles } from '@/app/lib/point-activities';
import { enterRaffleForUser, getPointActivities } from '@/app/lib/server-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: '請先登入會員。' }, { status: 401 });

  const { raffleEntries } = await getPointActivities(user.id);
  return NextResponse.json({ user, raffles, entries: raffleEntries });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: '請先登入會員。' }, { status: 401 });

  try {
    const body = (await request.json()) as { raffleId?: unknown };
    const raffle = raffles.find((item) => item.id === body.raffleId && item.status === '開放中');
    if (!raffle) return NextResponse.json({ error: '找不到開放中的抽獎活動。' }, { status: 404 });

    const result = await enterRaffleForUser({
      userId: user.id,
      raffleId: raffle.id,
      raffleName: raffle.name,
      points: raffle.points,
    });
    if ('error' in result) {
      if (result.error === 'insufficient_points') {
        return NextResponse.json({ error: '積分不足，請先累積點數。', balance: result.balance }, { status: 400 });
      }
      return NextResponse.json({ error: '會員資料不存在，請重新登入。' }, { status: 401 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: '無法參加抽獎，請稍後再試。' }, { status: 400 });
  }
}