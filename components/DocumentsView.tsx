import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, UserRole, Brokerage, SharedFolder, SharedDocument, SharedDocumentType } from '../types.ts';

interface DocumentsViewProps {
  currentUser: User;
  agents: User[];
  brokerage: Brokerage;
  initialFolders: SharedFolder[];
  initialDocuments: SharedDocument[];
  onUpdateFolders: (folders: SharedFolder[]) => void;
  onUpdateDocuments: (docs: SharedDocument[]) => void;
  isDarkMode?: boolean;
}

const DocumentsView: React.FC<DocumentsViewProps> = ({ 
  currentUser, 
  agents,
  brokerage, 
  initialFolders, 
  initialDocuments,
  onUpdateFolders,
  onUpdateDocuments,
  isDarkMode 
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayMode, setDisplayMode] = useState<'tile' | 'list'>('tile');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<SharedDocument | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<SharedFolder | null>(null);
  
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderSharedWith, setNewFolderSharedWith] = useState('');
  const [editingDoc, setEditingDoc] = useState<SharedDocument | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const [uploadData, setUploadData] = useState({
    name: '',
    type: 'PDF' as SharedDocumentType,
    url: '',
    folderId: '',
    sharedWithAgentId: ''
  });

  const isAdmin = currentUser.role === UserRole.BROKER;

  const filteredFolders = useMemo(() => {
    return initialFolders.filter(f => !f.isDeleted).filter(f => {
      // Brokers see everything
      if (isAdmin) return true;
      // Agents see public or specifically shared with them
      return !f.sharedWithAgentId || f.sharedWithAgentId === currentUser.id;
    });
  }, [initialFolders, isAdmin, currentUser.id]);

  const filteredDocs = useMemo(() => {
    return initialDocuments.filter(doc => !doc.isDeleted).filter(doc => {
      // Visibility filtering
      const canSee = isAdmin || !doc.sharedWithAgentId || doc.sharedWithAgentId === currentUser.id;
      if (!canSee) return false;

      const matchesFolder = !selectedFolderId || doc.folderId === selectedFolderId;
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFolder && matchesSearch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [initialDocuments, selectedFolderId, searchQuery, isAdmin, currentUser.id]);

  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocs.slice(start, start + itemsPerPage);
  }, [filteredDocs, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFolderId, itemsPerPage]);

  useEffect(() => {
    if (isUploadModalOpen && selectedFolderId) {
      setUploadData(prev => ({ ...prev, folderId: selectedFolderId }));
    }
  }, [isUploadModalOpen, selectedFolderId]);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const newFolderId = `f_${Date.now()}`;
    const newFolder: SharedFolder = {
      id: newFolderId,
      name: newFolderName,
      icon: 'fa-folder',
      createdAt: new Date().toISOString(),
      sharedWithAgentId: newFolderSharedWith || undefined
    };
    onUpdateFolders([...initialFolders, newFolder]);
    setNewFolderName('');
    setNewFolderSharedWith('');
    setIsNewFolderModalOpen(false);
    
    setTimeout(() => {
      setUploadData({ name: '', type: 'PDF', url: '', folderId: newFolderId, sharedWithAgentId: '' });
      setSelectedFile(null);
      setIsUploadModalOpen(true);
    }, 300);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadData.name) {
        setUploadData(prev => ({ ...prev, name: file.name }));
      }
      if (file.type.includes('image')) setUploadData(prev => ({ ...prev, type: 'IMAGE' }));
      else if (file.type.includes('pdf')) setUploadData(prev => ({ ...prev, type: 'PDF' }));
      else if (file.type.includes('word') || file.type.includes('officedocument')) setUploadData(prev => ({ ...prev, type: 'DOC' }));
      else if (file.type.includes('video')) setUploadData(prev => ({ ...prev, type: 'VIDEO' }));
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const isLinkType = uploadData.type === 'LINK' || uploadData.type === 'VIDEO';
    if (!uploadData.name || !uploadData.folderId) return;
    if (!isLinkType && !selectedFile && !uploadData.url) return;

    let finalUrl = uploadData.url;
    let finalSize = '0 KB';

    if (!isLinkType && selectedFile) {
      finalUrl = URL.createObjectURL(selectedFile);
      finalSize = `${(selectedFile.size / 1024).toFixed(1)} KB`;
      if (selectedFile.size > 1024 * 1024) {
        finalSize = `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`;
      }
    }
    
    const newDoc: SharedDocument = {
      id: `d_${Date.now()}`,
      folderId: uploadData.folderId,
      name: uploadData.name,
      type: uploadData.type,
      url: finalUrl || '#',
      createdAt: new Date().toISOString(),
      uploadedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      uploadedById: currentUser.id,
      size: isLinkType ? undefined : finalSize,
      sharedWithAgentId: uploadData.sharedWithAgentId || undefined
    };
    
    onUpdateDocuments([...initialDocuments, newDoc]);
    setUploadData({ name: '', type: 'PDF', url: '', folderId: '', sharedWithAgentId: '' });
    setSelectedFile(null);
    setIsUploadModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    const updatedDocs = initialDocuments.map(d => d.id === editingDoc.id ? editingDoc : d);
    onUpdateDocuments(updatedDocs);
    setIsEditModalOpen(false);
    setEditingDoc(null);
  };

  const executeTrashDoc = () => {
    if (!docToDelete) return;
    const updatedDocs = initialDocuments.map(d => 
      d.id === docToDelete.id ? { ...d, isDeleted: true, deletedAt: new Date().toISOString() } : d
    );
    onUpdateDocuments(updatedDocs);
    setDocToDelete(null);
  };

  const executeTrashFolder = () => {
    if (!folderToDelete) return;
    const updatedFolders = initialFolders.map(f => 
      f.id === folderToDelete.id ? { ...f, isDeleted: true, deletedAt: new Date().toISOString() } : f
    );
    onUpdateFolders(updatedFolders);
    if (selectedFolderId === folderToDelete.id) {
      setSelectedFolderId(null);
    }
    setFolderToDelete(null);
  };

  const getDocIcon = (type: SharedDocumentType) => {
    switch (type) {
      case 'PDF': return { icon: 'fa-file-pdf', color: 'text-rose-500 bg-rose-50' };
      case 'IMAGE': return { icon: 'fa-file-image', color: 'text-indigo-500 bg-indigo-50' };
      case 'VIDEO': return { icon: 'fa-file-video', color: 'text-amber-500 bg-amber-50' };
      case 'LINK': return { icon: 'fa-link', color: 'text-blue-500 bg-blue-50' };
      case 'DOC': return { icon: 'fa-file-word', color: 'text-sky-500 bg-sky-50' };
      default: return { icon: 'fa-file', color: 'text-slate-500 bg-slate-50' };
    }
  };

  const getDocCount = (folderId: string | null) => {
    if (!folderId) return filteredDocs.length;
    return filteredDocs.filter(d => d.folderId === folderId).length;
  };

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-500 pb-32 ${isDarkMode ? 'dark' : ''}`} ref={topRef}>
      
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center space-x-3 bg-indigo-50 dark:bg-indigo-900/30 w-fit px-4 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800 backdrop-blur-md">
            <i className="fas fa-graduation-cap text-indigo-600 dark:text-indigo-400 text-xs"></i>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Team Portal</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Training Center</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-base">Internal training protocols, contract libraries, and team resources.</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 shrink-0 relative z-10">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
            <button onClick={() => setDisplayMode('tile')} className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${displayMode === 'tile' ? (isDarkMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white shadow-md text-indigo-600') : 'text-slate-400 hover:text-slate-600'}`} title="Tile View"><i className="fas fa-th-large"></i></button>
            <button onClick={() => setDisplayMode('list')} className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${displayMode === 'list' ? (isDarkMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white shadow-md text-indigo-600') : 'text-slate-400 hover:text-slate-600'}`} title="List View"><i className="fas fa-list-ul"></i></button>
          </div>

          <div className="relative group max-w-xs">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Search training assets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[12px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all w-64"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-3 active:scale-95 whitespace-nowrap"
            >
              <i className="fas fa-upload"></i>
              <span>Upload File</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Sidebar Folders */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
               <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>Library Folders</h4>
               {isAdmin && (
                 <button onClick={() => setIsNewFolderModalOpen(true)} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">+ New</button>
               )}
            </div>
            
            <nav className="space-y-2">
               <button 
                 onClick={() => setSelectedFolderId(null)}
                 className={`w-full flex items-center px-4 py-3.5 rounded-2xl transition-all group relative overflow-hidden ${
                   !selectedFolderId 
                     ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/50' 
                     : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                 }`}
               >
                  <i className={`fas fa-layer-group w-8 text-[18px] ${!selectedFolderId ? 'text-white' : 'text-indigo-400'}`}></i>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-left font-black text-[12.5px] tracking-tight">All Training Assets</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${!selectedFolderId ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{getDocCount(null)}</span>
                  </div>
               </button>

               {filteredFolders.map((folder) => {
                 const isSelected = selectedFolderId === folder.id;
                 const count = getDocCount(folder.id);

                 return (
                   <div key={folder.id} className="relative group/folder">
                    <button 
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`w-full flex items-center px-4 py-3.5 rounded-2xl transition-all group relative overflow-hidden ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/50' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                        <i className={`fas ${folder.icon} w-8 text-[18px] ${isSelected ? 'text-white' : 'text-indigo-400'}`}></i>
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex flex-col items-start pr-6 overflow-hidden">
                            <span className="text-left font-black text-[12.5px] tracking-tight truncate w-full">{folder.name}</span>
                            {folder.sharedWithAgentId && isAdmin && (
                              <span className={`text-[8px] font-bold uppercase tracking-widest ${isSelected ? 'text-indigo-100' : 'text-indigo-400'}`}>Private: {agents.find(a => a.id === folder.sharedWithAgentId)?.firstName}</span>
                            )}
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{count}</span>
                        </div>
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFolderToDelete(folder); }}
                        className={`absolute right-10 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover/folder:opacity-100 z-20 ${isSelected ? 'text-indigo-200 hover:bg-white/20 hover:text-white' : 'text-slate-300 hover:bg-rose-50 hover:text-rose-500'}`}
                      >
                        <i className="fas fa-trash-alt text-[10px]"></i>
                      </button>
                    )}
                   </div>
                 );
               })}
            </nav>
          </div>

          {/* Information Box */}
          <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-3 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="relative z-10 flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                 <i className="fas fa-shield-halved text-indigo-400 text-base"></i>
              </div>
              <h5 className="font-black text-[10px] uppercase tracking-widest">Internal Use</h5>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed relative z-10 font-medium">
              Files are for internal brokerage use only. Please do not share public training links with external parties.
            </p>
          </div>
        </aside>

        {/* Documents Main Area */}
        <div className="lg:col-span-3 space-y-10">
          {filteredDocs.length > 0 ? (
            displayMode === 'tile' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {paginatedDocs.map(doc => {
                   const style = getDocIcon(doc.type);
                   const canManage = isAdmin || doc.uploadedById === currentUser.id;

                   return (
                     <div key={doc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-xl transition-all group flex flex-col min-h-[300px]">
                        <div className="h-44 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center relative overflow-hidden group-hover:bg-indigo-50 transition-colors">
                           {doc.type === 'IMAGE' ? (
                             <img src={doc.url} alt={doc.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                           ) : doc.type === 'VIDEO' ? (
                             <div className="flex flex-col items-center">
                               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg text-indigo-600 mb-2 group-hover:scale-110 transition-transform">
                                 <i className="fas fa-play ml-1"></i>
                               </div>
                             </div>
                           ) : (
                             <i className={`fas ${style.icon} text-6xl text-slate-200 dark:text-slate-700`}></i>
                           )}
                           
                           <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3 z-10">
                              <button 
                                onClick={() => window.open(doc.url, '_blank')}
                                className="w-12 h-12 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                                title={doc.type === 'LINK' ? 'Open Link' : 'Open / View File'}
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              {canManage && (
                                <>
                                  <button 
                                    onClick={() => { setEditingDoc(doc); setIsEditModalOpen(true); }}
                                    className="w-12 h-12 rounded-xl bg-white text-slate-700 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                                    title="Edit Document"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button 
                                    onClick={() => setDocToDelete(doc)}
                                    className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                                    title="Move to Trash"
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                                </>
                              )}
                           </div>
                        </div>

                        <div className="p-6 flex flex-col justify-between flex-1">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                               <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border border-current/10 ${style.color}`}>{doc.type}</span>
                               {doc.sharedWithAgentId && isAdmin && (
                                 <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">Private: {agents.find(a => a.id === doc.sharedWithAgentId)?.firstName}</span>
                               )}
                            </div>
                            <h4 className="text-base font-black text-slate-800 dark:text-white tracking-tight line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{doc.name}</h4>
                          </div>
                          
                          <div className="pt-4 border-t border-slate-50 dark:border-slate-800 mt-auto flex items-center justify-between">
                             <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shared by</span>
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{doc.uploadedBy}</span>
                             </div>
                             <span className="text-[9px] font-black text-indigo-500 uppercase">{doc.size || 'External'}</span>
                          </div>
                        </div>
                     </div>
                   );
                 })}
              </div>
            ) : (
              <div className={`rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource Name</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Format</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shared By</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Added On</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                    {paginatedDocs.map(doc => {
                      const style = getDocIcon(doc.type);
                      const canManage = isAdmin || doc.uploadedById === currentUser.id;
                      return (
                        <tr key={doc.id} className={`transition-all group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-indigo-50/30'}`}>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-4">
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shadow-sm ${style.color} border border-current/10`}>
                                 <i className={`fas ${style.icon}`}></i>
                               </div>
                               <div>
                                 <p className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{doc.name}</p>
                                 {doc.sharedWithAgentId && isAdmin && (
                                   <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Private: {agents.find(a => a.id === doc.sharedWithAgentId)?.firstName}</p>
                                 )}
                               </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border border-current/10 ${style.color}`}>{doc.type}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">{doc.uploadedBy[0]}</div>
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{doc.uploadedBy}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(doc.createdAt).toLocaleDateString()}</span>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <div className="flex items-center justify-end space-x-2">
                                <button 
                                  onClick={() => window.open(doc.url, '_blank')}
                                  className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                  title="Open / View"
                                >
                                  <i className="fas fa-eye text-[10px]"></i>
                                </button>
                                {canManage && (
                                  <>
                                    <button 
                                      onClick={() => { setEditingDoc(doc); setIsEditModalOpen(true); }}
                                      className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                    >
                                      <i className="fas fa-edit text-[10px]"></i>
                                    </button>
                                    <button 
                                      onClick={() => setDocToDelete(doc)}
                                      className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                    >
                                      <i className="fas fa-trash-alt text-[10px]"></i>
                                    </button>
                                  </>
                                )}
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="py-40 bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800 text-center flex flex-col items-center justify-center opacity-40">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl text-slate-200 dark:text-slate-700 shadow-inner mb-6">
                 <i className="fas fa-folder-open"></i>
              </div>
              <p className="text-xl font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600">No documents found</p>
              {isAdmin && (
                <button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl"
                >
                  Upload File
                </button>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          <div className={`flex flex-col md:flex-row items-center justify-between border rounded-[2rem] p-8 shadow-sm gap-8 mt-10 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center space-x-4 border rounded-xl px-6 py-3 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className={`bg-transparent border-none text-sm font-black outline-none cursor-pointer ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                {[8, 12, 24, 48, 100].map(n => <option key={n} value={n} className={isDarkMode ? 'bg-slate-900' : ''}>{n}</option>)}
              </select>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">per page</span>
            </div>
            <div className="flex flex-col items-center space-y-3">
               <div className="flex items-center space-x-6">
                  <button disabled={currentPage === 1} onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); scrollToTop(); }} className={`w-12 h-12 flex items-center justify-center rounded-xl border disabled:opacity-30 shadow-sm transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><i className="fas fa-chevron-left"></i></button>
                  <div className={`text-sm font-black uppercase tracking-[0.2em] px-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Page {currentPage} of {totalPages || 1}</div>
                  <button disabled={currentPage >= totalPages} onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); scrollToTop(); }} className={`w-12 h-12 flex items-center justify-center rounded-xl border disabled:opacity-30 shadow-sm transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><i className="fas fa-chevron-right"></i></button>
               </div>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Showing {paginatedDocs.length} of {filteredDocs.length} training assets</p>
            </div>
            <button onClick={scrollToTop} className={`flex items-center space-x-3 px-8 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all ${isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-900 text-white hover:bg-black shadow-slate-200'}`}><i className="fas fa-arrow-up"></i><span>Back to Top</span></button>
          </div>
        </div>
      </div>

      {/* Deletion Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-12 text-center animate-in zoom-in-95">
              <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner border border-rose-100 dark:border-rose-800">
                <i className="fas fa-trash-can"></i>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">Move to Trash bin?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-semibold mb-10 leading-relaxed">
                You are about to move <span className="text-slate-900 dark:text-white font-black">{docToDelete.name}</span> to the trash bin. This item will be archived and hidden from the library.
              </p>
              <div className="grid grid-cols-2 gap-6">
                 <button onClick={() => setDocToDelete(null)} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-xs">Keep</button>
                 <button onClick={executeTrashDoc} className="py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-rose-100">Trash Document</button>
              </div>
           </div>
        </div>
      )}

      {/* Folder Deletion Confirmation Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-12 text-center animate-in zoom-in-95">
              <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner border border-rose-100 dark:border-rose-800">
                <i className="fas fa-trash-can"></i>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">Move Folder to Trash?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-semibold mb-10 leading-relaxed">
                You are about to move the <span className="text-slate-900 dark:text-white font-black">{folderToDelete.name}</span> folder to the trash bin. Files within this category will remain available in the "All Assets" view.
              </p>
              <div className="grid grid-cols-2 gap-6">
                 <button onClick={() => setFolderToDelete(null)} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-xs">Keep</button>
                 <button onClick={executeTrashFolder} className="py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-rose-100">Trash Folder</button>
              </div>
           </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingDoc && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-10 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Edit Asset</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><i className="fas fa-times text-xl"></i></button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</label>
                    <input 
                      required 
                      type="text" 
                      value={editingDoc.name}
                      onChange={e => setEditingDoc({...editingDoc, name: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 dark:text-white"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Change Category</label>
                    <select 
                      value={editingDoc.folderId}
                      onChange={e => setEditingDoc({...editingDoc, folderId: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none"
                    >
                       {filteredFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Limit Access to Agent (Optional)</label>
                    <select 
                      value={editingDoc.sharedWithAgentId || ''}
                      onChange={e => setEditingDoc({...editingDoc, sharedWithAgentId: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none"
                    >
                       <option value="">Visible to Everyone</option>
                       {agents.filter(a => a.role === UserRole.AGENT).map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                    </select>
                 </div>
                 {(editingDoc.type === 'LINK' || editingDoc.type === 'VIDEO') && (
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Content URL</label>
                       <input 
                         required 
                         type="url" 
                         value={editingDoc.url}
                         onChange={e => setEditingDoc({...editingDoc, url: e.target.value})}
                         className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 dark:text-white"
                       />
                    </div>
                 )}
                 <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-xs">Discard</button>
                    <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-100">Save</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* New Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsNewFolderModalOpen(false)}></div>
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-10 relative z-10 animate-in zoom-in-95">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-8">Create New Category</h3>
              <form onSubmit={handleCreateFolder} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Folder Name</label>
                    <input 
                      required 
                      type="text" 
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 dark:text-white"
                      placeholder="e.g. Sales Training Q1"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Limit Access to Agent (Optional)</label>
                    <select 
                      value={newFolderSharedWith}
                      onChange={e => setNewFolderSharedWith(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none"
                    >
                       <option value="">Visible to Everyone</option>
                       {agents.filter(a => a.role === UserRole.AGENT).map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                    </select>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsNewFolderModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-xs">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-200">Create Folder</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsUploadModalOpen(false)}></div>
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-10 relative z-10 animate-in zoom-in-95 max-h-[95vh] overflow-y-auto scrollbar-hide">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Upload Asset</h3>
                <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><i className="fas fa-times text-xl"></i></button>
              </div>
              <form onSubmit={handleUpload} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</label>
                    <input 
                      required 
                      type="text" 
                      value={uploadData.name}
                      onChange={e => setUploadData({...uploadData, name: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 dark:text-white"
                      placeholder="e.g. Sales Playbook Q1"
                    />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Content Type</label>
                      <select 
                        value={uploadData.type}
                        onChange={e => setUploadData({...uploadData, type: e.target.value as SharedDocumentType})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none"
                      >
                         <option value="PDF">Upload PDF</option>
                         <option value="IMAGE">Image / Graphic</option>
                         <option value="VIDEO">Training Video</option>
                         <option value="LINK">Web Link / URL</option>
                         <option value="DOC">Word Doc / Sheet</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Folder</label>
                      <select 
                        required
                        value={uploadData.folderId}
                        onChange={e => setUploadData({...uploadData, folderId: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none"
                      >
                         <option value="">-- Select Folder --</option>
                         {filteredFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                   </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Limit Visibility to Specific Agent (Optional)</label>
                    <select 
                      value={uploadData.sharedWithAgentId}
                      onChange={e => setUploadData({...uploadData, sharedWithAgentId: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none"
                    >
                       <option value="">Visible to Everyone</option>
                       {agents.filter(a => a.role === UserRole.AGENT).map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                    </select>
                 </div>

                 {/* Physical File Upload UI */}
                 {uploadData.type !== 'LINK' && (
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select File from Computer</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center space-y-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          onChange={handleFileChange}
                          accept={
                            uploadData.type === 'PDF' ? '.pdf' : 
                            uploadData.type === 'IMAGE' ? 'image/*' : 
                            uploadData.type === 'VIDEO' ? 'video/*' : 
                            '.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'
                          }
                        />
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-inner group-hover:scale-110 transition-all">
                          <i className={`fas ${selectedFile ? 'fa-file-circle-check text-emerald-500' : 'fa-folder-open'}`}></i>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-slate-800">
                            {selectedFile ? selectedFile.name : 'Click to Browse Files'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                            {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : `Select a ${uploadData.type} file`}
                          </p>
                        </div>
                      </div>
                   </div>
                 )}

                 {(uploadData.type === 'LINK' || (uploadData.type === 'VIDEO' && !selectedFile)) && (
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destination URL</label>
                      <input 
                        required 
                        type="url" 
                        value={uploadData.url}
                        onChange={e => setUploadData({...uploadData, url: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 dark:text-white"
                        placeholder="https://..."
                      />
                   </div>
                 )}
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsUploadModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-xs">Discard</button>
                    <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-200">Confirm Upload</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsView;