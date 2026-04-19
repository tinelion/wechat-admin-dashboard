import bcrypt from 'bcryptjs';

const sql_url = process.env.POSTGRES_URL;
if (!sql_url) {
  console.error('POSTGRES_URL environment variable is required');
  process.exit(1);
}

// Detect connection type
const isNeonHttp = sql_url.includes('neon.tech') || sql_url.startsWith('http://');

function getSqlExecutor() {
  if (isNeonHttp) {
    // Neon HTTP
    let cleanUrl = sql_url!;
    try {
      const u = new URL(cleanUrl);
      u.searchParams.delete('channel_binding');
      cleanUrl = u.toString();
    } catch {}
    const { neon } = require('@neondatabase/serverless');
    return neon(cleanUrl);
  } else {
    // Standard PostgreSQL (Docker / local)
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: sql_url });
    const executor: any = async (...args: any[]) => {
      const text = args[0];
      const params = args.slice(1);
      const res = await pool.query(text, params);
      return res.rows;
    };
    executor.__pool = pool;
    return executor;
  }
}

const sql = getSqlExecutor();

async function init() {
  console.log('Initializing database tables...');

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS wechat_config (
      id SERIAL PRIMARY KEY,
      appid TEXT NOT NULL,
      app_secret TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '默认公众号',
      account_type TEXT NOT NULL DEFAULT 'subscription',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS fans (
      id SERIAL PRIMARY KEY,
      config_id INTEGER,
      openid TEXT NOT NULL,
      nickname TEXT,
      headimgurl TEXT,
      sex INTEGER DEFAULT 0,
      city TEXT,
      province TEXT,
      country TEXT,
      language TEXT,
      subscribe BOOLEAN NOT NULL DEFAULT TRUE,
      subscribe_time TEXT,
      subscribe_scene TEXT,
      remark TEXT,
      tag_ids TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      config_id INTEGER,
      msg_id TEXT,
      openid TEXT NOT NULL,
      msg_type TEXT NOT NULL,
      content TEXT,
      pic_url TEXT,
      media_id TEXT,
      format TEXT,
      recognition TEXT,
      thumb_media_id TEXT,
      location_x REAL,
      location_y REAL,
      label TEXT,
      title TEXT,
      description TEXT,
      url TEXT,
      event TEXT,
      event_key TEXT,
      ticket TEXT,
      is_outgoing BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS auto_replies (
      id SERIAL PRIMARY KEY,
      config_id INTEGER,
      type TEXT NOT NULL,
      keyword TEXT,
      match_type TEXT NOT NULL DEFAULT 'exact',
      reply_type TEXT NOT NULL,
      reply_content TEXT NOT NULL,
      media_id TEXT,
      title TEXT,
      description TEXT,
      url TEXT,
      pic_url TEXT,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS menu_config (
      id SERIAL PRIMARY KEY,
      config_id INTEGER,
      name TEXT NOT NULL DEFAULT '默认菜单',
      config TEXT NOT NULL,
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      published_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS daily_stats (
      id SERIAL PRIMARY KEY,
      config_id INTEGER,
      date TEXT NOT NULL,
      new_fans INTEGER NOT NULL DEFAULT 0,
      unfollow_fans INTEGER NOT NULL DEFAULT 0,
      total_fans INTEGER NOT NULL DEFAULT 0,
      message_count INTEGER NOT NULL DEFAULT 0
    )
  `;

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_fans_config_id ON fans(config_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_fans_openid ON fans(openid)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_fans_subscribe ON fans(subscribe)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_config_id ON messages(config_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_openid ON messages(openid)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_auto_replies_config_id ON auto_replies(config_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_auto_replies_type ON auto_replies(type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_menu_config_config_id ON menu_config(config_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_daily_stats_config_id ON daily_stats(config_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_wechat_config_appid ON wechat_config(appid)`;

  // Migrate existing tables: add config_id column if not exists
  try {
    await sql`ALTER TABLE fans ADD COLUMN IF NOT EXISTS config_id INTEGER`;
    console.log('  - fans.config_id column ensured');
  } catch (e) { /* column may already exist */ }

  try {
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS config_id INTEGER`;
    console.log('  - messages.config_id column ensured');
  } catch (e) { /* column may already exist */ }

  try {
    await sql`ALTER TABLE auto_replies ADD COLUMN IF NOT EXISTS config_id INTEGER`;
    console.log('  - auto_replies.config_id column ensured');
  } catch (e) { /* column may already exist */ }

  try {
    await sql`ALTER TABLE menu_config ADD COLUMN IF NOT EXISTS config_id INTEGER`;
    console.log('  - menu_config.config_id column ensured');
  } catch (e) { /* column may already exist */ }

  try {
    await sql`ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS config_id INTEGER`;
    console.log('  - daily_stats.config_id column ensured');
  } catch (e) { /* column may already exist */ }

  // Drop old unique constraint on fans.openid if exists, add composite unique
  try {
    await sql`ALTER TABLE fans DROP CONSTRAINT IF EXISTS fans_openid_unique`;
    console.log('  - dropped fans.openid unique constraint');
  } catch (e) { /* may not exist */ }

  try {
    await sql`ALTER TABLE fans ADD CONSTRAINT fans_openid_config_id_unique UNIQUE (openid, config_id)`;
    console.log('  - added fans (openid, config_id) composite unique constraint');
  } catch (e) { /* may already exist */ }

  // Drop old unique constraint on daily_stats.date if exists, add composite unique
  try {
    await sql`ALTER TABLE daily_stats DROP CONSTRAINT IF EXISTS daily_stats_date_unique`;
    console.log('  - dropped daily_stats.date unique constraint');
  } catch (e) { /* may not exist */ }

  try {
    await sql`ALTER TABLE daily_stats ADD CONSTRAINT daily_stats_date_config_id_unique UNIQUE (date, config_id)`;
    console.log('  - added daily_stats (date, config_id) composite unique constraint');
  } catch (e) { /* may already exist */ }

  // Seed admin user
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await sql`SELECT id FROM users WHERE username = ${adminUsername}`;
  if (existing.length === 0) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    await sql`INSERT INTO users (username, password, name) VALUES (${adminUsername}, ${hashedPassword}, '管理员')`;
    console.log(`Default admin user created: ${adminUsername}`);
  } else {
    console.log(`Admin user already exists: ${adminUsername}`);
  }

  console.log('Database initialized successfully!');

  // Close pool if using pg
  if ((sql as any).__pool) {
    await (sql as any).__pool.end();
  }
}

init().catch(console.error);
