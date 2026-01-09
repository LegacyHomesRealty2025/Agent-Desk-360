import React, { useState, useRef } from 'react';
import { UserRole } from '../types.ts';
import { BrokerageInvite } from '../services/invitationService.ts';
import { authService } from '../services/authService.ts';

interface JoinViewProps {
  invitation: BrokerageInvite;
  onComplete: (inviteId: string) => void;
}

const JoinView: React.FC<JoinViewProps> = ({ invitation, onComplete }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    licenseNumber: '',
    avatar: `https://picsum.photos/seed/${Math.random()}/400`,
    password: '',
    confirmPassword: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 400;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Failed to get canvas context');
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessing(true);
      const resizedDataUrl = await resizeImage(file);
      setFormData(prev => ({ ...prev, avatar: resizedDataUrl }));
    } catch (err) {
      console.error('Error processing image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsProcessing(true);

    try {
      const success = await authService.signUp(
        invitation.email,
        formData.password,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          licenseNumber: formData.licenseNumber,
          avatarUrl: formData.avatar,
          role: invitation.role,
          brokerageId: invitation.brokerageId
        }
      );

      if (success) {
        onComplete(invitation.id);
      } else {
        setError('Failed to create account. Please try again.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('Error creating account:', err);
      setError(err.message || 'Failed to create account. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1920&q=80" 
          className="w-full h-full object-cover opacity-20" 
          alt="Luxury Real Estate" 
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/90 to-indigo-900/30"></div>
      </div>

      <div className="w-full max-w-4xl relative z-10 animate-in fade-in zoom-in-95 duration-700 flex flex-col md:flex-row bg-white rounded-[3rem] shadow-[0_48px_96px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Left Side: Welcome Panel */}
        <div className="w-full md:w-80 bg-indigo-600 p-12 text-white flex flex-col justify-between">
           <div className="space-y-8">
              <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-2xl shadow-xl">
                 <i className="fas fa-bolt"></i>
              </div>
              <div className="space-y-4">
                 <h1 className="text-4xl font-black leading-tight tracking-tight">Join the Elite Roster.</h1>
                 <p className="text-indigo-100 font-medium leading-relaxed opacity-80">
                   You've been invited to set up your professional agent profile on Agent Desk 360.
                 </p>
              </div>
           </div>
           <div className="pt-12 border-t border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2">Authenticated Email</p>
              <p className="text-sm font-bold truncate">{invitation.email}</p>
           </div>
        </div>

        {/* Right Side: Onboarding Form */}
        <div className="flex-1 p-10 md:p-16 max-h-[90vh] overflow-y-auto scrollbar-hide">
          <div className="mb-12">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create Your Account</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Complete your identity for the brokerage pipeline.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center space-y-4">
               <div className="relative group">
                  <img src={formData.avatar} className={`w-32 h-32 rounded-[2.5rem] object-cover ring-8 ring-slate-50 shadow-xl transition-all ${isProcessing ? 'opacity-50 blur-[2px]' : ''}`} alt="Profile" />
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                  <button type="button" disabled={isProcessing} onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-slate-900/60 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer z-20">
                    <i className={`fas ${isProcessing ? 'fa-circle-notch fa-spin' : 'fa-camera'} text-2xl mb-1`}></i>
                    <span className="text-[10px] font-black uppercase tracking-widest">Upload Photo</span>
                  </button>
               </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                <input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                <input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Phone</label>
                <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="(555) 000-0000" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DRE License #</label>
                <input required value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black text-indigo-600 outline-none" placeholder="DRE# 00000000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Set Secure Password</label>
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                <input required type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="••••••••" />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-6 py-4 rounded-2xl font-bold">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
              </div>
            )}

            <button type="submit" disabled={isProcessing} className="w-full py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
               {isProcessing ? (
                 <i className="fas fa-circle-notch fa-spin"></i>
               ) : (
                 <>
                   <span>Complete Professional Setup</span>
                   <i className="fas fa-chevron-right"></i>
                 </>
               )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinView;