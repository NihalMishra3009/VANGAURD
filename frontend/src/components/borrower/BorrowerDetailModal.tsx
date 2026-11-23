import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { BorrowerDetail, EligibilityStatus } from '../../types';
import {
  X,
  User,
  Shield,
  AlertCircle,
  Check
} from 'lucide-react';

interface BorrowerDetailModalProps {
  borrowerId: number | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const BorrowerDetailModal: React.FC<BorrowerDetailModalProps> = ({
  borrowerId,
  onClose,
  onUpdated,
}) => {
  const [detail, setDetail] = useState<BorrowerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'calls' | 'commitments'>('overview');
  const [isUpdating, setIsUpdating] = useState(false);
  const [stopContact, setStopContact] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityStatus>('ELIGIBLE');
  const [disputeStatus, setDisputeStatus] = useState('NONE');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!borrowerId) return;
    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get<BorrowerDetail>(`/borrowers/${borrowerId}`);
        setDetail(res.data);
        setStopContact(res.data.stop_contact);
        setEligibility(res.data.eligibility_status);
        setDisputeStatus(res.data.dispute_status);
      } catch {
        setError('Failed to load borrower details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [borrowerId]);

  const handleSaveGovernance = async () => {
    if (!borrowerId) return;
    setIsUpdating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.patch(`/borrowers/${borrowerId}`, {
        stop_contact: stopContact,
        eligibility_status: eligibility,
        dispute_status: disputeStatus,
      });
      setSuccessMsg('Borrower safety restrictions updated successfully.');
      onUpdated();
    } catch {
      setError('Failed to update borrower settings.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!borrowerId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {detail ? detail.name : 'Loading Borrower Profile...'}
                </h2>
                {detail && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                    {detail.borrower_id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Master Financial Account • Preferred Language: <span className="text-slate-200 font-medium">{detail?.preferred_language}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {isLoading || !detail ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono">Fetching encrypted dossier...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Quick Financial Snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400">Total Outstanding</span>
                <p className="text-lg font-bold text-white mt-1">₹{Number(detail.outstanding_amount).toLocaleString()}</p>
                <span className="text-[10px] text-red-400 font-medium">Overdue Balance</span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400">Monthly Installment (EMI)</span>
                <p className="text-lg font-bold text-white mt-1">₹{Number(detail.emi_amount).toLocaleString()}</p>
                <span className="text-[10px] text-slate-400 font-mono">Due: {detail.due_date}</span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400">Masked Phone (Privacy)</span>
                <p className="text-sm font-mono font-bold text-emerald-400 mt-1.5">{detail.masked_phone}</p>
                <span className="text-[10px] text-slate-500 font-mono">E.164 Protected</span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400">Account Number</span>
                <p className="text-sm font-mono font-medium text-slate-200 mt-1.5">{detail.account_number || 'LOAN-CORE-GEN'}</p>
                <span className="text-[10px] text-slate-500 font-mono">Core Banking Ref</span>
              </div>
            </div>

            {/* Governance & Restrictions Controls */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Borrower Contact Restrictions & Safety Governance</span>
                </h3>
                <button
                  onClick={handleSaveGovernance}
                  disabled={isUpdating}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium cursor-pointer transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Apply Changes'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Eligibility Status</label>
                  <select
                    value={eligibility}
                    onChange={(e) => setEligibility(e.target.value as EligibilityStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ELIGIBLE">ELIGIBLE</option>
                    <option value="INELIGIBLE">INELIGIBLE</option>
                    <option value="DO_NOT_CALL">DO_NOT_CALL</option>
                    <option value="REQUIRES_REVIEW">REQUIRES_REVIEW</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Dispute Status</label>
                  <select
                    value={disputeStatus}
                    onChange={(e) => setDisputeStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="NONE">NONE (Normal)</option>
                    <option value="DISPUTED">DISPUTED</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  </select>
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stopContact}
                      onChange={(e) => setStopContact(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-rose-400">Strict Stop-Contact</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-800 flex gap-4 text-xs font-medium">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2 border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'overview' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Campaign History ({detail.campaign_history.length})
              </button>
              <button
                onClick={() => setActiveTab('calls')}
                className={`pb-2 border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'calls' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Call Sessions ({detail.recent_calls.length})
              </button>
              <button
                onClick={() => setActiveTab('commitments')}
                className={`pb-2 border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'commitments' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Payment Commitments ({detail.commitments_history.length})
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'overview' && (
              <div className="space-y-2">
                {detail.campaign_history.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">This borrower is not yet enrolled in any collection campaigns.</p>
                ) : (
                  detail.campaign_history.map((c, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">{c.campaign_name}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">Priority: {c.priority} • Retries: {c.retry_count}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800/40">
                        {c.calling_status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'calls' && (
              <div className="space-y-2">
                {detail.recent_calls.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No call attempts recorded for this borrower.</p>
                ) : (
                  detail.recent_calls.map((call, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-indigo-400 font-medium">{call.session_uuid}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">Duration: {call.duration_seconds}s • Language: {call.language}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300">
                          {call.status}
                        </span>
                        {call.is_escalated && (
                          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800/40">
                            Escalated
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'commitments' && (
              <div className="space-y-2">
                {detail.commitments_history.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No explicit payment commitments recorded yet.</p>
                ) : (
                  detail.commitments_history.map((comm) => (
                    <div key={comm.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">Promised ₹{comm.promised_amount.toLocaleString()}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">Payment Due Date: {comm.promised_date} via {comm.payment_method || 'Online'}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                        {comm.explicitly_confirmed ? 'Explicitly Confirmed' : 'Tentative'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
