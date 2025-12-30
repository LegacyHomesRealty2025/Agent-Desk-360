
import React, { useState, useMemo } from 'react';
// Fix: Imported TrashedMetadata from '../types' instead of '../App'
import { Lead, Deal, OpenHouse, TrashedMetadata, User } from '../types';

interface TrashViewProps {
  leads: Lead[];
  deals: Deal[];
  openHouses: OpenHouse[];
  users: User[];
  trashedSources: TrashedMetadata[];
  trashedTags: TrashedMetadata[];
  onRestoreLead: (id: string) => void;
  onRestoreDeal: (id: string) => void;
  onRestoreOpenHouse: (id: string) => void;
  onRestoreUser: (id: string) => void;
  onRestoreSource: (name: string) => void;
  onRestoreTag: (name: string) => void;
  onBulkRestoreLeads: (ids: string[]) => void;
  onBulkRestoreDeals: (ids: string[]) => void;
  onBulkRestoreOpenHouses: (ids: string[]) => void;
  onPermanentDeleteLead: (id: string) => void;
  onPermanentDeleteDeal: (id: string) => void;
  onPermanentDeleteOpenHouse: (id: string) => void;
  onPermanentDeleteUser: (id: string) => void;
  onPermanentDeleteSource: (name: string) => void;
  onPermanentDeleteTag: (name: string) => void;
  onBulkPermanentDeleteLeads: (ids: string[]) => void;
  onBulkPermanentDeleteDeals: (ids: string[]) => void;
  onBulkPermanentDeleteOpenHouses: (ids: string[]) => void;
}

const TZ = 'America/Los_Angeles';

type TrashTab = 'ALL' | 'LEADS' | 'DEALS' | 'OPEN_HOUSES' | 'TEAM_MEMBERS' | 'SOURCES' | 'TAGS';

interface ConsolidatedItem {
  type: TrashTab;
  id: string;
  name: string;
  label: string;
  subLabel: string;
  deletedAt: string;
  original: any;
}

const TrashView: React.FC<TrashViewProps> = ({ 
  leads, 
  deals, 
  openHouses,
  users,
  trashedSources,
  trashedTags,
  onRestoreLead, 
  onRestoreDeal, 
  onRestoreOpenHouse,
  onRestoreUser,
  onRestoreSource,
  onRestoreTag,
  onBulkRestoreLeads,
  onBulkRestoreDeals,
  onBulkRestoreOpenHouses,
  onPermanentDeleteLead, 
  onPermanentDeleteDeal,
  onPermanentDeleteOpenHouse,
  onPermanentDeleteUser,
  onPermanentDeleteSource,
  onPermanentDeleteTag,
  onBulkPermanentDeleteLeads,
  onBulkPermanentDeleteDeals,
  onBulkPermanentDeleteOpenHouses
}) => {
  const [activeTab, setActiveTab] = useState<TrashTab>('ALL');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const consolidatedTrash = useMemo(() => {
    const items: ConsolidatedItem[] = [];
    
    leads.forEach(l => items.push({
      type: 'LEADS',
      id: l.id,
      name: l.id,
      label: `${l.firstName} ${l.lastName}`,
      subLabel: 'Contact Lead',
      deletedAt: l.deletedAt || '',
      original: l
    }));

    deals.forEach(d => items.push({
      type: 'DEALS',
      id: d.id,
      name: d.id,
      label: d.address,
      subLabel: `Deal (${d.leadName})`,
      deletedAt: d.deletedAt || '',
      original: d
    }));

    openHouses.forEach(oh => items.push({
      type: 'OPEN_HOUSES',
      id: oh.id,
      name: oh.id,
      label: oh.address,
      subLabel: 'Open House Event',
      deletedAt: oh.deletedAt || '',
      original: oh
    }));

    users.forEach(u => items.push({
      type: 'TEAM_MEMBERS',
      id: u.id,
      name: u.id,
      label: `${u.firstName} ${u.lastName}`,
      subLabel: `${u.role} Account`,
      deletedAt: u.deletedAt || '',
      original: u
    }));

    trashedSources.forEach(s => items.push({
      type: 'SOURCES',
      id: `src-${s.name}`,
      name: s.name,
      label: s.name,
      subLabel: 'Lead Source Meta',
      deletedAt: s.deletedAt,
      original: s
    }));

    trashedTags.forEach(t => items.push({
      type: 'TAGS',
      id: `tag-${t.name}`,
      name: t.name,
      label: t.name,
      subLabel: 'Classification Tag',
      deletedAt: t.deletedAt,
      original: t
    }));

    return items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }, [leads, deals, openHouses, users, trashedSources, trashedTags]);

  const currentTabItems = useMemo(() => {
    if (activeTab === 'ALL') return consolidatedTrash;
    return consolidatedTrash.filter(item => item.type === activeTab);
  }, [activeTab, consolidatedTrash]);

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAllCurrent = () => {
    if (selectedItemIds.length === currentTabItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(currentTabItems.map(i => i.id));
    }
  };

  const handleBulkRestore = () => {
    const selectedFullItems = consolidatedTrash.filter(item => selectedItemIds.includes(item.id));
    
    // Categorize for bulk handlers
    const leadIds = selectedFullItems.filter(i => i.type === 'LEADS').map(i => i.id);
    const dealIds = selectedFullItems.filter(i => i.type === 'DEALS').map(i => i.id);
    const ohIds = selectedFullItems.filter(i => i.type === 'OPEN_HOUSES').map(i => i.id);
    const userIds = selectedFullItems.filter(i => i.type === 'TEAM_MEMBERS').map(i => i.id);
    const sourceNames = selectedFullItems.filter(i => i.type === 'SOURCES').map(i => i.name);
    const tagNames = selectedFullItems.filter(i => i.type === 'TAGS').map(i => i.name);

    if (leadIds.length > 0) onBulkRestoreLeads(leadIds);
    if (dealIds.length > 0) onBulkRestoreDeals(dealIds);
    if (ohIds.length > 0) onBulkRestoreOpenHouses(ohIds);
    userIds.forEach(id => onRestoreUser(id));
    
    // Metadata doesn't have bulk restore in App.tsx props yet, so we iterate
    sourceNames.forEach(name => onRestoreSource(name));
    tagNames.forEach(name => onRestoreTag(name));

    setSelectedItemIds([]);
  };

  const handleBulkDelete = () => {
    const selectedFullItems = consolidatedTrash.filter(item => selectedItemIds.includes(item.id));
    const totalCount = selectedItemIds.length;

    if (confirm(`Permanently delete ${totalCount} selected item(s)? This action cannot be undone.`)) {
      const leadIds = selectedFullItems.filter(i => i.type === 'LEADS').map(i => i.id);
      const dealIds = selectedFullItems.filter(i => i.type === 'DEALS').map(i => i.id);
      const ohIds = selectedFullItems.filter(i => i.type === 'OPEN_HOUSES').map(i => i.id);
      const userIds = selectedFullItems.filter(i => i.type === 'TEAM_MEMBERS').map(i => i.id);
      const sourceNames = selectedFullItems.filter(i => i.type === 'SOURCES').map(i => i.name);
      const tagNames = selectedFullItems.filter(i => i.type === 'TAGS').map(i => i.name);

      if (leadIds.length > 0) onBulkPermanentDeleteLeads(leadIds);
      if (dealIds.length > 0) onBulkPermanentDeleteDeals(dealIds);
      if (ohIds.length > 0) onBulkPermanentDeleteOpenHouses(ohIds);
      userIds.forEach(id => onPermanentDeleteUser(id));
      
      sourceNames.forEach(name => onPermanentDeleteSource(name));
      tagNames.forEach(name => onPermanentDeleteTag(name));

      setSelectedItemIds([]);
    }
  };

  const getIconForType = (type: TrashTab) => {
    switch(type) {
      case 'LEADS': return 'fa-user';
      case 'DEALS': return 'fa-file-invoice-dollar';
      case 'OPEN_HOUSES': return 'fa-door-open';
      case 'TEAM_MEMBERS': return 'fa-user-tie';
      case 'SOURCES': return 'fa-bullseye';
      case 'TAGS': return 'fa-tag';
      default: return 'fa-trash-can';
    }
  };

  const getTypeColor = (type: TrashTab) => {
    switch(type) {
      case 'LEADS': return 'text-indigo-600 bg-indigo-50';
      case 'DEALS': return 'text-emerald-600 bg-emerald-50';
      case 'OPEN_HOUSES': return 'text-amber-600 bg-amber-50';
      case 'TEAM_MEMBERS': return 'text-purple-600 bg-purple-50';
      case 'SOURCES': return 'text-blue-600 bg-blue-50';
      case 'TAGS': return 'text-rose-600 bg-rose-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const handleRestore = (item: ConsolidatedItem) => {
    if (item.type === 'LEADS') onRestoreLead(item.id);
    else if (item.type === 'DEALS') onRestoreDeal(item.id);
    else if (item.type === 'OPEN_HOUSES') onRestoreOpenHouse(item.id);
    else if (item.type === 'TEAM_MEMBERS') onRestoreUser(item.id);
    else if (item.type === 'SOURCES') onRestoreSource(item.name);
    else if (item.type === 'TAGS') onRestoreTag(item.name);
  };

  const handleDelete = (item: ConsolidatedItem) => {
    const msg = item.type === 'SOURCES' || item.type === 'TAGS' 
      ? `Permanently delete this metadata item?` 
      : `Permanently delete this ${item.type.slice(0, -1)}? This action cannot be undone.`;
    
    if (confirm(msg)) {
      if (item.type === 'LEADS') onPermanentDeleteLead(item.id);
      else if (item.type === 'DEALS') onPermanentDeleteDeal(item.id);
      else if (item.type === 'OPEN_HOUSES') onPermanentDeleteOpenHouse(item.id);
      else if (item.type === 'TEAM_MEMBERS') onPermanentDeleteUser(item.id);
      else if (item.type === 'SOURCES') onPermanentDeleteSource(item.name);
      else if (item.type === 'TAGS') onPermanentDeleteTag(item.name);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1200px] mx-auto pb-32 relative">
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
              <i className="fas fa-trash-can text-indigo-500 mr-4 text-2xl"></i>
              Trash Bin
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Review and manage recently deleted records.</p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide border border-slate-200 shadow-inner">
            <button 
              onClick={() => { setActiveTab('ALL'); setSelectedItemIds([]); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'ALL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All ({consolidatedTrash.length})
            </button>
            <div className="w-px h-4 bg-slate-200 self-center mx-2"></div>
            <button 
              onClick={() => { setActiveTab('LEADS'); setSelectedItemIds([]); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'LEADS' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Leads ({leads.length})
            </button>
            <button 
              onClick={() => { setActiveTab('DEALS'); setSelectedItemIds([]); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'DEALS' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Deals ({deals.length})
            </button>
            <button 
              onClick={() => { setActiveTab('OPEN_HOUSES'); setSelectedItemIds([]); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'OPEN_HOUSES' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Open House ({openHouses.length})
            </button>
            <button 
              onClick={() => { setActiveTab('TEAM_MEMBERS'); setSelectedItemIds([]); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'TEAM_MEMBERS' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Team ({users.length})
            </button>
            <button 
              onClick={() => { setActiveTab('SOURCES'); setSelectedItemIds([]); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'SOURCES' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sources ({trashedSources.length})
            </button>
            <button 
              onClick={() => { setActiveTab('TAGS'); setSelectedItemIds([]); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'TAGS' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tags ({trashedTags.length})
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedItemIds.length > 0 && (
          <div className="bg-indigo-600 text-white rounded-3xl px-8 py-6 flex items-center justify-between mb-8 shadow-2xl shadow-indigo-100 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center space-x-6">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center font-black text-lg">
                {selectedItemIds.length}
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest">Items Selected</p>
                <button 
                  onClick={() => setSelectedItemIds([])}
                  className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 hover:text-white transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleBulkRestore}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-3"
              >
                <i className="fas fa-rotate-left"></i>
                <span>Restore All</span>
              </button>
              <button 
                onClick={handleBulkDelete}
                className="px-6 py-3 bg-rose-500 hover:bg-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-3 shadow-lg"
              >
                <i className="fas fa-trash-can"></i>
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        )}

        <div className="bg-slate-50/50 rounded-[2.5rem] border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200">
                  <th className="px-8 py-6 w-16 text-center">
                    <input 
                      type="checkbox" 
                      checked={currentTabItems.length > 0 && selectedItemIds.length === currentTabItems.length}
                      onChange={selectAllCurrent}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm"
                    />
                  </th>
                  <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Item Details</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Type</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deleted On</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/40">
                {currentTabItems.map(item => (
                  <tr key={item.id} className={`hover:bg-indigo-50/30 transition-all group ${selectedItemIds.includes(item.id) ? 'bg-indigo-50/20' : ''}`}>
                    <td className="px-8 py-8 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedItemIds.includes(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all"
                      />
                    </td>
                    <td className="px-4 py-8">
                      <div className="flex items-center space-x-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm shadow-sm transition-transform group-hover:scale-110 ${getTypeColor(item.type)}`}>
                           <i className={`fas ${getIconForType(item.type)}`}></i>
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-base font-black text-slate-700 truncate max-w-xs">{item.label}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{item.subLabel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                       <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${getTypeColor(item.type)} border-current/10`}>
                         {item.type.replace('_', ' ')}
                       </span>
                    </td>
                    <td className="px-8 py-8 text-xs font-bold text-slate-500 uppercase tracking-tighter">
                      {new Date(item.deletedAt).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-8 py-8 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <button 
                          onClick={() => handleRestore(item)}
                          className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          <i className="fas fa-rotate-left"></i>
                          <span>Restore</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(item)}
                          className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {currentTabItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-32 text-center text-slate-400 font-bold italic uppercase tracking-widest opacity-40">
                      <div className="flex flex-col items-center space-y-4">
                        <i className="fas fa-folder-open text-5xl"></i>
                        <span>The trash bin is empty for this view.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrashView;