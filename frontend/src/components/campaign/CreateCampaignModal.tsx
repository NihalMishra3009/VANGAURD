import React, { useState } from 'react';
import api from '../../services/api';
import type { CampaignStatus } from '../../types';
import { X, Megaphone, AlertCircle } from 'lucide-react';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newCampaignId: number) => void;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('All');
  const [status, setStatus] = useState<CampaignStatus>('DRAFT');
  const [retryLimit, setRetryLimit] = useState(3);
  const [coolingOffHours, setCoolingOffHours] = useState(24);
  const [priorityWeight, setPriorityWeight] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Campaign name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/campaigns', {
        name: name.trim(),
        description: description.trim() || null,
        target_language: targetLanguage,
        status: status,
        retry_limit: Number(retryLimit),
        cooling_off_hours: Number(coolingOffHours),
        priority_weight: Number(priorityWeight),
      });
      onCreated(res.data.id);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Create Calling Campaign</h2>
              <p className="text-xs text-slate-400">Configure debt collection batch parameters and retry policies</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Campaign Title *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Auto Loan Overdue Batch — Mumbai"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Target criteria, risk tier, or collection guidelines..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1">Target Language</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Supported</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Marathi">Marathi</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="DRAFT">DRAFT (Prepare)</option>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="ACTIVE">ACTIVE (Ready)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1">Max Retries</label>
              <input
                type="number"
                min={1}
                max={10}
                value={retryLimit}
                onChange={(e) => setRetryLimit(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Cooling Off (Hours)</label>
              <input
                type="number"
                min={1}
                max={168}
                value={coolingOffHours}
                onChange={(e) => setCoolingOffHours(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Priority Weight</label>
              <input
                type="number"
                min={1}
                max={5}
                value={priorityWeight}
                onChange={(e) => setPriorityWeight(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Initialize Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
