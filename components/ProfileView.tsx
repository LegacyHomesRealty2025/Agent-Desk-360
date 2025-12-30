
import React, { useState, useRef } from 'react';
import { User, UserRole, Brokerage } from '../types';

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
  
  // Password state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordStatus, setPasswordStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');

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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdate(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setPasswordStatus('ERROR');
      return;
    }
    // Simulate API call
    setPasswordStatus('SUCCESS');
    setTimeout(() => {
      setPasswordStatus('IDLE');
      setPasswords({ current: '', new: '', confirm: '' });
    }, 3000);
  };

  return (
    <div className={`max-w-4xl mx-auto animate-in fade-in duration-700 pb-32 ${isDarkMode ? 'dark' : ''}`}>
      {/* Premium Identity Header */}
      <div className="relative mb-12">
        <div className="h-64 w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 rounded-[3rem] overflow-hidden shadow-2xl relative group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full -ml-32 -mb-32 blur-2xl"></div>

          {/* Theme Toggle Overlay */}
          <button 
            onClick={toggleDarkMode}
            className={`absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white transition-all hover:bg-white hover:text-indigo-600 z-50`}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
          </button>
        </div>

        <div className="absolute -bottom-12 left-12 flex items-end space-x-8">
          <div className="relative group">
            <div className="w-44 h-44 rounded-[2.5rem] bg-white p-2 shadow-2xl relative z-10 dark:bg-slate-800">
              <img 
                src={formData.avatar} 
                className={`w-full h-full rounded-[2rem] object-cover transition-all ${isProcessing ? 'opacity-50 blur-[2px]' : 'group-hover:scale-[1.02]'}`} 
                alt="Profile"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-2 bg-slate-900/60 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white cursor-pointer z-20"
              >
                <i className={`fas ${isProcessing ? 'fa-circle-notch fa-spin' : 'fa-camera'} text-2xl mb-2`}></i>
                <span className="text-[10px] font-black uppercase tracking-widest">Change Photo</span>
              </button>
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white border-4 border-white shadow-lg z-30 animate-in zoom-in duration-500 delay-300">
               <i className="fas fa-check text-xs"></i>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="pb-14 space-y-2">
            <div className="flex items-center space-x-4">
              <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-md">
                {formData.firstName} {formData.lastName}
              </h1>
              <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white">
                {formData.role}
              </span>
            </div>
            <div className="flex items-center space-x-6 text-indigo-100/80 font-bold text-sm">
              <span className="flex items-center"><i className="fas fa-building mr-2 text-indigo-300"></i>{brokerage.name}</span>
              <span className="w-1 h-1 bg-white/20 rounded-full"></span>
              <span className="flex items-center"><i className="fas fa-id-card mr-2 text-indigo-300"></i>{formData.licenseNumber || 'License Pending'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8 mt-24">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Account Settings Card */}
          <div className={`border rounded-[3rem] p-12 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center space-x-4 mb-12">
               <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                  <i className="fas fa-user-circle text-xl"></i>
               </div>
               <div>
                  <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>My Profile</h3>
                  <p className="text-sm text-slate-400 font-medium">Manage your professional identity and contact points.</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.firstName} 
                    onChange={e => setFormData({...formData, firstName: e.target.value})} 
                    className={`w-full border rounded-2xl px-7 py-5 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white'}`} 
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.lastName} 
                    onChange={e => setFormData({...formData, lastName: e.target.value})} 
                    className={`w-full border rounded-2xl px-7 py-5 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white'}`} 
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input 
                    required 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    className={`w-full border rounded-2xl px-7 py-5 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white'}`} 
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Direct Phone</label>
                  <input 
                    type="tel" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    className={`w-full border rounded-2xl px-7 py-5 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white'}`} 
                  />
               </div>
               <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DRE License #</label>
                  <input 
                    type="text" 
                    value={formData.licenseNumber} 
                    onChange={e => setFormData({...formData, licenseNumber: e.target.value})} 
                    className={`w-full border rounded-2xl px-7 py-5 font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-indigo-400 focus:bg-slate-700' : 'bg-slate-50 border-slate-200 text-indigo-600 focus:bg-white'}`} 
                    placeholder="e.g. DRE# 01234567"
                  />
               </div>
            </div>
            
            <div className="flex justify-center mt-10">
               <button 
                  type="submit" 
                  disabled={isProcessing}
                  className={`px-12 py-7 ${isSaved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} text-white rounded-[2rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center space-x-4`}
                >
                  <i className={`fas ${isSaved ? 'fa-check' : 'fa-save'} text-lg`}></i>
                  <span>{isSaved ? 'Profile Saved' : 'Save Profile'}</span>
               </button>
            </div>
          </div>
        </form>

        {/* Security / Password Card */}
        <div className={`border rounded-[3rem] p-12 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
           <div className="flex items-center space-x-4 mb-12">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm">
                 <i className="fas fa-shield-halved text-xl"></i>
              </div>
              <div>
                 <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Security Credentials</h3>
                 <p className="text-sm text-slate-400 font-medium">Keep your account protected with regular password rotations.</p>
              </div>
           </div>

           <form onSubmit={handlePasswordChange} className="space-y-8">
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                    <input 
                      required 
                      type="password" 
                      value={passwords.current}
                      onChange={e => setPasswords({...passwords, current: e.target.value})}
                      className={`w-full border rounded-2xl px-7 py-5 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white'}`} 
                    />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                      <input 
                        required 
                        type="password" 
                        value={passwords.new}
                        onChange={e => setPasswords({...passwords, new: e.target.value})}
                        className={`w-full border rounded-2xl px-7 py-5 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white'}`} 
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                      <input 
                        required 
                        type="password" 
                        value={passwords.confirm}
                        onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                        className={`w-full border rounded-2xl px-7 py-5 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white'}`} 
                      />
                   </div>
                 </div>
              </div>

              {passwordStatus === 'SUCCESS' && (
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100 flex items-center">
                  <i className="fas fa-check-circle mr-3"></i>
                  Password updated successfully.
                </div>
              )}
              {passwordStatus === 'ERROR' && (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100 flex items-center">
                  <i className="fas fa-circle-exclamation mr-3"></i>
                  Passwords do not match.
                </div>
              )}

              <div className="flex justify-center pt-4">
                 <button 
                    type="submit" 
                    className={`px-10 py-5 ${passwordStatus === 'SUCCESS' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl transition-all active:scale-95 flex items-center space-x-3`}
                  >
                    <i className={`fas ${passwordStatus === 'SUCCESS' ? 'fa-check' : 'fa-key'}`}></i>
                    <span>{passwordStatus === 'SUCCESS' ? 'Password Updated' : 'Update Password'}</span>
                 </button>
              </div>
           </form>
        </div>

        {/* Global Save Changes Button at the bottom */}
        <div className="flex justify-center pt-12">
           <button 
              onClick={() => handleSubmit()}
              disabled={isProcessing}
              className={`px-20 py-8 ${isSaved ? 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_20px_50px_rgba(16,185,129,0.3)]' : 'bg-rose-600 hover:bg-rose-700 shadow-[0_20px_50px_rgba(225,29,72,0.3)]'} text-white rounded-[2.5rem] font-black uppercase tracking-[0.5em] text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center space-x-6`}
            >
              <i className={`fas ${isSaved ? 'fa-check-double' : 'fa-save'} text-xl`}></i>
              <span>{isSaved ? 'All Changes Applied' : 'Save All Changes'}</span>
           </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
