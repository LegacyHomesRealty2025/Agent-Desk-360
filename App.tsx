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
const DEFAULT_SOURCES = ['Zillow', 'Realtor.com', 'Friend', 'Broker Referral', 'Open House', 'UpNest.com', 'Website', 'Yard Sign', 'Google', 'Facebook', 'TikTok', 'Instagram', 'LinkedIn', 'Past Client'];
const DEFAULT_TAGS = ['Buyer', 'Seller', 'Investor', 'Indian', 'Fiji', 'Renter', 'VA Buyer', 'Rashmi', 'Charles', 'Builder'];
const TZ = 'America/Los_Angeles';
const DATA_VERSION = '1.0.8';
const STORAGE_KEYS = { VERSION: 'af_crm_version', LEADS: 'af_crm_leads', TASKS: 'af_crm_tasks', DEALS: 'af_crm_deals', OPEN_HOUSES: 'af_crm_open_houses', USERS: 'af_crm_users', EMAILS: 'af_crm_emails', SOURCES: 'af_crm_sources', TAGS: 'af_crm_tags', TRASHED_SOURCES: 'af_crm_trashed_sources', TRASHED_TAGS: 'af_crm_trashed_tags', GOALS: 'af_crm_goals', FOLDERS: 'af_crm_folders', DOCUMENTS: 'af_crm_documents' };

export interface NavItemConfig { id: string; label: string; icon: string; roleRestriction?: UserRole; }
export interface NotificationItem { id: string; title: string; description: string; type: 'TASK' | 'EVENT'; view: string; date?: string; }

const INITIAL_NAV_ITEMS: NavItemConfig[] = [
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
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [brokerage, setBrokerage] = useState<Brokerage | null>(null);
  const [showBrokerAdmin, setShowBrokerAdmin] = useState(false);
  const [view, setView] = useState<string>('dashboard');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activePublicOpenHouse, setActivePublicOpenHouse] = useState<OpenHouse | null>(null);
  const [navItems, setNavItems] = useState<NavItemConfig[]>(INITIAL_NAV_ITEMS);

  // CHANGED: Initialize users from real database instead of MOCK_AGENTS only
  const [users, setUsers] = useState<User[]>([]);

  // ... (Your existing state initializers for leads, tasks, deals, etc. remain here)
  const [leads, setLeads] = useState<Lead[]>(() => { const saved = localStorage.getItem(STORAGE_KEYS.LEADS); return saved ? JSON.parse(saved) : MOCK_LEADS; });
  const [tasks, setTasks] = useState<Task[]>(() => { const saved = localStorage.getItem(STORAGE_KEYS.TASKS); return saved ? JSON.parse(saved) : MOCK_TASKS; });
  const [deals, setDeals] = useState<Deal[]>(() => { const saved = localStorage.getItem(STORAGE_KEYS.DEALS); return saved ? JSON.parse(saved) : MOCK_DEALS; });
  const [openHouses, setOpenHouses] = useState<OpenHouse[]>(() => { const saved = localStorage.getItem(STORAGE_KEYS.OPEN_HOUSES); return saved ? JSON.parse(saved) : MOCK_OPEN_HOUSES; });
  const [emails, setEmails] = useState<EmailMessage[]>(() => { const saved = localStorage.getItem(STORAGE_KEYS.EMAILS); return saved ? JSON.parse(saved) : MOCK_EMAILS; });
  const [goals, setGoals] = useState<YearlyGoal[]>(() => { const saved = localStorage.getItem(STORAGE_KEYS.GOALS); return saved ? JSON.parse(saved) : MOCK_GOALS; });
  const [folders, setFolders] = useState<SharedFolder[]>(() => { const saved = localStorage.getItem(STORAGE_KEYS.FOLDERS); return saved ? JSON.parse(saved) : MOCK_SHARED_FOLDERS; });
  const [documents, setDocuments] = useState<SharedDocument[]>(() => { const saved = localStorage.getItem(STORAGE_KEYS.DOCUMENTS); return saved ? JSON.parse(saved) : MOCK_SHARED_DOCUMENTS; });
  const [sources, setSources] = useState<string[]>(() => { const saved = localStorage.getItem(STORAGE_KEYS.SOURCES); return saved ? JSON.parse(saved) : DEFAULT_SOURCES; });
  const [tags, setTags] = useState<string[]>(() => { const saved = localStorage.getItem(STORAGE_KEYS.TAGS); return saved ? JSON.parse(saved) : DEFAULT_TAGS; });
  const [trashedSources, setTrashedSources] = useState<TrashedMetadata[]>(() => { const saved = localStorage.getItem(STORAGE_KEYS.TRASHED_SOURCES); return saved ? JSON.parse(saved) : []; });
  const [trashedTags, setTrashedTags] = useState<TrashedMetadata[]>(() => { const saved = localStorage.getItem(STORAGE_KEYS.TRASHED_TAGS); return saved ? JSON.parse(saved) : []; });
  const [dashboardFilterId, setDashboardFilterId] = useState<string>('TEAM');
  const [activeInvitation, setActiveInvitation] = useState<BrokerageInvite | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);

  // NEW: Function to load real team members from the database
  const loadTeamMembers = async (brokerageId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('brokerage_id', brokerageId)
      .eq('is_deleted', false);
    
    if (data) {
      const dbUsers: User[] = data.map(u => ({
        id: u.id,
        brokerageId: u.brokerage_id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        role: u.role as UserRole,
        isDeleted: u.is_deleted
      }));
      setUsers(dbUsers);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setIsCheckingAuth(false); return; }

        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          const brokerageData = await authService.getBrokerage(user.brokerageId);
          setBrokerage(brokerageData);
          setIsAuthenticated(true);
          await loadTeamMembers(user.brokerageId); // Load real team
        } else {
          await supabase.auth.signOut();
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // ROLE PROTECTION: Filter content based on logged-in user role
  const activeUsers = useMemo(() => users.filter(u => !u.isDeleted), [users]);
  const accessibleLeads = useMemo(() => (currentUser?.role === UserRole.BROKER ? leads : leads.filter(l => l.assignedAgentId === currentUser?.id)).filter(l => !l.isDeleted), [leads, currentUser]);
  const accessibleTasks = useMemo(() => (currentUser?.role === UserRole.BROKER ? tasks : tasks.filter(t =>