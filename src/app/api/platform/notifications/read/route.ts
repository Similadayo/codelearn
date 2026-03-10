import { NextRequest, NextResponse } from 'next/server';
import { markNotificationRead } from '@/lib/platform-store';
import { getSessionUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    await markNotificationRead(user.id, body.notificationId);
    return NextResponse.json({ ok: true });
}
