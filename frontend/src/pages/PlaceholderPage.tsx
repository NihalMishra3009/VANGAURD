import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  moduleName: string;
  description: string;
  targetPhase: string;
  onBack: () => void;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  moduleName,
  description,
  targetPhase,
  onBack,
}) => {
  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Dashboard</span>
      </button>

      <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center max-w-2xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <Construction className="w-7 h-7" />
        </div>
        <div>
          <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-widest font-bold">
            {targetPhase}
          </span>
          <h1 className="text-xl font-bold text-white mt-1">{title}</h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {description}
          </p>
        </div>
        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
          Module ID: {moduleName} • Relational Database Schema Ready
        </div>
      </div>
    </div>
  );
};
