import React, { useMemo, useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { CURRENCY_FORMATTER, getMonthName, PERCENTAGE_FORMATTER } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Edit2, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PIE_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#EC4899', '#6366F1'];

function getColorForIndex(id: string) {
  const num = parseInt(id);
  // Fallback if id is not numeric (e.g. UUID)
  if (isNaN(num)) {
     let hash = 0;
     for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
     }
     return PIE_COLORS[Math.abs(hash) % PIE_COLORS.length];
  }
  return PIE_COLORS[num % PIE_COLORS.length];
}

const Statistics: React.FC = () => {
  const { state, getCreateMonthConfig } = useBudget();
  const currentMonthId = state.currentMonthId;
  const config = getCreateMonthConfig(currentMonthId);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'charts' | 'list'>('charts');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // --- Data Preparation ---
  const currentTransactions = useMemo(() => {
    return state.transactions
      .filter(t => t.date.startsWith(currentMonthId))
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest
  }, [state.transactions, currentMonthId]);

  const totalSpent = currentTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = config.totalIncome;
  // Based on Zero-Based Budgeting logic: Savings = Income - Expenses
  const savingsAmount = Math.max(0, totalIncome - totalSpent); 
  const expensesPercent = totalIncome > 0 ? totalSpent / totalIncome : 0;
  const savingsPercent = totalIncome > 0 ? savingsAmount / totalIncome : 0;

  // 1. Category Data for Pie Chart
  const categoryData = useMemo(() => {
    return state.categories.map(cat => {
      const value = currentTransactions
        .filter(t => t.categoryId === cat.id)
        .reduce((acc, t) => acc + t.amount, 0);
      return { name: cat.name, value, color: getColorForIndex(cat.id) };
    }).filter(d => d.value > 0);
  }, [state.categories, currentTransactions]);

  // Filtered List Logic
  const filteredTransactions = useMemo(() => {
    if (filterCategory === 'ALL') {
        return currentTransactions;
    }
    return currentTransactions.filter(t => t.categoryId === filterCategory);
  }, [currentTransactions, filterCategory]);

  // Components for cleaner rendering
  const ChartsSection = () => (
    <div className="space-y-6">
        {/* Savings Rate */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-700 mb-4">Efektywność oszczędzania</h3>
            <div className="flex items-center gap-4 mb-2">
                <div className="flex-1 h-8 bg-neutral-100 rounded-full overflow-hidden flex">
                    <div style={{ width: `${expensesPercent * 100}%` }} className="bg-calm-rose h-full" />
                    <div style={{ width: `${savingsPercent * 100}%` }} className="bg-emerald-500 h-full" />
                </div>
            </div>
            <div className="flex justify-between text-xs font-medium">
                <span className="text-calm-rose">Wydatki: {PERCENTAGE_FORMATTER.format(expensesPercent)}</span>
                <span className="text-emerald-600">Oszczędności: {PERCENTAGE_FORMATTER.format(savingsPercent)}</span>
            </div>
            <p className="text-xs text-neutral-400 mt-3 leading-relaxed">
                W tym miesiącu udało się zachować {CURRENCY_FORMATTER.format(savingsAmount)} z dochodu.
            </p>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 h-96 flex flex-col">
            <h3 className="text-sm font-semibold text-neutral-700 mb-2">Struktura wydatków</h3>
            <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => CURRENCY_FORMATTER.format(val)} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
            </ResponsiveContainer>
            </div>
        </div>
    </div>
  );

  const ListSection = () => (
    <div className="space-y-4 h-full flex flex-col">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
            <button
                onClick={() => setFilterCategory('ALL')}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                    filterCategory === 'ALL'
                        ? 'bg-calm-blue text-white border-calm-blue'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
            >
                Wszystkie
            </button>
            {state.categories.map(cat => (
                    <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                        filterCategory === cat.id
                            ? 'bg-calm-blue text-white border-calm-blue'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                >
                    {cat.name}
                </button>
            ))}
        </div>

        {/* List */}
        <div className="space-y-3 flex-1">
            {filteredTransactions.length === 0 ? (
                <div className="text-center text-neutral-400 py-10 bg-white rounded-2xl border border-neutral-100 border-dashed">
                    <Search className="mx-auto mb-2 opacity-50" size={32} />
                    Brak wydatków dla wybranych kryteriów.
                </div>
            ) : (
                filteredTransactions.map(tx => {
                    const category = state.categories.find(c => c.id === tx.categoryId);
                    return (
                        <div 
                            key={tx.id} 
                            onClick={() => navigate(`/edit/${tx.id}`)}
                            className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm flex justify-between items-center hover:bg-neutral-50 hover:border-calm-blue/30 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 text-neutral-500 group-hover:bg-white group-hover:shadow-sm transition-all`}>
                                    <span className="text-xs font-bold">{category?.name.substring(0,2).toUpperCase()}</span>
                                </div>
                                <div>
                                    <div className="font-medium text-neutral-800">{category?.name}</div>
                                    <div className="text-xs text-neutral-500">
                                        {tx.date} • <span className={`${tx.createdBy === 'Artur' ? 'text-indigo-600' : 'text-rose-500'}`}>{tx.createdBy}</span>
                                        {tx.note && ` • ${tx.note}`}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-neutral-800">{CURRENCY_FORMATTER.format(tx.amount)}</span>
                                <Edit2 size={14} className="text-neutral-300 group-hover:text-calm-blue transition-colors" />
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-neutral-50 md:bg-transparent">
       <div className="p-6 md:p-10 pb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-800">Statystyki</h1>
          <p className="text-neutral-500 mt-1">Analiza finansowa na {getMonthName(currentMonthId)}</p>
       </div>

       {/* Tabs (Mobile Only) */}
       <div className="flex px-6 border-b border-neutral-200 gap-6 md:hidden">
          <button 
            onClick={() => setActiveTab('charts')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'charts' ? 'border-calm-blue text-calm-blue' : 'border-transparent text-neutral-500'}`}
          >
            Wykresy
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'list' ? 'border-calm-blue text-calm-blue' : 'border-transparent text-neutral-500'}`}
          >
            Lista wydatków
          </button>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-y-auto p-6 md:p-10 md:pt-4 space-y-8 pb-32 md:pb-10">
          
          {/* DESKTOP VIEW: Split Screen */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-12 gap-8 items-start">
             <div className="lg:col-span-5 sticky top-4">
                <ChartsSection />
             </div>
             <div className="lg:col-span-7">
                <h3 className="text-lg font-semibold text-neutral-700 mb-4 px-1">Historia operacji</h3>
                <ListSection />
             </div>
          </div>

          {/* MOBILE VIEW: Tabs */}
          <div className="md:hidden">
             {activeTab === 'charts' && <ChartsSection />}
             {activeTab === 'list' && <ListSection />}
          </div>

       </div>
    </div>
  );
};

export default Statistics;