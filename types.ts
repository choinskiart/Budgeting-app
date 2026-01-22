
export interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  date: string; // ISO string YYYY-MM-DD
  note?: string;
  createdBy: 'Artur' | 'Marlena';
  timestamp: number;
}

export interface Category {
  id: string;
  name: string;
  limit: number;
  icon: string; // Lucide icon name
  isSystem?: boolean; // For "Uncategorized" etc.
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number; // For the month
  actualAmount: number; // How much was actually transferred
}

export interface MonthConfig {
  id: string; // format "YYYY-MM"
  totalIncome: number;
  savingsGoals: SavingsGoal[];
  // Logic: Available for Expenses = TotalIncome - Sum(SavingsGoals.targetAmount)
}

export interface AppState {
  currentMonthId: string; // "YYYY-MM"
  configs: Record<string, MonthConfig>; // Keyed by month ID
  categories: Category[];
  transactions: Transaction[];
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Dom i Rachunki', limit: 3000, icon: 'Home' },
  { id: '2', name: 'Jedzenie (Dom)', limit: 2000, icon: 'ShoppingBasket' },
  { id: '3', name: 'Jedzenie (Miasto)', limit: 500, icon: 'Coffee' },
  { id: '4', name: 'Transport', limit: 800, icon: 'Car' },
  { id: '5', name: 'Zdrowie', limit: 300, icon: 'Heart' },
  { id: '6', name: 'Rozrywka', limit: 400, icon: 'Film' },
  { id: '7', name: 'Inne', limit: 200, icon: 'MoreHorizontal' },
  { id: 'savings', name: 'Oszczędności', limit: 0, icon: 'PiggyBank' }, // New System Category
];

export const INITIAL_SAVINGS_GOAL: SavingsGoal = {
  id: 'house-fund',
  name: 'Wykończenie Domu',
  targetAmount: 5000,
  actualAmount: 5000,
};
