import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
