"""
Seed PBOP v1 product schema into the database.
Run this script after running migrations to populate the PBOP schema.

Usage:
    python -m backend.scripts.seed_pbop_schema

This creates the PBOP v1 schema definition in the product_schemas table.
"""
import sys
from pathlib import Path
import json

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend import models


# PBOP v1 Schema Definition
PBOP_V1_SCHEMA = {
    "policy": {
        "company_number": {"type": "string", "default": "105", "required": True},
        "producer_number": {"type": "string", "required": False},
        "key_name": {"type": "string", "max_length": 15, "required": True},
        "inception_date": {"type": "string", "format": "MM/DD/YY", "required": True},
        "expiration_date": {"type": "string", "format": "MM/DD/YY", "required": True},
    },
    "agency": {
        "contact_name": {"type": "string", "required": False},
        "contact_email": {"type": "string", "format": "email", "required": False},
        "contact_phone": {"type": "string", "required": False},
        "agency_name": {"type": "string", "required": False},
    },
    "insured": {
        "full_name": {"type": "string", "required": True},
        "care_of": {"type": "string", "required": False},
        "street": {"type": "string", "required": False},
        "city": {"type": "string", "required": False},
        "state": {"type": "string", "required": False},
        "zip": {"type": "string", "required": False},
        "phone": {"type": "string", "required": False},
        "email": {"type": "string", "format": "email", "required": False},
        "contact_name": {"type": "string", "required": False},
    },
    "notes": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "source_refs": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source_id": {"type": "integer"},
                            "page": {"type": "integer"},
                            "snippet": {"type": "string"},
                        },
                    },
                },
            },
        },
        "required": False,
    },
    "locations": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "address": {
                    "type": "object",
                    "properties": {
                        "street_number": {"type": "string", "required": False},
                        "street_name": {"type": "string", "required": False},
                        "suite": {"type": "string", "required": False},
                        "city": {"type": "string", "required": False},
                        "state": {"type": "string", "required": False},
                        "zip": {"type": "string", "required": False},
                    },
                },
                "additional_insureds": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "address": {"type": "string"},
                        },
                    },
                    "required": False,
                },
                "mortgagee": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "address": {"type": "string"},
                    },
                    "required": False,
                },
                "loss_payee": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "address": {"type": "string"},
                    },
                    "required": False,
                },
                "building": {
                    "type": "object",
                    "properties": {
                        "construction_type": {
                            "type": "string",
                            "enum": ["AD", "ST", "RB", "UB", "BS", "BB", "FIR", "MFIR", "FR", "FRB", "FRS", "HCB", "IR", "PIP", "TU"],
                            "required": False,
                        },
                        "construction_year": {"type": "integer", "required": False},
                        "square_footage": {"type": "number", "required": False},
                        "sprinkler_percent": {"type": "float", "required": False},
                        "stories": {"type": "integer", "required": False},
                        "protection_class": {"type": "string", "required": False},
                    },
                },
                "coverages": {
                    "type": "object",
                    "properties": {
                        "building_limit": {"type": "number", "required": False},
                        "rents": {"type": "number", "required": False},
                        "icc_ordinance": {"type": "number", "required": False},
                        "debris_demo": {"type": "number", "required": False},
                        "eqsl_requested": {"type": "boolean", "required": False},
                        "eqsl_limit": {"type": "number", "required": False},
                        "deductible": {"type": "string", "required": False},
                    },
                },
            },
        },
        "required": False,
    },
}


def seed_pbop_schema():
    """Seed PBOP v1 schema into the database."""
    import logging
    logger = logging.getLogger(__name__)
    
    db: Session = SessionLocal()
    try:
        # Check if PBOP schema already exists
        existing = db.query(models.ProductSchema).filter(
            models.ProductSchema.product_code == "PBOP",
            models.ProductSchema.version == "v1"
        ).first()
        
        if existing:
            print(f"[INFO] PBOP v1 schema already exists (ID: {existing.id})")
            print(f"[INFO] Updating existing schema...")
            existing.schema_definition = PBOP_V1_SCHEMA
            existing.name = "Property Building & Operations Policy"
            existing.description = "Commercial property insurance policy intake schema"
            existing.is_active = True
            db.commit()
            print(f"[OK] Updated PBOP v1 schema")
        else:
            print(f"[INFO] Creating PBOP v1 schema...")
            pbop_schema = models.ProductSchema(
                product_code="PBOP",
                version="v1",
                schema_definition=PBOP_V1_SCHEMA,
                name="Property Building & Operations Policy",
                description="Commercial property insurance policy intake schema",
                is_active=True,
            )
            db.add(pbop_schema)
            db.commit()
            db.refresh(pbop_schema)
            print(f"[OK] Created PBOP v1 schema (ID: {pbop_schema.id})")
        
        print("\n[OK] PBOP v1 schema seed complete.")
        
    except Exception as e:
        print(f"[ERROR] Error seeding PBOP schema: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    
    print("=" * 60)
    print("SEEDING PBOP V1 SCHEMA")
    print("=" * 60)
    print()
    
    seed_pbop_schema()
    
    print("\n" + "=" * 60)
    print("SEED COMPLETE")
    print("=" * 60)
