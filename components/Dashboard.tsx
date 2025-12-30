import React, { useState, useMemo, useEffect } from 'react';
import { Lead, User, Deal, UserRole, OpenHouse, Task } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell } from 'recharts';

interface DashboardProps {
  leads: Lead[];
  user: User;
  agents: User[];
  deals: Deal[];
  tasks: Task[];
  openHouses: OpenHouse[];
  onNavigate: (view: string) => void;
  onInviteUser?: (email: string, role: UserRole) => string;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  viewingAgentId: string;
  onSetViewingAgentId: (id: string) => void;
}

const TZ = 'America/Los_Angeles';
const COLORS = ['#6366f1', '#4ade80', '#fbbf24', '#f87171', '#a78bfa'];

const Dashboard: React.FC<DashboardProps> = ({ 
  leads, 
  user, 
  agents, 
  deals, 
  tasks, 
  openHouses, 
  onNavigate, 
  onInviteUser, 
  isDarkMode, 
  toggleDarkMode,
  viewingAgentId,
  onSetViewingAgentId
}) => {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.AGENT);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  // Filter data based on selected agent
  const dashboardDeals = useMemo(() => {
    if (viewingAgentId === 'TEAM') return deals;
    return deals.filter(d => d.assignedUserId === viewingAgentId);
  }, [deals, viewingAgentId]);

  const dashboardLeads = useMemo(() => {
    if (viewingAgentId === 'TEAM') return leads;
    return leads.filter(l => l.assignedAgentId === viewingAgentId);
  }, [leads, viewingAgentId]);

  const dashboardTasks = useMemo(() => {
    if (viewingAgentId === 'TEAM') return tasks;
    return tasks.filter(t => t.assignedUserId === viewingAgentId);
  }, [tasks, viewingAgentId]);

  const dashboardOpenHouses = useMemo(() => {
    if (viewingAgentId === 'TEAM') return openHouses;
    return openHouses.filter(oh => oh.assignedAgentId === viewingAgentId);
  }, [openHouses, viewingAgentId]);

  const selectedAgentData = useMemo(() => 
    agents.find(a => a.id === viewingAgentId), 
  [agents, viewingAgentId]);

  // Utility for LA Time parts
  const getLAPart = (date: string | Date, part: 'month' | 'year' | 'day') => {
    const options: any = { timeZone: TZ };
    if (part === 'month') options.month = 'numeric';
    if (part === 'year') options.year = 'numeric';
    if (part === 'day') options.day = 'numeric';
    const val = new Intl.DateTimeFormat('en-US', options).format(new Date(date));
    return parseInt(val);
  };

  const isTodayMonthDay = (dateStr?: string) => {
    if (!dateStr) return false;
    const laNow = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
    const d = new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: TZ }));
    return d.getMonth() === laNow.getMonth() && d.getDate() === laNow.getDate();
  };

  const currentLAMonthIdx = getLAPart(new Date(), 'month') - 1;

  // Milestone Counts for Today
  const milestoneCounts = useMemo(() => {
    const todos = dashboardTasks.filter(t => !t.isCompleted).length;
    const birthdays = dashboardLeads.filter(l => isTodayMonthDay(l.dob)).length;
    const weddingAnnivs = dashboardLeads.filter(l => isTodayMonthDay(l.weddingAnniversary)).length;
    const homeAnnivs = dashboardLeads.filter(l => isTodayMonthDay(l.homeAnniversary)).length;
    return { todos, birthdays, weddingAnnivs, homeAnnivs };
  }, [dashboardTasks, dashboardLeads]);

  // Lead Source Calculation
  const leadSourceData = useMemo(() => {
    const sources: Record<string, number> = {};
    dashboardLeads.forEach(l => {
      sources[l.source] = (sources[l.source] || 0) + 1;
    });
    return Object.entries(sources)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [dashboardLeads]);

  const closedDeals = dashboardDeals.filter(d => d.status === 'CLOSED');
  const pendingDeals = dashboardDeals.filter(d => d.status === 'PENDING');
  const activeDeals = dashboardDeals.filter(d => d.status === 'ACTIVE');

  const totalVolume = closedDeals.reduce((sum, d) => sum + d.salePrice, 0);
  const earnedComm = closedDeals.reduce((sum, d) => sum + d.commissionAmount, 0);
  const pendingComm = pendingDeals.reduce((sum, d) => sum + d.commissionAmount, 0);
  const activeComm = activeDeals.reduce((sum, d) => sum + d.commissionAmount, 0);
  const totalUnits = closedDeals.length;

  const activeListingVolume = activeDeals.reduce((sum, d) => sum + d.salePrice, 0);
  const pendingListingVolume = pendingDeals.reduce((sum, d) => sum + d.salePrice, 0);

  const totalCheckIns = dashboardOpenHouses.reduce((sum, oh) => sum + (oh.visitorCount || 0), 0);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = monthNames.map((name, index) => {
    const monthVolume = closedDeals
      .filter(d => getLAPart(d.date, 'month') - 1 === index)
      .reduce((sum, d) => sum + d.salePrice, 0);
    return { month: name, value: monthVolume };
  });

  const pipelineData = [
    { name: 'Active', value: activeListingVolume, color: '#4ade80' }, 
    { name: 'Pending', value: pendingListingVolume, color: '#22c55e' }, 
  ];

  const handleOpenInvite = () => {
    setInviteEmail('');
    setGeneratedInviteLink('');
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (onInviteUser) {
      const inviteId = onInviteUser(inviteEmail, inviteRole);
      const baseUrl = window.location.origin + window.location.pathname;
      setGeneratedInviteLink(`${baseUrl}?invite=${inviteId}`);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(generatedInviteLink);
    alert('Invitation link copied to clipboard!');
  };

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-8 ${isDarkMode ? 'dark' : ''}`}>
      {/* Branded Premium Header */}
      <div className={`rounded-[2rem] p-8 md:p-10 border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative group transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
          <div className={`absolute top-0 right-0 w-[24rem] h-[24rem] rounded-full -mr-32 -mt-32 blur-[80px] transition-transform group-hover:scale-110 duration-1000 ${isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50/30'}`}></div>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left w-full md:w-auto">
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-baseline md:space-x-4">
               <h1 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {viewingAgentId === 'TEAM' ? 'Team' : `${selectedAgentData?.firstName} ${selectedAgentData?.lastName}`} Production
              </h1>
              <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{viewingAgentId === 'TEAM' ? 'Brokerage' : 'Agent'} View</span>
            </div>
            <p className="text-slate-500 font-semibold max-w-2xl text-lg leading-snug">
              {viewingAgentId === 'TEAM' ? 'Viewing combined performance for the entire office.' : `Analyzing production metrics for ${selectedAgentData?.firstName} ${selectedAgentData?.lastName}.`}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 relative z-10 w-full md:w-auto">
          {/* Dashboard Theme Toggle */}
          <button 
            onClick={toggleDarkMode}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 ${isDarkMode ? 'bg-slate-800 text-yellow-400 border-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
          >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
          </button>

          {user.role === UserRole.BROKER && (
            <div className="relative w-full sm:w-auto">
              <button 
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className={`w-full sm:w-auto px-6 py-4 border rounded-xl flex items-center justify-between space-x-4 transition-all shadow-sm group/btn ${
                  viewingAgentId === 'TEAM' 
                    ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700 shadow-xl shadow-blue-900/20' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {viewingAgentId === 'TEAM' ? (
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white text-xs">
                      <i className="fas fa-users"></i>
                    </div>
                  ) : (
                    <img src={selectedAgentData?.avatar} className="w-8 h-8 rounded-lg object-cover" alt="avatar" />
                  )}
                  <div className="text-left min-w-[80px]">
                    <p className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1 ${viewingAgentId === 'TEAM' ? 'text-blue-100' : 'text-slate-400'}`}>Performance Filter</p>
                    <p className="text-xs font-black leading-none">{viewingAgentId === 'TEAM' ? 'Entire Team' : selectedAgentData?.firstName}</p>
                  </div>
                </div>
                <i className={`fas fa-chevron-down text-[10px] transition-transform ${isSwitcherOpen ? 'rotate-180' : ''} ${viewingAgentId === 'TEAM' ? 'text-white/60' : 'text-slate-400'}`}></i>
              </button>

              {isSwitcherOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSwitcherOpen(false)}></div>
                  <div className={`absolute right-0 mt-3 w-72 border rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <button 
                      onClick={() => { onSetViewingAgentId('TEAM'); setIsSwitcherOpen(false); }}
                      className={`w-full text-left px-5 py-4 hover:bg-slate-50 flex items-center space-x-4 transition-colors ${viewingAgentId === 'TEAM' ? 'bg-indigo-50 border-r-4 border-indigo-600' : ''} ${isDarkMode ? 'text-white hover:bg-slate-700' : 'text-slate-800'}`}
                    >
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-sm">
                        <i className="fas fa-users"></i>
                      </div>
                      <div>
                        <p className="text-sm font-black">Viewing Entire Team</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Aggregate Production</p>
                      </div>
                    </button>
                    <div className="h-px bg-slate-100 my-1 mx-4"></div>
                    <div className="max-h-80 overflow-y-auto scrollbar-hide py-1">
                      {agents.map(agent => (
                        <button 
                          key={agent.id}
                          onClick={() => { onSetViewingAgentId(agent.id); setIsSwitcherOpen(false); }}
                          className={`w-full text-left px-5 py-3 flex items-center space-x-4 transition-colors ${viewingAgentId === agent.id ? 'bg-indigo-50 border-r-4 border-indigo-500' : ''} ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          <img src={agent.avatar} className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-100" alt="" />
                          <div>
                            <p className="text-sm font-black">{agent.firstName} {agent.lastName}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{agent.role}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {user.role === UserRole.BROKER && (
            <button 
              onClick={handleOpenInvite}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center space-x-3 active:scale-[0.98]"
            >
              <i className="fas fa-paper-plane"></i>
              <span>Invite Agent</span>
            </button>
          )}

          <button 
            onClick={() => onNavigate('pipeline')}
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center space-x-3 active:scale-[0.98]"
          >
            <i className="fas fa-plus"></i>
            <span>New Listing</span>
          </button>
        </div>
      </div>

      {/* Team Snapshot Sections */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3 text-slate-800 px-2">
          <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
          <h2 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
            {viewingAgentId === 'TEAM' ? 'Team Snapshot' : 'Individual Snapshot'}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Box 1: Pipeline Volume */}
          <div className={`rounded-[2rem] p-6 shadow-sm flex flex-col items-center group relative overflow-hidden h-[360px] border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
            <h3 className="text-lg font-black self-start mb-1">Pipeline Volume</h3>
            <div className="relative h-48 w-full flex items-center justify-center overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={85}
                    outerRadius={120}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    {pipelineData.map((entry, index) => (
                      <PieCell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center w-full px-4">
                <p className={`text-[1.5rem] font-black leading-none tracking-tight whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>${(activeListingVolume + pendingListingVolume).toLocaleString()}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2.5">TOTAL PIPELINE VALUE</p>
              </div>
            </div>
            <div className="w-full grid grid-cols-2 gap-3 mt-auto mb-1">
              <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#4ade80]"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ACTIVE</span>
                </div>
                <p className="text-base font-black">${activeListingVolume.toLocaleString()}</p>
              </div>
              <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PENDING</span>
                </div>
                <p className="text-base font-black">${pendingListingVolume.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Box 2: Commission Tracking */}
          <div className={`rounded-[2rem] p-6 shadow-sm flex flex-col justify-between h-[360px] group border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
            <div>
              <h3 className="text-lg font-black mb-1">Commission Tracking</h3>
              <p className="text-[11px] text-slate-400 font-semibold mb-6">Estimated Gross Commission Income (GCI).</p>
              <div className="space-y-5 mb-4">
                <div className="space-y-1.5">
                   <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                     <span>Earnings Consistency</span>
                     <span className={`${isDarkMode ? 'text-slate-200' : 'text-slate-800'} font-black`}>75%</span>
                   </div>
                   <div className={`h-2 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="h-full bg-indigo-600 rounded-full shadow-lg" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div className="space-y-1.5">
                   <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                     <span>Conversion Target</span>
                     <span className={`${isDarkMode ? 'text-slate-200' : 'text-slate-800'} font-black`}>65%</span>
                   </div>
                   <div className={`h-2 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="h-full bg-emerald-500 rounded-full shadow-lg" style={{ width: '65%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full grid grid-cols-3 gap-3 mt-auto mb-1">
              <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">EARNED</p>
                <p className="text-[12px] font-black truncate">${earnedComm.toLocaleString()}</p>
              </div>
              <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">PENDING</p>
                <p className="text-[12px] font-black truncate">${pendingComm.toLocaleString()}</p>
              </div>
              <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ACTIVE</p>
                <p className="text-[12px] font-black truncate">${activeComm.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Box 3: Daily Schedule */}
          <div className={`rounded-[2rem] p-6 shadow-sm flex flex-col h-[360px] group border transition-all relative ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-black">Daily Schedule</h3>
               <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xs shadow-sm transition-all">
                 <i className="fas fa-calendar-check"></i>
               </div>
             </div>
             
             <div className="space-y-2.5 flex-1 overflow-y-auto scrollbar-hide">
                {[
                  { label: 'To Do', val: milestoneCounts.todos, icon: 'fa-check', color: 'text-indigo-600', bg: 'bg-indigo-50', view: 'tasks' },
                  { label: 'Birthdays', val: milestoneCounts.birthdays, icon: 'fa-cake-candles', color: 'text-pink-600', bg: 'bg-pink-50', view: 'calendar' },
                  { label: 'Wedding Anniv.', val: milestoneCounts.weddingAnnivs, icon: 'fa-ring', color: 'text-blue-600', bg: 'bg-blue-50', view: 'calendar' },
                  { label: 'Home Anniv.', val: milestoneCounts.homeAnnivs, icon: 'fa-house-chimney-user', color: 'text-emerald-600', bg: 'bg-emerald-50', view: 'calendar' }
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => onNavigate(item.view)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all group/row ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-md'}`}
                  >
                    <div className="flex items-center space-x-3.5">
                       <div className={`w-9 h-9 ${item.bg} ${item.color} rounded-xl flex items-center justify-center text-xs transition-transform group-hover/row:scale-110 shadow-sm shrink-0`}>
                         <i className={`fas ${item.icon}`}></i>
                       </div>
                       <span className={`text-[11px] font-black uppercase tracking-[0.1em] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{item.label}</span>
                    </div>
                    <span className="text-xl font-black leading-none">{item.val}</span>
                  </button>
                ))}
             </div>
             
             <div className={`pt-4 mt-3 border-t flex justify-center items-center mt-auto ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                <button onClick={() => onNavigate('calendar')} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">VIEW ALL</button>
             </div>
          </div>
        </div>
      </section>

      {/* Analytics Grid */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3 text-slate-800 px-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
          <h2 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">Growth Metrics</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <ProductionStatCard isDarkMode={isDarkMode} label="Total Volume Closed" value={`$${totalVolume.toLocaleString()}`} trend="Real-time" isDecrease={false} comparison="CLOSED TRANSACTIONS" />
          <ProductionStatCard isDarkMode={isDarkMode} label="Average Deal Size" value={`$${totalUnits > 0 ? (totalVolume/totalUnits).toLocaleString() : 0}`} trend="Avg" isDecrease={false} comparison="CLOSED SALES" />
          <ProductionStatCard isDarkMode={isDarkMode} label="Gross GCI" value={`$${earnedComm.toLocaleString()}`} trend="Earned" isDecrease={false} comparison="TOTAL REVENUE" />
          <ProductionStatCard isDarkMode={isDarkMode} label="Transactions" value={`${totalUnits} units`} trend="Count" isDecrease={false} comparison="CLOSED YTD" />
          <ProductionStatCard 
            isDarkMode={isDarkMode}
            label="Open House Activity" 
            value={`${totalCheckIns} visits`} 
            trend="Total" 
            isDecrease={false} 
            comparison="CHECK-INS RECORDED" 
            onClick={() => onNavigate('open-house')} 
            cursorPointer={true}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 border rounded-[2rem] shadow-sm p-8 md:p-10 h-[480px] transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black">Monthly Volume Performance</h3>
               <div className="flex space-x-3">
                 <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{viewingAgentId === 'TEAM' ? 'TEAM' : 'AGENT'} TOTALS</span>
               </div>
            </div>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 25, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={isDarkMode ? "#334155" : "#f1f5f9"} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={11} 
                    tick={{fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 800}} 
                    dy={12} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={10} 
                    tick={{fill: '#94a3b8', fontWeight: 700}} 
                    tickFormatter={(val) => `$${val/1000}K`} 
                    dx={-5}
                  />
                  <Tooltip cursor={{fill: isDarkMode ? '#1e293b' : '#f8fafc', opacity: 0.8}} contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#fff', color: isDarkMode ? '#fff' : '#000', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32} fill="#1e293b">
                    {monthlyData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === currentLAMonthIdx ? '#6366f1' : isDarkMode ? '#475569' : '#334155'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`border rounded-[2rem] shadow-sm p-8 flex flex-col h-[480px] transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black">
                Lead Sources
              </h3>
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <i className="fas fa-bullseye text-indigo-500 text-xs"></i>
              </div>
            </div>
            
            <div className="relative h-64 mb-8 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {leadSourceData.map((entry, index) => (
                      <PieCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-3xl font-black">{dashboardLeads.length}</p>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Leads</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 overflow-y-auto max-h-[220px] pr-1 scrollbar-hide flex-1">
              {leadSourceData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between group">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className={`text-sm font-black truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{s.name}</span>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-sm font-black">{s.value}</span>
                    <div className={`w-16 h-1.5 rounded-full overflow-hidden border ${isDarkMode ? 'bg-slate-800 border-slate-800' : 'bg-slate-100 border-slate-100'}`}>
                      <div className="h-full rounded-full" style={{ width: `${(s.value / (dashboardLeads.length || 1)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                    </div>
                  </div>
                </div>
              ))}
              {leadSourceData.length === 0 && (
                <p className="text-center text-[10px] font-bold text-slate-400 italic py-4">No source data recorded.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Invitation Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsInviteModalOpen(false)}></div>
           <div className={`rounded-[2.5rem] shadow-2xl border w-full max-w-lg p-10 relative z-10 animate-in zoom-in-95 duration-200 text-[12px] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black tracking-tight">Invite New Agent</h3>
                <button onClick={() => setIsInviteModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"><i className="fas fa-times"></i></button>
              </div>

              {!generatedInviteLink ? (
                <form onSubmit={handleSendInvite} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agent Email Address</label>
                    <input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="agent@email.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Role</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)} className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                      <option value={UserRole.AGENT}>Real Estate Agent</option>
                      <option value={UserRole.BROKER}>Broker / Admin</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Generate Invite Link</button>
                </form>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-xl shadow-sm"><i className="fas fa-check-circle"></i></div>
                    <div>
                      <p className="text-emerald-900 font-black text-sm">Invitation Prepared</p>
                      <p className="text-emerald-700 font-medium">Share the link below with {inviteEmail}.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invitation Link</label>
                    <div className={`flex items-center space-x-2 border rounded-2xl p-2 pl-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <code className="flex-1 text-xs text-blue-600 font-bold truncate">{generatedInviteLink}</code>
                      <button onClick={copyInviteLink} className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all"><i className="fas fa-copy"></i></button>
                    </div>
                  </div>

                  <p className="text-slate-400 text-[10px] italic font-medium leading-relaxed">This is a simulated secure invitation. In a production environment, this link would be sent via email with a cryptographic token valid for 48 hours.</p>
                  
                  <button onClick={() => setIsInviteModalOpen(false)} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all ${isDarkMode ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-black'}`}>Done</button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

const ProductionStatCard = ({ label, value, trend, isDecrease, comparison, onClick, cursorPointer, isDarkMode }: any) => (
  <div 
    onClick={onClick}
    className={`p-6 rounded-[2rem] border shadow-sm flex flex-col justify-between hover:border-indigo-400 transition-all group relative overflow-hidden h-full ${cursorPointer ? 'cursor-pointer' : ''} ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
  >
    <div className="relative z-10 flex justify-between items-start mb-4">
      <div className="space-y-3">
        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.15em]">{label}</p>
        <h4 className="text-xl font-black tracking-tight">{value}</h4>
        <div className={`flex items-center space-x-2 ${isDecrease ? 'text-rose-600' : 'text-emerald-600'}`}>
          <div className={`w-4 h-4 rounded flex items-center justify-center ${isDecrease ? 'bg-rose-50' : 'bg-emerald-50'}`}>
            <i className={`fas ${isDecrease ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'} text-[7px]`}></i>
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">{trend}</span>
        </div>
      </div>
    </div>
    <div className={`pt-4 border-t relative z-10 ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{comparison}</p>
    </div>
  </div>
);

export default Dashboard;