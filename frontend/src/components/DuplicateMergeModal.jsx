import React, { useState, useEffect } from 'react';
import { X, GitMerge, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import PriorityBadge from './PriorityBadge';

export default function DuplicateMergeModal({ targetCase, onClose, onMerged }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCandidates() {
      if (!targetCase) return;
      try {
        setLoading(true);
        const data = await api.get(`/cases/${targetCase.case_id}/duplicate-candidates`);
        setCandidates(data);
        if (data.length > 0) {
          setSelectedCaseId(data[0].case_id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCandidates();
  }, [targetCase]);

  const handleMerge = async () => {
    if (!selectedCaseId) return;
    try {
      setMerging(true);
      setError(null);
      const res = await api.post(`/cases/${targetCase.case_id}/merge-duplicate`, {
        secondary_case_id: selectedCaseId
      });
      if (onMerged) onMerged(res);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setMerging(false);
    }
  };

  if (!targetCase) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Duplicate Report Consolidation
              </h3>
              <p className="text-xs text-slate-400">
                Merge duplicate reports into primary Case #{targetCase.case_number} via ACID database transaction
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Target Case */}
          <div className="p-4 bg-slate-800/50 border border-indigo-500/30 rounded-xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">Target Case (Preserved)</div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-emerald-400">#{targetCase.case_number}</span>
                <h4 className="text-sm font-semibold text-slate-200">{targetCase.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{targetCase.category} • Severity: {targetCase.severity}</p>
              </div>
              <PriorityBadge level={targetCase.priority_level} score={targetCase.priority_score} />
            </div>
          </div>

          {/* Candidates List */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Detected Duplicate Candidates within Proximity
            </h5>

            {loading ? (
              <div className="text-center py-8 text-sm text-slate-400">Scanning for geographical duplicates...</div>
            ) : candidates.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-800/30 border border-slate-700/40 text-sm text-slate-400">
                No active duplicate cases detected within 150m of this location.
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((cand) => (
                  <label
                    key={cand.case_id}
                    onClick={() => setSelectedCaseId(cand.case_id)}
                    className={`block p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedCaseId === cand.case_id
                        ? 'bg-indigo-950/30 border-indigo-500 shadow-md shadow-indigo-950/50'
                        : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="duplicate_candidate"
                          checked={selectedCaseId === cand.case_id}
                          onChange={() => setSelectedCaseId(cand.case_id)}
                          className="mt-1 text-indigo-500 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-300">#{cand.case_number}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                              {cand.duplicate_confidence_pct}% Match
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-200 mt-1">{cand.title}</h4>
                          <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
                            {cand.reasons.map((r, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
                        {cand.distance_meters}m away
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* DBMS Transaction Notice */}
          <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs text-slate-400 flex items-start gap-2">
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 font-bold font-mono">ACID</span>
            <div>
              Re-links all raw citizen reports to Case #{targetCase.case_number}, marks secondary as DUPLICATE_MERGED, updates report counts, and logs an immutable audit trail entry within a single transactional boundary.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            disabled={!selectedCaseId || merging || candidates.length === 0}
            onClick={handleMerge}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <GitMerge className="w-4 h-4" />
            <span>{merging ? 'Executing Transaction...' : 'Merge Selected Duplicate'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
