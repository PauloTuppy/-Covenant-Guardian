import React from 'react';

const Loading: React.FC = () => (
    <div className="flex items-center justify-center py-12">
        <div className="space-y-4 text-center">
            <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary"></div>
            <p className="text-gray-600">Loading...</p>
        </div>
    </div>
);

export default Loading;
