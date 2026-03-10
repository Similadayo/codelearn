import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server-auth';
import { toggleBookmark } from '@/lib/platform-store';

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const result = await toggleBookmark(user, {
        topicKey: body.topicKey,
        trackId: body.trackId,
        moduleId: body.moduleId,
        topicId: body.topicId,
    });
    return NextResponse.json(result);
}
