import { NextRequest, NextResponse } from 'next/server';
import { readTopicMarkdown } from '@/lib/content-files';
import { getMockContent } from '@/lib/content';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const trackId = searchParams.get('trackId');
  const moduleId = searchParams.get('moduleId');
  const topicId = searchParams.get('topicId');
  const lang = searchParams.get('lang') || undefined;

  if (!trackId || !moduleId || !topicId) {
    return NextResponse.json(
      { error: 'trackId, moduleId, and topicId are required.' },
      { status: 400 },
    );
  }

  const markdown = await readTopicMarkdown(trackId, moduleId, topicId, lang);

  if (markdown) {
    return NextResponse.json({ content: markdown, source: 'file' });
  }

  return NextResponse.json({
    content: getMockContent(trackId, moduleId, topicId, lang),
    source: 'fallback',
  });
}
