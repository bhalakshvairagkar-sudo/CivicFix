# Setup & Execution Guide (Windows, Linux, macOS)

This guide provides step-by-step instructions for course evaluators to reproduce, run, and test **CivicFix** on local machines.

---

## 1. System Prerequisites

Before starting, ensure your system has:
- **Python**: Version 3.10 or higher (Python 3.14 verified)
- **Node.js**: Version 18.0 or higher (Node.js v20/v24 verified)
- **MySQL Server**: MySQL 8.0+ or MySQL 9.0+ (MySQL 9.7 verified on Windows)
- **Git**

---

## 2. Environment Configuration (.env Setup)

CivicFix requires environment files for both backend and frontend. Templates with placeholders are provided in the repository:

### 2.1 Backend Environment Setup
1. Copy `backend/.env.example` to `backend/.env`:
   - **Windows (PowerShell)**:
     ```powershell
     Copy-Item backend\.env.example backend\.env
     ```
   - **Linux / macOS (Bash)**:
     ```bash
     cp backend/.env.example backend/.env
     ```
2. Open `backend/.env` and update your MySQL connection parameters:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_actual_mysql_password
   DB_NAME=civicfix_db
   SECRET_KEY=civicfix-production-secure-jwt-key-change-me
   APP_HOST=127.0.0.1
   APP_PORT=8000
   ```

### 2.2 Frontend Environment Setup
1. Copy `frontend/.env.example` to `frontend/.env`:
   - **Windows (PowerShell)**:
     ```powershell
     Copy-Item frontend\.env.example frontend\.env
     ```
   - **Linux / macOS (Bash)**:
     ```bash
     cp frontend/.env.example frontend/.env
     ```
2. The default settings in `frontend/.env` connect to `/api` via Vite reverse proxy:
   ```env
   VITE_API_BASE_URL=/api
   VITE_GOOGLE_MAPS_API_KEY=
   ```

---

## 3. Database Initialization & Seeding

You can initialize the database schema, views, procedures, and seed data using either of the two methods below:

### Method A: Automated Python Scripts (Recommended)
From the project root directory, run:
```bash
# 1. Initialize schema, views, triggers, and procedures
python backend/scripts/init_db.py

# 2. Seed realistic municipal data (assets, cases, reports, 12,000 benchmark records)
python backend/scripts/seed_data.py
```

### Method B: Single-Click Master SQL Script
Open MySQL Workbench or your terminal:
```bash
mysql -u root -p < sql/civicfix_master_init.sql
python backend/scripts/seed_data.py
```

---

## 4. Running Backend and Frontend

### 4.1 One-Click Windows Launch
On Windows, double-click:
```powershell
START_CIVICFIX.bat
```
Or execute:
```powershell
python run_civicfix.py
```
This orchestrator verifies database connectivity, launches FastAPI on `http://127.0.0.1:8000`, launches Vite/React on `http://localhost:5173`, and opens your default browser.

### 4.2 Manual Launch (Cross-Platform)

#### Terminal 1 — Backend (FastAPI):
```bash
# Install Python dependencies
pip install -r backend/requirements.txt   # or pip install fastapi uvicorn pymysql bcrypt pyjwt pydantic python-dotenv

# Start FastAPI server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
*API Swagger Documentation will be available at: `http://127.0.0.1:8000/docs`*

#### Terminal 2 — Frontend (React 19 + Vite):
```bash
cd frontend
npm install
npm run dev
```
*Web Application will be available at: `http://localhost:5173`*

---

## 5. Pre-Seeded Evaluator Accounts (1-Click Login)

The login screen features **1-click authentication buttons** for all pre-seeded evaluator personas:

| Role | Persona Name | Email | Password | Granted Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Marcus Vance | `marcus.admin@civicfix.gov` | `Password123!` | Duplicate case merges, managerial closure approvals, DBMS insights, audit log review |
| **STAFF** | Dave Rodriguez | `dave.roads@civicfix.gov` | `Password123!` | Roads & Bridges: dispatch work orders, update contractor costs, submit inspections |
| **STAFF** | Elena Rostova | `elena.lighting@civicfix.gov`| `Password123!` | Electrical & Lighting: manage streetlights, dispatch crews |
| **CITIZEN** | Alice Cooper | `alice.citizen@gmail.com` | `Password123!` | Citizen portal: lodge defects, upload photos, track progress via tracking tokens |

---

## 6. Running the Automated Test & Demonstration Suite

CivicFix includes automated CLI scripts to verify all aspects of the course deliverables:

```powershell
# 1. Execute all 26 automated integration and DBMS tests (100% passing)
python backend/tests/run_all_tests.py

# 2. Run the 5-step live demonstration showcase
python backend/scripts/demo_live_showcase.py

# 3. Run the live EXPLAIN query optimization benchmark
python backend/scripts/demo_query_optimization.py
```
