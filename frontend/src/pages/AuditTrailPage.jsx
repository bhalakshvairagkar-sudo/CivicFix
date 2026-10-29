import React, { useState, useEffect } from 'react';
import { ShieldCheck, History, Filter, Search, Terminal } from 'lucide-react';
import { api } from '../api/client';

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeJsonLog, setActiveJsonLog] = useState(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const data = await api.get('/audit-logs');
        setLogs(data);
        setFilteredLogs(data);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  useEffect(() => {
    let res = [...logs];
    if (actionFilter !== 'ALL') {
      res = res.filter((l) => l.action_type === actionFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter((l) => 
        l.change_summary?.toLowerCase().includes(q) ||
        l.actor_name?.toLowerCase().includes(q) ||
        l.entity_type?.toLowerCase().includes(q)
      );
    }
    setFilteredLogs(res);
  }, [logs, actionFilter, search]);

  const getActionBadgeColor = (type) => {
    switch (type) {
      case 'DUPLICATE_MERGE':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'CLOSURE_APPROVED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'SUSPICIOUS_FLAG_RAISED':
      case 'CASE_REOPENED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'WORK_ORDER_CREATED':
      case 'COST_UPDATED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Immutable <span className="text-emerald-400">Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Append-only historical ledger capturing every status transition, duplicate merge, and verification sign-off
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-400 font-bold">
            Append-Only Ledger
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search actor, summary, entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Audit Actions</option>
            <option value="DUPLICATE_MERGE">Duplicate Merges</option>
            <option value="CLOSURE_APPROVED">Closures Approved</option>
            <option value="STATUS_CHANGE">Status Transitions</option>
            <option value="WORK_ORDER_CREATED">Work Orders Created</option>
            <option value="COST_UPDATED">Cost Updates</option>
            <option value="SUSPICIOUS_FLAG_RAISED">Suspicious Flags Raised</option>
            <option value="CASE_REOPENED">Cases Reopened</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <span className="text-white font-bold">{filteredLogs.length}</span> immutable log records
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Operation Summary</th>
                <th className="py-3 px-4 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 text-sm">
                    Retrieving tamper-resistant audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 text-sm">
                    No audit records matched your filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      #{log.log_id}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getActionBadgeColor(log.action_type)}`}>
                        {log.action_type.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {log.entity_type} #{log.entity_id}
                    </td>

                    <td className="py-3.5 px-4 text-slate-200 whitespace-nowrap font-medium">
                      {log.actor_name}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 max-w-md">
                      {log.change_summary}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {(log.old_state || log.new_state) && (
                        <button
                          onClick={() => setActiveJsonLog(log)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-[11px] font-mono transition-colors"
                        >
                          View JSON
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON State Diff Modal */}
      {activeJsonLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Audit State Mutation Payload #{activeJsonLog.log_id}</span>
              </div>
              <button onClick={() => setActiveJsonLog(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              {activeJsonLog.old_state && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Previous State (old_state):</span>
                  <pre className="p-3 rounded-xl bg-black/50 border border-slate-800 text-rose-300 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(activeJsonLog.old_state, null, 2)}
                  </pre>
                </div>
              )}

              {activeJsonLog.new_state && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Committed State (new_state):</span>
                  <pre className="p-3 rounded-xl bg-black/50 border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(activeJsonLog.new_state, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="text-right pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveJsonLog(null)}
                className="px-4 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close Payload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
