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
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const brokerUser = users.find(u => u.role === UserRole.BROKER) || users[0];
  const agents = users.filter(u => u.role === UserRole.AGENT);

  // Handle outside clicks for dropdowns
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (index !== overIdx) {
      setOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setOverIdx(null);
      return;
    }

    const newOrder = [...navItems];
    const [removed] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIndex, 0, removed);
    
    onUpdateNavItems(newOrder);
    setDraggedIdx(null);
    setOverIdx(null);
  };

  const handleNotificationClick = (view: string) => {
    setView(view);
    setIsNotificationOpen(false);
  };

  return (
    <div className={`flex h-screen overflow-hidden text-[12px] ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Sidebar */}
      <aside className={`${isCollapsed ? 'w-24' : 'w-72'} bg-slate-900 text-slate-300 flex flex-col shrink-0 transition-all duration-300 ease-in-out`}>
        <div className={`px-6 pt-10 pb-6 flex flex-col items-center ${isCollapsed ? 'space-y-6' : 'items-start space-y-4'}`}>
          <div 
            className="flex items-center space-x-3 text-white overflow-hidden w-full cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setView('dashboard')}
          >
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <i className="fas fa-bolt text-indigo-100 text-sm"></i>
            </div>
            {!isCollapsed && (
              <h2 className="text-xl font-black tracking-tighter uppercase whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                Agent Desk 360
              </h2>
            )}
          </div>
          
          <div className={`flex items-center justify-between w-full pt-2 ${isCollapsed ? 'justify-center' : ''}`}>
             {!isCollapsed && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compact View</span>}
             <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`relative w-12 h-6 rounded-full transition-all duration-500 flex items-center shrink-0 shadow-inner overflow-hidden border ${
                  isCollapsed 
                    ? 'bg-emerald-50 border-emerald-400' 
                    : 'bg-indigo-600 border-indigo-500'
                }`}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <div className={`absolute inset-0 opacity-20 transition-all duration-500 ${isCollapsed ? 'bg-emerald-200' : 'bg-indigo-200'}`}></div>
                <div className={`absolute w-5 h-5 bg-white rounded-full shadow-lg transform transition-all duration-500 flex items-center justify-center ${
                  isCollapsed ? 'translate-x-[25px]' : 'translate-x-[2px]'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${isCollapsed ? 'bg-emerald-50' : 'bg-indigo-600'}`}></div>
                </div>
              </button>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto scrollbar-hide">
          {navItems.map((item, idx) => {
            if (item.roleRestriction && item.roleRestriction !== user.role) return null;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={() => { setDraggedIdx(null); setOverIdx(null); }}
                className={`relative group transition-all duration-200 ${overIdx === idx ? 'pb-4' : ''} ${draggedIdx === idx ? 'opacity-30' : 'opacity-100'}`}
              >
                <NavItem 
                  active={currentView === item.id} 
                  onClick={() => setView(item.id)} 
                  icon={item.icon} 
                  label={item.label} 
                  isCollapsed={isCollapsed}
                  showDot={item.id === 'tasks' ? notifications.hasTasks : item.id === 'calendar' ? notifications.hasEvents : false}
                />
                {overIdx === idx && (
                   <div className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500/50 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={`p-4 border-t border-slate-800 space-y-3 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          <div className="w-full space-y-3">
             <button 
                onClick={() => onSwitchUser(brokerUser.id)}
                className={`w-full group relative overflow-hidden transition-all shadow-xl active:scale-[0.98] border ${isCollapsed ? 'p-2 rounded-xl' : 'p-4 rounded-2xl'} ${
                  user.role === UserRole.BROKER 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-900/40' 
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${user.role === UserRole.BROKER ? 'bg-white/20' : 'bg-emerald-600 text-white'}`}>
                      <i className="fas fa-shield-halved text-xs"></i>
                    </div>
                    {!isCollapsed && (
                      <div className="text-left animate-in fade-in slide-in-from-left-2 truncate">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 leading-none mb-1">Quick Switch</p>
                        <p className="text-xs font-black">Broker Account</p>
                      </div>
                    )}
                  </div>
                </div>
              </button>

              <div className="relative w-full">
                <button 
                  onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
                  className={`w-full group relative overflow-hidden transition-all shadow-xl active:scale-[0.98] border ${isCollapsed ? 'p-2 rounded-xl' : 'p-4 rounded-2xl'} ${
                    user.role === UserRole.AGENT 
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-900/40' 
                      : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${user.role === UserRole.AGENT ? 'bg-white/20' : 'bg-emerald-500 text-white'}`}>
                        <i className="fas fa-user-tie text-xs"></i>
                      </div>
                      {!isCollapsed && (
                        <div className="text-left animate-in fade-in slide-in-from-left-2 truncate">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 leading-none mb-1">Select User</p>
                          <p className="text-xs font-black">Agent Account</p>
                        </div>
                      )}
                    </div>
                    {!isCollapsed && <i className={`fas fa-chevron-up text-[8px] opacity-40 transition-transform ${isAgentDropdownOpen ? 'rotate-180' : ''}`}></i>}
                  </div>
                </button>

                {isAgentDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsAgentDropdownOpen(false)}></div>
                    <div className={`absolute bottom-full left-0 ${isCollapsed ? 'w-64' : 'right-0'} mb-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-2`}>
                       <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Active Roster</p>
                       </div>
                       <div className="max-h-48 overflow-y-auto scrollbar-hide py-1">
                          {agents.map(agent => (
                            <button
                              key={agent.id}
                              onClick={() => {
                                onSwitchUser(agent.id);
                                setIsAgentDropdownOpen(false);
                              }}
                              className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left ${user.id === agent.id ? 'bg-indigo-50 border-r-4 border-indigo-500' : ''}`}
                            >
                              <img src={agent.avatar} className="w-8 h-8 rounded-lg object-cover" alt="" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{agent.firstName} {agent.lastName}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate">{agent.licenseNumber || 'Agent'}</p>
                              </div>
                            </button>
                          ))}
                       </div>
                    </div>
                  </>
                )}
              </div>
          </div>

          <div 
            className={`flex items-center group transition-all w-full overflow-hidden ${isCollapsed ? 'justify-center py-2' : 'space-x-4 px-2 py-2'}`}
          >
            <div className="relative shrink-0 cursor-pointer" onClick={() => setView('profile')}>
               <img src={user.avatar} alt="User Avatar" className={`${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} rounded-full border-2 border-slate-700 shadow-md transition-all group-hover:scale-105 object-cover`} />
               <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
                 <i className="fas fa-cog text-[8px] text-white"></i>
               </div>
            </div>
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden animate-in fade-in slide-in-from-left-2">
                <div className="cursor-pointer" onClick={() => setView('profile')}>
                  <p className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{user.firstName} {user.lastName}</p>
                  <p className="text-[10px] text-slate-400 capitalize font-medium">{user.role.toLowerCase()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`h-20 border-b flex items-center justify-between px-10 shrink-0 z-40 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center space-x-4 overflow-hidden">
             <h1 
               onClick={() => setView('dashboard')}
               className={`text-2xl font-black capitalize tracking-tight cursor-pointer transition-all hover:text-indigo-600 active:scale-95 shrink-0 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
             >
               {currentView === 'lead-detail' ? 'Lead Profile' : currentView.replace('-', ' ')}
             </h1>
          </div>

          {/* New Center Navigation Tabs with Colorful Icons */}
          <div className={`hidden lg:flex items-center p-1 rounded-2xl border shadow-inner transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
             <button 
               onClick={() => setView('leads')} 
               className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${currentView === 'leads' ? (isDarkMode ? 'bg-slate-900 text-indigo-400 shadow-sm' : 'bg-white shadow-sm text-indigo-600') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               <i className={`fas fa-users text-[10px] ${currentView === 'leads' ? 'text-blue-600' : 'text-blue-500/60 group-hover:text-blue-500'}`}></i>
               <span>Leads</span>
             </button>
             <button 
               onClick={() => setView('contacts')} 
               className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${currentView === 'contacts' ? (isDarkMode ? 'bg-slate-900 text-indigo-400 shadow-sm' : 'bg-white shadow-sm text-indigo-600') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               <i className={`fas fa-address-book text-[10px] ${currentView === 'contacts' ? 'text-emerald-600' : 'text-emerald-500/60 group-hover:text-emerald-500'}`}></i>
               <span>Contacts</span>
             </button>
             <button 
               onClick={() => setView('marketing')} 
               className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${currentView === 'marketing' ? (isDarkMode ? 'bg-slate-900 text-indigo-400 shadow-sm' : 'bg-white shadow-sm text-indigo-600') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               <i className={`fas fa-envelope text-[10px] ${currentView === 'marketing' ? 'text-pink-600' : 'text-pink-500/60 group-hover:text-pink-500'}`}></i>
               <span>Email</span>
             </button>
             <button 
               onClick={() => setView('tasks')} 
               className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${currentView === 'tasks' ? (isDarkMode ? 'bg-slate-900 text-indigo-400 shadow-sm' : 'bg-white shadow-sm text-indigo-600') : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               <i className={`fas fa-check-circle text-[10px] ${currentView === 'tasks' ? 'text-orange-600' : 'text-orange-500/60 group-hover:text-orange-500'}`}></i>
               <span>Tasks</span>
             </button>
          </div>

          <div className="flex items-center space-x-6">
            {/* Dark Mode Toggle Button */}
            <button 
              onClick={toggleDarkMode}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 ${isDarkMode ? 'bg-indigo-600 text-white shadow-indigo-900/20' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
            </button>

            <div className={`hidden sm:flex text-sm font-bold px-4 py-2 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
              <i className="fas fa-building mr-2 text-indigo-500"></i>
              {brokerage.name}
            </div>
            
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all relative group/bell ${isNotificationOpen ? 'ring-2 ring-indigo-500' : ''} ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <i className={`fas fa-bell text-lg ${notifications.totalCount > 0 ? 'animate-[vibrate_0.5s_infinite_linear]' : ''}`}></i>
                {notifications.totalCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-[0_0_12px_rgba(249,115,22,0.8)] animate-pulse">
                    {notifications.totalCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className={`absolute right-0 mt-3 w-80 border rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] py-4 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-50 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                  <div className={`px-6 py-4 border-b mb-2 flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                    <h3 className="text-base font-black uppercase tracking-widest">Inbox</h3>
                    <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase">{notifications.totalCount} New</span>
                  </div>
                  
                  <div className="max-h-[400px] overflow-y-auto scrollbar-hide px-2">
                    {notifications.items.length > 0 ? (
                      notifications.items.map((item) => (
                        <button 
                          key={item.id}
                          onClick={() => handleNotificationClick(item.view)}
                          className={`w-full flex items-start space-x-4 p-4 rounded-2xl transition-all group border-b last:border-0 ${isDarkMode ? 'hover:bg-slate-800 border-slate-800' : 'hover:bg-indigo-50/50 border-slate-50'}`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform ${item.type === 'TASK' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                            <i className={`fas ${item.type === 'TASK' ? 'fa-check-circle' : 'fa-calendar-star'} text-sm`}></i>
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-black truncate">{item.title}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.description}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="py-12 text-center text-slate-300">
                        <i className="fas fa-bell-slash text-4xl mb-4 opacity-20"></i>
                        <p className="text-[10px] font-black uppercase tracking-widest">All caught up!</p>
                      </div>
                    )}
                  </div>

                  <div className={`mt-4 px-6 pt-4 border-t flex justify-center ${isDarkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-50 bg-slate-50/50'}`}>
                    <button 
                      onClick={() => handleNotificationClick('tasks')}
                      className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                    >
                      View All Alerts
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown Component */}
            <div className="relative" ref={profileDropdownRef}>
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className={`flex items-center space-x-3 p-1.5 pr-4 rounded-2xl border transition-all active:scale-[0.98] ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-indigo-600' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'}`}
              >
                <img src={user.avatar} alt="avatar" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
                <div className="hidden lg:block text-left">
                   <p className={`text-xs font-black leading-none ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{user.firstName}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{user.role}</p>
                </div>
                <i className={`fas fa-chevron-down text-[9px] text-slate-300 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`}></i>
              </button>

              {isProfileDropdownOpen && (
                <div className={`absolute right-0 mt-3 w-72 border rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] py-4 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-50 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                  <div className={`px-6 py-4 border-b mb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                    <div className="flex items-center space-x-4">
                       <img src={user.avatar} className="w-12 h-12 rounded-2xl object-cover shadow-lg" alt="" />
                       <div className="min-w-0">
                         <p className="text-base font-black truncate">{user.firstName} {user.lastName}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{user.email}</p>
                       </div>
                    </div>
                  </div>
                  
                  <div className="px-3 space-y-1">
                    <button 
                      onClick={() => { setView('profile'); setIsProfileDropdownOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                        <i className="fas fa-user-circle text-sm"></i>
                      </div>
                      <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>My Profile</span>
                    </button>
                    
                    <button 
                      onClick={() => { setView('settings'); setIsProfileDropdownOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all group ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center transition-colors group-hover:bg-slate-800 group-hover:text-white">
                        <i className="fas fa-cog text-sm"></i>
                      </div>
                      <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Account Settings</span>
                    </button>

                    <div className={`h-px my-2 mx-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}></div>

                    <button 
                      onClick={onLogout}
                      className="w-full flex items-center space-x-3 px-4 py-3.5 hover:bg-rose-50 rounded-2xl transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center transition-colors group-hover:bg-rose-600 group-hover:text-white">
                        <i className="fas fa-sign-out-alt text-sm"></i>
                      </div>
                      <span className="text-sm font-bold text-rose-600">Sign Out</span>
                    </button>
                  </div>

                  <div className={`mt-4 px-6 pt-4 border-t ${isDarkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-50 bg-slate-50/50'}`}>
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                       <span>Status</span>
                       <span className="text-emerald-500 flex items-center"><i className="fas fa-circle text-[6px] mr-1.5"></i>Secure Session</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto p-6 md:p-10 transition-colors ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
          {children}
        </div>
      </main>
      <style>{`
        @keyframes vibrate {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(8deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(-8deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, showDot, isCollapsed }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center transition-all group relative overflow-hidden ${
      isCollapsed ? 'justify-center py-4 rounded-2xl' : 'px-4 py-3 rounded-xl'
    } ${
      active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 translate-x-1' : 'hover:bg-slate-800 text-slate-400'
    }`}
    title={isCollapsed ? label : ""}
  >
    <i className={`fas ${icon} ${isCollapsed ? 'text-xl' : 'w-8 text-lg'}`}></i>
    {!isCollapsed && (
      <span className="flex-1 text-left font-black text-base animate-in fade-in slide-in-from-left-2">
        {label}
      </span>
    )}
    {!isCollapsed && (
      <i className="fas fa-grip-vertical text-white/10 group-hover:text-white/30 text-[10px] absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity"></i>
    )}
    {showDot && (
      <span className={`absolute bg-orange-500 rounded-full border-2 border-slate-900 shadow-[0_0_12px_rgba(249,115,22,0.9)] animate-pulse ${
        isCollapsed ? 'right-4 top-4 w-3.5 h-3.5' : 'left-9 top-3 w-3 h-3'
      }`}></span>
    )}
  </button>
);

export default Layout;