import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, Lead, Brokerage, Task, LeadNote, Deal, OpenHouse, EmailMessage, TrashedMetadata, YearlyGoal, SharedFolder, SharedDocument } from './types.ts';
import { MOCK_BROKER, MOCK_AGENTS, MOCK_BROKERAGE, MOCK_LEADS, MOCK_TASKS, MOCK_DEALS, MOCK_OPEN_HOUSES, MOCK_EMAILS, MOCK_GOALS, MOCK_SHARED_FOLDERS, MOCK_SHARED_DOCUMENTS } from './mockData.ts';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import LeadList from './components/LeadList.tsx';
import ContactList from './components/ContactList.tsx';
import LeadDetail from './components/LeadDetail.tsx';
import TaskList from './components/TaskList.tsx';
import CalendarView from './components/CalendarView.tsx';
import PipelineView from './components/PipelineView.tsx';
import SettingsView from './components/SettingsView.tsx';
import ReportsView from './components/ReportsView.tsx';
import TrashView from './components/TrashView.tsx';
import OpenHouseView from './components/OpenHouseView.tsx';
import OpenHousePublicForm from './components/OpenHousePublicForm.tsx';
import TeamView from './components/TeamView.tsx';
import ProfileView from './components/ProfileView.tsx';
import LoginView from './components/LoginView.tsx';
import JoinView from './components/JoinView.tsx';
import EmailDashboard from './components/EmailDashboard.tsx';
import DocumentsView from './components/DocumentsView.tsx';
import { leadIngestionService } from './services/leadIngestionService.ts';

// RESTORE CONTEXT: MOCKED SYSTEM TIME TO 12/28/2026 (Updated per request)
const MOCKED_NOW = new Date('2026-12-28T09:00:00');

const DEFAULT_SOURCES = [
  'Zillow', 'Realtor.com', 'Friend', 'Broker Referral', 'Open House', 
  'UpNest.com', 'Website', 'Yard Sign', 'Google', 'Facebook', 
  'TikTok', 'Instagram', 'LinkedIn', 'Past Client'
];

const DEFAULT_TAGS = [
  'Buyer', 'Seller', 'Investor', 'Indian', 'Fiji', 
  'Renter', 'VA Buyer', 'Rashmi', 'Charles', 'Builder'
];

const TZ = 'America/Los_Angeles';

const DATA_VERSION = '1.0.8';
const STORAGE_KEYS = {
  VERSION: 'af_crm_version',
  LEADS: 'af_crm_leads',
  TASKS: 'af_crm_tasks',
  DEALS: 'af_crm_deals',
  OPEN_HOUSES: 'af_crm_open_houses',
  USERS: 'af_crm_users',
  EMAILS: 'af_crm_emails',
  SOURCES: 'af_crm_sources',
  TAGS: 'af_crm_tags',
  TRASHED_SOURCES: 'af_crm_trashed_sources',
  TRASHED_TAGS: 'af_crm_trashed_tags',
  GOALS: 'af_crm_goals',
  FOLDERS: 'af_crm_folders',
  DOCUMENTS: 'af_crm_documents'
};

export interface NavItemConfig {
  id: string;
  label: string;
  icon: string;
  roleRestriction?: UserRole;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'TASK' | 'EVENT';
  view: string;
  date?: string;
}

const INITIAL_NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
  { id: 'email', label: 'Email Center', icon: 'fa-envelope' },
  { id: 'leads', label: 'Leads', icon: 'fa-users' },
  { id: 'contacts', label: 'Contacts', icon: 'fa-address-book' },
  { id: 'open-house', label: 'Open House', icon: 'fa-door-open' },
  { id: 'documents', label: 'Training Center', icon: 'fa-graduation-cap' },
  { id: 'pipeline', label: 'Transactions', icon: 'fa-file-invoice-dollar' },
  { id: 'reports', label: 'Reports', icon: 'fa-chart-line' },
  { id: 'calendar', label: 'Calendar', icon: 'fa-calendar-alt' },
  { id: 'tasks', label: 'Tasks', icon: 'fa-check-circle' },
  { id: 'trash', label: 'Trash Bin', icon: 'fa-trash-can' },
  { id: 'team', label: 'Team', icon: 'fa-users-gear' },
  { id: 'profile', label: 'My Profile', icon: 'fa-user-circle' },
  { id: 'settings', label: 'Settings', icon: 'fa-cog' },
];

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

const App: React.FC = () => {
  // SET TO TRUE BY DEFAULT TO BYPASS LOGIN
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  
  const [users, setUsers] = useState<User[]>(() => {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (savedVersion !== DATA_VERSION) return [MOCK_BROKER, ...MOCK_AGENTS];
    return saved ? JSON.parse(saved) : [MOCK_BROKER, ...MOCK_AGENTS];
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return users.find(u => u.role === UserRole.BROKER) || users[0];
  });

  const [brokerage, setBrokerage] = useState<Brokerage | null>(MOCK_BROKERAGE);

  const [leads, setLeads] = useState<Lead[]>(() => {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    const saved = localStorage.getItem(STORAGE_KEYS.LEADS);
    if (savedVersion !== DATA_VERSION) return MOCK_LEADS;
    return saved ? JSON.parse(saved) : MOCK_LEADS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (savedVersion !== DATA_VERSION) return MOCK_TASKS;
    return saved ? JSON.parse(saved) : MOCK_TASKS;
  });

  const [deals, setDeals] = useState<Deal[]>(() => {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    const saved = localStorage.getItem(STORAGE_KEYS.DEALS);
    if (savedVersion !== DATA_VERSION) return MOCK_DEALS;
    return saved ? JSON.parse(saved) : MOCK_DEALS;
  });

  const [openHouses, setOpenHouses] = useState<OpenHouse[]>(() => {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    const saved = localStorage.getItem(STORAGE_KEYS.OPEN_HOUSES);
    if (savedVersion !== DATA_VERSION) return MOCK_OPEN_HOUSES;
    return saved ? JSON.parse(saved) : MOCK_OPEN_HOUSES;
  });

  const [emails, setEmails] = useState<EmailMessage[]>(() => {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    const saved = localStorage.getItem(STORAGE_KEYS.EMAILS);
    if (savedVersion !== DATA_VERSION) return MOCK_EMAILS;
    return saved ? JSON.parse(saved) : MOCK_EMAILS;
  });

  const [goals, setGoals] = useState<YearlyGoal[]>(() => {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (savedVersion !== DATA_VERSION) return MOCK_GOALS;
    return saved ? JSON.parse(saved) : MOCK_GOALS;
  });

  const [folders, setFolders] = useState<SharedFolder[]>(() => {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    const saved = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    if (savedVersion !== DATA_VERSION) return MOCK_SHARED_FOLDERS;
    return saved ? JSON.parse(saved) : MOCK_SHARED_FOLDERS;
  });

  const [documents, setDocuments] = useState<SharedDocument[]>(() => {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    const saved = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    if (savedVersion !== DATA_VERSION) return MOCK_SHARED_DOCUMENTS;
    return saved ? JSON.parse(saved) : MOCK_SHARED_DOCUMENTS;
  });

  const [sources, setSources] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SOURCES);
    return saved ? JSON.parse(saved) : DEFAULT_SOURCES;
  });

  const [tags, setTags] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TAGS);
    return saved ? JSON.parse(saved) : DEFAULT_TAGS;
  });

  const [trashedSources, setTrashedSources] = useState<TrashedMetadata[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRASHED_SOURCES);
    return saved ? JSON.parse(saved) : [];
  });

  const [trashedTags, setTrashedTags] = useState<TrashedMetadata[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRASHED_TAGS);
    return saved ? JSON.parse(saved) : [];
  });

  const [dashboardFilterId, setDashboardFilterId] = useState<string>('TEAM');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [view, setView] = useState<string>('dashboard');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activePublicOpenHouse, setActivePublicOpenHouse] = useState<OpenHouse | null>(null);
  const [navItems, setNavItems] = useState<NavItemConfig[]>(INITIAL_NAV_ITEMS);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && currentUser && brokerage) {
        const mockZillowPayload = {
          contact_info: {
            first_name: "API_Ingested",
            last_name: "ZillowLead",
            email: "api.zillow@example.com",
            phone: "(555) 999-0000"
          },
          property_info: {
            address: "999 Zillow Way, Scranton, PA",
            price: "$850,000"
          },
          inquiry_id: `z_${Date.now()}`
        };

        const newLead = leadIngestionService.transformZillow(mockZillowPayload, brokerage.id, currentUser.id);
        setLeads(prev => {
          if (prev.some(l => l.email === newLead.email)) return prev;
          return [newLead, ...prev];
        });
      }
    }, 15000); 
    return () => clearTimeout(timer);
  }, [currentUser, brokerage, isAuthenticated]);

  useEffect(() => {
    const laNow = new Date(MOCKED_NOW.toLocaleString('en-US', { timeZone: TZ }));
    laNow.setHours(0, 0, 0, 0);

    setDeals(prevDeals => {
      const updatedDeals = prevDeals.map(deal => {
        if (deal.status === 'PENDING' && deal.date) {
          const dealDate = new Date(new Date(deal.date).toLocaleString('en-US', { timeZone: TZ }));
          dealDate.setHours(0, 0, 0, 0);
          if (dealDate < laNow) return { ...deal, status: 'CLOSED' as const };
        }
        return deal;
      });
      if (JSON.stringify(updatedDeals) !== JSON.stringify(prevDeals)) return updatedDeals;
      return prevDeals;
    });
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (currentUser) {
      setDashboardFilterId(currentUser.role === UserRole.BROKER ? 'TEAM' : currentUser.id);
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEYS.DEALS, JSON.stringify(deals));
    localStorage.setItem(STORAGE_KEYS.OPEN_HOUSES, JSON.stringify(openHouses));
    localStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(emails));
    localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(sources));
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
    localStorage.setItem(STORAGE_KEYS.TRASHED_SOURCES, JSON.stringify(trashedSources));
    localStorage.setItem(STORAGE_KEYS.TRASHED_TAGS, JSON.stringify(trashedTags));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
  }, [users, leads, tasks, deals, openHouses, emails, sources, tags, trashedSources, trashedTags, goals, folders, documents]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  
  const selectedLead = useMemo(() => leads.find(l => l.id === selectedLeadId) || null, [leads, selectedLeadId]);

  const notifications = useMemo(() => {
    if (!currentUser) return { items: [], hasTasks: false, hasEvents: false, totalCount: 0 };
    
    const laNow = new Date(MOCKED_NOW.toLocaleString('en-US', { timeZone: TZ }));
    const todayStr = laNow.toISOString().split('T')[0];
    
    const isTodayMD = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: TZ }));
      return d.getMonth() === laNow.getMonth() && d.getDate() === laNow.getDate();
    };

    const myTasks = currentUser.role === UserRole.BROKER ? tasks : tasks.filter(t => t.assignedUserId === currentUser.id);
    const myLeads = currentUser.role === UserRole.BROKER ? leads : leads.filter(l => l.assignedAgentId === currentUser.id);
    
    const notificationItems: NotificationItem[] = [];
    
    // REDEFINED: Only count uncompleted tasks that are due today or in the past
    const pendingTasks = myTasks.filter(t => !t.isCompleted && t.dueDate.split('T')[0] <= todayStr);
    pendingTasks.forEach(t => {
      notificationItems.push({
        id: `nt-task-${t.id}`, title: t.title, description: t.dueDate.split('T')[0] < todayStr ? 'Overdue Task' : 'Due Today', type: 'TASK', view: 'tasks'
      });
    });

    const activeMilestoneLeads = myLeads.filter(l => !l.isDeleted && (isTodayMD(l.dob) || isTodayMD(l.weddingAnniversary) || isTodayMD(l.homeAnniversary)));
    activeMilestoneLeads.forEach(l => {
      let milestoneType = '';
      if (isTodayMD(l.dob)) milestoneType = "Birthday";
      else if (isTodayMD(l.weddingAnniversary)) milestoneType = "Wedding Anniversary";
      else if (isTodayMD(l.homeAnniversary)) milestoneType = "Home Anniversary";
      notificationItems.push({
        id: `nt-lead-${l.id}`, title: `${l.firstName} ${l.lastName}`, description: `${milestoneType} Today`, type: 'EVENT', view: 'calendar'
      });
    });

    return { 
      items: notificationItems, 
      hasTasks: pendingTasks.length > 0, 
      hasEvents: activeMilestoneLeads.length > 0, 
      totalCount: notificationItems.length 
    };
  }, [tasks, leads, currentUser]);

  const inviteId = useMemo(() => new URLSearchParams(window.location.search).get('invite'), []);
  const activeInvitation = useMemo(() => invitations.find(i => i.id === inviteId), [invitations, inviteId]);

  const activeUsers = useMemo(() => users.filter(u => !u.isDeleted), [users]);
  const trashedUsers = useMemo(() => users.filter(u => u.isDeleted), [users]);
  const accessibleLeads = useMemo(() => (currentUser?.role === UserRole.BROKER ? leads : leads.filter(l => l.assignedAgentId === currentUser?.id)).filter(l => !l.isDeleted), [leads, currentUser]);
  const accessibleTasks = useMemo(() => (currentUser?.role === UserRole.BROKER ? tasks : tasks.filter(t => t.assignedUserId === currentUser?.id)), [tasks, currentUser]);
  const accessibleDeals = useMemo(() => (currentUser?.role === UserRole.BROKER ? deals : deals.filter(d => d.assignedUserId === currentUser?.id)).filter(d => !d.isDeleted), [deals, currentUser]);
  const accessibleOpenHouses = useMemo(() => (currentUser?.role === UserRole.BROKER ? openHouses : openHouses.filter(oh => oh.assignedAgentId === currentUser?.id)).filter(oh => !oh.isDeleted), [openHouses, currentUser]);
  const accessibleEmails = useMemo(() => emails.filter(e => e.recipientEmail === currentUser?.email || e.senderEmail === currentUser?.email), [emails, currentUser]);

  const handlePublicCheckIn = (newLead: Lead, newTask: Task) => {
    setLeads(prev => {
      const existingIndex = prev.findIndex(l => l.email.toLowerCase() === newLead.email.toLowerCase() || l.phone === newLead.phone);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const updatedLead = { ...existing, updatedAt: new Date().toISOString(), notes: [...newLead.notes, ...existing.notes], checkInTime: new Date().toISOString(), openHouseId: newLead.openHouseId };
        return prev.map((l, i) => i === existingIndex ? updatedLead : l);
      }
      return [newLead, ...prev];
    });
    setTasks(prev => [newTask, ...prev]);
    if (activePublicOpenHouse) {
       const updatedOh = { ...activePublicOpenHouse, visitorCount: activePublicOpenHouse.visitorCount + 1 };
       setOpenHouses(prev => prev.map(oh => oh.id === activePublicOpenHouse.id ? updatedOh : oh));
    }
  };

  const handleSwitchUser = (userId: string) => {
    const nextUser = users.find(u => u.id === userId);
    if (nextUser) {
      setSelectedLeadId(null);
      setCurrentUser(nextUser);
      setView('dashboard');
    }
  };

  const handleUpdateSelf = (updated: User) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setCurrentUser(updated);
  };

  const handleUpdateOtherUser = (updated: User) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    if (currentUser && currentUser.id === updated.id) setCurrentUser(updated);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('dashboard');
  };

  const handleInviteAgent = (email: string, role: UserRole) => {
    const newInvite: Invitation = { id: `inv_${Date.now()}`, email, role, createdAt: new Date().toISOString() };
    setInvitations(prev => [...prev, newInvite]);
    return newInvite.id;
  };

  const handleJoinComplete = (newUser: User) => {
    setUsers(prev => {
      const existingIdx = prev.findIndex(u => u.email.toLowerCase() === newUser.email.toLowerCase());
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...prev[existingIdx], ...newUser };
        return updated;
      }
      return [...prev, newUser];
    });
    setInvitations(prev => prev.filter(i => i.id !== inviteId));
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleBulkUpdateLeads = (updatedLeads: Lead[]) => {
    setLeads(prev => {
      const updatedMap = new Map(updatedLeads.map(l => [l.id, l]));
      return prev.map(l => updatedMap.get(l.id) || l);
    });
  };

  const handleSendEmail = (email: EmailMessage) => {
    setEmails(prev => [email, ...prev]);
  };

  const handleUpdateEmail = (id: string, updates: Partial<EmailMessage>) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleDeleteEmail = (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, folder: 'TRASH' as const } : e));
  };

  const handleUpdateSources = (newSources: string[]) => {
    setSources(newSources);
  };

  const handleUpdateTags = (newTags: string[]) => {
    setTags(newTags);
  };

  const handleTrashSource = (name: string) => {
    setSources(prev => prev.filter(s => s !== name));
    setTrashedSources(prev => [...prev, { name, deletedAt: new Date().toISOString() }]);
  };

  const handleRestoreSource = (name: string) => {
    setTrashedSources(prev => prev.filter(s => s.name !== name));
    if (!sources.includes(name)) setSources(prev => [...prev, name]);
  };

  const handlePermanentDeleteSource = (name: string) => {
    setTrashedSources(prev => prev.filter(s => s.name !== name));
  };

  const handleTrashTag = (name: string) => {
    setTags(prev => prev.filter(t => t !== name));
    setTrashedTags(prev => [...prev, { name, deletedAt: new Date().toISOString() }]);
  };

  const handleRestoreTag = (name: string) => {
    setTrashedTags(prev => prev.filter(t => t.name !== name));
    if (!tags.includes(name)) setTags(prev => [...prev, name]);
  };

  const handlePermanentDeleteTag = (name: string) => {
    setTrashedTags(prev => prev.filter(t => t.name !== name));
  };

  const handleUpdateGoal = (updatedGoal: YearlyGoal) => {
    setGoals(prev => {
      const existingIdx = prev.findIndex(g => g.userId === updatedGoal.userId && g.year === updatedGoal.year);
      if (existingIdx > -1) {
        return prev.map((g, i) => i === existingIdx ? updatedGoal : g);
      }
      return [...prev, updatedGoal];
    });
  };

  const renderContent = () => {
    if (!currentUser || !brokerage) return <div>Loading...</div>;
    switch (view) {
      case 'dashboard': return <Dashboard leads={accessibleLeads} user={currentUser} agents={activeUsers} deals={accessibleDeals} tasks={accessibleTasks} openHouses={accessibleOpenHouses} onNavigate={setView} onInviteUser={handleInviteAgent} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} viewingAgentId={dashboardFilterId} onSetViewingAgentId={setDashboardFilterId} goals={goals} onUpdateGoal={handleUpdateGoal} />;
      case 'email': return <EmailDashboard emails={accessibleEmails} currentUser={currentUser} onSendEmail={handleSendEmail} onUpdateEmail={handleUpdateEmail} onDeleteEmail={handleDeleteEmail} isDarkMode={isDarkMode} />;
      case 'open-house': return <OpenHouseView openHouses={accessibleOpenHouses} agents={activeUsers} currentUser={currentUser} onCreate={oh => setOpenHouses(prev => [oh, ...prev])} onUpdate={updated => setOpenHouses(prev => prev.map(oh => oh.id === updated.id ? updated : oh))} onDelete={id => setOpenHouses(prev => prev.map(oh => oh.id === id ? { ...oh, isDeleted: true, deletedAt: new Date().toISOString() } : oh))} onPreviewPublic={oh => setActivePublicOpenHouse(oh)} />;
      case 'documents': return <DocumentsView currentUser={currentUser} agents={activeUsers} brokerage={brokerage} initialFolders={folders} initialDocuments={documents} onUpdateFolders={setFolders} onUpdateDocuments={setDocuments} isDarkMode={isDarkMode} />;
      case 'leads': return <LeadList leads={accessibleLeads} onSelectLead={l => { setSelectedLeadId(l.id); setView('lead-detail'); }} onAddLeads={newLeads => setLeads(prev => [...prev, ...newLeads])} onUpdateLead={updated => setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))} onBulkUpdateLeads={handleBulkUpdateLeads} availableSources={sources} availableTags={tags} onUpdateSources={handleUpdateSources} onUpdateTags={handleUpdateTags} isDarkMode={isDarkMode} />;
      case 'contacts': return <ContactList leads={accessibleLeads} onSelectLead={l => { setSelectedLeadId(l.id); setView('lead-detail'); }} onUpdateLead={updated => setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))} onBulkUpdateLeads={handleBulkUpdateLeads} onAddLeads={newLeads => setLeads(prev => [...prev, ...newLeads])} availableSources={sources} availableTags={tags} onUpdateSources={handleUpdateSources} onUpdateTags={handleUpdateTags} isDarkMode={isDarkMode} />;
      case 'pipeline': return <PipelineView deals={accessibleDeals} leads={accessibleLeads} onAddDeal={d => setDeals(prev => [...prev, d])} onUpdateDeal={(id, u) => setDeals(prev => prev.map(item => item.id === id ? {...item, ...u} : item))} onDeleteDeal={id => setDeals(prev => prev.map(d => d.id === id ? {...d, isDeleted: true, deletedAt: new Date().toISOString()} : d))} availableSources={sources} />;
      case 'reports': return <ReportsView leads={accessibleLeads} deals={accessibleDeals} agents={activeUsers} currentUser={currentUser} isDarkMode={isDarkMode} />;
      case 'calendar': return <CalendarView leads={accessibleLeads} tasks={accessibleTasks} onSelectLead={l => { setSelectedLeadId(l.id); setView('lead-detail'); }} onAddTask={t => setTasks(prev => [...prev, t])} onUpdateTask={(id, u) => setTasks(prev => prev.map(item => item.id === id ? {...item, ...u} : item))} onDeleteTask={id => setTasks(prev => prev.filter(t => t.id !== id))} onUpdateLead={u => setLeads(prev => prev.map(l => l.id === u.id ? u : l))} user={currentUser} />;
      case 'lead-detail': return selectedLead ? <LeadDetail lead={selectedLead} user={currentUser} onBack={() => setView('contacts')} onAddNote={(id, c) => { const note: LeadNote = { id: `n_${Date.now()}`, content: c, createdAt: new Date().toISOString(), authorId: currentUser.id, authorName: `${currentUser.firstName} ${currentUser.lastName}` }; setLeads(prev => prev.map(l => l.id === id ? {...l, notes: [note, ...l.notes]} : l)); }} onUpdateLead={u => setLeads(prev => prev.map(l => l.id === u.id ? u : l))} availableSources={sources} availableTags={tags} isDarkMode={isDarkMode} /> : <Dashboard leads={accessibleLeads} user={currentUser} agents={activeUsers} deals={accessibleDeals} tasks={accessibleTasks} openHouses={accessibleOpenHouses} onNavigate={setView} onInviteUser={handleInviteAgent} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} viewingAgentId={dashboardFilterId} onSetViewingAgentId={setDashboardFilterId} goals={goals} onUpdateGoal={handleUpdateGoal} />;
      case 'tasks': return <TaskList tasks={accessibleTasks} leads={accessibleLeads} user={currentUser} onAddTask={t => setTasks(prev => [...prev, t])} onUpdateTask={(id, u) => setTasks(prev => prev.map(item => item.id === id ? {...item, ...u} : item))} onDeleteTask={id => setTasks(prev => prev.filter(t => t.id !== id))} />;
      case 'trash': return <TrashView leads={leads.filter(l => l.isDeleted)} deals={deals.filter(d => d.isDeleted)} openHouses={openHouses.filter(oh => oh.isDeleted)} users={trashedUsers} documents={documents.filter(d => d.isDeleted)} folders={folders.filter(f => f.isDeleted)} trashedSources={trashedSources} trashedTags={trashedTags} onRestoreLead={id => setLeads(prev => prev.map(l => l.id === id ? {...l, isDeleted: false} : l))} onRestoreDeal={id => setDeals(prev => prev.map(d => d.id === id ? {...d, isDeleted: false} : d))} onRestoreOpenHouse={id => setOpenHouses(prev => prev.map(oh => oh.id === id ? { ...oh, isDeleted: false } : oh))} onRestoreUser={id => setUsers(prev => prev.map(u => u.id === id ? {...u, isDeleted: false} : u))} onRestoreDocument={id => setDocuments(prev => prev.map(d => d.id === id ? { ...d, isDeleted: false } : d))} onRestoreFolder={id => setFolders(prev => prev.map(f => f.id === id ? { ...f, isDeleted: false } : f))} onRestoreSource={handleRestoreSource} onRestoreTag={handleRestoreTag} onBulkRestoreLeads={ids => setLeads(prev => prev.map(l => ids.includes(l.id) ? {...l, isDeleted: false} : l))} onBulkRestoreDeals={ids => setDeals(prev => prev.map(d => ids.includes(d.id) ? {...d, isDeleted: false} : d))} onBulkRestoreOpenHouses={ids => setOpenHouses(prev => prev.map(oh => ids.includes(oh.id) ? { ...oh, isDeleted: false } : oh))} onPermanentDeleteLead={id => setLeads(prev => prev.filter(l => l.id !== id))} onPermanentDeleteDeal={id => setDeals(prev => prev.filter(d => d.id !== id))} onPermanentDeleteOpenHouse={id => setOpenHouses(prev => prev.filter(oh => oh.id !== id))} onPermanentDeleteUser={id => setUsers(prev => prev.filter(u => u.id !== id))} onPermanentDeleteDocument={id => setDocuments(prev => prev.filter(d => d.id !== id))} onPermanentDeleteFolder={id => setFolders(prev => prev.filter(f => f.id !== id))} onPermanentDeleteSource={handlePermanentDeleteSource} onPermanentDeleteTag={handlePermanentDeleteTag} onBulkPermanentDeleteLeads={ids => setLeads(prev => prev.filter(l => !ids.includes(l.id)))} onBulkPermanentDeleteDeals={ids => setDeals(prev => prev.filter(d => !ids.includes(d.id)))} onBulkPermanentDeleteOpenHouses={ids => setOpenHouses(prev => prev.filter(oh => !ids.includes(oh.id)))} onBulkPermanentDeleteFolders={ids => setFolders(prev => prev.filter(f => !ids.includes(f.id)))} onBulkPermanentDeleteDocuments={ids => setDocuments(prev => prev.filter(d => !ids.includes(d.id)))} onBulkPermanentDeleteUsers={ids => setUsers(prev => prev.filter(u => !ids.includes(u.id)))} />;
      case 'settings': return <SettingsView availableSources={sources} availableTags={tags} onUpdateSources={handleUpdateSources} onUpdateTags={handleUpdateTags} onTrashSource={handleTrashSource} onTrashTag={handleTrashTag} navItems={navItems} onUpdateNavItems={setNavItems} brokerage={brokerage} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      case 'profile': return <ProfileView user={currentUser} brokerage={brokerage} onUpdate={handleUpdateSelf} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      case 'team': return <TeamView users={activeUsers} currentUser={currentUser} onAddUser={u => setUsers(prev => [...prev, u])} onUpdateUser={handleUpdateOtherUser} onDeleteUser={id => setUsers(prev => prev.map(u => u.id === id ? {...u, isDeleted: true, deletedAt: new Date().toISOString()} : u))} onInviteUser={handleInviteAgent} isDarkMode={isDarkMode} />;
      default: return <Dashboard leads={accessibleLeads} user={currentUser} agents={activeUsers} deals={accessibleDeals} tasks={accessibleTasks} openHouses={accessibleOpenHouses} onNavigate={setView} onInviteUser={handleInviteAgent} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} viewingAgentId={dashboardFilterId} onSetViewingAgentId={setDashboardFilterId} goals={goals} onUpdateGoal={handleUpdateGoal} />;
    }
  };

  if (inviteId && activeInvitation) return <JoinView invitation={activeInvitation} brokerage={brokerage!} onComplete={handleJoinComplete} />;
  if (!isAuthenticated) return <LoginView users={users} onLoginSuccess={handleLoginSuccess} />;
  if (!currentUser || !brokerage) return null;
  if (activePublicOpenHouse) { const host = activeUsers.find(a => a.id === activePublicOpenHouse.assignedAgentId); return <OpenHousePublicForm openHouse={activePublicOpenHouse} onSubmit={handlePublicCheckIn} onExit={() => setActivePublicOpenHouse(null)} hostAgent={host} />; }

  return <Layout user={currentUser} users={activeUsers} brokerage={brokerage} currentView={view} setView={setView} onSwitchUser={handleSwitchUser} onLogout={handleLogout} notifications={notifications} navItems={navItems} onUpdateNavItems={setNavItems} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} dashboardFilterId={dashboardFilterId} onSetDashboardFilterId={setDashboardFilterId}>{renderContent()}</Layout>;
};

export default App;