'use client';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { useState } from 'react';

export default function Dashboard() {
    const { user } = useAuth();
    const { submissions, gradeExercise, progress } = useAppData();

    const [feedback, setFeedback] = useState<Record<string, string>>({});
    const [grades, setGrades] = useState<Record<string, string>>({});

    if (!user) return <div style={{ padding: '3rem', textAlign: 'center' }}>Please login to view your dashboard.</div>;

    if (user.role === 'student') {
        return (
            <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Student Dashboard</h1>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-hover)' }}>Progress</h2>
                        <p style={{ fontSize: '1.2rem' }}>Topics Completed: <strong>{Object.keys(progress).length}</strong></p>
                    </div>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-hover)' }}>Submissions</h2>
                        <p style={{ fontSize: '1.2rem' }}>Total Exercises: <strong>{Object.keys(submissions).length}</strong></p>
                    </div>
                </div>

                <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>My Grades</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Object.entries(submissions).map(([id, sub]) => (
                        <div key={id} className="glass-panel" style={{ padding: '1.5rem', borderLeft: sub.status === 'graded' ? '4px solid #50fa7b' : '4px solid #f1fa8c' }}>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Exercise ID: {id}</h3>
                            <p><strong>Status:</strong> {sub.status}</p>
                            {sub.status === 'graded' && (
                                <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                    <p><strong>Grade:</strong> {sub.grade}/100</p>
                                    <p><strong>Lecturer Feedback:</strong> {sub.feedback}</p>
                                </div>
                            )}
                        </div>
                    ))}
                    {Object.keys(submissions).length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No exercises submitted yet. Head to the curriculum to begin!</p>}
                </div>
            </div>
        );
    }

    // Lecturer View
    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#ffb86c' }}>Lecturer Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>Review student submissions and provide grades.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {Object.entries(submissions).map(([id, sub]) => (
                    <div key={id} className="glass-panel" style={{ padding: '2rem', borderTop: '4px solid ' + (sub.status === 'pending' ? '#ff5555' : '#50fa7b') }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.5rem' }}>Submission: {id}</h3>
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', background: sub.status === 'pending' ? 'rgba(255, 85, 85, 0.2)' : 'rgba(80, 250, 123, 0.2)', color: sub.status === 'pending' ? '#ff5555' : '#50fa7b' }}>
                                {sub.status.toUpperCase()}
                            </span>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Submitted Code:</p>
                            <pre style={{ background: '#282a36', padding: '1rem', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--glass-border)' }}>
                                <code style={{ fontFamily: 'monospace', color: '#f8f8f2' }}>{sub.code}</code>
                            </pre>
                        </div>

                        {sub.status === 'pending' ? (
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
                                        placeholder="Great use of circuit breakers!"
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
                                <p><strong>Grade Assigned:</strong> {sub.grade}/100</p>
                                <p><strong>Feedback Given:</strong> {sub.feedback}</p>
                            </div>
                        )}
                    </div>
                ))}
                {Object.keys(submissions).length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No submissions to review yet.</p>}
            </div>
        </div>
    );
}
