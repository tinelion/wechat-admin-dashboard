import { NextRequest, NextResponse } from 'next/server';
import { getTodayStats, getRecentStats, getFansCount, getTodayMessageCount } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId') ? parseInt(searchParams.get('configId')!) : undefined;

    const todayStats = await getTodayStats(configId);
    const recentStats = await getRecentStats(30, configId);
    const totalFans = await getFansCount(configId);
    const todayMessages = await getTodayMessageCount(configId);

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
