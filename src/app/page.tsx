import Link from 'next/link';
import { curriculumData } from '@/constants/curriculum';
import * as Icons from 'lucide-react';

export default function Home() {
    return (
        <main style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <section style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
                <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', background: 'linear-gradient(45deg, var(--accent-primary), var(--accent-hover))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>
                    Master Tech. <br />Novice to Expert.
                </h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
                    Select a track below to begin your journey. Follow our deeply detailed curriculum, complete exercises, and get graded by expert lecturers.
                </p>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1200px' }}>
                {curriculumData.tracks.map((track) => {
                    const IconComponent = Icons[track.icon] || Icons.Book;
                    return (
                        <Link key={track.id} href={`/curriculum?track=${track.id}`}>
                            <div className="glass-panel" style={{
                                padding: '2rem',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                transition: 'var(--transition)',
                                cursor: 'pointer'
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                                }}>
                                <div style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    width: '60px', height: '60px',
                                    borderRadius: '12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--accent-primary)'
                                }}>
                                    <IconComponent size={32} />
                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{track.title}</h2>
                                <p style={{ color: 'var(--text-secondary)', flexGrow: 1 }}>{track.description}</p>
                                <div style={{ color: 'var(--accent-hover)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    Explore Track &rarr;
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </main>
    );
}
