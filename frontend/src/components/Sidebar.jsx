import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  FolderKanban,
  FileText,
  Cpu,
  Wrench,
  Building2,
  ShieldCheck,
  Database,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Interactive Map', icon: MapPin },
    { id: 'cases', label: 'Repair Cases', icon: FolderKanban },
    { id: 'reports', label: 'Citizen Reports', icon: FileText },
    { id: 'assets', label: 'Infrastructure Memory', icon: Cpu, badge: 'History' },
    { id: 'work_orders', label: 'Work Orders', icon: Wrench },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck, badge: 'Append-Only' },
    {
      id: 'dbms_insights',
      label: 'DBMS Insights',
      icon: Database,
      highlight: true,
      badge: '3NF & EXPLAIN'
    }
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 flex flex-col justify-between py-6 px-4 hidden md:flex shrink-0">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div className="space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            System Modules
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? item.highlight
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                      : 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-md'
                    : item.highlight
                    ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? (item.highlight ? 'text-white' : 'text-emerald-400') : item.highlight ? 'text-emerald-400' : 'text-slate-400'
                  }`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive && item.highlight
                      ? 'bg-white/20 text-white'
                      : item.highlight
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-700/50 text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* College Project DBMS Verification Badge */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-800/40 to-slate-900/60 border border-slate-800 text-slate-400 text-xs space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>DBMS Project Scope</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Normalized 3NF relational schema, B-Tree indexed access, ACID transactions, and live query plans.
        </p>
      </div>
    </aside>
  );
}
