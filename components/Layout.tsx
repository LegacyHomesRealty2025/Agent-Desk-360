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
  const [isAgentSwitcherOpen, setIsAgentSwitcherOpen] = useState(false);
  
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const agentSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (agentSwitcherRef.current && !agentSwitcherRef.current.contains(event.target as Node)) {
        setIsAgentSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const adminUser = users.find(u => u.role === UserRole.BROKER);
  const otherAgents = users.filter(u => u.id !== user.id);

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

        {/* Compact View Toggle Switch */}
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

        {/* User Switching Area (Taskbar bottom left) */}
        <div className="p-4 space-y-3 bg-slate-950/30">
           <div className="flex flex-col space-y-2">
              {/* Admin Switcher - light green in admin view, light red in agent view */}
              <button 
                onClick={() => adminUser && onSwitchUser(adminUser.id)}
                className={`flex items-center space-x-3 p-3 rounded-xl transition-all hover:bg-indigo-600 hover:text-white group ${isCollapsed ? 'justify-center' : ''} ${
                  user.role === UserRole.BROKER 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/20 text-rose-400'
                }`}
                title="Switch to Broker/Admin Screen"
              >
                <i className="fas fa-user-shield text-base"></i>
                {!isCollapsed && <span className="font-black uppercase text-[10px] tracking-widest">Broker/Admin</span>}
              </button>

              {/* Agent Switcher - light green when an agent is active */}
              <div className="relative" ref={agentSwitcherRef}>
                <button 
                  onClick={() => setIsAgentSwitcherOpen(!isAgentSwitcherOpen)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all hover:bg-slate-800 group ${isCollapsed ? 'justify-center' : ''} ${
                    (user.role === UserRole.AGENT || isAgentSwitcherOpen)
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'text-slate-500'
                  }`}
                  title="Switch Between Agents"
                >
                  <i className="fas fa-users-between-lines text-base"></i>
                  {!isCollapsed && <span className="font-black uppercase text-[10px] tracking-widest">Switch Agent</span>}
                </button>

                {isAgentSwitcherOpen && (
                  <div className={`absolute bottom-full left-0 mb-2 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden py-2 z-50 animate-in slide-in-from-bottom-2 duration-200`}>
                    <p className="px-4 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700/50 mb-1">Select Active Agent</p>
                    {otherAgents.map(agent => (
                      <button 
                        key={agent.id}
                        onClick={() => { onSwitchUser(agent.id); setIsAgentSwitcherOpen(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center space-x-3 transition-colors"
                      >
                        <img src={agent.avatar} className="w-8 h-8 rounded-lg object-cover" alt="" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate">{agent.firstName} {agent.lastName}</p>
                          <p className="text-[9px] text-slate-400 uppercase">{agent.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
           </div>

           <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4 px-2'} pt-3 border-t border-slate-800`}>
              <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover border-2 border-indigo-600" />
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-white truncate leading-none">{user.firstName} {user.lastName}</p>
                  <p className="text-[9px] text-slate-500 uppercase mt-1 tracking-widest font-black">{user.role}</p>
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
               onClick={() => setView('email')} 
               className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 group ${currentView === 'email' ? (isDarkMode ? 'bg-slate-900 text-pink-400' : 'bg-white shadow-sm text-pink-600') : 'text-slate-500 hover:text-slate-700'}`}
             >
               <i className={`fas fa-envelope text-[11px] ${currentView === 'email' ? 'text-pink-500' : 'text-pink-400 group-hover:text-pink-500'}`}></i>
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
                className={`flex items-center space-x-3 p-1.5 pr-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} ${isProfileDropdownOpen ? 'ring-2 ring-indigo-500' : ''}`}
              >
                <img src={user.avatar} alt="avatar" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
                <div className="hidden lg:block text-left">
                   <p className={`text-xs font-black leading-none ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{user.firstName}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{user.role}</p>
                </div>
                <i className={`fas fa-chevron-down text-[8px] text-slate-400 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`}></i>
              </button>

              {isProfileDropdownOpen && (
                <div className={`absolute right-0 mt-3 w-64 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden py-3 animate-in fade-in slide-in-from-top-3 duration-200 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}>
                  <div className="px-6 py-3 border-b border-slate-50 mb-2">
                    <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.firstName} {user.lastName}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => { setView('profile'); setIsProfileDropdownOpen(false); }}
                    className={`w-full text-left px-6 py-3 flex items-center space-x-4 hover:bg-indigo-50 transition-colors group ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'text-slate-700'}`}
                  >
                    <i className="fas fa-id-card text-slate-400 group-hover:text-indigo-600"></i>
                    <span className="text-xs font-black uppercase tracking-widest">Profile Setting</span>
                  </button>
                  <button 
                    onClick={() => { setView('settings'); setIsProfileDropdownOpen(false); }}
                    className={`w-full text-left px-6 py-3 flex items-center space-x-4 hover:bg-indigo-50 transition-colors group ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'text-slate-700'}`}
                  >
                    <i className="fas fa-cog text-slate-400 group-hover:text-indigo-600"></i>
                    <span className="text-xs font-black uppercase tracking-widest">Account Setting</span>
                  </button>
                  <div className="h-px bg-slate-50 my-2 mx-4"></div>
                  <button 
                    onClick={() => { onLogout(); setIsProfileDropdownOpen(false); }}
                    className="w-full text-left px-6 py-3 flex items-center space-x-4 hover:bg-rose-50 text-rose-500 transition-colors group"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    <span className="text-xs font-black uppercase tracking-widest">Sign Out</span>
                  </button>
                </div>
              )}
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