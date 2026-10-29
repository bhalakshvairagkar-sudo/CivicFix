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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
        REFERENCES departments(department_id) ON DELETE RESTRICT
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
        REFERENCES users(user_id) ON DELETE SET NULL
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
        REFERENCES repair_cases(case_id) ON DELETE CASCADE
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
    cost_variance_pct DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
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
        REFERENCES departments(department_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Repair Inspections Table (Evidence-Based Verification with Photos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repair_inspections (
    inspection_id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    work_order_id INT NOT NULL,
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
        REFERENCES users(user_id) ON DELETE RESTRICT
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
