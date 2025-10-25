import { Group, User, Expense, Settlement, Transaction, Balance, SplitMethod } from '../types';

export const calculateBalances = (group: Group, currentUserId: string): Balance[] => {
  const balances = new Map<string, number>();

  group.members.forEach(member => {
    balances.set(member.id, 0);
  });

  group.transactions.forEach(transaction => {
    if ('paidById' in transaction) { // It's an Expense
      const expense = transaction as Expense;
      const payerId = expense.paidById;
      const amount = expense.amount;

      // Payer gets credit
      balances.set(payerId, (balances.get(payerId) || 0) + amount);

      // Handle different split methods
      if (expense.splitMethod === SplitMethod.SHARES && expense.splitShares) {
        const totalShares = Object.values(expense.splitShares).reduce((sum, share) => sum + share, 0);
        if (totalShares > 0) {
            expense.splitBetween.forEach(memberId => {
                const memberShares = expense.splitShares?.[memberId] || 0;
                const shareAmount = (amount / totalShares) * memberShares;
                balances.set(memberId, (balances.get(memberId) || 0) - shareAmount);
            });
        }
      } else { // Default to EQUAL split
        const splitCount = expense.splitBetween.length;
        if (splitCount > 0) {
            const share = amount / splitCount;
            // Everyone in split gets debit
            expense.splitBetween.forEach(memberId => {
                balances.set(memberId, (balances.get(memberId) || 0) - share);
            });
        }
      }
    } else { // It's a Settlement
        const settlement = transaction as Settlement;
        // The person who paid (fromId) is settling their debt, so their balance increases (becomes less negative).
        balances.set(settlement.fromId, (balances.get(settlement.fromId) || 0) + settlement.amount);
        // The person who received (toId) has been paid back, so their credit decreases (becomes less positive).
        balances.set(settlement.toId, (balances.get(settlement.toId) || 0) - settlement.amount);
    }
  });
  
  return group.members.map(member => ({
    user: member,
    amount: balances.get(member.id) || 0,
  }));
};

export const calculateGlobalBalances = (groups: Group[], allUsers: User[], currentUserId: string): { user: User, amount: number }[] => {
    const netBalances = new Map<string, number>();

    allUsers.forEach(user => {
        if (user.id !== currentUserId) {
            netBalances.set(user.id, 0);
        }
    });

    groups.forEach(group => {
        group.transactions.forEach(transaction => {
            if ('paidById' in transaction) { // Expense
                const expense = transaction as Expense;
                const { amount, paidById, splitMethod, splitShares, splitBetween } = expense;

                if (paidById !== currentUserId && !splitBetween.includes(currentUserId)) {
                    return; // Current user not involved
                }

                const memberShares: { [userId: string]: number } = {};
                if (splitMethod === SplitMethod.SHARES && splitShares) {
                    const totalShares = Object.values(splitShares).reduce((sum, share) => sum + share, 0);
                    if (totalShares > 0) {
                        splitBetween.forEach(memberId => {
                            memberShares[memberId] = (amount / totalShares) * (splitShares[memberId] || 0);
                        });
                    }
                } else {
                    const shareAmount = amount / splitBetween.length;
                    splitBetween.forEach(memberId => {
                        memberShares[memberId] = shareAmount;
                    });
                }

                if (paidById === currentUserId) {
                    splitBetween.forEach(memberId => {
                        if (memberId !== currentUserId) {
                            netBalances.set(memberId, (netBalances.get(memberId) || 0) + (memberShares[memberId] || 0));
                        }
                    });
                } else if (splitBetween.includes(currentUserId)) {
                    netBalances.set(paidById, (netBalances.get(paidById) || 0) - (memberShares[currentUserId] || 0));
                }

            } else { // Settlement
                const settlement = transaction as Settlement;
                const { fromId, toId, amount } = settlement;

                if (fromId === currentUserId) {
                    // I paid someone. The amount I owe them decreases, so my balance with them increases (moves towards positive).
                    netBalances.set(toId, (netBalances.get(toId) || 0) + amount);
                } else if (toId === currentUserId) {
                    // Someone paid me. The amount they owe me decreases, so my balance with them decreases (moves towards negative).
                    netBalances.set(fromId, (netBalances.get(fromId) || 0) - amount);
                }
            }
        });
    });

    const result: { user: User, amount: number }[] = [];
    netBalances.forEach((amount, userId) => {
        const user = allUsers.find(u => u.id === userId);
        if (user && Math.abs(amount) > 0.01) {
            result.push({ user, amount });
        }
    });

    return result.sort((a, b) => b.amount - a.amount);
};