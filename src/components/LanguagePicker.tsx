'use client';
import { CurriculumStack } from '@/constants/curriculum';
import { CheckCircle2, TrendingUp, Briefcase, Star, ArrowRight } from 'lucide-react';

interface LanguagePickerProps {
    trackTitle: string;
    stacks: CurriculumStack[];
    onSelect: (stackId: string) => void;
}

const popularityData: Record<string, { jobs: string; difficulty: string; stars: number }> = {
    nodejs: { jobs: '450k+ jobs', difficulty: 'Moderate', stars: 5 },
    python: { jobs: '380k+ jobs', difficulty: 'Beginner-friendly', stars: 5 },
    go: { jobs: '85k+ jobs', difficulty: 'Moderate', stars: 4 },
    java: { jobs: '520k+ jobs', difficulty: 'Challenging', stars: 4 },
    php: { jobs: '190k+ jobs', difficulty: 'Beginner-friendly', stars: 3 },
    ruby: { jobs: '70k+ jobs', difficulty: 'Moderate', stars: 3 },
};

const featureTags: Record<string, string[]> = {
    nodejs: ['Same language as Frontend', 'Huge npm ecosystem', 'Non-blocking I/O', 'Used at Netflix, Uber, LinkedIn'],
    python: ['Readable syntax', 'Best for Data + AI', 'Django or FastAPI', 'Used at Instagram, Spotify, NASA'],
    go: ['Statically typed', 'Concurrency built-in', 'Tiny memory footprint', 'Used at Google, Cloudflare, Uber'],
    java: ['Strict type system', 'Best for large teams', 'Excellent tooling', 'Used at Amazon, Goldman Sachs, Netflix'],
    php: ['Runs on any host', 'Laravel ecosystem', 'Huge legacy market', 'Powers 77% of the web'],
    ruby: ['Convention over config', 'Rails magic', 'Rapid prototyping', 'Used at GitHub, Shopify, Airbnb'],
};

export default function LanguagePicker({ trackTitle, stacks, onSelect }: LanguagePickerProps) {
    return (
        <div style={{ padding: '3rem 2.5rem', maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '3rem' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.3rem 1rem', borderRadius: '9999px',
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                    fontSize: '0.75rem', fontWeight: 600, color: '#a5b4fc',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    marginBottom: '1.25rem',
                }}>
                    {trackTitle} Track
                </div>
                <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '0.75rem' }}>
                    First, pick your{' '}
                    <span style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                    }}>
                        stack
                    </span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '580px', lineHeight: 1.7 }}>
                    The core ideas are transferable, but the code, frameworks, and tooling differ by stack.
                    Choose your path and we&apos;ll tailor the curriculum examples, exercises, and terminology to it.
                </p>
            </div>

            {/* Language Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                gap: '1.25rem',
                marginBottom: '3rem',
            }}>
                {stacks.map(lang => {
                    const meta = popularityData[lang.id];
                    const tags = featureTags[lang.id] || [];
                    return (
                        <button
                            key={lang.id}
                            onClick={() => onSelect(lang.id)}
                            style={{
                                all: 'unset', cursor: 'pointer', display: 'block',
                                padding: '1.75rem',
                                borderRadius: '18px',
                                background: 'rgba(255,255,255,0.025)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                textAlign: 'left',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                            onMouseEnter={e => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.transform = 'translateY(-5px)';
                                el.style.background = `rgba(${hexToRgb(lang.color)}, 0.06)`;
                                el.style.borderColor = `${lang.color}50`;
                                el.style.boxShadow = `0 20px 60px ${lang.color}20, 0 0 0 1px ${lang.color}40`;
                            }}
                            onMouseLeave={e => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.transform = 'translateY(0)';
                                el.style.background = 'rgba(255,255,255,0.025)';
                                el.style.borderColor = 'rgba(255,255,255,0.07)';
                                el.style.boxShadow = 'none';
                            }}
                        >
                            {/* Header row */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '46px', height: '46px', borderRadius: '12px',
                                        background: `${lang.color}18`,
                                        border: `1px solid ${lang.color}35`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.4rem',
                                    }}>
                                        {lang.emoji}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                            {lang.name}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: lang.color, fontWeight: 600, marginTop: '0.15rem' }}>
                                            {lang.framework}
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '4px' }} />
                            </div>

                            {/* Tagline */}
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                                {lang.tagline}
                            </p>

                            {/* Feature tags */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                                {tags.map(tag => (
                                    <span key={tag} style={{
                                        padding: '0.2rem 0.6rem', borderRadius: '9999px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500,
                                    }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Meta row */}
                            {meta && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)',
                                    fontSize: '0.78rem', color: 'var(--text-muted)',
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Briefcase size={11} /> {meta.jobs}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <TrendingUp size={11} /> {meta.difficulty}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto', color: '#fbbf24' }}>
                                        {Array.from({ length: 5 }, (_, i) => (
                                            <Star key={i} size={10} fill={i < meta.stars ? '#fbbf24' : 'transparent'} />
                                        ))}
                                    </span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Bottom note */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)',
                fontSize: '0.875rem', color: 'var(--text-secondary)',
                maxWidth: '600px',
            }}>
                <CheckCircle2 size={16} color="#6366f1" style={{ flexShrink: 0 }} />
                <span>
                    <strong style={{ color: 'var(--text-primary)' }}>You can change your stack later.</strong>
                    {' '}The curriculum structure stays the same — only the stack-specific guidance changes.
                </span>
            </div>
        </div>
    );
}

// Utility to convert hex to rgb for dynamic rgba()
function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '99,102,241';
    return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
