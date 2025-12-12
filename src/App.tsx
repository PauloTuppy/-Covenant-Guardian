import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ToastContainer, ErrorBoundary } from './components/common';

// Pages
import DashboardPage from './pages/DashboardPage';
import ContractsPage from './pages/ContractsPage';
import ContractDetailPage from './pages/ContractDetailPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import HomePage from './pages/HomePage';
import BorrowerDetailPage from './pages/BorrowerDetailPage';
import SettingsPage from './pages/SettingsPage';
import DocumentationPage from './pages/DocumentationPage';

// Layout
import MainLayout from './components/layout/MainLayout';

// Auth Guard wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isLoggedIn } = useAuthStore();
    
    if (!isLoggedIn) {
        return <Navigate to="/" replace />;
    }
    
    return <MainLayout>{children}</MainLayout>;
};

function App() {
    const { isLoggedIn, hydrate } = useAuthStore();

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    return (
        <ErrorBoundary
            errorMessage="Application Error"
            showRetry={true}
            showHomeButton={true}
            onError={(error, errorInfo) => {
                // Log to console in development
                console.error('Application Error:', error, errorInfo);
                // In production, you could send to error tracking service
            }}
        >
            <Router>
                {/* Global Toast Container */}
                <ToastContainer />
                
                <Routes>
                {/* Public Routes */}
                <Route 
                    path="/" 
                    element={!isLoggedIn ? <HomePage /> : <Navigate to="/dashboard" />} 
                />
                <Route 
                    path="/docs" 
                    element={<DocumentationPage />} 
                />

                {/* Protected Routes */}
                <Route 
                    path="/dashboard" 
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/contracts" 
                    element={
                        <ProtectedRoute>
                            <ContractsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/contracts/:id" 
                    element={
                        <ProtectedRoute>
                            <ContractDetailPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/alerts" 
                    element={
                        <ProtectedRoute>
                            <AlertsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/reports" 
                    element={
                        <ProtectedRoute>
                            <ReportsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/borrowers/:borrowerId" 
                    element={
                        <ProtectedRoute>
                            <BorrowerDetailPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/settings" 
                    element={
                        <ProtectedRoute>
                            <SettingsPage />
                        </ProtectedRoute>
                    } 
                />

                {/* Catch all - redirect to appropriate page */}
                <Route 
                    path="*" 
                    element={<Navigate to={isLoggedIn ? "/dashboard" : "/"} replace />} 
                />
            </Routes>
        </Router>
        </ErrorBoundary>
    );
}

export default App;
