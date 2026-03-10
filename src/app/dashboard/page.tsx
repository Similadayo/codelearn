'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { curriculumData } from '@/constants/curriculum';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { buildTopicKey, formatTopicPath } from '@/lib/lessonKeys';

type CoverageReport = {
    totals: { expected: number; existing: number; missing: number; coveragePct: number; issues: number };
    tracks: Array<{ id: string; title: string; expected: number; existing: number; coveragePct: number }>;
};

function topicLabel(trackId: string, moduleId: string, topicId: string) {
    const track = curriculumData.tracks.find((entry) => entry.id === trackId);
    const module = track?.modules.find((entry) => entry.id === moduleId);
    const topic = module?.topics.find((entry) => entry.id === topicId);
    return [track?.title, module?.title, topic?.title].filter(Boolean).join(' / ');
}

function trackProgress(trackId: string, progress: Record<string, { completed: boolean }>) {
    const track = curriculumData.tracks.find((entry) => entry.id === trackId);
    if (!track) return { completed: 0, total: 0, pct: 0 };
    const keys = track.modules.flatMap((module) => module.topics.map((topic) => buildTopicKey(track.id, module.id, topic.id)));
    const completed = keys.filter((key) => progress[key]?.completed).length;
    return { completed, total: keys.length, pct: keys.length ? Math.round((completed / keys.length) * 100) : 0 };
}

function Stat({ label, value, note }: { label: string; value: string | number; note: string }) {
    return (
        <div className="dash-stat">
            <div className="dash-stat-label">{label}</div>
            <div className="dash-stat-value">{value}</div>
            <p className="dash-stat-note">{note}</p>
        </div>
    );
}

export default function Dashboard() {
    const { user, users } = useAuth();
    const {
        progress, submissions, allSubmissions, gradeExercise, bookmarks, notifications, unreadNotifications,
        activityLog, cohorts, createCohort, assignStudentToCohort, markNotificationRead, markAllNotificationsRead, getResumeTopicPath,
    } = useAppData();
    const [coverage, setCoverage] = useState<CoverageReport | null>(null);
    const [coverageState, setCoverageState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<'all' | 'pending' | 'graded'>('pending');
    const [track, setTrack] = useState('all');
    const [grades, setGrades] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState<Record<string, string>>({});
    const [cohortName, setCohortName] = useState('');

    useEffect(() => {
        fetch('/api/content-coverage')
            .then((response) => {
                if (!response.ok) throw new Error();
                return response.json();
            })
            .then((payload: CoverageReport) => {
                setCoverage(payload);
                setCoverageState('ready');
            })
            .catch(() => setCoverageState('error'));
    }, []);

    const resumePath = getResumeTopicPath();
    const studentSubmissions = Object.entries(submissions).sort((a, b) => b[1].submittedAt.localeCompare(a[1].submittedAt));
    const lecturerSubmissions = Object.entries(allSubmissions).sort((a, b) => b[1].submittedAt.localeCompare(a[1].submittedAt));
    const students = users.filter((entry) => entry.role === 'student');
    const myCohorts = cohorts.filter((entry) => entry.lecturerId === user?.id);
    const completedTopics = Object.values(progress).filter((entry) => entry.completed).length;
    const graded = lecturerSubmissions.filter(([, submission]) => submission.status === 'graded');
    const averageGrade = graded.length ? Math.round(graded.reduce((sum, [, submission]) => sum + Number(submission.grade ?? 0), 0) / graded.length) : '--';
    const filteredQueue = lecturerSubmissions.filter(([, submission]) => {
        const q = query.trim().toLowerCase();
        return (status === 'all' || submission.status === status)
            && (track === 'all' || submission.trackId === track)
            && (!q || submission.userName.toLowerCase().includes(q) || topicLabel(submission.trackId, submission.moduleId, submission.topicId).toLowerCase().includes(q));
    });
    const progressRows = useMemo(() => curriculumData.tracks.map((entry) => ({ track: entry, ...trackProgress(entry.id, progress) })), [progress]);

    if (!user) {
        return (
            <div className="dashboard-shell" style={{ maxWidth: '840px' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Dashboard access requires an account</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Students get progress, bookmarks, and review history. Lecturers get grading, cohorts, and platform analytics.</p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <Link href="/auth" className="btn">Sign in</Link>
                        <Link href="/auth?mode=signup" className="btn-ghost">Create account</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (user.role === 'student') {
        return (
            <div className="dashboard-shell">
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h1 style={{ fontSize: '2.1rem', marginBottom: '0.4rem' }}>Student Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Track your learning, pick up where you stopped, and keep lecturer feedback in one place.</p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {resumePath && <Link href={resumePath} className="btn">Resume learning</Link>}
                        <Link href="/curriculum" className="btn-ghost">Browse curriculum</Link>
                        {!user.onboardingCompleted && <Link href="/onboarding" className="btn-ghost">Finish onboarding</Link>}
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                    <Stat label="Completed" value={completedTopics} note="topics marked complete" />
                    <Stat label="Bookmarks" value={bookmarks.length} note="saved lessons" />
                    <Stat label="Submissions" value={studentSubmissions.length} note="work sent for review" />
                    <Stat label="Unread" value={unreadNotifications} note="new notifications" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1rem' }} className="dashboard-grid">
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Progress by track</h2>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {progressRows.map(({ track, completed, total, pct }) => (
                                <div key={track.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', gap: '1rem', flexWrap: 'wrap' }}>
                                        <strong>{track.title}</strong>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{completed}/{total}</span>
                                    </div>
                                    <div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${pct}%` }} /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.1rem' }}>Notifications</h2>
                            {notifications.length > 0 && <button onClick={markAllNotificationsRead} className="btn-ghost">Mark all read</button>}
                        </div>
                        <div style={{ display: 'grid', gap: '0.7rem' }}>
                            {notifications.slice(0, 6).map((item) => (
                                <div key={item.id} style={{ padding: '0.85rem', borderRadius: '14px', background: item.read ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                                        <strong>{item.title}</strong>
                                        {!item.read && <button onClick={() => markNotificationRead(item.id)} className="btn-ghost">Read</button>}
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.message}</p>
                                </div>
                            ))}
                            {notifications.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Reviews and platform updates will appear here.</p>}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: '1rem' }} className="dashboard-grid">
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Bookmarks</h2>
                        <div style={{ display: 'grid', gap: '0.7rem' }}>
                            {bookmarks.slice(0, 8).map((bookmark) => (
                                <Link key={bookmark.topicKey} href={formatTopicPath(bookmark.trackId, bookmark.moduleId, bookmark.topicId)} style={{ color: 'inherit', textDecoration: 'none', padding: '0.85rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    {topicLabel(bookmark.trackId, bookmark.moduleId, bookmark.topicId)}
                                </Link>
                            ))}
                            {bookmarks.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Bookmark lessons from the topic page to keep them close.</p>}
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent activity</h2>
                        <div style={{ display: 'grid', gap: '0.7rem' }}>
                            {activityLog.slice(0, 8).map((entry) => (
                                <div key={entry.id} style={{ paddingBottom: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <strong style={{ display: 'block' }}>{entry.description}</strong>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(entry.createdAt).toLocaleString()}</span>
                                </div>
                            ))}
                            {activityLog.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Your history will appear as you learn and submit work.</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-shell">
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h1 style={{ fontSize: '2.1rem', marginBottom: '0.4rem' }}>Lecturer Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Review submissions, manage cohorts, track student activity, and monitor lesson coverage.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                <Stat label="Pending" value={lecturerSubmissions.filter(([, submission]) => submission.status === 'pending').length} note="submissions awaiting review" />
                <Stat label="Students" value={students.length} note="student accounts available" />
                <Stat label="Average grade" value={averageGrade} note="across graded work" />
                <Stat label="Unread" value={unreadNotifications} note="new alerts" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '1rem' }} className="dashboard-grid">
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.1rem' }}>Grading queue</h2>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input className="input" placeholder="Search student or topic" value={query} onChange={(event) => setQuery(event.target.value)} />
                            <select className="input" value={status} onChange={(event) => setStatus(event.target.value as 'all' | 'pending' | 'graded')}>
                                <option value="pending">Pending</option>
                                <option value="all">All</option>
                                <option value="graded">Graded</option>
                            </select>
                            <select className="input" value={track} onChange={(event) => setTrack(event.target.value)}>
                                <option value="all">All tracks</option>
                                {curriculumData.tracks.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gap: '0.85rem' }}>
                        {filteredQueue.map(([id, submission]) => (
                            <div key={id} style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                    <strong>{topicLabel(submission.trackId, submission.moduleId, submission.topicId)}</strong>
                                    <span style={{ color: submission.status === 'pending' ? '#fbbf24' : '#86efac' }}>{submission.status === 'pending' ? 'Pending' : `Graded ${submission.grade}/100`}</span>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{submission.userName} • {new Date(submission.submittedAt).toLocaleString()}</p>
                                <pre style={{ margin: '0 0 0.75rem', padding: '0.85rem', borderRadius: '12px', overflowX: 'auto', background: 'rgba(15,23,42,0.75)' }}><code>{submission.code}</code></pre>
                                {submission.status === 'pending' ? (
                                    <div style={{ display: 'grid', gap: '0.6rem' }}>
                                        <input className="input" type="number" min="0" max="100" placeholder="Grade" value={grades[id] ?? ''} onChange={(event) => setGrades((current) => ({ ...current, [id]: event.target.value }))} />
                                        <textarea className="input" placeholder="Feedback for the learner" style={{ minHeight: '96px' }} value={feedback[id] ?? ''} onChange={(event) => setFeedback((current) => ({ ...current, [id]: event.target.value }))} />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <button className="btn" onClick={() => grades[id] && gradeExercise(id, grades[id], feedback[id] || 'Reviewed. Keep tightening the implementation and explanation.')}>Grade</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)' }}>{submission.feedback}</p>
                                )}
                            </div>
                        ))}
                        {filteredQueue.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No submissions match the current filters.</p>}
                    </div>
                </div>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.1rem' }}>Notifications</h2>
                            {notifications.length > 0 && <button onClick={markAllNotificationsRead} className="btn-ghost">Mark all read</button>}
                        </div>
                        <div style={{ display: 'grid', gap: '0.7rem' }}>
                            {notifications.slice(0, 6).map((item) => (
                                <div key={item.id} style={{ padding: '0.85rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                                        <strong>{item.title}</strong>
                                        {!item.read && <button onClick={() => markNotificationRead(item.id)} className="btn-ghost">Read</button>}
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.message}</p>
                                </div>
                            ))}
                            {notifications.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>New submissions and review events will appear here.</p>}
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Cohorts</h2>
                        <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1rem' }}>
                            <input className="input" placeholder="New cohort name" value={cohortName} onChange={(event) => setCohortName(event.target.value)} />
                            <button className="btn" disabled={!cohortName.trim()} onClick={() => { createCohort(cohortName.trim()); setCohortName(''); }}>Create cohort</button>
                        </div>
                        <div style={{ display: 'grid', gap: '0.7rem' }}>
                            {myCohorts.map((cohort) => (
                                <div key={cohort.id} style={{ padding: '0.85rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{cohort.name}</strong>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>{cohort.studentIds.length} students assigned</p>
                                    <select className="input" defaultValue="" onChange={(event) => { if (event.target.value) { assignStudentToCohort(cohort.id, event.target.value); event.target.value = ''; } }}>
                                        <option value="">Assign student</option>
                                        {students.filter((student) => !cohort.studentIds.includes(student.id)).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
                                    </select>
                                </div>
                            ))}
                            {myCohorts.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Create a cohort to start grouping learners.</p>}
                        </div>
                    </div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="dashboard-grid">
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Activity log</h2>
                    <div style={{ display: 'grid', gap: '0.7rem' }}>
                        {activityLog.slice(0, 8).map((entry) => (
                            <div key={entry.id} style={{ paddingBottom: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <strong style={{ display: 'block' }}>{entry.description}</strong>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(entry.createdAt).toLocaleString()}</span>
                            </div>
                        ))}
                        {activityLog.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Cohort and review activity will show up here.</p>}
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Content analytics</h2>
                    {coverageState === 'loading' && <p style={{ color: 'var(--text-secondary)' }}>Loading curriculum coverage…</p>}
                    {coverageState === 'error' && <p style={{ color: '#fca5a5' }}>Coverage report could not be loaded.</p>}
                    {coverageState === 'ready' && coverage && (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
                                <Stat label="Coverage" value={`${coverage.totals.coveragePct}%`} note="lesson files present" />
                                <Stat label="Missing" value={coverage.totals.missing} note="expected files absent" />
                                <Stat label="Issues" value={coverage.totals.issues} note="integrity mismatches" />
                            </div>
                            {coverage.tracks.map((entry) => (
                                <div key={entry.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', gap: '1rem', flexWrap: 'wrap' }}>
                                        <strong>{entry.title}</strong>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{entry.existing}/{entry.expected} • {entry.coveragePct}%</span>
                                    </div>
                                    <div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${entry.coveragePct}%` }} /></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
