import { NextRequest, NextResponse } from 'next/server';
import { getFollowers, batchGetUserInfo } from '@/lib/wechat';
import { upsertFan, getFanByOpenid, incrementStat } from '@/lib/db';
import { auth } from '@/lib/auth';

// Sync fans from WeChat
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const configId = body.configId ? parseInt(body.configId) : undefined;

    let allOpenids: string[] = [];
    let nextOpenid: string | undefined;

    // Fetch all follower openids
    do {
      const result = await getFollowers(nextOpenid, configId);
      if (result.errcode) {
        return NextResponse.json({ error: `微信API错误: ${result.errmsg}` }, { status: 400 });
      }
      const data = result.data || {};
      allOpenids = allOpenids.concat(data.openid || []);
      nextOpenid = data.next_openid;
    } while (nextOpenid);

    // Batch get user info (max 100 per batch)
    let syncedCount = 0;
    let newCount = 0;
    for (let i = 0; i < allOpenids.length; i += 100) {
      const batch = allOpenids.slice(i, i + 100);
      const result = await batchGetUserInfo(batch, configId);
      if (result.user_info_list) {
        for (const userInfo of result.user_info_list) {
          const existing = await getFanByOpenid(userInfo.openid, configId);
          await upsertFan({
            openid: userInfo.openid,
            nickname: userInfo.nickname,
            headimgurl: userInfo.headimgurl,
            sex: userInfo.sex,
            city: userInfo.city,
            province: userInfo.province,
            country: userInfo.country,
            language: userInfo.language,
            subscribe: userInfo.subscribe === 1,
            subscribeTime: userInfo.subscribe_time ? String(userInfo.subscribe_time) : undefined,
            subscribeScene: userInfo.subscribe_scene,
          }, configId);
          if (!existing) {
            newCount++;
            await incrementStat('newFans', configId);
          }
          syncedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: allOpenids.length,
      synced: syncedCount,
      newFans: newCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '同步粉丝失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
