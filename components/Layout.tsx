import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Brokerage } from '../types.ts';
import { NavItemConfig, NotificationItem } from '../App.tsx';

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
  dashboardFilterId?: string;
  onSetDashboardFilterId?: (id: string) => void;
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
  toggleDarkMode,
  dashboardFilterId,
  onSetDashboardFilterId
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

  const isViewingAsAgent = user.role === UserRole.BROKER && dashboardFilterId && dashboardFilterId !== 'TEAM' && dashboardFilterId !== user.id;

  const brokerAdminButtonClass = (user.role === UserRole.BROKER && !isViewingAsAgent)
    ? 'bg-emerald-500/10 text-emerald-500' 
    : isViewingAsAgent ? 'bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20' : 'bg-slate-800/50 text-slate-400';

  const switchAgentButtonClass = (user.role === UserRole.AGENT || isViewingAsAgent || isAgentSwitcherOpen)
    ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20' 
    : 'text-slate-500 hover:text-slate-300';

  const handleBrokerAdminClick = () => {
    if (user.role === UserRole.BROKER) {
      if (isViewingAsAgent) {
        if (onSetDashboardFilterId) onSetDashboardFilterId('TEAM');
        setView('dashboard');
      } else {
        setView('dashboard');
      }
    } else if (adminUser) {
      onSwitchUser(adminUser.id);
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden text-[12px] selection:bg-indigo-500 selection:text-white ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Premium Sidebar */}
      <aside className={`${isCollapsed ? 'w-24' : 'w-72'} bg-[#0f172a] text-slate-300 flex flex-col shrink-0 transition-all duration-500 ease-in-out z-50 shadow-2xl relative`}>
        <div className="absolute inset-y-0 right-0 w-px bg-white/5"></div>
        
        <div className={`px-6 pt-10 pb-8 flex flex-col items-center ${isCollapsed ? 'space-y-8' : 'items-start space-y-6'}`}>
          <div 
            className="flex items-center space-x-4 text-white overflow-hidden w-full cursor-pointer group"
            onClick={() => setView('dashboard')}
          >
            <div className="w-11 h-11 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-2xl shadow-indigo-500/40 group-hover:scale-110 transition-transform duration-300">
              <i className="fas fa-bolt text-indigo-100 text-lg"></i>
            </div>
            {!isCollapsed && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                <h2 className="text-[22px] font-black tracking-tighter uppercase whitespace-nowrap">
                  Agent Desk <span className="text-indigo-400">360</span>
                </h2>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Compact View Toggle */}
        <div className="px-6 mb-8">
           <div 
             className={`flex items-center group cursor-pointer hover:bg-white/5 p-3.5 rounded-2xl transition-all border border-transparent ${isCollapsed ? 'justify-center' : 'justify-between bg-white/5 border-white/5 shadow-inner'}`}
             onClick={() => setIsCollapsed(!isCollapsed)}
           >
              {!isCollapsed && (
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">Compact View</span>
              )}
              <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0 ${isCollapsed ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isCollapsed ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
           </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const hasAlert = (item.id === 'calendar' && notifications.hasEvents) || (item.id === 'tasks' && notifications.hasTasks);
            
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center transition-all duration-300 group relative overflow-hidden ${
                  isCollapsed ? 'justify-center py-4 rounded-2xl' : 'px-4 py-3.5 rounded-2xl'
                } ${
                  isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/50' : 'hover:bg-white/5 text-slate-400 hover:text-slate-100'
                }`}
              >
                <i className={`fas ${item.icon} ${isCollapsed ? 'text-xl' : 'w-8 text-[20px]'} ${isActive ? 'text-white' : 'group-hover:text-indigo-400'}`}></i>
                {!isCollapsed && (
                  <div className="flex-1 flex items-center ml-1">
                    <span className={`text-left font-black text-[12.5px] tracking-tight transition-all ${isActive ? 'translate-x-1' : ''}`}>{item.label}</span>
                    {hasAlert && (
                      <span className="w-2 h-2 bg-orange-500 rounded-full animate-slow-blink shadow-[0_0_12px_rgba(249,115,22,0.8)] shrink-0 ml-2"></span>
                    )}
                  </div>
                )}
                
                {isCollapsed && hasAlert && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-orange-500 rounded-full animate-slow-blink shadow-[0_0_10px_rgba(249,115,22,0.6)]"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Global System Status & User Switching */}
        <div className="p-4 space-y-4 bg-slate-950/50 border-t border-white/5 backdrop-blur-md">
           <div className="flex flex-col space-y-2">
              <button 
                onClick={handleBrokerAdminClick}
                className={`flex items-center space-x-4 p-3.5 rounded-2xl transition-all duration-300 hover:bg-white/10 group ${isCollapsed ? 'justify-center' : ''} ${brokerAdminButtonClass}`}
                title={isViewingAsAgent ? "Return to Global Overview" : "Broker Control Center"}
              >
                <i className={`fas ${isViewingAsAgent ? 'fa-arrow-left' : 'fa-user-shield'} text-base`}></i>
                {!isCollapsed && (
                  <div className="text-left flex-1 overflow-hidden">
                    <p className="font-black uppercase text-[12px] tracking-widest leading-none">Broker Access</p>
                    {isViewingAsAgent && <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 truncate">Reset Filters</p>}
                  </div>
                )}
              </button>

              <div className="relative" ref={agentSwitcherRef}>
                <button 
                  onClick={() => setIsAgentSwitcherOpen(!isAgentSwitcherOpen)}
                  className={`w-full flex items-center space-x-4 p-3.5 rounded-2xl transition-all duration-300 hover:bg-white/10 group ${isCollapsed ? 'justify-center' : ''} ${switchAgentButtonClass}`}
                >
                  <i className="fas fa-users-between-lines text-base"></i>
                  {!isCollapsed && <span className="font-black uppercase text-[12px] tracking-widest flex-1 text-left">Agent Hub</span>}
                  {!isCollapsed && <i className={`fas fa-chevron-up text-[10px] transition-transform duration-300 ${isAgentSwitcherOpen ? 'rotate-180' : ''}`}></i>}
                </button>

                {isAgentSwitcherOpen && (
                  <div className="absolute bottom-full left-0 mb-3 w-72 bg-slate-900 border border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden py-3 z-50 animate-in slide-in-from-bottom-4 duration-300 backdrop-blur-xl">
                    <div className="px-6 py-2 border-b border-white/5 mb-2">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Select Active Profile</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto scrollbar-hide px-2 space-y-1">
                      {users.map(agent => (
                        <button 
                          key={agent.id}
                          onClick={() => { onSwitchUser(agent.id); setIsAgentSwitcherOpen(false); }}
                          className={`w-full text-left p-3 rounded-xl hover:bg-white/5 flex items-center space-x-4 transition-all ${user.id === agent.id ? 'bg-indigo-500/10 ring-1 ring-indigo-500/20' : ''}`}
                        >
                          <img src={agent.avatar} className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/5" alt="" />
                          <div className="overflow-hidden">
                            <p className={`text-[12.5px] font-black truncate ${user.id === agent.id ? 'text-indigo-400' : 'text-white'}`}>{agent.firstName} {agent.lastName}</p>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">{agent.role}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
           </div>

           <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4 px-2'} pt-4 border-t border-white/5`}>
              <div className="relative">
                <img src={user.avatar} alt="avatar" className="w-11 h-11 rounded-2xl object-cover ring-2 ring-indigo-600 ring-offset-2 ring-offset-[#0f172a] shadow-xl" />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0f172a] rounded-full"></div>
              </div>
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden animate-in fade-in duration-700">
                  <p className="font-black text-white truncate text-[12.5px] tracking-tight">{user.firstName} {user.lastName}</p>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">{user.role}</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">Verified</span>
                  </div>
                </div>
              )}
           </div>
        </div>
      </aside>

      {/* Main Framework */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className={`h-24 border-b flex items-center justify-between px-12 shrink-0 z-40 transition-all duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center space-x-8">
             <div className="flex flex-col">
               <h1 
                 onClick={() => setView('dashboard')}
                 className={`text-3xl font-black capitalize tracking-tighter cursor-pointer hover:text-indigo-600 transition-colors leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
               >
                 {currentView === 'lead-detail' ? 'Lead Profile' : currentView.replace('-', ' ')}
               </h1>
               <div className="flex items-center space-x-3 mt-1.5">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Agent Desk 360</span>
                 <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                 <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{brokerage.name}</span>
               </div>
             </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className={`hidden lg:flex items-center p-1.5 rounded-[1.5rem] border shadow-inner transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
               {[
                 { id: 'leads', label: 'Leads', icon: 'fa-users', color: 'text-blue-500', activeBg: 'text-blue-400' },
                 { id: 'contacts', label: 'Contacts', icon: 'fa-address-book', color: 'text-emerald-500', activeBg: 'text-emerald-400' },
                 { id: 'email', label: 'Mail', icon: 'fa-envelope', color: 'text-pink-500', activeBg: 'text-pink-400' },
                 { id: 'tasks', label: 'To Do', icon: 'fa-check-circle', color: 'text-orange-500', activeBg: 'text-orange-400' }
               ].map(btn => (
                 <button 
                   key={btn.id}
                   onClick={() => setView(btn.id)} 
                   className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center space-x-2.5 group ${currentView === btn.id ? (isDarkMode ? `bg-slate-900 ${btn.activeBg}` : `bg-white shadow-md ${btn.color.replace('500', '600')}`) : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   <i className={`fas ${btn.icon} text-[11px] ${currentView === btn.id ? btn.color : `opacity-40 group-hover:opacity-100 ${btn.color}`}`}></i>
                   <span>{btn.label}</span>
                 </button>
               ))}
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleDarkMode}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-sm active:scale-95 border ${isDarkMode ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-900/40' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
              </button>

              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all active:scale-95 relative ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'} ${isNotificationOpen ? 'ring-4 ring-indigo-500/20 border-indigo-500' : ''}`}
                >
                  <i className="fas fa-bell text-lg"></i>
                  {notifications.totalCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-in zoom-in">
                      {notifications.totalCount}
                    </span>
                  )}
                </button>

                {isNotificationOpen && (
                  <div className={`absolute right-0 mt-4 w-96 border rounded-[2.5rem] shadow-2xl z-[100] py-6 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-xl ${isDarkMode ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-slate-200'}`}>
                    <div className={`px-8 py-4 border-b mb-4 flex justify-between items-center ${isDarkMode ? 'border-slate-700' : 'border-slate-50'}`}>
                      <div>
                        <p className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Real-time Feed</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Critical System Alerts</p>
                      </div>
                      <span className="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full font-black shadow-lg uppercase">{notifications.totalCount} New</span>
                    </div>
                    <div className="max-h-[450px] overflow-y-auto scrollbar-hide px-2">
                      {notifications.items.length > 0 ? notifications.items.map(item => (
                        <button 
                          key={item.id}
                          onClick={() => { setView(item.view); setIsNotificationOpen(false); }}
                          className={`w-full text-left px-6 py-5 rounded-2xl flex items-start space-x-5 transition-all group mb-1 ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-indigo-50/50'}`}
                        >
                          <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-sm border-2 ${item.type === 'TASK' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                            <i className={`fas ${item.type === 'TASK' ? 'fa-check-circle' : 'fa-calendar-star'} text-lg`}></i>
                          </div>
                          <div className="overflow-hidden pt-1">
                            <p className={`text-base font-black truncate leading-tight transition-colors ${isDarkMode ? 'text-white' : 'text-slate-800'} group-hover:text-indigo-600`}>{item.title}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight flex items-center">
                               <span className={`w-1.5 h-1.5 rounded-full mr-2 ${item.type === 'TASK' ? 'bg-orange-400' : 'bg-indigo-400'}`}></span>
                               {item.description}
                            </p>
                          </div>
                        </button>
                      )) : (
                        <div className="py-24 text-center opacity-30">
                          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl text-slate-300">
                             <i className="fas fa-bell-slash"></i>
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inbox Zero Achieved</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-slate-100 mt-4 text-center">
                       <button className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] hover:text-indigo-700 transition-colors">Clear All Notifications</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={profileDropdownRef}>
                <button 
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className={`flex items-center space-x-4 p-2 pr-6 rounded-2xl border transition-all active:scale-95 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} ${isProfileDropdownOpen ? 'ring-4 ring-indigo-500/20 border-indigo-500' : ''}`}
                >
                  <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-xl object-cover shadow-xl ring-2 ring-white/10" />
                  <div className="hidden lg:block text-left overflow-hidden">
                     <p className={`text-sm font-black leading-none truncate max-w-[80px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.firstName}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 opacity-60">{user.role}</p>
                  </div>
                  <i className={`fas fa-chevron-down text-[10px] text-slate-300 transition-transform duration-300 ${isProfileDropdownOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {isProfileDropdownOpen && (
                  <div className={`absolute right-0 mt-4 w-72 border rounded-[2.5rem] shadow-2xl z-50 overflow-hidden py-4 animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-xl ${isDarkMode ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-slate-200'}`}>
                    <div className={`px-8 py-5 border-b mb-2 flex items-center space-x-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-50'}`}>
                      <img src={user.avatar} className="w-12 h-12 rounded-2xl object-cover shadow-sm" alt="" />
                      <div className="overflow-hidden">
                        <p className={`text-base font-black truncate leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.firstName} {user.lastName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate mt-1.5">{user.email}</p>
                      </div>
                    </div>
                    <div className="px-2 space-y-1">
                      <button 
                        onClick={() => { setView('profile'); setIsProfileDropdownOpen(false); }}
                        className={`w-full text-left px-6 py-4 flex items-center space-x-4 rounded-2xl transition-all group ${isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-indigo-50 text-slate-700'}`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                           <i className="fas fa-id-card"></i>
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">Agent Profile</span>
                      </button>
                      <button 
                        onClick={() => { setView('settings'); setIsProfileDropdownOpen(false); }}
                        className={`w-full text-left px-6 py-4 flex items-center space-x-4 rounded-2xl transition-all group ${isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-indigo-50 text-slate-700'}`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                           <i className="fas fa-sliders"></i>
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">Settings</span>
                      </button>
                    </div>
                    <div className={`h-px my-4 mx-8 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                    <div className="px-2">
                      <button 
                        onClick={() => { onLogout(); setIsProfileDropdownOpen(false); }}
                        className="w-full text-left px-6 py-5 flex items-center space-x-4 rounded-2xl hover:bg-rose-500/10 text-rose-500 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-all">
                           <i className="fas fa-power-off"></i>
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto p-8 md:p-12 transition-all duration-500 relative scrollbar-hide ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05),transparent)] pointer-events-none"></div>
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;