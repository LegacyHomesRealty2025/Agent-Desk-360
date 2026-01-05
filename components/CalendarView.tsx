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

  const legendItems = [
    { label: 'Birthday', color: 'bg-pink-400' },
    { label: 'Wedding', color: 'bg-indigo-400' },
    { label: 'Home Anniv.', color: 'bg-emerald-400' },
    { label: 'High Priority', color: 'bg-rose-500' },
    { label: 'Medium', color: 'bg-orange-500' },
    { label: 'Low', color: 'bg-slate-400' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 relative">
      {/* Sidebar Restored */}
      <div className="w-full lg:w-72 space-y-6 shrink-0">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center tracking-tight">
            <i className="fas fa-bullseye text-indigo-500 mr-3 text-sm"></i>
            Quick Milestones
          </h3>
          <div className="space-y-6">
            {events
              .filter(e => e.date >= now)
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, 6)
              .map(e => (
                <div key={e.id} className="flex items-start space-x-4 group cursor-pointer" onClick={() => e.type !== 'TASK' && onSelectLead?.(e.originalItem as Lead)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-110 ${getEventStyles(e)}`}>
                    <i className={`fas ${getEventIcon(e.type)} text-xs`}></i>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight truncate">{e.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      {e.date.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
           <h4 className="font-black text-xs uppercase tracking-widest mb-3 flex items-center"><i className="fas fa-magic mr-2 text-indigo-400"></i>AI Insights</h4>
           <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
             Schedule analysis complete. You have <span className="text-white font-black">{timedTasks.length} tasks</span> today. Priorities identified.
           </p>
        </div>
      </div>

      {/* Main Calendar View */}
      <div className="flex-1 bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[850px]">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
              {monthNames[month]} <span className="text-slate-400 font-normal">{year}</span>
            </h2>
            <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-500 transition-all"><i className="fas fa-chevron-left text-xs"></i></button>
              <button onClick={today} className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 transition-all">Today</button>
              <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-500 transition-all"><i className="fas fa-chevron-right text-xs"></i></button>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
               <button onClick={zoomOut} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-md text-slate-500 hover:text-indigo-600 transition-all"><i className="fas fa-search-minus text-xs"></i></button>
               <span className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[60px] text-center">{Math.round(zoomLevel * 100)}%</span>
               <button onClick={zoomIn} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-md text-slate-500 hover:text-indigo-600 transition-all"><i className="fas fa-search-plus text-xs"></i></button>
            </div>
            <div className="hidden xl:flex items-center space-x-5 bg-slate-50 px-6 py-3 rounded-[1.5rem] border border-slate-100 shadow-sm">
               {legendItems.map((item, idx) => (
                 <div key={idx} className="flex items-center space-x-2">
                   <div className={`w-2.5 h-2.5 rounded-full ${item.color} shadow-sm border border-white/50`}></div>
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                 </div>
               ))}
            </div>
            <button onClick={() => { setIsModalOpen(true); resetForm(); }} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all shrink-0 active:scale-95">
              <i className="fas fa-plus mr-2"></i> Add Task
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
            <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 tracking-[0.2em]">{d}</div>
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
                className={`p-3 border-r border-b border-slate-100 transition-all cursor-pointer ${day ? 'hover:bg-indigo-50/50 group/cell' : 'bg-slate-50/20'}`}
                style={{ minHeight: `${currentCellHeight}px` }}
              >
                {day && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`w-8 h-8 flex items-center justify-center text-sm font-black rounded-xl transition-all ${isToday ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-110' : 'text-slate-800 group-hover/cell:text-indigo-600'}`}>{day}</span>
                    </div>
                    <div className="space-y-1.5 overflow-hidden">
                      {dayEvents.slice(0, Math.max(1, Math.floor(zoomLevel * 3))).map(e => (
                        <div key={e.id} className={`px-2.5 py-1 rounded-lg text-[9px] font-black border truncate shadow-sm ${getEventStyles(e)} ${e.type === 'TASK' && (e.originalItem as Task).isCompleted ? 'opacity-30 line-through grayscale' : ''}`}>
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > Math.max(1, Math.floor(zoomLevel * 3)) && (
                        <div className="text-[9px] font-black text-indigo-500 uppercase text-center mt-1 py-1 bg-indigo-50/50 rounded-lg">+ {dayEvents.length - Math.max(1, Math.floor(zoomLevel * 3))} More</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda Detail Overlay Restored */}
      {selectedDayDetail !== null && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-in fade-in slide-in-from-bottom-6 duration-500 overflow-hidden">
           <div className="px-12 py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-xl shadow-sm z-20">
             <div className="flex items-center space-x-12">
               <div>
                 <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                   {monthNames[month]} {selectedDayDetail}, {year}
                 </h2>
                 <div className="flex items-center space-x-4 mt-1.5">
                   <span className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Agenda Management</span>
                   <div className="w-1.5 h-1.5 bg-indigo-200 rounded-full"></div>
                   <span className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">{timedTasks.length} Tasks Scheduled Today</span>
                 </div>
               </div>
               <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                 <button onClick={zoomOut} className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-md text-slate-500 hover:text-indigo-600 transition-all"><i className="fas fa-search-minus"></i></button>
                 <div className="px-6 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[70px] text-center">{Math.round(zoomLevel * 100)}%</div>
                 <button onClick={zoomIn} className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-md text-slate-500 hover:text-indigo-600 transition-all"><i className="fas fa-search-plus"></i></button>
               </div>
             </div>
             <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setSelectedDayDetail(null)} 
                  className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all flex items-center space-x-3 active:scale-95"
                >
                  <i className="fas fa-arrow-left"></i>
                  <span>Back to Month</span>
                </button>
                <button 
                  onClick={() => setSelectedDayDetail(null)} 
                  className="w-14 h-14 rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-90 flex items-center justify-center text-2xl border border-slate-100"
                >
                  <i className="fas fa-times"></i>
                </button>
             </div>
           </div>

           <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-y-auto scrollbar-hide border-r border-slate-100 bg-white relative">
                {allDayMilestones.length > 0 && (
                  <div className="p-10 bg-slate-50/50 border-b border-slate-100 space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Milestones & Special Events</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allDayMilestones.map(e => (
                        <div key={e.id} className={`p-6 rounded-[2rem] border-2 flex items-center space-x-5 transition-all hover:shadow-xl cursor-pointer ${getEventStyles(e)}`} onClick={() => onSelectLead?.(e.originalItem as Lead)}>
                          <div className="w-12 h-12 rounded-2xl bg-white/50 flex items-center justify-center text-xl shadow-sm shrink-0"><i className={`fas ${getEventIcon(e.type)}`}></i></div>
                          <span className="font-black tracking-tight text-base leading-tight">{e.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="relative" style={{ height: `${HOURS.length * currentSlotHeight}px` }}>
                   {/* Now Indicator Line Restored */}
                   {nowPos !== null && (
                     <div className="absolute left-0 right-0 z-30 pointer-events-none flex items-center" style={{ top: `${nowPos}px` }}>
                       <div className="w-24 text-right pr-6">
                         <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">Now</span>
                       </div>
                       <div className="flex-1 h-0.5 bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.5)]"></div>
                     </div>
                   )}

                   {HOURS.map(hour => (
                     <div key={hour} className="group flex border-b border-slate-100" style={{ height: `${currentSlotHeight}px` }}>
                       <div className="w-24 text-right pr-6 pt-3 text-[11px] font-black text-slate-300 uppercase whitespace-nowrap bg-white sticky left-0 z-10 select-none">
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
                            onClick={() => !isInlineEditing && handleEditTask(task)}
                            className={`absolute left-6 right-10 pointer-events-auto p-5 rounded-[1.75rem] border shadow-md transition-all hover:scale-[1.01] hover:shadow-2xl cursor-pointer group/task overflow-hidden ${task.isCompleted ? 'bg-slate-50 opacity-40 border-slate-200 grayscale' : combinedStyles}`}
                            style={{ top: `${top + 6}px`, height: `${height - 12}px`, zIndex: isInlineEditing ? 50 : 10 }}
                         >
                            <div className={`absolute left-0 top-0 bottom-0 w-2 ${task.isCompleted ? 'bg-slate-300' : pColors.bar}`}></div>
                            <div className="flex flex-col h-full">
                               <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center space-x-4 overflow-hidden">
                                     <button onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 border ${task.isCompleted ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white border-current text-slate-300 hover:text-indigo-600 hover:scale-110'}`}><i className={`fas ${task.isCompleted ? 'fa-check-circle' : 'fa-circle'} text-sm`}></i></button>
                                     <span className={`text-lg font-black tracking-tight truncate ${task.isCompleted ? 'line-through text-slate-400' : ''}`}>{t.title}</span>
                                  </div>
                               </div>
                               {isInlineEditing ? (
                                 <div className="mt-2 flex-1 flex flex-col space-y-3" onClick={e => e.stopPropagation()}>
                                   <textarea ref={inlineInputRef} value={inlineNoteValue} onChange={e => setInlineNoteValue(e.target.value)} className="flex-1 w-full bg-white/30 border-2 border-current rounded-2xl p-4 font-bold text-sm outline-none resize-none shadow-inner" />
                                   <div className="flex items-center space-x-3 justify-end">
                                      <button onClick={(e) => cancelInlineEdit(e)} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/30 text-white flex items-center justify-center transition-all border border-current"><i className="fas fa-times"></i></button>
                                      <button onClick={() => saveInlineEdit(task.id)} className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xl transition-all border border-indigo-500"><i className="fas fa-check"></i></button>
                                   </div>
                                 </div>
                               ) : (
                                 task.description ? (
                                   <p onClick={(e) => !task.isCompleted && startInlineEdit(e, task)} className={`mt-2 font-bold leading-relaxed line-clamp-3 mb-2 ${task.isCompleted ? 'text-slate-400' : 'opacity-80 hover:opacity-100 cursor-text'} text-sm transition-opacity`}>
                                     {task.description}
                                   </p>
                                 ) : (
                                   <button onClick={(e) => !task.isCompleted && startInlineEdit(e, task)} className="mt-2 text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity text-left">+ Add details...</button>
                                 )
                               )}
                               {!isInlineEditing && (
                                 <div className="flex items-center space-x-4 mt-auto">
                                   <span className="text-[10px] font-black opacity-60 uppercase tracking-widest flex items-center bg-white/20 px-3 py-1 rounded-full"><i className="far fa-clock mr-2"></i>{t.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {t.endDate?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                   <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${pColors.bg} ${pColors.text} ${pColors.border}`}>{task.priority} ALERT</span>
                                 </div>
                               )}
                            </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
              </div>

              {/* Task Form Sidebar Restored */}
              <div id="task-form-section" className="w-[520px] bg-[#0f172a] p-16 text-white overflow-y-auto scrollbar-hide shrink-0 shadow-[-30px_0_60px_rgba(0,0,0,0.3)] relative">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                 <div className="flex items-center justify-between mb-16 relative z-10">
                    <div className="flex items-center space-x-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl ${editingTaskId ? 'bg-amber-500 text-slate-900' : 'bg-indigo-600 animate-pulse text-white shadow-indigo-500/30'}`}><i className={`fas ${editingTaskId ? 'fa-edit' : 'fa-plus'} text-xl`}></i></div>
                      <div>
                        <h3 className="text-3xl font-black tracking-tight leading-none">{editingTaskId ? 'Edit Task' : 'Add Activity'}</h3>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Team Sync Protocol v1.2</p>
                      </div>
                    </div>
                 </div>

                 <form onSubmit={handleEventSubmit} className="space-y-12 relative z-10">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Event Designation</label>
                      <input required type="text" className="w-full bg-slate-800/40 border-2 border-slate-700/50 rounded-3xl px-8 py-6 text-xl font-black text-white focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none shadow-inner" placeholder="e.g. Closing Coordination" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Time Start</label>
                        <input type="time" className="w-full bg-slate-800/40 border-2 border-slate-700/50 rounded-3xl px-8 py-6 font-black text-lg text-white outline-none focus:border-indigo-500 shadow-inner" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Time End</label>
                        <input type="time" className="w-full bg-slate-800/40 border-2 border-slate-700/50 rounded-3xl px-8 py-6 font-black text-lg text-white outline-none focus:border-indigo-500 shadow-inner" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Priority Classification</label>
                      <div className="grid grid-cols-3 gap-4">
                         {(['LOW', 'MEDIUM', 'HIGH'] as Task['priority'][]).map(p => (
                           <button 
                             key={p} 
                             type="button" 
                             onClick={() => setFormData({...formData, priority: p})}
                             className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.priority === p ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-slate-800/30 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                           >
                             {p}
                           </button>
                         ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Strategic Context & Notes</label>
                      <textarea className="w-full bg-slate-800/40 border-2 border-slate-700/50 rounded-[2rem] px-8 py-8 font-bold text-white outline-none min-h-[200px] resize-none transition-all text-base focus:border-indigo-500 shadow-inner leading-relaxed" placeholder="Document interaction details and objectives..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-4">
                       <button type="submit" className={`w-full py-8 rounded-[2.5rem] font-black uppercase tracking-[0.4em] shadow-2xl transition-all flex items-center justify-center space-x-6 hover:scale-[1.02] active:scale-[0.98] ${editingTaskId ? 'bg-amber-500 text-slate-950' : 'bg-indigo-600 text-white shadow-indigo-900/50'}`}>
                          <i className={`fas ${editingTaskId ? 'fa-save' : 'fa-bolt'} text-xl`}></i>
                          <span>{editingTaskId ? 'Save Modifications' : 'Initialize Activity'}</span>
                       </button>
                       {editingTaskId && (
                          <button 
                            type="button" 
                            onClick={() => onDeleteTask?.(editingTaskId)}
                            className="w-full py-6 bg-rose-600/10 text-rose-500 rounded-[2.5rem] font-black uppercase tracking-[0.4em] hover:bg-rose-600 hover:text-white transition-all border-2 border-rose-500/20"
                          >
                            Delete Record
                          </button>
                       )}
                    </div>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* Quick Entry Modal Restored */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-200 w-full max-w-xl p-16 relative z-10 animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center space-x-5">
                  <div className="w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-100">
                    <i className="fas fa-bolt text-2xl"></i>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Quick Task</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90 flex items-center justify-center text-xl"><i className="fas fa-times"></i></button>
            </div>
            
            <form onSubmit={handleEventSubmit} className="space-y-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Matter</label>
                <input required type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-7 py-5 text-lg font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all" placeholder="Follow-up Call" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Date</label>
                   <input required type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-7 py-5 font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Start</label>
                   <input required type="time" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-7 py-5 font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                </div>
              </div>

              <div className="pt-8 flex space-x-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-6 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all hover:bg-slate-200">Discard</button>
                <button type="submit" className="flex-1 py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-98">Deploy Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;