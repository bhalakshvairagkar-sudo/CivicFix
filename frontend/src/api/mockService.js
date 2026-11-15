import {
  DEMO_USERS,
  MOCK_CASES,
  MOCK_ASSETS,
  MOCK_REPORTS,
  MOCK_WORK_ORDERS,
  MOCK_AUDIT_LOGS
} from './mockData';

// Mutable in-memory state copies
let casesState = [...MOCK_CASES];
let reportsState = [...MOCK_REPORTS];
let assetsState = [...MOCK_ASSETS];
let workOrdersState = [...MOCK_WORK_ORDERS];
let auditLogsState = [...MOCK_AUDIT_LOGS];

export async function handleMockRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const [cleanPath, queryString] = endpoint.split('?');
  const params = new URLSearchParams(queryString || '');
  
  let body = {};
  if (options.body) {
    try {
      body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch (_) {}
  }

  // Artificial short delay to feel authentic
  await new Promise(r => setTimeout(r, 60));

  // 1. Authentication
  if (cleanPath === '/auth/login' || cleanPath === '/api/auth/login') {
    const email = (body.email || '').toLowerCase().trim();
    let user = DEMO_USERS[email];
    if (!user) {
      const role = email.includes('admin') ? 'ADMIN' : (email.includes('staff') || email.includes('roads') || email.includes('lighting') ? 'STAFF' : 'CITIZEN');
      user = {
        user_id: 99,
        email: email || 'marcus.admin@civicfix.gov',
        full_name: email ? email.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()) : 'Marcus Vance',
        role,
        department_id: role === 'STAFF' ? 1 : null,
        department_name: role === 'STAFF' ? 'Roads & Bridges Department' : null,
        department_code: role === 'STAFF' ? 'ROADS' : null
      };
    }
    return {
      access_token: `civicfix_demo_jwt_token_${user.user_id}`,
      token_type: 'bearer',
      user
    };
  }

  if (cleanPath === '/auth/me' || cleanPath === '/api/auth/me') {
    const saved = localStorage.getItem('civicfix_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return DEMO_USERS['marcus.admin@civicfix.gov'];
  }

  // 2. Health & Status
  if (cleanPath === '/health' || cleanPath === '/api/health') {
    return {
      status: 'healthy',
      mode: 'client_in_browser_evaluator',
      database: 'connected',
      engine: 'MySQL 9.7 Enterprise (In-Memory Simulator)',
      region: 'India National Municipal Grid (Bengaluru Command Center)'
    };
  }

  // 3. Analytics Overview
  if (cleanPath === '/analytics/overview' || cleanPath === '/api/analytics/overview' || cleanPath === '/analytics/summary' || cleanPath === '/api/analytics/summary') {
    return {
      kpis: {
        total_citizen_reports: reportsState.length + 23,
        total_cases: casesState.length,
        active_cases: 23,
        closed_cases: 12,
        recurring_failures_count: 9,
        recurring_failure_rate_pct: 25.7,
        avg_resolution_hours: 36.4,
        total_repair_expenditure: 4280000.0
      },
      category_distribution: [
        { category: "POTHOLE", count: 10, closed_count: 3, avg_priority: 86.4 },
        { category: "STREETLIGHT", count: 7, closed_count: 2, avg_priority: 74.0 },
        { category: "DRAINAGE", count: 6, closed_count: 2, avg_priority: 84.5 },
        { category: "WATER_LEAK", count: 5, closed_count: 2, avg_priority: 82.2 },
        { category: "FOOTPATH", count: 4, closed_count: 2, avg_priority: 60.5 },
        { category: "TRAFFIC_SIGNAL", count: 3, closed_count: 1, avg_priority: 81.3 }
      ],
      status_distribution: [
        { status: "IN_PROGRESS", count: 10 },
        { status: "OPEN", count: 7 },
        { status: "ASSIGNED", count: 6 },
        { status: "VERIFIED_CLOSED", count: 12 }
      ],
      severity_distribution: [
        { severity: "CRITICAL", count: 12 },
        { severity: "HIGH", count: 12 },
        { severity: "MEDIUM", count: 7 },
        { severity: "LOW", count: 4 }
      ],
      department_performance: [
        { department_id: 1, code: "ROADS", name: "Roads & Bridges Department", annual_budget: 12000000.0, spent_budget: 3450000.0, budget_utilized_pct: 28.75, total_cases: 14, active_cases: 9, closed_cases: 5, recurring_cases: 4, avg_resolution_hours: 32.5, total_work_order_expenditure: 1645000.0 },
        { department_id: 2, code: "LIGHTING", name: "Electrical & Public Lighting", annual_budget: 6500000.0, spent_budget: 1850000.0, budget_utilized_pct: 28.46, total_cases: 7, active_cases: 5, closed_cases: 2, recurring_cases: 2, avg_resolution_hours: 21.5, total_work_order_expenditure: 784000.0 },
        { department_id: 3, code: "DRAINAGE", name: "Stormwater & Water Supply Works", annual_budget: 9500000.0, spent_budget: 4200000.0, budget_utilized_pct: 44.21, total_cases: 11, active_cases: 7, closed_cases: 4, recurring_cases: 2, avg_resolution_hours: 42.0, total_work_order_expenditure: 1556000.0 },
        { department_id: 4, code: "TRAFFIC", name: "Traffic Signals & Urban Signage", annual_budget: 4500000.0, spent_budget: 920000.0, budget_utilized_pct: 20.44, total_cases: 3, active_cases: 2, closed_cases: 1, recurring_cases: 1, avg_resolution_hours: 16.0, total_work_order_expenditure: 295000.0 }
      ],
      monthly_trends: [
        { month_label: "Jun 2026", reports_lodged: 18, cases_resolved: 14 },
        { month_label: "Jul 2026", reports_lodged: 26, cases_resolved: 21 },
        { month_label: "Aug 2026", reports_lodged: 34, cases_resolved: 29 },
        { month_label: "Sep 2026", reports_lodged: 42, cases_resolved: 35 },
        { month_label: "Oct 2026", reports_lodged: 49, cases_resolved: 41 },
        { month_label: "Nov 2026", reports_lodged: 58, cases_resolved: 12 }
      ],
      hotspot_assets: assetsState.slice(0, 5)
    };
  }

  // 4. Cases
  if (cleanPath === '/cases' || cleanPath === '/api/cases') {
    let result = [...casesState];
    const statusParam = params.get('status');
    if (statusParam) {
      const allowed = statusParam.split(',').map(s => s.trim());
      result = result.filter(c => allowed.includes(c.status));
    }
    const categoryParam = params.get('category');
    if (categoryParam) {
      result = result.filter(c => c.category === categoryParam);
    }
    return result;
  }

  // Single Case Detail
  const caseMatch = cleanPath.match(/^\/(?:api\/)?cases\/(\d+)$/);
  if (caseMatch) {
    const cid = parseInt(caseMatch[1], 10);
    const cItem = casesState.find(c => c.case_id === cid) || casesState[0];
    const cReports = reportsState.filter(r => r.case_id === cid);
    const cWos = workOrdersState.filter(w => w.case_id === cid);
    return {
      case: cItem,
      reports: cReports.length ? cReports : reportsState.slice(0, 2),
      work_orders: cWos.length ? cWos : workOrdersState.slice(0, 1),
      inspections: [
        {
          inspection_id: 1,
          case_id: cid,
          work_order_id: 1,
          inspector_id: 1,
          inspector_name: "Marcus Vance",
          decision: "PASSED",
          notes: "Quality check passed. Compaction and drainage slope verified with laser leveler.",
          created_at: "2026-11-14T15:30:00Z"
        }
      ],
      audit_logs: auditLogsState
    };
  }

  // Duplicate candidates
  if (cleanPath.includes('/duplicate-candidates')) {
    return [
      {
        report_id: 2,
        tracking_code: "REP-IND-002",
        distance_meters: 14.2,
        category: "POTHOLE",
        severity: "CRITICAL",
        address_text: "Lady Curzon Rd, 15m from Emergency Gate",
        created_at: "2026-11-10T09:15:00Z",
        reporter_name: "Priya Nair",
        confidence_score: 0.98
      }
    ];
  }

  // Merge duplicate
  if (cleanPath.includes('/merge-duplicate')) {
    return {
      success: true,
      message: "Duplicate citizen report successfully merged under ACID transaction. Priority recalculated."
    };
  }

  // 5. Assets
  if (cleanPath === '/assets' || cleanPath === '/api/assets') {
    return assetsState;
  }

  const assetMatch = cleanPath.match(/^\/(?:api\/)?assets\/(\d+)$/);
  if (assetMatch) {
    const aid = parseInt(assetMatch[1], 10);
    return assetsState.find(a => a.asset_id === aid) || assetsState[0];
  }

  if (cleanPath.includes('/investigation')) {
    const aidMatch = cleanPath.match(/assets\/(\d+)/);
    if (aidMatch) {
      const aid = parseInt(aidMatch[1], 10);
      const asset = assetsState.find(a => a.asset_id === aid);
      if (asset) {
        asset.is_flagged_for_investigation = !asset.is_flagged_for_investigation;
      }
    }
    return {
      success: true,
      message: "Asset investigation audit flag toggled successfully."
    };
  }

  // 6. Reports
  if (cleanPath === '/reports' || cleanPath === '/api/reports') {
    if (method === 'POST') {
      const newId = reportsState.length + 1;
      const code = `REP-IND-${String(newId).padStart(3, '0')}`;
      const newReport = {
        report_id: newId,
        tracking_code: code,
        category: body.category || 'POTHOLE',
        severity: body.severity || 'MEDIUM',
        status: 'SUBMITTED',
        address_text: body.address_text || 'Bengaluru Municipal Corporation Zone',
        photo_url: body.photo_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
        latitude: parseFloat(body.latitude || 12.9716),
        longitude: parseFloat(body.longitude || 77.5946),
        upvote_count: 1,
        case_id: 1,
        created_at: new Date().toISOString(),
        reporter_name: 'Verified Citizen Resident'
      };
      reportsState.unshift(newReport);
      return {
        report_id: newId,
        tracking_code: code,
        case_id: 1,
        is_primary: true,
        duplicate_linked: false,
        message: 'Report successfully lodged and assigned tracking code.'
      };
    }
    return reportsState;
  }

  // Report Tracking
  const trackMatch = cleanPath.match(/^\/(?:api\/)?reports\/track\/(.+)$/);
  if (trackMatch) {
    const tcode = trackMatch[1].toUpperCase();
    const rep = reportsState.find(r => r.tracking_code === tcode) || reportsState[0];
    return {
      ...rep,
      case_status: 'IN_PROGRESS',
      department_name: 'Roads & Bridges Department',
      assigned_team: 'Dave Rodriguez',
      estimated_resolution: '2026-11-20'
    };
  }

  // Report Upvote
  if (cleanPath.includes('/upvote')) {
    const repIdMatch = cleanPath.match(/reports\/(\d+)\/upvote/);
    if (repIdMatch) {
      const rid = parseInt(repIdMatch[1], 10);
      const report = reportsState.find(r => r.report_id === rid);
      if (report) {
        report.upvote_count = (report.upvote_count || 0) + 1;
      }
    }
    return {
      success: true,
      message: 'Citizen confirmation upvote registered. Case urgency score boosted.'
    };
  }

  // 7. Work Orders
  if (cleanPath === '/work-orders' || cleanPath === '/api/work-orders') {
    if (method === 'POST') {
      const newWo = {
        work_order_id: workOrdersState.length + 1,
        work_order_number: `WO-2026-BLR-01${workOrdersState.length + 1}`,
        case_id: body.case_id || 1,
        case_number: 'CF-2026-0001',
        category: body.category || 'POTHOLE',
        contractor_name: body.contractor_name || 'L&T Urban Infra Projects',
        status: 'ASSIGNED',
        allocated_budget: parseFloat(body.allocated_budget || 45000),
        actual_cost: 0,
        assigned_to_name: 'Dave Rodriguez',
        created_at: new Date().toISOString()
      };
      workOrdersState.unshift(newWo);
      return newWo;
    }
    return workOrdersState;
  }

  const woMatch = cleanPath.match(/^\/(?:api\/)?work-orders\/(\d+)$/);
  if (woMatch && (method === 'PATCH' || method === 'PUT')) {
    const wId = parseInt(woMatch[1], 10);
    const wo = workOrdersState.find(w => w.work_order_id === wId);
    if (wo) {
      Object.assign(wo, body);
    }
    return {
      success: true,
      message: 'Work order successfully updated.',
      data: wo
    };
  }

  // 8. Inspections & Closure
  if (cleanPath === '/inspections' || cleanPath === '/api/inspections') {
    return {
      inspection_id: 99,
      status: 'RECORDED',
      message: 'Verification inspection recorded with evidence photos.'
    };
  }

  if (cleanPath.includes('/closure-decision')) {
    return {
      success: true,
      message: 'Case closure approved and audited under ACID transaction.'
    };
  }

  // 9. Departments
  if (cleanPath === '/departments' || cleanPath === '/api/departments') {
    return [
      { department_id: 1, code: "ROADS", name: "Roads & Bridges Department", annual_budget: 12000000.0, spent_budget: 3450000.0 },
      { department_id: 2, code: "LIGHTING", name: "Electrical & Public Lighting", annual_budget: 6500000.0, spent_budget: 1850000.0 },
      { department_id: 3, code: "DRAINAGE", name: "Stormwater & Water Supply Works", annual_budget: 9500000.0, spent_budget: 4200000.0 },
      { department_id: 4, code: "TRAFFIC", name: "Traffic Signals & Urban Signage", annual_budget: 4500000.0, spent_budget: 920000.0 }
    ];
  }

  // 10. Audit Logs
  if (cleanPath === '/audit-logs' || cleanPath === '/api/audit-logs') {
    return auditLogsState;
  }

  // 11. DBMS Insights
  if (cleanPath === '/dbms/overview' || cleanPath === '/api/dbms/overview') {
    return {
      engine_info: {
        version: "9.7.0-enterprise",
        isolation_level: "READ-COMMITTED",
        sql_mode: "STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION"
      },
      foreign_keys_count: 24,
      tables: [
        { table_name: "repair_cases", engine: "InnoDB", estimated_rows: casesState.length, data_bytes: 131072, index_bytes: 65536, total_kb: 192.0 },
        { table_name: "citizen_reports", engine: "InnoDB", estimated_rows: reportsState.length, data_bytes: 98304, index_bytes: 32768, total_kb: 128.0 },
        { table_name: "infrastructure_assets", engine: "InnoDB", estimated_rows: assetsState.length, data_bytes: 49152, index_bytes: 16384, total_kb: 64.0 },
        { table_name: "work_orders", engine: "InnoDB", estimated_rows: workOrdersState.length, data_bytes: 49152, index_bytes: 16384, total_kb: 64.0 },
        { table_name: "audit_logs", engine: "InnoDB", estimated_rows: auditLogsState.length, data_bytes: 163840, index_bytes: 65536, total_kb: 224.0 },
        { table_name: "departments", engine: "InnoDB", estimated_rows: 4, data_bytes: 16384, index_bytes: 16384, total_kb: 32.0 },
        { table_name: "sensitive_locations", engine: "InnoDB", estimated_rows: 8, data_bytes: 16384, index_bytes: 16384, total_kb: 32.0 }
      ]
    };
  }

  if (cleanPath === '/dbms/schema' || cleanPath === '/api/dbms/schema') {
    return {
      schema_name: "civicfix_db",
      tables: [
        {
          name: "repair_cases",
          columns: [
            { name: "case_id", type: "int", key: "PRI", nullable: false },
            { name: "case_number", type: "varchar(32)", key: "UNI", nullable: false },
            { name: "asset_id", type: "int", key: "MUL", nullable: true },
            { name: "category", type: "varchar(32)", key: "MUL", nullable: false },
            { name: "status", type: "varchar(32)", key: "MUL", nullable: false },
            { name: "priority_score", type: "decimal(5,2)", key: "MUL", nullable: false },
            { name: "latitude", type: "decimal(10,8)", key: "MUL", nullable: false },
            { name: "longitude", type: "decimal(11,8)", key: "MUL", nullable: false },
            { name: "version", type: "int", key: "", nullable: false }
          ]
        },
        {
          name: "citizen_reports",
          columns: [
            { name: "report_id", type: "int", key: "PRI", nullable: false },
            { name: "tracking_code", type: "varchar(32)", key: "UNI", nullable: false },
            { name: "case_id", type: "int", key: "MUL", nullable: true },
            { name: "category", type: "varchar(32)", key: "", nullable: false },
            { name: "upvote_count", type: "int", key: "", nullable: false }
          ]
        }
      ]
    };
  }

  if (cleanPath === '/dbms/benchmark' || cleanPath === '/api/dbms/benchmark') {
    const qType = body.query_type || "CATEGORY_STATUS";
    const limit = parseInt(body.limit || 500, 10);
    return {
      benchmark_name: `B-Tree Composite Index Performance Evaluation (${qType})`,
      query_type: qType,
      total_benchmark_records: 12000,
      speedup_factor: "28.4x Faster",
      analysis: "Compound B-Tree index (category, status, priority_score) avoids table scan via index-only range access.",
      unindexed: {
        access_type: "ALL",
        sql: `SELECT * FROM repair_cases IGNORE INDEX (idx_cases_cat_status) WHERE category='POTHOLE' AND status='IN_PROGRESS' ORDER BY priority_score DESC LIMIT ${limit};`,
        execution_time_ms: 38.64,
        key_used: "NONE (Full Table Scan)",
        estimated_rows_examined: 12000,
        explain_raw: {
          select_type: "SIMPLE",
          table: "repair_cases",
          type: "ALL",
          possible_keys: null,
          key: null,
          rows: 12000,
          Extra: "Using where; Using filesort"
        }
      },
      indexed: {
        access_type: "ref / range",
        sql: `SELECT * FROM repair_cases FORCE INDEX (idx_cases_cat_status) WHERE category='POTHOLE' AND status='IN_PROGRESS' ORDER BY priority_score DESC LIMIT ${limit};`,
        execution_time_ms: 1.36,
        key_used: "idx_cases_cat_status",
        estimated_rows_examined: 10,
        explain_raw: {
          select_type: "SIMPLE",
          table: "repair_cases",
          type: "ref",
          possible_keys: "idx_cases_cat_status",
          key: "idx_cases_cat_status",
          rows: 10,
          Extra: "Using index condition"
        }
      }
    };
  }

  // Default fallback for any unhandled endpoint
  return {
    success: true,
    message: "Operation completed successfully.",
    data: []
  };
}
