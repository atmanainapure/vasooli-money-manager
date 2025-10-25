import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { calculateBalances } from '../utils/calculations';
import { Transaction, Expense, Settlement, Group, User, Category, SplitMethod } from '../types';

const categoryIcons: Record<string, string> = {
    [Category.SELF]: '👤',
    [Category.RENT]: '🏠',
    [Category.TRAVEL]: '✈️',
    [Category.FOOD]: '🍔',
    [Category.BOOZE]: '🍻',
    [Category.SHOPPING]: '🛍️',
    [Category.QUICK_DELIVERY]: '🛵',
    [Category.OTHER]: '💸',
};

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

type AddExpenseModalProps = {
    isOpen: boolean;
    onClose: () => void;
    group: Group;
    currentUser: User;
    addExpense: (expense: Omit<Expense, 'id' | 'date'>) => Promise<void>;
    editTransaction: (tx: Transaction) => Promise<void>;
    expenseToEdit: Expense | null;
};

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, group, currentUser, addExpense, editTransaction, expenseToEdit }) => {
    const isEditMode = !!expenseToEdit;
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidById, setPaidById] = useState(currentUser.id);
    const [category, setCategory] = useState(Category.SELF);
    const [splitMethod, setSplitMethod] = useState<SplitMethod>(SplitMethod.EQUAL);
    const [splitBetweenIds, setSplitBetweenIds] = useState<Set<string>>(() => new Set(group.members.map(m => m.id)));
    const [shares, setShares] = useState<Record<string, string>>({});
    
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && expenseToEdit) {
                setDescription(expenseToEdit.description);
                setAmount(expenseToEdit.amount.toString());
                setPaidById(expenseToEdit.paidById);
                setCategory(expenseToEdit.category);
                setSplitMethod(expenseToEdit.splitMethod);
                setSplitBetweenIds(new Set(expenseToEdit.splitBetween));
                const initialShares: Record<string, string> = {};
                group.members.forEach(m => {
                    initialShares[m.id] = (expenseToEdit.splitShares?.[m.id] || 1).toString();
                });
                setShares(initialShares);

            } else {
                setDescription('');
                setAmount('');
                setPaidById(currentUser.id);
                setCategory(Category.SELF);
                setSplitMethod(SplitMethod.EQUAL);
                setSplitBetweenIds(new Set(group.members.map(m => m.id)));
                const initialShares: Record<string, string> = {};
                group.members.forEach(m => {
                    initialShares[m.id] = '1';
                });
                setShares(initialShares);
            }
        }
    }, [isOpen, group, currentUser, isEditMode, expenseToEdit]);

    const handleMemberToggle = (memberId: string) => {
        setSplitBetweenIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(memberId)) {
                newSet.delete(memberId);
            } else {
                newSet.add(memberId);
            }
            return newSet;
        });
    };

    const handleShareChange = (memberId: string, value: string) => {
        setShares(prev => ({ ...prev, [memberId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (!description.trim() || !numericAmount || numericAmount <= 0) {
            alert('Please fill out all fields with valid values.');
            return;
        }

        const selectedMembers = Array.from(splitBetweenIds);
        if (selectedMembers.length === 0) {
            alert('Please select at least one person to split with.');
            return;
        }

        let expensePayload: Omit<Expense, 'id' | 'date' | 'date'> = {
            groupId: group.id,
            description,
            amount: numericAmount,
            paidById,
            category,
            splitMethod,
            splitBetween: selectedMembers,
        };
    
        if (splitMethod === SplitMethod.SHARES) {
            const finalShares: Record<string, number> = {};
            let totalShares = 0;
            for (const memberId of selectedMembers) {
                const shareVal = parseFloat(shares[memberId] || '0');
                if (isNaN(shareVal) || shareVal < 0) {
                    alert(`Please enter a valid, non-negative share for all selected members.`);
                    return;
                }
                finalShares[memberId] = shareVal;
                totalShares += shareVal;
            }
    
            if (totalShares === 0) {
                alert('Total shares cannot be zero. Please assign shares to at least one person.');
                return;
            }
    
            expensePayload.splitShares = finalShares;
        }

        if (isEditMode && expenseToEdit) {
            await editTransaction({ ...expenseToEdit, ...expensePayload });
        } else {
            await addExpense(expensePayload as Omit<Expense, 'id' | 'date'>);
        }
        
        onClose();
    };
    
    const inputClass = "mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-slate-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500";
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Expense" : "Add Expense"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-300">Description</label>
                    <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-slate-300">Amount (₹)</label>
                    <input type="number" step="0.01" id="amount" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="paidBy" className="block text-sm font-medium text-slate-300">Paid By</label>
                        <select id="paidBy" value={paidById} onChange={e => setPaidById(e.target.value)} className={inputClass}>
                            {group.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-slate-300">Category</label>
                        <select id="category" value={category} onChange={e => setCategory(e.target.value as Category)} className={inputClass}>
                            {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-3 pt-2">
                    <label className="block text-sm font-medium text-slate-300">Split Options</label>
                    <div className="flex rounded-md shadow-sm">
                        <button type="button" onClick={() => setSplitMethod(SplitMethod.EQUAL)} className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md focus:outline-none transition-colors ${splitMethod === SplitMethod.EQUAL ? 'bg-cyan-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}>Equally</button>
                        <button type="button" onClick={() => setSplitMethod(SplitMethod.SHARES)} className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md focus:outline-none transition-colors ${splitMethod === SplitMethod.SHARES ? 'bg-cyan-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}>By Shares</button>
                    </div>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-2 p-2 bg-slate-900 rounded-md border border-slate-700">
                        {group.members.map(member => (
                            <div key={member.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-700">
                                <input type="checkbox" id={`member-${member.id}`} checked={splitBetweenIds.has(member.id)} onChange={() => handleMemberToggle(member.id)} className="h-5 w-5 rounded bg-slate-600 border-slate-500 text-cyan-500 focus:ring-cyan-600" />
                                <img src={member.avatarUrl} alt={member.name} className="h-8 w-8 rounded-full"/>
                                <label htmlFor={`member-${member.id}`} className="flex-1 text-slate-200 cursor-pointer">{member.name}</label>
                                {splitMethod === SplitMethod.SHARES && splitBetweenIds.has(member.id) && (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-slate-400">Shares:</span>
                                        <input type="number" value={shares[member.id] || '1'} onChange={(e) => handleShareChange(member.id, e.target.value)} className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded-md text-white text-center" min="0" step="0.1" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800">{isEditMode ? 'Save Changes' : 'Add Expense'}</button>
                </div>
            </form>
        </Modal>
    );
};

type SettleUpModalProps = {
    isOpen: boolean;
    onClose: () => void;
    group: Group;
    currentUser: User;
    settleUp: (settlement: Omit<Settlement, 'id' | 'date'>) => Promise<void>;
    editTransaction: (tx: Transaction) => Promise<void>;
    settlementToEdit: Settlement | null;
};

const SettleUpModal: React.FC<SettleUpModalProps> = ({ isOpen, onClose, group, currentUser, settleUp, editTransaction, settlementToEdit }) => {
    const isEditMode = !!settlementToEdit;
    const [fromId, setFromId] = useState(currentUser.id);
    const [toId, setToId] = useState('');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        if(isOpen) {
            if (isEditMode && settlementToEdit) {
                setFromId(settlementToEdit.fromId);
                setToId(settlementToEdit.toId);
                setAmount(settlementToEdit.amount.toString());
            } else {
                const otherMembers = group.members.filter(m => m.id !== currentUser.id);
                setFromId(currentUser.id);
                setToId(otherMembers.length > 0 ? otherMembers[0].id : '');
                setAmount('');
            }
        }
    }, [isOpen, isEditMode, settlementToEdit, group, currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (!fromId || !toId || fromId === toId || !numericAmount || numericAmount <= 0) {
            alert('Please select two different people and enter a valid amount.');
            return;
        }

        const payload: Omit<Settlement, 'id' | 'date'> = {
            groupId: group.id,
            fromId,
            toId,
            amount: numericAmount,
        };

        if (isEditMode && settlementToEdit) {
            await editTransaction({ ...settlementToEdit, ...payload });
        } else {
            await settleUp(payload);
        }
        
        onClose();
    };

    const inputClass = "mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-slate-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Settlement" : "Settle Up"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label htmlFor="fromId" className="block text-sm font-medium text-slate-300">From</label>
                    <select id="fromId" value={fromId} onChange={e => setFromId(e.target.value)} className={inputClass}>
                        {group.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="toId" className="block text-sm font-medium text-slate-300">To</label>
                    <select id="toId" value={toId} onChange={e => setToId(e.target.value)} className={inputClass}>
                        {group.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="settleAmount" className="block text-sm font-medium text-slate-300">Amount (₹)</label>
                    <input type="number" id="settleAmount" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} />
                </div>
                <div className="flex justify-end pt-2">
                    <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-800">{isEditMode ? 'Save Changes' : 'Settle Up'}</button>
                </div>
            </form>
        </Modal>
    );
};

const BalancePill: React.FC<{ amount: number }> = ({ amount }) => {
    const isPositive = amount > 0.01;
    const isNegative = amount < -0.01;
    const colorClass = isPositive ? 'bg-green-500/10 text-green-400' : isNegative ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-600/50 text-slate-400';
    const prefix = isPositive ? 'gets back' : isNegative ? 'owes' : 'is settled';
    const formattedAmount = Math.abs(amount).toFixed(2);

    return (
        <div className={`text-sm px-3 py-1 rounded-full font-semibold ${colorClass}`}>
            {prefix} ₹{formattedAmount}
        </div>
    );
};

interface TransactionCardProps {
    transaction: Transaction;
    members: User[];
    onEdit: (tx: Transaction) => void;
    onDelete: (tx: Transaction) => void;
    onMenuToggle: () => void;
    isMenuOpen: boolean;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, members, onEdit, onDelete, onMenuToggle, isMenuOpen }) => {
    const isExpense = 'paidById' in transaction;
    const baseClass = "bg-slate-800 p-4 rounded-lg flex items-center space-x-4 border border-slate-700 transition-transform duration-200 hover:scale-[1.02] hover:bg-slate-700/60";

    const content = isExpense ? (
        <>
            <div className="text-3xl p-3 bg-slate-700 rounded-full">{categoryIcons[(transaction as Expense).category] || '💸'}</div>
            <div className="flex-grow">
                <p className="font-semibold text-slate-100">{(transaction as Expense).description}</p>
                <p className="text-sm text-slate-400">{members.find(m => m.id === (transaction as Expense).paidById)?.name} paid</p>
            </div>
            <div className="text-right">
                <p className="font-bold text-lg text-white">₹{(transaction as Expense).amount.toFixed(2)}</p>
                <p className="text-xs text-slate-500">{new Date(transaction.date).toLocaleDateString()}</p>
            </div>
        </>
    ) : (
        <>
            <div className="text-3xl p-3 bg-slate-700 rounded-full">🤝</div>
            <div className="flex-grow">
                <p className="font-semibold text-slate-100">{members.find(m => m.id === (transaction as Settlement).fromId)?.name} paid {members.find(m => m.id === (transaction as Settlement).toId)?.name}</p>
                <p className="text-sm text-slate-400">Settlement</p>
            </div>
            <div className="text-right">
                <p className="font-bold text-lg text-green-400">₹{(transaction as Settlement).amount.toFixed(2)}</p>
                <p className="text-xs text-slate-500">{new Date(transaction.date).toLocaleDateString()}</p>
            </div>
        </>
    );

    return (
        <div className="relative">
            <div className={baseClass}>
                {content}
            </div>
            <button onClick={onMenuToggle} className="absolute top-2 right-2 p-1.5 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors z-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
            </button>
            {isMenuOpen && (
                <div className="absolute top-10 right-2 bg-slate-900 border border-slate-700 rounded-md shadow-lg z-20 w-32 py-1">
                    <button onClick={() => { onEdit(transaction); onMenuToggle(); }} className="flex items-center w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                        Edit
                    </button>
                    <button onClick={() => { onDelete(transaction); onMenuToggle(); }} className="flex items-center w-full text-left px-3 py-2 text-sm text-rose-400 hover:bg-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

const GroupDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { groups, currentUser, loading, addExpense, settleUp, editTransaction, deleteTransaction } = useData();
    const [isAddExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
    const [isSettleUpModalOpen, setSettleUpModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [menuTransactionId, setMenuTransactionId] = useState<string | null>(null);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
    const [settlementToEdit, setSettlementToEdit] = useState<Settlement | null>(null);

    const group = groups.find(g => g.id === id);

    if (loading) {
        return <div className="p-4 text-center">Loading group details...</div>;
    }
    
    if (!group || !currentUser) {
        return <div className="p-4 text-center">Group not found or not logged in.</div>;
    }

    const balances = calculateBalances(group, currentUser.id);
    const sortedTransactions = [...group.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const handleStartEdit = (tx: Transaction) => {
        if ('paidById' in tx) {
            setExpenseToEdit(tx as Expense);
            setAddExpenseModalOpen(true);
        } else {
            setSettlementToEdit(tx as Settlement);
            setSettleUpModalOpen(true);
        }
    };
    
    const handleDelete = (tx: Transaction) => {
        if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
            deleteTransaction(tx.groupId, tx.id);
        }
    };

    const filteredTransactions = sortedTransactions.filter(tx => {
        if (!search.trim()) return true;
        const searchTerm = search.toLowerCase();
        if ('description' in tx) { // Expense
            return tx.description.toLowerCase().includes(searchTerm);
        } else { // Settlement
            const from = group.members.find(m => m.id === tx.fromId);
            const to = group.members.find(m => m.id === tx.toId);
            const settlementText = `${from?.name || ''} paid ${to?.name || ''}`.toLowerCase();
            return settlementText.includes(searchTerm);
        }
    });

    return (
        <div>
            <header className="sticky top-0 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 z-30 p-4 flex items-center">
                <Link to="/" className="mr-4 text-slate-300 hover:text-cyan-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </Link>
                <h1 className="text-xl font-bold text-white">{group.name}</h1>
            </header>

            <div className="p-4">
                <section className="mb-6 bg-slate-950 p-4 rounded-lg border border-slate-800 shadow-lg">
                    <h2 className="text-lg font-semibold mb-3 text-white">Balances</h2>
                    <div className="space-y-3">
                        {balances.map(({ user, amount }) => (
                            <div key={user.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full" />
                                    <span className="font-medium text-slate-300">{user.name}</span>
                                </div>
                                <BalancePill amount={amount} />
                            </div>
                        ))}
                    </div>
                </section>
                
                <section>
                    <h2 className="text-lg font-semibold mb-3 text-white">Transactions</h2>
                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-4 py-2 rounded-full border border-slate-600 bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                     {filteredTransactions.length > 0 ? (
                        <div className="space-y-3">
                            {filteredTransactions.map(tx => (
                                <TransactionCard 
                                    key={tx.id} 
                                    transaction={tx} 
                                    members={group.members} 
                                    isMenuOpen={menuTransactionId === tx.id}
                                    onMenuToggle={() => setMenuTransactionId(prev => (prev === tx.id ? null : tx.id))}
                                    onEdit={handleStartEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-slate-400 py-4">
                            {search ? 'No transactions match your search.' : 'No transactions yet.'}
                        </p>
                    )}
                </section>
            </div>
            
            <div className="fixed bottom-4 right-4 flex flex-col items-end space-y-3 z-20">
                 <button onClick={() => setSettleUpModalOpen(true)} className="bg-amber-500 text-white rounded-full p-3 shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-transform hover:scale-110" aria-label="Settle up">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>
                 </button>
                 <button onClick={() => setAddExpenseModalOpen(true)} className="bg-cyan-500 text-white rounded-full p-4 shadow-lg shadow-cyan-500/30 hover:bg-cyan-600 transition-transform hover:scale-110" aria-label="Add expense">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 </button>
            </div>

            <AddExpenseModal 
                isOpen={isAddExpenseModalOpen}
                onClose={() => { setAddExpenseModalOpen(false); setExpenseToEdit(null); }}
                group={group}
                currentUser={currentUser}
                addExpense={addExpense}
                editTransaction={editTransaction}
                expenseToEdit={expenseToEdit}
            />
            
            <SettleUpModal
                isOpen={isSettleUpModalOpen}
                onClose={() => { setSettleUpModalOpen(false); setSettlementToEdit(null); }}
                group={group}
                currentUser={currentUser}
                settleUp={settleUp}
                editTransaction={editTransaction}
                settlementToEdit={settlementToEdit}
            />

        </div>
    );
};

export default GroupDetailPage;