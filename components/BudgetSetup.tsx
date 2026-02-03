import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBudget } from '../context/BudgetContext';
import { CURRENCY_FORMATTER, getMonthName } from '../constants';
import { ArrowLeft, AlertCircle, Wallet, PiggyBank, ArrowDownCircle, RotateCcw, Plus, Trash2, Pencil, Check } from 'lucide-react';
import { CategoryIcon, IconPicker } from './ui/CategoryIcon';

const BudgetSetup: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateMonthConfig, updateCategoryLimit, updateCategory, getCreateMonthConfig, resetBudget, addCategory, deleteCategory } = useBudget();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryLimit, setNewCategoryLimit] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Tag');
  const [showNewCategoryIconPicker, setShowNewCategoryIconPicker] = useState(false);

  // Edit category state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null);

  // Editing limit state - only for currently edited field
  const [editingLimitId, setEditingLimitId] = useState<string | null>(null);
  const [editingLimitValue, setEditingLimitValue] = useState('');

  // Editing income state
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeValue, setIncomeValue] = useState('');

  const monthId = state.currentMonthId;
  const config = getCreateMonthConfig(monthId);

  const getNumericValue = (val: string): number => {
    return parseInt(val) || 0;
  };

  // Get limit for a category - use editing value if currently editing, otherwise from state
  const getLimitValue = (catId: string): string => {
    if (editingLimitId === catId) {
      return editingLimitValue;
    }
    const cat = state.categories.find(c => c.id === catId);
    return cat ? cat.limit.toString() : '0';
  };

  // Get income - use editing value if currently editing, otherwise from config
  const getIncomeValue = (): string => {
    if (editingIncome) {
      return incomeValue;
    }
    return config.totalIncome.toString();
  };

  // Calculations using actual state values
  const savingsCategoryId = 'savings';

  const calculateExpensesSum = () => {
    return state.categories
      .filter(c => c.id !== savingsCategoryId)
      .reduce((acc, c) => {
        if (editingLimitId === c.id) {
          return acc + getNumericValue(editingLimitValue);
        }
        return acc + c.limit;
      }, 0);
  };

  const calculateSavingsLimit = () => {
    if (editingLimitId === savingsCategoryId) {
      return getNumericValue(editingLimitValue);
    }
    const savingsCat = state.categories.find(c => c.id === savingsCategoryId);
    return savingsCat?.limit || 0;
  };

  const expensesSum = calculateExpensesSum();
  const savingsLimit = calculateSavingsLimit();
  const totalAllocated = expensesSum + savingsLimit;
  const incomeNum = editingIncome ? getNumericValue(incomeValue) : config.totalIncome;
  const unassigned = incomeNum - totalAllocated;
  const potentialSavings = Math.max(0, incomeNum - expensesSum);

  // Handle limit editing
  const handleLimitFocus = (catId: string) => {
    const cat = state.categories.find(c => c.id === catId);
    setEditingLimitId(catId);
    setEditingLimitValue(cat ? cat.limit.toString() : '0');
  };

  const handleLimitChange = (val: string) => {
    if (val === '' || /^\d+$/.test(val)) {
      setEditingLimitValue(val);
    }
  };

  const handleLimitBlur = async (catId: string) => {
    const newLimit = getNumericValue(editingLimitValue);
    const cat = state.categories.find(c => c.id === catId);

    // Only save if value changed
    if (cat && cat.limit !== newLimit) {
      await updateCategoryLimit(catId, newLimit);
    }

    setEditingLimitId(null);
    setEditingLimitValue('');
  };

  // Handle income editing
  const handleIncomeFocus = () => {
    setEditingIncome(true);
    setIncomeValue(config.totalIncome.toString());
  };

  const handleIncomeChange = (val: string) => {
    if (val === '' || /^\d+$/.test(val)) {
      setIncomeValue(val);
    }
  };

  const handleIncomeBlur = async () => {
    const newIncome = getNumericValue(incomeValue);

    // Only save if value changed
    if (config.totalIncome !== newIncome) {
      await updateMonthConfig({
        id: monthId,
        totalIncome: newIncome,
        savingsGoals: config.savingsGoals || []
      });
    }

    setEditingIncome(false);
    setIncomeValue('');
  };

  // Set savings to potential savings
  const handleSetSavingsToPotential = async () => {
    await updateCategoryLimit(savingsCategoryId, potentialSavings);
  };

  const handleReset = async () => {
    await resetBudget();
    setShowResetConfirm(false);
    navigate('/');
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      await addCategory(newCategoryName.trim(), getNumericValue(newCategoryLimit), newCategoryIcon);
      setNewCategoryName('');
      setNewCategoryLimit('');
      setNewCategoryIcon('Tag');
      setShowAddCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
  };

  const handleStartEditName = (catId: string, currentName: string) => {
    setEditingCategoryId(catId);
    setEditingCategoryName(currentName);
  };

  const handleSaveEditName = async (catId: string) => {
    if (editingCategoryName.trim()) {
      await updateCategory(catId, { name: editingCategoryName.trim() });
    }
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleCancelEditName = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleSelectIcon = async (catId: string, icon: string) => {
    await updateCategory(catId, { icon });
    setShowIconPicker(null);
  };

  const regularCategories = state.categories.filter(c => c.id !== savingsCategoryId);
  const savingsCategory = state.categories.find(c => c.id === savingsCategoryId);

  return (
    <div className="min-h-screen bg-white md:bg-neutral-50 md:py-8 flex flex-col items-center">

      {/* Container for Desktop */}
      <div className="w-full md:max-w-5xl md:mx-auto bg-white md:rounded-3xl md:shadow-xl md:border md:border-neutral-100 overflow-hidden flex flex-col h-full md:h-auto">

        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-4 sticky top-0 bg-white z-20 shadow-sm md:shadow-none">
            <button onClick={() => navigate(-1)} className="text-neutral-500 hover:text-neutral-800 transition-colors p-2 -ml-2 rounded-full hover:bg-neutral-50">
                <ArrowLeft size={24} />
            </button>
            <div className="flex-1">
                <h1 className="font-medium text-neutral-800 leading-tight text-lg">Planer Budżetu</h1>
                <p className="text-xs text-neutral-400">{getMonthName(monthId)}</p>
            </div>
            <button
                onClick={() => setShowResetConfirm(true)}
                className="text-rose-500 hover:text-rose-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50 flex items-center gap-2 text-sm font-medium"
            >
                <RotateCcw size={16} />
                <span className="hidden sm:inline">Resetuj</span>
            </button>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                    <h2 className="text-lg font-semibold text-neutral-800 mb-2">Resetuj budżet</h2>
                    <p className="text-sm text-neutral-600 mb-6">
                        Wszystkie dane zostaną usunięte: transakcje, limity kategorii i konfiguracja. Tej operacji nie można cofnąć.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowResetConfirm(false)}
                            className="flex-1 py-2.5 px-4 border border-neutral-200 rounded-xl text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            onClick={handleReset}
                            className="flex-1 py-2.5 px-4 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors"
                        >
                            Resetuj
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Add Category Modal */}
        {showAddCategory && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                    <h2 className="text-lg font-semibold text-neutral-800 mb-4">Nowa kategoria</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-neutral-600 mb-1 block">Ikona</label>
                            <button
                                onClick={() => setShowNewCategoryIconPicker(true)}
                                className="w-full p-3 border border-neutral-200 rounded-xl flex items-center gap-3 hover:bg-neutral-50 transition-colors"
                            >
                                <div className="p-2 bg-neutral-100 rounded-lg">
                                    <CategoryIcon icon={newCategoryIcon} size={20} className="text-neutral-600" />
                                </div>
                                <span className="text-neutral-600">Kliknij aby zmienić</span>
                            </button>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-neutral-600 mb-1 block">Nazwa</label>
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="np. Subskrypcje"
                                className="w-full p-3 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-calm-blue focus:border-transparent"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-neutral-600 mb-1 block">Limit miesięczny</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={newCategoryLimit}
                                onChange={(e) => {
                                    if (e.target.value === '' || /^\d+$/.test(e.target.value)) {
                                        setNewCategoryLimit(e.target.value);
                                    }
                                }}
                                placeholder="0"
                                className="w-full p-3 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-calm-blue focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => {
                                setShowAddCategory(false);
                                setNewCategoryName('');
                                setNewCategoryLimit('');
                                setNewCategoryIcon('Tag');
                            }}
                            className="flex-1 py-2.5 px-4 border border-neutral-200 rounded-xl text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            onClick={handleAddCategory}
                            disabled={!newCategoryName.trim()}
                            className="flex-1 py-2.5 px-4 bg-calm-blue text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            Dodaj
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Icon Picker for New Category */}
        {showNewCategoryIconPicker && (
            <IconPicker
                selectedIcon={newCategoryIcon}
                onSelect={(icon) => setNewCategoryIcon(icon)}
                onClose={() => setShowNewCategoryIconPicker(false)}
            />
        )}

        {/* Icon Picker for Existing Category */}
        {showIconPicker && (
            <IconPicker
                selectedIcon={state.categories.find(c => c.id === showIconPicker)?.icon || 'Tag'}
                onSelect={(icon) => handleSelectIcon(showIconPicker, icon)}
                onClose={() => setShowIconPicker(null)}
            />
        )}

        <div className="flex-1 overflow-y-auto">
            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 md:pb-32">

                {/* LEFT COLUMN: Inputs */}
                <div className="space-y-8">
                    {/* 1. Income */}
                    <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100">
                        <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 mb-3">
                            <Wallet size={18} className="text-calm-blue" />
                            1. Ile zarobimy?
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={getIncomeValue()}
                                onFocus={handleIncomeFocus}
                                onChange={(e) => handleIncomeChange(e.target.value)}
                                onBlur={handleIncomeBlur}
                                className="w-full bg-transparent text-3xl font-bold text-neutral-800 outline-none placeholder-neutral-300"
                                placeholder="0"
                            />
                            <span className="absolute right-0 top-2 text-neutral-400 font-medium text-lg">PLN</span>
                        </div>
                    </div>

                    {/* 2. Regular Expenses */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end px-1">
                            <label className="text-sm font-semibold text-neutral-700">2. Wydatki (Kategorie)</label>
                            <span className="text-xs text-neutral-400">Suma: {CURRENCY_FORMATTER.format(expensesSum)}</span>
                        </div>

                        <div className="space-y-3">
                            {regularCategories.map(cat => (
                                <div key={cat.id} className="flex items-center gap-3 p-4 bg-white border border-neutral-100 rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-calm-blue transition-shadow hover:bg-neutral-50 group">
                                    {/* Icon button */}
                                    <button
                                        onClick={() => setShowIconPicker(cat.id)}
                                        className="p-2 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors flex-shrink-0"
                                        title="Zmień ikonę"
                                    >
                                        <CategoryIcon icon={cat.icon} size={18} className="text-neutral-600" />
                                    </button>

                                    {/* Name - editable */}
                                    <div className="flex-1 min-w-0">
                                        {editingCategoryId === cat.id ? (
                                            <input
                                                type="text"
                                                value={editingCategoryName}
                                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                                onBlur={() => handleSaveEditName(cat.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEditName(cat.id);
                                                    if (e.key === 'Escape') handleCancelEditName();
                                                }}
                                                className="text-sm font-medium text-neutral-700 bg-white border border-calm-blue rounded px-2 py-1 outline-none w-full"
                                                autoFocus
                                            />
                                        ) : (
                                            <button
                                                onClick={() => handleStartEditName(cat.id, cat.name)}
                                                className="text-sm font-medium text-neutral-700 hover:text-calm-blue transition-colors text-left flex items-center gap-1 group/name"
                                            >
                                                <span className="truncate">{cat.name}</span>
                                                <Pencil size={12} className="opacity-0 group-hover/name:opacity-100 transition-opacity flex-shrink-0" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Limit input */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={getLimitValue(cat.id)}
                                            onFocus={() => handleLimitFocus(cat.id)}
                                            onChange={(e) => handleLimitChange(e.target.value)}
                                            onBlur={() => handleLimitBlur(cat.id)}
                                            placeholder="0"
                                            className="w-24 p-2 text-right bg-transparent border-b border-transparent focus:border-calm-blue rounded-none font-medium text-neutral-800 outline-none transition-colors"
                                        />
                                        <span className="text-xs text-neutral-400">zł</span>
                                        {!cat.isSystem && (
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id)}
                                                className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-rose-500 transition-all p-1"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Category Button */}
                        <button
                            onClick={() => setShowAddCategory(true)}
                            className="w-full p-4 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-400 hover:text-calm-blue hover:border-calm-blue transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={18} />
                            Dodaj kategorię
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: Savings & Logic (Sticky on Desktop) */}
                <div className="space-y-8 lg:border-l lg:pl-8 lg:border-dashed lg:border-neutral-200">

                    {/* 3. Savings Section */}
                    {savingsCategory && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <PiggyBank className="text-emerald-500" size={20} />
                                <label className="text-sm font-semibold text-neutral-800">3. Oszczędności</label>
                            </div>

                            {/* Smart Suggestion */}
                            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl mb-4">
                                <p className="text-xs text-emerald-800 mb-1 font-medium">Zostaje (Przychód - Wydatki):</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-2xl font-bold text-emerald-700">{CURRENCY_FORMATTER.format(potentialSavings)}</span>
                                    <button
                                        onClick={handleSetSavingsToPotential}
                                        className="bg-white text-emerald-600 text-xs font-medium px-4 py-2 rounded-lg border border-emerald-200 shadow-sm hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <ArrowDownCircle size={14} />
                                        Przenieś tutaj
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white border-2 border-emerald-100 rounded-xl shadow-sm">
                                <span className="text-sm font-medium text-neutral-800">{savingsCategory.name}</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={getLimitValue(savingsCategoryId)}
                                        onFocus={() => handleLimitFocus(savingsCategoryId)}
                                        onChange={(e) => handleLimitChange(e.target.value)}
                                        onBlur={() => handleLimitBlur(savingsCategoryId)}
                                        placeholder="0"
                                        className="w-28 p-2 text-right bg-emerald-50 rounded-md font-bold text-emerald-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-200 transition-colors"
                                    />
                                    <span className="text-xs text-neutral-400">zł</span>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 leading-relaxed">
                                Aby budżet był "wyzerowany", nadwyżkę przypisujemy do Oszczędności.
                                Traktujemy to jak "zobowiązanie wobec przyszłości".
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Sticky Bottom Balancer - just shows status now */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 md:p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-30 w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-4xl mx-auto">
                {/* Balance Indicator */}
                <div className={`p-3 md:px-6 md:py-4 rounded-xl flex flex-1 justify-between items-center transition-colors ${
                    unassigned === 0 ? 'bg-emerald-600 text-white shadow-emerald-200 shadow-lg' :
                    unassigned > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                    <div className="flex flex-col">
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide opacity-90">
                            {unassigned === 0 ? 'Budżet Zbilansowany' : unassigned > 0 ? 'Do rozdysponowania' : 'Przekroczenie'}
                        </span>
                        <span className="text-lg md:text-2xl font-bold">
                            {unassigned > 0 ? '+' : ''}{CURRENCY_FORMATTER.format(unassigned)}
                        </span>
                    </div>
                    {unassigned === 0 ? <PiggyBank size={24} className="text-emerald-100 md:w-8 md:h-8" /> : <AlertCircle size={20} className="md:w-6 md:h-6" />}
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="w-full md:w-auto md:px-12 py-3.5 md:py-4 bg-neutral-900 text-white rounded-xl font-semibold hover:bg-neutral-800 transition-all flex justify-center items-center gap-2 shadow-lg"
                >
                    <Check size={18} />
                    Gotowe
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetSetup;
