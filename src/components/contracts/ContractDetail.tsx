import React, { useState, useMemo } from 'react';
import { Contract } from '../../types';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';
import ExtractionStatusMonitor from './ExtractionStatusMonitor';
import CovenantHealthCard from '../covenants/CovenantHealthCard';
import CovenantAgentAnalysis from '../covenants/CovenantAgentAnalysis';
import { 
    Calendar, 
    DollarSign, 
    Activity, 
    Building2, 
    FileText, 
    ChevronDown, 
    ChevronUp,
    Filter
} from 'lucide-react';

interface ContractDetailProps {
    contract: Contract;
    onCovenantUpdate?: () => void;
}

type CovenantFilterType = 'all' | 'compliant' | 'warning' | 'breached';
type CovenantSortType = 'name' | 'status' | 'type' | 'nextCheck';

const ContractDetail: React.FC<ContractDetailProps> = ({ contract, onCovenantUpdate }) => {
    const [showAllCovenants, setShowAllCovenants] = useState(false);
    const [covenantFilter, setCovenantFilter] = useState<CovenantFilterType>('all');
    const [covenantSort, setCovenantSort] = useState<CovenantSortType>('status');
    const [extractionComplete, setExtractionComplete] = useState(false);

    // Get covenants from contract
    const covenants = contract.covenants || [];
    
    // Calculate covenant statistics
    const covenantStats = useMemo(() => {
        const stats = {
            total: covenants.length,
            compliant: 0,
            warning: 0,
            breached: 0,
            financial: 0,
            operational: 0,
            reporting: 0,
            other: 0,
        };

        covenants.forEach(covenant => {
            // Count by status
            const status = covenant.health?.status || 'compliant';
            if (status === 'compliant') stats.compliant++;
            else if (status === 'warning') stats.warning++;
            else if (status === 'breached') stats.breached++;

            // Count by type
            if (covenant.covenant_type === 'financial') stats.financial++;
            else if (covenant.covenant_type === 'operational') stats.operational++;
            else if (covenant.covenant_type === 'reporting') stats.reporting++;
            else stats.other++;
        });

        return stats;
    }, [covenants]);

    // Filter and sort covenants
    const filteredCovenants = useMemo(() => {
        let filtered = [...covenants];

        // Apply filter
        if (covenantFilter !== 'all') {
            filtered = filtered.filter(c => (c.health?.status || 'compliant') === covenantFilter);
        }

        // Apply sort
        filtered.sort((a, b) => {
            switch (covenantSort) {
                case 'name':
                    return a.covenant_name.localeCompare(b.covenant_name);
                case 'status': {
                    const statusOrder = { breached: 0, warning: 1, compliant: 2 };
                    const statusA = a.health?.status || 'compliant';
                    const statusB = b.health?.status || 'compliant';
                    return statusOrder[statusA] - statusOrder[statusB];
                }
                case 'type':
                    return a.covenant_type.localeCompare(b.covenant_type);
                case 'nextCheck':
                    return new Date(a.next_check_date || '').getTime() - new Date(b.next_check_date || '').getTime();
                default:
                    return 0;
            }
        });

        return filtered;
    }, [covenants, covenantFilter, covenantSort]);

    // Determine how many covenants to show
    const displayedCovenants = showAllCovenants ? filteredCovenants : filteredCovenants.slice(0, 6);
    const hasMoreCovenants = filteredCovenants.length > 6;

    // Handle extraction complete
    const handleExtractionComplete = (count: number) => {
        setExtractionComplete(true);
        if (count > 0) {
            onCovenantUpdate?.();
        }
    };

    // Calculate days until maturity
    const daysUntilMaturity = useMemo(() => {
        const today = new Date();
        const maturity = new Date(contract.maturity_date);
        const diffTime = maturity.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }, [contract.maturity_date]);

    return (
        <div className="space-y-6">
            {/* Contract Header */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{contract.contract_name}</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Contract #{contract.contract_number || 'N/A'}
                            </p>
                        </div>
                        <StatusBadge status={contract.status} />
                    </div>
                </div>

                {/* Contract Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    {/* Principal Amount */}
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-green-50 text-green-600">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-gray-500">Principal Amount</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {new Intl.NumberFormat('en-US', { 
                                style: 'currency', 
                                currency: contract.currency || 'USD',
                                maximumFractionDigits: 0
                            }).format(contract.principal_amount)}
                        </p>
                        {contract.interest_rate !== undefined && (
                            <p className="text-sm text-gray-500 mt-1">{contract.interest_rate}% Interest Rate</p>
                        )}
                    </div>

                    {/* Timeline */}
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-gray-500">Timeline</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Origination:</span>
                                <span className="font-medium text-gray-900">
                                    {new Date(contract.origination_date).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Maturity:</span>
                                <span className="font-medium text-gray-900">
                                    {new Date(contract.maturity_date).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                {daysUntilMaturity > 0 
                                    ? `${daysUntilMaturity} days remaining`
                                    : daysUntilMaturity === 0 
                                        ? 'Matures today'
                                        : 'Matured'}
                            </div>
                        </div>
                    </div>

                    {/* Borrower */}
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-gray-500">Borrower</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                            {contract.borrower?.legal_name || 'Unknown'}
                        </p>
                        {contract.borrower?.industry && (
                            <p className="text-sm text-gray-500 mt-1">{contract.borrower.industry}</p>
                        )}
                        {contract.borrower?.credit_rating && (
                            <p className="text-xs text-gray-400 mt-1">
                                Rating: {contract.borrower.credit_rating}
                            </p>
                        )}
                    </div>

                    {/* Covenant Performance */}
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                                <Activity className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-gray-500">Covenant Health</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Total:</span>
                                <span className="font-medium text-gray-900">{covenantStats.total}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-green-600">Compliant:</span>
                                <span className="font-medium text-green-600">{covenantStats.compliant}</span>
                            </div>
                            {covenantStats.warning > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-yellow-600">Warning:</span>
                                    <span className="font-medium text-yellow-600">{covenantStats.warning}</span>
                                </div>
                            )}
                            {covenantStats.breached > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-red-600">Breached:</span>
                                    <span className="font-medium text-red-600">{covenantStats.breached}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Extraction Status Monitor */}
            {contract.raw_document_text && !extractionComplete && (
                <ExtractionStatusMonitor
                    contractId={contract.id}
                    onExtractionComplete={handleExtractionComplete}
                />
            )}

            {/* AI Covenant Analysis Agent */}
            <CovenantAgentAnalysis 
                contractId={contract.id}
                onAnalysisComplete={(result) => {
                    console.log('AI Analysis complete:', result);
                }}
            />

            {/* Covenants Section */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                Monitored Covenants ({covenantStats.total})
                            </h3>
                        </div>

                        {/* Filter and Sort Controls */}
                        {covenants.length > 0 && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-gray-400" />
                                    <select
                                        value={covenantFilter}
                                        onChange={(e) => setCovenantFilter(e.target.value as CovenantFilterType)}
                                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="compliant">Compliant</option>
                                        <option value="warning">Warning</option>
                                        <option value="breached">Breached</option>
                                    </select>
                                </div>
                                <select
                                    value={covenantSort}
                                    onChange={(e) => setCovenantSort(e.target.value as CovenantSortType)}
                                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
                                >
                                    <option value="status">Sort by Status</option>
                                    <option value="name">Sort by Name</option>
                                    <option value="type">Sort by Type</option>
                                    <option value="nextCheck">Sort by Next Check</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Covenant Type Summary */}
                    {covenants.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {covenantStats.financial > 0 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {covenantStats.financial} Financial
                                </span>
                            )}
                            {covenantStats.operational > 0 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {covenantStats.operational} Operational
                                </span>
                            )}
                            {covenantStats.reporting > 0 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {covenantStats.reporting} Reporting
                                </span>
                            )}
                            {covenantStats.other > 0 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    {covenantStats.other} Other
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Covenants Grid */}
                <div className="p-6">
                    {filteredCovenants.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            {covenants.length === 0 ? (
                                <>
                                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 mb-2">No covenants tracked for this contract.</p>
                                    <p className="text-sm text-gray-400">
                                        Upload a contract document to automatically extract covenants, or add them manually.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Filter className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No covenants match the selected filter.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {displayedCovenants.map((covenant) => (
                                    <CovenantHealthCard key={covenant.id} covenant={covenant} />
                                ))}
                            </div>

                            {/* Show More/Less Button */}
                            {hasMoreCovenants && (
                                <div className="mt-6 text-center">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowAllCovenants(!showAllCovenants)}
                                        rightIcon={showAllCovenants ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    >
                                        {showAllCovenants 
                                            ? 'Show Less' 
                                            : `Show All ${filteredCovenants.length} Covenants`}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContractDetail;
