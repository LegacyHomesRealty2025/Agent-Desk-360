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
type DisplayMode = 'tile' | 'list';
type StatusFilter = Deal['status'] | 'ALL';
type SortKey = 'name' | 'status' | 'date' | 'price' | 'side' | 'source';
type SortDirection = 'asc' | 'desc';

const TZ = 'America/Los_Angeles';

const Highlight = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim()) return <>{text}</>;
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
  const [displayMode, setDisplayMode] = useState<'tile' | 'list'>('tile');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  
  const [pendingNote, setPendingNote] = useState('');

  const topRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  const previousYears = useMemo<number[]>(() => {
    const years = deals.map(d => new Date(d.date).getFullYear());
    return Array.from(new Set(years))
      .filter((y: number) => y < currentYear)
      .sort((a: number, b: number) => b - a);
  }, [deals, currentYear]);

  const initialFormState = {
    leadId: '',
    leadName: '',
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

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingDealId(null);
    setShowClientSuggestions(false);
    setPendingNote('');
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, yearFilter, startDate, endDate, itemsPerPage]);

  useEffect(() => {
    if (searchTerm.trim()) {
      scrollToTop();
    }
  }, [searchTerm]);

  const unformatCurrency = (val: string) => val.replace(/[^0-9.]/g, '');

  const formatCurrency = (val: string) => {
    const numeric = unformatCurrency(val);
    if (!numeric) return '';
    const n = parseFloat(numeric);
    if (isNaN(n)) return '';
    return '$' + n.toLocaleString();
  };

  const getSourceIcon = (source: string) => {
    const s = (source || '').toLowerCase();
    if (s.includes('zillow')) return { icon: 'fas fa-house-chimney', color: 'text-[#006AFF]' };
    if (s.includes('realtor')) return { icon: 'fas fa-house-circle-check', color: 'text-[#D92228]' };
    if (s.includes('facebook')) return { icon: 'fab fa-facebook', color: 'text-[#1877F2]' };
    if (s.includes('linkedin')) return { icon: 'fab fa-linkedin', color: 'text-[#0A66C2]' };
    if (s.includes('google')) return { icon: 'fab fa-google', color: 'text-[#4285F4]' };
    if (s.includes('instagram')) return { icon: 'fab fa-instagram', color: 'text-[#E4405F]' };
    if (s.includes('tiktok')) return { icon: 'fab fa-tiktok', color: 'text-slate-900' };
    if (s.includes('referral')) return { icon: 'fas fa-handshake', color: 'text-indigo-500' };
    if (s.includes('open house')) return { icon: 'fas fa-door-open', color: 'text-amber-500' };
    return { icon: 'fas fa-keyboard', color: 'text-slate-400' };
  };

  const salePriceNum = parseFloat(unformatCurrency(formData.salePrice)) || 0;
  const commissionPercentageNum = parseFloat(formData.commissionPercentage) || 0;
  const commissionAmount = (salePriceNum * commissionPercentageNum) / 100;

  const handleOpenCreate = () => {
    setEditingDealId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (deal: Deal) => {
    setEditingDealId(deal.id);
    setFormData({
      leadId: deal.leadId || '',
      leadName: deal.leadName || '',
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
    setFormData(prev => ({
      ...prev,
      dealNotes: [newNote, ...prev.dealNotes]
    }));
    setPendingNote('');
  };

  const handleAddressChange = (val: string) => {
    setFormData({ ...formData, address: val });
  };

  const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const formatted = formatCurrency(val);
    setFormData({ ...formData, salePrice: formatted });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: Partial<Deal> = {
      leadId: formData.leadId,
      leadName: formData.leadName,
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

    if (editingDealId) {
      onUpdateDeal(editingDealId, payload);
    } else {
      const newDeal: Deal = {
        id: `deal_${Date.now()}`,
        brokerageId: 'brk_7721',
        assignedUserId: 'agent_1',
        ...payload
      } as Deal;
      onAddDeal(newDeal);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    if (displayMode === 'list') return;
    setDraggedDealId(dealId);
    e.dataTransfer.setData('dealId', dealId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('opacity-40');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedDealId(null);
    setHoveredColumn(null);
    (e.target as HTMLElement).classList.remove('opacity-40');
  };

  const handleDragOver = (e: React.DragEvent, status: Deal['status']) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoveredColumn !== status) {
      setHoveredColumn(status);
    }
  };

  const handleDrop = (e: React.DragEvent, status: Deal['status']) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId) {
      onUpdateDeal(dealId, { status });
    }
    setHoveredColumn(null);
    setDraggedDealId(null);
  };

  const matchesSearch = (deal: Deal) => {
    const term = searchTerm.toLowerCase().trim();
    if (startDate) {
      const dDate = new Date(deal.date).toISOString().split('T')[0];
      if (dDate < startDate) return false;
    }
    if (endDate) {
      const dDate = new Date(deal.date).toISOString().split('T')[0];
      if (dDate > endDate) return false;
    }
    if (!term) return true;
    const nameMatch = (deal.leadName || '').toLowerCase().includes(term);
    const addressMatch = (deal.address || '').toLowerCase().includes(term);
    if (nameMatch || addressMatch) return true;
    const associatedLead = leads.find(l => l.id === deal.leadId);
    if (associatedLead) {
      const emailMatch = (associatedLead.email || '').toLowerCase().includes(term);
      const phoneMatch = (associatedLead.phone || '').replace(/[^\d]/g, '').includes(term.replace(/[^\d]/g, ''));
      const rawPhoneMatch = (associatedLead.phone || '').toLowerCase().includes(term);
      return emailMatch || phoneMatch || rawPhoneMatch;
    }
    return false;
  };

  const applyYearFilter = (dealList: Deal[]) => {
    if (yearFilter === 'CURRENT') {
      return dealList.filter(d => new Date(d.date).getFullYear() === currentYear);
    } else if (typeof yearFilter === 'number') {
      return dealList.filter(d => new Date(d.date).getFullYear() === yearFilter);
    }
    return dealList;
  };

  const getFilteredStatusDeals = (status: Deal['status']) => {
    let statusDeals = deals.filter(d => d.status === status && matchesSearch(d));
    statusDeals = applyYearFilter(statusDeals);
    return statusDeals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const groupDealsByMonth = (dealsList: Deal[]) => {
    const groups: Record<string, Deal[]> = {};
    dealsList.forEach(deal => {
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
    if (statusFilter !== 'ALL') {
      list = list.filter(d => d.status === statusFilter);
    }
    return list.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'name': comparison = a.leadName.localeCompare(b.leadName); break;
        case 'status': {
          const statusOrder = { ACTIVE: 1, PENDING: 2, CLOSED: 3 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        }
        case 'date': comparison = new Date(a.date).getTime() - new Date(b.date).getTime(); break;
        case 'price': comparison = a.salePrice - b.salePrice; break;
        case 'side': comparison = a.side.localeCompare(b.side); break;
        case 'source': {
          const sourceA = a.source || '';
          const sourceB = b.source || '';
          comparison = sourceA.localeCompare(sourceB);
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [deals, leads, statusFilter, yearFilter, sortKey, sortDirection, searchTerm, startDate, endDate]);

  const totalFilteredVolume = useMemo(() => filteredDealsBase.reduce((sum, d) => sum + d.salePrice, 0), [filteredDealsBase]);
  const totalFilteredGCI = useMemo(() => filteredDealsBase.reduce((sum, d) => sum + d.commissionAmount, 0), [filteredDealsBase]);
  const totalDealsMatching = filteredDealsBase.length;
  const totalPages = Math.ceil(totalDealsMatching / itemsPerPage);
  const paginatedDeals = filteredDealsBase.slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage);

  const filteredLeadsForName = useMemo(() => {
    if (!formData.leadName.trim()) return [];
    const term = formData.leadName.toLowerCase();
    return leads.filter(l => 
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(term) || 
      l.email.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [leads, formData.leadName]);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getStatusSummaryStyles = (status: Deal['status']) => {
    switch (status) {
      case 'ACTIVE': return 'bg-blue-600 shadow-blue-900/20 border-blue-500/50';
      case 'PENDING': return 'bg-amber-600 shadow-amber-900/20 border-amber-500/50';
      case 'CLOSED': return 'bg-emerald-600 shadow-emerald-900/20 border-emerald-500/50';
      default: return 'bg-slate-600 shadow-slate-900/20 border-slate-500/50';
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

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <i className="fas fa-sort ml-2 text-slate-300 opacity-50 group-hover:opacity-100 transition-opacity"></i>;
    return sortDirection === 'asc' 
      ? <i className="fas fa-sort-up ml-2 text-indigo-500"></i>
      : <i className="fas fa-sort-down ml-2 text-indigo-500"></i>;
  };

  const getStatusLabel = (s: StatusFilter) => {
    if (s === 'ALL') return 'All Deals';
    if (s === 'CLOSED') return 'Sold';
    return s.charAt(0) + s.slice(1).toLowerCase();
  };

  const executeDeleteDeal = () => {
    if (dealToDelete) {
      onDeleteDeal(dealToDelete.id);
      setDealToDelete(null);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element && modalScrollRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const closingSoonDeals = useMemo(() => {
    const laNow = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
    laNow.setHours(0, 0, 0, 0);
    const fiveDaysLater = new Date(laNow);
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
    return deals.filter(d => {
      if (d.status !== 'PENDING' || !d.date) return false;
      const dDate = new Date(new Date(d.date).toLocaleString('en-US', { timeZone: TZ }));
      dDate.setHours(0, 0, 0, 0);
      return dDate >= laNow && dDate <= fiveDaysLater;
    });
  }, [deals]);

  const clearDateRange = () => {
    setStartDate('');
    setEndDate('');
  };

  const renderDealCard = (deal: Deal) => {
    const lead = leads.find(l => l.id === deal.leadId);
    const source = deal.source || lead?.source;
    const sourceInfo = source ? getSourceIcon(source) : null;
    return (
      <div 
        key={deal.id} 
        draggable={displayMode === 'tile'}
        onDragStart={(e) => handleDragStart(e, deal.id)}
        onDragEnd={handleDragEnd}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group cursor-grab active:cursor-grabbing relative"
      >
        <div className="absolute top-4 right-4 flex space-x-1 z-10">
          <button 
            onClick={() => handleOpenEdit(deal)}
            className="w-7 h-7 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg flex items-center justify-center hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
          >
            <i className="fas fa-pencil-alt text-[10px]"></i>
          </button>
          <button 
            onClick={() => setDealToDelete(deal)}
            className="w-7 h-7 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg flex items-center justify-center hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm"
          >
            <i className="fas fa-trash-alt text-[10px]"></i>
          </button>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 pr-16 overflow-hidden">
             {sourceInfo && (
               <div className={`w-6 h-6 rounded-lg flex items-center justify-center bg-slate-50 border border-slate-100 shrink-0 ${sourceInfo.color}`}>
                 <i className={`${sourceInfo.icon} text-[10px]`}></i>
               </div>
             )}
             <p className="text-[12px] font-bold text-slate-800 truncate">
               <Highlight text={deal.leadName} query={searchTerm} />
             </p>
          </div>
          <i className="fas fa-grip-vertical text-slate-200 group-hover:text-slate-400 transition-colors"></i>
        </div>
        <p className="text-[12px] text-slate-500 mb-3 flex items-center">
          <i className="fas fa-location-dot mr-1 text-slate-300"></i>
          <span className="truncate">
             <Highlight text={deal.address} query={searchTerm} />
          </span>
        </p>
        <div className="grid grid-cols-2 gap-2 border-t border-slate-50 pt-3 mt-3">
          <div>
            <p className="text-[10px] font-normal text-slate-400 uppercase">Sale Price</p>
            <p className="text-[12px] font-normal text-slate-800">${deal.salePrice.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-normal text-slate-400 uppercase">Comm. ({deal.commissionPercentage}%)</p>
            <p className="text-[12px] font-normal text-emerald-600">${deal.commissionAmount.toLocaleString()}</p>
          </div>
        </div>
        {deal.date && (
          <div className="mt-2 pt-2 border-t border-slate-50 flex items-center text-[10px] text-slate-400 font-normal uppercase tracking-tighter">
            <i className="far fa-calendar-check mr-1.5"></i>
            {deal.status === 'CLOSED' ? 'Sold' : 'Est. Closing'}: {new Date(deal.date).toLocaleDateString('en-US', { timeZone: TZ })}
          </div>
        )}
      </div>
    );
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all";

  const formNavItems = [
    { id: 'section-details', label: 'Client Info', color: 'bg-indigo-600 shadow-indigo-100 text-white', hover: 'hover:bg-indigo-700' },
    { id: 'section-escrow', label: 'Escrow', color: 'bg-amber-500 shadow-amber-100 text-white', hover: 'hover:bg-amber-600' },
    { id: 'section-lender', label: 'Lender', color: 'bg-emerald-600 shadow-emerald-100 text-white', hover: 'hover:bg-emerald-700' },
    { id: 'section-tc', label: 'TC', color: 'bg-purple-600 shadow-purple-100 text-white', hover: 'hover:bg-purple-700' },
    { id: 'section-timeline', label: 'Notes', color: 'bg-blue-600 shadow-blue-100 text-white', hover: 'hover:bg-blue-700' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-[12px] pb-40" ref={topRef}>
      {/* Alerts */}
      {closingSoonDeals.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-[2rem] p-6 shadow-sm animate-in slide-in-from-top-4 duration-500">
           <div className="flex items-center space-x-4 mb-4">
              <div className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-200 animate-pulse">
                 <i className="fas fa-triangle-exclamation"></i>
              </div>
              <div>
                <h3 className="text-rose-900 font-black uppercase tracking-widest text-[11px]">Critical Alerts</h3>
                <p className="text-rose-600 text-[12px] font-medium">{closingSoonDeals.length} transaction(s) closing in less than 5 days.</p>
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closingSoonDeals.map(d => (
                <div key={d.id} className="bg-white/80 p-4 rounded-2xl border border-rose-100 flex items-center justify-between">
                   <div className="overflow-hidden">
                      <p className="text-[12px] font-black text-slate-800 truncate">{d.leadName}</p>
                      <p className="text-[10px] text-rose-500 font-bold uppercase">Closing {new Date(d.date).toLocaleDateString('en-US', { timeZone: TZ })}</p>
                   </div>
                   <button onClick={() => handleOpenEdit(d)} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all">Extend</button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col space-y-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Pipeline</h2>
            <p className="text-[12px] text-slate-500 font-normal">Manage and track your entire transaction portfolio.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner w-fit">
               <button onClick={() => setYearFilter('CURRENT')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${yearFilter === 'CURRENT' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Current Year</button>
               <div className="relative">
                 <button onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${typeof yearFilter === 'number' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                   <span>{typeof yearFilter === 'number' ? `Year ${yearFilter}` : 'Previous Years'}</span>
                   <i className={`fas fa-chevron-down text-[8px] transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`}></i>
                 </button>
                 {isYearDropdownOpen && (
                   <>
                     <div className="fixed inset-0 z-40" onClick={() => setIsYearDropdownOpen(false)}></div>
                     <div className="absolute left-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                       {previousYears.length > 0 ? previousYears.map(year => (
                         <button key={year} onClick={() => { setYearFilter(year); setIsYearDropdownOpen(false); }} className={`w-full text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${yearFilter === year ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}`}>{year}</button>
                       )) : <div className="px-5 py-2.5 text-[10px] text-slate-400 font-bold uppercase italic">No history</div>}
                     </div>
                   </>
                 )}
               </div>
               <button onClick={() => setYearFilter('ALL')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${yearFilter === 'ALL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>All Time</button>
             </div>
             <div className="flex items-center space-x-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                <div className="flex items-center space-x-3 px-3">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">From:</span>
                   <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none text-[11px] font-black text-slate-700 outline-none cursor-pointer" />
                </div>
                <div className="w-px h-4 bg-slate-300"></div>
                <div className="flex items-center space-x-3 px-3">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">To:</span>
                   <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none text-[11px] font-black text-slate-700 outline-none cursor-pointer" />
                </div>
                {(startDate || endDate) && <button onClick={clearDateRange} className="p-2 text-rose-500 hover:text-rose-700 transition-colors"><i className="fas fa-times-circle"></i></button>}
             </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative group min-w-[300px]">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-base"></i>
            <input type="text" placeholder="Search by name, address, phone number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm font-bold" />
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
            <button onClick={() => setDisplayMode('tile')} className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${displayMode === 'tile' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="Board View"><i className="fas fa-columns text-sm"></i></button>
            <button onClick={() => setDisplayMode('list')} className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${displayMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`} title="List View"><i className="fas fa-list-ul text-sm"></i></button>
          </div>
          <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[12px] font-normal uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center space-x-3 active:scale-[0.98]"><i className="fas fa-plus text-[12px]"></i><span>Add Transaction</span></button>
        </div>
      </div>

      {/* Board View Render */}
      {displayMode === 'tile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[600px]">
          {(['ACTIVE', 'PENDING', 'CLOSED'] as Deal['status'][]).map(status => {
            const statusDeals = getFilteredStatusDeals(status);
            const groupedDeals = groupDealsByMonth(statusDeals);
            const sortedMonths = Object.keys(groupedDeals).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            const totalStatusVolume = statusDeals.reduce((sum, d) => sum + d.salePrice, 0);
            return (
              <div key={status} onDragOver={(e) => handleDragOver(e, status)} onDrop={(e) => handleDrop(e, status)} className={`flex flex-col bg-slate-50/50 rounded-[2rem] border-2 transition-all min-h-[500px] ${hoveredColumn === status ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-100'}`}>
                <div className={`p-6 rounded-t-[1.8rem] flex items-center justify-between text-white shadow-lg mb-6 ${getStatusSummaryStyles(status)}`}>
                  <div className="flex items-center space-x-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base ${getStatusIconStyles(status)}`}><i className={`fas ${status === 'ACTIVE' ? 'fa-bolt' : status === 'PENDING' ? 'fa-clock' : 'fa-check-double'}`}></i></div>
                    <div><h3 className="text-3xl font-black uppercase tracking-tighter">{status === 'CLOSED' ? 'Sold' : status}</h3><p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{statusDeals.length} Transaction{statusDeals.length !== 1 ? 's' : ''}</p></div>
                  </div>
                  <div className="text-right"><p className="text-[9px] font-black uppercase opacity-70 tracking-widest mb-0.5">Volume</p><p className="text-base font-black tracking-tight">${totalStatusVolume.toLocaleString()}</p></div>
                </div>
                <div className="flex-1 px-4 pb-6 space-y-8 overflow-y-auto scrollbar-hide max-h-[700px]">
                  {sortedMonths.length > 0 ? sortedMonths.map(month => (
                    <div key={month} className="space-y-4">
                      <div className="flex items-center space-x-3 px-2"><div className="h-px flex-1 bg-slate-200"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/80 px-2 py-0.5 rounded-full">{month}</span><div className="h-px flex-1 bg-slate-200"></div></div>
                      <div className="space-y-4">{groupedDeals[month].map(deal => renderDealCard(deal))}</div>
                    </div>
                  )) : <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-40"><i className="fas fa-folder-open text-4xl mb-4"></i><p className="text-[10px] font-black uppercase tracking-widest">{searchTerm || startDate || endDate ? 'No search matches' : `No ${status.toLowerCase()} deals`}</p></div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center space-x-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0"><i className="fas fa-chart-line"></i></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtered Total Volume</p><p className="text-xl font-black text-slate-800">${totalFilteredVolume.toLocaleString()}</p></div>
             </div>
             <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 shadow-sm flex items-center space-x-4">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200"><i className="fas fa-money-bill-trend-up"></i></div>
                <div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Filtered Total GCI</p><p className="text-xl font-black text-slate-800">${totalFilteredGCI.toLocaleString()}</p></div>
             </div>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden"><table className="w-full text-left"><thead><tr className="bg-slate-50 border-b border-slate-200"><th className="px-8 py-5 cursor-pointer group" onClick={() => handleSort('name')}><div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Name {renderSortIcon('name')}</div></th><th className="px-8 py-5 cursor-pointer group" onClick={() => handleSort('status')}><div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status {renderSortIcon('status')}</div></th><th className="px-8 py-5 cursor-pointer group" onClick={() => handleSort('date')}><div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Date {renderSortIcon('date')}</div></th><th className="px-8 py-5 cursor-pointer group" onClick={() => handleSort('price')}><div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Price {renderSortIcon('price')}</div></th><th className="px-8 py-5 cursor-pointer group" onClick={() => handleSort('side')}><div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Side {renderSortIcon('side')}</div></th><th className="px-8 py-5 cursor-pointer group" onClick={() => handleSort('source')}><div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Source {renderSortIcon('source')}</div></th><th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedDeals.map(deal => (
            <tr key={deal.id} className="hover:bg-slate-50 transition-all group"><td className="px-8 py-6"><p className="text-sm font-black text-slate-800"><Highlight text={deal.leadName} query={searchTerm} /></p><p className="text-[11px] text-slate-400 font-medium truncate max-w-xs"><Highlight text={deal.address} query={searchTerm} /></p></td><td className="px-8 py-6"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${deal.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600 border-blue-100' : deal.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{deal.status}</span></td><td className="px-8 py-6 text-sm font-bold text-slate-600">{new Date(deal.date).toLocaleDateString('en-US', { timeZone: TZ })}</td><td className="px-8 py-6"><p className="text-sm font-black text-slate-800">${deal.salePrice.toLocaleString()}</p><p className="text-[10px] text-emerald-600 font-bold uppercase">GCI: ${deal.commissionAmount.toLocaleString()}</p></td><td className="px-8 py-6"><span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded">{deal.side}</span></td><td className="px-8 py-6"><div className="flex items-center space-x-2"><i className={`${getSourceIcon(deal.source || '').icon} ${getSourceIcon(deal.source || '').color} text-[11px]`}></i><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{deal.source}</span></div></td><td className="px-8 py-6 text-right"><div className="flex items-center justify-end space-x-2 transition-opacity"><button onClick={() => handleOpenEdit(deal)} className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><i className="fas fa-pencil-alt text-xs"></i></button><button onClick={() => setDealToDelete(deal)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm"><i className="fas fa-trash text-xs"></i></button></div></td></tr>
          ))}</tbody></table></div>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm gap-6 mt-10">
        <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl px-5 py-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
          <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-transparent border-none text-xs font-black text-slate-700 outline-none cursor-pointer">{[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}</select>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">per page</span>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center space-x-4">
            <button disabled={currentPage === 1} onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); scrollToTop(); }} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"><i className="fas fa-chevron-left"></i></button>
            <div className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] px-4">Page {currentPage} of {totalPages || 1}</div>
            <button disabled={currentPage >= totalPages} onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); scrollToTop(); }} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"><i className="fas fa-chevron-right"></i></button>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing {paginatedDeals.length} of {filteredDealsBase.length} transactions</p>
        </div>

        <button onClick={scrollToTop} className="flex items-center space-x-3 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"><i className="fas fa-arrow-up"></i><span>Back to Top</span></button>
      </div>

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 sm:p-8 overflow-y-auto bg-slate-900/40 backdrop-blur-md">
          <div className="absolute inset-0 z-0" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-5xl p-0 relative z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[calc(100vh-4rem)] text-[12px] overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingDealId ? 'Edit Transaction' : 'New Transaction Entry'}</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-95"><i className="fas fa-times text-xl"></i></button>
            </div>

            {/* QUICK NAV RIBBON */}
            <div className="bg-slate-50 border-b border-slate-200 px-10 py-4 flex items-center space-x-4 shrink-0 overflow-x-auto scrollbar-hide">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mr-2">Jump To:</span>
              {formNavItems.map(nav => (
                <button 
                  key={nav.id} 
                  type="button" 
                  onClick={() => scrollToSection(nav.id)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${nav.color} ${nav.hover} active:scale-95 whitespace-nowrap`}
                >
                  {nav.label}
                </button>
              ))}
            </div>
            
            {/* Form Scroll Area */}
            <div ref={modalScrollRef} className="flex-1 overflow-y-auto p-10 scroll-smooth scrollbar-hide space-y-12">
              <form onSubmit={handleSubmit} className="space-y-12">
                <div className="space-y-6">
                  <div id="section-details" className="flex items-center space-x-3 border-b border-indigo-200 pb-4 bg-indigo-50 rounded-t-2xl px-4 py-3 shadow-sm">
                    <div className="w-8 h-8 bg-white text-indigo-600 rounded-lg flex items-center justify-center text-xs shadow-sm"><i className="fas fa-info-circle"></i></div>
                    <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Client Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client Name</label>
                      <div className="relative">
                        <input required type="text" value={formData.leadName} onChange={(e) => { setFormData({...formData, leadName: e.target.value}); setShowClientSuggestions(true); }} onFocus={() => setShowClientSuggestions(true)} className={inputClass} placeholder="Client name..." />
                        {showClientSuggestions && filteredLeadsForName.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                            {filteredLeadsForName.map(l => (
                              <button key={l.id} type="button" onClick={() => { setFormData({...formData, leadName: `${l.firstName} ${l.lastName}`, leadId: l.id}); setShowClientSuggestions(false); }} className="w-full text-left px-5 py-3 hover:bg-indigo-50 flex items-center space-x-3 transition-colors border-b border-slate-50 last:border-0"><div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-[10px]">{l.firstName[0]}{l.lastName[0]}</div><div><p className="text-sm font-bold text-slate-700">{l.firstName} {l.lastName}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{l.email}</p></div></button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Property Address</label>
                      <div className="relative">
                        <i className="fas fa-location-dot absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input required type="text" className={`${inputClass} pl-12`} placeholder="Property Address..." value={formData.address} onChange={(e) => handleAddressChange(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 px-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sale Price ($)</label><input required type="text" className={`${inputClass} !text-lg font-black`} value={formData.salePrice} onChange={handleSalePriceChange} placeholder="$0" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comm. Rate (%)</label><input required type="number" step="0.01" className={`${inputClass} !text-lg font-black`} value={formData.commissionPercentage} onChange={e => setFormData({...formData, commissionPercentage: e.target.value})} placeholder="2.5" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 px-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Side</label><select className={inputClass} value={formData.side} onChange={e => setFormData({...formData, side: e.target.value as any})}><option value="BUYER">Buyer</option><option value="SELLER">Seller</option><option value="BOTH">Both</option></select></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label><select className={inputClass} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}><option value="ACTIVE">Active</option><option value="PENDING">In Escrow</option><option value="CLOSED">Closed/Sold</option></select></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{formData.status === 'CLOSED' ? 'Sold Date' : 'Est. Closing Date'}</label><input type="date" className={inputClass} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                  </div>
                </div>

                {/* Escrow Section */}
                <div className="space-y-6">
                  <div id="section-escrow" className="flex items-center space-x-3 border-b border-amber-200 pb-4 bg-amber-50 rounded-t-2xl px-4 py-3 shadow-sm">
                    <div className="w-8 h-8 bg-white text-amber-600 rounded-lg flex items-center justify-center text-xs shadow-sm"><i className="fas fa-file-contract"></i></div>
                    <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-widest">Escrow Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow Company</label><input type="text" className={inputClass} value={formData.escrowCompany} onChange={e => setFormData({...formData, escrowCompany: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow Officer</label><input type="text" className={inputClass} value={formData.escrowOfficer} onChange={e => setFormData({...formData, escrowOfficer: e.target.value})} /></div>
                  </div>
                  <div className="px-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow Address</label><input type="text" className={inputClass} value={formData.escrowAddress} onChange={e => setFormData({...formData, escrowAddress: e.target.value})} placeholder="Company Address..." /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 px-4 items-end">
                    <div className="md:col-span-3 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label><input type="tel" className={inputClass} value={formData.escrowPhone} onChange={e => setFormData({...formData, escrowPhone: formatPhone(e.target.value)})} /></div>
                    <div className="md:col-span-6 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label><input type="email" className={inputClass} value={formData.escrowEmail} onChange={e => setFormData({...formData, escrowEmail: e.target.value})} /></div>
                    <div className="md:col-span-3 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">File Number</label><input type="text" className={inputClass} value={formData.escrowFileNumber} onChange={e => setFormData({...formData, escrowFileNumber: e.target.value})} /></div>
                  </div>
                </div>

                {/* Lender Section */}
                <div className="space-y-6">
                  <div id="section-lender" className="flex items-center space-x-3 border-b border-emerald-200 pb-4 bg-emerald-50 rounded-t-2xl px-4 py-3 shadow-sm">
                    <div className="w-8 h-8 bg-white text-emerald-600 rounded-lg flex items-center justify-center text-xs shadow-sm"><i className="fas fa-hand-holding-dollar"></i></div>
                    <h4 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">Lender Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lender Company</label><input type="text" className={inputClass} value={formData.lenderCompany} onChange={e => setFormData({...formData, lenderCompany: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loan Officer</label><input type="text" className={inputClass} value={formData.lenderLoanOfficer} onChange={e => setFormData({...formData, lenderLoanOfficer: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lender Phone</label><input type="tel" className={inputClass} value={formData.lenderPhone} onChange={e => setFormData({...formData, lenderPhone: formatPhone(e.target.value)})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lender Email</label><input type="email" className={inputClass} value={formData.lenderEmail} onChange={e => setFormData({...formData, lenderEmail: e.target.value})} /></div>
                  </div>
                </div>

                {/* TC Section */}
                <div className="space-y-6">
                  <div id="section-tc" className="flex items-center space-x-3 border-b border-purple-200 pb-4 bg-purple-50 rounded-t-2xl px-4 py-3 shadow-sm">
                    <div className="w-8 h-8 bg-white text-purple-600 rounded-lg flex items-center justify-center text-xs shadow-sm"><i className="fas fa-user-gear"></i></div>
                    <h4 className="text-[11px] font-black text-purple-900 uppercase tracking-widest">Transaction Coordinator</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TC Name</label><input type="text" className={inputClass} value={formData.tcName} onChange={e => setFormData({...formData, tcName: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TC Phone</label><input type="tel" className={inputClass} value={formData.tcPhone} onChange={e => setFormData({...formData, tcPhone: formatPhone(e.target.value)})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TC Email</label><input type="email" className={inputClass} value={formData.tcEmail} onChange={e => setFormData({...formData, tcEmail: e.target.value})} /></div>
                  </div>
                </div>

                {/* Timeline Section */}
                <div className="space-y-6 pb-12">
                  <div id="section-timeline" className="flex items-center space-x-3 border-b border-blue-200 pb-4 bg-blue-50 rounded-t-2xl px-4 py-3 shadow-sm">
                    <div className="w-8 h-8 bg-white text-blue-600 rounded-lg flex items-center justify-center text-xs shadow-sm"><i className="fas fa-clock-rotate-left"></i></div>
                    <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Timeline & Notes</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Est. Closing Date</label><input type="date" className={inputClass} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inspection Due</label><input type="date" className={inputClass} value={formData.inspectionDueDate} onChange={e => setFormData({...formData, inspectionDueDate: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Appraisal Due</label><input type="date" className={inputClass} value={formData.appraisalDueDate} onChange={e => setFormData({...formData, appraisalDueDate: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loan Due</label><input type="date" className={inputClass} value={formData.loanDueDate} onChange={e => setFormData({...formData, loanDueDate: e.target.value})} /></div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-6 mx-4 shadow-inner">
                    <div className="flex space-x-4">
                      <textarea className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 font-bold text-lg outline-none min-h-[100px]" placeholder="Log milestone..." value={pendingNote} onChange={e => setPendingNote(e.target.value)} />
                      <button type="button" onClick={handleAddNote} className="px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest h-[100px] shadow-lg hover:bg-indigo-700 transition-all">Add Note</button>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide pr-2">
                      {formData.dealNotes.map(note => (
                        <div key={note.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in">
                          <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{new Date(note.createdAt).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <p className="text-lg font-bold text-slate-700 leading-relaxed mt-2">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-10 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
              <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Commission</p><p className="text-2xl font-black text-emerald-600">${commissionAmount.toLocaleString()}</p></div>
              <div className="flex space-x-4"><button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs">Discard</button><button onClick={handleSubmit} type="button" className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">{editingDealId ? 'Update Entry' : 'Save Transaction'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {dealToDelete && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDealToDelete(null)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-md p-8 relative z-10 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6"><i className="fas fa-trash-can"></i></div>
            <h3 className="text-2xl font-black text-slate-800 text-center mb-2">Move to Trash?</h3>
            <p className="text-slate-500 text-center mb-8 font-medium">Remove transaction for <span className="text-slate-900 font-bold">{dealToDelete.address}</span>?</p>
            <div className="flex space-x-4">
              <button onClick={() => setDealToDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs">Keep it</button>
              <button onClick={executeDeleteDeal} className="flex-1 py-4 bg-rose-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all">Move to Trash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineView;