import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppState, Transaction, Category, MonthConfig, DEFAULT_CATEGORIES, INITIAL_SAVINGS_GOAL, MerchantMapping } from '../types';
import { getCurrentMonthId } from '../constants';

interface BudgetContextType {
  state: AppState;
  isLoading: boolean;
  isOnline: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => Promise<void>;
  addMultipleTransactions: (transactions: Omit<Transaction, 'id' | 'timestamp'>[]) => Promise<void>;
  editTransaction: (id: string, updated: Partial<Omit<Transaction, 'id' | 'timestamp'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateMonthConfig: (config: MonthConfig) => Promise<void>;
  updateCategoryLimit: (categoryId: string, limit: number) => Promise<void>;
  updateAllCategoryLimits: (limits: Record<string, number>) => Promise<void>;
  updateCategory: (categoryId: string, updates: { name?: string; icon?: string }) => Promise<void>;
  getCreateMonthConfig: (monthId: string) => MonthConfig;
  resetBudget: () => Promise<void>;
  addCategory: (name: string, limit: number, icon?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveMerchantMapping: (mapping: MerchantMapping) => Promise<void>;
  findCategoryForMerchant: (merchantName: string) => string | null;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

// Household ID - w przyszłości można dodać system logowania
// Na razie używamy stałego ID dla jednego gospodarstwa domowego
const HOUSEHOLD_ID = 'default-household';
const BUDGET_DOC_PATH = `households/${HOUSEHOLD_ID}/data/budget`;

const getDefaultState = (): AppState => ({
  currentMonthId: getCurrentMonthId(),
  configs: {},
  categories: DEFAULT_CATEGORIES,
  transactions: [],
  merchantMappings: [],
});

export const BudgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(getDefaultState);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const hasLoadedOnce = useRef(false);

  // Realtime listener for Firestore
  useEffect(() => {
    const docRef = doc(db, BUDGET_DOC_PATH);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        setIsOnline(true);
        setIsLoading(false);

        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<AppState>;

          // Merge with defaults to ensure all fields exist
          let categories = Array.isArray(data.categories) ? data.categories : DEFAULT_CATEGORIES;

          // Ensure savings category exists
          const hasSavings = categories.some((c: Category) => c.id === 'savings');
          if (!hasSavings) {
            const savingsCat = DEFAULT_CATEGORIES.find(c => c.id === 'savings');
            if (savingsCat) {
              categories = [...categories, savingsCat];
            }
          }

          setState({
            currentMonthId: getCurrentMonthId(),
            configs: data.configs || {},
            categories: categories,
            transactions: Array.isArray(data.transactions) ? data.transactions : [],
            merchantMappings: Array.isArray(data.merchantMappings) ? data.merchantMappings : [],
          });
          hasLoadedOnce.current = true;
        } else if (!hasLoadedOnce.current) {
          // First time AND document doesn't exist - try to restore from localStorage first
          const stored = localStorage.getItem('spokoj-app-backup');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              // Restore from localStorage backup
              const restoredState = {
                currentMonthId: getCurrentMonthId(),
                configs: parsed.configs || {},
                categories: parsed.categories || DEFAULT_CATEGORIES,
                transactions: parsed.transactions || [],
                merchantMappings: parsed.merchantMappings || [],
              };
              setState(restoredState);
              // Save restored data to Firestore
              setDoc(docRef, {
                configs: restoredState.configs,
                categories: restoredState.categories,
                transactions: restoredState.transactions,
                merchantMappings: restoredState.merchantMappings,
              });
              hasLoadedOnce.current = true;
            } catch (e) {
              console.error('Error restoring from localStorage:', e);
              // Only if no backup exists, use defaults
              const defaultState = getDefaultState();
              setState(defaultState);
              setDoc(docRef, {
                configs: defaultState.configs,
                categories: defaultState.categories,
                transactions: defaultState.transactions,
              });
              hasLoadedOnce.current = true;
            }
          } else {
            // No backup, truly first time - use defaults
            const defaultState = getDefaultState();
            setState(defaultState);
            setDoc(docRef, {
              configs: defaultState.configs,
              categories: defaultState.categories,
              transactions: defaultState.transactions,
            });
            hasLoadedOnce.current = true;
          }
        }
      },
      (error) => {
        console.error('Firestore sync error:', error);
        setIsOnline(false);
        setIsLoading(false);

        // Fallback to localStorage if offline - but don't overwrite if we already have data
        if (!hasLoadedOnce.current) {
          try {
            const stored = localStorage.getItem('spokoj-app-backup');
            if (stored) {
              const parsed = JSON.parse(stored);
              setState({
                currentMonthId: getCurrentMonthId(),
                configs: parsed.configs || {},
                categories: parsed.categories || DEFAULT_CATEGORIES,
                transactions: parsed.transactions || [],
              });
            }
          } catch (e) {
            console.error('LocalStorage fallback error:', e);
          }
        }
      }
    );

    return () => unsubscribe();
  }, []); // Empty dependency array - only run once

  // Backup to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('spokoj-app-backup', JSON.stringify({
        configs: state.configs,
        categories: state.categories,
        transactions: state.transactions,
        merchantMappings: state.merchantMappings,
      }));
    }
  }, [state, isLoading]);

  const syncToFirestore = useCallback(async (updates: Partial<AppState>) => {
    const docRef = doc(db, BUDGET_DOC_PATH);
    try {
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        await updateDoc(docRef, updates);
      } else {
        await setDoc(docRef, {
          configs: updates.configs ?? state.configs,
          categories: updates.categories ?? state.categories,
          transactions: updates.transactions ?? state.transactions,
        });
      }
    } catch (error) {
      console.error('Error syncing to Firestore:', error);
      setIsOnline(false);
    }
  }, [state]);

  const getCreateMonthConfig = useCallback((monthId: string): MonthConfig => {
    if (state.configs[monthId]) {
      return state.configs[monthId];
    }
    return {
      id: monthId,
      totalIncome: 15000,
      savingsGoals: [INITIAL_SAVINGS_GOAL],
    };
  }, [state.configs]);

  const updateMonthConfig = useCallback(async (config: MonthConfig) => {
    const newConfigs = {
      ...state.configs,
      [config.id]: config,
    };

    // Optimistic update
    setState(prev => ({
      ...prev,
      configs: newConfigs,
    }));

    // Sync to Firestore
    await syncToFirestore({ configs: newConfigs });
  }, [state.configs, syncToFirestore]);

  const addTransaction = useCallback(async (input: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTx: Transaction = {
      ...input,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const newTransactions = [newTx, ...state.transactions];

    // Optimistic update
    setState(prev => ({
      ...prev,
      transactions: newTransactions,
    }));

    // Sync to Firestore
    await syncToFirestore({ transactions: newTransactions });
  }, [state.transactions, syncToFirestore]);

  const editTransaction = useCallback(async (id: string, updated: Partial<Omit<Transaction, 'id' | 'timestamp'>>) => {
    const newTransactions = state.transactions.map((t) =>
      t.id === id ? { ...t, ...updated } : t
    );

    // Optimistic update
    setState(prev => ({
      ...prev,
      transactions: newTransactions,
    }));

    // Sync to Firestore
    await syncToFirestore({ transactions: newTransactions });
  }, [state.transactions, syncToFirestore]);

  const deleteTransaction = useCallback(async (id: string) => {
    const newTransactions = state.transactions.filter((t) => t.id !== id);

    // Optimistic update
    setState(prev => ({
      ...prev,
      transactions: newTransactions,
    }));

    // Sync to Firestore
    await syncToFirestore({ transactions: newTransactions });
  }, [state.transactions, syncToFirestore]);

  const updateCategoryLimit = useCallback(async (categoryId: string, limit: number) => {
    const newCategories = state.categories.map((c) =>
      c.id === categoryId ? { ...c, limit } : c
    );

    // Optimistic update
    setState(prev => ({
      ...prev,
      categories: newCategories,
    }));

    // Sync to Firestore
    await syncToFirestore({ categories: newCategories });
  }, [state.categories, syncToFirestore]);

  const updateAllCategoryLimits = useCallback(async (limits: Record<string, number>) => {
    const newCategories = state.categories.map((c) => ({
      ...c,
      limit: limits[c.id] !== undefined ? limits[c.id] : c.limit
    }));

    // Optimistic update
    setState(prev => ({
      ...prev,
      categories: newCategories,
    }));

    // Sync to Firestore
    await syncToFirestore({ categories: newCategories });
  }, [state.categories, syncToFirestore]);

  const updateCategory = useCallback(async (categoryId: string, updates: { name?: string; icon?: string }) => {
    const newCategories = state.categories.map((c) =>
      c.id === categoryId ? { ...c, ...updates } : c
    );

    // Optimistic update
    setState(prev => ({
      ...prev,
      categories: newCategories,
    }));

    // Sync to Firestore
    await syncToFirestore({ categories: newCategories });
  }, [state.categories, syncToFirestore]);

  const resetBudget = useCallback(async () => {
    const defaultState = getDefaultState();

    // Optimistic update
    setState(defaultState);

    // Sync to Firestore
    await syncToFirestore({
      configs: defaultState.configs,
      categories: defaultState.categories,
      transactions: defaultState.transactions,
    });

    // Clear localStorage backup
    localStorage.removeItem('spokoj-app-backup');
  }, [syncToFirestore]);

  const addCategory = useCallback(async (name: string, limit: number, icon: string = 'Tag') => {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name,
      limit,
      icon,
      isSystem: false,
    };

    const newCategories = [...state.categories.filter(c => c.id !== 'savings'), newCategory];
    // Keep savings at the end
    const savingsCat = state.categories.find(c => c.id === 'savings');
    if (savingsCat) {
      newCategories.push(savingsCat);
    }

    // Optimistic update
    setState(prev => ({
      ...prev,
      categories: newCategories,
    }));

    // Sync to Firestore
    await syncToFirestore({ categories: newCategories });
  }, [state.categories, syncToFirestore]);

  const deleteCategory = useCallback(async (id: string) => {
    // Don't allow deleting system categories or savings
    const category = state.categories.find(c => c.id === id);
    if (!category || category.isSystem || id === 'savings') {
      return;
    }

    const newCategories = state.categories.filter(c => c.id !== id);

    // Optimistic update
    setState(prev => ({
      ...prev,
      categories: newCategories,
    }));

    // Sync to Firestore
    await syncToFirestore({ categories: newCategories });
  }, [state.categories, syncToFirestore]);

  const addMultipleTransactions = useCallback(async (inputs: Omit<Transaction, 'id' | 'timestamp'>[]) => {
    const newTxs: Transaction[] = inputs.map(input => ({
      ...input,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }));

    const newTransactions = [...newTxs, ...state.transactions];

    // Optimistic update
    setState(prev => ({
      ...prev,
      transactions: newTransactions,
    }));

    // Sync to Firestore
    await syncToFirestore({ transactions: newTransactions });
  }, [state.transactions, syncToFirestore]);

  const saveMerchantMapping = useCallback(async (mapping: MerchantMapping) => {
    const existingMappings = state.merchantMappings || [];

    // Check if pattern already exists, update if so
    const existingIndex = existingMappings.findIndex(
      m => m.pattern.toLowerCase() === mapping.pattern.toLowerCase()
    );

    let newMappings: MerchantMapping[];
    if (existingIndex >= 0) {
      newMappings = [...existingMappings];
      newMappings[existingIndex] = mapping;
    } else {
      newMappings = [...existingMappings, mapping];
    }

    // Optimistic update
    setState(prev => ({
      ...prev,
      merchantMappings: newMappings,
    }));

    // Sync to Firestore
    await syncToFirestore({ merchantMappings: newMappings });
  }, [state.merchantMappings, syncToFirestore]);

  const findCategoryForMerchant = useCallback((merchantName: string): string | null => {
    const mappings = state.merchantMappings || [];
    const lowerMerchant = merchantName.toLowerCase();

    for (const mapping of mappings) {
      if (lowerMerchant.includes(mapping.pattern.toLowerCase())) {
        return mapping.categoryId;
      }
    }
    return null;
  }, [state.merchantMappings]);

  return (
    <BudgetContext.Provider
      value={{
        state,
        isLoading,
        isOnline,
        addTransaction,
        addMultipleTransactions,
        editTransaction,
        deleteTransaction,
        updateMonthConfig,
        updateCategoryLimit,
        updateAllCategoryLimits,
        updateCategory,
        getCreateMonthConfig,
        resetBudget,
        addCategory,
        deleteCategory,
        saveMerchantMapping,
        findCategoryForMerchant,
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
