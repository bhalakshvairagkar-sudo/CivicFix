import React, { useState, useEffect } from 'react';
import { Building2, DollarSign, Clock, CheckCircle2, AlertOctagon, Phone, Mail } from 'lucide-react';
import { api } from '../api/client';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDepts() {
      try {
        setLoading(true);
        const res = await api.get('/analytics/overview');
        setDepartments(res.department_performance || []);
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDepts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Municipal <span className="text-emerald-400">Departments & Workloads</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Budget utilization, active dispatch queues, and average resolution efficiency (MTTR)
        </p>
      </div>

      {/* Grid of Department Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((dept) => {
          const budgetPct = Number(dept.budget_utilized_pct || 0);

          return (
            <div
              key={dept.department_id}
              className="glass-card p-6 rounded-2xl border border-slate-800 space-y-5 hover:border-slate-700 transition-all shadow-xl"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{dept.name}</h3>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                      Dept Code: {dept.code}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-slate-800 text-slate-300">
                  {dept.total_cases || 0} Total Cases
                </span>
              </div>

              {/* Budget Progress Bar */}
              <div className="space-y-2 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Annual Budget Allocation</span>
                  <span className="font-mono text-slate-200 font-bold">
                    ${Number(dept.spent_budget || 0).toLocaleString()} / ${Number(dept.annual_budget || 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      budgetPct > 80 ? 'bg-rose-500' : budgetPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, budgetPct)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{budgetPct}% Utilized</span>
                  <span>Remaining: ${(Number(dept.annual_budget || 0) - Number(dept.spent_budget || 0)).toLocaleString()}</span>
                </div>
              </div>

              {/* KPI Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Active Queue</span>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">{dept.active_cases || 0}</div>
                </div>
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Verified Closed</span>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">{dept.closed_cases || 0}</div>
                </div>
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Avg MTTR</span>
                  <div className="text-lg font-bold text-cyan-400 mt-0.5">
                    {dept.avg_resolution_hours ? `${Math.round(dept.avg_resolution_hours)}h` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Contact Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{dept.code.toLowerCase()}@civicfix.gov</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>+1 (555) 234-{dept.department_id + 5670}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
