import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Search,
  AlertTriangle,
  RefreshCw,
  TrendingDown,
  DollarSign,
  History,
  CheckCircle2,
  X
} from 'lucide-react';
import { api } from '../api/client';

export default function AssetMemoryPage() {
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [selectedAssetTimeline, setSelectedAssetTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await api.get('/assets');
      setAssets(data);
      setFilteredAssets(data);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    let res = [...assets];
    if (categoryFilter !== 'ALL') {
      res = res.filter((a) => a.category === categoryFilter);
    }
    if (flaggedOnly) {
      res = res.filter((a) => a.investigation_flag);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter((a) => a.asset_code?.toLowerCase().includes(q) || a.asset_name?.toLowerCase().includes(q) || a.ward_number?.toLowerCase().includes(q));
    }
    setFilteredAssets(res);
  }, [assets, categoryFilter, flaggedOnly, search]);

  const viewAssetTimeline = async (assetId) => {
    try {
      setTimelineLoading(true);
      const res = await api.get(`/assets/${assetId}`);
      setSelectedAssetTimeline(res);
    } catch (err) {
      console.error('Failed to fetch asset memory timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const toggleInvestigation = async (assetId, currentFlag) => {
    try {
      await api.patch(`/assets/${assetId}/investigation?flag=${!currentFlag}&reason=Manual engineering toggle by chief engineer`);
      loadAssets();
    } catch (err) {
      console.error('Failed to toggle investigation:', err);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Infrastructure <span className="text-purple-400">Memory & Asset Registry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Persistent physical infrastructure records tracking lifespans, damage history, repeat failures, and replacement cost ratios
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Tracked Physical Assets: <span className="text-purple-400 font-bold">{assets.length}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search asset code, name, ward..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Categories</option>
            <option value="POTHOLE">Potholes / Roads</option>
            <option value="STREETLIGHT">Streetlights</option>
            <option value="FOOTPATH">Footpaths</option>
            <option value="DRAINAGE">Drainage</option>
            <option value="WATER_LEAK">Water Mains</option>
            <option value="TRAFFIC_SIGNAL">Traffic Signals</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700">
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(e) => setFlaggedOnly(e.target.checked)}
              className="rounded text-rose-500 focus:ring-rose-500"
            />
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Investigation Flagged Only</span>
          </label>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <span className="text-white font-bold">{filteredAssets.length}</span> assets
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Asset Code</th>
                <th className="py-3 px-4">Physical Name & Location</th>
                <th className="py-3 px-4">Health Score</th>
                <th className="py-3 px-4">Total Incidents</th>
                <th className="py-3 px-4">Recurring Failures</th>
                <th className="py-3 px-4">Cumulative Spend</th>
                <th className="py-3 px-4">Overhaul Ratio</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-sm">
                    Loading infrastructure memory registry from MySQL...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-sm">
                    No infrastructure assets matched your filters.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((a) => {
                  const health = Number(a.current_health_score || 100);
                  const ratio = Number(a.repair_vs_replacement_pct || 0);

                  return (
                    <tr key={a.asset_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-purple-400 font-bold whitespace-nowrap">
                        {a.asset_code}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-200 truncate">{a.asset_name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {a.address_landmark} • {a.ward_number}
                        </div>
                      </td>

                      {/* Health Progress Bar */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                health < 50 ? 'bg-rose-500' : health < 75 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${health}%` }}
                            ></div>
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-200">{health}%</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-300 whitespace-nowrap">
                        {a.total_incidents_count || 0} incidents
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {a.recurring_failures_count > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1 w-max">
                            <RefreshCw className="w-3 h-3" />
                            {a.recurring_failures_count} recurrences
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-200 whitespace-nowrap">
                        ${Number(a.cumulative_repair_cost || 0).toLocaleString()}
                      </td>

                      {/* Overhaul Ratio Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          ratio >= 60 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {ratio}% of Replacement
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => toggleInvestigation(a.asset_id, a.investigation_flag)}
                          title="Toggle Investigation Flag"
                          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            a.investigation_flag
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => viewAssetTimeline(a.asset_id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                        >
                          History
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

      {/* Asset Memory Timeline Drawer/Modal */}
      {selectedAssetTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    Infrastructure Memory Timeline
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    #{selectedAssetTimeline.asset.asset_code} • {selectedAssetTimeline.asset.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAssetTimeline(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Asset Meta Box */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-800/40 rounded-xl border border-slate-700/60">
                <div>
                  <span className="text-slate-400">Install Year</span>
                  <div className="font-semibold text-slate-200 mt-0.5">{selectedAssetTimeline.asset.install_year}</div>
                </div>
                <div>
                  <span className="text-slate-400">Health Index</span>
                  <div className="font-semibold text-purple-400 mt-0.5">{selectedAssetTimeline.asset.current_health_score}%</div>
                </div>
                <div>
                  <span className="text-slate-400">Total Spent</span>
                  <div className="font-semibold text-amber-400 font-mono mt-0.5">
                    ${Number(selectedAssetTimeline.asset.cumulative_repair_cost || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Replacement Cost</span>
                  <div className="font-semibold text-slate-300 font-mono mt-0.5">
                    ${Number(selectedAssetTimeline.asset.replacement_cost_estimate || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-2">
                <h5 className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Chronological Failure & Maintenance Record
                </h5>

                <div className="space-y-3 relative border-l border-slate-800 ml-3 pl-5 py-2">
                  {selectedAssetTimeline.timeline.map((item, idx) => (
                    <div key={idx} className="relative space-y-1">
                      <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-purple-500 border border-slate-900"></div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 font-mono">#{item.case_number}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-slate-300 font-medium">{item.title}</div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Status: <b className="text-slate-200">{item.status}</b></span>
                        {item.contractor_name && <span>Contractor: {item.contractor_name}</span>}
                        {item.actual_cost && <span className="font-mono text-emerald-400">${Number(item.actual_cost).toLocaleString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedAssetTimeline(null)}
                className="px-4 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
