import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, LogOut, User as UserIcon } from 'lucide-react';
import type { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">Administrator</span>;
      case 'CAMPAIGN_MANAGER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">Campaign Manager</span>;
      case 'SUPERVISOR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-amber-950/40 text-amber-400 border border-amber-800/60">Supervisor</span>;
      case 'HUMAN_COLLECTOR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">Human Collector</span>;
      default:
        return null;
    }
  };

  return (
    <header className="h-16 bg-[#0c0d14]/90 backdrop-blur-md border-b border-zinc-850 flex items-center justify-between px-6 z-20 shrink-0">
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-750 flex items-center justify-center shadow-md shadow-black/40">
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            VOX<span className="text-zinc-400 font-medium">GUARD</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-zinc-800/80 text-zinc-400 rounded border border-zinc-700/60">Fintech Ops</span>
          </span>
          <p className="text-[11px] text-zinc-500 font-normal">Acoustic SER & Responsible Borrower Safety Platform</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-zinc-900/80 rounded-lg border border-zinc-800 text-xs text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-mono text-[11px] text-zinc-400">Deterministic Safety Engine:</span>
          <span className="text-emerald-400 font-medium text-[11px]">ARMED</span>
        </div>

        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-zinc-800">
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-zinc-200">{user.full_name}</span>
              <div className="mt-0.5">{getRoleBadge(user.role)}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <button
              onClick={() => logout()}
              title="Logout"
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg border border-transparent hover:border-red-900/40 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
