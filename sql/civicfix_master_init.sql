-- ==============================================================================
-- CivicFix - MASTER DATABASE INITIALIZATION SCRIPT
-- Unified script containing complete Schema, Views, Stored Procedures & Triggers
-- Suitable for 1-Click execution in MySQL Workbench or via CLI:
-- mysql -u root -p < sql/civicfix_master_init.sql
-- ==============================================================================

-- ==============================================================================
-- CivicFix - Intelligent Infrastructure Monitoring & Repair Intelligence System
-- Relational Database Schema (MySQL 8.0+ / 9.0+)
-- Normal Form: 3NF (Third Normal Form)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS civicfix_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE civicfix_db;

-- ------------------------------------------------------------------------------
-- 1. Departments Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    contact_email VARCHAR(120) NOT NULL,
    contact_phone VARCHAR(30) NOT NULL,
    annual_budget DECIMAL(14, 2) NOT NULL DEFAULT 500000.00,
    spent_budget DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dept_annual_budget CHECK (annual_budget >= 0.00),
    CONSTRAINT chk_dept_spent_budget CHECK (spent_budget >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Users Table (Role-Based Access: CITIZEN, STAFF, ADMIN)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('CITIZEN', 'STAFF', 'ADMIN') NOT NULL DEFAULT 'CITIZEN',
    department_id INT NULL,
    phone VARCHAR(30) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) 
        REFERENCES departments(department_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Sensitive Locations Table (For Proximity Risk Multiplier)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sensitive_locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type ENUM('HOSPITAL', 'SCHOOL', 'TRANSIT_HUB', 'FIRE_STATION', 'ELDER_CARE') NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    buffer_meters INT NOT NULL DEFAULT 350,
    weight_score INT NOT NULL DEFAULT 20,
    address VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sens_lat CHECK (latitude BETWEEN -90.00000000 AND 90.00000000),
    CONSTRAINT chk_sens_lng CHECK (longitude BETWEEN -180.00000000 AND 180.00000000),
    CONSTRAINT chk_sens_buffer CHECK (buffer_meters > 0 AND buffer_meters <= 5000),
    CONSTRAINT chk_sens_weight CHECK (weight_score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Infrastructure Assets Table (Persistent Infrastructure Memory)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS infrastructure_assets (
    asset_id INT AUTO_INCREMENT PRIMARY KEY,
    asset_code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    category ENUM('POTHOLE', 'STREETLIGHT', 'FOOTPATH', 'DRAINAGE', 'WATER_LEAK', 'TRAFFIC_SIGNAL') NOT NULL,
    ward_number VARCHAR(20) NOT NULL,
    address_landmark VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    department_id INT NOT NULL,
    install_year INT NOT NULL,
    expected_lifespan_years INT NOT NULL DEFAULT 10,
    current_health_score DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    total_incidents_count INT NOT NULL DEFAULT 0,
    recurring_failures_count INT NOT NULL DEFAULT 0,
    cumulative_repair_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    replacement_cost_estimate DECIMAL(12, 2) NOT NULL DEFAULT 30000.00,
    investigation_flag BOOLEAN NOT NULL DEFAULT FALSE,
    investigation_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_assets_department FOREIGN KEY (department_id) 
        REFERENCES departments(department_id) ON DELETE RESTRICT,
    CONSTRAINT chk_asset_lat CHECK (latitude BETWEEN -90.00000000 AND 90.00000000),
    CONSTRAINT chk_asset_lng CHECK (longitude BETWEEN -180.00000000 AND 180.00000000),
    CONSTRAINT chk_asset_install_year CHECK (install_year BETWEEN 1900 AND 2100),
    CONSTRAINT chk_asset_lifespan CHECK (expected_lifespan_years BETWEEN 1 AND 100),
    CONSTRAINT chk_asset_health CHECK (current_health_score BETWEEN 0.00 AND 100.00),
    CONSTRAINT chk_asset_incidents CHECK (total_incidents_count >= 0),
    CONSTRAINT chk_asset_recurring CHECK (recurring_failures_count >= 0 AND recurring_failures_count <= total_incidents_count),
    CONSTRAINT chk_asset_cumulative_cost CHECK (cumulative_repair_cost >= 0.00),
    CONSTRAINT chk_asset_replacement_cost CHECK (replacement_cost_estimate >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Repair Cases Table (Consolidated Cases Linking Multiple Reports)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repair_cases (
    case_id INT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(40) NOT NULL UNIQUE,
    asset_id INT NOT NULL,
    category ENUM('POTHOLE', 'STREETLIGHT', 'FOOTPATH', 'DRAINAGE', 'WATER_LEAK', 'TRAFFIC_SIGNAL') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    status ENUM('OPEN', 'DUPLICATE_MERGED', 'ASSIGNED', 'IN_PROGRESS', 'REPAIR_COMPLETED', 'VERIFIED_CLOSED', 'REOPENED') NOT NULL DEFAULT 'OPEN',
    priority_score DECIMAL(6, 2) NOT NULL DEFAULT 10.00,
    priority_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    priority_breakdown JSON NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    department_id INT NOT NULL,
    is_recurring_failure BOOLEAN NOT NULL DEFAULT FALSE,
    days_since_last_repair INT NULL,
    previous_case_id INT NULL,
    total_linked_reports INT NOT NULL DEFAULT 1,
    created_by_user_id INT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    CONSTRAINT fk_cases_asset FOREIGN KEY (asset_id) 
        REFERENCES infrastructure_assets(asset_id) ON DELETE RESTRICT,
    CONSTRAINT fk_cases_department FOREIGN KEY (department_id) 
        REFERENCES departments(department_id) ON DELETE RESTRICT,
    CONSTRAINT fk_cases_prev_case FOREIGN KEY (previous_case_id) 
        REFERENCES repair_cases(case_id) ON DELETE SET NULL,
    CONSTRAINT fk_cases_creator FOREIGN KEY (created_by_user_id) 
        REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_case_lat CHECK (latitude BETWEEN -90.00000000 AND 90.00000000),
    CONSTRAINT chk_case_lng CHECK (longitude BETWEEN -180.00000000 AND 180.00000000),
    CONSTRAINT chk_case_priority_score CHECK (priority_score BETWEEN 0.00 AND 100.00),
    CONSTRAINT chk_case_total_reports CHECK (total_linked_reports >= 1),
    CONSTRAINT chk_case_days_repair CHECK (days_since_last_repair IS NULL OR days_since_last_repair >= 0),
    CONSTRAINT chk_case_closure_time CHECK (closed_at IS NULL OR closed_at >= created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Citizen Reports Table (Raw Citizen Submissions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citizen_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_code VARCHAR(40) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    case_id INT NOT NULL,
    is_primary_case_report BOOLEAN NOT NULL DEFAULT FALSE,
    category ENUM('POTHOLE', 'STREETLIGHT', 'FOOTPATH', 'DRAINAGE', 'WATER_LEAK', 'TRAFFIC_SIGNAL') NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    description TEXT NOT NULL,
    photo_url VARCHAR(500) NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address_text VARCHAR(255) NOT NULL,
    status ENUM('SUBMITTED', 'LINKED_TO_CASE', 'INVESTIGATING', 'WORK_UNDERWAY', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    upvotes_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reports_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_reports_case FOREIGN KEY (case_id) 
        REFERENCES repair_cases(case_id) ON DELETE RESTRICT,
    CONSTRAINT chk_report_lat CHECK (latitude BETWEEN -90.00000000 AND 90.00000000),
    CONSTRAINT chk_report_lng CHECK (longitude BETWEEN -180.00000000 AND 180.00000000),
    CONSTRAINT chk_report_upvotes CHECK (upvotes_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Work Orders Table (Departmental Repair Dispatch & Execution)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_orders (
    work_order_id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_number VARCHAR(40) NOT NULL UNIQUE,
    case_id INT NOT NULL,
    department_id INT NOT NULL,
    assigned_team_leader VARCHAR(100) NOT NULL,
    contractor_name VARCHAR(150) NULL,
    estimated_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    actual_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cost_variance_pct DECIMAL(6, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN estimated_cost > 0 THEN ROUND(((actual_cost - estimated_cost) / estimated_cost) * 100, 2)
            ELSE 0.00 
        END
    ) STORED,
    target_completion_date DATETIME NOT NULL,
    actual_completion_date DATETIME NULL,
    materials_used TEXT NULL,
    work_notes TEXT NULL,
    status ENUM('SCHEDULED', 'CREW_DISPATCHED', 'IN_PROGRESS', 'WORK_COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_wo_case FOREIGN KEY (case_id) 
        REFERENCES repair_cases(case_id) ON DELETE RESTRICT,
    CONSTRAINT fk_wo_department FOREIGN KEY (department_id) 
        REFERENCES departments(department_id) ON DELETE RESTRICT,
    CONSTRAINT chk_wo_estimated_cost CHECK (estimated_cost >= 0.00),
    CONSTRAINT chk_wo_actual_cost CHECK (actual_cost >= 0.00),
    CONSTRAINT chk_wo_completion_date CHECK (actual_completion_date IS NULL OR actual_completion_date >= created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Repair Inspections Table (Evidence-Based Verification with Photos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repair_inspections (
    inspection_id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    work_order_id INT NOT NULL UNIQUE,
    inspector_user_id INT NOT NULL,
    before_photo_url VARCHAR(500) NOT NULL,
    after_photo_url VARCHAR(500) NULL,
    quality_rating TINYINT NOT NULL DEFAULT 4,
    durability_assessment ENUM('POOR', 'SATISFACTORY', 'GOOD', 'EXCELLENT') NOT NULL DEFAULT 'GOOD',
    inspection_notes TEXT NOT NULL,
    passed_verification BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
    suspicious_flags JSON NULL,
    inspected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_insp_case FOREIGN KEY (case_id) 
        REFERENCES repair_cases(case_id) ON DELETE RESTRICT,
    CONSTRAINT fk_insp_wo FOREIGN KEY (work_order_id) 
        REFERENCES work_orders(work_order_id) ON DELETE RESTRICT,
    CONSTRAINT fk_insp_user FOREIGN KEY (inspector_user_id) 
        REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_insp_rating CHECK (quality_rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Audit Logs Table (Append-Only Audit Trail)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    action_type ENUM(
        'REPORT_CREATED',
        'DUPLICATE_MERGE',
        'CASE_ASSIGNMENT',
        'STATUS_CHANGE',
        'WORK_ORDER_CREATED',
        'COST_UPDATED',
        'INSPECTION_SUBMITTED',
        'CLOSURE_APPROVED',
        'CASE_REOPENED',
        'SUSPICIOUS_FLAG_RAISED'
    ) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    performed_by_user_id INT NULL,
    actor_name VARCHAR(100) NOT NULL,
    old_state JSON NULL,
    new_state JSON NULL,
    change_summary VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (performed_by_user_id) 
        REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Benchmark Records Table (For Live Query Performance Demonstrations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS benchmark_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    batch_code VARCHAR(30) NOT NULL,
    asset_code VARCHAR(40) NOT NULL,
    category VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    repair_cost DECIMAL(10, 2) NOT NULL,
    ward_number VARCHAR(20) NOT NULL,
    logged_date DATE NOT NULL,
    notes TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Indexes for High-Traffic Queries
-- ------------------------------------------------------------------------------
CREATE INDEX idx_cases_cat_stat ON repair_cases (category, status);
CREATE INDEX idx_cases_priority_stat ON repair_cases (priority_level, status);
CREATE INDEX idx_cases_coords ON repair_cases (latitude, longitude);
CREATE INDEX idx_cases_asset_created ON repair_cases (asset_id, created_at);
CREATE INDEX idx_reports_tracking ON citizen_reports (tracking_code);
CREATE INDEX idx_reports_case_id ON citizen_reports (case_id);
CREATE INDEX idx_reports_user_id ON citizen_reports (user_id);
CREATE INDEX idx_assets_code ON infrastructure_assets (asset_code);
CREATE INDEX idx_assets_cat_ward ON infrastructure_assets (category, ward_number);
CREATE INDEX idx_wo_case_id ON work_orders (case_id);
CREATE INDEX idx_wo_status ON work_orders (status);
CREATE INDEX idx_insp_case_id ON repair_inspections (case_id);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_action_time ON audit_logs (action_type, created_at);

-- Benchmark Indexed Columns (demonstrated vs unindexed columns like notes/batch_code)
CREATE INDEX idx_bm_cat_stat ON benchmark_records (category, status);
CREATE INDEX idx_bm_asset_code ON benchmark_records (asset_code);


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



-- ==============================================================================
-- CivicFix - Stored Procedures & Triggers for Integrity, Auditing & Transactions
-- ==============================================================================

USE civicfix_db;

DELIMITER //

-- ------------------------------------------------------------------------------
-- Trigger 1: Automatically increment total_linked_reports in repair_cases
-- whenever a citizen report is inserted or re-linked
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_citizen_report_insert //
CREATE TRIGGER trg_after_citizen_report_insert
AFTER INSERT ON citizen_reports
FOR EACH ROW
BEGIN
    UPDATE repair_cases
    SET total_linked_reports = (
        SELECT COUNT(*) FROM citizen_reports WHERE case_id = NEW.case_id
    )
    WHERE case_id = NEW.case_id;
END //

-- ------------------------------------------------------------------------------
-- Trigger 2: Authoritative Database Audit Trigger for Critical Case Field Changes
-- Automatically logs status and severity transitions without application double-logging
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_case_status_change //
DROP TRIGGER IF EXISTS trg_audit_case_critical_changes //
CREATE TRIGGER trg_audit_case_critical_changes
AFTER UPDATE ON repair_cases
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO audit_logs (
            action_type,
            entity_type,
            entity_id,
            performed_by_user_id,
            actor_name,
            old_state,
            new_state,
            change_summary
        ) VALUES (
            'STATUS_CHANGE',
            'REPAIR_CASE',
            NEW.case_id,
            @app_current_user_id,
            COALESCE(@app_current_user_name, 'DB_TRIGGER'),
            JSON_OBJECT('status', OLD.status, 'priority_score', OLD.priority_score, 'version', OLD.version),
            JSON_OBJECT('status', NEW.status, 'priority_score', NEW.priority_score, 'version', NEW.version),
            CONCAT('Case #', NEW.case_number, ' transitioned from ', OLD.status, ' to ', NEW.status)
        );
    END IF;
END //

-- ------------------------------------------------------------------------------
-- Stored Procedure 1: Transition Repair Case to a Valid Status
-- Enforces state machine rules and throws SQLSTATE 45000 on invalid transitions
-- ------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_transition_case_status //
CREATE PROCEDURE sp_transition_case_status(
    IN p_case_id INT,
    IN p_new_status VARCHAR(30),
    IN p_user_id INT,
    IN p_actor_name VARCHAR(100),
    IN p_notes TEXT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_current_status VARCHAR(30);
    DECLARE v_case_number VARCHAR(40);
    DECLARE v_version INT;
    DECLARE v_is_valid BOOLEAN DEFAULT FALSE;

    -- Error handler to guarantee rollback on failure and propagate exception to client
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Fetch current status with row-level lock
    SELECT status, case_number, version
    INTO v_current_status, v_case_number, v_version
    FROM repair_cases
    WHERE case_id = p_case_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Repair case not found.';
    END IF;

    -- 2. State Machine Validation
    IF v_current_status = 'DUPLICATE_MERGED' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid status transition: Merged duplicate cases cannot be reopened or transitioned.';
    END IF;

    IF v_current_status = 'OPEN' AND p_new_status IN ('ASSIGNED', 'IN_PROGRESS', 'DUPLICATE_MERGED') THEN
        SET v_is_valid = TRUE;
    ELSEIF v_current_status = 'ASSIGNED' AND p_new_status IN ('OPEN', 'IN_PROGRESS') THEN
        SET v_is_valid = TRUE;
    ELSEIF v_current_status = 'IN_PROGRESS' AND p_new_status IN ('ASSIGNED', 'REPAIR_COMPLETED') THEN
        SET v_is_valid = TRUE;
    ELSEIF v_current_status = 'REPAIR_COMPLETED' AND p_new_status IN ('IN_PROGRESS', 'VERIFIED_CLOSED', 'REOPENED') THEN
        SET v_is_valid = TRUE;
    ELSEIF v_current_status = 'VERIFIED_CLOSED' AND p_new_status IN ('REOPENED') THEN
        SET v_is_valid = TRUE;
    ELSEIF v_current_status = 'REOPENED' AND p_new_status IN ('ASSIGNED', 'IN_PROGRESS') THEN
        SET v_is_valid = TRUE;
    END IF;

    IF NOT v_is_valid THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid status transition: The requested case status transition violates state machine rules.';
    END IF;

    -- Set session user variables so authoritative trigger picks up the actor
    SET @app_current_user_id = p_user_id;
    SET @app_current_user_name = p_actor_name;

    -- 3. Update case status (triggers trg_audit_case_critical_changes automatically)
    UPDATE repair_cases
    SET status = p_new_status,
        version = version + 1,
        closed_at = CASE WHEN p_new_status = 'VERIFIED_CLOSED' THEN NOW() ELSE closed_at END
    WHERE case_id = p_case_id;

    -- 4. Propagate status to linked citizen reports
    IF p_new_status = 'IN_PROGRESS' THEN
        UPDATE citizen_reports SET status = 'WORK_UNDERWAY' WHERE case_id = p_case_id;
    ELSEIF p_new_status = 'VERIFIED_CLOSED' THEN
        UPDATE citizen_reports SET status = 'RESOLVED' WHERE case_id = p_case_id;
    ELSEIF p_new_status = 'REOPENED' THEN
        UPDATE citizen_reports SET status = 'INVESTIGATING' WHERE case_id = p_case_id;
    END IF;

    COMMIT;
    SET p_success = TRUE;
    SET p_message = CONCAT('Case #', v_case_number, ' successfully transitioned to ', p_new_status, '.');
END //

-- ------------------------------------------------------------------------------
-- Stored Procedure 2: Atomic Duplicate Case Merge with Transaction Rollback
-- Merges secondary_case_id into target_case_id
-- ------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_merge_duplicate_reports //
CREATE PROCEDURE sp_merge_duplicate_reports(
    IN p_target_case_id INT,
    IN p_secondary_case_id INT,
    IN p_admin_user_id INT,
    IN p_admin_name VARCHAR(100),
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_target_exists INT DEFAULT 0;
    DECLARE v_sec_exists INT DEFAULT 0;
    DECLARE v_reports_moved INT DEFAULT 0;

    -- Error handler to ensure safe rollback
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Transaction aborted: SQL Exception occurred during duplicate merge.';
    END;

    START TRANSACTION;

    -- Validate target case exists
    SELECT COUNT(*) INTO v_target_exists FROM repair_cases WHERE case_id = p_target_case_id;
    IF v_target_exists = 0 THEN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Target case does not exist.';
        LEAVE proc_label;
    END IF;

    -- Validate secondary case exists
    SELECT COUNT(*) INTO v_sec_exists FROM repair_cases WHERE case_id = p_secondary_case_id;
    IF v_sec_exists = 0 THEN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Secondary case does not exist.';
        LEAVE proc_label;
    END IF;

    -- Re-link all citizen reports from secondary case to target case
    UPDATE citizen_reports
    SET case_id = p_target_case_id,
        is_primary_case_report = FALSE,
        status = 'LINKED_TO_CASE'
    WHERE case_id = p_secondary_case_id;
    
    SET v_reports_moved = ROW_COUNT();

    -- Mark secondary case as DUPLICATE_MERGED and record reference
    UPDATE repair_cases
    SET status = 'DUPLICATE_MERGED',
        description = CONCAT(description, ' [Merged into Case #', p_target_case_id, ']'),
        version = version + 1
    WHERE case_id = p_secondary_case_id;

    -- Update target case's report count and bump version
    UPDATE repair_cases
    SET total_linked_reports = (SELECT COUNT(*) FROM citizen_reports WHERE case_id = p_target_case_id),
        version = version + 1
    WHERE case_id = p_target_case_id;

    -- Insert Audit Record
    INSERT INTO audit_logs (
        action_type,
        entity_type,
        entity_id,
        performed_by_user_id,
        actor_name,
        old_state,
        new_state,
        change_summary
    ) VALUES (
        'DUPLICATE_MERGE',
        'REPAIR_CASE',
        p_target_case_id,
        p_admin_user_id,
        p_admin_name,
        JSON_OBJECT('secondary_case_id', p_secondary_case_id),
        JSON_OBJECT('reports_transferred', v_reports_moved, 'target_case_id', p_target_case_id),
        CONCAT('Merged Case #', p_secondary_case_id, ' into Target Case #', p_target_case_id, ' transferring ', v_reports_moved, ' citizen reports.')
    );

    COMMIT;
    SET p_success = TRUE;
    SET p_message = CONCAT('Successfully merged ', v_reports_moved, ' reports into target case.');
END //

DELIMITER ;


