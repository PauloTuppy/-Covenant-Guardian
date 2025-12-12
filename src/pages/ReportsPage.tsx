import React from 'react';
import { FileText, Download } from 'lucide-react';

const ReportsPage: React.FC = () => {
    const reports = [
        { id: 1, title: 'Q4 2024 Portfolio Risk Assessment', date: '2025-01-15', type: 'Risk' },
        { id: 2, title: 'Monthly Compliance Summary - Dec 2024', date: '2025-01-05', type: 'Compliance' },
        { id: 3, title: 'Covenant Breach Analysis', date: '2024-12-28', type: 'Breach' },
    ];

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    <FileText className="h-5 w-5" />
                    <span>Generate New Report</span>
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <ul className="divide-y divide-gray-200">
                    {reports.map((report) => (
                        <li key={report.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">{report.title}</h3>
                                    <p className="text-xs text-gray-500">Generated on {new Date(report.date).toLocaleDateString()} • {report.type}</p>
                                </div>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                                <Download className="h-5 w-5" />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ReportsPage;
