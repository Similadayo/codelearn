'use client';
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

export interface Submission {
    id: string;
    topicKey: string;
    trackId: string;
    moduleId: string;
    topicId: string;
    userId: string;
    userName: string;
    code: string;
    status: 'pending' | 'graded';
    grade: string | null;
    feedback?: string;
    submittedAt: string;
    gradedAt?: string;
}

interface SubmitExerciseInput {
    submissionId: string;
    topicKey: string;
    trackId: string;
    moduleId: string;
    topicId: string;
    code: string;
}

interface AppDataContextType {
    progress: Record<string, boolean>;
    submissions: Record<string, Submission>;
    allSubmissions: Record<string, Submission>;
    markTopicCompleted: (topicKey: string) => void;
    submitExercise: (input: SubmitExerciseInput) => void;
    gradeExercise: (submissionId: string, grade: string, feedback: string) => void;
}

type ProgressStore = Record<string, Record<string, boolean>>;

const PROGRESS_KEY = 'codelearn_progress_store';
const SUBMISSIONS_KEY = 'codelearn_submissions_store';

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [progressStore, setProgressStore] = useState<ProgressStore>({});
    const [allSubmissions, setAllSubmissions] = useState<Record<string, Submission>>({});
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const savedProgress = localStorage.getItem(PROGRESS_KEY);
        const savedSubmissions = localStorage.getItem(SUBMISSIONS_KEY);

        if (savedProgress) setProgressStore(JSON.parse(savedProgress));
        if (savedSubmissions) setAllSubmissions(JSON.parse(savedSubmissions));
        setIsHydrated(true);
    }, []);

    const progress = useMemo(() => {
        if (!user) return {};
        return progressStore[user.id] ?? {};
    }, [progressStore, user]);

    const submissions = useMemo(() => {
        if (!user) return {};

        return Object.fromEntries(
            Object.entries(allSubmissions).filter(([, submission]) => submission.userId === user.id)
        );
    }, [allSubmissions, user]);

    const persistProgress = (nextStore: ProgressStore) => {
        setProgressStore(nextStore);
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(nextStore));
    };

    const persistSubmissions = (nextStore: Record<string, Submission>) => {
        setAllSubmissions(nextStore);
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(nextStore));
    };

    const markTopicCompleted = (topicKey: string) => {
        if (!user) return;

        const nextStore: ProgressStore = {
            ...progressStore,
            [user.id]: {
                ...(progressStore[user.id] ?? {}),
                [topicKey]: true,
            },
        };

        persistProgress(nextStore);
    };

    const submitExercise = ({ submissionId, topicKey, trackId, moduleId, topicId, code }: SubmitExerciseInput) => {
        if (!user) return;

        const nextStore: Record<string, Submission> = {
            ...allSubmissions,
            [submissionId]: {
                id: submissionId,
                topicKey,
                trackId,
                moduleId,
                topicId,
                userId: user.id,
                userName: user.name,
                code,
                status: 'pending',
                grade: null,
                submittedAt: new Date().toISOString(),
            },
        };

        persistSubmissions(nextStore);
    };

    const gradeExercise = (submissionId: string, grade: string, feedback: string) => {
        const target = allSubmissions[submissionId];
        if (!target) return;

        const nextStore: Record<string, Submission> = {
            ...allSubmissions,
            [submissionId]: {
                ...target,
                status: 'graded',
                grade,
                feedback,
                gradedAt: new Date().toISOString(),
            },
        };

        persistSubmissions(nextStore);
    };

    if (!isHydrated) return null;

    return (
        <AppDataContext.Provider value={{
            progress,
            submissions,
            allSubmissions,
            markTopicCompleted,
            submitExercise,
            gradeExercise,
        }}>
            {children}
        </AppDataContext.Provider>
    );
}

export const useAppData = () => {
    const context = useContext(AppDataContext);
    if (context === undefined) {
        throw new Error('useAppData must be used within an AppDataProvider');
    }
    return context;
};

