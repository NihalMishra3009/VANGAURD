import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { Borrower } from '../../types';
import { X, UserPlus, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AssignBorrowersModalProps {
  campaignId: number;
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
}

export const AssignBorrowersModal: React.FC<AssignBorrowersModalProps> = ({
  campaignId,
  isOpen,
  onClose,
  onAssigned,
}) => {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [priority, setPriority] = useState<number>(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchEligible = async () => {
      setIsLoading(true);
      setError(null);
      setResultMsg(null);
      setSelectedIds([]);
      try {
        const res = await api.get('/borrowers', {
          params: {
            eligibility_status: 'ELIGIBLE',
            search: search.trim() || undefined,
            limit: 50,
          },
        });
        setBorrowers(res.data.items);
      } catch {
        setError('Failed to fetch eligible borrowers.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEligible();
  }, [isOpen, search]);

  if (!isOpen) return null;

  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === borrowers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(borrowers.map((b) => b.id));
    }
  };

  const handleAssign = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    setResultMsg(null);
    try {
      const res = await api.post(`/campaigns/${campaignId}/assign`, {
        borrower_ids: selectedIds,
        priority: Number(priority),
      });
      const { assigned_count, skipped_count } = res.data;
      setResultMsg(`Successfully assigned ${assigned_count} borrowers. (${skipped_count} skipped due to restrictions/duplicates).`);
      onAssigned();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to assign borrowers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Assign Borrowers to Campaign #{campaignId}</h2>
              <p className="text-xs text-slate-400">Select eligible delinquent accounts for AI automated calling</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {resultMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{resultMsg}</span>
            </div>
          )}

          {/* Search Bar & Priority */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search eligible borrower by ID or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 whitespace-nowrap">Call Priority:</span>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>1 (Normal)</option>
                <option value={2}>2 (Medium)</option>
                <option value={3}>3 (High)</option>
                <option value={4}>4 (Urgent)</option>
              </select>
            </div>
          </div>

          {/* Borrowers Selection Roster */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={borrowers.length > 0 && selectedIds.length === borrowers.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="py-2.5 px-3">Borrower ID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Language</th>
                  <th className="py-2.5 px-3">Outstanding</th>
                  <th className="py-2.5 px-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500">
                      Loading eligible accounts...
                    </td>
                  </tr>
                ) : borrowers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500">
                      No eligible borrowers found matching search.
                    </td>
                  </tr>
                ) : (
                  borrowers.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => handleToggleSelect(b.id)}
                      className={`hover:bg-slate-900/60 cursor-pointer ${
                        selectedIds.includes(b.id) ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(b.id)}
                          onChange={() => handleToggleSelect(b.id)}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-indigo-400 font-bold">{b.borrower_id}</td>
                      <td className="py-2.5 px-3 font-medium text-white">{b.name}</td>
                      <td className="py-2.5 px-3">{b.preferred_language}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">₹{Number(b.outstanding_amount).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{b.due_date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              <strong className="text-white">{selectedIds.length}</strong> borrowers selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={selectedIds.length === 0 || isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                {isSubmitting ? 'Assigning...' : `Assign ${selectedIds.length} Borrowers`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
