
import React, { useState, useRef } from 'react';
import { User, UserRole } from '../types';

interface TeamViewProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onInviteUser?: (email: string, role: UserRole) => string;
}

const TeamView: React.FC<TeamViewProps> = ({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser, onInviteUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToTrash, setUserToTrash] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.AGENT);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [manualSetupLink, setManualSetupLink] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser.role === UserRole.BROKER;

  const initialForm: Partial<User> = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: UserRole.AGENT,
    licenseNumber: '',
    avatar: `https://picsum.photos/seed/${Math.random()}/200`
  };

  const [formData, setFormData] = useState<Partial<User>>(initialForm);

  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 1) return "";
    if (phoneNumberLength < 4) return `(${phoneNumber}`;
    if (phoneNumberLength < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 400; 
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Failed to get canvas context');
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessing(true);
      const resizedDataUrl = await resizeImage(file);
      setFormData(prev => ({ ...prev, avatar: resizedDataUrl }));
    } catch (err) {
      console.error('Error processing image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setManualSetupLink('');
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setManualSetupLink('');
    setFormData(user);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    if (editingUser) {
      onUpdateUser({ ...editingUser, ...formData } as User);
      setIsModalOpen(false);
    } else {
      const newUser: User = {
        ...formData,
        id: `user_${Date.now()}`,
        brokerageId: currentUser.brokerageId,
      } as User;
      onAddUser(newUser);

      if (onInviteUser && formData.email) {
        const inviteId = onInviteUser(formData.email, formData.role || UserRole.AGENT);
        const baseUrl = window.location.origin + window.location.pathname;
        setManualSetupLink(`${baseUrl}?invite=${inviteId}`);
      }
    }
  };

  const executeTrash = () => {
    if (userToTrash && isAdmin) {
      onDeleteUser(userToTrash.id);
      setUserToTrash(null);
    }
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (onInviteUser && isAdmin) {
      const inviteId = onInviteUser(inviteEmail, inviteRole);
      const baseUrl = window.location.origin + window.location.pathname;
      setGeneratedInviteLink(`${baseUrl}?invite=${inviteId}`);
    }
  };

  const copyManualLink = () => {
    navigator.clipboard.writeText(manualSetupLink);
    alert('Setup link copied to clipboard!');
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(generatedInviteLink);
    alert('Invitation link copied to clipboard!');
  };

  const filteredUsers = users.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Team Roster</h2>
          <p className="text-slate-500 font-medium mt-1">
            {isAdmin ? 'Manage agent profiles and brokerage permissions.' : 'View your colleagues and office roster.'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative group min-w-[300px]">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Search team members..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-inner"
            />
          </div>
          {isAdmin && (
            <>
              <button 
                onClick={() => { setInviteEmail(''); setGeneratedInviteLink(''); setIsInviteModalOpen(true); }}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center space-x-3 shrink-0"
              >
                <i className="fas fa-paper-plane"></i>
                <span>Invite Agent</span>
              </button>
              <button 
                onClick={handleOpenCreate}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center space-x-3 shrink-0"
              >
                <i className="fas fa-plus"></i>
                <span>Add Agent</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredUsers.map(user => (
          <div key={user.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 hover:border-indigo-300 hover:shadow-xl transition-all group relative overflow-hidden">
            {isAdmin && (
              <div className="absolute top-6 right-6 flex space-x-2">
                 <button onClick={() => handleOpenEdit(user)} className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100">
                   <i className="fas fa-edit text-xs"></i>
                 </button>
                 {user.id !== currentUser.id && (
                   <button onClick={() => setUserToTrash(user)} className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100">
                     <i className="fas fa-trash-alt text-xs"></i>
                   </button>
                 )}
              </div>
            )}

            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <img src={user.avatar} className="w-24 h-24 rounded-[2rem] object-cover ring-4 ring-slate-50 shadow-lg" alt={user.firstName} />
                <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] shadow-lg ${user.role === UserRole.BROKER ? 'bg-indigo-600' : 'bg-emerald-500'}`}>
                  <i className={`fas ${user.role === UserRole.BROKER ? 'fa-shield-halved' : 'fa-user-tie'}`}></i>
                </div>
              </div>
              
              <h3 className="text-xl font-black text-slate-800">{user.firstName} {user.lastName}</h3>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1 mb-6">{user.role}</p>
              
              <div className="w-full space-y-3 pt-6 border-t border-slate-50">
                <div className="flex items-center space-x-3 text-slate-500 text-sm">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                    <i className="fas fa-envelope text-[10px]"></i>
                  </div>
                  <span className="truncate font-medium">{user.email}</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-500 text-sm">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                    <i className="fas fa-phone text-[10px]"></i>
                  </div>
                  <span className="font-bold">{user.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-500 text-sm">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                    <i className="fas fa-id-card text-[10px]"></i>
                  </div>
                  <span className="font-black text-indigo-600">{user.licenseNumber || 'PENDING DRE'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {userToTrash && isAdmin && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setUserToTrash(null)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-md p-8 relative z-10 animate-in zoom-in-95 duration-200 text-[12px]">
            <div className="flex items-center space-x-4 mb-6 text-rose-600">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                <i className="fas fa-trash-can"></i>
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Deactivate Agent?</h3>
            </div>
            <p className="text-slate-600 mb-8 text-base font-semibold leading-relaxed">
              Are you sure you want to move <span className="text-slate-900 font-black">{userToTrash.firstName} {userToTrash.lastName}</span> to the trash bin? Their access will be suspended but profile data will be preserved.
            </p>
            <div className="flex space-x-4">
              <button onClick={() => setUserToTrash(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={executeTrash} className="flex-1 py-4 bg-rose-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all">Move to Trash</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-4xl p-10 relative z-10 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[95vh] scrollbar-hide text-[12px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {editingUser ? 'Edit Agent Profile' : 'Add New Agent'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-95"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {!manualSetupLink ? (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex flex-col items-center space-y-4 mb-4">
                  <div className="relative group">
                    <img src={formData.avatar} className={`w-32 h-32 rounded-[2.5rem] object-cover ring-8 ring-slate-50 shadow-xl transition-all ${isProcessing ? 'opacity-50 blur-[2px]' : ''}`} alt="Avatar" />
                    {isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <i className="fas fa-circle-notch fa-spin text-indigo-600 text-2xl"></i>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <button type="button" disabled={isProcessing} onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-slate-900/60 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white cursor-pointer z-20" aria-label="Change Photo">
                      <i className={`fas ${isProcessing ? 'fa-circle-notch fa-spin' : 'fa-camera'} text-2xl mb-2`}></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">Change</span>
                    </button>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile Identity Image</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">First Name</label>
                    <input required type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Last Name</label>
                    <input required type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email (Login ID)</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Phone Number</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="(555) 000-0000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Member Role</label>
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none appearance-none cursor-pointer">
                      <option value={UserRole.AGENT}>Real Estate Agent</option>
                      <option value={UserRole.BROKER}>Broker / Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">License Number (DRE)</label>
                    <input type="text" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black text-indigo-600 outline-none" />
                  </div>
                </div>

                <div className="pt-6 flex space-x-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs">Cancel</button>
                  <button type="submit" disabled={isProcessing} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700">
                    {editingUser ? 'Save Profile' : 'Generate Setup Link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-[2rem] flex flex-col items-center text-center">
                   <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 text-3xl shadow-sm mb-6">
                     <i className="fas fa-paper-plane"></i>
                   </div>
                   <h4 className="text-xl font-black text-slate-800 mb-2">Agent Record Saved & Initialized</h4>
                   <p className="text-sm text-slate-500 font-medium mb-8">The agent contact has been added to your roster. Share the unique setup link below so they can complete their profile.</p>
                   
                   <div className="w-full space-y-2 mb-8">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shareable Setup Link</label>
                     <div className="flex items-center space-x-2 bg-white border border-indigo-100 rounded-2xl p-2 pl-6">
                       <code className="flex-1 text-xs text-indigo-600 font-bold truncate">{manualSetupLink}</code>
                       <button onClick={copyManualLink} className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all"><i className="fas fa-copy"></i></button>
                     </div>
                   </div>
                   
                   <button onClick={() => setIsModalOpen(false)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-black">Return to Roster</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isInviteModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsInviteModalOpen(false)}></div>
           <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-lg p-10 relative z-10 animate-in zoom-in-95 duration-200 text-[12px]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Invite New Agent</h3>
                <button 
                  onClick={() => setIsInviteModalOpen(false)} 
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {!generatedInviteLink ? (
                <form onSubmit={handleSendInvite} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agent Email Address</label>
                    <input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500" placeholder="agent@email.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Role</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none cursor-pointer">
                      <option value={UserRole.AGENT}>Real Estate Agent</option>
                      <option value={UserRole.BROKER}>Broker / Admin</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Generate Invite Link</button>
                </form>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-xl shadow-sm"><i className="fas fa-check-circle"></i></div>
                    <div>
                      <p className="text-emerald-900 font-black text-sm">Invitation Prepared</p>
                      <p className="text-emerald-700 font-medium">Share the link with {inviteEmail}.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invitation Link</label>
                    <div className="flex items-center space-x-2 bg-white border border-indigo-100 rounded-2xl p-2 pl-6">
                      <code className="flex-1 text-xs text-indigo-600 font-bold truncate">{generatedInviteLink}</code>
                      <button onClick={copyInviteLink} className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all"><i className="fas fa-copy"></i></button>
                    </div>
                  </div>
                  
                  <button onClick={() => setIsInviteModalOpen(false)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-black">Done</button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default TeamView;
