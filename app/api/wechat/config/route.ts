import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/db';
import { resetAccessToken } from '@/lib/wechat';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const config = await getConfig();
    if (config) {
      return NextResponse.json({
        id: config.id,
        appid: config.appid,
        appSecret: '******',
        name: config.name,
        enabled: config.enabled,
        hasSecret: !!config.appSecret,
      });
    }
    return NextResponse.json({ configured: false });
  } catch {
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const body = await request.json();
    const { appid, appSecret, name } = body;

    if (!appid) {
      return NextResponse.json({ error: 'AppID 不能为空' }, { status: 400 });
    }

    // If appSecret is empty but config already exists, keep the old secret
    const existing = await getConfig();
    const finalAppSecret = appSecret || existing?.appSecret;
    if (!finalAppSecret) {
      return NextResponse.json({ error: 'AppSecret 不能为空' }, { status: 400 });
    }

    await saveConfig({ appid, appSecret: finalAppSecret, name: name || '默认公众号' });
    resetAccessToken();

    return NextResponse.json({ success: true, message: '配置已保存' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '保存配置失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
