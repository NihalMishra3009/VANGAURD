import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';

interface SupervisorAlert {
  id: string;
  collectorName: string;
  borrowerName: string;
  ruleTriggered: string;
  evidenceSnippet: string;
  timestamp: string;
  severity: 'WARNING' | 'CRITICAL';
  status: 'PENDING_REVIEW' | 'ACKNOWLEDGED' | 'RESOLVED_NO_FINDING' | 'RESOLVED_ACTION_TAKEN';
}

export const SupervisorMonitoringPage: React.FC = () => {
  const [alerts, setAlerts] = useState<SupervisorAlert[]>([
    {
      id: 'ALT-109',
      collectorName: 'Senior Debt Collector',
      borrowerName: 'Sunita Patil',
      ruleTriggered: 'EXCESSIVE_INTERRUPTIONS (4 consecutive collisions)',
      evidenceSnippet: 'Collector speech overlapped borrower speech 4 times within 45 seconds during dispute explanation.',
      timestamp: '11:20 AM',
      severity: 'WARNING',
      status: 'PENDING_REVIEW'
    },
    {
      id: 'ALT-110',
      collectorName: 'Senior Debt Collector',
      borrowerName: 'Vijay Kulkarni',
      ruleTriggered: 'PROHIBITED_PRESSURE_LANGUAGE_DISCLOSURE',
      evidenceSnippet: 'Transcript flag: "Immediate police visit" - requires supervisor audit to determine context.',
      timestamp: '11:45 AM',
      severity: 'CRITICAL',
      status: 'PENDING_REVIEW'
    }
  ]);

  const updateStatus = (id: string, newStatus: SupervisorAlert['status']) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-6 py-4">
        <div>
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-semibold text-slate-100">Supervisor Monitoring & Compliance Review</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
              ROLE: SUPERVISOR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reviewable collector evidence feeds. Alerts are neutral evidentiary signals, NOT automatic misconduct conclusions.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs text-amber-400 font-bold">{alert.id}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  alert.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {alert.severity}
                </span>
                <span className="text-xs text-slate-300 font-medium">Collector: {alert.collectorName}</span>
                <span className="text-xs text-slate-400">Borrower: {alert.borrowerName}</span>
              </div>
              <span className="text-xs font-mono text-slate-500">{alert.timestamp}</span>
            </div>

            <div className="text-xs space-y-1">
              <span className="text-slate-400 font-semibold">Triggered Rule:</span>
              <p className="text-slate-200 font-mono text-[11px] bg-slate-950 p-2 rounded border border-slate-800">
                {alert.ruleTriggered}
              </p>
            </div>

            <div className="text-xs space-y-1">
              <span className="text-slate-400 font-semibold">Evidence / Interaction Context:</span>
              <p className="text-slate-300 italic bg-slate-950 p-2.5 rounded border border-slate-800">
                "{alert.evidenceSnippet}"
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Current Status: <span className="font-semibold text-slate-200">{alert.status}</span>
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => updateStatus(alert.id, 'ACKNOWLEDGED')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs transition"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => updateStatus(alert.id, 'RESOLVED_NO_FINDING')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 rounded text-xs transition"
                >
                  Dismiss (No Misconduct)
                </button>
                <button
                  onClick={() => updateStatus(alert.id, 'RESOLVED_ACTION_TAKEN')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold rounded text-xs transition"
                >
                  Action Taken (Coaching/Warning)
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
