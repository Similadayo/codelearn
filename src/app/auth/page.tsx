'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

export default function AuthPage() {
    const { user, signIn, signUp } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';

    const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student' as 'student' | 'lecturer',
    });

    useEffect(() => {
        if (user) {
            router.replace(user.onboardingCompleted ? '/dashboard' : '/onboarding');
        }
    }, [router, user]);

    const submitLabel = useMemo(() => (mode === 'signin' ? 'Sign In' : 'Create Account'), [mode]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        if (mode === 'signin') {
            const result = await signIn({ email: form.email, password: form.password });
            if (!result.ok) {
                setError(result.error || 'Unable to sign in.');
                return;
            }
            return;
        }

        const result = await signUp({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
        });
        if (!result.ok) {
            setError(result.error || 'Unable to create account.');
        }
    };

    return (
        <main style={{ minHeight: 'calc(100vh - 4.5rem)', display: 'grid', placeItems: 'center', padding: '2rem 1rem' }}>
            <div className="glass-panel" style={{ width: 'min(100%, 460px)', padding: '1.6rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
                    <button className={mode === 'signin' ? 'btn' : 'btn-outline'} onClick={() => setMode('signin')} type="button" style={{ flex: 1, justifyContent: 'center' }}>
                        Sign In
                    </button>
                    <button className={mode === 'signup' ? 'btn' : 'btn-outline'} onClick={() => setMode('signup')} type="button" style={{ flex: 1, justifyContent: 'center' }}>
                        Sign Up
                    </button>
                </div>

                <h1 style={{ fontSize: '1.8rem', marginBottom: '0.35rem' }}>
                    {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.4rem' }}>
                    Server-backed accounts with student and lecturer roles.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    {mode === 'signup' && (
                        <>
                            <input
                                className="input"
                                placeholder="Full name"
                                value={form.name}
                                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                required
                            />
                            <select
                                className="input"
                                value={form.role}
                                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as 'student' | 'lecturer' }))}
                            >
                                <option value="student">Student</option>
                                <option value="lecturer">Lecturer</option>
                            </select>
                        </>
                    )}

                    <input
                        className="input"
                        type="email"
                        placeholder="Email address"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                        required
                    />
                    <input
                        className="input"
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                        required
                    />

                    {error && (
                        <div style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', padding: '0.85rem 1rem', borderRadius: '12px' }}>
                            {error}
                        </div>
                    )}

                    <button className="btn" type="submit" style={{ justifyContent: 'center' }}>
                        {submitLabel}
                    </button>
                </form>

                <div style={{ marginTop: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Seeded accounts:
                    <div style={{ marginTop: '0.4rem' }}>Student: `student@codelearn.local` / `student123`</div>
                    <div>Lecturer: `lecturer@codelearn.local` / `lecturer123`</div>
                </div>
            </div>
        </main>
    );
}
