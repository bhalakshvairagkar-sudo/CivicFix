import React, { useState, useEffect } from 'react';
import { Wrench, Search, AlertCircle, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import WorkOrderModal from '../components/WorkOrderModal';

export default function WorkOrdersPage({ onSelectCase }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [filteredWos, setFilteredWos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedWoForEdit, setSelectedWoForEdit] = useState(null);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      const data = await api.get('/work-orders');
      setWorkOrders(data);
      setFilteredWos(data);
    } catch (err) {
      console.error('Failed to load work orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, []);

  useEffect(() => {
    let res = [...workOrders];
    if (statusFilter !== 'ALL') {
      res = res.filter((w) => w.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter((w) => 
        w.work_order_number?.toLowerCase().includes(q) ||
        w.case_title?.toLowerCase().includes(q) ||
        w.assigned_team_leader?.toLowerCase().includes(q) ||
        w.contractor_name?.toLowerCase().includes(q)
      );
    }
    setFilteredWos(res);
  }, [workOrders, statusFilter, search]);

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Repair <span className="text-amber-400">Work Orders</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track crew dispatches, contractor allocations, materials, and cost overrun variances
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Dispatched Orders: <span className="text-amber-400 font-bold">{workOrders.length}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search WO #, team lead, contractor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CREW_DISPATCHED">Crew Dispatched</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WORK_COMPLETED">Work Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <span className="text-white font-bold">{filteredWos.length}</span> work orders
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">WO Number</th>
                <th className="py-3 px-4">Associated Repair Case</th>
                <th className="py-3 px-4">Team Leader & Contractor</th>
                <th className="py-3 px-4">Execution Status</th>
                <th className="py-3 px-4">Estimated Budget</th>
                <th className="py-3 px-4">Actual Spend</th>
                <th className="py-3 px-4">Cost Variance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-sm">
                    Loading work orders from MySQL...
                  </td>
                </tr>
              ) : filteredWos.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-sm">
                    No work orders found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredWos.map((wo) => {
                  const variance = Number(wo.cost_variance_pct || 0);

                  return (
                    <tr key={wo.work_order_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-amber-400 font-bold whitespace-nowrap">
                        #{wo.work_order_number}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-200 truncate">{wo.case_title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                          <span>Case #{wo.case_number}</span> • <span>{wo.department_name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-200 font-medium">{wo.assigned_team_leader}</div>
                        <div className="text-[11px] text-slate-400">{wo.contractor_name || 'In-House Crew'}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={wo.status} />
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                        ${Number(wo.estimated_cost).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-white font-bold whitespace-nowrap">
                        ${Number(wo.actual_cost).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          variance > 30 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : variance < 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {variance > 0 ? `+${variance}%` : `${variance}%`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => setSelectedWoForEdit(wo)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => onSelectCase(wo.case_id)}
                          className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-semibold"
                        >
                          Case →
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

      {/* Edit Modal */}
      {selectedWoForEdit && (
        <WorkOrderModal
          existingWorkOrder={selectedWoForEdit}
          onClose={() => setSelectedWoForEdit(null)}
          onSaved={() => loadWorkOrders()}
        />
      )}
    </div>
  );
}
