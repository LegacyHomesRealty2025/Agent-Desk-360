import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Lead, Task, User } from '../types.ts';

interface CalendarViewProps {
  leads: Lead[];
  tasks: Task[];
  onSelectLead?: (lead: Lead) => void;
  onAddTask?: (task: Task) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onDeleteTask?: (id: string) => void;
  onUpdateLead?: (lead: Lead) => void;
  user?: User;
  isDarkMode?: boolean;
}

type EventCategory = 'APPOINTMENT' | 'TASK' | 'REMINDER' | 'BIRTHDAY' | 'WEDDING_ANNIVERSARY' | 'HOME_ANNIVERSARY';
type ViewMode = 'MONTH' | 'WEEK' | 'DAY';

interface UnifiedEvent {
  id: string;
  category: EventCategory;
  title: string;
  description: string;
  start: Date;
  end: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  leadId?: string;
  isCompleted?: boolean;
}

const MOCKED_TODAY = new Date('2026-01-06T09:00:00');

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalTimeString = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const CalendarView: React.FC<CalendarViewProps> = ({ 
  leads, 
  tasks, 
  onSelectLead, 
  onAddTask, 
  onUpdateTask, 
  onDeleteTask, 
  user, 
  isDarkMode 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date(MOCKED_TODAY));
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<{id: number, msg: string}[]>([]);
  
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [visibility, setVisibility] = useState<Record<EventCategory, boolean>>({
    APPOINTMENT: true,
    TASK: true,
    REMINDER: true,
    BIRTHDAY: true,
    WEDDING_ANNIVERSARY: true,
    HOME_ANNIVERSARY: true
  });

  const [formCategory, setFormCategory] = useState<EventCategory>('APPOINTMENT');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: getLocalDateString(MOCKED_TODAY),
    startTime: '10:00',
    endTime: '11:00',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    leadId: ''
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addNotification = (msg: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const allEvents: UnifiedEvent[] = useMemo(() => {
    const list: UnifiedEvent[] = [];

    tasks.forEach(t => {
      const start = new Date(t.dueDate);
      const end = t.endDate ? new Date(t.endDate) : new Date(start.getTime() + 3600000);
      list.push({
        id: `task-${t.id}`,
        category: 'TASK',
        title: t.title,
        description: t.description || '',
        start,
        end,
        priority: t.priority,
        leadId: t.leadId,
        isCompleted: t.isCompleted
      });
    });

    leads.forEach(l => {
      const currentCalendarYear = currentDate.getFullYear();
      
      if (l.dob) {
        const d = new Date(l.dob);
        const start = new Date(currentCalendarYear, d.getMonth(), d.getDate(), 9, 0);
        list.push({
          id: `dob-${l.id}`,
          category: 'BIRTHDAY',
          title: `${l.firstName}'s Birthday`,
          description: `Client Birthday Celebration`,
          start,
          end: new Date(start.getTime() + 3600000),
          priority: 'MEDIUM',
          leadId: l.id
        });
      }

      if (l.weddingAnniversary) {
        const d = new Date(l.weddingAnniversary);
        const start = new Date(currentCalendarYear, d.getMonth(), d.getDate(), 10, 0);
        list.push({
          id: `wedding-${l.id}`,
          category: 'WEDDING_ANNIVERSARY',
          title: `${l.firstName}'s Wedding Anniversary`,
          description: `Client Wedding Anniversary`,
          start,
          end: new Date(start.getTime() + 3600000),
          priority: 'MEDIUM',
          leadId: l.id
        });
      }

      if (l.homeAnniversary) {
        const d = new Date(l.homeAnniversary);
        const start = new Date(currentCalendarYear, d.getMonth(), d.getDate(), 11, 0);
        list.push({
          id: `home-${l.id}`,
          category: 'HOME_ANNIVERSARY',
          title: `${l.firstName}'s Home Anniversary`,
          description: `Client Home Anniversary`,
          start,
          end: new Date(start.getTime() + 3600000),
          priority: 'MEDIUM',
          leadId: l.id
        });
      }
    });

    return list;
  }, [tasks, leads, currentDate]);

  const displayEvents = useMemo(() => {
    return allEvents.filter(e => {
      const matchesVisibility = visibility[e.category];
      const matchesSearch = !searchQuery.trim() || 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        e.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesVisibility && matchesSearch;
    });
  }, [allEvents, visibility, searchQuery]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return allEvents.filter(e => 
      visibility[e.category] && (
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        e.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    ).slice(0, 8);
  }, [allEvents, searchQuery, visibility]);

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'MONTH') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'WEEK') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'MONTH') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'WEEK') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => setCurrentDate(new Date(MOCKED_TODAY));

  const handleMonthSelect = (monthIndex: number) => {
    const d = new Date(currentDate);
    d.setMonth(monthIndex);
    setCurrentDate(d);
    setIsMonthPickerOpen(false);
  };

  const handleYearChange = (delta: number) => {
    const d = new Date(currentDate);
    d.setFullYear(d.getFullYear() + delta);
    setCurrentDate(d);
  };

  const handleSearchResultClick = (event: UnifiedEvent) => {
    setCurrentDate(new Date(event.start));
    setSelectedEventId(event.id);
    setSearchQuery('');
  };

  const handleOpenCreate = (category: EventCategory = 'APPOINTMENT', dateStr?: string) => {
    setFormCategory(category);
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      date: dateStr || getLocalDateString(currentDate),
      startTime: '10:00',
      endTime: '11:00',
      priority: 'MEDIUM',
      leadId: ''
    });
    setSelectedEventId(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (eventId: string) => {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;

    if (['BIRTHDAY', 'WEDDING_ANNIVERSARY', 'HOME_ANNIVERSARY'].includes(event.category)) {
      addNotification("Milestones are managed in Lead Profile.");
      return;
    }

    setEditingId(event.id);
    setFormCategory(event.category);
    setFormData({
      title: event.title,
      description: event.description,
      date: getLocalDateString(event.start),
      startTime: getLocalTimeString(event.start),
      endTime: getLocalTimeString(event.end),
      priority: event.priority,
      leadId: event.leadId || ''
    });
    setSelectedEventId(null);
    setIsCreateModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const startIso = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
    const endIso = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

    if (editingId && editingId.startsWith('task-')) {
      const taskId = editingId.replace('task-', '');
      if (onUpdateTask) {
        onUpdateTask(taskId, {
          title: formData.title,
          description: formData.description,
          dueDate: startIso,
          endDate: endIso,
          priority: formData.priority,
          leadId: formData.leadId || undefined
        });
        addNotification("Event updated.");
      }
    } else if (onAddTask && user) {
      onAddTask({
        id: `task_${Date.now()}`,
        brokerageId: user.brokerageId,
        assignedUserId: user.id,
        leadId: formData.leadId || undefined,
        title: formData.title,
        description: formData.description,
        dueDate: startIso,
        endDate: endIso,
        isCompleted: false,
        priority: formData.priority
      });
      addNotification(`${formCategory} saved.`);
    }
    setIsCreateModalOpen(false);
  };

  const getCategoryColor = (cat: EventCategory, isDark: boolean) => {
    switch(cat) {
      case 'APPOINTMENT': return isDark ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'TASK': return isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'REMINDER': return isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-100';
      case 'BIRTHDAY': return isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-100';
      case 'WEDDING_ANNIVERSARY': return isDark ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-100';
      case 'HOME_ANNIVERSARY': return isDark ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-teal-50 text-teal-700 border-teal-100';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const calendarCells = useMemo(() => {
    const cells = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const prevMonthDays = new Date(year, month, 0).getDate();

    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, month: month - 1, year, current: false });
    }
    for (let i = 1; i <= days; i++) {
      cells.push({ day: i, month, year, current: true });
    }
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, month: month + 1, year, current: false });
    }
    return cells;
  }, [currentDate]);

  const weekCells = useMemo(() => {
    const cells = [];
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay();
    d.setDate(d.getDate() - dayOfWeek);
    for (let i = 0; i < 7; i++) {
      cells.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return cells;
  }, [currentDate]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const HOURS_ARRAY = Array.from({ length: 24 }, (_, i) => i);

  const currentEvent = allEvents.find(e => e.id === selectedEventId);

  return (
    <div className={`flex flex-col h-[calc(100vh-10rem)] ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} rounded-[2.5rem] overflow-hidden border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} shadow-2xl relative`}>
      <header className={`flex items-center justify-between px-10 py-6 border-b shrink-0 z-[100] ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-4 relative" ref={monthPickerRef}>
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                <i className="fas fa-calendar-days text-xl"></i>
             </div>
             <div className="relative">
                <button 
                  onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                  className={`flex items-center space-x-3 text-2xl font-black tracking-tight group transition-all hover:text-indigo-600 ${isMonthPickerOpen ? 'text-indigo-600' : ''}`}
                >
                  <span>
                    {viewMode === 'MONTH' ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}` : viewMode === 'DAY' ? currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric'}) : 'Week Overview'}
                  </span>
                  <i className={`fas fa-chevron-down text-xs transition-transform duration-300 ${isMonthPickerOpen ? 'rotate-180' : ''} opacity-30 group-hover:opacity-100`}></i>
                </button>

                {isMonthPickerOpen && (
                  <div className={`absolute left-0 top-full mt-4 w-[320px] rounded-[2.5rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] border animate-in fade-in slide-in-from-top-4 duration-300 overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                       <button onClick={() => handleYearChange(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><i className="fas fa-chevron-left text-xs"></i></button>
                       <span className="text-xl font-black tracking-tight">{currentDate.getFullYear()}</span>
                       <button onClick={() => handleYearChange(1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><i className="fas fa-chevron-right text-xs"></i></button>
                    </div>
                    <div className="p-6 grid grid-cols-3 gap-3">
                       {monthNames.map((m, idx) => (
                         <button 
                           key={m} 
                           onClick={() => handleMonthSelect(idx)}
                           className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentDate.getMonth() === idx ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                         >
                           {m.substring(0, 3)}
                         </button>
                       ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
          
          <div className={`flex items-center p-1 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
             <button onClick={handlePrev} className="w-12 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"><i className="fas fa-chevron-left text-[10px]"></i></button>
             <button onClick={handleNext} className="w-12 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all border-x border-slate-100 dark:border-slate-700"><i className="fas fa-chevron-right text-[10px]"></i></button>
             <button onClick={handleToday} className="px-8 py-2 text-[11px] font-black uppercase tracking-[0.2em] hover:text-indigo-600 flex items-center space-x-2 transition-all">
               <span>Today</span>
               <span className="opacity-40">•</span>
               <span>{MOCKED_TODAY.getDate()}</span>
             </button>
          </div>

          <div className="relative group ml-4" ref={searchRef}>
             <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"></i>
             <input 
               type="text" 
               placeholder="Search calendar..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className={`pl-11 pr-10 py-3 border rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all w-64 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
             />
             {searchQuery && (
               <div className={`absolute left-0 top-full mt-2 w-[350px] rounded-3xl shadow-2xl border z-[500] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                  <div className="max-h-[400px] overflow-y-auto scrollbar-hide py-2">
                     {searchResults.map(res => (
                       <button key={res.id} onClick={() => handleSearchResultClick(res)} className={`w-full text-left px-5 py-4 hover:bg-indigo-50/50 flex items-start space-x-4 border-b border-slate-50 last:border-0 transition-colors ${isDarkMode ? 'hover:bg-white/5 border-slate-800' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs shadow-sm ${getCategoryColor(res.category, isDarkMode || false)}`}>
                             <i className={`fas ${res.category === 'TASK' ? 'fa-check' : 'fa-clock'}`}></i>
                          </div>
                          <div>
                             <p className="text-sm font-black truncate">{res.title}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                               {res.start.toLocaleDateString()} • {res.category.replace('_', ' ')}
                             </p>
                          </div>
                       </button>
                     ))}
                  </div>
               </div>
             )}
          </div>
        </div>

        <button onClick={() => handleOpenCreate()} className="bg-indigo-600 text-white px-10 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-900/20 active:scale-95 transition-all">
          <i className="fas fa-plus mr-2"></i> Create
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar width decreased from w-80 to w-64 */}
        <aside className={`w-64 border-r p-6 shrink-0 flex flex-col space-y-12 ${isDarkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-white border-slate-100'}`}>
           <section>
              <div className="mb-6 relative">
                 {/* Prominent title styling */}
                 <h4 className={`text-base font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>View Options</h4>
                 <div className="absolute -bottom-2 left-0 w-12 h-1 bg-indigo-500 rounded-full"></div>
              </div>
              <div className="space-y-2">
                 {(['MONTH', 'WEEK', 'DAY'] as ViewMode[]).map(m => (
                    <button key={m} onClick={() => setViewMode(m)} className={`w-full flex items-center px-5 py-3.5 rounded-2xl transition-all ${viewMode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                       <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                    </button>
                 ))}
              </div>
           </section>

           <section>
              <div className="mb-6 relative">
                 {/* Prominent title styling */}
                 <h4 className={`text-base font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Visibility</h4>
                 <div className="absolute -bottom-2 left-0 w-12 h-1 bg-indigo-500 rounded-full"></div>
              </div>
              <div className="space-y-4">
                 {[
                   { id: 'APPOINTMENT', color: 'bg-indigo-500', labelColor: 'text-indigo-500', label: 'Appointments' },
                   { id: 'TASK', color: 'bg-emerald-500', labelColor: 'text-emerald-500', label: 'Tasks' },
                   { id: 'REMINDER', color: 'bg-amber-500', labelColor: 'text-amber-500', label: 'Reminders' },
                   { id: 'BIRTHDAY', color: 'bg-rose-500', labelColor: 'text-rose-500', label: 'Birthdays' },
                   { id: 'WEDDING_ANNIVERSARY', color: 'bg-purple-500', labelColor: 'text-purple-500', label: 'Wedding Anni' },
                   { id: 'HOME_ANNIVERSARY', color: 'bg-teal-500', labelColor: 'text-teal-500', label: 'Home Anni' }
                 ].map(f => (
                    <label key={f.id} className="flex items-center space-x-3.5 cursor-pointer group">
                       <input 
                         type="checkbox" 
                         checked={visibility[f.id as EventCategory]}
                         onChange={() => setVisibility(prev => ({ ...prev, [f.id]: !prev[f.id as EventCategory] }))}
                         className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all shadow-sm" 
                       />
                       <div className="flex items-center space-x-3">
                          <div className={`w-3.5 h-3.5 rounded-full shadow-sm ${f.color}`}></div>
                          {/* Font size decreased from 12px to 10px */}
                          <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity group-hover:opacity-100 ${f.labelColor} ${visibility[f.id as EventCategory] ? 'opacity-100' : 'opacity-40'}`}>
                            {f.label}
                          </span>
                       </div>
                    </label>
                 ))}
              </div>
           </section>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {viewMode === 'MONTH' && (
            <>
              <div className={`grid grid-cols-7 border-b text-center shrink-0 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                {dayNames.map(d => <div key={d} className="py-4 text-[10px] font-black text-slate-400 tracking-[0.2em]">{d}</div>)}
              </div>
              <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-y-auto scrollbar-hide">
                 {calendarCells.map((cell, idx) => {
                    const dayEvents = displayEvents.filter(e => e.start.getDate() === cell.day && e.start.getMonth() === cell.month && e.start.getFullYear() === cell.year);
                    const isToday = cell.day === MOCKED_TODAY.getDate() && cell.month === MOCKED_TODAY.getMonth() && cell.year === MOCKED_TODAY.getFullYear();
                    return (
                      <div key={idx} onClick={() => handleOpenCreate('APPOINTMENT', `${cell.year}-${(cell.month + 1).toString().padStart(2, '0')}-${cell.day.toString().padStart(2, '0')}`)} className={`min-h-[120px] p-2 border-r border-b relative group/cell transition-colors ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} ${cell.current ? '' : 'bg-slate-50/30 opacity-40'} hover:bg-indigo-50/10 cursor-pointer`}>
                         <div className="flex items-start justify-between mb-2">
                            <span className={`w-8 h-8 flex items-center justify-center text-sm font-black rounded-xl ${isToday ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'text-slate-400 group-hover/cell:text-indigo-600'}`}>{cell.day}</span>
                         </div>
                         <div className="space-y-1 overflow-hidden">
                            {dayEvents.slice(0, 4).map(e => (
                               <div key={e.id} onClick={(ev) => { ev.stopPropagation(); setSelectedEventId(e.id); }} className={`px-2 py-1.5 rounded-lg border text-[10px] font-black truncate shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${getCategoryColor(e.category, isDarkMode || false)}`}>
                                  <div className="flex items-center space-x-1.5">
                                     {e.priority === 'HIGH' && <div className="w-1 h-1 rounded-full bg-rose-600"></div>}
                                     <span className="truncate">{e.title}</span>
                                  </div>
                               </div>
                            ))}
                            {dayEvents.length > 4 && <div className="text-[8px] font-black text-indigo-500 uppercase px-2 py-1 bg-indigo-50/50 rounded-lg text-center">+ {dayEvents.length - 4} More</div>}
                         </div>
                      </div>
                    );
                 })}
              </div>
            </>
          )}

          {viewMode === 'WEEK' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className={`grid grid-cols-[120px_1fr] border-b ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                 <div className="p-4 border-r border-slate-200"></div>
                 <div className="grid grid-cols-7 text-center">
                    {weekCells.map((date, idx) => {
                      const isToday = date.getDate() === MOCKED_TODAY.getDate() && date.getMonth() === MOCKED_TODAY.getMonth() && date.getFullYear() === MOCKED_TODAY.getFullYear();
                      return (
                        <div key={idx} className="py-4 border-r border-slate-100 last:border-0">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{dayNames[date.getDay()]}</p>
                           <p className={`text-xl font-black ${isToday ? 'text-indigo-600' : 'text-slate-800 dark:text-slate-100'}`}>{date.getDate()}</p>
                        </div>
                      );
                    })}
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide grid grid-cols-[120px_1fr]">
                 <div className={`border-r ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} bg-slate-50/30`}>
                    {HOURS_ARRAY.map(h => (
                      <div key={h} className="h-20 p-2 text-right border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase">{h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}</span>
                      </div>
                    ))}
                 </div>
                 <div className="grid grid-cols-7 relative">
                    {weekCells.map((date, idx) => {
                       const dayEvents = displayEvents.filter(e => e.start.getDate() === date.getDate() && e.start.getMonth() === date.getMonth() && e.start.getFullYear() === date.getFullYear());
                       return (
                        <div key={idx} className="border-r border-slate-100 dark:border-slate-800 relative">
                           {HOURS_ARRAY.map(h => <div key={h} className="h-20 border-b border-slate-100 dark:border-slate-800 hover:bg-indigo-50/5 cursor-crosshair"></div>)}
                           {dayEvents.map(e => {
                             const startH = e.start.getHours();
                             const startM = e.start.getMinutes();
                             const dur = (e.end.getTime() - e.start.getTime()) / 3600000;
                             return (
                               <div key={e.id} onClick={() => setSelectedEventId(e.id)} className={`absolute left-1 right-1 px-3 py-2 rounded-xl border text-[10px] font-black shadow-lg cursor-pointer transition-all hover:scale-[1.02] ${getCategoryColor(e.category, isDarkMode || false)}`} style={{ top: `${(startH + startM/60) * 80 + 4}px`, height: `${Math.max(0.4, dur) * 80 - 8}px`, zIndex: 10 }}>
                                  <div className="flex flex-col h-full justify-between">
                                    <span className="truncate">{e.title}</span>
                                    {dur > 0.75 && <span className="text-[8px] opacity-60 uppercase">{getLocalTimeString(e.start)}</span>}
                                  </div>
                               </div>
                             );
                           })}
                        </div>
                       );
                    })}
                 </div>
              </div>
            </div>
          )}

          {viewMode === 'DAY' && (
            <div className="flex-1 flex overflow-hidden">
               <div className={`w-[140px] border-r overflow-y-auto scrollbar-hide ${isDarkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  {HOURS_ARRAY.map(h => (
                    <div key={h} className="h-24 p-6 text-right border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}</span>
                    </div>
                  ))}
               </div>
               <div className="flex-1 overflow-y-auto scrollbar-hide relative bg-white dark:bg-slate-950">
                  {HOURS_ARRAY.map(h => <div key={h} className="h-24 border-b border-slate-50 dark:border-slate-900 hover:bg-slate-50 cursor-crosshair"></div>)}
                  {displayEvents.filter(e => e.start.getDate() === currentDate.getDate() && e.start.getMonth() === currentDate.getMonth() && e.start.getFullYear() === currentDate.getFullYear()).map(e => {
                    const startH = e.start.getHours();
                    const startM = e.start.getMinutes();
                    const dur = (e.end.getTime() - e.start.getTime()) / 3600000;
                    return (
                      <div key={e.id} onClick={() => setSelectedEventId(e.id)} className={`absolute left-12 right-12 p-8 rounded-[2.5rem] border-2 shadow-2xl flex flex-col justify-center cursor-pointer transition-all hover:scale-[1.01] active:scale-95 ${getCategoryColor(e.category, isDarkMode || false)}`} style={{ top: `${(startH + startM/60) * 96 + 12}px`, height: `${Math.max(0.5, dur) * 96 - 24}px`, minHeight: '60px' }}>
                         <div className="flex items-start justify-between">
                            <div>
                               <p className="text-2xl font-black tracking-tighter leading-none">{e.title}</p>
                               <p className="text-[10px] font-bold uppercase opacity-60 mt-2 tracking-widest">{getLocalTimeString(e.start)} - {getLocalTimeString(e.end)}</p>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${e.priority === 'HIGH' ? 'bg-rose-500 text-white' : 'bg-white/20'}`}>{e.priority} ALERT</div>
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
           <div className={`w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col`}>
              <div className="flex p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                 {(['APPOINTMENT', 'TASK', 'REMINDER'] as EventCategory[]).map(cat => (
                   <button key={cat} onClick={() => setFormCategory(cat)} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center space-x-3 ${formCategory === cat ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
                     <span>{cat}</span>
                   </button>
                 ))}
              </div>
              <form onSubmit={handleFormSubmit} className="p-12 space-y-12">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Summary</label>
                    <input autoFocus required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] px-8 py-6 font-black text-3xl outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-slate-800 dark:text-white" placeholder="Summary..." />
                 </div>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                       <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 font-bold text-lg outline-none" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                       <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                          {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
                            <button key={p} type="button" onClick={() => setFormData({...formData, priority: p})} className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.priority === p ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{p}</button>
                          ))}
                       </div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
                       <input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 font-bold text-lg outline-none" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time</label>
                       <input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 font-bold text-lg outline-none" />
                    </div>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all">Discard</button>
                    <button type="submit" className="flex-[2] py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Save Event</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {selectedEventId && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in">
           <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] p-12 text-center border shadow-2xl relative overflow-hidden">
              <button onClick={() => setSelectedEventId(null)} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 transition-colors"><i className="fas fa-times text-2xl"></i></button>
              <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 text-4xl mx-auto mb-8 shadow-inner"><i className="fas fa-circle-info"></i></div>
              <h3 className="text-3xl font-black tracking-tighter mb-2">{currentEvent?.title}</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-10">{currentEvent?.category.replace('_', ' ')} Detail</p>
              <div className="space-y-4 mb-12 text-left">
                 <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Schedule</span>
                    <span className="font-black text-[13px]">{currentEvent?.start.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 {!['BIRTHDAY', 'WEDDING_ANNIVERSARY', 'HOME_ANNIVERSARY'].includes(currentEvent?.category || '') && (
                   <button onClick={() => handleOpenEdit(selectedEventId!)} className="py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-transform">Edit</button>
                 )}
                 <button onClick={() => { if (selectedEventId?.startsWith('task-')) { onDeleteTask?.(selectedEventId.replace('task-', '')); } setSelectedEventId(null); }} className={`py-5 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-transform ${['BIRTHDAY', 'WEDDING_ANNIVERSARY', 'HOME_ANNIVERSARY'].includes(currentEvent?.category || '') ? 'col-span-2 bg-slate-900' : 'bg-rose-600'}`}>Delete</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;