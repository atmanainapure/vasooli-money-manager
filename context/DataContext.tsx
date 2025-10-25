import React, { createContext, useState, useEffect, ReactNode, useContext, useRef } from 'react';
import { User, Group, Expense, Settlement, Transaction, NotificationPreferences } from '../types';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';

interface AppState {
  currentUser: User | null;
  users: User[];
  groups: Group[];
  loading: boolean;
}

interface DataContextProps extends AppState {
    addGroup: (name: string, members: User[]) => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id' | 'date'>) => Promise<void>;
    settleUp: (settlement: Omit<Settlement, 'id' | 'date'>) => Promise<void>;
    editTransaction: (transaction: Transaction) => Promise<void>;
    deleteTransaction: (groupId: string, transactionId: string) => Promise<void>;
    updateUserLimit: (userId: string, limit: number) => Promise<void>;
    findUserByEmail: (email: string) => Promise<User | null>;
    updateNotificationPreferences: (userId: string, prefs: Partial<NotificationPreferences>) => Promise<void>;
    deleteGroup: (groupId: string) => Promise<void>;
}

export const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const transactionListeners = useRef<{ [groupId: string]: () => void }>({});
  const initialLoadDone = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
        setFirebaseUser(user);
    });
    // Cleanup all listeners on unmount
    return () => {
        unsubscribe();
        Object.values(transactionListeners.current).forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
        setCurrentUser(null);
        setUsers([]);
        setGroups([]);
        setLoading(false);
        // Clean up any existing listeners from a previous session
        Object.values(transactionListeners.current).forEach(unsub => unsub());
        transactionListeners.current = {};
        initialLoadDone.current.clear();
        return;
    }

    setLoading(true);

    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(allUsers);
        const loggedInUser = allUsers.find(u => u.id === firebaseUser.uid) || null;
        setCurrentUser(loggedInUser);
    });

    const groupsQuery = query(collection(db, 'groups'), where('memberIds', 'array-contains', firebaseUser.uid));
    
    const groupsUnsubscribe = onSnapshot(groupsQuery, (groupsSnapshot) => {
        const groupIds = new Set(groupsSnapshot.docs.map(doc => doc.id));

        // Unsubscribe from transaction listeners of groups the user has left
        Object.keys(transactionListeners.current).forEach(groupId => {
            if (!groupIds.has(groupId)) {
                transactionListeners.current[groupId]();
                delete transactionListeners.current[groupId];
                initialLoadDone.current.delete(groupId);
            }
        });

        const newGroups = groupsSnapshot.docs.map(groupDoc => {
            const groupData = groupDoc.data();
            const groupId = groupDoc.id;

            // Set up a new real-time listener for this group's transactions if one doesn't exist
            if (!transactionListeners.current[groupId]) {
                const transactionsCollection = collection(db, `groups/${groupId}/transactions`);
                const unsub = onSnapshot(transactionsCollection, txSnapshot => {
                    const allTransactions = txSnapshot.docs.map(txDoc => ({ id: txDoc.id, ...txDoc.data() } as Transaction));
                    
                    txSnapshot.docChanges().forEach(change => {
                        if (change.type === 'added' && initialLoadDone.current.has(groupId)) {
                            const transaction = { id: change.doc.id, ...change.doc.data() } as Transaction;
                            handleNotification(transaction, groupId);
                        }
                    });

                    setGroups(prevGroups => 
                        prevGroups.map(g => g.id === groupId ? { ...g, transactions: allTransactions } : g)
                    );

                    if (!initialLoadDone.current.has(groupId)) {
                        initialLoadDone.current.add(groupId);
                    }
                });
                transactionListeners.current[groupId] = unsub;
            }

            return {
                id: groupId,
                name: groupData.name,
                memberIds: groupData.memberIds,
                members: [], // Populated in the next effect
                transactions: [], // Populated by the new listener
            } as Group;
        });

        // This update sets the group structure. Transactions and members will be filled in by their respective listeners/effects.
        setGroups(prevGroups => {
            const currentGroupIds = new Set(newGroups.map(g => g.id));
            const filteredPrevGroups = prevGroups.filter(g => currentGroupIds.has(g.id));

            return newGroups.map(newGroup => {
                const existing = filteredPrevGroups.find(g => g.id === newGroup.id);
                return { ...newGroup, transactions: existing?.transactions || [], members: existing?.members || [] };
            });
        });
        
        setLoading(false);
    });

    return () => {
        usersUnsubscribe();
        groupsUnsubscribe();
    };
  }, [firebaseUser]);

  // This effect runs whenever the full user list or the basic group list changes,
  // and it efficiently populates the `members` array in each group.
  useEffect(() => {
    if (users.length > 0 && groups.length > 0) {
        setGroups(prevGroups => {
            return prevGroups.map(group => {
                const resolvedMembers = group.memberIds
                    .map(id => users.find(u => u.id === id))
                    .filter((u): u is User => !!u); // Filter out any undefined users
                return { ...group, members: resolvedMembers };
            });
        });
    }
  }, [users, groups.map(g => g.id).join(',')]); // Dependency ensures this runs when users or the set of groups changes

  const handleNotification = (transaction: Transaction, groupId: string) => {
    if (Notification.permission !== 'granted' || !currentUser) return;
  
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
  
    let title = '';
    let body = '';
    let shouldNotify = false;
  
    if ('paidById' in transaction) { // Expense
      const expense = transaction as Expense;
      if (expense.paidById !== currentUser.id && expense.splitBetween.includes(currentUser.id)) {
        const payer = users.find(u => u.id === expense.paidById);
        const prefs = currentUser.notificationPreferences;
  
        if (prefs?.onAddedToTransaction || prefs?.onGroupExpenseAdded) {
          title = 'New Expense Added';
          body = `${payer?.name || 'Someone'} added "${expense.description}" in ${group.name}.`;
          shouldNotify = true;
        }
      }
    } else { // Settlement
      const settlement = transaction as Settlement;
      if (settlement.toId === currentUser.id && settlement.fromId !== currentUser.id) {
        if (currentUser.notificationPreferences?.onSettlement) {
          const payer = users.find(u => u.id === settlement.fromId);
          title = 'You Got Paid!';
          body = `${payer?.name || 'Someone'} paid you ₹${settlement.amount.toFixed(2)} in ${group.name}.`;
          shouldNotify = true;
        }
      }
    }
  
    if (shouldNotify) {
      const notification = new Notification(title, {
        body: body,
        icon: '/vite.svg', // Optional: Add an icon URL
      });
  
      notification.onclick = () => {
        window.location.hash = `/group/${groupId}`;
        window.focus();
      };
    }
  };

  const addGroup = async (name: string, members: User[]) => {
      if (!currentUser) throw new Error("No current user");
      const memberIds = Array.from(new Set([currentUser.id, ...members.map(m => m.id)]));
      await addDoc(collection(db, 'groups'), {
          name,
          memberIds,
          createdAt: serverTimestamp(),
      });
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'date'>) => {
    await addDoc(collection(db, `groups/${expense.groupId}/transactions`), {
        ...expense,
        date: new Date().toISOString()
    });
  };

  const settleUp = async (settlement: Omit<Settlement, 'id' | 'date'>) => {
    await addDoc(collection(db, `groups/${settlement.groupId}/transactions`), {
        ...settlement,
        date: new Date().toISOString()
    });
  };

  const editTransaction = async (transaction: Transaction) => {
    const { groupId, id, ...data } = transaction;
    const txRef = doc(db, `groups/${groupId}/transactions`, id);
    await updateDoc(txRef, data);
  };

  const deleteTransaction = async (groupId: string, transactionId: string) => {
    const txRef = doc(db, `groups/${groupId}/transactions`, transactionId);
    await deleteDoc(txRef);
  };
    
  const updateUserLimit = async (userId: string, limit: number) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { monthlyLimit: limit });
  };

  const updateNotificationPreferences = async (userId: string, prefs: Partial<NotificationPreferences>) => {
    const userRef = doc(db, 'users', userId);

    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) {
        console.error("Could not find user to update preferences");
        return;
    }

    const currentPrefs = userToUpdate.notificationPreferences || {
        onAddedToTransaction: true,
        onGroupExpenseAdded: true,
        onSettlement: true,
    };

    const newPrefs = { ...currentPrefs, ...prefs };

    await updateDoc(userRef, {
        notificationPreferences: newPrefs,
    });
  };

  const findUserByEmail = async (email: string): Promise<User | null> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    } else {
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as User;
    }
  };

  const deleteGroup = async (groupId: string) => {
    // 1. Delete all transactions in the subcollection
    const transactionsRef = collection(db, 'groups', groupId, 'transactions');
    const transactionsSnapshot = await getDocs(transactionsRef);
    
    const batch = writeBatch(db);

    transactionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 2. Delete the group document itself
    const groupRef = doc(db, 'groups', groupId);
    batch.delete(groupRef);
    
    // 3. Commit the batch
    await batch.commit();
  };

  return (
    <DataContext.Provider value={{ currentUser, users, groups, loading, addGroup, addExpense, settleUp, editTransaction, deleteTransaction, updateUserLimit, findUserByEmail, updateNotificationPreferences, deleteGroup }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};