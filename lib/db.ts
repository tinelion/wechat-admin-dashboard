import 'server-only';
import { pgTable, text, integer, real, boolean, serial, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { count, eq, like, desc, and, sql, or } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

// ==================== Schema (PostgreSQL) ====================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wechatConfig = pgTable('wechat_config', {
  id: serial('id').primaryKey(),
  appid: text('appid').notNull(),
  appSecret: text('app_secret').notNull(),
  name: text('name').notNull().default('默认公众号'),
  accountType: text('account_type').notNull().default('subscription'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const fans = pgTable('fans', {
  id: serial('id').primaryKey(),
  configId: integer('config_id'),
  openid: text('openid').notNull(),
  nickname: text('nickname'),
  headimgurl: text('headimgurl'),
  sex: integer('sex'),
  city: text('city'),
  province: text('province'),
  country: text('country'),
  language: text('language'),
  subscribe: boolean('subscribe').notNull().default(true),
  subscribeTime: text('subscribe_time'),
  subscribeScene: text('subscribe_scene'),
  remark: text('remark'),
  tagIds: text('tag_ids'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  configId: integer('config_id'),
  msgId: text('msg_id'),
  openid: text('openid').notNull(),
  msgType: text('msg_type').notNull(),
  content: text('content'),
  picUrl: text('pic_url'),
  mediaId: text('media_id'),
  format: text('format'),
  recognition: text('recognition'),
  thumbMediaId: text('thumb_media_id'),
  locationX: real('location_x'),
  locationY: real('location_y'),
  label: text('label'),
  title: text('title'),
  description: text('description'),
  url: text('url'),
  event: text('event'),
  eventKey: text('event_key'),
  ticket: text('ticket'),
  isOutgoing: boolean('is_outgoing').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const autoReplies = pgTable('auto_replies', {
  id: serial('id').primaryKey(),
  configId: integer('config_id'),
  type: text('type').notNull(),
  keyword: text('keyword'),
  matchType: text('match_type').notNull().default('exact'),
  replyType: text('reply_type').notNull(),
  replyContent: text('reply_content').notNull(),
  mediaId: text('media_id'),
  title: text('title'),
  description: text('description'),
  url: text('url'),
  picUrl: text('pic_url'),
  enabled: boolean('enabled').notNull().default(true),
  priority: integer('priority').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const menuConfig = pgTable('menu_config', {
  id: serial('id').primaryKey(),
  configId: integer('config_id'),
  name: text('name').notNull().default('默认菜单'),
  config: text('config').notNull(),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dailyStats = pgTable('daily_stats', {
  id: serial('id').primaryKey(),
  configId: integer('config_id'),
  date: text('date').notNull(),
  newFans: integer('new_fans').notNull().default(0),
  unfollowFans: integer('unfollow_fans').notNull().default(0),
  totalFans: integer('total_fans').notNull().default(0),
  messageCount: integer('message_count').notNull().default(0),
});

// ==================== Types ====================
export type SelectFan = typeof fans.$inferSelect;
export type SelectMessage = typeof messages.$inferSelect;
export type SelectAutoReply = typeof autoReplies.$inferSelect;
export type SelectWechatConfig = typeof wechatConfig.$inferSelect;
export type SelectMenuConfig = typeof menuConfig.$inferSelect;
export type SelectDailyStats = typeof dailyStats.$inferSelect;

// ==================== Database Connection ====================

type AnyDatabase = NeonHttpDatabase | NodePgDatabase;

function createDb(): AnyDatabase {
  const sql_url = process.env.POSTGRES_URL;
  if (!sql_url) throw new Error('POSTGRES_URL 环境变量未设置');

  // Detect connection type:
  // - Neon HTTP: contains "neon.tech" or uses http:// prefix
  // - Standard PostgreSQL: postgresql:// prefix (Docker, local, etc.)
  const isNeonHttp = sql_url.includes('neon.tech') || sql_url.startsWith('http://');

  if (isNeonHttp) {
    // Neon serverless (HTTP) - used on Vercel
    let cleanUrl = sql_url;
    try {
      const u = new URL(cleanUrl);
      u.searchParams.delete('channel_binding');
      cleanUrl = u.toString();
    } catch {}
    const { neon } = require('@neondatabase/serverless');
    const { drizzle: drizzleNeon } = require('drizzle-orm/neon-http');
    const client = neon(cleanUrl);
    return drizzleNeon(client);
  } else {
    // Standard PostgreSQL (TCP) - used in Docker / local
    const { Pool } = require('pg');
    const { drizzle: drizzlePg } = require('drizzle-orm/node-postgres');
    const pool = new Pool({ connectionString: sql_url });
    return drizzlePg(pool);
  }
}

let _db: AnyDatabase | null = null;
export function getDb(): AnyDatabase {
  if (!_db) _db = createDb();
  return _db;
}

// Proxy for backward compatibility
export const db = new Proxy({} as AnyDatabase, {
  get(_, prop) {
    return (getDb() as any)[prop];
  }
});

// ==================== Helper Functions ====================

// Config management
export async function getConfig(configId?: number) {
  if (configId) {
    const result = await db.select().from(wechatConfig).where(eq(wechatConfig.id, configId));
    return result[0];
  }
  return db.select().from(wechatConfig).where(eq(wechatConfig.enabled, true)).then(r => r[0]);
}

export async function getAllConfigs() {
  return db.select().from(wechatConfig).orderBy(desc(wechatConfig.createdAt));
}

export async function getConfigById(id: number) {
  const result = await db.select().from(wechatConfig).where(eq(wechatConfig.id, id));
  return result[0];
}

export async function deleteConfig(id: number) {
  return db.delete(wechatConfig).where(eq(wechatConfig.id, id));
}

export async function createConfig(data: { appid: string; appSecret: string; name?: string; accountType?: string }) {
  return db.insert(wechatConfig).values(data);
}

export async function updateConfig(id: number, data: { appid?: string; appSecret?: string; name?: string; accountType?: string; enabled?: boolean }) {
  return db.update(wechatConfig)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(wechatConfig.id, id));
}

// Backward-compatible saveConfig
export async function saveConfig(data: { appid: string; appSecret: string; name?: string; accountType?: string }) {
  const existing = await getConfig();
  if (existing) {
    return db.update(wechatConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(wechatConfig.id, existing.id));
  }
  return db.insert(wechatConfig).values(data);
}

// Fans
export async function getFans(search: string = '', offset: number = 0, limit: number = 20, configId?: number) {
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(fans.nickname, `%${search}%`),
        like(fans.openid, `%${search}%`),
        like(fans.city, `%${search}%`),
        like(fans.province, `%${search}%`)
      )
    );
  }
  if (configId) {
    conditions.push(eq(fans.configId, configId));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const totalResult = await db.select({ count: count() }).from(fans).where(whereClause);
  const list = await db.select().from(fans)
    .where(whereClause)
    .orderBy(desc(fans.createdAt))
    .limit(limit)
    .offset(offset);

  return { fans: list, total: totalResult[0]?.count || 0 };
}

export async function getFanByOpenid(openid: string, configId?: number) {
  const conditions = [eq(fans.openid, openid)];
  if (configId) {
    conditions.push(eq(fans.configId, configId));
  }
  const result = await db.select().from(fans).where(and(...conditions));
  return result[0];
}

export async function upsertFan(data: {
  openid: string;
  nickname?: string;
  headimgurl?: string;
  sex?: number;
  city?: string;
  province?: string;
  country?: string;
  language?: string;
  subscribe?: boolean;
  subscribeTime?: string;
  subscribeScene?: string;
}, configId?: number) {
  const existing = await getFanByOpenid(data.openid, configId);
  if (existing) {
    return db.update(fans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fans.id, existing.id));
  }
  return db.insert(fans).values({ ...data, configId: configId || null });
}

export async function deleteFan(id: number) {
  return db.delete(fans).where(eq(fans.id, id));
}

export async function getFansCount(configId?: number) {
  const conditions = [eq(fans.subscribe, true)];
  if (configId) {
    conditions.push(eq(fans.configId, configId));
  }
  const result = await db.select({ count: count() }).from(fans).where(and(...conditions));
  return result[0]?.count || 0;
}

// Messages
export async function getMessages(offset: number = 0, limit: number = 50, configId?: number) {
  const whereClause = configId ? eq(messages.configId, configId) : undefined;

  const totalResult = await db.select({ count: count() }).from(messages).where(whereClause);
  const list = await db.select().from(messages)
    .where(whereClause)
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset);
  return { messages: list, total: totalResult[0]?.count || 0 };
}

export async function addMessage(data: {
  msgId?: string;
  openid: string;
  msgType: string;
  content?: string;
  isOutgoing?: boolean;
  event?: string;
  eventKey?: string;
  picUrl?: string;
  mediaId?: string;
  format?: string;
  recognition?: string;
  thumbMediaId?: string;
  locationX?: number;
  locationY?: number;
  label?: string;
  title?: string;
  description?: string;
  url?: string;
}, configId?: number) {
  return db.insert(messages).values({ ...data, configId: configId || null });
}

export async function getTodayMessageCount(configId?: number) {
  const today = new Date().toISOString().slice(0, 10);
  const conditions = [sql`date(created_at) = ${today}`];
  if (configId) {
    conditions.push(eq(messages.configId, configId));
  }
  const result = await db.select({ count: count() })
    .from(messages)
    .where(and(...conditions));
  return result[0]?.count || 0;
}

// Auto Replies
export async function getAutoReplies(type?: string, configId?: number) {
  const conditions = [];
  if (type) {
    conditions.push(eq(autoReplies.type, type));
    conditions.push(eq(autoReplies.enabled, true));
  }
  if (configId) {
    conditions.push(eq(autoReplies.configId, configId));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db.select().from(autoReplies)
    .where(whereClause)
    .orderBy(desc(autoReplies.priority));
}

export async function getAutoReplyById(id: number) {
  const result = await db.select().from(autoReplies).where(eq(autoReplies.id, id));
  return result[0];
}

export async function createAutoReply(data: {
  type: string;
  keyword?: string;
  matchType?: string;
  replyType: string;
  replyContent: string;
  mediaId?: string;
  title?: string;
  description?: string;
  url?: string;
  picUrl?: string;
  priority?: number;
}, configId?: number) {
  return db.insert(autoReplies).values({ ...data, configId: configId || null });
}

export async function updateAutoReply(id: number, data: Record<string, unknown>) {
  return db.update(autoReplies)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(autoReplies.id, id));
}

export async function deleteAutoReply(id: number) {
  return db.delete(autoReplies).where(eq(autoReplies.id, id));
}

// Menu
export async function getMenuConfigs() {
  return db.select().from(menuConfig).orderBy(desc(menuConfig.updatedAt));
}

export async function getActiveMenu(configId?: number) {
  const conditions = [eq(menuConfig.isPublished, true)];
  if (configId) {
    conditions.push(eq(menuConfig.configId, configId));
  }
  const result = await db.select().from(menuConfig).where(and(...conditions));
  return result[0];
}

export async function saveMenuConfig(data: { name?: string; config: string }, configId?: number) {
  const active = await getActiveMenu(configId);
  if (active) {
    return db.update(menuConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(menuConfig.id, active.id));
  }
  return db.insert(menuConfig).values({ ...data, configId: configId || null });
}

export async function publishMenu(config: string, configId?: number) {
  const active = await getActiveMenu(configId);
  if (active) {
    return db.update(menuConfig)
      .set({
        config,
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(menuConfig.id, active.id));
  }
  return db.insert(menuConfig).values({
    name: '默认菜单',
    config,
    configId: configId || null,
    isPublished: true,
    publishedAt: new Date()
  });
}

// Stats
export async function getTodayStats(configId?: number) {
  const today = new Date().toISOString().slice(0, 10);
  const conditions = [eq(dailyStats.date, today)];
  if (configId) {
    conditions.push(eq(dailyStats.configId, configId));
  }
  const result = await db.select().from(dailyStats).where(and(...conditions));
  if (result[0]) return result[0];

  const totalFans = await getFansCount(configId);
  await db.insert(dailyStats).values({ date: today, totalFans, configId: configId || null });
  const created = await db.select().from(dailyStats).where(and(...conditions));
  return created[0];
}

export async function getRecentStats(days: number = 30, configId?: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const dateStr = date.toISOString().slice(0, 10);
  const conditions = [sql`date >= ${dateStr}`];
  if (configId) {
    conditions.push(eq(dailyStats.configId, configId));
  }
  return db.select().from(dailyStats)
    .where(and(...conditions))
    .orderBy(dailyStats.date);
}

const statFieldMap: Record<string, string> = {
  newFans: 'new_fans',
  unfollowFans: 'unfollow_fans',
  messageCount: 'message_count',
};

export async function incrementStat(field: 'newFans' | 'unfollowFans' | 'messageCount', configId?: number) {
  const today = new Date().toISOString().slice(0, 10);
  const colName = statFieldMap[field];
  const conditions = [eq(dailyStats.date, today)];
  if (configId) {
    conditions.push(eq(dailyStats.configId, configId));
  }
  const existing = await db.select().from(dailyStats).where(and(...conditions));
  if (existing[0]) {
    await db.update(dailyStats)
      .set({ [colName]: sql`${sql.raw(colName)} + 1`, totalFans: await getFansCount(configId) })
      .where(eq(dailyStats.id, existing[0].id));
  } else {
    const totalFans = await getFansCount(configId);
    await db.insert(dailyStats).values({ date: today, [colName]: 1, totalFans, configId: configId || null });
  }
}
