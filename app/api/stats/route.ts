import { NextResponse } from 'next/server';
import { getTodayStats, getRecentStats, getFansCount, getTodayMessageCount } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const todayStats = await getTodayStats();
    const recentStats = await getRecentStats(30);
    const totalFans = await getFansCount();
    const todayMessages = await getTodayMessageCount();

    return NextResponse.json({
      today: {
        newFans: todayStats?.newFans || 0,
        unfollowFans: todayStats?.unfollowFans || 0,
        totalFans: totalFans,
        messageCount: todayMessages,
      },
      recent: recentStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
