import './globals.css';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export const metadata = {
    title: 'Tech Learning Platform',
    description: 'Master every discipline in Tech',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <Navbar />
                <Sidebar />
                <div className="app-container" style={{ marginLeft: '260px', paddingTop: '5rem', minHeight: '100vh' }}>
                    {children}
                </div>
            </body>
        </html>
    );
}
