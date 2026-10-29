import os
import sys
import random
import uuid
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pymysql

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from config import settings
from security import hash_password
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("civicfix.seed")

# Deterministic seed for reproducible evaluation
random.seed(42)

# Central Coordinates: Metro Civic District (Lat: 12.9716, Lng: 77.5946)
BASE_LAT = 12.9716
BASE_LNG = 77.5946

PHOTO_POTHOLE = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80"
PHOTO_POTHOLE_REPAIRED = "https://images.unsplash.com/photo-1578991624414-276ef23a534f?w=600&auto=format&fit=crop&q=80"
PHOTO_STREETLIGHT = "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80"
PHOTO_STREETLIGHT_FIXED = "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&auto=format&fit=crop&q=80"
PHOTO_DRAINAGE = "https://images.unsplash.com/photo-1541888946425-d0fbb180c5f7?w=600&auto=format&fit=crop&q=80"
PHOTO_DRAIN_FIXED = "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=80"
PHOTO_FOOTPATH = "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&auto=format&fit=crop&q=80"
PHOTO_FOOTPATH_FIXED = "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&auto=format&fit=crop&q=80"

def get_connection():
    return pymysql.connect(
        host=settings.DB_HOST,
        port=int(settings.DB_PORT),
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )

def seed_all():
    logger.info("Beginning database seed for CivicFix...")
    conn = get_connection()
    cur = conn.cursor()

    try:
        # ----------------------------------------------------------------------
        # 1. Departments
        # ----------------------------------------------------------------------
        logger.info("Seeding departments...")
        departments = [
            ("ROADS", "Roads & Bridges Department", "roads@civicfix.gov", "+1 (555) 234-5671", 1200000.00, 345000.00),
            ("LIGHTING", "Electrical & Public Lighting", "lighting@civicfix.gov", "+1 (555) 234-5672", 650000.00, 185000.00),
            ("DRAINAGE", "Stormwater & Water Supply Works", "drainage@civicfix.gov", "+1 (555) 234-5673", 950000.00, 420000.00),
            ("TRAFFIC", "Traffic Signals & Urban Signage", "traffic@civicfix.gov", "+1 (555) 234-5674", 450000.00, 92000.00),
        ]
        dept_ids = {}
        for code, name, email, phone, ann_bud, spent in departments:
            cur.execute("""
                INSERT INTO departments (code, name, contact_email, contact_phone, annual_budget, spent_budget)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE name=VALUES(name)
            """, (code, name, email, phone, ann_bud, spent))
            cur.execute("SELECT department_id FROM departments WHERE code = %s", (code,))
            dept_ids[code] = cur.fetchone()["department_id"]

        # ----------------------------------------------------------------------
        # 2. Users (Admin, Staff, Citizen)
        # ----------------------------------------------------------------------
        logger.info("Seeding demo users...")
        pwd_hash = hash_password("Password123!")

        users = [
            # Admins
            ("marcus.admin@civicfix.gov", pwd_hash, "Marcus Vance", "ADMIN", None, "+1 (555) 100-0001"),
            ("sarah.admin@civicfix.gov", pwd_hash, "Sarah Chen", "ADMIN", None, "+1 (555) 100-0002"),
            # Staff
            ("dave.roads@civicfix.gov", pwd_hash, "Dave Rodriguez", "STAFF", dept_ids["ROADS"], "+1 (555) 200-0001"),
            ("elena.lighting@civicfix.gov", pwd_hash, "Elena Rostova", "STAFF", dept_ids["LIGHTING"], "+1 (555) 200-0002"),
            ("raj.drainage@civicfix.gov", pwd_hash, "Rajesh Patel", "STAFF", dept_ids["DRAINAGE"], "+1 (555) 200-0003"),
            ("priya.traffic@civicfix.gov", pwd_hash, "Priya Sharma", "STAFF", dept_ids["TRAFFIC"], "+1 (555) 200-0004"),
            # Citizens
            ("alice.citizen@gmail.com", pwd_hash, "Alice Cooper", "CITIZEN", None, "+1 (555) 300-0001"),
            ("bob.citizen@gmail.com", pwd_hash, "Bob Martinez", "CITIZEN", None, "+1 (555) 300-0002"),
            ("charlie.citizen@gmail.com", pwd_hash, "Charlie Evans", "CITIZEN", None, "+1 (555) 300-0003"),
            ("dana.citizen@gmail.com", pwd_hash, "Dana White", "CITIZEN", None, "+1 (555) 300-0004")
        ]

        user_ids = {}
        for email, p_hash, name, role, d_id, phone in users:
            cur.execute("""
                INSERT INTO users (email, password_hash, full_name, role, department_id, phone)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), role=VALUES(role)
            """, (email, p_hash, name, role, d_id, phone))
            cur.execute("SELECT user_id FROM users WHERE email = %s", (email,))
            user_ids[email] = cur.fetchone()["user_id"]

        # ----------------------------------------------------------------------
        # 3. Sensitive Locations (Hospitals, Schools, Transit Hubs)
        # ----------------------------------------------------------------------
        logger.info("Seeding sensitive locations...")
        sensitive_locs = [
            ("Metro General Hospital", "HOSPITAL", BASE_LAT + 0.0042, BASE_LNG + 0.0035, 400, 25, "100 Hospital Way, Metro City"),
            ("St. Jude Children's Medical Center", "HOSPITAL", BASE_LAT - 0.0051, BASE_LNG - 0.0040, 350, 25, "45 Healthcare Blvd"),
            ("Lincoln High School", "SCHOOL", BASE_LAT + 0.0068, BASE_LNG - 0.0025, 300, 20, "12 Education St, Ward 2"),
            ("Oakridge Elementary School", "SCHOOL", BASE_LAT - 0.0038, BASE_LNG + 0.0065, 300, 20, "78 Oakridge Ave, Ward 4"),
            ("Metro Central Subway Terminal", "TRANSIT_HUB", BASE_LAT + 0.0012, BASE_LNG + 0.0008, 450, 20, "Central Plaza Station"),
            ("Northgate Transit Hub", "TRANSIT_HUB", BASE_LAT + 0.0085, BASE_LNG + 0.0050, 350, 15, "Northgate Avenue & 12th St"),
            ("Sunrise Senior Care Living", "ELDER_CARE", BASE_LAT - 0.0072, BASE_LNG + 0.0020, 250, 15, "210 Tranquil Way, Ward 5"),
            ("City Fire & Rescue Station #4", "FIRE_STATION", BASE_LAT - 0.0015, BASE_LNG - 0.0062, 400, 15, "88 Emergency Drive")
        ]

        cur.execute("DELETE FROM sensitive_locations;")
        for name, ltype, lat, lng, buffer_m, weight, addr in sensitive_locs:
            cur.execute("""
                INSERT INTO sensitive_locations (name, type, latitude, longitude, buffer_meters, weight_score, address)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (name, ltype, lat, lng, buffer_m, weight, addr))

        # ----------------------------------------------------------------------
        # 4. Infrastructure Assets (Physical Infrastructure Memory)
        # ----------------------------------------------------------------------
        logger.info("Seeding persistent infrastructure assets...")
        assets_data = [
            ("AST-ROD-0101", "5th Main Arterial Road - Km 2.4", "POTHOLE", "Ward 1", "Outside Metro General Hospital Gate 2", BASE_LAT + 0.0040, BASE_LNG + 0.0033, dept_ids["ROADS"], 2018, 8, 45.0, 4, 3, 32400.00, 40000.00, True, "Critical recurrent failure near hospital; 3 repeat repairs within 12 months."),
            ("AST-ROD-0102", "North Avenue Boulevard", "POTHOLE", "Ward 2", "Corner of 14th Cross & North Ave", BASE_LAT + 0.0075, BASE_LNG + 0.0015, dept_ids["ROADS"], 2020, 10, 82.0, 1, 0, 4200.00, 35000.00, False, None),
            ("AST-ROD-0103", "Commercial Street Asphalt Segment", "POTHOLE", "Ward 3", "Opposite City Mall Entrance", BASE_LAT - 0.0020, BASE_LNG + 0.0045, dept_ids["ROADS"], 2019, 10, 68.0, 2, 1, 11500.00, 38000.00, False, None),
            ("AST-ROD-0104", "Bridge Approach Flyover Span", "POTHOLE", "Ward 1", "Overpass Span #3 Northbound", BASE_LAT + 0.0055, BASE_LNG - 0.0035, dept_ids["ROADS"], 2016, 15, 52.0, 3, 2, 28000.00, 45000.00, True, "Frequent structural joint depression; requires engineering core sample."),
            ("AST-ROD-0105", "Industrial Ring Road Junction", "POTHOLE", "Ward 6", "Near Freight Warehouse 9", BASE_LAT - 0.0090, BASE_LNG - 0.0080, dept_ids["ROADS"], 2017, 12, 60.0, 2, 1, 16200.00, 50000.00, False, None),

            ("AST-LGT-0042", "High-Mast Streetlight Pole #42", "STREETLIGHT", "Ward 2", "In front of Lincoln High School", BASE_LAT + 0.0069, BASE_LNG - 0.0023, dept_ids["LIGHTING"], 2021, 12, 58.0, 2, 1, 3800.00, 12000.00, False, None),
            ("AST-LGT-0043", "Twin LED Luminaire Post #88", "STREETLIGHT", "Ward 1", "Central Plaza Pedestrian Spine", BASE_LAT + 0.0010, BASE_LNG + 0.0010, dept_ids["LIGHTING"], 2022, 10, 94.0, 0, 0, 0.00, 8500.00, False, None),
            ("AST-LGT-0044", "Solar Streetlight Cluster #15", "STREETLIGHT", "Ward 5", "Sunrise Senior Living Promenade", BASE_LAT - 0.0070, BASE_LNG + 0.0022, dept_ids["LIGHTING"], 2020, 8, 48.0, 3, 2, 7900.00, 10500.00, True, "Inverter battery recurring burnout; investigate subcontractor components."),

            ("AST-DRN-0201", "Stormwater Culvert #12", "DRAINAGE", "Ward 3", "Market Square Drainage Outfall", BASE_LAT - 0.0030, BASE_LNG + 0.0028, dept_ids["DRAINAGE"], 2015, 20, 38.0, 5, 3, 42000.00, 55000.00, True, "Cumulative maintenance ($42k) exceeds 75% of full culvert replacement cost."),
            ("AST-DRN-0202", "Precast Concrete Storm Trench #5", "DRAINAGE", "Ward 4", "Eastside Primary School Lane", BASE_LAT - 0.0040, BASE_LNG + 0.0060, dept_ids["DRAINAGE"], 2019, 15, 75.0, 1, 0, 6500.00, 28000.00, False, None),
            ("AST-DRN-0203", "Main Catchment Interceptor Drain", "DRAINAGE", "Ward 1", "Beside Metro Central Station", BASE_LAT + 0.0018, BASE_LNG + 0.0005, dept_ids["DRAINAGE"], 2017, 20, 62.0, 2, 1, 18500.00, 65000.00, False, None),

            ("AST-WAT-0301", "Cast-Iron 12-inch Water Trunk Line", "WATER_LEAK", "Ward 1", "Sub-surface Pipe Segment under Park Rd", BASE_LAT + 0.0030, BASE_LNG + 0.0040, dept_ids["DRAINAGE"], 2012, 25, 42.0, 4, 3, 38500.00, 50000.00, True, "Multiple pressure fractures in ageing cast-iron main."),
            ("AST-WAT-0302", "HDPE Distribution Main 8-inch", "WATER_LEAK", "Ward 2", "Residential Sector 4 Line", BASE_LAT + 0.0060, BASE_LNG - 0.0010, dept_ids["DRAINAGE"], 2021, 25, 88.0, 1, 0, 3200.00, 30000.00, False, None),

            ("AST-FOT-0501", "Pedestrian Walkway Paver Section #10", "FOOTPATH", "Ward 2", "Lincoln High School East Walkway", BASE_LAT + 0.0066, BASE_LNG - 0.0028, dept_ids["ROADS"], 2019, 10, 55.0, 3, 2, 9200.00, 18000.00, False, None),
            ("AST-FOT-0502", "Tactile Granite Promenade", "FOOTPATH", "Ward 1", "Metro Hospital Amb Walkway", BASE_LAT + 0.0045, BASE_LNG + 0.0030, dept_ids["ROADS"], 2022, 12, 85.0, 1, 0, 2800.00, 22000.00, False, None),

            ("AST-SIG-0401", "Smart Traffic Controller Junction #4", "TRAFFIC_SIGNAL", "Ward 1", "Central Plaza 4-Way Intersection", BASE_LAT + 0.0015, BASE_LNG + 0.0012, dept_ids["TRAFFIC"], 2021, 8, 80.0, 1, 0, 4100.00, 25000.00, False, None),
            ("AST-SIG-0402", "School Pedestrian Crossing Beacon", "TRAFFIC_SIGNAL", "Ward 4", "Oakridge School Crossing", BASE_LAT - 0.0036, BASE_LNG + 0.0063, dept_ids["TRAFFIC"], 2020, 8, 70.0, 2, 1, 5600.00, 18000.00, False, None)
        ]

        cur.execute("DELETE FROM citizen_reports;")
        cur.execute("DELETE FROM repair_inspections;")
        cur.execute("DELETE FROM work_orders;")
        cur.execute("DELETE FROM repair_cases;")
        cur.execute("DELETE FROM infrastructure_assets;")

        asset_ids_map = {}
        for code, name, cat, ward, lm, lat, lng, d_id, i_yr, span, hlth, tot, rec, c_cost, r_cost, inv, inv_r in assets_data:
            cur.execute("""
                INSERT INTO infrastructure_assets (
                    asset_code, name, category, ward_number, address_landmark,
                    latitude, longitude, department_id, install_year, expected_lifespan_years,
                    current_health_score, total_incidents_count, recurring_failures_count,
                    cumulative_repair_cost, replacement_cost_estimate, investigation_flag, investigation_reason
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (code, name, cat, ward, lm, lat, lng, d_id, i_yr, span, hlth, tot, rec, c_cost, r_cost, inv, inv_r))
            asset_ids_map[code] = cur.lastrowid

        # ----------------------------------------------------------------------
        # 5. Repair Cases (with Duplicates, Recurrences, Priority Breakdowns)
        # ----------------------------------------------------------------------
        logger.info("Seeding repair cases...")
        now = datetime.now(timezone.utc)

        cases_to_seed = [
            # Case 1: CRITICAL, RECURRING, NEAR HOSPITAL, DUPLICATE CLUSTER
            {
                "case_number": "CAS-2026-0001",
                "asset_code": "AST-ROD-0101",
                "category": "POTHOLE",
                "title": "Severe 40cm Asphalt Crater & Structural Cave-in",
                "description": "Hazardous asphalt crater spanning half the lane directly in front of Metro General Hospital emergency ambulance entry. Multiple ambulances forced to swerve onto oncoming traffic.",
                "severity": "CRITICAL",
                "status": "IN_PROGRESS",
                "priority_score": 92.5,
                "priority_level": "CRITICAL",
                "lat": BASE_LAT + 0.0041,
                "lng": BASE_LNG + 0.0034,
                "dept_code": "ROADS",
                "is_recurring": True,
                "days_since_repair": 38,
                "linked_reports": 4,
                "created_days_ago": 3,
                "creator": "alice.citizen@gmail.com",
                "priority_breakdown": {
                    "base_severity": 40.0,
                    "age_penalty": 4.5,
                    "recurrence_penalty": 20.0,
                    "sensitive_proximity_penalty": 25.0,
                    "sensitive_locations_nearby": ["Metro General Hospital (HOSPITAL, 110m away)"],
                    "linked_reports_count": 4,
                    "citizen_bonus": 9.0,
                    "total_score": 98.5,
                    "priority_level": "CRITICAL",
                    "explanation": "Critical severity (40 pts) + 110m from Metro General Hospital (+25 pts) + Recurring failure on AST-ROD-0101 (+20 pts) + 4 citizen confirmations (+9 pts)."
                }
            },
            # Case 2: HIGH, NEAR SCHOOL
            {
                "case_number": "CAS-2026-0002",
                "asset_code": "AST-LGT-0042",
                "category": "STREETLIGHT",
                "title": "Exposed High-Voltage Cable on Streetlight Mast",
                "description": "Base access plate has detached with exposed 230V cabling hanging out onto the sidewalk right outside Lincoln High School main gate.",
                "severity": "CRITICAL",
                "status": "ASSIGNED",
                "priority_score": 86.0,
                "priority_level": "CRITICAL",
                "lat": BASE_LAT + 0.0069,
                "lng": BASE_LNG - 0.0024,
                "dept_code": "LIGHTING",
                "is_recurring": False,
                "days_since_repair": None,
                "linked_reports": 2,
                "created_days_ago": 1,
                "creator": "bob.citizen@gmail.com",
                "priority_breakdown": {
                    "base_severity": 40.0,
                    "age_penalty": 1.5,
                    "recurrence_penalty": 0.0,
                    "sensitive_proximity_penalty": 20.0,
                    "sensitive_locations_nearby": ["Lincoln High School (SCHOOL, 45m away)"],
                    "linked_reports_count": 2,
                    "citizen_bonus": 3.0,
                    "total_score": 64.5,
                    "priority_level": "HIGH",
                    "explanation": "Severe electrocution hazard 45m from Lincoln High School (+20 pts)."
                }
            },
            # Case 3: RECURRING, MARKET CULVERT OVERFLOW
            {
                "case_number": "CAS-2026-0003",
                "asset_code": "AST-DRN-0201",
                "category": "DRAINAGE",
                "title": "Stormwater Culvert Blockage & Silt Backflow",
                "description": "Heavy sediment and debris accumulation causing raw stormwater backflow across Market Square pedestrian walkways.",
                "severity": "HIGH",
                "status": "OPEN",
                "priority_score": 68.0,
                "priority_level": "HIGH",
                "lat": BASE_LAT - 0.0029,
                "lng": BASE_LNG + 0.0029,
                "dept_code": "DRAINAGE",
                "is_recurring": True,
                "days_since_repair": 52,
                "linked_reports": 3,
                "created_days_ago": 4,
                "creator": "charlie.citizen@gmail.com",
                "priority_breakdown": {
                    "base_severity": 25.0,
                    "age_penalty": 6.0,
                    "recurrence_penalty": 20.0,
                    "sensitive_proximity_penalty": 0.0,
                    "linked_reports_count": 3,
                    "citizen_bonus": 6.0,
                    "total_score": 57.0,
                    "priority_level": "HIGH",
                    "explanation": "High severity failure + repeat recurrence on Culvert AST-DRN-0201 (+20 pts)."
                }
            },
            # Case 4: SUSPICIOUS CLOSURE DEMO (No after photo, resolved in 40 mins)
            {
                "case_number": "CAS-2026-0004",
                "asset_code": "AST-ROD-0103",
                "category": "POTHOLE",
                "title": "Commercial St Surface Rutting & Edge Erosion",
                "description": "Road shoulder collapsed near bus stop bay causing tripping hazard.",
                "severity": "MEDIUM",
                "status": "VERIFIED_CLOSED",
                "priority_score": 42.0,
                "priority_level": "MEDIUM",
                "lat": BASE_LAT - 0.0019,
                "lng": BASE_LNG + 0.0044,
                "dept_code": "ROADS",
                "is_recurring": False,
                "days_since_repair": None,
                "linked_reports": 1,
                "created_days_ago": 6,
                "creator": "dana.citizen@gmail.com",
                "priority_breakdown": {
                    "base_severity": 15.0,
                    "age_penalty": 0.0,
                    "recurrence_penalty": 0.0,
                    "sensitive_proximity_penalty": 0.0,
                    "linked_reports_count": 1,
                    "citizen_bonus": 0.0,
                    "total_score": 15.0,
                    "priority_level": "LOW",
                    "explanation": "Standard medium pothole repair."
                }
            },
            # Case 5: COST OVERRUN DEMO (Actual cost exceeded estimate by 85%)
            {
                "case_number": "CAS-2026-0005",
                "asset_code": "AST-WAT-0301",
                "category": "WATER_LEAK",
                "title": "Subsurface 12-inch Water Main Rupture",
                "description": "High-pressure potable water geyser eroding road substructure and flooding parkway.",
                "severity": "CRITICAL",
                "status": "REPAIR_COMPLETED",
                "priority_score": 88.0,
                "priority_level": "CRITICAL",
                "lat": BASE_LAT + 0.0031,
                "lng": BASE_LNG + 0.0039,
                "dept_code": "DRAINAGE",
                "is_recurring": True,
                "days_since_repair": 45,
                "linked_reports": 2,
                "created_days_ago": 5,
                "creator": "alice.citizen@gmail.com",
                "priority_breakdown": {
                    "base_severity": 40.0,
                    "age_penalty": 7.5,
                    "recurrence_penalty": 20.0,
                    "sensitive_proximity_penalty": 15.0,
                    "linked_reports_count": 2,
                    "citizen_bonus": 3.0,
                    "total_score": 85.5,
                    "priority_level": "CRITICAL",
                    "explanation": "Critical water main failure near transit link with recurrence history."
                }
            },
            # Case 6: DUPLICATE MERGED DEMO
            {
                "case_number": "CAS-2026-0006",
                "asset_code": "AST-ROD-0101",
                "category": "POTHOLE",
                "title": "Large Pothole near Hospital Emergency Gate [Merged into Case #CAS-2026-0001]",
                "description": "Secondary report on the same asphalt crater outside Metro Hospital gate. Merged by administrator.",
                "severity": "CRITICAL",
                "status": "DUPLICATE_MERGED",
                "priority_score": 75.0,
                "priority_level": "CRITICAL",
                "lat": BASE_LAT + 0.0040,
                "lng": BASE_LNG + 0.0035,
                "dept_code": "ROADS",
                "is_recurring": True,
                "days_since_repair": 38,
                "linked_reports": 1,
                "created_days_ago": 2,
                "creator": "bob.citizen@gmail.com",
                "priority_breakdown": {}
            }
        ]

        # Generate additional realistic cases across categories
        more_categories = [
            ("POTHOLE", "AST-ROD-0102", "North Ave Speed Table Depression", "ROADS", "MEDIUM", 35.0, "MEDIUM"),
            ("POTHOLE", "AST-ROD-0104", "Flyover Expansion Joint Pothole", "ROADS", "HIGH", 62.0, "HIGH"),
            ("STREETLIGHT", "AST-LGT-0043", "Central Plaza Fixture Flickering", "LIGHTING", "LOW", 18.0, "LOW"),
            ("STREETLIGHT", "AST-LGT-0044", "Senior Living Path Solar Battery Depleted", "LIGHTING", "HIGH", 58.0, "HIGH"),
            ("FOOTPATH", "AST-FOT-0501", "Displaced Paver Tiles near High School", "ROADS", "HIGH", 54.0, "HIGH"),
            ("FOOTPATH", "AST-FOT-0502", "Granite Curb Collapse on Amb Walkway", "ROADS", "MEDIUM", 36.0, "MEDIUM"),
            ("DRAINAGE", "AST-DRN-0202", "Concrete Drain Silt Accumulation", "DRAINAGE", "MEDIUM", 32.0, "MEDIUM"),
            ("DRAINAGE", "AST-DRN-0203", "Station Catchment Grate Missing", "DRAINAGE", "CRITICAL", 78.0, "CRITICAL"),
            ("WATER_LEAK", "AST-WAT-0302", "Sub-meter Valve Gasket Weeping", "DRAINAGE", "LOW", 22.0, "LOW"),
            ("TRAFFIC_SIGNAL", "AST-SIG-0401", "Red Lamp Burnout at 4-Way Junction", "TRAFFIC", "HIGH", 66.0, "HIGH"),
            ("TRAFFIC_SIGNAL", "AST-SIG-0402", "School Crossing Amber Flasher Out", "TRAFFIC", "CRITICAL", 82.0, "CRITICAL"),
        ]

        for i, (cat, code, title, d_code, sev, score, level) in enumerate(more_categories, start=7):
            cases_to_seed.append({
                "case_number": f"CAS-2026-00{i:02d}",
                "asset_code": code,
                "category": cat,
                "title": title,
                "description": f"Citizen reports ongoing defect: {title}. Requires inspection and departmental maintenance dispatch.",
                "severity": sev,
                "status": random.choice(["OPEN", "ASSIGNED", "IN_PROGRESS", "VERIFIED_CLOSED"]),
                "priority_score": score,
                "priority_level": level,
                "lat": BASE_LAT + random.uniform(-0.007, 0.007),
                "lng": BASE_LNG + random.uniform(-0.007, 0.007),
                "dept_code": d_code,
                "is_recurring": (i % 3 == 0),
                "days_since_repair": 40 if (i % 3 == 0) else None,
                "linked_reports": 1,
                "created_days_ago": random.randint(1, 14),
                "creator": random.choice(list(user_ids.keys())),
                "priority_breakdown": {
                    "base_severity": 25.0 if sev == "HIGH" else 15.0,
                    "total_score": score,
                    "priority_level": level,
                    "explanation": f"{sev} priority issue categorized under {cat}."
                }
            })

        case_ids_map = {}
        for c in cases_to_seed:
            created_dt = now - timedelta(days=c["created_days_ago"])
            closed_dt = (now - timedelta(days=1)) if c["status"] == "VERIFIED_CLOSED" else None
            
            cur.execute("""
                INSERT INTO repair_cases (
                    case_number, asset_id, category, title, description, severity, status,
                    priority_score, priority_level, priority_breakdown, latitude, longitude,
                    department_id, is_recurring_failure, days_since_last_repair,
                    total_linked_reports, created_by_user_id, created_at, closed_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                c["case_number"],
                asset_ids_map[c["asset_code"]],
                c["category"],
                c["title"],
                c["description"],
                c["severity"],
                c["status"],
                c["priority_score"],
                c["priority_level"],
                json.dumps(c["priority_breakdown"]),
                c["lat"],
                c["lng"],
                dept_ids[c["dept_code"]],
                c["is_recurring"],
                c["days_since_repair"],
                c["linked_reports"],
                user_ids[c["creator"]],
                created_dt,
                closed_dt
            ))
            case_ids_map[c["case_number"]] = cur.lastrowid

        # ----------------------------------------------------------------------
        # 6. Citizen Reports (Including Linked Duplicates)
        # ----------------------------------------------------------------------
        logger.info("Seeding citizen reports with photos and tracking codes...")
        reports_data = [
            # 4 Duplicate Reports linked to CAS-2026-0001 (Hospital Pothole Cluster)
            ("REP-A1B2C3D", "alice.citizen@gmail.com", "CAS-2026-0001", True, "POTHOLE", "CRITICAL", "Gigantic pothole in front of emergency room entrance. Ambulance tire blown.", PHOTO_POTHOLE, BASE_LAT + 0.0041, BASE_LNG + 0.0034, "102 Hospital Way, Outside Gate 2", "WORK_UNDERWAY", 14),
            ("REP-B2C3D4E", "bob.citizen@gmail.com", "CAS-2026-0001", False, "POTHOLE", "HIGH", "Severe road crater right by the hospital. Very dangerous at night.", PHOTO_POTHOLE, BASE_LAT + 0.0040, BASE_LNG + 0.0035, "Hospital Way near ER drive", "LINKED_TO_CASE", 9),
            ("REP-C3D4E5F", "charlie.citizen@gmail.com", "CAS-2026-0001", False, "POTHOLE", "CRITICAL", "Deep sinkhole-like cavity forming outside ambulance bay. Concrete subsiding.", PHOTO_POTHOLE, BASE_LAT + 0.0042, BASE_LNG + 0.0033, "Opposite Metro Hospital Gate 2", "LINKED_TO_CASE", 7),
            ("REP-D4E5F6G", "dana.citizen@gmail.com", "CAS-2026-0001", False, "POTHOLE", "CRITICAL", "Pothole has grown significantly after yesterday's rain. Cars hitting it hard.", PHOTO_POTHOLE, BASE_LAT + 0.0041, BASE_LNG + 0.0036, "Hospital Way intersection", "LINKED_TO_CASE", 5),

            # 2 Reports on CAS-2026-0002 (School Exposed Wire)
            ("REP-E5F6G7H", "bob.citizen@gmail.com", "CAS-2026-0002", True, "STREETLIGHT", "CRITICAL", "Exposed electrical wiring dangling from streetlight pole where schoolchildren walk.", PHOTO_STREETLIGHT, BASE_LAT + 0.0069, BASE_LNG - 0.0024, "Lincoln High School East Crosswalk", "INVESTIGATING", 11),
            ("REP-F6G7H8J", "dana.citizen@gmail.com", "CAS-2026-0002", False, "STREETLIGHT", "CRITICAL", "Sparking light post base plate detached right next to school entrance.", PHOTO_STREETLIGHT, BASE_LAT + 0.0068, BASE_LNG - 0.0025, "12 Education St", "LINKED_TO_CASE", 6),

            # Reports for other cases
            ("REP-G7H8J9K", "charlie.citizen@gmail.com", "CAS-2026-0003", True, "DRAINAGE", "HIGH", "Market drainage culvert overflowing into storefronts and sidewalk.", PHOTO_DRAINAGE, BASE_LAT - 0.0029, BASE_LNG + 0.0029, "Market Square St #4", "SUBMITTED", 8),
            ("REP-H8J9K1L", "dana.citizen@gmail.com", "CAS-2026-0004", True, "POTHOLE", "MEDIUM", "Road shoulder edge eroded near bus stop.", PHOTO_POTHOLE, BASE_LAT - 0.0019, BASE_LNG + 0.0044, "Commercial St Bus Bay", "RESOLVED", 2),
            ("REP-J9K1L2M", "alice.citizen@gmail.com", "CAS-2026-0005", True, "WATER_LEAK", "CRITICAL", "Water main burst flooding parkway and road lane.", PHOTO_DRAINAGE, BASE_LAT + 0.0031, BASE_LNG + 0.0039, "Park Rd & 3rd St", "RESOLVED", 12),
        ]

        for code, u_email, c_num, is_prim, cat, sev, desc, photo, lat, lng, addr, stat, upvotes in reports_data:
            cur.execute("""
                INSERT INTO citizen_reports (
                    tracking_code, user_id, case_id, is_primary_case_report,
                    category, severity, description, photo_url, latitude, longitude,
                    address_text, status, upvotes_count, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                code,
                user_ids[u_email],
                case_ids_map[c_num],
                is_prim,
                cat,
                sev,
                desc,
                photo,
                lat,
                lng,
                addr,
                stat,
                upvotes,
                now - timedelta(days=random.randint(1, 5))
            ))

        # ----------------------------------------------------------------------
        # 7. Work Orders (Dispatch, Execution, Materials, Cost Variance)
        # ----------------------------------------------------------------------
        logger.info("Seeding work orders...")
        work_orders_data = [
            # Work Order 1: Active In Progress on Hospital Pothole
            ("WO-2026-0001", "CAS-2026-0001", "ROADS", "Foreman Mike Taylor", "Apex Roadworks Ltd.", 3800.00, 4100.00, now - timedelta(days=2), now + timedelta(days=1), None, "High-grade polymer asphalt, bitumen tack coat, compactor", "Asphalt mill & overlay underway. Police detail managing emergency traffic.", "IN_PROGRESS"),
            # Work Order 2: Scheduled on School Exposed Cable
            ("WO-2026-0002", "CAS-2026-0002", "LIGHTING", "Electrician Leo Adams", "Municipal Lighting Crew A", 650.00, 0.00, now - timedelta(days=1), now + timedelta(days=1), None, "Insulated wiring harness, tamper-proof steel access door", "Scheduled for emergency isolation prior to school morning bell.", "SCHEDULED"),
            # Work Order 3: Completed on Commercial St (Suspicious fast closure demo)
            ("WO-2026-0003", "CAS-2026-0004", "ROADS", "Crew Lead Jack Miller", "QuickPatch Contractors", 900.00, 850.00, now - timedelta(days=6), now - timedelta(days=5), now - timedelta(days=5, hours=23), "Cold mix asphalt patch", "Quick patch applied to road edge.", "WORK_COMPLETED"),
            # Work Order 4: Cost Overrun Demo on Water Main
            ("WO-2026-0004", "CAS-2026-0005", "DRAINAGE", "Engineer Nathan Drake", "Metropolitan Pipeline Corp.", 4200.00, 7850.00, now - timedelta(days=4), now - timedelta(days=2), now - timedelta(days=2), "12-inch stainless clamp, 4m ductile iron pipe replacement, gravel backfill", "Excavation revealed unforeseen corrosion extending 4 meters beyond initial estimate.", "WORK_COMPLETED"),
        ]

        wo_ids_map = {}
        for wo_num, c_num, d_code, lead, contractor, est_cost, act_cost, created_dt, target_dt, act_dt, mats, notes, stat in work_orders_data:
            cur.execute("""
                INSERT INTO work_orders (
                    work_order_number, case_id, department_id, assigned_team_leader,
                    contractor_name, estimated_cost, actual_cost, created_at,
                    target_completion_date, actual_completion_date, materials_used, work_notes, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                wo_num,
                case_ids_map[c_num],
                dept_ids[d_code],
                lead,
                contractor,
                est_cost,
                act_cost,
                created_dt,
                target_dt,
                act_dt,
                mats,
                notes,
                stat
            ))
            wo_ids_map[wo_num] = cur.lastrowid

        # ----------------------------------------------------------------------
        # 8. Repair Inspections (Evidence-Based Verification with Photos & Flags)
        # ----------------------------------------------------------------------
        logger.info("Seeding repair inspections...")
        inspections_data = [
            # Inspection 1: Suspicious case demo (Missing after photo, resolved in < 1 hour)
            (
                "CAS-2026-0004",
                "WO-2026-0003",
                "dave.roads@civicfix.gov",
                PHOTO_POTHOLE,
                "",  # EMPTY AFTER PHOTO -> TRIGGERS SUSPICIOUS FLAG
                2,   # 2 STARS -> TRIGGERS SUBSTANDARD RATING FLAG
                "POOR",
                "Cold mix tamped down by hand. No hot roller compaction observed. Highly prone to disintegrating in next rainfall.",
                True,
                True,
                ["MISSING_AFTER_PHOTO: Repair inspection lacks verified post-repair photograph.", "SUBSTANDARD_QUALITY_RATING: Inspector assigned low quality rating (2/5 stars).", "POOR_DURABILITY_ASSESSMENT: Inspector noted substandard durability; high risk of premature failure."]
            ),
            # Inspection 2: Cost Overrun case with verified before & after photos
            (
                "CAS-2026-0005",
                "WO-2026-0004",
                "raj.drainage@civicfix.gov",
                PHOTO_DRAINAGE,
                PHOTO_DRAIN_FIXED,
                5,
                "EXCELLENT",
                "Ductile iron replacement completed with proper hydrostatic pressure test (150 psi held for 2 hours). Asphalt reinstatement smooth.",
                True,
                True,  # Flagged solely for cost overrun (>50%)
                ["SIGNIFICANT_COST_OVERRUN: Actual expense ($7,850.00) exceeded initial estimate ($4,200.00) by >50%."]
            )
        ]

        for c_num, wo_num, insp_email, b_photo, a_photo, q_rating, dur, notes, passed, is_susp, flags in inspections_data:
            cur.execute("""
                INSERT INTO repair_inspections (
                    case_id, work_order_id, inspector_user_id, before_photo_url,
                    after_photo_url, quality_rating, durability_assessment,
                    inspection_notes, passed_verification, is_suspicious, suspicious_flags
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                case_ids_map[c_num],
                wo_ids_map[wo_num],
                user_ids[insp_email],
                b_photo,
                a_photo,
                q_rating,
                dur,
                notes,
                passed,
                is_susp,
                json.dumps(flags)
            ))

        # ----------------------------------------------------------------------
        # 9. Audit Logs
        # ----------------------------------------------------------------------
        logger.info("Seeding audit trail...")
        audit_events = [
            ("REPORT_CREATED", "CITIZEN_REPORT", 1, user_ids["alice.citizen@gmail.com"], "Alice Cooper", None, {"tracking": "REP-A1B2C3D", "case": "CAS-2026-0001"}, "Filed report REP-A1B2C3D outside Metro Hospital."),
            ("DUPLICATE_MERGE", "REPAIR_CASE", case_ids_map["CAS-2026-0001"], user_ids["marcus.admin@civicfix.gov"], "Marcus Vance", {"merged_case": "CAS-2026-0006"}, {"target_case": "CAS-2026-0001", "reports_transferred": 1}, "Merged duplicate Case #CAS-2026-0006 into primary Case #CAS-2026-0001."),
            ("CASE_ASSIGNMENT", "REPAIR_CASE", case_ids_map["CAS-2026-0001"], user_ids["marcus.admin@civicfix.gov"], "Marcus Vance", {"dept": None}, {"dept": "ROADS"}, "Assigned Case #CAS-2026-0001 to Roads & Bridges Department."),
            ("WORK_ORDER_CREATED", "WORK_ORDER", wo_ids_map["WO-2026-0001"], user_ids["dave.roads@civicfix.gov"], "Dave Rodriguez", None, {"wo": "WO-2026-0001", "est": 3800.00}, "Dispatched WO-2026-0001 to Apex Roadworks Ltd."),
            ("SUSPICIOUS_FLAG_RAISED", "REPAIR_INSPECTION", 1, user_ids["dave.roads@civicfix.gov"], "Dave Rodriguez", None, {"flags": ["MISSING_AFTER_PHOTO", "SUBSTANDARD_QUALITY_RATING"]}, "Raised suspicious audit flags on Case #CAS-2026-0004 closure evidence.")
        ]

        for action, etype, eid, uid, actor, old_s, new_s, summary in audit_events:
            cur.execute("""
                INSERT INTO audit_logs (
                    action_type, entity_type, entity_id, performed_by_user_id,
                    actor_name, old_state, new_state, change_summary, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                action, etype, eid, uid, actor,
                json.dumps(old_s) if old_s else None,
                json.dumps(new_s) if new_s else None,
                summary,
                now - timedelta(days=random.randint(1, 4))
            ))

        # ----------------------------------------------------------------------
        # 10. Synthetic Benchmark Records (10,000+ rows for real MySQL query performance demo)
        # ----------------------------------------------------------------------
        logger.info("Generating 10,000+ benchmark records for live index performance testing...")
        cur.execute("DELETE FROM benchmark_records;")
        
        categories = ["POTHOLE", "STREETLIGHT", "FOOTPATH", "DRAINAGE", "WATER_LEAK", "TRAFFIC_SIGNAL"]
        statuses = ["OPEN", "ASSIGNED", "IN_PROGRESS", "REPAIR_COMPLETED", "VERIFIED_CLOSED"]
        severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assets = list(asset_ids_map.keys())

        batch_records = []
        for i in range(12000):
            batch_code = f"BATCH-{(i // 500) + 1:03d}"
            asset_c = random.choice(assets)
            cat = random.choice(categories)
            stat = random.choice(statuses)
            sev = random.choice(severities)
            cost = round(random.uniform(150.0, 12000.0), 2)
            ward = f"Ward {random.randint(1, 8)}"
            log_date = (now - timedelta(days=random.randint(1, 365))).strftime("%Y-%m-%d")
            notes = f"Urgent repair logged for {cat.lower()} on road sector {ward}. Priority check required."

            batch_records.append((batch_code, asset_c, cat, stat, sev, cost, ward, log_date, notes))

            # Batch insert in chunks of 2,000
            if len(batch_records) >= 2000:
                cur.executemany("""
                    INSERT INTO benchmark_records (
                        batch_code, asset_code, category, status, severity,
                        repair_cost, ward_number, logged_date, notes
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, batch_records)
                batch_records = []

        if batch_records:
            cur.executemany("""
                INSERT INTO benchmark_records (
                    batch_code, asset_code, category, status, severity,
                    repair_cost, ward_number, logged_date, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, batch_records)

        conn.commit()
        logger.info("Database seeding successfully completed!")

    except Exception as e:
        conn.rollback()
        logger.error(f"Error seeding database: {e}")
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    seed_all()
