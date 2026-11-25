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
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'HUMAN_COLLECTOR', 'SUPERVISOR'] },
    { id: 'simulation', label: 'Live AI Calling', icon: Headphones, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'HUMAN_COLLECTOR', 'SUPERVISOR'], badge: 'Live Voice' },
    { id: 'borrowers', label: 'Borrower Directory', icon: Users, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'SUPERVISOR'] },
    { id: 'campaigns', label: 'Campaign Engine', icon: Megaphone, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'SUPERVISOR'] },
    { id: 'queue', label: 'Calling Queue', icon: PhoneCall, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'SUPERVISOR'] },
    { id: 'collector-pod', label: 'Specialist Pod', icon: Headphones, roles: ['ADMIN', 'HUMAN_COLLECTOR', 'SUPERVISOR'] },
    { id: 'supervisor', label: 'Supervisor Monitor', icon: Eye, roles: ['ADMIN', 'SUPERVISOR'] },
    { id: 'upload', label: 'Data Ingestion', icon: UploadCloud, roles: ['ADMIN', 'CAMPAIGN_MANAGER'] },
    { id: 'voice-intelligence', label: 'Acoustic SER Lab', icon: Activity, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'SUPERVISOR'] },
    { id: 'reports', label: 'Audit Reports', icon: FileSpreadsheet, roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'SUPERVISOR'] },
    { id: 'audit-logs', label: 'Event Ledger', icon: FileText, roles: ['ADMIN', 'SUPERVISOR'] },
    { id: 'security', label: 'Policy Engine', icon: ShieldCheck, roles: ['ADMIN'] },
  ];

  const allowedItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-[#0c0d14] border-r border-zinc-800/80 flex flex-col justify-between py-5 select-none shrink-0">
      <div className="space-y-1.5 px-3">
        <div className="px-3 pb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Workspace</p>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">PROD-ENV</span>
        </div>
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer group ${
                isActive
                  ? 'bg-zinc-800/90 text-white border border-zinc-700/80 shadow-sm shadow-black/40'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded tracking-wide ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-4 border-t border-zinc-850">
        <div className="p-3.5 bg-zinc-900/70 rounded-xl border border-zinc-800/80 text-xs text-zinc-400 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              YUNCOX Engine
            </span>
            <span className="text-[10px] font-mono text-zinc-500">SER Baseline</span>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Deterministic safety overrides outrank AI generation. Transcript texts are not fed into SER.
          </p>
          <div className="pt-1 flex items-center justify-between border-t border-zinc-800 text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Acoustic Active
            </span>
            <span className="text-zinc-500">v1.2</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
