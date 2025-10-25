import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useData } from '../context/DataContext';
import { Category, Expense } from '../types';

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

const InsightsPage: React.FC = () => {
  const { currentUser, groups, loading } = useData();

  if (loading) return <div className="p-4 text-center">Loading insights...</div>;
  if (!currentUser) return <div className="p-4 text-center">Please log in to see your insights.</div>;

  const userExpenses: Expense[] = groups
    .flatMap(g => g.transactions)
    .filter((tx): tx is Expense => 'paidById' in tx && tx.splitBetween.includes(currentUser.id))
    .map(tx => {
        // This is a simplification; a proper share calculation would consider split method
        const share = tx.amount / tx.splitBetween.length;
        return { ...tx, amount: share };
    });


  const dataByCategory = userExpenses.reduce((acc, expense) => {
    const category = expense.category;
    if (!acc[category]) {
      acc[category] = { name: category, value: 0 };
    }
    acc[category].value += expense.amount;
    return acc;
  }, {} as Record<Category, { name: Category; value: number }>);

  const chartData = Object.values(dataByCategory).filter(item => item.value > 0);
  const totalSpent = chartData.reduce((sum, item) => sum + item.value, 0);

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

      <div className="bg-slate-800 p-4 rounded-lg shadow border border-slate-700">
        <h2 className="text-xl font-semibold text-center mb-2 text-white">Total Share: ₹{totalSpent.toFixed(2)}</h2>
        
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
            <p className="text-center text-slate-400 py-10">No spending data to display.</p>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;