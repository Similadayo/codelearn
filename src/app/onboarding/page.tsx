'use client';
import { curriculumData, getTrackSupportedLanguages } from '@/constants/curriculum';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

export default function OnboardingPage() {
    const { user, completeOnboarding } = useAuth();
    const router = useRouter();
    const initialTrack = user?.preferences?.preferredTrackId || curriculumData.tracks[0]?.id || 'backend';
    const [preferredTrackId, setPreferredTrackId] = useState(initialTrack);
    const [preferredStackId, setPreferredStackId] = useState(user?.preferences?.preferredStackId || '');
    const [studyGoal, setStudyGoal] = useState(user?.preferences?.studyGoal || '');

    const stacks = useMemo(() => getTrackSupportedLanguages(preferredTrackId), [preferredTrackId]);

    useEffect(() => {
        if (!user) {
            router.replace('/auth');
            return;
        }
        if (user.onboardingCompleted) {
            router.replace('/dashboard');
        }
    }, [router, user]);

    useEffect(() => {
        if (stacks.length === 0) {
            setPreferredStackId('');
            return;
        }
        if (!stacks.some((stack) => stack.id === preferredStackId)) {
            setPreferredStackId(stacks[0].id);
        }
    }, [preferredStackId, stacks]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await completeOnboarding({
            preferredTrackId,
            preferredStackId: preferredStackId || undefined,
            studyGoal,
        });
        router.replace('/dashboard');
    };

    return (
        <main style={{ minHeight: 'calc(100vh - 4.5rem)', display: 'grid', placeItems: 'center', padding: '2rem 1rem' }}>
            <div className="glass-panel" style={{ width: 'min(100%, 620px)', padding: '1.6rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Finish your onboarding</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Set your track focus and preferred stack so the platform can recommend the right next step.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-secondary)' }}>Primary track</label>
                        <select className="input" value={preferredTrackId} onChange={(event) => setPreferredTrackId(event.target.value)}>
                            {curriculumData.tracks.map((track) => (
                                <option key={track.id} value={track.id}>{track.title}</option>
                            ))}
                        </select>
                    </div>

                    {stacks.length > 0 && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-secondary)' }}>Preferred stack</label>
                            <select className="input" value={preferredStackId} onChange={(event) => setPreferredStackId(event.target.value)}>
                                {stacks.map((stack) => (
                                    <option key={stack.id} value={stack.id}>{stack.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-secondary)' }}>Study goal</label>
                        <textarea
                            className="input"
                            rows={4}
                            placeholder="Example: Become job-ready in backend engineering and complete one phase per week."
                            value={studyGoal}
                            onChange={(event) => setStudyGoal(event.target.value)}
                        />
                    </div>

                    <button className="btn" type="submit" style={{ justifyContent: 'center' }}>
                        Save and continue
                    </button>
                </form>
            </div>
        </main>
    );
}
