import { ReactNode } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { AuthProvider } from '@/context/AuthContext';
import { AppDataProvider } from '@/context/AppDataContext';

export const metadata = {
    title: 'Tech Learning Platform',
    description: 'Master every discipline in Tech',
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    <AppDataProvider>
                        <Navbar />
                        <Sidebar />
                        <div className="app-container" style={{ marginLeft: '260px', paddingTop: '5rem', minHeight: '100vh', paddingBottom: '2rem' }}>
                            {children}
                        </div>
                    </AppDataProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
