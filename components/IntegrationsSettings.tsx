
import React, { useState } from 'react';
import { IntegrationProvider, Brokerage } from '../types';

interface IntegrationsSettingsProps {
  brokerage: Brokerage;
}

const INITIAL_PROVIDERS: IntegrationProvider[] = [
  {
    id: 'zillow',
    name: 'Zillow Tech Connect',
    icon: 'fas fa-house-chimney',
    status: 'ACTIVE',
    webhookUrl: 'https://api.agentdesk360.com/v1/ingest/zillow/brk_7721',
    apiKey: 'zk_live_55219928341',
    lastIngestionAt: new Date().toISOString()
  },
  {
    id: 'realtor',
    name: 'Realtor.com Leads',
    icon: 'fas fa-house-circle-check',
    status: 'ACTIVE',
    webhookUrl: 'https://api.agentdesk360.com/v1/ingest/realtor/brk_7721',
    apiKey: 'rk_live_99211002345',
    lastIngestionAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'upnest',
    name: 'UpNest Integration',
    icon: 'fas fa-rocket',
    status: 'INACTIVE',
    webhookUrl: 'https://api.agentdesk360.com/v1/ingest/upnest/brk_7721'
  },
  {
    id: 'fastexpert',
    name: 'FastExpert',
    icon: 'fas fa-bolt',
    status: 'INACTIVE',
    webhookUrl: 'https://api.agentdesk360.com/v1/ingest/fastexpert/brk_7721'
  },
  {
    id: 'custom',
    name: 'Custom Website Hook',
    icon: 'fas fa-code',
    status: 'ACTIVE',
    webhookUrl: 'https://api.agentdesk360.com/v1/ingest/webhook/brk_7721',
    apiKey: 'ck_live_1122334455'
  }
];

const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({ brokerage }) => {
  const [providers, setProviders] = useState<IntegrationProvider[]>(INITIAL_PROVIDERS);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleStatus = (id: string) => {
    setProviders(prev => prev.map(p => 
      p.id === id ? { ...p, status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : p
    ));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-1">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">Lead API Integrations</h3>
        <p className="text-sm text-slate-500 font-medium">Configure automated ingestion from third-party portals and custom websites.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map(provider => (
          <div key={provider.id} className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm hover:border-indigo-300 transition-all flex flex-col group">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-sm ${provider.status === 'ACTIVE' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400 grayscale'}`}>
                  <i className={provider.icon}></i>
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800">{provider.name}</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {provider.status === 'ACTIVE' ? `Last sync: ${new Date(provider.lastIngestionAt || '').toLocaleDateString()}` : 'Connection Pending'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => toggleStatus(provider.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  provider.status === 'ACTIVE' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {provider.status}
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Webhook Endpoint</label>
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 group-hover:bg-white group-hover:border-slate-200 transition-all">
                  <code className="text-xs text-indigo-600 font-bold truncate flex-1">{provider.webhookUrl}</code>
                  <button 
                    onClick={() => copyToClipboard(provider.webhookUrl, provider.id + '-url')}
                    className="text-slate-300 hover:text-indigo-600 transition-colors"
                  >
                    <i className={`fas ${copiedId === provider.id + '-url' ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                  </button>
                </div>
              </div>

              {provider.apiKey && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API Header Secret</label>
                  <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 group-hover:bg-white group-hover:border-slate-200 transition-all">
                    <code className="text-xs text-slate-500 font-bold truncate flex-1">••••••••••••••••••••</code>
                    <button 
                      onClick={() => copyToClipboard(provider.apiKey || '', provider.id + '-key')}
                      className="text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      <i className={`fas ${copiedId === provider.id + '-key' ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50">
               <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center hover:translate-x-1 transition-transform">
                 View Ingestion Logs <i className="fas fa-arrow-right ml-2"></i>
               </button>
            </div>
          </div>
        ))}

        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center group hover:border-indigo-300 hover:bg-white transition-all cursor-pointer">
           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-4 group-hover:text-indigo-500 shadow-sm transition-colors">
              <i className="fas fa-plus text-2xl"></i>
           </div>
           <h4 className="text-lg font-black text-slate-400 group-hover:text-slate-800 transition-colors">Add Custom Provider</h4>
           <p className="text-xs text-slate-400 font-medium max-w-[200px] mt-2">Connect your custom CRM or marketing stack via API.</p>
        </div>
      </div>

      <div className="bg-indigo-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3">
             <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                 <i className="fas fa-shield-check"></i>
               </div>
               <h4 className="text-xl font-black tracking-tight">API Security Monitor</h4>
             </div>
             <p className="text-indigo-200 text-sm font-medium max-w-md">Your API endpoints are protected by 256-bit encryption. All incoming lead data is sanitized and validated against your brokerage schema automatically.</p>
          </div>
          <button className="px-8 py-4 bg-white text-indigo-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-50 transition-all shrink-0">
            Download SDK Documentation
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsSettings;
