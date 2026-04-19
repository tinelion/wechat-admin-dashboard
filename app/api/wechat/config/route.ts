import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/db';

export async function GET() {
  try {
    const config = await getConfig();
    if (config) {
      return NextResponse.json({
        id: config.id,
        appid: config.appid,
        appSecret: '******',
        name: config.name,
        accountType: config.accountType || 'subscription',
        enabled: config.enabled,
        hasSecret: !!config.appSecret,
      });
    }
    return NextResponse.json({ configured: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取配置失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appid, appSecret, name, accountType } = body;

    if (!appid) {
      return NextResponse.json({ error: 'AppID 不能为空' }, { status: 400 });
    }

    // If appSecret is empty but config already exists, keep the old secret
    const existing = await getConfig();
    const finalAppSecret = appSecret || existing?.appSecret;
    if (!finalAppSecret) {
      return NextResponse.json({ error: 'AppSecret 不能为空' }, { status: 400 });
    }

    await saveConfig({
      appid,
      appSecret: finalAppSecret,
      name: name || '默认公众号',
      accountType: accountType || 'subscription',
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '保存配置失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
