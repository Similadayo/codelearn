import { promises as fs } from 'fs';
import path from 'path';
import { curriculumData, topicUsesStackVariant } from '@/constants/curriculum';

type CoverageEntry = {
  trackId: string;
  trackTitle: string;
  moduleId: string;
  moduleTitle: string;
  topicId: string;
  topicTitle: string;
  stackId: string | null;
  stackName: string | null;
  relativePath: string;
  absolutePath: string;
  exists: boolean;
};

type ModuleCoverage = {
  id: string;
  title: string;
  expected: number;
  existing: number;
  missing: number;
};

type TrackCoverage = {
  id: string;
  title: string;
  expected: number;
  existing: number;
  missing: number;
  coveragePct: number;
  modules: ModuleCoverage[];
};

export type CurriculumCoverageReport = {
  generatedAt: string;
  totals: {
    expected: number;
    existing: number;
    missing: number;
    coveragePct: number;
    issues: number;
  };
  tracks: TrackCoverage[];
  missing: CoverageEntry[];
  issues: string[];
};

function buildVariantRef(contentRef: string, stackId?: string) {
  if (!stackId) return contentRef;

  const ext = path.extname(contentRef);
  const base = ext ? contentRef.slice(0, -ext.length) : contentRef;
  return `${base}_${stackId}${ext}`;
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function roundCoverage(existing: number, expected: number) {
  if (!expected) return 100;
  return Math.round((existing / expected) * 1000) / 10;
}

export async function getCurriculumCoverageReport(): Promise<CurriculumCoverageReport> {
  const contentRoot = path.join(process.cwd(), 'src', 'content');
  const issues: string[] = [];
  const entries: CoverageEntry[] = [];
  const seenTopicKeys = new Set<string>();

  for (const track of curriculumData.tracks) {
    for (const module of track.modules) {
      for (const topic of module.topics) {
        const topicKey = `${track.id}:${module.id}:${topic.id}`;
        if (seenTopicKeys.has(topicKey)) {
          issues.push(`Duplicate topic key detected: ${topicKey}`);
        }
        seenTopicKeys.add(topicKey);

        if (!topic.contentRef.includes(`${track.id}/`)) {
          issues.push(`Topic ${topicKey} points outside its track folder: ${topic.contentRef}`);
        }

        if (!topic.contentRef.includes(`/${topic.id}.md`) && !topic.contentRef.endsWith(`${topic.id}.md`)) {
          issues.push(`Topic ${topicKey} contentRef does not align with topic id: ${topic.contentRef}`);
        }

        const expectedModuleSegment = `/${module.id}/`;
        if (!topic.contentRef.includes(expectedModuleSegment)) {
          issues.push(`Topic ${topicKey} contentRef does not match module id ${module.id}: ${topic.contentRef}`);
        }

        if (topicUsesStackVariant(track, topic) && track.supportedLanguages?.length) {
          for (const stack of track.supportedLanguages) {
            const relativePath = buildVariantRef(topic.contentRef, stack.id);
            const absolutePath = path.join(contentRoot, relativePath);
            entries.push({
              trackId: track.id,
              trackTitle: track.title,
              moduleId: module.id,
              moduleTitle: module.title,
              topicId: topic.id,
              topicTitle: topic.title,
              stackId: stack.id,
              stackName: stack.name,
              relativePath,
              absolutePath,
              exists: await fileExists(absolutePath),
            });
          }
        } else {
          const absolutePath = path.join(contentRoot, topic.contentRef);
          entries.push({
            trackId: track.id,
            trackTitle: track.title,
            moduleId: module.id,
            moduleTitle: module.title,
            topicId: topic.id,
            topicTitle: topic.title,
            stackId: null,
            stackName: null,
            relativePath: topic.contentRef,
            absolutePath,
            exists: await fileExists(absolutePath),
          });
        }
      }
    }
  }

  const tracks: TrackCoverage[] = curriculumData.tracks.map((track) => {
    const trackEntries = entries.filter((entry) => entry.trackId === track.id);
    const modules: ModuleCoverage[] = track.modules.map((module) => {
      const moduleEntries = trackEntries.filter((entry) => entry.moduleId === module.id);
      const existing = moduleEntries.filter((entry) => entry.exists).length;
      return {
        id: module.id,
        title: module.title,
        expected: moduleEntries.length,
        existing,
        missing: moduleEntries.length - existing,
      };
    });

    const existing = trackEntries.filter((entry) => entry.exists).length;
    return {
      id: track.id,
      title: track.title,
      expected: trackEntries.length,
      existing,
      missing: trackEntries.length - existing,
      coveragePct: roundCoverage(existing, trackEntries.length),
      modules,
    };
  });

  const existing = entries.filter((entry) => entry.exists).length;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      expected: entries.length,
      existing,
      missing: entries.length - existing,
      coveragePct: roundCoverage(existing, entries.length),
      issues: issues.length,
    },
    tracks,
    missing: entries.filter((entry) => !entry.exists),
    issues,
  };
}

export default {
  getCurriculumCoverageReport,
};
