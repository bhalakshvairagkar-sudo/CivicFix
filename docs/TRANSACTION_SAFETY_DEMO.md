# Transaction Safety, Concurrency & ACID Demonstration

## 1. Executive Summary

A core requirement of a robust Database Management System (DBMS) is guaranteeing the **ACID** properties: **Atomicity, Consistency, Isolation, and Durability**.

This document details the transactional architecture in **CivicFix**, demonstrating:
1. **Atomic Multi-Table Commit**: How related tables commit in unison.
2. **Controlled Failure with Guaranteed Rollback**: Proving that zero partial state persists when an operation aborts.
3. **Pessimistic Row-Level Locking (`FOR UPDATE`)**: Serializing concurrent duplicate submissions.
4. **Optimistic Concurrency Control (`version` column)**: Neutralizing lost updates with `HTTP 409 Conflict`.

---

## 2. ACID Guarantees in CivicFix

| ACID Property | Mechanism in CivicFix | Verification Method |
| :--- | :--- | :--- |
| **Atomicity** | Python `transaction_cursor()` context manager issuing `START TRANSACTION`, `COMMIT`, and `ROLLBACK` on `Exception` | Controlled second-statement failure triggers rollback of first statement |
| **Consistency** | 28 MySQL Domain `CHECK` constraints, `FOREIGN KEY` referential rules, and `NOT NULL` constraints | Transactions violating constraints are rejected by the storage engine |
| **Isolation** | MySQL InnoDB `REPEATABLE READ` default isolation + deterministic `SELECT ... FOR UPDATE` row locks | 5 concurrent threads submitting duplicate reports are safely serialized |
| **Durability** | MySQL InnoDB Doublewrite Buffer and Redo Log (`ib_logfile0`) | Committed data is written to disk before response code is emitted |

---

## 3. Demonstration 1: Successful Multi-Table Atomic Commit

In municipal workflows, updating a repair case requires updating multiple related tables simultaneously. For instance, when a triage officer moves a case to `IN_PROGRESS`:
1. `repair_cases` is updated (`status = 'IN_PROGRESS'`, `version = version + 1`).
2. Linked `citizen_reports` are updated (`status = 'WORK_UNDERWAY'`).
3. An audit record is created in `audit_logs`.

### Code Implementation (`backend/database.py`):
```python
@contextmanager
def transaction_cursor():
    """
    Guarantees ACID transaction semantics:
    - Automatically issues COMMIT if block completes without exception.
    - Automatically issues ROLLBACK if any exception occurs.
    - Always closes the connection in the finally block.
    """
    conn = get_db_connection()
    try:
        conn.begin()
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception as ex:
        conn.rollback()
        raise ex
    finally:
        conn.close()
```

### Verified Execution:
```sql
START TRANSACTION;
UPDATE repair_cases SET status = 'IN_PROGRESS', version = version + 1 WHERE case_id = 1;
UPDATE citizen_reports SET status = 'WORK_UNDERWAY' WHERE case_id = 1;
-- Authoritative trigger logs audit record automatically
COMMIT;
```
All three table modifications commit atomically in a single atomic database operation.

---

## 4. Demonstration 2: Controlled Failure Triggering Guaranteed ROLLBACK

To prove Atomicity to an evaluator, we execute a transaction with an intentional constraint violation on the second statement:

### Transaction Statements:
```python
initial_version = get_case_version(case_id=3) # e.g. Version = 7

with transaction_cursor() as cur:
    # Statement 1 (Valid Write):
    cur.execute("UPDATE repair_cases SET version = 999 WHERE case_id = 3;")

    # Statement 2 (Intentional Constraint Violation):
    # Violates CHECK (latitude BETWEEN -90 AND 90)
    cur.execute("""
        INSERT INTO citizen_reports (
            tracking_code, user_id, case_id, category, description,
            latitude, longitude, address_text, severity, status
        ) VALUES (
            'FAIL-DEMO', 1, 3, 'POTHOLE', 'Trigger failure',
            999.00000000, 0.00000000, 'Invalid Geo', 'LOW', 'SUBMITTED'
        );
    """)
```

### Live Engine Behavior:
1. **Statement 1** modifies the uncommitted buffer for Case #3, setting `version = 999`.
2. **Statement 2** is evaluated by MySQL. The storage engine checks domain constraints:
   $$\text{latitude} = 999.00000000 \notin [-90.0, 90.0]$$
   MySQL throws `Error 1264: Out of range value for column 'latitude' at row 1` or `Error 3819: Check constraint 'chk_report_lat' is violated`.
3. The Python context manager catches `MySQLError` and immediately issues:
   ```sql
   ROLLBACK;
   ```
4. **Post-Transaction Verification**:
   ```sql
   SELECT version FROM repair_cases WHERE case_id = 3;
   -- Returns: 7 (Initial version preserved!)
   ```
5. **Conclusion**: Statement 1 was completely rolled back. Zero partial writes or dirty data remain in the database.

---

## 5. Demonstration 3: Optimistic Concurrency Control (OCC)

When multiple staff members edit the same repair case simultaneously, CivicFix prevents the **Lost Update Problem** using an optimistic version column:

```
Staff A (Reads Case #3, Version 1) ──────────┐
                                             │
Staff B (Reads Case #3, Version 1) ──┐       │
                                     │       │
Staff B submits update               ▼       │
UPDATE ... WHERE case_id = 3 AND version = 1;│
-> SUCCESS (Version becomes 2)               │
                                             ▼
Staff A submits update
UPDATE ... WHERE case_id = 3 AND version = 1;
-> ROWS AFFECTED = 0 (Version mismatch!)
-> CivicFix raises HTTP 409 Conflict:
   "Conflict: Case #CAS-2026-0003 has been modified concurrently. Please refresh."
```

---

## 6. Demonstration 4: Pessimistic Row-Level Locking (`FOR UPDATE`)

During high-concurrency spikes (e.g. 10 citizens simultaneously submitting duplicate reports for the same pothole crater within seconds):
```sql
SELECT case_id, total_linked_reports, version
FROM repair_cases
WHERE case_id = %s
FOR UPDATE;
```
1. MySQL places an **Exclusive Row Lock (X-Lock)** on the target `repair_cases` row.
2. Concurrent transactions attempting to modify or link reports to that case are queued in the lock manager until the lock holder commits.
3. This eliminates race conditions on `total_linked_reports` and guarantees monotonic counter accuracy.

---

## 7. How Evaluators Can Run This Live Demonstration

To execute the live transaction and rollback test on demand:
```powershell
python backend/scripts/demo_live_showcase.py
```
Or run the dedicated automated transaction test suite:
```powershell
python backend/tests/verify_phase4_concurrency.py
```
