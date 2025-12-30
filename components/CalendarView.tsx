import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Lead, Task, User } from '../types';

interface CalendarViewProps {
  leads: Lead[];
  tasks: Task[];
  onSelectLead?: (lead: Lead) => void;
  onAddTask?: (task: Task) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onDeleteTask?: (id: string) => void;
  onUpdateLead?: (lead: Lead) => void;
  user?: User;
}

type EventType = 'BIRTHDAY' | 'WEDDING_ANN' | 'HOME_ANN' | 'TASK';

interface CalendarEvent {
  id: string;
  type: EventType;
  title: string;
  date: Date;
  endDate?: Date;
  originalItem: Lead | Task;
}

const TZ = 'America/Los_Angeles';
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => i + DAY_START_HOUR);
const BASE_SLOT_HEIGHT = 100; // Pixels per hour at 1x zoom
const BASE_CELL_HEIGHT = 130; // Pixels for month cell at 1x zoom

const CalendarView: React.FC<CalendarViewProps> = ({ leads, tasks, onSelectLead, onAddTask, onUpdateTask, onDeleteTask, onUpdateLead, user }) => {
  const getLANow = () => {
    const laStr = new Date().toLocaleString('en-US', { timeZone: TZ });
    return new Date(laStr);
  };

  const [currentDate, setCurrentDate] = useState(getLANow());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<number | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [nowPos, setNowPos] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 0.6 to 2.0
  
  // Inline Editing State for Agenda
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineNoteValue, setInlineNoteValue] = useState('');
  const inlineInputRef = useRef<HTMLTextAreaElement>(null);
  
  const currentSlotHeight = useMemo(() => BASE_SLOT_HEIGHT * zoomLevel, [zoomLevel]);
  const currentCellHeight = useMemo(() => BASE_CELL_HEIGHT * zoomLevel, [zoomLevel]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: getLANow().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    priority: 'MEDIUM' as Task['priority'],
    leadId: ''
  });

  useEffect(() => {
    const updateNow = () => {
      const laNow = getLANow();
      const currentHour = laNow.getHours();
      const currentMin = laNow.getMinutes();
      
      if (currentHour >= DAY_START_HOUR && currentHour <= DAY_END_HOUR) {
        const minsSinceStart = (currentHour - DAY_START_HOUR) * 60 + currentMin;
        setNowPos(minsSinceStart * (currentSlotHeight / 60));
      } else {
        setNowPos(null);
      }
    };

    updateNow();
    const interval = setInterval(updateNow, 60000);
    return () => clearInterval(interval);
  }, [selectedDayDetail, currentSlotHeight]);

  // Focus inline textarea when activated
  useEffect(() => {
    if (inlineEditingId && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [inlineEditingId]);

  const selectedLead = useMemo(() => 
    leads.find(l => l.id === formData.leadId), 
    [leads, formData.leadId]
  );

  const filteredLeads = useMemo(() => {
    if (!clientSearchTerm.trim()) return leads.slice(0, 10);
    return leads.filter(l => 
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(clientSearchTerm.toLowerCase())
    ).slice(0, 5);
  }, [leads, clientSearchTerm]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(getLANow());

  const zoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.min(prev + 0.1, 2.0));
  };
  const zoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.max(prev - 0.1, 0.6));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const events: CalendarEvent[] = useMemo(() => {
    const evs: CalendarEvent[] = [];
    leads.forEach(lead => {
      if (lead.dob) {
        const d = new Date(new Date(lead.dob).toLocaleString('en-US', { timeZone: TZ }));
        evs.push({ id: `dob-${lead.id}`, type: 'BIRTHDAY', title: `${lead.firstName}'s Birthday`, date: d, originalItem: lead });
      }
      if (lead.weddingAnniversary) {
        const d = new Date(new Date(lead.weddingAnniversary).toLocaleString('en-US', { timeZone: TZ }));
        evs.push({ id: `wedding-${lead.id}`, type: 'WEDDING_ANN', title: `${lead.firstName}'s Wedding Anniv.`, date: d, originalItem: lead });
      }
      if (lead.homeAnniversary) {
        const d = new Date(new Date(lead.homeAnniversary).toLocaleString('en-US', { timeZone: TZ }));
        evs.push({ id: `home-${lead.id}`, type: 'HOME_ANN', title: `${lead.firstName}'s Home Anniv.`, date: d, originalItem: lead });
      }
    });

    tasks.forEach(task => {
      const d = new Date(new Date(task.dueDate).toLocaleString('en-US', { timeZone: TZ }));
      const endD = task.endDate ? new Date(new Date(task.endDate).toLocaleString('en-US', { timeZone: TZ })) : new Date(d.getTime() + 3600000);
      evs.push({ id: `task-${task.id}`, type: 'TASK', title: task.title, date: d, endDate: endD, originalItem: task });
    });
    return evs;
  }, [leads, tasks]);

  const getEventsForDay = (day: number, targetMonth: number, targetYear: number) => {
    return events.filter(e => 
      e.date.getDate() === day && 
      e.date.getMonth() === targetMonth && 
      e.date.getFullYear() === targetYear
    );
  };

  const getPriorityColors = (priority: Task['priority']) => {
    switch (priority) {
      case 'HIGH': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', bar: 'bg-rose-500' };
      case 'MEDIUM': return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', bar: 'bg-orange-500' };
      case 'LOW': return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', bar: 'bg-slate-400' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', bar: 'bg-slate-400' };
    }
  };

  const getEventStyles = (event: CalendarEvent) => {
    if (event.type === 'TASK') {
      const p = (event.originalItem as Task).priority;
      const colors = getPriorityColors(p);
      return `${colors.bg} ${colors.text} ${colors.border}`;
    }
    switch (event.type) {
      case 'BIRTHDAY': return 'bg-pink-50 text-pink-600 border-pink-100';
      case 'WEDDING_ANN': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'HOME_ANN': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'HIGH': return 'High Alert';
      case 'MEDIUM': return 'Medium Alert';
      case 'LOW': return 'Low Alert';
      default: return priority;
    }
  };

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'BIRTHDAY': return 'fa-cake-candles';
      case 'WEDDING_ANN': return 'fa-ring';
      case 'HOME_ANN': return 'fa-house-chimney-user';
      case 'TASK': return 'fa-calendar-check';
      default: return 'fa-calendar';
    }
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startIso = new Date(`${formData.dueDate}T${formData.startTime}:00`).toISOString();
    const endIso = new Date(`${formData.dueDate}T${formData.endTime}:00`).toISOString();

    if (editingTaskId && onUpdateTask) {
      onUpdateTask(editingTaskId, {
        title: formData.title,
        description: formData.description,
        dueDate: startIso,
        endDate: endIso,
        priority: formData.priority,
        leadId: formData.leadId || undefined
      });
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
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const executeDelete = () => {
    if (editingTaskId && onDeleteTask) {
      onDeleteTask(editingTaskId);
      resetForm();
      setShowDeleteConfirm(false);
    }
  };

  const resetForm = () => {
    setClientSearchTerm('');
    setEditingTaskId(null);
    setFormData({
      title: '',
      description: '',
      dueDate: getLANow().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '11:00',
      priority: 'MEDIUM',
      leadId: ''
    });
  };

  const handleDayClick = (day: number) => {
    setSelectedDayDetail(day);
    const formattedDate = new Date(year, month, day).toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, dueDate: formattedDate }));
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    const start = new Date(task.dueDate);
    const end = task.endDate ? new Date(task.endDate) : new Date(start.getTime() + 3600000);
    setFormData({
      title: task.title,
      description: task.description,
      dueDate: start.toISOString().split('T')[0],
      startTime: start.toTimeString().split(' ')[0].substring(0, 5),
      endTime: end.toTimeString().split(' ')[0].substring(0, 5),
      priority: task.priority,
      leadId: task.leadId || ''
    });
    document.getElementById('task-form-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTimelineClick = (hour: number, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const minutesOffset = Math.floor((clickY / currentSlotHeight) * 60);
    const roundedMinutes = Math.floor(minutesOffset / 15) * 15;
    
    const startTimeStr = `${hour.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
    const endTimeStr = `${(hour + 1).toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;

    setEditingTaskId(null);
    setFormData(prev => ({ 
      ...prev, 
      title: '',
      description: '',
      startTime: startTimeStr,
      endTime: endTimeStr
    }));
    document.getElementById('task-form-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggleComplete = (task: Task) => {
    onUpdateTask?.(task.id, { isCompleted: !task.isCompleted });
  };

  const startInlineEdit = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setInlineEditingId(task.id);
    setInlineNoteValue(task.description || '');
  };

  const saveInlineEdit = (taskId: string) => {
    if (onUpdateTask) {
      onUpdateTask(taskId, { description: inlineNoteValue });
    }
    setInlineEditingId(null);
  };

  const cancelInlineEdit = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    setInlineEditingId(null);
  };

  const now = getLANow();
  const selectedDayEvents = useMemo(() => 
    selectedDayDetail ? getEventsForDay(selectedDayDetail, month, year) : [],
    [selectedDayDetail, month, year, events]
  );

  const allDayMilestones = selectedDayEvents.filter(e => e.type !== 'TASK');
  const timedTasks = selectedDayEvents.filter(e => e.type === 'TASK');

  const getTaskStyle = (event: CalendarEvent) => {
    const start = event.date;
    const end = event.endDate || new Date(start.getTime() + 3600000);
    
    const startMins = (start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes();
    const durationMins = (end.getTime() - start.getTime()) / 60000;
    
    const top = startMins * (currentSlotHeight / 60);
    const height = Math.max(currentSlotHeight / 2.5, durationMins * (currentSlotHeight / 60));

    return { top, height };
  };

  const calendarDays = [];
  const totalDaysInMonth = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= totalDaysInMonth; i++) calendarDays.push(i);

  // Legend Items
  const legendItems = [
    { label: 'Birthday', color: 'bg-pink-400' },
    { label: 'Wedding', color: 'bg-indigo-400' },
    { label: 'Home Anniv.', color: 'bg-emerald-400' },
    { label: 'High Priority', color: 'bg-rose-500' },
    { label: 'Medium', color: 'bg-orange-500' },
    { label: 'Low', color: 'bg-slate-400' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 max-w-[1600px] mx-auto animate-in fade-in duration-500 relative">
      <div className="w-full lg:w-64 space-y-6 shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <i className="fas fa-bullseye text-indigo-500 mr-2"></i>
            Quick Milestones
          </h3>
          <div className="space-y-4">
            {events
              .filter(e => e.date >= now)
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, 6)
              .map(e => (
                <div key={e.id} className="flex items-start space-x-3 group cursor-pointer" onClick={() => e.type !== 'TASK' && onSelectLead?.(e.originalItem as Lead)}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${getEventStyles(e)}`}>
                    <i className={`fas ${getEventIcon(e.type)} text-[10px]`}></i>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight truncate">{e.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                      {e.date.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
           <h4 className="font-bold mb-2 flex items-center"><i className="fas fa-magic mr-2 text-indigo-400"></i>AI Insights</h4>
           <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
             Schedule analysis complete. You have <span className="text-white font-bold">{timedTasks.length} tasks</span> today.
           </p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[800px]">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
              {monthNames[month]} <span className="text-slate-400 font-normal">{year}</span>
            </h2>
            <div className="flex items-center space-x-1 ml-4">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600"><i className="fas fa-chevron-left text-xs"></i></button>
              <button onClick={today} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Today</button>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600"><i className="fas fa-chevron-right text-xs"></i></button>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
               <button onClick={zoomOut} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-500 hover:text-indigo-600 transition-all"><i className="fas fa-minus text-[10px]"></i></button>
               <span className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{Math.round(zoomLevel * 100)}%</span>
               <button onClick={zoomIn} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-500 hover:text-indigo-600 transition-all"><i className="fas fa-plus text-[10px]"></i></button>
            </div>
            <div className="hidden xl:flex items-center space-x-4 bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100">
               {legendItems.map((item, idx) => (
                 <div key={idx} className="flex items-center space-x-2">
                   <div className={`w-2 h-2 rounded-full ${item.color} shadow-sm`}></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{item.label}</span>
                 </div>
               ))}
            </div>
            <button onClick={() => { setIsModalOpen(true); resetForm(); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all shrink-0">
              <i className="fas fa-plus mr-2"></i> Add Task
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
            <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 tracking-widest">{d}</div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((day, idx) => {
            const dayEvents = day ? getEventsForDay(day, month, year) : [];
            const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
            return (
              <div 
                key={idx} 
                onClick={() => day && handleDayClick(day)} 
                className={`p-2 border-r border-b border-slate-100 transition-all cursor-pointer ${day ? 'hover:bg-indigo-50/50 group/cell' : 'bg-slate-50/10'}`}
                style={{ minHeight: `${currentCellHeight}px` }}
              >
                {day && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`w-7 h-7 flex items-center justify-center text-sm font-black rounded-lg ${isToday ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-800 group-hover/cell:text-indigo-600'}`}>{day}</span>
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      {dayEvents.slice(0, Math.max(1, Math.floor(zoomLevel * 3))).map(e => (
                        <div key={e.id} className={`px-2 py-0.5 rounded text-[8px] font-black border truncate ${getEventStyles(e)} ${e.type === 'TASK' && (e.originalItem as Task).isCompleted ? 'opacity-30 line-through' : ''}`}>
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > Math.max(1, Math.floor(zoomLevel * 3)) && <div className="text-[8px] font-black text-indigo-500 uppercase text-center mt-1">+ {dayEvents.length - Math.max(1, Math.floor(zoomLevel * 3))} More</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDayDetail !== null && (
        <div className="fixed inset-0 z-[150] flex flex-col bg-white animate-in fade-in duration-300 overflow-hidden">
           <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white shadow-sm z-20">
             <div className="flex items-center space-x-10">
               <div>
                 <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                   {monthNames[month]} {selectedDayDetail}, {year}
                 </h2>
                 <div className="flex items-center space-x-3 mt-1">
                   <span className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Agenda Management</span>
                   <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                   <span className="text-indigo-600 font-bold text-[10px] uppercase">{timedTasks.length} tasks today</span>
                 </div>
               </div>
               <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                 <button onClick={zoomOut} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-md text-slate-500 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100"><i className="fas fa-search-minus"></i></button>
                 <div className="px-5 text-xs font-black text-slate-400 uppercase tracking-widest">{Math.round(zoomLevel * 100)}%</div>
                 <button onClick={zoomIn} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-md text-slate-500 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100"><i className="fas fa-search-plus"></i></button>
               </div>
             </div>
             <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setSelectedDayDetail(null)} 
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center space-x-3"
                >
                  <i className="fas fa-chevron-left"></i>
                  <span>Back to Month</span>
                </button>
                <button 
                  onClick={() => setSelectedDayDetail(null)} 
                  className="w-12 h-12 rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-95 flex items-center justify-center text-xl"
                >
                  <i className="fas fa-times"></i>
                </button>
             </div>
           </div>
           <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-y-auto scrollbar-hide border-r border-slate-100 bg-white">
                {allDayMilestones.length > 0 && (
                  <div className="p-8 bg-slate-50/50 border-b border-slate-100 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Milestones & Special Events</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allDayMilestones.map(e => (
                        <div key={e.id} className={`p-4 rounded-2xl border-2 flex items-center space-x-4 transition-all hover:shadow-md cursor-pointer ${getEventStyles(e)}`} onClick={() => onSelectLead?.(e.originalItem as Lead)}>
                          <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center text-lg shadow-sm"><i className={`fas ${getEventIcon(e.type)}`}></i></div>
                          <span className="font-black tracking-tight text-sm">{e.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="relative" style={{ height: `${HOURS.length * currentSlotHeight}px` }}>
                   {HOURS.map(hour => (
                     <div key={hour} className="group flex border-b border-slate-100" style={{ height: `${currentSlotHeight}px` }}>
                       <div className="w-24 text-right pr-6 pt-2 text-[11px] font-black text-slate-300 uppercase whitespace-nowrap bg-white sticky left-0 z-10">
                         {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                       </div>
                       <div onClick={(e) => handleTimelineClick(hour, e)} className="flex-1 hover:bg-indigo-50/20 transition-all cursor-crosshair relative">
                         <div className="absolute top-1/2 left-0 right-0 h-px border-t border-slate-50 border-dashed pointer-events-none"></div>
                       </div>
                     </div>
                   ))}
                   <div className="absolute inset-0 left-24 pointer-events-none">
                     {timedTasks.map(t => {
                       const task = t.originalItem as Task;
                       const { top, height } = getTaskStyle(t);
                       const pColors = getPriorityColors(task.priority);
                       const combinedStyles = getEventStyles(t);
                       const isInlineEditing = inlineEditingId === task.id;
                       return (
                         <div 
                            key={t.id} 
                            onClick={(e) => { !isInlineEditing && handleEditTask(task); }}
                            className={`absolute left-4 right-8 pointer-events-auto p-4 rounded-2xl border shadow-sm transition-all hover:scale-[1.01] hover:shadow-lg cursor-pointer group/task overflow-hidden ${task.isCompleted ? 'bg-slate-50 opacity-40 border-slate-200 grayscale' : combinedStyles}`}
                            style={{ top: `${top + 4}px`, height: `${height - 8}px`, zIndex: isInlineEditing ? 50 : 10 }}
                         >
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${task.isCompleted ? 'bg-slate-300' : pColors.bar}`}></div>
                            <div className="flex flex-col h-full">
                               <div className="flex items-start justify-between mb-1">
                                  <div className="flex items-center space-x-3 overflow-hidden">
                                     <button onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }} className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 ${task.isCompleted ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300 hover:text-indigo-600 hover:scale-110'}`}><i className={`fas ${task.isCompleted ? 'fa-check-circle' : 'fa-circle'}`}></i></button>
                                     <span className={`text-base font-black tracking-tight truncate ${task.isCompleted ? 'line-through text-slate-400' : ''}`}>{t.title}</span>
                                  </div>
                               </div>
                               {isInlineEditing ? (
                                 <div className="mt-2 flex-1 flex flex-col space-y-2" onClick={e => e.stopPropagation()}>
                                   <textarea ref={inlineInputRef} value={inlineNoteValue} onChange={e => setInlineNoteValue(e.target.value)} className="flex-1 w-full bg-white/20 border border-current rounded-xl p-3 font-black text-sm outline-none resize-none" />
                                   <div className="flex items-center space-x-2 justify-end">
                                      <button onClick={(e) => cancelInlineEdit(e)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/30 text-white flex items-center justify-center transition-all"><i className="fas fa-times"></i></button>
                                      <button onClick={() => saveInlineEdit(task.id)} className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg transition-all"><i className="fas fa-check"></i></button>
                                   </div>
                                 </div>
                               ) : (
                                 task.description && (<p onClick={(e) => !task.isCompleted && startInlineEdit(e, task)} className={`mt-2 font-black leading-tight line-clamp-3 mb-2 ${task.isCompleted ? 'text-slate-400' : 'opacity-80 hover:opacity-100 cursor-text'} text-sm transition-opacity`}>{task.description}</p>)
                               )}
                               {!isInlineEditing && (
                                 <div className="flex items-center space-x-4 mt-auto"><span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter"><i className="far fa-clock mr-1.5"></i>{t.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {t.endDate?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span></div>
                               )}
                            </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
              </div>
              <div id="task-form-section" className="w-[480px] bg-[#0f172a] p-12 text-white overflow-y-auto scrollbar-hide shrink-0 shadow-[-20px_0_40px_rgba(0,0,0,0.1)]">
                 <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center space-x-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl ${editingTaskId ? 'bg-amber-500' : 'bg-indigo-600 animate-pulse shadow-indigo-500/20'}`}><i className={`fas ${editingTaskId ? 'fa-edit' : 'fa-plus'} text-lg`}></i></div>
                      <div><h3 className="text-2xl font-black tracking-tight leading-none">{editingTaskId ? 'Edit Task' : 'Add Task'}</h3></div>
                    </div>
                 </div>
                 <form onSubmit={handleEventSubmit} className="space-y-10">
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Event Title</label><input required type="text" className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-7 py-5 font-bold text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="e.g. Buyer Consultation" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-6"><div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Time</label><input type="time" className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-7 py-5 font-bold text-white outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} /></div><div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">End Time</label><input type="time" className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-7 py-5 font-bold text-white outline-none" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} /></div></div>
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Priority Alert</label><select className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-7 py-5 font-bold text-white outline-none appearance-none cursor-pointer" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}><option value="LOW">Low Alert</option><option value="MEDIUM">Medium Alert</option><option value="HIGH">High Alert</option></select></div>
                    <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Internal Notes</label><textarea className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-7 py-5 font-black text-white outline-none min-h-[180px] resize-none transition-all text-lg" placeholder="Context for the task..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                    <div className="space-y-4 pt-6"><button type="submit" className={`w-full py-7 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center space-x-4 hover:scale-[1.02] active:scale-[0.98] ${editingTaskId ? 'bg-amber-500 text-slate-900 shadow-amber-500/10' : 'bg-indigo-600 text-white shadow-indigo-600/20'}`}><i className={`fas ${editingTaskId ? 'fa-save' : 'fa-bolt'} text-lg`}></i><span>{editingTaskId ? 'Save Task' : 'Confirm Task'}</span></button></div>
                 </form>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-lg p-10 relative z-10 animate-in zoom-in-95 duration-200 text-[12px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Quick Entry</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-95"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleEventSubmit} className="space-y-6">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label><input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" placeholder="Follow-up call" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label><input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label><input required type="time" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} /></div></div>
              <div className="pt-6 flex space-x-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs">Discard</button><button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700">Confirm Task</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;