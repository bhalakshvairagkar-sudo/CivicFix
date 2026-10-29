import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  GitMerge,
  Eye,
  RefreshCw,
  Plus,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../api/client';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import ScoreBreakdownModal from '../components/ScoreBreakdownModal';
import DuplicateMergeModal from '../components/DuplicateMergeModal';

export default function CasesPage({ onSelectCase }) {
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScoreCase, setSelectedScoreCase] = useState(null);
  const [mergeTargetCase, setMergeTargetCase] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [search, setSearch] = useState('');

  const loadCases = async () => {
    try {
      setLoading(true);
      const data = await api.get('/cases');
      setCases(data);
      setFilteredCases(data);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  // Filter effect
  useEffect(() => {
    let result = [...cases];

    if (categoryFilter !== 'ALL') {
      result = result.filter((c) => c.category === categoryFilter);
    }
    if (statusFilter !== 'ALL') {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (priorityFilter !== 'ALL') {
      result = result.filter((c) => c.priority_level === priorityFilter);
    }
    if (recurringOnly) {
      result = result.filter((c) => Boolean(c.is_recurring_failure));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.case_number?.toLowerCase().includes(q) ||
          c.asset_name?.toLowerCase().includes(q) ||
          c.department_name?.toLowerCase().includes(q)
      );
    }

    setFilteredCases(result);
  }, [cases, categoryFilter, statusFilter, priorityFilter, recurringOnly, search]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Infrastructure <span className="text-emerald-400">Repair Cases</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Consolidated cases grouping citizen reports, work orders, and asset history
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Total Cases: <span className="text-emerald-400 font-bold">{cases.length}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search case #, title, asset..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Categories</option>
            <option value="POTHOLE">Potholes</option>
            <option value="STREETLIGHT">Streetlights</option>
            <option value="FOOTPATH">Footpaths</option>
            <option value="DRAINAGE">Drainage</option>
            <option value="WATER_LEAK">Water Leaks</option>
            <option value="TRAFFIC_SIGNAL">Traffic Signals</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REPAIR_COMPLETED">Repair Completed</option>
            <option value="VERIFIED_CLOSED">Verified Closed</option>
            <option value="DUPLICATE_MERGED">Duplicate Merged</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Recurring Failure Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700">
            <input
              type="checkbox"
              checked={recurringOnly}
              onChange={(e) => setRecurringOnly(e.target.checked)}
              className="rounded text-purple-500 focus:ring-purple-500"
            />
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            <span>Recurring Only</span>
          </label>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <span className="text-white font-bold">{filteredCases.length}</span> records
        </div>
      </div>

      {/* Main Cases Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Case #</th>
                <th className="py-3 px-4">Title & Description</th>
                <th className="py-3 px-4">Asset & Ward</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority Score</th>
                <th className="py-3 px-4">Linked Reports</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-sm">
                    Loading repair cases from MySQL database...
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-sm">
                    No repair cases matched your active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr key={c.case_id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Case Number */}
                    <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold whitespace-nowrap">
                      #{c.case_number}
                    </td>

                    {/* Title & Category */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-semibold text-slate-200 line-clamp-1">{c.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {c.category}
                        </span>
                        {c.is_recurring_failure && (
                          <span className="text-purple-400 font-bold flex items-center gap-1 text-[11px]">
                            <RefreshCw className="w-3 h-3" />
                            Recurring Defect
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Asset & Ward */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-300 font-medium">{c.asset_code}</div>
                      <div className="text-[11px] text-slate-400">{c.ward_number}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>

                    {/* Priority Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge
                        level={c.priority_level}
                        score={c.priority_score}
                        onClick={() => setSelectedScoreCase(c)}
                      />
                    </td>

                    {/* Linked Citizen Reports */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                        c.total_reports_count > 1 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {c.total_reports_count || 1} Reports
                      </span>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {c.department_name || c.department_code}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                      {/* Merge duplicates button */}
                      {c.status !== 'VERIFIED_CLOSED' && c.status !== 'DUPLICATE_MERGED' && (
                        <button
                          onClick={() => setMergeTargetCase(c)}
                          title="Merge Duplicate Reports"
                          className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                        >
                          <GitMerge className="w-4 h-4" />
                        </button>
                      )}

                      {/* Inspect details */}
                      <button
                        onClick={() => onSelectCase(c.case_id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Priority Score Breakdown Modal */}
      {selectedScoreCase && (
        <ScoreBreakdownModal
          caseData={selectedScoreCase}
          onClose={() => setSelectedScoreCase(null)}
        />
      )}

      {/* Duplicate Merge Modal */}
      {mergeTargetCase && (
        <DuplicateMergeModal
          targetCase={mergeTargetCase}
          onClose={() => setMergeTargetCase(null)}
          onMerged={() => loadCases()}
        />
      )}
    </div>
  );
}
