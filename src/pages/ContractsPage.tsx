import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ContractsList from '../components/contracts/ContractsList';

const ContractsPage: React.FC = () => {
    const navigate = useNavigate();

    const handleContractCreated = useCallback(() => {
        // Could show a toast notification here
        console.log('Contract created successfully');
    }, []);

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Contracts</h1>
                    <p className="text-gray-500 mt-1">Manage and monitor your loan contracts</p>
                </div>
            </div>
            <ContractsList onContractCreated={handleContractCreated} />
        </div>
    );
};

export default ContractsPage;
