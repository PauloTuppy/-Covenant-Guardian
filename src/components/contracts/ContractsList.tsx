import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import StatusBadge from '../common/StatusBadge';
import Loading from '../common/Loading';
import Button from '../common/Button';
import { Search, Filter, Plus, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import ContractUpload from './ContractUpload';

interface ContractsListProps {
    onContractCreated?: () => void;
}

const ContractsList: React.FC<ContractsListProps> = ({ onContractCreated }) => {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);

    const { contracts, loading, error, total, pages, refetch } = useContracts({
        status: statusFilter || undefined,
        page: currentPage,
        limit: pageSize,
    });

    // Client-side search filtering (for immediate feedback)
    const filteredContracts = contracts.filter(c => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            c.contract_name?.toLowerCase().includes(search) ||
            c.contract_number?.toLowerCase().includes(search) ||
            c.borrower?.legal_name?.toLowerCase().includes(search)
        );
    });

    const handlePageChange = useCallback((newPage: number) => {
        if (newPage >= 1 && newPage <= pages) {
            setCurrentPage(newPage);
        }
    }, [pages]);

    const handleStatusFilterChange = useCallback((status: string) => {
        setStatusFilter(status);
        setCurrentPage(1); // Reset to first page when filter changes
    }, []);

    const handleContractCreated = useCallback(() => {
        setShowUploadModal(false);
        refetch();
        onContractCreated?.();
    }, [refetch, onContractCreated]);

    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    // Pagination info
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, total);

    if (loading && contracts.length === 0) return <Loading />;

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                <p className="font-medium">Error loading contracts</p>
                <p className="text-sm mt-1">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={handleRefresh}>
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search contracts by name, number, or borrower..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative">
                        <select
                            className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary outline-none"
                            value={statusFilter}
                            onChange={(e) => handleStatusFilterChange(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="watch">Watch</option>
                            <option value="default">Default</option>
                            <option value="closed">Closed</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>

                    <Button
                        variant="ghost"
                        size="md"
                        onClick={handleRefresh}
                        isLoading={loading}
                        leftIcon={<RefreshCw className="h-4 w-4" />}
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => setShowUploadModal(true)}
                        leftIcon={<Plus className="h-5 w-5" />}
                    >
                        New Contract
                    </Button>
                </div>
            </div>

            {/* Contracts Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-medium text-gray-500">Contract Name</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Borrower</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Amount</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Maturity</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Covenants</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Risk</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredContracts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        {searchTerm ? 'No contracts match your search.' : 'No contracts found.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredContracts.map((contract) => (
                                    <tr
                                        key={contract.id}
                                        onClick={() => navigate(`/contracts/${contract.id}`)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{contract.contract_name}</p>
                                            <p className="text-gray-500 text-xs">{contract.contract_number || 'No number'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-gray-900">{contract.borrower?.legal_name || 'Unknown'}</p>
                                            <p className="text-gray-500 text-xs">{contract.borrower?.industry || ''}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: contract.currency || 'USD' }).format(contract.principal_amount)}
                                            </p>
                                            {contract.interest_rate !== undefined && (
                                                <p className="text-gray-500 text-xs">{contract.interest_rate}% Interest</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-gray-900">{new Date(contract.maturity_date).toLocaleDateString()}</p>
                                            <p className="text-gray-500 text-xs">
                                                {getDaysUntilMaturity(contract.maturity_date)}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={contract.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">
                                                    {(contract as any).covenant_count ?? contract.covenants?.length ?? 0}
                                                </span>
                                                <span className="text-gray-500 text-xs">Total</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {renderRiskIndicator(contract)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                        <div className="text-sm text-gray-500">
                            Showing {startItem} to {endItem} of {total} contracts
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                leftIcon={<ChevronLeft className="h-4 w-4" />}
                            >
                                Previous
                            </Button>
                            <div className="flex items-center gap-1">
                                {generatePageNumbers(currentPage, pages).map((page, idx) => (
                                    page === '...' ? (
                                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>
                                    ) : (
                                        <button
                                            key={page}
                                            onClick={() => handlePageChange(page as number)}
                                            className={`px-3 py-1 rounded text-sm ${
                                                currentPage === page
                                                    ? 'bg-primary text-white'
                                                    : 'hover:bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    )
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === pages}
                                rightIcon={<ChevronRight className="h-4 w-4" />}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Contract Upload Modal */}
            <ContractUpload
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={handleContractCreated}
            />
        </div>
    );
};

// Helper function to calculate days until maturity
function getDaysUntilMaturity(maturityDate: string): string {
    const today = new Date();
    const maturity = new Date(maturityDate);
    const diffTime = maturity.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Matured';
    if (diffDays === 0) return 'Matures today';
    if (diffDays <= 30) return `${diffDays} days left`;
    if (diffDays <= 365) return `${Math.floor(diffDays / 30)} months left`;
    return `${Math.floor(diffDays / 365)} years left`;
}

// Helper function to render risk indicator
function renderRiskIndicator(contract: any): React.ReactNode {
    const breachedCount = contract.breached_covenant_count ?? 0;
    const alertCount = contract.alert_count ?? 0;

    if (breachedCount > 0 || alertCount > 0) {
        return (
            <div className="flex flex-wrap gap-1">
                {breachedCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        {breachedCount} Breached
                    </span>
                )}
                {alertCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        {alertCount} Alerts
                    </span>
                )}
            </div>
        );
    }
    
    return (
        <span className="text-green-600 text-xs font-medium flex items-center gap-1">
            ✓ Healthy
        </span>
    );
}

// Helper function to generate page numbers with ellipsis
function generatePageNumbers(current: number, total: number): (number | string)[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    
    if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', total);
    } else if (current >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total);
    } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    
    return pages;
}

export default ContractsList;
