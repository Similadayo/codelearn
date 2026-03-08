import { backendLanguages, curriculumData, Module, Topic, Track } from '@/constants/curriculum';
import { phase1NodejsContent } from './content-phase1-nodejs';
import { phase2SharedContent } from './content-phase2-shared';
import { phase4NodejsContent } from './content-phase4-nodejs';

const contentRegistry: Record<string, string> = {
  ...phase1NodejsContent,
  ...phase2SharedContent,
  ...phase4NodejsContent,
};

type TopicContext = {
  track: Track;
  module: Module;
  topic: Topic;
};

type TrackGuide = {
  identity: string;
  value: string;
  workflow: string[];
  mistakes: string[];
  miniProject: string;
  metrics: string[];
};

const trackGuides: Record<string, TrackGuide> = {
  backend: {
    identity: 'A backend engineer designs reliable systems that accept input, enforce rules, move data safely, and expose useful behavior through APIs.',
    value: 'In practice this means turning business requirements into endpoints, background jobs, validation rules, data models, and production operations.',
    workflow: [
      'Model the request and response shape before you write code.',
      'Validate every input as early as possible.',
      'Keep business logic separate from transport concerns like HTTP or queues.',
      'Persist only clean, well-structured data.',
      'Measure failures, latency, and throughput before calling the feature done.',
    ],
    mistakes: [
      'Treating framework syntax as understanding. The syntax is the easy part; the design tradeoffs matter more.',
      'Skipping validation because the frontend already checks the form.',
      'Designing for the happy path only and ignoring retries, timeouts, and bad data.',
      'Writing code before naming the resources, state transitions, and invariants.',
    ],
    miniProject: 'Build one small but production-minded service around this topic. Include validation, logging, tests, and one paragraph describing how you would deploy or monitor it.',
    metrics: ['latency', 'error rate', 'throughput', 'data correctness', 'operational simplicity'],
  },
  frontend: {
    identity: 'A frontend engineer translates product intent into clear interfaces, resilient client-side state, and smooth interactions that work on real devices.',
    value: 'The goal is not just to make pages look good. The goal is to make systems understandable, fast, accessible, and easy to change.',
    workflow: [
      'Start from user tasks, not components.',
      'Define data flow before styling details.',
      'Design states for loading, success, empty, and error.',
      'Favor accessibility and keyboard support by default.',
      'Measure rendering cost before optimizing blindly.',
    ],
    mistakes: [
      'Building UI without clear state ownership.',
      'Styling first and semantics later.',
      'Ignoring accessibility until late in the project.',
      'Overusing global state for local component concerns.',
    ],
    miniProject: 'Ship a polished interface for this topic with explicit loading, empty, and failure states, then explain the tradeoffs you made.',
    metrics: ['task completion time', 'web vitals', 'accessibility', 'bundle size', 'maintainability'],
  },
  mobile: {
    identity: 'A mobile engineer builds experiences for constrained devices, varying network quality, touch input, and platform-specific expectations.',
    value: 'Mobile success depends on responsiveness, battery awareness, offline behavior, and confidence when the user is away from perfect connectivity.',
    workflow: [
      'Design for intermittent networks and background interruptions.',
      'Minimize screen friction and unnecessary taps.',
      'Use platform patterns instead of fighting them.',
      'Handle permissions explicitly and respectfully.',
      'Profile startup time, memory use, and animation smoothness.',
    ],
    mistakes: [
      'Porting desktop assumptions directly to mobile flows.',
      'Treating device APIs as always available or always instant.',
      'Ignoring memory pressure and low-end hardware.',
      'Designing touch targets that are visually nice but physically hard to use.',
    ],
    miniProject: 'Prototype a mobile feature around this topic and define what happens on slow networks, denied permissions, and app restarts.',
    metrics: ['startup time', 'crash rate', 'memory use', 'frame stability', 'offline resilience'],
  },
  'data-science': {
    identity: 'A data scientist turns raw information into trustworthy insight, models, and decisions with clear assumptions and measurable error.',
    value: 'Good data work is not magic. It is disciplined problem framing, careful cleaning, sensible baselines, and honest evaluation.',
    workflow: [
      'Clarify the question before choosing a tool.',
      'Inspect and clean the data before modeling.',
      'Build a baseline before chasing sophistication.',
      'Evaluate with metrics tied to the real decision.',
      'Document assumptions, bias, and failure modes.',
    ],
    mistakes: [
      'Jumping to machine learning when SQL or visualization would answer the question.',
      'Training on dirty or leaked data.',
      'Optimizing a metric that does not match the business objective.',
      'Reporting results without confidence intervals or caveats.',
    ],
    miniProject: 'Create a small analysis or model for this topic and explain the data quality issues, assumptions, and limits of your result.',
    metrics: ['data quality', 'precision or recall', 'business impact', 'interpretability', 'reproducibility'],
  },
  devops: {
    identity: 'A DevOps engineer improves the speed and safety with which software moves from laptop to production and stays reliable there.',
    value: 'The discipline combines automation, observability, infrastructure, deployment strategy, and operational calm under failure.',
    workflow: [
      'Standardize the environment before scaling the workflow.',
      'Automate the repetitive path first.',
      'Prefer observable systems over clever but opaque ones.',
      'Design rollbacks before you need them.',
      'Treat incidents as learning loops, not blame sessions.',
    ],
    mistakes: [
      'Adding tools without simplifying the workflow.',
      'Automating an unreliable manual process instead of fixing it.',
      'Shipping infrastructure changes without observability.',
      'Treating production as the first time a system is exercised realistically.',
    ],
    miniProject: 'Automate one operational workflow for this topic and document deploy, rollback, alerting, and recovery steps.',
    metrics: ['deployment frequency', 'change failure rate', 'mean time to recovery', 'infrastructure clarity', 'cost awareness'],
  },
  cybersecurity: {
    identity: 'A security practitioner reduces risk by understanding how systems fail, how attackers think, and how controls should be layered.',
    value: 'Security is not one feature. It is an ongoing practice of hardening, detection, response, and informed tradeoffs.',
    workflow: [
      'Map assets, entry points, and trust boundaries.',
      'Assume misuse, not just intended use.',
      'Layer preventative and detective controls.',
      'Log enough context to investigate incidents later.',
      'Revisit risk as the system changes.',
    ],
    mistakes: [
      'Focusing on single tools instead of attack paths.',
      'Ignoring basic hygiene while chasing advanced threats.',
      'Adding controls that nobody can operate or monitor.',
      'Treating compliance language as equivalent to real security posture.',
    ],
    miniProject: 'Assess a small system through the lens of this topic, propose controls, and explain how you would validate them.',
    metrics: ['attack surface', 'time to detect', 'time to contain', 'control coverage', 'forensic usefulness'],
  },
};

const backendPhaseGoals: Record<string, string[]> = {
  phase1: [
    'Become fluent enough in your language that syntax stops slowing down your thinking.',
    'Understand primitive values, collections, functions, errors, and modular structure.',
    'Learn the runtime habits that make debugging and maintenance easier later.',
  ],
  phase2: [
    'Operate like a professional developer, not just someone who writes code in a file.',
    'Use the terminal, Git, and local tooling confidently.',
    'Build repeatable workflows you can use on any machine or team.',
  ],
  phase3: [
    'Understand the network and protocol layer underneath every API call.',
    'Reason about requests, responses, serialization, caching, and resource design.',
    'Build a strong mental model before adding frameworks and infrastructure.',
  ],
  phase4: [
    'Create HTTP services with clear routes, middleware, validation, and test strategy.',
    'Separate transport concerns from domain logic.',
    'Think in request lifecycle terms: receive, validate, process, persist, respond.',
  ],
  phase5: [
    'Model data deliberately instead of treating the database as a dumping ground.',
    'Use SQL and schema design to preserve correctness and performance.',
    'Know when to reach for relational patterns, indexing, transactions, and NoSQL.',
  ],
  phase6: [
    'Protect identity, sessions, secrets, and authorization decisions.',
    'Recognize common attack paths and design safe defaults.',
    'Connect security choices to concrete implementation details.',
  ],
  phase7: [
    'Add the practical features that make APIs useful in production products.',
    'Work with asynchronous jobs, external services, search, and realtime behavior.',
    'Design interfaces that evolve safely over time.',
  ],
  phase8: [
    'Package, ship, observe, and operate software beyond the laptop.',
    'Treat deployability and observability as part of feature completeness.',
    'Manage config, secrets, and infrastructure with discipline.',
  ],
  phase9: [
    'Reason about scale, failure domains, consistency, and architecture tradeoffs.',
    'Choose system boundaries and communication patterns intentionally.',
    'Move from code-level thinking to system-level design thinking.',
  ],
};

function getTopicContext(trackId: string, moduleId: string, topicId: string): TopicContext | null {
  const track = curriculumData.tracks.find((entry) => entry.id === trackId);
  if (!track) return null;

  const module = track.modules.find((entry) => entry.id === moduleId);
  if (!module) return null;

  const topic = module.topics.find((entry) => entry.id === topicId);
  if (!topic) return null;

  return { track, module, topic };
}

function slugToWords(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getLanguageName(lang?: string): string {
  if (!lang) return 'your chosen backend language';
  return backendLanguages.find((entry) => entry.id === lang)?.name ?? slugToWords(lang);
}

function getLanguageFramework(lang?: string): string {
  if (!lang) return 'your preferred web framework';
  return backendLanguages.find((entry) => entry.id === lang)?.framework ?? 'a production-grade framework';
}

function inferTopicConcepts(topic: Topic): string[] {
  const title = topic.title.toLowerCase();
  const concepts = new Set<string>();

  if (title.includes('http')) concepts.add('request-response semantics');
  if (title.includes('rest')) concepts.add('resource-oriented design');
  if (title.includes('json') || title.includes('xml') || title.includes('format')) concepts.add('serialization and parsing');
  if (title.includes('database') || title.includes('sql') || title.includes('orm') || title.includes('query')) concepts.add('data modeling and access patterns');
  if (title.includes('auth') || title.includes('oauth') || title.includes('jwt') || title.includes('password')) concepts.add('identity, trust, and session boundaries');
  if (title.includes('security') || title.includes('https') || title.includes('cors') || title.includes('tls')) concepts.add('attack surface and defensive defaults');
  if (title.includes('docker') || title.includes('cloud') || title.includes('deploy') || title.includes('cicd')) concepts.add('operational packaging and delivery');
  if (title.includes('system design') || title.includes('scaling') || title.includes('replication') || title.includes('queue')) concepts.add('distributed tradeoffs and capacity planning');
  if (title.includes('routing') || title.includes('server') || title.includes('middleware')) concepts.add('request lifecycle composition');
  if (title.includes('test')) concepts.add('verification strategy and regression control');
  if (title.includes('function')) concepts.add('decomposition and reuse');
  if (title.includes('error')) concepts.add('failure handling and observability');
  if (title.includes('terminal') || title.includes('git')) concepts.add('developer workflow discipline');

  if (concepts.size === 0) {
    concepts.add('clear vocabulary');
    concepts.add('repeatable workflow');
    concepts.add('common tradeoffs');
  }

  return Array.from(concepts);
}

function buildCodeFence(langId: string, code: string): string {
  const map: Record<string, string> = {
    nodejs: 'javascript',
    python: 'python',
    go: 'go',
    java: 'java',
    php: 'php',
    ruby: 'ruby',
  };

  return `\n\n\`\`\`${map[langId] ?? 'text'}\n${code.trim()}\n\`\`\``;
}

function buildBackendSnippet(lang: string | undefined, moduleId: string, topic: Topic): string {
  const selectedLang = lang ?? 'nodejs';
  const topicLabel = topic.title;
  const framework = getLanguageFramework(selectedLang);

  const snippets: Record<string, Record<string, string>> = {
    nodejs: {
      phase1: `const lesson = {
  topic: '${topic.id}',
  title: '${topicLabel}',
  skillLevel: 'foundation',
};

function explainLesson(item) {
  return \`\${item.title} teaches backend thinking through repeatable practice.\`;
}

console.log(explainLesson(lesson));`,
      phase4: `import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', topic: '${topic.id}' });
});

app.listen(3000, () => {
  console.log('Server ready with ${framework} patterns in mind');
});`,
      phase5: `import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function listRecords() {
  const result = await pool.query('SELECT id, name FROM records ORDER BY id DESC LIMIT 20');
  return result.rows;
}`,
      phase6: `import jwt from 'jsonwebtoken';

export function issueToken(userId) {
  return jwt.sign({ sub: userId, role: 'student' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
}`,
      phase8: `const config = {
  port: Number(process.env.PORT || 3000),
  env: process.env.NODE_ENV || 'development',
};

console.log({ message: 'Boot configuration loaded', config });`,
    },
    python: {
      phase1: `lesson = {
    'topic': '${topic.id}',
    'title': '${topicLabel}',
    'skill_level': 'foundation',
}


def explain_lesson(item: dict) -> str:
    return f"{item['title']} builds dependable backend habits through repeated practice."


print(explain_lesson(lesson))`,
      phase4: `from fastapi import FastAPI

app = FastAPI()


@app.get('/health')
def health() -> dict:
    return {'status': 'ok', 'topic': '${topic.id}'}
`,
      phase5: `import sqlite3


def list_records() -> list[tuple]:
    connection = sqlite3.connect('app.db')
    cursor = connection.execute('SELECT id, name FROM records ORDER BY id DESC LIMIT 20')
    rows = cursor.fetchall()
    connection.close()
    return rows`,
      phase6: `from datetime import datetime, timedelta
import jwt


def issue_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.utcnow() + timedelta(hours=1),
    }
    return jwt.encode(payload, 'replace-me', algorithm='HS256')`,
      phase8: `import os

config = {
    'port': int(os.getenv('PORT', '8000')),
    'env': os.getenv('NODE_ENV', 'development'),
}

print({'message': 'Boot configuration loaded', 'config': config})`,
    },
    go: {
      phase1: `package main

import "fmt"

type Lesson struct {
	Topic string
	Title string
}

func main() {
	lesson := Lesson{Topic: "${topic.id}", Title: "${topicLabel}"}
	fmt.Printf("%s builds backend judgment through deliberate practice\\n", lesson.Title)
}`,
      phase4: `package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()
	router.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"status": "ok", "topic": "${topic.id}"})
	})
	router.Run(":8080")
}`,
      phase5: `package repository

import "database/sql"

func ListRecords(db *sql.DB) (*sql.Rows, error) {
	return db.Query("SELECT id, name FROM records ORDER BY id DESC LIMIT 20")
}`,
      phase6: `package auth

import "time"

func TokenExpiry() time.Time {
	return time.Now().Add(time.Hour)
}`,
      phase8: `package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Printf("boot env=%s port=%s\\n", os.Getenv("NODE_ENV"), os.Getenv("PORT"))
}`,
    },
    java: {
      phase1: `public class LessonSummary {
    public static void main(String[] args) {
        String title = "${topicLabel}";
        System.out.println(title + " builds backend judgment through deliberate repetition.");
    }
}`,
      phase4: `@RestController
@RequestMapping("/api")
public class HealthController {
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "topic", "${topic.id}");
    }
}`,
      phase5: `String sql = "SELECT id, name FROM records ORDER BY id DESC LIMIT 20";
PreparedStatement statement = connection.prepareStatement(sql);
ResultSet result = statement.executeQuery();`,
      phase6: `Instant expiresAt = Instant.now().plus(Duration.ofHours(1));
System.out.println("JWT expires at " + expiresAt);`,
      phase8: `String env = System.getenv().getOrDefault("NODE_ENV", "development");
String port = System.getenv().getOrDefault("PORT", "8080");
System.out.printf("boot env=%s port=%s%n", env, port);`,
    },
    php: {
      phase1: `$lesson = [
    'topic' => '${topic.id}',
    'title' => '${topicLabel}',
];

echo $lesson['title'] . " builds dependable backend habits." . PHP_EOL;`,
      phase4: `<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'topic' => '${topic.id}',
    ]);
});`,
      phase5: `$statement = $pdo->prepare('SELECT id, name FROM records ORDER BY id DESC LIMIT 20');
$statement->execute();
$rows = $statement->fetchAll();`,
      phase6: `$expiresAt = (new DateTimeImmutable())->modify('+1 hour');
echo 'JWT expires at ' . $expiresAt->format(DateTimeInterface::ATOM);`,
      phase8: `$env = $_ENV['NODE_ENV'] ?? 'development';
$port = $_ENV['PORT'] ?? '8000';
printf("boot env=%s port=%s\n", $env, $port);`,
    },
    ruby: {
      phase1: `lesson = {
  topic: '${topic.id}',
  title: '${topicLabel}'
}

puts "#{lesson[:title]} builds dependable backend habits through repetition."`,
      phase4: `require 'sinatra'
require 'json'

get '/health' do
  content_type :json
  { status: 'ok', topic: '${topic.id}' }.to_json
end`,
      phase5: `rows = DB.execute('SELECT id, name FROM records ORDER BY id DESC LIMIT 20')
rows.each { |row| puts row.inspect }`,
      phase6: `expires_at = Time.now + 3600
puts "JWT expires at #{expires_at.utc.iso8601}"`,
      phase8: `env = ENV.fetch('NODE_ENV', 'development')
port = ENV.fetch('PORT', '4567')
puts "boot env=#{env} port=#{port}"`,
    },
  };

  const phaseKey = moduleId in (snippets[selectedLang] ?? {})
    ? moduleId
    : moduleId.startsWith('phase')
      ? moduleId
      : 'phase1';
  const code = snippets[selectedLang]?.[phaseKey] ?? snippets.nodejs.phase1;
  return buildCodeFence(selectedLang, code);
}

function buildObjectives(context: TopicContext): string[] {
  const { track, module, topic } = context;
  const guide = trackGuides[track.id];
  const objectiveSeed = inferTopicConcepts(topic);

  const objectives = [
    `Explain ${topic.title.toLowerCase()} in plain language without depending on framework jargon.`,
    `Connect ${topic.title.toLowerCase()} to the wider ${track.title.toLowerCase()} workflow described in ${module.title}.`,
    `Apply the topic in a small practical scenario and evaluate tradeoffs instead of copying syntax.`,
  ];

  if (track.id === 'backend' && module.id.startsWith('phase')) {
    objectives.push(...(backendPhaseGoals[module.id] ?? []).slice(0, 1));
  }

  for (const concept of objectiveSeed.slice(0, 2)) {
    objectives.push(`Recognize how ${concept} affects implementation choices for this lesson.`);
  }

  return objectives.slice(0, 5);
}

function buildDeepDiveParagraphs(context: TopicContext, lang?: string): string[] {
  const { track, module, topic } = context;
  const concepts = inferTopicConcepts(topic);
  const guide = trackGuides[track.id];

  const paragraphs = [
    `${topic.title} sits inside ${module.title}, which means you should study it as part of a learning sequence rather than an isolated fact. ${module.description} The practical question is always the same: what problem does this topic solve, what assumptions does it make, and what breaks when you misuse it?`,
    `${guide.identity} ${guide.value} In the context of ${topic.title.toLowerCase()}, focus on ${concepts.join(', ')}. Each of those ideas changes how you structure code, how you reason about correctness, and how you talk about the work with other engineers.`,
    `A strong learner does three things with this topic. First, build vocabulary until the terms stop feeling abstract. Second, connect the terms to one realistic workflow. Third, practice enough that the right decision becomes repeatable under pressure. That is the difference between recognition and skill.`,
  ];

  if (track.id === 'backend') {
    paragraphs.push(
      `For backend work specifically, tie every concept back to the request lifecycle: input arrives, the system validates it, business rules run, data is read or written, and a response is emitted. Even when the lesson is about databases, security, or deployment, that lifecycle remains the anchor.`
    );

    if (topic.langSpecific) {
      paragraphs.push(
        `This lesson is language-specific, so you should compare the universal concept with the implementation style of ${getLanguageName(lang)} and the ergonomics of ${getLanguageFramework(lang)}. Do not confuse framework convenience with architectural necessity.`
      );
    }
  }

  return paragraphs;
}

function buildWorkflow(context: TopicContext): string[] {
  const { track, topic } = context;
  const guide = trackGuides[track.id];

  return guide.workflow.map((step, index) => `${index + 1}. ${step} Tie that habit directly to ${topic.title.toLowerCase()} while you practice.`);
}

function buildMistakes(context: TopicContext): string[] {
  const { track, topic } = context;
  return trackGuides[track.id].mistakes.map((entry) => `${entry} In this lesson, watch for that pattern while working on ${topic.title.toLowerCase()}.`);
}

function buildChecklists(context: TopicContext): string[] {
  const { track, module, topic } = context;
  const guide = trackGuides[track.id];

  return [
    `I can summarize ${topic.title.toLowerCase()} in two or three sentences without reading notes.`,
    `I know where ${topic.title.toLowerCase()} fits inside ${module.title.toLowerCase()}.`,
    `I can describe at least one tradeoff, one failure mode, and one practical use case.`,
    `I can sketch how success would be measured using ${guide.metrics.slice(0, 3).join(', ')}.`,
  ];
}

function buildPractice(context: TopicContext, lang?: string): string[] {
  const { track, module, topic } = context;
  const guide = trackGuides[track.id];

  const tasks = [
    `Write a short explanation of ${topic.title.toLowerCase()} for a junior teammate who has only completed the previous lesson in ${module.title}.`,
    `Create a small artifact that proves understanding: code, schema, diagram, deployment plan, experiment notebook, or design memo depending on the track.`,
    `List three edge cases or failure modes and explain how you would detect or handle them.`,
    guide.miniProject,
  ];

  if (track.id === 'backend' && topic.langSpecific) {
    tasks.splice(1, 0, `Implement a small example in ${getLanguageName(lang)} and then rewrite the explanation in framework-agnostic terms.`);
  }

  return tasks;
}

function buildSubmissionBrief(context: TopicContext, lang?: string): string {
  const { track, module, topic } = context;

  return [
    `Submit work for ${topic.title} as if you were handing it to a reviewer. Include a short summary, the main artifact, and a reflection on one tradeoff.`,
    `If the topic is code-heavy, include runnable code, setup notes, and at least one test or verification step. If the topic is conceptual, include a structured explanation, diagram, or comparison table.`,
    `Reference ${module.title} and explain how this lesson prepares you for the next step in ${track.title}.`,
    topic.langSpecific ? `Because this lesson is language-specific, name the chosen stack clearly: ${getLanguageName(lang)} with ${getLanguageFramework(lang)}.` : `Keep the explanation technology-aware but centered on principles, not only syntax.`,
  ].join(' ');
}

function buildGeneratedLesson(context: TopicContext, lang?: string): string {
  const { track, module, topic } = context;
  const objectives = buildObjectives(context);
  const paragraphs = buildDeepDiveParagraphs(context, lang);
  const workflow = buildWorkflow(context);
  const mistakes = buildMistakes(context);
  const checklist = buildChecklists(context);
  const practice = buildPractice(context, lang);
  const concepts = inferTopicConcepts(topic);

  const languageSection = track.id === 'backend' && topic.langSpecific
    ? `\n## Example In ${getLanguageName(lang)}\nThis example is not meant to be a complete production system. Its purpose is to connect the lesson concept to real syntax in ${getLanguageFramework(lang)}.${buildBackendSnippet(lang, module.id, topic)}`
    : '';

  const backendBonus = track.id === 'backend' && module.id.startsWith('phase')
    ? `\n## Backend Design Lens\nStudy this lesson through the backend lens of boundaries and guarantees. Ask yourself:\n- What input enters the system here?\n- What validation or normalization belongs close to the edge?\n- What state changes are allowed or forbidden?\n- What should be logged, retried, cached, or rejected?\n- Which part must remain framework-agnostic so it can be tested cleanly?\n\nA backend engineer gets stronger by answering those questions habitually, not occasionally.`
    : '';

  return [
    `# ${topic.title}`,
    '',
    `> Track: ${track.title}`,
    `> Module: ${module.title}`,
    topic.langSpecific ? `> Language path: ${getLanguageName(lang)} using ${getLanguageFramework(lang)}` : null,
    '',
    '## Why This Topic Matters',
    ...paragraphs.map((entry) => `${entry}\n`),
    '## Learning Objectives',
    ...objectives.map((entry) => `- ${entry}`),
    '',
    '## Mental Model',
    `Think of ${topic.title.toLowerCase()} as a tool for improving ${concepts.join(', ')}. If you only memorize surface syntax, you will forget it under pressure. If you understand the mental model, you can rebuild the implementation from first principles.`,
    `A practical way to internalize the topic is to ask three repeated questions: what enters the system, what changes inside the system, and what leaves the system. That pattern works across software disciplines and keeps the lesson grounded in actual behavior.`,
    '',
    '## Step-By-Step Workflow',
    ...workflow,
    '',
    '## What Good Work Looks Like',
    `Good work on this topic is explicit, testable, and easy to explain. Someone reviewing your output should be able to identify the assumptions you made, the constraints you respected, and the evidence that the result works.`,
    `For ${track.title.toLowerCase()} specifically, quality improves when you favor clarity over cleverness, document tradeoffs, and design for the real environment in which the feature or system will live.`,
    languageSection,
    backendBonus,
    '## Common Mistakes',
    ...mistakes.map((entry) => `- ${entry}`),
    '',
    '## Practice Lab',
    ...practice.map((entry, index) => `${index + 1}. ${entry}`),
    '',
    '## Self-Check',
    ...checklist.map((entry) => `- ${entry}`),
    '',
    '## Submission Brief',
    buildSubmissionBrief(context, lang),
    '',
    '## Stretch Questions',
    `1. If this topic failed in production or in a real project, what would the first visible symptom be?`,
    `2. Which part of ${topic.title.toLowerCase()} is universal across tools, and which part is tool-specific?`,
    `3. What would you simplify if you had to teach this lesson to a beginner in ten minutes?`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function getMockContent(trackId: string, moduleId: string, topicId: string, lang?: string): string {
  if (lang) {
    const langKey = `${topicId}_${lang}`;
    if (contentRegistry[langKey]) return contentRegistry[langKey];
  }

  if (contentRegistry[topicId]) {
    return contentRegistry[topicId];
  }

  const trackTopicKey = `${trackId}_${topicId}`;
  if (contentRegistry[trackTopicKey]) {
    return contentRegistry[trackTopicKey];
  }

  const context = getTopicContext(trackId, moduleId, topicId);
  if (!context) {
    const title = slugToWords(topicId);
    return `# ${title}\n\nThis lesson could not be resolved from the curriculum map. Check the route parameters or curriculum definitions.`;
  }

  return buildGeneratedLesson(context, lang);
}

