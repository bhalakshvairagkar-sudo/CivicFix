import React, { useState, useEffect } from 'react';
import { Filter, Layers, RefreshCw, MapPin, Search, Compass, Building2, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import InteractiveMap from '../components/InteractiveMap';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';

export default function MapExplorer({ onSelectCase }) {
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [sensitiveLocations, setSensitiveLocations] = useState([]);
  const [selectedCity, setSelectedCity] = useState('ALL');
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

        // Indian Sensitive Landmark Buffer Zones
        setSensitiveLocations([
          { name: 'Bowring & Lady Curzon Hospital', type: 'HOSPITAL', latitude: 12.9833, longitude: 77.6042, buffer_meters: 400 },
          { name: 'Manipal Hospital Old Airport Rd', type: 'HOSPITAL', latitude: 12.9582, longitude: 77.6489, buffer_meters: 450 },
          { name: "Bishop Cotton Boys' School", type: 'SCHOOL', latitude: 12.9692, longitude: 77.6015, buffer_meters: 300 },
          { name: 'National Public School Indiranagar', type: 'SCHOOL', latitude: 12.9750, longitude: 77.6400, buffer_meters: 300 },
          { name: 'Kempegowda Majestic Intermodal Hub', type: 'TRANSIT_HUB', latitude: 12.9767, longitude: 77.5713, buffer_meters: 500 },
          { name: 'Indiranagar Metro Station', type: 'TRANSIT_HUB', latitude: 12.9784, longitude: 77.6387, buffer_meters: 350 },
          { name: 'Central Silk Board Flyover Junction', type: 'TRANSIT_HUB', latitude: 12.9172, longitude: 77.6227, buffer_meters: 400 },
          { name: 'Rajiv Chowk Metro Hub (Delhi)', type: 'TRANSIT_HUB', latitude: 28.6315, longitude: 77.2167, buffer_meters: 450 }
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

    if (selectedCity !== 'ALL') {
      result = result.filter((c) => (c.city || '').toUpperCase() === selectedCity.toUpperCase());
    }
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
          c.asset_name?.toLowerCase().includes(q) ||
          c.address_text?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.ward_number?.toLowerCase().includes(q)
      );
    }

    setFilteredCases(result);
  }, [cases, selectedCity, selectedCategory, selectedStatus, selectedPriority, recurringOnly, searchQuery]);

  const citiesList = [
    { id: 'ALL', label: 'All India', count: cases.length },
    { id: 'BENGALURU', label: 'Bengaluru', count: cases.filter(c => c.city === 'Bengaluru').length },
    { id: 'MUMBAI', label: 'Mumbai', count: cases.filter(c => c.city === 'Mumbai').length },
    { id: 'NEW DELHI', label: 'New Delhi', count: cases.filter(c => c.city === 'New Delhi').length },
    { id: 'HYDERABAD', label: 'Hyderabad', count: cases.filter(c => c.city === 'Hyderabad').length },
    { id: 'PUNE', label: 'Pune', count: cases.filter(c => c.city === 'Pune').length }
  ];

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* City & Metropolitan Selector Pills */}
      <div className="glass-card p-3 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>Region:</span>
          </div>

          {citiesList.map((city) => {
            const isActive = selectedCity === city.id;
            return (
              <button
                key={city.id}
                onClick={() => setSelectedCity(city.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/60'
                }`}
              >
                <span>{city.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-white/20 text-white font-bold' : 'bg-slate-700 text-slate-400'
                }`}>
                  {city.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs font-mono text-slate-400 px-3">
          Active Geocoded Defects: <span className="font-bold text-emerald-400">{filteredCases.length}</span>
        </div>
      </div>

      {/* Secondary Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Indian landmark, street, case #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Categories</option>
            <option value="POTHOLE">Potholes (10)</option>
            <option value="STREETLIGHT">Streetlights (7)</option>
            <option value="DRAINAGE">Drainage & Culverts (6)</option>
            <option value="WATER_LEAK">Water Main Leaks (5)</option>
            <option value="FOOTPATH">Footpaths (4)</option>
            <option value="TRAFFIC_SIGNAL">Traffic Signals (3)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
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
            className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical (≥ 80 pts)</option>
            <option value="HIGH">High (60-79 pts)</option>
            <option value="MEDIUM">Medium (40-59 pts)</option>
            <option value="LOW">Low (&lt; 40 pts)</option>
          </select>

          {/* Recurring Filter Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-purple-500/50 transition-colors">
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

        <div className="text-[11px] text-slate-400 font-medium">
          Showing <b className="text-white font-mono">{filteredCases.length}</b> markers on map
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
              const cid = typeof c === 'object' ? c.case_id : c;
              setSelectedCaseId(cid);
              if (onSelectCase) onSelectCase(cid);
            }}
            height="650px"
          />
        </div>

        {/* Sidebar list of cases (1 col) */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col h-[650px] shadow-xl">
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Location Defect Feed</span>
            </h4>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {filteredCases.length} active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
            {filteredCases.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No civic defects matched your current filters.
              </div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = selectedCaseId === c.case_id;
                return (
                  <div
                    key={c.case_id}
                    onClick={() => setSelectedCaseId(c.case_id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[11px] text-emerald-400 font-bold">#{c.case_number}</span>
                      <PriorityBadge level={c.priority_level} score={c.priority_score} showScore={true} />
                    </div>

                    <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1">
                      📍 {c.city || 'India'} • {c.ward_number || c.ward || 'Municipal Ward'}
                    </div>

                    <h5 className="font-semibold text-slate-200 line-clamp-2 leading-snug">{c.title}</h5>

                    {c.address_text && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                        {c.address_text}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/60">
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium text-[10px]">
                        {c.category}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectCase) onSelectCase(c.case_id);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                      >
                        Inspect Details →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
