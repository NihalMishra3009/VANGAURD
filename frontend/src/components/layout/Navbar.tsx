import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, LogOut, User as UserIcon, Activity } from 'lucide-react';
import type { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-800/60">Administrator</span>;
      case 'CAMPAIGN_MANAGER':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-800/60">Campaign Manager</span>;
      case 'SUPERVISOR':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800/60">Supervisor</span>;
      case 'HUMAN_COLLECTOR':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">Human Collector</span>;
      default:
        return null;
    }
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 z-20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            VOX<span className="text-indigo-400">GUARD</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 rounded border border-indigo-500/20">v1.0 Bank</span>
          </span>
          <p className="text-[11px] text-slate-400 font-medium">Voice Intelligence & Responsible Collections</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-md border border-slate-700/50 text-xs text-slate-300">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>PostgreSQL Active</span>
        </div>

        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-slate-200">{user.full_name}</span>
              <div className="mt-0.5">{getRoleBadge(user.role)}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <button
              onClick={() => logout()}
              title="Logout"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg border border-transparent hover:border-red-900/50 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
