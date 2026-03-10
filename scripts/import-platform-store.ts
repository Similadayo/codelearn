import { readFile } from 'fs/promises';
import path from 'path';
import { randomBytes, scryptSync } from 'crypto';
import { PrismaClient, ActivityType, NotificationKind, Role, SubmissionStatus } from '@prisma/client';

type PublicUser = {
    id: string;
    role: 'student' | 'lecturer';
    name: string;
    email: string;
    demoMode: boolean;
    onboardingCompleted: boolean;
    createdAt: string;
    preferences?: {
        preferredTrackId?: string;
        preferredStackId?: string;
        studyGoal?: string;
    };
};

type StoredUser = PublicUser & {
    passwordHash: string;
};

type ProgressEntry = {
    completed: boolean;
    completedAt: string;
};

type Submission = {
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
};

type NotificationItem = {
    id: string;
    userId: string;
    title: string;
    message: string;
    kind: 'info' | 'success' | 'warning';
    link?: string;
    read: boolean;
    createdAt: string;
};

type ActivityLog = {
    id: string;
    userId: string;
    type: 'bookmark_added' | 'bookmark_removed' | 'topic_completed' | 'submission_created' | 'submission_graded' | 'cohort_created' | 'cohort_joined';
    description: string;
    createdAt: string;
};

type Bookmark = {
    topicKey: string;
    trackId: string;
    moduleId: string;
    topicId: string;
    createdAt: string;
};

type Cohort = {
    id: string;
    name: string;
    lecturerId: string;
    studentIds: string[];
    createdAt: string;
};

type LegacyStore = {
    users: StoredUser[];
    sessions: Array<{ token: string; userId: string; createdAt: string }>;
    progress: Record<string, Record<string, ProgressEntry>>;
    submissions: Record<string, Submission>;
    bookmarks: Record<string, Bookmark[]>;
    notifications: Record<string, NotificationItem[]>;
    activity: Record<string, ActivityLog[]>;
    cohorts: Cohort[];
};

const prisma = new PrismaClient();

function fallbackHash(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derived = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
}

async function main() {
    const filePath = path.join(process.cwd(), '.data', 'platform-store.json');
    const raw = await readFile(filePath, 'utf8');
    const legacy = JSON.parse(raw) as LegacyStore;

    for (const user of legacy.users) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: {
                name: user.name,
                role: user.role as Role,
                passwordHash: user.passwordHash || fallbackHash('changeme123'),
                demoMode: user.demoMode,
                onboardingCompleted: user.onboardingCompleted,
                createdAt: new Date(user.createdAt),
                preferredTrackId: user.preferences?.preferredTrackId ?? null,
                preferredStackId: user.preferences?.preferredStackId ?? null,
                studyGoal: user.preferences?.studyGoal ?? null,
            },
            create: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role as Role,
                passwordHash: user.passwordHash || fallbackHash('changeme123'),
                demoMode: user.demoMode,
                onboardingCompleted: user.onboardingCompleted,
                createdAt: new Date(user.createdAt),
                preferredTrackId: user.preferences?.preferredTrackId ?? null,
                preferredStackId: user.preferences?.preferredStackId ?? null,
                studyGoal: user.preferences?.studyGoal ?? null,
            },
        });
    }

    for (const session of legacy.sessions) {
        await prisma.session.upsert({
            where: { token: session.token },
            update: { userId: session.userId, createdAt: new Date(session.createdAt) },
            create: { token: session.token, userId: session.userId, createdAt: new Date(session.createdAt) },
        });
    }

    for (const [userId, entries] of Object.entries(legacy.progress)) {
        for (const [topicKey, progress] of Object.entries(entries)) {
            await prisma.progress.upsert({
                where: { userId_topicKey: { userId, topicKey } },
                update: { completed: progress.completed, completedAt: new Date(progress.completedAt) },
                create: { userId, topicKey, completed: progress.completed, completedAt: new Date(progress.completedAt) },
            });
        }
    }

    for (const submission of Object.values(legacy.submissions)) {
        await prisma.submission.upsert({
            where: { id: submission.id },
            update: {
                topicKey: submission.topicKey,
                trackId: submission.trackId,
                moduleId: submission.moduleId,
                topicId: submission.topicId,
                userId: submission.userId,
                userName: submission.userName,
                code: submission.code,
                status: submission.status as SubmissionStatus,
                grade: submission.grade,
                feedback: submission.feedback ?? null,
                submittedAt: new Date(submission.submittedAt),
                gradedAt: submission.gradedAt ? new Date(submission.gradedAt) : null,
            },
            create: {
                id: submission.id,
                topicKey: submission.topicKey,
                trackId: submission.trackId,
                moduleId: submission.moduleId,
                topicId: submission.topicId,
                userId: submission.userId,
                userName: submission.userName,
                code: submission.code,
                status: submission.status as SubmissionStatus,
                grade: submission.grade,
                feedback: submission.feedback ?? null,
                submittedAt: new Date(submission.submittedAt),
                gradedAt: submission.gradedAt ? new Date(submission.gradedAt) : null,
            },
        });
    }

    for (const [userId, bookmarks] of Object.entries(legacy.bookmarks)) {
        for (const bookmark of bookmarks) {
            await prisma.bookmark.upsert({
                where: { userId_topicKey: { userId, topicKey: bookmark.topicKey } },
                update: {
                    trackId: bookmark.trackId,
                    moduleId: bookmark.moduleId,
                    topicId: bookmark.topicId,
                    createdAt: new Date(bookmark.createdAt),
                },
                create: {
                    userId,
                    topicKey: bookmark.topicKey,
                    trackId: bookmark.trackId,
                    moduleId: bookmark.moduleId,
                    topicId: bookmark.topicId,
                    createdAt: new Date(bookmark.createdAt),
                },
            });
        }
    }

    for (const notifications of Object.values(legacy.notifications)) {
        for (const notification of notifications) {
            await prisma.notification.upsert({
                where: { id: notification.id },
                update: {
                    userId: notification.userId,
                    title: notification.title,
                    message: notification.message,
                    kind: notification.kind as NotificationKind,
                    link: notification.link ?? null,
                    read: notification.read,
                    createdAt: new Date(notification.createdAt),
                },
                create: {
                    id: notification.id,
                    userId: notification.userId,
                    title: notification.title,
                    message: notification.message,
                    kind: notification.kind as NotificationKind,
                    link: notification.link ?? null,
                    read: notification.read,
                    createdAt: new Date(notification.createdAt),
                },
            });
        }
    }

    for (const logs of Object.values(legacy.activity)) {
        for (const log of logs) {
            await prisma.activityLog.upsert({
                where: { id: log.id },
                update: {
                    userId: log.userId,
                    type: log.type as ActivityType,
                    description: log.description,
                    createdAt: new Date(log.createdAt),
                },
                create: {
                    id: log.id,
                    userId: log.userId,
                    type: log.type as ActivityType,
                    description: log.description,
                    createdAt: new Date(log.createdAt),
                },
            });
        }
    }

    for (const cohort of legacy.cohorts) {
        await prisma.cohort.upsert({
            where: { id: cohort.id },
            update: {
                name: cohort.name,
                lecturerId: cohort.lecturerId,
                createdAt: new Date(cohort.createdAt),
            },
            create: {
                id: cohort.id,
                name: cohort.name,
                lecturerId: cohort.lecturerId,
                createdAt: new Date(cohort.createdAt),
            },
        });

        for (const studentId of cohort.studentIds) {
            await prisma.cohortMembership.upsert({
                where: { cohortId_studentId: { cohortId: cohort.id, studentId } },
                update: {},
                create: {
                    cohortId: cohort.id,
                    studentId,
                    createdAt: new Date(cohort.createdAt),
                },
            });
        }
    }

    console.log('Legacy platform store imported successfully.');
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
