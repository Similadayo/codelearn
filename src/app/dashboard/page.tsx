'use client';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { curriculumData } from '@/constants/curriculum';
import { useMemo, useState } from 'react';

function findTopicLabel(trackId: string, moduleId: string, topicId: string): string {
    const track = curriculumData.tracks.find((entry) => entry.id === trackId);
    const module = track?.modules.find((entry) => entry.id === moduleId);
    const topic = module?.topics.find((entry) => entry.id === topicId);

    return [track?.title, module?.title, topic?.title].filter(Boolean).join(' / ');
}

export default function Dashboard() {
    const { user } = useAuth();
    const { submissions, allSubmissions, gradeExercise, progress } = useAppData();

    const [feedback, setFeedback] = useState<Record<string, string>>({});
    const [grades, setGrades] = useState<Record<string, string>>({});

    const lecturerSubmissions = useMemo(
        () => Object.entries(allSubmissions).sort((a, b) => b[1].submittedAt.localeCompare(a[1].submittedAt)),
        [allSubmissions]
    );

    const studentSubmissions = useMemo(
        () => Object.entries(submissions).sort((a, b) => b[1].submittedAt.localeCompare(a[1].submittedAt)),
        [submissions]
    );

    if (!user) return <div style={{ padding: '3rem', textAlign: 'center' }}>Start a demo login to view the dashboard.</div>;

    if (user.role === 'student') {
        return (
            <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Student Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    {user.name} is a local demo profile. Progress and submissions are stored only in this browser.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-indigo)' }}>Progress</h2>
                        <p style={{ fontSize: '1.2rem' }}>Topics Completed: <strong>{Object.keys(progress).length}</strong></p>
                    </div>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-indigo)' }}>Submissions</h2>
                        <p style={{ fontSize: '1.2rem' }}>Total Exercises: <strong>{studentSubmissions.length}</strong></p>
                    </div>
                </div>

                <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>My Grades</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {studentSubmissions.map(([id, submission]) => (
                        <div key={id} className="glass-panel" style={{ padding: '1.5rem', borderLeft: submission.status === 'graded' ? '4px solid #50fa7b' : '4px solid #f1fa8c' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{findTopicLabel(submission.trackId, submission.moduleId, submission.topicId)}</h3>
                            <p><strong>Status:</strong> {submission.status}</p>
                            <p><strong>Submission ID:</strong> {id}</p>
                            {submission.status === 'graded' && (
                                <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                    <p><strong>Grade:</strong> {submission.grade}/100</p>
                                    <p><strong>Lecturer Feedback:</strong> {submission.feedback}</p>
                                </div>
                            )}
                        </div>
                    ))}
                    {studentSubmissions.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No exercises submitted yet. Head to the curriculum to begin.</p>}
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#ffb86c' }}>Lecturer Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Reviewing local demo submissions captured in this browser session. Each student login gets a distinct demo identity.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {lecturerSubmissions.map(([id, submission]) => (
                    <div key={id} className="glass-panel" style={{ padding: '2rem', borderTop: '4px solid ' + (submission.status === 'pending' ? '#ff5555' : '#50fa7b') }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                            <div>
                                <h3 style={{ fontSize: '1.4rem' }}>{findTopicLabel(submission.trackId, submission.moduleId, submission.topicId)}</h3>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                                    {submission.userName} · {new Date(submission.submittedAt).toLocaleString()}
                                </p>
                            </div>
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', background: submission.status === 'pending' ? 'rgba(255, 85, 85, 0.2)' : 'rgba(80, 250, 123, 0.2)', color: submission.status === 'pending' ? '#ff5555' : '#50fa7b' }}>
                                {submission.status.toUpperCase()}
                            </span>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Submitted Work:</p>
                            <pre style={{ background: '#282a36', padding: '1rem', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--glass-border)' }}>
                                <code style={{ fontFamily: 'monospace', color: '#f8f8f2' }}>{submission.code}</code>
                            </pre>
                        </div>

                        {submission.status === 'pending' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Grade (0-100)</label>
                                    <input
                                        type="number"
                                        min="0" max="100"
                                        placeholder="85"
                                        className="glass-panel"
                                        style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', padding: '0.75rem', width: '100%', borderRadius: '4px', fontSize: '1rem' }}
                                        onChange={(e) => setGrades({ ...grades, [id]: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Feedback</label>
                                    <textarea
                                        placeholder="Clear explanation, but tighten the error cases and add one verification step."
                                        className="glass-panel"
                                        style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', padding: '0.75rem', width: '100%', borderRadius: '4px', fontSize: '1rem', height: '100px', resize: 'vertical' }}
                                        onChange={(e) => setFeedback({ ...feedback, [id]: e.target.value })}
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                    <button
                                        className="btn"
                                        style={{ background: '#50fa7b', color: '#282a36' }}
                                        onClick={() => {
                                            if (grades[id]) gradeExercise(id, grades[id], feedback[id] || 'No feedback provided.');
                                        }}
                                    >
                                        Submit Grade
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px' }}>
                                <p><strong>Grade Assigned:</strong> {submission.grade}/100</p>
                                <p><strong>Feedback Given:</strong> {submission.feedback}</p>
                            </div>
                        )}
                    </div>
                ))}
                {lecturerSubmissions.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No submissions to review yet.</p>}
            </div>
        </div>
    );
}

