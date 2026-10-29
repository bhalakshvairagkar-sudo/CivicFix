import React, { useState } from 'react';
import { ShieldAlert, Plus, User, LogOut, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenReportModal }) {
  const { user, logout, switchDemoUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const demoAccounts = [
    { role: 'ADMIN', name: 'Marcus Vance', title: 'Chief Engineer', email: 'marcus.admin@civicfix.gov' },
    { role: 'STAFF', name: 'Dave Rodriguez', title: 'Roads Inspector', email: 'dave.roads@civicfix.gov' },
    { role: 'STAFF', name: 'Elena Rostova', title: 'Electrical Crew', email: 'elena.lighting@civicfix.gov' },
    { role: 'CITIZEN', name: 'Alice Cooper', title: 'Ward 4 Resident', email: 'alice.citizen@gmail.com' }
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">Civic<span className="text-emerald-400">Fix</span></span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              DBMS 3NF
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
            Intelligent Infrastructure Monitoring & Repair System
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Report Hazard Button */}
        {onOpenReportModal && (
          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Report Defect</span>
          </button>
        )}

        {/* Demo Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:bg-slate-700/70 text-xs transition-all"
          >
            <div className={`w-2 h-2 rounded-full ${
              user?.role === 'ADMIN' ? 'bg-purple-400' : user?.role === 'STAFF' ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <div className="text-left hidden md:block">
              <div className="font-semibold text-slate-200">{user?.full_name || 'Guest Citizen'}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.role || 'CITIZEN'}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 glass-panel border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                1-Click Demo Evaluation Switcher
              </div>
              <div className="py-1 space-y-1">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => {
                      switchDemoUser(acc.email);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all ${
                      user?.email === acc.email
                        ? 'bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20'
                        : 'text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-slate-200">{acc.name}</div>
                      <div className="text-[10px] text-slate-400">{acc.title} • {acc.role}</div>
                    </div>
                    {user?.email === acc.email && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
              <div className="pt-1 mt-1 border-t border-slate-800">
                <button
                  onClick={() => {
                    logout();
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
