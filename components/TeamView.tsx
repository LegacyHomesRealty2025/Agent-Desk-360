import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types.ts';

interface TeamViewProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onInviteUser?: (email: string, role: UserRole) => string;
  isDarkMode?: boolean;
}

const TeamView: React.FC<TeamViewProps> = ({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser, onInviteUser, isDarkMode }) => {
  const [displayMode, setDisplayMode] = useState<'tile' | 'list'>('list');
  const [orderedUsers, setOrderedUsers] = useState<User[]>([]);
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [dragOverUserId, setDragOverUserId] = useState<string | null>(null);
  
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

  useEffect(() => {
    const sorted = [...users].sort((a, b) => {
      if (a.role === UserRole.BROKER) return -1;
      if (b.role === UserRole.BROKER) return 1;
      return a.lastName.localeCompare(b.lastName);
    });
    setOrderedUsers(sorted);
  }, [users]);

  const initialForm: Partial<User> = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: UserRole.AGENT,
    licenseNumber: 'DRE Lic# ',
    avatar: `https://picsum.photos/seed/${Math.random()}/200`
  };

  const [formData, setFormData] = useState<Partial<User>>(initialForm);

  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const length = phoneNumber.length;
    if (length < 1) return "";
    if (length < 4) return `(${phoneNumber}`;
    if (length < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleLicenseChange = (val: string) => {
    const prefix = "DRE Lic# ";
    if (!val.startsWith(prefix)) {
      setFormData({ ...formData, licenseNumber: prefix });
    } else {
      setFormData({ ...formData, licenseNumber: val });
    }
  };

  const handleDragStart = (id: string, role: UserRole) => {
    if (!isAdmin || role === UserRole.BROKER) return;
    setDraggedUserId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string, role: UserRole) => {
    e.preventDefault();
    if (!isAdmin || role === UserRole.BROKER) return;
    if (dragOverUserId !== id) setDragOverUserId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string, role: UserRole) => {
    e.preventDefault();
    if (!isAdmin || !draggedUserId || draggedUserId === targetId || role === UserRole.BROKER) {
      setDraggedUserId(null);
      setDragOverUserId(null);
      return;
    }

    const newOrder = [...orderedUsers];
    const draggedIdx = newOrder.findIndex(u => u.id === draggedUserId);
    const targetIdx = newOrder.findIndex(u => u.id === targetId);

    const safeTargetIdx = Math.max(1, targetIdx);
    const [removed] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(safeTargetIdx, 0, removed);

    setOrderedUsers(newOrder);
    setDraggedUserId(null);
    setDragOverUserId(null);
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
    setFormData({
      ...user,
      licenseNumber: user.licenseNumber?.startsWith('DRE Lic# ') ? user.licenseNumber : `DRE Lic# ${user.licenseNumber || ''}`
    });
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

  const filteredUsers = orderedUsers.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 pb-20 text-[11px] [&_*]:text-[11px] ${isDarkMode ? 'dark' : ''}`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[2rem] border shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center space-x-4">
          <h2 className={`font-black tracking-tight !text-base ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Team Roster</h2>
          <div className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-2xl font-black border border-indigo-100 shadow-sm" title="Total Team Members">
            {users.length}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex p-1 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button onClick={() => setDisplayMode('tile')} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${displayMode === 'tile' ? (isDarkMode ? 'bg-slate-700 text-indigo-400' : 'bg-white shadow text-indigo-600') : 'text-slate-400'}`}><i className="fas fa-th-large"></i></button>
            <button onClick={() => setDisplayMode('list')} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${displayMode === 'list' ? (isDarkMode ? 'bg-slate-700 text-indigo-400' : 'bg-white shadow text-indigo-600') : 'text-slate-400'}`}><i className="fas fa-list"></i></button>
          </div>
          <div className="relative group min-w-[200px] xl:min-w-[300px]">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" placeholder="Search team..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full pl-12 pr-6 py-3.5 border rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-inner font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`} />
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-3">
              <button onClick={() => { setInviteEmail(''); setGeneratedInviteLink(''); setIsInviteModalOpen(true); }} className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center space-x-3 shrink-0"><i className="fas fa-paper-plane"></i><span>Invite Agent</span></button>
              <button onClick={handleOpenCreate} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center space-x-3 shrink-0"><i className="fas fa-plus"></i><span>Add Agent</span></button>
            </div>
          )}
        </div>
      </div>

      {displayMode === 'tile' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredUsers.map((user, index) => {
            const isBroker = user.role === UserRole.BROKER;
            return (
              <div 
                key={user.id} 
                draggable={isAdmin && !isBroker}
                onDragStart={() => handleDragStart(user.id, user.role)}
                onDragOver={(e) => handleDragOver(e, user.id, user.role)}
                onDrop={(e) => handleDrop(e, user.id, user.role)}
                className={`border rounded-[2.5rem] p-8 transition-all group relative overflow-hidden flex flex-col items-center text-center 
                  hover:shadow-2xl hover:shadow-indigo-200/40
                  ${isAdmin && !isBroker ? 'cursor-move' : 'cursor-default'} 
                  ${draggedUserId === user.id ? 'opacity-30 scale-95' : ''} 
                  ${dragOverUserId === user.id ? 'ring-4 ring-indigo-500/20 border-indigo-400' : isBroker ? 'border-indigo-500 shadow-md shadow-indigo-100' : isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
              >
                <div className={`absolute top-6 left-6 w-7 h-7 rounded-lg flex items-center justify-center font-black z-20 shadow-lg group-hover:scale-110 transition-transform ${isBroker ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'}`}>
                  {index + 1}
                </div>

                {isAdmin && (
                  <div className="absolute top-6 right-6 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(user); }} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}><i className="fas fa-edit"></i></button>
                    {!isBroker && user.id !== currentUser.id && (
                      <button onClick={(e) => { e.stopPropagation(); setUserToTrash(user); }} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-rose-500 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}><i className="fas fa-trash-alt"></i></button>
                    )}
                  </div>
                )}

                <div className="relative mb-6">
                  <img src={user.avatar} className="w-24 h-24 rounded-[2rem] object-cover ring-4 ring-slate-50 shadow-lg group-hover:ring-indigo-200 transition-all" alt={user.firstName} />
                  <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg ${isBroker ? 'bg-indigo-600' : 'bg-emerald-500'}`}>
                    <i className={`fas ${isBroker ? 'fa-shield-halved' : 'fa-user-tie'}`}></i>
                  </div>
                </div>
                
                <h3 className={`font-black transition-colors ${isBroker ? 'text-indigo-600' : isDarkMode ? 'text-white group-hover:text-indigo-400' : 'text-slate-800 group-hover:text-indigo-600'}`}>{user.firstName} {user.lastName}</h3>
                <p className="font-black text-slate-400 uppercase tracking-widest mt-1 mb-6 group-hover:text-indigo-500 transition-colors">{isBroker ? 'Broker / Admin' : 'Real Estate Agent'}</p>
                
                <div className={`w-full space-y-3 pt-6 border-t transition-colors text-left ${isDarkMode ? 'border-slate-800 group-hover:border-slate-700' : 'border-slate-50 group-hover:border-indigo-100'}`}>
                  <div className="flex items-center space-x-3 text-slate-500">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50 group-hover:bg-white'}`}><i className="fas fa-envelope"></i></div>
                    <span className={`truncate font-medium ${isDarkMode ? 'text-slate-400' : ''}`}>{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-500">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50 group-hover:bg-white'}`}><i className="fas fa-phone"></i></div>
                    <span className={`font-bold ${isDarkMode ? 'text-slate-300' : ''}`}>{user.phone ? formatPhone(user.phone) : 'No phone'}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-500">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50 group-hover:bg-white'}`}><i className="fas fa-id-card"></i></div>
                    <span className={`font-black ${isBroker ? 'text-indigo-600' : isDarkMode ? 'text-indigo-400' : 'text-slate-700 group-hover:text-indigo-600'}`}>{user.licenseNumber || 'DRE Lic# Pending'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <table className="w-full text-left">
            <thead>
              <tr className={`border-b transition-colors ${isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest w-16">#</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest">Team Member</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest">Email Address</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest">Direct Phone</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest">DRE License #</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest">Role</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {filteredUsers.map((user, index) => (
                <tr 
                  key={user.id} 
                  draggable={isAdmin && user.role !== UserRole.BROKER}
                  onDragStart={() => handleDragStart(user.id, user.role)}
                  onDragOver={(e) => handleDragOver(e, user.id, user.role)}
                  onDrop={(e) => handleDrop(e, user.id, user.role)}
                  className={`transition-all group ${isAdmin && user.role !== UserRole.BROKER ? 'cursor-move' : ''} ${draggedUserId === user.id ? 'opacity-30' : ''} ${dragOverUserId === user.id ? 'bg-indigo-50/10 border-l-4 border-indigo-500' : isDarkMode ? 'hover:bg-white/5' : 'hover:bg-indigo-50/30'}`}
                >
                  <td className="px-8 py-6">
                    <span className="font-black text-slate-300 group-hover:text-indigo-400">{index + 1}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover shadow-sm group-hover:ring-2 group-hover:ring-indigo-200 transition-all" alt="" />
                      <p className={`font-black transition-colors ${user.role === UserRole.BROKER ? 'text-indigo-600' : isDarkMode ? 'text-white group-hover:text-indigo-400' : 'text-slate-800 group-hover:text-indigo-600'}`}>{user.firstName} {user.lastName}</p>
                    </div>
                  </td>
                  <td className={`px-8 py-6 font-medium transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} group-hover:text-indigo-600`}>{user.email}</td>
                  <td className={`px-8 py-6 font-bold transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} group-hover:text-indigo-700`}>{user.phone ? formatPhone(user.phone) : 'N/A'}</td>
                  <td className={`px-8 py-6 font-black transition-colors ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} group-hover:text-indigo-800 uppercase`}>{user.licenseNumber || 'PENDING'}</td>
                  <td className="px-8 py-6">
                    <span className={`font-black uppercase px-2 py-0.5 rounded border transition-all ${user.role === UserRole.BROKER ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end space-x-2">
                       <button onClick={() => handleOpenEdit(user)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}><i className="fas fa-pencil-alt"></i></button>
                       {user.id !== currentUser.id && isAdmin && user.role !== UserRole.BROKER && (
                         <button onClick={() => setUserToTrash(user)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-rose-500 hover:bg-rose-600' : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white'}`}><i className="fas fa-trash-can"></i></button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToTrash && isAdmin && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setUserToTrash(null)}></div>
          <div className={`rounded-[2rem] shadow-2xl border w-full max-w-md p-8 relative z-10 animate-in zoom-in-95 duration-200 text-[12px] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center space-x-4 mb-6 text-rose-600">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-rose-100">
                <i className="fas fa-trash-can"></i>
              </div>
              <h3 className={`text-xl font-black tracking-tight !text-base ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Trash Member?</h3>
            </div>
            <p className={`mb-8 font-semibold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Are you sure you want to remove <span className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-black`}>{userToTrash.firstName} {userToTrash.lastName}</span>? This item will be moved to the trash bin.
            </p>
            <div className="flex space-x-4">
              <button onClick={() => setUserToTrash(null)} className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
              <button onClick={executeTrash} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all">Move to Trash</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className={`rounded-[2.5rem] shadow-2xl border w-full max-w-4xl p-10 relative z-10 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[95vh] scrollbar-hide ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className={`font-black tracking-tight !text-base ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{editingUser ? 'Edit Agent Profile' : 'Add New Agent'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"><i className="fas fa-times"></i></button>
            </div>
            {!manualSetupLink ? (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex flex-col items-center space-y-4 mb-4">
                  <div className="relative group">
                    <img src={formData.avatar} className={`w-32 h-32 rounded-[2.5rem] object-cover ring-8 ring-slate-50 shadow-xl transition-all ${isProcessing ? 'opacity-50 blur-[2px]' : ''}`} alt="Avatar" />
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <button type="button" disabled={isProcessing} onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-slate-900/60 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white cursor-pointer z-20">
                      <i className={`fas ${isProcessing ? 'fa-circle-notch fa-spin' : 'fa-camera'} text-2xl mb-2`}></i>
                      <span className="font-black uppercase tracking-widest">Change</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="font-black text-slate-400 uppercase ml-1">First Name</label><input required type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} /></div>
                  <div className="space-y-2"><label className="font-black text-slate-400 uppercase ml-1">Last Name</label><input required type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} /></div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="font-black text-slate-400 uppercase ml-1">Email Address</label><input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} /></div>
                  <div className="space-y-2"><label className="font-black text-slate-400 uppercase ml-1">Direct Phone</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})} className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="(555) 000-0000" /></div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-black text-slate-400 uppercase ml-1">Member Role</label>
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                      <option value={UserRole.AGENT}>Real Estate Agent</option>
                      <option value={UserRole.BROKER}>Broker / Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-black text-slate-400 uppercase ml-1">DRE License #</label>
                    <input 
                      type="text" 
                      value={formData.licenseNumber} 
                      onChange={e => handleLicenseChange(e.target.value)} 
                      className={`w-full border rounded-2xl px-5 py-4 font-black outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-indigo-400' : 'bg-slate-50 border-slate-200 text-indigo-600'}`} 
                    />
                  </div>
                </div>
                <div className="pt-6 flex space-x-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                  <button type="submit" disabled={isProcessing} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700">{editingUser ? 'Save Profile' : 'Generate Setup Link'}</button>
                </div>
              </form>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`border p-8 rounded-[2rem] flex flex-col items-center text-center ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                   <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 text-3xl shadow-sm mb-6"><i className="fas fa-paper-plane"></i></div>
                   <h4 className={`font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Agent Record Saved</h4>
                   <p className="text-slate-500 font-medium mb-8">Share the setup link below with the new team member.</p>
                   <div className="w-full space-y-2 mb-8">
                     <label className="font-black text-slate-400 uppercase tracking-widest">Shareable Setup Link</label>
                     <div className="flex items-center space-x-2 bg-white border border-indigo-100 rounded-2xl p-2 pl-6">
                       <code className="flex-1 text-indigo-600 font-bold truncate">{manualSetupLink}</code>
                       <button onClick={copyManualLink} className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all"><i className="fas fa-copy"></i></button>
                     </div>
                   </div>
                   <button onClick={() => setIsModalOpen(false)} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${isDarkMode ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-black'}`}>Return to Roster</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isInviteModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsInviteModalOpen(false)}></div>
           <div className={`rounded-[2.5rem] shadow-2xl border w-full max-w-lg p-10 relative z-10 animate-in zoom-in-95 duration-200 text-[12px] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black tracking-tight">Invite New Agent</h3>
                <button onClick={() => setIsInviteModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"><i className="fas fa-times"></i></button>
              </div>

              {!generatedInviteLink ? (
                <form onSubmit={handleSendInvite} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agent Email Address</label>
                    <input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="agent@email.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Role</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)} className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
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
                    <div className={`flex items-center space-x-2 border rounded-2xl p-2 pl-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <code className="flex-1 text-xs text-indigo-600 font-bold truncate">{generatedInviteLink}</code>
                      <button onClick={copyInviteLink} className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all"><i className="fas fa-copy"></i></button>
                    </div>
                  </div>
                  
                  <button onClick={() => setIsInviteModalOpen(false)} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all ${isDarkMode ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-black'}`}>Done</button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default TeamView;