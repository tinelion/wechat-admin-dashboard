import 'server-only';
import crypto from 'crypto';

// Multi-account token cache: Map<configId, { accessToken, tokenExpiresAt }>
const tokenCache = new Map<number, { accessToken: string; tokenExpiresAt: number }>();

export interface WechatApiResponse {
  errcode: number;
  errmsg: string;
  [key: string]: any;
}

async function getAccessToken(configId?: number): Promise<string> {
  // If no configId, use 0 as default key for backward compatibility
  const cacheKey = configId || 0;

  const cached = tokenCache.get(cacheKey);
  if (cached && cached.accessToken && Date.now() < cached.tokenExpiresAt) {
    return cached.accessToken;
  }

  const { getConfig } = await import('@/lib/db');
  const config = await getConfig(configId);
  if (!config) {
    throw new Error('请先配置微信公众号 AppID 和 AppSecret');
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appid}&secret=${config.appSecret}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.errcode) {
    throw new Error(`获取 access_token 失败 [${data.errcode}]: ${data.errmsg}`);
  }

  const accessToken = data.access_token;
  const tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000; // 提前5分钟过期
  tokenCache.set(cacheKey, { accessToken, tokenExpiresAt });
  return accessToken;
}

export async function wechatApi(path: string, method: string = 'GET', body?: any, configId?: number): Promise<any> {
  const token = await getAccessToken(configId);
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

export async function createMenu(menuData: any, configId?: number) {
  return wechatApi('/cgi-bin/menu/create', 'POST', menuData, configId);
}

export async function getMenu(configId?: number) {
  return wechatApi('/cgi-bin/get_current_selfmenu_info', 'GET', undefined, configId);
}

export async function deleteMenu(configId?: number) {
  return wechatApi('/cgi-bin/menu/delete', 'POST', undefined, configId);
}

// ==================== User APIs ====================

export async function getUserInfo(openid: string, configId?: number) {
  return wechatApi(`/cgi-bin/user/info?openid=${openid}&lang=zh_CN`, 'GET', undefined, configId);
}

export async function getFollowers(nextOpenid?: string, configId?: number) {
  const path = nextOpenid
    ? `/cgi-bin/user/get?next_openid=${nextOpenid}`
    : '/cgi-bin/user/get';
  return wechatApi(path, 'GET', undefined, configId);
}

export async function batchGetUserInfo(openidList: string[], configId?: number) {
  const user_list = openidList.map(openid => ({ openid, lang: 'zh_CN' }));
  return wechatApi('/cgi-bin/user/info/batchget', 'POST', { user_list }, configId);
}

// ==================== Message APIs ====================

export async function sendCustomMessage(openid: string, msgType: string, content: any, configId?: number) {
  const body: any = {
    touser: openid,
    msgtype: msgType,
  };
  body[msgType] = content;
  return wechatApi('/cgi-bin/message/custom/send', 'POST', body, configId);
}

export async function sendTextMessage(openid: string, text: string, configId?: number) {
  return sendCustomMessage(openid, 'text', { content: text }, configId);
}

// ==================== Template Message ====================

export async function sendTemplateMessage(openid: string, templateId: string, data: any, url?: string, configId?: number) {
  const body: any = {
    touser: openid,
    template_id: templateId,
    data,
  };
  if (url) body.url = url;
  return wechatApi('/cgi-bin/message/template/send', 'POST', body, configId);
}

// ==================== Tag APIs ====================

export async function createTag(name: string, configId?: number) {
  return wechatApi('/cgi-bin/tags/create', 'POST', { tag: { name } }, configId);
}

export async function getTags(configId?: number) {
  return wechatApi('/cgi-bin/tags/get', 'GET', undefined, configId);
}

export async function getTagUsers(tagid: number, nextOpenid?: string, configId?: number) {
  const path = nextOpenid
    ? `/cgi-bin/user/tag/get?tagid=${tagid}&next_openid=${nextOpenid}`
    : `/cgi-bin/user/tag/get?tagid=${tagid}`;
  return wechatApi(path, 'GET', undefined, configId);
}

export async function batchTagUsers(openidList: string[], tagid: number, configId?: number) {
  return wechatApi('/cgi-bin/tags/members/batchtagging', 'POST', {
    openid_list: openidList,
    tagid,
  }, configId);
}

// ==================== QR Code APIs ====================

export async function createQrCode(sceneStr: string, expireSeconds?: number, configId?: number) {
  const body: any = {
    action_name: expireSeconds ? 'QR_STR_SCENE' : 'QR_LIMIT_STR_SCENE',
    action_info: { scene: { scene_str: sceneStr } },
  };
  if (expireSeconds) body.expire_seconds = expireSeconds;
  return wechatApi('/cgi-bin/qrcode/create', 'POST', body, configId);
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

// Reset access token for a specific config (e.g. after config change)
export function resetAccessToken(configId?: number) {
  const cacheKey = configId || 0;
  tokenCache.delete(cacheKey);
}

// Reset all access tokens
export function resetAllAccessTokens() {
  tokenCache.clear();
}
