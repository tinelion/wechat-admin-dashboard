import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, addTemplate, deleteTemplate } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId') ? parseInt(searchParams.get('configId')!) : undefined;
    const list = await getTemplates(configId);
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
    const { configId, templateId, title, content, enabled } = body;

    if (!templateId || !title || !content) {
      return NextResponse.json({ error: 'templateId、title、content 不能为空' }, { status: 400 });
    }

    const parsedConfigId = configId ? parseInt(configId) : undefined;
    await addTemplate({ templateId, title, content, enabled }, parsedConfigId);
    return NextResponse.json({ success: true, message: '模板已添加' });
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
      return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 });
    }
    await deleteTemplate(id);
    return NextResponse.json({ success: true, message: '模板已删除' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
