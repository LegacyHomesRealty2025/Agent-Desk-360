import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task, Lead, User } from '../types';

interface TaskListProps {
  tasks: Task[];
  leads: Lead[];
  user: User;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TZ = 'America/Los_Angeles';

interface UndoState {
  type: 'COMPLETE' | 'DELETE' | 'UNCOMPLETE' | 'BULK_DELETE' | 'BULK_COMPLETE';
  tasks: Task[];
}

const TaskList: React.FC<TaskListProps> = ({ tasks, leads, user, onUpdateTask, onAddTask, onDeleteTask }) => {
  const [taskToComplete, setTaskToComplete] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // Undo State
  const [lastAction, setLastAction] = useState<UndoState | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);

  const getLAToday = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: getLAToday(),
    startTime: '10:00',
    endTime: '11:00',
    priority: 'MEDIUM' as Task['priority'],
    leadId: ''
  });

  const topRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter and Sort Logic
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Search term filtering
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(term) || 
        t.description.toLowerCase().includes(term)
      );
    }

    // Date range filtering
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(t => new Date(t.dueDate) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(t => new Date(t.dueDate) <= end);
    }

    // Sort by due date (Soonest first)
    return result.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [tasks, searchTerm, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [tasks.length, itemsPerPage, searchTerm, startDate, endDate]);

  const totalPages = Math.ceil(filteredAndSortedTasks.length / itemsPerPage);
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTasks.slice(start, start + itemsPerPage);
  }, [filteredAndSortedTasks, currentPage, itemsPerPage]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-50 text-red-600 border-red-100';
      case 'MEDIUM': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const isOverdue = (dateStr: string) => {
    const laNowStr = new Date().toLocaleDateString('en-US', { timeZone: TZ });
    const laDueStr = new Date(dateStr).toLocaleDateString('en-US', { timeZone: TZ });
    const laNow = new Date(laNowStr);
    const laDue = new Date(laDueStr);
    return laDue < laNow;
  };

  // Selection Handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedTasks.map(t => t.id));
    }
  };

  // Action Handlers
  const handleConfirmCompletion = () => {
    if (taskToComplete) {
      const task = tasks.find(t => t.id === taskToComplete);
      if (task) {
        onUpdateTask(taskToComplete, { isCompleted: true });
        triggerUndo({ type: 'COMPLETE', tasks: [task] });
      }
      setTaskToComplete(null);
    }
  };

  const handleConfirmDeletion = () => {
    if (taskToDelete) {
      const task = tasks.find(t => t.id === taskToDelete);
      if (task) {
        onDeleteTask(taskToDelete);
        triggerUndo({ type: 'DELETE', tasks: [task] });
      }
      setTaskToDelete(null);
    }
  };

  const handleBulkComplete = () => {
    const selectedTasks = tasks.filter(t => selectedIds.includes(t.id) && !t.isCompleted);
    selectedIds.forEach(id => {
      onUpdateTask(id, { isCompleted: true });
    });
    triggerUndo({ type: 'BULK_COMPLETE', tasks: selectedTasks });
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    const selectedTasks = tasks.filter(t => selectedIds.includes(t.id));
    selectedIds.forEach(id => {
      onDeleteTask(id);
    });
    triggerUndo({ type: 'BULK_DELETE', tasks: selectedTasks });
    setSelectedIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const triggerUndo = (action: UndoState) => {
    setLastAction(action);
    if (undoTimeoutRef.current) window.clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = window.setTimeout(() => {
      setLastAction(null);
    }, 8000);
  };

  const handleUndo = () => {
    if (!lastAction) return;
    if (lastAction.type === 'COMPLETE' || lastAction.type === 'BULK_COMPLETE') {
      lastAction.tasks.forEach(t => onUpdateTask(t.id, { isCompleted: false }));
    } else if (lastAction.type === 'DELETE' || lastAction.type === 'BULK_DELETE') {
      lastAction.tasks.forEach(t => onAddTask(t));
    }
    setLastAction(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const baseDate = formData.dueDate || getLAToday();
    const startIso = new Date(`${baseDate}T${formData.startTime || '10:00'}:00`).toISOString();
    const endIso = new Date(`${baseDate}T${formData.endTime || '11:00'}:00`).toISOString();

    if (editingTaskId) {
      onUpdateTask(editingTaskId, {
        title: formData.title,
        description: formData.description,
        dueDate: startIso,
        endDate: endIso,
        priority: formData.priority,
        leadId: formData.leadId || undefined,
      });
    } else {
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
    resetFormData();
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
    setClientSearchTerm('');
    setIsModalOpen(true);
  };

  const resetFormData = () => {
    setEditingTaskId(null);
    setFormData({
      title: '',
      description: '',
      dueDate: getLAToday(),
      startTime: '10:00',
      endTime: '11:00',
      priority: 'MEDIUM',
      leadId: ''
    });
    setClientSearchTerm('');
  };

  const selectedLeadInForm = useMemo(() => 
    leads.find(l => l.id === formData.leadId), 
    [leads, formData.leadId]
  );

  return (
    <div className="space-y-6 pb-20 relative" ref={topRef}>
      {/* Undo Notification Toast */}
      {lastAction && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[500] bg-slate-900 text-white px-8 py-5 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex items-center space-x-8 animate-in slide-in-from-bottom-6 duration-300">
          <div className="flex items-center space-x-4">
             <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <i className="fas fa-rotate-left"></i>
             </div>
             <p className="text-sm font-black uppercase tracking-widest">
               {lastAction.tasks.length} {lastAction.tasks.length === 1 ? 'Task' : 'Tasks'} {lastAction.type.includes('DELETE') ? 'deleted' : 'updated'}
             </p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleUndo}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all active:scale-95"
            >
              Undo Action
            </button>
            <button onClick={() => setLastAction(null)} className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white transition-colors">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Task Center</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage your operational schedule and team deliverables.</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedIds.length > 0 && (
            <div className="flex items-center bg-white border border-indigo-100 rounded-2xl p-1.5 shadow-sm animate-in zoom-in-95 duration-200">
               <button 
                 onClick={handleBulkComplete}
                 className="px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center space-x-2"
               >
                 <i className="fas fa-check-double"></i>
                 <span>Complete ({selectedIds.length})</span>
               </button>
               <button 
                 onClick={() => setIsBulkDeleteModalOpen(true)}
                 className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center space-x-2 ml-1"
               >
                 <i className="fas fa-trash-can"></i>
                 <span>Delete</span>
               </button>
            </div>
          )}
          <button 
            onClick={() => { resetFormData(); setIsModalOpen(true); }}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-3 shrink-0 active:scale-95"
          >
            <i className="fas fa-plus"></i>
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 relative group">
            <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"></i>
            <input 
              type="text" 
              placeholder="Search by title, description or client..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
            />
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center space-x-3 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 shadow-inner">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From:</span>
               <input 
                 type="date" 
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
                 className="bg-transparent border-none text-xs font-black text-slate-700 outline-none cursor-pointer"
               />
            </div>
            <div className="flex items-center space-x-3 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 shadow-inner">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To:</span>
               <input 
                 type="date" 
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
                 className="bg-transparent border-none text-xs font-black text-slate-700 outline-none cursor-pointer"
               />
            </div>
            {(searchTerm || startDate || endDate) && (
              <button 
                onClick={clearFilters}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 px-4 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Task Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-8 py-5 w-16 text-center">
                <input 
                  type="checkbox" 
                  checked={paginatedTasks.length > 0 && selectedIds.length === paginatedTasks.length}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm transition-all"
                />
              </th>
              <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Task Objective</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Due Date</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Priority</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedTasks.map(task => {
              const overdue = isOverdue(task.dueDate);
              const isSelected = selectedIds.includes(task.id);
              const associatedLead = leads.find(l => l.id === task.leadId);
              
              return (
                <tr key={task.id} className={`hover:bg-indigo-50/30 transition-all group ${isSelected ? 'bg-indigo-50/20' : ''}`}>
                  <td className="px-8 py-6 text-center">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleSelection(task.id)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm transition-all"
                    />
                  </td>
                  <td className="px-4 py-6">
                    <div className="max-w-md">
                      <p className={`text-base font-black leading-tight ${task.isCompleted ? 'text-slate-300 line-through' : 'text-slate-800'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-1.5">
                        {associatedLead && (
                          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-tighter shrink-0">
                            {associatedLead.firstName} {associatedLead.lastName}
                          </span>
                        )}
                        <p className="text-[11px] text-slate-400 font-medium truncate">{task.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                       <p className={`text-sm font-black ${overdue && !task.isCompleted ? 'text-rose-600' : 'text-slate-700'}`}>
                         {new Date(task.dueDate).toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' })}
                       </p>
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                         {new Date(task.dueDate).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' })}
                       </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-[9px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {task.isCompleted ? (
                      <span className="inline-flex items-center text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-widest">
                        <i className="fas fa-check-circle mr-2"></i> DONE
                      </span>
                    ) : (
                      <span className={`inline-flex items-center text-[10px] font-black px-3 py-1.5 rounded-xl border uppercase tracking-widest ${overdue ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                        <i className={`${overdue ? 'fas fa-exclamation-circle' : 'far fa-circle'} mr-2`}></i> {overdue ? 'OVERDUE' : 'PENDING'}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {!task.isCompleted && (
                        <button 
                          onClick={() => setTaskToComplete(task.id)}
                          className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shadow-sm"
                          title="Complete Task"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                      )}
                      <button 
                        onClick={() => handleEditTask(task)}
                        className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 shadow-sm"
                        title="Edit Task"
                      >
                        <i className="fas fa-pencil-alt text-xs"></i>
                      </button>
                      <button 
                        onClick={() => setTaskToDelete(task.id)}
                        className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm"
                        title="Delete Task"
                      >
                        <i className="fas fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginatedTasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-8 py-32 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl mb-6 shadow-inner">
                      <i className="fas fa-clipboard-list opacity-20"></i>
                    </div>
                    <p className="text-sm font-black uppercase tracking-[0.2em]">No operational tasks found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm gap-6 mt-4">
        <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl px-5 py-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-transparent border-none text-xs font-black text-slate-700 outline-none cursor-pointer"
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">per page</span>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center space-x-4">
            <button 
              disabled={currentPage === 1} 
              onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); scrollToTop(); }} 
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] px-4">
              Page {currentPage} of {totalPages || 1}
            </div>
            <button 
              disabled={currentPage >= totalPages} 
              onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); scrollToTop(); }} 
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Showing {paginatedTasks.length} of {filteredAndSortedTasks.length} tasks
          </p>
        </div>

        <button 
          onClick={scrollToTop}
          className="flex items-center space-x-3 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
        >
          <i className="fas fa-arrow-up"></i>
          <span>Back to Top</span>
        </button>
      </div>

      {/* Completion Confirmation Modal */}
      {taskToComplete && (
        <div className="fixed inset-0 z-[510] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setTaskToComplete(null)}
          ></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-md p-10 relative z-10 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-8 shadow-inner border border-emerald-100">
              <i className="fas fa-check-double"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Finalize Task?</h3>
            <p className="text-slate-500 mb-10 font-medium leading-relaxed">
              Confirming will mark this item as completed in your operational log.
            </p>
            <div className="flex items-center space-x-4 w-full">
              <button onClick={() => setTaskToComplete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={handleConfirmCompletion} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all">Complete</button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[510] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setTaskToDelete(null)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-md p-10 relative z-10 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-8 shadow-inner border border-rose-100">
              <i className="fas fa-trash-can"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Trash Item?</h3>
            <p className="text-slate-500 mb-10 font-medium leading-relaxed">The selected task will be moved to the archival storage.</p>
            <div className="flex items-center space-x-4 w-full">
              <button onClick={() => setTaskToDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">Keep It</button>
              <button onClick={handleConfirmDeletion} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all">Delete Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[510] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsBulkDeleteModalOpen(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] border border-slate-200 w-full max-w-md relative z-10 p-12 text-center animate-in zoom-in-95 duration-200">
             <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">
                <i className="fas fa-trash-can"></i>
             </div>
             <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Bulk Removal?</h3>
             <p className="text-slate-500 font-semibold leading-relaxed mb-10">
               You are about to remove <span className="text-slate-900 font-black">{selectedIds.length} selected tasks</span>. This action is reversible via the undo button.
             </p>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setIsBulkDeleteModalOpen(false)} className="py-5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                <button onClick={handleBulkDelete} className="py-5 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all">Confirm Delete</button>
             </div>
          </div>
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[520] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-2xl p-10 relative z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto scrollbar-hide text-[12px]">
            <div className="flex items-center justify-between mb-12">
               <h3 className="text-3xl font-black text-slate-800 tracking-tight">{editingTaskId ? 'Edit Objective' : 'New Operational Task'}</h3>
               <button 
                 onClick={() => setIsModalOpen(false)} 
                 className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-95"
               >
                 <i className="fas fa-times text-xl"></i>
               </button>
            </div>
            
            <form onSubmit={handleTaskSubmit} className="space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title / Summary *</label>
                <input 
                   required 
                   type="text" 
                   className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-8 py-5 text-lg font-black outline-none focus:ring-8 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500 transition-all shadow-inner" 
                   placeholder="e.g. Sign escrow documents" 
                   value={formData.title} 
                   onChange={e => setFormData({...formData, title: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Date</label>
                  <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] px-6 py-5 font-bold text-base outline-none focus:bg-white" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority Level</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] px-6 py-5 font-bold text-base outline-none appearance-none cursor-pointer focus:bg-white" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
                    <option value="LOW">Low Alert</option>
                    <option value="MEDIUM">Medium Alert</option>
                    <option value="HIGH">High Alert</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Start</label>
                  <input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] px-6 py-5 font-bold text-base outline-none focus:bg-white" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Finish</label>
                  <input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] px-6 py-5 font-bold text-base outline-none focus:bg-white" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                </div>
              </div>

              <div className="space-y-3 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Associate with Client (Optional)</label>
                {!selectedLeadInForm ? (
                  <div className="relative">
                    <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] pl-16 pr-6 py-5 font-bold text-base outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner" 
                      placeholder="Search for a contact..." 
                      value={clientSearchTerm} 
                      onChange={e => setClientSearchTerm(e.target.value)} 
                    />
                    {clientSearchTerm.trim() && (
                      <div className="absolute z-50 left-0 right-0 mt-3 bg-white border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                        {leads.filter(l => `${l.firstName} ${l.lastName}`.toLowerCase().includes(clientSearchTerm.toLowerCase())).slice(0, 10).map(l => (
                          <button key={l.id} type="button" onClick={() => { setFormData({...formData, leadId: l.id}); setClientSearchTerm(''); }} className="w-full text-left px-8 py-5 hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center space-x-5 transition-colors">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">{l.firstName[0]}{l.lastName[0]}</div>
                            <div>
                               <p className="text-sm font-black text-slate-800">{l.firstName} {l.lastName}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-indigo-50 border-2 border-indigo-100 p-6 rounded-[1.5rem] flex items-center justify-between shadow-sm animate-in zoom-in-95 duration-200">
                     <div className="flex items-center space-x-4">
                       <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-200">{selectedLeadInForm.firstName[0]}</div>
                       <div>
                         <p className="text-base font-black text-slate-900">{selectedLeadInForm.firstName} {selectedLeadInForm.lastName}</p>
                         <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedLeadInForm.email}</p>
                       </div>
                     </div>
                     <button type="button" onClick={() => setFormData({...formData, leadId: ''})} className="w-10 h-10 rounded-xl bg-white text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center shadow-sm"><i className="fas fa-times"></i></button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Procedural Notes</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-8 py-6 font-bold text-base outline-none min-h-[160px] resize-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner" placeholder="Detailed instructions for the deliverable..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="pt-8 border-t border-slate-100 flex space-x-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-6 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">Discard</button>
                <button type="submit" className="flex-1 py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                  {editingTaskId ? 'Commit Changes' : 'Confirm Objective'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;