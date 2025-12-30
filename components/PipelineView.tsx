import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Deal, Lead, DealNote } from '../types';

interface PipelineViewProps {
  deals: Deal[];
  leads: Lead[];
  onAddDeal: (deal: Deal) => void;
  onUpdateDeal: (id: string, updates: Partial<Deal>) => void;
  onDeleteDeal: (id: string) => void;
  availableSources: string[];
}

type YearFilter = 'CURRENT' | 'PREVIOUS' | 'ALL';
type StatusFilter = 'ALL' | 'ACTIVE' | 'PENDING' | 'CLOSED';
type DisplayMode = 'tile' | 'list';
type ColumnId = 'details' | 'status' | 'side' | 'price' | 'gci' | 'source' | 'date' | 'actions';

const TZ = 'America/Los_Angeles';

const INITIAL_COLUMN_ORDER: ColumnId[] = ['details', 'status', 'side', 'price', 'gci', 'source', 'date', 'actions'];

const columnLabels: Record<ColumnId, string> = {
  details: 'Transaction Details',
  status: 'Status',
  side: 'Side',
  price: 'Sale Price',
  gci: 'GCI Earned',
  source: 'Source',
  date: 'Est. Closing',
  actions: 'Actions'
};

const PipelineView: React.FC<PipelineViewProps> = ({ deals, leads, onAddDeal, onUpdateDeal, onDeleteDeal, availableSources }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<YearFilter>('CURRENT');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('tile');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingNote, setPendingNote] = useState('');
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);

  // Sorting state
  const [sortKey, setSortKey] = useState<ColumnId>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Settings / Column Rearrange state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(INITIAL_COLUMN_ORDER);
  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);
  const [overColIdx, setOverColIdx] = useState<number | null>(null);

  const currentYear = new Date().getFullYear();
  const topRef = useRef<HTMLDivElement>(null);

  // Navigation Refs for Modal
  const clientRef = useRef<HTMLDivElement>(null);
  const escrowRef = useRef<HTMLDivElement>(null);
  const lenderRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const tcRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);

  const initialFormState = {
    leadId: '',
    leadName: '',
    clientPhone: '',
    clientEmail: '',
    address: '',
    salePrice: '', 
    commissionPercentage: '2.5',
    status: 'ACTIVE' as Deal['status'],
    side: 'BUYER' as Deal['side'],
    date: '',
    source: availableSources[0] || 'Manual Entry',
    escrowCompany: '',
    escrowAddress: '',
    escrowOfficer: '',
    escrowPhone: '',
    escrowEmail: '',
    escrowFileNumber: '',
    lenderCompany: '',
    lenderLoanOfficer: '',
    lenderPhone: '',
    lenderEmail: '',
    titleCompany: '',
    titleOfficer: '',
    titlePhone: '',
    titleEmail: '',
    tcName: '',
    tcPhone: '',
    tcEmail: '',
    inspectionDueDate: '',
    appraisalDueDate: '',
    loanDueDate: '',
    dealNotes: [] as DealNote[]
  };

  const [formData, setFormData] = useState(initialFormState);

  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 1) return "";
    if (phoneNumberLength < 4) return `(${phoneNumber}`;
    if (phoneNumberLength < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const formatCurrency = (val: string) => {
    const numeric = val.replace(/[^0-9.]/g, '');
    if (!numeric) return '';
    const n = parseFloat(numeric);
    if (isNaN(n)) return '';
    return '$' + n.toLocaleString();
  };

  const filteredDeals = useMemo(() => {
    let result = deals.filter(deal => {
      if (statusFilter !== 'ALL' && deal.status !== statusFilter) return false;
      const dealDate = new Date(deal.date);
      const dealYear = dealDate.getFullYear();
      if (yearFilter === 'CURRENT' && dealYear !== currentYear) return false;
      if (yearFilter === 'PREVIOUS' && dealYear >= currentYear) return false;
      
      const searchLower = searchTerm.toLowerCase().trim();
      const searchDigits = searchLower.replace(/[^\d]/g, '');

      if (searchLower) {
        const dealPhoneDigits = (deal.clientPhone || '').replace(/[^\d]/g, '');
        
        const matchesSearch = 
          deal.leadName.toLowerCase().includes(searchLower) ||
          deal.address.toLowerCase().includes(searchLower) ||
          (deal.clientEmail && deal.clientEmail.toLowerCase().includes(searchLower)) ||
          (searchDigits && dealPhoneDigits.includes(searchDigits));
        
        if (!matchesSearch) return false;
      }

      if (fromDate && deal.date < fromDate) return false;
      if (toDate && deal.date > toDate) return false;
      return !deal.isDeleted;
    });

    // Apply Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'details':
          comparison = a.leadName.localeCompare(b.leadName);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'source':
          comparison = (a.source || '').localeCompare(b.source || '');
          break;
        case 'price':
          comparison = a.salePrice - b.salePrice;
          break;
        case 'gci':
          comparison = a.commissionAmount - b.commissionAmount;
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [deals, yearFilter, statusFilter, searchTerm, fromDate, toDate, currentYear, sortKey, sortOrder]);

  const handleSort = (key: ColumnId) => {
    if (key === 'actions') return;
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-indigo-600 text-white rounded-sm px-0.5 no-underline">{part}</mark> : part
    );
  };

  const stats = useMemo(() => {
    const matching = filteredDeals.length;
    const volume = filteredDeals.reduce((s, d) => s + d.salePrice, 0);
    const gci = filteredDeals.reduce((s, d) => s + d.commissionAmount, 0);
    return { matching, volume, gci };
  }, [filteredDeals]);

  const totalPages = Math.ceil(filteredDeals.length / itemsPerPage);
  const paginatedDeals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDeals.slice(start, start + itemsPerPage);
  }, [filteredDeals, currentPage, itemsPerPage]);

  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollToModalSection = (ref: React.RefObject<HTMLDivElement>) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleAddNote = () => {
    if (!pendingNote.trim()) return;
    const newNote: DealNote = { id: `dn_${Date.now()}`, content: pendingNote.trim(), createdAt: new Date().toISOString() };
    const updatedNotes = [newNote, ...formData.dealNotes];
    setFormData(prev => ({ ...prev, dealNotes: updatedNotes }));
    if (editingDealId) onUpdateDeal(editingDealId, { dealNotes: updatedNotes });
    setPendingNote('');
  };

  const handleOpenEdit = (deal: Deal) => {
    setEditingDealId(deal.id);
    setFormData({
      leadId: deal.leadId || '',
      leadName: deal.leadName,
      clientPhone: deal.clientPhone || '',
      clientEmail: deal.clientEmail || '',
      address: deal.address,
      salePrice: formatCurrency(deal.salePrice.toString()),
      commissionPercentage: deal.commissionPercentage.toString(),
      status: deal.status,
      side: deal.side,
      date: deal.date ? new Date(deal.date).toISOString().split('T')[0] : '',
      source: deal.source || availableSources[0],
      escrowCompany: deal.escrowCompany || '',
      escrowAddress: deal.escrowAddress || '',
      escrowOfficer: deal.escrowOfficer || '',
      escrowPhone: formatPhone(deal.escrowPhone || ''),
      escrowEmail: deal.escrowEmail || '',
      escrowFileNumber: deal.escrowFileNumber || '',
      lenderCompany: deal.lenderCompany || '',
      lenderLoanOfficer: deal.lenderLoanOfficer || '',
      lenderPhone: formatPhone(deal.lenderPhone || ''),
      lenderEmail: deal.lenderEmail || '',
      titleCompany: deal.titleCompany || '',
      titleOfficer: deal.titleOfficer || '',
      titlePhone: formatPhone(deal.titlePhone || ''),
      titleEmail: deal.titleEmail || '',
      tcName: deal.tcName || '',
      tcPhone: formatPhone(deal.tcPhone || ''),
      tcEmail: deal.tcEmail || '',
      inspectionDueDate: deal.inspectionDueDate || '',
      appraisalDueDate: deal.appraisalDueDate || '',
      loanDueDate: deal.loanDueDate || '',
      dealNotes: deal.dealNotes || []
    });
    setIsModalOpen(true);
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setEditingDealId(null);
    setIsModalOpen(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const price = parseFloat(formData.salePrice.replace(/[^0-9.]/g, '')) || 0;
    const comm = parseFloat(formData.commissionPercentage) || 0;
    const payload: Deal = {
      id: editingDealId || `deal_${Date.now()}`,
      brokerageId: 'brk_7721',
      assignedUserId: 'agent_1',
      ...formData,
      salePrice: price,
      commissionPercentage: comm,
      commissionAmount: (price * comm) / 100,
    } as Deal;
    if (editingDealId) onUpdateDeal(editingDealId, payload);
    else onAddDeal(payload);
    handleReset();
  };

  const getStatusColor = (status: Deal['status']) => {
    switch (status) {
      case 'ACTIVE': return 'bg-blue-600';
      case 'PENDING': return 'bg-orange-500';
      case 'CLOSED': return 'bg-emerald-600';
      default: return 'bg-slate-600';
    }
  };

  const getStatusLabel = (status: Deal['status']) => status === 'CLOSED' ? 'SOLD' : status;

  const getSourceBranding = (source?: string) => {
    const s = (source || '').toLowerCase();
    if (s.includes('zillow')) return { icon: 'fas fa-house-chimney', color: 'text-[#006AFF]', bg: 'bg-[#006AFF]/10' };
    if (s.includes('realtor')) return { icon: 'fas fa-house-circle-check', color: 'text-[#D92228]', bg: 'bg-[#D92228]/10' };
    if (s.includes('facebook')) return { icon: 'fab fa-facebook', color: 'text-[#1877F2]', bg: 'bg-[#1877F2]/10' };
    if (s.includes('google')) return { icon: 'fab fa-google', color: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10' };
    if (s.includes('referral')) return { icon: 'fas fa-handshake', color: 'text-indigo-600', bg: 'bg-indigo-50' };
    if (s.includes('open house')) return { icon: 'fas fa-door-open', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { icon: 'fas fa-keyboard', color: 'text-slate-400', bg: 'bg-slate-50' };
  };

  const handleColDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (index !== overColIdx) setOverColIdx(index);
  };

  const handleColDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedColIdx === null || draggedColIdx === targetIdx) return;
    const newOrder = [...columnOrder];
    const [removed] = newOrder.splice(draggedColIdx, 1);
    newOrder.splice(targetIdx, 0, removed);
    setColumnOrder(newOrder);
    setDraggedColIdx(null);
    setOverColIdx(null);
  };

  const renderCell = (deal: Deal, colId: ColumnId) => {
    switch (colId) {
      case 'details':
        return (
          <div className="overflow-hidden">
            <p className="text-base font-black text-slate-800 truncate">{highlightMatch(deal.leadName, searchTerm)}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter truncate mt-0.5">{highlightMatch(deal.address, searchTerm)}</p>
          </div>
        );
      case 'status':
        return (
          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${getStatusColor(deal.status)} text-white`}>
            {getStatusLabel(deal.status)}
          </span>
        );
      case 'side':
        return (
          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${deal.side === 'BUYER' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
            {deal.side}
          </span>
        );
      case 'price':
        return <p className="text-sm font-black text-slate-700">${deal.salePrice.toLocaleString()}</p>;
      case 'gci':
        return (
          <>
            <p className="text-sm font-black text-emerald-500">${deal.commissionAmount.toLocaleString()}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{deal.commissionPercentage}% Rate</p>
          </>
        );
      case 'source':
        return (
          <div className="flex items-center space-x-2">
            <i className={`${getSourceBranding(deal.source).icon} ${getSourceBranding(deal.source).color} text-[11px]`}></i>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{deal.source}</span>
          </div>
        );
      case 'date':
        return <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{new Date(deal.date).toLocaleDateString()}</p>;
      case 'actions':
        return (
          <div className="flex items-center justify-end space-x-2">
            <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(deal); }} className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><i className="fas fa-pencil-alt text-xs"></i></button>
            <button onClick={(e) => { e.stopPropagation(); setDealToDelete(deal); }} className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"><i className="fas fa-trash text-xs"></i></button>
          </div>
        );
      default: return null;
    }
  };

  // Explicitly typed DealCard as React.FC
  const DealCard: React.FC<{ deal: Deal }> = ({ deal }) => {
    const branding = getSourceBranding(deal.source);
    return (
      <div className="bg-white border border-slate-200 rounded-[1.25rem] p-6 shadow-sm hover:shadow-md transition-all relative group overflow-hidden cursor-pointer" onClick={() => handleOpenEdit(deal)}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 ${branding.bg} ${branding.color} rounded-full flex items-center justify-center text-xs border border-current/10 transition-colors`}>
              <i className={branding.icon}></i>
            </div>
            <div className="overflow-hidden">
              <h4 className="text-base font-black text-slate-800 tracking-tight truncate">
                {highlightMatch(deal.leadName, searchTerm)}
              </h4>
              <p className="flex items-center text-[11px] text-slate-400 font-bold mt-0.5 truncate">
                <i className="fas fa-location-dot mr-1.5 opacity-40"></i>
                {highlightMatch(deal.address, searchTerm)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(deal); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-300 hover:text-indigo-600 transition-all border border-slate-100/50"><i className="fas fa-pencil-alt text-[10px]"></i></button>
            <button onClick={(e) => { e.stopPropagation(); setDealToDelete(deal); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-300 hover:text-rose-600 transition-all border border-slate-100/50"><i className="fas fa-trash-can text-[10px]"></i></button>
          </div>
        </div>
        <div className="h-px bg-slate-50 w-full mb-6 mt-2"></div>
        <div className="grid grid-cols-2 gap-4 pb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sale Price</p>
            <p className="text-base font-black text-slate-800 tracking-tight">${deal.salePrice.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Comm. ({deal.commissionPercentage}%)</p>
            <p className="text-base font-black text-emerald-500 tracking-tight">${deal.commissionAmount.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center pt-5 border-t border-slate-50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
            <i className="far fa-calendar-check mr-2.5 text-slate-300"></i>
            {deal.status === 'CLOSED' ? 'Sold' : 'Est. Closing'}: {new Date(deal.date).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  };

  // Explicitly typed ColumnHeader as React.FC
  const ColumnHeader: React.FC<{ status: StatusFilter; deals: Deal[] }> = ({ status, deals }) => {
    const vol = deals.reduce((sum, d) => sum + d.salePrice, 0);
    return (
      <button 
        onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
        className={`w-full p-6 rounded-3xl flex items-center justify-between text-white shadow-xl transition-all hover:scale-[1.01] relative group overflow-hidden ${getStatusColor(status as any)}`}
      >
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
             <i className={`fas ${status === 'ACTIVE' ? 'fa-bolt' : status === 'PENDING' ? 'fa-clock' : 'fa-check-circle'}`}></i>
          </div>
          <div className="text-left">
            <h3 className="text-xl font-black uppercase tracking-[0.2em]">{getStatusLabel(status as any)}</h3>
            <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">{deals.length} Transactions</p>
          </div>
        </div>
        <div className="text-right relative z-10">
          <p className="text-[10px] font-black opacity-60 uppercase tracking-widest leading-none mb-1">Volume</p>
          <p className="text-xl font-black tracking-tight">${vol.toLocaleString()}</p>
        </div>
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 backdrop-blur-[2px]">
           <span className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Click to view full page.</span>
        </div>
      </button>
    );
  };

  const renderKanban = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {['ACTIVE', 'PENDING', 'CLOSED'].map(status => {
        const colDeals = deals.filter(d => d.status === status && !d.isDeleted);
        return (
          <div key={status} className="flex flex-col space-y-6">
            <ColumnHeader status={status as any} deals={colDeals} />
            <div className="flex-1 bg-slate-50/50 rounded-3xl border border-slate-100 p-6 space-y-6 min-h-[600px]">
              {colDeals.length > 0 ? (
                colDeals.map(d => <DealCard key={d.id} deal={d} />)
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20 opacity-50">
                  <i className="fas fa-folder-open text-4xl mb-4 opacity-10"></i>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">No {status.toLowerCase()} deals</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderFocusedView = () => (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3 group hover:border-indigo-400 transition-all">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-base"><i className="fas fa-table-list"></i></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Matching</p><p className="text-lg font-black text-slate-900">{stats.matching} Units</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3 group hover:border-indigo-400 transition-all">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-base"><i className="fas fa-chart-line"></i></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sales Volume</p><p className="text-lg font-black text-slate-900">${stats.volume.toLocaleString()}</p></div>
        </div>
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center space-x-3 group hover:border-emerald-400 transition-all">
          <div className="w-10 h-10 bg-white text-emerald-600 rounded-xl flex items-center justify-center text-base shadow-sm"><i className="fas fa-sack-dollar"></i></div>
          <div><p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-0.5">Gross GCI</p><p className="text-lg font-black text-emerald-900">${stats.gci.toLocaleString()}</p></div>
        </div>
      </div>

      {displayMode === 'tile' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {paginatedDeals.map(d => <DealCard key={d.id} deal={d} />)}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columnOrder.map(colId => (
                  <th 
                    key={colId} 
                    onClick={() => handleSort(colId)}
                    className={`px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors ${colId === 'actions' ? 'text-right pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center space-x-2">
                       <span>{columnLabels[colId]}</span>
                       {sortKey === colId && (
                         <i className={`fas fa-chevron-${sortOrder === 'asc' ? 'up' : 'down'} text-[8px] text-indigo-500`}></i>
                       )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDeals.map(deal => (
                <tr key={deal.id} className="hover:bg-slate-50 transition-all cursor-pointer group" onClick={() => handleOpenEdit(deal)}>
                  {columnOrder.map(colId => (
                    <td key={colId} className={`px-8 py-6 ${colId === 'actions' ? 'text-right' : ''}`}>
                      {renderCell(deal, colId)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-[2rem] p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
          <div className="flex items-center space-x-2 cursor-pointer">
            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-transparent border-none text-[10px] font-black text-slate-800 outline-none cursor-pointer pr-1 appearance-none">
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <i className="fas fa-chevron-down text-[7px] text-slate-400"></i>
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">per page</span>
        </div>
        <div className="flex flex-col items-center space-y-1">
          <div className="flex items-center space-x-4">
             <button disabled={currentPage === 1} onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); scrollToTop(); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-300 border border-slate-100 hover:bg-indigo-50 transition-all shadow-inner"><i className="fas fa-chevron-left text-[10px]"></i></button>
             <div className="text-[9px] font-black text-slate-800 uppercase tracking-[0.2em]">Page {currentPage} of {totalPages || 1}</div>
             <button disabled={currentPage >= totalPages} onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); scrollToTop(); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-300 border border-slate-100 hover:bg-indigo-50 transition-all shadow-inner"><i className="fas fa-chevron-right text-[10px]"></i></button>
          </div>
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Showing {paginatedDeals.length} of {filteredDeals.length} Items</p>
        </div>
        <button onClick={scrollToTop} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center space-x-3 active:scale-95 group">
          <i className="fas fa-arrow-up transition-transform group-hover:-translate-y-1"></i>
          <span>Back to Top</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20" ref={topRef}>
      <div className="flex flex-col space-y-5 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-visible">
        {/* Decorative layer */}
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        </div>
        
        {/* Heading Section */}
        <div className="flex items-center space-x-5 relative z-10">
          {statusFilter !== 'ALL' && (
            <button 
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
          )}
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {statusFilter === 'ALL' ? 'Pipeline' : `${getStatusLabel(statusFilter as any)} Transactions`}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {statusFilter === 'ALL' ? 'Manage and track your entire transaction portfolio.' : `Analyzing current ${getStatusLabel(statusFilter as any).toLowerCase()} production items.`}
            </p>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row items-center gap-4 relative z-30">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner shrink-0">
            <button onClick={() => { setYearFilter('CURRENT'); setCurrentPage(1); }} className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all ${yearFilter === 'CURRENT' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Current Year</button>
            <div className="relative">
              <button onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)} className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center space-x-2 ${yearFilter === 'PREVIOUS' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <span>Previous Years</span>
                <i className={`fas fa-chevron-down text-[7px] transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`}></i>
              </button>
              {isYearDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsYearDropdownOpen(false)}></div>
                  <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
                    <button onClick={() => { setYearFilter('PREVIOUS'); setIsYearDropdownOpen(false); setCurrentPage(1); }} className="w-full text-left px-6 py-3 hover:bg-indigo-50 flex items-center space-x-3 group transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors"><i className="fas fa-calendar-alt text-xs text-slate-400 group-hover:text-indigo-600"></i></div>
                      <div><p className="text-xs font-black text-slate-700">All Previous</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Lifetime Records</p></div>
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => { setYearFilter('ALL'); setCurrentPage(1); }} className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all ${yearFilter === 'ALL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>All Time</button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-3 shadow-inner">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] shrink-0">From:</span>
              <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setCurrentPage(1); }} className="bg-transparent border-none text-[12px] font-black text-slate-700 outline-none w-36 cursor-pointer" />
            </div>
            <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-3 shadow-inner">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] shrink-0">To:</span>
              <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setCurrentPage(1); }} className="bg-transparent border-none text-[12px] font-black text-slate-700 outline-none w-36 cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100 w-full relative z-10"></div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
            <div className="relative max-w-2xl w-full group">
              <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
              <input 
                type="text" 
                placeholder="Search transactions..." 
                value={searchTerm} 
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                className="w-full pl-16 pr-8 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all" 
              />
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner h-fit shrink-0">
              <button 
                onClick={() => setDisplayMode('tile')} 
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${displayMode === 'tile' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <i className="fas fa-th-large"></i>
                <span>Tile</span>
              </button>
              <button 
                onClick={() => setDisplayMode('list')} 
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${displayMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <i className="fas fa-list"></i>
                <span>List</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
              title="Rearrange Columns"
            >
              <i className="fas fa-cog text-lg"></i>
            </button>
            <button onClick={() => { handleReset(); setIsModalOpen(true); }} className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center space-x-3 active:scale-95 shrink-0"><i className="fas fa-plus"></i><span>Add Transaction</span></button>
          </div>
        </div>
      </div>

      {(statusFilter === 'ALL' && displayMode === 'tile') ? renderKanban() : renderFocusedView()}

      {/* Delete Confirmation Modal */}
      {dealToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setDealToDelete(null)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-md p-8 relative z-10 animate-in zoom-in-95 duration-200 text-[12px]">
            <div className="flex items-center space-x-4 mb-6 text-rose-600">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                <i className="fas fa-trash-can"></i>
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Trash Transaction?</h3>
            </div>
            <p className="text-slate-600 mb-8 text-base font-semibold leading-relaxed">
              Are you sure you want to delete the transaction for <span className="text-slate-900 font-black">{dealToDelete.address}</span>?
            </p>
            <div className="flex space-x-4">
              <button onClick={() => setDealToDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={() => { onDeleteDeal(dealToDelete.id); setDealToDelete(null); }} className="flex-1 py-4 bg-rose-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all">Move to Trash</button>
            </div>
          </div>
        </div>
      )}

      {/* Rearrange Columns Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-2xl relative z-10 p-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Rearrange Columns</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600"><i className="fas fa-times text-xl"></i></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {columnOrder.map((colId, idx) => (
                <div 
                  key={colId} 
                  draggable 
                  onDragStart={(e) => handleColDragStart(e, idx)} 
                  onDragOver={(e) => handleColDragOver(e, idx)} 
                  onDrop={(e) => handleColDrop(e, idx)}
                  className={`p-4 bg-slate-50 border-2 border-transparent rounded-2xl cursor-move flex items-center justify-between group hover:border-indigo-400 transition-all ${draggedColIdx === idx ? 'opacity-20' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    <i className="fas fa-grip-vertical text-slate-300 group-hover:text-indigo-400 transition-colors"></i>
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{columnLabels[colId]}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
              <button onClick={() => setColumnOrder(INITIAL_COLUMN_ORDER)} className="text-xs font-black text-rose-500 uppercase tracking-widest hover:underline flex items-center"><i className="fas fa-rotate-left mr-2"></i>Reset</button>
              <button onClick={() => setIsSettingsOpen(false)} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl hover:bg-black transition-all">Save Layout</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={handleReset}></div>
          {/* Wrap everything in a form to ensure the Save button in the header triggers validation */}
          <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-5xl relative z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh] text-[12px]">
            <div className="flex flex-col p-10 pb-4 shrink-0">
              <div className="flex items-center justify-between w-full mb-6">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{editingDealId ? 'Edit Transaction' : 'New Transaction Entry'}</h3>
                <div className="flex items-center space-x-4">
                  <button type="submit" className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-3 active:scale-95"><i className="fas fa-save text-indigo-100"></i><span>Save</span></button>
                  <button type="button" onClick={handleReset} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-200 transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 active:scale-90"><i className="fas fa-times text-2xl"></i></button>
                </div>
              </div>
              <div className="flex items-center space-x-4 overflow-x-auto scrollbar-hide bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-fit">
                {[{ ref: clientRef, label: 'Client', icon: 'fa-user', color: 'text-blue-500' }, { ref: escrowRef, label: 'Escrow', icon: 'fa-file-contract', color: 'text-amber-500' }, { ref: lenderRef, label: 'Lender', icon: 'fa-hand-holding-dollar', color: 'text-emerald-500' }, { ref: titleRef, label: 'Title', icon: 'fa-building-circle-check', color: 'text-indigo-500' }, { ref: tcRef, label: 'TC', icon: 'fa-users-gear', color: 'text-rose-500' }, { ref: timelineRef, label: 'Timeline', icon: 'fa-clock-rotate-left', color: 'text-purple-500' }, { ref: notesRef, label: 'Notes', icon: 'fa-note-sticky', color: 'text-slate-500' }].map(nav => (
                  <button key={nav.label} type="button" onClick={() => scrollToModalSection(nav.ref)} className="px-4 py-2 bg-white rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all hover:shadow-sm flex items-center space-x-2 border border-slate-100 active:scale-95"><i className={`fas ${nav.icon} ${nav.color}`}></i><span>{nav.label}</span></button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 pt-0 scrollbar-hide">
              <div className="space-y-12">
                <div ref={clientRef} className="space-y-6 pt-6">
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 mb-6 flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-user text-blue-600"></i></div>
                    <h4 className="text-lg font-black text-blue-900 uppercase tracking-widest">Client Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Client Name *</label>
                      <input 
                        required 
                        type="text" 
                        value={formData.leadName} 
                        onChange={e => setFormData({...formData, leadName: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:bg-white transition-all" 
                        placeholder="Full Name" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Client Phone *</label>
                      <input 
                        required 
                        type="tel" 
                        value={formData.clientPhone} 
                        onChange={e => setFormData({...formData, clientPhone: formatPhone(e.target.value)})} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:bg-white transition-all" 
                        placeholder="(555) 000-0000" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Client Email *</label>
                      <input 
                        required 
                        type="email" 
                        value={formData.clientEmail} 
                        onChange={e => setFormData({...formData, clientEmail: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:bg-white transition-all" 
                        placeholder="email@example.com" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Address</label><input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="123 Main St..." /></div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sale Price ($)</label><input type="text" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: formatCurrency(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black text-lg outline-none" placeholder="$0" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commission (%)</label><input type="number" step="0.01" value={formData.commissionPercentage} onChange={e => setFormData({...formData, commissionPercentage: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black text-lg outline-none" placeholder="2.5" /></div>
                  </div>
                </div>
                
                {/* ESCROW SECTION */}
                <div ref={escrowRef} className="space-y-6">
                  <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 mb-6 flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-file-contract text-amber-600"></i></div>
                    <h4 className="text-lg font-black text-amber-900 uppercase tracking-widest">Escrow Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow Company</label><input type="text" value={formData.escrowCompany} onChange={e => setFormData({...formData, escrowCompany: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="Company Name" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow Officer</label><input type="text" value={formData.escrowOfficer} onChange={e => setFormData({...formData, escrowOfficer: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="Officer Name" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow Phone</label><input type="tel" value={formData.escrowPhone} onChange={e => setFormData({...formData, escrowPhone: formatPhone(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="(555) 000-0000" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow Email</label><input type="email" value={formData.escrowEmail} onChange={e => setFormData({...formData, escrowEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="escrow@example.com" /></div>
                    <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow Address</label><input type="text" value={formData.escrowAddress} onChange={e => setFormData({...formData, escrowAddress: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="Escrow Office Address" /></div>
                    <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow File #</label><input type="text" value={formData.escrowFileNumber} onChange={e => setFormData({...formData, escrowFileNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black outline-none" placeholder="File Identifier" /></div>
                  </div>
                </div>

                {/* LENDER SECTION */}
                <div ref={lenderRef} className="space-y-6">
                  <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 mb-6 flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-hand-holding-dollar text-emerald-600"></i></div>
                    <h4 className="text-lg font-black text-emerald-900 uppercase tracking-widest">Lender Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lender Company</label><input type="text" value={formData.lenderCompany} onChange={e => setFormData({...formData, lenderCompany: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="Lender Company" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loan Officer</label><input type="text" value={formData.lenderLoanOfficer} onChange={e => setFormData({...formData, lenderLoanOfficer: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="Officer Name" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lender Phone</label><input type="tel" value={formData.lenderPhone} onChange={e => setFormData({...formData, lenderPhone: formatPhone(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="(555) 000-0000" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lender Email</label><input type="email" value={formData.lenderEmail} onChange={e => setFormData({...formData, lenderEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="lender@example.com" /></div>
                  </div>
                </div>

                {/* TITLE SECTION */}
                <div ref={titleRef} className="space-y-6">
                  <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 mb-6 flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-building-circle-check text-indigo-600"></i></div>
                    <h4 className="text-lg font-black text-indigo-900 uppercase tracking-widest">Title Company Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title Company Name</label><input type="text" value={formData.titleCompany} onChange={e => setFormData({...formData, titleCompany: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="Title Company" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title Officer</label><input type="text" value={formData.titleOfficer} onChange={e => setFormData({...formData, titleOfficer: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="Officer Name" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title Phone</label><input type="tel" value={formData.titlePhone} onChange={e => setFormData({...formData, titlePhone: formatPhone(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="(555) 000-0000" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title Email</label><input type="email" value={formData.titleEmail} onChange={e => setFormData({...formData, titleEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="title@example.com" /></div>
                  </div>
                </div>

                <div ref={tcRef} className="space-y-6"><div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 mb-6 flex items-center space-x-4"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-users-gear text-rose-600"></i></div><h4 className="text-lg font-black text-rose-900 uppercase tracking-widest">Transaction Coordinator</h4></div><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">TC Name</label><input type="text" value={formData.tcName} onChange={e => setFormData({...formData, tcName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="TC Name" /></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">TC Phone</label><input type="tel" value={formData.tcPhone} onChange={e => setFormData({...formData, tcPhone: formatPhone(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="(555) 000-0000" /></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">TC Email</label><input type="email" value={formData.tcEmail} onChange={e => setFormData({...formData, tcEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="email@example.com" /></div></div></div>
                <div ref={timelineRef} className="space-y-6"><div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100 mb-6 flex items-center space-x-4"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-clock-rotate-left text-purple-600"></i></div><h4 className="text-lg font-black text-purple-900 uppercase tracking-widest">Transaction Timeline</h4></div><div className="grid grid-cols-1 md:grid-cols-4 gap-6"><div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase ml-1">Est. Closing</label><input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-white border border-purple-200 rounded-xl px-6 py-4 font-black" /></div><div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase ml-1">Inspection Due</label><input type="date" value={formData.inspectionDueDate} onChange={e => setFormData({...formData, inspectionDueDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 font-black" /></div><div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase ml-1">Appraisal Due</label><input type="date" value={formData.appraisalDueDate} onChange={e => setFormData({...formData, appraisalDueDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 font-black" /></div><div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase ml-1">Loan Due</label><input type="date" value={formData.loanDueDate} onChange={e => setFormData({...formData, loanDueDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 font-black" /></div></div></div>
                <div ref={notesRef} className="space-y-6 pt-6"><div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 flex items-center space-x-4"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-note-sticky text-slate-600"></i></div><h4 className="text-lg font-black text-slate-900 uppercase tracking-widest">Transaction History & Notes</h4></div><div className="space-y-6 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-inner"><div className="flex space-x-4"><textarea value={pendingNote} onChange={e => setPendingNote(e.target.value)} placeholder="Log a milestone or internal update..." className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-5 font-bold text-base outline-none min-h-[100px] focus:bg-white" /><button type="button" onClick={handleAddNote} className="px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest h-[100px] shadow-lg">Add Note</button></div><div className="space-y-3 mt-6">{formData.dealNotes.map(note => (<div key={note.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-start animate-in fade-in slide-in-from-top-1"><div className="space-y-1"><p className="text-base font-semibold text-slate-700">{note.content}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(note.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div><button type="button" onClick={() => { const filtered = formData.dealNotes.filter(n => n.id !== note.id); setFormData({...formData, dealNotes: filtered}); if (editingDealId) onUpdateDeal(editingDealId, { dealNotes: filtered }); }} className="text-slate-300 hover:text-rose-500 transition-colors"><i className="fas fa-times-circle"></i></button></div>))}</div></div></div>
                <div className="pt-10 border-t border-slate-100 flex flex-col items-center justify-center space-y-6">
                  <div className="flex items-center space-x-4">
                    <button type="button" onClick={handleReset} className="px-8 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg flex items-center space-x-2 active:scale-95"><i className="fas fa-xmark"></i><span>Discard</span></button>
                    <button type="submit" className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm shadow-2xl flex items-center justify-center space-x-3 active:scale-95"><i className="fas fa-save"></i><span>Save Transaction</span></button>
                    <button type="button" onClick={() => scrollToModalSection(clientRef)} className="flex items-center space-x-3 px-8 py-5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95"><i className="fas fa-arrow-up"></i><span>Back to Top</span></button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PipelineView;