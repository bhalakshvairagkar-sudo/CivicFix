from fastapi import APIRouter, HTTPException, status, Depends
from database import get_db_cursor
from security import hash_password, verify_password, create_access_token, get_current_user
from schemas import UserLogin, UserRegister, TokenResponse, UserProfile

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin):
    """Authenticates user credentials and generates JWT access token."""
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT u.user_id, u.email, u.password_hash, u.full_name, u.role, u.department_id, u.is_active,
                   d.name AS department_name, d.code AS department_code
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.department_id
            WHERE u.email = %s
        """, (payload.email,))
        user = cur.fetchone()

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated."
        )

    token = create_access_token(data={"sub": str(user["user_id"]), "role": user["role"]})
    user_info = {
        "user_id": user["user_id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "department_id": user["department_id"],
        "department_name": user["department_name"],
        "department_code": user["department_code"]
    }
    return {"access_token": token, "token_type": "bearer", "user": user_info}

@router.post("/register", response_model=TokenResponse)
def register(payload: UserRegister):
    """Registers a new citizen or staff account."""
    with get_db_cursor() as cur:
        # Check email uniqueness
        cur.execute("SELECT user_id FROM users WHERE email = %s", (payload.email,))
        if cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )

        pwd_hash = hash_password(payload.password)
        cur.execute("""
            INSERT INTO users (email, password_hash, full_name, role, department_id, phone)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (payload.email, pwd_hash, payload.full_name, payload.role, payload.department_id, payload.phone))
        new_id = cur.lastrowid

    token = create_access_token(data={"sub": str(new_id), "role": payload.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": new_id,
            "email": payload.email,
            "full_name": payload.full_name,
            "role": payload.role,
            "department_id": payload.department_id,
            "department_name": None,
            "department_code": None
        }
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieves current authenticated user's session profile."""
    return current_user

@router.get("/demo-users")
def get_demo_users():
    """
    Returns pre-configured demo user accounts for easy 1-click login
    during university evaluations and project demonstrations.
    """
    return [
        {
            "role": "ADMIN",
            "name": "Marcus Vance",
            "title": "Chief Municipal Engineer",
            "email": "marcus.admin@civicfix.gov",
            "password": "Password123!",
            "description": "Full administrative access: Merge duplicates, approve closures, view DBMS insights."
        },
        {
            "role": "STAFF",
            "name": "Dave Rodriguez",
            "title": "Roads & Bridges Inspector",
            "email": "dave.roads@civicfix.gov",
            "password": "Password123!",
            "description": "Department access: Manage work orders, submit before/after photo inspections."
        },
        {
            "role": "STAFF",
            "name": "Elena Rostova",
            "title": "Electrical & Lighting Crew Lead",
            "email": "elena.lighting@civicfix.gov",
            "password": "Password123!",
            "description": "Department access: Track streetlight outages and electrical repairs."
        },
        {
            "role": "CITIZEN",
            "name": "Alice Cooper",
            "title": "Civic Resident (Ward 4)",
            "email": "alice.citizen@gmail.com",
            "password": "Password123!",
            "description": "Citizen access: Submit infrastructure damage reports, track resolution, upvote issues."
        }
    ]
