import React, { useState, useEffect } from 'react';
import {
  Database,
  Layers,
  Key,
  ShieldCheck,
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Table,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';

export default function DBMSInsightsPage() {
  const [activeTab, setActiveTab] = useState('benchmark'); // 'benchmark' | 'schema' | 'normalization' | 'transactions' | 'queries'
  const [overview, setOverview] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live Benchmark state
  const [queryType, setQueryType] = useState('CATEGORY_STATUS');
  const [limit, setLimit] = useState(500);
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);

  useEffect(() => {
    async function loadDbmsMeta() {
      try {
        setLoading(true);
        const [ovData, schData] = await Promise.all([
          api.get('/dbms/overview'),
          api.get('/dbms/schema')
        ]);
        setOverview(ovData);
        setSchema(schData);

        // Pre-run default benchmark
        const bm = await api.post('/dbms/benchmark', { query_type: 'CATEGORY_STATUS', limit: 500 });
        setBenchmarkResult(bm);
      } catch (err) {
        console.error('Failed to load DBMS metadata:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDbmsMeta();
  }, []);

  const handleRunBenchmark = async () => {
    try {
      setBenchmarkLoading(true);
      const res = await api.post('/dbms/benchmark', { query_type: queryType, limit });
      setBenchmarkResult(res);
    } catch (err) {
      console.error('Benchmark failed:', err);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const tablesMeta = overview?.tables || [];

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Top Banner */}
      <div className="glass-card p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </span>
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-400">
              College DBMS Project Architecture
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            DBMS Insights & Query Performance Engine
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Examine relational schema design in 3NF, primary & foreign key constraints, ACID transaction boundaries, and live execution plan comparisons against genuine MySQL 9.7 InnoDB tables.
          </p>
        </div>

        {/* Engine Specs Pill */}
        <div className="grid grid-cols-2 gap-3 shrink-0 text-xs font-mono">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block">STORAGE ENGINE</span>
            <span className="text-emerald-400 font-bold">MySQL 9.7 InnoDB</span>
          </div>
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block">FOREIGN KEYS</span>
            <span className="text-indigo-400 font-bold">{overview?.foreign_keys_count || 14} Constraints</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center overflow-x-auto p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800 gap-1.5 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('benchmark')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'benchmark'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Live Query Optimization (EXPLAIN)</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'schema'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Relational Schema & Tables ({tablesMeta.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('normalization')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'normalization'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>3NF Normalization Decisions</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>ACID Transactions & Concurrency</span>
        </button>

        <button
          onClick={() => setActiveTab('queries')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'queries'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Views & Complex SQL DDL</span>
        </button>
      </div>

      {/* ======================================================================= */}
      {/* TAB 1: LIVE QUERY PERFORMANCE BENCHMARK (REAL MYSQL EXPLAIN)            */}
      {/* ======================================================================= */}
      {activeTab === 'benchmark' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Benchmark Query Scenario</label>
                <select
                  value={queryType}
                  onChange={(e) => setQueryType(e.target.value)}
                  className="px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="CATEGORY_STATUS">Composite Index: (category, status)</option>
                  <option value="ASSET_HISTORY">Single-Column Index: (asset_code)</option>
                  <option value="COST_AGGREGATION">Group By Indexed vs Unindexed Columns</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Record Limit</label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value={100}>100 Records</option>
                  <option value={500}>500 Records</option>
                  <option value={1000}>1000 Records</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunBenchmark}
              disabled={benchmarkLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{benchmarkLoading ? 'Running Trials on MySQL...' : 'Run Live MySQL Benchmark'}</span>
            </button>
          </div>

          {/* Benchmark Comparison Cards */}
          {benchmarkResult && (
            <div className="space-y-6">
              {/* Executive Summary Alert */}
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl font-bold font-mono">
                    {benchmarkResult.speedup_factor}
                  </span>
                  <div>
                    <span className="font-bold text-slate-200">Execution Plan Analysis: </span>
                    <span className="text-slate-300">{benchmarkResult.analysis}</span>
                  </div>
                </div>
                <span className="font-mono text-emerald-400 text-[11px] whitespace-nowrap">
                  Dataset: {benchmarkResult.total_benchmark_records.toLocaleString()} Rows
                </span>
              </div>

              {/* Side-by-Side Comparison Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Unindexed Full Table Scan */}
                <div className="glass-card p-6 rounded-2xl border border-rose-500/30 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                        Scan Scenario A
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">
                        Unindexed Full Table Scan (ALL)
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Access: {benchmarkResult.unindexed.access_type}
                    </span>
                  </div>

                  {/* SQL Statement Box */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Executed SQL</span>
                    <pre className="p-3 rounded-xl bg-black/60 border border-slate-800 text-rose-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                      {benchmarkResult.unindexed.sql}
                    </pre>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block">EXECUTION TIME</span>
                      <span className="font-mono font-bold text-rose-400 text-sm">
                        {benchmarkResult.unindexed.execution_time_ms} ms
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">KEY USED</span>
                      <span className="font-mono text-slate-300 text-xs">
                        {benchmarkResult.unindexed.key_used}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">EST. ROWS SCANNED</span>
                      <span className="font-mono font-bold text-slate-200 text-xs">
                        {benchmarkResult.unindexed.estimated_rows_examined.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Raw Explain Tree */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Raw MySQL EXPLAIN Plan Output
                    </span>
                    <pre className="p-3 rounded-xl bg-black/40 border border-slate-800 text-slate-400 font-mono text-[10px] overflow-x-auto">
                      {JSON.stringify(benchmarkResult.unindexed.explain_raw, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* 2. B-Tree Indexed Search */}
                <div className="glass-card p-6 rounded-2xl border border-emerald-500/40 space-y-4 relative overflow-hidden shadow-lg shadow-emerald-950/20">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Scan Scenario B (Optimized)
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">
                        B-Tree Index Lookup (ref / range)
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Access: {benchmarkResult.indexed.access_type}
                    </span>
                  </div>

                  {/* SQL Statement Box */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Executed SQL</span>
                    <pre className="p-3 rounded-xl bg-black/60 border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                      {benchmarkResult.indexed.sql}
                    </pre>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block">EXECUTION TIME</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {benchmarkResult.indexed.execution_time_ms} ms
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">INDEX USED</span>
                      <span className="font-mono font-bold text-emerald-300 text-xs">
                        {benchmarkResult.indexed.key_used}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">EST. ROWS SCANNED</span>
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {benchmarkResult.indexed.estimated_rows_examined.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Raw Explain Tree */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Raw MySQL EXPLAIN Plan Output
                    </span>
                    <pre className="p-3 rounded-xl bg-black/40 border border-slate-800 text-slate-400 font-mono text-[10px] overflow-x-auto">
                      {JSON.stringify(benchmarkResult.indexed.explain_raw, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: RELATIONAL SCHEMA & TABLES                                       */}
      {/* ======================================================================= */}
      {activeTab === 'schema' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tablesMeta.map((t) => (
              <div key={t.table_name} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-mono font-bold text-sm text-slate-100">{t.table_name}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 font-bold">
                    {t.engine}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 text-[10px] block">EST. ROWS</span>
                    <span className="text-white font-bold">{Number(t.estimated_rows || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">STORAGE SIZE</span>
                    <span className="text-emerald-400 font-bold">{t.total_kb} KB</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 3: 3NF NORMALIZATION DECISIONS                                      */}
      {/* ======================================================================= */}
      {activeTab === 'normalization' && (
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6 text-xs text-slate-300 leading-relaxed">
          <div>
            <h3 className="text-base font-bold text-white">Relational Database Normalization Proof (3NF)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Academic verification demonstrating 1NF, 2NF, and 3NF compliance with zero update, insertion, or deletion anomalies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1NF */}
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                First Normal Form (1NF)
              </span>
              <h4 className="font-bold text-white text-sm">Atomicity & Candidate Keys</h4>
              <p className="text-slate-400 text-xs">
                Every attribute in CivicFix contains strictly atomic values. Geospatial locations are separated into numeric <code>latitude</code> and <code>longitude</code> decimals. Multi-citizen duplicates are stored as separate tuples in <code>citizen_reports</code> referencing <code>case_id</code> rather than repeating groups or comma-separated lists.
              </p>
            </div>

            {/* 2NF */}
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                Second Normal Form (2NF)
              </span>
              <h4 className="font-bold text-white text-sm">No Partial Key Dependencies</h4>
              <p className="text-slate-400 text-xs">
                CivicFix tables employ surrogate single-attribute primary keys (e.g. <code>case_id</code>, <code>asset_id</code>, <code>report_id</code>). Because no primary key is composite, partial functional dependency ($X \subset K \rightarrow Y$) is mathematically impossible; all non-key attributes depend on the whole primary key.
              </p>
            </div>

            {/* 3NF */}
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Third Normal Form (3NF)
              </span>
              <h4 className="font-bold text-white text-sm">No Transitive Dependencies</h4>
              <p className="text-slate-400 text-xs">
                Department metadata (budget, phone, email) is isolated into <code>departments</code> rather than redundantly repeated across <code>repair_cases</code> or <code>work_orders</code>. Physical asset specifications reside in <code>infrastructure_assets</code>. This eliminates transitive dependencies ($A \rightarrow B \rightarrow C$).
              </p>
            </div>
          </div>

          {/* Table Relationships Summary */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h4 className="font-bold text-white text-sm">Entity Relationship Architecture</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <span>departments (1) ── (N) infrastructure_assets</span>
                <span className="text-emerald-400 text-[10px]">ON DELETE RESTRICT</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <span>infrastructure_assets (1) ── (N) repair_cases</span>
                <span className="text-emerald-400 text-[10px]">ON DELETE RESTRICT</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <span>repair_cases (1) ── (N) citizen_reports</span>
                <span className="text-emerald-400 text-[10px]">ON DELETE CASCADE</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <span>repair_cases (1) ── (N) work_orders</span>
                <span className="text-emerald-400 text-[10px]">ON DELETE RESTRICT</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <span>work_orders (1) ── (N) repair_inspections</span>
                <span className="text-emerald-400 text-[10px]">ON DELETE RESTRICT</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <span>users (1) ── (N) audit_logs</span>
                <span className="text-emerald-400 text-[10px]">ON DELETE SET NULL</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 4: ACID TRANSACTIONS & CONCURRENCY                                  */}
      {/* ======================================================================= */}
      {activeTab === 'transactions' && (
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6 text-xs text-slate-300 leading-relaxed">
          <div>
            <h3 className="text-base font-bold text-white">Database Transaction Handling & Concurrency Safety</h3>
            <p className="text-xs text-slate-400 mt-1">
              ACID guarantee implementation across duplicate merges, work order closure, and optimistic record versioning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-sm">Duplicate Case Merge Transaction</h4>
              <p className="text-slate-400 text-xs">
                When two citizen cases are merged, MySQL initiates a transaction (<code>START TRANSACTION</code>):
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-mono text-[11px]">
                <li>Re-links all <code>citizen_reports</code> from secondary to target case.</li>
                <li>Marks secondary case as <code>DUPLICATE_MERGED</code>.</li>
                <li>Updates target case report counter and recalculates risk priority score.</li>
                <li>Writes immutable change record into <code>audit_logs</code>.</li>
                <li>Commits atomically. If any foreign key or lock fails, full <code>ROLLBACK</code> is triggered.</li>
              </ol>
            </div>

            <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-sm">Optimistic Concurrency Control</h4>
              <p className="text-slate-400 text-xs">
                To prevent lost updates from concurrent municipal staff edits:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-300 font-mono text-[11px]">
                <li><code>repair_cases</code> contains a dedicated <code>version INT NOT NULL DEFAULT 1</code> attribute.</li>
                <li>Every mutation increments <code>version = version + 1</code>.</li>
                <li>Critical operations employ <code>SELECT ... FOR UPDATE</code> row-level locking to serialize competing transitions.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 5: VIEWS & COMPLEX SQL QUERIES                                      */}
      {/* ======================================================================= */}
      {activeTab === 'queries' && (
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6 text-xs text-slate-300">
          <div>
            <h3 className="text-base font-bold text-white">Database Views, Triggers & Aggregations DDL</h3>
            <p className="text-xs text-slate-400 mt-1">
              Complex multi-table SQL queries, aggregate window metrics, and triggers defined in the database schema.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <span className="font-mono text-emerald-400 font-bold block mb-1">
                View 1: v_case_priority_metrics (Priority joins with age & upvotes)
              </span>
              <pre className="p-4 bg-black/60 rounded-xl border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto">
{`CREATE OR REPLACE VIEW v_case_priority_metrics AS
SELECT 
    c.case_id, c.case_number, c.title, c.category, c.severity, c.status,
    c.priority_score, c.priority_level, c.priority_breakdown,
    c.latitude, c.longitude, c.is_recurring_failure, c.days_since_last_repair,
    c.created_at, c.closed_at,
    TIMESTAMPDIFF(DAY, c.created_at, NOW()) AS age_in_days,
    a.asset_id, a.asset_code, a.name AS asset_name, a.ward_number,
    a.current_health_score, d.department_id, d.code AS department_code,
    d.name AS department_name, COUNT(r.report_id) AS total_reports_count,
    COALESCE(SUM(r.upvotes_count), 0) AS total_citizen_upvotes
FROM repair_cases c
JOIN infrastructure_assets a ON c.asset_id = a.asset_id
JOIN departments d ON c.department_id = d.department_id
LEFT JOIN citizen_reports r ON c.case_id = r.case_id
GROUP BY c.case_id, ...;`}
              </pre>
            </div>

            <div>
              <span className="font-mono text-cyan-400 font-bold block mb-1">
                View 2: v_asset_health_summary (Infrastructure memory & cumulative spend)
              </span>
              <pre className="p-4 bg-black/60 rounded-xl border border-slate-800 text-cyan-300 font-mono text-[11px] overflow-x-auto">
{`CREATE OR REPLACE VIEW v_asset_health_summary AS
SELECT 
    a.asset_id, a.asset_code, a.name AS asset_name, a.category,
    a.current_health_score, a.total_incidents_count, a.recurring_failures_count,
    a.cumulative_repair_cost, a.replacement_cost_estimate,
    ROUND((a.cumulative_repair_cost / NULLIF(a.replacement_cost_estimate, 0)) * 100, 2) AS repair_vs_replacement_pct,
    a.investigation_flag, a.investigation_reason, d.code AS department_code
FROM infrastructure_assets a
JOIN departments d ON a.department_id = d.department_id
LEFT JOIN repair_cases c ON a.asset_id = c.asset_id
GROUP BY a.asset_id, ...;`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
