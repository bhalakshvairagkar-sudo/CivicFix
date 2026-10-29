import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Clock,
  DollarSign,
  TrendingUp,
  MapPin,
  ArrowRight,
  Flame,
  AlertTriangle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { api } from '../api/client';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import InteractiveMap from '../components/InteractiveMap';
import ScoreBreakdownModal from '../components/ScoreBreakdownModal';

export default function Dashboard({ onNavigate, onSelectCase }) {
  const [analytics, setAnalytics] = useState(null);
  const [cases, setCases] = useState([]);
  const [sensitiveLocations, setSensitiveLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScoreCase, setSelectedScoreCase] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [overviewData, casesData, sensData] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/cases', { status: 'OPEN,ASSIGNED,IN_PROGRESS' }),
          api.get('/dbms/overview') // also can get sensitive locs
        ]);
        setAnalytics(overviewData);
        setCases(casesData.slice(0, 15));
        
        // Mock default sensitive locations coordinates for map
        setSensitiveLocations([
          { name: 'Metro General Hospital', type: 'HOSPITAL', latitude: 12.9758, longitude: 77.5981, buffer_meters: 400 },
          { name: 'Lincoln High School', type: 'SCHOOL', latitude: 12.9784, longitude: 77.5921, buffer_meters: 300 },
          { name: 'Metro Central Subway', type: 'TRANSIT_HUB', latitude: 12.9728, longitude: 77.5954, buffer_meters: 450 }
        ]);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">Aggregating live infrastructure metrics from MySQL...</p>
        </div>
      </div>
    );
  }

  const kpis = analytics?.kpis || {};

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Welcome & KPI Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Metro Civic District <span className="text-emerald-400">Command Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time urban infrastructure monitoring, duplicate consolidation & repair intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            MySQL 9.7 Engine Online
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Citizen Reports */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Reports</span>
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{kpis.total_citizen_reports || 0}</div>
          <div className="text-[11px] text-cyan-400 font-medium">From verified residents</div>
        </div>

        {/* Active Repair Cases */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Cases</span>
            <AlertOctagon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{kpis.active_cases || 0}</div>
          <div className="text-[11px] text-amber-400 font-medium">Under active triage/repair</div>
        </div>

        {/* Closed Cases */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Verified Closed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{kpis.closed_cases || 0}</div>
          <div className="text-[11px] text-emerald-400 font-medium">Evidence audited</div>
        </div>

        {/* Recurring Failure Rate */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Recurrence Rate</span>
            <RefreshCw className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{kpis.recurring_failure_rate_pct || 0}%</div>
          <div className="text-[11px] text-purple-400 font-medium">{kpis.recurring_failures_count || 0} repeat failures</div>
        </div>

        {/* Mean Time To Repair */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Average MTTR</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {kpis.avg_resolution_hours ? `${Math.round(kpis.avg_resolution_hours)}h` : 'N/A'}
          </div>
          <div className="text-[11px] text-blue-400 font-medium">Resolution duration</div>
        </div>

        {/* Total Expenditure */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Spend</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            ${(kpis.total_repair_expenditure || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">Across work orders</div>
        </div>
      </div>

      {/* Main Charts & Map Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Map Preview */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Active Infrastructure Map & Safety Buffer Zones
              </h3>
            </div>
            <button
              onClick={() => onNavigate('map')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <span>Full Screen Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <InteractiveMap
            cases={cases}
            sensitiveLocations={sensitiveLocations}
            onCaseSelect={(c) => onSelectCase(c.case_id)}
            height="360px"
          />
        </div>

        {/* Right: Category Distribution Chart */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-200">Category Defect Volume</h3>
              <span className="text-xs text-slate-400 font-mono">Live SQL Query</span>
            </div>
            <p className="text-xs text-slate-400">Distribution of infrastructure failures</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.category_distribution || []} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={10} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                  formatter={(val) => [`${val} Cases`, 'Total Logged']}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Potholes & Drainage lead reported defects</span>
            <span className="text-emerald-400 font-semibold cursor-pointer" onClick={() => onNavigate('cases')}>
              View All →
            </span>
          </div>
        </div>
      </div>

      {/* Middle Split: Monthly Trends & Top Priority Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Chart */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Reporting & Resolution Velocity</span>
            </h3>
            <p className="text-xs text-slate-400">Monthly reports vs verified case closures</p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.monthly_trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month_label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }} />
                <Line type="monotone" dataKey="reports_lodged" name="Reports Lodged" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="cases_resolved" name="Cases Resolved" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Critical / High Priority Cases */}
        <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>High-Risk Urgent Cases Awaiting Action</span>
              </h3>
              <p className="text-xs text-slate-400">Ranked by explainable multi-factor priority score</p>
            </div>
            <button onClick={() => onNavigate('cases')} className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
              View All Cases →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-2.5 font-semibold">Case</th>
                  <th className="pb-2.5 font-semibold">Defect Title</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                  <th className="pb-2.5 font-semibold">Priority Score</th>
                  <th className="pb-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {cases.slice(0, 5).map((c) => (
                  <tr key={c.case_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 font-mono text-emerald-400 font-semibold whitespace-nowrap">
                      #{c.case_number}
                    </td>
                    <td className="py-3 text-slate-200 max-w-xs truncate">
                      <div className="font-semibold text-slate-100 truncate">{c.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{c.category}</span>
                        {c.is_recurring_failure && (
                          <span className="text-purple-400 font-bold flex items-center gap-0.5">
                            <RefreshCw className="w-3 h-3" /> Recurring
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <PriorityBadge
                        level={c.priority_level}
                        score={c.priority_score}
                        onClick={() => setSelectedScoreCase(c)}
                      />
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectCase(c.case_id)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Score Breakdown Modal */}
      {selectedScoreCase && (
        <ScoreBreakdownModal
          caseData={selectedScoreCase}
          onClose={() => setSelectedScoreCase(null)}
        />
      )}
    </div>
  );
}
