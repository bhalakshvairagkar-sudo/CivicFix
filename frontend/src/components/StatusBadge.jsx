import React from 'react';
import { Clock, CheckCircle, ArrowRightCircle, AlertOctagon, GitMerge, RotateCcw } from 'lucide-react';

export default function StatusBadge({ status }) {
  const configs = {
    OPEN: {
      bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      icon: Clock,
      label: 'Open'
    },
    ASSIGNED: {
      bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      icon: ArrowRightCircle,
      label: 'Assigned'
    },
    IN_PROGRESS: {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: ArrowRightCircle,
      label: 'In Progress'
    },
    WORK_UNDERWAY: {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: ArrowRightCircle,
      label: 'Work Underway'
    },
    REPAIR_COMPLETED: {
      bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      icon: CheckCircle,
      label: 'Work Completed'
    },
    VERIFIED_CLOSED: {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle,
      label: 'Verified Closed'
    },
    RESOLVED: {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle,
      label: 'Resolved'
    },
    DUPLICATE_MERGED: {
      bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
      icon: GitMerge,
      label: 'Duplicate Merged'
    },
    REOPENED: {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: RotateCcw,
      label: 'Reopened'
    },
    SUBMITTED: {
      bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      icon: Clock,
      label: 'Submitted'
    },
    LINKED_TO_CASE: {
      bg: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      icon: GitMerge,
      label: 'Linked to Case'
    }
  };

  const cfg = configs[status] || {
    bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    icon: AlertOctagon,
    label: status?.replace('_', ' ') || 'Unknown'
  };

  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{cfg.label}</span>
    </span>
  );
}
