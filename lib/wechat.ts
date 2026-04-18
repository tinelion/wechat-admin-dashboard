import 'server-only';
import crypto from 'crypto';

let accessToken: string = '';
let tokenExpiresAt = 0;

export interface WechatApiResponse {
  errcode: number;
  errmsg: string;
  [key: string]: any;
}

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  const { getConfig } = await import('@/lib/db');
  const config = await getConfig();
  if (!config) {
    throw new Error('请先配置微信公众号 AppID 和 AppSecret');
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appid}&secret=${config.appSecret}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.errcode) {
    throw new Error(`获取 access_token 失败: ${data.errmsg}`);
  }

  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000; // 提前5分钟过期
  return accessToken;
}

export async function wechatApi(path: string, method: string = 'GET', body?: any): Promise<any> {
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com${path}${path.includes('?') ? '&' : '?'}access_token=${token}`;

  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  return res.json();
}

// ==================== Menu APIs ====================

export async function createMenu(menuData: any) {
  return wechatApi('/cgi-bin/menu/create', 'POST', menuData);
}

export async function getMenu() {
  return wechatApi('/cgi-bin/get_current_selfmenu_info');
}

export async function deleteMenu() {
  return wechatApi('/cgi-bin/menu/delete', 'POST');
}

// ==================== User APIs ====================

export async function getUserInfo(openid: string) {
  return wechatApi(`/cgi-bin/user/info?openid=${openid}&lang=zh_CN`);
}

export async function getFollowers(nextOpenid?: string) {
  const path = nextOpenid
    ? `/cgi-bin/user/get?next_openid=${nextOpenid}`
    : '/cgi-bin/user/get';
  return wechatApi(path);
}

export async function batchGetUserInfo(openidList: string[]) {
  const user_list = openidList.map(openid => ({ openid, lang: 'zh_CN' }));
  return wechatApi('/cgi-bin/user/info/batchget', 'POST', { user_list });
}

// ==================== Message APIs ====================

export async function sendCustomMessage(openid: string, msgType: string, content: any) {
  const body: any = {
    touser: openid,
    msgtype: msgType,
  };
  body[msgType] = content;
  return wechatApi('/cgi-bin/message/custom/send', 'POST', body);
}

export async function sendTextMessage(openid: string, text: string) {
  return sendCustomMessage(openid, 'text', { content: text });
}

// ==================== Template Message ====================

export async function sendTemplateMessage(openid: string, templateId: string, data: any, url?: string) {
  const body: any = {
    touser: openid,
    template_id: templateId,
    data,
  };
  if (url) body.url = url;
  return wechatApi('/cgi-bin/message/template/send', 'POST', body);
}

// ==================== Tag APIs ====================

export async function createTag(name: string) {
  return wechatApi('/cgi-bin/tags/create', 'POST', { tag: { name } });
}

export async function getTags() {
  return wechatApi('/cgi-bin/tags/get');
}

export async function getTagUsers(tagid: number, nextOpenid?: string) {
  const path = nextOpenid
    ? `/cgi-bin/user/tag/get?tagid=${tagid}&next_openid=${nextOpenid}`
    : `/cgi-bin/user/tag/get?tagid=${tagid}`;
  return wechatApi(path);
}

export async function batchTagUsers(openidList: string[], tagid: number) {
  return wechatApi('/cgi-bin/tags/members/batchtagging', 'POST', {
    openid_list: openidList,
    tagid,
  });
}

// ==================== QR Code APIs ====================

export async function createQrCode(sceneStr: string, expireSeconds?: number) {
  const body: any = {
    action_name: expireSeconds ? 'QR_STR_SCENE' : 'QR_LIMIT_STR_SCENE',
    action_info: { scene: { scene_str: sceneStr } },
  };
  if (expireSeconds) body.expire_seconds = expireSeconds;
  return wechatApi('/cgi-bin/qrcode/create', 'POST', body);
}

// ==================== Webhook Verification ====================

export function verifySignature(token: string, signature: string, timestamp: string, nonce: string): boolean {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join('');
  const sha1 = crypto.createHash('sha1').update(str).digest('hex');
  return sha1 === signature;
}

export function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Reset access token (e.g. after config change)
export function resetAccessToken() {
  accessToken = '';
  tokenExpiresAt = 0;
}
