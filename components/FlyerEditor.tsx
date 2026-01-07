import React, { useState, useRef } from 'react';
import { User } from '../types.ts';

interface FlyerEditorProps {
  templateType: 'JUST_LISTED' | 'JUST_SOLD' | 'OPEN_HOUSE' | 'PROPERTY_PROMOTION';
  user: User;
  onClose: () => void;
  isDarkMode: boolean;
}

interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'black';
  color: string;
}

interface ImageElement {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const FlyerEditor: React.FC<FlyerEditorProps> = ({ templateType, user, onClose, isDarkMode }) => {
  const [textElements, setTextElements] = useState<TextElement[]>([
    { id: 't1', content: 'Property Address', x: 50, y: 100, fontSize: 32, fontWeight: 'black', color: '#1e293b' },
    { id: 't2', content: '$XXX,XXX', x: 50, y: 160, fontSize: 48, fontWeight: 'black', color: '#0f172a' },
    { id: 't3', content: '3 Beds | 2 Baths | 2,000 sqft', x: 50, y: 220, fontSize: 20, fontWeight: 'normal', color: '#64748b' }
  ]);

  const [imageElements, setImageElements] = useState<ImageElement[]>([
    { id: 'img1', url: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800', x: 50, y: 300, width: 700, height: 400 }
  ]);

  const [agentBranding] = useState({
    headshot: user.avatar || '',
    name: `${user.firstName} ${user.lastName}`,
    phone: user.phone || '',
    email: user.email || '',
    license: user.licenseNumber || ''
  });

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const getTemplateTitle = () => {
    const titles = {
      'JUST_LISTED': 'Just Listed',
      'JUST_SOLD': 'Just Sold',
      'OPEN_HOUSE': 'Open House',
      'PROPERTY_PROMOTION': 'Property Promotion'
    };
    return titles[templateType];
  };

  const getTemplateColor = () => {
    const colors = {
      'JUST_LISTED': 'bg-emerald-500',
      'JUST_SOLD': 'bg-rose-500',
      'OPEN_HOUSE': 'bg-orange-500',
      'PROPERTY_PROMOTION': 'bg-purple-500'
    };
    return colors[templateType];
  };

  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const addTextElement = () => {
    const newElement: TextElement = {
      id: `t${Date.now()}`,
      content: 'New Text',
      x: 100,
      y: 100,
      fontSize: 24,
      fontWeight: 'normal',
      color: '#000000'
    };
    setTextElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
  };

  const handleExportImage = async () => {
    alert('Flyer exported! In production, this would generate a high-quality image or PDF.');
  };

  const handleExportPDF = async () => {
    alert('PDF export coming soon! This would generate a print-ready PDF.');
  };

  return (
    <div className="h-full flex flex-col">
      <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
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
            <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {getTemplateTitle()} Editor
            </h3>
            <p className="text-xs text-slate-500 font-medium">Design your marketing flyer</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportImage}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all"
          >
            <i className="fas fa-image mr-2"></i>
            Export Image
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 transition-all"
          >
            <i className="fas fa-file-pdf mr-2"></i>
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`w-80 border-r overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="p-6 space-y-6">
            <div>
              <h4 className={`text-sm font-black uppercase tracking-wider mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Tools
              </h4>
              <div className="space-y-2">
                <button
                  onClick={addTextElement}
                  className={`w-full px-4 py-3 rounded-xl font-bold text-sm text-left flex items-center space-x-3 transition-all ${
                    isDarkMode
                      ? 'bg-slate-800 text-white hover:bg-slate-700'
                      : 'bg-white text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <i className="fas fa-plus-circle text-indigo-500"></i>
                  <span>Add Text</span>
                </button>
              </div>
            </div>

            {selectedElement && textElements.find(el => el.id === selectedElement) && (
              <div className={`rounded-2xl border p-4 space-y-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <h4 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Text Properties
                </h4>
                {(() => {
                  const element = textElements.find(el => el.id === selectedElement)!;
                  return (
                    <>
                      <div>
                        <label className={`text-xs font-bold mb-2 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Content
                        </label>
                        <input
                          type="text"
                          value={element.content}
                          onChange={(e) => updateTextElement(element.id, { content: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg text-sm font-medium ${
                            isDarkMode
                              ? 'bg-slate-900 border-slate-600 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          } border`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs font-bold mb-2 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Size
                          </label>
                          <input
                            type="number"
                            value={element.fontSize}
                            onChange={(e) => updateTextElement(element.id, { fontSize: parseInt(e.target.value) })}
                            className={`w-full px-3 py-2 rounded-lg text-sm font-medium ${
                              isDarkMode
                                ? 'bg-slate-900 border-slate-600 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            } border`}
                          />
                        </div>
                        <div>
                          <label className={`text-xs font-bold mb-2 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Color
                          </label>
                          <input
                            type="color"
                            value={element.color}
                            onChange={(e) => updateTextElement(element.id, { color: e.target.value })}
                            className="w-full h-10 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <label className={`text-xs font-bold mb-2 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Weight
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['normal', 'bold', 'black'] as const).map(weight => (
                            <button
                              key={weight}
                              onClick={() => updateTextElement(element.id, { fontWeight: weight })}
                              className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                                element.fontWeight === weight
                                  ? 'bg-indigo-600 text-white'
                                  : isDarkMode
                                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {weight}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className={`rounded-2xl border p-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h4 className={`text-sm font-black uppercase tracking-wider mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Agent Branding
              </h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <img src={agentBranding.headshot} alt="Agent" className="w-12 h-12 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {agentBranding.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{agentBranding.phone}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Your branding will automatically appear on exported flyers
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex-1 overflow-auto ${isDarkMode ? 'bg-slate-950' : 'bg-slate-100'} p-8`}>
          <div className="max-w-4xl mx-auto">
            <div
              ref={canvasRef}
              className="relative bg-white shadow-2xl rounded-2xl overflow-hidden"
              style={{ width: '800px', height: '1000px', margin: '0 auto' }}
            >
              <div className={`absolute top-0 left-0 right-0 h-32 ${getTemplateColor()} flex items-center justify-center`}>
                <h2 className="text-white text-5xl font-black tracking-tight">{getTemplateTitle()}</h2>
              </div>

              {textElements.map((element) => (
                <div
                  key={element.id}
                  onClick={() => setSelectedElement(element.id)}
                  className={`absolute cursor-move hover:ring-2 hover:ring-indigo-500 rounded px-2 ${
                    selectedElement === element.id ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  style={{
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    fontSize: `${element.fontSize}px`,
                    fontWeight: element.fontWeight === 'black' ? 900 : element.fontWeight === 'bold' ? 700 : 400,
                    color: element.color
                  }}
                >
                  {element.content}
                </div>
              ))}

              {imageElements.map((element) => (
                <img
                  key={element.id}
                  src={element.url}
                  alt="Property"
                  className="absolute object-cover rounded-xl"
                  style={{
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    width: `${element.width}px`,
                    height: `${element.height}px`
                  }}
                />
              ))}

              <div className="absolute bottom-0 left-0 right-0 bg-slate-900 text-white p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img src={agentBranding.headshot} alt="Agent" className="w-16 h-16 rounded-full object-cover border-4 border-white" />
                  <div>
                    <p className="text-xl font-black">{agentBranding.name}</p>
                    <p className="text-sm opacity-80">{agentBranding.phone} | {agentBranding.email}</p>
                    <p className="text-xs opacity-60 mt-1">License: {agentBranding.license}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black">Contact Me</p>
                  <p className="text-sm opacity-80">For a private showing</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlyerEditor;
