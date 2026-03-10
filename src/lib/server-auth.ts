import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { deleteSession, getUserBySession } from '@/lib/platform-store';

export const SESSION_COOKIE = 'codelearn_session';

export async function getSessionUser() {
    const token = cookies().get(SESSION_COOKIE)?.value ?? null;
    return getUserBySession(token);
}

export function applySessionCookie(response: NextResponse, token: string) {
    response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
    });
}

export async function clearSessionCookie(response: NextResponse) {
    const token = cookies().get(SESSION_COOKIE)?.value ?? null;
    await deleteSession(token);
    response.cookies.set(SESSION_COOKIE, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
}
