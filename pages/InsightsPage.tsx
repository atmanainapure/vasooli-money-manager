import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useData } from '../context/DataContext';
import { Category, Expense, SplitMethod } from '../types';

const COLORS: Record<string, string> = {
    [Category.SELF]: '#a78bfa', // Violet
    [Category.RENT]: '#f87171', // Red
    [Category.TRAVEL]: '#60a5fa', // Blue
    [Category.FOOD]: '#34d399', // Emerald
    [Category.BOOZE]: '#fb923c', // Orange
    [Category.SHOPPING]: '#ec4899', // Pink
    [Category.QUICK_DELIVERY]: '#facc15', // Yellow
    [Category.OTHER]: '#9ca3af', // Gray
};

type TimeFilter = 'this_month' | 'last_month' | 'all_time';

const InsightsPage: React.FC = () => {
  const { currentUser, groups, loading } = useData();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this_month');

  if (loading) return <div className="p-4 text-center">Loading insights...</div>;
  if (!currentUser) return <div className="p-4 text-center">Please log in to see your insights.</div>;

  const filteredUserExpenses = useMemo(() => {
    if (!currentUser || !groups) return [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonthDate = new Date();
    lastMonthDate.setMonth(now.getMonth() - 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    const allExpenses = groups
      .flatMap(g => g.transactions)
      .filter((tx): tx is Expense => 'paidById' in tx);

    const timeFilteredExpenses = allExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      if (timeFilter === 'this_month') {
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      }
      if (timeFilter === 'last_month') {
        return expenseDate.getMonth() === lastMonth && expenseDate.getFullYear() === lastMonthYear;
      }
      return true; // all_time
    });

    return timeFilteredExpenses
      .filter(tx => tx.splitBetween.includes(currentUser.id))
      .map(tx => {
        let userShare = 0;
        if (tx.splitMethod === SplitMethod.SHARES && tx.splitShares) {
            const totalShares = Object.values(tx.splitShares).reduce((sum, share) => sum + share, 0);
            if (totalShares > 0) {
                const memberShares = tx.splitShares?.[currentUser.id] || 0;
                userShare = (tx.amount / totalShares) * memberShares;
            }
        } else { // Default to EQUAL split
            if (tx.splitBetween.length > 0) {
                userShare = tx.amount / tx.splitBetween.length;
            }
        }
        return { ...tx, amount: userShare };
      });
  }, [groups, currentUser, timeFilter]);


  const dataByCategory = filteredUserExpenses.reduce((acc, expense) => {
    const category = expense.category;
    if (!acc[category]) {
      acc[category] = { name: category, value: 0 };
    }
    acc[category].value += expense.amount;
    return acc;
  }, {} as Record<Category, { name: Category; value: number }>);

  const chartData = Object.values(dataByCategory).filter(item => item.value > 0);
  const totalSpent = chartData.reduce((sum, item) => sum + item.value, 0);
  const periodText = timeFilter === 'this_month' ? 'This Month' : timeFilter === 'last_month' ? 'Last Month' : 'All Time';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-700 p-2 border border-slate-600 rounded-md shadow-lg">
          <p className="label text-white">{`${payload[0].name} : ₹${payload[0].value.toFixed(2)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4">
      <header className="mb-6 pt-4">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">Insights</h1>
        <p className="text-slate-400">Your Spending Summary</p>
      </header>

      <div className="flex justify-center mb-6 bg-slate-800 p-1 rounded-lg border border-slate-700 w-full max-w-xs mx-auto">
        <button
          onClick={() => setTimeFilter('this_month')}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none transition-colors ${timeFilter === 'this_month' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
        >
          This Month
        </button>
        <button
          onClick={() => setTimeFilter('last_month')}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none transition-colors ${timeFilter === 'last_month' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
        >
          Last Month
        </button>
        <button
          onClick={() => setTimeFilter('all_time')}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none transition-colors ${timeFilter === 'all_time' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
        >
          All Time
        </button>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg shadow border border-slate-700">
        <h2 className="text-xl font-semibold text-center mb-2 text-white">Total Share ({periodText}): ₹{totalSpent.toFixed(2)}</h2>
        
        {chartData.length > 0 ? (
            <>
                <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        paddingAngle={5}
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                        {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as Category]} stroke={COLORS[entry.name as Category]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
                </div>

                <div className="mt-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Spending Breakdown</h3>
                    <ul className="space-y-3">
                        {chartData.sort((a,b) => b.value - a.value).map((entry, index) => (
                        <li key={`item-${index}`} className="flex items-center justify-between p-3 bg-slate-700 rounded-md">
                            <div className="flex items-center">
                            <span className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: COLORS[entry.name as Category] }}></span>
                            <span className="font-medium text-slate-300">{entry.name}</span>
                            </div>
                            <div className="text-right">
                            <p className="font-semibold text-white">₹{entry.value.toFixed(2)}</p>
                            <p className="text-sm text-slate-400">
                                {totalSpent > 0 ? ((entry.value / totalSpent) * 100).toFixed(1) : 0}%
                            </p>
                            </div>
                        </li>
                        ))}
                    </ul>
                </div>
            </>
        ) : (
            <p className="text-center text-slate-400 py-10">No spending data for this period.</p>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;