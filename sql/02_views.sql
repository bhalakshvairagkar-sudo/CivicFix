-- ==============================================================================
-- CivicFix - Database Views for Reporting, Priority & Performance Aggregation
-- ==============================================================================

USE civicfix_db;

-- ------------------------------------------------------------------------------
-- View 1: v_case_priority_metrics
-- Computes live case prioritization metrics with linked report counts, age,
-- and asset health context
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_case_priority_metrics AS
SELECT 
    c.case_id,
    c.case_number,
    c.title,
    c.category,
    c.severity,
    c.status,
    c.priority_score,
    c.priority_level,
    c.priority_breakdown,
    c.latitude,
    c.longitude,
    c.is_recurring_failure,
    c.days_since_last_repair,
    c.created_at,
    c.closed_at,
    TIMESTAMPDIFF(DAY, c.created_at, NOW()) AS age_in_days,
    TIMESTAMPDIFF(HOUR, c.created_at, COALESCE(c.closed_at, NOW())) AS elapsed_hours,
    a.asset_id,
    a.asset_code,
    a.name AS asset_name,
    a.ward_number,
    a.current_health_score,
    a.recurring_failures_count AS asset_recurring_count,
    d.department_id,
    d.code AS department_code,
    d.name AS department_name,
    COUNT(r.report_id) AS total_reports_count,
    COALESCE(SUM(r.upvotes_count), 0) AS total_citizen_upvotes
FROM repair_cases c
JOIN infrastructure_assets a ON c.asset_id = a.asset_id
JOIN departments d ON c.department_id = d.department_id
LEFT JOIN citizen_reports r ON c.case_id = r.case_id
GROUP BY 
    c.case_id, c.case_number, c.title, c.category, c.severity, c.status,
    c.priority_score, c.priority_level, c.priority_breakdown, c.latitude,
    c.longitude, c.is_recurring_failure, c.days_since_last_repair, c.created_at,
    c.closed_at, a.asset_id, a.asset_code, a.name, a.ward_number,
    a.current_health_score, a.recurring_failures_count, d.department_id,
    d.code, d.name;

-- ------------------------------------------------------------------------------
-- View 2: v_asset_health_summary
-- Infrastructure Memory health view: Tracks cumulative damage, MTTR, spending,
-- and cost anomaly status
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_asset_health_summary AS
SELECT 
    a.asset_id,
    a.asset_code,
    a.name AS asset_name,
    a.category,
    a.ward_number,
    a.address_landmark,
    a.latitude,
    a.longitude,
    a.install_year,
    (YEAR(CURDATE()) - a.install_year) AS asset_age_years,
    a.expected_lifespan_years,
    a.current_health_score,
    a.total_incidents_count,
    a.recurring_failures_count,
    a.cumulative_repair_cost,
    a.replacement_cost_estimate,
    ROUND((a.cumulative_repair_cost / NULLIF(a.replacement_cost_estimate, 0)) * 100, 2) AS repair_vs_replacement_pct,
    a.investigation_flag,
    a.investigation_reason,
    d.code AS department_code,
    d.name AS department_name,
    COUNT(c.case_id) AS recorded_cases_count,
    ROUND(AVG(CASE WHEN c.closed_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, c.created_at, c.closed_at) ELSE NULL END), 1) AS avg_case_resolution_hours,
    MAX(c.created_at) AS last_failure_date
FROM infrastructure_assets a
JOIN departments d ON a.department_id = d.department_id
LEFT JOIN repair_cases c ON a.asset_id = c.asset_id
GROUP BY 
    a.asset_id, a.asset_code, a.name, a.category, a.ward_number,
    a.address_landmark, a.latitude, a.longitude, a.install_year,
    a.expected_lifespan_years, a.current_health_score, a.total_incidents_count,
    a.recurring_failures_count, a.cumulative_repair_cost, a.replacement_cost_estimate,
    a.investigation_flag, a.investigation_reason, d.code, d.name;

-- ------------------------------------------------------------------------------
-- View 3: v_department_performance
-- Calculates departmental resolution workload, MTTR, budget utilization,
-- and verification audit rates
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_department_performance AS
SELECT 
    d.department_id,
    d.code,
    d.name,
    d.annual_budget,
    d.spent_budget,
    ROUND((d.spent_budget / NULLIF(d.annual_budget, 0)) * 100, 2) AS budget_utilized_pct,
    COUNT(DISTINCT c.case_id) AS total_cases,
    SUM(CASE WHEN c.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED') THEN 1 ELSE 0 END) AS active_cases,
    SUM(CASE WHEN c.status = 'VERIFIED_CLOSED' THEN 1 ELSE 0 END) AS closed_cases,
    SUM(CASE WHEN c.is_recurring_failure = TRUE THEN 1 ELSE 0 END) AS recurring_cases,
    ROUND(AVG(CASE WHEN c.status = 'VERIFIED_CLOSED' AND c.closed_at IS NOT NULL 
        THEN TIMESTAMPDIFF(HOUR, c.created_at, c.closed_at) ELSE NULL END), 1) AS avg_resolution_hours,
    COUNT(DISTINCT w.work_order_id) AS total_work_orders,
    COALESCE(SUM(w.actual_cost), 0) AS total_work_order_expenditure
FROM departments d
LEFT JOIN repair_cases c ON d.department_id = c.department_id
LEFT JOIN work_orders w ON d.department_id = w.department_id
GROUP BY d.department_id, d.code, d.name, d.annual_budget, d.spent_budget;

-- ------------------------------------------------------------------------------
-- View 4: vw_case_summary
-- Demonstrable reporting view grouping cases by status and severity
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_case_summary AS
SELECT
    status,
    severity,
    COUNT(*) AS total_cases,
    ROUND(AVG(priority_score), 2) AS avg_priority_score,
    SUM(total_linked_reports) AS total_reports_represented
FROM repair_cases
GROUP BY status, severity;

-- ------------------------------------------------------------------------------
-- View 5: vw_open_cases_staff
-- Demonstrable operational view: Open repair cases with their department
-- and assigned staff / contractor lead
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_open_cases_staff AS
SELECT 
    c.case_id,
    c.case_number,
    c.title,
    c.category,
    c.severity,
    c.status,
    c.priority_score,
    c.priority_level,
    c.created_at,
    d.department_id,
    d.name AS department_name,
    d.code AS department_code,
    w.work_order_id,
    w.work_order_number,
    w.assigned_team_leader,
    w.contractor_name,
    w.status AS work_order_status
FROM repair_cases c
JOIN departments d ON c.department_id = d.department_id
LEFT JOIN work_orders w ON c.case_id = w.case_id AND w.status IN ('SCHEDULED', 'CREW_DISPATCHED', 'IN_PROGRESS')
WHERE c.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED');

