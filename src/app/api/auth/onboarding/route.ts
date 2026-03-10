import { NextRequest, NextResponse } from 'next/server';
import { completeUserOnboarding } from '@/lib/platform-store';
import { getSessionUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const nextUser = await completeUserOnboarding(user.id, {
        preferredTrackId: body.preferredTrackId,
        preferredStackId: body.preferredStackId,
        studyGoal: body.studyGoal,
    });
    return NextResponse.json({ user: nextUser });
}
