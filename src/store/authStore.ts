import { create } from 'zustand';

interface User {
    id: string;
    email: string;
    bank_id: string;
    role: 'admin' | 'analyst' | 'viewer';
}

interface AuthStore {
    user: User | null;
    token: string | null;
    isLoggedIn: boolean;

    setUser: (user: User) => void;
    setToken: (token: string) => void;
    logout: () => void;
    hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    token: null,
    isLoggedIn: false,

    setUser: (user) => set({ user, isLoggedIn: true }),
    setToken: (token) => {
        localStorage.setItem('auth_token', token);
        set({ token });
    },
    logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, isLoggedIn: false });
    },
    hydrate: () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            set({ token, isLoggedIn: true });
        }
    },
}));
