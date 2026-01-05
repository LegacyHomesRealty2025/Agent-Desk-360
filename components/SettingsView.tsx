import React, { useState, useRef } from 'react';
import { NavItemConfig } from '../App.tsx';
import { Brokerage, UserRole } from '../types.ts';
import IntegrationsSettings from './IntegrationsSettings.tsx';

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

type SettingsTab = 'SYSTEM' | 'BRANDING' | 'API' | 'BILLING';

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

  // Branding States (RESTORED)
  const [brokerageLogo, setBrokerageLogo] = useState('https://picsum.photos/seed/brokerage/400');
  const [brandColor, setBrandColor] = useState('#6366f1');
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingLogo(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBrokerageLogo(ev.target?.result as string);
        setIsProcessingLogo(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-500 pb-32 ${isDarkMode ? 'dark' : ''} text-[12px]`}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <h2 className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Brokerage Control</h2>
          <p className="text-base text-slate-500 font-medium">Manage system-wide metadata, branding, and connectivity.</p>
        </div>
        
        <div className="flex bg-white/50 backdrop-blur-sm p-2 rounded-[2rem] border border-slate-200 shadow-sm relative z-10 shrink-0 overflow-x-auto scrollbar-hide">
          {[
            { id: 'SYSTEM', label: 'System Meta', icon: 'fa-microchip' },
            { id: 'BRANDING', label: 'Identity', icon: 'fa-palette' },
            { id: 'API', label: 'Integrations', icon: 'fa-plug' },
            { id: 'BILLING', label: 'Subscription', icon: 'fa-credit-card' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center space-x-3 whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              <i className={`fas ${tab.icon}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-10">
          {activeTab === 'SYSTEM' && (
            <div className="space-y-10 animate-in slide-in-from-left-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Sources Management */}
                  <section className="space-y-6">
                    <div className="flex items-center space-x-4 mb-2 px-2">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-blue-100">
                        <i className="fas fa-bullseye"></i>
                      </div>
                      <div>
                        <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Lead Channels</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Source Roster</p>
                      </div>
                    </div>
                    
                    <form onSubmit={handleAddSource} className="flex space-x-3">
                      <input 
                        type="text" 
                        value={newSource}
                        onChange={(e) => setNewSource(e.target.value)}
                        placeholder="e.g. Yard Sign"
                        className={`flex-1 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}
                      />
                      <button type="submit" className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl active:scale-95">Register</button>
                    </form>

                    <div className={`border rounded-[2.5rem] shadow-sm overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className={`divide-y max-h-[500px] overflow-y-auto scrollbar-hide ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                        {availableSources.map((source, index) => (
                          <div 
                            key={source} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, index, 'SOURCE')}
                            onDragOver={(e) => handleDragOver(e, index, 'SOURCE')}
                            onDrop={(e) => handleDrop(e, index, 'SOURCE')}
                            onDragEnd={clearDrag}
                            className={`flex items-center justify-between p-6 group transition-all cursor-move relative ${
                              dragType === 'SOURCE' && draggedIdx === index ? 'opacity-30' : isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                            } ${dragType === 'SOURCE' && overIdx === index ? 'bg-blue-50/50' : ''}`}
                          >
                            <div className="flex items-center space-x-4">
                              <i className="fas fa-grip-vertical text-slate-300 opacity-30 group-hover:opacity-100 transition-opacity"></i>
                              <span className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{source}</span>
                            </div>
                            <button onClick={() => setConfirmDelete({ type: 'SOURCE', name: source })} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                              <i className="fas fa-trash-alt text-xs"></i>
                            </button>
                            {dragType === 'SOURCE' && overIdx === index && (
                              <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.6)]"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Tags Management */}
                  <section className="space-y-6">
                    <div className="flex items-center space-x-4 mb-2 px-2">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-emerald-100">
                        <i className="fas fa-tags"></i>
                      </div>
                      <div>
                        <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Lead DNA</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification Tags</p>
                      </div>
                    </div>

                    <form onSubmit={handleAddTag} className="flex space-x-3">
                      <input 
                        type="text" 
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="e.g. VA Approved"
                        className={`flex-1 border rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}
                      />
                      <button type="submit" className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl active:scale-95">Append</button>
                    </form>

                    <div className={`border rounded-[2.5rem] shadow-sm overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className={`divide-y max-h-[500px] overflow-y-auto scrollbar-hide ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                        {availableTags.map((tag, index) => (
                          <div 
                            key={tag} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, index, 'TAG')}
                            onDragOver={(e) => handleDragOver(e, index, 'TAG')}
                            onDrop={(e) => handleDrop(e, index, 'TAG')}
                            onDragEnd={clearDrag}
                            className={`flex items-center justify-between p-6 group transition-all cursor-move relative ${
                              dragType === 'TAG' && draggedIdx === index ? 'opacity-30' : isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                            } ${dragType === 'TAG' && overIdx === index ? 'bg-emerald-50/50' : ''}`}
                          >
                            <div className="flex items-center space-x-4">
                              <i className="fas fa-grip-vertical text-slate-300 opacity-30 group-hover:opacity-100 transition-opacity"></i>
                              <div className="flex items-center space-x-3">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{tag}</span>
                              </div>
                            </div>
                            <button onClick={() => setConfirmDelete({ type: 'TAG', name: tag })} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                              <i className="fas fa-trash-alt text-xs"></i>
                            </button>
                            {dragType === 'TAG' && overIdx === index && (
                              <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
               </div>
            </div>
          )}

          {activeTab === 'BRANDING' && (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
               <div className={`border rounded-[3.5rem] p-12 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center space-x-6 mb-12">
                     <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                        <i className="fas fa-palette text-2xl"></i>
                     </div>
                     <div>
                        <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Brokerage Identity</h3>
                        <p className="text-sm text-slate-400 font-medium">Control the visual signature of your organization.</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
                     <div className="md:col-span-4 flex flex-col items-center space-y-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Logo (High Res)</p>
                        <div className="relative group">
                           <div className={`w-48 h-48 rounded-[2.5rem] p-4 border-2 border-dashed transition-all flex items-center justify-center overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                              <img src={brokerageLogo} className={`w-full h-full object-contain transition-all ${isProcessingLogo ? 'opacity-30 blur-sm' : 'group-hover:scale-110'}`} alt="Brokerage Logo" />
                              <button 
                                onClick={() => logoInputRef.current?.click()}
                                className="absolute inset-4 bg-slate-900/60 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white"
                              >
                                 <i className="fas fa-camera text-2xl mb-2"></i>
                                 <span className="text-[9px] font-black uppercase">Change</span>
                              </button>
                           </div>
                           {isProcessingLogo && <div className="absolute inset-0 flex items-center justify-center"><i className="fas fa-circle-notch fa-spin text-indigo-500 text-3xl"></i></div>}
                        </div>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        <p className="text-[9px] text-slate-400 text-center leading-relaxed">Accepted formats: PNG, SVG, JPG.<br/>Transparent background recommended.</p>
                     </div>

                     <div className="md:col-span-8 space-y-10">
                        <div className="grid grid-cols-1 gap-8">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Entity Name</label>
                              <input type="text" defaultValue={brokerage.name} className={`w-full border rounded-2xl px-6 py-4 font-black text-lg outline-none focus:border-indigo-500 transition-all shadow-inner ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100'}`} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Brand Accent</label>
                              <div className="flex items-center space-x-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                 <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-16 h-16 rounded-xl border-none cursor-pointer bg-transparent" />
                                 <div>
                                    <p className="text-sm font-black text-slate-700 uppercase tracking-tighter">{brandColor}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">UI Accent Tone</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'API' && <IntegrationsSettings brokerage={brokerage} isDarkMode={isDarkMode} />}

          {activeTab === 'BILLING' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
               <div className={`border rounded-[3.5rem] p-12 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-12">
                     <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                           <i className="fas fa-crown text-2xl"></i>
                        </div>
                        <div>
                           <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Subscription Hub</h3>
                           <p className="text-sm text-slate-400 font-medium">Enterprise licensing and billing controls.</p>
                        </div>
                     </div>
                     <span className="px-6 py-2 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200">Active Account</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                     <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-center group hover:border-indigo-400 transition-all">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Tier</p>
                        <p className="text-4xl font-black text-slate-900 tracking-tight">{brokerage.subscriptionPlan}</p>
                        <div className="mt-6 pt-6 border-t border-slate-200">
                           <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Compare Plans</button>
                        </div>
                     </div>
                     <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-center group hover:border-indigo-400 transition-all">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Billing Cycle</p>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">ANNUAL</p>
                        <div className="mt-6 pt-6 border-t border-slate-200">
                           <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View Invoice</button>
                        </div>
                     </div>
                     <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-center group hover:border-indigo-400 transition-all">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Seat Count</p>
                        <p className="text-4xl font-black text-slate-900 tracking-tight">25 <span className="text-slate-300">/ 50</span></p>
                        <div className="mt-6 pt-6 border-t border-slate-200">
                           <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">+ Add 5 Seats</button>
                        </div>
                     </div>
                  </div>

                  <div className="p-10 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                     <div className="relative z-10 space-y-2">
                        <h4 className="text-xl font-black tracking-tight">Need Enterprise Customization?</h4>
                        <p className="text-slate-400 text-sm font-medium max-w-md leading-relaxed">Scale your brokerage with custom API limits, white-labeled domains, and dedicated success managers.</p>
                     </div>
                     <button className="relative z-10 px-10 py-5 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-100 transition-all shrink-0">Connect with Concierge</button>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-10">
           {/* Navigation Sort (RESTORED) */}
           <div className={`border rounded-[3.5rem] p-10 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-8 px-2">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Application View Hierarchy</h4>
                 <i className="fas fa-sort text-slate-300"></i>
              </div>
              <div className="space-y-1.5 overflow-y-auto max-h-[450px] scrollbar-hide pr-2">
                 {navItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, index, 'NAV')}
                      onDragOver={(e) => handleDragOver(e, index, 'NAV')}
                      onDrop={(e) => handleDrop(e, index, 'NAV')}
                      onDragEnd={clearDrag}
                      className={`flex items-center justify-between p-4 bg-slate-50 border-2 rounded-2xl cursor-move group transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-transparent hover:border-indigo-400 hover:bg-white'} ${dragType === 'NAV' && overIdx === index ? 'border-indigo-500 scale-[1.02] shadow-lg' : ''} ${dragType === 'NAV' && draggedIdx === index ? 'opacity-20' : ''}`}
                    >
                       <div className="flex items-center space-x-4">
                          <i className={`fas ${item.icon} text-[10px] text-indigo-400`}></i>
                          <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.label}</span>
                       </div>
                       <i className="fas fa-grip-vertical text-slate-300 opacity-30 group-hover:opacity-100 transition-all"></i>
                    </div>
                 ))}
              </div>
           </div>

           {/* System Settings (RESTORED) */}
           <div className={`border rounded-[3.5rem] p-10 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Localization & Defaults</h4>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">System Timezone</label>
                    <div className={`px-5 py-3 rounded-xl border text-sm font-black text-slate-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-50'}`}>America/Los_Angeles</div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Reporting Currency</label>
                    <div className={`px-5 py-3 rounded-xl border text-sm font-black text-slate-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-50'}`}>USD ($) - United States</div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Communication Language</label>
                    <div className={`px-5 py-3 rounded-xl border text-sm font-black text-slate-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-50'}`}>English (Universal)</div>
                 </div>
              </div>
           </div>

           {/* Trash Utilities */}
           <div className="bg-rose-50 border border-rose-100 rounded-[3rem] p-10 space-y-6">
              <div className="flex items-center space-x-4 text-rose-600">
                 <i className="fas fa-shield-halved text-lg"></i>
                 <h4 className="text-[10px] font-black uppercase tracking-widest">Data Retention</h4>
              </div>
              <p className="text-[10px] font-semibold text-rose-500 leading-relaxed">Deleted records are held in the Trash Bin for 30 days before permanent erasure.</p>
              <button 
                onClick={() => handleResetSettings()}
                className="w-full py-4 bg-white text-rose-600 border border-rose-200 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
              >
                 Reset All Layouts
              </button>
           </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (Existing Logic Preserved) */}
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

  function handleResetSettings() {
    if (confirm("Reset all UI layouts and navigation order to system defaults?")) {
      const DEFAULT_ORDER = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
        { id: 'email', label: 'Email Center', icon: 'fa-envelope' },
        { id: 'leads', label: 'Lead Pipeline', icon: 'fa-users' },
        { id: 'contacts', label: 'Contacts', icon: 'fa-address-book' },
        { id: 'marketing', label: 'Marketing Hub', icon: 'fa-wand-magic-sparkles' },
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
      alert("Layouts restored.");
    }
  }
};

export default SettingsView;