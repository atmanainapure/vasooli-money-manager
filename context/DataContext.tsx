import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { User, Group, Expense, Settlement, Transaction } from '../types';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';

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
}

export const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);

  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, user => {
          setFirebaseUser(user);
      });
      return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
        setCurrentUser(null);
        setUsers([]);
        setGroups([]);
        setLoading(false);
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
    
    const groupsUnsubscribe = onSnapshot(groupsQuery, async (snapshot) => {
        const groupsData = await Promise.all(snapshot.docs.map(async (groupDoc) => {
            const groupData = groupDoc.data();
            
            const transactionsCollection = collection(db, `groups/${groupDoc.id}/transactions`);
            const transactionsSnapshot = await getDocs(transactionsCollection);
            const transactions = transactionsSnapshot.docs.map(txDoc => ({ id: txDoc.id, ...txDoc.data() } as Transaction));
            
            const members = await Promise.all(
                (groupData.memberIds as string[]).map(async (id) => {
                    const userDoc = await getDoc(doc(db, 'users', id));
                    return { id: userDoc.id, ...userDoc.data() } as User;
                })
            );

            return {
                id: groupDoc.id,
                name: groupData.name,
                memberIds: groupData.memberIds,
                members,
                transactions
            } as Group;
        }));
        setGroups(groupsData);
        setLoading(false);
    });

    return () => {
        usersUnsubscribe();
        groupsUnsubscribe();
    };

  }, [firebaseUser]);

  const addGroup = async (name: string, members: User[]) => {
      if (!currentUser) throw new Error("No current user");
      const memberIds = [currentUser.id, ...members.map(m => m.id)];
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
    const txRef = doc(db, `groups/${transaction.groupId}/transactions`, transaction.id);
    await updateDoc(txRef, { ...transaction });
  };

  const deleteTransaction = async (groupId: string, transactionId: string) => {
    const txRef = doc(db, `groups/${groupId}/transactions`, transactionId);
    await deleteDoc(txRef);
  };
    
  const updateUserLimit = async (userId: string, limit: number) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { monthlyLimit: limit });
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
    <DataContext.Provider value={{ currentUser, users, groups, loading, addGroup, addExpense, settleUp, editTransaction, deleteTransaction, updateUserLimit, findUserByEmail }}>
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