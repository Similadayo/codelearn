export type Role = 'student' | 'lecturer';

export interface UserPreferences {
    preferredTrackId?: string;
    preferredStackId?: string;
    studyGoal?: string;
}

export type ProgressEntry = {
    completed: boolean;
    completedAt: string;
};

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

export interface NotificationItem {
    id: string;
    userId: string;
    title: string;
    message: string;
    kind: 'info' | 'success' | 'warning';
    link?: string;
    read: boolean;
    createdAt: string;
}

export interface ActivityLog {
    id: string;
    userId: string;
    type: 'bookmark_added' | 'bookmark_removed' | 'topic_completed' | 'submission_created' | 'submission_graded' | 'cohort_created' | 'cohort_joined';
    description: string;
    createdAt: string;
}

export interface Bookmark {
    topicKey: string;
    trackId: string;
    moduleId: string;
    topicId: string;
    createdAt: string;
}

export interface Cohort {
    id: string;
    name: string;
    lecturerId: string;
    studentIds: string[];
    createdAt: string;
}

export interface PublicUser {
    id: string;
    role: Role;
    name: string;
    email: string;
    demoMode: boolean;
    onboardingCompleted: boolean;
    createdAt: string;
    preferences?: UserPreferences;
}

export interface AppStatePayload {
    progress: Record<string, ProgressEntry>;
    submissions: Record<string, Submission>;
    allSubmissions: Record<string, Submission>;
    bookmarks: Bookmark[];
    notifications: NotificationItem[];
    unreadNotifications: number;
    activityLog: ActivityLog[];
    cohorts: Cohort[];
    users: PublicUser[];
}
