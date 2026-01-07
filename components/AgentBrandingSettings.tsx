import React, { useState } from 'react';
import { User } from '../types.ts';

interface AgentBrandingSettingsProps {
  user: User;
  onClose: () => void;
  isDarkMode: boolean;
}

interface AgentBranding {
  headshotUrl: string;
  logoUrl: string;
  tagline: string;
  phone: string;
  email: string;
  licenseNumber: string;
}

const AgentBrandingSettings: React.FC<AgentBrandingSettingsProps> = ({ user, onClose, isDarkMode }) => {
  const [branding, setBranding] = useState<AgentBranding>({
    headshotUrl: user.avatar || '',
    logoUrl: '',
    tagline: 'Your Trusted Real Estate Partner',
    phone: user.phone || '',
    email: user.email || '',
    licenseNumber: user.licenseNumber || ''
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Branding settings saved successfully!');
      onClose();
    }, 1000);
  };

  const handleHeadshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBranding(prev => ({ ...prev, headshotUrl: url }));
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBranding(prev => ({ ...prev, logoUrl: url }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h2 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Agent Branding
            </h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Customize your professional brand identity
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            isSaving
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          } text-white`}
        >
          {isSaving ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="fas fa-save mr-2"></i>
              Save Changes
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`rounded-3xl border-2 p-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-xl font-black mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Visual Identity
          </h3>

          <div className="space-y-6">
            <div>
              <label className={`text-sm font-bold mb-3 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Professional Headshot
              </label>
              <div className="flex items-center space-x-4">
                <img
                  src={branding.headshotUrl || 'https://via.placeholder.com/150'}
                  alt="Headshot"
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-200"
                />
                <label className="cursor-pointer px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all">
                  <i className="fas fa-upload mr-2"></i>
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeadshotUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Recommended: Square image, minimum 500x500px
              </p>
            </div>

            <div>
              <label className={`text-sm font-bold mb-3 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Brokerage Logo
              </label>
              <div className="flex items-center space-x-4">
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt="Logo"
                    className="w-24 h-24 rounded-2xl object-contain border-4 border-slate-200 bg-white p-2"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl border-4 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                    <i className="fas fa-image text-slate-400 text-2xl"></i>
                  </div>
                )}
                <label className="cursor-pointer px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all">
                  <i className="fas fa-upload mr-2"></i>
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Transparent PNG recommended for best results
              </p>
            </div>

            <div>
              <label className={`text-sm font-bold mb-3 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Personal Tagline
              </label>
              <input
                type="text"
                value={branding.tagline}
                onChange={(e) => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
                placeholder="Your professional tagline"
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium border ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>
        </div>

        <div className={`rounded-3xl border-2 p-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-xl font-black mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Contact Information
          </h3>

          <div className="space-y-6">
            <div>
              <label className={`text-sm font-bold mb-3 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Phone Number
              </label>
              <input
                type="tel"
                value={branding.phone}
                onChange={(e) => setBranding(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium border ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            <div>
              <label className={`text-sm font-bold mb-3 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Email Address
              </label>
              <input
                type="email"
                value={branding.email}
                onChange={(e) => setBranding(prev => ({ ...prev, email: e.target.value }))}
                placeholder="agent@example.com"
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium border ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            <div>
              <label className={`text-sm font-bold mb-3 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                License Number
              </label>
              <input
                type="text"
                value={branding.licenseNumber}
                onChange={(e) => setBranding(prev => ({ ...prev, licenseNumber: e.target.value }))}
                placeholder="CA DRE #01234567"
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium border ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-8 rounded-3xl border-2 p-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Preview
        </h3>
        <p className="text-sm text-slate-500 mb-6 font-medium">
          This is how your branding will appear on marketing materials
        </p>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={branding.headshotUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover border-4 border-white" />
              <div>
                <p className="text-2xl font-black">{user.firstName} {user.lastName}</p>
                <p className="text-sm opacity-80 mt-1">{branding.tagline}</p>
                <p className="text-xs opacity-60 mt-2">
                  {branding.phone} | {branding.email}
                </p>
                <p className="text-xs opacity-60">License: {branding.licenseNumber}</p>
              </div>
            </div>
            {branding.logoUrl && (
              <img src={branding.logoUrl} alt="Logo Preview" className="h-16 object-contain" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentBrandingSettings;
