import { NextRequest, NextResponse } from 'next/server';
import { sendTextMessage } from '@/lib/wechat';
import { addMessage } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const body = await request.json();
    const { openid, content, configId } = body;

    if (!openid || !content) {
      return NextResponse.json({ error: 'openid 和 content 不能为空' }, { status: 400 });
    }

    const parsedConfigId = configId ? parseInt(configId) : undefined;

    const result = await sendTextMessage(openid, content, parsedConfigId);
    if (result.errcode && result.errcode !== 0) {
      return NextResponse.json({ error: `发送失败: ${result.errmsg}` }, { status: 400 });
    }

    // Save outgoing message
    await addMessage({
      openid,
      msgType: 'text',
      content,
      isOutgoing: true,
    }, parsedConfigId);

    return NextResponse.json({ success: true, message: '消息已发送' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '发送消息失败' }, { status: 500 });
  }
}
