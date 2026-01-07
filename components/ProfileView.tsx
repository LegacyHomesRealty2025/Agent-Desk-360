import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Brokerage } from '../types.ts';
import { authService } from '../services/authService.ts';

interface ProfileViewProps {
  user: User;
  brokerage: Brokerage;
  onUpdate: (user: User) => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, brokerage, onUpdate, isDarkMode, toggleDarkMode }) => {
  const [formData, setFormData] = useState<User>(user);
  const [isSaved, setIsSaved] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordStatus, setPasswordStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const displayUser = { ...user };
    const prefix = 'DRE LIC# ';
    if (displayUser.licenseNumber) {
      if (!displayUser.licenseNumber.toUpperCase().startsWith('DRE')) {
        displayUser.licenseNumber = prefix + displayUser.licenseNumber;
      } else {
        // Normalize any existing prefix to the requested uppercase format
        displayUser.licenseNumber = displayUser.licenseNumber.replace(/^DRE (Lic|LIC)#\s*/i, prefix);
      }
    } else {
      displayUser.licenseNumber = prefix;
    }
    setFormData(displayUser);
  }, [user]);

  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const length = phoneNumber.length;
    if (length < 4) return `(${phoneNumber}`;
    if (length < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleLicenseChange = (v: string) => {
    const prefix = 'DRE LIC# ';
    if (!v.startsWith(prefix)) {
      setFormData({ ...formData, licenseNumber: prefix });
    } else {
      setFormData({ ...formData, licenseNumber: v });
    }
  };

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsProcessing(true);

    try {
      const updatedUser = await authService.updateProfile(user.id, formData);

      if (updatedUser) {
        onUpdate(updatedUser);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } else {
        console.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto animate-in fade-in duration-700 pb-32 ${isDarkMode ? 'dark' : ''}`}>
      {/* Cinematic Profile Header */}
      <div className="relative mb-20">
        <div className="h-72 w-full bg-gradient-to-br from-indigo-600 via-indigo-900 to-slate-950 rounded-[3.5rem] overflow-hidden shadow-2xl relative group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.15),transparent)] pointer-events-none"></div>
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/60 to-transparent"></div>
          
          <button 
            onClick={toggleDarkMode}
            className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white transition-all hover:bg-white hover:text-indigo-600 z-50 shadow-2xl"
          >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
          </button>
        </div>

        <div className="absolute -bottom-10 left-12 flex items-end space-x-10">
          <div className="relative group">
            <div className={`w-48 h-48 rounded-[3rem] p-2 shadow-2xl relative z-10 border-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'}`}>
              <img 
                src={formData.avatar} 
                className={`w-full h-full rounded-[2.5rem] object-cover transition-all ${isProcessing ? 'opacity-50 blur-[2px]' : 'group-hover:scale-[1.02]'}`} 
                alt="Profile"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-2 bg-slate-900/60 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white cursor-pointer z-20"
              >
                <i className={`fas ${isProcessing ? 'fa-circle-notch fa-spin' : 'fa-camera'} text-3xl mb-2`}></i>
                <span className="text-[10px] font-black uppercase tracking-widest">Update</span>
              </button>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white border-4 border-white shadow-lg z-30">
               <i className="fas fa-check text-base"></i>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="pb-16 space-y-3">
            <div className="flex items-center space-x-5">
              <h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl">
                {formData.firstName} {formData.lastName}
              </h1>
              <span className="px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[11px] font-black uppercase tracking-[0.25em] text-white shadow-xl">
                {formData.role}
              </span>
            </div>
            <div className="flex items-center space-x-8 text-indigo-100/90 font-bold text-base">
              <span className="flex items-center group cursor-default"><i className="fas fa-building mr-3 text-indigo-400 group-hover:scale-110 transition-transform"></i>{brokerage.name}</span>
              <div className="w-1.5 h-1.5 bg-white/20 rounded-full"></div>
              <span className="flex items-center group cursor-default"><i className="fas fa-id-card mr-3 text-indigo-400 group-hover:scale-110 transition-transform"></i>{formData.licenseNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Single Column Layout */}
      <div className="mt-16 space-y-10">
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Profile Information Section */}
          <div className={`border rounded-[3.5rem] p-12 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center space-x-5">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                     <i className="fas fa-user-circle text-2xl"></i>
                  </div>
                  <div>
                     <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Profile</h3>
                     <p className="text-sm text-slate-400 font-medium">Core professional information and contact details.</p>
                  </div>
               </div>
               {isSaved && (
                 <span className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 animate-in fade-in slide-in-from-right-4">
                   Changes Saved
                 </span>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <ProfileInput label="First Name" value={formData.firstName} onChange={v => setFormData({...formData, firstName: v})} isDarkMode={isDarkMode} />
               <ProfileInput label="Last Name" value={formData.lastName} onChange={v => setFormData({...formData, lastName: v})} isDarkMode={isDarkMode} />
               <ProfileInput label="Email Address" type="email" value={formData.email} onChange={v => setFormData({...formData, email: v})} isDarkMode={isDarkMode} />
               <ProfileInput label="Direct Phone" type="tel" value={formData.phone || ''} onChange={v => setFormData({...formData, phone: formatPhone(v)})} isDarkMode={isDarkMode} />
               <div className="md:col-span-2">
                  <ProfileInput label="DRE License #" value={formData.licenseNumber || ''} onChange={handleLicenseChange} isDarkMode={isDarkMode} valueColor="text-indigo-500" />
               </div>
            </div>
          </div>

          {/* Account Security Section */}
          <div className={`border rounded-[3.5rem] p-12 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center space-x-5">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm border border-slate-100">
                     <i className="fas fa-shield-halved text-2xl"></i>
                  </div>
                  <div>
                     <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Account Security</h3>
                     <p className="text-sm text-slate-400 font-medium">Manage your credentials and security protocols.</p>
                  </div>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                    <input type="password" placeholder="••••••••" className={`w-full border rounded-2xl px-6 py-4 text-base outline-none focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Secure Password</label>
                    <input type="password" placeholder="••••••••" className={`w-full border rounded-2xl px-6 py-4 text-base outline-none focus:border-indigo-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`} />
                  </div>
                  <button type="button" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl active:scale-[0.98]">
                    Change Password
                  </button>
               </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 pt-6">
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 py-7 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.4em] text-[11px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile changes</span>
              )}
            </button>
            <button type="button" className={`px-12 py-7 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-white hover:shadow-lg'}`}>
              Discard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ProfileInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  isDarkMode?: boolean;
  valueColor?: string;
}

const ProfileInput: React.FC<ProfileInputProps> = ({ label, value, onChange, type = 'text', isDarkMode, valueColor }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      className={`w-full border rounded-2xl px-7 py-5 font-bold outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-400 transition-all ${valueColor || ''} ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:bg-slate-700' : 'bg-slate-50 border-slate-100 text-slate-700 focus:bg-white shadow-inner'}`} 
    />
  </div>
);

export default ProfileView;