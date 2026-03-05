'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Role = 'student' | 'lecturer';

export interface User {
    id: number;
    role: Role;
    name: string;
}

interface AuthContextType {
    user: User | null;
    login: (role: Role) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const savedUser = localStorage.getItem('techlearn_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setIsHydrated(true);
    }, []);

    const login = (role: Role) => {
        const newUser: User = { id: 1, role, name: role === 'student' ? 'Demo Student' : 'Demo Lecturer' };
        setUser(newUser);
        localStorage.setItem('techlearn_user', JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('techlearn_user');
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
