'use client';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { curriculumData, backendLanguages } from '@/constants/curriculum';
import { getMockContent } from '@/lib/content';
import { buildSubmissionId, buildTopicKey, formatTopicPath } from '@/lib/lessonKeys';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, Send, BookMarked,
  GraduationCap, Clock, Lock, ChevronRight
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
  const { progress, markTopicCompleted, submitExercise, submissions } = useAppData();
  const searchParams = useSearchParams();
  const selectedLang = searchParams.get('lang') || '';
  const selectedLangInfo = backendLanguages.find(l => l.id === selectedLang);

  const [codeData, setCodeData] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const track = curriculumData.tracks.find(t => t.id === trackId);
  const moduleInfo = track?.modules.find(m => m.id === moduleId);
  const topic = moduleInfo?.topics.find(t => t.id === topicId);
  const topicIndex = moduleInfo?.topics.findIndex(t => t.id === topicId) ?? 0;
  const content = getMockContent(trackId, moduleId, topicId, selectedLang);
  const topicKey = buildTopicKey(trackId, moduleId, topicId);
  const submissionId = user ? buildSubmissionId(user.id, topicKey) : '';
  const existingSubmission = submissionId ? submissions[submissionId] : undefined;
  const isCompleted = !!progress[topicKey];
  const estimatedReadingTime = Math.max(12, Math.round(content.split(/\s+/).length / 190));

  if (!topic) {
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
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 4.5rem)' }}>
      <div style={{ flex: 1, padding: '2.5rem 3rem', maxWidth: '780px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <Link href="/curriculum" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <ArrowLeft size={14} /> Curriculum
          </Link>
          <ChevronRight size={12} color="var(--text-muted)" />
          <Link href={`/curriculum?track=${trackId}${selectedLang ? `&lang=${selectedLang}` : ''}`} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {track?.title}
          </Link>
          <ChevronRight size={12} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{moduleInfo?.id}</span>
          <ChevronRight size={12} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>{topic.title}</span>
        </div>

        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem',
              color: 'var(--text-muted)', fontWeight: 700
            }}>
              TOPIC {String(topicIndex + 1).padStart(2, '0')} · {moduleInfo?.id.toUpperCase()}
            </span>
            {isCompleted && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                fontSize: '0.75rem', fontWeight: 600, color: '#34d399',
                background: 'rgba(16,185,129,0.1)', padding: '0.15rem 0.6rem',
                borderRadius: '9999px', border: '1px solid rgba(16,185,129,0.2)'
              }}>
                <CheckCircle2 size={11} /> Completed
              </span>
            )}
            {user?.demoMode && (
              <span className="tag tag-novice">Local demo state</span>
            )}
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.5rem' }}>
            {topic.title}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={13} /> Estimated reading time: {estimatedReadingTime}-{estimatedReadingTime + 4} min
          </p>
          {selectedLangInfo && (
            <p style={{ color: selectedLangInfo.color, fontSize: '0.82rem', marginTop: '0.75rem' }}>
              Backend path: {selectedLangInfo.name} with {selectedLangInfo.framework}
            </p>
          )}
        </div>

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
                <th style={{
                  padding: '0.6rem 1rem', textAlign: 'left',
                  background: 'rgba(99,102,241,0.1)',
                  borderBottom: '1px solid rgba(99,102,241,0.2)',
                  fontWeight: 600, color: 'var(--text-accent)',
                  fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em'
                }} {...props} />
              ),
              td: ({ ...props }) => (
                <td style={{
                  padding: '0.6rem 1rem',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  color: 'var(--text-secondary)',
                }} {...props} />
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

        <div style={{
          marginTop: '3rem', paddingTop: '2.5rem',
          borderTop: '1px solid rgba(99,102,241,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={18} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Submit Your Work</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Saved locally in this browser for the active demo account.
              </p>
            </div>
          </div>

          {!user && (
            <div style={{
              padding: '1.5rem', borderRadius: '12px',
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              color: 'var(--text-secondary)', fontSize: '0.9rem',
            }}>
              <Lock size={16} color="var(--accent-indigo)" />
              Start a student demo profile to submit exercises and track progress locally.
            </div>
          )}

          {user?.role === 'student' && !existingSubmission && !submitted && (
            <div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                Write your answer, code, or explanation in the box below. Be thorough. The lecturer demo account can review what you submit later in the same browser.
              </p>
              <textarea
                className="input"
                value={codeData}
                onChange={(e) => setCodeData(e.target.value)}
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
            <div style={{
              padding: '1.5rem', borderRadius: '12px',
              background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <CheckCircle2 size={18} color="#34d399" />
                <span style={{ fontWeight: 700, color: '#34d399', fontSize: '0.95rem' }}>
                  {existingSubmission?.status === 'graded' ? 'Graded' : 'Submitted - Awaiting Review'}
                </span>
              </div>
              {existingSubmission?.status === 'graded' && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="stat-card" style={{ flex: 1 }}>
                      <div className="stat-value">{existingSubmission.grade}</div>
                      <div className="stat-label">Score out of 100</div>
                    </div>
                  </div>
                  <div style={{
                    padding: '1rem', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)', marginTop: '0.5rem',
                    fontSize: '0.9rem', color: 'var(--text-secondary)',
                  }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Lecturer Feedback: </strong>
                    {existingSubmission.feedback}
                  </div>
                </div>
              )}
            </div>
          )}

          {user?.role === 'lecturer' && (
            <div style={{
              padding: '1.5rem', borderRadius: '12px',
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BookMarked size={18} color="#fbbf24" />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Lecturer View</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Review submissions from every local demo student in this browser</p>
                </div>
              </div>
              <Link href="/dashboard" className="btn" style={{
                background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
                border: '1px solid rgba(245,158,11,0.3)', boxShadow: 'none',
                padding: '0.5rem 1.2rem', fontSize: '0.875rem'
              }}>
                Grading Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>

      <aside style={{
        width: '260px', flexShrink: 0, padding: '2.5rem 1.25rem',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: '4.5rem', height: 'calc(100vh - 4.5rem)',
        overflowY: 'auto',
      }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          {moduleInfo?.title}
        </p>
        {moduleInfo?.topics.map((t, i) => {
          const isCurrentTopic = t.id === topicId;
          const isDone = !!progress[buildTopicKey(trackId, moduleId, t.id)];
          return (
            <Link key={t.id} href={formatTopicPath(trackId, moduleId, t.id, selectedLang || undefined)}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                marginBottom: '0.2rem',
                background: isCurrentTopic ? 'rgba(99,102,241,0.12)' : 'transparent',
                border: `1px solid ${isCurrentTopic ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                transition: 'all 0.15s ease',
              }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem',
                  color: isCurrentTopic ? 'var(--accent-indigo)' : 'var(--text-muted)',
                  fontWeight: 700, minWidth: '20px',
                }}>
                  {isDone ? '?' : String(i + 1).padStart(2, '0')}
                </span>
                <span style={{
                  fontSize: '0.82rem',
                  color: isCurrentTopic ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isCurrentTopic ? 600 : 400,
                  lineHeight: 1.4,
                }}>
                  {t.title}
                </span>
              </div>
            </Link>
          );
        })}
      </aside>
    </div>
  );
}

