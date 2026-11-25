import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen bg-[#090a0f] flex flex-col justify-center items-center p-6 relative overflow-hidden text-zinc-100">
      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-750 mb-4 shadow-xl shadow-black/40">
            <Shield className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            VOX<span className="text-zinc-400 font-medium">GUARD</span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">v2.0</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1.5 font-normal">
            Acoustic Emotion Intelligence & Borrower Safety Platform
          </p>
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bank-Grade Local Security & RBAC Enforcement</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#0f1117] border border-zinc-800/90 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white">Sign In to Workstation</h2>
            <p className="text-xs text-zinc-400 mt-1">Enter your bank authorized credentials</p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-950/30 border border-red-800/60 flex items-start gap-3 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Official Bank Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  placeholder="analyst@voxguard.bank"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Security Passkey</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer"
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
          <div className="mt-6 pt-5 border-t border-zinc-800/80">
            <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider mb-2.5">Quick-Access Demo Persona:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleRoleQuickFill('admin@voxguard.bank')}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-left text-zinc-300 transition-colors cursor-pointer"
              >
                <div className="font-medium text-white text-[11px]">Administrator</div>
                <div className="text-[10px] text-zinc-500 font-mono">admin@voxguard.bank</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleQuickFill('collector@voxguard.bank')}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-left text-zinc-300 transition-colors cursor-pointer"
              >
                <div className="font-medium text-white text-[11px]">Human Collector</div>
                <div className="text-[10px] text-zinc-500 font-mono">collector@...</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
