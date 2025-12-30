import React, { useState } from 'react';
import { OpenHouse, Lead, LeadStatus, LeadTemperature, Task, User } from '../types';

interface OpenHousePublicFormProps {
  openHouse: OpenHouse;
  onSubmit: (lead: Lead, task: Task) => void;
  onExit: () => void;
  hostAgent?: User;
}

type FormMode = 'VISITOR' | 'AGENT';

const OpenHousePublicForm: React.FC<OpenHousePublicFormProps> = ({ openHouse, onSubmit, onExit, hostAgent }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('VISITOR');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    type: 'Buying' as 'Buying' | 'Selling' | 'Both',
    workingWithAgent: 'NO',
    timeline: '3-6 months',
    priceRange: '$500k - $750k',
    notes: '',
    // Agent specific fields
    agentBrokerage: '',
    clientName: ''
  });

  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 1) return "";
    if (phoneNumberLength < 4) return `(${phoneNumber}`;
    if (phoneNumberLength < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const names = formData.fullName.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || (formMode === 'AGENT' ? 'Agent' : 'Visitor');

    // Map internal UI strings to the data types expected by Lead
    const leadTypeMap: Record<string, string> = {
      'Buying': 'BUYER',
      'Selling': 'SELLER',
      'Both': 'BOTH'
    };

    const tags = ['Open House'];
    if (formMode === 'AGENT') {
      tags.push('Real Estate Agent');
      if (formData.clientName) tags.push('Agent Accompanied');
    } else {
      tags.push(leadTypeMap[formData.type]);
    }

    const newLead: Lead = {
      id: `lead_oh_${Date.now()}`,
      brokerageId: openHouse.brokerageId,
      assignedAgentId: openHouse.assignedAgentId,
      firstName,
      lastName,
      email: formData.email,
      phone: formData.phone,
      status: LeadStatus.NEW,
      temperature: formMode === 'AGENT' ? LeadTemperature.NORMAL : LeadTemperature.HOT,
      source: 'Open House',
      tags: tags,
      propertyType: 'PRIMARY',
      propertyAddress: openHouse.address,
      budget: formMode === 'AGENT' ? 0 : (parseInt(formData.priceRange.replace(/[^0-9]/g, '')) || 0),
      notes: [{
        id: 'n_initial',
        content: formMode === 'AGENT' 
          ? `Agent Signed In: ${formData.fullName} from ${formData.agentBrokerage}. Client: ${formData.clientName || 'Not specified'}. Notes: ${formData.notes}`
          : `Visitor Checked In: ${openHouse.address}. Working with Agent: ${formData.workingWithAgent}. Timeline: ${formData.timeline}. Notes: ${formData.notes}`,
        createdAt: new Date().toISOString(),
        authorId: 'system',
        authorName: 'System Automation'
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDealValue: 0,
      openHouseId: openHouse.id,
      checkInTime: new Date().toISOString()
    };

    const followUpTask: Task = {
      id: `task_oh_${Date.now()}`,
      brokerageId: openHouse.brokerageId,
      assignedUserId: openHouse.assignedAgentId,
      leadId: newLead.id,
      title: formMode === 'AGENT' ? `Thank Agent: ${formData.fullName}` : `OH Follow-up: ${formData.fullName}`,
      description: formMode === 'AGENT' 
        ? `Agent from ${formData.agentBrokerage} visited with client ${formData.clientName || 'Unknown'}.`
        : `Visitor from ${openHouse.address}. Timeline: ${formData.timeline}.`,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      isCompleted: false,
      priority: formMode === 'AGENT' ? 'MEDIUM' : 'HIGH'
    };

    onSubmit(newLead, followUpTask);
    setSubmitted(true);
    
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        fullName: '', email: '', phone: '', type: 'Buying',
        workingWithAgent: 'NO', timeline: '3-6 months', 
        priceRange: '$500k - $750k', notes: '', agentBrokerage: '', clientName: ''
      });
    }, 5000);
  };

  const getQRUrl = () => {
    const baseUrl = window.location.origin;
    const checkInUrl = `${baseUrl}?openhouse=${openHouse.id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkInUrl)}`;
  };

  const displayPhone = openHouse.isManualAgent ? openHouse.manualAgentPhone : hostAgent?.phone;
  const displayLicense = openHouse.isManualAgent ? openHouse.manualAgentLicense : hostAgent?.licenseNumber;

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-[#f8fafc] z-[300] flex items-center justify-center p-10 animate-in fade-in duration-500 overflow-hidden text-[12px]">
        <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-indigo-500/10 rounded-full -mr-64 -mt-64 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[50rem] h-[50rem] bg-blue-500/10 rounded-full -ml-64 -mb-64 blur-[120px] animate-pulse"></div>
        
        <div className="text-center max-w-2xl bg-white/80 backdrop-blur-3xl p-16 md:p-24 rounded-[4rem] shadow-[0_48px_96px_-12px_rgba(0,0,0,0.12)] border border-white relative z-10">
          <div className="w-36 h-36 bg-gradient-to-tr from-emerald-400 to-teal-500 text-white rounded-[3rem] flex items-center justify-center text-6xl mx-auto mb-12 shadow-2xl shadow-emerald-200/50 animate-bounce">
            <i className="fas fa-check"></i>
          </div>
          <h2 className="text-6xl font-black text-slate-900 mb-6 tracking-tighter">You're Checked In!</h2>
          <p className="text-2xl text-slate-500 font-semibold leading-relaxed mb-16">
            Welcome to <span className="text-indigo-600 font-black">{openHouse.address}</span>. Feel free to explore and ask any questions!
          </p>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner mb-8">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 animate-[progress_5s_linear_forwards]"></div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Resetting for next visitor</p>
        </div>
        <style>{`@keyframes progress { from { width: 0%; } to { width: 100%; } }`}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#f8fafc] z-[300] flex flex-col items-center overflow-y-auto font-sans selection:bg-indigo-100 selection:text-indigo-900 text-[12px]">
      {/* Dynamic Background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50 via-white to-blue-50 pointer-events-none"></div>
      <div className="fixed top-0 inset-x-0 h-[50vh] bg-gradient-to-b from-indigo-600/5 to-transparent pointer-events-none"></div>
      
      <button onClick={onExit} className="fixed top-8 right-8 w-16 h-16 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all bg-white/90 backdrop-blur rounded-[2rem] shadow-2xl shadow-slate-200/50 z-[310] group active:scale-90 border border-slate-100">
        <i className="fas fa-times text-2xl group-hover:rotate-90 transition-transform"></i>
      </button>

      <div className="w-full max-w-5xl px-6 py-20 flex flex-col items-center relative z-10">
        <div className="text-center mb-12 space-y-8 animate-in fade-in slide-in-from-top-10 duration-700">
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
            Welcome Home! <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600">Please Sign-In</span>
          </h1>
          
          <p className="text-2xl md:text-3xl text-slate-500 font-semibold max-w-3xl px-6">
            Touring <span className="text-indigo-600 font-bold underline decoration-indigo-200 underline-offset-8">{openHouse.address}</span>
          </p>
        </div>

        {/* QR Code Quick In Section - Moved to top below address */}
        {formMode === 'VISITOR' && (
          <div className="w-full max-w-lg mb-12 bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 rounded-[3rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between shadow-3xl shadow-indigo-200/50 relative overflow-hidden group animate-in zoom-in-95 duration-700">
            <div className="absolute top-0 right-0 w-[20rem] h-[20rem] bg-white/10 rounded-full -mr-24 -mt-24 blur-[60px] transition-transform group-hover:scale-125 duration-1000"></div>
            
            <div className="flex-1 pr-4 text-center md:text-left mb-6 md:mb-0 relative z-10 space-y-3">
              <h4 className="text-xl font-black text-white tracking-tight">Fast Mobile Check-In</h4>
              <p className="text-sm text-indigo-50 font-medium leading-relaxed max-w-[220px] mx-auto md:mx-0">
                Scan this QR code with your phone to check in from your mobile phone.
              </p>
              <div className="flex items-center justify-center md:justify-start space-x-2 text-indigo-200">
                <i className="fas fa-mobile-screen-button text-base animate-bounce"></i>
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Contactless</span>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded-[1.5rem] shadow-2xl shadow-black/20 shrink-0 group-hover:scale-105 transition-all duration-500 relative z-10 border border-indigo-400/20">
              <img src={getQRUrl()} alt="Check-in QR" className="w-20 h-20 md:w-24 md:h-24 rounded-lg" />
            </div>
          </div>
        )}

        {/* Form Mode Toggle */}
        <div className="flex bg-white/80 backdrop-blur p-2 rounded-[2rem] border border-slate-200 shadow-xl mb-16 relative z-20">
           <button 
             onClick={() => setFormMode('VISITOR')}
             className={`px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest transition-all flex items-center space-x-3 ${formMode === 'VISITOR' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <i className="fas fa-user"></i>
             <span>I am a Visitor</span>
           </button>
           <button 
             onClick={() => setFormMode('AGENT')}
             className={`px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest transition-all flex items-center space-x-3 ${formMode === 'AGENT' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <i className="fas fa-user-tie"></i>
             <span>I am an Agent</span>
           </button>
        </div>

        {/* Primary Form */}
        <div className="w-full max-w-5xl bg-white rounded-[4rem] shadow-[0_64px_128px_-24px_rgba(0,0,0,0.1)] border border-slate-100 p-10 md:p-20 mb-20 relative overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50/50 rounded-full -ml-32 -mb-32 blur-3xl"></div>
          
          <form onSubmit={handleSubmit} className="space-y-16 relative z-10">
            {formMode === 'VISITOR' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <Input icon="fa-user-astronaut" label="Full Name" value={formData.fullName} onChange={(v: string) => setFormData({...formData, fullName: v})} required placeholder="e.g. Johnathan Miller" />
                  <Input icon="fa-envelope-open-text" label="Email Address" type="email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} required placeholder="john@example.com" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <Input icon="fa-mobile-retro" label="Mobile Number" type="tel" value={formData.phone} onChange={(v: string) => setFormData({...formData, phone: formatPhone(v)})} placeholder="(555) 000-0000" />
                  <Select icon="fa-hand-holding-heart" label="I am interested in..." value={formData.type} onChange={(v: string) => setFormData({...formData, type: v as any})} options={['Buying', 'Selling', 'Both']} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <Select icon="fa-stopwatch-20" label="My Moving Timeline" value={formData.timeline} onChange={(v: string) => setFormData({...formData, timeline: v})} options={['0-3 months', '3-6 months', '6+ months', 'Just browsing']} />
                  <Select icon="fa-vault" label="Target Price Range" value={formData.priceRange} onChange={(v: string) => setFormData({...formData, priceRange: v})} options={['$250k - $500k', '$500k - $750k', '$750k - $1M', '$1M+']} />
                </div>

                {/* Adjusted Box size and font to fit question on one line - Changed text to "Real Estate Agent" */}
                <div className="p-8 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-[2.5rem] border-2 border-indigo-100/50 max-w-3xl mx-auto shadow-sm">
                  <label className="block text-lg font-black text-slate-900 uppercase tracking-widest mb-6 text-center whitespace-nowrap">Are you currently working with a Real Estate Agent?</label>
                  <div className="flex space-x-6 max-w-md mx-auto">
                    {['YES', 'NO'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData({...formData, workingWithAgent: opt})}
                        className={`flex-1 py-3.5 rounded-2xl font-black text-xl border-2 transition-all transform active:scale-95 shadow-lg ${
                          formData.workingWithAgent === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200' : 'bg-white border-white text-slate-400 hover:border-indigo-200 hover:text-indigo-500'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-4 mb-8 bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                   <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg">
                     <i className="fas fa-id-card"></i>
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-indigo-900 tracking-tight">Agent Sign-In</h3>
                     <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Professional Registration</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <Input icon="fa-user-tie" label="Agent Full Name" value={formData.fullName} onChange={(v: string) => setFormData({...formData, fullName: v})} required placeholder="e.g. Sarah Connor" />
                  <Input icon="fa-building-columns" label="Agent Brokerage" value={formData.agentBrokerage} onChange={(v: string) => setFormData({...formData, agentBrokerage: v})} required placeholder="e.g. Legacy Realty Group" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <Input icon="fa-envelope-circle-check" label="Agent Email" type="email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} required placeholder="sarah@legacy.com" />
                  <Input icon="fa-phone-volume" label="Agent Phone" type="tel" value={formData.phone} onChange={(v: string) => setFormData({...formData, phone: formatPhone(v)})} required placeholder="(555) 123-4567" />
                </div>

                <div className="p-12 bg-slate-50 rounded-[4rem] border-4 border-slate-100 shadow-inner">
                   <div className="flex items-center space-x-4 mb-6">
                      <i className="fas fa-users-viewfinder text-indigo-500 text-2xl"></i>
                      <h4 className="text-xl font-black text-slate-800 uppercase tracking-widest">Accompanying Client</h4>
                   </div>
                   <Input icon="fa-user" label="Client Full Name (Optional)" value={formData.clientName} onChange={(v: string) => setFormData({...formData, clientName: v})} placeholder="Leave blank if visiting alone" />
                </div>
              </>
            )}

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-800 uppercase tracking-[0.2em] ml-2">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder={formMode === 'VISITOR' ? "Are you looking for specific features like a pool or home office?" : "Leave feedback or specific requests for the listing agent..."}
                className="w-full bg-slate-50 border-4 border-transparent rounded-[3rem] px-10 py-8 font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 min-h-[140px] resize-none shadow-inner text-lg"
              />
            </div>

            <div className="pt-10 flex justify-center">
              <button type="submit" className="w-full max-w-md bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:shadow-indigo-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-4 group">
                <span>{formMode === 'AGENT' ? 'Submit Registration' : 'Check-IN'}</span>
                <i className="fas fa-chevron-right text-base group-hover:translate-x-1 transition-transform"></i>
              </button>
            </div>
          </form>

          <div className="mt-24 pt-12 border-t-4 border-slate-50">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] mb-8 flex items-center">
              <i className="fas fa-shield-check mr-4 text-indigo-600 text-xl"></i>
              Agency Disclosure & Communication Consent
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-[13px] leading-relaxed font-semibold text-slate-500">
              <div className="space-y-4">
                <p className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 mr-3 shrink-0"></span>
                  <span><strong>Agency Relationships:</strong> By checking in, you acknowledge that the host represents the seller's interests in this property. No agent-client relationship is formed between you and the host by this registration alone unless otherwise agreed in writing.</span>
                </p>
                
              </div>
              <div className="space-y-4">
                <p className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 mr-3 shrink-0"></span>
                  <span><strong>TCPA Compliance:</strong> By providing your phone number and email, you provide your express written consent to be contacted by our brokerage and its agents regarding real estate services via call, SMS, or email, including the use of automated technology.</span>
                </p>
                
              </div>
            </div>
          </div>
        </div>

        {/* Host Agent Spotlight */}
        <footer className="w-full text-center pb-32">
          <div className="bg-white/40 backdrop-blur-3xl border-4 border-white rounded-[4rem] p-12 max-w-xl mx-auto shadow-3xl shadow-slate-200/50 flex flex-col items-center group hover:-translate-y-2 transition-transform">
            <div className="relative mb-8">
              <div className="w-28 h-28 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white text-4xl shadow-2xl shadow-indigo-200 group-hover:rotate-6 transition-transform">
                <i className="fas fa-user-tie"></i>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white border-4 border-white shadow-lg">
                 <i className="fas fa-check text-sm"></i>
              </div>
            </div>
            
            <h3 className="text-2xl font-black text-slate-800">Your Host: {openHouse.assignedAgentName}</h3>
            <p className="text-base font-bold text-indigo-600 mt-1 mb-10 uppercase tracking-widest">Licensed Real Estate Expert</p>
            
            <div className="grid grid-cols-2 gap-8 w-full">
              <div className="bg-white/50 p-4 rounded-3xl border border-white">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Direct Phone</p>
                <p className="text-sm font-black text-slate-700">{displayPhone || '(555) 123-4567'}</p>
              </div>
              <div className="bg-white/50 p-4 rounded-3xl border border-white">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DRE License</p>
                <p className="text-sm font-black text-indigo-600">{displayLicense || 'DRE# 01234567'}</p>
              </div>
            </div>
            
            <div className="pt-12 flex items-center space-x-8 opacity-20 group-hover:opacity-40 transition-opacity">
               <i className="fas fa-house-chimney text-3xl"></i>
               <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
               <span className="font-black text-[11px] uppercase tracking-[0.3em]">Equal Housing Opportunity</span>
               <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
               <i className="fas fa-building-circle-check text-3xl"></i>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, icon, type = 'text', required = false, placeholder = '' }: any) => (
  <div className="space-y-4">
    <label className="block text-sm font-black text-slate-800 uppercase tracking-[0.2em] ml-2">{label} {required && '*'}</label>
    <div className="relative group">
      <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors text-xl">
        <i className={`fas ${icon}`}></i>
      </div>
      <input
        type={type} required={required} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border-4 border-transparent rounded-[2.5rem] pl-20 pr-10 py-7 font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 shadow-inner text-lg"
      />
    </div>
  </div>
);

const Select = ({ label, value, onChange, icon, options }: any) => (
  <div className="space-y-4">
    <label className="block text-sm font-black text-slate-800 uppercase tracking-[0.2em] ml-2">{label}</label>
    <div className="relative group">
      <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors text-xl">
        <i className={`fas ${icon}`}></i>
      </div>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50 border-4 border-transparent rounded-[2.5rem] pl-20 pr-14 py-7 font-black text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-inner text-lg"
      >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <i className="fas fa-chevron-down absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-base"></i>
    </div>
  </div>
);

export default OpenHousePublicForm;