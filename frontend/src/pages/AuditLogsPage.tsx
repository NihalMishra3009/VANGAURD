import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { AuditLog } from '../types';
import { Shield, RefreshCw, AlertCircle } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<AuditLog[]>('/audit-logs');
      setLogs(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span>Enterprise Security Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable, bank-grade ledger of system events, logins, and authorization decisions
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error ? (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-3 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      {isLoading ? 'Loading audit records...' : 'No audit records found.'}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-indigo-400">#{log.id}</td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${
                          log.action.includes('FAILED')
                            ? 'bg-red-950 text-red-400 border border-red-800/40'
                            : log.action.includes('SUCCESS')
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : 'bg-indigo-950 text-indigo-400 border border-indigo-800/40'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {log.resource_type} {log.resource_id ? `(${log.resource_id})` : ''}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {log.user_id ? `User #${log.user_id}` : 'System / Unauth'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
