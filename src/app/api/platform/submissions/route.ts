import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server-auth';
import { submitExercise } from '@/lib/platform-store';

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    await submitExercise(user, body);
    return NextResponse.json({ ok: true });
}
