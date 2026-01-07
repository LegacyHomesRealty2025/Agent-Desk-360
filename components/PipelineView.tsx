import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Deal, Lead, DealNote } from '../types.ts';

interface PipelineViewProps {
  deals: Deal[];
  leads: Lead[];
  onAddDeal: (deal: Deal) => void;
  onUpdateDeal: (id: string, updates: Partial<Deal>) => void;
  onDeleteDeal: (id: string) => void;
  availableSources: string[];
}

type YearFilter = 'CURRENT' | 'ALL' | number;
type StatusFilter = Deal['status'] | 'ALL';
type SortKey = 'leadName' | 'date' | 'salePrice' | 'side' | 'source';
type SortDirection = 'asc' | 'desc';
type ColumnId = 'client' | 'closing' | 'price' | 'side' | 'source' | 'actions';
type DisplayMode = 'tile' | 'list';

const TZ = 'America/Los_Angeles';

const Highlight = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim() || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5 font-bold shadow-sm">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const PipelineView: React.FC<PipelineViewProps> = ({ deals, leads, onAddDeal, onUpdateDeal, onDeleteDeal, availableSources }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<Deal['status'] | null>(null);
  const [yearFilter, setYearFilter] = useState<YearFilter>('CURRENT');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');
  
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(['client', 'price', 'side', 'source', 'closing', 'actions']);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [pendingNote, setPendingNote] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const topRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  const previousYears = useMemo<number[]>(() => {
    const years = deals.map(d => d.date ? new Date(d.date).getFullYear() : 0);
    return Array.from(new Set(years))
      .filter((y: number) => y > 0 && y < currentYear)
      .sort((a: number, b: number) => b - a);
  }, [deals, currentYear]);

  const initialFormState = {
    leadId: '',
    leadName: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    salePrice: '', 
    commissionPercentage: '' as any, 
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
    lenderCellPhone: '',
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
    if (phoneNumber.length < 4) return `(${phoneNumber}`;
    if (phoneNumber.length < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const unformatCurrency = (val: string) => val.replace(/[^0-9.]/g, '');

  const formatCurrency = (val: string) => {
    const numeric = unformatCurrency(val);
    if (!numeric) return '';
    const n = parseFloat(numeric);
    if (isNaN(n)) return '';
    return '$' + n.toLocaleString();
  };

  const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, salePrice: formatCurrency(e.target.value) });
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingDealId(null);
    setShowClientSuggestions(false);
    setPendingNote('');
  };

  const getStatusLabel = (s: StatusFilter) => {
    if (s === 'ALL') return 'Aggregate Portfolio';
    if (s === 'CLOSED') return 'Sold';
    return s.charAt(0) + s.slice(1).toLowerCase();
  };

  const executeDeleteDeal = () => {
    if (dealToDelete) {
      onDeleteDeal(dealToDelete.id);
      setDealToDelete(null);
    }
  };

  const handleOpenCreate = () => {
    setEditingDealId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (deal: Deal) => {
    setEditingDealId(deal.id);
    const associatedLead = leads.find(l => l.id === deal.leadId);
    setFormData({
      leadId: deal.leadId || '',
      leadName: deal.leadName || '',
      firstName: associatedLead?.firstName || deal.leadName.split(' ')[0] || '',
      lastName: associatedLead?.lastName || deal.leadName.split(' ').slice(1).join(' ') || '',
      phone: formatPhone(associatedLead?.phone || deal.clientPhone || ''),
      email: associatedLead?.email || deal.clientEmail || '',
      address: deal.address,
      salePrice: formatCurrency(deal.salePrice.toString()),
      commissionPercentage: deal.commissionPercentage.toString(),
      status: deal.status,
      side: deal.side,
      date: deal.date ? new Date(deal.date).toLocaleDateString('en-CA', { timeZone: TZ }) : '',
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
      lenderCellPhone: formatPhone(deal.lenderCellPhone || ''),
      lenderEmail: deal.lenderEmail || '',
      titleCompany: deal.titleCompany || '',
      titleOfficer: deal.titleOfficer || '',
      titlePhone: formatPhone(deal.titlePhone || ''),
      titleEmail: deal.titleEmail || '',
      tcName: deal.tcName || '',
      tcPhone: formatPhone(deal.tcPhone || ''),
      tcEmail: deal.tcEmail || '',
      inspectionDueDate: deal.inspectionDueDate ? new Date(deal.inspectionDueDate).toLocaleDateString('en-CA', { timeZone: TZ }) : '',
      appraisalDueDate: deal.appraisalDueDate ? new Date(deal.appraisalDueDate).toLocaleDateString('en-CA', { timeZone: TZ }) : '',
      loanDueDate: deal.loanDueDate ? new Date(deal.loanDueDate).toLocaleDateString('en-CA', { timeZone: TZ }) : '',
      dealNotes: deal.dealNotes || []
    });
    setIsModalOpen(true);
  };

  const handleAddNote = () => {
    if (!pendingNote.trim()) return;
    const newNote: DealNote = {
      id: `dn_${Date.now()}`,
      content: pendingNote.trim(),
      createdAt: new Date().toISOString()
    };
    setFormData(prev => ({ ...prev, dealNotes: [newNote, ...prev.dealNotes] }));
    setPendingNote('');
  };

  const handleSelectLead = (l: Lead) => {
    setFormData({
      ...formData,
      leadId: l.id,
      leadName: `${l.firstName} ${l.lastName}`,
      firstName: l.firstName,
      lastName: l.lastName,
      phone: formatPhone(l.phone),
      email: l.email,
      address: l.propertyAddress || '',
    });
    setShowClientSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const salePriceNum = parseFloat(unformatCurrency(formData.salePrice)) || 0;
    const commissionPercentageNum = parseFloat(formData.commissionPercentage) || 0;
    const commissionAmount = (salePriceNum * commissionPercentageNum) / 100;

    const payload: Partial<Deal> = {
      leadId: formData.leadId,
      leadName: `${formData.firstName} ${formData.lastName}`.trim(),
      clientPhone: formData.phone,
      clientEmail: formData.email,
      status: formData.status,
      side: formData.side,
      address: formData.address,
      salePrice: salePriceNum,
      commissionPercentage: commissionPercentageNum,
      commissionAmount: commissionAmount,
      date: formData.date || new Date().toISOString(),
      source: formData.source,
      escrowCompany: formData.escrowCompany,
      escrowAddress: formData.escrowAddress,
      escrowOfficer: formData.escrowOfficer,
      escrowPhone: formData.escrowPhone,
      escrowEmail: formData.escrowEmail,
      escrowFileNumber: formData.escrowFileNumber,
      lenderCompany: formData.lenderCompany,
      lenderPhone: formData.lenderPhone,
      lenderCellPhone: formData.lenderCellPhone,
      lenderEmail: formData.lenderEmail,
      lenderLoanOfficer: formData.lenderLoanOfficer,
      titleCompany: formData.titleCompany,
      titleOfficer: formData.titleOfficer,
      titlePhone: formData.titlePhone,
      titleEmail: formData.titleEmail,
      tcName: formData.tcName,
      tcPhone: formData.tcPhone,
      tcEmail: formData.tcEmail,
      inspectionDueDate: formData.inspectionDueDate || undefined,
      appraisalDueDate: formData.appraisalDueDate || undefined,
      loanDueDate: formData.loanDueDate || undefined,
      dealNotes: formData.dealNotes
    };

    if (editingDealId) onUpdateDeal(editingDealId, payload);
    else onAddDeal({ id: `deal_${Date.now()}`, brokerageId: 'brk_7721', assignedUserId: 'agent_1', ...payload } as Deal);
    setIsModalOpen(false);
    resetForm();
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('dealId', id);
    setDraggedDealId(id);
  };

  const handleDragOver = (e: React.DragEvent, status: Deal['status']) => {
    e.preventDefault();
    if (hoveredColumn !== status) setHoveredColumn(status);
  };

  const handleDrop = (e: React.DragEvent, status: Deal['status']) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId) {
      let updates: Partial<Deal> = { status };
      if (status === 'PENDING') {
        const future = new Date();
        future.setDate(future.getDate() + 30);
        updates.date = future.toISOString().split('T')[0];
      } else if (status === 'CLOSED') {
        updates.date = new Date().toISOString();
      }
      onUpdateDeal(dealId, updates);
    }
    setHoveredColumn(null);
    setDraggedDealId(null);
  };

  const handleHeaderSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const matchesSearch = (deal: Deal) => {
    const term = searchTerm.toLowerCase().trim();
    if (startDate && deal.date && new Date(deal.date).toISOString().split('T')[0] < startDate) return false;
    if (endDate && deal.date && new Date(deal.date).toISOString().split('T')[0] > endDate) return false;
    if (!term) return true;
    const nameMatch = (deal.leadName || '').toLowerCase().includes(term);
    const addressMatch = (deal.address || '').toLowerCase().includes(term);
    return nameMatch || addressMatch;
  };

  const applyYearFilter = (list: Deal[]) => {
    if (yearFilter === 'CURRENT') return list.filter(d => d.date && new Date(d.date).getFullYear() === currentYear);
    if (typeof yearFilter === 'number') return list.filter(d => d.date && new Date(d.date).getFullYear() === yearFilter);
    return list;
  };

  const getFilteredStatusDeals = (status: Deal['status']) => {
    let list = deals.filter(d => d.status === status && matchesSearch(d));
    list = applyYearFilter(list);
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const groupDealsByMonth = (list: Deal[]) => {
    const groups: Record<string, Deal[]> = {};
    list.forEach(deal => {
      if (!deal.date) return;
      const d = new Date(deal.date);
      const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: TZ }).format(d);
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(deal);
    });
    return groups;
  };

  const filteredDealsBase = useMemo(() => {
    let list = deals.filter(matchesSearch);
    list = applyYearFilter(list);
    if (statusFilter !== 'ALL') list = list.filter(d => d.status === statusFilter);
    return list.sort((a: any, b: any) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (sortKey === 'date') {
        valA = a.date ? new Date(a.date).getTime() : 0;
        valB = b.date ? new Date(b.date).getTime() : 0;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [deals, statusFilter, yearFilter, sortKey, sortDirection, searchTerm, startDate, endDate]);

  const totalPages = Math.ceil(filteredDealsBase.length / itemsPerPage);
  const paginatedDeals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDealsBase.slice(start, start + itemsPerPage);
  }, [filteredDealsBase, currentPage, itemsPerPage]);

  const totalFilteredVolume = useMemo(() => filteredDealsBase.reduce((sum, d) => sum + d.salePrice, 0), [filteredDealsBase]);
  const totalFilteredGCI = useMemo(() => filteredDealsBase.reduce((sum, d) => sum + d.commissionAmount, 0), [filteredDealsBase]);

  const filteredLeadsForName = useMemo(() => {
    if (!formData.firstName.trim() && !formData.lastName.trim()) return [];
    const term = `${formData.firstName} ${formData.lastName}`.toLowerCase().trim();
    return leads.filter(l => `${l.firstName} ${l.lastName}`.toLowerCase().includes(term)).slice(0, 5);
  }, [leads, formData.firstName, formData.lastName]);

  const getStatusSummaryStyles = (status: Deal['status']) => {
    switch (status) {
      case 'ACTIVE': return 'bg-blue-600 shadow-blue-900/20 border-blue-500/50';
      case 'PENDING': return 'bg-amber-600 shadow-amber-900/20 border-amber-500/50';
      case 'CLOSED': return 'bg-emerald-600 shadow-emerald-900/20 border-emerald-500/50';
      default: return 'bg-slate-600';
    }
  };

  const getStatusIconStyles = (status: Deal['status']) => {
    switch (status) {
      case 'ACTIVE': return 'bg-blue-700/50';
      case 'PENDING': return 'bg-amber-700/50';
      case 'CLOSED': return 'bg-emerald-700/50';
      default: return 'bg-slate-700/50';
    }
  };

  const getSourceIcon = (source: string) => {
    const s = (source || '').toLowerCase();
    if (s.includes('zillow')) return { icon: 'fas fa-house-chimney', color: 'text-[#006AFF]' };
    if (s.includes('realtor')) return { icon: 'fas fa-house-circle-check', color: 'text-[#D92228]' };
    if (s.includes('facebook')) return { icon: 'fab fa-facebook', color: 'text-[#1877F2]' };
    if (s.includes('referral')) return { icon: 'fas fa-handshake', color: 'text-indigo-500' };
    if (s.includes('open house')) return { icon: 'fas fa-door-open', color: 'text-amber-500' };
    if (s.includes('instagram')) return { icon: 'fab fa-instagram', color: 'text-[#E1306C]' };
    if (s.includes('tiktok')) return { icon: 'fab fa-tiktok', color: 'text-[#000000]' };
    if (s.includes('linkedin')) return { icon: 'fab fa-linkedin', color: 'text-[#0A66C2]' };
    if (s.includes('google')) return { icon: 'fab fa-google', color: 'text-[#4285F4]' };
    if (s.includes('friend')) return { icon: 'fas fa-user-group', color: 'text-sky-500' };
    return { icon: 'fas fa-globe', color: 'text-slate-400' };
  };

  /** 
   * HIGH FIDELITY DEAL TILE 
   * Updated to precisely match the user-provided screenshot.
   */
  const renderDealTile = (deal: Deal, isSummary: boolean) => {
    const lead = leads.find(l => l.id === deal.leadId);
    const sourceInfo = getSourceIcon(deal.source || lead?.source || '');
    
    return (
      <div 
        key={deal.id} 
        draggable={isSummary}
        onDragStart={isSummary ? (e) => handleDragStart(e, deal.id) : undefined}
        onClick={() => handleOpenEdit(deal)}
        className={`bg-white border transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden shadow-sm ${
          isSummary ? 'rounded-2xl p-4 cursor-grab active:cursor-grabbing mb-4 border-indigo-100 shadow-indigo-100/30' : 'rounded-[2rem] p-6 border-indigo-200 shadow-indigo-200/20'
        } ${draggedDealId === deal.id ? 'opacity-30' : 'hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10'}`}
      >
        <div className={`flex items-start justify-between ${isSummary ? 'mb-2' : 'mb-3'}`}>
           <div className="flex items-center space-x-3 overflow-hidden">
              <div className={`shrink-0 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100/50 ${isSummary ? 'w-8 h-8 text-[12px]' : 'w-10 h-10 text-[14px]'}`}>
                <i className={`${sourceInfo.icon}`}></i>
              </div>
              <div className="overflow-hidden">
                <p className={`font-black text-slate-800 leading-none truncate ${isSummary ? 'text-sm' : 'text-base'}`}><Highlight text={deal.leadName} query={searchTerm} /></p>
                <div className="flex items-center space-x-2 mt-1.5 text-slate-400">
                   <i className={`fas fa-location-dot ${isSummary ? 'text-[9px]' : 'text-[10px]'}`}></i>
                   <p className={`font-semibold truncate ${isSummary ? 'text-[10px]' : 'text-[11px]'}`}><Highlight text={deal.address} query={searchTerm} /></p>
                </div>
              </div>
           </div>
           <div className="flex items-center space-x-1.5 shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={() => handleOpenEdit(deal)} className="w-8 h-8 bg-slate-800 text-white rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-all shadow-lg"><i className="fas fa-pencil text-[10px]"></i></button>
              <button onClick={() => setDealToDelete(deal)} className="w-8 h-8 bg-rose-500 text-white rounded-lg flex items-center justify-center hover:bg-rose-700 transition-all shadow-lg"><i className="fas fa-trash-alt text-[10px]"></i></button>
           </div>
        </div>

        <div className={`grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 ${isSummary ? 'mb-4' : 'mb-5'}`}>
           <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sale Price</p>
              <p className={`font-black text-slate-900 leading-none ${isSummary ? 'text-base' : 'text-lg'}`}>${deal.salePrice.toLocaleString()}</p>
           </div>
           <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Comm. ({deal.commissionPercentage}%)</p>
              <p className={`font-black text-emerald-600 leading-none ${isSummary ? 'text-base' : 'text-lg'}`}>${deal.commissionAmount.toLocaleString()}</p>
           </div>
        </div>

        <div className="flex items-center text-indigo-400 font-black uppercase tracking-widest leading-none">
           <i className={`far fa-calendar-check mr-2 ${isSummary ? 'text-[10px]' : 'text-[12px]'}`}></i>
           <span className={`${isSummary ? 'text-[8px]' : 'text-[9px]'}`}>
             Est. Closing: {deal.date ? new Date(deal.date).toLocaleDateString() : 'N/A'}
           </span>
        </div>
      </div>
    );
  };

  const inputClass = "w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm text-slate-800 placeholder:text-slate-200 placeholder:font-medium";

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el && modalScrollRef.current) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleColDragStart = (idx: number) => setDraggedColIdx(idx);
  const handleColDrop = (targetIdx: number) => {
    if (draggedColIdx === null) return;
    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(draggedColIdx, 1);
    newOrder.splice(targetIdx, 0, moved);
    setColumnOrder(newOrder);
    setDraggedColIdx(null);
  };

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-[12px] pb-40" ref={topRef}>
      
      {/* TOOLBAR */}
      <div className={`bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-6`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
             <h2 className="text-3xl font-black text-slate-800 tracking-tight">Transactions</h2>
             <p className="text-[12px] text-slate-500 font-medium">Full view of transaction flow and unit production.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={handleOpenCreate} className="bg-indigo-600 text-white px-8 py-4 rounded-[1.25rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-3 shrink-0 active:scale-95"><i className="fas fa-plus"></i><span>New Transaction</span></button>
          </div>
        </div>

        <div className="flex flex-col space-y-6 pt-4 border-t border-slate-100">
           <div className="flex flex-col xl:flex-row gap-6">
             <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-fit">
               <button onClick={() => { setYearFilter('CURRENT'); setStatusFilter('ALL'); }} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${yearFilter === 'CURRENT' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Current Year</button>
               <div className="relative">
                 <button onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-3 ${typeof yearFilter === 'number' ? `bg-white shadow-sm text-indigo-600` : 'text-slate-500 hover:text-slate-700'}`}>
                   <span>{typeof yearFilter === 'number' ? `Year ${yearFilter}` : 'History'}</span>
                   <i className={`fas fa-chevron-down text-[8px] transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`}></i>
                 </button>
                 {isYearDropdownOpen && (
                   <>
                     <div className="fixed inset-0 z-40" onClick={() => setIsYearDropdownOpen(false)}></div>
                     <div className={`absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-3 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden`}>
                       {previousYears.map(year => (
                         <button key={year} onClick={() => { setYearFilter(year); setIsYearDropdownOpen(false); setStatusFilter('ALL'); }} className={`w-full text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 ${yearFilter === year ? 'text-indigo-600' : 'text-slate-600'}`}>{year} Production</button>
                       ))}
                       <button onClick={() => { setYearFilter('ALL'); setIsYearDropdownOpen(false); setStatusFilter('ALL'); }} className={`w-full text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 border-t ${yearFilter === 'ALL' ? 'text-indigo-600' : 'text-slate-600'}`}>Full Archive</button>
                     </div>
                   </>
                 )}
               </div>
             </div>

             <div className="flex items-center space-x-4 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-inner">
                <div className="flex items-center space-x-3 px-3"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From:</span><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-[11px] font-black text-slate-700 outline-none" /></div>
                <div className="w-px h-6 bg-slate-300"></div>
                <div className="flex items-center space-x-3 px-3"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To:</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-[11px] font-black text-slate-700 outline-none" /></div>
                {(startDate || endDate) && <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-2 text-rose-500 hover:scale-110 transition-transform"><i className="fas fa-times-circle"></i></button>}
             </div>
           </div>

           <div className="relative group max-w-2xl">
              <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg transition-colors group-focus-within:text-indigo-500"></i>
              <input 
                type="text" 
                placeholder="Search by client name, property address, or phone..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-16 pr-10 py-5 bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] text-sm outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-inner font-bold"
              />
           </div>
        </div>
      </div>

      {statusFilter === 'ALL' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {(['ACTIVE', 'PENDING', 'CLOSED'] as Deal['status'][]).map(status => {
            const statusDeals = getFilteredStatusDeals(status).slice(0, 20); 
            const grouped = groupDealsByMonth(statusDeals);
            const sortedMonths = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            return (
              <div key={status} onDragOver={(e) => handleDragOver(e, status)} onDrop={(e) => handleDrop(e, status)} className={`flex flex-col bg-white rounded-[2rem] border-2 transition-all min-h-[400px] overflow-hidden ${hoveredColumn === status ? 'border-indigo-500 bg-indigo-50/10 scale-[1.01]' : 'border-slate-100 shadow-sm'}`}>
                <button 
                  onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                  className={`w-full p-6 flex items-center justify-between text-white shadow-xl transition-all hover:brightness-110 hover:scale-[1.01] active:scale-95 group/header ${getStatusSummaryStyles(status)}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shadow-lg ${getStatusIconStyles(status)}`}><i className={`fas ${status === 'ACTIVE' ? 'fa-bolt-lightning' : status === 'PENDING' ? 'fa-hourglass-half' : 'fa-check-double'}`}></i></div>
                    <div className="text-left">
                       <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{status === 'CLOSED' ? 'Sold' : status}</h3>
                       <div className="flex flex-col mt-3">
                          <p className="text-[11px] font-bold uppercase tracking-widest">{statusDeals.length} Items</p>
                          <p className="text-[11px] font-black uppercase tracking-[0.35em] opacity-100 flex items-center mt-3 filter drop-shadow-sm">
                            <span className="antialiased text-[10px]">Click for full page</span>
                            <i className="fas fa-arrow-up-right-from-square ml-3 shadow-sm text-[9px]"></i>
                          </p>
                       </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black">${statusDeals.reduce((s,d)=>s+d.salePrice,0).toLocaleString()}</p>
                  </div>
                </button>
                <div className="flex-1 px-5 py-6 space-y-6 overflow-y-auto scrollbar-hide max-h-[750px]">
                  {sortedMonths.length > 0 ? sortedMonths.map(month => (
                    <div key={month} className="space-y-3">
                      <div className="flex items-center space-x-3"><div className="h-px flex-1 bg-slate-100"></div><span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{month}</span><div className="h-px flex-1 bg-slate-100"></div></div>
                      <div className="space-y-1">{grouped[month].map(deal => renderDealTile(deal, true))}</div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-24 opacity-20 grayscale">
                      <i className="fas fa-box-open text-5xl mb-4"></i>
                      <p className="text-[10px] font-black uppercase tracking-widest">Pipeline Clear</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
             <div className="flex items-center space-x-6">
                <button 
                  onClick={() => setStatusFilter('ALL')}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">{getStatusLabel(statusFilter)} Pipeline</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Full operational dashboard</p>
                </div>
             </div>
             <div className="flex items-center space-x-6">
                <div className="hidden sm:flex items-center space-x-8 mr-4">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Volume</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">${totalFilteredVolume.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total GCI</p>
                    <p className="text-2xl font-black text-emerald-600 tracking-tighter">${totalFilteredGCI.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                  <button onClick={() => setDisplayMode('tile')} className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${displayMode === 'tile' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="Tile View"><i className="fas fa-th-large"></i></button>
                  <button onClick={() => setDisplayMode('list')} className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${displayMode === 'list' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="List View"><i className="fas fa-list-ul"></i></button>
                </div>

                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"
                >
                  <i className="fas fa-cog"></i>
                </button>
             </div>
          </div>

          {displayMode === 'list' ? (
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto transition-all">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {columnOrder.map((col, idx) => (
                      <th 
                        key={col} 
                        draggable 
                        onDragStart={() => handleColDragStart(idx)} 
                        onDragOver={e => e.preventDefault()} 
                        onDrop={() => handleColDrop(idx)}
                        onClick={() => col !== 'actions' && handleHeaderSort(col === 'client' ? 'leadName' : col === 'price' ? 'salePrice' : col as any)}
                        className={`px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all cursor-pointer hover:bg-slate-100 group ${col === 'actions' ? 'text-right' : ''}`}
                      >
                        <div className={`flex items-center ${col === 'actions' ? 'justify-end' : ''}`}>
                          {col !== 'actions' && <i className="fas fa-grip-vertical mr-3 opacity-20 group-hover:opacity-100 transition-opacity"></i>}
                          {col === 'client' ? 'Client' : col === 'closing' ? 'Closing' : col === 'price' ? 'Price' : col === 'side' ? 'Side' : col === 'source' ? 'Source' : 'Actions'}
                          {sortKey === (col === 'client' ? 'leadName' : col === 'price' ? 'salePrice' : col) && (
                            <i className={`fas fa-sort-amount-${sortDirection === 'asc' ? 'up' : 'down'} ml-2 text-indigo-500`}></i>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDeals.map(deal => (
                    <tr key={deal.id} className="hover:bg-indigo-50/20 transition-all cursor-pointer group" onClick={() => handleOpenEdit(deal)}>
                      {columnOrder.map(col => (
                        <td key={col} className={`px-10 py-8 ${col === 'actions' ? 'text-right' : ''}`}>
                          {col === 'client' && (
                            <div>
                              <p className="text-base font-black text-slate-800">{deal.leadName}</p>
                              <p className="text-[11px] text-slate-400 font-bold truncate max-w-xs">{deal.address}</p>
                            </div>
                          )}
                          {col === 'closing' && <span className="font-black text-slate-600 text-[11px] uppercase tracking-tighter">{deal.date ? new Date(deal.date).toLocaleDateString() : 'N/A'}</span>}
                          {col === 'price' && (
                            <div>
                              <p className="text-base font-black text-slate-900">${deal.salePrice.toLocaleString()}</p>
                              <p className="text-[10px] text-emerald-600 font-black uppercase">GCI: ${deal.commissionAmount.toLocaleString()}</p>
                            </div>
                          )}
                          {col === 'side' && <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{deal.side}</span>}
                          {col === 'source' && (
                            <div className="flex items-center space-x-3">
                              <i className={`${getSourceIcon(deal.source || '').icon} ${getSourceIcon(deal.source || '').color} text-sm`}></i>
                              <span className="text-[10px] font-black text-slate-600 uppercase">{deal.source}</span>
                            </div>
                          )}
                          {col === 'actions' && (
                            <div className="flex items-center justify-end space-x-2" onClick={e => e.stopPropagation()}>
                              <button onClick={()=> handleOpenEdit(deal)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><i className="fas fa-pencil-alt text-[10px]"></i></button>
                              <button onClick={()=>setDealToDelete(deal)} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-alt text-[10px]"></i></button>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
               {paginatedDeals.map(deal => renderDealTile(deal, false))}
               {paginatedDeals.length === 0 && (
                 <div className="col-span-full py-48 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 text-center flex flex-col items-center justify-center opacity-40">
                   <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-4xl text-slate-200 shadow-inner mb-6">
                      <i className="fas fa-file-invoice-dollar"></i>
                   </div>
                   <p className="text-xl font-black uppercase tracking-[0.4em] text-slate-400">No transactions found</p>
                 </div>
               )}
            </div>
          )}

          {/* PAGINATION FOOTER */}
          <div className="flex flex-col md:flex-row items-center justify-between border rounded-[2rem] p-8 shadow-sm gap-8 mt-6 bg-white">
            <div className="flex items-center space-x-4 border rounded-xl px-6 py-3 bg-slate-50 border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
                className="bg-transparent border-none text-sm font-black outline-none cursor-pointer text-slate-700"
              >
                {[10, 20, 30, 40, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">per page</span>
            </div>
            
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center space-x-6">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); scrollToTop(); }} 
                  className="w-12 h-12 flex items-center justify-center rounded-xl border disabled:opacity-30 shadow-sm transition-all bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <div className="text-sm font-black uppercase tracking-[0.2em] px-4 text-slate-700">Page {currentPage} of {totalPages || 1}</div>
                <button 
                  disabled={currentPage >= totalPages} 
                  onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); scrollToTop(); }} 
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Showing {paginatedDeals.length} of {filteredDealsBase.length} items</p>
            </div>
            
            <button 
              onClick={scrollToTop} 
              className="flex items-center space-x-3 px-8 py-4 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
            >
              <i className="fas fa-arrow-up"></i>
              <span>Back to Top</span>
            </button>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE CLOSING PROTOCOL FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-slate-900/60 backdrop-blur-md">
          <div className="absolute inset-0 z-0" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-slate-50 rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-6xl p-0 relative z-10 animate-in zoom-in-95 duration-200 flex flex-col h-[90vh] text-[12px] overflow-hidden">
            
            {/* HEADER */}
            <div className="px-10 py-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center space-x-5">
                 <div className="w-12 h-12 bg-indigo-600 text-white rounded-[1.25rem] flex items-center justify-center text-xl shadow-xl shadow-indigo-100">
                    <i className="fas fa-file-contract"></i>
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{editingDealId ? 'Transaction Detail' : 'New Transaction'}</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Fulfillment Intelligence Log</p>
                 </div>
              </div>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-95"><i className="fas fa-times text-lg"></i></button>
            </div>

            {/* QUICK NAVIGATION HEADINGS */}
            <div className="bg-white border-b border-slate-100 px-10 py-3 flex items-center space-x-6 shrink-0 overflow-x-auto scrollbar-hide">
               <button onClick={() => scrollToSection('sec-client')} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-indigo-100 transition-all whitespace-nowrap">Client Info</button>
               <button onClick={() => scrollToSection('sec-escrow')} className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-amber-100 transition-all whitespace-nowrap">Escrow Info</button>
               <button onClick={() => scrollToSection('sec-lender')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-emerald-100 transition-all whitespace-nowrap">Lender Info</button>
               <button onClick={() => scrollToSection('sec-title')} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-blue-100 transition-all whitespace-nowrap">Title Info</button>
               <button onClick={() => scrollToSection('sec-tc')} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-purple-100 transition-all whitespace-nowrap">TC Info</button>
               <button onClick={() => scrollToSection('sec-timeline')} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 transition-all whitespace-nowrap">Timeline</button>
               <button onClick={() => scrollToSection('sec-notes')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-indigo-700 transition-all whitespace-nowrap">Notes</button>
            </div>

            {/* SCROLLABLE BODY */}
            <div ref={modalScrollRef} className="flex-1 overflow-y-auto p-10 scroll-smooth space-y-12 scrollbar-hide">
              <form onSubmit={handleSubmit} id="transaction-form" className="space-y-10">
                
                {/* 1. CLIENT INFORMATION */}
                <div id="sec-client" className="bg-white border-2 border-indigo-100 rounded-[2.5rem] p-10 shadow-sm space-y-10">
                   <div className="flex items-center space-x-4 border-b border-indigo-50 pb-6">
                      <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center"><i className="fas fa-user-tie"></i></div>
                      <h4 className="text-lg font-black text-indigo-600 uppercase tracking-widest">1. Client Information</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <div className="space-y-2.5 relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                        <input required type="text" value={formData.firstName} onChange={(e) => { setFormData({...formData, firstName: e.target.value}); setShowClientSuggestions(true); }} onFocus={() => setShowClientSuggestions(true)} className={inputClass} placeholder="e.g. John" />
                        {showClientSuggestions && filteredLeadsForName.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-3 bg-white border border-slate-200 rounded-[2rem] shadow-3xl overflow-hidden max-h-60 overflow-y-auto animate-in slide-in-from-top-3">
                            {filteredLeadsForName.map(l => (
                              <button key={l.id} type="button" onClick={() => handleSelectLead(l)} className="w-full text-left px-8 py-5 hover:bg-indigo-50 flex items-center space-x-5 transition-colors border-b border-slate-100 last:border-0"><div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">{l.firstName[0]}{l.lastName[0]}</div><div><p className="text-base font-black text-slate-800">{l.firstName} {l.lastName}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{l.email}</p></div></button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label><input required type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className={inputClass} placeholder="e.g. Miller" /></div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label><input required type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: formatPhone(e.target.value)})} className={inputClass} placeholder="(555) 123-4567" /></div>
                      <div className="space-y-2.5 md:col-span-1 lg:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label><input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className={`${inputClass} border-indigo-100`} placeholder="client@address.com" /></div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <div className="md:col-span-2 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Property Address</label><input required type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className={inputClass} placeholder="Street Address, City, State, Zip" /></div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contract Sale Price</label><input required type="text" value={formData.salePrice} onChange={handleSalePriceChange} className={`${inputClass} !text-indigo-600 text-lg`} placeholder="$0.00" /></div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Commission %</label><input required type="number" step="0.01" value={formData.commissionPercentage} onChange={e => setFormData({...formData, commissionPercentage: e.target.value})} className={`${inputClass} !text-emerald-600 text-lg`} placeholder="e.g. 2.5" /></div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Side</label><select className={inputClass} value={formData.side} onChange={e => setFormData({...formData, side: e.target.value as any})}><option value="BUYER">Buyer Side</option><option value="SELLER">Seller Side</option><option value="BOTH">Dual Representation</option></select></div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lead Source</label><select className={inputClass} value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}><option value="Manual Entry">Manual Entry</option>{availableSources.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Status</label><select className={inputClass} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}><option value="ACTIVE">Active</option><option value="PENDING">Pending</option><option value="CLOSED">Sold/Closed</option></select></div>
                   </div>
                </div>

                {/* 2. ESCROW INFORMATION */}
                <div id="sec-escrow" className="bg-white border-2 border-amber-100 rounded-[2.5rem] p-10 shadow-sm space-y-10">
                   <div className="flex items-center space-x-4 border-b border-amber-50 pb-6">
                      <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center"><i className="fas fa-file-invoice"></i></div>
                      <h4 className="text-lg font-black text-amber-600 uppercase tracking-widest">2. Escrow Information</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label><input type="text" value={formData.escrowCompany} onChange={e => setFormData({...formData, escrowCompany: e.target.value})} className={inputClass} placeholder="e.g. Title Trust Escrow" /></div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow Phone</label><input type="tel" value={formData.escrowPhone} onChange={e => setFormData({...formData, escrowPhone: formatPhone(e.target.value)})} className={inputClass} placeholder="(555) 000-0000" /></div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow File #</label><input type="text" value={formData.escrowFileNumber} onChange={e => setFormData({...formData, escrowFileNumber: e.target.value})} className={inputClass} placeholder="EF-00000" /></div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-4 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow Officer</label><input type="text" value={formData.escrowOfficer} onChange={e => setFormData({...formData, escrowOfficer: e.target.value})} className={inputClass} placeholder="Full name..." /></div>
                      <div className="lg:col-span-4 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label><input type="email" value={formData.escrowEmail} onChange={e => setFormData({...formData, escrowEmail: e.target.value})} className={inputClass} placeholder="officer@escrow.com" /></div>
                      <div className="lg:col-span-4 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow Address</label><input type="text" value={formData.escrowAddress} onChange={e => setFormData({...formData, escrowAddress: e.target.value})} className={`${inputClass} border-amber-100`} placeholder="Company location..." /></div>
                   </div>
                </div>

                {/* 3. LENDER INFORMATION */}
                <div id="sec-lender" className="bg-white border-2 border-emerald-100 rounded-[2.5rem] p-10 shadow-sm space-y-10">
                   <div className="flex items-center space-x-4 border-b border-emerald-50 pb-6">
                      <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center"><i className="fas fa-hand-holding-dollar"></i></div>
                      <h4 className="text-lg font-black text-emerald-600 uppercase tracking-widest">3. Lender Information</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-7 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label><input type="text" value={formData.lenderCompany} onChange={e => setFormData({...formData, lenderCompany: e.target.value})} className={`${inputClass} border-emerald-100`} placeholder="e.g. Paramount Mortgage Group" /></div>
                      <div className="lg:col-span-5 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loan Officer Name</label><input type="text" value={formData.lenderLoanOfficer} onChange={e => setFormData({...formData, lenderLoanOfficer: e.target.value})} className={inputClass} placeholder="e.g. Oscar Martinez" /></div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-3 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Office Phone</label><input type="tel" value={formData.lenderPhone} onChange={e => setFormData({...formData, lenderPhone: formatPhone(e.target.value)})} className={inputClass} placeholder="(555) 000-0000" /></div>
                      <div className="lg:col-span-3 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cell Phone</label><input type="tel" value={formData.lenderCellPhone} onChange={e => setFormData({...formData, lenderCellPhone: formatPhone(e.target.value)})} className={inputClass} placeholder="(555) 111-2222" /></div>
                      <div className="lg:col-span-6 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label><input type="email" value={formData.lenderEmail} onChange={e => setFormData({...formData, lenderEmail: e.target.value})} className={`${inputClass} border-emerald-100`} placeholder="loanofficer@lender.com" /></div>
                   </div>
                </div>

                {/* 4. TITLE INFORMATION */}
                <div id="sec-title" className="bg-white border-2 border-blue-100 rounded-[2.5rem] p-10 shadow-sm space-y-10">
                   <div className="flex items-center space-x-4 border-b border-blue-50 pb-6">
                      <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center"><i className="fas fa-shield-halved"></i></div>
                      <h4 className="text-lg font-black text-blue-600 uppercase tracking-widest">4. Title Information</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-6 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label><input type="text" value={formData.titleCompany} onChange={e => setFormData({...formData, titleCompany: e.target.value})} className={`${inputClass} border-blue-100`} placeholder="e.g. First American Title" /></div>
                      <div className="lg:col-span-6 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title Officer Name</label><input type="text" value={formData.titleOfficer} onChange={e => setFormData({...formData, titleOfficer: e.target.value})} className={`${inputClass} border-blue-100`} placeholder="Full name..." /></div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-4 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label><input type="tel" value={formData.titlePhone} onChange={e => setFormData({...formData, titlePhone: formatPhone(e.target.value)})} className={inputClass} placeholder="(555) 000-0000" /></div>
                      <div className="lg:col-span-8 space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label><input type="email" value={formData.lenderEmail} onChange={e => setFormData({...formData, lenderEmail: e.target.value})} className={inputClass} placeholder="officer@titlecompany.com" /></div>
                   </div>
                </div>

                {/* 5. TRANSACTION COORDINATOR INFORMATION */}
                <div id="sec-tc" className="bg-white border-2 border-purple-100 rounded-[2.5rem] p-10 shadow-sm space-y-10">
                   <div className="flex items-center space-x-4 border-b border-purple-50 pb-6">
                      <div className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center text-sm shadow-lg"><i className="fas fa-user-gear"></i></div>
                      <h4 className="text-lg font-black text-purple-600 uppercase tracking-widest">5. TC Information</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TC Name</label><input type="text" value={formData.tcName} onChange={e => setFormData({...formData, tcName: e.target.value})} className={inputClass} placeholder="e.g. Kelly Kapoor" /></div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label><input type="tel" value={formData.tcPhone} onChange={e => setFormData({...formData, tcPhone: formatPhone(e.target.value)})} className={inputClass} placeholder="(555) 000-0000" /></div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label><input type="email" value={formData.tcEmail} onChange={e => setFormData({...formData, tcEmail: e.target.value})} className={inputClass} placeholder="tc@brokerage.com" /></div>
                   </div>
                </div>

                {/* 6. TIMELINE INFORMATION */}
                <div id="sec-timeline" className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-10">
                   <div className="flex items-center space-x-4 border-b border-slate-100 pb-6">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-base shadow-lg"><i className="fas fa-calendar-check"></i></div>
                      <h4 className="text-lg font-black text-slate-800 uppercase tracking-widest">6. Timeline Information</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inspection Due</label><input type="date" value={formData.inspectionDueDate} onChange={e => setFormData({...formData, inspectionDueDate: e.target.value})} className={inputClass} /></div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Appraisal Due</label><input type="date" value={formData.appraisalDueDate} onChange={e => setFormData({...formData, appraisalDueDate: e.target.value})} className={inputClass} /></div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loan Due</label><input type="date" value={formData.loanDueDate} onChange={e => setFormData({...formData, loanDueDate: e.target.value})} className={inputClass} /></div>
                      <div className="space-y-2.5"><label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Est. Closing</label><input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={`${inputClass} border-indigo-200 bg-indigo-50/30`} /></div>
                   </div>
                </div>

                {/* 7. NOTES INFORMATION */}
                <div id="sec-notes" className="bg-white border-2 border-indigo-200 rounded-[2.5rem] p-10 shadow-sm space-y-8 pb-12">
                   <div className="flex items-center space-x-4 border-b border-indigo-100 pb-6">
                      <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-base shadow-lg"><i className="fas fa-pen-nib"></i></div>
                      <h4 className="text-lg font-black text-indigo-800 uppercase tracking-widest">7. Notes Information</h4>
                   </div>
                   <div className="space-y-6">
                      <div className="flex gap-4">
                        <textarea className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-6 font-bold text-xl outline-none min-h-[140px] shadow-inner focus:bg-white transition-all placeholder:text-slate-200 placeholder:font-medium" placeholder="Enter transaction milestones, log calls, or important reminders here..." value={pendingNote} onChange={e => setPendingNote(e.target.value)} />
                        <button type="button" onClick={handleAddNote} className="px-10 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest h-[140px] shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Log Note</button>
                      </div>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                        {formData.dealNotes.map(note => (
                          <div key={note.id} className="bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-sm animate-in fade-in">
                            <span className="text-[10px] font-black text-slate-400 uppercase bg-white px-3 py-1 rounded border border-slate-100">{new Date(note.createdAt).toLocaleString()}</span>
                            <p className="text-lg font-bold text-slate-700 mt-3">{note.content}</p>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </form>
            </div>

            <div className="px-10 py-8 border-t border-slate-200 bg-white shrink-0 flex items-center justify-between">
              <div className="flex items-center space-x-12">
                 <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Projected GCI</p><p className="text-2xl font-black text-emerald-600">${( (parseFloat(unformatCurrency(formData.salePrice)) || 0) * (parseFloat(formData.commissionPercentage) || 0) / 100 ).toLocaleString()}</p></div>
              </div>
              <div className="flex space-x-4">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-12 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 active:scale-95 transition-all">Discard Draft</button>
                <button type="submit" form="transaction-form" className="px-16 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Save Transaction</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-xl relative z-10 p-10 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8 border-b pb-4">
                <h3 className="text-2xl font-black text-slate-800">Table Settings</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-rose-500"><i className="fas fa-times text-xl"></i></button>
             </div>
             <p className="text-sm text-slate-500 font-medium mb-6">Drag and drop to reorder columns or toggle visibility.</p>
             <div className="space-y-3">
               {columnOrder.map((col, idx) => (
                 <div 
                   key={col} 
                   draggable 
                   onDragStart={() => handleColDragStart(idx)} 
                   onDragOver={e => e.preventDefault()} 
                   onDrop={() => handleColDrop(idx)}
                   className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center space-x-4 cursor-move hover:border-indigo-400 transition-all"
                 >
                    <i className="fas fa-grip-vertical text-slate-300"></i>
                    <span className="text-sm font-black uppercase text-slate-700">{col}</span>
                 </div>
               ))}
             </div>
             <button onClick={() => setIsSettingsOpen(false)} className="w-full mt-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl">Apply Layout</button>
          </div>
        </div>
      )}

      {dealToDelete && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-md p-10 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner border border-rose-100"><i className="fas fa-trash-can"></i></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Trash Transaction?</h3>
            <p className="text-slate-500 mb-10 font-medium leading-relaxed">This will archive the transaction for <span className="text-slate-900 font-bold">{dealToDelete.leadName}</span>.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setDealToDelete(null)} className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</button>
              <button onClick={executeDeleteDeal} className="py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-100">Confirm</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PipelineView;