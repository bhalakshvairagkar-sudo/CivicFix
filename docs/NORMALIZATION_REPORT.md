# Normalization Document & Functional Dependency Analysis

## 1. Introduction & Formal Definitions

A relational database must be mathematically normalized to eliminate:
1. **Insertion Anomalies**: Inability to record information without creating unrelated or dummy data.
2. **Update Anomalies**: Data redundancy causing inconsistent state when a shared attribute is updated in one row but not another.
3. **Deletion Anomalies**: Unintended loss of crucial entity data when an associated record is purged.

This report establishes the **Functional Dependencies (FDs)** for all relations in **CivicFix** and provides proofs demonstrating adherence to **First Normal Form (1NF)**, **Second Normal Form (2NF)**, **Third Normal Form (3NF)**, and **Boyce-Codd Normal Form (BCNF)**.

---

## 2. Formal Functional Dependency (FD) Catalog

Let relation $R$ have attributes $A_1, A_2, \dots, A_n$. A functional dependency $X \to Y$ holds on $R$ if and only if whenever two tuples agree on $X$, they must also agree on $Y$.

### Relation 1: `departments`
- $FD_1: \{\text{department\_id}\} \to \{\text{code}, \text{name}, \text{contact\_email}, \text{contact\_phone}, \text{annual\_budget}, \text{spent\_budget}, \text{is\_active}, \text{created\_at}\}$
- $FD_2: \{\text{code}\} \to \{\text{department\_id}, \text{name}, \text{contact\_email}, \text{contact\_phone}, \text{annual\_budget}, \text{spent\_budget}, \text{is\_active}, \text{created\_at}\}$
- **Candidate Keys**: $\{\text{department\_id}\}, \{\text{code}\}$
- **Primary Key**: $\{\text{department\_id}\}$

### Relation 2: `users`
- $FD_1: \{\text{user\_id}\} \to \{\text{email}, \text{password\_hash}, \text{full\_name}, \text{role}, \text{department\_id}, \text{phone}, \text{is\_active}, \text{created\_at}\}$
- $FD_2: \{\text{email}\} \to \{\text{user\_id}, \text{password\_hash}, \text{full\_name}, \text{role}, \text{department\_id}, \text{phone}, \text{is\_active}, \text{created\_at}\}$
- **Candidate Keys**: $\{\text{user\_id}\}, \{\text{email}\}$
- **Primary Key**: $\{\text{user\_id}\}$

### Relation 3: `sensitive_locations`
- $FD_1: \{\text{location\_id}\} \to \{\text{name}, \text{type}, \text{latitude}, \text{longitude}, \text{buffer\_meters}, \text{weight\_score}, \text{address}, \text{created\_at}\}$
- **Candidate Keys**: $\{\text{location\_id}\}$
- **Primary Key**: $\{\text{location\_id}\}$

### Relation 4: `infrastructure_assets`
- $FD_1: \{\text{asset\_id}\} \to \{\text{asset\_code}, \text{name}, \text{asset\_type}, \text{department\_id}, \text{ward\_number}, \text{latitude}, \text{longitude}, \text{install\_year}, \text{expected\_lifespan\_years}, \text{current\_health\_score}, \text{total\_incidents\_count}, \text{recurring\_failures\_count}, \text{cumulative\_repair\_cost}, \text{estimated\_replacement\_cost}, \text{created\_at}\}$
- $FD_2: \{\text{asset\_code}\} \to \{\text{asset\_id}, \dots\}$
- **Candidate Keys**: $\{\text{asset\_id}\}, \{\text{asset\_code}\}$
- **Primary Key**: $\{\text{asset\_id}\}$

### Relation 5: `repair_cases`
- $FD_1: \{\text{case\_id}\} \to \{\text{case\_number}, \text{title}, \text{category}, \text{severity}, \text{status}, \text{priority\_score}, \text{priority\_level}, \text{priority\_breakdown}, \text{total\_linked\_reports}, \text{asset\_id}, \text{department\_id}, \text{created\_by\_user\_id}, \text{previous\_case\_id}, \text{is\_recurring\_failure}, \text{days\_since\_last\_repair}, \text{latitude}, \text{longitude}, \text{description}, \text{version}, \text{created\_at}, \text{closed\_at}\}$
- $FD_2: \{\text{case\_number}\} \to \{\text{case\_id}, \dots\}$
- **Candidate Keys**: $\{\text{case\_id}\}, \{\text{case\_number}\}$
- **Primary Key**: $\{\text{case\_id}\}$

### Relation 6: `citizen_reports`
- $FD_1: \{\text{report\_id}\} \to \{\text{tracking\_code}, \text{user\_id}, \text{case\_id}, \text{is\_primary\_case\_report}, \text{category}, \text{severity}, \text{description}, \text{photo\_url}, \text{latitude}, \text{longitude}, \text{address\_text}, \text{status}, \text{upvotes\_count}, \text{created\_at}\}$
- $FD_2: \{\text{tracking\_code}\} \to \{\text{report\_id}, \dots\}$
- **Candidate Keys**: $\{\text{report\_id}\}, \{\text{tracking\_code}\}$
- **Primary Key**: $\{\text{report\_id}\}$

### Relation 7: `work_orders`
- $FD_1: \{\text{work\_order\_id}\} \to \{\text{order\_number}, \text{case\_id}, \text{department\_id}, \text{contractor\_name}, \text{lead\_technician}, \text{estimated\_cost}, \text{actual\_cost}, \text{cost\_variance\_pct}, \text{status}, \text{scheduled\_start\_date}, \text{estimated\_completion\_date}, \text{actual\_completion\_date}, \text{created\_at}\}$
- $FD_2: \{\text{order\_number}\} \to \{\text{work\_order\_id}, \dots\}$
- **Candidate Keys**: $\{\text{work\_order\_id}\}, \{\text{order\_number}\}$
- **Primary Key**: $\{\text{work\_order\_id}\}$

### Relation 8: `repair_inspections`
- $FD_1: \{\text{inspection\_id}\} \to \{\text{case\_id}, \text{work\_order\_id}, \text{inspector\_user\_id}, \text{before\_photo\_url}, \text{after\_photo\_url}, \text{quality\_rating}, \text{durability\_assessment}, \text{inspection\_notes}, \text{passed\_verification}, \text{is\_suspicious}, \text{suspicious\_flags}, \text{inspected\_at}\}$
- $FD_2: \{\text{work\_order\_id}\} \to \{\text{inspection\_id}, \dots\}$ *(Every work order has at most 1 inspection)*
- **Candidate Keys**: $\{\text{inspection\_id}\}, \{\text{work\_order\_id}\}$
- **Primary Key**: $\{\text{inspection\_id}\}$

### Relation 9: `audit_logs`
- $FD_1: \{\text{log\_id}\} \to \{\text{action\_type}, \text{entity\_type}, \text{entity\_id}, \text{performed\_by\_user\_id}, \text{actor\_name}, \text{old\_state}, \text{new\_state}, \text{change\_summary}, \text{created\_at}\}$
- **Candidate Keys**: $\{\text{log\_id}\}$
- **Primary Key**: $\{\text{log\_id}\}$

---

## 3. Mathematical Normalization Proofs

### Proof of First Normal Form (1NF)
> **Definition**: A relation $R$ is in 1NF if and only if all domain values are atomic (scalar) and there are no repeating groups or composite arrays stored in single attributes.

1. **Atomic Attributes**:
   - Geolocation coordinates are not stored as composite strings like `"40.7128,-74.0060"`. Instead, they are decomposed into atomic IEEE-standard scalar values: `latitude DECIMAL(10,8)` and `longitude DECIMAL(11,8)`.
   - Contact phone numbers, names, and postal addresses are decomposed into distinct, non-divisible scalar strings.
2. **No Repeating Groups**:
   - When multiple citizens report the same defect (e.g. 5 citizens reporting a crater on Elm Street), the reports are **not** stored as a comma-separated list of citizen IDs in `repair_cases`. Each citizen report exists as an independent row in `citizen_reports`.
   - Therefore, all relations satisfy **1NF**.

---

### Proof of Second Normal Form (2NF)
> **Definition**: A relation $R$ is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on every candidate key (i.e., no partial dependencies on composite keys).

1. **Absence of Composite Primary Keys**:
   - Every table in CivicFix uses a single-column surrogate primary key (`department_id`, `user_id`, `asset_id`, `case_id`, `report_id`, `work_order_id`, `inspection_id`, `log_id`).
   - In any candidate key consisting of a single attribute $\{K\}$, a proper subset of $\{K\}$ is the empty set $\emptyset$.
   - A non-trivial dependency on a proper subset of a candidate key is mathematically impossible:
     $$\forall X \subset \{K\}, X = \emptyset \implies \text{No partial dependency can exist.}$$
   - In `repair_inspections`, candidate keys are $\{\text{inspection\_id}\}$ and $\{\text{work\_order\_id}\}$, both of which are single attributes.
2. Therefore, all relations strictly satisfy **2NF**.

---

### Proof of Third Normal Form (3NF)
> **Definition**: A relation $R$ is in 3NF if it is in 2NF and for every non-trivial functional dependency $X \to Y$, either:
> 1. $X$ is a superkey of $R$, OR
> 2. $Y$ is a prime attribute of $R$ (part of a candidate key).
> Alternatively stated: No non-prime attribute is transitively dependent on any candidate key ($K \to X \to Y$ is prohibited where $X$ is not a superkey).

1. **Analysis of Relations**:
   - **`repair_cases`**:
     - Does not contain department contact details (e.g., `department_phone`, `department_head`). It stores only the foreign key `department_id`.
     - Does not store asset engineering parameters (e.g., `install_year`, `replacement_cost`). It stores only `asset_id`.
     - If department details were placed inside `repair_cases`, we would have:
       $$\text{case\_id} \to \text{department\_id} \to \text{department\_phone}$$
       Since `department_id` is not a superkey of `repair_cases`, this would violate 3NF. Separating `departments` into its own table eliminates this transitive dependency.
   - **`work_orders`**:
     - Stores only `case_id` and `department_id`. It does not store asset location or citizen contact information.
   - **`citizen_reports`**:
     - Stores only `user_id` and `case_id`. Citizen password hash, full name, and role are not duplicated here.
2. For every relation in the CivicFix schema, all left-hand sides of functional dependencies ($X$) are superkeys.
3. Therefore, all relations strictly satisfy **3NF**.

---

### Proof of Boyce-Codd Normal Form (BCNF)
> **Definition**: A relation $R$ is in BCNF if and only if for every non-trivial functional dependency $X \to Y$, $X$ is a superkey.

1. In tables with multiple candidate keys:
   - `departments`: $\{\text{department\_id}\}$ and $\{\text{code}\}$ are both candidate keys (superkeys).
   - `users`: $\{\text{user\_id}\}$ and $\{\text{email}\}$ are both candidate keys (superkeys).
   - `infrastructure_assets`: $\{\text{asset\_id}\}$ and $\{\text{asset\_code}\}$ are both candidate keys (superkeys).
   - `repair_cases`: $\{\text{case\_id}\}$ and $\{\text{case\_number}\}$ are both candidate keys (superkeys).
   - `citizen_reports`: $\{\text{report\_id}\}$ and $\{\text{tracking\_code}\}$ are both candidate keys (superkeys).
   - `work_orders`: $\{\text{work\_order\_id}\}$ and $\{\text{order\_number}\}$ are both candidate keys (superkeys).
   - `repair_inspections`: $\{\text{inspection\_id}\}$ and $\{\text{work\_order\_id}\}$ are both candidate keys (superkeys).
2. Since **every determinant $X$ is a candidate key (and thus a superkey)**, the CivicFix relational schema is in **BCNF**.

---

## 4. Controlled Architectural Derivations & Integrity Defense

In high-throughput civic systems, certain operational queries require $O(1)$ response time rather than costly dynamic multi-table aggregations. The CivicFix schema introduces three carefully governed derived attributes, each protected by database-level integrity controls:

### 1. `total_linked_reports` (in `repair_cases`)
- **Nature**: Redundant aggregation of `COUNT(citizen_reports.report_id WHERE case_id = c.case_id)`.
- **Integrity Guarantee**:
  - Automatically incremented by database trigger `trg_after_citizen_report_insert` on new submissions.
  - Recalculated atomically during duplicate merges in stored procedure `sp_merge_duplicate_reports`.
  - Constrained by `CHECK (total_linked_reports >= 1)`.

### 2. `cost_variance_pct` (in `work_orders`)
- **Nature**: Financial variance percentage comparing final invoiced cost against approved budget.
- **Integrity Guarantee**:
  - Implemented as a **`STORED GENERATED` column**:
    ```sql
    cost_variance_pct DECIMAL(6, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN actual_cost IS NOT NULL AND estimated_cost > 0.00 
            THEN ROUND(((actual_cost - estimated_cost) / estimated_cost) * 100.0, 2)
            ELSE NULL 
        END
    ) STORED
    ```
  - Eliminates application update anomalies because MySQL recalculates and stores the value automatically whenever `actual_cost` or `estimated_cost` changes.

### 3. `priority_score` (in `repair_cases`)
- **Nature**: Composite risk score ($0.00-100.00$).
- **Integrity Guarantee**:
  - Maintained by ACID transactions in backend services (`risk_prioritizer.py`).
  - Constrained at the engine level by `CHECK (priority_score BETWEEN 0.00 AND 100.00)`.
