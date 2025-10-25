import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { calculateGlobalBalances } from '../utils/calculations';
import { User } from '../types';

const BalanceRow: React.FC<{ user: User; amount: number }> = ({ user, amount }) => {
    const isOwedToUser = amount > 0;
    const isOwedByUser = amount < 0;

    let text, colorClass, amountText;

    if (isOwedToUser) {
        text = <><span className="font-semibold">{user.name}</span> owes you</>;
        colorClass = 'text-green-400';
        amountText = `₹${Math.abs(amount).toFixed(2)}`;
    } else if (isOwedByUser) {
        text = <>You owe <span className="font-semibold">{user.name}</span></>;
        colorClass = 'text-rose-400';
        amountText = `₹${Math.abs(amount).toFixed(2)}`;
    } else {
        return null;
    }

    return (
        <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center space-x-4">
                <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full"/>
                <p className="text-slate-300">{text}</p>
            </div>
            <p className={`font-bold text-lg ${colorClass}`}>{amountText}</p>
        </div>
    );
};

const AddFriend: React.FC = () => {
    const { findUserByEmail } = useData();
    const [email, setEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<User | null | 'not_found'>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            alert("Please enter a valid email address.");
            return;
        }
        setIsSearching(true);
        setSearchResult(null);
        const user = await findUserByEmail(email.toLowerCase().trim());
        setSearchResult(user || 'not_found');
        setIsSearching(false);
    };

    return (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-8">
            <h2 className="text-lg font-semibold text-white mb-3">Find a Friend</h2>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
                <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter friend's email"
                    className="flex-grow px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-slate-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                />
                <button type="submit" disabled={isSearching} className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed">
                    {isSearching ? 'Searching...' : 'Search'}
                </button>
            </form>
            {searchResult && (
                <div className="mt-4 p-3 rounded-md border text-sm text-center bg-opacity-20 border-opacity-40
                    ${searchResult === 'not_found' ? 'bg-amber-500 text-amber-300 border-amber-500' : 'bg-green-500 text-green-300 border-green-500'}
                ">
                    {searchResult === 'not_found' ? (
                        <p>No user found with that email. Please ask them to sign up first!</p>
                    ) : (
                        <div className="flex items-center justify-center gap-3">
                            <img src={searchResult.avatarUrl} alt={searchResult.name} className="h-8 w-8 rounded-full" />
                            <p><span className="font-bold">{searchResult.name}</span> is on Vasooli! You can add them to groups.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const SimplifiedPage: React.FC = () => {
  const { groups, users, currentUser, loading } = useData();
  
  if (loading) return <div className="p-4 text-center">Calculating global balances...</div>;
  if (!currentUser) return <div className="p-4 text-center">Please log in to view this page.</div>;

  const globalBalances = calculateGlobalBalances(groups, users, currentUser.id);

  return (
    <div className="p-4">
      <header className="mb-8 pt-4">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">Simplified Debts</h1>
        <p className="text-slate-400 mt-1">Your net balance with everyone</p>
      </header>
      
      <AddFriend />

      <div className="space-y-4">
        {globalBalances.length > 0 ? (
          globalBalances.map(({ user, amount }) => (
            <BalanceRow key={user.id} user={user} amount={amount} />
          ))
        ) : (
          <div className="text-center py-10 px-4 bg-slate-800 rounded-lg border border-slate-700">
            <h3 className="text-xl font-semibold text-white">All Settled Up!</h3>
            <p className="text-slate-400 mt-2">You have no outstanding debts across all your groups.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimplifiedPage;