'use client';
import Link from 'next/link';
import { curriculumData, Track } from '@/constants/curriculum';
import {
    Server, Monitor, Smartphone, Database,
    Cloud, Shield, ArrowRight, BookOpen,
    Users, Award, Zap, CheckCircle
} from 'lucide-react';

const trackConfig: Record<string, { icon: React.ElementType; color: string; gradient: string; modules: number }> = {
    backend: { icon: Server, color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', modules: 5 },
    frontend: { icon: Monitor, color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)', modules: 5 },
    mobile: { icon: Smartphone, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', modules: 5 },
    'data-science': { icon: Database, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', modules: 5 },
    devops: { icon: Cloud, color: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e, #8b5cf6)', modules: 5 },
    cybersecurity: { icon: Shield, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f97316)', modules: 5 },
};

const featureHighlights = [
    {
        icon: BookOpen,
        title: 'Deeply Detailed Content',
        desc: 'Every topic goes far beyond surface-level. You\'ll understand the why, not just the how.',
        color: '#6366f1',
    },
    {
        icon: Award,
        title: 'Real Exercises & Grading',
        desc: 'Submit code and written answers. Get graded with personal feedback from lecturers.',
        color: '#10b981',
    },
    {
        icon: Zap,
        title: 'Novice to Expert',
        desc: 'Structured progression across 5 levels. Each builds on the last — no gaps, no confusion.',
        color: '#f59e0b',
    },
];

export default function Home() {
    return (
        <main style={{ minHeight: '100vh' }}>
            {/* HERO SECTION */}
            <section style={{
                maxWidth: '900px', margin: '0 auto', padding: '5rem 2rem 4rem',
                textAlign: 'center',
            }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.3rem 1rem', borderRadius: '9999px',
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                    fontSize: '0.78rem', fontWeight: 600, color: '#a5b4fc',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    marginBottom: '1.75rem',
                }}>
                    <CheckCircle size={12} />
                    6 Tracks · 30+ Modules · Novice to Expert
                </div>

                <h1 className="heading-xl" style={{ marginBottom: '1.5rem' }}>
                    <span className="gradient-text">Master Every Discipline</span>
                    <br />
                    <span style={{ color: 'var(--text-primary)' }}>in Tech.</span>
                </h1>

                <p style={{
                    fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: 1.8,
                    maxWidth: '640px', margin: '0 auto 2.5rem',
                }}>
                    From "What is the Internet?" to designing distributed systems at scale.
                    Deeply detailed lessons, real exercises, and expert grading — all in one place.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link href="/curriculum?track=backend">
                        <button className="btn" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
                            Start Learning <ArrowRight size={16} />
                        </button>
                    </Link>
                    <Link href="/curriculum">
                        <button className="btn-ghost" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
                            Browse Tracks
                        </button>
                    </Link>
                </div>
            </section>

            {/* TRACK CARDS */}
            <section style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 2rem 5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h2 className="heading-lg" style={{ marginBottom: '0.75rem' }}>
                        Choose Your Path
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
                        Every track is a complete learning journey from absolute beginner to expert-level practitioner.
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {curriculumData.tracks.map((track) => {
                        const config = trackConfig[track.id] || trackConfig.backend;
                        const Icon = config.icon;
                        const topicCount = track.modules.reduce((acc, m) => acc + m.topics.length, 0);
                        return (
                            <Link key={track.id} href={`/curriculum?track=${track.id}`} style={{ textDecoration: 'none' }}>
                                <div className={`track-card track-card-${track.id}`}>
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        {/* Icon */}
                                        <div className="track-icon" style={{ background: config.gradient, boxShadow: `0 0 25px ${config.color}40` }}>
                                            <Icon size={24} color="white" />
                                        </div>

                                        {/* Title */}
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                                            {track.title}
                                        </h3>

                                        {/* Description */}
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                                            {track.description}
                                        </p>

                                        {/* Meta */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <BookOpen size={12} /> {track.modules.length} modules
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Zap size={12} /> {topicCount} topics
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: config.color, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                Explore <ArrowRight size={13} />
                                            </span>
                                        </div>

                                        {/* Level tags */}
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                            {['Novice', 'Beginner', 'Intermediate', 'Advanced', 'Expert'].map(level => (
                                                <span key={level} className={`tag tag-${level.toLowerCase()}`}>{level}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </section>

            {/* WHY SECTION */}
            <section style={{
                maxWidth: '1100px', margin: '0 auto', padding: '0 2rem 6rem',
            }}>
                <div className="section-divider" />
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h2 className="heading-lg" style={{ marginBottom: '0.5rem' }}>Why CodeLearn?</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {featureHighlights.map(f => (
                        <div key={f.title} style={{
                            padding: '2rem',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.02)',
                        }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '10px',
                                background: `${f.color}18`, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', marginBottom: '1.25rem',
                            }}>
                                <f.icon size={20} color={f.color} />
                            </div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                                {f.title}
                            </h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
