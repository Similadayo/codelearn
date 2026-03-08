'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Role = 'student' | 'lecturer';

export interface User {
    id: string;
    role: Role;
    name: string;
    demoMode: boolean;
}

interface AuthContextType {
    user: User | null;
    login: (role: Role) => void;
    logout: () => void;
}

const STORAGE_KEY = 'codelearn_user';
const STUDENT_COUNTER_KEY = 'codelearn_student_counter';
const LECTURER_PROFILE_KEY = 'codelearn_lecturer_profile';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function createStudentProfile(): User {
    const nextNumber = Number(localStorage.getItem(STUDENT_COUNTER_KEY) || '0') + 1;
    localStorage.setItem(STUDENT_COUNTER_KEY, String(nextNumber));

    return {
        id: crypto.randomUUID(),
        role: 'student',
        name: `Demo Student ${nextNumber}`,
        demoMode: true,
    };
}

function getLecturerProfile(): User {
    const savedLecturer = localStorage.getItem(LECTURER_PROFILE_KEY);
    if (savedLecturer) {
        return JSON.parse(savedLecturer) as User;
    }

    const lecturer: User = {
        id: crypto.randomUUID(),
        role: 'lecturer',
        name: 'Demo Lecturer',
        demoMode: true,
    };

    localStorage.setItem(LECTURER_PROFILE_KEY, JSON.stringify(lecturer));
    return lecturer;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const savedUser = localStorage.getItem(STORAGE_KEY);
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setIsHydrated(true);
    }, []);

    const login = (role: Role) => {
        const nextUser = role === 'student' ? createStudentProfile() : getLecturerProfile();
        setUser(nextUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    if (!isHydrated) return null;

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

