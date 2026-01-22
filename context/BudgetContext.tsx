import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, Transaction, Category, MonthConfig, DEFAULT_CATEGORIES, INITIAL_SAVINGS_GOAL } from '../types';
import { getCurrentMonthId } from '../constants';

interface BudgetContextType {
  state: AppState;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  editTransaction: (id: string, updated: Partial<Omit<Transaction, 'id' | 'timestamp'>>) => void;
  deleteTransaction: (id: string) => void;
  updateMonthConfig: (config: MonthConfig) => void;
  updateCategoryLimit: (categoryId: string, limit: number) => void;
  getCreateMonthConfig: (monthId: string) => MonthConfig;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

const STORAGE_KEY = 'spokoj-app-data-v1';

export const BudgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const currentMonth = getCurrentMonthId();
        
        if (stored) {
          const parsed = JSON.parse(stored);
          
          // SAFETY: Default to empty/default structures if parsed data is missing fields
          // This prevents "resetting" the budget if one field is malformed.
          let categories = Array.isArray(parsed.categories) ? parsed.categories : DEFAULT_CATEGORIES;
          const configs = parsed.configs || {};
          const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];

          // MIGRATION: Ensure "savings" category exists if it's missing (for existing users)
          // We use defensive coding (optional chaining/checks) to avoid crashes
          const hasSavings = categories.some((c: any) => c.id === 'savings');
          if (!hasSavings) {
              const savingsCat = DEFAULT_CATEGORIES.find(c => c.id === 'savings');
              if (savingsCat) {
                  categories = [...categories, savingsCat];
              }
          }

          return { 
              currentMonthId: currentMonth,
              configs: configs,
              categories: categories,
              transactions: transactions
          };
        }
    } catch (e) {
        console.error("Błąd odczytu danych (odzyskiwanie stanu domyślnego):", e);
        // In case of critical failure, we fall back to default to allow app to start,
        // but this log helps debug. Ideally we wouldn't wipe data, but if JSON is invalid, we must.
    }
    
    return {
      currentMonthId: getCurrentMonthId(),
      configs: {},
      categories: DEFAULT_CATEGORIES,
      transactions: [],
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const getCreateMonthConfig = (monthId: string): MonthConfig => {
    if (state.configs[monthId]) {
      return state.configs[monthId];
    }
    return {
      id: monthId,
      totalIncome: 15000,
      savingsGoals: [INITIAL_SAVINGS_GOAL],
    };
  };

  const updateMonthConfig = (config: MonthConfig) => {
    setState((prev) => ({
      ...prev,
      configs: {
        ...prev.configs,
        [config.id]: config,
      },
    }));
  };

  const addTransaction = (input: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTx: Transaction = {
      ...input,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
    }));
  };

  const editTransaction = (id: string, updated: Partial<Omit<Transaction, 'id' | 'timestamp'>>) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) =>
        t.id === id ? { ...t, ...updated } : t
      ),
    }));
  };

  const deleteTransaction = (id: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  };

  const updateCategoryLimit = (categoryId: string, limit: number) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === categoryId ? { ...c, limit } : c
      ),
    }));
  };

  return (
    <BudgetContext.Provider
      value={{
        state,
        addTransaction,
        editTransaction,
        deleteTransaction,
        updateMonthConfig,
        updateCategoryLimit,
        getCreateMonthConfig,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};