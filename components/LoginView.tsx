import React, { useState } from 'react';
import { User, UserRole } from '../types';

interface LoginViewProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ users, onLoginSuccess }) => {
  const [step, setStep] = useState<'LOGIN' | '2FA'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const brokerUser = users.find(u => u.role === UserRole.BROKER) || users[0];

  const handleSocialLogin = (provider: string) => {
    setIsLoading(true);
    // Simulate OAuth delay
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(brokerUser);
    }, 1500);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate authentication check
    setTimeout(() => {
      setIsLoading(false);
      if (email.toLowerCase() === brokerUser.email.toLowerCase()) {
        setStep('2FA');
      } else {
        // Fallback: If not broker email, check agents
        const foundAgent = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (foundAgent) {
          setStep('2FA');
        } else {
          setError('User not found. Try: ' + brokerUser.email);
        }
      }
    }, 1000);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handle2FAVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate validation of '123456'
    setTimeout(() => {
      setIsLoading(false);
      const code = otp.join('');
      if (code === '123456' || code === '000000') {
        const targetUser = users.find(u => u.email.toLowerCase() === email.toLowerCase()) || brokerUser;
        onLoginSuccess(targetUser);
      } else {
        setError('Invalid security code. Hint: 123456');
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80" 
          className="w-full h-full object-cover opacity-20" 
          alt="Modern Architecture" 
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/90 to-indigo-900/30"></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[500px] relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white rounded-[3rem] shadow-[0_48px_96px_-12px_rgba(0,0,0,0.5)] border border-slate-100 overflow-hidden">
          
          {/* Card Header */}
          <div className="p-12 pb-6 text-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200">
              <i className="fas fa-bolt text-white text-2xl"></i>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">Agent Desk 360</h1>
            <p className="text-slate-500 font-semibold tracking-wide uppercase text-[10px]">Broker & Admin Portal</p>
          </div>

          <div className="px-12 pb-16">
            {step === 'LOGIN' ? (
              <div className="space-y-10 animate-in slide-in-from-left-4 duration-500">
                <form onSubmit={handleLoginSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <div className="relative group">
                       <i className="fas fa-envelope absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
                       <input 
                         required
                         type="email" 
                         value={email}
                         onChange={e => setEmail(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                         placeholder="broker@office.com"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative group">
                       <i className="fas fa-lock absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
                       <input 
                         required
                         type="password" 
                         value={password}
                         onChange={e => setPassword(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                         placeholder="••••••••"
                       />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-[11px] font-bold border border-rose-100 flex items-center animate-in shake-x duration-500">
                      <i className="fas fa-circle-exclamation mr-3"></i>
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-3"
                  >
                    {isLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <span>Continue to Dashboard</span>}
                  </button>
                </form>

                {/* Social Auth */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 opacity-30">
                    <div className="h-px flex-1 bg-slate-300"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">log-in with</span>
                    <div className="h-px flex-1 bg-slate-300"></div>
                  </div>

                  <div className="flex flex-col space-y-4">
                    <button 
                      onClick={() => handleSocialLogin('Google')}
                      className="w-full h-14 flex items-center justify-center space-x-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                    >
                      <i className="fab fa-google text-lg"></i>
                      <span className="text-xs font-black uppercase tracking-widest">Sign in with Google</span>
                    </button>
                    <button 
                      onClick={() => handleSocialLogin('Facebook')}
                      className="w-full h-14 flex items-center justify-center space-x-4 bg-[#1877F2] text-white rounded-2xl hover:bg-[#0c63d4] transition-all shadow-lg shadow-blue-200"
                    >
                      <i className="fab fa-facebook text-lg"></i>
                      <span className="text-xs font-black uppercase tracking-widest">Sign in with Facebook</span>
                    </button>
                    <button 
                      onClick={() => handleSocialLogin('Apple')}
                      className="w-full h-14 flex items-center justify-center space-x-4 bg-black text-white rounded-2xl hover:bg-zinc-900 transition-all shadow-lg shadow-slate-300"
                    >
                      <i className="fab fa-apple text-lg"></i>
                      <span className="text-xs font-black uppercase tracking-widest">Sign in with Apple</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                <div className="text-center space-y-3">
                   <h3 className="text-2xl font-black text-slate-800">Verify Identity</h3>
                   <p className="text-sm text-slate-500 font-medium">We've sent a 6-digit code to your secure device.</p>
                </div>

                <form onSubmit={handle2FAVerify} className="space-y-10">
                   <div className="flex justify-between gap-2">
                     {otp.map((digit, i) => (
                       <input 
                         key={i}
                         id={`otp-${i}`}
                         type="text"
                         value={digit}
                         onChange={e => handleOtpChange(i, e.target.value)}
                         className="w-12 h-16 bg-slate-50 border-2 border-slate-200 rounded-xl text-center font-black text-2xl text-indigo-600 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                       />
                     ))}
                   </div>

                   {error && (
                    <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-[11px] font-bold border border-rose-100 flex items-center text-center justify-center animate-in shake-x">
                      <i className="fas fa-circle-exclamation mr-3"></i>
                      {error}
                    </div>
                  )}

                   <div className="space-y-4">
                     <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-3"
                      >
                        {isLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <span>Authorize Access</span>}
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setStep('LOGIN'); setError(''); }}
                        className="w-full text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors tracking-widest"
                      >
                        Use a different account
                      </button>
                   </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-12 flex justify-center space-x-8 text-white/40 text-[9px] font-black uppercase tracking-widest">
           <a href="#" className="hover:text-white transition-colors">Privacy Shield</a>
           <span className="opacity-20">|</span>
           <a href="#" className="hover:text-white transition-colors">Broker Support</a>
           <span className="opacity-20">|</span>
           <a href="#" className="hover:text-white transition-colors">DRE Compliance</a>
        </div>
      </div>
    </div>
  );
};

export default LoginView;