import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { Expense, SplitMethod, NotificationPreferences } from '../types';

const Toggle: React.FC<{
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ label, description, enabled, onChange }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
      <div>
        <h4 className="font-medium text-slate-200">{label}</h4>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
      </label>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { currentUser, updateUserLimit, updateNotificationPreferences, groups } = useData();
  const [limit, setLimit] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (currentUser?.monthlyLimit !== undefined) {
      setLimit(currentUser.monthlyLimit.toString());
    } else {
      setLimit('');
    }
  }, [currentUser]);

  const monthlySpending = useMemo(() => {
    if (!currentUser || !groups) return 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let totalSpent = 0;

    groups.forEach(group => {
        group.transactions.forEach(tx => {
            if (!('paidById' in tx)) return;
            const expense = tx as Expense;
            if (!expense.splitBetween.includes(currentUser.id)) return;
            const expenseDate = new Date(expense.date);
            if (expenseDate.getMonth() !== currentMonth || expenseDate.getFullYear() !== currentYear) return;

            let userShare = 0;
            if (expense.splitMethod === SplitMethod.SHARES && expense.splitShares) {
                const totalShares = Object.values(expense.splitShares).reduce((sum, share) => sum + share, 0);
                if (totalShares > 0) {
                    const memberShares = expense.splitShares[currentUser.id] || 0;
                    userShare = (expense.amount / totalShares) * memberShares;
                }
            } else {
                if (expense.splitBetween.length > 0) {
                    userShare = expense.amount / expense.splitBetween.length;
                }
            }
            totalSpent += userShare;
        });
    });

    return totalSpent;
  }, [currentUser, groups]);

  const notificationPrefs = useMemo(() => ({
    onAddedToTransaction: true,
    onGroupExpenseAdded: true,
    onSettlement: true,
    ...(currentUser?.notificationPreferences || {}),
  }), [currentUser?.notificationPreferences]);

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    if (currentUser) {
      updateNotificationPreferences(currentUser.id, { [key]: value });
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };
  
  const handleLimitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
        const numericLimit = parseFloat(limit);
        if (!isNaN(numericLimit) && numericLimit >= 0) {
            await updateUserLimit(currentUser.id, numericLimit);
            setIsEditing(false);
        } else {
            alert("Please enter a valid non-negative number.");
        }
    }
  };

  if (!currentUser) {
    return <div className="p-4 text-center">Loading profile...</div>;
  }
  
  const inputClass = "mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-slate-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500";
  
  const hasLimit = currentUser.monthlyLimit !== undefined && currentUser.monthlyLimit > 0;
  const percentage = hasLimit ? Math.min((monthlySpending / currentUser.monthlyLimit!) * 100, 100) : 0;
  const isOverLimit = hasLimit && monthlySpending > currentUser.monthlyLimit!;
  
  let progressColor = 'bg-cyan-500';
  if (isOverLimit || percentage > 80) {
      progressColor = 'bg-rose-500';
  } else if (percentage > 50) {
      progressColor = 'bg-amber-500';
  }

  return (
    <div className="p-4 pb-20">
        <div className="w-full max-w-sm mx-auto bg-slate-800 border border-slate-700 rounded-lg shadow-md p-6">
            <div className="text-center">
                <img 
                    className="w-24 h-24 mb-3 rounded-full shadow-lg mx-auto ring-4 ring-slate-700" 
                    src={currentUser.avatarUrl} 
                    alt={`${currentUser.name}'s avatar`}
                />
                <h5 className="mb-1 text-xl font-medium text-white">{currentUser.name}</h5>
                <span className="text-sm text-slate-400">{currentUser.email}</span>
            </div>
            
            {hasLimit && (
                 <div className="mt-6 border-t border-slate-700 pt-6">
                    <h6 className="font-semibold text-white mb-2">Monthly Spending Progress</h6>
                    <div className="flex justify-between text-sm text-slate-400 mb-1">
                        <span>₹{monthlySpending.toFixed(2)}</span>
                        <span>₹{currentUser.monthlyLimit!.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5">
                        <div className={`${progressColor} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                    </div>
                    {isOverLimit && (
                        <p className="text-center text-sm text-rose-400 mt-2 font-medium">
                            Warning: You've exceeded your monthly limit!
                        </p>
                    )}
                </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-700">
                <h6 className="font-semibold text-white mb-3">Monthly Spending Limit</h6>
                {isEditing ? (
                     <form onSubmit={handleLimitUpdate} className="space-y-3">
                         <div>
                            <label htmlFor="limit" className="sr-only">Monthly Limit</label>
                            <input
                                type="number"
                                id="limit"
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                                className={inputClass}
                                placeholder="e.g., 5000"
                            />
                         </div>
                         <div className="flex space-x-2">
                            <button type="submit" className="w-full text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-500/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center">Save</button>
                            <button type="button" onClick={() => setIsEditing(false)} className="w-full text-white bg-slate-600 hover:bg-slate-700 focus:ring-4 focus:outline-none focus:ring-slate-500/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center">Cancel</button>
                         </div>
                     </form>
                ) : (
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <span className="text-2xl font-bold text-white">₹{currentUser.monthlyLimit?.toFixed(2) || 'Not set'}</span>
                        <button onClick={() => setIsEditing(true)} className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">Edit</button>
                    </div>
                )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-700">
                <h6 className="font-semibold text-white mb-3">Notification Preferences</h6>
                <div className="space-y-3">
                    <Toggle 
                        label="New Expense"
                        description="When you're added to an expense"
                        enabled={notificationPrefs.onAddedToTransaction}
                        onChange={(value) => handlePreferenceChange('onAddedToTransaction', value)}
                    />
                    <Toggle 
                        label="Group Activity"
                        description="When an expense is added in your groups"
                        enabled={notificationPrefs.onGroupExpenseAdded}
                        onChange={(value) => handlePreferenceChange('onGroupExpenseAdded', value)}
                    />
                     <Toggle 
                        label="Settlements"
                        description="When a settlement is recorded in your groups"
                        enabled={notificationPrefs.onSettlement}
                        onChange={(value) => handlePreferenceChange('onSettlement', value)}
                    />
                </div>
            </div>

            <div className="flex mt-6 pt-6 border-t border-slate-700">
                <button onClick={handleSignOut} className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-center text-white bg-rose-600/80 border border-rose-600 rounded-lg hover:bg-rose-600 focus:ring-4 focus:outline-none focus:ring-rose-500/50">
                    Sign Out
                </button>
            </div>

            <div className="text-center text-slate-500 text-sm mt-8 pt-6 border-t border-slate-700">
                <p>Made with ❤️</p>
                <p>Atman.AInapure</p>
            </div>
        </div>
    </div>
  );
};

export default ProfilePage;