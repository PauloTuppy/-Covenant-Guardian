import React from 'react';
import DashboardOverview from '../components/dashboard/DashboardOverview';

const DashboardPage: React.FC = () => {
    return (
        <div className="animate-in fade-in duration-500">
            <DashboardOverview />
        </div>
    );
};

export default DashboardPage;
