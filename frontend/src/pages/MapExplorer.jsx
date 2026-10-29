import React, { useState, useEffect } from 'react';
import { Filter, Layers, RefreshCw, MapPin, Search } from 'lucide-react';
import { api } from '../api/client';
import InteractiveMap from '../components/InteractiveMap';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';

export default function MapExplorer({ onSelectCase }) {
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [sensitiveLocations, setSensitiveLocations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMapData() {
      try {
        setLoading(true);
        const [casesData, dbmsData] = await Promise.all([
          api.get('/cases'),
          api.get('/dbms/overview')
        ]);
        setCases(casesData);
        setFilteredCases(casesData);

        setSensitiveLocations([
          { name: 'Metro General Hospital', type: 'HOSPITAL', latitude: 12.9758, longitude: 77.5981, buffer_meters: 400 },
          { name: 'St. Jude Children Medical', type: 'HOSPITAL', latitude: 12.9665, longitude: 77.5906, buffer_meters: 350 },
          { name: 'Lincoln High School', type: 'SCHOOL', latitude: 12.9784, longitude: 77.5921, buffer_meters: 300 },
          { name: 'Oakridge Elementary', type: 'SCHOOL', latitude: 12.9678, longitude: 77.6011, buffer_meters: 300 },
          { name: 'Metro Central Subway', type: 'TRANSIT_HUB', latitude: 12.9728, longitude: 77.5954, buffer_meters: 450 }
        ]);
      } catch (err) {
        console.error('Failed to load map cases:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMapData();
  }, []);

  // Filter logic
  useEffect(() => {
    let result = [...cases];

    if (selectedCategory !== 'ALL') {
      result = result.filter((c) => c.category === selectedCategory);
    }
    if (selectedStatus !== 'ALL') {
      result = result.filter((c) => c.status === selectedStatus);
    }
    if (selectedPriority !== 'ALL') {
      result = result.filter((c) => c.priority_level === selectedPriority);
    }
    if (recurringOnly) {
      result = result.filter((c) => Boolean(c.is_recurring_failure));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.case_number?.toLowerCase().includes(q) ||
          c.asset_name?.toLowerCase().includes(q)
      );
    }

    setFilteredCases(result);
  }, [cases, selectedCategory, selectedStatus, selectedPriority, recurringOnly, searchQuery]);

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* Top Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search map defects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
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

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="VERIFIED_CLOSED">Verified Closed</option>
          </select>

          {/* Priority Level */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Recurring Filter Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700">
            <input
              type="checkbox"
              checked={recurringOnly}
              onChange={(e) => setRecurringOnly(e.target.checked)}
              className="rounded text-purple-500 focus:ring-purple-500"
            />
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            <span>Recurring Defects Only</span>
          </label>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing <span className="font-bold text-emerald-400">{filteredCases.length}</span> of {cases.length} Issues
        </div>
      </div>

      {/* Map Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive Map (3 cols) */}
        <div className="lg:col-span-3">
          <InteractiveMap
            cases={filteredCases}
            sensitiveLocations={sensitiveLocations}
            selectedCaseId={selectedCaseId}
            onCaseSelect={(c) => {
              setSelectedCaseId(c.case_id);
              if (onSelectCase) onSelectCase(c.case_id);
            }}
            height="640px"
          />
        </div>

        {/* Sidebar list of cases (1 col) */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col h-[640px]">
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Filtered Locations List
            </h4>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              {filteredCases.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
            {filteredCases.map((c) => {
              const isSelected = selectedCaseId === c.case_id;
              return (
                <div
                  key={c.case_id}
                  onClick={() => setSelectedCaseId(c.case_id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500 shadow-md shadow-emerald-950/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[10px] text-emerald-400 font-semibold">#{c.case_number}</span>
                    <PriorityBadge level={c.priority_level} score={c.priority_score} showScore={false} />
                  </div>
                  <h5 className="font-semibold text-slate-200 line-clamp-1">{c.title}</h5>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>{c.category}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCase(c.case_id);
                      }}
                      className="text-emerald-400 hover:underline font-semibold"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
