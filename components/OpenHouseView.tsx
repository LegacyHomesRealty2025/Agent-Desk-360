import React, { useState, useMemo } from 'react';
import { OpenHouse, User, UserRole } from '../types.ts';

interface OpenHouseViewProps {
  openHouses: OpenHouse[];
  agents: User[];
  currentUser: User;
  onCreate: (oh: OpenHouse) => void;
  onUpdate: (oh: OpenHouse) => void;
  onDelete: (id: string) => void;
  onPreviewPublic: (oh: OpenHouse) => void;
}

const OpenHouseView: React.FC<OpenHouseViewProps> = ({ 
  openHouses, 
  agents, 
  currentUser, 
  onCreate, 
  onUpdate, 
  onDelete, 
  onPreviewPublic 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'tile' | 'list'>('tile');
  const [ohToDelete, setOhToDelete] = useState<OpenHouse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const initialForm: Partial<OpenHouse> = {
    address: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '14:00',
    date2: '',
    startTime2: '10:00',
    endTime2: '14:00',
    assignedAgentId: currentUser.id,
    assignedAgentName: `${currentUser.firstName} ${currentUser.lastName}`,
    isManualAgent: false,
    manualAgentPhone: '',
    manualAgentLicense: '',
    status: 'UPCOMING'
  };

  const [formData, setFormData] = useState<Partial<OpenHouse>>(initialForm);

  const stats = useMemo(() => {
    const active = openHouses.filter(oh => !oh.isDeleted);
    return {
      total: active.length,
      live: active.filter(oh => oh.status === 'LIVE').length,
      upcoming: active.filter(oh => oh.status === 'UPCOMING').length,
      visitors: active.reduce((sum, oh) => sum + (oh.visitorCount || 0), 0)
    };
  }, [openHouses]);

  const activeEvents = useMemo(() => {
    return openHouses
      .filter(oh => !oh.isDeleted)
      .filter(oh => {
        const term = searchTerm.toLowerCase();
        return (
          oh.address.toLowerCase().includes(term) ||
          oh.assignedAgentName.toLowerCase().includes(term)
        );
      });
  }, [openHouses, searchTerm]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (oh: OpenHouse) => {
    setEditingId(oh.id);
    setFormData({ ...oh });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let hostName = formData.assignedAgentName;
    if (!formData.isManualAgent) {
      const selected = agents.find(a => a.id === formData.assignedAgentId);
      if (selected) hostName = `${selected.firstName} ${selected.lastName}`;
    }

    if (editingId) {
      onUpdate({ ...formData, assignedAgentName: hostName } as OpenHouse);
    } else {
      const newOH: OpenHouse = {
        ...formData,
        id: `oh_${Date.now()}`,
        brokerageId: currentUser.brokerageId,
        visitorCount: 0,
        assignedAgentName: hostName
      } as OpenHouse;
      onCreate(newOH);
    }
    setIsModalOpen(false);
  };

  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const length = phoneNumber.length;
    if (length < 4) return `(${phoneNumber}`;
    if (length < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-32 text-[12px]">
      {/* Analytics Dashboard Header */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden group gap-6 w-full">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-20 -mt-20 blur-3xl transition-transform group-hover:scale-110"></div>
         <div className="relative z-10 flex-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Open House Hub</h2>
            <p className="text-slate-500 font-medium mt-1">Manage tours and track real-time visitor conversion.</p>
            
            {/* Search Bar Integration */}
            <div className="mt-6 relative max-w-md group">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"></i>
              <input 
                type="text" 
                placeholder="Search address or agent..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500 transition-all"
              />
            </div>
         </div>
         
         <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              <button onClick={() => setDisplayMode('tile')} className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${displayMode === 'tile' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="Tile View"><i className="fas fa-th-large"></i></button>
              <button onClick={() => setDisplayMode('list')} className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${displayMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="List View"><i className="fas fa-list-ul"></i></button>
            </div>
            <button 
              onClick={handleOpenCreate}
              className="bg-indigo-600 text-white px-8 py-4 rounded-[1.25rem] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center space-x-3 active:scale-95 whitespace-nowrap"
            >
              <i className="fas fa-plus"></i>
              <span>New Event</span>
            </button>
         </div>
      </div>

      {/* Main Content Render */}
      {displayMode === 'tile' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeEvents.map(oh => (
            <div key={oh.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-6 hover:border-indigo-500 hover:shadow-xl transition-all group relative flex flex-col justify-between min-h-[360px]">
              <div>
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center space-x-2">
                     <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm ${
                       oh.status === 'LIVE' ? 'bg-emerald-500 border-emerald-400 text-white' :
                       oh.status === 'UPCOMING' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                       'bg-slate-100 text-slate-400 border-slate-200'
                     }`}>
                       {oh.status}
                     </span>
                     {oh.date2 && (
                        <span className="px-2 py-1 rounded-full bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest">Double Day</span>
                     )}
                   </div>

                   {/* Fixed Icons - Always Visible on Card */}
                   <div className="flex space-x-1">
                    <button onClick={() => onPreviewPublic(oh)} className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Launch Public Sign-In"><i className="fas fa-desktop text-[10px]"></i></button>
                    <button onClick={() => handleOpenEdit(oh)} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"><i className="fas fa-pencil text-[10px]"></i></button>
                    <button onClick={() => setOhToDelete(oh)} className="w-8 h-8 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-alt text-[10px]"></i></button>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{oh.address}</h3>
                  
                  <div className="space-y-1.5">
                     <div className="flex items-center text-slate-400 font-black uppercase tracking-widest text-[9px]">
                        <i className="far fa-calendar-check mr-2 text-indigo-500 w-3"></i>
                        <span>{new Date(oh.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span className="mx-2 opacity-30">|</span>
                        <span>{oh.startTime}</span>
                     </div>
                     {oh.date2 && (
                        <div className="flex items-center text-slate-400 font-black uppercase tracking-widest text-[9px]">
                           <i className="far fa-calendar-plus mr-2 text-indigo-500 w-3"></i>
                           <span>{new Date(oh.date2).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                           <span className="mx-2 opacity-30">|</span>
                           <span>{oh.startTime2}</span>
                        </div>
                     )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner shrink-0">
                        <i className={`fas ${oh.isManualAgent ? 'fa-user-clock' : 'fa-user-tie'} text-xs`}></i>
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Host</p>
                        <p className="text-[11px] font-black text-slate-800 truncate">{oh.assignedAgentName}</p>
                      </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Visitors</p>
                      <div className="flex items-center justify-end space-x-1.5">
                        <span className="text-xl font-black text-slate-900">{oh.visitorCount}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                      </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Property Location</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Host Agent</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Visitors</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeEvents.map(oh => (
                <tr key={oh.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-800">{oh.address}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Scranton Area Market</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center text-[10px] font-bold text-slate-600">
                        <i className="far fa-calendar mr-2 text-indigo-500"></i>
                        <span>Day 1: {new Date(oh.date).toLocaleDateString()}</span>
                        <span className="mx-2 opacity-30">|</span>
                        <span>{oh.startTime}</span>
                      </div>
                      {oh.date2 && (
                        <div className="flex items-center text-[10px] font-bold text-slate-400">
                          <i className="far fa-calendar-plus mr-2 text-indigo-500 opacity-50"></i>
                          <span>Day 2: {new Date(oh.date2).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                       <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                         <i className={`fas ${oh.isManualAgent ? 'fa-user-clock' : 'fa-user-tie'} text-[10px]`}></i>
                       </div>
                       <div>
                         <p className="text-xs font-black text-slate-700 leading-none">{oh.assignedAgentName}</p>
                         {oh.isManualAgent && <p className="text-[8px] font-black text-indigo-500 uppercase mt-1">Guest Partner</p>}
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm ${
                      oh.status === 'LIVE' ? 'bg-emerald-500 border-emerald-400 text-white' :
                      oh.status === 'UPCOMING' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                      'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      {oh.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-lg font-black text-slate-900">{oh.visitorCount}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end space-x-2">
                       <button onClick={() => onPreviewPublic(oh)} className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Launch Public Sign-In"><i className="fas fa-desktop text-xs"></i></button>
                       <button onClick={() => handleOpenEdit(oh)} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"><i className="fas fa-pencil text-xs"></i></button>
                       <button onClick={() => setOhToDelete(oh)} className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-alt text-xs"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeEvents.length === 0 && (
        <div className="col-span-full py-48 bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100 text-center flex flex-col items-center justify-center opacity-40">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl text-slate-200 shadow-inner mb-6">
             <i className="fas fa-door-open"></i>
          </div>
          <p className="text-xl font-black uppercase tracking-[0.4em] text-slate-400">{searchTerm ? 'No matches found' : 'No events scheduled'}</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {ohToDelete && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setOhToDelete(null)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-md p-10 relative z-10 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner border border-rose-100">
              <i className="fas fa-trash-can"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Trash Event?</h3>
            <p className="text-slate-500 mb-10 font-medium leading-relaxed">
              Moving <span className="text-slate-900 font-bold">{ohToDelete.address}</span> to the trash bin will archive all visitor flow associated with this event.
            </p>
            <div className="flex items-center space-x-4 w-full">
              <button onClick={() => setOhToDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={() => { onDelete(ohToDelete.id); setOhToDelete(null); }} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Creation/Editing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl w-full max-w-5xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[95vh]">
            
            <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-md">
               <div className="flex items-center space-x-6">
                  <div className="w-16 h-16 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center text-2xl shadow-xl shadow-indigo-200">
                    <i className={`fas ${editingId ? 'fa-pen-to-square' : 'fa-house-circle-exclamation'}`}></i>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">{editingId ? 'Edit Event' : 'Open House Event'}</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Operational Pipeline Management</p>
                  </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="w-14 h-14 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100 active:scale-90"><i className="fas fa-times text-xl"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
              <form onSubmit={handleSubmit} className="space-y-16">
                 {/* Zone 1: Location & Status */}
                 <div className="space-y-8">
                    <div className="flex items-center space-x-3 px-2">
                       <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                       <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">1. Core Details</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="md:col-span-2 space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Property Location</label>
                          <div className="relative group">
                             <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                <i className="fas fa-map-location-dot text-xl"></i>
                             </div>
                             <input 
                               required 
                               type="text" 
                               value={formData.address} 
                               onChange={e => setFormData({...formData, address: e.target.value})} 
                               className="w-full bg-slate-50 border border-slate-200 rounded-3xl pl-16 pr-6 py-6 font-black text-xl text-slate-800 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-inner" 
                               placeholder="e.g. 1725 Slough Ave, Scranton, PA" 
                             />
                          </div>
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Status</label>
                          <div className="relative">
                            <select 
                              value={formData.status} 
                              onChange={e => setFormData({...formData, status: e.target.value as any})} 
                              className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-6 font-black uppercase text-lg text-slate-800 outline-none cursor-pointer appearance-none focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-inner"
                            >
                               <option value="UPCOMING">Upcoming</option>
                               <option value="LIVE">Live - Active</option>
                               <option value="PAST">Archived</option>
                            </select>
                            <i className="fas fa-chevron-down absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Zone 2: Scheduling */}
                 <div className="space-y-8">
                    <div className="flex items-center space-x-3 px-2">
                       <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                       <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">2. Event Schedule</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="p-10 bg-indigo-50 rounded-[3rem] border border-indigo-100 space-y-10 relative overflow-hidden group/day">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                          <div className="flex items-center justify-between relative z-10">
                             <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                   <i className="fas fa-calendar-day"></i>
                                </div>
                                <span className="text-xl font-black text-indigo-900 tracking-tight">Schedule Day 1</span>
                             </div>
                             <span className="px-4 py-1 bg-white/50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100">Primary</span>
                          </div>
                          <div className="space-y-6 relative z-10">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Event Date</label>
                                <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-white/80 border border-indigo-200 rounded-2xl px-6 py-4 font-black text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-sm" />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                   <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Starts</label>
                                   <input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full bg-white/80 border border-indigo-200 rounded-2xl px-6 py-4 font-black text-slate-700 outline-none focus:bg-white" />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Ends</label>
                                   <input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full bg-white/80 border border-indigo-200 rounded-2xl px-6 py-4 font-black text-slate-700 outline-none focus:bg-white" />
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className={`p-10 rounded-[3rem] border transition-all duration-500 space-y-10 relative overflow-hidden group/day2 ${formData.date2 ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50/50 border-slate-200 grayscale opacity-60'}`}>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                          <div className="flex items-center justify-between relative z-10">
                             <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border transition-all ${formData.date2 ? 'bg-white text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                   <i className="fas fa-calendar-plus"></i>
                                </div>
                                <span className={`text-xl font-black tracking-tight ${formData.date2 ? 'text-indigo-900' : 'text-slate-400'}`}>Schedule Day 2</span>
                             </div>
                             <button type="button" onClick={() => setFormData({...formData, date2: formData.date2 ? '' : formData.date})} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.date2 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
                                {formData.date2 ? 'Deactivate' : 'Activate'}
                             </button>
                          </div>
                          <div className={`space-y-6 relative z-10 transition-all duration-500 ${formData.date2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Event Date</label>
                                <input type="date" value={formData.date2} onChange={e => setFormData({...formData, date2: e.target.value})} className="w-full bg-white/80 border border-indigo-200 rounded-2xl px-6 py-4 font-black text-slate-700 outline-none" />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                   <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Starts</label>
                                   <input type="time" value={formData.startTime2} onChange={e => setFormData({...formData, startTime2: e.target.value})} className="w-full bg-white/80 border border-indigo-200 rounded-2xl px-6 py-4 font-black text-slate-700 outline-none" />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Ends</label>
                                   <input type="time" value={formData.endTime2} onChange={e => setFormData({...formData, endTime2: e.target.value})} className="w-full bg-white/80 border border-indigo-200 rounded-2xl px-6 py-4 font-black text-slate-700 outline-none" />
                                </div>
                             </div>
                          </div>
                          {!formData.date2 && (
                             <div className="absolute inset-0 flex items-center justify-center p-12 text-center">
                                <p className="text-sm font-bold text-slate-400 italic">Optional: Double-day weekend event protocol.</p>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>

                 {/* Zone 3: Host Selection */}
                 <div className="space-y-8">
                    <div className="flex items-center space-x-3 px-2">
                       <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                       <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">3. Host Assignment</h4>
                    </div>

                    <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full -mr-32 -mt-32 blur-[80px]"></div>
                       
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 relative z-10">
                          <div>
                             <h4 className="text-2xl font-black tracking-tight">Personnel Designation</h4>
                             <p className="text-slate-400 font-medium text-sm mt-1">Assign an internal team member or an external partner to host.</p>
                          </div>
                          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                             <button 
                               type="button" 
                               onClick={() => setFormData({...formData, isManualAgent: false})}
                               className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!formData.isManualAgent ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                             >
                               Team Member
                             </button>
                             <button 
                               type="button" 
                               onClick={() => setFormData({...formData, isManualAgent: true})}
                               className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.isManualAgent ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                             >
                               External Host
                             </button>
                          </div>
                       </div>

                       <div className="relative z-10">
                          {!formData.isManualAgent ? (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center animate-in fade-in slide-in-from-left-4 duration-500">
                               <div className="md:col-span-8 space-y-3">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select from Team Roster</label>
                                  <div className="relative group">
                                     <select 
                                       value={formData.assignedAgentId} 
                                       onChange={e => {
                                         const agent = agents.find(a => a.id === e.target.value);
                                         setFormData({...formData, assignedAgentId: e.target.value, assignedAgentName: agent ? `${agent.firstName} ${agent.lastName}` : ''});
                                       }} 
                                       className="w-full bg-white/5 border-2 border-white/10 rounded-3xl px-8 py-6 font-black text-xl text-white outline-none focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                                     >
                                       {agents.map(a => <option key={a.id} value={a.id} className="text-slate-900">{a.firstName} {a.lastName} ({a.role})</option>)}
                                     </select>
                                     <i className="fas fa-chevron-down absolute right-8 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"></i>
                                  </div>
                               </div>
                               <div className="md:col-span-4 p-8 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                                  <div className="flex items-center space-x-4">
                                     <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-lg">
                                        <i className="fas fa-user-tie"></i>
                                     </div>
                                     <div>
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Active ID</p>
                                        <p className="text-base font-black truncate">{formData.assignedAgentName}</p>
                                     </div>
                                  </div>
                               </div>
                            </div>
                          ) : (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                               <div className="space-y-3">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Manual Host Identity</label>
                                  <input 
                                    type="text" 
                                    required={formData.isManualAgent}
                                    value={formData.assignedAgentName} 
                                    onChange={e => setFormData({...formData, assignedAgentName: e.target.value})} 
                                    className="w-full bg-white/5 border-2 border-white/10 rounded-3xl px-8 py-5 font-black text-xl text-white outline-none focus:border-indigo-400 transition-all shadow-inner" 
                                    placeholder="Full Name (e.g. Michael Jordan)" 
                                  />
                               </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-3">
                                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Direct Contact Phone</label>
                                     <input 
                                       type="tel" 
                                       value={formData.manualAgentPhone} 
                                       onChange={e => setFormData({...formData, manualAgentPhone: formatPhone(e.target.value)})} 
                                       className="w-full bg-white/5 border-2 border-white/10 rounded-3xl px-8 py-5 font-black text-lg text-white outline-none focus:border-indigo-400 transition-all shadow-inner" 
                                       placeholder="(555) 000-0000" 
                                     />
                                  </div>
                                  <div className="space-y-3">
                                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Host License Number</label>
                                     <input 
                                       type="text" 
                                       value={formData.manualAgentLicense} 
                                       onChange={e => setFormData({...formData, manualAgentLicense: e.target.value})} 
                                       className="w-full bg-white/5 border-2 border-white/10 rounded-3xl px-8 py-5 font-black text-lg text-indigo-400 outline-none focus:border-indigo-400 transition-all shadow-inner" 
                                       placeholder="DRE#..." 
                                     />
                                  </div>
                               </div>
                               <p className="text-[10px] font-medium text-slate-500 italic text-center">* Manual entry allows non-platform users to be attributed as leads flow into the pipeline.</p>
                            </div>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row items-center gap-6 pb-6">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)} 
                      className="w-full md:w-auto px-12 py-6 text-slate-400 font-black uppercase tracking-[0.2em] hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                    >
                       Discard Entry
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 w-full py-8 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-[11px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center space-x-6"
                    >
                       <i className={`fas ${editingId ? 'fa-save' : 'fa-bolt-lightning'} text-lg`}></i>
                       <span>{editingId ? 'Commit Modifications' : 'Save Event'}</span>
                    </button>
                 </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenHouseView;