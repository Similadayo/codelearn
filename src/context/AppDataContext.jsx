'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AppDataContext = createContext();

export function AppDataProvider({ children }) {
    const [progress, setProgress] = useState({}); // { topicId: 'completed' }
    const [submissions, setSubmissions] = useState({}); // { exerciseId: { code: '...', status: 'pending/graded', grade: null } }
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const savedProgress = localStorage.getItem('techlearn_progress');
        const savedSubmissions = localStorage.getItem('techlearn_submissions');
        if (savedProgress) setProgress(JSON.parse(savedProgress));
        if (savedSubmissions) setSubmissions(JSON.parse(savedSubmissions));
        setIsHydrated(true);
    }, []);

    const markTopicCompleted = (topicId) => {
        const newProgress = { ...progress, [topicId]: true };
        setProgress(newProgress);
        localStorage.setItem('techlearn_progress', JSON.stringify(newProgress));
    };

    const submitExercise = (exerciseId, code) => {
        const newSubmissions = {
            ...submissions,
            [exerciseId]: { code, status: 'pending', grade: null, submittedAt: new Date().toISOString() }
        };
        setSubmissions(newSubmissions);
        localStorage.setItem('techlearn_submissions', JSON.stringify(newSubmissions));
    };

    const gradeExercise = (exerciseId, grade, feedback) => {
        const newSubmissions = {
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

export const useAppData = () => useContext(AppDataContext);
