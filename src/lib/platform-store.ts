import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import {
    ActivityType as PrismaActivityType,
    NotificationKind as PrismaNotificationKind,
    Role as PrismaRole,
    SubmissionStatus as PrismaSubmissionStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type {
    ActivityLog,
    AppStatePayload,
    Bookmark,
    Cohort,
    NotificationItem,
    ProgressEntry,
    PublicUser,
    Role,
    Submission,
    UserPreferences,
} from '@/lib/platform-types';

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

function serializeUser(user: {
    id: string;
    role: PrismaRole;
    name: string;
    email: string;
    demoMode: boolean;
    onboardingCompleted: boolean;
    createdAt: Date;
    preferredTrackId: string | null;
    preferredStackId: string | null;
    studyGoal: string | null;
}): PublicUser {
    const preferences: UserPreferences = {};
    if (user.preferredTrackId) preferences.preferredTrackId = user.preferredTrackId;
    if (user.preferredStackId) preferences.preferredStackId = user.preferredStackId;
    if (user.studyGoal) preferences.studyGoal = user.studyGoal;

    return {
        id: user.id,
        role: user.role as Role,
        name: user.name,
        email: user.email,
        demoMode: user.demoMode,
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt.toISOString(),
        preferences: Object.keys(preferences).length ? preferences : undefined,
    };
}

function serializeProgress(entries: Array<{ topicKey: string; completed: boolean; completedAt: Date }>): Record<string, ProgressEntry> {
    return Object.fromEntries(
        entries.map((entry) => [
            entry.topicKey,
            { completed: entry.completed, completedAt: entry.completedAt.toISOString() },
        ])
    );
}

function serializeSubmission(entry: {
    id: string;
    topicKey: string;
    trackId: string;
    moduleId: string;
    topicId: string;
    userId: string;
    userName: string;
    code: string;
    status: PrismaSubmissionStatus;
    grade: string | null;
    feedback: string | null;
    submittedAt: Date;
    gradedAt: Date | null;
}): Submission {
    return {
        id: entry.id,
        topicKey: entry.topicKey,
        trackId: entry.trackId,
        moduleId: entry.moduleId,
        topicId: entry.topicId,
        userId: entry.userId,
        userName: entry.userName,
        code: entry.code,
        status: entry.status as Submission['status'],
        grade: entry.grade,
        feedback: entry.feedback ?? undefined,
        submittedAt: entry.submittedAt.toISOString(),
        gradedAt: entry.gradedAt?.toISOString(),
    };
}

function serializeBookmarks(entries: Array<{ topicKey: string; trackId: string; moduleId: string; topicId: string; createdAt: Date }>): Bookmark[] {
    return entries.map((entry) => ({
        topicKey: entry.topicKey,
        trackId: entry.trackId,
        moduleId: entry.moduleId,
        topicId: entry.topicId,
        createdAt: entry.createdAt.toISOString(),
    }));
}

function serializeNotifications(entries: Array<{ id: string; userId: string; title: string; message: string; kind: PrismaNotificationKind; link: string | null; read: boolean; createdAt: Date }>): NotificationItem[] {
    return entries.map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        title: entry.title,
        message: entry.message,
        kind: entry.kind as NotificationItem['kind'],
        link: entry.link ?? undefined,
        read: entry.read,
        createdAt: entry.createdAt.toISOString(),
    }));
}

function serializeActivity(entries: Array<{ id: string; userId: string; type: PrismaActivityType; description: string; createdAt: Date }>): ActivityLog[] {
    return entries.map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        type: entry.type as ActivityLog['type'],
        description: entry.description,
        createdAt: entry.createdAt.toISOString(),
    }));
}

function serializeCohort(entry: { id: string; name: string; lecturerId: string; createdAt: Date; members: Array<{ studentId: string }> }): Cohort {
    return {
        id: entry.id,
        name: entry.name,
        lecturerId: entry.lecturerId,
        studentIds: entry.members.map((member) => member.studentId),
        createdAt: entry.createdAt.toISOString(),
    };
}

let seedPromise: Promise<void> | null = null;

async function ensureSeedData() {
    if (!seedPromise) {
        seedPromise = (async () => {
            const existing = await prisma.user.findMany({
                where: { email: { in: ['lecturer@codelearn.local', 'student@codelearn.local'] } },
                select: { email: true },
            });
            const emails = new Set(existing.map((entry) => entry.email));
            const now = new Date();

            if (!emails.has('lecturer@codelearn.local')) {
                await prisma.user.create({
                    data: {
                        role: PrismaRole.lecturer,
                        name: 'Lead Lecturer',
                        email: 'lecturer@codelearn.local',
                        passwordHash: hashPassword('lecturer123'),
                        demoMode: false,
                        onboardingCompleted: true,
                        createdAt: now,
                        preferredTrackId: 'backend',
                    },
                });
            }

            if (!emails.has('student@codelearn.local')) {
                await prisma.user.create({
                    data: {
                        role: PrismaRole.student,
                        name: 'Student One',
                        email: 'student@codelearn.local',
                        passwordHash: hashPassword('student123'),
                        demoMode: false,
                        onboardingCompleted: false,
                        createdAt: now,
                    },
                });
            }
        })().catch((error) => {
            seedPromise = null;
            throw error;
        });
    }

    await seedPromise;
}

export async function createUser(input: { name: string; email: string; password: string; role: Role }) {
    await ensureSeedData();
    const email = normalizeEmail(input.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return { ok: false as const, error: 'An account with that email already exists.' };
    }

    const user = await prisma.user.create({
        data: {
            role: input.role as PrismaRole,
            name: input.name.trim(),
            email,
            passwordHash: hashPassword(input.password),
            demoMode: false,
            onboardingCompleted: false,
        },
    });

    const token = randomBytes(32).toString('hex');
    await prisma.session.create({
        data: { token, userId: user.id },
    });

    return { ok: true as const, user: serializeUser(user), token };
}

export async function authenticateUser(emailInput: string, password: string) {
    await ensureSeedData();
    const email = normalizeEmail(emailInput);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
        return { ok: false as const, error: 'Invalid email or password.' };
    }

    const token = randomBytes(32).toString('hex');
    await prisma.session.create({
        data: { token, userId: user.id },
    });

    return { ok: true as const, user: serializeUser(user), token };
}

export async function getUserBySession(token?: string | null) {
    if (!token) return null;
    await ensureSeedData();
    const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
    });
    return session?.user ? serializeUser(session.user) : null;
}

export async function deleteSession(token?: string | null) {
    if (!token) return;
    await prisma.session.deleteMany({ where: { token } });
}

export async function completeUserOnboarding(userId: string, preferences: UserPreferences) {
    await ensureSeedData();
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            onboardingCompleted: true,
            preferredTrackId: preferences.preferredTrackId ?? null,
            preferredStackId: preferences.preferredStackId ?? null,
            studyGoal: preferences.studyGoal ?? null,
        },
    });
    return serializeUser(user);
}

export async function getAppStateForUser(userId: string): Promise<AppStatePayload> {
    await ensureSeedData();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
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

    const [
        progressRows,
        ownSubmissions,
        allSubmissions,
        bookmarks,
        notifications,
        activityLog,
        lecturerCohorts,
        studentMemberships,
        users,
    ] = await Promise.all([
        prisma.progress.findMany({ where: { userId }, orderBy: { completedAt: 'desc' } }),
        prisma.submission.findMany({ where: { userId }, orderBy: { submittedAt: 'desc' } }),
        user.role === PrismaRole.lecturer
            ? prisma.submission.findMany({ orderBy: { submittedAt: 'desc' } })
            : Promise.resolve([]),
        prisma.bookmark.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
        prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
        prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
        user.role === PrismaRole.lecturer
            ? prisma.cohort.findMany({ where: { lecturerId: userId }, include: { members: true }, orderBy: { createdAt: 'desc' } })
            : Promise.resolve([]),
        user.role === PrismaRole.student
            ? prisma.cohortMembership.findMany({
                where: { studentId: userId },
                include: { cohort: { include: { members: true } } },
                orderBy: { createdAt: 'desc' },
            })
            : Promise.resolve([]),
        prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    const studentCohorts = studentMemberships.map((entry) => entry.cohort);
    const cohortRows = user.role === PrismaRole.lecturer ? lecturerCohorts : studentCohorts;

    return {
        progress: serializeProgress(progressRows),
        submissions: Object.fromEntries(ownSubmissions.map((entry) => [entry.id, serializeSubmission(entry)])),
        allSubmissions: Object.fromEntries(allSubmissions.map((entry) => [entry.id, serializeSubmission(entry)])),
        bookmarks: serializeBookmarks(bookmarks),
        notifications: serializeNotifications(notifications),
        unreadNotifications: notifications.filter((entry) => !entry.read).length,
        activityLog: serializeActivity(activityLog),
        cohorts: cohortRows.map(serializeCohort),
        users: users.map(serializeUser),
    };
}

export async function markTopicCompleted(user: PublicUser, topicKey: string) {
    await ensureSeedData();
    const completedAt = new Date();
    await prisma.$transaction([
        prisma.progress.upsert({
            where: { userId_topicKey: { userId: user.id, topicKey } },
            update: { completed: true, completedAt },
            create: { userId: user.id, topicKey, completed: true, completedAt },
        }),
        prisma.activityLog.create({
            data: {
                id: randomBytes(12).toString('hex'),
                userId: user.id,
                type: PrismaActivityType.topic_completed,
                description: `Completed ${topicKey}`,
                createdAt: completedAt,
            },
        }),
    ]);
}

export async function toggleBookmark(user: PublicUser, input: Omit<Bookmark, 'createdAt'>) {
    await ensureSeedData();
    const existing = await prisma.bookmark.findFirst({
        where: { userId: user.id, topicKey: input.topicKey },
    });

    const now = new Date();
    if (existing) {
        await prisma.$transaction([
            prisma.bookmark.delete({ where: { id: existing.id } }),
            prisma.activityLog.create({
                data: {
                    id: randomBytes(12).toString('hex'),
                    userId: user.id,
                    type: PrismaActivityType.bookmark_removed,
                    description: `Removed bookmark for ${input.topicKey}`,
                    createdAt: now,
                },
            }),
        ]);
        return { bookmarked: false };
    }

    await prisma.$transaction([
        prisma.bookmark.create({
            data: {
                userId: user.id,
                topicKey: input.topicKey,
                trackId: input.trackId,
                moduleId: input.moduleId,
                topicId: input.topicId,
                createdAt: now,
            },
        }),
        prisma.activityLog.create({
            data: {
                id: randomBytes(12).toString('hex'),
                userId: user.id,
                type: PrismaActivityType.bookmark_added,
                description: `Bookmarked ${input.topicKey}`,
                createdAt: now,
            },
        }),
    ]);
    return { bookmarked: true };
}

export async function submitExercise(user: PublicUser, input: { submissionId: string; topicKey: string; trackId: string; moduleId: string; topicId: string; code: string }) {
    await ensureSeedData();
    const createdAt = new Date();
    const lecturers = await prisma.user.findMany({
        where: { role: PrismaRole.lecturer },
        select: { id: true },
    });

    await prisma.$transaction([
        prisma.submission.upsert({
            where: { id: input.submissionId },
            update: {
                code: input.code,
                status: PrismaSubmissionStatus.pending,
                grade: null,
                feedback: null,
                submittedAt: createdAt,
                gradedAt: null,
            },
            create: {
                id: input.submissionId,
                topicKey: input.topicKey,
                trackId: input.trackId,
                moduleId: input.moduleId,
                topicId: input.topicId,
                userId: user.id,
                userName: user.name,
                code: input.code,
                status: PrismaSubmissionStatus.pending,
                submittedAt: createdAt,
            },
        }),
        prisma.activityLog.create({
            data: {
                id: randomBytes(12).toString('hex'),
                userId: user.id,
                type: PrismaActivityType.submission_created,
                description: `Submitted work for ${input.topicKey}`,
                createdAt,
            },
        }),
        ...lecturers.map((lecturer) =>
            prisma.notification.create({
                data: {
                    id: randomBytes(12).toString('hex'),
                    userId: lecturer.id,
                    title: 'New submission waiting',
                    message: `${user.name} submitted work for ${input.topicId}.`,
                    kind: PrismaNotificationKind.info,
                    link: '/dashboard',
                    read: false,
                    createdAt,
                },
            })
        ),
    ]);
}

export async function gradeSubmission(user: PublicUser, input: { submissionId: string; grade: string; feedback: string }) {
    if (user.role !== 'lecturer') {
        throw new Error('forbidden');
    }

    await ensureSeedData();
    const target = await prisma.submission.findUnique({ where: { id: input.submissionId } });
    if (!target) return;

    const gradedAt = new Date();
    await prisma.$transaction([
        prisma.submission.update({
            where: { id: input.submissionId },
            data: {
                status: PrismaSubmissionStatus.graded,
                grade: input.grade,
                feedback: input.feedback,
                gradedAt,
            },
        }),
        prisma.notification.create({
            data: {
                id: randomBytes(12).toString('hex'),
                userId: target.userId,
                title: 'Submission graded',
                message: `${target.userName}, your work for ${target.topicId} has been reviewed.`,
                kind: PrismaNotificationKind.success,
                link: '/dashboard',
                read: false,
                createdAt: gradedAt,
            },
        }),
        prisma.activityLog.create({
            data: {
                id: randomBytes(12).toString('hex'),
                userId: target.userId,
                type: PrismaActivityType.submission_graded,
                description: `Submission ${input.submissionId} graded with ${input.grade}/100`,
                createdAt: gradedAt,
            },
        }),
    ]);
}

export async function markNotificationRead(userId: string, notificationId: string) {
    await ensureSeedData();
    await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { read: true },
    });
}

export async function markAllNotificationsRead(userId: string) {
    await ensureSeedData();
    await prisma.notification.updateMany({
        where: { userId },
        data: { read: true },
    });
}

export async function createCohort(user: PublicUser, name: string) {
    if (user.role !== 'lecturer') {
        throw new Error('forbidden');
    }

    await ensureSeedData();
    const createdAt = new Date();
    await prisma.$transaction([
        prisma.cohort.create({
            data: {
                id: randomBytes(12).toString('hex'),
                name,
                lecturerId: user.id,
                createdAt,
            },
        }),
        prisma.activityLog.create({
            data: {
                id: randomBytes(12).toString('hex'),
                userId: user.id,
                type: PrismaActivityType.cohort_created,
                description: `Created cohort ${name}`,
                createdAt,
            },
        }),
    ]);
}

export async function assignStudentToCohort(user: PublicUser, cohortId: string, studentId: string) {
    if (user.role !== 'lecturer') {
        throw new Error('forbidden');
    }

    await ensureSeedData();
    const cohort = await prisma.cohort.findFirst({
        where: { id: cohortId, lecturerId: user.id },
    });
    if (!cohort) return;

    const createdAt = new Date();
    await prisma.$transaction([
        prisma.cohortMembership.upsert({
            where: { cohortId_studentId: { cohortId, studentId } },
            update: {},
            create: {
                cohortId,
                studentId,
                createdAt,
            },
        }),
        prisma.activityLog.create({
            data: {
                id: randomBytes(12).toString('hex'),
                userId: studentId,
                type: PrismaActivityType.cohort_joined,
                description: `Assigned to cohort ${cohort.name}`,
                createdAt,
            },
        }),
    ]);
}
