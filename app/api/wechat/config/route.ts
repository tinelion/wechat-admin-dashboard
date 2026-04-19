import { NextRequest, NextResponse } from 'next/server';
import { getAllConfigs, getConfigById, createConfig, updateConfig, deleteConfig } from '@/lib/db';
import { resetAccessToken } from '@/lib/wechat';
import { auth } from '@/lib/auth';

// GET: Return all WeChat official account configs (without appSecret)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const configs = await getAllConfigs();
    // Mask appSecret for security
    const safeConfigs = configs.map(c => ({
      id: c.id,
      appid: c.appid,
      appSecret: '******',
      name: c.name,
      accountType: c.accountType || 'subscription',
      enabled: c.enabled,
      hasSecret: !!c.appSecret,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    return NextResponse.json(safeConfigs);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取配置失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Create a new WeChat official account config
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const body = await request.json();
    const { appid, appSecret, name, accountType } = body;

    if (!appid) {
      return NextResponse.json({ error: 'AppID 不能为空' }, { status: 400 });
    }
    if (!appSecret) {
      return NextResponse.json({ error: 'AppSecret 不能为空' }, { status: 400 });
    }

    await createConfig({
      appid,
      appSecret,
      name: name || '默认公众号',
      accountType: accountType || 'subscription',
    });

    return NextResponse.json({ success: true, message: '公众号配置已创建' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建配置失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: Update a WeChat official account config by id
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const body = await request.json();
    const { id, appid, appSecret, name, accountType, enabled } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (appid !== undefined) data.appid = appid;
    if (name !== undefined) data.name = name;
    if (accountType !== undefined) data.accountType = accountType;
    if (enabled !== undefined) data.enabled = enabled;

    // If appSecret is provided, update it; otherwise keep the old one
    if (appSecret && appSecret !== '******') {
      data.appSecret = appSecret;
    }

    await updateConfig(id, data as any);

    // Reset token cache for this config
    resetAccessToken(id);

    return NextResponse.json({ success: true, message: '公众号配置已更新' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新配置失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Delete a WeChat official account config by id
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');
    if (!id) {
      return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 });
    }

    await deleteConfig(id);

    // Reset token cache for this config
    resetAccessToken(id);

    return NextResponse.json({ success: true, message: '公众号配置已删除' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '删除配置失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
