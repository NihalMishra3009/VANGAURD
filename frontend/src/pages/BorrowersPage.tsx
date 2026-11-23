import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Borrower } from '../types';
import { BorrowerDetailModal } from '../components/borrower/BorrowerDetailModal';
import {
  Users,
  Search,
  ShieldAlert,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

interface BorrowersPageProps {
  onNavigateToUpload: () => void;
}

export const BorrowersPage: React.FC<BorrowersPageProps> = ({ onNavigateToUpload }) => {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [language, setLanguage] = useState<string>('All');
  const [eligibility, setEligibility] = useState<string>('All');
  const [skip, setSkip] = useState<number>(0);
  const limit = 20;

  const [selectedBorrowerId, setSelectedBorrowerId] = useState<number | null>(null);

  const fetchBorrowers = async () => {
    setIsLoading(true);
    try {
      const params: any = { skip, limit };
      if (search.trim()) params.search = search.trim();
      if (language !== 'All') params.preferred_language = language;
      if (eligibility !== 'All') params.eligibility_status = eligibility;

      const res = await api.get('/borrowers', { params });
      setBorrowers(res.data.items);
      setTotalCount(res.data.total);
    } catch (err) {
      console.error('Failed to fetch borrowers', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowers();
  }, [skip, language, eligibility]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSkip(0);
    fetchBorrowers();
  };

  const getStatusBadge = (b: Borrower) => {
    if (b.stop_contact) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-400 border border-rose-800/60 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" />
          <span>STOP CONTACT</span>
        </span>
      );
    }

    switch (b.eligibility_status) {
      case 'ELIGIBLE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>ELIGIBLE</span>
          </span>
        );
      case 'INELIGIBLE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>INELIGIBLE</span>
          </span>
        );
      case 'DO_NOT_CALL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950 text-red-400 border border-red-800/40 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>DO NOT CALL</span>
          </span>
        );
      case 'REQUIRES_REVIEW':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800/40 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>REVIEW REQ</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold">Module B — Master Registry</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-slate-400">{totalCount} Accounts Registered</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Borrower Account Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, and inspect borrower profiles with masked PII phone protection and compliance history.
          </p>
        </div>

        <button
          onClick={onNavigateToUpload}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Upload Portfolio</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Borrower ID, Name, Phone, or Loan Account Number..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setSkip(0);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Languages</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Marathi">Marathi</option>
            </select>

            <select
              value={eligibility}
              onChange={(e) => {
                setEligibility(e.target.value);
                setSkip(0);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Eligibility</option>
              <option value="ELIGIBLE">Eligible</option>
              <option value="INELIGIBLE">Ineligible</option>
              <option value="DO_NOT_CALL">Do Not Call</option>
              <option value="REQUIRES_REVIEW">Requires Review</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setLanguage('All');
                setEligibility('All');
                setSkip(0);
                fetchBorrowers();
              }}
              className="p-2 text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Reset Filters"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </form>
      </div>

      {/* Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Borrower ID</th>
                <th className="py-3 px-4">Borrower Name</th>
                <th className="py-3 px-4">Masked Phone</th>
                <th className="py-3 px-4">Language</th>
                <th className="py-3 px-4">EMI (₹)</th>
                <th className="py-3 px-4">Total Outstanding</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {borrowers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500">
                    {isLoading ? 'Loading borrower records...' : 'No matching borrower records found.'}
                  </td>
                </tr>
              ) : (
                borrowers.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">{b.borrower_id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{b.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{b.account_number || 'LOAN-ACCT'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400">{b.masked_phone}</td>
                    <td className="py-3 px-4">{b.preferred_language}</td>
                    <td className="py-3 px-4 font-mono">₹{Number(b.emi_amount).toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      ₹{Number(b.outstanding_amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {b.due_date}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(b)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedBorrowerId(b.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded text-[11px] font-medium transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Dossier</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-white">{borrowers.length > 0 ? skip + 1 : 0}</span> to{' '}
            <span className="font-semibold text-white">{Math.min(skip + limit, totalCount)}</span> of{' '}
            <span className="font-semibold text-white">{totalCount}</span> borrowers
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSkip(Math.max(0, skip - limit))}
              disabled={skip === 0}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 rounded text-xs cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setSkip(skip + limit)}
              disabled={skip + limit >= totalCount}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 rounded text-xs cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Borrower Modal */}
      <BorrowerDetailModal
        borrowerId={selectedBorrowerId}
        onClose={() => setSelectedBorrowerId(null)}
        onUpdated={fetchBorrowers}
      />
    </div>
  );
};
