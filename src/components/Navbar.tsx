'use client';
import Link from 'next/link';
import { BookOpen, UserCircle, Code2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
    const { user, login, logout } = useAuth();
    return (
        <nav className="glass-panel" style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 2rem', borderBottomRightRadius: '0', borderBottomLeftRadius: '0',
            borderTop: 'none', borderLeft: 'none', borderRight: 'none'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Code2 size={28} color="var(--accent-primary)" />
                <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    Tech<span style={{ color: 'var(--accent-primary)' }}>Learn</span>
                </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <Link href="/curriculum" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                    <BookOpen size={20} />
                    Curriculum
                </Link>

                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.9rem', color: user.role === 'lecturer' ? '#ffb86c' : '#8be9fd' }}>
                            {user.role.toUpperCase()}
                        </div>
                        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                            <LogOut size={20} /> Logout
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => login('student')} className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>
                            Student Login
                        </button>
                        <button onClick={() => login('lecturer')} className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', background: '#ffb86c', color: '#282a36' }}>
                            Lecturer Login
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}
