'use client';
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { PublicUser as User, Role, UserPreferences } from '@/lib/platform-types';

interface SignUpInput {
    name: string;
    email: string;
    password: string;
    role: Role;
}

interface SignInInput {
    email: string;
    password: string;
}

interface CompleteOnboardingInput extends UserPreferences {}

interface AuthContextType {
    user: User | null;
    users: User[];
    isHydrated: boolean;
    signIn: (input: SignInInput) => Promise<{ ok: boolean; error?: string }>;
    signUp: (input: SignUpInput) => Promise<{ ok: boolean; error?: string }>;
    completeOnboarding: (input: CompleteOnboardingInput) => Promise<void>;
    refreshSession: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function parseJson<T>(response: Response): Promise<T | null> {
    const text = await response.text();
    if (!text.trim()) {
        return null;
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isHydrated, setIsHydrated] = useState(false);

    const refreshSession = async () => {
        try {
            const userResponse = await fetch('/api/auth/session', { cache: 'no-store' });
            const userPayload = await parseJson<{ user: User | null }>(userResponse);
            setUser(userPayload?.user ?? null);

            if (userPayload?.user) {
                const stateResponse = await fetch('/api/platform/state', { cache: 'no-store' });
                if (stateResponse.ok) {
                    const statePayload = await parseJson<{ users: User[] }>(stateResponse);
                    setUsers(statePayload?.users ?? []);
                }
            } else {
                setUsers([]);
            }
        } catch {
            setUser(null);
            setUsers([]);
        } finally {
            setIsHydrated(true);
        }
    };

    useEffect(() => {
        void refreshSession();
    }, []);

    const signIn = async ({ email, password }: SignInInput) => {
        const response = await fetch('/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const payload = await parseJson<{ error?: string }>(response);
            return { ok: false, error: payload?.error || 'Invalid email or password.' };
        }
        const payload = await parseJson<{ user: User }>(response);
        if (!payload?.user) {
            return { ok: false, error: 'Sign in failed. The server did not return a valid response.' };
        }
        setUser(payload.user);
        await refreshSession();
        return { ok: true };
    };

    const signUp = async ({ name, email, password, role }: SignUpInput) => {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role }),
        });
        if (!response.ok) {
            const payload = await parseJson<{ error?: string }>(response);
            return { ok: false, error: payload?.error || 'Unable to create account.' };
        }
        const payload = await parseJson<{ user: User }>(response);
        if (!payload?.user) {
            return { ok: false, error: 'Sign up failed. The server did not return a valid response.' };
        }
        setUser(payload.user);
        await refreshSession();
        return { ok: true };
    };

    const completeOnboarding = async (input: CompleteOnboardingInput) => {
        const response = await fetch('/api/auth/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
        if (!response.ok) return;
        const payload = await parseJson<{ user: User | null }>(response);
        setUser(payload?.user ?? null);
        await refreshSession();
    };

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setUser(null);
        setUsers([]);
    };

    const value = useMemo(
        () => ({ user, users, isHydrated, signIn, signUp, completeOnboarding, refreshSession, logout }),
        [user, users, isHydrated]
    );

    if (!isHydrated) return null;

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
