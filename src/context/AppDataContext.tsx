'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Submission {
    code: string;
    status: 'pending' | 'graded';
    grade: string | null;
    feedback?: string;
    submittedAt: string;
    gradedAt?: string;
}

interface AppDataContextType {
    progress: Record<string, boolean>;
    submissions: Record<string, Submission>;
    markTopicCompleted: (topicId: string) => void;
    submitExercise: (exerciseId: string, code: string) => void;
    gradeExercise: (exerciseId: string, grade: string, feedback: string) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
    const [progress, setProgress] = useState<Record<string, boolean>>({});
    const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const savedProgress = localStorage.getItem('techlearn_progress');
        const savedSubmissions = localStorage.getItem('techlearn_submissions');
        if (savedProgress) setProgress(JSON.parse(savedProgress));
        if (savedSubmissions) setSubmissions(JSON.parse(savedSubmissions));
        setIsHydrated(true);
    }, []);

    const markTopicCompleted = (topicId: string) => {
        const newProgress = { ...progress, [topicId]: true };
        setProgress(newProgress);
        localStorage.setItem('techlearn_progress', JSON.stringify(newProgress));
    };

    const submitExercise = (exerciseId: string, code: string) => {
        const newSubmissions: Record<string, Submission> = {
            ...submissions,
            [exerciseId]: { code, status: 'pending', grade: null, submittedAt: new Date().toISOString() }
        };
        setSubmissions(newSubmissions);
        localStorage.setItem('techlearn_submissions', JSON.stringify(newSubmissions));
    };

    const gradeExercise = (exerciseId: string, grade: string, feedback: string) => {
        const newSubmissions: Record<string, Submission> = {
            ...submissions,
            [exerciseId]: { ...submissions[exerciseId], status: 'graded', grade, feedback, gradedAt: new Date().toISOString() }
        };
        setSubmissions(newSubmissions);
        localStorage.setItem('techlearn_submissions', JSON.stringify(newSubmissions));
    };

    if (!isHydrated) return null;

    return (
        <AppDataContext.Provider value={{ progress, submissions, markTopicCompleted, submitExercise, gradeExercise }}>
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
