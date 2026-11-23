import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Campaign, CampaignBorrower, CampaignStatus } from '../types';
import { AssignBorrowersModal } from '../components/campaign/AssignBorrowersModal';
import {
  ArrowLeft,
  UserPlus,
  Play,
  Pause,
  RefreshCw,
  Clock,
  Users
} from 'lucide-react';

interface CampaignDetailPageProps {
  campaignId: number;
  onBack: () => void;
}

export const CampaignDetailPage: React.FC<CampaignDetailPageProps> = ({ campaignId, onBack }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [roster, setRoster] = useState<CampaignBorrower[]>([]);
  const [, setTotalRosterCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [rosterStatusFilter, setRosterStatusFilter] = useState('ALL');

  const fetchCampaignData = async () => {
    setIsLoading(true);
    try {
      const [campRes, rosterRes] = await Promise.all([
        api.get<Campaign>(`/campaigns/${campaignId}`),
        api.get(`/campaigns/${campaignId}/borrowers`, {
          params: { status: rosterStatusFilter !== 'ALL' ? rosterStatusFilter : undefined },
        }),
      ]);
      setCampaign(campRes.data);
      setRoster(rosterRes.data.items);
      setTotalRosterCount(rosterRes.data.total);
    } catch (err) {
      console.error('Failed to load campaign data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignData();
  }, [campaignId, rosterStatusFilter]);

  const handleStatusChange = async (newStatus: CampaignStatus) => {
    try {
      const res = await api.patch(`/campaigns/${campaignId}`, { status: newStatus });
      setCampaign(res.data);
    } catch (err) {
      console.error('Failed to update campaign status', err);
    }
  };

  if (!campaign && isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono">Loading campaign parameters...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 text-center text-red-400 space-y-2">
        <p>Campaign not found.</p>
        <button onClick={onBack} className="text-xs text-indigo-400 underline">Back to Campaigns</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Campaigns</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{campaign.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800/40">
              {campaign.status}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300">
              {campaign.target_language}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">{campaign.description || 'No description provided.'}</p>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2">
          {campaign.status === 'DRAFT' && (
            <button
              onClick={() => handleStatusChange('ACTIVE')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Launch Campaign</span>
            </button>
          )}
          {campaign.status === 'ACTIVE' && (
            <button
              onClick={() => handleStatusChange('PAUSED')}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Calling</span>
            </button>
          )}
          {campaign.status === 'PAUSED' && (
            <button
              onClick={() => handleStatusChange('ACTIVE')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume Calling</span>
            </button>
          )}

          <button
            onClick={() => setIsAssignOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Assign Borrowers</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-slate-400">Total Enrolled</span>
          <p className="text-xl font-bold text-white mt-1">{campaign.stats?.total_assigned || 0}</p>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-emerald-400">Queued</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">{campaign.stats?.queued || 0}</p>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-blue-400">In Progress</span>
          <p className="text-xl font-bold text-blue-400 mt-1">{campaign.stats?.in_progress || 0}</p>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-slate-300">Completed</span>
          <p className="text-xl font-bold text-slate-300 mt-1">{campaign.stats?.completed || 0}</p>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-amber-400">Escalated</span>
          <p className="text-xl font-bold text-amber-400 mt-1">{campaign.stats?.escalated || 0}</p>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-purple-400">Safe Terminated</span>
          <p className="text-xl font-bold text-purple-400 mt-1">{campaign.stats?.safe_terminated || 0}</p>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-slate-400">Total Debt Pool</span>
          <p className="text-sm font-bold text-white mt-2 font-mono">
            ₹{campaign.stats ? Number(campaign.stats.total_outstanding_amount).toLocaleString() : '0'}
          </p>
        </div>
      </div>

      {/* Assigned Borrowers Roster */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Assigned Borrower Roster & Calling Queue</span>
          </h2>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Calling Status:</span>
            <select
              value={rosterStatusFilter}
              onChange={(e) => setRosterStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200"
            >
              <option value="ALL">All States</option>
              <option value="QUEUED">Queued</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="ESCALATED">Escalated</option>
            </select>
            <button onClick={fetchCampaignData} className="p-1.5 text-slate-400 hover:text-white cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Borrower ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Masked Phone</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Outstanding (₹)</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Retries</th>
                  <th className="py-3 px-4">Calling Status</th>
                  <th className="py-3 px-4">Simultaneous Lock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {roster.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500">
                      No borrowers currently assigned to this campaign. Click "+ Assign Borrowers" above.
                    </td>
                  </tr>
                ) : (
                  roster.map((cb) => (
                    <tr key={cb.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">{cb.borrower.borrower_id}</td>
                      <td className="py-3 px-4 font-semibold text-white">{cb.borrower.name}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400">{cb.borrower.masked_phone}</td>
                      <td className="py-3 px-4">{cb.borrower.preferred_language}</td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        ₹{Number(cb.borrower.outstanding_amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-300">P{cb.priority}</td>
                      <td className="py-3 px-4 font-mono">{cb.retry_count} / {campaign.retry_limit}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800/40">
                          {cb.calling_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {cb.is_active_call ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800/40 flex items-center gap-1 w-max">
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span>In-Call Lock</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      <AssignBorrowersModal
        campaignId={campaignId}
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onAssigned={fetchCampaignData}
      />
    </div>
  );
};
