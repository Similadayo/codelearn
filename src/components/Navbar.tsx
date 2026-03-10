'use client';
import Link from 'next/link';
import { Bell, BookOpen, Code2, LayoutDashboard, LogOut, Search, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { unreadNotifications, notifications } = useAppData();
    const pathname = usePathname();

    const navLinks = [
        { label: 'Curriculum', href: '/curriculum', icon: BookOpen },
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ];

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            minHeight: '4.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1.25rem',
            background: 'rgba(5, 8, 20, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(99, 102, 241, 0.12)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
            gap: '1rem',
            flexWrap: 'wrap',
        }}>
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
                <div>
                    <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', display: 'block', lineHeight: 1 }}>
                        Code<span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Learn</span>
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {user ? `${user.role} mode` : 'Role-based learning'}
                    </span>
                </div>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                {navLinks.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    return (
                        <Link key={link.href} href={link.href} style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.5rem 0.9rem',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            color: isActive ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                            background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                            transition: 'all 0.2s ease',
                            border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                        }}>
                            <link.icon size={16} />
                            {link.label}
                        </Link>
                    );
                })}
                <Link href="/curriculum" style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    border: '1px solid transparent',
                }}>
                    <Search size={16} />
                    Discover
                </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                {user ? (
                    <>
                        <Link href="/dashboard" style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            borderRadius: '9999px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}>
                            <Bell size={16} color="var(--text-primary)" />
                            {unreadNotifications > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-2px',
                                    right: '-2px',
                                    minWidth: '18px',
                                    height: '18px',
                                    borderRadius: '9999px',
                                    background: '#f43f5e',
                                    color: 'white',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 0.3rem',
                                }}>
                                    {Math.min(unreadNotifications, 9)}
                                </span>
                            )}
                        </Link>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.55rem',
                            padding: '0.45rem 0.8rem',
                            borderRadius: '9999px',
                            background: user.role === 'lecturer' ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.12)',
                            border: `1px solid ${user.role === 'lecturer' ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.25)'}`,
                        }}>
                            <UserCircle2 size={16} color={user.role === 'lecturer' ? '#fbbf24' : '#a5b4fc'} />
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                                    {user.name}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                    {user.role} · {notifications.length} notifications
                                </div>
                            </div>
                        </div>
                        {!user.onboardingCompleted && (
                            <Link href="/onboarding" className="btn-ghost" style={{ padding: '0.5rem 0.9rem' }}>
                                Finish Onboarding
                            </Link>
                        )}
                        <button onClick={() => void logout()} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <LogOut size={14} />
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/auth" className="btn-ghost">
                            Sign In
                        </Link>
                        <Link href="/auth?mode=signup" className="btn" style={{ padding: '0.55rem 1.2rem', fontSize: '0.875rem' }}>
                            Create Account
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
