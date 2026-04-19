import { NextRequest, NextResponse } from 'next/server';
import { getMassMessages, createMassMessage, updateMassMessage, getFansCount } from '@/lib/db';
import { sendMassMessage } from '@/lib/wechat';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId') ? parseInt(searchParams.get('configId')!) : undefined;
    const list = await getMassMessages(configId);
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
    const { msgType, content, title, description, target, tagId, openidList, configId } = body;

    if (!msgType || !content || !target) {
      return NextResponse.json({ error: 'msgType、content、target 不能为空' }, { status: 400 });
    }

    const parsedConfigId = configId ? parseInt(configId) : undefined;
    const totalFans = await getFansCount(parsedConfigId);

    // 创建群发记录
    const record = await createMassMessage({
      msgType,
      content,
      title,
      description,
      target,
      tagId: tagId ? parseInt(tagId) : undefined,
      totalFans,
    }, parsedConfigId);

    // 获取插入的记录 ID
    const inserted = Array.isArray(record) ? record : [record];
    // @ts-ignore
    const recordId = inserted[0]?.insertId || inserted[0]?.id;

    // 更新状态为发送中
    if (recordId) {
      await updateMassMessage(recordId, { status: 'sending' });
    }

    // 调用微信群发接口
    const massContent: any = { target, text: content };
    if (tagId) massContent.tagId = parseInt(tagId);
    if (openidList) massContent.openidList = openidList;
    if (msgType === 'image' || msgType === 'mpnews') {
      massContent.media = { media_id: content };
    }

    const result = await sendMassMessage(msgType, massContent, parsedConfigId);

    if (result.errcode && result.errcode !== 0) {
      if (recordId) {
        await updateMassMessage(recordId, { status: 'failed', errorCount: totalFans });
      }
      return NextResponse.json({ error: `群发失败: ${result.errmsg}` }, { status: 400 });
    }

    // 更新状态为已完成
    if (recordId) {
      await updateMassMessage(recordId, {
        status: 'done',
        sentCount: result.sent_count || totalFans,
        errorCount: result.error_count || 0,
        sentAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: '群发任务已提交',
      msgId: result.msg_id,
      msgDataId: result.msg_data_id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '群发失败' }, { status: 500 });
  }
}
