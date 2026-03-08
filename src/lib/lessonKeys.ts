export function buildTopicKey(trackId: string, moduleId: string, topicId: string): string {
  return `${trackId}::${moduleId}::${topicId}`;
}

export function buildSubmissionId(userId: string, topicKey: string): string {
  return `${userId}::${topicKey}`;
}

export function formatTopicPath(trackId: string, moduleId: string, topicId: string, lang?: string): string {
  const base = `/curriculum/${trackId}/${moduleId}/${topicId}`;
  return lang ? `${base}?lang=${lang}` : base;
}

