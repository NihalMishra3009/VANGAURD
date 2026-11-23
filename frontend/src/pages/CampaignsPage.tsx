import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Campaign, CampaignStatus } from '../types';
import { CreateCampaignModal } from '../components/campaign/CreateCampaignModal';
import {
  Megaphone,
  Plus,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface CampaignsPageProps {
  onSelectCampaign: (campaignId: number) => void;
}

export const CampaignsPage: React.FC<CampaignsPageProps> = ({ onSelectCampaign }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get('/campaigns', { params });
      setCampaigns(res.data.items);
      setTotalCount(res.data.total);
    } catch (err) {
      console.error('Failed to load campaigns', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter]);

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/40">Active</span>;
      case 'SCHEDULED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-800/40">Scheduled</span>;
      case 'PAUSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800/40">Paused</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">Completed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">Draft</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold">Module C — Campaign Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-slate-400">{totalCount} Campaigns Managed</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-indigo-400" />
            <span>Campaign Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create automated debt collection calling campaigns, configure target dialects, retry rules, and track progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Status Filter:</span>
          {['ALL', 'ACTIVE', 'DRAFT', 'PAUSED', 'COMPLETED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <button onClick={fetchCampaigns} className="p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.length === 0 ? (
          <div className="col-span-full p-12 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-500 text-xs">
            {isLoading ? 'Loading campaigns...' : 'No campaigns found. Click "+ Create Campaign" to launch one.'}
          </div>
        ) : (
          campaigns.map((camp) => (
            <div
              key={camp.id}
              onClick={() => onSelectCampaign(camp.id)}
              className="p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {camp.name}
                  </h3>
                  {getStatusBadge(camp.status)}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {camp.description || 'No campaign description specified.'}
                </p>

                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-400">
                    {camp.target_language}
                  </span>
                  <span>Max Retries: {camp.retry_limit}</span>
                </div>
              </div>

              {/* Progress and Stats */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Borrowers Assigned</span>
                  <span className="font-bold text-white font-mono">{camp.stats?.total_assigned || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Queued for Calling</span>
                  <span className="font-bold text-emerald-400 font-mono">{camp.stats?.queued || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Outstanding Volume</span>
                  <span className="font-bold text-slate-200 font-mono">
                    ₹{camp.stats ? Number(camp.stats.total_outstanding_amount).toLocaleString() : '0'}
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end text-[11px] font-semibold text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Manage Campaign & Roster</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(id) => {
          fetchCampaigns();
          onSelectCampaign(id);
        }}
      />
    </div>
  );
};
