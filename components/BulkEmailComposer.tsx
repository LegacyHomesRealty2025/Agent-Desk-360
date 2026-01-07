import React, { useState, useMemo } from 'react';
import { Lead } from '../types.ts';
import { supabase } from '../lib/supabase.ts';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

interface EmailRecipient {
  email: string;
  name: string;
  contactId?: string;
}

interface BulkEmailComposerProps {
  leads: Lead[];
  onClose: () => void;
  onSuccess: () => void;
  isDarkMode: boolean;
}

const BulkEmailComposer: React.FC<BulkEmailComposerProps> = ({
  leads,
  onClose,
  onSuccess,
  isDarkMode
}) => {
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  React.useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead =>
      !lead.isDeleted &&
      lead.email &&
      (
        lead.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [leads, searchTerm]);

  const toggleLead = (leadId: string) => {
    const newSelected = new Set(selectedLeadIds);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeadIds(newSelected);
  };

  const selectAll = () => {
    setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
  };

  const clearAll = () => {
    setSelectedLeadIds(new Set());
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setSubject(template.subject);
    setBody(template.body);
    setShowTemplates(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLeadIds.size === 0 || !subject || !body) return;

    setIsSending(true);

    try {
      const recipients: EmailRecipient[] = Array.from(selectedLeadIds)
        .map(id => leads.find(l => l.id === id))
        .filter(lead => lead && lead.email)
        .map(lead => ({
          email: lead!.email,
          name: `${lead!.firstName} ${lead!.lastName}`,
          contactId: lead!.id,
        }));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject,
            body,
            recipients,
            templateId: selectedTemplate?.id,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      alert(`Email sent successfully to ${recipients.length} recipient(s)!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className={`relative z-10 w-full max-w-6xl max-h-[90vh] rounded-[3rem] shadow-2xl border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>

        <div className={`p-8 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100">
              <i className="fas fa-paper-plane" />
            </div>
            <div>
              <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Bulk Email
              </h3>
              <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {selectedLeadIds.size} recipient{selectedLeadIds.size !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-12 h-12 rounded-2xl transition-all active:scale-90 flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-rose-900/20 hover:text-rose-400' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
          >
            <i className="fas fa-times text-xl" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">

          <div className={`w-96 border-r flex flex-col ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="p-6 space-y-4 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-4 py-3 pl-11 rounded-2xl border font-bold text-sm outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500'}`}
                />
                <i className={`fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className={`flex-1 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className={`flex-1 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {filteredLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => toggleLead(lead.id)}
                  className={`p-4 border-b cursor-pointer transition-all hover:pl-6 ${
                    selectedLeadIds.has(lead.id)
                      ? isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'
                      : isDarkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      selectedLeadIds.has(lead.id)
                        ? 'bg-blue-600 border-blue-600'
                        : isDarkMode ? 'border-slate-600' : 'border-slate-300'
                    }`}>
                      {selectedLeadIds.has(lead.id) && (
                        <i className="fas fa-check text-white text-xs" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {lead.firstName} {lead.lastName}
                      </p>
                      <p className={`text-xs font-medium truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {lead.email}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden">
            <div className="p-8 space-y-6 overflow-y-auto scrollbar-hide flex-1">

              {templates.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center space-x-2 ${isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    <i className="fas fa-file-alt" />
                    <span>Use Template</span>
                    <i className={`fas fa-chevron-${showTemplates ? 'up' : 'down'} text-xs`} />
                  </button>

                  {showTemplates && (
                    <div className={`mt-4 p-4 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      {templates.map(template => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleTemplateSelect(template)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            selectedTemplate?.id === template.id
                              ? isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
                              : isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {template.name}
                          </p>
                          <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {template.subject}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className={`text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Subject Line
                </label>
                <input
                  required
                  type="text"
                  placeholder="Email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={`w-full px-6 py-4 rounded-2xl border font-black text-lg outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500'}`}
                />
              </div>

              <div className="space-y-2 flex-1 flex flex-col">
                <label className={`text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Message Content
                </label>
                <textarea
                  required
                  placeholder="Type your message here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className={`w-full flex-1 min-h-[300px] px-8 py-6 rounded-3xl border font-medium text-base outline-none transition-all resize-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500'}`}
                />
              </div>
            </div>

            <div className={`p-8 border-t flex items-center justify-between shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-50 bg-slate-50/30'}`}>
              <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Ready to send to {selectedLeadIds.size} recipient{selectedLeadIds.size !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-8 py-4 font-black uppercase tracking-widest text-xs transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending || selectedLeadIds.size === 0 || !subject || !body}
                  className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSending ? (
                    <>
                      <i className="fas fa-spinner fa-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane" />
                      <span>Send Bulk Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BulkEmailComposer;
