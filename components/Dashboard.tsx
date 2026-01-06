import React, { useState, useMemo } from 'react';
import { Lead, User, Deal, UserRole, OpenHouse, Task, LeadStatus, YearlyGoal } from '../types.ts';
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
 ViewViewingAgentId: string;
  onSetViewingAgentId: (id: string) => void;
  goals: YearlyGoal[];
  onUpdateGoal: (goal: YearlyGoal) => void;
  viewingAgentId: string;
}

const TZ = 'America/Los_Angeles';
const COLORS = ['#6366f1', '#4ade80', '#fbbf24', '#f87171', '#a78bfa'];

type ChartView = 'VOLUME' | 'LIST' | 'BUY' | 'UNITS';

// Custom Tooltip for aesthetic data presentation
const CustomTooltip = ({ active, payload, label, chartView, isDarkMode }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isCompare = payload.length > 1;
    
    const renderData = (val: number, units: number, isPrev = false) => (
      <div className={`space-y-1 ${isPrev ? 'opacity-60 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800' : ''}`}>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {isPrev ? 'Previous Year' : 'Current Year'}
        </p>
        <div className="flex flex-col">
          {(chartView === 'VOLUME' || chartView === 'LIST' || chartView === 'BUY') && (
            <p className="text-sm font-black text-indigo-600">Price: ${val.toLocaleString()}</p>
          )}
          {(chartView === 'VOLUME' || chartView === 'UNITS') && (
            <p className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Units: {units}
            </p>
          )}
        </div>
      </div>
    );

    return (
      <div className={`p-5 rounded-2xl shadow-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</p>
        {renderData(data.curVol, data.curUnits)}
        {isCompare && renderData(data.preVol, data.preUnits, true)}
      </div>
    );
  }
  return null;
};

// Enhanced Custom Pie Tooltip for Lead Source Mix
const CustomPieTooltip = ({ active, payload, isDarkMode }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={`p-6 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-2 animate-in fade-in zoom-in-95 duration-200 z-[1000] ${isDarkMode ? 'bg-slate-900 border-indigo-500/30 text-white' : 'bg-white border-indigo-100 text-slate-900'}`}>
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.fill || payload[0].fill }}></div>
          <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{data.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-black text-indigo-600 leading-none">{data.value}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Active Leads</p>
        </div>
      </div>
    );
  }
  return null;
};

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
  onSetViewingAgentId,
  goals,
  onUpdateGoal
}) => {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [chartView, setChartView] = useState<ChartView>('VOLUME');
  const [compareLastYear, setCompareLastYear] = useState(false);
  
  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.AGENT);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  // Utility for LA Time parts
  const getLAPart = (date: string | Date, part: 'month' | 'year' | 'day') => {
    const options: any = { timeZone: TZ };
    if (part === 'month') options.month = 'numeric';
    if (part === 'year') options.year = 'numeric';
    if (part === 'day') options.day = 'numeric';
    const val = new Intl.DateTimeFormat('en-US', options).format(new Date(date));
    return parseInt(val);
  };

  const laNow = new Date('2025-12-28T09:00:00'); // Consistent with App.tsx mocked time
  const currentYear = getLAPart(laNow, 'year');
  const prevYear = currentYear - 1;

  // Filter data based on selected agent
  const dashboardDeals = useMemo(() => {
    const activeDeals = deals.filter(d => !d.isDeleted);
    if (viewingAgentId === 'TEAM') return activeDeals;
    return activeDeals.filter(d => d.assignedUserId === viewingAgentId);
  }, [deals, viewingAgentId]);

  const dashboardLeads = useMemo(() => {
    const activeLeads = leads.filter(l => !l.isDeleted);
    if (viewingAgentId === 'TEAM') return activeLeads;
    return activeLeads.filter(l => l.assignedAgentId === viewingAgentId);
  }, [leads, viewingAgentId]);

  const dashboardTasks = useMemo(() => {
    if (viewingAgentId === 'TEAM') return tasks;
    return tasks.filter(t => t.assignedUserId === viewingAgentId);
  }, [tasks, viewingAgentId]);

  const selectedAgentData = useMemo(() => 
    agents.find(a => a.id === viewingAgentId), 
  [agents, viewingAgentId]);

  // Milestone Counts for Today
  const isTodayMonthDay = (dateStr?: string) => {
    if (!dateStr) return false;
    const laNowDate = new Date(laNow.toLocaleString('en-US', { timeZone: TZ }));
    const d = new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: TZ }));
    return d.getMonth() === laNowDate.getMonth() && d.getDate() === laNowDate.getDate();
  };

  const milestoneCounts = useMemo(() => {
    const todos = dashboardTasks.filter(t => !t.isCompleted).length;
    const birthdays = dashboardLeads.filter(l => isTodayMonthDay(l.dob)).length;
    const weddingAnnivs = dashboardLeads.filter(l => isTodayMonthDay(l.weddingAnniversary)).length;
    const homeAnnivs = dashboardLeads.filter(l => isTodayMonthDay(l.homeAnniversary)).length;
    return { todos, birthdays, weddingAnnivs, homeAnnivs };
  }, [dashboardTasks, dashboardLeads]);

  // Performance calculations
  const closedDealsCurrentYear = dashboardDeals.filter(d => d.status === 'CLOSED' && getLAPart(d.date, 'year') === currentYear);
  const pendingDeals = dashboardDeals.filter(d => d.status === 'PENDING' && getLAPart(d.date, 'year') === currentYear);
  const activeDeals = dashboardDeals.filter(d => d.status === 'ACTIVE' && getLAPart(d.date, 'year') === currentYear);

  const totalVolume = closedDealsCurrentYear.reduce((sum, d) => sum + d.salePrice, 0);
  const earnedComm = closedDealsCurrentYear.reduce((sum, d) => sum + d.commissionAmount, 0);
  const pendingComm = pendingDeals.reduce((sum, d) => sum + d.commissionAmount, 0);
  const activeComm = activeDeals.reduce((sum, d) => sum + d.commissionAmount, 0);
  const totalUnits = closedDealsCurrentYear.length;

  const buyerUnits = closedDealsCurrentYear.filter(d => d.side === 'BUYER' || d.side === 'BOTH').length;
  const sellerUnits = closedDealsCurrentYear.filter(d => d.side === 'SELLER' || d.side === 'BOTH').length;

  const activeListingVolume = activeDeals.reduce((sum, d) => sum + d.salePrice, 0);
  const pendingListingVolume = pendingDeals.reduce((sum, d) => sum + d.salePrice, 0);

  // Goal calculation for GCI tracking
  const activeGoal = useMemo(() => 
    goals.find(g => g.userId === viewingAgentId && g.year === currentYear) || 
    { userId: viewingAgentId, year: currentYear, volumeTarget: 1000000, unitTarget: 10, gciTarget: 30000 },
  [goals, viewingAgentId, currentYear]);

  const commissionProgress = {
    active: Math.min(100, (activeComm / activeGoal.gciTarget) * 100),
    pending: Math.min(100, (pendingComm / activeGoal.gciTarget) * 100),
    earned: Math.min(100, (earnedComm / activeGoal.gciTarget) * 100),
  };

  // Monthly Production logic for comparison
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const getMetricVal = (dList: Deal[]) => {
      switch (chartView) {
        case 'LIST': return dList.filter(d => d.side === 'SELLER' || d.side === 'BOTH').reduce((s, d) => s + d.salePrice, 0);
        case 'BUY': return dList.filter(d => d.side === 'BUYER' || d.side === 'BOTH').reduce((s, d) => s + d.salePrice, 0);
        case 'UNITS': return dList.length;
        case 'VOLUME':
        default: return dList.reduce((s, d) => s + d.salePrice, 0);
      }
    };

    return months.map((m, i) => {
      const monthClosed = dashboardDeals.filter(d => d.status === 'CLOSED' && getLAPart(d.date, 'month') - 1 === i);
      const curYearDeals = monthClosed.filter(d => getLAPart(d.date, 'year') === currentYear);
      const preYearDeals = monthClosed.filter(d => getLAPart(d.date, 'year') === prevYear);

      return {
        month: m,
        current: getMetricVal(curYearDeals),
        previous: getMetricVal(preYearDeals),
        // Extra payload for CustomTooltip
        curVol: curYearDeals.reduce((s, d) => s + d.salePrice, 0),
        preVol: preYearDeals.reduce((s, d) => s + d.salePrice, 0),
        curUnits: curYearDeals.length,
        preUnits: preYearDeals.length
      };
    });
  }, [dashboardDeals, chartView, currentYear, prevYear]);

  // Comparison Summary Header Logic
  const comparisonText = useMemo(() => {
    const curYTD = monthlyData.reduce((sum, d) => sum + d.current, 0);
    const preYTD = monthlyData.reduce((sum, d) => sum + d.previous, 0);
    
    if (preYTD === 0) return { text: "No previous year data to compare.", color: "text-slate-400" };
    
    const diff = ((curYTD - preYTD) / preYTD) * 100;
    const status = diff > 0 ? "Above" : diff < 0 ? "Below" : "On Par";
    const color = diff > 0 ? "text-emerald-500" : diff < 0 ? "text-rose-500" : "text-slate-500";
    
    return {
      text: `You are ${status} with last year by ${Math.abs(diff).toFixed(1)}%.`,
      color
    };
  }, [monthlyData]);

  // Lead Source Mix
  const leadSourceData = useMemo(() => {
    const sources: Record<string, number> = {};
    const pipelineStatuses = [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.ACTIVE, LeadStatus.IN_ESCROW];
    const pipelineLeads = dashboardLeads.filter(l => pipelineStatuses.includes(l.status) && getLAPart(l.createdAt, 'year') === currentYear);
    pipelineLeads.forEach(l => { sources[l.source] = (sources[l.source] || 0) + 1; });
    return Object.entries(sources).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [dashboardLeads, currentYear]);

  const pipelineData = [
    { name: 'Active', value: activeListingVolume, color: '#6366f1' }, 
    { name: 'Pending', value: pendingListingVolume, color: '#4ade80' }, 
  ];

  const yAxisFormatter = (v: number) => {
    if (chartView === 'UNITS') return v.toString();
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${v}`;
  };

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

  const currentLAMonthIdx = getLAPart(laNow, 'month') - 1;

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-8 ${isDarkMode ? 'dark' : ''}`}>
      {/* Branded Premium Header */}
      <div className={`rounded-[2.5rem] p-8 md:p-10 border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="absolute top-0 right-0 w-[24rem] h-[24rem] rounded-full -mr-32 -mt-32 blur-[80px] bg-indigo-50/10 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-2">
            <h1 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {viewingAgentId === 'TEAM' ? 'Team' : `${selectedAgentData?.firstName} ${selectedAgentData?.lastName}`} Production
            </h1>
          </div>
          <p className="text-slate-500 font-semibold text-lg">Real-time performance metrics and pipeline health for {currentYear}.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 relative z-20 w-full md:w-auto">
          {user.role === UserRole.BROKER && (
            <div className="relative w-full sm:w-auto">
              <button 
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className={`w-full sm:w-auto px-6 py-4 border rounded-xl flex items-center justify-between space-x-4 transition-all shadow-sm group/btn ${
                  viewingAgentId === 'TEAM' 
                    ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-900/20' 
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
                    <p className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1 ${viewingAgentId === 'TEAM' ? 'text-indigo-100' : 'text-slate-400'}`}>Performance Filter</p>
                    <p className="text-xs font-black leading-none">{viewingAgentId === 'TEAM' ? 'Entire Team' : selectedAgentData?.firstName}</p>
                  </div>
                </div>
                <i className={`fas fa-chevron-down text-[10px] transition-transform ${isSwitcherOpen ? 'rotate-180' : ''} ${viewingAgentId === 'TEAM' ? 'text-white/60' : 'text-slate-400'}`}></i>
              </button>

              {isSwitcherOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSwitcherOpen(false)}></div>
                  <div className={`absolute right-0 mt-3 w-72 border rounded-2xl shadow-2xl z-[100] py-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <button 
                      onClick={() => { onSetViewingAgentId('TEAM'); setIsSwitcherOpen(false); }}
                      className={`w-full text-left px-5 py-4 hover:bg-slate-50 flex items-center space-x-4 transition-colors ${viewingAgentId === 'TEAM' ? 'bg-indigo-50 border-r-4 border-indigo-600' : ''} ${isDarkMode ? 'text-white hover:bg-slate-700' : 'text-slate-800'}`}
                    >
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-sm"><i className="fas fa-globe"></i></div>
                      <div>
                        <p className="text-sm font-black">Viewing Entire Team</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Aggregate Production</p>
                      </div>
                    </button>
                    <div className="h-px bg-slate-100 my-1 mx-4"></div>
                    <div className="max-h-80 overflow-y-auto scrollbar-hide py-1">
                      {agents.map(a => (
                        <button key={a.id} onClick={() => { onSetViewingAgentId(a.id); setIsSwitcherOpen(false); }} className={`w-full text-left px-5 py-3 flex items-center space-x-4 transition-colors ${viewingAgentId === a.id ? 'bg-indigo-50 border-r-4 border-indigo-600' : ''} ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                          <img src={a.avatar} className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-100" alt="" />
                          <div>
                            <p className="text-sm font-black">{a.firstName} {a.lastName}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{a.role}</p>
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
            <button onClick={handleOpenInvite} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3 active:scale-95">
              <i className="fas fa-paper-plane"></i>
              <span>Invite Agent</span>
            </button>
          )}
          <button onClick={() => onNavigate('pipeline')} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3 active:scale-95">
            <i className="fas fa-plus"></i>
            <span>New Transaction</span>
          </button>
        </div>
      </div>

      {/* Snapshot Sections */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3 text-slate-800 px-2">
          <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
          <h2 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
            {viewingAgentId === 'TEAM' ? 'Team Snapshot' : 'My Performance'}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Box 1: Pipeline Volume */}
          <div className={`rounded-[2.5rem] p-8 shadow-sm flex flex-col items-center group relative overflow-hidden h-[380px] border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
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
                <p className={`text-[1.8rem] font-black leading-none tracking-tight whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>${(activeListingVolume + pendingListingVolume).toLocaleString()}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2.5">TOTAL PIPELINE VALUE</p>
              </div>
            </div>
            <div className="w-full grid grid-cols-2 gap-4 mt-auto">
              <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ACTIVE</span>
                  </div>
                  <span className="text-[10px] font-black text-indigo-500">{activeDeals.length} UNIT{activeDeals.length !== 1 ? 'S' : ''}</span>
                </div>
                <p className="text-base font-black">${activeListingVolume.toLocaleString()}</p>
              </div>
              <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PENDING</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-500">{pendingDeals.length} UNIT{pendingDeals.length !== 1 ? 'S' : ''}</span>
                </div>
                <p className="text-base font-black">${pendingListingVolume.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Box 2: Commission Tracking */}
          <div className={`rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between h-[380px] group border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div>
              <h3 className="text-lg font-black mb-1">Commission Tracking</h3>
              <p className="text-[11px] text-slate-400 font-semibold mb-6">Estimated Gross Commission Income (GCI).</p>
              <div className="space-y-4 mb-4">
                <div className="space-y-2">
                   <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                     <span>Active Pipeline</span>
                     <span className={`${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} font-black`}>{commissionProgress.active.toFixed(1)}%</span>
                   </div>
                   <div className={`h-2.5 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="h-full bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30 transition-all duration-1000" style={{ width: `${commissionProgress.active}%` }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                     <span>Pending Escrow</span>
                     <span className={`${isDarkMode ? 'text-amber-400' : 'text-amber-600'} font-black`}>{commissionProgress.pending.toFixed(1)}%</span>
                   </div>
                   <div className={`h-2.5 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="h-full bg-amber-500 rounded-full shadow-lg shadow-amber-500/30 transition-all duration-1000" style={{ width: `${commissionProgress.pending}%` }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                     <span>Earned GCI</span>
                     <span className={`${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} font-black`}>{commissionProgress.earned.toFixed(1)}%</span>
                   </div>
                   <div className={`h-2.5 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="h-full bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 transition-all duration-1000" style={{ width: `${commissionProgress.earned}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full grid grid-cols-3 gap-3 mt-auto">
              <div className={`p-3 rounded-xl border text-center transition-all ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-100'}`}>
                <p className={`text-[9px] font-black uppercase mb-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>ACTIVE</p>
                <p className={`text-11px font-black truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>${activeComm.toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-xl border text-center transition-all ${isDarkMode ? 'bg-amber-900/20 border-amber-500/30' : 'bg-amber-50 border-amber-100'}`}>
                <p className={`text-[9px] font-black uppercase mb-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>PENDING</p>
                <p className={`text-11px font-black truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>${pendingComm.toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-xl border text-center transition-all ${isDarkMode ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className={`text-[9px] font-black uppercase mb-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>EARNED</p>
                <p className={`text-11px font-black truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>${earnedComm.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Box 3: Daily Schedule */}
          <div className={`rounded-[2.5rem] p-8 shadow-sm flex flex-col h-[380px] group border transition-all relative ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-black">Daily Schedule</h3>
               <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xs shadow-sm transition-all">
                 <i className="fas fa-calendar-check"></i>
               </div>
             </div>
             
             <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
                {[
                  { label: 'To Do', val: milestoneCounts.todos, icon: 'fa-check', color: 'text-indigo-600', bg: 'bg-indigo-50', view: 'tasks' },
                  { label: 'Birthdays', val: milestoneCounts.birthdays, icon: 'fa-cake-candles', color: 'text-pink-600', bg: 'bg-pink-50', view: 'calendar' },
                  { label: 'Wedding Anniv.', val: milestoneCounts.weddingAnnivs, icon: 'fa-ring', color: 'text-purple-600', bg: 'bg-purple-50', view: 'calendar' },
                  { label: 'Home Anniv.', val: milestoneCounts.homeAnnivs, icon: 'fa-house-chimney-user', color: 'text-emerald-600', bg: 'bg-emerald-50', view: 'calendar' }
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => onNavigate(item.view)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group/row ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-md'}`}
                  >
                    <div className="flex items-center space-x-4">
                       <div className={`w-10 h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center text-xs transition-transform group-hover/row:scale-110 shadow-sm shrink-0`}>
                         <i className={`fas ${item.icon}`}></i>
                       </div>
                       <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{item.label}</span>
                    </div>
                    <span className="text-2xl font-black">{item.val}</span>
                  </button>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* Growth Metrics */}
      <section className="space-y-4">
        <div className="flex items-center space-x-3 text-slate-800 px-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
          <h2 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
            {viewingAgentId === 'TEAM' ? 'Team Performance' : 'My Production'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <ProductionStatCard isDarkMode={isDarkMode} label="Total Volume" value={`$${totalVolume.toLocaleString()}`} trend="Real-time" isDecrease={false} comparison="CLOSED SALES" />
          <ProductionStatCard isDarkMode={isDarkMode} label="Average Deal" value={`$${totalUnits > 0 ? (totalVolume/totalUnits).toLocaleString() : 0}`} trend="Avg" isDecrease={false} comparison="PER UNIT" />
          <ProductionStatCard isDarkMode={isDarkMode} label="Gross GCI" value={`$${earnedComm.toLocaleString()}`} trend="Earned" isDecrease={false} comparison="TOTAL REVENUE" />
          <ProductionStatCard isDarkMode={isDarkMode} label="Transactions" value={`${totalUnits} units`} trend="Count" isDecrease={false} comparison="CLOSED YTD" />
          <ProductionStatCard isDarkMode={isDarkMode} label="Buyer Units" value={`${buyerUnits}`} trend="Sides" isDecrease={false} comparison="CLOSED BUYERS" />
          <ProductionStatCard isDarkMode={isDarkMode} label="Seller Units" value={`${sellerUnits}`} trend="Sides" isDecrease={false} comparison="CLOSED SELLERS" />
        </div>
      </section>

      {/* Detailed Analytics & Ranking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 p-10 rounded-[3rem] border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col mb-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-xl font-black tracking-tight">Monthly Production</h3>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(['VOLUME', 'LIST', 'BUY', 'UNITS'] as ChartView[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setChartView(v)}
                      className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${chartView === v ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {v === 'VOLUME' ? 'Total Volume' : v === 'LIST' ? 'List Side' : v === 'BUY' ? 'Buy Side' : 'Units'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compare Previous YTD</span>
                <button 
                  onClick={() => setCompareLastYear(!compareLastYear)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${compareLastYear ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${compareLastYear ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
            </div>

            {/* Dynamic Comparison Summary */}
            <div className="flex items-center space-x-2">
              <span className={`text-lg font-black ${comparisonText.color}`}>
                {comparisonText.text}
              </span>
            </div>
          </div>

          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10}} 
                  tickFormatter={yAxisFormatter}
                />
                <Tooltip 
                  cursor={{fill: isDarkMode ? '#ffffff05' : '#f8fafc'}} 
                  content={<CustomTooltip chartView={chartView} isDarkMode={isDarkMode} />}
                />
                {/* Fixed: Replaced undefined showYoYComparison with compareLastYear */}
                {compareLastYear && (
                  <Bar dataKey="previous" fill={isDarkMode ? '#1e293b' : '#e2e8f0'} radius={[6, 6, 0, 0]} barSize={compareLastYear ? 18 : 30} />
                )}
                {/* Fixed: Replaced undefined showYoYComparison with compareLastYear */}
                <Bar dataKey="current" radius={[6, 6, 0, 0]} barSize={compareLastYear ? 18 : 30}>
                    {monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === currentLAMonthIdx ? '#6366f1' : isDarkMode ? '#475569' : '#1e293b'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-8 lg:col-span-1">
          {/* Agent Ranking Box */}
          <div className={`p-8 rounded-[2.5rem] border shadow-sm flex flex-col h-full ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black tracking-tight">Agent Leaderboard</h3>
                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] bg-indigo-50 px-2 py-1 rounded-lg">Top Performers</span>
             </div>

             <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide pr-1">
                {agents.map(agent => {
                   const agentClosedDeals = deals.filter(d => 
                     d.assignedUserId === agent.id && 
                     d.status === 'CLOSED' && 
                     getLAPart(d.date, 'year') === currentYear
                   );
                   const volume = agentClosedDeals.reduce((sum, d) => sum + d.salePrice, 0);
                   const units = agentClosedDeals.length;
                   return { ...agent, volume, units };
                }).sort((a, b) => b.volume - a.volume).map((agent, index) => {
                  const isTop3 = index < 3;
                  const rankColor = index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-slate-300' : index === 2 ? 'bg-orange-400' : 'bg-slate-100';
                  const rankIcon = index === 0 ? 'fa-crown' : index === 1 ? 'fa-medal' : index === 2 ? 'fa-award' : '';
                  const maxAgentVolume = agents.reduce((max, a) => {
                    const vol = deals.filter(d => d.assignedUserId === a.id && d.status === 'CLOSED' && getLAPart(d.date, 'year') === currentYear).reduce((s, d) => s + d.salePrice, 0);
                    return Math.max(max, vol);
                  }, 1);
                  
                  return (
                    <div 
                      key={agent.id} 
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${isDarkMode ? 'bg-slate-800/50 border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'}`}
                      onClick={() => { onSetViewingAgentId(agent.id); }}
                    >
                      <div className="flex items-center space-x-4 flex-1 overflow-hidden">
                        <div className="relative shrink-0">
                          <img src={agent.avatar} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10 shadow-md" alt="" />
                          <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white font-black shadow-lg ${rankColor}`}>
                            {isTop3 ? <i className={`fas ${rankIcon}`}></i> : index + 1}
                          </div>
                        </div>
                        <div className="overflow-hidden">
                           <p className="text-sm font-black truncate flex items-center">
                             {agent.firstName} {agent.lastName}
                             {index === 0 && <i className="fas fa-trophy text-yellow-500 ml-2 text-[10px]" title="Top Producer"></i>}
                           </p>
                           <div className="flex items-center space-x-2 mt-0.5">
                              <div className="flex-1 h-1 bg-slate-200 rounded-full min-w-[60px] overflow-hidden">
                                 <div className="h-full bg-indigo-500" style={{ width: `${(agent.volume / maxAgentVolume) * 100}%` }}></div>
                              </div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{agent.units} Units</span>
                           </div>
                        </div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="text-sm font-black text-indigo-600">${(agent.volume / 1000000).toFixed(1)}M</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Closed</p>
                      </div>
                    </div>
                  );
                })}
             </div>

             <div className="mt-8 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => onNavigate('reports')}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all flex items-center justify-center space-x-3"
                >
                   <span>Full Team Analytics</span>
                   <i className="fas fa-arrow-right text-[9px]"></i>
                </button>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
           {/* Lead Source Mix - ENHANCED VISIBILITY */}
           <div className={`p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-full ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className="text-lg font-black tracking-tight mb-4 leading-none">Lead Source Mix</h3>
            <div className="flex-1 min-h-[250px] relative mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={leadSourceData} 
                    innerRadius={55} 
                    outerRadius={80} 
                    paddingAngle={6} 
                    dataKey="value" 
                    stroke="none"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {leadSourceData.map((_, i) => <PieCell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip 
                    content={<CustomPieTooltip isDarkMode={isDarkMode} />} 
                    offset={25}
                    wrapperStyle={{ zIndex: 1000 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center translate-y-1">
                  <p className="text-4xl font-black tracking-tighter leading-none">{dashboardLeads.length}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">TOTAL</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 mt-2">
              {leadSourceData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                    <span className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{s.name}</span>
                  </div>
                  <span className={`text-sm font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
                    <input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`} placeholder="agent@email.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Role</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)} className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                      <option value={UserRole.AGENT}>Real Estate Agent</option>
                      <option value={UserRole.BROKER}>Broker / Admin</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3" >Generate Invite Link</button>
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
                      <code className="flex-1 text-xs text-indigo-600 font-bold truncate">{generatedInviteLink}</code>
                      <button onClick={copyInviteLink} className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all"><i className="fas fa-copy"></i></button>
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