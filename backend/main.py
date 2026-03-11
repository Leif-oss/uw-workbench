import logging
import os
import traceback
from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from . import models  # noqa: F401
from .routers import offices, employees, agencies, contacts, logs, tasks, production, admin, document_scrubber, ai_router, auth, users, drafts, as400, email_templates, renewals, new_business

logger = logging.getLogger("uvicorn.error")

# Application version (updated for deployment)
APP_VERSION = "1.0.1"

# Load CORS origins from environment variable
# Default to localhost for development, but must be set for production
CORS_ORIGINS_STR = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_STR.split(",") if origin.strip()]

# Database schema is managed by Alembic migrations only
# DO NOT use Base.metadata.create_all() - this bypasses migration history
# Run 'alembic upgrade head' to apply migrations

# NO AUTO-CREATION OF DATA
# All data (offices, users, employees, etc.) must be created manually or via seed scripts
# Use backend/scripts/seed_data.py for initial data setup
logger.info("Database connection established. Schema managed by Alembic migrations.")

# Startup DNS test for SMTP (diagnostic)
try:
    import socket
    test_host = "smtp.gmail.com"
    try:
        socket.getaddrinfo(test_host, 587)
        logger.info(f"[SMTP DIAG] DNS resolution for {test_host}: SUCCESS")
    except socket.gaierror as e:
        logger.warning(f"[SMTP DIAG] DNS resolution for {test_host}: FAILED - {e}")
except Exception as e:
    logger.warning(f"[SMTP DIAG] Startup DNS test error: {e}")

app = FastAPI(title="Underwriter Workbench API")

# Handle OPTIONS requests globally for CORS preflight
@app.options("/{full_path:path}")
async def options_handler(full_path: str, request: Request):
    """Handle OPTIONS preflight requests for all routes."""
    origin = request.headers.get("origin")
    headers = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "3600",
    }
    # Always allow the origin if it's in CORS_ORIGINS, or allow all in development
    if not CORS_ORIGINS or "*" in CORS_ORIGINS or origin in CORS_ORIGINS:
        if origin:
            headers["Access-Control-Allow-Origin"] = origin
        else:
            headers["Access-Control-Allow-Origin"] = "*"
    elif origin:
        # Still allow the request but with specific origin if provided
        headers["Access-Control-Allow-Origin"] = origin
    from fastapi import Response
    return Response(status_code=200, headers=headers)

# CORS middleware - must be added before routers
# In development, be more permissive with CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["*"],  # Allow all if no origins specified
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods including OPTIONS
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight for 1 hour
)

# Add CORS headers to all responses, including errors
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    origin = request.headers.get("origin")
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
    
    try:
        response = await call_next(request)
    except Exception as e:
        # Log full error details server-side only
        logger.error("Unhandled exception: %s", exc_info=True)
        
        # Never expose stack traces in production - return generic error
        if is_production:
            error_msg = "An internal server error occurred"
        else:
            # In development, include error message but not full stack trace
            error_msg = f"Error: {str(e)}"
        
        if origin in CORS_ORIGINS:
            response = JSONResponse(
                status_code=500,
                content={"detail": error_msg},
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        else:
            raise
    
    # Always add CORS headers to the response
    if origin in CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

# Exception handler to add CORS headers to error responses
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    origin = request.headers.get("origin")
    
    headers = {}
    if origin in CORS_ORIGINS:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    
    # Truncate very long error messages
    detail = exc.detail
    if isinstance(detail, str) and len(detail) > 500:
        detail = detail[:500] + "..."
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail},
        headers=headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    origin = request.headers.get("origin")
    
    headers = {}
    if origin in CORS_ORIGINS:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    
    # Format validation errors for better user experience
    errors = exc.errors()
    formatted_errors = []
    
    for error in errors:
        # Check if this is an email validation error
        # EmailStr validation errors have type "value_error" and location includes "email"
        error_type = error.get("type", "")
        error_loc = error.get("loc", [])
        error_msg = str(error.get("msg", "")).lower()
        
        # Check if this is an email field with a validation error
        is_email_field = any("email" in str(loc).lower() for loc in error_loc)
        is_email_validation = (
            "email" in error_msg or 
            "@" in error_msg or 
            "value is not a valid email" in error_msg or
            error_type == "value_error.email"
        )
        
        if is_email_field and is_email_validation:
            formatted_errors.append({
                "type": error.get("type"),
                "loc": error.get("loc"),
                "msg": "Email is in incorrect format",
                "input": error.get("input"),
            })
        else:
            formatted_errors.append(error)
    
    return JSONResponse(
        status_code=422,
        content={"detail": formatted_errors},
        headers=headers
    )

# Validate required environment variables on startup
def validate_environment():
    """Validate required environment variables and log warnings for missing optional ones."""
    required_vars = []  # Add required vars here if needed in future
    optional_vars = {
        "CORS_ORIGINS": "CORS_ORIGINS not set, using default localhost origins",
        "AI_API_KEY": "AI_API_KEY not set - AI features will not work",
        "DATABASE_URL": "DATABASE_URL must be set (PostgreSQL required)",
    }
    
    missing_required = [var for var in required_vars if not os.getenv(var)]
    if missing_required:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_required)}")
    
    for var, message in optional_vars.items():
        if not os.getenv(var):
            logger.warning(message)

# Validate environment on startup
try:
    validate_environment()
except ValueError as e:
    logger.error("Environment validation failed: %s", e)
    raise

app.include_router(auth.router)
app.include_router(offices.router)
app.include_router(employees.router)
app.include_router(agencies.router)
app.include_router(contacts.router)
app.include_router(logs.router)
app.include_router(tasks.router)
app.include_router(production.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(document_scrubber.router)
app.include_router(ai_router.router)
app.include_router(drafts.router)
app.include_router(as400.router)
app.include_router(email_templates.router)
app.include_router(renewals.router)
app.include_router(new_business.router)



@app.on_event("startup")
async def startup_event():
    """
    Application startup event.
    Note: Migrations are run in the Docker startup script before this event fires.
    This ensures migrations complete before the app starts serving requests.
    """
    logger.info("Application startup complete")


@app.get("/")
def root():
    return {"status": "ok", "message": "Underwriter Workbench API"}


@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "reachable"}
    except SQLAlchemyError as exc:
        logger.error("DB health check failed: %s", exc)
        return {"status": "error", "db": "unreachable", "detail": str(exc)}


@app.get("/_diag/network")
def network_diagnostics():
    """
    TEMPORARY: Network diagnostics endpoint for debugging SMTP connectivity.
    Tests DNS resolution and TCP connectivity to SMTP servers.
    """
    import socket
    import platform
    from datetime import datetime
    
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "hostname": socket.gethostname(),
        "platform": platform.system(),
        "dns_tests": {},
        "tcp_tests": {},
        "resolver_info": {},
        "runtime_hints": {}
    }
    
    # DNS resolution tests
    dns_hosts = ["smtp.gmail.com", "www.google.com"]
    for host in dns_hosts:
        try:
            addrinfo = socket.getaddrinfo(host, None)
            results["dns_tests"][host] = {
                "success": True,
                "addresses": [str(addr[4][0]) for addr in addrinfo[:3]],  # First 3 IPs
                "error": None
            }
        except socket.gaierror as e:
            results["dns_tests"][host] = {
                "success": False,
                "addresses": [],
                "error": str(e)
            }
        except Exception as e:
            results["dns_tests"][host] = {
                "success": False,
                "addresses": [],
                "error": f"Unexpected error: {type(e).__name__}: {str(e)}"
            }
    
    # TCP connectivity tests (no SMTP auth, just connect)
    tcp_targets = [
        ("smtp.gmail.com", 587),
        ("smtp.gmail.com", 465)
    ]
    for host, port in tcp_targets:
        test_key = f"{host}:{port}"
        try:
            sock = socket.create_connection((host, port), timeout=5)
            sock.close()
            results["tcp_tests"][test_key] = {
                "success": True,
                "error": None
            }
        except socket.gaierror as e:
            results["tcp_tests"][test_key] = {
                "success": False,
                "error": f"DNS resolution failed: {str(e)}"
            }
        except (socket.timeout, TimeoutError) as e:
            results["tcp_tests"][test_key] = {
                "success": False,
                "error": f"Connection timeout: {str(e)}"
            }
        except ConnectionRefusedError as e:
            results["tcp_tests"][test_key] = {
                "success": False,
                "error": f"Connection refused: {str(e)}"
            }
        except OSError as e:
            results["tcp_tests"][test_key] = {
                "success": False,
                "error": f"OS error: {str(e)}"
            }
        except Exception as e:
            results["tcp_tests"][test_key] = {
                "success": False,
                "error": f"Unexpected error: {type(e).__name__}: {str(e)}"
            }
    
    # Resolver info (/etc/resolv.conf)
    try:
        resolv_path = "/etc/resolv.conf"
        if os.path.exists(resolv_path):
            with open(resolv_path, "r") as f:
                lines = [line.strip() for line in f.readlines() if line.strip() and not line.strip().startswith("#")]
                results["resolver_info"]["resolv_conf"] = lines
        else:
            results["resolver_info"]["resolv_conf"] = "File not found (Windows?)"
    except Exception as e:
        results["resolver_info"]["resolv_conf"] = f"Error reading: {str(e)}"
    
    # Runtime hints
    vpc_connector = os.getenv("VPC_CONNECTOR", "")
    vpc_egress = os.getenv("VPC_EGRESS_SETTINGS", "")
    results["runtime_hints"] = {
        "vpc_connector_env": vpc_connector if vpc_connector else "Not set",
        "vpc_egress_settings": vpc_egress if vpc_egress else "Not set",
        "has_vpc_connector": bool(vpc_connector),
        "current_time": datetime.utcnow().isoformat()
    }
    
    return results
