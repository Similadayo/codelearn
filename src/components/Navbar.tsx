'use client';
import Link from 'next/link';
import { Code2, BookOpen, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { user, login, logout } = useAuth();
    const pathname = usePathname();

    const navLinks = [
        { label: 'Curriculum', href: '/curriculum', icon: BookOpen },
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ];

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            height: '4.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 2rem',
            background: 'rgba(5, 8, 20, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(99, 102, 241, 0.12)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
        }}>
            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
                <div style={{
                    width: '34px', height: '34px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(99,102,241,0.4)'
                }}>
                    <Code2 size={18} color="white" />
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                    Code<span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Learn</span>
                </span>
            </Link>

            {/* Nav Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {navLinks.map(link => {
                    const isActive = pathname.startsWith(link.href);
                    return (
                        <Link key={link.href} href={link.href} style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            color: isActive ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                            background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                            transition: 'all 0.2s ease',
                            border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                        }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                }
                            }}
                        >
                            <link.icon size={16} />
                            {link.label}
                        </Link>
                    );
                })}
            </div>

            {/* Auth */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {user ? (
                    <>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.35rem 0.85rem',
                            borderRadius: '9999px',
                            background: user.role === 'lecturer' ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.12)',
                            border: `1px solid ${user.role === 'lecturer' ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.25)'}`,
                            fontSize: '0.8rem', fontWeight: 600,
                            color: user.role === 'lecturer' ? '#fbbf24' : '#a5b4fc',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: user.role === 'lecturer' ? '#fbbf24' : '#6366f1', display: 'inline-block' }} />
                            {user.role}
                        </div>
                        <button onClick={logout} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <LogOut size={14} />
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => login('student')} className="btn-ghost">
                            Student Login
                        </button>
                        <button onClick={() => login('lecturer')} className="btn" style={{ padding: '0.55rem 1.2rem', fontSize: '0.875rem' }}>
                            Lecturer Login
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
