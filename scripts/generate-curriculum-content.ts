import OpenAI from 'openai';
import { promises as fs } from 'fs';
import { dirname, join, resolve } from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { curriculumData, topicUsesStackVariant } from '../src/constants/curriculum';

config();

const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';

const SYSTEM_PROMPT = [
  'You are an expert curriculum developer and senior software engineer.',
  'Generate highly-detailed, structured, markdown educational content for programming topics.',
  '',
  'REQUIRED STRUCTURE - include every section, no exceptions:',
  '1. Compelling introductory paragraph: what the concept is and why it matters professionally.',
  '2. Numbered H2 sections (## 1., ## 2., ...) covering key sub-topics with correct code examples.',
  '3. After non-trivial code blocks: add ### Line-by-line explanation breaking down each line.',
  '4. ## X. Common Beginner Mistakes - 3+ real pitfalls with bad vs good code side-by-side.',
  '5. ## Y. Why This Matters In Real Systems - production context and real usage.',
  '6. ## Z. Study Questions - 5 recall questions.',
  '7. ## Exercise - a practical multi-part coding challenge.',
  '',
  'Output ONLY raw markdown. No preamble. Start with the H1 title.',
].join('\n');

type GenerationTarget = {
  outputPath: string;
  trackTitle: string;
  moduleTitle: string;
  topicTitle: string;
  stackName: string | null;
};

function buildStackContentRef(contentRef: string, stackId?: string) {
  if (!stackId) return contentRef;

  const ext = contentRef.lastIndexOf('.');
  const base = ext > -1 ? contentRef.slice(0, ext) : contentRef;
  const suffix = ext > -1 ? contentRef.slice(ext) : '';
  return `${base}_${stackId}${suffix}`;
}

export function getGenerationTargets(contentDir = join(process.cwd(), 'src', 'content')): GenerationTarget[] {
  const targets: GenerationTarget[] = [];

  for (const track of curriculumData.tracks) {
    for (const module of track.modules) {
      for (const topic of module.topics) {
        if (topicUsesStackVariant(track, topic) && track.supportedLanguages?.length) {
          for (const stack of track.supportedLanguages) {
            targets.push({
              outputPath: join(contentDir, buildStackContentRef(topic.contentRef, stack.id)),
              trackTitle: track.title,
              moduleTitle: module.title,
              topicTitle: topic.title,
              stackName: stack.name,
            });
          }
        } else {
          targets.push({
            outputPath: join(contentDir, topic.contentRef),
            trackTitle: track.title,
            moduleTitle: module.title,
            topicTitle: topic.title,
            stackName: null,
          });
        }
      }
    }
  }

  return targets;
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildPrompt(trackTitle: string, moduleTitle: string, topicTitle: string, stackName: string | null) {
  return [
    'Generate a complete detailed lesson for this topic:',
    '',
    `Track: ${trackTitle}`,
    `Module: ${moduleTitle}`,
    `Topic: ${topicTitle}`,
    `Language/Stack: ${stackName || 'Language-agnostic'}`,
    '',
    'Include: intro paragraph, numbered concept sections with code, line-by-line explanations,',
    'Common Beginner Mistakes, Why This Matters In Real Systems, Study Questions, Exercise.',
    'Output ONLY markdown. Begin with the H1 title.',
  ].join('\n');
}

async function generateContent(
  openai: OpenAI,
  trackTitle: string,
  moduleTitle: string,
  topicTitle: string,
  stackName: string | null,
) {
  const request: Parameters<OpenAI['chat']['completions']['create']>[0] = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(trackTitle, moduleTitle, topicTitle, stackName) },
    ],
  };

  if (!MODEL.startsWith('gpt-5')) {
    request.temperature = 0.2;
  }

  const response = await openai.chat.completions.create(request);
  let text = (response.choices[0]?.message?.content || '').trim();

  if (text.startsWith('```markdown')) text = text.slice('```markdown'.length);
  if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);

  return text.trim();
}

async function processTarget(openai: OpenAI, target: GenerationTarget) {
  if (await fileExists(target.outputPath)) {
    console.log(`    [SKIP]     ${target.outputPath}`);
    return false;
  }

  await fs.mkdir(dirname(target.outputPath), { recursive: true });
  console.log(`    [GENERATE] ${target.topicTitle}${target.stackName ? ` (${target.stackName})` : ''}`);
  console.log(`               -> ${target.outputPath}`);

  try {
    const content = await generateContent(
      openai,
      target.trackTitle,
      target.moduleTitle,
      target.topicTitle,
      target.stackName,
    );

    await fs.writeFile(target.outputPath, content, 'utf8');
    console.log(`    [OK]       ${content.length} chars written`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`    [FAILED]   ${target.topicTitle} - ${message}`);
    return false;
  }
}

export async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('\n OPENAI_API_KEY is missing.');
    console.error('   1. Copy .env.example to .env');
    console.error('   2. Add your key from https://platform.openai.com/api-keys\n');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });
  const targets = getGenerationTargets();

  console.log('\n CodeLearn - Curriculum Content Generator');
  console.log('==========================================');
  console.log(`Model : ${MODEL}`);
  console.log('Delay : 1 s between API calls');
  console.log('Output: src/content/**/*.md');
  console.log(`Targets: ${targets.length}\n`);

  let generated = 0;
  let skipped = 0;
  let currentTrack = '';
  let currentModule = '';

  for (const target of targets) {
    if (target.trackTitle !== currentTrack) {
      currentTrack = target.trackTitle;
      console.log(`\nTrack: ${currentTrack}`);
      currentModule = '';
    }

    if (target.moduleTitle !== currentModule) {
      currentModule = target.moduleTitle;
      console.log(`  Module: ${currentModule}`);
    }

    const ok = await processTarget(openai, target);
    if (ok) {
      generated += 1;
    } else {
      skipped += 1;
    }
  }

  console.log('\n==========================================');
  console.log(`Done! Generated: ${generated} | Skipped: ${skipped}`);
  console.log('Files are in src/content/');
}

export default {
  getGenerationTargets,
  main,
};

const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Fatal: ${message}`);
    process.exit(1);
  });
}
