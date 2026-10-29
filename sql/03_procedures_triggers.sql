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
