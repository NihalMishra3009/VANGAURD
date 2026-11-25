import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { BorrowerUploadPage } from './pages/BorrowerUploadPage';
import { BorrowersPage } from './pages/BorrowersPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CampaignDetailPage } from './pages/CampaignDetailPage';
import { SimulatedCallConsole } from './pages/SimulatedCallConsole';
import { CollectorPodPage } from './pages/CollectorPodPage';
import { SupervisorMonitoringPage } from './pages/SupervisorMonitoringPage';
import { ReportingPage } from './pages/ReportingPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { AppLayout } from './components/layout/AppLayout';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Initializing VOXGUARD Environment...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentView} />;
      case 'audit-logs':
        return <AuditLogsPage />;
      case 'borrowers':
        return <BorrowersPage onNavigateToUpload={() => setCurrentView('upload')} />;
      case 'upload':
        return <BorrowerUploadPage onNavigateToBorrowers={() => setCurrentView('borrowers')} />;
      case 'campaigns':
        return (
          <CampaignsPage
            onSelectCampaign={(id) => {
              setSelectedCampaignId(id);
              setCurrentView('campaign-detail');
            }}
          />
        );
      case 'campaign-detail':
        return (
          <CampaignDetailPage
            campaignId={selectedCampaignId!}
            onBack={() => setCurrentView('campaigns')}
          />
        );
      case 'queue':
      case 'simulation':
        return (
          <SimulatedCallConsole
            campaignId={selectedCampaignId || 1}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'voice-intelligence':
        return (
          <PlaceholderPage
            title="Voice Intelligence & Acoustic Analysis"
            moduleName="Module F"
            description="Sliding audio window paralinguistic analysis (Pitch, Energy, Arousal, Valence) independent of transcripts."
            targetPhase="Phase 5 Completed Backend"
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'collector-pod':
        return <CollectorPodPage />;
      case 'supervisor':
        return <SupervisorMonitoringPage />;
      case 'reports':
        return <ReportingPage />;
      case 'security':
        return (
          <PlaceholderPage
            title="Security & User Role Governance"
            moduleName="Module A / Security"
            description="User provisioning, role definitions, password policies, and data retention controls."
            targetPhase="Phase 1 / Ongoing"
            onBack={() => setCurrentView('dashboard')}
          />
        );
      default:
        return <DashboardPage onNavigate={setCurrentView} />;
    }
  };

  return (
    <AppLayout currentView={currentView} onNavigate={setCurrentView}>
      {renderView()}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
