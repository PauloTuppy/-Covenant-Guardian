import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Lock } from 'lucide-react';

const HomePage: React.FC = () => {
    const { setUser } = useAuthStore();
    const navigate = useNavigate();

    const handleLogin = () => {
        // Mock Login
        setUser({ id: '1', email: 'analyst@bank.io', bank_id: '1', role: 'analyst' });
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[120px]"></div>
            </div>

            <nav className="relative z-10 px-8 py-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                        <ShieldCheck className="text-white h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">Covenant Guardian</span>
                </div>
                <button
                    onClick={handleLogin}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                    Log In
                </button>
            </nav>

            <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 text-center">
                <h1 className="text-5xl sm:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 mb-8 max-w-4xl tracking-tight leading-tight">
                    AI-Powered Covenant Compliance
                </h1>

                <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mb-12">
                    Automate contract extraction, monitor financial covenants in real-time, and detect risks before they become breaches.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <button
                        onClick={handleLogin}
                        className="group flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-full font-bold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25"
                    >
                        <span>Access Demo</span>
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={() => navigate('/docs')}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-800 text-white rounded-full font-bold text-lg hover:bg-gray-700 transition-all border border-gray-700"
                    >
                        <span>Read Documentation</span>
                    </button>
                </div>

                {/* Features Grid */}
                <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full text-left">
                    <div className="p-6 rounded-2xl bg-gray-800/50 border border-gray-700 backdrop-blur-sm">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                            <span className="text-2xl">🤖</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Gemini AI Extraction</h3>
                        <p className="text-gray-400">Instantly extract complex covenant terms from PDF contracts using advanced GenAI.</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gray-800/50 border border-gray-700 backdrop-blur-sm">
                        <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                            <span className="text-2xl">📊</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Real-time Monitoring</h3>
                        <p className="text-gray-400">Connect to financial data streams for up-to-the-minute compliance tracking.</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gray-800/50 border border-gray-700 backdrop-blur-sm">
                        <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                            <Lock className="h-5 w-5 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Bank-Grade Security</h3>
                        <p className="text-gray-400">Enterprise isolation, audit trails, and encrypted data handling by default.</p>
                    </div>
                </div>
            </main>

            <footer className="relative z-10 py-8 text-center text-gray-600 text-sm">
                © 2024 Covenant Guardian. Built for LMA Edge Hackathon.
            </footer>
        </div>
    );
};

export default HomePage;
