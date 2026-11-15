import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  GitMerge,
  Eye,
  RefreshCw,
  Plus,
  ShieldAlert,
  ArrowUpDown,
  MapPin,
  Building2,
  Compass
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
  const [cityFilter, setCityFilter] = useState('ALL');
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

    if (cityFilter !== 'ALL') {
      result = result.filter((c) => (c.city || '').toUpperCase() === cityFilter.toUpperCase());
    }
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
          c.asset_code?.toLowerCase().includes(q) ||
          c.department_name?.toLowerCase().includes(q) ||
          c.address_text?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.ward_number?.toLowerCase().includes(q)
      );
    }

    setFilteredCases(result);
  }, [cases, cityFilter, categoryFilter, statusFilter, priorityFilter, recurringOnly, search]);

  const criticalCount = cases.filter(c => c.priority_level === 'CRITICAL').length;
  const inProgressCount = cases.filter(c => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED').length;
  const closedCount = cases.filter(c => c.status === 'VERIFIED_CLOSED').length;
  const recurringCount = cases.filter(c => c.is_recurring_failure).length;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Infrastructure</span>
            <span className="text-emerald-400">Repair Cases</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              India Grid (35 Live)
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Consolidated municipal repair cases grouping citizen reports, contractors, work orders, and asset memory
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Total National Cases: <span className="text-emerald-400 font-bold">{cases.length}</span>
        </div>
      </div>

      {/* Quick Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Total Cases</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{cases.length}</div>
          </div>
          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs">All</span>
        </div>
        <div className="glass-card p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-rose-400 font-medium">Critical Hazards</div>
            <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">{criticalCount}</div>
          </div>
          <span className="p-2 rounded-lg bg-rose-500/10 text-rose-400 font-bold text-xs">Urgent</span>
        </div>
        <div className="glass-card p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-amber-400 font-medium">Active Work</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{inProgressCount}</div>
          </div>
          <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs">In Field</span>
        </div>
        <div className="glass-card p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-purple-400 font-medium">Recurring Failures</div>
            <div className="text-xl font-bold font-mono text-purple-400 mt-0.5">{recurringCount}</div>
          </div>
          <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400 font-bold text-xs">Audited</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search case #, landmark, street, asset..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* City / Region */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Regions (India)</option>
            <option value="BENGALURU">Bengaluru (30)</option>
            <option value="MUMBAI">Mumbai (2)</option>
            <option value="NEW DELHI">New Delhi (1)</option>
            <option value="HYDERABAD">Hyderabad (1)</option>
            <option value="PUNE">Pune (1)</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Categories</option>
            <option value="POTHOLE">Potholes (10)</option>
            <option value="STREETLIGHT">Streetlights (7)</option>
            <option value="DRAINAGE">Drainage & Culverts (6)</option>
            <option value="WATER_LEAK">Water Main Leaks (5)</option>
            <option value="FOOTPATH">Footpaths (4)</option>
            <option value="TRAFFIC_SIGNAL">Traffic Signals (3)</option>
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
            <option value="CRITICAL">Critical (≥ 80 pts)</option>
            <option value="HIGH">High (60-79 pts)</option>
            <option value="MEDIUM">Medium (40-59 pts)</option>
            <option value="LOW">Low (&lt; 40 pts)</option>
          </select>

          {/* Recurring Failure Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-purple-500/50 transition-colors">
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
          Showing <span className="text-white font-bold">{filteredCases.length}</span> of {cases.length} records
        </div>
      </div>

      {/* Main Cases Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Case #</th>
                <th className="py-3 px-4">Defect Title & Landmark Address</th>
                <th className="py-3 px-4">Location / Ward</th>
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
                filteredCases.map((c) => {
                  const linkedCount = c.total_linked_reports || c.total_reports_count || 1;
                  return (
                    <tr key={c.case_id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Case Number */}
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold whitespace-nowrap">
                        #{c.case_number}
                      </td>

                      {/* Title & Category */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-semibold text-slate-200 line-clamp-1">{c.title}</div>
                        {c.address_text && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {c.address_text}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {c.category}
                          </span>
                          {c.is_recurring_failure && (
                            <span className="text-purple-400 font-bold flex items-center gap-1 text-[10px]">
                              <RefreshCw className="w-3 h-3" />
                              Recurring Defect
                            </span>
                          )}
                        </div>
                      </td>

                      {/* City & Ward */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-cyan-400 font-semibold text-[11px]">
                          📍 {c.city || 'Bengaluru'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {c.ward_number || c.ward || 'Ward'}
                        </div>
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
                          linkedCount > 1 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {linkedCount} Reports
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
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700/60"
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  );
                })
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
