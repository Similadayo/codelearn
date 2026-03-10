import { NextRequest, NextResponse } from 'next/server';
import { createCohort } from '@/lib/platform-store';
import { getSessionUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'lecturer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    await createCohort(user, body.name);
    return NextResponse.json({ ok: true });
}
