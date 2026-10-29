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
-- Trigger 2: Automatic audit trail for case status changes
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_case_status_change //
CREATE TRIGGER trg_audit_case_status_change
AFTER UPDATE ON repair_cases
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO audit_logs (
            action_type,
            entity_type,
            entity_id,
            actor_name,
            old_state,
            new_state,
            change_summary
        ) VALUES (
            'STATUS_CHANGE',
            'REPAIR_CASE',
            NEW.case_id,
            'System Trigger',
            JSON_OBJECT('status', OLD.status, 'priority_score', OLD.priority_score, 'version', OLD.version),
            JSON_OBJECT('status', NEW.status, 'priority_score', NEW.priority_score, 'version', NEW.version),
            CONCAT('Case #', NEW.case_number, ' transitioned from ', OLD.status, ' to ', NEW.status)
        );
    END IF;
END //

-- ------------------------------------------------------------------------------
-- Stored Procedure: Atomic Duplicate Case Merge with Transaction Rollback
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
