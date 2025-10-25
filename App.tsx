import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import InsightsPage from './pages/InsightsPage';
import ProfilePage from './pages/ProfilePage';
import BottomNav from './components/BottomNav';
import SimplifiedPage from './pages/SimplifiedPage';
import LoginPage from './pages/LoginPage';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <DataProvider>
        {user ? <MainApp /> : <LoginPage />}
    </DataProvider>
  );
};

const MainApp: React.FC = () => {
    return (
      <HashRouter>
        <Main />
      </HashRouter>
    );
};

const Main: React.FC = () => {
    const location = useLocation();
    const isGroupDetail = location.pathname.startsWith('/group/');
  
    return (
      <div className="font-sans antialiased text-slate-200">
        <div className="max-w-md mx-auto bg-slate-900 min-h-screen">
          <main className="pb-20">
            <Routes>
              <Route path="/" element={<GroupsPage />} />
              <Route path="/group/:id" element={<GroupDetailPage />} />
              <Route path="/simplified" element={<SimplifiedPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </main>
          {!isGroupDetail && <BottomNav />}
        </div>
      </div>
    );
};


export default App;