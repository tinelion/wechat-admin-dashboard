import { NextRequest, NextResponse } from 'next/server';
import { getAutoReplies, createAutoReply, updateAutoReply, deleteAutoReply } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const replies = await getAutoReplies(type);
    return NextResponse.json(replies);
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
    await createAutoReply(body);
    return NextResponse.json({ success: true, message: '规则已创建' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    }
    await updateAutoReply(id, data);
    return NextResponse.json({ success: true, message: '规则已更新' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');
    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    }
    await deleteAutoReply(id);
    return NextResponse.json({ success: true, message: '规则已删除' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
