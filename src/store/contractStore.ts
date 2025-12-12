import { create } from 'zustand';
import { Contract } from '../types';

interface ContractStore {
    contracts: Contract[];
    selectedContract: Contract | null;
    loading: boolean;
    error: string | null;

    setContracts: (contracts: Contract[]) => void;
    setSelectedContract: (contract: Contract | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    addContract: (contract: Contract) => void;
    updateContract: (id: string, contract: Partial<Contract>) => void;
    removeContract: (id: string) => void;
    filterByStatus: (status: string) => Contract[];
    filterByRisk: () => Contract[];
}

export const useContractStore = create<ContractStore>((set, get) => ({
    contracts: [],
    selectedContract: null,
    loading: false,
    error: null,

    setContracts: (contracts) => set({ contracts }),
    setSelectedContract: (contract) => set({ selectedContract: contract }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    addContract: (contract) =>
        set((state) => ({ contracts: [contract, ...state.contracts] })),

    updateContract: (id, updates) =>
        set((state) => ({
            contracts: state.contracts.map((c) =>
                c.id === id ? { ...c, ...updates } : c
            ),
        })),

    removeContract: (id) =>
        set((state) => ({
            contracts: state.contracts.filter((c) => c.id !== id),
        })),

    filterByStatus: (status) =>
        get().contracts.filter((c) => c.status === status),

    filterByRisk: () =>
        get().contracts.filter((c) => c.status === 'watch' || c.status === 'default'),
}));
