import React from 'react';
import { AlertTriangle, Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function PriorityBadge({ level, score, showScore = true, onClick }) {
  const configs = {
    CRITICAL: {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: Flame,
      label: 'Critical'
    },
    HIGH: {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: AlertTriangle,
      label: 'High'
    },
    MEDIUM: {
      bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      icon: ShieldAlert,
      label: 'Medium'
    },
    LOW: {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
      label: 'Low'
    }
  };

  const cfg = configs[level] || configs.MEDIUM;
  const Icon = cfg.icon;

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${onClick ? 'cursor-pointer hover:brightness-125 transition-all' : ''}`}
      title={score ? `Priority Score: ${score}/100 - Click for formula breakdown` : undefined}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{cfg.label}</span>
      {showScore && score !== undefined && (
        <span className="font-mono opacity-80 pl-1 border-l border-current/20">
          {score}
        </span>
      )}
    </span>
  );
}
