import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Group, User } from '../types';

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

const AddGroupModal: React.FC<{ isOpen: boolean; onClose: () => void; users: User[]; currentUser: User; addGroup: (name: string, members: User[]) => Promise<void>; }> = ({ isOpen, onClose, users, currentUser, addGroup }) => {
    const [name, setName] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    
    const otherUsers = users.filter(u => u.id !== currentUser.id);

    const handleMemberToggle = (memberId: string) => {
        setSelectedMemberIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(memberId)) {
                newSet.delete(memberId);
            } else {
                newSet.add(memberId);
            }
            return newSet;
        });
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('Please enter a group name.');
            return;
        }
        
        const selectedMembers = users.filter(u => selectedMemberIds.has(u.id));
        await addGroup(name, selectedMembers);

        setName('');
        setSelectedMemberIds(new Set());
        onClose();
    };

    const inputClass = "mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-slate-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Group">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="groupName" className="block text-sm font-medium text-slate-300">Group Name</label>
                    <input type="text" id="groupName" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300">Invite Members</label>
                    <div className="mt-2 max-h-48 overflow-y-auto space-y-2 p-2 bg-slate-900 rounded-md border border-slate-700">
                       {otherUsers.map(user => (
                         <label key={user.id} htmlFor={`user-${user.id}`} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-700 cursor-pointer">
                             <input
                                type="checkbox"
                                id={`user-${user.id}`}
                                checked={selectedMemberIds.has(user.id)}
                                onChange={() => handleMemberToggle(user.id)}
                                className="h-5 w-5 rounded bg-slate-600 border-slate-500 text-cyan-500 focus:ring-cyan-600"
                             />
                             <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full"/>
                             <span className="text-slate-200">{user.name}</span>
                         </label>
                       ))}
                    </div>
                </div>
                 <div className="flex justify-end pt-2">
                    <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800">Create Group</button>
                </div>
            </form>
        </Modal>
    );
};


const GroupCard: React.FC<{ group: Group }> = ({ group }) => (
  <Link to={`/group/${group.id}`} className="block bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-md hover:border-slate-600 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300">
    <h3 className="font-bold text-lg text-cyan-400">{group.name}</h3>
    <p className="text-sm text-slate-400">{group.members.length} members</p>
  </Link>
);

const GroupsPage: React.FC = () => {
  const { groups, users, currentUser, loading, addGroup } = useData();
  const [search, setSearch] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);

  if (loading) return <div className="p-4 text-center">Loading groups...</div>;
  if (!currentUser) return <div className="p-4 text-center">Not logged in.</div>;

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(search.toLowerCase())
  );

  if (groups.length === 0) {
    return (
        <>
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center p-4">
                <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 shadow-xl">
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome, {currentUser.name}!</h2>
                    <p className="text-slate-400 mb-6">It looks like you're not in any groups yet. <br/>Create one to start splitting expenses.</p>
                    <button 
                        onClick={() => setModalOpen(true)}
                        className="bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-cyan-500/30 hover:bg-cyan-600 transition-transform hover:scale-105"
                    >
                        + Create Your First Group
                    </button>
                </div>
            </div>
            <AddGroupModal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                users={users}
                currentUser={currentUser}
                addGroup={addGroup}
            />
        </>
    );
  }

  return (
    <>
      <div className="p-4">
        <header className="mb-8 pt-4">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">Vasooli</h1>
          <p className="text-slate-400 mt-1">Your Groups</p>
        </header>
        
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-full border border-slate-600 bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="space-y-4">
          {filteredGroups.length > 0 ? (
            filteredGroups.map(group => <GroupCard key={group.id} group={group} />)
          ) : (
            <p className="text-center text-slate-400">No groups found. Create one!</p>
          )}
        </div>
      </div>
      
      <div className="fixed bottom-24 right-4 z-20">
          <button onClick={() => setModalOpen(true)} className="bg-cyan-500 text-white rounded-full p-4 shadow-lg shadow-cyan-500/30 hover:bg-cyan-600 transition-transform hover:scale-110" aria-label="Create new group">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
      </div>

      <AddGroupModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        users={users}
        currentUser={currentUser}
        addGroup={addGroup}
      />
    </>
  );
};

export default GroupsPage;