import React, { useState } from 'react';
import { supabase } from '../lib/supabase.ts';

interface SignupViewProps {
  onSignupSuccess: () => void;
  onNavigateToLogin: () => void;
}

const SignupView: React.FC<SignupViewProps> = ({ onSignupSuccess, onNavigateToLogin }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'BROKER' | 'AGENT'>('BROKER');
  const [brokerageName, setBrokerageName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStepOne = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');

      const brokerageNameToUse = role === 'BROKER'
        ? brokerageName
        : `${firstName} ${lastName} Brokerage`;

      const { data: result, error: profileError } = await supabase.rpc(
        'create_user_profile_and_brokerage',
        {
          p_user_id: authData.user.id,
          p_email: email.trim(),
          p_first_name: firstName,
          p_last_name: lastName,
          p_role: role,
          p_brokerage_name: brokerageNameToUse,
          p_phone: phone || null,
          p_license_number: licenseNumber || null,
        }
      );

      if (profileError) throw profileError;

      onSignupSuccess();
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to sign up. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80"
          className="w-full h-full object-cover opacity-20"
          alt="Modern Architecture"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/90 to-indigo-900/30"></div>
      </div>

      <div className="w-full max-w-[500px] relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white rounded-[3rem] shadow-[0_48px_96px_-12px_rgba(0,0,0,0.5)] border border-slate-100 overflow-hidden">

          <div className="p-12 pb-6 text-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200">
              <i className="fas fa-bolt text-white text-2xl"></i>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">Create Account</h1>
            <p className="text-slate-500 font-semibold tracking-wide uppercase text-[10px]">Join Agent Desk 360</p>
          </div>

          <div className="px-12 pb-16">
            <div className="space-y-10 animate-in slide-in-from-left-4 duration-500">
              <form onSubmit={step === 1 ? handleStepOne : handleSignupSubmit} className="space-y-6">
                {step === 1 ? (
                  <>
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
                      placeholder="your@email.com"
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

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative group">
                    <i className="fas fa-lock absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
                    <input
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                  </>
                ) : (
                  <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    placeholder="John"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    placeholder="Doe"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">I am a</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as 'BROKER' | 'AGENT')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  >
                    <option value="BROKER">Broker/Owner</option>
                    <option value="AGENT">Agent</option>
                  </select>
                </div>

                {role === 'BROKER' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brokerage Name</label>
                    <input
                      required
                      type="text"
                      value={brokerageName}
                      onChange={e => setBrokerageName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      placeholder="Your Brokerage LLC"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License Number (Optional)</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={e => setLicenseNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    placeholder="DRE# 12345678"
                  />
                </div>
                  </>
                )}

                {error && (
                  <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-[11px] font-bold border border-rose-100 flex items-center animate-in shake-x duration-500">
                    <i className="fas fa-circle-exclamation mr-3"></i>
                    {error}
                  </div>
                )}

                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 active:scale-[0.98] transition-all"
                  >
                    Back
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <span>{step === 1 ? 'Next Step' : 'Create Account'}</span>}
                </button>

                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                  >
                    Already have an account? <span className="text-indigo-600">Sign in</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-12 flex justify-center space-x-8 text-white/40 text-[9px] font-black uppercase tracking-widest">
          <a href="#" className="hover:text-white transition-colors">Privacy Shield</a>
          <span className="opacity-20">|</span>
          <a href="#" className="hover:text-white transition-colors">Support</a>
          <span className="opacity-20">|</span>
          <a href="#" className="hover:text-white transition-colors">Compliance</a>
        </div>
      </div>
    </div>
  );
};

export default SignupView;
