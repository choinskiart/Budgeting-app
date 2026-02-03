import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BudgetProvider } from './context/BudgetContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import Statistics from './components/MonthReview';
import BudgetSetup from './components/BudgetSetup';
import LoginScreen from './components/LoginScreen';
import { Loader2 } from 'lucide-react';

// Protected routes wrapper
const ProtectedApp: React.FC = () => {
  const { user, isLoading, isAllowed } = useAuth();

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-calm-blue" />
      </div>
    );
  }

  // Show login screen if not authenticated or not allowed
  if (!user || !isAllowed) {
    return <LoginScreen />;
  }

  // User is authenticated and allowed - show the app
  return (
    <BudgetProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="statistics" element={<Statistics />} />
          </Route>
          <Route path="/add" element={<AddTransaction />} />
          <Route path="/edit/:id" element={<AddTransaction />} />
          <Route path="/setup" element={<BudgetSetup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </BudgetProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
};

export default App;
