import 'server-only';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { pgTable, text, integer, real, boolean, serial, timestamp } from 'drizzle-orm/pg-core';
import { count, eq, like, desc, and, sql, or } from 'drizzle-orm';

function createDb() {
  const sql_url = process.env.POSTGRES_URL;
  if (!sql_url) throw new Error('POSTGRES_URL 环境变量未设置');
  const client = neon(sql_url);
  return drizzle(client);
}

let _db: NeonHttpDatabase | null = null;
export function getDb(): NeonHttpDatabase {
  if (!_db) _db = createDb();
  return _db;
}
// For backward compatibility
export const db = new Proxy({} as NeonHttpDatabase, {
  get(_, prop) {
    return (getDb() as any)[prop];
  }
});

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
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const fans = pgTable('fans', {
  id: serial('id').primaryKey(),
  openid: text('openid').notNull().unique(),
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
  name: text('name').notNull().default('默认菜单'),
  config: text('config').notNull(),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dailyStats = pgTable('daily_stats', {
  id: serial('id').primaryKey(),
  date: text('date').notNull().unique(),
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

// ==================== Helper Functions ====================

export async function getConfig() {
  return db.select().from(wechatConfig).where(eq(wechatConfig.enabled, true)).then(r => r[0]);
}

export async function saveConfig(data: { appid: string; appSecret: string; name?: string }) {
  const existing = await getConfig();
  if (existing) {
    return db.update(wechatConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(wechatConfig.id, existing.id));
  }
  return db.insert(wechatConfig).values(data);
}

// Fans
export async function getFans(search: string = '', offset: number = 0, limit: number = 20) {
  const whereClause = search
    ? or(
        like(fans.nickname, `%${search}%`),
        like(fans.openid, `%${search}%`),
        like(fans.city, `%${search}%`),
        like(fans.province, `%${search}%`)
      )
    : undefined;

  const totalResult = await db.select({ count: count() }).from(fans).where(whereClause);
  const list = await db.select().from(fans)
    .where(whereClause)
    .orderBy(desc(fans.createdAt))
    .limit(limit)
    .offset(offset);

  return { fans: list, total: totalResult[0]?.count || 0 };
}

export async function getFanByOpenid(openid: string) {
  const result = await db.select().from(fans).where(eq(fans.openid, openid));
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
}) {
  const existing = await getFanByOpenid(data.openid);
  if (existing) {
    return db.update(fans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fans.openid, data.openid));
  }
  return db.insert(fans).values(data);
}

export async function deleteFan(id: number) {
  return db.delete(fans).where(eq(fans.id, id));
}

export async function getFansCount() {
  const result = await db.select({ count: count() }).from(fans).where(eq(fans.subscribe, true));
  return result[0]?.count || 0;
}

// Messages
export async function getMessages(offset: number = 0, limit: number = 50) {
  const totalResult = await db.select({ count: count() }).from(messages);
  const list = await db.select().from(messages)
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
}) {
  return db.insert(messages).values(data);
}

export async function getTodayMessageCount() {
  const today = new Date().toISOString().slice(0, 10);
  const result = await db.select({ count: count() })
    .from(messages)
    .where(sql`date(created_at) = ${today}`);
  return result[0]?.count || 0;
}

// Auto Replies
export async function getAutoReplies(type?: string) {
  if (type) {
    return db.select().from(autoReplies)
      .where(and(eq(autoReplies.type, type), eq(autoReplies.enabled, true)))
      .orderBy(desc(autoReplies.priority));
  }
  return db.select().from(autoReplies).orderBy(desc(autoReplies.priority));
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
}) {
  return db.insert(autoReplies).values(data);
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

export async function getActiveMenu() {
  const result = await db.select().from(menuConfig).where(eq(menuConfig.isPublished, true));
  return result[0];
}

export async function saveMenuConfig(data: { name?: string; config: string }) {
  const active = await getActiveMenu();
  if (active) {
    return db.update(menuConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(menuConfig.id, active.id));
  }
  return db.insert(menuConfig).values(data);
}

export async function publishMenu(config: string) {
  const active = await getActiveMenu();
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
    isPublished: true,
    publishedAt: new Date()
  });
}

// Stats
export async function getTodayStats() {
  const today = new Date().toISOString().slice(0, 10);
  const result = await db.select().from(dailyStats).where(eq(dailyStats.date, today));
  if (result[0]) return result[0];

  const totalFans = await getFansCount();
  await db.insert(dailyStats).values({ date: today, totalFans });
  const created = await db.select().from(dailyStats).where(eq(dailyStats.date, today));
  return created[0];
}

export async function getRecentStats(days: number = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const dateStr = date.toISOString().slice(0, 10);
  return db.select().from(dailyStats)
    .where(sql`date >= ${dateStr}`)
    .orderBy(dailyStats.date);
}

const statFieldMap: Record<string, string> = {
  newFans: 'new_fans',
  unfollowFans: 'unfollow_fans',
  messageCount: 'message_count',
};

export async function incrementStat(field: 'newFans' | 'unfollowFans' | 'messageCount') {
  const today = new Date().toISOString().slice(0, 10);
  const colName = statFieldMap[field];
  const existing = await db.select().from(dailyStats).where(eq(dailyStats.date, today));
  if (existing[0]) {
    await db.update(dailyStats)
      .set({ [colName]: sql`${sql.raw(colName)} + 1`, totalFans: await getFansCount() })
      .where(eq(dailyStats.date, today));
  } else {
    const totalFans = await getFansCount();
    await db.insert(dailyStats).values({ date: today, [colName]: 1, totalFans });
  }
}
