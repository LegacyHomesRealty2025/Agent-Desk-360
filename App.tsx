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
import SignupView from './components/SignupView.tsx';
import JoinView from './components/JoinView.tsx';
import EmailDashboard from './components/EmailDashboard.tsx';
import DocumentsView from './components/DocumentsView.tsx';
import { leadIngestionService } from './services/leadIngestionService.ts';
import { supabase } from './lib/supabase.ts';
import { authService } from './services/authService.ts';
import { invitationService, BrokerageInvite } from './services/invitationService.ts';
import BrokerAdminPanel from './components/BrokerAdminPanel.tsx';

const MOCKED_NOW = new Date('2026-01-06T09:00:00');
const TZ = 'America/Los_Angeles';
const DATA_VERSION = '1.0.8';
const STORAGE_KEYS = { VERSION: 'af_crm_version', LEADS: 'af_crm_leads', TASKS: 'af_crm_tasks', DEALS: 'af_crm_deals', OPEN_HOUSES: 'af_crm_open_houses', USERS: 'af_crm_users', EMAILS: 'af_crm_emails', SOURCES: 'af_crm_sources', TAGS: 'af_crm_tags', TRASHED_SOURCES: 'af_crm_trashed_sources', TRASHED_TAGS: 'af_crm_trashed_tags', GOALS: 'af_crm_goals', FOLDERS: 'af_crm_folders', DOCUMENTS: 'af_crm_documents' };

export interface NavItemConfig { id: string; label: string; icon: string; roleRestriction?: UserRole; }

const INITIAL_NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
  { id: 'email', label: 'Email Center', icon: 'fa-envelope' },
  { id: 'leads', label: 'Leads', icon: 'fa-users' },
  { id: 'contacts', label: 'Contacts', icon: 'fa-address-book' },
  { id: 'open-house', label: 'Open House', icon: 'fa-door-open' },
  { id: 'documents', label: 'Training Center', icon: 'fa-graduation-cap' },
  { id: 'pipeline', label: 'Transactions', icon: 'fa-file-invoice-dollar' },
  { id: 'reports', label: 'Reports', icon: 'fa-chart-line', roleRestriction: UserRole.BROKER }, // RESTRICTED
  { id: 'calendar', label: 'Calendar', icon: 'fa-calendar-alt' },
  { id: 'tasks', label: 'Tasks', icon: 'fa-check-circle' },
  { id: 'trash', label: 'Trash Bin', icon: 'fa-trash-can', roleRestriction: UserRole.BROKER }, // RESTRICTED
  { id: 'team', label: 'Team', icon: 'fa-users-gear', roleRestriction: UserRole.BROKER }, // RESTRICTED
  { id: 'profile', label: 'My Profile', icon: 'fa-user-circle' },
  { id: 'settings', label: 'Settings', icon: 'fa-cog' },
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [brokerage, setBrokerage] = useState<Brokerage | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [view, setView] = useState<string>('dashboard');
  const [activeInvitation, setActiveInvitation] = useState<BrokerageInvite | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  // LOAD REAL TEAM DATA
  const loadTeamData = async (bId: string) => {
    const { data } = await supabase.from('user_profiles').select('*').eq('brokerage_id', bId).eq('is_deleted', false);
    if (data) setUsers(data.map(u => ({ id: u.id, brokerageId: u.brokerage_id, firstName: u.first_name, lastName: u.last_name, email: u.email, role: u.role as UserRole, isDeleted: u.is_deleted })));
  };

  useEffect(() => {
    const init = async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const b = await authService.getBrokerage(user.brokerageId);
        setBrokerage(b);
        setIsAuthenticated(true);
        await loadTeamData(user.brokerageId);
      }
      setIsCheckingAuth(false);
    };
    init();
  }, []);

  // SYNTAX FIX: Using letter 'l' and 't' correctly
  const activeUsers = useMemo(() => users.filter(u => !u.isDeleted), [users]);
  const accessibleLeads = useMemo(() => 
    (currentUser?.role === UserRole.BROKER ? leads : leads.filter(l => l.assignedAgentId === currentUser?.id)).filter(l => !l.isDeleted), 
    [leads, currentUser]
  );
  const accessibleTasks = useMemo(() => 
    (currentUser?.role === UserRole.BROKER ? tasks : tasks.filter(t => t.assignedUserId === currentUser?.id)), 
    [tasks, currentUser]
  );

  const renderContent = () => {
    if (!currentUser) return null;
    // ROLE GUARD: Agents cannot see team/reports
    if (currentUser.role === UserRole.AGENT && (view === 'team' || view === 'reports')) {
        return <Dashboard user={currentUser} agents={activeUsers} leads={accessibleLeads} />;
    }
    switch (view) {
      case 'dashboard': return <Dashboard user={currentUser} agents={activeUsers} leads={accessibleLeads} />;
      case 'team': return <TeamView users={activeUsers} currentUser={currentUser} />;
      case 'profile': return <ProfileView user={currentUser} onUpdate={setCurrentUser} />;
      default: return <Dashboard user={currentUser} agents={activeUsers} leads={accessibleLeads} />;
    }
  };

  if (isCheckingAuth) return <div>Loading Agent Desk 360...</div>;
  if (activeInvitation) return <JoinView invitation={activeInvitation} onComplete={() => window.location.reload()} />;

  if (!isAuthenticated) {
    return authView === 'signup' ? 
      <SignupView onSignupSuccess={() => setIsAuthenticated(true)} onNavigateToLogin={() => setAuthView('login')} /> : 
      <LoginView onLoginSuccess={() => setIsAuthenticated(true)} onNavigateToSignup={() => setAuthView('signup')} />;
  }

  // FORCE JOINVIEW IF DATA MISSING
  if (!currentUser || !brokerage) return <JoinView onComplete={() => window.location.reload()} />;

  return (
    <Layout 
      user={currentUser} 
      currentView={view} 
      setView={setView} 
      onLogout={() => authService.signOut().then(() => setIsAuthenticated(false))}
      // HIDE SWITCHER FOR AGENTS
      onSwitchUser={currentUser.role === UserRole.BROKER ? (id) => console.log(id) : undefined}
      navItems={INITIAL_NAV_ITEMS.filter(item => !item.roleRestriction || item.roleRestriction === currentUser.role)}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;