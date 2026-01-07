import React, { useState } from 'react';
import { User } from '../types.ts';
import { generateSocialCaptions } from '../services/marketingService.ts';

interface SocialCaptionGeneratorProps {
  user: User;
  isDarkMode: boolean;
}

interface PropertyDetails {
  address: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
}

interface GeneratedCaptions {
  instagram: string;
  facebook: string;
  linkedin: string;
}

const SocialCaptionGenerator: React.FC<SocialCaptionGeneratorProps> = ({ user, isDarkMode }) => {
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails>({
    address: '',
    price: '',
    beds: '',
    baths: '',
    sqft: ''
  });

  const [captions, setCaptions] = useState<GeneratedCaptions | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!propertyDetails.address || !propertyDetails.price) {
      alert('Please enter at least the address and price');
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await generateSocialCaptions(propertyDetails);
      setCaptions(generated);
    } catch (error) {
      console.error('Failed to generate captions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (platform: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      instagram: 'fa-instagram',
      facebook: 'fa-facebook',
      linkedin: 'fa-linkedin'
    };
    return icons[platform as keyof typeof icons];
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      instagram: 'from-pink-500 to-purple-600',
      facebook: 'from-blue-500 to-indigo-600',
      linkedin: 'from-blue-600 to-cyan-600'
    };
    return colors[platform as keyof typeof colors];
  };

  return (
    <div className={`rounded-3xl border-2 p-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
          <i className="fas fa-sparkles text-white text-xl"></i>
        </div>
        <div>
          <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            AI Social Share
          </h3>
          <p className="text-xs text-slate-500 font-medium">Generate captions for social media</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className={`text-xs font-bold mb-2 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Property Address *
          </label>
          <input
            type="text"
            value={propertyDetails.address}
            onChange={(e) => setPropertyDetails(prev => ({ ...prev, address: e.target.value }))}
            placeholder="123 Main St, Los Angeles, CA 90001"
            className={`w-full px-4 py-3 rounded-xl text-sm font-medium border ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-xs font-bold mb-2 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Price *
            </label>
            <input
              type="text"
              value={propertyDetails.price}
              onChange={(e) => setPropertyDetails(prev => ({ ...prev, price: e.target.value }))}
              placeholder="$850,000"
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium border ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
          <div>
            <label className={`text-xs font-bold mb-2 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Square Feet
            </label>
            <input
              type="text"
              value={propertyDetails.sqft}
              onChange={(e) => setPropertyDetails(prev => ({ ...prev, sqft: e.target.value }))}
              placeholder="2,000"
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium border ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-xs font-bold mb-2 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Bedrooms
            </label>
            <input
              type="text"
              value={propertyDetails.beds}
              onChange={(e) => setPropertyDetails(prev => ({ ...prev, beds: e.target.value }))}
              placeholder="3"
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium border ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
          <div>
            <label className={`text-xs font-bold mb-2 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Bathrooms
            </label>
            <input
              type="text"
              value={propertyDetails.baths}
              onChange={(e) => setPropertyDetails(prev => ({ ...prev, baths: e.target.value }))}
              placeholder="2"
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium border ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
            isGenerating
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700'
          } text-white`}
        >
          {isGenerating ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Generating with AI...
            </>
          ) : (
            <>
              <i className="fas fa-wand-magic-sparkles mr-2"></i>
              Generate Captions
            </>
          )}
        </button>
      </div>

      {captions && (
        <div className="space-y-4">
          <div className={`h-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>

          {(['instagram', 'facebook', 'linkedin'] as const).map((platform) => (
            <div
              key={platform}
              className={`rounded-xl border p-4 ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getPlatformColor(platform)} flex items-center justify-center`}>
                    <i className={`fab ${getPlatformIcon(platform)} text-white text-sm`}></i>
                  </div>
                  <span className={`text-sm font-black capitalize ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {platform}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(platform, captions[platform])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    copiedPlatform === platform
                      ? 'bg-emerald-500 text-white'
                      : isDarkMode
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {copiedPlatform === platform ? (
                    <>
                      <i className="fas fa-check mr-1"></i>
                      Copied
                    </>
                  ) : (
                    <>
                      <i className="fas fa-copy mr-1"></i>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {captions[platform]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialCaptionGenerator;
