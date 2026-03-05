'use client';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { curriculumData } from '@/constants/curriculum';
import { getMockContent } from '@/lib/content';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';

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

  const [codeData, setCodeData] = useState('');

  // Find curriculum details
  const track = curriculumData.tracks.find(t => t.id === trackId);
  const moduleInfo = track?.modules.find(m => m.id === moduleId);
  const topic = moduleInfo?.topics.find(t => t.id === topicId);
  const content = getMockContent(trackId, moduleId, topicId);

  const isCompleted = progress[topicId];

  // Generate a unique exercise ID for this topic and student
  const exerciseId = `${topicId}_${user?.id || 'guest'}`;
  const existingSubmission = submissions[exerciseId];

  if (!topic) return <div style={{ padding: '2rem' }}>Topic not found.</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <Link href="/curriculum" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        <ArrowLeft size={20} /> Back to Curriculum
      </Link>

      <div className="glass-panel" style={{ padding: '3rem', marginBottom: '2rem' }}>
        <div style={{
          color: 'var(--text-primary)',
          lineHeight: '1.8',
          fontSize: '1.1rem'
        }}>
          {/* Extremely basic markdown rendering for prototype */}
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }: any) => <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'var(--accent-hover)' }} {...props} />,
              h2: ({ node, ...props }: any) => <h2 style={{ fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }} {...props} />,
              h3: ({ node, ...props }: any) => <h3 style={{ fontSize: '1.4rem', marginTop: '1.5rem', marginBottom: '1rem' }} {...props} />,
              p: ({ node, ...props }: any) => <p style={{ marginBottom: '1rem' }} {...props} />,
              code: ({ node, inline, ...props }: any) =>
                inline ?
                  <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px', color: '#ff79c6' }} {...props} /> :
                  <pre style={{ background: '#282a36', padding: '1.5rem', borderRadius: '8px', overflowX: 'auto', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}><code style={{ color: '#f8f8f2' }} {...props} /></pre>,
              blockquote: ({ node, ...props }: any) => <blockquote style={{ borderLeft: '4px solid var(--accent-primary)', paddingLeft: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(59, 130, 246, 0.05)', padding: '1rem' }} {...props} />
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {user?.role === 'student' && (
        <div className="glass-panel" style={{ padding: '2rem', borderTop: '4px solid var(--accent-primary)' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Exercise Submission</h3>
          {existingSubmission ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: existingSubmission.status === 'graded' ? '#50fa7b' : '#f1fa8c', marginBottom: '1rem' }}>
                <CheckCircle size={20} />
                <span style={{ fontWeight: 'bold' }}>Status: {existingSubmission.status.toUpperCase()}</span>
              </div>
              {existingSubmission.grade && (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
                  <p><strong>Grade:</strong> {existingSubmission.grade}/100</p>
                  <p><strong>Lecturer Feedback:</strong> {existingSubmission.feedback}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Write or paste your code solution below to be graded by a lecturer.</p>
              <textarea
                value={codeData}
                onChange={(e) => setCodeData(e.target.value)}
                style={{
                  width: '100%', height: '200px', background: '#282a36', color: '#f8f8f2',
                  border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '1rem',
                  fontFamily: 'monospace', fontSize: '1rem', marginBottom: '1rem', resize: 'vertical'
                }}
                placeholder="// Write your solution here..."
              />
              <button
                className="btn"
                onClick={() => {
                  submitExercise(exerciseId, codeData);
                  markTopicCompleted(topicId);
                }}
              >
                Submit for Grading
              </button>
            </div>
          )}
        </div>
      )}

      {user?.role === 'lecturer' && (
        <div className="glass-panel" style={{ padding: '2rem', borderTop: '4px solid #ffb86c' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Lecturer Actions</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You are viewing this topic as a Lecturer. Visit the Dashboard to grade student submissions for this exercise.</p>
          <Link href="/dashboard" className="btn" style={{ marginTop: '1rem', background: '#ffb86c', color: '#282a36' }}>
            Go to Grading Dashboard
          </Link>
        </div>
      )}

      {!user && (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>You must be logged in to submit exercises.</p>
        </div>
      )}
    </div>
  );
}
