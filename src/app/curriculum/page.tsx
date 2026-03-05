'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { curriculumData } from '@/constants/curriculum';
import Link from 'next/link';
import { Server, Monitor, Smartphone, Database, Cloud, Shield, ChevronRight, BookOpen, Lock } from 'lucide-react';
import type { ElementType } from 'react';

const trackConfig: Record<string, { icon: ElementType; color: string; gradient: string }> = {
    backend: { icon: Server, color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    frontend: { icon: Monitor, color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
    mobile: { icon: Smartphone, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
    'data-science': { icon: Database, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
    devops: { icon: Cloud, color: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e, #8b5cf6)' },
    cybersecurity: { icon: Shield, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
};

const levelTagMap: Record<string, string> = {
    novice: 'tag-novice',
    beginner: 'tag-beginner',
    intermediate: 'tag-intermediate',
    advanced: 'tag-advanced',
    expert: 'tag-expert',
};

function CurriculumContent() {
    const searchParams = useSearchParams();
    const activeTrackId = searchParams.get('track') || 'backend';
    const activeTrack = curriculumData.tracks.find(t => t.id === activeTrackId);
    const config = trackConfig[activeTrackId] || trackConfig.backend;
    const Icon = config.icon;

    return (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 4.5rem)' }}>
            {/* LEFT SIDEBAR — Track Selector */}
            <aside style={{
                width: '260px', flexShrink: 0,
                padding: '2rem 1rem',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                position: 'sticky', top: '4.5rem', height: 'calc(100vh - 4.5rem)',
                overflowY: 'auto',
                background: 'rgba(5,8,20,0.6)',
                backdropFilter: 'blur(12px)',
            }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
                    TRACKS
                </p>
                {curriculumData.tracks.map(track => {
                    const tc = trackConfig[track.id] || trackConfig.backend;
                    const TIcon = tc.icon;
                    const isActive = activeTrackId === track.id;
                    return (
                        <Link key={track.id} href={`/curriculum?track=${track.id}`}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.65rem 0.75rem',
                                borderRadius: '10px',
                                marginBottom: '0.25rem',
                                background: isActive ? `${tc.color}18` : 'transparent',
                                border: `1px solid ${isActive ? `${tc.color}35` : 'transparent'}`,
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                            }}>
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '6px',
                                    background: isActive ? tc.gradient : 'rgba(255,255,255,0.06)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <TIcon size={14} color={isActive ? 'white' : 'var(--text-muted)'} />
                                </div>
                                <span style={{
                                    fontSize: '0.875rem',
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                }}>
                                    {track.title}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </aside>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, padding: '2.5rem 2.5rem', overflowY: 'auto', maxWidth: '900px' }}>
                {activeTrack ? (
                    <>
                        {/* Track Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                            <div style={{
                                width: '54px', height: '54px', borderRadius: '14px',
                                background: config.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 0 30px ${config.color}50`,
                                flexShrink: 0,
                            }}>
                                <Icon size={26} color="white" />
                            </div>
                            <div>
                                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.2rem' }}>
                                    {activeTrack.title}
                                </h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{activeTrack.description}</p>
                            </div>
                        </div>

                        {/* Modules */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {activeTrack.modules.map((module, moduleIndex) => {
                                const tagClass = levelTagMap[module.id] || 'tag-novice';
                                return (
                                    <div key={module.id} style={{
                                        border: '1px solid rgba(255,255,255,0.07)',
                                        borderRadius: '16px',
                                        background: 'rgba(255,255,255,0.02)',
                                        overflow: 'hidden',
                                    }}>
                                        {/* Module Header */}
                                        <div style={{
                                            padding: '1.25rem 1.5rem',
                                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                                            background: 'rgba(255,255,255,0.02)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                                                    <span style={{
                                                        fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem',
                                                        color: 'var(--text-muted)', fontWeight: 700
                                                    }}>
                                                        MODULE {String(moduleIndex + 1).padStart(2, '0')}
                                                    </span>
                                                    <span className={`tag ${tagClass}`}>{module.id.charAt(0).toUpperCase() + module.id.slice(1)}</span>
                                                </div>
                                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{module.title}</h2>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{module.description}</p>
                                            </div>
                                            <div style={{
                                                fontSize: '0.8rem', color: 'var(--text-muted)',
                                                background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.7rem',
                                                borderRadius: '9999px', flexShrink: 0, marginLeft: '1rem'
                                            }}>
                                                {module.topics.length} topics
                                            </div>
                                        </div>

                                        {/* Topics */}
                                        <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            {module.topics.map((topic, topicIndex) => (
                                                <Link key={topic.id} href={`/curriculum/${activeTrack.id}/${module.id}/${topic.id}`}>
                                                    <div className="topic-row">
                                                        <span className="topic-number">{String(topicIndex + 1).padStart(2, '0')}</span>
                                                        <div style={{ flex: 1 }}>
                                                            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                                                {topic.title}
                                                            </span>
                                                        </div>
                                                        <ChevronRight size={14} color="var(--text-muted)" />
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-secondary)' }}>
                        Select a track from the sidebar to begin.
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CurriculumOverview() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>}>
            <CurriculumContent />
        </Suspense>
    );
}
