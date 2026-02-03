import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBudget } from '../context/BudgetContext';
import { X, Check, Trash2, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { CategoryIcon } from './ui/CategoryIcon';

const AddTransaction: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { state, addTransaction, editTransaction, deleteTransaction } = useBudget();
  
  // Local state
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>(state.categories[0]?.id || '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partner, setPartner] = useState<'Artur' | 'Marlena'>('Artur');
  
  // Delete confirmation state
  const [isDeleting, setIsDeleting] = useState(false);

  // Load data if editing
  useEffect(() => {
    if (id) {
      const tx = state.transactions.find(t => t.id === id);
      if (tx) {
        if (tx.amount < 0) {
            setType('income');
            setAmount(Math.abs(tx.amount).toString());
        } else {
            setType('expense');
            setAmount(tx.amount.toString());
        }
        setCategoryId(tx.categoryId);
        setNote(tx.note || '');
        setDate(tx.date);
        setPartner(tx.createdBy);
      }
    }
  }, [id, state.transactions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || !categoryId) return;

    const finalAmount = type === 'expense' ? Number(amount) : -Number(amount);

    const txData = {
        amount: finalAmount,
        categoryId,
        date,
        note,
        createdBy: partner,
    };

    if (id) {
      editTransaction(id, txData);
    } else {
      addTransaction(txData);
    }
    
    navigate('/');
  };

  const handleConfirmDelete = () => {
    if (id) {
      deleteTransaction(id);
      navigate('/');
    }
  };

  const getIncomeDescription = () => {
    if (categoryId === 'savings') {
        return 'Wypłata środków z konta oszczędnościowego na bieżące wydatki.';
    }
    return 'Zwrot kosztów (np. za zakupy) lub dodatkowy wpływ, który "zeruje" wydatki w tej kategorii.';
  };

  return (
    <div className="min-h-screen md:min-h-full bg-white md:bg-transparent flex flex-col justify-center animate-fade-in p-0 md:p-8">
      
      {/* CARD WRAPPER FOR DESKTOP */}
      <div className="flex-1 md:flex-none flex flex-col md:max-w-xl md:mx-auto md:w-full md:bg-white md:rounded-3xl md:shadow-xl md:border md:border-neutral-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center sticky top-0 bg-white z-10">
            <button 
            type="button"
            onClick={() => navigate('/')} 
            className="p-2 -ml-2 text-neutral-500 hover:text-neutral-800 rounded-full hover:bg-neutral-50 transition-colors"
            >
            <X size={24} />
            </button>
            <h1 className="font-medium text-neutral-800">{id ? 'Edytuj wpis' : 'Nowy wpis'}</h1>
            
            {id && !isDeleting && (
            <button 
                type="button"
                onClick={() => setIsDeleting(true)}
                className="p-2 text-rose-500 hover:text-rose-700 rounded-full hover:bg-rose-50 transition-colors"
            >
                <Trash2 size={24} />
            </button>
            )}
            {(!id || isDeleting) && <div className="w-8" />}
        </div>

        {/* Delete Confirmation Overlay */}
        {isDeleting && (
            <div className="mx-6 mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl flex flex-col gap-3 animate-fade-in">
                <div className="flex items-center gap-2 text-rose-800 font-medium">
                    <AlertCircle size={20} />
                    <span>Usunąć ten wpis?</span>
                </div>
                <div className="flex gap-2">
                    <button 
                        type="button"
                        onClick={() => setIsDeleting(false)}
                        className="flex-1 py-2 bg-white border border-rose-200 text-rose-700 rounded-lg font-medium hover:bg-rose-50"
                    >
                        Anuluj
                    </button>
                    <button 
                        type="button"
                        onClick={handleConfirmDelete}
                        className="flex-1 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 shadow-sm"
                    >
                        Usuń
                    </button>
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
            
            {/* Type Toggle */}
            <div className="bg-neutral-100 p-1 rounded-xl flex gap-1 relative">
                <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all ${
                        type === 'expense' 
                        ? 'bg-white text-neutral-800 shadow-sm' 
                        : 'text-neutral-400 hover:text-neutral-600'
                    }`}
                >
                    <ArrowRight size={14} className={type === 'expense' ? 'text-calm-blue' : ''} />
                    Wydatek
                </button>
                <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all ${
                        type === 'income' 
                        ? 'bg-white text-emerald-700 shadow-sm' 
                        : 'text-neutral-400 hover:text-neutral-600'
                    }`}
                >
                    <ArrowLeft size={14} className={type === 'income' ? 'text-emerald-500' : ''} />
                    Zwrot / Wpływ
                </button>
            </div>

            {/* Amount Input */}
            <div className="flex flex-col items-center gap-2 py-4">
                <div className="relative w-full text-center">
                    <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        autoFocus={!id}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`w-full text-center text-5xl font-bold placeholder-neutral-200 outline-none bg-transparent transition-colors ${
                            type === 'income' ? 'text-emerald-600' : 'text-neutral-800'
                        }`}
                    />
                    <span className="text-xl text-neutral-400 absolute top-2 right-4 md:right-12">PLN</span>
                </div>
                {type === 'income' && (
                    <p className="text-xs text-emerald-600 font-medium text-center px-4">
                        {getIncomeDescription()}
                    </p>
                )}
            </div>

            {/* Category Selection */}
            <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Kategoria</label>
            <div className="grid grid-cols-2 gap-2">
                {state.categories.map(cat => (
                <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all text-left flex items-center gap-2 ${
                    categoryId === cat.id
                        ? type === 'income' ? 'bg-emerald-500 text-white shadow-md' : 'bg-calm-blue text-white shadow-md'
                        : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                    }`}
                >
                    <CategoryIcon icon={cat.icon} size={16} />
                    {cat.name}
                </button>
                ))}
            </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Notatka</label>
                    <input 
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={type === 'income' ? "Np. Zwrot za paliwo" : "Np. Lunch z zespołem"}
                        className="w-full p-3 bg-neutral-50 rounded-lg text-neutral-800 outline-none focus:ring-1 focus:ring-calm-blue"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Data</label>
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-3 bg-neutral-50 rounded-lg text-neutral-800 outline-none focus:ring-1 focus:ring-calm-blue"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Kto</label>
                        <select
                            value={partner}
                            onChange={(e) => setPartner(e.target.value as any)}
                            className="w-full p-3 bg-neutral-50 rounded-lg text-neutral-800 outline-none focus:ring-1 focus:ring-calm-blue appearance-none"
                        >
                            <option value="Artur">Artur</option>
                            <option value="Marlena">Marlena</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex-1 md:flex-none md:pt-4" />

            <button
                type="submit"
                disabled={!amount || !categoryId || isDeleting}
                className={`w-full py-4 text-white rounded-xl font-semibold shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:shadow-none ${
                    type === 'income' 
                    ? 'bg-emerald-500 shadow-emerald-200 hover:bg-emerald-600' 
                    : 'bg-calm-blue shadow-indigo-200 hover:bg-indigo-700'
                }`}
            >
                <Check size={20} />
                {id ? 'Zapisz Zmiany' : type === 'income' ? 'Zapisz Zwrot / Wpływ' : 'Dodaj Wydatek'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;