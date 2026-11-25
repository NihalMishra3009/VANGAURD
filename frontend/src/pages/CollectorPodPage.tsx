import React, { useState } from 'react';
import { UserCheck, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

interface EscalatedInteraction {
  id: string;
  borrowerName: string;
  accountNumber: string;
  debtAmount: number;
  escalationReason: string;
  escalationTime: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'RESOLVED';
  acousticEmotion: string;
}

export const CollectorPodPage: React.FC = () => {
  const [escalations, setEscalations] = useState<EscalatedInteraction[]>([
    {
      id: 'ESC-2026-901',
      borrowerName: 'Sunita Patil',
      accountNumber: 'ACC-TEST-9988',
      debtAmount: 15000,
      escalationReason: 'SUSTAINED_ACOUSTIC_DISTRESS: 3 consecutive agitated windows detected in simulated call.',
      escalationTime: '10:42 AM',
      status: 'PENDING',
      acousticEmotion: 'angry (0.88 conf)'
    },
    {
      id: 'ESC-2026-902',
      borrowerName: 'Rajesh Sharma',
      accountNumber: 'ACC-TEST-1044',
      debtAmount: 32000,
      escalationReason: 'BORROWER_REQUESTED_HUMAN: Explicit request to talk with senior representative.',
      escalationTime: '11:15 AM',
      status: 'ACCEPTED',
      acousticEmotion: 'neutral (0.75 conf)'
    }
  ]);

  const handleAction = (id: string, newStatus: 'ACCEPTED' | 'DECLINED' | 'RESOLVED') => {
    setEscalations(prev => prev.map(esc => esc.id === id ? { ...esc, status: newStatus } : esc));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-6 py-4">
        <div>
          <div className="flex items-center space-x-3">
            <UserCheck className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-slate-100">Human Collector Workspace</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              ROLE: HUMAN_COLLECTOR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Receives automated live handoffs when deterministic safety policy triggers escalation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {escalations.map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono font-bold text-indigo-400">{item.id}</span>
                <span className="text-sm font-semibold text-slate-200">{item.borrowerName}</span>
                <span className="text-xs font-mono text-slate-400">({item.accountNumber})</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                item.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                item.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                'bg-slate-800 text-slate-400'
              }`}>
                {item.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Outstanding Debt:</span>
                <span className="text-sm font-bold text-emerald-400">₹{item.debtAmount.toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Acoustic Emotion State:</span>
                <span className="text-xs font-mono text-rose-400">{item.acousticEmotion}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Escalation Trigger Time:</span>
                <span className="text-xs font-mono text-slate-300">{item.escalationTime}</span>
              </div>
            </div>

            <div className="bg-rose-950/20 border border-rose-800/30 rounded-lg p-3 text-xs text-rose-300 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{item.escalationReason}</span>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              {item.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleAction(item.id, 'ACCEPTED')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-semibold rounded-lg text-xs flex items-center space-x-2 transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Accept Handoff</span>
                  </button>
                  <button
                    onClick={() => handleAction(item.id, 'DECLINED')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs flex items-center space-x-2 border border-slate-700 transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Decline (Unavailable)</span>
                  </button>
                </>
              )}
              {item.status === 'ACCEPTED' && (
                <button
                  onClick={() => handleAction(item.id, 'RESOLVED')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs flex items-center space-x-2 transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark Resolved & Submit Notes</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
