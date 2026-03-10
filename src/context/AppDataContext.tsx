'use client';
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { curriculumData } from '@/constants/curriculum';
import { buildTopicKey } from '@/lib/lessonKeys';
import type { ActivityLog, AppStatePayload, Bookmark, Cohort, NotificationItem, ProgressEntry, Submission } from '@/lib/platform-types';

interface SubmitExerciseInput {
    submissionId: string;
    topicKey: string;
    trackId: string;
    moduleId: string;
    topicId: string;
    code: string;
}

interface AppDataContextType {
    progress: Record<string, ProgressEntry>;
    submissions: Record<string, Submission>;
    allSubmissions: Record<string, Submission>;
    bookmarks: Bookmark[];
    notifications: NotificationItem[];
    unreadNotifications: number;
    activityLog: ActivityLog[];
    cohorts: Cohort[];
    markTopicCompleted: (topicKey: string) => Promise<void>;
    submitExercise: (input: SubmitExerciseInput) => Promise<void>;
    gradeExercise: (submissionId: string, grade: string, feedback: string) => Promise<void>;
    toggleBookmark: (input: Omit<Bookmark, 'createdAt'>) => Promise<void>;
    isBookmarked: (topicKey: string) => boolean;
    markNotificationRead: (notificationId: string) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
    createCohort: (name: string) => Promise<void>;
    assignStudentToCohort: (cohortId: string, studentId: string) => Promise<void>;
    getResumeTopicPath: () => string | null;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

function emptyState(): AppStatePayload {
    return {
        progress: {},
        submissions: {},
        allSubmissions: {},
        bookmarks: [],
        notifications: [],
        unreadNotifications: 0,
        activityLog: [],
        cohorts: [],
        users: [],
    };
}

function findFirstIncompleteTopic(progress: Record<string, ProgressEntry>, preferredTrackId?: string) {
    const tracks = preferredTrackId
        ? [...curriculumData.tracks.filter((track) => track.id === preferredTrackId), ...curriculumData.tracks.filter((track) => track.id !== preferredTrackId)]
        : curriculumData.tracks;

    for (const track of tracks) {
        for (const module of track.modules) {
            for (const topic of module.topics) {
                const key = buildTopicKey(track.id, module.id, topic.id);
                if (!progress[key]?.completed) {
                    return { trackId: track.id, moduleId: module.id, topicId: topic.id };
                }
            }
        }
    }

    return null;
}

async function postJson(url: string, body?: unknown) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
    const { user, users: authUsers } = useAuth();
    const [state, setState] = useState<AppStatePayload>(emptyState());
    const [isHydrated, setIsHydrated] = useState(false);

    const refresh = async () => {
        if (!user) {
            setState(emptyState());
            setIsHydrated(true);
            return;
        }
        const response = await fetch('/api/platform/state', { cache: 'no-store' });
        if (!response.ok) {
            setState(emptyState());
            setIsHydrated(true);
            return;
        }
        const payload = await response.json() as AppStatePayload;
        setState(payload);
        setIsHydrated(true);
    };

    useEffect(() => {
        setIsHydrated(false);
        void refresh();
    }, [user?.id]);

    const markTopicCompleted = async (topicKey: string) => {
        if (!user) return;
        await postJson('/api/platform/progress', { topicKey });
        await refresh();
    };

    const submitExercise = async (input: SubmitExerciseInput) => {
        if (!user) return;
        await postJson('/api/platform/submissions', input);
        await refresh();
    };

    const gradeExercise = async (submissionId: string, grade: string, feedback: string) => {
        if (!user) return;
        await postJson(`/api/platform/submissions/${submissionId}/grade`, { grade, feedback });
        await refresh();
    };

    const toggleBookmark = async (input: Omit<Bookmark, 'createdAt'>) => {
        if (!user) return;
        await postJson('/api/platform/bookmarks', input);
        await refresh();
    };

    const isBookmarked = (topicKey: string) => state.bookmarks.some((entry) => entry.topicKey === topicKey);

    const markNotificationRead = async (notificationId: string) => {
        if (!user) return;
        await postJson('/api/platform/notifications/read', { notificationId });
        await refresh();
    };

    const markAllNotificationsRead = async () => {
        if (!user) return;
        await postJson('/api/platform/notifications/read-all');
        await refresh();
    };

    const createCohort = async (name: string) => {
        if (!user) return;
        await postJson('/api/platform/cohorts', { name });
        await refresh();
    };

    const assignStudentToCohort = async (cohortId: string, studentId: string) => {
        if (!user) return;
        await postJson(`/api/platform/cohorts/${cohortId}/assign`, { studentId });
        await refresh();
    };

    const getResumeTopicPath = () => {
        if (!user) return null;
        const nextTopic = findFirstIncompleteTopic(state.progress, user.preferences?.preferredTrackId);
        return nextTopic ? `/curriculum/${nextTopic.trackId}/${nextTopic.moduleId}/${nextTopic.topicId}` : null;
    };

    const value = useMemo(
        () => ({
            progress: state.progress,
            submissions: state.submissions,
            allSubmissions: state.allSubmissions,
            bookmarks: state.bookmarks,
            notifications: state.notifications,
            unreadNotifications: state.unreadNotifications,
            activityLog: state.activityLog,
            cohorts: state.cohorts,
            markTopicCompleted,
            submitExercise,
            gradeExercise,
            toggleBookmark,
            isBookmarked,
            markNotificationRead,
            markAllNotificationsRead,
            createCohort,
            assignStudentToCohort,
            getResumeTopicPath,
        }),
        [state, user]
    );

    useEffect(() => {
        if (authUsers.length > 0 && state.users.length === 0 && user) {
            setState((current) => ({ ...current, users: authUsers }));
        }
    }, [authUsers, state.users.length, user]);

    if (!isHydrated) return null;

    return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export const useAppData = () => {
    const context = useContext(AppDataContext);
    if (context === undefined) {
        throw new Error('useAppData must be used within an AppDataProvider');
    }
    return context;
};
