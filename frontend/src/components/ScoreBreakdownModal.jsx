import React from 'react';
import { X, ShieldAlert, Clock, RefreshCw, Hospital, Users, Calculator, Info } from 'lucide-react';
import PriorityBadge from './PriorityBadge';

export default function ScoreBreakdownModal({ caseData, onClose }) {
  if (!caseData) return null;

  const breakdown = caseData.priority_breakdown || {};
  const baseSeverity = breakdown.base_severity || (caseData.severity === 'CRITICAL' ? 40 : caseData.severity === 'HIGH' ? 25 : caseData.severity === 'MEDIUM' ? 15 : 5);
  const agePenalty = breakdown.age_penalty || 0;
  const recurrencePenalty = breakdown.recurrence_penalty || (caseData.is_recurring_failure ? 20 : 0);
  const sensitivePenalty = breakdown.sensitive_proximity_penalty || 0;
  const citizenBonus = breakdown.citizen_bonus || 0;
  const totalScore = caseData.priority_score || breakdown.total_score || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Risk Prioritization Intelligence
              </h3>
              <p className="text-xs text-slate-400">
                Transparent rule-based multi-factor scoring algorithm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Case Headline */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div>
              <span className="text-xs font-mono text-emerald-400">#{caseData.case_number}</span>
              <h4 className="text-sm font-semibold text-slate-200 mt-0.5">{caseData.title}</h4>
              <p className="text-xs text-slate-400 mt-1">{caseData.category} • {caseData.ward_number || 'Central District'}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <PriorityBadge level={caseData.priority_level} score={totalScore} />
              <span className="text-[11px] text-slate-400 font-mono">Rank: Top {totalScore >= 70 ? '5%' : '20%'}</span>
            </div>
          </div>

          {/* Formula Display */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs font-mono text-emerald-300">
            <span className="text-emerald-400 font-bold">Formula:</span> Priority = BaseSeverity ({baseSeverity}) + AgeWait ({agePenalty}) + Recurrence ({recurrencePenalty}) + SensitiveProximity ({sensitivePenalty}) + CitizenBonus ({citizenBonus}) = <span className="font-bold text-white">{totalScore}</span>
          </div>

          {/* Breakdown Items */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Score Components Breakdown</h5>

            {/* 1. Base Severity */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200">Base Issue Severity ({caseData.severity})</div>
                  <div className="text-xs text-slate-400">Inherent hazard risk determined by engineering safety protocols</div>
                </div>
              </div>
              <div className="text-sm font-bold font-mono text-rose-400">+{baseSeverity} pts</div>
            </div>

            {/* 2. Age Waiting Penalty */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200">Elapsed Waiting Penalty</div>
                  <div className="text-xs text-slate-400">+1.5 pts/day unresolved ({breakdown.age_days || caseData.age_in_days || 0} days active)</div>
                </div>
              </div>
              <div className="text-sm font-bold font-mono text-amber-400">+{agePenalty} pts</div>
            </div>

            {/* 3. Recurrence Multiplier */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200">Asset Recurrence Multiplier</div>
                  <div className="text-xs text-slate-400">
                    {caseData.is_recurring_failure 
                      ? `Problem reappeared within ${caseData.days_since_last_repair || 45} days of previous repair`
                      : 'First recorded occurrence on this physical asset'}
                  </div>
                </div>
              </div>
              <div className={`text-sm font-bold font-mono ${caseData.is_recurring_failure ? 'text-purple-400' : 'text-slate-500'}`}>
                +{recurrencePenalty} pts
              </div>
            </div>

            {/* 4. Sensitive Location Proximity */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Hospital className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200">Sensitive Zone Proximity</div>
                  <div className="text-xs text-slate-400">
                    {breakdown.sensitive_locations_nearby && breakdown.sensitive_locations_nearby.length > 0
                      ? breakdown.sensitive_locations_nearby.join(', ')
                      : 'Outside designated hospital/school safety buffer zones'}
                  </div>
                </div>
              </div>
              <div className={`text-sm font-bold font-mono ${sensitivePenalty > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                +{sensitivePenalty} pts
              </div>
            </div>

            {/* 5. Citizen Reports & Upvotes */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200">Citizen Confirmation Bonus</div>
                  <div className="text-xs text-slate-400">
                    {caseData.total_linked_reports || 1} independent reports + {caseData.total_citizen_upvotes || 0} upvotes
                  </div>
                </div>
              </div>
              <div className={`text-sm font-bold font-mono ${citizenBonus > 0 ? 'text-teal-400' : 'text-slate-500'}`}>
                +{citizenBonus} pts
              </div>
            </div>
          </div>

          {/* Rationale Explanation */}
          {breakdown.explanation && (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex gap-3 text-xs text-slate-300">
              <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">Executive Rationale: </span>
                {breakdown.explanation}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
