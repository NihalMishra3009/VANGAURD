import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@voxguard.bank');
  const [password, setPassword] = useState('VoxGuard@2026');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to authenticate. Ensure the backend server is active.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleQuickFill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('VoxGuard@2026');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4 shadow-xl shadow-indigo-600/10">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            VOX<span className="text-indigo-400">GUARD</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Voice Intelligence & Responsible Collections Platform
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bank-Grade Local Security & RBAC</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Sign In to Workstation</h2>
            <p className="text-xs text-slate-400 mt-1">Enter your authorized enterprise credentials</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-3 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Official Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="analyst@voxguard.bank"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-Fill Sample Roles */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Quick Role Simulation Login
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleRoleQuickFill('admin@voxguard.bank')}
                className="p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 rounded-lg text-left transition-all cursor-pointer"
              >
                <div className="font-semibold text-red-400">Admin</div>
                <div className="text-[10px] text-slate-500 truncate">admin@voxguard.bank</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleQuickFill('campaign@voxguard.bank')}
                className="p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 rounded-lg text-left transition-all cursor-pointer"
              >
                <div className="font-semibold text-blue-400">Campaign Mgr</div>
                <div className="text-[10px] text-slate-500 truncate">campaign@voxguard.bank</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleQuickFill('collector@voxguard.bank')}
                className="p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 rounded-lg text-left transition-all cursor-pointer"
              >
                <div className="font-semibold text-emerald-400">Human Collector</div>
                <div className="text-[10px] text-slate-500 truncate">collector@voxguard.bank</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleQuickFill('supervisor@voxguard.bank')}
                className="p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 rounded-lg text-left transition-all cursor-pointer"
              >
                <div className="font-semibold text-amber-400">Supervisor</div>
                <div className="text-[10px] text-slate-500 truncate">supervisor@voxguard.bank</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
          <span>Restricted Financial System — All sessions and IP access are audited</span>
        </div>
      </div>
    </div>
  );
};
