import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

const ProfilePage: React.FC = () => {
  const { currentUser, updateUserLimit } = useData();
  const [limit, setLimit] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (currentUser?.monthlyLimit) {
      setLimit(currentUser.monthlyLimit.toString());
    } else {
      setLimit('');
    }
  }, [currentUser]);

  const handleSignOut = () => {
    signOut(auth);
  };
  
  const handleLimitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
        const numericLimit = parseFloat(limit);
        if (!isNaN(numericLimit) && numericLimit >= 0) {
            await updateUserLimit(currentUser.id, numericLimit);
            setIsEditing(false);
        } else {
            alert("Please enter a valid non-negative number.");
        }
    }
  };

  if (!currentUser) {
    return <div className="p-4 text-center">Loading profile...</div>;
  }
  
  const inputClass = "mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-slate-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500";


  return (
    <div className="p-4 h-full flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-lg shadow-md p-6">
            <div className="text-center">
                <img 
                    className="w-24 h-24 mb-3 rounded-full shadow-lg mx-auto ring-4 ring-slate-700" 
                    src={currentUser.avatarUrl} 
                    alt={`${currentUser.name}'s avatar`}
                />
                <h5 className="mb-1 text-xl font-medium text-white">{currentUser.name}</h5>
                <span className="text-sm text-slate-400">{currentUser.email}</span>
            </div>
            
            <div className="mt-6 border-t border-slate-700 pt-6">
                <h6 className="font-semibold text-white mb-3">Monthly Spending Limit</h6>
                {isEditing ? (
                     <form onSubmit={handleLimitUpdate} className="space-y-3">
                         <div>
                            <label htmlFor="limit" className="sr-only">Monthly Limit</label>
                            <input
                                type="number"
                                id="limit"
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                                className={inputClass}
                                placeholder="e.g., 5000"
                            />
                         </div>
                         <div className="flex space-x-2">
                            <button type="submit" className="w-full text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-500/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center">Save</button>
                            <button type="button" onClick={() => setIsEditing(false)} className="w-full text-white bg-slate-600 hover:bg-slate-700 focus:ring-4 focus:outline-none focus:ring-slate-500/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center">Cancel</button>
                         </div>
                     </form>
                ) : (
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <span className="text-2xl font-bold text-white">₹{currentUser.monthlyLimit?.toFixed(2) || 'Not set'}</span>
                        <button onClick={() => setIsEditing(true)} className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">Edit</button>
                    </div>
                )}
            </div>
            
            <div className="flex mt-6 pt-6 border-t border-slate-700">
                <button onClick={handleSignOut} className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-center text-white bg-rose-600/80 border border-rose-600 rounded-lg hover:bg-rose-600 focus:ring-4 focus:outline-none focus:ring-rose-500/50">
                    Sign Out
                </button>
            </div>
        </div>
    </div>
  );
};

export default ProfilePage;