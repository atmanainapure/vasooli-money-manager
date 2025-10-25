export enum Category {
  SELF = "Self",
  RENT = "Rent",
  TRAVEL = "Travel",
  FOOD = "Food",
  BOOZE = "Booze",
  SHOPPING = "Shopping",
  QUICK_DELIVERY = "Quick Delivery",
  OTHER = "Other",
}

export enum SplitMethod {
  EQUAL = 'equal',
  SHARES = 'shares',
}

export interface NotificationPreferences {
  onAddedToTransaction: boolean;
  onGroupExpenseAdded: boolean;
  onSettlement: boolean;
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  monthlyLimit?: number;
  notificationPreferences?: NotificationPreferences;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidById: string;
  splitMethod: SplitMethod;
  splitBetween: string[];
  splitShares?: { [userId: string]: number };
  category: Category;
  date: string;
}

export interface Settlement {
    id: string;
    groupId: string;
    fromId: string;
    toId: string;
    amount: number;
    date: string;
}

export type Transaction = Expense | Settlement;

export interface Group {
  id: string;
  name: string;
  members: User[];
  memberIds: string[];
  transactions: Transaction[];
}

export interface Balance {
  user: User;
  amount: number;
}