import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailTemplatesManagerProps {
  onClose: () => void;
  isDarkMode: boolean;
}

const EmailTemplatesManager: React.FC<EmailTemplatesManagerProps> = ({
  onClose,
  isDarkMode
}) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'general',
    is_shared: false,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      alert('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setIsEditing(true);
    setEditingTemplate(null);
    setFormData({
      name: '',
      subject: '',
      body: '',
      category: 'general',
      is_shared: false,
    });
  };

  const handleEdit = (template: EmailTemplate) => {
    setIsEditing(true);
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category,
      is_shared: template.is_shared,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        alert('Template updated successfully!');
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert([formData]);

        if (error) throw error;
        alert('Template created successfully!');
      }

      setIsEditing(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;
      alert('Template deleted successfully!');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const categories = ['general', 'follow-up', 'listing', 'open-house', 'market-update', 'thank-you'];

  if (isEditing) {
    return (
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setIsEditing(false)}
        />

        <div className={`relative z-10 w-full max-w-3xl max-h-[90vh] rounded-[3rem] shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`p-8 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-green-100">
                <i className="fas fa-file-alt" />
              </div>
              <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className={`w-12 h-12 rounded-2xl transition-all active:scale-90 flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-rose-900/20 hover:text-rose-400' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
            >
              <i className="fas fa-times text-xl" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
            <div className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Template Name
              </label>
              <input
                required
                type="text"
                placeholder="e.g., Property Follow-Up"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-6 py-4 rounded-2xl border font-bold text-base outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-green-500' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-green-500'}`}
              />
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-6 py-4 rounded-2xl border font-bold text-base outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-green-500' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-green-500'}`}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Subject Line
              </label>
              <input
                required
                type="text"
                placeholder="Email subject..."
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className={`w-full px-6 py-4 rounded-2xl border font-black text-lg outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-green-500' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-green-500'}`}
              />
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Message Content
              </label>
              <textarea
                required
                placeholder="Type your template here... Use {{firstName}}, {{lastName}}, {{propertyAddress}} for dynamic content"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className={`w-full min-h-[300px] px-8 py-6 rounded-3xl border font-medium text-base outline-none transition-all resize-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-green-500' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-green-500'}`}
              />
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="is_shared"
                checked={formData.is_shared}
                onChange={(e) => setFormData({ ...formData, is_shared: e.target.checked })}
                className="w-5 h-5 rounded-md"
              />
              <label htmlFor="is_shared" className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Share this template with team
              </label>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className={`px-8 py-4 font-black uppercase tracking-widest text-xs transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-10 py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className={`relative z-10 w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-2xl border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`p-8 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-green-100">
              <i className="fas fa-file-alt" />
            </div>
            <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Email Templates
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
            >
              <i className="fas fa-plus mr-2" />
              New Template
            </button>
            <button
              onClick={onClose}
              className={`w-12 h-12 rounded-2xl transition-all active:scale-90 flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-rose-900/20 hover:text-rose-400' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
            >
              <i className="fas fa-times text-xl" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <i className={`fas fa-spinner fa-spin text-4xl ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 opacity-50">
              <div className={`w-24 h-24 rounded-3xl flex items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <i className={`fas fa-file-alt text-4xl ${isDarkMode ? 'text-slate-600' : 'text-slate-200'}`} />
              </div>
              <p className={`font-black text-lg ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                No templates yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`p-6 rounded-2xl border transition-all hover:shadow-lg ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {template.name}
                        </h4>
                        {template.is_shared && (
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                            Shared
                          </span>
                        )}
                      </div>
                      <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {template.category}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isDarkMode ? 'text-slate-400 hover:bg-blue-900/20 hover:text-blue-400' : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}
                      >
                        <i className="fas fa-edit text-sm" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isDarkMode ? 'text-slate-400 hover:bg-rose-900/20 hover:text-rose-400' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
                      >
                        <i className="fas fa-trash text-sm" />
                      </button>
                    </div>
                  </div>
                  <div className={`space-y-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <p className="font-bold text-sm">
                      Subject: <span className="font-medium">{template.subject}</span>
                    </p>
                    <p className="text-sm font-medium line-clamp-3">
                      {template.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatesManager;
