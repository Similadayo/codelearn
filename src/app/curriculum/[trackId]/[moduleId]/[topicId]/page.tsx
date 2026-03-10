'use client';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { curriculumData, topicUsesStackVariant } from '@/constants/curriculum';
import { getMockContent } from '@/lib/content';
import { buildSubmissionId, buildTopicKey, formatTopicPath } from '@/lib/lessonKeys';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, Send, BookMarked,
  GraduationCap, Clock, Lock, ChevronRight, Layers3
} from 'lucide-react';

interface TopicPageProps {
  params: {
    trackId: string;
    moduleId: string;
    topicId: string;
  }
}

export default function TopicPage({ params }: TopicPageProps) {
  const { trackId, moduleId, topicId } = params;
  const { user } = useAuth();
  const { progress, markTopicCompleted, submitExercise, submissions, toggleBookmark, isBookmarked } = useAppData();
  const searchParams = useSearchParams();
  const selectedLang = searchParams.get('lang') || '';

  const [codeData, setCodeData] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const track = curriculumData.tracks.find((entry) => entry.id === trackId);
  const selectedLangInfo = track?.supportedLanguages?.find((entry) => entry.id === selectedLang);
  const moduleInfo = track?.modules.find((entry) => entry.id === moduleId);
  const topic = moduleInfo?.topics.find((entry) => entry.id === topicId);
  const topicIndex = moduleInfo?.topics.findIndex((entry) => entry.id === topicId) ?? 0;
  const fallbackContent = getMockContent(trackId, moduleId, topicId, selectedLang);
  const [content, setContent] = useState(fallbackContent);
  const [contentSource, setContentSource] = useState<'file' | 'fallback'>('fallback');
  const topicKey = buildTopicKey(trackId, moduleId, topicId);
  const submissionId = user ? buildSubmissionId(user.id, topicKey) : '';
  const existingSubmission = submissionId ? submissions[submissionId] : undefined;
  const isCompleted = !!progress[topicKey]?.completed;
  const isSaved = isBookmarked(topicKey);
  const estimatedReadingTime = Math.max(12, Math.round(content.split(/\s+/).length / 190));
  const previousTopic = topicIndex > 0 ? moduleInfo?.topics[topicIndex - 1] : null;
  const nextTopic = moduleInfo && topicIndex < moduleInfo.topics.length - 1 ? moduleInfo.topics[topicIndex + 1] : null;

  useEffect(() => {
    setContent(fallbackContent);
    setContentSource('fallback');
    setContentLoading(true);
    setContentError(null);
  }, [fallbackContent]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ trackId, moduleId, topicId });

    if (selectedLang) {
      query.set('lang', selectedLang);
    }

    setContentLoading(true);
    setContentError(null);
    fetch(`/api/content?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Content request failed with status ${response.status}`);
        }

        return response.json();
      })
      .then((payload) => {
        if (typeof payload?.content === 'string' && payload.content.trim()) {
          setContent(payload.content);
        }
        if (payload?.source === 'file' || payload?.source === 'fallback') {
          setContentSource(payload.source);
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Failed to load topic markdown:', error);
          setContentError('The lesson could not be refreshed from the content API. Showing the best available local version.');
        }
      })
      .finally(() => {
        setContentLoading(false);
      });

    return () => controller.abort();
  }, [trackId, moduleId, topicId, selectedLang]);

  if (!topic || !track || !moduleInfo) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Topic not found. <Link href="/curriculum" style={{ color: 'var(--accent-indigo)' }}>Back to curriculum</Link>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!codeData.trim() || !user) return;
    submitExercise({
      submissionId,
      topicKey,
      trackId,
      moduleId,
      topicId,
      code: codeData,
    });
    markTopicCompleted(topicKey);
    setSubmitted(true);
  };

  return (
    <div className="lesson-shell">
      <section className="lesson-main">
        <div className="lesson-hero glass-panel">
          <div className="lesson-breadcrumbs">
            <Link href="/curriculum" className="lesson-breadcrumb-link">
              <ArrowLeft size={14} /> Curriculum
            </Link>
            <ChevronRight size={12} color="var(--text-muted)" />
            <Link href={`/curriculum?track=${trackId}${selectedLang ? `&lang=${selectedLang}` : ''}`} className="lesson-breadcrumb-link">
              {track.title}
            </Link>
            <ChevronRight size={12} color="var(--text-muted)" />
            <span className="lesson-breadcrumb-current">{moduleInfo.title}</span>
          </div>

          <div className="lesson-hero-meta">
            <div className="lesson-kicker">
              <Layers3 size={14} />
              TOPIC {String(topicIndex + 1).padStart(2, '0')} · {moduleInfo.id.toUpperCase()}
            </div>
            <div className="lesson-hero-badges">
              {isCompleted && (
                <span className="lesson-badge lesson-badge-success">
                  <CheckCircle2 size={11} /> Completed
                </span>
              )}
              <span className={`lesson-badge ${contentSource === 'file' ? 'lesson-badge-info' : 'lesson-badge-warn'}`}>
                {contentSource === 'file' ? 'Authored Markdown' : 'Generated Fallback'}
              </span>
              {user && (
                <button
                  type="button"
                  className="lesson-badge lesson-badge-info"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleBookmark({ topicKey, trackId, moduleId, topicId })}
                >
                  <BookMarked size={11} /> {isSaved ? 'Bookmarked' : 'Save'}
                </button>
              )}
            </div>
          </div>

          <h1 className="lesson-title">{topic.title}</h1>
          <p className="lesson-reading-time">
            <Clock size={13} /> Estimated reading time: {estimatedReadingTime}-{estimatedReadingTime + 4} min
          </p>

          {selectedLangInfo && topicUsesStackVariant(track, topic) && (
            <div className="lesson-stack-banner" style={{ borderColor: `${selectedLangInfo.color}30`, background: `${selectedLangInfo.color}10` }}>
              <span className="lesson-stack-emoji">{selectedLangInfo.emoji}</span>
              <div>
                <strong>{selectedLangInfo.name}</strong>
                <p>{selectedLangInfo.framework}</p>
              </div>
            </div>
          )}
        </div>

        <article className="lesson-article glass-panel">
          {contentLoading && (
            <div className="lesson-callout lesson-callout-info" style={{ marginBottom: '1rem' }}>
              <span>Loading lesson content…</span>
            </div>
          )}
          {contentError && (
            <div className="lesson-callout lesson-callout-warn" style={{ marginBottom: '1rem' }}>
              <span>{contentError}</span>
            </div>
          )}
          <div className="markdown-content">
            <ReactMarkdown
              components={{
                h1: ({ ...props }) => <h1 {...props} />,
                h2: ({ ...props }) => <h2 {...props} />,
                h3: ({ ...props }) => <h3 {...props} />,
                p: ({ ...props }) => <p {...props} />,
                ul: ({ ...props }) => <ul {...props} />,
                ol: ({ ...props }) => <ol {...props} />,
                li: ({ ...props }) => <li {...props} />,
                strong: ({ ...props }) => <strong {...props} />,
                blockquote: ({ ...props }) => <blockquote {...props} />,
                hr: ({ ...props }) => <hr {...props} />,
                table: ({ ...props }) => (
                  <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }} {...props} />
                  </div>
                ),
                th: ({ ...props }) => (
                  <th
                    style={{
                      padding: '0.6rem 1rem',
                      textAlign: 'left',
                      background: 'rgba(99,102,241,0.1)',
                      borderBottom: '1px solid rgba(99,102,241,0.2)',
                      fontWeight: 600,
                      color: 'var(--text-accent)',
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                    {...props}
                  />
                ),
                td: ({ ...props }) => (
                  <td
                    style={{
                      padding: '0.6rem 1rem',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      color: 'var(--text-secondary)',
                    }}
                    {...props}
                  />
                ),
                code: ({ className, children, ...props }: any) => {
                  const isInline = !className;
                  if (isInline) {
                    return <code {...props}>{children}</code>;
                  }
                  const language = (className || '').replace('language-', '') || 'code';
                  return (
                    <div className="code-block">
                      <div className="code-block-header">
                        <div className="code-dots">
                          <div className="code-dot" />
                          <div className="code-dot" />
                          <div className="code-dot" />
                        </div>
                        <span className="code-block-title">{language}</span>
                      </div>
                      <pre style={{ padding: '1.25rem 1.5rem', margin: 0, overflowX: 'auto' }}>
                        <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem', lineHeight: 1.7, color: '#e2e8f0' }}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </article>

        <section className="lesson-submission glass-panel">
          <div className="lesson-section-head">
            <div className="lesson-section-icon">
              <GraduationCap size={18} color="white" />
            </div>
            <div>
              <h2>Submit Your Work</h2>
              <p>Saved locally in this browser for the active signed-in account.</p>
            </div>
          </div>

          {!user && (
            <div className="lesson-callout lesson-callout-info">
              <Lock size={16} color="var(--accent-indigo)" />
              <span>Sign in as a student to submit work, save lessons, and keep progress across visits.</span>
            </div>
          )}

          {user?.role === 'student' && !existingSubmission && !submitted && (
            <div>
              <p className="lesson-supporting-copy">
                Write your answer, code, or explanation in the box below. Be thorough. Lecturer accounts on this device can review what you submit later.
              </p>
              <textarea
                className="input"
                value={codeData}
                onChange={(event) => setCodeData(event.target.value)}
                style={{ height: '220px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem' }}
                placeholder="// Write your solution or explanation here..."
              />
              <button
                className="btn"
                onClick={handleSubmit}
                style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                disabled={!codeData.trim()}
              >
                <Send size={15} />
                Submit for Grading
              </button>
            </div>
          )}

          {(existingSubmission || submitted) && (
            <div className="lesson-callout lesson-callout-success">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <CheckCircle2 size={18} color="#34d399" />
                  <span style={{ fontWeight: 700, color: '#34d399', fontSize: '0.95rem' }}>
                    {existingSubmission?.status === 'graded' ? 'Graded' : 'Submitted - Awaiting Review'}
                  </span>
                </div>
                {existingSubmission?.status === 'graded' && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="stat-card" style={{ maxWidth: '240px' }}>
                      <div className="stat-value">{existingSubmission.grade}</div>
                      <div className="stat-label">Score out of 100</div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Lecturer Feedback: </strong>
                      {existingSubmission.feedback}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {user?.role === 'lecturer' && (
            <div className="lesson-callout lesson-callout-warn">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <BookMarked size={18} color="#fbbf24" />
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Lecturer View</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                      Review submissions from every learner account stored in this browser
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="btn"
                  style={{
                    background: 'rgba(245,158,11,0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245,158,11,0.3)',
                    boxShadow: 'none',
                    padding: '0.5rem 1.2rem',
                    fontSize: '0.875rem',
                  }}
                >
                  Grading Dashboard
                </Link>
              </div>
            </div>
          )}
        </section>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            {previousTopic ? (
              <Link href={formatTopicPath(trackId, moduleId, previousTopic.id, selectedLang || undefined)} className="btn-ghost">
                Previous: {previousTopic.title}
              </Link>
            ) : (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Start of this phase</span>
            )}
          </div>
          <div>
            {nextTopic ? (
              <Link href={formatTopicPath(trackId, moduleId, nextTopic.id, selectedLang || undefined)} className="btn">
                Next: {nextTopic.title}
              </Link>
            ) : (
              <Link href={`/curriculum?track=${trackId}${selectedLang ? `&lang=${selectedLang}` : ''}`} className="btn">
                Back to track overview
              </Link>
            )}
          </div>
        </div>
      </section>

      <aside className="lesson-side">
        <div className="lesson-side-card glass-panel">
          <p className="curriculum-side-label">Module</p>
          <h2>{moduleInfo.title}</h2>
          <p>{moduleInfo.topics.length} topics in this phase.</p>
        </div>

        <div className="lesson-side-card glass-panel">
          <p className="curriculum-side-label">Quick Facts</p>
          <div className="lesson-side-stats">
            <div>
              <strong>{String(topicIndex + 1).padStart(2, '0')}</strong>
              <span>Position</span>
            </div>
            <div>
              <strong>{estimatedReadingTime}m</strong>
              <span>Read</span>
            </div>
            <div>
              <strong>{isCompleted ? 'Done' : 'Open'}</strong>
              <span>Status</span>
            </div>
          </div>
        </div>

        <div className="lesson-side-card glass-panel">
          <p className="curriculum-side-label">{moduleInfo.title}</p>
          <div className="lesson-topic-nav">
            {moduleInfo.topics.map((entry, index) => {
              const isCurrent = entry.id === topicId;
              const isDone = !!progress[buildTopicKey(trackId, moduleId, entry.id)]?.completed;
              return (
                <Link key={entry.id} href={formatTopicPath(trackId, moduleId, entry.id, selectedLang || undefined)} className="lesson-topic-nav-item" style={{
                  background: isCurrent ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                  borderColor: isCurrent ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                }}>
                  <span className="lesson-topic-nav-index">
                    {isDone ? 'OK' : String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="lesson-topic-nav-title">{entry.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
