import { NextRequest, NextResponse } from 'next/server';
import { markTopicCompleted } from '@/lib/platform-store';
import { getSessionUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    await markTopicCompleted(user, body.topicKey);
    return NextResponse.json({ ok: true });
}
