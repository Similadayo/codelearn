import { promises as fs } from 'fs';
import path from 'path';
import { curriculumData, topicUsesStackVariant } from '@/constants/curriculum';

function buildLanguageContentRef(contentRef: string, lang?: string) {
  if (!lang) return contentRef;

  const ext = path.extname(contentRef);
  const base = contentRef.slice(0, -ext.length);
  return `${base}_${lang}${ext}`;
}

export function resolveTopicContentPath(
  trackId: string,
  moduleId: string,
  topicId: string,
  lang?: string,
) {
  const track = curriculumData.tracks.find((item) => item.id === trackId);
  const moduleInfo = track?.modules.find((item) => item.id === moduleId);
  const topic = moduleInfo?.topics.find((item) => item.id === topicId);

  if (!track || !topic) {
    return null;
  }

  const relativeRef = topicUsesStackVariant(track, topic)
    ? buildLanguageContentRef(topic.contentRef, lang)
    : topic.contentRef;

  return path.join(process.cwd(), 'src', 'content', relativeRef);
}

export async function readTopicMarkdown(
  trackId: string,
  moduleId: string,
  topicId: string,
  lang?: string,
) {
  const contentPath = resolveTopicContentPath(trackId, moduleId, topicId, lang);

  if (!contentPath) {
    return null;
  }

  try {
    return await fs.readFile(contentPath, 'utf8');
  } catch (error) {
    const isMissingFile =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT';

    if (isMissingFile) {
      return null;
    }

    throw error;
  }
}
