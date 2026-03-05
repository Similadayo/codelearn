'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // null means logged out
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        // Load user role from localStorage on mount
        const savedUser = localStorage.getItem('techlearn_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setIsHydrated(true);
    }, []);

    const login = (role) => {
        // role is either 'student' or 'lecturer'
        const newUser = { id: 1, role, name: role === 'student' ? 'Demo Student' : 'Demo Lecturer' };
        setUser(newUser);
        localStorage.setItem('techlearn_user', JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('techlearn_user');
    };

    if (!isHydrated) return null; // Avoid hydration mismatch

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
