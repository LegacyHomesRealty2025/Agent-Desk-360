import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, Lead, Brokerage, Task, LeadNote, Deal, OpenHouse, EmailMessage, TrashedMetadata, YearlyGoal, SharedFolder, SharedDocument } from './types.ts';
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
import { supabase } from './lib/supabase.ts';
import { authService } from './services/authService.ts';
import { invitationService, BrokerageInvite } from './services/invitationService.ts';
import BrokerAdminPanel from './components/BrokerAdminPanel.tsx';

const TZ = 'America/Los_Angeles';

const INITIAL_NAV_ITEMS = [
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
  const [view, setView] = useState<string>('dashboard');
  const [activeInvitation, setActiveInvitation] = useState<BrokerageInvite | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  // Load live data from the database
  const loadTeamData = async (bId: string) => {
    const { data } = await supabase.from('user_profiles').select('*').eq('brokerage_id', bId).eq('is_deleted', false);
    if (data) {
      setUsers(data.map(u => ({
        id: u.id,
        brokerageId: u.brokerage_id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        role: u.role as UserRole,
        isDeleted: u.is_deleted
      })));
    }
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

  const activeUsers = useMemo(() => users.filter(u => !u.isDeleted), [users]);
  
  // FIXED: Added notifications object to stop 'hasEvents' crash
  const notifications = useMemo(() => ({
    items: [],
    hasTasks: false,
    hasEvents: false,
    totalCount: 0
  }), []);

  const renderContent = () => {
    if (!currentUser || !brokerage) return null;
    
    // SECURITY: Blocks Agents from accessing restricted views
    if (currentUser.role === UserRole.AGENT && (view === 'team' || view === 'reports')) {
      return <Dashboard user={currentUser} agents={activeUsers} />;
    }

    switch (view) {
      case 'dashboard': return <Dashboard user={currentUser} agents={activeUsers} />;
      case 'team': return <TeamView users={activeUsers} currentUser={currentUser} />;
      case 'profile': return <ProfileView user={currentUser} brokerage={brokerage} onUpdate={setCurrentUser} />;
      default: return <Dashboard user={currentUser} agents={activeUsers} />;
    }
  };

  if (isCheckingAuth) return <div className="fixed inset-0 bg-slate-900 flex items-center justify-center text-white">Loading Agent Desk 360...</div>;

  if (activeInvitation) return <JoinView invitation={activeInvitation} onComplete={() => window.location.reload()} />;

  // FIXED: Logic for Login/Signup views (Fixed Line 128 syntax error)
  if (!isAuthenticated) {
    if (authView === 'signup') {
      return <SignupView onSignupSuccess={() => setIsAuthenticated(true)} onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} onNavigateToSignup={() => setAuthView('signup')} />;
  }

  // FORCE: Redirect to JoinView if profile is missing
  if (!currentUser || !brokerage) return <JoinView onComplete={() => window.location.reload()} />;

  return (
    <Layout 
      user={currentUser} 
      users={activeUsers}
      brokerage={brokerage}
      currentView={view} 
      setView={setView} 
      onLogout={() => authService.signOut().then(() => setIsAuthenticated(false))}
      notifications={notifications}
      // SECURITY: Disables switching for Agents and filters sidebar
      onSwitchUser={currentUser.role === UserRole.BROKER ? (id: string) => console.log('Switch to', id) : undefined}
      navItems={INITIAL_NAV_ITEMS.filter(item => !item.roleRestriction || item.roleRestriction === currentUser.role)}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;