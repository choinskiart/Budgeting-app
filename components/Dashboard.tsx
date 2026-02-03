import React, { useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { CURRENCY_FORMATTER, getMonthName, PERCENTAGE_FORMATTER } from '../constants';
import { ProgressBar } from './ui/ProgressBar';
import { Link } from 'react-router-dom';
import { Settings, PiggyBank, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { CategoryIcon } from './ui/CategoryIcon';

const Dashboard: React.FC = () => {
  const { state, isLoading, isOnline } = useBudget();
  const currentMonthId = state.currentMonthId;

  // Filter transactions for current month
  const currentTransactions = useMemo(() => {
    return state.transactions.filter(t => t.date.startsWith(currentMonthId));
  }, [state.transactions, currentMonthId]);

  // Total Budget = Sum of all Category Limits
  const totalBudget = useMemo(() => {
    return state.categories.reduce((acc, cat) => acc + cat.limit, 0);
  }, [state.categories]);

  // Total Spent (Includes transfers to Savings!)
  const totalSpent = currentTransactions.reduce((acc, t) => acc + t.amount, 0);
  
  // Remaining to allocate/spend
  const remaining = totalBudget - totalSpent;
  const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) : 0;

  // Category Breakdown
  const categoryStats = useMemo(() => {
    return state.categories.map(cat => {
      const spent = currentTransactions
        .filter(t => t.categoryId === cat.id)
        .reduce((acc, t) => acc + t.amount, 0);
      return {
        ...cat,
        spent,
        remaining: cat.limit - spent,
        percent: cat.limit > 0 ? spent / cat.limit : 0,
        isSavings: cat.id === 'savings'
      };
    }).sort((a, b) => {
        // Savings at the bottom, then sorted by percent used desc
        if (a.isSavings) return 1;
        if (b.isSavings) return -1;
        return b.percent - a.percent;
    });
  }, [state.categories, currentTransactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-calm-blue" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8 animate-fade-in max-w-6xl mx-auto w-full pb-24 md:pb-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 tracking-tight">Twój Spokój</h1>
            {isOnline ? (
              <Wifi size={16} className="text-emerald-500" />
            ) : (
              <WifiOff size={16} className="text-neutral-400" />
            )}
          </div>
          <p className="text-sm md:text-base text-neutral-500 capitalize mt-1">{getMonthName(currentMonthId)}</p>
        </div>
        <Link 
            to="/setup" 
            className="p-2 md:px-4 md:py-2 md:bg-white md:border md:border-neutral-200 md:rounded-lg md:shadow-sm text-neutral-400 md:text-neutral-600 hover:text-neutral-800 transition-all flex items-center gap-2"
        >
          <Settings size={24} strokeWidth={1.5} className="md:w-5 md:h-5" />
          <span className="hidden md:inline text-sm font-medium">Ustawienia Budżetu</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Summary Card (Desktop: Col 1-5) */}
          <div className="lg:col-span-5 lg:sticky lg:top-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 flex flex-col items-center text-center space-y-6">
                <div>
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                     Środki do wydania
                  </span>
                  <div className={`text-4xl md:text-5xl font-bold mt-2 ${remaining < 0 ? 'text-calm-rose' : 'text-neutral-800'}`}>
                    {CURRENCY_FORMATTER.format(remaining)}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2">
                     (W budżecie: {CURRENCY_FORMATTER.format(totalBudget)})
                  </p>
                </div>

                <div className="w-full text-left space-y-2 bg-neutral-50 p-4 rounded-xl">
                   <div className="flex justify-between text-xs text-neutral-500 font-medium">
                     <span>Postęp miesiąca</span>
                     <span>{PERCENTAGE_FORMATTER.format(percentUsed)}</span>
                   </div>
                   <ProgressBar current={totalSpent} max={totalBudget} />
                </div>
              </div>
          </div>

          {/* RIGHT COLUMN: Categories (Desktop: Col 6-12) */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-lg font-medium text-neutral-700 px-1">Realizacja Planu</h2>
            <div className="grid gap-3 sm:grid-cols-1">
              {categoryStats.map(cat => (
                <div 
                    key={cat.id} 
                    className={`p-4 rounded-xl border shadow-sm flex flex-col gap-2 transition-all hover:shadow-md ${
                        cat.isSavings 
                        ? 'bg-emerald-50 border-emerald-100' 
                        : 'bg-white border-neutral-100'
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${cat.isSavings ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-500'}`}>
                            {cat.isSavings ? <PiggyBank size={18} /> : <CategoryIcon icon={cat.icon} size={18} />}
                        </div>
                        <span className={`font-medium ${cat.isSavings ? 'text-emerald-800' : 'text-neutral-700'}`}>
                            {cat.name}
                        </span>
                    </div>
                    
                    {cat.isSavings ? (
                        <span className="text-sm font-medium text-emerald-600 text-right">
                            {cat.remaining > 0 ? `Do przelania: ${CURRENCY_FORMATTER.format(cat.remaining)}` : 'Cel osiągnięty!'}
                        </span>
                    ) : (
                        <span className={`text-sm font-medium text-right ${cat.remaining < 0 ? 'text-calm-rose' : 'text-neutral-600'}`}>
                            {cat.remaining < 0 ? 'Przekroczono o ' : 'Zostało '}
                            {CURRENCY_FORMATTER.format(Math.abs(cat.remaining))}
                        </span>
                    )}
                  </div>
                  
                  <div className="pl-12">
                     <ProgressBar current={cat.spent} max={cat.limit} />
                     <div className="flex justify-between text-xs text-neutral-400 mt-1.5">
                        <span>Plan: {CURRENCY_FORMATTER.format(cat.limit)}</span>
                        <span>
                            {cat.isSavings ? 'Przelano' : 'Wydano'}: {CURRENCY_FORMATTER.format(cat.spent)}
                        </span>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;