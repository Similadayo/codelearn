import Link from 'next/link';
import { BookOpen, UserCircle, Code2 } from 'lucide-react';

export default function Navbar() {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--border-radius)', background: 'rgba(255,255,255,0.05)' }}>
                    <UserCircle size={24} />
                    <span>Login</span>
                </div>
            </div>
        </nav>
    );
}
