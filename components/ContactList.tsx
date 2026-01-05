import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Lead, LeadStatus, LeadTemperature } from '../types.ts';

interface ContactListProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
  onAddLeads: (newLeads: Lead[]) => void;
  onBulkUpdateLeads?: (updatedLeads: Lead[]) => void;
  availableSources: string[];
  availableTags: string[];
  onUpdateSources: (sources: string[]) => void;
  onUpdateTags: (tags: string[]) => void;
}

type SortOption = 'NAME_ASC' | 'NAME_DESC' | 'NEWEST_ADDED' | 'RECENTLY_UPDATED' | 'SOURCE_ASC' | 'BUYERS_FIRST' | 'SELLERS_FIRST' | 'INVESTORS_FIRST' | 'PAST_CLIENTS_FIRST';
type ColumnId = 'selection' | 'name' | 'email' | 'phone' | 'address' | 'secondary' | 'tags' | 'source' | 'actions';

const sortLabels: Record<SortOption, string> = {
  NAME_ASC: 'Name (A-Z)',
  NAME_DESC: 'Name (Z-A)',
  NEWEST_ADDED: 'Newest Added',
  RECENTLY_UPDATED: 'Recently Updated',
  SOURCE_ASC: 'Source (A-Z)',
  BUYERS_FIRST: 'Buyers First',
  SELLERS_FIRST: 'Sellers First',
  INVESTORS_FIRST: 'Investors First',
  PAST_CLIENTS_FIRST: 'Past Clients First'
};

const RELATIONSHIP_OPTIONS = ['Spouse', 'Sister', 'Brother', 'Friend', 'Partner', 'Other'];

const INITIAL_COLUMN_ORDER: ColumnId[] = ['selection', 'name', 'email', 'phone', 'address', 'secondary', 'tags', 'source', 'actions'];

const columnConfigs: Record<ColumnId, { label: string; align: 'left' | 'right' | 'center' }> = {
  selection: { label: '', align: 'center' },
  name: { label: 'Contact Name', align: 'left' },
  email: { label: 'Email Address', align: 'left' },
  phone: { label: 'Phone Number', align: 'left' },
  address: { label: 'Property Address', align: 'left' },
  secondary: { label: 'Secondary Person', align: 'left' },
  tags: { label: 'Tags', align: 'left' },
  source: { label: 'Source', align: 'left' },
  actions: { label: 'Actions', align: 'right' }
};

const ContactList: React.FC<ContactListProps> = ({ 
  leads, 
  onSelectLead, 
  onUpdateLead,
  onAddLeads,
  onBulkUpdateLeads,
  availableSources,
  availableTags,
  onUpdateSources,
  onUpdateTags
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('NAME_ASC');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Lead | null>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Modal specific state
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceInput, setNewSourceInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');

  // Column Drag and Drop State
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(INITIAL_COLUMN_ORDER);
  const [draggedColumnIdx, setDraggedColumnIdx] = useState<number | null>(null);
  const [overColumnIdx, setOverColumnIdx] = useState<number | null>(null);

  const topRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emptyLead: Partial<Lead> = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: LeadStatus.ACTIVE,
    temperature: LeadTemperature.NORMAL,
    source: availableSources[0] || 'Zillow',
    tags: [],
    propertyType: 'PRIMARY',
    propertyAddress: '',
    budget: 0,
    dob: '',
    weddingAnniversary: '',
    homeAnniversary: '',
    spouseFirstName: '',
    spouseLastName: '',
    spouseEmail: '',
    spousePhone: '',
    spouseDob: '',
    secondaryContactRelationship: 'Spouse'
  };

  const [leadFormData, setLeadFormData] = useState<Partial<Lead>>(emptyLead);

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: leads.length,
      buyers: leads.filter(l => l.tags?.some(t => t.toLowerCase() === 'buyer')).length,
      sellers: leads.filter(l => l.tags?.some(t => t.toLowerCase() === 'seller')).length,
      investors: leads.filter(l => l.tags?.some(t => t.toLowerCase() === 'investor')).length,
      pastClients: leads.filter(l => l.tags?.some(t => t.toLowerCase() === 'past client') || l.source === 'Past Client').length,
    };
  }, [leads]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSources, selectedTags, sortBy, itemsPerPage]);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 1) return "";
    if (phoneNumberLength < 4) return `(${phoneNumber}`;
    if (phoneNumberLength < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const formatBudget = (value: number | undefined) => {
    if (value === undefined || value === 0) return '';
    return value.toLocaleString();
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(rawValue)) {
      setLeadFormData({ ...leadFormData, budget: rawValue ? parseInt(rawValue) : 0 });
    }
  };

  const handleToggleSourceFilter = (source: string) => {
    setSelectedSources(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]);
  };

  const handleToggleTagFilter = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleLeadTag = (tag: string) => {
    const currentTags = leadFormData.tags || [];
    if (currentTags.includes(tag)) {
      setLeadFormData({ ...leadFormData, tags: currentTags.filter(t => t !== tag) });
    } else {
      setLeadFormData({ ...leadFormData, tags: [...currentTags, tag] });
    }
  };

  const handleAddNewSource = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newSourceInput.trim();
    if (val && !availableSources.includes(val)) {
      onUpdateSources([...availableSources, val]);
      setLeadFormData({ ...leadFormData, source: val });
    }
    setNewSourceInput('');
    setIsAddingSource(false);
  };

  const handleAddNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newTagInput.trim();
    if (val && !availableTags.includes(val)) {
      onUpdateTags([...availableTags, val]);
      const currentTags = leadFormData.tags || [];
      if (!currentTags.includes(val)) {
        setLeadFormData({ ...leadFormData, tags: [...currentTags, val] });
      }
    }
    setNewTagInput('');
  };

  const confirmDeleteContact = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    setContactToDelete(lead);
  };

  const executeDeleteContact = () => {
    if (contactToDelete) {
      onUpdateLead({ 
        ...contactToDelete, 
        isDeleted: true, 
        deletedAt: new Date().toISOString() 
      });
      setContactToDelete(null);
      setSelectedIds(prev => prev.filter(id => id !== contactToDelete.id));
    }
  };

  const filteredAndSortedLeads = useMemo(() => {
    return leads
      .filter(lead => {
        const fullName = `${lead.firstName} ${lead.lastName}`.toLowerCase();
        const address = (lead.propertyAddress || '').toLowerCase();
        const spouseName = `${lead.spouseFirstName || ''} ${lead.spouseLastName || ''}`.toLowerCase();
        const spouseEmail = (lead.spouseEmail || '').toLowerCase();
        
        const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                             lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             address.includes(searchTerm.toLowerCase()) ||
                             spouseName.includes(searchTerm.toLowerCase()) ||
                             spouseEmail.includes(searchTerm.toLowerCase());
        
        const matchesSource = selectedSources.length === 0 || selectedSources.includes(lead.source);
        const matchesTag = selectedTags.length === 0 || (lead.tags && selectedTags.some(tag => lead.tags.includes(tag)));
        
        return matchesSearch && matchesSource && matchesTag;
      })
      .sort((a, b) => {
        const isBuyer = (l: Lead) => l.tags?.some(t => t.toLowerCase() === 'buyer');
        const isSeller = (l: Lead) => l.tags?.some(t => t.toLowerCase() === 'seller');
        const isInvestor = (l: Lead) => l.tags?.some(t => t.toLowerCase() === 'investor');
        const isPastClient = (l: Lead) => l.tags?.some(t => t.toLowerCase() === 'past client') || l.source === 'Past Client';

        switch (sortBy) {
          case 'NAME_ASC': return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          case 'NAME_DESC': return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
          case 'BUYERS_FIRST':
            if (isBuyer(a) && !isBuyer(b)) return -1;
            if (!isBuyer(a) && isBuyer(b)) return 1;
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          case 'SELLERS_FIRST':
            if (isSeller(a) && !isSeller(b)) return -1;
            if (!isSeller(a) && isSeller(b)) return 1;
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          case 'INVESTORS_FIRST':
            if (isInvestor(a) && !isInvestor(b)) return -1;
            if (!isInvestor(a) && isInvestor(b)) return 1;
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          case 'PAST_CLIENTS_FIRST':
            if (isPastClient(a) && !isPastClient(b)) return -1;
            if (!isPastClient(a) && isPastClient(b)) return 1;
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          case 'NEWEST_ADDED': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'RECENTLY_UPDATED': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          case 'SOURCE_ASC': return a.source.localeCompare(b.source);
          default: return 0;
        }
      });
  }, [leads, searchTerm, selectedSources, selectedTags, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage);
  const paginatedLeads = filteredAndSortedLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Bulk Selection Handlers
  const toggleId = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (filteredAndSortedLeads.every(l => selectedIds.includes(l.id))) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSortedLeads.map(l => l.id));
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.length > 0) {
      setIsBulkDeleteModalOpen(true);
    }
  };

  const executeBulkDelete = () => {
    const deletedAt = new Date().toISOString();
    const updatedLeads = leads.map(l => 
      selectedIds.includes(l.id) ? { ...l, isDeleted: true, deletedAt } : l
    );
    
    if (onBulkUpdateLeads) {
      onBulkUpdateLeads(updatedLeads);
    } else {
      selectedIds.forEach(id => {
        const lead = leads.find(l => l.id === id);
        if (lead) onUpdateLead({ ...lead, isDeleted: true, deletedAt });
      });
    }
    setSelectedIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const handleBulkTagApply = (tag: string) => {
    const updatedLeads = leads.map(l => {
      if (selectedIds.includes(l.id)) {
        const currentTags = l.tags || [];
        if (!currentTags.includes(tag)) {
          return { ...l, tags: [...currentTags, tag], updatedAt: new Date().toISOString() };
        }
      }
      return l;
    });
    
    if (onBulkUpdateLeads) {
      onBulkUpdateLeads(updatedLeads);
    } else {
      selectedIds.forEach(id => {
        const lead = leads.find(l => l.id === id);
        if (lead) {
          const currentTags = lead.tags || [];
          if (!currentTags.includes(tag)) {
            onUpdateLead({ ...lead, tags: [...currentTags, tag], updatedAt: new Date().toISOString() });
          }
        }
      });
    }
    setIsBulkTagModalOpen(false);
    setSelectedIds([]);
  };

  const openEditModal = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    setEditingLead(lead);
    setLeadFormData({ ...lead });
    setIsEditModalOpen(true);
    setIsTagDropdownOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLead) {
      onUpdateLead({ 
        ...editingLead, 
        ...leadFormData as Lead, 
        updatedAt: new Date().toISOString(),
        estimatedDealValue: (leadFormData.budget || 0) * 0.03
      });
    } else {
      const newContact: Lead = {
        ...leadFormData as Lead,
        id: `lead_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
        estimatedDealValue: (leadFormData.budget || 0) * 0.03,
        brokerageId: 'brk_7721',
        assignedAgentId: 'agent_1'
      };
      onAddLeads([newContact]);
    }
    setIsEditModalOpen(false);
  };

  const handleColumnDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColumnIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (index !== overColumnIdx) {
      setOverColumnIdx(index);
    }
  };

  const handleColumnDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedColumnIdx === null || draggedColumnIdx === targetIdx) return;

    const newOrder = [...columnOrder];
    const [removed] = newOrder.splice(draggedColumnIdx, 1);
    newOrder.splice(targetIdx, 0, removed);
    
    setColumnOrder(newOrder);
    setDraggedColumnIdx(null);
    setOverColumnIdx(null);
  };

  const getSourceIcon = (source: string) => {
    const s = (source || '').toLowerCase();
    if (s.includes('zillow')) return { icon: 'fas fa-house-chimney', color: 'text-[#006AFF]' };
    if (s.includes('realtor')) return { icon: 'fas fa-house-circle-check', color: 'text-[#D92228]' };
    if (s.includes('facebook')) return { icon: 'fab fa-facebook', color: 'text-[#1877F2]' };
    if (s.includes('google')) return { icon: 'fab fa-google', color: 'text-[#4285F4]' };
    if (s.includes('referral')) return { icon: 'fas fa-handshake', color: 'text-indigo-500' };
    if (s.includes('open house')) return { icon: 'fas fa-door-open', color: 'text-amber-500' };
    return { icon: 'fas fa-keyboard', color: 'text-slate-400' };
  };

  // Export Logic
  const downloadBlob = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'Secondary Contact', 'Tags', 'Source', 'Date Added'];
    const rows = filteredAndSortedLeads.map(l => [
      l.firstName,
      l.lastName,
      l.email,
      l.phone,
      l.propertyAddress || '',
      l.spouseFirstName ? `${l.spouseFirstName} ${l.spouseLastName}` : '',
      (l.tags || []).join(';'),
      l.source,
      new Date(l.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    downloadBlob(csvContent, `contacts_export_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    setIsExportMenuOpen(false);
  };

  const handleExportExcel = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'Secondary Contact', 'Tags', 'Source', 'Date Added'];
    const rows = filteredAndSortedLeads.map(l => `
      <tr>
        <td>${l.firstName}</td>
        <td>${l.lastName}</td>
        <td>${l.email}</td>
        <td>${l.phone}</td>
        <td>${l.propertyAddress || ''}</td>
        <td>${l.spouseFirstName ? `${l.spouseFirstName} ${l.spouseLastName}` : ''}</td>
        <td>${(l.tags || []).join(', ')}</td>
        <td>${l.source}</td>
        <td>${new Date(l.createdAt).toLocaleDateString()}</td>
      </tr>`).join('');

    const excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <tr style="background-color:#f3f4f6; font-weight:bold;">${headers.map(h => `<td>${h}</td>`).join('')}</tr>
          ${rows}
        </table>
      </body>
      </html>
    `;
    downloadBlob(excelContent, `contacts_export_${new Date().toISOString().split('T')[0]}.xls`, 'application/vnd.ms-excel');
    setIsExportMenuOpen(false);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newLeads: Lead[] = [];
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/"/g, ''));
        const leadObj: any = {};
        headers.forEach((h, idx) => {
          const key = h.replace(/ /g, '');
          leadObj[key] = values[idx];
        });

        const leadToAdd: Lead = {
          id: `contact_imp_${Date.now()}_${i}`,
          brokerageId: 'brk_7721',
          assignedAgentId: 'agent_1',
          firstName: leadObj.firstname || leadObj.name?.split(' ')[0] || 'Imported',
          lastName: leadObj.lastname || leadObj.name?.split(' ').slice(1).join(' ') || 'Contact',
          email: leadObj.email || `imported.${Date.now()}.${i}@example.com`,
          phone: leadObj.phone || '000-000-0000',
          status: LeadStatus.ACTIVE,
          temperature: LeadTemperature.NORMAL,
          source: leadObj.source || 'CSV Import',
          tags: leadObj.tags ? leadObj.tags.split(';').map((t: string) => t.trim()) : ['Imported'],
          propertyType: 'PRIMARY',
          propertyAddress: leadObj.address || leadObj.propertyaddress || '',
          budget: parseInt(leadObj.budget) || 0,
          notes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          estimatedDealValue: 0
        };
        newLeads.push(leadToAdd);
      }
      
      if (newLeads.length > 0) {
        onAddLeads(newLeads);
        alert(`Successfully imported ${newLeads.length} contacts.`);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const renderCell = (lead: Lead, columnId: ColumnId) => {
    switch (columnId) {
      case 'selection':
        return (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <input 
              type="checkbox" 
              checked={selectedIds.includes(lead.id)}
              onChange={() => toggleId(lead.id)}
              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all shadow-sm"
            />
          </div>
        );
      case 'name':
        return (
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 transition-transform">{lead.firstName[0]}{lead.lastName[0]}</div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-800">{lead.firstName} {lead.lastName}</span>
            </div>
          </div>
        );
      case 'email':
        return <span className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors truncate block max-w-[200px]">{lead.email}</span>;
      case 'phone':
        return <span className="text-sm font-black text-slate-700 whitespace-nowrap">{lead.phone}</span>;
      case 'address':
        return <span className="text-sm font-semibold text-slate-400 truncate block max-w-[250px]">{lead.propertyAddress || <span className="italic text-slate-200">No address</span>}</span>;
      case 'secondary':
        return lead.spouseFirstName ? (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-400 shrink-0">
              <i className="fas fa-user-plus"></i>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-700 truncate">{lead.spouseFirstName} {lead.spouseLastName}</span>
              <div className="flex items-center space-x-2.5 mt-0.5">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{lead.secondaryContactRelationship}</span>
                {lead.spouseEmail && <a href={`mailto:${lead.spouseEmail}`} className="text-indigo-400 hover:text-indigo-600 transition-colors"><i className="fas fa-envelope text-[9px]"></i></a>}
                {lead.spousePhone && <a href={`tel:${lead.spousePhone}`} className="text-indigo-400 hover:text-indigo-600 transition-colors"><i className="fas fa-phone text-[9px]"></i></a>}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">None</span>
        );
      case 'tags':
        return (
          <div className="flex flex-wrap gap-1">
            {lead.tags?.slice(0, 3).map(tag => (
              <span key={tag} className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">{tag}</span>
            ))}
          </div>
        );
      case 'source':
        const sourceInfo = getSourceIcon(lead.source);
        return (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-100 whitespace-nowrap w-fit">
            <i className={`${sourceInfo.icon} ${sourceInfo.color} text-[11px]`}></i>
            <span className="text-[10px] font-black uppercase tracking-widest">{lead.source}</span>
          </div>
        );
      case 'actions':
        return (
          <div className="flex items-center justify-end space-x-2">
            <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all shadow-sm" title="Email Contact"><i className="fas fa-envelope text-xs"></i></a>
            <button onClick={(e) => openEditModal(e, lead)} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Edit Contact"><i className="fas fa-edit text-xs"></i></button>
            <button onClick={(e) => confirmDeleteContact(e, lead)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Move to Trash"><i className="fas fa-trash-can text-xs"></i></button>
          </div>
        );
      default: return null;
    }
  };

  const isAllSelected = filteredAndSortedLeads.length > 0 && filteredAndSortedLeads.every(l => selectedIds.includes(l.id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  return (
    <div className="space-y-6" ref={topRef}>
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative z-30">
        <div className="relative flex-1 group">
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input 
            type="text" 
            placeholder="Search by name, email, secondary contact or address..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-inner font-bold" 
          />
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
                title="Import Contacts (CSV)"
             >
                <i className="fas fa-upload"></i>
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
             
             <div className="relative">
                <button 
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all shadow-sm ${isExportMenuOpen ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-white hover:text-indigo-600'}`}
                  title="Export Contacts"
                >
                   <i className="fas fa-download"></i>
                </button>
                
                {isExportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsExportMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[70] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <p className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Select Format</p>
                      <button onClick={handleExportExcel} className="w-full text-left px-5 py-3 hover:bg-indigo-50 transition-colors flex items-center space-x-3 group">
                        <i className="fas fa-file-excel text-emerald-500 text-xs"></i>
                        <span className="text-xs font-bold text-slate-700">Excel (.xls)</span>
                      </button>
                      <button onClick={handleExportCSV} className="w-full text-left px-5 py-3 hover:bg-indigo-50 transition-colors flex items-center space-x-3 group">
                        <i className="fas fa-file-csv text-blue-500 text-xs"></i>
                        <span className="text-xs font-bold text-slate-700">CSV (.csv)</span>
                      </button>
                    </div>
                  </>
                )}
             </div>
          </div>

          <button onClick={() => setIsSettingsModalOpen(true)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm" title="Configure Table Layout"><i className="fas fa-cog text-lg"></i></button>

          <div className="relative">
            <button onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)} className={`h-[48px] px-6 border rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm transition-all flex items-center space-x-3 ${ (selectedSources.length > 0 || selectedTags.length > 0) ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}><i className="fas fa-filter"></i><span>Filters</span>{(selectedSources.length + selectedTags.length) > 0 && <span className="ml-1 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] scale-90 leading-none">{selectedSources.length + selectedTags.length}</span>}</button>
            {isFilterPanelOpen && (
              <>
                <div className="fixed inset-0 z-[90] bg-transparent" onClick={() => setIsFilterPanelOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-[320px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Contacts</h4><button onClick={() => { setSelectedSources([]); setSelectedTags([]); }} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Reset</button></div>
                  <div className="p-4 max-h-[450px] overflow-y-auto scrollbar-hide space-y-6">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Lead Source</p><div className="flex flex-wrap gap-2">{availableSources.map(source => (<button key={source} onClick={() => handleToggleSourceFilter(source)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${selectedSources.includes(source) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>{source}</button>))}</div></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Classification Tags</p><div className="flex flex-wrap gap-2">{availableTags.map(tag => (<button key={tag} onClick={() => handleToggleTagFilter(tag)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${selectedTags.includes(tag) ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>{tag}</button>))}</div></div>
                  </div>
                </div>
              </>
            )}
          </div>

          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDeleteClick}
              className="flex items-center space-x-3 px-6 py-3.5 bg-rose-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 whitespace-nowrap animate-in zoom-in-95 duration-200 active:scale-95"
            >
              <i className="fas fa-trash-can"></i>
              <span>DELETE ({selectedIds.length})</span>
            </button>
          )}

          <button onClick={() => { setEditingLead(null); setLeadFormData(emptyLead); setIsEditModalOpen(true); }} className="flex items-center space-x-3 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 whitespace-nowrap"><i className="fas fa-plus"></i><span>New Contact</span></button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Contacts', value: stats.total, icon: 'fa-address-book', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Buyers', value: stats.buyers, icon: 'fa-cart-shopping', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Sellers', value: stats.sellers, icon: 'fa-house-signal', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Investors', value: stats.investors, icon: 'fa-chart-pie', color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Past Clients', value: stats.pastClients, icon: 'fa-clock-rotate-left', color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center text-sm shadow-sm`}><i className={`fas ${stat.icon}`}></i></div>
            <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p><p className="text-lg font-black text-slate-800">{stat.value}</p></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columnOrder.map((colId, idx) => (
                <th 
                  key={colId} 
                  draggable={colId !== 'selection'}
                  onDragStart={(e) => colId !== 'selection' && handleColumnDragStart(e, idx)} 
                  onDragOver={(e) => colId !== 'selection' && handleColumnDragOver(e, idx)} 
                  onDrop={(e) => colId !== 'selection' && handleColumnDrop(e, idx)} 
                  onDragEnd={() => { setDraggedColumnIdx(null); setOverColumnIdx(null); }} 
                  className={`px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors ${overColumnIdx === idx ? 'bg-indigo-50' : ''} ${colId !== 'selection' ? 'cursor-move' : 'cursor-default'}`}
                >
                  <div className={`flex items-center ${columnConfigs[colId].align === 'center' ? 'justify-center' : ''}`}>
                    {colId === 'selection' ? (
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          checked={isAllSelected}
                          ref={input => {
                            if (input) input.indeterminate = isSomeSelected;
                          }}
                          onChange={handleSelectAll}
                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm transition-all"
                        />
                      </div>
                    ) : (
                      <>
                        <i className="fas fa-grip-vertical mr-2 opacity-10"></i>
                        {columnConfigs[colId].label}
                      </>
                    )}
                  </div>
                  {overColumnIdx === idx && <div className="absolute inset-y-0 left-0 w-1 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedLeads.map(lead => (
              <tr 
                key={lead.id} 
                onClick={() => onSelectLead(lead)} 
                className={`hover:bg-indigo-50/30 transition-all cursor-pointer group ${selectedIds.includes(lead.id) ? 'bg-indigo-50/20' : ''}`}
              >
                {columnOrder.map(colId => (
                  <td key={`${lead.id}-${colId}`} className={`px-8 py-6 ${columnConfigs[colId].align === 'right' ? 'text-right' : columnConfigs[colId].align === 'center' ? 'text-center' : ''}`}>
                    {renderCell(lead, colId)}
                  </td>
                ))}
              </tr>
            ))}
            {paginatedLeads.length === 0 && (<tr><td colSpan={columnOrder.length} className="px-8 py-20 text-center"><div className="flex flex-col items-center justify-center text-slate-300"><i className="fas fa-users-slash text-5xl mb-4 opacity-20"></i><p className="text-sm font-black uppercase tracking-widest">No contacts matched your search</p></div></td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm gap-6 mt-4">
        <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl px-5 py-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span><select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="bg-transparent border-none text-xs font-black text-slate-700 outline-none cursor-pointer">{[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}</select><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">per page</span></div>
        <div className="flex flex-col items-center space-y-2"><div className="flex items-center space-x-4"><button disabled={currentPage === 1} onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); scrollToTop(); }} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"><i className="fas fa-chevron-left"></i></button><div className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] px-4">Page {currentPage} of {totalPages || 1}</div><button disabled={currentPage >= totalPages} onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); scrollToTop(); }} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"><i className="fas fa-chevron-right"></i></button></div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing {paginatedLeads.length} of {filteredAndSortedLeads.length} contacts</p></div>
        <button onClick={scrollToTop} className="flex items-center space-x-3 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"><i className="fas fa-arrow-up"></i><span>Back to Top</span></button>
      </div>

      {/* Bulk Tag Modal */}
      {isBulkTagModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsBulkTagModalOpen(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-xl relative z-10 p-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Apply Bulk Tag</h3>
              <button onClick={() => setIsBulkTagModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"><i className="fas fa-times text-xl"></i></button>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-8">Apply a classification tag to the {selectedIds.length} selected contacts.</p>
            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto scrollbar-hide pr-2">
              {availableTags.map(tag => (
                <button 
                  key={tag} 
                  onClick={() => handleBulkTagApply(tag)}
                  className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-400 hover:bg-white hover:shadow-md transition-all text-left group"
                >
                  <span className="text-xs font-black text-slate-700 uppercase tracking-widest group-hover:text-indigo-600">{tag}</span>
                </button>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t border-slate-100 flex items-center space-x-4">
               <input 
                 type="text" 
                 placeholder="New custom tag..." 
                 className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     const val = e.currentTarget.value.trim();
                     if (val) {
                       onUpdateTags([...availableTags, val]);
                       handleBulkTagApply(val);
                     }
                   }
                 }}
               />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsBulkDeleteModalOpen(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] border border-slate-200 w-full max-w-md relative z-10 p-12 text-center animate-in zoom-in-95 duration-200">
             <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">
                <i className="fas fa-trash-can"></i>
             </div>
             <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Move to Trash?</h3>
             <p className="text-slate-500 font-semibold leading-relaxed mb-10">
               You are about to move <span className="text-slate-900 font-black">{selectedIds.length} selected contacts</span> to the trash bin. Are you sure you want to proceed?
             </p>
             <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="py-5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeBulkDelete}
                  className="py-5 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95"
                >
                  Confirm Delete
                </button>
             </div>
          </div>
        </div>
      )}

      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsSettingsModalOpen(false)}></div><div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-2xl relative z-10 p-10 animate-in zoom-in-95 duration-200"><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800 tracking-tight">Configure Contact Table</h3><button onClick={() => setIsSettingsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"><i className="fas fa-times text-xl"></i></button></div><p className="text-xs text-slate-400 font-medium mb-8 ml-1">Drag and drop columns to reorder the table display for your primary contacts view.</p><div className="grid grid-cols-2 gap-3">{columnOrder.filter(c => c !== 'selection').map((colId, idx) => (<div key={colId} draggable onDragStart={(e) => handleColumnDragStart(e, idx + 1)} onDragOver={(e) => handleColumnDragOver(e, idx + 1)} onDrop={(e) => handleColumnDrop(e, idx + 1)} className={`p-4 bg-slate-50 border-2 border-transparent rounded-2xl cursor-move flex items-center justify-between group hover:border-indigo-400 transition-all ${draggedColumnIdx === idx + 1 ? 'opacity-20' : ''}`}><div className="flex items-center space-x-4"><i className="fas fa-grip-vertical text-slate-300 group-hover:text-indigo-400 transition-colors"></i><span className="text-xs font-black text-slate-700 uppercase tracking-widest">{columnConfigs[colId].label}</span></div></div>))}</div><div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between"><button onClick={() => setColumnOrder(INITIAL_COLUMN_ORDER)} className="text-xs font-black text-rose-500 uppercase tracking-widest hover:underline flex items-center"><i className="fas fa-rotate-left mr-2"></i>Reset to Defaults</button><button onClick={() => setIsSettingsModalOpen(false)} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl hover:bg-black transition-all">Save Column Layout</button></div></div></div>
      )}

      {contactToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setContactToDelete(null)}></div><div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-md p-8 relative z-10 animate-in zoom-in-95 duration-200 text-[12px]"><div className="flex items-center space-x-4 mb-6 text-rose-600"><div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm"><i className="fas fa-trash-can"></i></div><h3 className="text-xl font-black text-slate-800 tracking-tight">Move to Trash?</h3></div><p className="text-slate-600 mb-8 text-base font-semibold leading-relaxed">Are you sure you want to delete <span className="text-slate-900 font-black">{contactToDelete.firstName} {contactToDelete.lastName}</span>? This item will be moved to the trash bin.</p><div className="flex space-x-4"><button onClick={() => setContactToDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button><button onClick={executeDeleteContact} className="flex-1 py-4 bg-rose-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all">Move to Trash</button></div></div></div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-4xl p-10 relative z-10 max-h-[95vh] overflow-y-auto scrollbar-hide text-[12px] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{editingLead ? 'Edit Contact Profile' : 'Create New Contact'}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"><i className="fas fa-times text-xl"></i></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-8">
              <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-8">
                <div className="flex items-center space-x-3 border-b border-slate-200 pb-5 mb-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-sm shadow-lg shadow-indigo-100"><i className="fas fa-user"></i></div>
                  <h4 className="text-base font-black text-slate-800 uppercase tracking-[0.2em]">Primary Contact Information</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">First Name *</label>
                    <input type="text" required value={leadFormData.firstName} onChange={e => setLeadFormData({...leadFormData, firstName: e.target.value})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="e.g. Michael" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Last Name *</label>
                    <input type="text" required value={leadFormData.lastName} onChange={e => setLeadFormData({...leadFormData, lastName: e.target.value})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="e.g. Scott" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Email Address *</label>
                    <input type="email" required value={leadFormData.email} onChange={e => setLeadFormData({...leadFormData, email: e.target.value})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="email@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Phone Number *</label>
                    <input type="tel" required value={leadFormData.phone} onChange={e => setLeadFormData({...leadFormData, phone: formatPhone(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-black focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="(555) 000-0000" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Birthday</label>
                    <input type="date" value={leadFormData.dob} onChange={e => setLeadFormData({...leadFormData, dob: e.target.value})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Wedding Anniversary</label>
                    <input type="date" value={leadFormData.weddingAnniversary} onChange={e => setLeadFormData({...leadFormData, weddingAnniversary: e.target.value})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Home Anniversary</label>
                    <input type="date" value={leadFormData.homeAnniversary} onChange={e => setLeadFormData({...leadFormData, homeAnniversary: e.target.value})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-8">
                <div className="flex items-center space-x-3 border-b border-slate-200 pb-5 mb-4">
                  <div className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center text-sm shadow-lg"><i className="fas fa-chart-line"></i></div>
                  <h4 className="text-base font-black text-slate-800 uppercase tracking-[0.2em]">Contact Data</h4>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[11px] font-black text-slate-400 uppercase">Contact Source</label>
                      <button type="button" onClick={() => setIsAddingSource(!isAddingSource)} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-tighter flex items-center space-x-1">
                        <i className={`fas ${isAddingSource ? 'fa-times' : 'fa-plus'} mr-1`}></i>
                        <span>{isAddingSource ? 'Cancel' : 'Add New'}</span>
                      </button>
                    </div>
                    {isAddingSource ? (
                      <div className="flex space-x-2 animate-in slide-in-from-left-2 duration-200">
                        <input type="text" className="w-full bg-white border border-indigo-200 rounded-[1.25rem] px-5 py-4 text-base font-bold outline-none shadow-sm" placeholder="Custom Source..." value={newSourceInput} onChange={e => setNewSourceInput(e.target.value)} />
                        <button type="button" onClick={handleAddNewSource} className="bg-indigo-600 text-white w-14 rounded-2xl flex items-center justify-center shadow-lg"><i className="fas fa-check"></i></button>
                      </div>
                    ) : (
                      <select value={leadFormData.source} onChange={e => setLeadFormData({...leadFormData, source: e.target.value})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm cursor-pointer">
                        {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Property Type</label>
                    <select value={leadFormData.propertyType} onChange={e => setLeadFormData({...leadFormData, propertyType: e.target.value as any})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm cursor-pointer">
                      <option value="PRIMARY">Primary Home</option>
                      <option value="SECONDARY">Secondary Home</option>
                      <option value="INVESTMENT">Investment Property</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Classification Tags</label>
                  <button 
                    type="button"
                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                    className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-left flex items-center justify-between focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm min-h-[64px]"
                  >
                    <div className="flex flex-wrap gap-2">
                      {leadFormData.tags && leadFormData.tags.length > 0 ? (
                        leadFormData.tags.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100 uppercase tracking-tighter flex items-center space-x-2 animate-in zoom-in-95 duration-150">
                            <span>{tag}</span>
                            <span onClick={(e) => { e.stopPropagation(); toggleLeadTag(tag); }} className="hover:text-indigo-800 cursor-pointer">
                              <i className="fas fa-times scale-90"></i>
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60">Add tags to classify...</span>
                      )}
                    </div>
                    <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-200 ${isTagDropdownOpen ? 'rotate-180' : ''}`}></i>
                  </button>
                  
                  {isTagDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[130]" onClick={() => setIsTagDropdownOpen(false)}></div>
                      <div className="absolute z-[140] left-0 right-0 mt-3 bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
                        <div className="flex space-x-2 pb-4 border-b border-slate-100">
                          <input type="text" placeholder="Create new tag..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={newTagInput} onChange={e => setNewTagInput(e.target.value)} />
                          <button type="button" onClick={handleAddNewTag} className="bg-indigo-600 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest">Create</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-hide">
                          {availableTags.map(tag => {
                            const isSelected = leadFormData.tags?.includes(tag);
                            return (
                              <button 
                                key={tag}
                                type="button"
                                onClick={() => toggleLeadTag(tag)}
                                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all flex items-center justify-between border ${
                                  isSelected 
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-indigo-300 hover:text-indigo-600'
                                }`}
                              >
                                <span className="truncate">{tag}</span>
                                {isSelected && <i className="fas fa-check text-[10px]"></i>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Property Address</label>
                  <input type="text" value={leadFormData.propertyAddress} onChange={e => setLeadFormData({...leadFormData, propertyAddress: e.target.value})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm" placeholder="Street, City, State, Zip" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Budget ($)</label>
                    <input type="text" required value={formatBudget(leadFormData.budget)} onChange={handleBudgetChange} className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] px-6 py-4 text-lg font-black focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none shadow-sm" placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-8">
                <div className="flex items-center space-x-3 border-b border-slate-200 pb-5 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-sm shadow-md"><i className="fas fa-user-plus"></i></div>
                  <h4 className="text-base font-black text-slate-800 uppercase tracking-[0.2em]">Secondary Contact Details</h4>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Relationship</label>
                    <select value={leadFormData.secondaryContactRelationship} onChange={e => setLeadFormData({...leadFormData, secondaryContactRelationship: e.target.value as any})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm cursor-pointer">
                      {RELATIONSHIP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">First Name</label>
                    <input type="text" value={leadFormData.spouseFirstName} onChange={e => setLeadFormData({...leadFormData, spouseFirstName: e.target.value})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Last Name</label>
                    <input type="text" value={leadFormData.spouseLastName} onChange={e => setLeadFormData({...leadFormData, spouseLastName: e.target.value})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Secondary Email</label>
                    <input type="email" value={leadFormData.spouseEmail} onChange={e => setLeadFormData({...leadFormData, spouseEmail: e.target.value})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm" placeholder="email@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Secondary Phone</label>
                    <input type="tel" value={leadFormData.spousePhone} onChange={e => setLeadFormData({...leadFormData, spousePhone: formatPhone(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm" placeholder="(555) 000-0000" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Secondary Birthday</label>
                    <input type="date" value={leadFormData.spouseDob} onChange={e => setLeadFormData({...leadFormData, spouseDob: e.target.value})} className="w-full bg-white border border-slate-200 rounded-[1.25rem] px-5 py-4 text-base font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="pt-10 flex items-center space-x-6">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[1.5rem] text-base font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-[1.5rem] text-base font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all">{editingLead ? 'Save Changes' : 'Create Profile'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactList;