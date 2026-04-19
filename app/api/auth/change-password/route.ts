import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: '请填写旧密码和新密码' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码长度不能少于6位' }, { status: 400 });
    }

    // 查找当前用户
    const result = await db.select().from(users).where(eq(users.id, Number(session.user.id)));
    const user = result[0];
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 验证旧密码
    const isValid = bcrypt.compareSync(oldPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: '旧密码错误' }, { status: 400 });
    }

    // 更新密码
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, Number(session.user.id)));

    return NextResponse.json({ success: true, message: '密码修改成功' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '修改密码失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
