import { NextRequest, NextResponse } from 'next/server';
import { sendTemplateMessage } from '@/lib/wechat';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const body = await request.json();
    const { openid, templateId, data, url, configId } = body;

    if (!openid || !templateId || !data) {
      return NextResponse.json({ error: 'openid、templateId、data 不能为空' }, { status: 400 });
    }

    const parsedConfigId = configId ? parseInt(configId) : undefined;

    const result = await sendTemplateMessage(openid, templateId, data, url, parsedConfigId);
    if (result.errcode && result.errcode !== 0) {
      return NextResponse.json({ error: `发送失败: ${result.errmsg}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: '模板消息已发送', msgid: result.msgid });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '发送模板消息失败' }, { status: 500 });
  }
}
