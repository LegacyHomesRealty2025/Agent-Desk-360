import React, { useState, useMemo } from 'react';
import { Lead, Deal, User, UserRole } from '../types.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell } from 'recharts';

interface ReportsViewProps {
  leads: Lead[];
  deals: Deal[];
  agents: User[];
  currentUser: User;
  isDarkMode?: boolean;
}

const TZ = 'America/Los_Angeles';

type ChartMetric = 'VOLUME' | 'LIST' | 'BUY' | 'UNITS';

// Custom Tooltip synchronized with Dashboard styling
const CustomTooltip = ({ active, payload, label, isDarkMode, metric }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isCompare = payload.length > 1;
    
    const formatVal = (v: number) => metric === 'UNITS' ? v : `$${v.toLocaleString()}`;

    const renderData = (val: number, units: number, isPrev = false) => (
      <div className={`space-y-1 ${isPrev ? 'opacity-60 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800' : ''}`}>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {isPrev ? 'Previous Year' : 'Current Year'}
        </p>
        <div className="flex flex-col">
          <p className="text-sm font-black text-indigo-600">Value: {formatVal(val)}</p>
          {metric !== 'UNITS' && (
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
        {renderData(payload[0].value, data.curUnits)}
        {isCompare && renderData(payload[1].value, data.preUnits, true)}
      </div>
    );
  }
  return null;
};

const ReportsView: React.FC<ReportsViewProps> = ({ leads, deals, agents, currentUser, isDarkMode }) => {
  const [reportType, setReportType] = useState<'TEAM' | 'INDIVIDUAL'>(
    currentUser.role === UserRole.BROKER ? 'TEAM' : 'INDIVIDUAL'
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentUser.id);
  const [sideFilter, setSideFilter] = useState<'ALL' | 'BUYER' | 'SELLER'>('ALL');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('VOLUME');
  const [showYoYComparison, setShowYoYComparison] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

  // Utility for LA Time parts
  const getLAPart = (date: string | Date, part: 'month' | 'year') => {
    const options: any = { timeZone: TZ };
    if (part === 'month') options.month = 'numeric';
    if (part === 'year') options.year = 'numeric';
    const val = new Intl.DateTimeFormat('en-US', options).format(new Date(date));
    return parseInt(val);
  };

  const selectedAgent = useMemo(() => 
    agents.find(a => a.id === selectedAgentId) || agents[0], 
    [agents, selectedAgentId]
  );

  const laNow = new Date('2025-12-28T09:00:00');
  const currentYear = getLAPart(laNow, 'year');
  const prevYear = currentYear - 1;
  const currentLAMonthIdx = getLAPart(laNow, 'month') - 1;

  // Primary filtering
  const baseDeals = useMemo(() => {
    let list = reportType === 'TEAM' ? deals : deals.filter(d => d.assignedUserId === selectedAgentId);
    list = list.filter(d => !d.isDeleted);
    if (sideFilter !== 'ALL') {
      list = list.filter(d => d.side === sideFilter || d.side === 'BOTH');
    }
    return list;
  }, [deals, reportType, selectedAgentId, sideFilter]);

  const baseLeads = useMemo(() => {
    let list = reportType === 'TEAM' ? leads : leads.filter(l => l.assignedAgentId === selectedAgentId);
    list = list.filter(l => !l.isDeleted);
    if (sideFilter !== 'ALL') {
      const tag = sideFilter === 'BUYER' ? 'Buyer' : 'Seller';
      list = list.filter(l => l.tags.includes(tag));
    }
    return list;
  }, [leads, reportType, selectedAgentId, sideFilter]);

  // Stats Calculation for Year
  const calculateStatsForYear = (year: number) => {
    const yearDeals = baseDeals.filter(d => getLAPart(d.date, 'year') === year);
    const closed = yearDeals.filter(d => d.status === 'CLOSED');
    const totalVolume = closed.reduce((sum, d) => sum + d.salePrice, 0);
    const totalGCI = closed.reduce((sum, d) => sum + d.commissionAmount, 0);
    const totalTransactions = closed.length;
    const averageDeal = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
    const buyerUnits = closed.filter(d => d.side === 'BUYER' || d.side === 'BOTH').length;
    const sellerUnits = closed.filter(d => d.side === 'SELLER' || d.side === 'BOTH').length;
    return { totalVolume, averageDeal, totalGCI, totalTransactions, buyerUnits, sellerUnits };
  };

  const stats = useMemo(() => calculateStatsForYear(currentYear), [baseDeals, currentYear]);
  const prevYearStats = useMemo(() => calculateStatsForYear(prevYear), [baseDeals, prevYear]);

  // Production data structure for chart
  const monthlyProduction = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const getVal = (dList: Deal[]) => {
      switch (chartMetric) {
        case 'LIST': return dList.filter(d => d.side === 'SELLER' || d.side === 'BOTH').reduce((s, d) => s + d.salePrice, 0);
        case 'BUY': return dList.filter(d => d.side === 'BUYER' || d.side === 'BOTH').reduce((s, d) => s + d.salePrice, 0);
        case 'UNITS': return dList.length;
        default: return dList.reduce((s, d) => s + d.salePrice, 0);
      }
    };

    return months.map((name, index) => {
      const curDeals = baseDeals.filter(d => d.status === 'CLOSED' && getLAPart(d.date, 'month') - 1 === index && getLAPart(d.date, 'year') === currentYear);
      const preDeals = baseDeals.filter(d => d.status === 'CLOSED' && getLAPart(d.date, 'month') - 1 === index && getLAPart(d.date, 'year') === prevYear);
      return { 
        month: name, 
        current: getVal(curDeals),
        curUnits: curDeals.length,
        previous: getVal(preDeals),
        preUnits: preDeals.length
      };
    });
  }, [baseDeals, currentYear, prevYear, chartMetric]);

  const comparisonText = useMemo(() => {
    const curYTD = monthlyProduction.reduce((sum, d) => sum + d.current, 0);
    const preYTD = monthlyProduction.reduce((sum, d) => sum + d.previous, 0);
    if (preYTD === 0) return { text: "No previous year data to compare.", color: "text-slate-400" };
    const diff = ((curYTD - preYTD) / preYTD) * 100;
    const status = diff > 0 ? "Above" : diff < 0 ? "Below" : "On Par";
    const color = diff > 0 ? "text-emerald-500" : diff < 0 ? "text-rose-500" : "text-slate-500";
    return { text: `Production is ${status} last year by ${Math.abs(diff).toFixed(1)}%.`, color };
  }, [monthlyProduction]);

  const yAxisFormatter = (v: number) => {
    if (chartMetric === 'UNITS') return v.toString();
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${v}`;
  };

  const leadSourceData = useMemo(() => {
    const sources: Record<string, number> = {};
    const currentYearLeads = baseLeads.filter(l => getLAPart(l.createdAt, 'year') === currentYear);
    currentYearLeads.forEach(l => { sources[l.source] = (sources[l.source] || 0) + 1; });
    return Object.entries(sources).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [baseLeads, currentYear]);

  const COLORS = ['#6366f1', '#4ade80', '#fbbf24', '#f87171', '#a78bfa'];

  return (
    <div className={`max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-500 pb-20 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header Breadcrumbs Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
          <div className="flex items-center space-x-3 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
            <span>Agent Desk 360</span>
            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
            <span className="text-indigo-500">Performance Analytics</span>
          </div>
          <h2 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {reportType === 'TEAM' ? 'Brokerage Overview' : `${selectedAgent?.firstName}'s Report`}
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
           <div className={`flex p-1.5 rounded-[1.5rem] ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100 shadow-inner border border-slate-200'}`}>
              <button onClick={() => setReportType('TEAM')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportType === 'TEAM' ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-white shadow-md text-indigo-600') : 'text-slate-500 hover:text-slate-700'}`}>Team</button>
              <button onClick={() => setReportType('INDIVIDUAL')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportType === 'INDIVIDUAL' ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-white shadow-md text-indigo-600') : 'text-slate-500 hover:text-slate-700'}`}>Individual</button>
           </div>
           
           {reportType === 'INDIVIDUAL' && (
              <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} className={`border rounded-[1.25rem] px-5 py-3 text-[11px] font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                {agents.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
              </select>
           )}

           <button 
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-xl active:scale-95 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white hover:bg-black'}`}
              onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
           >
             <i className="fas fa-download text-sm"></i>
           </button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="flex items-center space-x-3 text-slate-800 px-2">
        <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
        <h2 className="text-[11px] font-black tracking-[0.25em] text-slate-400 uppercase">
          {reportType === 'TEAM' ? 'Team Performance' : 'Individual Performance'}
        </h2>
      </div>

      {/* High-Fidelity Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <HighFidelityStatCard 
          isDarkMode={isDarkMode} 
          label="Total Volume" 
          value={`$${stats.totalVolume.toLocaleString()}`} 
          trend="REAL-TIME" 
          footer="CLOSED SALES"
          icon="fa-house-circle-check" 
          color="bg-indigo-600" 
        />
        <HighFidelityStatCard 
          isDarkMode={isDarkMode} 
          label="Average Deal" 
          value={`$${Math.round(stats.averageDeal).toLocaleString()}`} 
          trend="AVG" 
          footer="PER UNIT"
          icon="fa-chart-pie" 
          color="bg-blue-500" 
        />
        <HighFidelityStatCard 
          isDarkMode={isDarkMode} 
          label="Gross GCI" 
          value={`$${stats.totalGCI.toLocaleString()}`} 
          trend="EARNED" 
          footer="TOTAL REVENUE"
          icon="fa-money-bill-trend-up" 
          color="bg-emerald-500" 
        />
        <HighFidelityStatCard 
          isDarkMode={isDarkMode} 
          label="Transactions" 
          value={`${stats.totalTransactions} units`} 
          trend="COUNT" 
          footer="CLOSED YTD"
          icon="fa-key" 
          color="bg-amber-500" 
        />
        <HighFidelityStatCard 
          isDarkMode={isDarkMode} 
          label="Buyer Units" 
          value={`${stats.buyerUnits}`} 
          trend="SIDES" 
          footer="CLOSED BUYERS"
          icon="fa-person-walking-luggage" 
          color="bg-rose-500" 
        />
        <HighFidelityStatCard 
          isDarkMode={isDarkMode} 
          label="Seller Units" 
          value={`${stats.sellerUnits}`} 
          trend="SIDES" 
          footer="CLOSED SELLERS"
          icon="fa-house-signal" 
          color="bg-cyan-500" 
        />
      </div>

      {/* Primary Analytical Views */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 border rounded-[3rem] p-12 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
           <div className="flex flex-col mb-12 space-y-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div className="space-y-1">
                 <h3 className="text-2xl font-black tracking-tight">Monthly Production</h3>
                 <div className="flex items-center space-x-2">
                   <span className={`text-lg font-black ${comparisonText.color}`}>{comparisonText.text}</span>
                 </div>
               </div>
               
               <div className="flex flex-col md:flex-row items-center gap-6">
                 <div className={`flex p-1 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100 border border-slate-200 shadow-inner'}`}>
                    {(['VOLUME', 'LIST', 'BUY', 'UNITS'] as ChartMetric[]).map(m => (
                      <button 
                        key={m} 
                        onClick={() => setChartMetric(m)}
                        className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${chartMetric === m ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-white shadow-sm text-indigo-600') : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {m === 'VOLUME' ? 'Total Volume' : m === 'LIST' ? 'List Side' : m === 'BUY' ? 'Buy Side' : 'Units'}
                      </button>
                    ))}
                 </div>
                 
                 <div className="flex items-center space-x-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compare Previous YTD</span>
                    <button 
                      onClick={() => setShowYoYComparison(!showYoYComparison)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${showYoYComparison ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showYoYComparison ? 'left-7' : 'left-1'}`}></div>
                    </button>
                 </div>
               </div>
             </div>
           </div>

           <div className="h-[450px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={monthlyProduction} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                   content={<CustomTooltip isDarkMode={isDarkMode} metric={chartMetric} />}
                 />
                 {showYoYComparison && (
                   <Bar dataKey="previous" fill={isDarkMode ? '#1e293b' : '#e2e8f0'} radius={[6, 6, 0, 0]} barSize={showYoYComparison ? 18 : 34} />
                 )}
                 <Bar dataKey="current" radius={[6, 6, 0, 0]} barSize={showYoYComparison ? 18 : 34}>
                    {monthlyProduction.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === currentLAMonthIdx ? '#6366f1' : isDarkMode ? '#475569' : '#1e293b'} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Lead Mix Column */}
        <div className={`border rounded-[3rem] p-12 shadow-sm flex flex-col transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
          <h3 className="text-2xl font-black mb-1">Lead Acquisition</h3>
          <p className="text-sm text-slate-400 font-medium mb-12">Top channels for {currentYear}.</p>
          
          <div className="h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leadSourceData} cx="50%" cy="50%" innerRadius={75} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none" animationDuration={1000}>
                  {leadSourceData.map((_, index) => (<PieCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-4xl font-black">{baseLeads.filter(l => getLAPart(l.createdAt, 'year') === currentYear).length}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Leads</p>
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-5">
            {leadSourceData.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className={`text-[13px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{s.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-[13px] font-black">{s.value}</span>
                  <div className={`w-12 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="h-full rounded-full" style={{ width: `${(s.value / Math.max(1, baseLeads.length)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// High-Fidelity Stat Card mirroring the "Team Performance" grid in the screenshot
const HighFidelityStatCard = ({ label, value, trend, footer, icon, color, isDarkMode }: any) => (
  <div className={`p-8 rounded-[2.5rem] border shadow-sm transition-all flex flex-col justify-between h-[180px] group hover:shadow-xl hover:border-indigo-300 relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${color}`}>
           <i className={`fas ${icon} text-sm`}></i>
         </div>
      </div>
      
      <div className="flex-1 space-y-1">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
        <h4 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</h4>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
         <div className="flex items-center space-x-2 text-emerald-500">
            <i className="fas fa-arrow-trend-up text-[9px]"></i>
            <span className="text-[9px] font-black uppercase tracking-tighter">{trend}</span>
         </div>
         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{footer}</p>
      </div>
    </div>
  </div>
);

export default ReportsView;