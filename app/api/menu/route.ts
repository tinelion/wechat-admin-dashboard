import { NextRequest, NextResponse } from 'next/server';
import { getActiveMenu, saveMenuConfig, publishMenu } from '@/lib/db';
import { createMenu, getMenu as getWechatMenu, deleteMenu as deleteWechatMenu } from '@/lib/wechat';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId') ? parseInt(searchParams.get('configId')!) : undefined;

    const menu = await getActiveMenu(configId);
    if (menu) {
      return NextResponse.json({
        id: menu.id,
        name: menu.name,
        config: JSON.parse(menu.config),
        isPublished: menu.isPublished,
        publishedAt: menu.publishedAt,
      });
    }
    return NextResponse.json({
      config: {
        button: [
          { name: '菜单1', sub_button: [] },
          { name: '菜单2', sub_button: [] },
          { name: '菜单3', sub_button: [] },
        ]
      },
      isPublished: false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const body = await request.json();
    const { config, action, configId } = body;
    const parsedConfigId = configId ? parseInt(configId) : undefined;

    if (action === 'publish') {
      // Save locally first
      await saveMenuConfig({ config: JSON.stringify(config) }, parsedConfigId);
      // Then publish to WeChat
      const result = await createMenu(config, parsedConfigId);
      if (result.errcode && result.errcode !== 0) {
        return NextResponse.json({
          error: `微信API错误 [${result.errcode}]: ${result.errmsg}`,
          errcode: result.errcode,
        }, { status: 400 });
      }
      await publishMenu(JSON.stringify(config), parsedConfigId);
      return NextResponse.json({ success: true, message: '菜单已发布到微信' });
    }

    // Just save locally
    await saveMenuConfig({ config: JSON.stringify(config) }, parsedConfigId);
    return NextResponse.json({ success: true, message: '菜单已保存' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '保存菜单失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId') ? parseInt(searchParams.get('configId')!) : undefined;

    const result = await deleteWechatMenu(configId);
    if (result.errcode && result.errcode !== 0) {
      return NextResponse.json({ error: `微信API错误: ${result.errmsg}` }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: '菜单已从微信删除' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '删除菜单失败' }, { status: 500 });
  }
}
