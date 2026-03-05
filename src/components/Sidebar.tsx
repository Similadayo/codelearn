'use client';
import Link from 'next/link';
import { LayoutDashboard, Book, CodeSquare, History, Settings } from 'lucide-react';

export default function Sidebar() {
    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { name: 'Curriculum', icon: Book, href: '/curriculum' },
        { name: 'My Exercises', icon: CodeSquare, href: '/exercises' },
        { name: 'History', icon: History, href: '/history' },
        { name: 'Settings', icon: Settings, href: '/settings' },
    ];

    return (
        <aside className="glass-panel" style={{
            width: '260px',
            height: '100vh',
            position: 'fixed',
            top: 0, left: 0,
            paddingTop: '5rem', /* Account for Navbar */
            borderTop: 'none', borderLeft: 'none', borderBottom: 'none',
            borderTopRightRadius: '0', borderBottomRightRadius: '0',
            display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '5rem 1rem 1rem 1rem'
        }}>
            {menuItems.map((item) => (
                <Link key={item.name} href={item.href} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', borderRadius: 'var(--border-radius)',
                    transition: 'var(--transition)',
                }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <item.icon size={20} color="var(--text-secondary)" />
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                </Link>
            ))}
        </aside>
    );
}
