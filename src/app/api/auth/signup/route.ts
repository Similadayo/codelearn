import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/platform-store';
import { applySessionCookie } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
    const body = await request.json();
    const result = await createUser({
        name: body.name ?? '',
        email: body.email ?? '',
        password: body.password ?? '',
        role: body.role ?? 'student',
    });
    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const response = NextResponse.json({ user: result.user });
    applySessionCookie(response, result.token);
    return response;
}
