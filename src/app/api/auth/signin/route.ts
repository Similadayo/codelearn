import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/platform-store';
import { applySessionCookie } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
    const body = await request.json();
    const result = await authenticateUser(body.email ?? '', body.password ?? '');
    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 401 });
    }
    const response = NextResponse.json({ user: result.user });
    applySessionCookie(response, result.token);
    return response;
}
