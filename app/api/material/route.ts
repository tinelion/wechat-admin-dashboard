import { NextRequest, NextResponse } from 'next/server';
import { getMediaList, uploadTempMedia, uploadPermanentMedia, deleteMedia } from '@/lib/wechat';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'image';
    const offset = parseInt(searchParams.get('offset') || '0');
    const count = parseInt(searchParams.get('count') || '20');
    const configId = searchParams.get('configId') ? parseInt(searchParams.get('configId')!) : undefined;

    const result = await getMediaList(type, offset, count, configId);
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string || 'image';
    const permanent = formData.get('permanent') === 'true';
    const configId = formData.get('configId') ? parseInt(formData.get('configId') as string) : undefined;

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name || `upload.${type === 'image' ? 'jpg' : type}`;

    let result: any;
    if (permanent) {
      result = await uploadPermanentMedia(type, buffer, filename, configId);
    } else {
      result = await uploadTempMedia(type, buffer, filename, configId);
    }

    if (result.errcode && result.errcode !== 0) {
      return NextResponse.json({ error: `上传失败: ${result.errmsg}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '素材已上传',
      mediaId: result.media_id,
      url: result.url,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '上传素材失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const body = await request.json();
    const { mediaId, configId } = body;

    if (!mediaId) {
      return NextResponse.json({ error: '缺少 mediaId' }, { status: 400 });
    }

    const parsedConfigId = configId ? parseInt(configId) : undefined;
    const result = await deleteMedia(mediaId, parsedConfigId);

    if (result.errcode && result.errcode !== 0) {
      return NextResponse.json({ error: `删除失败: ${result.errmsg}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: '素材已删除' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '删除素材失败' }, { status: 500 });
  }
}
