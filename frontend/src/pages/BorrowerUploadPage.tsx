import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import type { UploadPreviewResponse, UploadBatch } from '../types';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  RefreshCw,
  FileCheck,
  History,
  Layers
} from 'lucide-react';

interface BorrowerUploadPageProps {
  onNavigateToBorrowers: () => void;
}

export const BorrowerUploadPage: React.FC<BorrowerUploadPageProps> = ({ onNavigateToBorrowers }) => {
  const [, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [preview, setPreview] = useState<UploadPreviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'valid' | 'invalid'>('valid');
  const [commitResult, setCommitResult] = useState<any | null>(null);
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBatches = async () => {
    setIsLoadingBatches(true);
    try {
      const res = await api.get<UploadBatch[]>('/borrowers/batches');
      setBatches(res.data);
    } catch (err) {
      console.error('Failed to fetch batches', err);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setError(null);
      setPreview(null);
      setCommitResult(null);
      uploadAndPreview(selected);
    }
  };

  const uploadAndPreview = async (fileToUpload: File) => {
    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      const res = await api.post<UploadPreviewResponse>('/borrowers/upload-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data);
      if (res.data.valid_count === 0 && res.data.invalid_count > 0) {
        setActiveTab('invalid');
      } else {
        setActiveTab('valid');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to parse file. Ensure valid format.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setIsCommitting(true);
    setError(null);
    try {
      const res = await api.post('/borrowers/upload-commit', {
        batch_id: preview.batch_id,
      });
      setCommitResult(res.data);
      setPreview(null);
      setFile(null);
      fetchBatches();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to commit records to database.');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadTemplate = async (format: 'xlsx' | 'csv') => {
    try {
      const res = await api.get(`/borrowers/template?format=${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `voxguard_borrower_template.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('Failed to download template.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold">Module B — Ingestion</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-slate-400">High-Fidelity Batch Validator</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
            <span>Borrower Excel & CSV Ingestion</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload borrower loan portfolios. Validates phone normalization, amounts, due dates, and detects duplicates.
          </p>
        </div>

        {/* Template Downloads */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadTemplate('xlsx')}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel Template (.xlsx)</span>
          </button>
          <button
            onClick={() => handleDownloadTemplate('csv')}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>CSV Template (.csv)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-3 text-red-300 text-xs">
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Notification */}
      {commitResult && (
        <div className="p-6 bg-emerald-950/30 border border-emerald-800/60 rounded-2xl space-y-3">
          <div className="flex items-center gap-3 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Successfully Imported {commitResult.imported_count} Borrower Records!</span>
          </div>
          <p className="text-xs text-slate-300">
            Batch ID: <strong className="font-mono text-emerald-300">{commitResult.batch_id}</strong> • Raw spreadsheet permanently preserved in encrypted audit storage.
          </p>
          <div className="pt-2">
            <button
              onClick={onNavigateToBorrowers}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>View In Borrower Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* File Dropzone Area */}
      {!preview && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            isUploading
              ? 'border-indigo-500 bg-indigo-950/20'
              : 'border-slate-800 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-slate-900/80'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <UploadCloud className={`w-7 h-7 ${isUploading ? 'animate-bounce' : ''}`} />
          </div>
          <h3 className="text-sm font-semibold text-white">
            {isUploading ? 'Analyzing and Validating Spreadsheet...' : 'Click or Drag & Drop Borrower Portfolio'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv) up to 20MB
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auto column mapping & phone sanitization enabled</span>
          </div>
        </div>
      )}

      {/* Validation Preview Dashboard */}
      {preview && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-xs font-medium text-slate-400">Total Rows Processed</span>
              <p className="text-xl font-bold text-white mt-1">{preview.total_rows}</p>
              <span className="text-[11px] text-slate-500 font-mono truncate block mt-1">{preview.filename}</span>
            </div>

            <div className="p-4 bg-slate-900 border border-emerald-900/40 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-400">Valid & Ready</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-emerald-400 mt-1">{preview.valid_count}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Passed all schema rules</span>
            </div>

            <div className="p-4 bg-slate-900 border border-red-900/40 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-red-400">Rejected / Invalid</span>
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-xl font-bold text-red-400 mt-1">{preview.invalid_count}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Failed validation</span>
            </div>

            <div className="p-4 bg-slate-900 border border-amber-900/40 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-400">Duplicates Detected</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-bold text-amber-400 mt-1">{preview.duplicate_count}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">ID or phone collisions</span>
            </div>
          </div>

          {/* Column Mapping Review */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Detected Column Headers & Mappings</span>
              </h3>
              <span className="text-[11px] font-mono text-indigo-400">Batch Ref: {preview.batch_id}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(preview.mapped_columns).map(([target, source]) => (
                <div key={target} className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-md font-mono text-[11px]">
                  <span className="text-indigo-400">{target}</span>
                  <span className="text-slate-500 mx-1.5">←</span>
                  <span className="text-slate-300 font-semibold">{source}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs for Valid vs Invalid Rows */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('valid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'valid'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Valid Records ({preview.valid_count})
                </button>
                <button
                  onClick={() => setActiveTab('invalid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'invalid'
                      ? 'bg-red-950 text-red-400 border border-red-800/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Invalid Records ({preview.invalid_count})
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setPreview(null);
                    setFile(null);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommit}
                  disabled={preview.valid_count === 0 || isCommitting}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {isCommitting ? (
                    <span>Committing to Database...</span>
                  ) : (
                    <>
                      <span>Import {preview.valid_count} Valid Records</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Table View */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto max-h-96">
                {activeTab === 'valid' ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="py-3 px-4">Borrower ID</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Normalized Phone</th>
                        <th className="py-3 px-4">Language</th>
                        <th className="py-3 px-4">EMI (₹)</th>
                        <th className="py-3 px-4">Outstanding (₹)</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Eligibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {preview.valid_rows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-slate-500">
                            No valid records in this file. Review the invalid tab for error reasons.
                          </td>
                        </tr>
                      ) : (
                        preview.valid_rows.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-4 font-mono text-indigo-400">{row.borrower_id}</td>
                            <td className="py-2.5 px-4 font-medium text-white">{row.name}</td>
                            <td className="py-2.5 px-4 font-mono text-emerald-400">{row.phone}</td>
                            <td className="py-2.5 px-4">{row.preferred_language}</td>
                            <td className="py-2.5 px-4 font-mono">₹{row.emi_amount.toLocaleString()}</td>
                            <td className="py-2.5 px-4 font-mono font-semibold text-slate-100">₹{row.outstanding_amount.toLocaleString()}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-400">{row.due_date}</td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                                {row.eligibility_status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="py-3 px-4">Row #</th>
                        <th className="py-3 px-4">Validation Errors & Warnings</th>
                        <th className="py-3 px-4">Raw File Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {preview.invalid_rows.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-slate-500">
                            No errors detected! All rows are 100% compliant.
                          </td>
                        </tr>
                      ) : (
                        preview.invalid_rows.map((errRow, i) => (
                          <tr key={i} className="hover:bg-slate-800/30">
                            <td className="py-3 px-4 font-mono text-red-400 font-bold align-top">
                              #{errRow.row_index}
                            </td>
                            <td className="py-3 px-4 space-y-1 align-top">
                              {errRow.errors.map((e, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{e}</span>
                                </div>
                              ))}
                              {errRow.warnings?.map((w, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-amber-400 text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{w}</span>
                                </div>
                              ))}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400 align-top">
                              <pre className="bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto">
                                {JSON.stringify(errRow.raw_data, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload History Batches Table */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <span>Ingestion Audit History (Upload Batches)</span>
          </h2>
          <button
            onClick={fetchBatches}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Refresh Batches"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBatches ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Uploaded File</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Imported</th>
                  <th className="py-3 px-4">Rejected</th>
                  <th className="py-3 px-4">Duplicates</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-slate-500">
                      {isLoadingBatches ? 'Loading upload history...' : 'No upload batches recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono text-indigo-400 font-semibold">{b.batch_id}</td>
                      <td className="py-2.5 px-4 text-white font-medium">{b.filename}</td>
                      <td className="py-2.5 px-4 font-mono">{b.total_rows}</td>
                      <td className="py-2.5 px-4 font-mono text-emerald-400 font-semibold">{b.imported_rows}</td>
                      <td className="py-2.5 px-4 font-mono text-red-400">{b.rejected_rows}</td>
                      <td className="py-2.5 px-4 font-mono text-amber-400">{b.duplicate_rows}</td>
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
