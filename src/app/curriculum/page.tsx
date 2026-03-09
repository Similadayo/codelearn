'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { curriculumData, getTrackSupportedLanguages, topicUsesStackVariant } from '@/constants/curriculum';
import LanguagePicker from '@/components/LanguagePicker';
import Link from 'next/link';
import { Server, Monitor, Smartphone, Database, Cloud, Shield, ChevronRight, BookOpen, Zap, X, Code2 } from 'lucide-react';
import type { ElementType } from 'react';

const trackConfig: Record<string, { icon: ElementType; color: string; gradient: string }> = {
    backend: { icon: Server, color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    frontend: { icon: Monitor, color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
    mobile: { icon: Smartphone, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
    'data-science': { icon: Database, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
    devops: { icon: Cloud, color: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e, #8b5cf6)' },
    cybersecurity: { icon: Shield, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
};

const phaseColors: Record<string, string> = {
    phase1: '#6366f1', phase2: '#8b5cf6', phase3: '#06b6d4',
    phase4: '#10b981', phase5: '#f59e0b', phase6: '#f43f5e',
    phase7: '#3b82f6', phase8: '#ec4899', phase9: '#a855f7',
};

const levelTagMap: Record<string, string> = {
    novice: 'tag-novice', beginner: 'tag-beginner', intermediate: 'tag-intermediate',
    advanced: 'tag-advanced', expert: 'tag-expert',
    phase1: 'tag-novice', phase2: 'tag-novice', phase3: 'tag-beginner',
    phase4: 'tag-beginner', phase5: 'tag-intermediate', phase6: 'tag-intermediate',
    phase7: 'tag-advanced', phase8: 'tag-advanced', phase9: 'tag-expert',
};

const phaseLabels: Record<string, string> = {
    phase1: 'Foundations', phase2: 'Tools', phase3: 'Networking',
    phase4: 'Web Servers', phase5: 'Databases', phase6: 'Auth & Security',
    phase7: 'Advanced APIs', phase8: 'Infrastructure', phase9: 'System Design',
};

function getStackStorageKey(trackId: string) {
    return `codelearn_stack_${trackId}`;
}

function CurriculumContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeTrackId = searchParams.get('track') || 'backend';
    const activeTrack = curriculumData.tracks.find(t => t.id === activeTrackId);
    const config = trackConfig[activeTrackId] || trackConfig.backend;
    const Icon = config.icon;

    const [selectedLang, setSelectedLang] = useState<string | null>(null);
    const [langLoaded, setLangLoaded] = useState(false);
    const trackStacks = getTrackSupportedLanguages(activeTrackId);
    const trackNeedsStack = trackStacks.length > 0;

    useEffect(() => {
        const langFromUrl = searchParams.get('lang');
        if (langFromUrl) {
            setSelectedLang(langFromUrl);
        } else {
            const saved = localStorage.getItem(getStackStorageKey(activeTrackId));
            if (saved) setSelectedLang(saved);
        }
        setLangLoaded(true);
    }, [activeTrackId, searchParams]);

    const handleSelectLanguage = (langId: string) => {
        setSelectedLang(langId);
        localStorage.setItem(getStackStorageKey(activeTrackId), langId);
        router.replace(`/curriculum?track=${activeTrackId}&lang=${langId}`, { scroll: false });
    };

    const handleChangeLang = () => {
        setSelectedLang(null);
        localStorage.removeItem(getStackStorageKey(activeTrackId));
        router.replace(`/curriculum?track=${activeTrackId}`, { scroll: false });
    };

    const needsLangPicker = trackNeedsStack && langLoaded && !selectedLang;
    const selectedLangInfo = trackStacks.find(l => l.id === selectedLang);

    return (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 4.5rem)' }}>
            {/* LEFT SIDEBAR — Track Selector */}
            <aside style={{
                width: '240px', flexShrink: 0,
                padding: '1.75rem 1rem',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                position: 'sticky', top: '4.5rem', height: 'calc(100vh - 4.5rem)',
                overflowY: 'auto',
                background: 'rgba(5,8,20,0.6)',
                backdropFilter: 'blur(12px)',
            }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
                    TRACKS
                </p>
                {curriculumData.tracks.map(track => {
                    const tc = trackConfig[track.id] || trackConfig.backend;
                    const TIcon = tc.icon;
                    const isActive = activeTrackId === track.id;
                    return (
                        <Link key={track.id} href={`/curriculum?track=${track.id}`}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.65rem',
                                padding: '0.6rem 0.65rem',
                                borderRadius: '10px',
                                marginBottom: '0.2rem',
                                background: isActive ? `${tc.color}18` : 'transparent',
                                border: `1px solid ${isActive ? `${tc.color}35` : 'transparent'}`,
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                            }}>
                                <div style={{
                                    width: '26px', height: '26px', borderRadius: '6px',
                                    background: isActive ? tc.gradient : 'rgba(255,255,255,0.06)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <TIcon size={13} color={isActive ? 'white' : 'var(--text-muted)'} />
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.3 }}>
                                    {track.title}
                                </span>
                            </div>
                        </Link>
                    );
                })}

                {trackNeedsStack && selectedLangInfo && (
                    <div style={{ marginTop: '1.5rem', padding: '0 0.5rem' }}>
                        <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                            STACK
                        </p>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '10px',
                            background: `${selectedLangInfo.color}15`,
                            border: `1px solid ${selectedLangInfo.color}35`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1rem' }}>{selectedLangInfo.emoji}</span>
                                <div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {selectedLangInfo.name}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: selectedLangInfo.color }}>
                                        {selectedLangInfo.framework}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleChangeLang}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                                title="Change stack"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {needsLangPicker ? (
                    <LanguagePicker
                        trackTitle={activeTrack?.title ?? activeTrackId}
                        stacks={trackStacks}
                        onSelect={handleSelectLanguage}
                    />
                ) : activeTrack ? (
                    <div style={{ padding: '2.5rem 2.5rem', maxWidth: '880px' }}>
                        {/* Track Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '52px', height: '52px', borderRadius: '14px',
                                    background: config.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 0 30px ${config.color}50`, flexShrink: 0,
                                }}>
                                    <Icon size={24} color="white" />
                                </div>
                                <div>
                                    <h1 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '0.2rem' }}>
                                        {activeTrack.title}
                                    </h1>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                        {activeTrack.description}
                                    </p>
                                </div>
                            </div>

                            {trackNeedsStack && selectedLangInfo && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        padding: '0.4rem 0.9rem', borderRadius: '9999px',
                                        background: `${selectedLangInfo.color}15`,
                                        border: `1px solid ${selectedLangInfo.color}40`,
                                    }}>
                                        <span style={{ fontSize: '0.95rem' }}>{selectedLangInfo.emoji}</span>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                                                {selectedLangInfo.name}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: selectedLangInfo.color, lineHeight: 1, marginTop: '2px' }}>
                                                {selectedLangInfo.framework}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleChangeLang}
                                        className="btn-ghost"
                                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
                                    >
                                        <Code2 size={12} /> Change Stack
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Summary stats */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                            {[
                                { label: 'Phases', value: activeTrack.modules.length },
                                { label: 'Topics', value: activeTrack.modules.reduce((a, m) => a + m.topics.length, 0) },
                                { label: 'Difficulty', value: trackNeedsStack ? 'Stack-based' : 'Varies' },
                            ].map(s => (
                                <div key={s.label} style={{
                                    padding: '0.75rem 1.25rem', borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                    display: 'flex', flexDirection: 'column', gap: '0.15rem',
                                }}>
                                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{s.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Modules */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {activeTrack.modules.map((module, moduleIndex) => {
                                const tagClass = levelTagMap[module.id] || 'tag-novice';
                                const phaseColor = phaseColors[module.id] || config.color;
                                const phaseLabel = phaseLabels[module.id] || module.id;
                                const totalLangSpecific = module.topics.filter(t => topicUsesStackVariant(activeTrack, t)).length;

                                return (
                                    <div key={module.id} style={{
                                        border: '1px solid rgba(255,255,255,0.07)',
                                        borderRadius: '16px',
                                        background: 'rgba(255,255,255,0.02)',
                                        overflow: 'hidden',
                                    }}>
                                        {/* Module Header */}
                                        <div style={{
                                            padding: '1.1rem 1.5rem',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            background: `${phaseColor}06`,
                                            borderTop: `2px solid ${phaseColor}40`,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                                                        <span style={{
                                                            fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem',
                                                            color: phaseColor, fontWeight: 700, letterSpacing: '0.05em',
                                                        }}>
                                                            {String(moduleIndex + 1).padStart(2, '0')} / {activeTrack.modules.length}
                                                        </span>
                                                        <span className={`tag ${tagClass}`}>{phaseLabel}</span>
                                                        {trackNeedsStack && totalLangSpecific > 0 && selectedLangInfo && (
                                                            <span style={{
                                                                fontSize: '0.68rem', fontWeight: 600,
                                                                color: selectedLangInfo.color, background: `${selectedLangInfo.color}15`,
                                                                padding: '0.1rem 0.5rem', borderRadius: '9999px',
                                                                border: `1px solid ${selectedLangInfo.color}30`,
                                                            }}>
                                                                {selectedLangInfo.emoji} {totalLangSpecific} stack-specific
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                                                        {module.title}
                                                    </h2>
                                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{module.description}</p>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.78rem', color: 'var(--text-muted)',
                                                    background: 'rgba(255,255,255,0.04)', padding: '0.25rem 0.65rem',
                                                    borderRadius: '9999px', flexShrink: 0, whiteSpace: 'nowrap',
                                                }}>
                                                    {module.topics.length} topics
                                                </span>
                                            </div>
                                        </div>

                                        {/* Topics */}
                                        <div style={{ padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            {module.topics.map((topic, topicIndex) => (
                                                <Link key={topic.id} href={`/curriculum/${activeTrack.id}/${module.id}/${topic.id}${selectedLang ? `?lang=${selectedLang}` : ''}`}>
                                                    <div className="topic-row">
                                                        <span className="topic-number">{String(topicIndex + 1).padStart(2, '0')}</span>
                                                        <div style={{ flex: 1 }}>
                                                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                                                {topic.title}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {topicUsesStackVariant(activeTrack, topic) && selectedLangInfo && (
                                                                <span style={{ fontSize: '0.65rem', color: selectedLangInfo.color, opacity: 0.8 }}>
                                                                    {selectedLangInfo.emoji}
                                                                </span>
                                                            )}
                                                            <ChevronRight size={14} color="var(--text-muted)" />
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
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
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
                Loading curriculum...
            </div>
        }>
            <CurriculumContent />
        </Suspense>
    );
}
