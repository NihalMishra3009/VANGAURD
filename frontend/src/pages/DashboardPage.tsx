import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Shield,
  Users,
  Megaphone,
  PhoneCall,
  Activity,
  Database,
  Lock,
  ArrowUpRight,
  Headphones
} from 'lucide-react';

export const DashboardPage: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [readiness, setReadiness] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/readiness');
        setReadiness(res.data);
      } catch (err) {
        console.error('Failed to fetch readiness', err);
      }
    };
    fetchStatus();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-900/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold">Banking Command Center</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-emerald-400 font-medium">Phase 1 Operational</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.full_name}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            VOXGUARD paralinguistic voice intelligence and responsible debt collection operations.
            Logged in as <strong className="text-indigo-300">{user?.role}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('simulation')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Headphones className="w-4 h-4" />
            <span>Launch Simulation</span>
          </button>
        </div>
      </div>

      {/* Core System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">PostgreSQL Status</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-white mt-2">
            {readiness?.database === 'connected' ? 'Connected (v17.6)' : 'Connecting...'}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>14 Normalized Tables Active</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Voice Intelligence Pipeline</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-lg font-bold text-white mt-2">Acoustic First</p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-indigo-400">
            <span>Independent of Transcript</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Safety Decision Layer 1</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg font-bold text-white mt-2">Deterministic Guard</p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <span>Auto-escalate on distress</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Access Governance</span>
            <Lock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-lg font-bold text-white mt-2">RBAC Enforced</p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-blue-400">
            <span>Audit trails logged</span>
          </div>
        </div>
      </div>

      {/* Module Navigation Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <span>Enterprise Modules Overview</span>
          <span className="text-xs text-slate-500 font-normal">Click any card to navigate</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate('borrowers')}
            className="p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Users className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
              Module B — Borrower Management
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Upload Excel/CSV sheets, validate phone & loan details, deduplicate records, and verify calling eligibility.
            </p>
          </div>

          <div
            onClick={() => onNavigate('campaigns')}
            className="p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Megaphone className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
              Module C — Campaign Engine
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Organize borrower batches into targeted collection campaigns, configure retry policies, and manage calling queues.
            </p>
          </div>

          <div
            onClick={() => onNavigate('simulation')}
            className="p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <PhoneCall className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
              Module D — Simulated AI Calling
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Browser-based interactive microphone/speaker AI calling with real-time waveform visualizers and safety monitoring.
            </p>
          </div>

          <div
            onClick={() => onNavigate('voice-intelligence')}
            className="p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Activity className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
              Module F — Paralinguistic Intelligence
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Independent acoustic feature extraction: pitch, energy, speaking rate, arousal & valence modeling across sliding windows.
            </p>
          </div>

          <div
            onClick={() => onNavigate('collector-pod')}
            className="p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Headphones className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
              Module I — Human Handoff Pod
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Collector workstation receiving seamless escalations from the safety engine with full borrower dialogue and acoustic context.
            </p>
          </div>

          <div
            onClick={() => onNavigate('audit-logs')}
            className="p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                <Shield className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
              Module A — Security & Audit Logs
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Immutable audit ledger capturing authentication events, role escalations, borrower data operations, and overrides.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
