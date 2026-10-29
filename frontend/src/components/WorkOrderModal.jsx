import React, { useState } from 'react';
import { X, Wrench, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function WorkOrderModal({ caseData, existingWorkOrder, onClose, onSaved }) {
  const [teamLeader, setTeamLeader] = useState(existingWorkOrder?.assigned_team_leader || 'Foreman Mike Taylor');
  const [contractor, setContractor] = useState(existingWorkOrder?.contractor_name || 'Apex Roadworks Ltd.');
  const [estimatedCost, setEstimatedCost] = useState(existingWorkOrder?.estimated_cost || 2500);
  const [actualCost, setActualCost] = useState(existingWorkOrder?.actual_cost || 0);
  const [targetDate, setTargetDate] = useState(
    existingWorkOrder?.target_completion_date 
      ? new Date(existingWorkOrder.target_completion_date).toISOString().split('T')[0]
      : new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
  );
  const [materials, setMaterials] = useState(existingWorkOrder?.materials_used || 'Polymer asphalt, tack coat, bitumen emulsion');
  const [workNotes, setWorkNotes] = useState(existingWorkOrder?.work_notes || 'Crew dispatched with asphalt roller and traffic safety barriers.');
  const [statusVal, setStatusVal] = useState(existingWorkOrder?.status || 'SCHEDULED');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(existingWorkOrder?.work_order_id);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      if (isEdit) {
        const res = await api.patch(`/work-orders/${existingWorkOrder.work_order_id}`, {
          status: statusVal,
          actual_cost: parseFloat(actualCost),
          materials_used: materials,
          work_notes: workNotes
        });
        if (onSaved) onSaved(res);
      } else {
        const res = await api.post('/work-orders', {
          case_id: caseData.case_id,
          department_id: caseData.department_id || 1,
          assigned_team_leader: teamLeader,
          contractor_name: contractor,
          estimated_cost: parseFloat(estimatedCost),
          target_completion_date: new Date(targetDate).toISOString(),
          materials_used: materials,
          work_notes: workNotes
        });
        if (onSaved) onSaved(res);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!caseData && !existingWorkOrder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                {isEdit ? `Update Work Order #${existingWorkOrder.work_order_number}` : 'Dispatch New Work Order'}
              </h3>
              <p className="text-xs text-slate-400">
                Manage crew dispatch, contractor assignment, and budget allocation
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Execution Status</label>
              <select
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="CREW_DISPATCHED">Crew Dispatched</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WORK_COMPLETED">Work Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Team Leader</label>
              <input
                type="text"
                required
                disabled={isEdit}
                value={teamLeader}
                onChange={(e) => setTeamLeader(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Contractor / Agency</label>
              <input
                type="text"
                disabled={isEdit}
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Estimated Budget ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                disabled={isEdit}
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-60"
              />
            </div>

            {isEdit ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Actual Recorded Expense ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Materials / Equipment</label>
            <textarea
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Operational Field Notes</label>
            <textarea
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            ></textarea>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all shadow-lg shadow-amber-600/20"
            >
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Dispatch Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
