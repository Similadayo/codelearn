import { ReactNode } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/context/AuthContext';
import { AppDataProvider } from '@/context/AppDataContext';

export const metadata = {
    title: 'CodeLearn — Master Tech from Novice to Expert',
    description: 'The most comprehensive tech education platform. Learn Backend, Frontend, Mobile, Data Science, DevOps, and Cyber Security with deeply detailed curriculum and real exercises.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
            </head>
            <body>
                <AuthProvider>
                    <AppDataProvider>
                        <Navbar />
                        <div style={{ paddingTop: '4.5rem', minHeight: '100vh' }}>
                            {children}
                        </div>
                    </AppDataProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
