import { NextResponse } from 'next/server';
import { getAppStateForUser } from '@/lib/platform-store';
import { getSessionUser } from '@/lib/server-auth';

export async function GET() {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const state = await getAppStateForUser(user.id);
    return NextResponse.json(state);
}
