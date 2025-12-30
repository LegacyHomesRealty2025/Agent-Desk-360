import React, { useState, useMemo, useRef, useEffect } from 'react';
import { OpenHouse, User } from '../types';

interface OpenHouseViewProps {
  openHouses: OpenHouse[];
  onCreate: (oh: OpenHouse) => void;
  onUpdate: (oh: OpenHouse) => void;
  onDelete: (id: string) => void;
  onPreviewPublic: (oh: OpenHouse) => void;
  agents: User[];
  currentUser: User;
}

const TZ = 'America/Los_Angeles';

const OpenHouseView: React.FC<OpenHouseViewProps> = ({ openHouses, onCreate, onUpdate, onDelete, onPreviewPublic, agents, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOHId, setEditingOHId] = useState<string | null>(null);
  const [qrModalOH, setQrModalOH] = useState<OpenHouse | null>(null);
  const [ohToDelete, setOhToDelete] = useState<OpenHouse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSecondDate, setShowSecondDate] = useState(false);
  const [displayMode, setDisplayMode] = useState<'tile' | 'list'>('tile');
  
  // Date Range Filter State
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Drag and Drop State
  const [orderedOpenHouses, setOrderedOpenHouses] = useState<OpenHouse[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const topRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Sync internal ordered state with props
  useEffect(() => {
    if (orderedOpenHouses.length !== openHouses.length) {
      setOrderedOpenHouses(openHouses);
    }
  }, [openHouses]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, startDateFilter, endDateFilter]);

  const getLAToday = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  };

  const [formData, setFormData] = useState({
    address: '',
    date: getLAToday(),
    startTime: '10:00',
    endTime: '14:00',
    date2: '',
    startTime2: '10:00',
    endTime2: '14:00',
    agentId: currentUser.id,
    isManualAgent: false,
    manualAgentName: '',
    manualAgentPhone: '',
    manualAgentLicense: '',
    status: 'UPCOMING' as OpenHouse['status']
  });

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${month}-${day}-${year}`;
  };

  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return '';
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
  };

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return 'N/A';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0]);
    let m = parts[1] || '00';
    if (isNaN(h)) return 'N/A';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m.padStart(2, '0')} ${ampm}`;
  };

  // Filter logic including search and date range
  const filteredOpenHouses: OpenHouse[] = useMemo(() => {
    const list = orderedOpenHouses.length > 0 ? orderedOpenHouses : openHouses;
    return list.filter(oh => {
      const matchesSearch = oh.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            oh.assignedAgentName.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDates = true;
      if (startDateFilter) {
        matchesDates = matchesDates && oh.date >= startDateFilter;
      }
      if (endDateFilter) {
        matchesDates = matchesDates && oh.date <= endDateFilter;
      }

      return matchesSearch && matchesDates;
    });
  }, [openHouses, orderedOpenHouses, searchTerm, startDateFilter, endDateFilter]);

  const totalPages = Math.ceil(filteredOpenHouses.length / itemsPerPage);
  
  const paginatedOpenHouses: OpenHouse[] = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOpenHouses.slice(start, start + itemsPerPage);
  }, [filteredOpenHouses, currentPage, itemsPerPage]);

  const categorizedOpenHouses: Record<string, OpenHouse[]> = useMemo(() => {
    const months: Record<string, OpenHouse[]> = {};
    paginatedOpenHouses.forEach(oh => {
      const date = new Date(oh.date + 'T00:00:00');
      const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
      if (!months[monthName]) months[monthName] = [];
      months[monthName].push(oh);
    });
    return months;
  }, [paginatedOpenHouses]);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newOrder = [...filteredOpenHouses];
    const draggedIdx = newOrder.findIndex(oh => oh.id === draggedId);
    const targetIdx = newOrder.findIndex(oh => oh.id === targetId);

    const [removed] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, removed);

    setOrderedOpenHouses(newOrder);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleOpenEdit = (oh: OpenHouse) => {
    setEditingOHId(oh.id);
    setFormData({
      address: oh.address,
      date: oh.date,
      startTime: oh.startTime,
      endTime: oh.endTime,
      date2: oh.date2 || '',
      startTime2: oh.startTime2 || '10:00',
      endTime2: oh.endTime2 || '14:00',
      agentId: oh.assignedAgentId,
      isManualAgent: !!oh.isManualAgent,
      manualAgentName: oh.isManualAgent ? oh.assignedAgentName : '',
      manualAgentPhone: oh.manualAgentPhone || '',
      manualAgentLicense: oh.manualAgentLicense || '',
      status: oh.status
    });
    setShowSecondDate(!!oh.date2);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingOHId(null);
    setFormData({
      address: '',
      date: getLAToday(),
      startTime: '10:00',
      endTime: '14:00',
      date2: '',
      startTime2: '10:00',
      endTime2: '14:00',
      agentId: currentUser.id,
      isManualAgent: false,
      manualAgentName: '',
      manualAgentPhone: '',
      manualAgentLicense: '',
      status: 'UPCOMING'
    });
    setShowSecondDate(false);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let agentName = '';
    let agentId = formData.agentId;
    let phone = '';
    let license = '';

    if (formData.isManualAgent) {
      agentName = formData.manualAgentName;
      agentId = `manual_${Date.now()}`;
      phone = formData.manualAgentPhone;
      license = formData.manualAgentLicense;
    } else {
      const selectedAgent = agents.find(a => a.id === formData.agentId) || currentUser;
      agentName = `${selectedAgent.firstName} ${selectedAgent.lastName}`;
      phone = selectedAgent.phone || '';
      license = selectedAgent.licenseNumber || '';
    }
    
    const ohPayload: OpenHouse = {
      id: editingOHId || `oh_${Date.now()}`,
      brokerageId: currentUser.brokerageId,
      address: formData.address,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      date2: (showSecondDate && formData.date2) ? formData.date2 : undefined,
      startTime2: (showSecondDate && formData.date2) ? formData.startTime2 : undefined,
      endTime2: (showSecondDate && formData.date2) ? formData.endTime2 : undefined,
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      manualAgentPhone: phone,
      manualAgentLicense: license,
      isManualAgent: formData.isManualAgent,
      status: formData.status,
      visitorCount: editingOHId ? (openHouses.find(o => o.id === editingOHId)?.visitorCount || 0) : 0
    };

    if (editingOHId) onUpdate(ohPayload);
    else onCreate(ohPayload);
    setIsModalOpen(false);
  };

  const getQRUrl = (oh: OpenHouse) => {
    const baseUrl = window.location.origin;
    const checkInUrl = `${baseUrl}?openhouse=${oh.id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkInUrl)}`;
  };

  const clearDateFilter = () => {
    setStartDateFilter('');
    setEndDateFilter('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20" ref={topRef}>
      <div className="flex flex-col space-y-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Open House Events</h2>
            <p className="text-slate-500 font-medium mt-1">Manage check-ins and lead capture.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
              <button 
                onClick={() => setDisplayMode('tile')} 
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${displayMode === 'tile' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}
              >
                <i className="fas fa-th-large"></i>
              </button>
              <button 
                onClick={() => setDisplayMode('list')} 
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${displayMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}
              >
                <i className="fas fa-list"></i>
              </button>
            </div>
            <div className="relative group min-w-[300px]">
              <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-inner"
              />
            </div>
            <button 
              onClick={handleOpenCreate}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center space-x-3 shrink-0"
            >
              <i className="fas fa-plus"></i>
              <span>New Event</span>
            </button>
          </div>
        </div>

        {/* Date Range Filter Bar */}
        <div className="flex flex-col md:flex-row items-center gap-6 pt-6 border-t border-slate-100">
           <div className="flex items-center space-x-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <button 
                onClick={clearDateFilter}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${(!startDateFilter && !endDateFilter) ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                All Events
              </button>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="flex items-center space-x-3 px-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From:</span>
                 <input 
                   type="date" 
                   value={startDateFilter}
                   onChange={(e) => setStartDateFilter(e.target.value)}
                   className="bg-transparent border-none text-xs font-black text-slate-700 outline-none cursor-pointer"
                 />
              </div>
              <div className="flex items-center space-x-3 px-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To:</span>
                 <input 
                   type="date" 
                   value={endDateFilter}
                   onChange={(e) => setEndDateFilter(e.target.value)}
                   className="bg-transparent border-none text-xs font-black text-slate-700 outline-none cursor-pointer"
                 />
              </div>
           </div>
           
           {(startDateFilter || endDateFilter) && (
             <button 
                onClick={clearDateFilter}
                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 transition-colors flex items-center"
             >
               <i className="fas fa-times-circle mr-2"></i>
               Clear Date Filter
             </button>
           )}

           <div className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">
             Found {filteredOpenHouses.length} Matches
           </div>
        </div>
      </div>

      {displayMode === 'tile' ? (
        <div className="space-y-12">
          {Object.entries(categorizedOpenHouses).map(([month, items]) => (
            <div key={month} className="space-y-6">
              <div className="flex items-center space-x-4">
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-[0.2em]">{month}</h3>
                <div className="h-px flex-1 bg-slate-200"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map(oh => (
                  <div 
                    key={oh.id}
                    draggable
                    onDragStart={() => handleDragStart(oh.id)}
                    onDragOver={(e) => handleDragOver(e, oh.id)}
                    onDrop={(e) => handleDrop(e, oh.id)}
                    className={`bg-white border rounded-[2.5rem] p-8 hover:shadow-xl transition-all group relative overflow-hidden flex flex-col h-full ${dragOverId === oh.id ? 'border-indigo-500 ring-2 ring-indigo-200 border-dashed' : 'border-slate-200'} ${draggedId === oh.id ? 'opacity-30' : ''}`}
                  >
                    <div className="absolute top-8 right-8 z-20 flex space-x-2">
                        <button 
                          onClick={() => handleOpenEdit(oh)}
                          className="w-10 h-10 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl flex items-center justify-center hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        >
                          <i className="fas fa-pencil-alt text-sm"></i>
                        </button>
                        <button 
                          onClick={() => { setOhToDelete(oh); }}
                          className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:text-rose-600 hover:bg-rose-50 transition-all"
                        >
                          <i className="fas fa-trash-can text-sm"></i>
                        </button>
                    </div>
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            oh.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse' : 
                            oh.status === 'UPCOMING' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                            'bg-slate-50 text-slate-400 border-slate-100'
                          }`}>
                            {oh.status}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-800 pt-1 pr-32 leading-tight mb-4">{oh.address}</h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-stretch space-x-4">
                            <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <div className="flex items-center justify-between">
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                   Session One <span className="text-indigo-500 ml-1.5 opacity-80">{getDayName(oh.date)}</span>
                                 </p>
                                 <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{formatDisplayDate(oh.date)}</span>
                              </div>
                              <p className="text-sm font-black text-slate-700 mt-1">
                                <i className="fas fa-clock mr-2 text-indigo-400"></i>
                                {formatDisplayTime(oh.startTime)} - {formatDisplayTime(oh.endTime)}
                              </p>
                            </div>
                            
                            <div className="bg-indigo-50 px-4 py-3 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center shadow-sm shrink-0 min-w-[70px]">
                              <p className="text-2xl font-black text-indigo-600 leading-none">{oh.visitorCount}</p>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Visitors</p>
                            </div>
                          </div>

                          {oh.date2 && (
                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                              <div className="flex items-center justify-between">
                                 <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                                   Session Two <span className="text-indigo-600 ml-1.5 opacity-80">{getDayName(oh.date2)}</span>
                                 </p>
                                 <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">{formatDisplayDate(oh.date2)}</span>
                              </div>
                              <p className="text-sm font-black text-slate-700 mt-1">
                                <i className="fas fa-clock mr-2 text-indigo-500"></i>
                                {formatDisplayTime(oh.startTime2 || '')} - {formatDisplayTime(oh.endTime2 || '')}
                              </p>
                            </div>
                          )}
                        </div>

                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6 bg-slate-50 px-3 py-2 rounded-lg inline-flex items-center">
                          <i className="fas fa-user-tie mr-1.5 text-indigo-400"></i>
                          Host: {oh.assignedAgentName}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-auto pt-8 border-t border-slate-100 relative z-10">
                      <button 
                        onClick={() => onPreviewPublic(oh)}
                        className="flex items-center justify-center space-x-3 p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200"
                      >
                        <i className="fas fa-tablet-screen-button"></i>
                        <span>Check-in</span>
                      </button>
                      <button 
                        className="flex items-center justify-center space-x-3 p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all font-black text-xs uppercase tracking-widest border border-indigo-100"
                        onClick={() => setQrModalOH(oh)}
                      >
                        <i className="fas fa-qrcode"></i>
                        <span>QR Code</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filteredOpenHouses.length === 0 && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-20 text-center text-slate-400">
               <i className="fas fa-calendar-day text-5xl mb-6 opacity-20"></i>
               <p className="text-sm font-black uppercase tracking-widest">No events found matching your search or filters.</p>
               <button onClick={clearDateFilter} className="mt-4 text-indigo-600 font-bold hover:underline">Reset Date Filter</button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Host</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitors</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOpenHouses.map(oh => (
                <tr key={oh.id} className="hover:bg-slate-50 transition-all group">
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-800">{oh.address}</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${oh.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>{oh.status}</span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-slate-600">{formatDisplayDate(oh.date)}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase">{formatDisplayTime(oh.startTime)} - {formatDisplayTime(oh.endTime)}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-slate-600">{oh.assignedAgentName}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-base font-black text-indigo-600">{oh.visitorCount}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end space-x-2">
                       <button onClick={() => onPreviewPublic(oh)} className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-all shadow-sm"><i className="fas fa-tablet-screen-button text-xs"></i></button>
                       <button onClick={() => handleOpenEdit(oh)} className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-all shadow-sm"><i className="fas fa-pencil-alt text-xs"></i></button>
                       <button onClick={() => setOhToDelete(oh)} className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-all shadow-sm"><i className="fas fa-trash-can text-xs"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOpenHouses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <i className="fas fa-calendar-day text-5xl mb-6 opacity-20"></i>
                      <p className="text-sm font-black uppercase tracking-widest">No events matched your criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Standardized Bottom Toolbar: Pagination & Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm gap-6 mt-6">
        {/* Left: Per Page Selector */}
        <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl px-5 py-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-transparent border-none text-xs font-black text-slate-700 outline-none cursor-pointer"
          >
            {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">per page</span>
        </div>

        {/* Center: Pagination Controls */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center space-x-4">
            <button 
              disabled={currentPage === 1} 
              onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); scrollToTop(); }} 
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] px-4">
              Page {currentPage} of {totalPages || 1}
            </div>
            <button 
              disabled={currentPage >= totalPages} 
              onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); scrollToTop(); }} 
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Showing {paginatedOpenHouses.length} of {filteredOpenHouses.length} events
          </p>
        </div>

        {/* Right: Scroll to Top Button */}
        <button 
          onClick={scrollToTop}
          className="flex items-center space-x-3 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
        >
          <i className="fas fa-arrow-up"></i>
          <span>Back to Top</span>
        </button>
      </div>

      {/* QR Code Modal */}
      {qrModalOH && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setQrModalOH(null)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-sm p-10 relative z-10 text-center animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-2">Check-in QR Code</h3>
            <p className="text-sm text-slate-500 mb-8">{qrModalOH.address}</p>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 inline-block shadow-inner">
              <img src={getQRUrl(qrModalOH)} alt="QR Code" className="w-48 h-48 mx-auto shadow-sm rounded-lg" />
            </div>
            <div className="space-y-3">
              <button onClick={() => window.open(getQRUrl(qrModalOH), '_blank')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100">Download QR Code</button>
              <button onClick={() => setQrModalOH(null)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {ohToDelete && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOhToDelete(null)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-md p-8 relative z-10 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6"><i className="fas fa-trash-can"></i></div>
            <h3 className="text-2xl font-black text-slate-800 mb-3">Move to Trash?</h3>
            <p className="text-slate-500 mb-8 font-medium">Remove event for <span className="text-slate-900 font-bold">{ohToDelete.address}</span>?</p>
            <div className="flex space-x-4">
              <button onClick={() => setOhToDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs">Cancel</button>
              <button onClick={() => { onDelete(ohToDelete.id); setOhToDelete(null); }} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-200">Delete Event</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-2xl p-10 relative z-10 animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto scrollbar-hide text-[12px]">
            <h3 className="text-2xl font-black text-slate-800 mb-8 tracking-tight">{editingOHId ? 'Edit Open House' : 'Setup Open House'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6 pb-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Property Address</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="123 Main St..." />
              </div>
              
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-2">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Event Session One</h4>
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                    <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none shadow-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Start Time</label>
                    <input required type="time" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none shadow-sm" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">End Time</label>
                    <input required type="time" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none shadow-sm" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                  </div>
                </div>
              </div>

              {!showSecondDate ? (
                <button 
                  type="button" 
                  onClick={() => {
                    setShowSecondDate(true);
                    if (!formData.date2) {
                      const baseDate = new Date(formData.date + 'T12:00:00');
                      baseDate.setDate(baseDate.getDate() + 1);
                      setFormData({...formData, date2: baseDate.toISOString().split('T')[0]});
                    }
                  }} 
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-3"
                >
                  <i className="fas fa-calendar-plus"></i>
                  <span>Add Second Session (e.g. Sunday)</span>
                </button>
              ) : (
                <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 space-y-6 relative animate-in slide-in-from-top-4 duration-300">
                  <button type="button" onClick={() => setShowSecondDate(false)} className="absolute top-4 right-4 text-indigo-400 hover:text-rose-500 transition-colors"><i className="fas fa-circle-xmark"></i></button>
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-4 mb-2">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Event Session Two</h4>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                      <input required={showSecondDate} type="date" className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none" value={formData.date2} onChange={e => setFormData({...formData, date2: e.target.value})} />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 ml-1">Start Time</label>
                      <input required={showSecondDate} type="time" className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none" value={formData.startTime2} onChange={e => setFormData({...formData, startTime2: e.target.value})} />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 ml-1">End Time</label>
                      <input required={showSecondDate} type="time" className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none" value={formData.endTime2} onChange={e => setFormData({...formData, endTime2: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Assigned Agent</label>
                 <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none shadow-sm" value={formData.isManualAgent ? 'manual' : formData.agentId} onChange={e => setFormData({...formData, isManualAgent: e.target.value === 'manual', agentId: e.target.value === 'manual' ? '' : e.target.value})}>
                   {agents.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                   <option value="manual">+ Manual Agent Entry</option>
                 </select>
              </div>

              {formData.isManualAgent && (
                <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">External Host Details</h4>
                  <input required type="text" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-5 py-3 text-sm font-bold" value={formData.manualAgentName} onChange={e => setFormData({...formData, manualAgentName: e.target.value})} placeholder="Agent Full Name" />
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="tel" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-5 py-3 text-sm font-bold" value={formData.manualAgentPhone} onChange={e => setFormData({...formData, manualAgentPhone: e.target.value})} placeholder="Phone" />
                    <input required type="text" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-5 py-3 text-sm font-bold" value={formData.manualAgentLicense} onChange={e => setFormData({...formData, manualAgentLicense: e.target.value})} placeholder="License #" />
                  </div>
                </div>
              )}

              {editingOHId && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Event Status</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none shadow-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="LIVE">Live</option>
                    <option value="PAST">Past</option>
                  </select>
                </div>
              )}
              
              <div className="pt-6 flex space-x-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">{editingOHId ? 'Update Event' : 'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenHouseView;