import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Brokerage } from '../types';
import { NavItemConfig, NotificationItem } from '../App';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  users: User[];
  brokerage: Brokerage;
  currentView: string;
  setView: (view: string) => void;
  onSwitchUser: (userId: string) => void;
  onLogout: () => void;
  notifications: {
    items: NotificationItem[];
    hasTasks: boolean;
    hasEvents: boolean;
    totalCount: number;
  };
  navItems: NavItemConfig[];
  onUpdateNavItems: (items: NavItemConfig[]) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  users,
  brokerage, 
  currentView, 
  setView, 
  onSwitchUser,
  onLogout,
  notifications,
  navItems,
  onUpdateNavItems,
  isDarkMode,
  toggleDarkMode
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`flex h-screen overflow-hidden text-[12px] ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <aside className={`${isCollapsed ? 'w-24' : 'w-72'} bg-slate-900 text-slate-300 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-50`}>
        <div className={`px-6 pt-10 pb-6 flex flex-col items-center ${isCollapsed ? 'space-y-6' : 'items-start space-y-4'}`}>
          <div 
            className="flex items-center space-x-3 text-white overflow-hidden w-full cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setView('dashboard')}
          >
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <i className="fas fa-bolt text-indigo-100 text-sm"></i>
            </div>
            {!isCollapsed && (
              <h2 className="text-xl font-black tracking-tighter uppercase whitespace-nowrap">
                Agent Desk 360
              </h2>
            )}
          </div>
        </div>

        {/* Compact View Toggle Switch - Moved to top */}
        <div className="px-4 mb-4">
           <div 
             className={`flex items-center group cursor-pointer hover:bg-slate-800/50 p-3 rounded-xl transition-all ${isCollapsed ? 'justify-center' : 'justify-between bg-slate-800/30 border border-slate-800'}`}
             onClick={() => setIsCollapsed(!isCollapsed)}
             title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
           >
              {!isCollapsed && (
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300">Compact View</span>
              )}
              <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${isCollapsed ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${isCollapsed ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
           </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center transition-all group relative overflow-hidden ${
                isCollapsed ? 'justify-center py-4 rounded-2xl' : 'px-4 py-3 rounded-xl'
              } ${
                currentView === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <i className={`fas ${item.icon} ${isCollapsed ? 'text-xl' : 'w-8 text-lg'}`}></i>
              {!isCollapsed && <span className="flex-1 text-left font-black text-base">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4 px-2'}`}>
              <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover border-2 border-slate-700" />
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-white truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{user.role}</p>
                </div>
              )}
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`h-20 border-b flex items-center justify-between px-10 shrink-0 z-40 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center space-x-4">
             <h1 
               onClick={() => setView('dashboard')}
               className={`text-2xl font-black capitalize tracking-tight cursor-pointer hover:text-indigo-600 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
             >
               {currentView === 'lead-detail' ? 'Lead Profile' : currentView.replace('-', ' ')}
             </h1>
          </div>

          <div className={`hidden lg:flex items-center p-1 rounded-2xl border shadow-inner transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
             <button 
               onClick={() => setView('leads')} 
               className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 group ${currentView === 'leads' ? (isDarkMode ? 'bg-slate-900 text-blue-400' : 'bg-white shadow-sm text-blue-600') : 'text-slate-500 hover:text-slate-700'}`}
             >
               <i className={`fas fa-users text-[11px] ${currentView === 'leads' ? 'text-blue-500' : 'text-blue-400 group-hover:text-blue-500'}`}></i>
               <span>Leads</span>
             </button>
             <button 
               onClick={() => setView('contacts')} 
               className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 group ${currentView === 'contacts' ? (isDarkMode ? 'bg-slate-900 text-emerald-400' : 'bg-white shadow-sm text-emerald-600') : 'text-slate-500 hover:text-slate-700'}`}
             >
               <i className={`fas fa-address-book text-[11px] ${currentView === 'contacts' ? 'text-emerald-500' : 'text-emerald-400 group-hover:text-emerald-500'}`}></i>
               <span>Contacts</span>
             </button>
             <button 
               onClick={() => setView('marketing')} 
               className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 group ${currentView === 'marketing' ? (isDarkMode ? 'bg-slate-900 text-pink-400' : 'bg-white shadow-sm text-pink-600') : 'text-slate-500 hover:text-slate-700'}`}
             >
               <i className={`fas fa-envelope text-[11px] ${currentView === 'marketing' ? 'text-pink-500' : 'text-pink-400 group-hover:text-pink-500'}`}></i>
               <span>Email</span>
             </button>
             <button 
               onClick={() => setView('tasks')} 
               className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 group ${currentView === 'tasks' ? (isDarkMode ? 'bg-slate-900 text-orange-400' : 'bg-white shadow-sm text-orange-600') : 'text-slate-500 hover:text-slate-700'}`}
             >
               <i className={`fas fa-check-circle text-[11px] ${currentView === 'tasks' ? 'text-orange-500' : 'text-orange-400 group-hover:text-orange-500'}`}></i>
               <span>Tasks</span>
             </button>
          </div>

          <div className="flex items-center space-x-6">
            <button 
              onClick={toggleDarkMode}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm ${isDarkMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
            >
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
            </button>

            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all relative ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                <i className="fas fa-bell text-lg"></i>
                {notifications.totalCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                    {notifications.totalCount}
                  </span>
                )}
              </button>
            </div>

            <div className="relative" ref={profileDropdownRef}>
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className={`flex items-center space-x-3 p-1.5 pr-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
              >
                <img src={user.avatar} alt="avatar" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
                <div className="hidden lg:block text-left">
                   <p className={`text-xs font-black leading-none ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{user.firstName}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{user.role}</p>
                </div>
              </button>
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto p-6 md:p-10 transition-colors ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;