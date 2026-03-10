import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import type { ActivityLog, AppStatePayload, Bookmark, Cohort, NotificationItem, ProgressEntry, PublicUser, Role, Submission, UserPreferences } from '@/lib/platform-types';

type StoredUser = PublicUser & {
    passwordHash: string;
};

type SessionRecord = {
    token: string;
    userId: string;
    createdAt: string;
};

type PlatformStore = {
    users: StoredUser[];
    sessions: SessionRecord[];
    progress: Record<string, Record<string, ProgressEntry>>;
    submissions: Record<string, Submission>;
    bookmarks: Record<string, Bookmark[]>;
    notifications: Record<string, NotificationItem[]>;
    activity: Record<string, ActivityLog[]>;
    cohorts: Cohort[];
};

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'platform-store.json');

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derived = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string) {
    const [salt, expected] = storedHash.split(':');
    if (!salt || !expected) return false;
    const derived = scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expected, 'hex');
    return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived);
}

function sanitizeUser(user: StoredUser): PublicUser {
    const { passwordHash, ...safe } = user;
    return safe;
}

function seedUsers(): StoredUser[] {
    const now = new Date().toISOString();
    return [
        {
            id: randomBytes(16).toString('hex'),
            role: 'lecturer',
            name: 'Lead Lecturer',
            email: 'lecturer@codelearn.local',
            passwordHash: hashPassword('lecturer123'),
            demoMode: false,
            onboardingCompleted: true,
            createdAt: now,
            preferences: { preferredTrackId: 'backend' },
        },
        {
            id: randomBytes(16).toString('hex'),
            role: 'student',
            name: 'Student One',
            email: 'student@codelearn.local',
            passwordHash: hashPassword('student123'),
            demoMode: false,
            onboardingCompleted: false,
            createdAt: now,
        },
    ];
}

function defaultStore(): PlatformStore {
    return {
        users: seedUsers(),
        sessions: [],
        progress: {},
        submissions: {},
        bookmarks: {},
        notifications: {},
        activity: {},
        cohorts: [],
    };
}

let writeQueue = Promise.resolve();

export async function readPlatformStore(): Promise<PlatformStore> {
    await mkdir(DATA_DIR, { recursive: true });
    try {
        const raw = await readFile(STORE_PATH, 'utf8');
        return JSON.parse(raw) as PlatformStore;
    } catch {
        const initial = defaultStore();
        await writeFile(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
        return initial;
    }
}

export async function updatePlatformStore<T>(updater: (store: PlatformStore) => T | Promise<T>) {
    let result: T;
    writeQueue = writeQueue.then(async () => {
        const store = await readPlatformStore();
        result = await updater(store);
        await writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
    });
    await writeQueue;
    return result!;
}

export async function createUser(input: { name: string; email: string; password: string; role: Role }) {
    const email = normalizeEmail(input.email);
    return updatePlatformStore((store) => {
        if (store.users.some((user) => user.email === email)) {
            return { ok: false as const, error: 'An account with that email already exists.' };
        }
        const user: StoredUser = {
            id: randomBytes(16).toString('hex'),
            role: input.role,
            name: input.name.trim(),
            email,
            passwordHash: hashPassword(input.password),
            demoMode: false,
            onboardingCompleted: false,
            createdAt: new Date().toISOString(),
        };
        store.users.push(user);
        const token = randomBytes(32).toString('hex');
        store.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
        return { ok: true as const, user: sanitizeUser(user), token };
    });
}

export async function authenticateUser(emailInput: string, password: string) {
    const email = normalizeEmail(emailInput);
    const store = await readPlatformStore();
    const user = store.users.find((entry) => entry.email === email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
        return { ok: false as const, error: 'Invalid email or password.' };
    }
    const token = randomBytes(32).toString('hex');
    await updatePlatformStore((draft) => {
        draft.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
    });
    return { ok: true as const, user: sanitizeUser(user), token };
}

export async function getUserBySession(token?: string | null) {
    if (!token) return null;
    const store = await readPlatformStore();
    const session = store.sessions.find((entry) => entry.token === token);
    if (!session) return null;
    const user = store.users.find((entry) => entry.id === session.userId);
    return user ? sanitizeUser(user) : null;
}

export async function deleteSession(token?: string | null) {
    if (!token) return;
    await updatePlatformStore((store) => {
        store.sessions = store.sessions.filter((entry) => entry.token !== token);
    });
}

export async function completeUserOnboarding(userId: string, preferences: UserPreferences) {
    return updatePlatformStore((store) => {
        const user = store.users.find((entry) => entry.id === userId);
        if (!user) return null;
        user.onboardingCompleted = true;
        user.preferences = { ...(user.preferences ?? {}), ...preferences };
        return sanitizeUser(user);
    });
}

function addNotification(store: PlatformStore, notification: NotificationItem) {
    store.notifications[notification.userId] = [notification, ...(store.notifications[notification.userId] ?? [])];
}

function addActivity(store: PlatformStore, entry: ActivityLog) {
    store.activity[entry.userId] = [entry, ...(store.activity[entry.userId] ?? [])].slice(0, 50);
}

export async function getAppStateForUser(userId: string): Promise<AppStatePayload> {
    const store = await readPlatformStore();
    const user = store.users.find((entry) => entry.id === userId);
    const role = user?.role;
    const notifications = store.notifications[userId] ?? [];

    return {
        progress: store.progress[userId] ?? {},
        submissions: Object.fromEntries(Object.entries(store.submissions).filter(([, item]) => item.userId === userId)),
        allSubmissions: role === 'lecturer' ? store.submissions : {},
        bookmarks: store.bookmarks[userId] ?? [],
        notifications,
        unreadNotifications: notifications.filter((entry) => !entry.read).length,
        activityLog: store.activity[userId] ?? [],
        cohorts: role === 'lecturer'
            ? store.cohorts.filter((entry) => entry.lecturerId === userId)
            : store.cohorts.filter((entry) => entry.studentIds.includes(userId)),
        users: store.users.map(sanitizeUser),
    };
}

export async function markTopicCompleted(user: PublicUser, topicKey: string) {
    await updatePlatformStore((store) => {
        store.progress[user.id] = {
            ...(store.progress[user.id] ?? {}),
            [topicKey]: { completed: true, completedAt: new Date().toISOString() },
        };
        addActivity(store, {
            id: randomBytes(12).toString('hex'),
            userId: user.id,
            type: 'topic_completed',
            description: `Completed ${topicKey}`,
            createdAt: new Date().toISOString(),
        });
    });
}

export async function toggleBookmark(user: PublicUser, input: Omit<Bookmark, 'createdAt'>) {
    return updatePlatformStore((store) => {
        const current = store.bookmarks[user.id] ?? [];
        const exists = current.some((entry) => entry.topicKey === input.topicKey);
        store.bookmarks[user.id] = exists
            ? current.filter((entry) => entry.topicKey !== input.topicKey)
            : [{ ...input, createdAt: new Date().toISOString() }, ...current];
        addActivity(store, {
            id: randomBytes(12).toString('hex'),
            userId: user.id,
            type: exists ? 'bookmark_removed' : 'bookmark_added',
            description: `${exists ? 'Removed bookmark for' : 'Bookmarked'} ${input.topicKey}`,
            createdAt: new Date().toISOString(),
        });
        return { bookmarked: !exists };
    });
}

export async function submitExercise(user: PublicUser, input: { submissionId: string; topicKey: string; trackId: string; moduleId: string; topicId: string; code: string }) {
    await updatePlatformStore((store) => {
        const createdAt = new Date().toISOString();
        store.submissions[input.submissionId] = {
            id: input.submissionId,
            topicKey: input.topicKey,
            trackId: input.trackId,
            moduleId: input.moduleId,
            topicId: input.topicId,
            userId: user.id,
            userName: user.name,
            code: input.code,
            status: 'pending',
            grade: null,
            submittedAt: createdAt,
        };
        store.users.filter((entry) => entry.role === 'lecturer').forEach((lecturer) => {
            addNotification(store, {
                id: randomBytes(12).toString('hex'),
                userId: lecturer.id,
                title: 'New submission waiting',
                message: `${user.name} submitted work for ${input.topicId}.`,
                kind: 'info',
                link: '/dashboard',
                read: false,
                createdAt,
            });
        });
        addActivity(store, {
            id: randomBytes(12).toString('hex'),
            userId: user.id,
            type: 'submission_created',
            description: `Submitted work for ${input.topicKey}`,
            createdAt,
        });
    });
}

export async function gradeSubmission(user: PublicUser, input: { submissionId: string; grade: string; feedback: string }) {
    if (user.role !== 'lecturer') {
        throw new Error('forbidden');
    }
    await updatePlatformStore((store) => {
        const target = store.submissions[input.submissionId];
        if (!target) return;
        const gradedAt = new Date().toISOString();
        target.status = 'graded';
        target.grade = input.grade;
        target.feedback = input.feedback;
        target.gradedAt = gradedAt;
        addNotification(store, {
            id: randomBytes(12).toString('hex'),
            userId: target.userId,
            title: 'Submission graded',
            message: `${target.userName}, your work for ${target.topicId} has been reviewed.`,
            kind: 'success',
            link: '/dashboard',
            read: false,
            createdAt: gradedAt,
        });
        addActivity(store, {
            id: randomBytes(12).toString('hex'),
            userId: target.userId,
            type: 'submission_graded',
            description: `Submission ${input.submissionId} graded with ${input.grade}/100`,
            createdAt: gradedAt,
        });
    });
}

export async function markNotificationRead(userId: string, notificationId: string) {
    await updatePlatformStore((store) => {
        store.notifications[userId] = (store.notifications[userId] ?? []).map((entry) =>
            entry.id === notificationId ? { ...entry, read: true } : entry
        );
    });
}

export async function markAllNotificationsRead(userId: string) {
    await updatePlatformStore((store) => {
        store.notifications[userId] = (store.notifications[userId] ?? []).map((entry) => ({ ...entry, read: true }));
    });
}

export async function createCohort(user: PublicUser, name: string) {
    if (user.role !== 'lecturer') {
        throw new Error('forbidden');
    }
    await updatePlatformStore((store) => {
        store.cohorts.unshift({
            id: randomBytes(12).toString('hex'),
            name,
            lecturerId: user.id,
            studentIds: [],
            createdAt: new Date().toISOString(),
        });
        addActivity(store, {
            id: randomBytes(12).toString('hex'),
            userId: user.id,
            type: 'cohort_created',
            description: `Created cohort ${name}`,
            createdAt: new Date().toISOString(),
        });
    });
}

export async function assignStudentToCohort(user: PublicUser, cohortId: string, studentId: string) {
    if (user.role !== 'lecturer') {
        throw new Error('forbidden');
    }
    await updatePlatformStore((store) => {
        const cohort = store.cohorts.find((entry) => entry.id === cohortId && entry.lecturerId === user.id);
        if (!cohort || cohort.studentIds.includes(studentId)) return;
        cohort.studentIds.push(studentId);
        addActivity(store, {
            id: randomBytes(12).toString('hex'),
            userId: studentId,
            type: 'cohort_joined',
            description: `Assigned to cohort ${cohort.name}`,
            createdAt: new Date().toISOString(),
        });
    });
}
