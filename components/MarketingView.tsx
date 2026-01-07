import React, { useState } from 'react';
import { User } from '../types.ts';
import FlyerEditor from './FlyerEditor.tsx';
import MediaLibrary from './MediaLibrary.tsx';
import SocialCaptionGenerator from './SocialCaptionGenerator.tsx';
import AgentBrandingSettings from './AgentBrandingSettings.tsx';

interface MarketingViewProps {
  user: User;
  isDarkMode: boolean;
}

type ActiveEditor = 'JUST_LISTED' | 'JUST_SOLD' | 'OPEN_HOUSE' | 'PROPERTY_PROMOTION' | null;

const MarketingView: React.FC<MarketingViewProps> = ({ user, isDarkMode }) => {
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const [showBranding, setShowBranding] = useState(false);

  if (activeEditor) {
    return (
      <FlyerEditor
        templateType={activeEditor}
        user={user}
        onClose={() => setActiveEditor(null)}
        isDarkMode={isDarkMode}
      />
    );
  }

  if (showBranding) {
    return (
      <AgentBrandingSettings
        user={user}
        onClose={() => setShowBranding(false)}
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Marketing Hub
          </h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Create stunning marketing materials and social media content
          </p>
        </div>
        <button
          onClick={() => setShowBranding(true)}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
            isDarkMode
              ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700'
              : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700'
          }`}
        >
          <i className="fas fa-user-tie mr-2"></i>
          Agent Branding
        </button>
      </div>

      <div className={`rounded-3xl border-2 p-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <i className="fas fa-palette text-white text-xl"></i>
          </div>
          <div>
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Creative Studio
            </h3>
            <p className="text-xs text-slate-500 font-medium">Professional flyer templates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: 'JUST_LISTED' as const, label: 'Just Listed', icon: 'fa-house-circle-check', gradient: 'from-emerald-500 to-teal-600' },
            { id: 'JUST_SOLD' as const, label: 'Just Sold', icon: 'fa-handshake', gradient: 'from-rose-500 to-pink-600' },
            { id: 'OPEN_HOUSE' as const, label: 'Open House', icon: 'fa-door-open', gradient: 'from-orange-500 to-amber-600' },
            { id: 'PROPERTY_PROMOTION' as const, label: 'Property Promotion', icon: 'fa-bullhorn', gradient: 'from-purple-500 to-violet-600' }
          ].map((template) => (
            <button
              key={template.id}
              onClick={() => setActiveEditor(template.id)}
              className={`group relative overflow-hidden rounded-2xl border-2 p-6 transition-all hover:scale-105 hover:shadow-2xl ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 hover:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 hover:border-indigo-500'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${template.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
              <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${template.gradient} flex items-center justify-center shadow-lg`}>
                  <i className={`fas ${template.icon} text-white text-2xl`}></i>
                </div>
                <div>
                  <p className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {template.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Click to create</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <MediaLibrary user={user} isDarkMode={isDarkMode} />
        <SocialCaptionGenerator user={user} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
};

export default MarketingView;
