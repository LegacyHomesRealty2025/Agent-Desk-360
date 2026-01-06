import React, { useState, useEffect } from 'react';
import { Lead, User, LeadTemperature, LeadStatus, LeadNote } from '../types.ts';
import { getLeadInsight } from '../services/geminiService.ts';

interface LeadDetailProps {
  lead: Lead;
  user: User;
  onBack: () => void;
  onAddNote: (leadId: string, content: string) => void;
  onUpdateLead: (lead: Lead) => void;
  availableSources: string[];
  availableTags: string[];
  isDarkMode?: boolean;
}

const TZ = 'America/Los_Angeles';

const LeadDetail: React.FC<LeadDetailProps> = ({ 
  lead, 
  user, 
  onBack, 
  onAddNote, 
  onUpdateLead,
  availableSources,
  availableTags,
  isDarkMode
}) => {
  const [aiAdvice, setAiAdvice] = useState<string>('Generating tactical advice...');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const fetchAdvice = async () => {
      const latestNoteContent = lead.notes.length > 0 ? lead.notes[0].content : '';
      // Casting to any to pass just the content string if the service expects it, or use the first note
      const advice = await getLeadInsight({ ...lead, notes: latestNoteContent } as any);
      setAiAdvice(advice || 'No strategic insight available for this contact.');
    };
    fetchAdvice();
  }, [lead.id, lead.notes.length]);

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(lead.id, newNote);
      setNewNote('');
    }
  };

  const updateField = (field: keyof Lead, value: any) => {
    const updatedLead = { ...lead, [field]: value, updatedAt: new Date().toISOString() };
    
    // Auto-calculate deal value if budget changes
    if (field === 'budget') {
      updatedLead.estimatedDealValue = (value || 0) * 0.03;
    }
    
    onUpdateLead(updatedLead);
  };

  const toggleLeadTag = (tag: string) => {
    const currentTags = lead.tags || [];
    if (currentTags.includes(tag)) {
      updateField('tags', currentTags.filter(t => t !== tag));
    } else {
      updateField('tags', [...currentTags, tag]);
    }
  };

  const getTemperatureColor = (temp: LeadTemperature) => {
    switch (temp) {
      case LeadTemperature.HOT: return 'text-rose-500';
      case LeadTemperature.WARM: return 'text-orange-500';
      case LeadTemperature.COLD: return 'text-blue-500';
      default: return 'text-slate-400';
    }
  };

  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const length = phoneNumber.length;
    if (length < 4) return `(${phoneNumber}`;
    if (length < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const formatBudget = (value: number | undefined) => {
    if (value === undefined || value === 0) return '';
    return value.toLocaleString();
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(rawValue)) {
      updateField('budget', rawValue ? parseInt(rawValue) : 0);
    }
  };

  return (
    <div className={`max-w-6xl mx-auto animate-in fade-in duration-500 pb-20 ${isDarkMode ? 'dark' : ''}`}>
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center space-x-3 text-slate-500 hover:text-indigo-600 font-black uppercase tracking-widest text-[11px] transition-all">
          <i className="fas fa-arrow-left"></i>
          <span>All Contacts</span>
        </button>
      </div>

      <div className={`rounded-[2rem] border shadow-sm overflow-hidden mb-12 transition-all hover:shadow-xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        {/* Dark Header with Inline Editing */}
        <div className="bg-[#0f172a] p-10 text-white flex flex-col md:flex-row items-center md:items-start space-y-8 md:space-y-0 md:space-x-10 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
          
          <div className="w-28 h-28 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl font-black shadow-2xl shrink-0 border-4 border-white/10 group">
            <span className="group-hover:scale-110 transition-transform">{lead.firstName[0]}{lead.lastName[0]}</span>
          </div>
          
          <div className="flex-1 text-center md:text-left pt-2 space-y-5 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <input 
                type="text" 
                value={lead.firstName} 
                onChange={(e) => updateField('firstName', e.target.value)}
                className="bg-white/5 border border-transparent hover:border-white/20 focus:bg-white/10 focus:border-indigo-400 outline-none text-4xl font-black tracking-tighter rounded-xl px-3 -ml-3 transition-all w-full md:w-auto"
                placeholder="First Name"
              />
              <input 
                type="text" 
                value={lead.lastName} 
                onChange={(e) => updateField('lastName', e.target.value)}
                className="bg-white/5 border border-transparent hover:border-white/20 focus:bg-white/10 focus:border-indigo-400 outline-none text-4xl font-black tracking-tighter rounded-xl px-3 -ml-3 transition-all w-full md:w-auto"
                placeholder="Last Name"
              />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start space-y-3 md:space-y-0 md:space-x-8 text-slate-400">
              <div className="flex items-center group cursor-text">
                <i className="fas fa-envelope mr-3 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity"></i>
                <input 
                  type="email" 
                  value={lead.email} 
                  onChange={(e) => updateField('email', e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-400 outline-none text-base font-semibold transition-all min-w-[200px]"
                />
              </div>
              <div className="hidden md:block w-1.5 h-1.5 bg-slate-700 rounded-full"></div>
              <div className="flex items-center group cursor-text">
                <i className="fas fa-phone mr-3 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity"></i>
                <input 
                  type="tel" 
                  value={lead.phone} 
                  onChange={(e) => updateField('phone', formatPhone(e.target.value))}
                  className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-400 outline-none text-base font-black transition-all"
                />
              </div>
            </div>
          </div>

          <div className="md:text-right space-y-2 pt-2 shrink-0">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Est. Deal Value</p>
             <p className="text-3xl font-black text-emerald-400 tracking-tighter">${(lead.estimatedDealValue || 0).toLocaleString()}</p>
             <div className="bg-white/5 rounded-lg px-3 py-1.5 inline-block border border-white/5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">3.0% Commission</span>
             </div>
          </div>
        </div>

        <div className="p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left: Lead Metadata & Milestones */}
            <div className="space-y-12">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center">
                  <i className="fas fa-id-card-clip mr-2 text-indigo-500"></i>
                  Metadata Profile
                </h4>
                <div className={`space-y-1 rounded-[2rem] p-6 border shadow-inner ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  {/* Fixed: DropdownRow defined at bottom of file */}
                  <DropdownRow 
                    icon="fa-bullseye" 
                    label="Source" 
                    value={lead.source} 
                    options={availableSources}
                    onChange={(val: string) => updateField('source', val)}
                    isDarkMode={isDarkMode}
                  />
                  {/* Fixed: DropdownRow defined at bottom of file */}
                  <DropdownRow 
                    icon="fa-home" 
                    label="Type" 
                    value={lead.propertyType} 
                    options={['PRIMARY', 'SECONDARY', 'INVESTMENT']}
                    onChange={(val: string) => updateField('propertyType', val)}
                    isDarkMode={isDarkMode}
                  />
                  {/* Fixed: DropdownRow defined at bottom of file */}
                  <DropdownRow 
                    icon="fa-thermometer-half" 
                    label="Temperature" 
                    value={lead.temperature} 
                    options={Object.values(LeadTemperature)}
                    valueColor={getTemperatureColor(lead.temperature)}
                    onChange={(val: string) => updateField('temperature', val)}
                    isDarkMode={isDarkMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-[2rem] border space-y-4 shadow-inner ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Property Address</h4>
                  <input 
                    type="text" 
                    value={lead.propertyAddress || ''} 
                    onChange={(e) => updateField('propertyAddress', e.target.value)}
                    placeholder="Enter street, city, state..."
                    className={`w-full border rounded-2xl px-6 py-4 text-sm font-semibold outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:ring-4 focus:ring-indigo-500/10' : 'bg-white border-slate-200 focus:ring-4 focus:ring-indigo-500/10'}`}
                  />
                </div>
                <div className={`p-6 rounded-[2rem] border space-y-4 shadow-inner ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Purchase Budget</h4>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                    <input 
                      type="text" 
                      value={formatBudget(lead.budget)} 
                      onChange={handleBudgetChange}
                      className={`w-full border rounded-2xl px-10 py-4 text-base font-black outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:ring-4 focus:ring-indigo-500/10' : 'bg-white border-slate-200 text-slate-800 focus:ring-4 focus:ring-indigo-500/10'}`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Classification Tags</h4>
                <div className={`flex flex-wrap gap-2 p-8 rounded-[2.5rem] border shadow-inner ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  {availableTags.map(tag => {
                    const isSelected = lead.tags?.includes(tag);
                    return (
                      <button 
                        key={tag}
                        onClick={() => toggleLeadTag(tag)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                          isSelected 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                            : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-400' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">System Dates & Milestones</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className={`p-6 rounded-2xl border transition-all group shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
                     <div className="flex justify-between items-center mb-3">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Birthday</p>
                       <i className="fas fa-cake-candles text-indigo-400 text-xs opacity-40 group-hover:opacity-100 transition-opacity"></i>
                     </div>
                     <input 
                       type="date" 
                       value={lead.dob ? new Date(lead.dob).toLocaleDateString('en-CA', { timeZone: TZ }) : ''} 
                       onChange={(e) => updateField('dob', e.target.value)}
                       className={`bg-transparent w-full text-base font-black outline-none cursor-pointer ${isDarkMode ? 'text-slate-200 focus:text-indigo-400' : 'text-slate-700 focus:text-indigo-600'}`}
                     />
                   </div>
                   <div className={`p-6 rounded-2xl border transition-all group shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
                     <div className="flex justify-between items-center mb-3">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wedding Anniv.</p>
                       <i className="fas fa-ring text-indigo-400 text-xs opacity-40 group-hover:opacity-100 transition-opacity"></i>
                     </div>
                     <input 
                       type="date" 
                       value={lead.weddingAnniversary ? new Date(lead.weddingAnniversary).toLocaleDateString('en-CA', { timeZone: TZ }) : ''} 
                       onChange={(e) => updateField('weddingAnniversary', e.target.value)}
                       className={`bg-transparent w-full text-base font-black outline-none cursor-pointer ${isDarkMode ? 'text-slate-200 focus:text-indigo-400' : 'text-slate-700 focus:text-indigo-600'}`}
                     />
                   </div>
                 </div>
              </div>
            </div>

            {/* Right: Pipeline & Secondary Section */}
            <div className="space-y-12">
               <div>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center">
                    <i className="fas fa-chart-line-up mr-2 text-indigo-500"></i>
                    Transaction Status
                 </h4>
                 <div className={`rounded-[2rem] p-10 border shadow-inner space-y-6 ${isDarkMode ? 'bg-indigo-900/10 border-indigo-900/30' : 'bg-indigo-50 border-indigo-100'}`}>
                   <div className="space-y-1.5">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Current Pipeline Stage</p>
                     <div className="relative">
                        <select 
                          value={lead.status} 
                          onChange={(e) => updateField('status', e.target.value)} 
                          className={`w-full border rounded-2xl px-8 py-6 text-2xl font-black shadow-sm focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none cursor-pointer uppercase tracking-tighter ${isDarkMode ? 'bg-slate-900 border-indigo-900/50 text-slate-100' : 'bg-white border-indigo-200 text-slate-900'}`}
                        >
                          {Object.values(LeadStatus).map(s => <option key={s} value={s} className={isDarkMode ? 'bg-slate-900' : ''}>{s.replace('_', ' ')}</option>)}
                        </select>
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-lg">
                          <i className="fas fa-chevron-down"></i>
                        </div>
                     </div>
                   </div>
                   <div className="pt-4 flex items-center space-x-3 text-indigo-400">
                      <i className="fas fa-info-circle text-sm"></i>
                      <p className="text-[11px] font-bold">Changing this status will trigger automated drip campaign updates.</p>
                   </div>
                 </div>
               </div>

               {/* Secondary Contact Info */}
               <div>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Secondary Contact Details</h4>
                 <div className={`rounded-[2.5rem] p-10 border space-y-8 shadow-inner ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">First Name</label>
                        <input type="text" value={lead.spouseFirstName || ''} onChange={e => updateField('spouseFirstName', e.target.value)} className={`w-full border rounded-2xl px-6 py-4 text-sm font-semibold focus:border-indigo-500 outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`} placeholder="e.g. Jane" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Last Name</label>
                        <input type="text" value={lead.spouseLastName || ''} onChange={e => updateField('spouseLastName', e.target.value)} className={`w-full border rounded-2xl px-6 py-4 text-sm font-semibold focus:border-indigo-500 outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`} placeholder="e.g. Doe" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email</label>
                        <input type="email" value={lead.spouseEmail || ''} onChange={e => updateField('spouseEmail', e.target.value)} className={`w-full border rounded-2xl px-6 py-4 text-sm font-semibold focus:border-indigo-500 outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`} placeholder="email@example.com" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Phone</label>
                        <input type="tel" value={lead.spousePhone || ''} onChange={e => updateField('spousePhone', formatPhone(e.target.value))} className={`w-full border rounded-2xl px-6 py-4 text-sm font-semibold focus:border-indigo-500 outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`} placeholder="(555) 000-0000" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Relationship</label>
                        <select value={lead.secondaryContactRelationship || 'Spouse'} onChange={e => updateField('secondaryContactRelationship', e.target.value)} className={`w-full border rounded-2xl px-6 py-4 text-sm font-bold focus:border-indigo-500 outline-none transition-all shadow-sm cursor-pointer appearance-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
                           {['Spouse', 'Sister', 'Brother', 'Friend', 'Partner', 'Other'].map(opt => <option key={opt} value={opt} className={isDarkMode ? 'bg-slate-900' : ''}>{opt}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Birthday</label>
                        <input type="date" value={lead.spouseDob || ''} onChange={e => updateField('spouseDob', e.target.value)} className={`w-full border rounded-2xl px-6 py-4 text-sm font-semibold focus:border-indigo-500 outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                      </div>
                    </div>
                 </div>
               </div>
            </div>
          </div>

          <div className="mt-20 pt-16 border-t border-slate-100 dark:border-slate-800">
             <div className="flex items-center justify-between mb-12">
                <div>
                  <h4 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Interaction Journal</h4>
                  <p className="text-sm text-slate-400 font-medium">Full chronological history of all client communication.</p>
                </div>
                <div className="flex items-center space-x-3">
                   <div className="px-5 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black border border-indigo-100 uppercase tracking-widest shadow-sm">
                      {lead.notes.length} Records
                   </div>
                </div>
             </div>

             <div className="space-y-8 mb-12">
                <div className={`p-8 rounded-[2.5rem] border shadow-inner ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                   <div className="flex items-center space-x-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs shadow-lg">
                        <i className="fas fa-pen-nib"></i>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Journal Entry</span>
                   </div>
                   <div className="flex flex-col space-y-4">
                      <textarea 
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Log a call, email, or meeting details..."
                        className={`w-full border rounded-2xl p-6 text-sm font-semibold outline-none transition-all min-h-[120px] resize-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:ring-4 focus:ring-indigo-500/10' : 'bg-white border-slate-200 focus:ring-4 focus:ring-indigo-500/10'}`}
                      />
                      <div className="flex justify-end">
                         <button 
                           onClick={handleAddNote}
                           disabled={!newNote.trim()}
                           className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:shadow-none active:scale-95"
                         >
                           Add Entry
                         </button>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   {lead.notes.map((note) => (
                      <div key={note.id} className={`p-8 rounded-[2.5rem] border transition-all hover:shadow-lg ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                         <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                               <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs">
                                  {note.authorName?.[0]}
                               </div>
                               <div>
                                  <p className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{note.authorName}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(note.createdAt).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                               </div>
                            </div>
                         </div>
                         <p className={`text-base leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{note.content}</p>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* AI Strategic Advisory Card */}
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center space-x-4">
               <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-lg animate-pulse">
                  <i className="fas fa-wand-magic-sparkles"></i>
               </div>
               <h3 className="text-2xl font-black tracking-tight">AI Strategic Advisory</h3>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl">
               <p className="text-lg font-bold text-indigo-200 leading-relaxed italic">
                 "{aiAdvice}"
               </p>
            </div>
          </div>
          <div className="lg:col-span-4 text-center lg:text-right space-y-4">
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Powered by Gemini 3.0 Flash</p>
             <button onClick={() => setAiAdvice('Refreshing tactical insights...')} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all shadow-2xl active:scale-95">Refresh Insight</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Fixed: DropdownRow helper component for Lead metadata
const DropdownRow = ({ icon, label, value, options, valueColor, onChange, isDarkMode }: any) => (
  <div className={`flex items-center justify-between p-4 border-b last:border-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
    <div className="flex items-center space-x-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-400'} shadow-sm`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className={`bg-transparent font-black text-[12px] outline-none cursor-pointer appearance-none text-right px-2 ${valueColor || (isDarkMode ? 'text-slate-200' : 'text-slate-700')}`}
    >
      {options.map((opt: string) => (
        <option key={opt} value={opt} className={isDarkMode ? 'bg-slate-900' : ''}>{opt.replace('_', ' ')}</option>
      ))}
    </select>
  </div>
);

export default LeadDetail;