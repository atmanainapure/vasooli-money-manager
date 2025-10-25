import React from 'react';
import { NavLink } from 'react-router-dom';

type NavIconProps = {
    children: React.ReactNode;
    isActive: boolean;
};

const NavIcon: React.FC<NavIconProps> = ({ children, isActive }) => (
    <div className={`flex flex-col items-center transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-400'}`}>
        {children}
    </div>
);


const BottomNav: React.FC = () => {
  const iconClass = "h-6 w-6 mb-1";
  
  return (
    <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-800 border-t border-slate-700">
      <nav className="flex justify-around py-2">
        <NavLink to="/" end>
          {({ isActive }) => (
            <NavIcon isActive={isActive}>
              <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <span className="text-xs font-medium">Groups</span>
            </NavIcon>
          )}
        </NavLink>
        <NavLink to="/simplified">
          {({ isActive }) => (
            <NavIcon isActive={isActive}>
              <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h18m-7.5-14L21 7.5m0 0L16.5 12M21 7.5H3" /></svg>
              <span className="text-xs font-medium">Simplified</span>
            </NavIcon>
          )}
        </NavLink>
        <NavLink to="/insights">
          {({ isActive }) => (
            <NavIcon isActive={isActive}>
              <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
              <span className="text-xs font-medium">Insights</span>
            </NavIcon>
          )}
        </NavLink>
        <NavLink to="/profile">
          {({ isActive }) => (
            <NavIcon isActive={isActive}>
               <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span className="text-xs font-medium">Profile</span>
            </NavIcon>
          )}
        </NavLink>
      </nav>
    </footer>
  );
};

export default BottomNav;