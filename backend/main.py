import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import ping_database

from routers.auth import router as auth_router
from routers.reports import router as reports_router
from routers.cases import router as cases_router
from routers.assets import router as assets_router
from routers.work_orders import router as work_orders_router
from routers.inspections import router as inspections_router
from routers.analytics import router as analytics_router
from routers.audit import router as audit_router
from routers.dbms_insights import router as dbms_insights_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("civicfix")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing CivicFix - Infrastructure Monitoring & Repair Intelligence System...")
    health = ping_database()
    logger.info(f"Database Connection Status: {health}")
    yield
    logger.info("Shutting down CivicFix Backend...")

app = FastAPI(
    title="CivicFix — Infrastructure Monitoring & Repair Intelligence System",
    description="Backend API for urban infrastructure defect monitoring, duplicate detection, risk prioritization, and repair verification.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(reports_router)
app.include_router(cases_router)
app.include_router(assets_router)
app.include_router(work_orders_router)
app.include_router(inspections_router)
app.include_router(analytics_router)
app.include_router(audit_router)
app.include_router(dbms_insights_router)

@app.get("/api/health")
def health_check():
    """Health check endpoint verifying backend and database connectivity."""
    db_status = ping_database()
    return {
        "status": "healthy" if db_status.get("status") == "connected" else "degraded",
        "app": "CivicFix Backend",
        "database": db_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
