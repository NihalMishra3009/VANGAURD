import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { BorrowerUploadPage } from './pages/BorrowerUploadPage';
import { BorrowersPage } from './pages/BorrowersPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CampaignDetailPage } from './pages/CampaignDetailPage';
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
        return (
          <PlaceholderPage
            title="Sequential Calling Queue"
            moduleName="Module C"
            description="Real-time sequential queue with priority dispatching and duplicate-call prevention."
            targetPhase="Phase 3 Scheduled"
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'simulation':
        return (
          <PlaceholderPage
            title="Simulated AI Calling Console"
            moduleName="Module D"
            description="Browser-based live call simulation using microphone and audio output with real-time waveform visualization."
            targetPhase="Phase 3 Scheduled"
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'voice-intelligence':
        return (
          <PlaceholderPage
            title="Voice Intelligence & Acoustic Analysis"
            moduleName="Module F"
            description="Sliding audio window paralinguistic analysis (Pitch, Energy, Arousal, Valence) independent of transcripts."
            targetPhase="Phase 5 Scheduled"
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'collector-pod':
        return (
          <PlaceholderPage
            title="Human Collector Pod"
            moduleName="Module I"
            description="Collector workstation for receiving and managing seamless live escalations from the AI calling engine."
            targetPhase="Phase 6 Scheduled"
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'supervisor':
        return (
          <PlaceholderPage
            title="Supervisor Real-Time Monitoring"
            moduleName="Module M / J"
            description="Live oversight dashboard showing active calls, borrower safety alerts, collector monitoring, and intervention controls."
            targetPhase="Phase 9 Scheduled"
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'reports':
        return (
          <PlaceholderPage
            title="Excel Banking Reports"
            moduleName="Module N"
            description="Generate multi-tab Excel workbooks covering Borrowers, Campaigns, Call History, Acoustic Voice Analysis, and Commitments."
            targetPhase="Phase 10 Scheduled"
            onBack={() => setCurrentView('dashboard')}
          />
        );
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
