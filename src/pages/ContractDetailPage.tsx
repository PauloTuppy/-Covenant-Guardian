import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contractService } from '../services/contracts';
import ContractDetail from '../components/contracts/ContractDetail';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import { Contract } from '../types';
import { ArrowLeft, RefreshCw, Edit } from 'lucide-react';

const ContractDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchContract = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const contractData = await contractService.getContractById(id);
            setContract(contractData);
            setError(null);
        } catch (err) {
            setError('Failed to fetch contract details');
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        fetchContract();
    }, [fetchContract]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchContract();
    }, [fetchContract]);

    const handleCovenantUpdate = useCallback(() => {
        // Refresh contract data when covenants are updated
        handleRefresh();
    }, [handleRefresh]);

    if (loading && !contract) return <Loading />;
    
    if (error || !contract) {
        return (
            <div className="animate-in fade-in duration-500">
                <button
                    onClick={() => navigate('/contracts')}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Contracts
                </button>
                
                <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
                    <p className="text-red-600 mb-4">{error || 'Contract not found'}</p>
                    <div className="flex justify-center gap-3">
                        <Button variant="outline" onClick={() => navigate('/contracts')}>
                            Return to List
                        </Button>
                        <Button variant="primary" onClick={handleRefresh}>
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header with navigation and actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/contracts')}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Contracts
                </button>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        isLoading={refreshing}
                        leftIcon={<RefreshCw className="h-4 w-4" />}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit className="h-4 w-4" />}
                        onClick={() => {/* TODO: Open edit modal */}}
                    >
                        Edit
                    </Button>
                </div>
            </div>

            {/* Contract Detail with integrated covenant breakdown */}
            <ContractDetail 
                contract={contract} 
                onCovenantUpdate={handleCovenantUpdate}
            />
        </div>
    );
};

export default ContractDetailPage;
