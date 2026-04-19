import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, any> = {};

  // 1. Check env vars
  results.POSTGRES_URL_set = !!process.env.POSTGRES_URL;
  results.POSTGRES_URL_prefix = process.env.POSTGRES_URL?.substring(0, 60) + '...';

  // 2. Clean URL
  let sql_url = process.env.POSTGRES_URL || '';
  const cleaned = sql_url.replace(/[?&]channel_binding=[^&]*/g, '').replace(/\?$/, '');
  results.cleaned_url = cleaned.substring(0, 80) + '...';

  // 3. Try direct neon connection
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(cleaned);
    const r = await sql`SELECT 1 as test, now() as time`;
    results.neon_direct = { success: true, data: r };
  } catch (e: any) {
    results.neon_direct = { success: false, error: e.message };
  }

  // 4. Try drizzle query
  try {
    const { getDb, users } = await import('@/lib/db');
    const { eq } = await import('drizzle-orm');
    const db = getDb();
    const r = await db.select().from(users).limit(1);
    results.drizzle_query = { success: true, userCount: r.length, users: r };
  } catch (e: any) {
    results.drizzle_query = { success: false, error: e.message, stack: e.stack?.substring(0, 200) };
  }

  return NextResponse.json(results, { status: 200 });
}
