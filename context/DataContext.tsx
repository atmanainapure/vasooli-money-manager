import React, { createContext, useState, useEffect, ReactNode, useContext, useRef } from 'react';
import { User, Group, Expense, Settlement, Transaction, NotificationPreferences } from '../types';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';

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
}

export const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const transactionListeners = useRef<{ [groupId: string]: () => void }>({});

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
            }
        });

        const newGroups = groupsSnapshot.docs.map(groupDoc => {
            const groupData = groupDoc.data();
            const groupId = groupDoc.id;

            // Set up a new real-time listener for this group's transactions if one doesn't exist
            if (!transactionListeners.current[groupId]) {
                const transactionsCollection = collection(db, `groups/${groupId}/transactions`);
                const unsub = onSnapshot(transactionsCollection, txSnapshot => {
                    const transactions = txSnapshot.docs.map(txDoc => ({ id: txDoc.id, ...txDoc.data() } as Transaction));
                    setGroups(prevGroups => 
                        prevGroups.map(g => g.id === groupId ? { ...g, transactions } : g)
                    );
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
            return newGroups.map(newGroup => {
                const existing = prevGroups.find(g => g.id === newGroup.id);
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
    const updatePayload: { [key: string]: boolean } = {};
    for (const key in prefs) {
        if (Object.prototype.hasOwnProperty.call(prefs, key)) {
            updatePayload[`notificationPreferences.${key}`] = (prefs as any)[key];
        }
    }
    await updateDoc(userRef, updatePayload);
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

  return (
    <DataContext.Provider value={{ currentUser, users, groups, loading, addGroup, addExpense, settleUp, editTransaction, deleteTransaction, updateUserLimit, findUserByEmail, updateNotificationPreferences }}>
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