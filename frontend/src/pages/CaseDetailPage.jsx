import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Building2,
  RefreshCw,
  GitMerge,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  Camera,
  History,
  Star
} from 'lucide-react';
import { api } from '../api/client';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import ScoreBreakdownModal from '../components/ScoreBreakdownModal';
import DuplicateMergeModal from '../components/DuplicateMergeModal';
import VerificationModal from '../components/VerificationModal';
import WorkOrderModal from '../components/WorkOrderModal';

export default function CaseDetailPage({ caseId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [activeWorkOrderForEdit, setActiveWorkOrderForEdit] = useState(null);

  const loadCase = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/cases/${caseId}`);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) loadCase();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-rose-400 font-semibold">{error || 'Case details not found.'}</div>
        <button onClick={onBack} className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold">
          ← Back to Cases
        </button>
      </div>
    );
  }

  const { case: c, reports, work_orders, inspections, audit_logs } = data;
  const latestInspection = inspections && inspections.length > 0 ? inspections[0] : null;
  const latestWorkOrder = work_orders && work_orders.length > 0 ? work_orders[0] : null;

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cases List</span>
        </button>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {c.status !== 'VERIFIED_CLOSED' && (
            <>
              <button
                onClick={() => setShowMergeModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-all"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Merge Duplicates</span>
              </button>

              <button
                onClick={() => {
                  setActiveWorkOrderForEdit(null);
                  setShowWorkOrderModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Dispatch Work Order</span>
              </button>
            </>
          )}

          <button
            onClick={() => setShowVerifyModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-600/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify Evidence & Close</span>
          </button>
        </div>
      </div>

      {/* Main Case Card */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-emerald-400 font-bold">#{c.case_number}</span>
              <StatusBadge status={c.status} />
              <PriorityBadge
                level={c.priority_level}
                score={c.priority_score}
                onClick={() => setShowScoreModal(true)}
              />
            </div>
            <h1 className="text-xl font-bold text-white mt-2">{c.title}</h1>
            <p className="text-xs text-slate-400 mt-1">{c.description}</p>
          </div>

          <div className="flex md:flex-col items-end gap-1 text-xs text-slate-400">
            <span>Reported on {new Date(c.created_at).toLocaleDateString()}</span>
            <span className="font-mono text-slate-500">Record Version: v{c.version}</span>
          </div>
        </div>

        {/* Quick Meta Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs">
          <div>
            <span className="text-slate-400">Category & Jurisdiction</span>
            <div className="font-semibold text-slate-200 mt-0.5">{c.category} • {c.ward_number}</div>
          </div>
          <div>
            <span className="text-slate-400">Assigned Department</span>
            <div className="font-semibold text-emerald-400 mt-0.5">{c.department_name}</div>
          </div>
          <div>
            <span className="text-slate-400">Linked Citizen Reports</span>
            <div className="font-semibold text-indigo-400 mt-0.5">{reports.length} Verified Reports</div>
          </div>
          <div>
            <span className="text-slate-400">Asset Health Score</span>
            <div className="font-semibold text-purple-400 mt-0.5">{c.current_health_score}% Health Index</div>
          </div>
        </div>
      </div>

      {/* Infrastructure Memory Section */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Persistent Infrastructure Memory (Asset #{c.asset_code})
            </h3>
          </div>
          {c.investigation_flag && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Investigation Warranted
            </span>
          )}
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400">Physical Asset Name</span>
            <div className="font-semibold text-slate-200 mt-0.5">{c.asset_name}</div>
          </div>
          <div>
            <span className="text-slate-400">Recurrence Status</span>
            <div className="font-semibold mt-0.5">
              {c.is_recurring_failure ? (
                <span className="text-purple-400 font-bold">Recurring (reappeared after {c.days_since_last_repair || 45}d)</span>
              ) : (
                <span className="text-slate-300">No recent recurrence</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Cumulative Maintenance Cost</span>
            <div className="font-semibold text-amber-400 font-mono mt-0.5">
              ${Number(c.cumulative_repair_cost || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Estimated Replacement Cost</span>
            <div className="font-semibold text-slate-200 font-mono mt-0.5">
              ${Number(c.replacement_cost_estimate || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Linked Citizen Reports */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Linked Citizen Reports ({reports.length} Total Submissions)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Preserved original submissions consolidated into 1 case</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((rep) => (
            <div key={rep.report_id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex gap-4 text-xs">
              {/* Photo Thumbnail */}
              <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-800">
                <img
                  src={rep.photo_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80'}
                  alt="Defect"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Details */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-cyan-400 font-bold">{rep.tracking_code}</span>
                  <span className="text-[10px] text-slate-400">{new Date(rep.created_at).toLocaleDateString()}</span>
                </div>
                <div className="font-medium text-slate-200">{rep.citizen_name}</div>
                <p className="text-slate-400 line-clamp-2 text-[11px]">{rep.description}</p>
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 truncate max-w-[140px]">{rep.address_text}</span>
                  <span className="font-mono font-bold text-emerald-400">{rep.upvotes_count || 0} Upvotes</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dispatched Work Orders */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Department Work Orders ({work_orders.length})
            </h3>
          </div>
          {c.status !== 'VERIFIED_CLOSED' && (
            <button
              onClick={() => {
                setActiveWorkOrderForEdit(null);
                setShowWorkOrderModal(true);
              }}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              + Dispatch Another Order
            </button>
          )}
        </div>

        {work_orders.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl">
            No work order has been dispatched yet for this case.
          </div>
        ) : (
          <div className="space-y-3">
            {work_orders.map((wo) => (
              <div key={wo.work_order_id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-amber-400 font-bold">#{wo.work_order_number}</span>
                    <StatusBadge status={wo.status} />
                  </div>
                  <div className="font-medium text-slate-200">
                    Leader: {wo.assigned_team_leader} • Contractor: {wo.contractor_name || 'In-House Municipal Crew'}
                  </div>
                  <p className="text-slate-400 text-[11px]">{wo.work_notes || 'No work notes recorded.'}</p>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase">Estimated vs Actual</span>
                    <div className="font-mono font-bold mt-0.5">
                      <span className="text-slate-300">${Number(wo.estimated_cost).toLocaleString()}</span> →{' '}
                      <span className={wo.cost_variance_pct > 30 ? 'text-rose-400' : 'text-emerald-400'}>
                        ${Number(wo.actual_cost).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveWorkOrderForEdit(wo);
                      setShowWorkOrderModal(true);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                  >
                    Update Progress
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidence & Photo Verification Section */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Evidence-Based Repair Verification Proof
            </h3>
          </div>
          <button onClick={() => setShowVerifyModal(true)} className="text-xs text-emerald-400 hover:underline font-semibold">
            Inspect Evidence Photo Dialog →
          </button>
        </div>

        {inspections.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl">
            No inspection verification has been submitted yet. Click "Verify Evidence & Close" above to record photos and ratings.
          </div>
        ) : (
          <div className="space-y-4">
            {inspections.map((insp) => (
              <div key={insp.inspection_id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                {insp.is_suspicious && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                    <span className="font-bold">⚠️ Flagged by Verification Auditor:</span>{' '}
                    {insp.suspicious_flags ? insp.suspicious_flags.join(', ') : 'Verification anomaly detected.'}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Damage Photo (Before)</span>
                    <div className="aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-800">
                      <img src={insp.before_photo_url} alt="Before" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Completion Photo (After)</span>
                    <div className="aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-800">
                      {insp.after_photo_url ? (
                        <img src={insp.after_photo_url} alt="After" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-rose-400">
                          Missing after photo!
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">Inspector: {insp.inspector_name}</span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" /> {insp.quality_rating}/5 Stars
                    </span>
                    <span className="text-slate-300">Durability: {insp.durability_assessment}</span>
                  </div>
                  <span className="text-slate-400 font-mono">{new Date(insp.inspected_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Append-Only Audit Trail */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Append-Only Case Audit Trail (Immutable Log)
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            Tamper-Resistant
          </span>
        </div>

        <div className="relative border-l border-slate-800 ml-4 space-y-4 py-2">
          {audit_logs.map((log) => (
            <div key={log.log_id} className="relative pl-6 text-xs">
              <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900"></div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
                  {log.action_type.replace('_', ' ')}
                </span>
                <span className="text-slate-500 font-mono text-[10px]">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-300 mt-0.5">{log.change_summary}</p>
              <div className="text-[10px] text-slate-400 mt-0.5">By {log.actor_name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showScoreModal && (
        <ScoreBreakdownModal
          caseData={c}
          onClose={() => setShowScoreModal(false)}
        />
      )}

      {showMergeModal && (
        <DuplicateMergeModal
          targetCase={c}
          onClose={() => setShowMergeModal(false)}
          onMerged={() => loadCase()}
        />
      )}

      {showVerifyModal && (
        <VerificationModal
          caseData={c}
          workOrder={latestWorkOrder}
          inspection={latestInspection}
          onClose={() => setShowVerifyModal(false)}
          onUpdated={() => loadCase()}
        />
      )}

      {showWorkOrderModal && (
        <WorkOrderModal
          caseData={c}
          existingWorkOrder={activeWorkOrderForEdit}
          onClose={() => setShowWorkOrderModal(false)}
          onSaved={() => loadCase()}
        />
      )}
    </div>
  );
}
