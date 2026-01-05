import React, { useState, useMemo, useRef } from 'react';
import { User, Lead, UserRole, Brokerage, Deal, MarketingAsset, MarketingFolder } from '../types.ts';
import { GoogleGenAI } from "@google/genai";

interface MarketingViewProps {
  currentUser: User;
  brokerage: Brokerage;
  leads: Lead[];
  deals: Deal[];
  agents: User[];
}

type MarketingSection = 'PRINT' | 'LIBRARY' | 'EMAIL' | 'CAMPAIGNS';
type FlyerType = 'JUST_LISTED' | 'JUST_SOLD' | 'OPEN_HOUSE' | 'PROMOTIONAL';
type FlyerTheme = 'MODERN' | 'LUXURY' | 'MINIMAL';
type EmailSubSection = 'MENU' | 'DRIP_TEMPLATES' | 'DRIP_EDITOR';

interface DripTouchpoint {
  id: string;
  day: number;
  subject: string;
  content: string;
  type: 'EMAIL' | 'SMS' | 'TASK';
}

interface DripCampaign {
  id: string;
  label: string;
  icon: string;
  desc: string;
  touchpoints: DripTouchpoint[];
}

const FOLDERS: MarketingFolder[] = [
  { id: 'f1', name: 'Standard Branding', icon: 'fa-star' },
  { id: 'f2', name: 'Legal Disclosures', icon: 'fa-scale-balanced' },
  { id: 'f3', name: 'Social Media Templates', icon: 'fa-share-nodes' },
  { id: 'f4', name: 'Brokerage Logos', icon: 'fa-building' },
];

const INITIAL_ASSETS: MarketingAsset[] = [
  { id: 'a1', name: 'Main Logo White', type: 'IMAGE', url: 'https://picsum.photos/seed/logo1/400', folderId: 'f4', createdAt: new Date().toISOString(), isBrokerageStandard: true },
  { id: 'a2', name: 'Agency Presentation PDF', type: 'PDF', url: '#', folderId: 'f1', createdAt: new Date().toISOString(), isBrokerageStandard: true },
  { id: 'a3', name: 'New Year Greeting Story', type: 'IMAGE', url: 'https://picsum.photos/seed/story1/400', folderId: 'f3', createdAt: new Date().toISOString() },
];

const DRIP_CAMPAIGNS: DripCampaign[] = [
  { 
    id: 'listed', 
    label: 'Just Listed Blitz', 
    icon: 'fa-bullhorn', 
    desc: 'Alert your sphere about a new listing immediately.',
    touchpoints: [
      { id: 'l1', day: 0, subject: 'JUST LISTED: [Property Address]', content: 'Hi [Lead Name],\n\nExciting news! We just listed a stunning new property at [Property Address]. It features [Beds] bedrooms, [Baths] bathrooms, and [Highlights].\n\nYou can see the full details and virtual tour here: [Link]\n\nAre you or anyone you know looking in this area?\n\nBest,\n[Agent Name]', type: 'EMAIL' },
      { id: 'l2', day: 2, subject: 'Quick look inside [Property Address]', content: 'Hi [Lead Name],\n\nI wanted to share a few more photos of the kitchen and outdoor space at [Property Address] that weren\'t in the initial blast. This home is truly one-of-a-kind.\n\nWould you like to schedule a private walkthrough this week?\n\nBest,\n[Agent Name]', type: 'EMAIL' },
      { id: 'l3', day: 5, subject: 'Neighborhood Market Update', content: 'Hi [Lead Name],\n\nSince listing [Property Address], we\'ve seen a lot of activity in the neighborhood. I\'ve pulled some comparable sales and active listings nearby if you\'re curious about the local market values.\n\nCheck them out here: [Link]\n\nBest,\n[Agent Name]', type: 'EMAIL' }
    ]
  },
  { 
    id: 'open', 
    label: 'Open House RSVP', 
    icon: 'fa-door-open', 
    desc: 'Invite leads to your upcoming open house event.',
    touchpoints: [
      { id: 'o1', day: 0, subject: 'INVITATION: Open House at [Property Address]', content: 'Hi [Lead Name],\n\nYou\'re invited! We\'re hosting an open house at [Property Address] this [Day] from [Time].\n\nCome by for a tour and some refreshments. It\'s a great chance to see the layout in person.\n\nRSVP here: [Link]\n\nHope to see you there!\n[Agent Name]', type: 'EMAIL' },
      { id: 'o2', day: 1, subject: 'Reminder: Open House Tomorrow', content: 'Hi [Lead Name],\n\nJust a quick reminder about our open house tomorrow at [Property Address]. We start at [Time].\n\nLet me know if you need directions or have any questions beforehand!\n\nBest,\n[Agent Name]', type: 'EMAIL' },
      { id: 'o3', day: 1, subject: 'Thanks for visiting!', content: 'Hi [Lead Name],\n\nIt was great meeting you at the open house today! I hope you liked the property. What were your thoughts on the [Highlight]?\n\nI\'ll follow up in a few days, but feel free to reach out if you want to see it again or make an offer.\n\nBest,\n[Agent Name]', type: 'EMAIL' }
    ]
  },
  { 
    id: 'sold', 
    label: 'Just Sold Success', 
    icon: 'fa-handshake', 
    desc: 'Showcase your recent results to prospects.',
    touchpoints: [
      { id: 's1', day: 0, subject: 'JUST SOLD: Another success in [Neighborhood]', content: 'Hi [Lead Name],\n\nI\'m thrilled to announce that we just successfully closed the sale of [Property Address]! \n\nWe were able to secure [Sale Price] for our clients in just [Days on Market] days. The market remains strong in your area.\n\nAre you curious what your own home might be worth in today\'s market?\n\nBest,\n[Agent Name]', type: 'EMAIL' },
      { id: 's2', day: 7, subject: 'Your Updated Home Valuation', content: 'Hi [Lead Name],\n\nFollowing my last email about the sale at [Property Address], I\'ve had several neighbors ask about their own home values.\n\nI put together a quick preliminary equity report for your property. You can view the estimate here: [Link]\n\nLet me know if you\'d like a more detailed analysis.\n\nBest,\n[Agent Name]', type: 'EMAIL' }
    ]
  },
  { 
    id: 'new', 
    label: 'New Lead Nurture', 
    icon: 'fa-seedling', 
    desc: '8-touch sequence to warm up new inquiries.',
    touchpoints: [
      { id: 'n1', day: 0, subject: 'Thanks for your inquiry!', content: 'Hi [Lead Name],\n\nThanks for reaching out! I\'m [Agent Name] with [Brokerage Name]. I saw you were looking at properties in [Area].\n\nWhat are the top 3 must-haves for your next home?\n\nI\'m here to make your search easier.\n\nBest,\n[Agent Name]', type: 'EMAIL' },
      { id: 'n2', day: 1, subject: 'Buying vs. Renting in [Area]', content: 'Hi [Lead Name],\n\nMany people I talk to are weighing the pros and cons of buying right now versus waiting. I put together this quick comparison guide for our local market.\n\n[Link: Guide]\n\nDoes this help clarify your next steps?\n\nBest,\n[Agent Name]', type: 'EMAIL' },
      { id: 'n3', day: 4, subject: 'New listings that match your search', content: 'Hi [Lead Name],\n\nI just found 3 new listings that fit the criteria we discussed. They just hit the market this morning.\n\nCheck them out here: [Link]\n\nBest,\n[Agent Name]', type: 'EMAIL' },
      { id: 'n4', day: 10, subject: 'Checking in on your search', content: 'Hi [Lead Name],\n\nJust wanted to see how your home search is going. Have your needs changed at all since we last spoke?\n\nI\'m happy to adjust the alerts I\'m sending you.\n\nBest,\n[Agent Name]', type: 'EMAIL' }
    ]
  },
  { 
    id: 'past', 
    label: 'Past Client Retention', 
    icon: 'fa-heart', 
    desc: 'Stay top-of-mind with home anniversary checks.',
    touchpoints: [
      { id: 'p1', day: 0, subject: 'Happy Home Anniversary!', content: 'Hi [Lead Name],\n\nCan you believe it\'s been [X] years since you moved into [Property Address]? I hope you\'re still loving the home and the neighborhood.\n\nIf you ever need recommendations for local contractors or want a quick equity check, I\'m always here for you.\n\nBest,\n[Agent Name]', type: 'EMAIL' },
      { id: 'p2', day: 90, subject: 'Quarterly Market Equity Update', content: 'Hi [Lead Name],\n\nI like to send these out every few months to my VIP clients. Here is a look at how home values have shifted in [Neighborhood] over the last quarter.\n\nYour equity has likely increased! Check the report here: [Link]\n\nBest,\n[Agent Name]', type: 'EMAIL' }
    ]
  },
  { 
    id: 'season', 
    label: 'Seasonal/Holiday', 
    icon: 'fa-calendar-star', 
    desc: 'Thematic greetings for holidays and seasonal shifts.',
    touchpoints: [
      { id: 'h1', day: 0, subject: 'Happy Holidays from [Agent Name]', content: 'Hi [Lead Name],\n\nWishing you and your family a wonderful holiday season and a happy New Year! \n\nI\'m so grateful for your support this past year. Looking forward to seeing what [Next Year] brings.\n\nWarmly,\n[Agent Name]', type: 'EMAIL' },
      { id: 'h2', day: 100, subject: 'Spring into a new home?', content: 'Hi [Lead Name],\n\nAs the flowers start to bloom, so does the real estate market! Spring is historically the busiest time for new listings.\n\nIf you\'re thinking of selling or buying this year, now is the time to start prepping.\n\nBest,\n[Agent Name]', type: 'EMAIL' }
    ]
  }
];

const MarketingView: React.FC<MarketingViewProps> = ({ currentUser, brokerage, leads, deals, agents }) => {
  const [activeSection, setActiveSection] = useState<MarketingSection>('PRINT');
  const [emailSubView, setEmailSubView] = useState<EmailSubSection>('MENU');
  const [selectedDrip, setSelectedDrip] = useState<DripCampaign | null>(null);

  // Print Media States
  const [selectedFlyer, setSelectedFlyer] = useState<FlyerType | null>(null);
  const [flyerTheme, setFlyerTheme] = useState<FlyerTheme>('MODERN');
  const [flyerData, setFlyerData] = useState({
    headline: '',
    address: '',
    price: '',
    beds: '4',
    baths: '3',
    sqft: '2,400',
    description: '',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    agentName: `${currentUser.firstName} ${currentUser.lastName}`,
    agentPhone: currentUser.phone || '(555) 123-4567',
    agentEmail: currentUser.email,
    brokerageName: brokerage.name,
    license: currentUser.licenseNumber || 'DRE# 01234567'
  });

  const [isGeneratingFlyer, setIsGeneratingFlyer] = useState(false);

  // Library States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [assets, setAssets] = useState<MarketingAsset[]>(INITIAL_ASSETS);

  const isAdmin = currentUser.role === UserRole.BROKER;

  const handleSelectFlyer = (type: FlyerType) => {
    setSelectedFlyer(type);
    let defaultHeadline = 'JUST LISTED';
    if (type === 'JUST_SOLD') defaultHeadline = 'JUST SOLD';
    if (type === 'OPEN_HOUSE') defaultHeadline = 'OPEN HOUSE';
    if (type === 'PROMOTIONAL') defaultHeadline = 'TOP RATED AGENT';
    
    setFlyerData(prev => ({ ...prev, headline: defaultHeadline }));
  };

  const handleSyncFromDeal = (dealId: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (deal) {
      setFlyerData(prev => ({
        ...prev,
        address: deal.address,
        price: `$${deal.salePrice.toLocaleString()}`,
        description: `Stunning property located at ${deal.address}. This home offers exceptional value and craftsmanship.`
      }));
    }
  };

  const handleAIFlyerOptimize = async () => {
    setIsGeneratingFlyer(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const prompt = `Act as a high-end real estate copywriter. 
      Generate a professional, punchy description (max 40 words) and a catchy headline for a ${selectedFlyer} flyer.
      Address: ${flyerData.address}
      Price: ${flyerData.price}
      Tone: ${flyerTheme}
      Return JSON: {"headline": "...", "description": "..."}`;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const data = JSON.parse(result.text || '{}');
      setFlyerData(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingFlyer(false);
    }
  };

  const handleDownloadFlyer = () => {
    alert("Synthesizing high-resolution PDF for print...\nYour download will begin shortly.");
  };

  const handleAssetDownload = (assetName: string) => {
    alert(`Initializing high-resolution download for: ${assetName}`);
  };

  const handleAssetDelete = (assetId: string) => {
    if (confirm("Are you sure you want to permanently delete this master asset from the library?")) {
      setAssets(prev => prev.filter(a => a.id !== assetId));
    }
  };

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        alert(`Uploading "${file.name}" to Cloud CDN...\nProgress: 100%`);
        const newAsset: MarketingAsset = {
          id: `a_new_${Date.now()}`,
          name: file.name,
          type: 'IMAGE',
          url: URL.createObjectURL(file),
          folderId: selectedFolder || 'f1',
          createdAt: new Date().toISOString()
        };
        setAssets(prev => [newAsset, ...prev]);
      }
    };
    input.click();
  };

  const handleEmailBlast = () => {
    alert(`Pre-processing ${leads.length} recipients for Bulk Blast...\n\nCampaign is ready for final approval.`);
  };

  const handleQuickEmail = () => {
    alert("Opening Single Email Composer...\n\nRecipient: [Select Lead]");
  };

  const handleDripSelection = (campaign: DripCampaign) => {
    setSelectedDrip(campaign);
    setEmailSubView('DRIP_EDITOR');
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-500 pb-32">
      {/* Dynamic Navigation Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-[100px]"></div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center space-x-3 bg-white/10 w-fit px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
            <i className="fas fa-bolt text-indigo-400 text-xs"></i>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Marketing Intelligence</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">Marketing Hub</h1>
          <p className="text-slate-400 font-medium text-base">Centralized co-pilot for high-performance real estate creative.</p>
        </div>

        <div className="flex bg-white/5 p-2 rounded-[2rem] border border-white/10 backdrop-blur-xl relative z-10 shrink-0">
          {[
            { id: 'PRINT', label: 'Print Media', icon: 'fa-print' },
            { id: 'EMAIL', label: 'Mail Outreach', icon: 'fa-envelope-open-text' },
            { id: 'LIBRARY', label: 'Asset Library', icon: 'fa-folder-tree' },
            { id: 'CAMPAIGNS', label: 'Campaigns', icon: 'fa-chart-line' },
          ].map(sec => (
            <button 
              key={sec.id}
              onClick={() => setActiveSection(sec.id as MarketingSection)}
              className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center space-x-3 ${activeSection === sec.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <i className={`fas ${sec.icon}`}></i>
              <span className="hidden xl:inline">{sec.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'PRINT' && (
        <div className="animate-in fade-in duration-500">
          {!selectedFlyer ? (
            <div className="space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-4">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select a Flyer Template</h2>
                <p className="text-slate-500 font-medium">Pick a pre-made design to customize and print in seconds.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { id: 'JUST_LISTED', label: 'Just Listed', icon: 'fa-house-fire', color: 'bg-blue-600', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80' },
                  { id: 'JUST_SOLD', label: 'Just Sold', icon: 'fa-handshake-angle', color: 'bg-emerald-600', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80' },
                  { id: 'OPEN_HOUSE', label: 'Open House', icon: 'fa-door-open', color: 'bg-indigo-600', img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80' },
                  { id: 'PROMOTIONAL', label: 'Promotional', icon: 'fa-star', color: 'bg-amber-600', img: 'https://images.unsplash.com/photo-1454165833767-027ffea9e78b?auto=format&fit=crop&w=400&q=80' },
                ].map(flyer => (
                  <button 
                    key={flyer.id}
                    onClick={() => handleSelectFlyer(flyer.id as FlyerType)}
                    className="group bg-white border border-slate-200 rounded-[3rem] overflow-hidden hover:border-indigo-500 hover:shadow-2xl transition-all text-left flex flex-col"
                  >
                    <div className="aspect-[3/4] relative overflow-hidden">
                       <img src={flyer.img} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt={flyer.label} />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                          <h4 className="text-2xl font-black text-white">{flyer.label}</h4>
                       </div>
                    </div>
                    <div className="p-8 flex items-center justify-between">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg shadow-lg ${flyer.color}`}>
                          <i className={`fas ${flyer.icon}`}></i>
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 group-hover:underline">Customize Flyer</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
               {/* Left Side: Editor Form */}
               <div className="lg:col-span-4 space-y-6 sticky top-6 max-h-[90vh] overflow-y-auto pr-2 scrollbar-hide pb-10">
                 <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                   <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                      <button onClick={() => setSelectedFlyer(null)} className="text-slate-400 hover:text-indigo-600 transition-colors"><i className="fas fa-arrow-left mr-2"></i>Templates</button>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Flyer Editor</h3>
                   </div>

                   <div className="space-y-6">
                     <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sync from Listing</label>
                       <select 
                         onChange={(e) => handleSyncFromDeal(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold text-xs outline-none"
                       >
                         <option value="">-- Manual Entry --</option>
                         {deals.map(d => <option key={d.id} value={d.id}>{d.address}</option>)}
                       </select>
                     </div>

                     <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Flyer Theme</label>
                       <div className="grid grid-cols-3 gap-2">
                         {(['MODERN', 'LUXURY', 'MINIMAL'] as FlyerTheme[]).map(th => (
                           <button 
                             key={th}
                             onClick={() => setFlyerTheme(th)}
                             className={`py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${flyerTheme === th ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-300'}`}
                           >
                             {th}
                           </button>
                         ))}
                       </div>
                     </div>

                     <div className="space-y-4">
                       <input type="text" placeholder="Headline" value={flyerData.headline} onChange={e => setFlyerData({...flyerData, headline: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" />
                       <input type="text" placeholder="Address" value={flyerData.address} onChange={e => setFlyerData({...flyerData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" />
                       <div className="grid grid-cols-2 gap-4">
                         <input type="text" placeholder="Price" value={flyerData.price} onChange={e => setFlyerData({...flyerData, price: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" />
                         <input type="text" placeholder="Sqft" value={flyerData.sqft} onChange={e => setFlyerData({...flyerData, sqft: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" />
                       </div>
                       <textarea 
                         placeholder="Description" 
                         value={flyerData.description} 
                         onChange={e => setFlyerData({...flyerData, description: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none min-h-[100px] resize-none" 
                       />
                       <button 
                         onClick={handleAIFlyerOptimize}
                         disabled={isGeneratingFlyer}
                         className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-indigo-100 transition-all flex items-center justify-center space-x-2"
                       >
                         {isGeneratingFlyer ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-magic"></i>}
                         <span>Optimize Copy with AI</span>
                       </button>
                     </div>

                     <div className="pt-4 space-y-3">
                       <button onClick={handleDownloadFlyer} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.1em] text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3">
                         <i className="fas fa-file-pdf"></i>
                         <span>Download Print PDF</span>
                       </button>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Right Side: Live Canvas Preview */}
               <div className="lg:col-span-8 bg-slate-200 rounded-[4rem] p-12 flex items-center justify-center overflow-hidden min-h-[90vh] shadow-inner border-4 border-white/50">
                  <div 
                    id="flyer-canvas"
                    className={`aspect-[8.5/11] bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] w-full max-w-[550px] relative flex flex-col p-10 overflow-hidden transform transition-all duration-700 scale-100 hover:scale-[1.02] border-8 ${flyerTheme === 'LUXURY' ? 'border-slate-900' : 'border-white'}`}
                  >
                    <div className="flex-1 flex flex-col space-y-6">
                       <div className="flex justify-between items-center">
                          <div className={`px-5 py-2 rounded-full font-black text-white text-[10px] tracking-[0.3em] uppercase ${flyerTheme === 'LUXURY' ? 'bg-slate-900' : flyerTheme === 'MODERN' ? 'bg-indigo-600' : 'bg-slate-400'}`}>
                            {flyerData.headline || 'JUST LISTED'}
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{brokerage.name}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase">Legacy Collection</p>
                          </div>
                       </div>

                       <div className="aspect-[4/3] bg-slate-100 rounded-3xl overflow-hidden shadow-xl border-4 border-white">
                          <img src={flyerData.image} className="w-full h-full object-cover" alt="Property" />
                       </div>

                       <div className="space-y-1">
                          <h2 className={`text-3xl font-black tracking-tighter leading-none ${flyerTheme === 'LUXURY' ? 'text-slate-900 font-serif' : 'text-slate-900'}`}>{flyerData.address || 'Property Address'}</h2>
                          <div className="flex items-center space-x-3 text-indigo-600 font-black text-xl">
                             <span>{flyerData.price || '$ Price TBD'}</span>
                             <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                             <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">{flyerData.sqft} SQFT</span>
                          </div>
                       </div>

                       <div className="flex space-x-6 py-4 border-y border-slate-100">
                          <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Beds</p>
                            <p className="text-base font-black text-slate-800">{flyerData.beds}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Baths</p>
                            <p className="text-base font-black text-slate-800">{flyerData.baths}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Status</p>
                            <p className="text-base font-black text-emerald-600">Available</p>
                          </div>
                       </div>

                       <p className="text-sm text-slate-600 font-medium leading-relaxed flex-1">
                         {flyerData.description || 'Enter a compelling description for this property in the editor to see it appear here live.'}
                       </p>

                       <div className={`mt-auto pt-8 border-t-2 flex items-center justify-between ${flyerTheme === 'LUXURY' ? 'border-slate-900' : 'border-slate-100'}`}>
                          <div className="flex items-center space-x-4">
                             <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shadow-md">
                                <img src={currentUser.avatar} className="w-full h-full object-cover" alt="Agent" />
                             </div>
                             <div>
                                <p className="text-base font-black text-slate-900 leading-none">{flyerData.agentName}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Listing Expert</p>
                                <p className="text-[9px] font-black text-indigo-600 uppercase mt-1">{flyerData.license}</p>
                             </div>
                          </div>
                          <div className="text-right space-y-0.5">
                             <p className="text-[11px] font-black text-slate-800">{flyerData.agentPhone}</p>
                             <p className="text-[10px] font-bold text-slate-500">{flyerData.agentEmail}</p>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'LIBRARY' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1 space-y-8">
             <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assets Library</h4>
                   {isAdmin && <button onClick={() => alert("Enter folder name...")} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">+ New Folder</button>}
                </div>
                <div className="space-y-2">
                   <button onClick={() => setSelectedFolder(null)} className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all ${!selectedFolder ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                      <i className="fas fa-grid-2"></i>
                      <span className="text-sm font-black tracking-tight">All Assets</span>
                   </button>
                   {FOLDERS.map(folder => (
                      <button key={folder.id} onClick={() => setSelectedFolder(folder.id)} className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all ${selectedFolder === folder.id ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                         <i className={`fas ${folder.icon}`}></i>
                         <span className="text-sm font-black tracking-tight">{folder.name}</span>
                      </button>
                   ))}
                </div>
             </div>

             <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-4">
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Storage Status</h5>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 w-1/4"></div>
                </div>
                <p className="text-[10px] font-bold text-slate-400">12.4 GB / 50 GB Used (Basic Plan)</p>
             </div>
          </div>

          <div className="lg:col-span-3 space-y-8">
             <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="relative flex-1 max-w-md">
                   <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                   <input type="text" placeholder="Search assets..." className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                {isAdmin && (
                  <button onClick={handleUploadClick} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center space-x-3">
                     <i className="fas fa-cloud-arrow-up"></i>
                     <span>Upload Asset</span>
                  </button>
                )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {assets.filter(a => (!selectedFolder || a.folderId === selectedFolder) && a.name.toLowerCase().includes(searchQuery.toLowerCase())).map(asset => (
                   <div key={asset.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-6 hover:border-indigo-400 hover:shadow-xl transition-all group relative">
                      <div className="aspect-square bg-slate-50 rounded-[2rem] mb-6 flex items-center justify-center overflow-hidden relative border border-slate-100">
                         {asset.type === 'IMAGE' ? (
                            <img src={asset.url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={asset.name} />
                         ) : (
                            <i className={`fas ${asset.type === 'PDF' ? 'fa-file-pdf' : 'fa-film'} text-4xl text-slate-200`}></i>
                         )}
                         <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                            <button onClick={() => window.open(asset.url, '_blank')} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-2xl hover:scale-110 transition-transform"><i className="fas fa-eye"></i></button>
                            <button onClick={() => handleAssetDownload(asset.name)} className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-2xl hover:scale-110 transition-transform"><i className="fas fa-download"></i></button>
                            {isAdmin && <button onClick={() => handleAssetDelete(asset.id)} className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform"><i className="fas fa-trash"></i></button>}
                         </div>
                      </div>
                      <div className="space-y-1">
                         <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-slate-800 tracking-tight truncate pr-4">{asset.name}</h4>
                            {asset.isBrokerageStandard && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded-lg border border-indigo-100">Standard</span>}
                         </div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.type} • {new Date(asset.createdAt).toLocaleDateString()}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {activeSection === 'EMAIL' && (
         <div className="bg-white rounded-[4rem] border border-slate-200 p-20 text-center space-y-10 animate-in zoom-in-95 duration-500 min-h-[600px]">
            {emailSubView === 'MENU' ? (
              <>
                <div className="max-w-2xl mx-auto space-y-4">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Mail Outreach</h2>
                  <p className="text-lg text-slate-500 font-medium leading-relaxed">Design and deploy high-performance email campaigns with one click.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                   {[
                     { id: 'SEND', label: 'Single Email', desc: 'Compose a direct message to any contact.', icon: 'fa-envelope', color: 'bg-blue-50 text-blue-600', action: handleQuickEmail },
                     { id: 'BLAST', label: 'Bulk Blast', desc: 'Send to lists or entire database.', icon: 'fa-paper-plane-top', color: 'bg-indigo-50 text-indigo-600', action: handleEmailBlast },
                     { id: 'DRIP', label: 'Drip Sequence', desc: 'Ready-made real estate automated sequences.', icon: 'fa-arrows-spin', color: 'bg-emerald-50 text-emerald-600', action: () => setEmailSubView('DRIP_TEMPLATES') },
                   ].map((item, i) => (
                      <div key={i} onClick={item.action} className="p-10 rounded-[3rem] bg-slate-50 border border-slate-100 hover:border-indigo-400 transition-all group cursor-pointer">
                         <div className={`w-16 h-16 ${item.color} rounded-[1.5rem] flex items-center justify-center text-2xl mx-auto mb-8 shadow-sm group-hover:scale-110 transition-transform`}><i className={`fas ${item.icon}`}></i></div>
                         <h4 className="text-lg font-black text-slate-800 mb-2">{item.label}</h4>
                         <p className="text-sm text-slate-500 font-semibold">{item.desc}</p>
                      </div>
                   ))}
                </div>
              </>
            ) : emailSubView === 'DRIP_TEMPLATES' ? (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between border-b border-slate-100 pb-8">
                   <button onClick={() => setEmailSubView('MENU')} className="flex items-center space-x-2 text-slate-400 hover:text-indigo-600 transition-colors font-black uppercase tracking-widest text-[10px]"><i className="fas fa-arrow-left"></i><span>Back</span></button>
                   <h3 className="text-2xl font-black text-slate-800 tracking-tight">Ready-Made Drip Campaigns</h3>
                   <div className="w-20"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                   {DRIP_CAMPAIGNS.map(campaign => (
                     <div key={campaign.id} onClick={() => handleDripSelection(campaign)} className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] hover:bg-white hover:border-indigo-400 transition-all group cursor-pointer text-left flex flex-col justify-between">
                        <div className="space-y-6">
                           <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 text-xl shadow-sm"><i className={`fas ${campaign.icon}`}></i></div>
                           <div><h4 className="text-lg font-black text-slate-900 tracking-tight">{campaign.label}</h4><p className="text-sm text-slate-500 font-semibold leading-relaxed">{campaign.desc}</p></div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-200/60 flex items-center justify-between">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{campaign.touchpoints.length} Steps</span>
                           <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Select Sequence</span>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500 text-left max-w-6xl mx-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-8">
                   <button onClick={() => setEmailSubView('DRIP_TEMPLATES')} className="flex items-center space-x-2 text-slate-400 hover:text-indigo-600 transition-colors font-black uppercase tracking-widest text-[10px]"><i className="fas fa-arrow-left"></i><span>Back</span></button>
                   <div><h3 className="text-3xl font-black text-slate-900 tracking-tight">{selectedDrip?.label}</h3><p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Sequence Editor</p></div>
                   <button onClick={() => { alert('Campaign Launching...'); setEmailSubView('MENU'); }} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]">Launch Campaign</button>
                </div>
                <div className="space-y-8">
                  {selectedDrip?.touchpoints.map((tp, idx) => (
                    <div key={tp.id} className="relative pl-12 border-l-2 border-slate-100 pb-8 last:pb-0">
                       <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-white border-4 border-indigo-500 flex items-center justify-center font-black text-[10px] text-indigo-600 shadow-sm">{idx + 1}</div>
                       <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8">
                          <div className="flex items-center justify-between mb-6">
                             <div><p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Day {tp.day === 0 ? 'Immediate' : tp.day}</p><h4 className="text-xl font-black text-slate-800">{tp.subject}</h4></div>
                          </div>
                          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-inner font-mono text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                             {tp.content.replace('[Agent Name]', `${currentUser.firstName} ${currentUser.lastName}`).replace('[Brokerage Name]', brokerage.name)}
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
         </div>
      )}

      {activeSection === 'CAMPAIGNS' && (
         <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <StatCard label="Total Reach" value="42.5K" icon="fa-users" color="text-indigo-600 bg-indigo-50" />
               <StatCard label="Avg Click Rate" value="12.4%" icon="fa-mouse-pointer" color="text-emerald-600 bg-emerald-50" />
               <StatCard label="Leads Generated" value="142" icon="fa-user-plus" color="text-amber-600 bg-amber-50" />
            </div>
            <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm">
               <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Active Campaigns</h3>
               </div>
               <div className="divide-y divide-slate-100">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-8 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                       <div className="flex items-center space-x-6">
                          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 font-black text-lg group-hover:bg-indigo-100 transition-colors">#{i}</div>
                          <div>
                             <h4 className="text-lg font-black text-slate-800 tracking-tight">Just Listed Blitz: {i === 1 ? '1725 Slough Ave' : i === 2 ? '42 Wallaby Way' : '10 Downing Street'}</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: <span className="text-emerald-500">Live • Tracking</span></p>
                          </div>
                       </div>
                       <div className="flex items-center space-x-12 pr-10">
                          <div className="text-center">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Impressions</p>
                             <p className="text-lg font-black text-slate-800">{Math.floor(Math.random() * 15000 + 5000).toLocaleString()}</p>
                          </div>
                          <button onClick={() => alert("Fetching detailed analytics...")} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-indigo-600 transition-all"><i className="fas fa-chart-pie"></i></button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-400 transition-all">
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
    </div>
    <div className={`w-16 h-16 ${color} rounded-[1.5rem] flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-110`}>
      <i className={`fas ${icon}`}></i>
    </div>
  </div>
);

export default MarketingView;