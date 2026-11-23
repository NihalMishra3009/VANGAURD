import React from 'react';
import {
  LayoutDashboard,
  Users,
  UploadCloud,
  Megaphone,
  PhoneCall,
  Activity,
  Headphones,
  Eye,
  FileSpreadsheet,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'HUMAN_COLLECTOR', 'SUPERVISOR'] },
    { id: 'borrowers', label: 'Borrower Directory', icon: Users, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'SUPERVISOR'] },
    { id: 'upload', label: 'Excel Upload', icon: UploadCloud, roles: ['ADMIN', 'CAMPAIGN_MANAGER'] },
    { id: 'campaigns', label: 'Campaign Engine', icon: Megaphone, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'SUPERVISOR'] },
    { id: 'queue', label: 'Calling Queue', icon: PhoneCall, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'SUPERVISOR'] },
    { id: 'simulation', label: 'Live AI Calling', icon: Headphones, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'HUMAN_COLLECTOR', 'SUPERVISOR'] },
    { id: 'voice-intelligence', label: 'Voice Intelligence', icon: Activity, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'SUPERVISOR'] },
    { id: 'collector-pod', label: 'Human Collector Pod', icon: Headphones, roles: ['ADMIN', 'HUMAN_COLLECTOR', 'SUPERVISOR'] },
    { id: 'supervisor', label: 'Supervisor Monitor', icon: Eye, roles: ['ADMIN', 'SUPERVISOR'] },
    { id: 'reports', label: 'Excel Reports', icon: FileSpreadsheet, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'SUPERVISOR'] },
    { id: 'audit-logs', label: 'Audit Trail', icon: FileText, roles: ['ADMIN', 'SUPERVISOR'] },
    { id: 'security', label: 'Security & Access', icon: ShieldCheck, roles: ['ADMIN'] },
  ];

  const allowedItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-4 select-none">
      <div className="space-y-1 px-3">
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Platform Modules</p>
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="px-6 pt-4 border-t border-slate-800">
        <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Phase 1 Foundation</p>
          <p>Auth & RBAC Active</p>
          <p>PostgreSQL 17.6</p>
          <div className="pt-1 flex items-center gap-1.5 text-indigo-400 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Zero Cloud Leakage
          </div>
        </div>
      </div>
    </aside>
  );
};
