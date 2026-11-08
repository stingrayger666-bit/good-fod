import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/lib/auth';
import { pointRewards } from '@/app/lib/point-activities';
import { getPointActivities, redeemRewardForUser } from '@/app/lib/server-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: '請先登入會員。' }, { status: 401 });

  const { redemptions } = await getPointActivities(user.id);
  return NextResponse.json({ user, rewards: pointRewards, redemptions });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: '請先登入會員。' }, { status: 401 });

  try {
    const body = (await request.json()) as { rewardId?: unknown };
    const reward = pointRewards.find((item) => item.id === body.rewardId);
    if (!reward) return NextResponse.json({ error: '找不到這個兌換項目。' }, { status: 404 });

    const result = await redeemRewardForUser({
      userId: user.id,
      rewardId: reward.id,
      rewardName: reward.name,
      points: reward.points,
    });
    if ('error' in result) {
      if (result.error === 'insufficient_points') {
        return NextResponse.json({ error: '積分不足，請先累積點數。', balance: result.balance }, { status: 400 });
      }
      return NextResponse.json({ error: '會員資料不存在，請重新登入。' }, { status: 401 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: '無法兌換，請稍後再試。' }, { status: 400 });
  }
}