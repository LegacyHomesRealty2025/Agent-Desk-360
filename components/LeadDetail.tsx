import React, { useState, useEffect, useRef } from 'react';
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
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);

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

  const handleDeleteNote = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to permanently delete this note?')) {
      // Create a fresh array reference without the target note
      const updatedNotes = lead.notes.filter(n => String(n.id) !== String(noteId));
      
      const updatedLead: Lead = {
        ...lead,
        notes: [...updatedNotes], // Spread to ensure new reference
        updatedAt: new Date().toISOString()
      };
      
      onUpdateLead(updatedLead);
    }
  };

  const startEditingNote = (note: LeadNote) => {
    setEditingNoteId(note.id);
    setEditNoteContent(note.content);
  };

  const handleSaveNoteEdit = () => {
    if (!editingNoteId) return;
    const updatedNotes = lead.notes.map(n => 
      String(n.id) === String(editingNoteId) ? { ...n, content: editNoteContent, updatedAt: new Date().toISOString() } : n
    );
    onUpdateLead({ ...lead, notes: [...updatedNotes], updatedAt: new Date().toISOString() });
    setEditingNoteId(null);
    setEditNoteContent('');
  };

  const handlePermanentDeleteLead = () => {
    onUpdateLead({ 
      ...lead, 
      isDeleted: true, 
      deletedAt: new Date().toISOString() 
    });
    setShowDeleteConfirm(false);
    onBack();
  };

  const updateField = (field: keyof Lead, value: any) => {
    const updatedLead = { ...lead, [field]: value, updatedAt: new Date().toISOString() };
    if (field === 'budget') {
      updatedLead.estimatedDealValue = (value || 0) * 0.03;
    }
    onUpdateLead(updatedLead);
  };

  const handleSave = () => {
    setIsSaving(true);
    // Explicit save feedback
    setTimeout(() => {
      setIsSaving(false);
      alert('Contact profile saved successfully.');
    }, 600);
  };

  const handleFullNameChange = (val: string) => {
    const parts = val.trim().split(/\s+/);
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ');
    onUpdateLead({ 
      ...lead, 
      firstName: first, 
      lastName: last, 
      updatedAt: new Date().toISOString() 
    });
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

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const inputClass = `w-full border rounded-2xl px-6 py-4 text-base font-bold outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:ring-4 focus:ring-indigo-500/10' : 'bg-white border-slate-200 text-slate-800 focus:ring-4 focus:ring-indigo-500/10'}`;
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block";

  return (
    <div className={`max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-32 ${isDarkMode ? 'dark' : ''}`} ref={topRef}>
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center space-x-4 text-slate-500 hover:text-indigo-600 font-black uppercase tracking-widest text-[11px] transition-all group">
          <i className="fas fa-arrow-left text-xl group-hover:-translate-x-1 transition-transform"></i>
          <span>All Contacts</span>
        </button>

        <div className="flex items-center space-x-4">
          <button 
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-3 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>}
            <span>Save Profile</span>
          </button>

          <button 
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center space-x-3 px-6 py-3.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
          >
            <i className="fas fa-trash-can"></i>
            <span>Delete Contact</span>
          </button>
        </div>
      </div>

      <div className={`rounded-[3rem] border shadow-sm overflow-hidden mb-12 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        {/* Hero Header */}
        <div className={`py-10 px-12 flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-12 relative overflow-hidden border-b ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl font-black text-white shadow-xl shrink-0 border-4 border-white/10 group overflow-hidden relative">
            <span className="group-hover:scale-110 transition-transform relative z-10">{lead.firstName[0]}{lead.lastName[0]}</span>
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
          </div>
          
          <div className="flex-1 text-center md:text-left pt-1 space-y-4 relative z-10 w-full">
            <div className="flex flex-col md:flex-row items-center">
              <input 
                type="text" 
                value={`${lead.firstName} ${lead.lastName}`.trim()} 
                onChange={(e) => handleFullNameChange(e.target.value)}
                className={`bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-indigo-400 outline-none text-4xl font-black tracking-tighter rounded-2xl px-4 -ml-4 transition-all w-full md:w-auto ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                placeholder="Contact Name"
              />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start space-y-3 md:space-y-0 md:space-x-10 text-slate-400">
              <div className="flex items-center group cursor-text">
                <i className="fas fa-envelope mr-3 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity text-base"></i>
                <input 
                  type="email" 
                  value={lead.email} 
                  onChange={(e) => updateField('email', e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 outline-none text-base font-semibold transition-all min-w-[200px]"
                />
              </div>
              <div className="flex items-center group cursor-text">
                <i className="fas fa-phone mr-3 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity text-base"></i>
                <input 
                  type="tel" 
                  value={lead.phone} 
                  onChange={(e) => updateField('phone', formatPhone(e.target.value))}
                  className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 outline-none text-base font-black transition-all"
                />
              </div>
            </div>
          </div>

          <div className="md:text-right space-y-1 pt-2 shrink-0">
             <div className={`rounded-xl px-4 py-2 border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-400 shadow-sm'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest">Client Since {new Date(lead.createdAt).getFullYear()}</span>
             </div>
          </div>
        </div>

        <div className="p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* LEFT COLUMN: PRIMARY, SECONDARY, FAMILY NOTES, STATUS, TAGS */}
            <div className="lg:col-span-7 space-y-12">
              
              {/* PRIMARY CONTACT DETAILS SECTION */}
              <section className="space-y-6">
                <div className="flex items-center space-x-4 px-2">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-base shadow-lg">
                    <i className="fas fa-user"></i>
                  </div>
                  <h4 className={`text-base font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Primary Contact Information</h4>
                </div>

                <div className={`p-10 rounded-[3rem] border space-y-10 ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <label className={labelClass}>Property Address</label>
                      <input 
                        type="text" 
                        value={lead.propertyAddress || ''} 
                        onChange={(e) => updateField('propertyAddress', e.target.value)}
                        placeholder="Street Address, City, Zip"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Purchase Budget</label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-lg">$</span>
                        <input 
                          type="text" 
                          value={formatBudget(lead.budget)} 
                          onChange={handleBudgetChange}
                          className={`${inputClass} pl-12 text-xl font-black`}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-1">
                      <label className={labelClass}>Lead Source</label>
                      <select 
                        value={lead.source} 
                        onChange={(e) => updateField('source', e.target.value)}
                        className={inputClass}
                      >
                        {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Intent Type</label>
                      <select 
                        value={lead.propertyType} 
                        onChange={(e) => updateField('propertyType', e.target.value)}
                        className={inputClass}
                      >
                        {['PRIMARY', 'SECONDARY', 'INVESTMENT'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Temperature</label>
                      <select 
                        value={lead.temperature} 
                        onChange={(e) => updateField('temperature', e.target.value)}
                        className={`${inputClass} font-black uppercase ${getTemperatureColor(lead.temperature)}`}
                      >
                        {Object.values(LeadTemperature).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-8 pt-4 border-t border-slate-200/50">
                    <div className="space-y-1">
                      <label className={labelClass}>Birthday</label>
                      <input type="date" value={lead.dob || ''} onChange={e => updateField('dob', e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Wedding Anniversary</label>
                      <input type="date" value={lead.weddingAnniversary || ''} onChange={e => updateField('weddingAnniversary', e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Home Anniversary</label>
                      <input type="date" value={lead.homeAnniversary || ''} onChange={e => updateField('homeAnniversary', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>
              </section>

              {/* SECONDARY CONTACT DETAILS SECTION */}
              <section className="space-y-6">
                <div className="flex items-center space-x-4 px-2">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-base shadow-md">
                    <i className="fas fa-user-plus"></i>
                  </div>
                  <h4 className={`text-base font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Secondary Contact Information</h4>
                </div>

                <div className={`rounded-[3rem] p-10 border space-y-8 ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    <div className="md:col-span-3 space-y-1">
                      <label className={labelClass}>Relationship</label>
                      <select value={lead.secondaryContactRelationship || 'Spouse'} onChange={e => updateField('secondaryContactRelationship', e.target.value)} className={inputClass}>
                        {RELATIONSHIP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-9 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className={labelClass}>First Name</label>
                        <input type="text" value={lead.spouseFirstName || ''} onChange={e => updateField('spouseFirstName', e.target.value)} className={inputClass} placeholder="Jane" />
                      </div>
                      <div className="space-y-1">
                        <label className={labelClass}>Last Name</label>
                        <input type="text" value={lead.spouseLastName || ''} onChange={e => updateField('spouseLastName', e.target.value)} className={inputClass} placeholder="Doe" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-1">
                      <label className={labelClass}>Secondary Email</label>
                      <input type="email" value={lead.spouseEmail || ''} onChange={e => updateField('spouseEmail', e.target.value)} className={inputClass} placeholder="email@address.com" />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Direct Phone</label>
                      <input type="tel" value={lead.spousePhone || ''} onChange={e => updateField('spousePhone', formatPhone(e.target.value))} className={inputClass} placeholder="(555) 000-0000" />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Secondary Birthday</label>
                      <input type="date" value={lead.spouseDob || ''} onChange={e => updateField('spouseDob', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>
              </section>

              {/* FAMILY & PETS NOTES SECTION */}
              <section className="space-y-6">
                <div className="flex items-center space-x-4 px-2">
                  <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center text-base shadow-md">
                    <i className="fas fa-paw"></i>
                  </div>
                  <h4 className={`text-base font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Family & Pets</h4>
                </div>

                <div className={`rounded-[3rem] p-10 border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="space-y-1">
                    <label className={labelClass}>Personal Details (Kids, Pets, Hobbies)</label>
                    <textarea 
                      value={lead.familyNotes || ''} 
                      onChange={(e) => updateField('familyNotes', e.target.value)}
                      placeholder="e.g. Kids: Leo & Maya. Dog: Cooper (Golden Retriever). Big Dodgers fan."
                      className={`${inputClass} min-h-[100px] resize-none pt-4`}
                    />
                  </div>
                </div>
              </section>

              {/* STATUS SECTION */}
              <section className="space-y-6">
                <div className="flex items-center space-x-4 px-2">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-base shadow-md">
                    <i className="fas fa-chart-line-up"></i>
                  </div>
                  <h4 className={`text-base font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Status</h4>
                </div>

                <div className={`rounded-[2.5rem] p-8 border shadow-inner space-y-6 ${isDarkMode ? 'bg-indigo-900/10 border-indigo-900/30' : 'bg-indigo-50 border-indigo-100'}`}>
                   <div className="space-y-2">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Lifecycle Stage</p>
                     <div className="relative">
                        <select 
                          value={lead.status} 
                          onChange={(e) => updateField('status', e.target.value)} 
                          className={`w-full border-2 rounded-2xl px-6 py-4 text-xl font-black shadow-lg focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none cursor-pointer uppercase tracking-tight ${isDarkMode ? 'bg-slate-900 border-indigo-900/50 text-slate-100' : 'bg-white border-indigo-200 text-slate-900'}`}
                        >
                          {Object.values(LeadStatus).map(s => <option key={s} value={s} className={isDarkMode ? 'bg-slate-900' : ''}>{s.replace('_', ' ')}</option>)}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-300 text-lg">
                          <i className="fas fa-chevron-down"></i>
                        </div>
                     </div>
                   </div>
                </div>
              </section>

              {/* CLASSIFICATION TAGS SECTION */}
              <section className="space-y-6">
                <div className="flex items-center space-x-4 px-2">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-base shadow-md">
                    <i className="fas fa-tags"></i>
                  </div>
                  <h4 className={`text-base font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Lead Data Tags</h4>
                </div>

                <div className={`flex flex-wrap gap-3 p-10 rounded-[3rem] border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  {availableTags.map(tag => {
                    const isSelected = lead.tags?.includes(tag);
                    return (
                      <button 
                        key={tag} 
                        type="button"
                        onClick={() => toggleLeadTag(tag)}
                        className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 ${
                          isSelected 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' 
                            : isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-indigo-400' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 shadow-sm'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Action Buttons: Save and Back to Top */}
              <div className="pt-12 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                 <button 
                   type="button"
                   onClick={handleSave}
                   disabled={isSaving}
                   className="w-full sm:w-auto flex items-center justify-center space-x-4 px-12 py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                 >
                   {isSaving ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>}
                   <span>Save All Changes</span>
                 </button>
                 
                 <button 
                   type="button"
                   onClick={scrollToTop}
                   className="flex items-center space-x-3 px-8 py-4 text-slate-400 hover:text-indigo-600 font-black uppercase tracking-widest text-[10px] transition-all group"
                 >
                   <i className="fas fa-arrow-up group-hover:-translate-y-1 transition-transform"></i>
                   <span>Back to Top</span>
                 </button>
              </div>
            </div>

            {/* RIGHT COLUMN: CLIENT NOTES & AI STRATEGIST */}
            <div className="lg:col-span-5 space-y-12">
              
              {/* CLIENT NOTES */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-base shadow-lg">
                      <i className="fas fa-pen-nib"></i>
                    </div>
                    <div>
                      <h4 className={`text-base font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Client Notes</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lead.notes.length} Active Records</p>
                    </div>
                  </div>
                </div>

                <div className={`p-8 rounded-[3rem] border space-y-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                   <div className="flex flex-col space-y-4">
                      <textarea 
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Type a new client update or activity log..."
                        className={`w-full border rounded-[2rem] p-8 text-base font-semibold outline-none transition-all min-h-[140px] resize-none shadow-inner ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:ring-8 focus:ring-indigo-500/10' : 'bg-slate-50 border-slate-100 focus:bg-white focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500'}`}
                      />
                      <div className="flex justify-end">
                         <button 
                           type="button"
                           onClick={handleAddNote}
                           disabled={!newNote.trim()}
                           className="bg-indigo-600 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none active:scale-95"
                         >
                           Add Note
                         </button>
                      </div>
                   </div>

                   <div className="space-y-6 max-h-[500px] overflow-y-auto scrollbar-hide pr-2">
                      {lead.notes.map((note) => (
                         <div key={note.id} className={`p-8 rounded-[2.5rem] border relative overflow-hidden group transition-all hover:bg-indigo-50/10 ${isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className="absolute top-0 right-0 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-bl-2xl border-l border-b border-slate-100 dark:border-slate-700">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(note.createdAt).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="absolute top-10 right-4 flex items-center space-x-2 transition-all z-50">
                               <button 
                                 type="button"
                                 onClick={() => startEditingNote(note)}
                                 className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 active:scale-90"
                                 title="Edit Note"
                               >
                                 <i className="fas fa-edit text-xs"></i>
                               </button>
                               <button 
                                 type="button"
                                 onClick={(e) => handleDeleteNote(e, note.id)}
                                 className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100 active:scale-90"
                                 title="Delete Note"
                               >
                                 <i className="fas fa-trash-can text-xs"></i>
                               </button>
                            </div>

                            <div className="flex items-center space-x-4 mb-4 pt-2">
                               <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-xs shadow-sm">
                                  {note.authorName?.[0]}
                               </div>
                               <div>
                                  <p className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{note.authorName}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{new Date(note.createdAt).toLocaleString('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}</p>
                               </div>
                            </div>
                            
                            {editingNoteId === note.id ? (
                              <div className="space-y-3 mt-4">
                                <textarea 
                                  value={editNoteContent}
                                  onChange={e => setEditNoteContent(e.target.value)}
                                  className={`w-full p-4 border rounded-xl font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                                  rows={3}
                                />
                                <div className="flex justify-end space-x-2">
                                  <button type="button" onClick={() => setEditingNoteId(null)} className="px-4 py-2 rounded-lg text-[9px] font-black uppercase text-slate-400 hover:bg-slate-100">Cancel</button>
                                  <button type="button" onClick={handleSaveNoteEdit} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest shadow-md">Save Changes</button>
                                </div>
                              </div>
                            ) : (
                              <p className={`text-base leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{note.content}</p>
                            )}
                         </div>
                      ))}
                   </div>
                </div>
              </section>

              {/* AI STRATEGIC ADVISORY SECTION */}
              <section className="space-y-6">
                <div className={`bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-[80px] pointer-events-none"></div>
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center space-x-4">
                       <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-lg animate-pulse">
                          <i className="fas fa-wand-magic-sparkles"></i>
                       </div>
                       <h3 className="text-lg font-black tracking-tight uppercase tracking-[0.1em]">AI Sales Strategist</h3>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl">
                       <p className="text-base font-bold text-indigo-100 leading-relaxed italic">
                         "{aiAdvice}"
                       </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

          </div>
        </div>
      </div>

      {/* GLOBAL DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowDeleteConfirm(false)}></div>
          <div className={`rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] border w-full max-w-md relative z-[1010] p-12 text-center animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
             <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner border border-rose-100">
                <i className="fas fa-trash-can"></i>
             </div>
             <h3 className={`text-3xl font-black tracking-tight mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Move to Trash bin?</h3>
             <p className={`text-lg font-semibold leading-relaxed mb-12 ${isDarkMode ? 'text-slate-400' : 'text-slate-50'}`}>
               You are about to move <span className={`${isDarkMode ? 'text-slate-100' : 'text-slate-900'} font-black`}>{lead.firstName} {lead.lastName}</span> to the trash bin. This record will be archived.
             </p>
             <div className="grid grid-cols-2 gap-6">
                <button 
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)} 
                  className={`py-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handlePermanentDeleteLead} 
                  className="py-6 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95"
                >
                  Confirm Delete
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetail;
const RELATIONSHIP_OPTIONS = ['Spouse', 'Sister', 'Brother', 'Friend', 'Partner', 'Other'];
