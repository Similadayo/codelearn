'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { curriculumData, getTrackSupportedLanguages, topicUsesStackVariant } from '@/constants/curriculum';
import LanguagePicker from '@/components/LanguagePicker';
import Link from 'next/link';
import { Server, Monitor, Smartphone, Database, Cloud, Shield, ChevronRight, Code2, Layers3 } from 'lucide-react';
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
    phase1: 'tag-novice', phase2: 'tag-novice', phase3: 'tag-beginner',
    phase4: 'tag-beginner', phase5: 'tag-intermediate', phase6: 'tag-intermediate',
    phase7: 'tag-advanced', phase8: 'tag-advanced', phase9: 'tag-expert',
};

const phaseLabels: Record<string, string> = {
    phase1: 'Foundations', phase2: 'Build', phase3: 'Systems',
    phase4: 'Execution', phase5: 'Depth', phase6: 'Security',
    phase7: 'Scale', phase8: 'Ship', phase9: 'Architecture',
};

function getStackStorageKey(trackId: string) {
    return `codelearn_stack_${trackId}`;
}

function CurriculumContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeTrackId = searchParams.get('track') || 'backend';
    const activeTrack = curriculumData.tracks.find((track) => track.id === activeTrackId);
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
    const selectedLangInfo = trackStacks.find((stack) => stack.id === selectedLang);

    if (!activeTrack) {
        return (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-secondary)' }}>
                Select a track from the overview to begin.
            </div>
        );
    }

    return (
        <div className="curriculum-shell">
            <div className="curriculum-track-bar glass-panel">
                {curriculumData.tracks.map((track) => {
                    const trackStyle = trackConfig[track.id] || trackConfig.backend;
                    const TrackIcon = trackStyle.icon;
                    const isActive = track.id === activeTrackId;
                    return (
                        <Link
                            key={track.id}
                            href={`/curriculum?track=${track.id}`}
                            className="curriculum-track-chip"
                            style={{
                                background: isActive ? `${trackStyle.color}20` : 'rgba(255,255,255,0.02)',
                                borderColor: isActive ? `${trackStyle.color}40` : 'rgba(255,255,255,0.06)',
                            }}
                        >
                            <span
                                className="curriculum-track-chip-icon"
                                style={{ background: isActive ? trackStyle.gradient : 'rgba(255,255,255,0.06)' }}
                            >
                                <TrackIcon size={14} color={isActive ? 'white' : 'var(--text-muted)'} />
                            </span>
                            <span>{track.title}</span>
                        </Link>
                    );
                })}
            </div>

            {needsLangPicker ? (
                <LanguagePicker
                    trackTitle={activeTrack.title}
                    stacks={trackStacks}
                    onSelect={handleSelectLanguage}
                />
            ) : (
                <div className="curriculum-layout">
                    <section className="curriculum-main">
                        <div className="curriculum-hero glass-panel">
                            <div className="curriculum-hero-copy">
                                <div className="curriculum-kicker" style={{ color: config.color }}>
                                    <Layers3 size={14} />
                                    {activeTrack.title}
                                </div>
                                <div className="curriculum-hero-header">
                                    <div
                                        className="curriculum-hero-icon"
                                        style={{ background: config.gradient, boxShadow: `0 0 32px ${config.color}45` }}
                                    >
                                        <Icon size={24} color="white" />
                                    </div>
                                    <div>
                                        <h1 className="curriculum-title">{activeTrack.title}</h1>
                                        <p className="curriculum-subtitle">{activeTrack.description}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="curriculum-stats">
                                <div className="curriculum-stat-card">
                                    <span className="curriculum-stat-value">{activeTrack.modules.length}</span>
                                    <span className="curriculum-stat-label">Phases</span>
                                </div>
                                <div className="curriculum-stat-card">
                                    <span className="curriculum-stat-value">
                                        {activeTrack.modules.reduce((sum, module) => sum + module.topics.length, 0)}
                                    </span>
                                    <span className="curriculum-stat-label">Topics</span>
                                </div>
                                <div className="curriculum-stat-card">
                                    <span className="curriculum-stat-value">{trackStacks.length || 1}</span>
                                    <span className="curriculum-stat-label">Stacks</span>
                                </div>
                            </div>
                        </div>

                        <div className="curriculum-phase-grid">
                            {activeTrack.modules.map((module, moduleIndex) => {
                                const tagClass = levelTagMap[module.id] || 'tag-novice';
                                const phaseColor = phaseColors[module.id] || config.color;
                                const phaseLabel = phaseLabels[module.id] || module.id.toUpperCase();
                                const totalStackTopics = module.topics.filter((topic) => topicUsesStackVariant(activeTrack, topic)).length;

                                return (
                                    <article key={module.id} className="curriculum-phase-card glass-panel">
                                        <div className="curriculum-phase-head" style={{ borderTopColor: `${phaseColor}90` }}>
                                            <div className="curriculum-phase-meta">
                                                <span className="curriculum-phase-index" style={{ color: phaseColor }}>
                                                    {String(moduleIndex + 1).padStart(2, '0')}
                                                </span>
                                                <span className={`tag ${tagClass}`}>{phaseLabel}</span>
                                                {trackNeedsStack && totalStackTopics > 0 && selectedLangInfo && (
                                                    <span
                                                        className="curriculum-stack-pill"
                                                        style={{
                                                            color: selectedLangInfo.color,
                                                            background: `${selectedLangInfo.color}14`,
                                                            borderColor: `${selectedLangInfo.color}2f`,
                                                        }}
                                                    >
                                                        {selectedLangInfo.emoji} {totalStackTopics} stack-specific
                                                    </span>
                                                )}
                                            </div>
                                            <span className="curriculum-topic-count">{module.topics.length} topics</span>
                                        </div>

                                        <div className="curriculum-phase-copy">
                                            <h2>{module.title}</h2>
                                            <p>{module.description}</p>
                                        </div>

                                        <div className="curriculum-topic-list">
                                            {module.topics.map((topic, topicIndex) => (
                                                <Link
                                                    key={topic.id}
                                                    href={`/curriculum/${activeTrack.id}/${module.id}/${topic.id}${selectedLang ? `?lang=${selectedLang}` : ''}`}
                                                    className="curriculum-topic-item"
                                                >
                                                    <span className="topic-number">{String(topicIndex + 1).padStart(2, '0')}</span>
                                                    <span className="curriculum-topic-title">{topic.title}</span>
                                                    <div className="curriculum-topic-tail">
                                                        {topicUsesStackVariant(activeTrack, topic) && selectedLangInfo && (
                                                            <span style={{ fontSize: '0.72rem', color: selectedLangInfo.color }}>
                                                                {selectedLangInfo.emoji}
                                                            </span>
                                                        )}
                                                        <ChevronRight size={14} color="var(--text-muted)" />
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <aside className="curriculum-side">
                        <div className="curriculum-side-card glass-panel">
                            <p className="curriculum-side-label">Selected Track</p>
                            <h2>{activeTrack.title}</h2>
                            <p>{activeTrack.modules.length} phases organized as a guided progression.</p>
                        </div>

                        {trackNeedsStack && selectedLangInfo && (
                            <div className="curriculum-side-card glass-panel">
                                <p className="curriculum-side-label">Selected Stack</p>
                                <div className="curriculum-selected-stack">
                                    <span className="curriculum-selected-stack-emoji">{selectedLangInfo.emoji}</span>
                                    <div>
                                        <h3>{selectedLangInfo.name}</h3>
                                        <p>{selectedLangInfo.framework}</p>
                                    </div>
                                </div>
                                <button onClick={handleChangeLang} className="btn-ghost curriculum-side-button">
                                    <Code2 size={13} /> Change Stack
                                </button>
                            </div>
                        )}

                        <div className="curriculum-side-card glass-panel">
                            <p className="curriculum-side-label">Phase Flow</p>
                            <div className="curriculum-phase-rail">
                                {activeTrack.modules.map((module, index) => (
                                    <div key={module.id} className="curriculum-phase-rail-item">
                                        <span
                                            className="curriculum-phase-rail-dot"
                                            style={{ background: phaseColors[module.id] || config.color }}
                                        />
                                        <div>
                                            <strong>{module.title}</strong>
                                            <p>{module.topics.length} topics</p>
                                        </div>
                                        <span className="curriculum-phase-rail-number">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}

export default function CurriculumOverview() {
    return (
        <Suspense
            fallback={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
                    Loading curriculum...
                </div>
            }
        >
            <CurriculumContent />
        </Suspense>
    );
}
