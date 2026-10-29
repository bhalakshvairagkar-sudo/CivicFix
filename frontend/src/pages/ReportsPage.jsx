import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  ThumbsUp,
  MapPin,
  CheckCircle2,
  Camera,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';

export default function ReportsPage({ onSelectCase }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create' | 'track'
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submit Form state
  const [category, setCategory] = useState('POTHOLE');
  const [severity, setSeverity] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80');
  const [lat, setLat] = useState('12.9742');
  const [lng, setLng] = useState('77.5965');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Tracking state
  const [trackingCode, setTrackingCode] = useState('');
  const [trackedReport, setTrackedReport] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.get('/reports');
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setSubmitError(null);
      const res = await api.post('/reports', {
        category,
        severity,
        description,
        address_text: address,
        photo_url: photoUrl,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng)
      });
      setSubmitSuccess(res);
      setDescription('');
      setAddress('');
      loadReports();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackLookup = async (e) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;
    try {
      setTrackingLoading(true);
      setTrackingError(null);
      const res = await api.get(`/reports/track/${trackingCode.trim()}`);
      setTrackedReport(res);
    } catch (err) {
      setTrackingError(err.message);
      setTrackedReport(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleUpvote = async (reportId) => {
    try {
      await api.post(`/reports/${reportId}/upvote`);
      loadReports();
    } catch (err) {
      console.error('Upvote failed:', err);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Citizen Infrastructure <span className="text-emerald-400">Reports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            File damage reports, track resolution milestones, and upvote community hazards
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-800/80 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'list' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'create' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            + File New Report
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'track' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Public Tracker
          </button>
        </div>
      </div>

      {/* TAB 1: ALL REPORTS LIST */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map((rep) => (
            <div
              key={rep.report_id}
              className="glass-card rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
            >
              <div>
                {/* Photo Header */}
                <div className="aspect-video w-full overflow-hidden bg-slate-800 relative">
                  <img
                    src={rep.photo_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80'}
                    alt="Infrastructure Defect"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-black/70 text-emerald-300 backdrop-blur-sm border border-emerald-500/30">
                    {rep.tracking_code}
                  </div>
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={rep.status} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">{rep.category}</span>
                    <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                  </div>

                  <p className="text-slate-200 line-clamp-2 text-xs leading-relaxed font-medium">
                    {rep.description}
                  </p>

                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] pt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{rep.address_text}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleUpvote(rep.report_id)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-300 rounded-lg text-xs font-semibold transition-all border border-slate-700"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{rep.upvotes_count || 0} Confirmations</span>
                </button>

                <button
                  onClick={() => onSelectCase(rep.case_id)}
                  className="text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Case #{rep.case_number}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: FILE NEW REPORT */}
      {activeTab === 'create' && (
        <div className="max-w-2xl mx-auto glass-card p-6 rounded-2xl border border-slate-800 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Lodge Physical Infrastructure Defect</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your submission will be evaluated by the duplicate detector and prioritized based on proximity to sensitive hubs.
            </p>
          </div>

          {submitSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Report Successfully Filed!</span>
              </div>
              <p>Tracking Code: <b className="font-mono">{submitSuccess.tracking_code}</b></p>
              <p>
                {submitSuccess.duplicate_linked 
                  ? `Linked into existing active repair case #${submitSuccess.case_id} (duplicate consolidation).`
                  : `Spawned new repair case #${submitSuccess.case_id}.`}
              </p>
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Issue Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="POTHOLE">Pothole / Road Surface</option>
                  <option value="STREETLIGHT">Broken Streetlight / Cabling</option>
                  <option value="FOOTPATH">Damaged Footpath / Pavement</option>
                  <option value="DRAINAGE">Overflowing Drain / Culvert</option>
                  <option value="WATER_LEAK">Water Main Pipe Leak</option>
                  <option value="TRAFFIC_SIGNAL">Traffic Signal Outage</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Severity Hazard</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="CRITICAL">Critical (Immediate public danger)</option>
                  <option value="HIGH">High (Major disruption)</option>
                  <option value="MEDIUM">Medium (Moderate defect)</option>
                  <option value="LOW">Low (Cosmetic/minor)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Description</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the physical hazard, size, depth, or danger..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Street Address / Landmark</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 5th Main Rd, opposite Metro General Hospital Gate 2"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Photo Evidence URL</label>
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/25 text-xs"
            >
              {submitting ? 'Lodging Report...' : 'Submit Infrastructure Report'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: PUBLIC REPORT TRACKER */}
      {activeTab === 'track' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Track Repair Progress by Code</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your unique citizen tracking code (e.g. <span className="font-mono text-emerald-400">REP-A1B2C3D</span>) to inspect live municipal repair milestones.
              </p>
            </div>

            <form onSubmit={handleTrackLookup} className="flex gap-2">
              <input
                type="text"
                required
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                placeholder="REP-XXXXXXX"
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-emerald-400 tracking-wider focus:outline-none focus:border-emerald-500 uppercase"
              />
              <button
                type="submit"
                disabled={trackingLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20"
              >
                {trackingLoading ? 'Searching...' : 'Track'}
              </button>
            </form>

            {trackingError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {trackingError}
              </div>
            )}
          </div>

          {/* Tracked Record Card */}
          {trackedReport && (
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="font-mono text-xs text-emerald-400 font-bold">{trackedReport.tracking_code}</span>
                  <h3 className="text-sm font-semibold text-white mt-1">{trackedReport.category} Defect</h3>
                </div>
                <StatusBadge status={trackedReport.report_status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Assigned Department</span>
                  <div className="font-semibold text-slate-200 mt-0.5">{trackedReport.department_name}</div>
                  <div className="text-[11px] text-slate-400">{trackedReport.department_phone}</div>
                </div>
                <div>
                  <span className="text-slate-400">Associated Repair Case</span>
                  <div className="font-semibold text-emerald-400 font-mono mt-0.5">#{trackedReport.case_number}</div>
                  <div className="text-[11px] text-slate-400">Status: {trackedReport.case_status}</div>
                </div>
              </div>

              {trackedReport.work_order_number && (
                <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs space-y-1">
                  <div className="font-semibold text-amber-400">Work Order Active (#{trackedReport.work_order_number})</div>
                  <div className="text-slate-300">Crew Leader: {trackedReport.assigned_team_leader}</div>
                  <div className="text-[11px] text-slate-400">
                    Target Completion: {new Date(trackedReport.target_completion_date).toLocaleDateString()}
                  </div>
                </div>
              )}

              <div className="text-right pt-2 border-t border-slate-800">
                <button
                  onClick={() => onSelectCase(trackedReport.case_id)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Open Full Case Details →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
