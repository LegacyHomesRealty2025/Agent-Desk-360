import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import { User, UserRole } from '../types.ts';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string | null;
  license_number: string | null;
  is_deleted: boolean;
  created_at: string;
}

interface PendingInvite {
  id: string;
  email: string;
  status: string;
  created_at: string;
}

interface BrokerAdminPanelProps {
  currentUser: User;
  onClose: () => void;
  isDarkMode: boolean;
}

const BrokerAdminPanel: React.FC<BrokerAdminPanelProps> = ({
  currentUser,
  onClose,
  isDarkMode
}) => {
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadAgents();
    loadPendingInvites();
  }, []);

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('brokerage_id', currentUser.brokerageId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('brokerage_invites')
        .select('id, email, status, created_at')
        .eq('brokerage_id', currentUser.brokerageId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingInvites(data || []);
    } catch (error) {
      console.error('Error loading pending invites:', error);
    }
  };

  const handleInviteAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsSendingInvite(true);
    setMessage('');

    try {
      const email = inviteEmail.trim().toLowerCase();

      // Check if there's already a pending invitation for this email
      const { data: existingInvite } = await supabase
        .from('brokerage_invites')
        .select('id, status')
        .eq('brokerage_id', currentUser.brokerageId)
        .eq('email', email)
        .eq('status', 'PENDING')
        .maybeSingle();

      if (existingInvite) {
        setMessage('An invitation has already been sent to this email');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      // Create new invitation
      const { error } = await supabase
        .from('brokerage_invites')
        .insert([{
          brokerage_id: currentUser.brokerageId,
          email: email,
          role: 'AGENT',
          invited_by: currentUser.id,
        }]);

      if (error) {
        console.error('Invitation error:', error);
        throw error;
      }

      setMessage('Invitation sent successfully!');
      setInviteEmail('');
      loadPendingInvites();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error in handleInviteAgent:', error);
      setMessage(error.message || 'Failed to send invitation');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string, email: string) => {
    if (!confirm(`Cancel invitation for ${email}?`)) return;

    try {
      const { error } = await supabase
        .from('brokerage_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      setMessage('Invitation cancelled');
      loadPendingInvites();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to cancel invitation');
    }
  };

  const copyInviteLink = (inviteId: string) => {
    const inviteUrl = `${window.location.origin}/?invite=${inviteId}`;
    navigator.clipboard.writeText(inviteUrl);
    setMessage('Invite link copied to clipboard!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to remove this agent?')) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', agentId);

      if (error) throw error;

      setMessage('Agent removed successfully');
      loadAgents();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to remove agent');
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className={`relative z-10 w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-2xl border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`p-8 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
              <i className="fas fa-users-cog" />
            </div>
            <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Manage Team
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`w-12 h-12 rounded-2xl transition-all active:scale-90 flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-rose-900/20 hover:text-rose-400' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
          >
            <i className="fas fa-times text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <h4 className={`text-lg font-black mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Invite New Agent
            </h4>
            <form onSubmit={handleInviteAgent} className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <label className={`text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Agent Email
                </label>
                <input
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="agent@example.com"
                  className={`w-full px-6 py-4 rounded-2xl border font-bold text-base outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500' : 'bg-white border-slate-200 focus:border-indigo-500'}`}
                />
              </div>
              <button
                type="submit"
                disabled={isSendingInvite}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingInvite ? (
                  <i className="fas fa-spinner fa-spin" />
                ) : (
                  <>
                    <i className="fas fa-envelope mr-2" />
                    Send Invite
                  </>
                )}
              </button>
            </form>
            {message && (
              <div className={`mt-4 p-3 rounded-xl text-sm font-bold ${message.includes('success') || message.includes('copied') || message.includes('cancelled') ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>
                {message}
              </div>
            )}
          </div>

          {pendingInvites.length > 0 && (
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className={`text-lg font-black mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Pending Invitations ({pendingInvites.length})
              </h4>
              <div className="space-y-3">
                {pendingInvites.map(invite => (
                  <div
                    key={invite.id}
                    className={`p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-amber-900/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                          <i className="fas fa-clock text-sm" />
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {invite.email}
                          </p>
                          <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Sent {new Date(invite.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyInviteLink(invite.id)}
                          className={`px-3 py-2 rounded-lg font-bold text-xs transition-all ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-blue-400' : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600'}`}
                          title="Copy invite link"
                        >
                          <i className="fas fa-copy mr-1" />
                          Copy Link
                        </button>
                        <button
                          onClick={() => handleDeleteInvite(invite.id, invite.email)}
                          className={`px-3 py-2 rounded-lg font-bold text-xs transition-all ${isDarkMode ? 'text-slate-400 hover:bg-rose-900/20 hover:text-rose-400' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
                          title="Cancel invitation"
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className={`text-lg font-black mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Team Members ({agents.length})
            </h4>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <i className={`fas fa-spinner fa-spin text-4xl ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
              </div>
            ) : agents.length === 0 ? (
              <div className={`text-center py-12 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <i className="fas fa-users text-4xl mb-4 opacity-30" />
                <p className="font-bold">No team members yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map(agent => (
                  <div
                    key={agent.id}
                    className={`p-6 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${agent.role === 'BROKER' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                          {agent.first_name[0]}{agent.last_name[0]}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {agent.first_name} {agent.last_name}
                            </p>
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${agent.role === 'BROKER' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                              {agent.role}
                            </span>
                          </div>
                          <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {agent.email}
                          </p>
                          {agent.phone && (
                            <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {agent.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      {agent.role !== 'BROKER' && agent.id !== currentUser.id && (
                        <button
                          onClick={() => handleDeleteAgent(agent.id)}
                          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${isDarkMode ? 'text-slate-400 hover:bg-rose-900/20 hover:text-rose-400' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
                        >
                          <i className="fas fa-trash mr-2" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrokerAdminPanel;
