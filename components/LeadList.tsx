import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Lead, LeadStatus, LeadTemperature } from '../types.ts';

interface LeadListProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onAddLeads: (newLeads: Lead[]) => void;
  onUpdateLead: (lead: Lead) => void;
  onBulkUpdateLeads?: (updatedLeads: Lead[]) => void;
  availableSources: string[];
  availableTags: string[];
  onUpdateSources: (sources: string[]) => void;
  onUpdateTags: (tags: string[]) => void;
  isDarkMode?: boolean;
}

type SortOption = 
  | 'TEMP_DESC' | 'WARM_FIRST' | 'NORMAL_FIRST' | 'TEMP_ASC' 
  | 'NAME_ASC' | 'NAME_DESC'
  | 'BUDGET_ASC' | 'BUDGET_DESC'
  | 'NEWEST_ADDED' | 'OLDEST_ADDED' | 'RECENTLY_UPDATED' 
  | 'SOURCE_ASC' | 'SOURCE_DESC' 
  | 'STATUS_ASC' | 'STATUS_DESC' 
  | 'BUYERS_FIRST' | 'SELLERS_FIRST' | 'INVESTORS_FIRST' | 'PAST_CLIENTS_FIRST';

type DisplayMode = 'tile' | 'list';
type ColumnId = 'selection' | 'hotness' | 'stage' | 'name' | 'address' | 'secondary' | 'budget' | 'source' | 'updated' | 'actions';
type TabId = string; // Status strings

const TZ = 'America/Los_Angeles';

const sortLabels: Record<SortOption, string> = {
  TEMP_DESC: 'Hot Leads First',
  WARM_FIRST: 'Warm Leads First',
  NORMAL_FIRST: 'Normal Leads First',
  TEMP_ASC: 'Cold Leads First',
  NAME_ASC: 'Name (A-Z)',
  NAME_DESC: 'Name (Z-A)',
  BUDGET_ASC: 'Budget (Low-High)',
  BUDGET_DESC: 'Budget (High-Low)',
  NEWEST_ADDED: 'Newest Added',
  OLDEST_ADDED: 'Oldest Added',
  RECENTLY_UPDATED: 'Recently Updated',
  SOURCE_ASC: 'Source (A-Z)',
  SOURCE_DESC: 'Source (Z-A)',
  STATUS_ASC: 'Stage (A-Z)',
  STATUS_DESC: 'Stage (Z-A)',
  BUYERS_FIRST: 'Buyers First',
  SELLERS_FIRST: 'Sellers First',
  INVESTORS_FIRST: 'Investors First',
  PAST_CLIENTS_FIRST: 'Past Clients First'
};

const DEFAULT_COLUMN_ORDER: ColumnId[] = ['selection', 'hotness', 'stage', 'name', 'address', 'secondary', 'budget', 'source', 'updated', 'actions'];
const DEFAULT_STATUS_ORDER: TabId[] = ['ALL', LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.ACTIVE, LeadStatus.IN_ESCROW, LeadStatus.CLOSED];

const statusLabels: Record<string, string> = {
  ALL: 'All Pipeline',
  [LeadStatus.NEW]: 'New',
  [LeadStatus.CONTACTED]: 'Contacted',
  [LeadStatus.ACTIVE]: 'Active',
  [LeadStatus.IN_ESCROW]: 'Pending',
  [LeadStatus.CLOSED]: 'Sold'
};

const columnLabels: Record<ColumnId, string> = {
  selection: '',
  hotness: 'Hotness',
  stage: 'Stage',
  name: 'Lead Name',
  address: 'Address',
  secondary: 'Secondary Person',
  budget: 'Budget',
  source: 'Source',
  updated: 'Updated',
  actions: 'Actions'
};

const RELATIONSHIP_OPTIONS = ['Spouse', 'Sister', 'Brother', 'Friend', 'Partner', 'Other'];

const LeadList: React.FC<LeadListProps> = ({ 
  leads, 
  onSelectLead, 
  onAddLeads, 
  onUpdateLead,
  onBulkUpdateLeads,
  availableSources, 
  availableTags,
  onUpdateSources,
  onUpdateTags,
  isDarkMode
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('TEMP_DESC');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('tile');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Modal specific state
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceInput, setNewSourceInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');

  // Customization State
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_COLUMN_ORDER);
  const [statusOrder, setStatusOrder] = useState<TabId[]>(DEFAULT_STATUS_ORDER);
  const [draggedItem, setDraggedItem] = useState<{ type: 'tab' | 'column'; index: number } | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const isFullPage = filterStatus !== 'ALL';

  const emptyLead: Partial<Lead> = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: LeadStatus.NEW,
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
    const activeLeads = leads.filter(l => !l.isDeleted);
    return {
      total: activeLeads.length,
      buyers: activeLeads.filter(l => l.tags?.some(t => t.toLowerCase() === 'buyer')).length,
      sellers: activeLeads.filter(l => l.tags?.some(t => t.toLowerCase() === 'seller')).length,
      investors: activeLeads.filter(l => l.tags?.some(t => t.toLowerCase() === 'investor')).length,
      pastClients: activeLeads.filter(l => l.tags?.some(t => t.toLowerCase() === 'past client') || l.source === 'Past Client').length,
    };
  }, [leads]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]); // Clear selection when filters change
  }, [filterStatus, selectedSources, selectedTags, searchTerm, sortBy, itemsPerPage]);

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

  const exportLeadsToCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Source', 'Status', 'Temperature', 'Budget', 'Address', 'Tags', 'Created At'];
    const rows = filteredAndSortedLeads.map(l => [
      l.firstName,
      l.lastName,
      l.email,
      l.phone,
      l.source,
      l.status,
      l.temperature,
      l.budget,
      l.propertyAddress || '',
      (l.tags || []).join('; '),
      l.createdAt
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(field => `"${field}"`).join(','))
    ].join('\n');

    downloadBlob(csvContent, `agent_desk_leads_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    setIsExportMenuOpen(false);
  };

  const exportLeadsToExcel = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Source', 'Status', 'Temperature', 'Budget', 'Address', 'Tags', 'Created At'];
    const rows = filteredAndSortedLeads.map(l => `
      <tr>
        <td>${l.firstName}</td>
        <td>${l.lastName}</td>
        <td>${l.email}</td>
        <td>${l.phone}</td>
        <td>${l.source}</td>
        <td>${l.status}</td>
        <td>${l.temperature}</td>
        <td>${l.budget}</td>
        <td>${l.propertyAddress || ''}</td>
        <td>${(l.tags || []).join(', ')}</td>
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
    downloadBlob(excelContent, `agent_desk_leads_${new Date().toISOString().split('T')[0]}.xls`, 'application/vnd.ms-excel');
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
          id: `lead_imp_${Date.now()}_${i}`,
          brokerageId: 'brk_7721',
          assignedAgentId: 'agent_1',
          firstName: leadObj.firstname || leadObj.name?.split(' ')[0] || 'Imported',
          lastName: leadObj.lastname || leadObj.name?.split(' ').slice(1).join(' ') || 'Lead',
          email: leadObj.email || `imported.${Date.now()}.${i}@example.com`,
          phone: leadObj.phone || '000-000-0000',
          status: (leadObj.status as any) || LeadStatus.NEW,
          temperature: (leadObj.temperature as any) || LeadTemperature.NORMAL,
          source: leadObj.source || 'CSV Import',
          tags: leadObj.tags ? leadObj.tags.split(';').map((t: string) => t.trim()) : ['Imported'],
          propertyType: 'PRIMARY',
          propertyAddress: leadObj.address || leadObj.propertyaddress || '',
          budget: parseInt(leadObj.budget) || 0,
          notes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          estimatedDealValue: (parseInt(leadObj.budget) || 0) * 0.03
        };
        newLeads.push(leadToAdd);
      }
      
      if (newLeads.length > 0) {
        onAddLeads(newLeads);
        alert(`Successfully imported ${newLeads.length} leads.`);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const executeDeleteLead = () => {
    if (leadToDelete) {
      onUpdateLead({ 
        ...leadToDelete, 
        isDeleted: true, 
        deletedAt: new Date().toISOString() 
      });
      setLeadToDelete(null);
    }
  };

  const getTemperatureWeight = (temp: LeadTemperature) => {
    switch (temp) {
      case LeadTemperature.HOT: return 3;
      case LeadTemperature.WARM: return 2;
      case LeadTemperature.NORMAL: return 1;
      case LeadTemperature.COLD: return 0;
      default: return 0;
    }
  };

  const handleToggleSourceFilter = (source: string) => {
    setSelectedSources(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]);
  };

  const handleToggleTagFilter = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
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

  const toggleLeadTag = (tag: string) => {
    const currentTags = leadFormData.tags || [];
    if (currentTags.includes(tag)) {
      setLeadFormData({ ...leadFormData, tags: currentTags.filter(t => t !== tag) });
    } else {
      setLeadFormData({ ...leadFormData, tags: [...currentTags, tag] });
    }
  };

  const filteredAndSortedLeads = useMemo(() => {
    return [...leads]
      .filter(l => !l.isDeleted)
      .filter(l => {
        const matchesStatus = filterStatus === 'ALL' || l.status === filterStatus;
        const matchesSource = selectedSources.length === 0 || selectedSources.includes(l.source);
        const matchesTags = selectedTags.length === 0 || (l.tags && selectedTags.some(tag => l.tags.includes(tag)));
        const search = searchTerm.toLowerCase().trim();
        let matchesSearch = true;
        if (search) {
          const fullName = `${l.firstName} ${l.lastName}`.toLowerCase();
          const email = (l.email || '').toLowerCase();
          const address = (l.propertyAddress || '').toLowerCase();
          const spouseName = `${l.spouseFirstName || ''} ${l.spouseLastName || ''}`.toLowerCase();
          const spouseEmail = (l.spouseEmail || '').toLowerCase();
          matchesSearch = fullName.includes(search) || email.includes(search) || spouseName.includes(search) || spouseEmail.includes(search) || address.includes(search);
        }
        return matchesStatus && matchesSource && matchesTags && matchesSearch;
      })
      .sort((a, b) => {
        const isBuyer = (l: Lead) => l.tags?.some(t => t.toLowerCase() === 'buyer');
        const isSeller = (l: Lead) => l.tags?.some(t => t.toLowerCase() === 'seller');
        const isInvestor = (l: Lead) => l.tags?.some(t => t.toLowerCase() === 'investor');
        const isPastClient = (l: Lead) => l.tags?.some(t => t.toLowerCase() === 'past client') || l.source === 'Past Client';

        switch (sortBy) {
          case 'TEMP_DESC': return getTemperatureWeight(b.temperature) - getTemperatureWeight(a.temperature);
          case 'TEMP_ASC': return getTemperatureWeight(a.temperature) - getTemperatureWeight(b.temperature);
          case 'NAME_ASC': return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          case 'NAME_DESC': return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
          case 'BUDGET_ASC': return a.budget - b.budget;
          case 'BUDGET_DESC': return b.budget - a.budget;
          case 'WARM_FIRST':
            if (a.temperature === LeadTemperature.WARM && b.temperature !== LeadTemperature.WARM) return -1;
            if (b.temperature === LeadTemperature.WARM && a.temperature !== LeadTemperature.WARM) return 1;
            return getTemperatureWeight(b.temperature) - getTemperatureWeight(a.temperature);
          case 'NORMAL_FIRST':
            if (a.temperature === LeadTemperature.NORMAL && b.temperature !== LeadTemperature.NORMAL) return -1;
            if (b.temperature === LeadTemperature.NORMAL && a.temperature !== LeadTemperature.NORMAL) return 1;
            return getTemperatureWeight(b.temperature) - getTemperatureWeight(a.temperature);
          case 'BUYERS_FIRST':
            if (isBuyer(a) && !isBuyer(b)) return -1;
            if (!isBuyer(a) && isBuyer(b)) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'SELLERS_FIRST':
            if (isSeller(a) && !isSeller(b)) return -1;
            if (!isSeller(a) && isSeller(b)) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'INVESTORS_FIRST':
            if (isInvestor(a) && !isInvestor(b)) return -1;
            if (!isInvestor(a) && isInvestor(b)) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'PAST_CLIENTS_FIRST':
            if (isPastClient(a) && !isPastClient(b)) return -1;
            if (!isPastClient(a) && isPastClient(b)) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'NEWEST_ADDED': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'OLDEST_ADDED': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'RECENTLY_UPDATED': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          case 'SOURCE_ASC': return a.source.localeCompare(b.source);
          case 'SOURCE_DESC': return b.source.localeCompare(a.source);
          case 'STATUS_ASC': return a.status.localeCompare(b.status);
          case 'STATUS_DESC': return b.status.localeCompare(a.status);
          default: return 0;
        }
      });
  }, [leads, filterStatus, selectedSources, selectedTags, searchTerm, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage);
  const paginatedLeads = filteredAndSortedLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleLeadSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAllOnPage = () => {
    const pageIds = paginatedLeads.map(l => l.id);
    if (pageIds.every(id => selectedIds.includes(id))) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleteModalOpen(true);
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

  const handleTabClick = (status: string) => {
    if (filterStatus === status) {
      setIsExpanded(!isExpanded);
    } else {
      setFilterStatus(status);
      setIsExpanded(false);
    }
  };

  const openNewLeadModal = () => {
    setEditingLead(null);
    setLeadFormData(emptyLead);
    setIsNewLeadModalOpen(true);
    setIsEditModalOpen(false);
    setIsTagDropdownOpen(false);
  };

  const openEditModal = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    setEditingLead(lead);
    setLeadFormData({ ...lead });
    setIsEditModalOpen(true);
    setIsNewLeadModalOpen(false);
    setIsTagDropdownOpen(false);
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditModalOpen && editingLead) {
      const updatedLead: Lead = {
        ...editingLead,
        ...leadFormData as Lead,
        updatedAt: new Date().toISOString(),
        estimatedDealValue: (leadFormData.budget || 0) * 0.03
      };
      onUpdateLead(updatedLead);
      setIsEditModalOpen(false);
    } else {
      const leadToAdd: Lead = {
        ...leadFormData as Lead,
        id: `lead_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
        estimatedDealValue: (leadFormData.budget || 0) * 0.03,
        brokerageId: 'brk_7721', // Fallback defaults
        assignedAgentId: 'agent_1'
      };
      onAddLeads([leadToAdd]);
      setIsNewLeadModalOpen(false);
    }
  };

  const onDragStart = (e: React.DragEvent, type: 'tab' | 'column', index: number) => {
    setDraggedItem({ type, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
  };

  const onDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.type === 'tab') {
      const newOrder = [...statusOrder];
      const [removed] = newOrder.splice(draggedItem.index, 1);
      newOrder.splice(targetIndex, 0, removed);
      setStatusOrder(newOrder);
    } else {
      const newOrder = [...columnOrder];
      const [removed] = newOrder.splice(draggedItem.index, 1);
      newOrder.splice(targetIndex, 0, removed);
      setColumnOrder(newOrder);
    }
    setDraggedItem(null);
    setDragOverIdx(null);
  };

  const handleResetSettings = () => {
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    setStatusOrder(DEFAULT_STATUS_ORDER);
    setIsSettingsOpen(false);
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

  const getStatusBadgeClass = (status: LeadStatus) => {
    switch (status) {
      case LeadStatus.NEW: return 'bg-blue-50 text-blue-600 border-blue-100';
      case LeadStatus.CONTACTED: return 'bg-purple-50 text-purple-600 border-purple-100';
      case LeadStatus.ACTIVE: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case LeadStatus.IN_ESCROW: return 'bg-amber-50 text-amber-600 border-amber-100';
      case LeadStatus.CLOSED: return 'bg-slate-900 text-white border-slate-800';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const handleHeaderClick = (colId: ColumnId) => {
    if (colId === 'selection' || colId === 'actions') return;
    
    switch (colId) {
      case 'hotness':
        setSortBy(sortBy === 'TEMP_DESC' ? 'TEMP_ASC' : 'TEMP_DESC');
        break;
      case 'stage':
        setSortBy(sortBy === 'STATUS_ASC' ? 'STATUS_DESC' : 'STATUS_ASC');
        break;
      case 'name':
        setSortBy(sortBy === 'NAME_ASC' ? 'NAME_DESC' : 'NAME_ASC');
        break;
      case 'source':
        setSortBy(sortBy === 'SOURCE_ASC' ? 'SOURCE_DESC' : 'SOURCE_ASC');
        break;
      case 'updated':
        setSortBy(sortBy === 'RECENTLY_UPDATED' ? 'OLDEST_ADDED' : 'RECENTLY_UPDATED');
        break;
      case 'budget':
        setSortBy(sortBy === 'BUDGET_DESC' ? 'BUDGET_ASC' : 'BUDGET_DESC');
        break;
      default:
        break;
    }
  };

  const renderCell = (lead: Lead, key: ColumnId) => {
    switch (key) {
      case 'selection':
        return (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <input 
              type="checkbox" 
              checked={selectedIds.includes(lead.id)}
              onChange={() => toggleLeadSelection(lead.id)}
              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm transition-all"
            />
          </div>
        );
      case 'hotness':
        return (
          <div className="flex items-center space-x-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              lead.temperature === LeadTemperature.HOT ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 
              lead.temperature === LeadTemperature.WARM ? 'bg-orange-500' : 
              lead.temperature === LeadTemperature.COLD ? 'bg-blue-500' : 
              'bg-slate-300'
            }`}></div>
            <span className="text-sm font-black text-slate-600 uppercase tracking-tighter">{lead.temperature}</span>
          </div>
        );
      case 'stage':
        return (
          <span className={`text-[12px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ${getStatusBadgeClass(lead.status)}`}>
            {statusLabels[lead.status] || lead.status}
          </span>
        );
      case 'name':
        return (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-black shrink-0 shadow-sm">{lead.firstName?.[0]}{lead.lastName?.[0]}</div>
            <div className="overflow-hidden">
              <p className="text-lg font-bold text-slate-800 truncate">{lead.firstName} {lead.lastName}</p>
            </div>
          </div>
        );
      case 'address':
        return <span className="text-base font-semibold text-slate-500 truncate block max-w-[200px]">{lead.propertyAddress || 'N/A'}</span>;
      case 'secondary':
        return lead.spouseFirstName ? (
          <div className="flex flex-col min-w-0">
             <span className="text-base font-bold text-slate-700 truncate">{lead.spouseFirstName} {lead.spouseLastName}</span>
             <span className="text-[11px] font-black uppercase text-slate-400 tracking-tighter">{lead.secondaryContactRelationship}</span>
          </div>
        ) : <span className="text-[11px] font-black uppercase tracking-widest text-slate-300 italic">None</span>;
      case 'budget':
        return <span className="text-base font-black text-slate-800">${lead.budget.toLocaleString()}</span>;
      case 'source':
        return (
          <div className="flex items-center space-x-2">
            <i className={`${getSourceIcon(lead.source).icon} ${getSourceIcon(lead.source).color} text-[12px]`}></i>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{lead.source}</span>
          </div>
        );
      case 'updated':
        return <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{new Date(lead.updatedAt).toLocaleDateString()}</span>;
      case 'actions':
        return (
          <div className="flex items-center justify-end space-x-2">
            <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all shadow-sm" title="Email Lead"><i className="fas fa-envelope text-sm"></i></a>
            <button onClick={(e) => openEditModal(e, lead)} className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Edit Lead"><i className="fas fa-edit text-sm"></i></button>
            <button onClick={(e) => { e.stopPropagation(); setLeadToDelete(lead); }} className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Move to Trash"><i className="fas fa-trash-can text-sm"></i></button>
          </div>
        );
      default: return null;
    }
  };

  const isPageAllSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selectedIds.includes(l.id));

  return (
    <div className={`space-y-6 transition-all duration-700 ${isFullPage ? 'pt-2' : ''}`} ref={topRef}>
      {/* Top Navigation & Status Filters */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-[2rem] border shadow-sm relative z-30 transition-all duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} ${isFullPage ? 'ring-2 ring-indigo-500/20 shadow-xl' : ''}`}>
        <div className="flex items-center space-x-3 overflow-x-auto scrollbar-hide pb-2 md:pb-0 flex-1">
          {statusOrder.map((status, idx) => (
            <button
              key={status}
              draggable
              onDragStart={(e) => onDragStart(e, 'tab', idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDrop={(e) => onDrop(e, idx)}
              onClick={() => handleTabClick(status)}
              className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap relative group ${
                dragOverIdx === idx && draggedItem?.type === 'tab' ? 'ring-2 ring-indigo-500 scale-105' : ''
              } ${
                filterStatus === status 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                  : isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <i className="fas fa-grip-vertical text-[8px] absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity"></i>
              {statusLabels[status] || status}
              {filterStatus === status && isExpanded && (
                <span className="ml-2 bg-indigo-500 text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest text-white shadow-lg animate-in zoom-in-50">Expanded</span>
              )}
            </button>
          ))}
        </div>
        
        <div className="flex items-center space-x-4">
          {isFullPage && (
            <button 
              onClick={() => { setFilterStatus('ALL'); setIsExpanded(false); }}
              className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:text-indigo-800 flex items-center space-x-2"
            >
              <i className="fas fa-times"></i>
              <span>Exit Full View</span>
            </button>
          )}

          <div className={`flex p-1.5 rounded-xl shrink-0 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button onClick={() => setDisplayMode('tile')} className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${displayMode === 'tile' ? (isDarkMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white shadow-md text-indigo-600') : 'text-slate-400 hover:text-slate-600'}`} title="Grid View"><i className="fas fa-th-large"></i></button>
            <button onClick={() => setDisplayMode('list')} className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${displayMode === 'list' ? (isDarkMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white shadow-md text-indigo-600') : 'text-slate-400 hover:text-slate-600'}`} title="List View"><i className="fas fa-list"></i></button>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`flex items-center p-1 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-white hover:text-indigo-600 text-slate-400 transition-all" 
                  title="Import Pipeline (CSV)"
               >
                 <i className="fas fa-upload"></i>
               </button>
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportCSV} 
                  accept=".csv" 
                  className="hidden" 
               />
               <div className="relative">
                  <button 
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${isExportMenuOpen ? 'bg-white text-indigo-600 shadow-sm' : 'hover:bg-white hover:text-indigo-600 text-slate-400'}`} 
                    title="Export Pipeline"
                  >
                    <i className="fas fa-download"></i>
                  </button>
                  {isExportMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setIsExportMenuOpen(false)}></div>
                      <div className={`absolute right-0 mt-2 w-56 border rounded-2xl shadow-2xl z-[70] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <p className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Download As</p>
                        <button onClick={exportLeadsToExcel} className={`w-full text-left px-6 py-4 transition-colors flex items-center space-x-3 group ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-indigo-50'}`}>
                          <i className="fas fa-file-excel text-emerald-500 text-sm"></i>
                          <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Excel (.xls)</span>
                        </button>
                        <button onClick={exportLeadsToCSV} className={`w-full text-left px-6 py-4 transition-colors flex items-center space-x-3 group ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-indigo-50'}`}>
                          <i className="fas fa-file-csv text-blue-500 text-sm"></i>
                          <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>CSV (.csv)</span>
                        </button>
                      </div>
                    </>
                  )}
               </div>
            </div>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={`w-14 h-14 flex items-center justify-center rounded-2xl border transition-all shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-indigo-400' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}
              title="Layout Settings"
            >
              <i className="fas fa-cog text-xl"></i>
            </button>
            <button onClick={openNewLeadModal} className="flex items-center space-x-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-base font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 whitespace-nowrap">
              <i className="fas fa-plus"></i>
              <span>New Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Ribbon - HIDDEN in Full Page Mode to focus on data */}
      {!isFullPage && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          {[
            { label: 'Total Leads', value: stats.total, icon: 'fa-users' },
            { label: 'Active Buyers', value: stats.buyers, icon: 'fa-cart-shopping' },
            { label: 'Active Sellers', value: stats.sellers, icon: 'fa-house-signal' },
            { label: 'Investors', value: stats.investors, icon: 'fa-chart-pie' },
            { label: 'Past Clients', value: stats.pastClients, icon: 'fa-clock-rotate-left' }
          ].map((stat, i) => {
             const colorPool = [
               { bg: 'bg-indigo-50', border: 'border-indigo-100', icon: 'bg-indigo-600', text: 'text-indigo-900' },
               { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'bg-emerald-600', text: 'text-emerald-900' },
               { bg: 'bg-rose-50', border: 'border-rose-100', icon: 'bg-rose-600', text: 'text-rose-900' },
               { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'bg-amber-600', text: 'text-amber-900' },
               { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'bg-purple-600', text: 'text-purple-900' },
               { bg: 'bg-sky-50', border: 'border-sky-100', icon: 'bg-sky-600', text: 'text-sky-900' },
               { bg: 'bg-pink-50', border: 'border-pink-100', icon: 'bg-pink-600', text: 'text-pink-900' },
               { bg: 'bg-lime-50', border: 'border-lime-100', icon: 'bg-lime-600', text: 'text-lime-900' },
             ];
             const color = colorPool[(i * 7) % colorPool.length];
             
             return (
               <div key={i} className={`p-5 rounded-2xl border shadow-sm flex items-center space-x-5 transition-all hover:scale-105 ${isDarkMode ? 'bg-slate-900 border-slate-800' : `${color.bg} ${color.border}`}`}>
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base shadow-lg text-white ${color.icon}`}><i className={`fas ${stat.icon}`}></i></div>
                 <div>
                   <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-200' : 'text-slate-800 opacity-70'}`}>{stat.label}</p>
                   <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>{stat.value}</p>
                 </div>
               </div>
             );
          })}
        </div>
      )}

      {/* Main Search Bar & Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative group flex-1 w-full">
          <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg transition-colors group-focus-within:text-indigo-500"></i>
          <input
            type="text" placeholder={`Search ${isFullPage ? statusLabels[filterStatus] : ''} leads (names, email, spouses, address)...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-14 pr-12 py-4 border rounded-xl text-base focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm font-bold ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto shrink-0">
          {selectedIds.length > 0 && (
            <div className="flex items-center bg-white border border-indigo-100 rounded-2xl p-1.5 shadow-sm animate-in zoom-in-95 duration-200 text-[12px]">
               <button 
                 onClick={() => setIsBulkTagModalOpen(true)}
                 className="h-[52px] px-8 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-sm font-black uppercase tracking-widest shadow-sm hover:bg-indigo-100 transition-all flex items-center space-x-2"
               >
                 <i className="fas fa-tag"></i>
                 <span>Tag ({selectedIds.length})</span>
               </button>
               <button 
                 onClick={handleBulkDelete}
                 className="h-[52px] px-8 bg-rose-600 text-white border border-rose-600 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all flex items-center space-x-2"
               >
                 <i className="fas fa-trash-can"></i>
                 <span>Delete</span>
               </button>
            </div>
          )}

          <div className="relative">
            <button onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)} className={`h-[52px] px-6 border rounded-xl text-sm font-black uppercase tracking-widest shadow-sm transition-all flex items-center space-x-3 min-w-[140px] ${ (selectedSources.length + selectedTags.length) > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <i className="fas fa-filter"></i>
              <span>Filters</span>
              {(selectedSources.length + selectedTags.length) > 0 && (
                <span className="ml-1 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px] scale-90 leading-none">
                  {selectedSources.length + selectedTags.length}
                </span>
              )}
            </button>
            {isFilterPanelOpen && (
              <>
                <div className="fixed inset-0 z-[90] bg-transparent" onClick={() => setIsFilterPanelOpen(false)}></div>
                <div className={`absolute right-0 mt-2 w-[340px] border rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Filter Pipeline</h4>
                    <button onClick={() => { setSelectedSources([]); setSelectedTags([]); }} className="text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Reset</button>
                  </div>
                  <div className="p-5 max-h-[450px] overflow-y-auto scrollbar-hide space-y-8">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Lead Source</p>
                      <div className="flex flex-wrap gap-2.5">
                        {availableSources.map(source => (
                          <button key={source} onClick={() => handleToggleSourceFilter(source)} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${selectedSources.includes(source) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-indigo-500' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>{source}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Classification Tags</p>
                      <div className="flex flex-wrap gap-2.5">
                        {availableTags.map(tag => (
                          <button key={tag} onClick={() => handleToggleTagFilter(tag)} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${selectedTags.includes(tag) ? 'bg-slate-900 border-slate-900 text-white shadow-md' : isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-indigo-500' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>{tag}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setIsSortOpen(!isSortOpen)} className={`h-[52px] px-6 border rounded-xl text-sm font-black uppercase tracking-widest shadow-sm transition-all flex items-center space-x-3 min-w-[240px] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <i className="fas fa-sort-amount-down text-indigo-500"></i>
              <span className="flex-1 text-left truncate">{sortLabels[sortBy]}</span>
            </button>
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-[90] bg-transparent" onClick={() => setIsSortOpen(false)}></div>
                <div className={`absolute right-0 mt-3 w-72 border rounded-[2rem] shadow-2xl z-[100] py-4 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                    <button key={key} onClick={() => { setSortBy(key); setIsSortOpen(false); }} className={`w-full text-left px-8 py-4 text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-between ${sortBy === key ? 'bg-indigo-50 text-indigo-600' : isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                      <span>{sortLabels[key]}</span>
                      {sortBy === key && <i className="fas fa-check text-xs"></i>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {displayMode === 'tile' ? (
        <div className={`grid gap-5 transition-all duration-500 ${isExpanded ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5'}`}>
          {paginatedLeads.map(lead => (
            <div key={lead.id} className={`border rounded-[1.75rem] p-6 hover:border-indigo-300 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} ${isExpanded ? 'min-h-[400px]' : 'min-h-[300px]'}`}>
              {/* Temperature Ribbon */}
              {lead.temperature !== LeadTemperature.NORMAL && (
                <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-sm z-10 ${
                  lead.temperature === LeadTemperature.HOT ? 'bg-red-500 shadow-red-500/20' : 
                  lead.temperature === LeadTemperature.WARM ? 'bg-orange-500 shadow-orange-500/20' : 
                  'bg-blue-500 shadow-blue-500/20'
                }`}>
                  <i className={`fas ${
                    lead.temperature === LeadTemperature.HOT ? 'fa-fire' : 
                    lead.temperature === LeadTemperature.WARM ? 'fa-sun' : 
                    'fa-snowflake'
                  } mr-1.5`}></i>
                  {lead.temperature}
                </div>
              )}

              <div onClick={() => onSelectLead(lead)}>
                <div className="flex items-center space-x-3 mb-5">
                  <div className={`bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black shrink-0 transition-all ${isExpanded ? 'w-16 h-16 text-2xl' : 'w-12 h-12 text-xl'}`}>{lead.firstName?.[0]}{lead.lastName?.[0]}</div>
                  <div className="overflow-hidden">
                    <h4 className={`${isExpanded ? 'text-2xl' : 'text-lg'} font-black group-hover:text-indigo-600 transition-colors truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{lead.firstName} {lead.lastName}</h4>
                    <div className="flex items-center space-x-1.5 mt-1">
                      <i className={`${getSourceIcon(lead.source).icon} ${getSourceIcon(lead.source).color} text-[11px]`}></i>
                      <p className="text-[11px] text-slate-500 font-bold">{lead.source}</p>
                    </div>
                  </div>
                </div>
                <div className={`px-1 space-y-4 ${isExpanded ? 'mb-8' : 'mb-4'}`}>
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Property Address</p>
                    <p className={`${isExpanded ? 'text-lg' : 'text-sm'} font-bold truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{lead.propertyAddress || 'No address provided'}</p>
                  </div>
                  
                  {isExpanded && lead.email && (
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Direct Email</p>
                      <p className="text-sm font-black text-indigo-600 truncate">{lead.email}</p>
                    </div>
                  )}

                  {(lead.dob || lead.weddingAnniversary || lead.homeAnniversary) && (
                    <div className="flex items-center space-x-2 pt-0.5">
                      {lead.dob && <i className="fas fa-cake-candles text-xs text-pink-400" title="Birthday"></i>}
                      {lead.weddingAnniversary && <i className="fas fa-ring text-xs text-indigo-400" title="Wedding Anniversary"></i>}
                      {lead.homeAnniversary && <i className="fas fa-house-chimney-user text-xs text-emerald-400" title="Home Anniversary"></i>}
                    </div>
                  )}
                  {lead.spouseFirstName && (
                    <div className={`p-3 rounded-lg border flex items-center space-x-3 shadow-inner ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                       <div className="w-7 h-7 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                         <i className="fas fa-user-plus text-[10px]"></i>
                       </div>
                       <div className="overflow-hidden">
                          <p className={`text-[12px] font-black truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{lead.spouseFirstName} {lead.spouseLastName}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{lead.secondaryContactRelationship}</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2 font-bold uppercase tracking-widest"><i className="far fa-clock text-xs"></i><span>{new Date(lead.updatedAt).toLocaleDateString()}</span></div>
                <div className="flex items-center space-x-2 relative z-20">
                  <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Email Lead"><i className="fas fa-envelope text-sm"></i></a>
                  <button onClick={(e) => openEditModal(e, lead)} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-indigo-600 hover:text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}><i className="fas fa-edit text-sm"></i></button>
                  <button onClick={(e) => { e.stopPropagation(); setLeadToDelete(lead); }} className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"><i className="fas fa-trash text-sm"></i></button>
                </div>
              </div>
            </div>
          ))}
          {paginatedLeads.length === 0 && (
            <div className="col-span-full py-40 text-center opacity-30">
               <i className="fas fa-user-slash text-7xl mb-6"></i>
               <p className="text-base font-black uppercase tracking-[0.3em]">No leads match your active filters</p>
            </div>
          )}
        </div>
      ) : (
        <div className={`rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} ${isFullPage ? 'ring-2 ring-indigo-500/10' : ''}`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                {columnOrder.map((colId, idx) => (
                  <th key={colId} className={`px-5 py-6 ${colId === 'selection' ? 'w-16 text-center' : ''} ${colId === 'hotness' ? 'w-24' : ''} ${colId === 'stage' ? 'w-28' : ''}`}>
                    {colId === 'selection' ? (
                      <div className="flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={isPageAllSelected}
                          onChange={handleSelectAllOnPage}
                          className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm transition-all"
                        />
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleHeaderClick(colId)}
                        className={`w-full h-full flex items-center ${colId === 'actions' ? 'justify-end' : 'justify-start'} space-x-2 text-[12px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'text-slate-200 hover:text-white' : 'text-slate-950 hover:text-indigo-600'} ${sortBy.startsWith(colId.toUpperCase()) ? 'text-indigo-600' : ''}`}
                      >
                         <span>{columnLabels[colId]}</span>
                         {colId !== 'actions' && (
                           <i className={`fas fa-sort-amount-${sortBy.includes('ASC') ? 'up' : 'down'} text-[10px] opacity-20 group-hover:opacity-100`}></i>
                         )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {paginatedLeads.map(lead => (
                <tr 
                  key={lead.id} 
                  onClick={() => onSelectLead(lead)} 
                  className={`transition-all cursor-pointer group ${selectedIds.includes(lead.id) ? 'bg-indigo-50/20' : ''} ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-indigo-50/30'} ${isExpanded ? 'scale-[1.01] shadow-lg relative z-10' : ''}`}
                >
                  {columnOrder.map(colId => (
                    <td key={`${lead.id}-${colId}`} className={`px-5 ${isExpanded ? 'py-10' : 'py-8'} ${colId === 'actions' ? 'text-right' : ''}`}>
                      {renderCell(lead, colId)}
                    </td>
                  ))}
                </tr>
              ))}
              {paginatedLeads.length === 0 && (
                <tr><td colSpan={columnOrder.length} className="py-40 text-center opacity-30 font-black uppercase tracking-widest">No results</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      <div className={`flex flex-col md:flex-row items-center justify-between border rounded-[2rem] p-8 shadow-sm gap-8 mt-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`flex items-center space-x-4 border rounded-xl px-6 py-3 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
          <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className={`bg-transparent border-none text-sm font-black outline-none cursor-pointer ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            {[10, 20, 30, 40, 50, 100].map(n => <option key={n} value={n} className={isDarkMode ? 'bg-slate-900' : ''}>{n}</option>)}
          </select>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">per page</span>
        </div>
        <div className="flex flex-col items-center space-y-3">
           <div className="flex items-center space-x-6">
              <button disabled={currentPage === 1} onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); scrollToTop(); }} className={`w-12 h-12 flex items-center justify-center rounded-xl border disabled:opacity-30 shadow-sm transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><i className="fas fa-chevron-left"></i></button>
              <div className={`text-sm font-black uppercase tracking-[0.2em] px-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Page {currentPage} of {totalPages || 1}</div>
              <button disabled={currentPage >= totalPages} onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); scrollToTop(); }} className={`w-12 h-12 flex items-center justify-center rounded-xl border disabled:opacity-30 shadow-sm transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><i className="fas fa-chevron-right"></i></button>
           </div>
           <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Showing {paginatedLeads.length} of {filteredAndSortedLeads.length} leads</p>
        </div>
        <button onClick={scrollToTop} className="flex items-center space-x-3 px-8 py-4 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"><i className="fas fa-arrow-up"></i><span>Back to Top</span></button>
      </div>

      {/* Config/Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsSettingsOpen(false)}></div>
          <div className={`rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] border w-full max-w-3xl relative z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`p-10 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
               <div>
                  <h3 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Pipeline Config</h3>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Personalize your lead management layout</p>
               </div>
               <button onClick={() => setIsSettingsOpen(false)} className="w-14 h-14 flex items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"><i className="fas fa-times text-2xl"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 scrollbar-hide space-y-16">
               {/* Tab Ordering */}
               <section className="space-y-8">
                 <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                     <i className="fas fa-tags text-base"></i>
                   </div>
                   <h4 className={`text-xl font-bold uppercase tracking-tighter ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Status Tab Sequence</h4>
                 </div>
                 <p className="text-sm text-slate-400 font-medium ml-1">Drag and drop the tabs to change their order in the pipeline navigation bar.</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {statusOrder.map((status, idx) => (
                     <div 
                        key={status} 
                        draggable
                        onDragStart={(e) => onDragStart(e, 'tab', idx)}
                        onDragOver={(e) => onDragOver(e, idx)}
                        onDrop={(e) => onDrop(e, idx)}
                        className={`flex items-center justify-between p-5 border-2 rounded-2xl cursor-move transition-all group ${
                          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-transparent'
                        } ${
                          draggedItem?.type === 'tab' && draggedItem.index === idx ? 'opacity-20' : 
                          dragOverIdx === idx && draggedItem?.type === 'tab' ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 
                          'hover:border-slate-200 dark:hover:border-slate-600'
                        }`}
                     >
                       <div className="flex items-center space-x-5">
                         <i className="fas fa-grip-vertical text-slate-300 group-hover:text-indigo-400 text-sm"></i>
                         <span className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{statusLabels[status] || status}</span>
                       </div>
                       {status === 'ALL' && <span className="text-[10px] font-black text-indigo-400 uppercase">System Default</span>}
                     </div>
                   ))}
                 </div>
               </section>

               {/* Column Ordering */}
               <section className="space-y-8">
                 <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                     <i className="fas fa-table-columns text-base"></i>
                   </div>
                   <h4 className={`text-xl font-bold uppercase tracking-tighter ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Table Column Layout</h4>
                 </div>
                 <p className="text-sm text-slate-400 font-medium ml-1">Reorder table columns for the list view. Drag the handles below to organize.</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {columnOrder.map((colId, idx) => (
                     <div 
                        key={colId} 
                        draggable={colId !== 'selection'}
                        onDragStart={(e) => colId !== 'selection' && onDragStart(e, 'column', idx)}
                        onDragOver={(e) => colId !== 'selection' && onDragOver(e, idx)}
                        onDrop={(e) => colId !== 'selection' && onDrop(e, idx)}
                        className={`flex items-center space-x-5 p-5 border-2 rounded-2xl transition-all group ${
                          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-transparent'
                        } ${
                          colId !== 'selection' ? 'cursor-move' : 'cursor-default'
                        } ${
                          draggedItem?.type === 'column' && draggedItem.index === idx ? 'opacity-20' : 
                          dragOverIdx === idx && draggedItem?.type === 'column' ? 'border-emerald-500 bg-emerald-50 scale-[1.02]' : 
                          'hover:border-slate-200 dark:hover:border-slate-600'
                        }`}
                     >
                       {colId !== 'selection' && <i className="fas fa-grip-vertical text-slate-300 group-hover:text-emerald-400 text-sm"></i>}
                       <span className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{columnLabels[colId] || 'Selection'}</span>
                     </div>
                   ))}
                 </div>
               </section>
            </div>

            <div className={`p-12 border-t flex items-center justify-between shrink-0 ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
               <button onClick={handleResetSettings} className="text-sm font-black text-rose-500 uppercase tracking-widest hover:underline flex items-center">
                 <i className="fas fa-rotate-left mr-3"></i>
                 Reset to Defaults
               </button>
               <button onClick={() => setIsSettingsOpen(false)} className={`px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-2xl transition-all ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-900 text-white hover:bg-black'}`}>Save Layout</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {leadToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setLeadToDelete(null)}></div>
          <div className={`rounded-[2rem] shadow-2xl border w-full max-w-md p-10 relative z-10 animate-in zoom-in-95 duration-200 text-[12px] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center space-x-5 mb-8 text-rose-600">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                <i className="fas fa-trash-can"></i>
              </div>
              <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Move to Trash?</h3>
            </div>
            <p className={`mb-10 text-lg font-semibold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Are you sure you want to delete <span className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-black`}>{leadToDelete.firstName} {leadToDelete.lastName}</span>? This item will be moved to the trash bin.
            </p>
            <div className="flex space-x-6">
              <button onClick={() => setLeadToDelete(null)} className={`flex-1 py-5 rounded-xl text-base font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
              <button onClick={executeDeleteLead} className="flex-1 py-5 bg-rose-600 text-white rounded-xl text-base font-black uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all">Move to Trash</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsBulkDeleteModalOpen(false)}></div>
          <div className={`rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] border w-full max-w-md relative z-10 p-12 text-center animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
             <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner">
                <i className="fas fa-trash-can"></i>
             </div>
             <h3 className={`text-4xl font-black tracking-tight mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Move to Trash?</h3>
             <p className={`text-lg font-semibold leading-relaxed mb-12 ${isDarkMode ? 'text-slate-400' : 'text-slate-50'}`}>
               You are about to move <span className={`${isDarkMode ? 'text-slate-100' : 'text-slate-900'} font-black`}>{selectedIds.length} selected leads</span> to the trash bin. Are you sure you want to proceed?
             </p>
             <div className="grid grid-cols-2 gap-6">
                <button onClick={() => setIsBulkDeleteModalOpen(false)} className={`py-6 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
                <button onClick={executeBulkDelete} className="py-6 bg-rose-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all">Confirm Delete</button>
             </div>
          </div>
        </div>
      )}

      {/* Lead Form Modal (Combined) */}
      {(isNewLeadModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => { setIsNewLeadModalOpen(false); setIsEditModalOpen(false); }}></div>
          <div className={`rounded-[2.5rem] shadow-2xl border w-full max-w-5xl p-12 relative z-10 max-h-[95vh] overflow-y-auto scrollbar-hide text-[14px] animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-12">
              <h3 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{isEditModalOpen ? 'Edit Lead Profile' : 'Create New Profile'}</h3>
              <button onClick={() => { setIsNewLeadModalOpen(false); setIsEditModalOpen(false); }} className="w-14 h-14 flex items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"><i className="fas fa-times text-2xl"></i></button>
            </div>
            
            <form onSubmit={handleLeadSubmit} className="space-y-12">
              <div className={`p-10 rounded-[2.5rem] border space-y-10 ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center space-x-4 border-b border-slate-200 dark:border-slate-700 pb-6 mb-4">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-base shadow-lg shadow-indigo-100"><i className="fas fa-user"></i></div>
                  <h4 className={`text-lg font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Primary Contact Information</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">First Name *</label>
                    <input type="text" required value={leadFormData.firstName} onChange={e => setLeadFormData({...leadFormData, firstName: e.target.value})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} placeholder="e.g. Michael" />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Last Name *</label>
                    <input type="text" required value={leadFormData.lastName} onChange={e => setLeadFormData({...leadFormData, lastName: e.target.value})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} placeholder="e.g. Scott" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Email Address *</label>
                    <input type="email" required value={leadFormData.email} onChange={e => setLeadFormData({...leadFormData, email: e.target.value})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} placeholder="email@example.com" />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Phone Number *</label>
                    <input type="tel" required value={leadFormData.phone} onChange={e => setLeadFormData({...leadFormData, phone: formatPhone(e.target.value)})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-black focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} placeholder="(555) 000-0000" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Birthday</label>
                    <input type="date" value={leadFormData.dob} onChange={e => setLeadFormData({...leadFormData, dob: e.target.value})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Wedding Anniversary</label>
                    <input type="date" value={leadFormData.weddingAnniversary} onChange={e => setLeadFormData({...leadFormData, weddingAnniversary: e.target.value})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Home Anniversary</label>
                    <input type="date" value={leadFormData.homeAnniversary} onChange={e => setLeadFormData({...leadFormData, homeAnniversary: e.target.value})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
                  </div>
                </div>
              </div>

              <div className={`p-10 rounded-[2.5rem] border space-y-10 ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center space-x-4 border-b border-slate-200 dark:border-slate-700 pb-6 mb-4">
                  <div className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center text-base shadow-lg"><i className="fas fa-chart-line"></i></div>
                  <h4 className={`text-lg font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Lead Data</h4>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[12px] font-black text-slate-400 uppercase">Lead Source</label>
                      <button type="button" onClick={() => setIsAddingSource(!isAddingSource)} className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-tighter flex items-center space-x-1">
                        <i className={`fas ${isAddingSource ? 'fa-times' : 'fa-plus'} mr-1`}></i>
                        <span>{isAddingSource ? 'Cancel' : 'Add New'}</span>
                      </button>
                    </div>
                    {isAddingSource ? (
                      <div className="flex space-x-3 animate-in slide-in-from-left-2 duration-200">
                        <input type="text" className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-bold outline-none shadow-sm ${isDarkMode ? 'bg-slate-900 border-indigo-500/50 text-white' : 'bg-white border-indigo-200'}`} placeholder="Custom Source..." value={newSourceInput} onChange={e => setNewSourceInput(e.target.value)} />
                        <button type="button" onClick={handleAddNewSource} className="bg-indigo-600 text-white w-16 rounded-2xl flex items-center justify-center shadow-lg"><i className="fas fa-check text-xl"></i></button>
                      </div>
                    ) : (
                      <select value={leadFormData.source} onChange={e => setLeadFormData({...leadFormData, source: e.target.value})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                        {availableSources.map(s => <option key={s} value={s} className={isDarkMode ? 'bg-slate-900 text-white' : ''}>{s}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Property Type</label>
                    <select value={leadFormData.propertyType} onChange={e => setLeadFormData({...leadFormData, propertyType: e.target.value as any})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                      <option value="PRIMARY" className={isDarkMode ? 'bg-slate-900 text-white' : ''}>Primary Home</option>
                      <option value="SECONDARY" className={isDarkMode ? 'bg-slate-900 text-white' : ''}>Secondary Home</option>
                      <option value="INVESTMENT" className={isDarkMode ? 'bg-slate-900 text-white' : ''}>Investment Property</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2.5 relative">
                  <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Classification Tags</label>
                  <button 
                    type="button"
                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                    className={`w-full border rounded-[1.5rem] px-6 py-5 text-left flex items-center justify-between focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm min-h-[74px] ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}
                  >
                    <div className="flex flex-wrap gap-2.5">
                      {leadFormData.tags && leadFormData.tags.length > 0 ? (
                        leadFormData.tags.map(tag => (
                          <span key={tag} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[11px] font-black rounded-lg border border-indigo-100 uppercase tracking-tighter flex items-center space-x-2 animate-in zoom-in-95 duration-150">
                            <span>{tag}</span>
                            <span onClick={(e) => { e.stopPropagation(); toggleLeadTag(tag); }} className="hover:text-indigo-800 cursor-pointer">
                              <i className="fas fa-times scale-90"></i>
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-xs opacity-60">Add tags to classify lead...</span>
                      )}
                    </div>
                    <i className={`fas fa-chevron-down text-slate-300 transition-transform duration-200 ${isTagDropdownOpen ? 'rotate-180' : ''}`}></i>
                  </button>
                  
                  {isTagDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[130]" onClick={() => setIsTagDropdownOpen(false)}></div>
                      <div className={`absolute z-[140] left-0 right-0 mt-4 border rounded-3xl shadow-2xl p-8 space-y-6 animate-in fade-in slide-in-from-top-3 duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className="flex space-x-3 pb-6 border-b border-slate-100 dark:border-slate-800">
                          <input type="text" placeholder="Create new tag..." className={`flex-1 border rounded-xl px-5 py-3 text-sm font-bold outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={newTagInput} onChange={e => setNewTagInput(e.target.value)} />
                          <button type="button" onClick={handleAddNewTag} className="bg-indigo-600 text-white px-6 rounded-xl text-[11px] font-black uppercase tracking-widest">Create</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto scrollbar-hide">
                          {availableTags.map(tag => {
                            const isSelected = leadFormData.tags?.includes(tag);
                            return (
                              <button 
                                key={tag}
                                type="button"
                                onClick={() => toggleLeadTag(tag)}
                                className={`px-5 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest text-left transition-all flex items-center justify-between border ${
                                  isSelected 
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-400' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-indigo-300 hover:text-indigo-600'
                                }`}
                              >
                                <span className="truncate">{tag}</span>
                                {isSelected && <i className="fas fa-check text-[11px]"></i>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Property Address</label>
                  <input type="text" value={leadFormData.propertyAddress} onChange={e => setLeadFormData({...leadFormData, propertyAddress: e.target.value})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} placeholder="Street, City, State, Zip" />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Temperature</label>
                    <select value={leadFormData.temperature} onChange={e => setLeadFormData({...leadFormData, temperature: e.target.value as any})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                      {Object.values(LeadTemperature).map(t => <option key={t} value={t} className={isDarkMode ? 'bg-slate-900 text-white' : ''}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Pipeline Stage</label>
                    <select value={leadFormData.status} onChange={e => setLeadFormData({...leadFormData, status: e.target.value as any})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-black focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                      {Object.values(LeadStatus).map(s => <option key={s} value={s} className={isDarkMode ? 'bg-slate-900 text-white' : ''}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Budget ($)</label>
                    <input type="text" required value={formatBudget(leadFormData.budget)} onChange={handleBudgetChange} className={`w-full border rounded-[1.5rem] px-8 py-5 text-xl font-black focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* SECONDARY CONTACT SECTION */}
              <div className={`p-10 rounded-[2.5rem] border space-y-10 ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center space-x-4 border-b border-slate-200 dark:border-slate-700 pb-6 mb-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-base shadow-md"><i className="fas fa-user-plus"></i></div>
                  <h4 className={`text-lg font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Secondary Contact Details</h4>
                </div>

                <div className="grid grid-cols-3 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Relationship</label>
                    <select value={leadFormData.secondaryContactRelationship} onChange={e => setLeadFormData({...leadFormData, secondaryContactRelationship: e.target.value as any})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                      {RELATIONSHIP_OPTIONS.map(opt => <option key={opt} value={opt} className={isDarkMode ? 'bg-slate-900 text-white' : ''}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">First Name</label>
                    <input type="text" value={leadFormData.spouseFirstName} onChange={e => setLeadFormData({...leadFormData, spouseFirstName: e.target.value})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Last Name</label>
                    <input type="text" value={leadFormData.spouseLastName} onChange={e => setLeadFormData({...leadFormData, spouseLastName: e.target.value})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Secondary Email</label>
                    <input type="email" value={leadFormData.spouseEmail} onChange={e => setLeadFormData({...leadFormData, spouseEmail: e.target.value})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} placeholder="email@example.com" />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Secondary Phone</label>
                    <input type="tel" value={leadFormData.spousePhone} onChange={e => setLeadFormData({...leadFormData, spousePhone: formatPhone(e.target.value)})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} placeholder="(555) 000-0000" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-[12px] font-black text-slate-400 uppercase ml-1">Secondary Birthday</label>
                    <input type="date" value={leadFormData.spouseDob} onChange={e => setLeadFormData({...leadFormData, spouseDob: e.target.value})} className={`w-full border rounded-[1.5rem] px-6 py-5 text-lg font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
                  </div>
                </div>
              </div>

              <div className="pt-10 flex items-center space-x-8">
                <button type="button" onClick={() => { setIsNewLeadModalOpen(false); setIsEditModalOpen(false); }} className={`flex-1 py-6 rounded-[2rem] text-lg font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
                <button type="submit" className="flex-1 py-6 bg-indigo-600 text-white rounded-[2rem] text-lg font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all">{isEditModalOpen ? 'Save Changes' : 'Create Profile'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadList;