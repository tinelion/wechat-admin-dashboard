import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@/lib/wechat';
import { upsertFan, getFanByOpenid, addMessage, incrementStat, getAutoReplies, getConfig, db, fans, wechatConfig, getAiConfig } from '@/lib/db';
import { sendTextMessage, getUserInfo } from '@/lib/wechat';
import { aiReply } from '@/lib/ai';
import { eq, sql, and } from 'drizzle-orm';
import crypto from 'crypto';

// Parse XML body
function parseXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>|<(\w+)>(.*?)<\/\3>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    result[match[1] || match[3]] = match[2] || match[4];
  }
  return result;
}

// Build XML response
function buildTextXml(toUser: string, fromUser: string, content: string): string {
  return `<xml>
    <ToUserName><![CDATA[${toUser}]]></ToUserName>
    <FromUserName><![CDATA[${fromUser}]]></FromUserName>
    <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
    <MsgType><![CDATA[text]]></MsgType>
    <Content><![CDATA[${content}]]></Content>
  </xml>`;
}

// Find config by appid (ToUserName in WeChat messages is the appid)
async function findConfigByAppid(appid: string) {
  const result = await db.select().from(wechatConfig).where(eq(wechatConfig.appid, appid));
  return result[0];
}

// GET: WeChat server verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const signature = searchParams.get('signature') || '';
  const timestamp = searchParams.get('timestamp') || '';
  const nonce = searchParams.get('nonce') || '';
  const echostr = searchParams.get('echostr') || '';

  // Try to find config by appid if provided, otherwise use default
  const appid = searchParams.get('appid');
  let config;
  if (appid) {
    config = await findConfigByAppid(appid);
  }
  if (!config) {
    config = await getConfig();
  }
  if (!config) {
    return NextResponse.json({ error: '请先配置微信公众号' }, { status: 500 });
  }

  // Use appSecret as token for verification (or a separate token config)
  const token = process.env.WECHAT_TOKEN || config.appSecret;
  if (verifySignature(token, signature, timestamp, nonce)) {
    return new NextResponse(echostr);
  }

  return NextResponse.json({ error: '验证失败' }, { status: 403 });
}

// POST: Handle WeChat messages and events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data = parseXml(body);

    const toUser = data.ToUserName;       // 公众号 appid
    const fromUser = data.FromUserName;   // 用户 openid
    const msgType = data.MsgType;
    const event = data.Event;
    const eventKey = data.EventKey;
    const content = data.Content;
    const createTime = data.CreateTime;

    // Find config by appid (ToUserName)
    const config = await findConfigByAppid(toUser);
    const configId = config?.id;

    // Handle different message types and events
    let replyXml = '';

    switch (msgType) {
      case 'event':
        replyXml = await handleEvent(event, eventKey, fromUser, toUser, createTime, configId);
        break;

      case 'text':
        // Save incoming message
        await addMessage({
          openid: fromUser,
          msgType: 'text',
          content,
          msgId: data.MsgId,
        }, configId);
        await incrementStat('messageCount', configId);

        // Try auto-reply
        replyXml = await handleTextMessage(fromUser, toUser, content, configId);
        break;

      case 'image':
        await addMessage({
          openid: fromUser,
          msgType: 'image',
          picUrl: data.PicUrl,
          mediaId: data.MediaId,
          msgId: data.MsgId,
        }, configId);
        await incrementStat('messageCount', configId);
        break;

      case 'voice':
        await addMessage({
          openid: fromUser,
          msgType: 'voice',
          mediaId: data.MediaId,
          recognition: data.Recognition,
          format: data.Format,
          msgId: data.MsgId,
        }, configId);
        await incrementStat('messageCount', configId);
        break;

      case 'video':
      case 'shortvideo':
        await addMessage({
          openid: fromUser,
          msgType: 'video',
          mediaId: data.MediaId,
          thumbMediaId: data.ThumbMediaId,
          msgId: data.MsgId,
        }, configId);
        await incrementStat('messageCount', configId);
        break;

      case 'location':
        await addMessage({
          openid: fromUser,
          msgType: 'location',
          locationX: parseFloat(data.Location_X),
          locationY: parseFloat(data.Location_Y),
          label: data.Label,
          msgId: data.MsgId,
        }, configId);
        await incrementStat('messageCount', configId);
        break;

      case 'link':
        await addMessage({
          openid: fromUser,
          msgType: 'link',
          title: data.Title,
          description: data.Description,
          url: data.Url,
          msgId: data.MsgId,
        }, configId);
        await incrementStat('messageCount', configId);
        break;

      default:
        break;
    }

    // Return empty response if no auto-reply
    if (!replyXml) {
      replyXml = 'success';
    }

    return new NextResponse(replyXml, {
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('success');
  }
}

// Handle events (subscribe, unsubscribe, SCAN, CLICK, VIEW, etc.)
async function handleEvent(
  event: string | undefined,
  eventKey: string | undefined,
  fromUser: string,
  toUser: string,
  createTime: string | undefined,
  configId?: number
): Promise<string> {
  if (!event) return '';

  switch (event) {
    case 'subscribe': {
      // User subscribed
      await addMessage({
        openid: fromUser,
        msgType: 'text',
        content: '用户关注了公众号',
        event: 'subscribe',
      }, configId);
      await incrementStat('newFans', configId);

      // Try to get user info from WeChat and save to fans table
      try {
        const userInfo = await getUserInfo(fromUser, configId);
        if (userInfo && !userInfo.errcode) {
          await upsertFan({
            openid: userInfo.openid,
            nickname: userInfo.nickname,
            headimgurl: userInfo.headimgurl,
            sex: userInfo.sex,
            city: userInfo.city,
            province: userInfo.province,
            country: userInfo.country,
            language: userInfo.language,
            subscribe: true,
            subscribeTime: userInfo.subscribe_time ? String(userInfo.subscribe_time) : createTime,
            subscribeScene: userInfo.subscribe_scene || eventKey || '',
          }, configId);
        }
      } catch {
        // If WeChat API fails, still save basic info
        await upsertFan({
          openid: fromUser,
          subscribe: true,
          subscribeTime: createTime,
          subscribeScene: eventKey || '',
        }, configId);
      }

      // Send subscribe auto-reply
      const subscribeReplies = await getAutoReplies('subscribe', configId);
      if (subscribeReplies.length > 0 && subscribeReplies[0].enabled) {
        return buildTextXml(fromUser, toUser, subscribeReplies[0].replyContent);
      }
      return '';
    }

    case 'unsubscribe': {
      // User unsubscribed
      await addMessage({
        openid: fromUser,
        msgType: 'text',
        content: '用户取消了关注',
        event: 'unsubscribe',
      }, configId);
      await incrementStat('unfollowFans', configId);

      // Update fan status
      const existing = await getFanByOpenid(fromUser, configId);
      if (existing) {
        await db.update(fans)
          .set({ subscribe: false, updatedAt: new Date() })
          .where(eq(fans.id, existing.id));
      }
      return '';
    }

    case 'SCAN': {
      // User scanned QR code
      await addMessage({
        openid: fromUser,
        msgType: 'text',
        content: `扫码参数: ${eventKey || '-'}`,
        event: 'SCAN',
        eventKey,
      }, configId);
      return '';
    }

    case 'CLICK': {
      // User clicked menu button
      await addMessage({
        openid: fromUser,
        msgType: 'text',
        content: `点击菜单: ${eventKey || '-'}`,
        event: 'CLICK',
        eventKey,
      }, configId);
      return '';
    }

    case 'VIEW': {
      // User clicked menu link
      await addMessage({
        openid: fromUser,
        msgType: 'text',
        content: `跳转: ${eventKey || '-'}`,
        event: 'VIEW',
        eventKey,
      }, configId);
      return '';
    }

    case 'LOCATION': {
      // User reported location
      await addMessage({
        openid: fromUser,
        msgType: 'location',
        event: 'LOCATION',
      }, configId);
      return '';
    }

    default:
      return '';
  }
}

// Handle text messages with auto-reply
async function handleTextMessage(
  fromUser: string,
  toUser: string,
  content: string,
  configId?: number
): Promise<string> {
  // 1. Try exact keyword match
  const keywordReplies = await getAutoReplies('keyword', configId);
  for (const rule of keywordReplies) {
    if (!rule.enabled || !rule.keyword) continue;

    if (rule.matchType === 'exact' && content === rule.keyword) {
      return buildTextXml(fromUser, toUser, rule.replyContent);
    }
    if (rule.matchType === 'partial' && content.includes(rule.keyword)) {
      return buildTextXml(fromUser, toUser, rule.replyContent);
    }
  }

  // 2. Try default reply
  const defaultReplies = await getAutoReplies('default', configId);
  if (defaultReplies.length > 0 && defaultReplies[0].enabled) {
    return buildTextXml(fromUser, toUser, defaultReplies[0].replyContent);
  }

  // 3. AI customer service fallback
  const aiConfig = await getAiConfig(configId);
  if (aiConfig && aiConfig.enabled) {
    try {
      const aiResponse = await aiReply(content, fromUser, configId);
      if (aiResponse) {
        // Record AI reply to messages table
        await addMessage({
          openid: fromUser,
          msgType: 'text',
          content: aiResponse,
          isOutgoing: true,
        }, configId);
        return buildTextXml(fromUser, toUser, aiResponse);
      }
    } catch (e) {
      console.error('AI reply failed:', e);
    }
  }

  return '';
}
