
import React, { useState, useEffect } from 'react';
import { Lead, User, LeadTemperature, LeadStatus } from '../types';
import { getLeadInsight } from '../services/geminiService';

interface LeadDetailProps {
  lead: Lead;
  user: User;
  onBack: () => void;
  onAddNote: (leadId: string, content: string) => void;
  onUpdateLead: (lead: Lead) => void;
  availableSources: string[];
  availableTags: string[];
}

const TZ = 'America/Los_Angeles';

const LeadDetail: React.FC<LeadDetailProps> = ({ 
  lead, 
  user, 
  onBack, 
  onAddNote, 
  onUpdateLead,
  availableSources,
  availableTags
}) => {
  const [aiAdvice, setAiAdvice] = useState<string>('Generating tactical advice...');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const fetchAdvice = async () => {
      const latestNoteContent = lead.notes.length > 0 ? lead.notes[0].content : '';
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
    onUpdateLead({ ...lead, [field]: value, updatedAt: new Date().toISOString() });
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
      case LeadTemperature.HOT: return 'text-red-500';
      case LeadTemperature.WARM: return 'text-orange-500';
      case LeadTemperature.COLD: return 'text-blue-500';
      default: return 'text-slate-400';
    }
  };

  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return `(${phoneNumber}`;
    if (phoneNumberLength < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center space-x-3 text-slate-500 hover:text-indigo-600 font-black uppercase tracking-widest text-[11px] transition-all">
          <i className="fas fa-arrow-left"></i>
          <span>Pipeline</span>
        </button>
        <div className="flex items-center space-x-4">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             <i className="fas fa-edit mr-2 text-indigo-500"></i>
             Onscreen Editing Enabled
           </span>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mb-12">
        {/* Dark Header with Inline Editing */}
        <div className="bg-[#0f172a] p-10 text-white flex flex-col md:flex-row items-center md:items-start space-y-8 md:space-y-0 md:space-x-10">
          <div className="w-28 h-28 bg-indigo-500 rounded-[1.5rem] flex items-center justify-center text-4xl font-black shadow-2xl shrink-0">
            {lead.firstName[0]}{lead.lastName[0]}
          </div>
          <div className="flex-1 text-center md:text-left pt-2 space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <input 
                type="text" 
                value={lead.firstName} 
                onChange={(e) => updateField('firstName', e.target.value)}
                className="bg-white/5 border border-transparent hover:border-white/20 focus:bg-white/10 focus:border-indigo-400 outline-none text-4xl font-black tracking-tighter rounded-xl px-2 -ml-2 transition-all w-full md:w-auto"
              />
              <input 
                type="text" 
                value={lead.lastName} 
                onChange={(e) => updateField('lastName', e.target.value)}
                className="bg-white/5 border border-transparent hover:border-white/20 focus:bg-white/10 focus:border-indigo-400 outline-none text-4xl font-black tracking-tighter rounded-xl px-2 -ml-2 transition-all w-full md:w-auto"
              />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start space-y-3 md:space-y-0 md:space-x-8 text-slate-400">
              <div className="flex items-center group">
                <i className="fas fa-envelope mr-3 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity"></i>
                <input 
                  type="email" 
                  value={lead.email} 
                  onChange={(e) => updateField('email', e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-400 outline-none text-base font-semibold transition-all"
                />
              </div>
              <div className="hidden md:block w-1.5 h-1.5 bg-slate-700 rounded-full"></div>
              <div className="flex items-center group">
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
        </div>

        <div className="p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left: Lead Information with Dropdowns */}
            <div className="space-y-10">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Lead Information</h4>
                <div className="space-y-1">
                  <DropdownRow 
                    icon="fa-bullseye" 
                    label="Source" 
                    value={lead.source} 
                    options={availableSources}
                    onChange={(val) => updateField('source', val)}
                  />
                  <DropdownRow 
                    icon="fa-home" 
                    label="Type" 
                    value={lead.propertyType} 
                    options={['PRIMARY', 'SECONDARY', 'INVESTMENT']}
                    onChange={(val) => updateField('propertyType', val)}
                  />
                  <DropdownRow 
                    icon="fa-thermometer-half" 
                    label="Temp" 
                    value={lead.temperature} 
                    options={Object.values(LeadTemperature)}
                    valueColor={getTemperatureColor(lead.temperature)}
                    onChange={(val) => updateField('temperature', val)}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Property Address</h4>
                <input 
                  type="text" 
                  value={lead.propertyAddress || ''} 
                  onChange={(e) => updateField('propertyAddress', e.target.value)}
                  placeholder="No address provided"
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                />
              </div>

              {/* Classification Tags Section */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Classification Tags</h4>
                <div className="flex flex-wrap gap-2 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  {availableTags.map(tag => (
                    <button 
                      key={tag}
                      onClick={() => toggleLeadTag(tag)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        lead.tags?.includes(tag) 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Milestones */}
              <div className="pt-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">System Dates & Milestones (LA Time)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-slate-50 p-6 rounded-[1.25rem] border border-slate-100 hover:border-indigo-200 transition-all group">
                     <div className="flex justify-between items-center mb-3">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Birthday</p>
                       <i className="fas fa-cake-candles text-indigo-400 text-xs opacity-40 group-hover:opacity-100 transition-opacity"></i>
                     </div>
                     <input 
                       type="date" 
                       value={lead.dob ? new Date(lead.dob).toLocaleDateString('en-CA', { timeZone: TZ }) : ''} 
                       onChange={(e) => updateField('dob', e.target.value)}
                       className="bg-transparent w-full text-base font-black text-slate-700 focus:text-indigo-600 outline-none cursor-pointer"
                     />
                   </div>
                   <div className="bg-slate-50 p-6 rounded-[1.25rem] border border-slate-100 hover:border-indigo-200 transition-all group">
                     <div className="flex justify-between items-center mb-3">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wedding Anniv.</p>
                       <i className="fas fa-ring text-indigo-400 text-xs opacity-40 group-hover:opacity-100 transition-opacity"></i>
                     </div>
                     <input 
                       type="date" 
                       value={lead.weddingAnniversary ? new Date(lead.weddingAnniversary).toLocaleDateString('en-CA', { timeZone: TZ }) : ''} 
                       onChange={(e) => updateField('weddingAnniversary', e.target.value)}
                       className="bg-transparent w-full text-base font-black text-slate-700 focus:text-indigo-600 outline-none cursor-pointer"
                     />
                   </div>
                   <div className="bg-slate-50 p-6 rounded-[1.25rem] border border-slate-100 hover:border-indigo-200 transition-all group">
                     <div className="flex justify-between items-center mb-3">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Home Anniv.</p>
                       <i className="fas fa-house-chimney-user text-indigo-400 text-xs opacity-40 group-hover:opacity-100 transition-opacity"></i>
                     </div>
                     <input 
                       type="date" 
                       value={lead.homeAnniversary ? new Date(lead.homeAnniversary).toLocaleDateString('en-CA', { timeZone: TZ }) : ''} 
                       onChange={(e) => updateField('homeAnniversary', e.target.value)}
                       className="bg-transparent w-full text-base font-black text-slate-700 focus:text-indigo-600 outline-none cursor-pointer"
                     />
                   </div>
                   <div className="bg-slate-50 p-6 rounded-[1.25rem] border border-slate-100 opacity-60">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Acquisition</p>
                     <p className="text-base font-black text-slate-500">{new Date(lead.createdAt).toLocaleDateString('en-US', { timeZone: TZ })}</p>
                   </div>
                 </div>
              </div>
            </div>

            {/* Right: Pipeline & Secondary Section */}
            <div className="space-y-10">
               <div>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Sales Pipeline</h4>
                 <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100 flex flex-col space-y-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pipeline Stage</p>
                   <div className="relative">
                      <select 
                        value={lead.status} 
                        onChange={(e) => updateField('status', e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-[1.5rem] px-6 py-5 text-xl font-black text-slate-900 shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none appearance-none cursor-pointer uppercase tracking-tighter"
                      >
                        {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-base">
                        <i className="fas fa-chevron-down"></i>
                      </div>
                   </div>
                 </div>
               </div>

               {/* Secondary Contact Info */}
               <div>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Secondary Contact</h4>
                 <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">First Name</label>
                        <input type="text" value={lead.spouseFirstName || ''} onChange={e => updateField('spouseFirstName', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 text-base font-semibold focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="Name" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Last Name</label>
                        <input type="text" value={lead.spouseLastName || ''} onChange={e => updateField('spouseLastName', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 text-base font-semibold focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="Name" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email</label>
                        <input type="email" value={lead.spouseEmail || ''} onChange={e => updateField('spouseEmail', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 text-base font-semibold focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="email@example.com" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Phone</label>
                        <input type="tel" value={lead.spousePhone || ''} onChange={e => updateField('spousePhone', formatPhone(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 text-base font-semibold focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="(555) 000-0000" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Relationship</label>
                        <select value={lead.secondaryContactRelationship || 'Spouse'} onChange={e => updateField('secondaryContactRelationship', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 text-base font-bold focus:border-indigo-500 outline-none transition-all shadow-sm">
                           {['Spouse', 'Sister', 'Brother', 'Friend', 'Partner', 'Other'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Birthday</label>
                        <input type="date" value={lead.spouseDob || ''} onChange={e => updateField('spouseDob', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 text-base font-semibold focus:border-indigo-500 outline-none transition-all shadow-sm" />
                      </div>
                    </div>
                 </div>
               </div>

               {/* AI Co-pilot Advice integrated onscreen */}
               <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-100">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                      <i className="fas fa-bolt text-sm"></i>
                    </div>
                    <h5 className="font-black text-xs uppercase tracking-widest">Strategic Co-pilot</h5>
                  </div>
                  <p className="text-base leading-relaxed font-semibold opacity-90">{aiAdvice}</p>
               </div>
            </div>
          </div>

          <div className="mt-16 pt-10 border-t border-slate-100">
             <div className="flex items-center justify-between mb-10">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Communication History</h4>
                <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black shadow-sm uppercase tracking-widest">{lead.notes.length} Entries</span>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1">
                  <div className="sticky top-10 bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">New activity Log</p>
                    <textarea 
                      value={newNote} 
                      onChange={(e) => setNewNote(e.target.value)} 
                      placeholder="Enter details..." 
                      className="w-full bg-white border border-slate-200 rounded-[1.25rem] p-4 text-base font-semibold mb-4 resize-none min-h-[140px] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                    />
                    <button 
                      onClick={handleAddNote} 
                      disabled={!newNote.trim()}
                      className="w-full bg-[#0f172a] text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all disabled:opacity-30"
                    >
                      Post Interaction
                    </button>
                  </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                  {lead.notes.length > 0 ? lead.notes.map((note) => (
                    <div key={note.id} className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-sm flex items-start space-x-5 hover:border-indigo-200 transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                        {note.authorName[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-base font-black text-slate-800">{note.authorName}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(note.createdAt).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-base text-slate-600 leading-relaxed font-semibold">"{note.content}"</p>
                      </div>
                    </div>
                  )) : (
                    <div className="py-24 text-center text-slate-300">
                      <i className="fas fa-note-sticky text-5xl mb-6 opacity-20"></i>
                      <p className="text-base font-black uppercase tracking-widest">No activity recorded yet.</p>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DropdownRowProps {
  icon: string;
  label: string;
  value: string;
  options: string[];
  valueColor?: string;
  onChange: (val: string) => void;
}

const DropdownRow: React.FC<DropdownRowProps> = ({ icon, label, value, options, valueColor, onChange }) => (
  <div className="flex items-center justify-between py-5 border-b border-slate-100 last:border-0 group">
    <div className="flex items-center space-x-4 text-slate-400">
      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-sm opacity-60 transition-all group-hover:opacity-100 group-hover:bg-indigo-50 group-hover:text-indigo-600">
        <i className={`fas ${icon}`}></i>
      </div>
      <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
    <div className="relative">
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className={`bg-transparent text-base font-black uppercase tracking-tighter text-right pr-10 outline-none appearance-none cursor-pointer hover:text-indigo-600 transition-colors ${valueColor || 'text-slate-900'}`}
      >
        {options.map(opt => <option key={opt} value={opt} className="text-slate-900 font-sans normal-case text-base font-bold">{opt}</option>)}
      </select>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
        <i className="fas fa-caret-down"></i>
      </div>
    </div>
  </div>
);

export default LeadDetail;
