import { NextRequest, NextResponse } from 'next/server';
import { aiReply } from '@/lib/ai';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { message, configId } = body;

    if (!message) {
      return NextResponse.json({ error: '请输入测试消息' }, { status: 400 });
    }

    const reply = await aiReply(message, 'test-user', configId);

    if (!reply) {
      return NextResponse.json({ error: 'AI 未启用或未配置，请先配置 AI 客服' }, { status: 400 });
    }

    return NextResponse.json({ success: true, reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
