import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="flex gap-0 relative">
                <Sidebar />
                <main className="ml-64 flex-1 pt-4">
                    <div className="mx-auto max-w-7xl px-6 py-4">{children}</div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
