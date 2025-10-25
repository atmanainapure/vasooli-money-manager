import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { calculateGlobalBalances } from '../utils/calculations';
import { User, Settlement, Group } from '../types';

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string; }> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-40 flex justify-center items-center" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

type SettleUpModalProps = {
    isOpen: boolean;
    onClose: () => void;
    friend: User;
    currentUser: User;
    mutualGroups: Group[];
    balanceAmount: number;
    settleUp: (settlement: Omit<Settlement, 'id' | 'date'>) => Promise<void>;
};

const SettleUpModal: React.FC<SettleUpModalProps> = ({ isOpen, onClose, friend, currentUser, mutualGroups, balanceAmount, settleUp }) => {
    const [amount, setAmount] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    
    // Determine who pays whom based on the balance. Positive amount means friend owes current user.
    const fromUser = balanceAmount > 0 ? friend : currentUser;
    const toUser = balanceAmount > 0 ? currentUser : friend;

    useEffect(() => {
        if (isOpen) {
            setAmount(Math.abs(balanceAmount).toFixed(2));
            // Defensively find the first valid group and set it as default to prevent crashes
            const firstValidGroup = mutualGroups.find(g => g && g.id);
            if (firstValidGroup) {
                setSelectedGroupId(firstValidGroup.id);
            } else {
                setSelectedGroupId('');
            }
        }
    }, [isOpen, balanceAmount, mutualGroups]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (!selectedGroupId) {
            alert('Please select a mutual group to record this settlement in.');
            return;
        }
        if (!numericAmount || numericAmount <= 0) {
            alert('Please enter a valid positive amount.');
            return;
        }
        
        await settleUp({
            groupId: selectedGroupId,
            fromId: fromUser.id,
            toId: toUser.id,
            amount: numericAmount
        });

        onClose();
    };

    const inputClass = "mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-slate-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Settle with ${friend.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-slate-900 rounded-md text-center">
                    <p className="text-slate-400 text-sm">{fromUser.name} will pay {toUser.name}</p>
                </div>
                <div>
                    <label htmlFor="settleAmount" className="block text-sm font-medium text-slate-300">Amount (₹)</label>
                    <input type="number" step="0.01" id="settleAmount" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} />
                </div>
                 <div>
                    <label htmlFor="group" className="block text-sm font-medium text-slate-300">Record in Group</label>
                     {mutualGroups.length > 0 ? (
                        <select id="group" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className={inputClass}>
                            {mutualGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                        </select>
                     ) : (
                        <p className="text-sm text-amber-400 mt-2">You don't have any mutual groups with {friend.name} to record this settlement.</p>
                     )}
                </div>
                <div className="flex justify-end pt-2">
                    <button type="submit" disabled={mutualGroups.length === 0} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed">
                        Settle Up
                    </button>
                </div>
            </form>
        </Modal>
    );
};


const BalanceRow: React.FC<{ user: User; amount: number; onSettle: () => void; }> = ({ user, amount, onSettle }) => {
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
                <div>
                    <p className="text-slate-300">{text}</p>
                    <p className={`font-bold text-lg ${colorClass}`}>{amountText}</p>
                </div>
            </div>
            <button 
                onClick={onSettle}
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-800"
            >
                Settle Up
            </button>
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
    const { groups, users, currentUser, loading, settleUp } = useData();
    const [isSettleModalOpen, setSettleModalOpen] = useState(false);
    const [settleWithFriend, setSettleWithFriend] = useState<{ user: User, amount: number } | null>(null);

    if (loading) return <div className="p-4 text-center">Calculating global balances...</div>;
    if (!currentUser) return <div className="p-4 text-center">Please log in to view this page.</div>;

    const globalBalances = calculateGlobalBalances(groups, users, currentUser.id);

    const handleOpenSettleModal = (user: User, amount: number) => {
        setSettleWithFriend({ user, amount });
        setSettleModalOpen(true);
    };

    const handleCloseSettleModal = () => {
        setSettleModalOpen(false);
        setSettleWithFriend(null);
    };

    const mutualGroups = useMemo(() => {
        if (!settleWithFriend || !currentUser) return [];
        return groups.filter(g => 
            g.memberIds.includes(currentUser.id) && g.memberIds.includes(settleWithFriend.user.id)
        );
    }, [settleWithFriend, currentUser, groups]);


  return (
    <>
        <div className="p-4">
            <header className="mb-8 pt-4">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">Simplified Debts</h1>
                <p className="text-slate-400 mt-1">Your net balance with everyone</p>
            </header>
            
            <AddFriend />

            <div className="space-y-4">
                {globalBalances.length > 0 ? (
                globalBalances.map(({ user, amount }) => (
                    <BalanceRow key={user.id} user={user} amount={amount} onSettle={() => handleOpenSettleModal(user, amount)} />
                ))
                ) : (
                <div className="text-center py-10 px-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="text-xl font-semibold text-white">All Settled Up!</h3>
                    <p className="text-slate-400 mt-2">You have no outstanding debts across all your groups.</p>
                </div>
                )}
            </div>
        </div>

        {settleWithFriend && currentUser && (
            <SettleUpModal
                isOpen={isSettleModalOpen}
                onClose={handleCloseSettleModal}
                friend={settleWithFriend.user}
                currentUser={currentUser}
                balanceAmount={settleWithFriend.amount}
                mutualGroups={mutualGroups}
                settleUp={settleUp}
            />
        )}
    </>
  );
};

export default SimplifiedPage;