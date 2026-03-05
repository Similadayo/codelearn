'use client';
import { useSearchParams } from 'next/navigation';
import { curriculumData } from '@/constants/curriculum';
import Link from 'next/link';

export default function CurriculumOverview() {
    const searchParams = useSearchParams();
    const activeTrackId = searchParams.get('track') || 'backend';

    const activeTrack = curriculumData.tracks.find(t => t.id === activeTrackId);

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: '3rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Curriculum</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {curriculumData.tracks.map(track => (
                        <Link key={track.id} href={`/curriculum?track=${track.id}`}>
                            <button className={`btn ${activeTrackId === track.id ? '' : 'inactive'}`} style={{
                                background: activeTrackId === track.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                                color: activeTrackId === track.id ? 'white' : 'var(--text-secondary)'
                            }}>
                                {track.title}
                            </button>
                        </Link>
                    ))}
                </div>
            </header>

            {activeTrack && (
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--accent-hover)' }}>{activeTrack.title} Modules</h2>
                    {activeTrack.modules.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>This track is currently under construction. Check back later!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {activeTrack.modules.map(module => (
                                <div key={module.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{module.title}</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{module.description}</p>

                                    <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {module.topics.map((topic, index) => (
                                            <Link key={topic.id} href={`/curriculum/${activeTrack.id}/${module.id}/${topic.id}`}>
                                                <div style={{
                                                    padding: '0.75rem',
                                                    background: 'rgba(255,255,255,0.02)',
                                                    borderRadius: '8px',
                                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                                    transition: 'var(--transition)',
                                                    cursor: 'pointer'
                                                }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--accent-hover)' }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = 'inherit' }}
                                                >
                                                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>0{index + 1}</span>
                                                    <span style={{ fontWeight: 500 }}>{topic.title}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
