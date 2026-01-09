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

const INITIAL_NAV_ITEMS: any[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
  { id: 'email', label: 'Email Center', icon: 'fa-envelope' },
  { id: 'leads', label: 'Leads', icon: 'fa-users' },
  { id: 'contacts', label: 'Contacts', icon: 'fa-address-book' },
  { id: 'open-house', label: 'Open House', icon: 'fa-door-open' },
  { id: 'documents', label: 'Training Center', icon: 'fa-graduation-cap' },
  { id: 'pipeline', label: 'Transactions', icon: 'fa-file-invoice-dollar' },
  { id: 'reports', label: 'Reports', icon: 'fa-chart-line', roleRestriction: UserRole.BROKER },
  { id: 'calendar', label: 'Calendar', icon: 'fa-calendar-alt' },
  { id: 'tasks', label: 'Tasks', icon: 'fa-check-circle' },
  { id: 'trash', label: 'Trash Bin', icon: 'fa-trash-can', roleRestriction: UserRole.BROKER },
  { id: 'team', label: 'Team', icon: 'fa-users-gear', roleRestriction: UserRole.BROKER },
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
  const [openHouses, setOpenHouses] = useState<OpenHouse[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [goals, setGoals] = useState<YearlyGoal[]>([]);
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [view, setView] = useState<string>('dashboard');
  const [activeInvitation, setActiveInvitation] = useState<BrokerageInvite | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

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

  // FIXED: Corrected syntax using 'l' and 't' variables and fixed missing closing bracket
  const activeUsers = useMemo(() => users.filter(u => !u.isDeleted), [users]);
  
  const accessibleLeads = useMemo(() => 
    (currentUser?.role === UserRole.BROKER ? leads : leads.filter(l => 
      l.assignedAgentId === currentUser?.id)).filter(l => !l.isDeleted), 
    [leads, currentUser]
  );

  const accessibleTasks = useMemo(() => 
    (currentUser?.role === UserRole.BROKER ? tasks : tasks.filter(t => 
      t.assignedUserId === currentUser?.id)), 
    [tasks, currentUser]
  );

  const renderContent = () => {
    if (!currentUser) return null;
    
    // Security check: Agents trying to access Broker-only views are redirected
    if (currentUser.role === UserRole.AGENT && (view === 'team' || view === 'reports')) {
        return <Dashboard leads={accessibleLeads} user={currentUser} agents={activeUsers} deals={deals} tasks={accessibleTasks} openHouses={openHouses} onNavigate={setView} />;
    }

    switch (view) {
      case 'dashboard': return <Dashboard leads={accessibleLeads} user={currentUser} agents={activeUsers} deals={deals} tasks={accessibleTasks} openHouses={openHouses} onNavigate={setView} />;
      case 'team': return <TeamView users={activeUsers} currentUser={currentUser} />;
      case 'leads': return <LeadList leads={accessibleLeads} onSelectLead={(l: Lead) => setView('dashboard')} />;
      case 'profile': return <ProfileView user={currentUser} brokerage={brokerage!} onUpdate={setCurrentUser} />;
      default: return <Dashboard leads={accessibleLeads} user={currentUser} agents={activeUsers} deals={deals} tasks={accessibleTasks} openHouses={openHouses} onNavigate={setView} />;
    }
  };

  if (isCheckingAuth) return <div className="fixed inset-0 bg-slate-900 flex items-center justify-center text-white">Loading Agent Desk 360...</div>;

  if (activeInvitation) return <JoinView invitation={activeInvitation} onComplete={() => window.location.reload()} />;

  if (!isAuthenticated) {
    return authView === 'signup' ? 
      <SignupView onSignupSuccess={() => setIsAuthenticated(true)} onNavigateToLogin={() => setAuthView('login')} /> : 
      <LoginView onLoginSuccess={() => setIsAuthenticated(true)} onNavigateToSignup={() =>