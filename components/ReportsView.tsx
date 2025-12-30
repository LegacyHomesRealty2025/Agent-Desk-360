import React, { useState, useMemo } from 'react';
import { Lead, Deal, User, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell } from 'recharts';

interface ReportsViewProps {
  leads: Lead[];
  deals: Deal[];
  agents: User[];
  currentUser: User;
}

const TZ = 'America/Los_Angeles';

const ReportsView: React.FC<ReportsViewProps> = ({ leads, deals, agents, currentUser }) => {
  const [reportType, setReportType] = useState<'TEAM' | 'INDIVIDUAL'>(
    currentUser.role === UserRole.BROKER ? 'TEAM' : 'INDIVIDUAL'
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentUser.id);
  const [sideFilter, setSideFilter] = useState<'ALL' | 'BUYER' | 'SELLER'>('ALL');
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

  const currentYear = getLAPart(new Date(), 'year');
  const prevYear = currentYear - 1;

  // Primary filtering logic
  const baseDeals = useMemo(() => {
    let list = reportType === 'TEAM' ? deals : deals.filter(d => d.assignedUserId === selectedAgentId);
    if (sideFilter !== 'ALL') {
      list = list.filter(d => d.side === sideFilter);
    }
    return list;
  }, [deals, reportType, selectedAgentId, sideFilter]);

  const baseLeads = useMemo(() => {
    let list = reportType === 'TEAM' ? leads : leads.filter(l => l.assignedAgentId === selectedAgentId);
    if (sideFilter !== 'ALL') {
      const tag = sideFilter === 'BUYER' ? 'Buyer' : 'Seller';
      list = list.filter(l => l.tags.includes(tag));
    }
    return list;
  }, [leads, reportType, selectedAgentId, sideFilter]);

  // Calculations
  const stats = useMemo(() => {
    const currentYearDeals = baseDeals.filter(d => getLAPart(d.date, 'year') === currentYear);
    const closed = currentYearDeals.filter(d => d.status === 'CLOSED');
    const totalVolume = closed.reduce((sum, d) => sum + d.salePrice, 0);
    const totalGCI = closed.reduce((sum, d) => sum + d.commissionAmount, 0);
    const units = closed.length;
    const currentYearLeads = baseLeads.filter(l => getLAPart(l.createdAt, 'year') === currentYear);
    const conversion = currentYearLeads.length > 0 ? (units / currentYearLeads.length) * 100 : 0;
    return { totalVolume, totalGCI, units, conversion };
  }, [baseDeals, baseLeads, currentYear]);

  const prevYearStats = useMemo(() => {
    const previousYearDeals = baseDeals.filter(d => getLAPart(d.date, 'year') === prevYear);
    const closed = previousYearDeals.filter(d => d.status === 'CLOSED');
    const totalVolume = closed.reduce((sum, d) => sum + d.salePrice, 0);
    const totalGCI = closed.reduce((sum, d) => sum + d.commissionAmount, 0);
    const units = closed.length;
    const previousYearLeads = baseLeads.filter(l => getLAPart(l.createdAt, 'year') === prevYear);
    const conversion = previousYearLeads.length > 0 ? (units / previousYearLeads.length) * 100 : 0;
    return { totalVolume, totalGCI, units, conversion };
  }, [baseDeals, baseLeads, prevYear]);

  const leadSourceData = useMemo(() => {
    const sources: Record<string, number> = {};
    const currentYearLeads = baseLeads.filter(l => getLAPart(l.createdAt, 'year') === currentYear);
    currentYearLeads.forEach(l => {
      sources[l.source] = (sources[l.source] || 0) + 1;
    });
    return Object.entries(sources)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [baseLeads, currentYear]);

  const monthlyProduction = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames.map((name, index) => {
      const curVol = baseDeals
        .filter(d => d.status === 'CLOSED' && getLAPart(d.date, 'month') - 1 === index && getLAPart(d.date, 'year') === currentYear)
        .reduce((sum, d) => sum + d.salePrice, 0);
      const prevVol = baseDeals
        .filter(d => d.status === 'CLOSED' && getLAPart(d.date, 'month') - 1 === index && getLAPart(d.date, 'year') === prevYear)
        .reduce((sum, d) => sum + d.salePrice, 0);
      return { month: name, current: curVol, previous: prevVol };
    });
  }, [baseDeals, currentYear, prevYear]);

  const COLORS = ['#6366f1', '#4ade80', '#fbbf24', '#f87171', '#a78bfa'];

  const getDiffPercent = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const prepareExportData = () => {
    const reportLabel = reportType === 'TEAM' ? 'Team Report' : `${selectedAgent?.firstName} ${selectedAgent?.lastName} Report`;
    const sideLabel = sideFilter === 'ALL' ? 'Buyer & Seller' : sideFilter;
    
    const summaryRows = [
      ['Metric', 'Current Year', 'Previous Year', 'YoY Growth'],
      ['Closed Volume', stats.totalVolume.toLocaleString(), prevYearStats.totalVolume.toLocaleString(), `${getDiffPercent(stats.totalVolume, prevYearStats.totalVolume).toFixed(1)}%`],
      ['Closed Units', stats.units.toString(), prevYearStats.units.toString(), `${getDiffPercent(stats.units, prevYearStats.units).toFixed(1)}%`],
      ['Gross GCI', stats.totalGCI.toLocaleString(), prevYearStats.totalGCI.toLocaleString(), `${getDiffPercent(stats.totalGCI, prevYearStats.totalGCI).toFixed(1)}%`],
      ['Conversion Rate', `${stats.conversion.toFixed(2)}%`, `${prevYearStats.conversion.toFixed(2)}%`, `${getDiffPercent(stats.conversion, prevYearStats.conversion).toFixed(1)}%`],
    ];

    const dataRows = baseDeals
      .filter(d => getLAPart(d.date, 'year') === currentYear)
      .map(d => [
        d.leadName,
        d.address,
        d.status,
        d.side,
        d.salePrice.toString(),
        d.commissionAmount.toString(),
        new Date(d.date).toLocaleDateString(),
        d.source || 'N/A'
      ]);

    return { reportLabel, sideLabel, summaryRows, dataRows };
  };

  const handleExportCSV = () => {
    const { reportLabel, sideLabel, summaryRows, dataRows } = prepareExportData();
    const headers = ['Client Name', 'Address', 'Status', 'Side', 'Sale Price', 'GCI', 'Closing Date', 'Source'];
    
    const csvContent = [
      ['REAL ESTATE PERFORMANCE REPORT'],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Scope: ${reportLabel}`],
      [`Side Focus: ${sideLabel}`],
      [],
      ...summaryRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      [],
      ['DETAILED TRANSACTIONS (CURRENT YEAR)'],
      headers.join(','),
      ...dataRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    downloadBlob(csvContent, `Production_Report_${reportLabel.replace(/\s+/g, '_')}.csv`, 'text/csv;charset=utf-8;');
    setIsDownloadMenuOpen(false);
  };

  const handleExportExcel = () => {
    const { reportLabel, summaryRows, dataRows } = prepareExportData();
    const headers = ['Client Name', 'Address', 'Status', 'Side', 'Sale Price', 'GCI', 'Closing Date', 'Source'];
    
    const excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
        <h3>Real Estate Production Report - ${reportLabel}</h3>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table border="1">
          ${summaryRows.map(row => `<tr>${row.map(cell => `<td style="font-weight:bold; background-color:#f3f4f6;">${cell}</td>`).join('')}</tr>`).join('')}
        </table>
        <br/>
        <h4>Detailed Transactions</h4>
        <table border="1">
          <tr>${headers.map(h => `<td style="background-color:#e5e7eb; font-weight:bold;">${h}</td>`).join('')}</tr>
          ${dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </table>
      </body>
      </html>
    `;

    downloadBlob(excelContent, `Production_Report_${reportLabel.replace(/\s+/g, '_')}.xls`, 'application/vnd.ms-excel');
    setIsDownloadMenuOpen(false);
  };

  const downloadBlob = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Main Standard Dashboard View */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Performance Analytics</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Production trends and YoY conversion metrics in LA Time.</p>
          </div>
          <div className="flex items-center space-x-3">
             <button 
                onClick={() => setShowYoYComparison(!showYoYComparison)}
                className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${showYoYComparison ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
             >
               <i className={`fas ${showYoYComparison ? 'fa-check-circle' : 'fa-circle-dot'}`}></i>
               <span>YoY Comparison</span>
             </button>
             
             <div className="relative">
                <button 
                  onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                  className="w-12 h-12 flex items-center justify-center bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95"
                  title="Export Report"
                >
                 <i className="fas fa-download text-sm"></i>
                </button>
                
                {isDownloadMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDownloadMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-50 py-3 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
                       <p className="px-6 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Select Format</p>
                       <button onClick={handleExportExcel} className="w-full text-left px-6 py-3 hover:bg-indigo-50 transition-colors flex items-center space-x-3 group">
                         <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><i className="fas fa-file-excel"></i></div>
                         <span className="text-xs font-black text-slate-700">Download Excel (.xls)</span>
                       </button>
                       <button onClick={handleExportCSV} className="w-full text-left px-6 py-3 hover:bg-indigo-50 transition-colors flex items-center space-x-3 group">
                         <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><i className="fas fa-file-csv"></i></div>
                         <span className="text-xs font-black text-slate-700">Download CSV (.csv)</span>
                       </button>
                    </div>
                  </>
                )}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
           <div>
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Reporting Level</label>
             <div className="flex bg-slate-100 p-1.5 rounded-2xl">
               <button onClick={() => setReportType('TEAM')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${reportType === 'TEAM' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Team</button>
               <button onClick={() => setReportType('INDIVIDUAL')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${reportType === 'INDIVIDUAL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Individual</button>
             </div>
           </div>
           <div>
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Representation Side</label>
             <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                {(['ALL', 'BUYER', 'SELLER'] as const).map(side => (
                  <button key={side} onClick={() => setSideFilter(side)} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${sideFilter === side ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>{side === 'ALL' ? 'Both' : side.charAt(0) + side.slice(1).toLowerCase()}</button>
                ))}
             </div>
           </div>
           <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Selection</label>
              {reportType === 'INDIVIDUAL' ? (
                <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-800 focus:ring-4 focus:ring-indigo-500/10 outline-none">
                  {agents.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                </select>
              ) : (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-400 italic">All Active Roster</div>
              )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Closed Volume" value={`$${stats.totalVolume.toLocaleString()}`} comparison={showYoYComparison ? getDiffPercent(stats.totalVolume, prevYearStats.totalVolume) : undefined} prevValue={`$${prevYearStats.totalVolume.toLocaleString()}`} icon="fa-house-circle-check" color="text-indigo-600 bg-indigo-50" />
        <StatCard label="Closed Units" value={`${stats.units}`} comparison={showYoYComparison ? getDiffPercent(stats.units, prevYearStats.units) : undefined} prevValue={`${prevYearStats.units}`} icon="fa-key" color="text-emerald-600 bg-emerald-50" />
        <StatCard label="Gross Commission" value={`$${stats.totalGCI.toLocaleString()}`} comparison={showYoYComparison ? getDiffPercent(stats.totalGCI, prevYearStats.totalGCI) : undefined} prevValue={`$${prevYearStats.totalGCI.toLocaleString()}`} icon="fa-money-bill-trend-up" color="text-amber-600 bg-amber-50" />
        <StatCard label="Conversion Rate" value={`${stats.conversion.toFixed(1)}%`} comparison={showYoYComparison ? getDiffPercent(stats.conversion, prevYearStats.conversion) : undefined} prevValue={`${prevYearStats.conversion.toFixed(1)}%`} icon="fa-arrow-up-right-dots" color="text-blue-600 bg-blue-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-12 shadow-sm">
           <div className="flex items-center justify-between mb-12">
             <div className="space-y-1">
               <h3 className="text-2xl font-black text-slate-900">{reportType === 'TEAM' ? 'Team' : `${selectedAgent?.firstName}'s`} Production</h3>
               <p className="text-sm font-medium text-slate-400">Monthly closed volume distribution.</p>
             </div>
             <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 mr-4">
                  <div className="w-3 h-3 bg-indigo-600 rounded"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentYear}</span>
                </div>
                {showYoYComparison && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-slate-200 rounded"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{prevYear}</span>
                  </div>
                )}
             </div>
           </div>
           <div className="h-[450px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={monthlyProduction} margin={{ top: 10, right: 30, left: 60, bottom: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dy={10} />
                 <YAxis width={60} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => `$${val/1000}K`} />
                 <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                 {showYoYComparison && <Bar dataKey="previous" fill="#e2e8f0" radius={[8, 8, 0, 0]} barSize={25} />}
                 <Bar dataKey="current" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={showYoYComparison ? 25 : 40} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-12 shadow-sm flex flex-col">
          <h3 className="text-2xl font-black text-slate-900 mb-2">Lead Sources</h3>
          <p className="text-sm text-slate-400 font-medium mb-10">Top acquisition channels for {currentYear}.</p>
          
          <div className="h-[280px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leadSourceData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none">
                  {leadSourceData.map((entry, index) => (<PieCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-3xl font-black text-slate-900">{baseLeads.filter(l => getLAPart(l.createdAt, 'year') === currentYear).length}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Leads</p>
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-5">
            {leadSourceData.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full transition-transform group-hover:scale-125" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-[14px] font-bold text-slate-600">{s.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[14px] font-black text-slate-900">{s.value}</span>
                  <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(s.value / baseLeads.length) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
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

const StatCard = ({ label, value, comparison, prevValue, icon, color }: any) => {
  const isPositive = comparison > 0;
  const isNegative = comparison < 0;
  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm group hover:border-indigo-300 transition-all flex flex-col justify-between h-full relative overflow-hidden">
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${color}`}><i className={`fas ${icon} text-base`}></i></div>
        {comparison !== undefined && (
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm border ${isPositive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : isNegative ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}><i className={`fas ${isPositive ? 'fa-arrow-trend-up' : isNegative ? 'fa-arrow-trend-down' : 'fa-minus'}`}></i><span>{Math.abs(comparison).toFixed(1)}%</span></div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mb-2">{label}</p>
        <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
        {comparison !== undefined && (<div className="mt-5 pt-5 border-t border-slate-50"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Previous: <span className="text-slate-600 ml-1">{prevValue}</span></p></div>)}
      </div>
    </div>
  );
};

export default ReportsView;