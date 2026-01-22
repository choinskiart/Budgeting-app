import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BudgetProvider } from './context/BudgetContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import Statistics from './components/MonthReview'; // Reused file, new logic
import BudgetSetup from './components/BudgetSetup';

const App: React.FC = () => {
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

export default App;