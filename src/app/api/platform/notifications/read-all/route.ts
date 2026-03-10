import { NextResponse } from 'next/server';
import { markAllNotificationsRead } from '@/lib/platform-store';
import { getSessionUser } from '@/lib/server-auth';

export async function POST() {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true });
}
