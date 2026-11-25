import React from 'react';
import { BarChart3, Download, TrendingUp, ShieldAlert, PhoneCall, CheckCircle } from 'lucide-react';

export const ReportingPage: React.FC = () => {

  const operationalMetrics = {
    totalCallsInitiated: 142,
    completedNormal: 98,
    promisesToPay: 29,
    disputesFlagged: 8,
    safetyHandoffs: 5,
    safeTerminations: 2,
    avgCallDurationSec: 134,
    collectorInterventionRate: '4.9%'
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Value\n"
      + `Total Calls Initiated,${operationalMetrics.totalCallsInitiated}\n`
      + `Completed Normal,${operationalMetrics.completedNormal}\n`
      + `Promises to Pay,${operationalMetrics.promisesToPay}\n`
      + `Disputes Flagged,${operationalMetrics.disputesFlagged}\n`
      + `Safety Handoffs,${operationalMetrics.safetyHandoffs}\n`
      + `Safe Terminations,${operationalMetrics.safeTerminations}\n`
      + `Avg Duration (sec),${operationalMetrics.avgCallDurationSec}\n`
      + `Collector Intervention Rate,${operationalMetrics.collectorInterventionRate}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `voxguard_operational_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-6 py-4">
        <div>
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-semibold text-slate-100">Operations & Safety Reporting</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated interaction volumes, safety interventions, and resolution summaries.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-medium rounded-lg text-xs flex items-center space-x-2 transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Summary (CSV)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-slate-400 text-xs flex items-center space-x-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
            <span>Total Calls</span>
          </span>
          <span className="text-2xl font-bold text-slate-100">{operationalMetrics.totalCallsInitiated}</span>
          <span className="text-[10px] text-slate-500 block">Across active campaigns</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-slate-400 text-xs flex items-center space-x-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Promises to Pay</span>
          </span>
          <span className="text-2xl font-bold text-emerald-400">{operationalMetrics.promisesToPay}</span>
          <span className="text-[10px] text-slate-500 block">Borrower commitments</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-slate-400 text-xs flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Safety Handoffs</span>
          </span>
          <span className="text-2xl font-bold text-rose-400">{operationalMetrics.safetyHandoffs}</span>
          <span className="text-[10px] text-slate-500 block">Distress / human request</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-slate-400 text-xs flex items-center space-x-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <span>Intervention Rate</span>
          </span>
          <span className="text-2xl font-bold text-indigo-400">{operationalMetrics.collectorInterventionRate}</span>
          <span className="text-[10px] text-slate-500 block">Human collector transfers</span>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Safety & Operational Outcome Ledger
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3 font-semibold">Outcome Category</th>
                <th className="py-2 px-3 font-semibold">Volume</th>
                <th className="py-2 px-3 font-semibold">Share of Calls</th>
                <th className="py-2 px-3 font-semibold">Policy Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2.5 px-3">Completed Collections</td>
                <td className="py-2.5 px-3 font-mono">{operationalMetrics.completedNormal}</td>
                <td className="py-2.5 px-3 font-mono">69.0%</td>
                <td className="py-2.5 px-3 text-emerald-400 font-medium">Safe Nominal</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">Commitments (PTP)</td>
                <td className="py-2.5 px-3 font-mono">{operationalMetrics.promisesToPay}</td>
                <td className="py-2.5 px-3 font-mono">20.4%</td>
                <td className="py-2.5 px-3 text-emerald-400 font-medium">Explicit Agreement</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">Disputes Flagged</td>
                <td className="py-2.5 px-3 font-mono">{operationalMetrics.disputesFlagged}</td>
                <td className="py-2.5 px-3 font-mono">5.6%</td>
                <td className="py-2.5 px-3 text-amber-400 font-medium">Paused / Verification</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">Safety Escalations</td>
                <td className="py-2.5 px-3 font-mono">{operationalMetrics.safetyHandoffs}</td>
                <td className="py-2.5 px-3 font-mono">3.5%</td>
                <td className="py-2.5 px-3 text-rose-400 font-medium">Human Handoff</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">Safe Terminations</td>
                <td className="py-2.5 px-3 font-mono">{operationalMetrics.safeTerminations}</td>
                <td className="py-2.5 px-3 font-mono">1.4%</td>
                <td className="py-2.5 px-3 text-rose-400 font-medium">Immediate Halt & Callback</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
