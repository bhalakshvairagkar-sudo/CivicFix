import React, { useState } from 'react';
import { ShieldAlert, User, Lock, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onLoginSuccess }) {
  const { login, switchDemoUser } = useAuth();
  const [email, setEmail] = useState('marcus.admin@civicfix.gov');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const demoPresets = [
    {
      role: 'ADMIN',
      name: 'Marcus Vance',
      title: 'Chief Municipal Engineer',
      email: 'marcus.admin@civicfix.gov',
      desc: 'Full administrative access: Merge duplicates, approve closures, view DBMS insights.'
    },
    {
      role: 'STAFF',
      name: 'Dave Rodriguez',
      title: 'Roads & Bridges Inspector',
      email: 'dave.roads@civicfix.gov',
      desc: 'Department access: Manage work orders, submit before/after photo inspections.'
    },
    {
      role: 'STAFF',
      name: 'Elena Rostova',
      title: 'Electrical Crew Lead',
      email: 'elena.lighting@civicfix.gov',
      desc: 'Department access: Track streetlight outages and electrical repairs.'
    },
    {
      role: 'CITIZEN',
      name: 'Alice Cooper',
      title: 'Civic Resident (Ward 4)',
      email: 'alice.citizen@gmail.com',
      desc: 'Citizen access: Submit infrastructure damage reports, track resolution, upvote issues.'
    }
  ];

  const handleManualLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = async (presetEmail) => {
    try {
      setLoading(true);
      setError(null);
      await switchDemoUser(presetEmail, 'Password123!');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b0f19] relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 glass-panel border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Left: 1-Click Evaluation Demo Presets */}
        <div className="p-8 bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white">Civic<span className="text-emerald-400">Fix</span></span>
                <p className="text-[11px] text-slate-400">DBMS Course Project Local Demo</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[11px] text-emerald-400">
                1-Click Evaluator Sign-In
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Click any pre-seeded persona to test role-based access control (RBAC):
              </p>
            </div>

            {/* Presets List */}
            <div className="space-y-2.5">
              {demoPresets.map((p) => (
                <button
                  key={p.email}
                  disabled={loading}
                  onClick={() => handlePresetClick(p.email)}
                  className="w-full text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all group flex items-start justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">
                        {p.name}
                      </span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                        p.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : p.role === 'STAFF' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {p.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{p.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1 shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            MySQL 9.7 Database Verified • Port 3308
          </div>
        </div>

        {/* Right: Standard Login Form */}
        <div className="p-8 flex flex-col justify-center space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Manual Sign-In</h2>
            <p className="text-xs text-slate-400 mt-1">
              Authenticate with email credentials or evaluate via presets on the left.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Email Address</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/25 text-xs flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In with Credentials'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            Default seeded password for all demo accounts: <b className="text-slate-200 font-mono">Password123!</b>
          </div>
        </div>
      </div>
    </div>
  );
}
