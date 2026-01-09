import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, Lead, Brokerage, Task, Deal, OpenHouse, EmailMessage, YearlyGoal, SharedFolder, SharedDocument } from './types.ts';
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

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [brokerage, setBrokerage] = useState<Brokerage | null>(null);
  const [activeUsers, setActiveUsers] = useState<User[]>([]); // Real database users
  const [view, setView] = useState<string>('dashboard');
  const [activeInvitation, setActiveInvitation] = useState<BrokerageInvite | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  // Load Real Data from Supabase
  const refreshTeamData = async (brokerId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('brokerage_id', brokerId)
      .eq('is_deleted', false);
    
    if (data) {
      const formattedUsers: User[] = data.map(u => ({
        id: u.id,
        brokerageId: u.brokerage_id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        role: u.role as UserRole,
        isDeleted: u.is_deleted
      }));
      setActiveUsers(formattedUsers);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const brokerageData = await authService.getBrokerage(user.brokerageId);
        setBrokerage(brokerageData);
        setIsAuthenticated(true);
        refreshTeamData(user.brokerageId); // Load real team members
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await authService.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const renderContent = () => {
    if (!currentUser || !brokerage) return null;
    
    // Logic to prevent agents from seeing certain views
    if (currentUser.role === UserRole.AGENT && (view === 'team' || view === 'reports')) {
      return <Dashboard user={currentUser} role={currentUser.role} />;
    }

    switch (view) {
      case 'dashboard': return <Dashboard user={currentUser} agents={activeUsers} />;
      case 'team': return <TeamView users={activeUsers} currentUser={currentUser} />;
      case 'profile': return <ProfileView user={currentUser} onUpdate={setCurrentUser} />;
      default: return <Dashboard user={currentUser} agents={activeUsers} />;
    }
  };

  if (isCheckingAuth) return <div className="loading">Loading Agent Desk 360...</div>;

  // STEP 1: If there is an invite, show JoinView
  if (activeInvitation) return <JoinView invitation={activeInvitation} onComplete={() => window.location.reload()} />;

  // STEP 2: If not logged in, show Auth
  if (!isAuthenticated) {
    return authView === 'signup' ? 
      <SignupView onSignupSuccess={() => setIsAuthenticated(true)} onNavigateToLogin={() => setAuthView('login')} /> : 
      <LoginView onLoginSuccess={() => setIsAuthenticated(true)} onNavigateToSignup={() => setAuthView('signup')} />;
  }

  // STEP 3: If logged in but profile is missing, force JoinView
  if (!currentUser || !brokerage) return <JoinView onComplete={() => window.location.reload()} />;

  // STEP 4: Main App with Role-Based Protection
  return (
    <Layout 
      user={currentUser} 
      currentView={view} 
      setView={setView} 
      onLogout={handleLogout}
      // Disable "Switch User" for Agents
      canSwitchUser={currentUser.role === UserRole.BROKER} 
    >
      {renderContent()}
    </Layout>
  );
};

export default App;