import { NextRequest, NextResponse } from 'next/server';
import { gradeSubmission } from '@/lib/platform-store';
import { getSessionUser } from '@/lib/server-auth';

export async function POST(request: NextRequest, { params }: { params: { submissionId: string } }) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'lecturer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    await gradeSubmission(user, {
        submissionId: params.submissionId,
        grade: body.grade,
        feedback: body.feedback,
    });
    return NextResponse.json({ ok: true });
}
