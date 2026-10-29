import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, CheckCircle2, RotateCcw, Camera, Star } from 'lucide-react';
import { api } from '../api/client';

export default function VerificationModal({ caseData, workOrder, inspection, onClose, onUpdated }) {
  const [afterPhoto, setAfterPhoto] = useState(
    inspection?.after_photo_url || 
    'https://images.unsplash.com/photo-1578991624414-276ef23a534f?w=600&auto=format&fit=crop&q=80'
  );
  const [qualityRating, setQualityRating] = useState(inspection?.quality_rating || 4);
  const [durability, setDurability] = useState(inspection?.durability_assessment || 'GOOD');
  const [notes, setNotes] = useState(inspection?.inspection_notes || 'Reinstatement compacted with hot bitumen seal and level graded.');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isExistingInspection = Boolean(inspection?.inspection_id);

  // Submit new inspection if none exists
  const handleSubmitInspection = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const res = await api.post('/inspections', {
        case_id: caseData.case_id,
        work_order_id: workOrder?.work_order_id || 1,
        before_photo_url: caseData.photo_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
        after_photo_url: afterPhoto,
        quality_rating: qualityRating,
        durability_assessment: durability,
        inspection_notes: notes,
        passed_verification: qualityRating >= 3 && Boolean(afterPhoto)
      });
      if (onUpdated) onUpdated(res);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Sign off on existing inspection
  const handleDecision = async (approved) => {
    try {
      setSubmitting(true);
      setError(null);
      const res = await api.post(`/inspections/${inspection.inspection_id}/closure-decision`, {
        approved,
        review_notes: reviewNotes || (approved ? 'Closure approved after photographic evidence verification.' : 'Reopened for contractor rework.')
      });
      if (onUpdated) onUpdated(res);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!caseData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Evidence-Based Repair Verification
              </h3>
              <p className="text-xs text-slate-400">
                Audit photographic evidence, durability, and closure sign-off for Case #{caseData.case_number}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Suspicious Flags Banner if present */}
          {inspection?.is_suspicious && inspection.suspicious_flags && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Supervisory Verification Warning (Non-Accusatory)</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-300/90 pl-1">
                {inspection.suspicious_flags.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Before & After Photo Comparison */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Photographic Evidence Comparison
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Photo */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-400">Before Repair (Damage Photo)</span>
                <div className="aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-800 relative group">
                  <img
                    src={inspection?.before_photo_url || caseData.photo_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80'}
                    alt="Before Repair"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm">
                    Reported Defect
                  </div>
                </div>
              </div>

              {/* After Photo */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-400">After Repair (Completion Proof)</span>
                <div className="aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-800 relative">
                  {afterPhoto ? (
                    <img src={afterPhoto} alt="After Repair" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
                      <Camera className="w-6 h-6 text-slate-600" />
                      <span>No verified after-photo provided</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 backdrop-blur-sm">
                    Reinstatement Proof
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isExistingInspection ? (
            /* Submission Form for New Inspection */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">After-Repair Photo URL</label>
                <input
                  type="text"
                  value={afterPhoto}
                  onChange={(e) => setAfterPhoto(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Quality Rating (1-5)</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setQualityRating(star)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          star <= qualityRating ? 'text-amber-400' : 'text-slate-600 hover:text-slate-500'
                        }`}
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Durability Assessment</label>
                  <select
                    value={durability}
                    onChange={(e) => setDurability(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="EXCELLENT">Excellent (3+ Years expected)</option>
                    <option value="GOOD">Good (Standard Durability)</option>
                    <option value="SATISFACTORY">Satisfactory (Minor flaws)</option>
                    <option value="POOR">Poor (Premature failure risk)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Inspector Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>
            </div>
          ) : (
            /* Managerial Review Sign-off */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400">Inspector Rating:</span>
                  <div className="font-semibold text-amber-400 flex items-center gap-1 mt-0.5">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{inspection.quality_rating} / 5 Stars</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Durability Grade:</span>
                  <div className="font-semibold text-slate-200 mt-0.5">{inspection.durability_assessment}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Field Notes:</span>
                  <p className="text-slate-300 mt-0.5">{inspection.inspection_notes}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Managerial Sign-Off / Review Remarks
                </label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Verified by Chief Engineer; compaction test results acceptable."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200">
            Cancel
          </button>
          
          {!isExistingInspection ? (
            <button
              disabled={submitting}
              onClick={handleSubmitInspection}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{submitting ? 'Logging...' : 'Submit Verification Inspection'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                disabled={submitting}
                onClick={() => handleDecision(false)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reject & Reopen Case</span>
              </button>
              <button
                disabled={submitting}
                onClick={() => handleDecision(true)}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Close Case</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
