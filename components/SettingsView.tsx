import React, { useState, useRef } from 'react';
import { NavItemConfig } from '../App.tsx';
import { Brokerage } from '../types.ts';

interface SettingsViewProps {
  availableSources: string[];
  availableTags: string[];
  onUpdateSources: (sources: string[]) => void;
  onUpdateTags: (tags: string[]) => void;
  onTrashSource: (source: string) => void;
  onTrashTag: (tag: string) => void;
  navItems: NavItemConfig[];
  onUpdateNavItems: (items: NavItemConfig[]) => void;
  brokerage: Brokerage;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  availableSources, 
  availableTags, 
  onUpdateSources, 
  onUpdateTags,
  onTrashSource,
  onTrashTag,
  navItems,
  onUpdateNavItems,
  isDarkMode
}) => {
  const [newSource, setNewSource] = useState('');
  const [newTag, setNewTag] = useState('');
  
  // Drag and drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [dragType, setDragType] = useState<'NAV' | 'SOURCE' | 'TAG' | null>(null);

  // Deletion confirmation state
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'SOURCE' | 'TAG'; name: string } | null>(null);

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSource.trim() && !availableSources.includes(newSource.trim())) {
      onUpdateSources([...availableSources, newSource.trim()]);
      setNewSource('');
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim() && !availableTags.includes(newTag.trim())) {
      onUpdateTags([...availableTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const executeTrash = () => {
    if (confirmDelete) {
      if (confirmDelete.type === 'SOURCE') onTrashSource(confirmDelete.name);
      else onTrashTag(confirmDelete.name);
      setConfirmDelete(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number, type: 'NAV' | 'SOURCE' | 'TAG') => {
    setDraggedIdx(index);
    setDragType(type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'NAV' | 'SOURCE' | 'TAG') => {
    e.preventDefault();
    if (dragType === type && index !== overIdx) {
      setOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number, type: 'NAV' | 'SOURCE' | 'TAG') => {
    e.preventDefault();
    if (dragType !== type || draggedIdx === null || draggedIdx === targetIndex) {
      clearDrag();
      return;
    }

    if (type === 'NAV') {
      const newOrder = [...navItems];
      const [removed] = newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIndex, 0, removed);
      onUpdateNavItems(newOrder);
    } else if (type === 'SOURCE') {
      const newOrder = [...availableSources];
      const [removed] = newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIndex, 0, removed);
      onUpdateSources(newOrder);
    } else if (type === 'TAG') {
      const newOrder = [...availableTags];
      const [removed] = newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIndex, 0, removed);
      onUpdateTags(newOrder);
    }
    
    clearDrag();
  };

  const clearDrag = () => {
    setDraggedIdx(null);
    setOverIdx(null);
    setDragType(null);
  };

  const handleResetSettings = () => {
    if (confirm("Reset sidebar navigation order to system defaults?")) {
      const DEFAULT_ORDER = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
        { id: 'email', label: 'Email Center', icon: 'fa-envelope' },
        { id: 'leads', label: 'Leads', icon: 'fa-users' },
        { id: 'contacts', label: 'Contacts', icon: 'fa-address-book' },
        { id: 'open-house', label: 'Open House', icon: 'fa-door-open' },
        { id: 'pipeline', label: 'Transactions', icon: 'fa-file-invoice-dollar' },
        { id: 'reports', label: 'Reports', icon: 'fa-chart-line' },
        { id: 'calendar', label: 'Calendar', icon: 'fa-calendar-alt' },
        { id: 'tasks', label: 'Tasks', icon: 'fa-check-circle' },
        { id: 'trash', label: 'Trash Bin', icon: 'fa-trash-can' },
        { id: 'team', label: 'Team', icon: 'fa-users-gear' },
        { id: 'profile', label: 'My Profile', icon: 'fa-user-circle' },
        { id: 'settings', label: 'Settings', icon: 'fa-cog' },
      ];
      onUpdateNavItems(DEFAULT_ORDER);
    }
  };

  return (
    <div className={`max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 pb-32 ${isDarkMode ? 'dark' : ''} text-[12px]`}>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Sidebar Applications Column */}
        <section className="space-y-6 animate-in slide-in-from-left-4 duration-500">
          <div className="flex items-center space-x-4 px-2">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-lg shadow-sm border border-indigo-100">
              <i className="fas fa-sort"></i>
            </div>
            <div>
              <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Sidebar Layout</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Navigation</p>
            </div>
          </div>

          <div className={`border rounded-[2.5rem] p-6 shadow-sm space-y-4 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex flex-col space-y-1.5 overflow-y-auto max-h-[600px] scrollbar-hide">
              {navItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index, 'NAV')}
                    onDragOver={(e) => handleDragOver(e, index, 'NAV')}
                    onDrop={(e) => handleDrop(e, index, 'NAV')}
                    onDragEnd={clearDrag}
                    className={`flex items-center justify-between p-4 bg-white border-2 rounded-xl cursor-move group transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'border-transparent hover:border-indigo-400 hover:shadow-md'} ${dragType === 'NAV' && overIdx === index ? 'border-indigo-500 scale-[1.01] shadow-lg' : ''} ${dragType === 'NAV' && draggedIdx === index ? 'opacity-20' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                        <i className={`fas ${item.icon} text-[11px] text-indigo-400`}></i>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.label}</span>
                    </div>
                    <i className="fas fa-grip-vertical text-slate-300 opacity-20 group-hover:opacity-100 transition-all text-[10px]"></i>
                  </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-200 flex justify-center">
              <button 
                onClick={handleResetSettings}
                className="text-indigo-600 font-black uppercase tracking-widest text-[9px] hover:underline"
              >
                 Reset Default Order
              </button>
            </div>
          </div>
        </section>

        {/* Lead Source Column */}
        <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center space-x-4 px-2">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg shadow-sm border border-blue-100">
              <i className="fas fa-bullseye"></i>
            </div>
            <div>
              <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Lead Source</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Roster</p>
            </div>
          </div>
          
          <div className={`border rounded-[2.5rem] p-6 shadow-sm space-y-4 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <form onSubmit={handleAddSource} className="flex space-x-2">
              <input 
                type="text" 
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="New source..."
                className={`flex-1 border rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
              />
              <button type="submit" className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-md active:scale-95">Add</button>
            </form>

            <div className={`border rounded-2xl overflow-hidden transition-colors ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className={`divide-y max-h-[600px] overflow-y-auto scrollbar-hide ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'} bg-white`}>
                {availableSources.map((source, index) => (
                  <div 
                    key={source} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index, 'SOURCE')}
                    onDragOver={(e) => handleDragOver(e, index, 'SOURCE')}
                    onDrop={(e) => handleDrop(e, index, 'SOURCE')}
                    onDragEnd={clearDrag}
                    className={`flex items-center justify-between p-4 group transition-all cursor-move relative ${
                      dragType === 'SOURCE' && draggedIdx === index ? 'opacity-30' : isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                    } ${dragType === 'SOURCE' && overIdx === index ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-grip-vertical text-slate-300 opacity-20 group-hover:opacity-100 transition-opacity text-[10px]"></i>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{source}</span>
                    </div>
                    <button onClick={() => setConfirmDelete({ type: 'SOURCE', name: source })} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                      <i className="fas fa-trash-alt text-[10px]"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Lead Tags Column */}
        <section className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="flex items-center space-x-4 px-2">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg shadow-sm border border-emerald-100">
              <i className="fas fa-tags"></i>
            </div>
            <div>
              <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Lead Tags</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Classifications</p>
            </div>
          </div>

          <div className={`border rounded-[2.5rem] p-6 shadow-sm space-y-4 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <form onSubmit={handleAddTag} className="flex space-x-2">
              <input 
                type="text" 
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="New tag..."
                className={`flex-1 border rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
              />
              <button type="submit" className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-md active:scale-95">Add</button>
            </form>

            <div className={`border rounded-2xl overflow-hidden transition-colors ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className={`divide-y max-h-[600px] overflow-y-auto scrollbar-hide ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'} bg-white`}>
                {availableTags.map((tag, index) => (
                  <div 
                    key={tag} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index, 'TAG')}
                    onDragOver={(e) => handleDragOver(e, index, 'TAG')}
                    onDrop={(e) => handleDrop(e, index, 'TAG')}
                    onDragEnd={clearDrag}
                    className={`flex items-center justify-between p-4 group transition-all cursor-move relative ${
                      dragType === 'TAG' && draggedIdx === index ? 'opacity-30' : isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                    } ${dragType === 'TAG' && overIdx === index ? 'bg-emerald-50/50' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-grip-vertical text-slate-300 opacity-20 group-hover:opacity-100 transition-opacity text-[10px]"></i>
                      <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{tag}</span>
                      </div>
                    </div>
                    <button onClick={() => setConfirmDelete({ type: 'TAG', name: tag })} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100">
                      <i className="fas fa-trash-alt text-[10px]"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmDelete(null)}></div>
          <div className={`rounded-[2.5rem] shadow-2xl border w-full max-w-md p-10 relative z-10 animate-in zoom-in-95 duration-200 text-[12px] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center space-x-4 mb-6 text-rose-600">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-rose-100">
                <i className="fas fa-trash-can"></i>
              </div>
              <h3 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Archive Meta?</h3>
            </div>
            <p className={`mb-10 text-base font-semibold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Are you sure you want to remove <span className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-black`}>{confirmDelete.name}</span>? Existing records using this tag will retain it, but it will be hidden from new lead forms.
            </p>
            <div className="flex space-x-4">
              <button onClick={() => setConfirmDelete(null)} className={`flex-1 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Keep</button>
              <button onClick={executeTrash} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Move to Trash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;