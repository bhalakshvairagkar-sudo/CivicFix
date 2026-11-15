import {
  DEFECT_PHOTOS,
  AFTER_PHOTOS,
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
        active_cases: casesState.filter(c => c.status !== 'VERIFIED_CLOSED' && c.status !== 'DUPLICATE_MERGED').length,
        closed_cases: casesState.filter(c => c.status === 'VERIFIED_CLOSED').length,
        recurring_failures_count: casesState.filter(c => c.is_recurring_failure).length,
        recurring_failure_rate_pct: 25.7,
        avg_resolution_hours: 36.4,
        total_repair_expenditure: 4280000.0
      },
      category_distribution: [
        { category: "POTHOLE", count: casesState.filter(c => c.category === 'POTHOLE').length, closed_count: 3, avg_priority: 86.4 },
        { category: "STREETLIGHT", count: casesState.filter(c => c.category === 'STREETLIGHT').length, closed_count: 2, avg_priority: 74.0 },
        { category: "DRAINAGE", count: casesState.filter(c => c.category === 'DRAINAGE').length, closed_count: 2, avg_priority: 84.5 },
        { category: "WATER_LEAK", count: casesState.filter(c => c.category === 'WATER_LEAK').length, closed_count: 2, avg_priority: 82.2 },
        { category: "FOOTPATH", count: casesState.filter(c => c.category === 'FOOTPATH').length, closed_count: 2, avg_priority: 60.5 },
        { category: "TRAFFIC_SIGNAL", count: casesState.filter(c => c.category === 'TRAFFIC_SIGNAL').length, closed_count: 1, avg_priority: 81.3 }
      ],
      status_distribution: [
        { status: "IN_PROGRESS", count: casesState.filter(c => c.status === 'IN_PROGRESS').length },
        { status: "OPEN", count: casesState.filter(c => c.status === 'OPEN').length },
        { status: "ASSIGNED", count: casesState.filter(c => c.status === 'ASSIGNED').length },
        { status: "VERIFIED_CLOSED", count: casesState.filter(c => c.status === 'VERIFIED_CLOSED').length }
      ],
      severity_distribution: [
        { severity: "CRITICAL", count: casesState.filter(c => c.severity === 'CRITICAL').length },
        { severity: "HIGH", count: casesState.filter(c => c.severity === 'HIGH').length },
        { severity: "MEDIUM", count: casesState.filter(c => c.severity === 'MEDIUM').length },
        { severity: "LOW", count: casesState.filter(c => c.severity === 'LOW').length }
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
    
    // Choose authentic after-repair photo
    const afterPhoto = AFTER_PHOTOS[cid % AFTER_PHOTOS.length];
    const beforePhoto = cItem.photo_url || (DEFECT_PHOTOS[cItem.category] ? DEFECT_PHOTOS[cItem.category][0] : DEFECT_PHOTOS.POTHOLE[0]);

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
          quality_rating: 5,
          durability_assessment: "EXCELLENT",
          before_photo_url: beforePhoto,
          after_photo_url: afterPhoto,
          inspection_notes: "Quality check passed. Bituminous compaction and drainage pitch verified with laser profiler.",
          created_at: "2026-11-14T15:30:00Z"
        }
      ],
      audit_logs: auditLogsState
    };
  }

  // Duplicate candidates
  if (cleanPath.includes('/duplicate-candidates')) {
    const cidMatch = cleanPath.match(/cases\/(\d+)\/duplicate-candidates/);
    const targetId = cidMatch ? parseInt(cidMatch[1], 10) : 1;
    const target = casesState.find(c => c.case_id === targetId) || casesState[0];
    
    // Find candidates in same category or nearby
    let cands = casesState
      .filter(c => c.case_id !== target.case_id && c.status !== 'DUPLICATE_MERGED')
      .map(c => {
        const dLat = (c.latitude - target.latitude) * 111320;
        const dLng = (c.longitude - target.longitude) * 111320 * Math.cos(target.latitude * Math.PI / 180);
        const dist = Math.max(14, Math.round(Math.sqrt(dLat * dLat + dLng * dLng)));
        const sameCategory = c.category === target.category;
        const confidence = sameCategory ? Math.max(85, 98 - Math.round(dist / 120)) : Math.max(68, 80 - Math.round(dist / 200));

        return {
          case_id: c.case_id,
          case_number: c.case_number,
          title: c.title,
          category: c.category,
          severity: c.severity,
          status: c.status,
          distance_meters: dist,
          duplicate_confidence_pct: Math.min(99, confidence),
          address_text: c.address_text || `${dist}m from target site`,
          reasons: [
            `Within ${dist}m spatial proximity corridor`,
            sameCategory ? `Matching defect classification: ${c.category}` : `Adjacent infrastructure buffer impact`,
            `Corroborating citizen photo evidence within 48h temporal window`
          ]
        };
      })
      .sort((a, b) => b.duplicate_confidence_pct - a.duplicate_confidence_pct)
      .slice(0, 3);

    if (cands.length === 0) {
      cands = [{
        case_id: target.case_id === 1 ? 2 : 1,
        case_number: target.case_id === 1 ? 'CF-2026-0002' : 'CF-2026-0001',
        title: `Secondary report: ${target.title}`,
        category: target.category,
        severity: target.severity,
        status: 'OPEN',
        distance_meters: 18.4,
        duplicate_confidence_pct: 96,
        address_text: target.address_text,
        reasons: [
          'Within 25m spatial radius (18.4m)',
          `Matching defect classification: ${target.category}`,
          'Corroborating citizen photo evidence within 48h temporal window'
        ]
      }];
    }
    return cands;
  }

  // Merge duplicate
  if (cleanPath.includes('/merge-duplicate')) {
    const cidMatch = cleanPath.match(/cases\/(\d+)\/merge-duplicate/);
    const targetId = cidMatch ? parseInt(cidMatch[1], 10) : 1;
    const secondaryId = body.secondary_case_id;

    const primaryCase = casesState.find(c => c.case_id === targetId);
    const secondaryCase = casesState.find(c => c.case_id === secondaryId);

    if (secondaryCase) {
      secondaryCase.status = 'DUPLICATE_MERGED';
    }
    if (primaryCase) {
      primaryCase.citizen_reports_count = (primaryCase.citizen_reports_count || 1) + 1;
      primaryCase.duplicate_merged_count = (primaryCase.duplicate_merged_count || 0) + 1;
      primaryCase.priority_score = Math.min(100, Math.round((primaryCase.priority_score || 72) + 5));
      if (primaryCase.priority_score >= 80) primaryCase.priority_level = 'CRITICAL';
      else if (primaryCase.priority_score >= 65) primaryCase.priority_level = 'HIGH';
      primaryCase.version = (primaryCase.version || 1) + 1;
    }

    // Re-link reports
    if (secondaryId && primaryCase) {
      reportsState.forEach(r => {
        if (r.case_id === secondaryId) {
          r.case_id = primaryCase.case_id;
        }
      });
    }

    // Audit log
    auditLogsState.unshift({
      log_id: auditLogsState.length + 1,
      event_type: 'DUPLICATE_MERGED',
      entity_name: 'repair_cases',
      entity_id: primaryCase ? primaryCase.case_id : targetId,
      user_name: 'Marcus Vance',
      old_state: { status: 'OPEN', duplicate_merged_count: primaryCase ? primaryCase.duplicate_merged_count - 1 : 0 },
      new_state: { status: primaryCase ? primaryCase.status : 'OPEN', duplicate_merged_count: primaryCase ? primaryCase.duplicate_merged_count : 1, merged_case_id: secondaryId },
      notes: `ACID Transaction: Merged secondary Case #${secondaryCase ? secondaryCase.case_number : secondaryId} into primary Case #${primaryCase ? primaryCase.case_number : targetId}. Priority boosted.`,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      message: `ACID Transaction Complete: Case #${secondaryCase ? secondaryCase.case_number : secondaryId} merged into #${primaryCase ? primaryCase.case_number : targetId}. Priority recalculated to ${primaryCase ? primaryCase.priority_score : 85} pts.`,
      target_case: primaryCase,
      secondary_case: secondaryCase
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
      const category = body.category || 'POTHOLE';
      const photos = DEFECT_PHOTOS[category] || DEFECT_PHOTOS.POTHOLE;
      const photoUrl = body.photo_url || photos[newId % photos.length];
      
      const newReport = {
        report_id: newId,
        tracking_code: code,
        category,
        severity: body.severity || 'MEDIUM',
        status: 'SUBMITTED',
        address_text: body.address_text || 'Bengaluru Municipal Corporation Zone',
        photo_url: photoUrl,
        latitude: parseFloat(body.latitude || 12.9716),
        longitude: parseFloat(body.longitude || 77.5946),
        upvote_count: 1,
        upvotes_count: 1,
        case_id: 1,
        created_at: new Date().toISOString(),
        reporter_name: 'Verified Citizen Resident',
        citizen_name: 'Verified Citizen Resident'
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
        report.upvotes_count = report.upvote_count;
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
