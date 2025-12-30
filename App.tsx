import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, Lead, Brokerage, Task, LeadNote, Deal, OpenHouse } from './types';
import { MOCK_BROKER, MOCK_AGENTS, MOCK_BROKERAGE, MOCK_LEADS, MOCK_TASKS, MOCK_DEALS, MOCK_OPEN_HOUSES } from './mockData';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LeadList from './components/LeadList';
import ContactList from './components/ContactList';
import LeadDetail from './components/LeadDetail';
import TaskList from './components/TaskList';
import CalendarView from './components/CalendarView';
import PipelineView from './components/PipelineView';
import SettingsView from './components/SettingsView';
import ReportsView from './components/ReportsView';
import TrashView from './components/TrashView';
import OpenHouseView from './components/OpenHouseView';
import OpenHousePublicForm from './components/OpenHousePublicForm';
import TeamView from './components/TeamView';
import ProfileView from './components/ProfileView';
import MarketingView from './components/MarketingView';
import LoginView from './components/LoginView';
import JoinView from './components/JoinView';
import { leadIngestionService } from './services/leadIngestionService';

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

// LocalStorage Keys & Versioning
const DATA_VERSION = '1.0.2'; // Incrementing this forces a local storage reset
const STORAGE_KEYS = {
  VERSION: 'af_crm_version',
  LEADS: 'af_crm_leads',
  TASKS: 'af_crm_tasks',
  DEALS: 'af_crm_deals',
  OPEN_HOUSES: 'af_crm_open_houses',
  USERS: 'af_crm_users'
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
  { id: 'leads', label: 'Lead Pipeline', icon: 'fa-users' },
  { id: 'contacts', label: 'Contacts', icon: 'fa-address-book' },
  { id: 'marketing', label: 'Marketing Hub', icon: 'fa-wand-magic-sparkles' },
  { id: 'open-house', label: 'Open House', icon: 'fa-door-open' },
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
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  
  // Data State with Persistence (Simulated Backend)
  // Logic: If version mismatch, force reset to the requested 5-item mock data
  const [users, setUsers] = useState<User[]>(() => {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (savedVersion !== DATA_VERSION) return [MOCK_BROKER, ...MOCK_AGENTS];
    return saved ? JSON.parse(saved) : [MOCK_BROKER, ...MOCK_AGENTS];
  });
  
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

  // Persist State to LocalStorage (The "Database")
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEYS.DEALS, JSON.stringify(deals));
    localStorage.setItem(STORAGE_KEYS.OPEN_HOUSES, JSON.stringify(openHouses));
  }, [users, leads, tasks, deals, openHouses]);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return users.find(u => u.role === UserRole.BROKER) || users[0];
  });

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [brokerage, setBrokerage] = useState<Brokerage | null>(MOCK_BROKERAGE);
  const [view, setView] = useState<string>('dashboard');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activePublicOpenHouse, setActivePublicOpenHouse] = useState<OpenHouse | null>(null);

  const [navItems, setNavItems] = useState<NavItemConfig[]>(INITIAL_NAV_ITEMS);

  // Derived selected lead to ensure UI reflects the latest state in the list
  const selectedLead = useMemo(() => 
    leads.find(l => l.id === selectedLeadId) || null, 
    [leads, selectedLeadId]
  );

  // Notification Calculation
  const notifications = useMemo(() => {
    if (!currentUser) return { items: [], hasTasks: false, hasEvents: false, totalCount: 0 };
    
    const laNow = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
    const todayStr = laNow.toISOString().split('T')[0];

    const isTodayMD = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: TZ }));
      return d.getMonth() === laNow.getMonth() && d.getDate() === laNow.getDate();
    };

    const myTasks = currentUser.role === UserRole.BROKER ? tasks : tasks.filter(t => t.assignedUserId === currentUser.id);
    const myLeads = currentUser.role === UserRole.BROKER ? leads : leads.filter(l => l.assignedAgentId === currentUser.id);

    const notificationItems: NotificationItem[] = [];

    const pendingTasks = myTasks.filter(t => !t.isCompleted && t.dueDate.split('T')[0] <= todayStr);
    pendingTasks.forEach(t => {
      notificationItems.push({
        id: `nt-task-${t.id}`,
        title: t.title,
        description: t.dueDate.split('T')[0] < todayStr ? 'Overdue Task' : 'Due Today',
        type: 'TASK',
        view: 'tasks'
      });
    });
    
    const activeMilestoneLeads = myLeads.filter(l => !l.isDeleted && (isTodayMD(l.dob) || isTodayMD(l.weddingAnniversary) || isTodayMD(l.homeAnniversary)));
    activeMilestoneLeads.forEach(l => {
      let milestoneType = '';
      if (isTodayMD(l.dob)) milestoneType = "Birthday";
      else if (isTodayMD(l.weddingAnniversary)) milestoneType = "Wedding Anniversary";
      else if (isTodayMD(l.homeAnniversary)) milestoneType = "Home Anniversary";

      notificationItems.push({
        id: `nt-lead-${l.id}`,
        title: `${l.firstName} ${l.lastName}`,
        description: `${milestoneType} Today`,
        type: 'EVENT',
        view: 'calendar'
      });
    });

    return {
      items: notificationItems,
      hasTasks: pendingTasks.length > 0,
      hasEvents: activeMilestoneLeads.length > 0,
      totalCount: notificationItems.length
    };
  }, [tasks, leads, currentUser]);

  const inviteId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite');
  }, []);

  const activeInvitation = useMemo(() => {
    return invitations.find(i => i.id === inviteId);
  }, [invitations, inviteId]);

  useEffect(() => {
    const laNow = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
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

  const activeUsers = useMemo(() => users.filter(u => !u.isDeleted), [users]);
  const trashedUsers = useMemo(() => users.filter(u => u.isDeleted), [users]);

  const accessibleLeads = useMemo(() => (currentUser?.role === UserRole.BROKER 
    ? leads 
    : leads.filter(l => l.assignedAgentId === currentUser?.id)).filter(l => !l.isDeleted), [leads, currentUser]);

  const accessibleTasks = useMemo(() => (currentUser?.role === UserRole.BROKER
    ? tasks
    : tasks.filter(t => t.assignedUserId === currentUser?.id)), [tasks, currentUser]);

  const accessibleDeals = useMemo(() => (currentUser?.role === UserRole.BROKER
    ? deals
    : deals.filter(d => d.assignedUserId === currentUser?.id)).filter(d => !d.isDeleted), [deals, currentUser]);

  const accessibleOpenHouses = useMemo(() => (currentUser?.role === UserRole.BROKER
    ? openHouses
    : openHouses.filter(oh => oh.assignedAgentId === currentUser?.id)).filter(oh => !oh.isDeleted), [openHouses, currentUser]);

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
      setOpenHouses(prev => prev.map(oh => oh.id === activePublicOpenHouse.id ? { ...oh, visitorCount: oh.visitorCount + 1 } : oh));
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

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('dashboard');
  };

  const handleInviteAgent = (email: string, role: UserRole) => {
    const newInvite: Invitation = {
      id: `inv_${Date.now()}`,
      email,
      role,
      createdAt: new Date().toISOString()
    };
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

  const renderContent = () => {
    if (!currentUser || !brokerage) return <div>Loading...</div>;

    switch (view) {
      case 'dashboard': return <Dashboard leads={accessibleLeads} user={currentUser} agents={activeUsers} deals={accessibleDeals} tasks={accessibleTasks} openHouses={accessibleOpenHouses} onNavigate={setView} onInviteUser={handleInviteAgent} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      case 'open-house': return <OpenHouseView openHouses={accessibleOpenHouses} agents={activeUsers} currentUser={currentUser} onCreate={oh => setOpenHouses(prev => [oh, ...prev])} onUpdate={updated => setOpenHouses(prev => prev.map(oh => oh.id === updated.id ? updated : oh))} onDelete={id => setOpenHouses(prev => prev.map(oh => oh.id === id ? { ...oh, isDeleted: true, deletedAt: new Date().toISOString() } : oh))} onPreviewPublic={oh => setActivePublicOpenHouse(oh)} />;
      case 'leads': return <LeadList leads={accessibleLeads} onSelectLead={l => { setSelectedLeadId(l.id); setView('lead-detail'); }} onAddLeads={newLeads => setLeads(prev => [...newLeads, ...prev])} onUpdateLead={updated => setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))} onBulkUpdateLeads={handleBulkUpdateLeads} availableSources={DEFAULT_SOURCES} availableTags={DEFAULT_TAGS} onUpdateSources={() => {}} onUpdateTags={() => {}} />;
      case 'contacts': return <ContactList leads={accessibleLeads} onSelectLead={l => { setSelectedLeadId(l.id); setView('lead-detail'); }} onUpdateLead={updated => setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))} onBulkUpdateLeads={handleBulkUpdateLeads} onAddLeads={newLeads => setLeads(prev => [...newLeads, ...prev])} availableSources={DEFAULT_SOURCES} availableTags={DEFAULT_TAGS} onUpdateSources={() => {}} onUpdateTags={() => {}} />;
      case 'marketing': return <MarketingView currentUser={currentUser} brokerage={brokerage} leads={accessibleLeads} deals={accessibleDeals} agents={activeUsers} />;
      case 'pipeline': return <PipelineView deals={accessibleDeals} leads={accessibleLeads} onAddDeal={d => setDeals(prev => [d, ...prev])} onUpdateDeal={(id, u) => setDeals(prev => prev.map(d => d.id === id ? {...d, ...u} : d))} onDeleteDeal={id => setDeals(prev => prev.map(d => d.id === id ? {...d, isDeleted: true, deletedAt: new Date().toISOString()} : d))} availableSources={DEFAULT_SOURCES} />;
      case 'reports': return <ReportsView leads={leads} deals={deals} agents={activeUsers} currentUser={currentUser} />;
      case 'calendar': return <CalendarView leads={accessibleLeads} tasks={accessibleTasks} onSelectLead={l => { setSelectedLeadId(l.id); setView('lead-detail'); }} onAddTask={t => setTasks(prev => [t, ...prev])} onUpdateTask={(id, u) => setTasks(prev => prev.map(t => t.id === id ? {...t, ...u} : t))} onDeleteTask={id => setTasks(prev => prev.filter(t => t.id !== id))} onUpdateLead={u => setLeads(prev => prev.map(l => l.id === u.id ? u : l))} user={currentUser} />;
      case 'lead-detail': return selectedLead ? <LeadDetail lead={selectedLead} user={currentUser} onBack={() => setView('contacts')} onAddNote={(id, c) => { const note: LeadNote = { id: `n_${Date.now()}`, content: c, createdAt: new Date().toISOString(), authorId: currentUser.id, authorName: `${currentUser.firstName} ${currentUser.lastName}` }; setLeads(prev => prev.map(l => l.id === id ? {...l, notes: [note, ...l.notes]} : l)); }} onUpdateLead={u => setLeads(prev => prev.map(l => l.id === u.id ? u : l))} availableSources={DEFAULT_SOURCES} availableTags={DEFAULT_TAGS} /> : <Dashboard leads={accessibleLeads} user={currentUser} agents={activeUsers} deals={accessibleDeals} tasks={accessibleTasks} openHouses={accessibleOpenHouses} onNavigate={setView} onInviteUser={handleInviteAgent} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      case 'tasks': return <TaskList tasks={accessibleTasks} leads={accessibleLeads} user={currentUser} onAddTask={t => setTasks(prev => [t, ...prev])} onUpdateTask={(id, u) => setTasks(prev => prev.map(t => t.id === id ? {...t, ...u} : t))} onDeleteTask={id => setTasks(prev => prev.filter(t => t.id !== id))} />;
      case 'trash': return <TrashView leads={leads.filter(l => l.isDeleted)} deals={deals.filter(d => d.isDeleted)} openHouses={openHouses.filter(oh => oh.isDeleted)} users={trashedUsers} trashedSources={[]} trashedTags={[]} onRestoreLead={id => setLeads(prev => prev.map(l => l.id === id ? {...l, isDeleted: false} : l))} onRestoreDeal={id => setDeals(prev => prev.map(d => d.id === id ? {...d, isDeleted: false} : d))} onRestoreOpenHouse={id => setOpenHouses(prev => prev.map(oh => oh.id === id ? { ...oh, isDeleted: false } : oh))} onRestoreUser={id => setUsers(prev => prev.map(u => u.id === id ? {...u, isDeleted: false} : u))} onRestoreSource={() => {}} onRestoreTag={() => {}} onBulkRestoreLeads={ids => setLeads(prev => prev.map(l => ids.includes(l.id) ? {...l, isDeleted: false} : l))} onBulkRestoreDeals={ids => setDeals(prev => prev.map(d => ids.includes(d.id) ? {...d, isDeleted: false} : d))} onBulkRestoreOpenHouses={ids => setOpenHouses(prev => prev.map(oh => ids.includes(oh.id) ? { ...oh, isDeleted: false } : oh))} onPermanentDeleteLead={id => setLeads(prev => prev.filter(l => l.id !== id))} onPermanentDeleteDeal={id => setDeals(prev => prev.filter(d => d.id !== id))} onPermanentDeleteOpenHouse={id => setOpenHouses(prev => prev.filter(oh => oh.id !== id))} onPermanentDeleteUser={id => setUsers(prev => prev.filter(u => u.id !== id))} onPermanentDeleteSource={() => {}} onPermanentDeleteTag={() => {}} onBulkPermanentDeleteLeads={ids => setLeads(prev => prev.filter(l => !ids.includes(l.id)))} onBulkPermanentDeleteDeals={ids => setDeals(prev => prev.filter(d => !ids.includes(d.id)))} onBulkPermanentDeleteOpenHouses={ids => setOpenHouses(prev => prev.filter(oh => !ids.includes(oh.id)))} />;
      case 'settings': return <SettingsView availableSources={DEFAULT_SOURCES} availableTags={DEFAULT_TAGS} onUpdateSources={() => {}} onUpdateTags={() => {}} onTrashSource={() => {}} onTrashTag={() => {}} navItems={navItems} onUpdateNavItems={setNavItems} brokerage={brokerage} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      case 'profile': return <ProfileView user={currentUser} brokerage={brokerage} onUpdate={handleUpdateSelf} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      case 'team': return (
        <TeamView 
          users={activeUsers} 
          currentUser={currentUser} 
          onAddUser={u => setUsers(prev => [u, ...prev])} 
          onUpdateUser={u => setUsers(prev => prev.map(prevU => prevU.id === u.id ? u : prevU))} 
          onDeleteUser={id => setUsers(prev => prev.map(u => u.id === id ? {...u, isDeleted: true, deletedAt: new Date().toISOString()} : u))}
          onInviteUser={handleInviteAgent}
        />
      );
      default: return <Dashboard leads={accessibleLeads} user={currentUser} agents={activeUsers} deals={accessibleDeals} tasks={accessibleTasks} openHouses={accessibleOpenHouses} onNavigate={setView} onInviteUser={handleInviteAgent} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
    }
  };

  if (inviteId && activeInvitation) {
    return <JoinView invitation={activeInvitation} brokerage={brokerage!} onComplete={handleJoinComplete} />;
  }

  if (!isAuthenticated) {
    return <LoginView users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  if (!currentUser || !brokerage) return null;
  if (activePublicOpenHouse) { const host = activeUsers.find(a => a.id === activePublicOpenHouse.assignedAgentId); return <OpenHousePublicForm openHouse={activePublicOpenHouse} onSubmit={handlePublicCheckIn} onExit={() => setActivePublicOpenHouse(null)} hostAgent={host} />; }

  return <Layout user={currentUser} users={activeUsers} brokerage={brokerage} currentView={view} setView={setView} onSwitchUser={handleSwitchUser} onLogout={handleLogout} notifications={notifications} navItems={navItems} onUpdateNavItems={setNavItems} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode}>{renderContent()}</Layout>;
};

export default App;