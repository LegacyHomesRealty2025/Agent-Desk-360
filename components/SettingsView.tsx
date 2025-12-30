
import React, { useState } from 'react';
import { NavItemConfig } from '../App';
import { Brokerage } from '../types';
import IntegrationsSettings from './IntegrationsSettings';

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

type SettingsTab = 'SYSTEM' | 'API';

const SettingsView: React.FC<SettingsViewProps> = ({ 
  availableSources, 
  availableTags, 
  onUpdateSources, 
  onUpdateTags,
  onTrashSource,
  onTrashTag,
  navItems,
  onUpdateNavItems,
  brokerage,
  isDarkMode,
  toggleDarkMode
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('SYSTEM');
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

  return (
    <div className={`max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20 ${isDarkMode ? 'dark' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Settings & Config</h2>
          <p className="text-sm text-slate-500 font-medium">Manage global metadata and API connections.</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Settings Theme Toggle */}
          <button 
            onClick={toggleDarkMode}
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-sm active:scale-95 ${isDarkMode ? 'bg-slate-800 text-yellow-400 border-slate-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
          </button>

          <div className={`flex p-1.5 rounded-2xl border shadow-inner ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button 
              onClick={() => setActiveTab('SYSTEM')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'SYSTEM' ? (isDarkMode ? 'bg-slate-900 text-indigo-400 shadow-sm' : 'bg-white shadow-sm text-indigo-600') : 'text-slate-500 hover:text-slate-300'}`}
            >
              System Meta
            </button>
            <button 
              onClick={() => setActiveTab('API')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'API' ? (isDarkMode ? 'bg-slate-900 text-indigo-400 shadow-sm' : 'bg-white shadow-sm text-indigo-600') : 'text-slate-500 hover:text-slate-300'}`}
            >
              API & Integrations
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'API' ? (
        <IntegrationsSettings brokerage={brokerage} />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Navigation Management */}
            <section className="space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-bars-staggered"></i>
                </div>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Navigation Order</h3>
              </div>
              
              <div className={`border rounded-[2rem] shadow-sm overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className={`divide-y overflow-y-auto max-h-[600px] scrollbar-hide ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {navItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, index, 'NAV')}
                      onDragOver={(e) => handleDragOver(e, index, 'NAV')}
                      onDrop={(e) => handleDrop(e, index, 'NAV')}
                      onDragEnd={clearDrag}
                      className={`flex items-center justify-between p-4 group transition-all cursor-move relative ${
                        dragType === 'NAV' && draggedIdx === index ? 'opacity-30' : isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                      } ${dragType === 'NAV' && overIdx === index ? 'bg-indigo-50/50' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-500 group-hover:text-indigo-400' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-600'}`}>
                          <i className={`fas ${item.icon} text-xs`}></i>
                        </div>
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.label}</span>
                      </div>
                      <i className="fas fa-grip-vertical text-slate-300 opacity-30 group-hover:opacity-100 transition-opacity"></i>
                      {dragType === 'NAV' && overIdx === index && (
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Sources Management */}
            <section className="space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-bullseye"></i>
                </div>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Lead Sources</h3>
              </div>
              
              <form onSubmit={handleAddSource} className="flex space-x-2">
                <input 
                  type="text" 
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="Add source..."
                  className={`flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}
                />
                <button type="submit" className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Add</button>
              </form>

              <div className={`border rounded-[2rem] shadow-sm overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className={`divide-y max-h-[500px] overflow-y-auto scrollbar-hide ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
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
                        <i className="fas fa-grip-vertical text-slate-300 opacity-30 group-hover:opacity-100 transition-opacity"></i>
                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{source}</span>
                      </div>
                      <button onClick={() => setConfirmDelete({ type: 'SOURCE', name: source })} className="text-slate-300 hover:text-rose-500 transition-colors p-2 opacity-0 group-hover:opacity-100">
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                      {dragType === 'SOURCE' && overIdx === index && (
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Tags Management */}
            <section className="space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <i className="fas fa-tags"></i>
                </div>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Classification Tags</h3>
              </div>

              <form onSubmit={handleAddTag} className="flex space-x-2">
                <input 
                  type="text" 
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className={`flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}
                />
                <button type="submit" className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Add</button>
              </form>

              <div className={`border rounded-[2rem] shadow-sm overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className={`divide-y max-h-[500px] overflow-y-auto scrollbar-hide ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
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
                        <i className="fas fa-grip-vertical text-slate-300 opacity-30 group-hover:opacity-100 transition-opacity"></i>
                        <div className="flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{tag}</span>
                        </div>
                      </div>
                      <button onClick={() => setConfirmDelete({ type: 'TAG', name: tag })} className="text-slate-300 hover:text-rose-500 transition-colors p-2 opacity-0 group-hover:opacity-100">
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                      {dragType === 'TAG' && overIdx === index && (
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {confirmDelete && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfirmDelete(null)}></div>
              <div className={`rounded-[2rem] shadow-2xl border w-full max-w-md p-8 relative z-10 animate-in zoom-in-95 duration-200 text-[12px] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center space-x-4 mb-6 text-rose-600">
                  <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                    <i className="fas fa-trash-can"></i>
                  </div>
                  <h3 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Move to Trash?</h3>
                </div>
                <p className={`mb-8 text-base font-semibold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Are you sure you want to remove <span className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-black`}>{confirmDelete.name}</span>? This will hide it from the UI but you can restore it from the <span className="text-indigo-600 font-bold">Trash Bin</span> later.
                </p>
                <div className="flex space-x-4">
                  <button onClick={() => setConfirmDelete(null)} className={`flex-1 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
                  <button onClick={executeTrash} className="flex-1 py-4 bg-rose-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all">Move to Trash</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SettingsView;
