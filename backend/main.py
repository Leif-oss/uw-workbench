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
from .routers import offices, employees, agencies, contacts, logs, tasks, production, admin, document_scrubber, ai_router

logger = logging.getLogger("uvicorn.error")

# Ensure tables exist on startup (alembic should manage schema in prod, but keep for dev)
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured.")
except Exception as exc:  # noqa: BLE001
    logger.error("Failed to create tables: %s", exc)

app = FastAPI(title="Underwriter Workbench API")

# CORS middleware - must be added before routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods including PATCH
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add CORS headers to all responses, including errors
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    origin = request.headers.get("origin")
    allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    try:
        response = await call_next(request)
    except Exception as e:
        # If an exception occurs, create a response with CORS headers
        import traceback
        error_msg = str(e)
        if os.getenv("ENVIRONMENT", "development").lower() == "development":
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
        if origin in allowed_origins:
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
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

# Exception handler to add CORS headers to error responses
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    origin = request.headers.get("origin")
    allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    headers = {}
    if origin in allowed_origins:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    
    # In development, include full error details
    detail = exc.detail
    if isinstance(detail, str) and len(detail) > 500:
        # Truncate very long errors
        detail = detail[:500] + "..."
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail},
        headers=headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    origin = request.headers.get("origin")
    allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    headers = {}
    if origin in allowed_origins:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers=headers
    )

app.include_router(offices.router)
app.include_router(employees.router)
app.include_router(agencies.router)
app.include_router(contacts.router)
app.include_router(logs.router)
app.include_router(tasks.router)
app.include_router(production.router)
app.include_router(admin.router)
app.include_router(document_scrubber.router)
app.include_router(ai_router.router)


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
