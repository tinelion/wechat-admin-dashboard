import { NextRequest, NextResponse } from 'next/server';
import { getQrcodes, addQrcode } from '@/lib/db';
import { createQrCode } from '@/lib/wechat';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId') ? parseInt(searchParams.get('configId')!) : undefined;
    const list = await getQrcodes(configId);
    return NextResponse.json(list);
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
    const { sceneStr, expireSeconds, remark, configId } = body;

    if (!sceneStr) {
      return NextResponse.json({ error: 'sceneStr 不能为空' }, { status: 400 });
    }

    const parsedConfigId = configId ? parseInt(configId) : undefined;
    const parsedExpireSeconds = expireSeconds ? parseInt(expireSeconds) : undefined;

    // 调用微信接口创建二维码
    const result = await createQrCode(sceneStr, parsedExpireSeconds, parsedConfigId);

    if (result.errcode && result.errcode !== 0) {
      return NextResponse.json({ error: `创建二维码失败: ${result.errmsg}` }, { status: 400 });
    }

    const ticket = result.ticket;
    const url = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;

    // 保存到数据库
    await addQrcode({
      sceneStr,
      ticket,
      url,
      expireSeconds: parsedExpireSeconds,
      remark,
    }, parsedConfigId);

    return NextResponse.json({
      success: true,
      message: '二维码已创建',
      ticket,
      url,
      expireSeconds: result.expire_seconds,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '创建二维码失败' }, { status: 500 });
  }
}
