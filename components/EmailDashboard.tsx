import React, { useState, useMemo } from 'react';
import { EmailMessage, User, EmailFolder, Lead } from '../types.ts';
import BulkEmailComposer from './BulkEmailComposer.tsx';
import EmailTemplatesManager from './EmailTemplatesManager.tsx';
import { supabase } from '../lib/supabase.ts';

interface EmailDashboardProps {
  emails: EmailMessage[];
  currentUser: User;
  leads: Lead[];
  onSendEmail: (email: EmailMessage) => void;
  onUpdateEmail: (id: string, updates: Partial<EmailMessage>) => void;
  onDeleteEmail: (id: string) => void;
  isDarkMode: boolean;
}

const EmailDashboard: React.FC<EmailDashboardProps> = ({
  emails,
  currentUser,
  leads,
  onSendEmail,
  onUpdateEmail,
  onDeleteEmail,
  isDarkMode
}) => {
  const [activeFolder, setActiveFolder] = useState<EmailFolder>('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [isSending, setIsSending] = useState(false);

  const filteredEmails = useMemo(() => {
    return emails
      .filter(e => e.folder === activeFolder)
      .filter(e => 
        e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.body.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [emails, activeFolder, searchTerm]);

  const activeEmail = useMemo(() => 
    emails.find(e => e.id === selectedEmailId), 
    [emails, selectedEmailId]
  );

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    const email = emails.find(e => e.id === id);
    if (email && !email.isRead) {
      onUpdateEmail(id, { isRead: true });
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeData.to || !composeData.subject) return;

    setIsSending(true);

    try {
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
            subject: composeData.subject,
            body: composeData.body,
            recipients: [{
              email: composeData.to,
              name: composeData.to.split('@')[0],
            }],
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      const newEmail: EmailMessage = {
        id: `em_sent_${Date.now()}`,
        sender: `${currentUser.firstName} ${currentUser.lastName}`,
        senderEmail: currentUser.email,
        recipientEmail: composeData.to,
        subject: composeData.subject,
        body: composeData.body,
        timestamp: new Date().toISOString(),
        isRead: true,
        folder: 'SENT'
      };

      onSendEmail(newEmail);
      setIsComposeOpen(false);
      setComposeData({ to: '', subject: '', body: '' });
      alert('Email sent successfully via Resend!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleStar = (e: React.MouseEvent, id: string, currentState?: boolean) => {
    e.stopPropagation();
    onUpdateEmail(id, { isStarred: !currentState });
  };

  const folderIcons: Record<EmailFolder, string> = {
    INBOX: 'fa-inbox',
    SENT: 'fa-paper-plane',
    DRAFTS: 'fa-file-lines',
    TRASH: 'fa-trash-can',
    ARCHIVE: 'fa-box-archive'
  };

  return (
    <div className={`h-[calc(100vh-14rem)] flex flex-col md:flex-row bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-800' : ''}`}>
      
      {/* Sidebar Navigation */}
      <aside className={`w-full md:w-64 border-r flex flex-col p-6 space-y-4 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50/30'}`}>
        <button
          onClick={() => setIsComposeOpen(true)}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3 active:scale-95"
        >
          <i className="fas fa-plus"></i>
          <span>Compose</span>
        </button>

        <button
          onClick={() => setIsBulkEmailOpen(true)}
          className={`w-full py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center space-x-3 active:scale-95 ${isDarkMode ? 'bg-slate-800 text-blue-400 hover:bg-slate-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
        >
          <i className="fas fa-paper-plane"></i>
          <span>Bulk Send</span>
        </button>

        <button
          onClick={() => setIsTemplatesOpen(true)}
          className={`w-full py-3 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center space-x-3 active:scale-95 ${isDarkMode ? 'bg-slate-800 text-green-400 hover:bg-slate-700' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
        >
          <i className="fas fa-file-alt"></i>
          <span>Templates</span>
        </button>

        <nav className="space-y-1.5">
          {(['INBOX', 'SENT', 'DRAFTS', 'ARCHIVE', 'TRASH'] as EmailFolder[]).map(folder => {
            const count = emails.filter(e => e.folder === folder && !e.isRead).length;
            return (
              <button 
                key={folder}
                onClick={() => { setActiveFolder(folder); setSelectedEmailId(null); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeFolder === folder ? 'bg-indigo-50 text-indigo-600 font-black' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <div className="flex items-center space-x-3">
                  <i className={`fas ${folderIcons[folder]} w-5`}></i>
                  <span className="capitalize">{folder.toLowerCase()}</span>
                </div>
                {folder === 'INBOX' && count > 0 && (
                  <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full">{count}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
           <div className="bg-slate-100/50 p-4 rounded-2xl space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mail Account</p>
              <div className="flex items-center space-x-3">
                 <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 text-xs shadow-sm">
                   <i className="fas fa-at"></i>
                 </div>
                 <p className="text-[11px] font-bold text-slate-700 truncate">{currentUser.email}</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Message List */}
      <div className={`flex-1 flex flex-col md:max-w-md border-r ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="p-6 border-b border-slate-100 shrink-0">
          <div className="relative group">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500"></i>
            <input 
              type="text" 
              placeholder="Search mail..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {filteredEmails.length > 0 ? filteredEmails.map(email => (
            <div 
              key={email.id}
              onClick={() => handleSelectEmail(email.id)}
              className={`p-6 border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50 relative group ${selectedEmailId === email.id ? 'bg-indigo-50/30' : ''} ${!email.isRead ? 'bg-white' : 'bg-slate-50/20'}`}
            >
              {!email.isRead && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
              )}
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm truncate pr-4 ${!email.isRead ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>{email.sender}</p>
                <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">
                  {new Date(email.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className={`text-xs truncate mb-1 ${!email.isRead ? 'font-black text-slate-800' : 'font-bold text-slate-500'}`}>{email.subject}</p>
              <p className="text-[11px] text-slate-400 truncate line-clamp-1 opacity-70">{email.body}</p>
              
              <div className="absolute top-6 right-6 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={(e) => handleToggleStar(e, email.id, email.isStarred)} className={`text-xs ${email.isStarred ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}>
                   <i className={`${email.isStarred ? 'fas' : 'far'} fa-star`}></i>
                 </button>
              </div>
            </div>
          )) : (
            <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-30">
               <i className={`fas ${folderIcons[activeFolder]} text-5xl mb-4`}></i>
               <p className="text-xs font-black uppercase tracking-widest">No messages found in {activeFolder.toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Message Reader Area */}
      <div className="flex-1 hidden lg:flex flex-col bg-white overflow-hidden">
        {activeEmail ? (
          <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg shadow-sm">
                    {activeEmail.sender[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{activeEmail.subject}</h3>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase">{activeEmail.sender}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] font-bold text-indigo-500">{activeEmail.senderEmail}</span>
                    </div>
                  </div>
               </div>
               <div className="flex items-center space-x-3">
                  <button onClick={() => onDeleteEmail(activeEmail.id)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100" title="Move to Trash">
                    <i className="fas fa-trash-alt text-sm"></i>
                  </button>
                  <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100" title="Reply">
                    <i className="fas fa-reply text-sm"></i>
                  </button>
               </div>
            </div>

            <div className="flex-1 p-12 overflow-y-auto scrollbar-hide text-base leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">
               {activeEmail.body}
            </div>

            <div className="p-8 border-t border-slate-50 bg-slate-50/50">
               <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between group cursor-text" onClick={() => setIsComposeOpen(true)}>
                  <p className="text-slate-400 font-bold">Click to reply to this message...</p>
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-all">
                    <i className="fas fa-paper-plane text-xs"></i>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-20 text-center space-y-6 opacity-30">
             <div className="w-32 h-32 rounded-[3rem] bg-slate-50 flex items-center justify-center text-5xl">
               <i className="fas fa-envelope-open text-slate-200"></i>
             </div>
             <div>
                <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase">Select a message to read</h4>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">No conversation currently focused</p>
             </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsComposeOpen(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-2xl relative z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex items-center space-x-5">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
                    <i className="fas fa-pen-nib"></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">New Message</h3>
               </div>
               <button onClick={() => setIsComposeOpen(false)} className="w-12 h-12 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90 flex items-center justify-center">
                 <i className="fas fa-times text-xl"></i>
               </button>
            </div>
            
            <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden">
               <div className="p-10 space-y-6 overflow-y-auto scrollbar-hide">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recipient Address</label>
                    <input 
                      required 
                      type="email" 
                      placeholder="e.g. client@gmail.com" 
                      value={composeData.to}
                      onChange={e => setComposeData({...composeData, to: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Line</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Property info..." 
                      value={composeData.subject}
                      onChange={e => setComposeData({...composeData, subject: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-black text-lg outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5 flex-1 flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Content</label>
                    <textarea 
                      required 
                      placeholder="Type your message here..." 
                      value={composeData.body}
                      onChange={e => setComposeData({...composeData, body: e.target.value})}
                      className="w-full flex-1 min-h-[250px] bg-slate-50 border border-slate-200 rounded-3xl px-8 py-6 font-medium text-base outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>
               </div>
               
               <div className="p-10 border-t border-slate-50 bg-slate-50/30 shrink-0 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                     <button type="button" className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all shadow-sm"><i className="fas fa-paperclip"></i></button>
                     <button type="button" className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all shadow-sm"><i className="fas fa-image"></i></button>
                  </div>
                  <div className="flex items-center space-x-4">
                     <button type="button" onClick={() => setIsComposeOpen(false)} className="px-8 py-4 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:text-slate-700 transition-colors" disabled={isSending}>Discard</button>
                     <button type="submit" disabled={isSending} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                       {isSending ? (
                         <>
                           <i className="fas fa-spinner fa-spin"></i>
                           <span>Sending...</span>
                         </>
                       ) : (
                         <>
                           <i className="fas fa-paper-plane"></i>
                           <span>Send Message</span>
                         </>
                       )}
                     </button>
                  </div>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Email Modal */}
      {isBulkEmailOpen && (
        <BulkEmailComposer
          leads={leads}
          onClose={() => setIsBulkEmailOpen(false)}
          onSuccess={() => {
            setIsBulkEmailOpen(false);
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Email Templates Modal */}
      {isTemplatesOpen && (
        <EmailTemplatesManager
          onClose={() => setIsTemplatesOpen(false)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default EmailDashboard;