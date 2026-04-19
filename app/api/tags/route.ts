import { NextRequest, NextResponse } from 'next/server';
import { getTags, createTag, batchTagUsers } from '@/lib/wechat';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId') ? parseInt(searchParams.get('configId')!) : undefined;
    const result = await getTags(configId);
    return NextResponse.json(result);
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
    const { name, configId } = body;

    if (!name) {
      return NextResponse.json({ error: '缺少标签名称' }, { status: 400 });
    }

    const parsedConfigId = configId ? parseInt(configId) : undefined;
    const result = await createTag(name, parsedConfigId);

    if (result.errcode && result.errcode !== 0) {
      return NextResponse.json({ error: `创建标签失败: ${result.errmsg}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: '标签已创建', tag: result.tag });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '创建标签失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const body = await request.json();
    const { openidList, tagId, configId } = body;

    if (!openidList || !openidList.length || !tagId) {
      return NextResponse.json({ error: 'openidList 和 tagId 不能为空' }, { status: 400 });
    }

    const parsedConfigId = configId ? parseInt(configId) : undefined;
    const result = await batchTagUsers(openidList, parseInt(tagId), parsedConfigId);

    if (result.errcode && result.errcode !== 0) {
      return NextResponse.json({ error: `打标签失败: ${result.errmsg}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: '标签已设置' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '打标签失败' }, { status: 500 });
  }
}
