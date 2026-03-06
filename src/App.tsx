import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Wallet, 
  TrendingDown, 
  Calendar, 
  Utensils, 
  Car, 
  Gamepad2, 
  ShoppingBag, 
  HeartPulse, 
  MoreHorizontal,
  X,
  Mail,
  RefreshCw,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, Category, CATEGORIES } from './types';

const CategoryIcon = ({ category, className, size = 20 }: { category: Category; className?: string; size?: number }) => {
  switch (category) {
    case 'Makanan': return <Utensils className={className} size={size} />;
    case 'Transportasi': return <Car className={className} size={size} />;
    case 'Hiburan': return <Gamepad2 className={className} size={size} />;
    case 'Belanja': return <ShoppingBag className={className} size={size} />;
    case 'Kesehatan': return <HeartPulse className={className} size={size} />;
    default: return <MoreHorizontal className={className} size={size} />;
  }
};

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<number>(() => {
    const saved = localStorage.getItem('sakubiru_budget');
    return saved ? Number(saved) : 2000000;
  });
  const [whatsappNumber, setWhatsappNumber] = useState<string>(() => {
    return localStorage.getItem('sakubiru_wa') || '';
  });
  const [autoWA, setAutoWA] = useState<boolean>(() => {
    return localStorage.getItem('sakubiru_autowa') === 'true';
  });
  
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingBudget, setIsSettingBudget] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'warning' | 'success' } | null>(null);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: 'Makanan',
    date: new Date().toISOString().split('T')[0],
  });

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      setExpenses(data);
    } catch (err) {
      console.error("Failed to fetch expenses", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    localStorage.setItem('sakubiru_budget', budget.toString());
  }, [budget]);

  useEffect(() => {
    localStorage.setItem('sakubiru_wa', whatsappNumber);
  }, [whatsappNumber]);

  useEffect(() => {
    localStorage.setItem('sakubiru_autowa', autoWA.toString());
  }, [autoWA]);

  const currentMonthSpending = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  const showNotification = (message: string, type: 'warning' | 'success' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const sendWhatsApp = (message: string) => {
    if (!whatsappNumber) return;
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const finalNumber = cleanNumber.startsWith('0') ? '62' + cleanNumber.slice(1) : cleanNumber;
    const url = `https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.description) return;

    const amount = Number(newExpense.amount);
    const expense: Expense = {
      id: window.crypto?.randomUUID?.() || Math.random().toString(36).substring(2, 15),
      amount: amount,
      description: newExpense.description,
      category: newExpense.category as Category,
      date: newExpense.date || new Date().toISOString().split('T')[0],
    };

    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense),
      });

      const newSpending = currentMonthSpending + amount;
      if (budget > 0 && newSpending > budget) {
        const msg = `Alert! Your spending this month (${formatCurrency(newSpending)}) has exceeded your budget (${formatCurrency(budget)})!`;
        showNotification(msg, 'warning');
        if (autoWA) {
          sendWhatsApp(msg);
        }
      } else {
        showNotification('Transaction saved successfully');
      }

      fetchExpenses();
      setIsAdding(false);
      setNewExpense({
        category: 'Makanan',
        date: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      showNotification('Failed to save transaction', 'warning');
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      fetchExpenses();
    } catch (err) {
      showNotification('Failed to delete transaction', 'warning');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md p-4 rounded-2xl shadow-xl flex items-center gap-3 border ${
              notification.type === 'warning' 
                ? 'bg-amber-50 border-amber-200 text-amber-800' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              notification.type === 'warning' ? 'bg-amber-200' : 'bg-emerald-200'
            }`}>
              {notification.type === 'warning' ? <Bell size={16} /> : <Plus size={16} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium leading-tight">{notification.message}</p>
              {notification.type === 'warning' && whatsappNumber && !autoWA && (
                <button 
                  onClick={() => sendWhatsApp(notification.message)}
                  className="mt-2 text-xs font-bold bg-amber-200 px-3 py-1 rounded-full hover:bg-amber-300 transition-colors"
                >
                  Send to WhatsApp
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="glass-dark text-white pt-12 pb-24 px-6 rounded-b-[2.5rem]">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">BlueWallet</h1>
              <p className="text-blue-100 text-sm">Manage your finances wisely</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={fetchExpenses}
                className="w-10 h-10 bg-blue-500/30 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-blue-500/50 transition-colors"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <button 
                onClick={() => setIsSettingBudget(true)}
                className="w-10 h-10 bg-blue-500/30 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-blue-500/50 transition-colors"
              >
                <Wallet size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Spending This Month</p>
              <div className="flex justify-between items-end">
                <h2 className="text-4xl font-bold">{formatCurrency(currentMonthSpending)}</h2>
                <p className="text-blue-100 text-sm opacity-80 mb-1">/ {formatCurrency(budget)}</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 bg-blue-900/20 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((currentMonthSpending / budget) * 100, 100)}%` }}
                  className={`h-full transition-colors ${
                    currentMonthSpending > budget ? 'bg-red-400' : 'bg-white'
                  }`}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-blue-200">
                <span>0%</span>
                <span>{Math.round((currentMonthSpending / budget) * 100)}% Used</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 -mt-10">
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <TrendingDown size={16} />
                <span className="text-xs font-semibold uppercase tracking-tight">Transactions</span>
              </div>
              <p className="text-xl font-bold">{expenses.length}</p>
            </div>
            <div className="glass p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Calendar size={16} />
                <span className="text-xs font-semibold uppercase tracking-tight">Month</span>
              </div>
              <p className="text-xl font-bold">{new Date().toLocaleString('en-US', { month: 'short' })}</p>
            </div>
          </div>

          {/* BCA Integration Banner */}
          <div className="glass bg-blue-50/30 p-4 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0">
              <Mail size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-blue-900">BCA Email Integration</h4>
              <p className="text-xs text-blue-700">Forward your BCA transaction emails to our webhook for auto-input.</p>
            </div>
          </div>

          {/* List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Transaction History</h3>
              <button className="text-blue-600 text-sm font-semibold hover:underline">View All</button>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {isLoading ? (
                  <div className="text-center py-12 text-slate-400">
                    <RefreshCw className="animate-spin mx-auto mb-2" />
                    <p>Loading transactions...</p>
                  </div>
                ) : expenses.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-slate-400"
                  >
                    <p>No transactions recorded yet.</p>
                  </motion.div>
                ) : (
                  expenses.map((expense) => (
                    <motion.div
                      key={expense.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="glass p-4 rounded-2xl flex items-center gap-4 group"
                    >
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                        <CategoryIcon category={expense.category} size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800 truncate">{expense.description}</h4>
                          {(expense as any).source === 'email' && (
                            <span className="bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase">Auto</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{expense.category} • {new Date(expense.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="font-bold text-slate-900">-{formatCurrency(expense.amount).replace('Rp', '')}</p>
                        <button 
                          onClick={() => deleteExpense(expense.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsAdding(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-300 flex items-center justify-center hover:bg-blue-700 transition-all active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 glass-modal rounded-t-[2.5rem] p-8 z-50 max-w-md mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Add Expense</h3>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount (IDR)</label>
                  <input 
                    autoFocus
                    type="number" 
                    placeholder="0"
                    required
                    className="w-full text-3xl font-bold text-blue-600 border-none focus:ring-0 p-0 placeholder:text-blue-100"
                    value={newExpense.amount || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                  <input 
                    type="text" 
                    placeholder="What did you buy?"
                    required
                    className="w-full bg-white/50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={newExpense.description || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewExpense({ ...newExpense, category: cat })}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 border ${
                          newExpense.category === cat 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <CategoryIcon category={cat} size={16} />
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-white/50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  Save Transaction
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Budget Modal */}
      <AnimatePresence>
        {isSettingBudget && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingBudget(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 glass-modal rounded-t-[2.5rem] p-8 z-50 max-w-md mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Settings</h3>
                <button onClick={() => setIsSettingBudget(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Budget (IDR)</label>
                  <input 
                    autoFocus
                    type="number" 
                    placeholder="0"
                    className="w-full text-3xl font-bold text-blue-600 border-none focus:ring-0 p-0 placeholder:text-blue-100"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp Number</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. 08123456789"
                    className="w-full bg-white/50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Auto-open WhatsApp</h4>
                    <p className="text-[10px] text-slate-500">Automatically open WA when budget is exceeded.</p>
                  </div>
                  <button 
                    onClick={() => setAutoWA(!autoWA)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${autoWA ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <motion.div 
                      animate={{ x: autoWA ? 26 : 2 }}
                      className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                <button 
                  onClick={() => {
                    setIsSettingBudget(false);
                    showNotification('Settings updated successfully');
                  }}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
