import Link from 'next/link';

export default function Home() {
    return (
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="glass-panel" style={{ padding: '3rem', maxWidth: '800px', width: '100%', textAlign: 'center' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(45deg, var(--accent-primary), var(--accent-hover))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Tech Learning Platform
                </h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Master every discipline in tech. From Novice to Expert.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <Link href="/curriculum" className="btn">
                        Explore Curriculum
                    </Link>
                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--accent-primary)' }}>
                        Login / Demo
                    </button>
                </div>
            </div>
        </main>
    );
}
