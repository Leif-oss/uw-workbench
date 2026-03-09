from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import re

from ..database import get_db
from .. import models, schemas, crud
from ..auth.proxy_headers import (
    get_current_user,
    require_authenticated,
)

router = APIRouter(prefix="/email-templates", tags=["email-templates"])


def replace_template_variables(
    text: str,
    contact: Optional[models.Contact] = None,
    agency: Optional[models.Agency] = None,
    underwriter: Optional[models.Employee] = None,
) -> str:
    """Replace template variables in text with actual values."""
    replacements = {}
    
    if contact:
        replacements["{contact_name}"] = contact.name or ""
        replacements["{contact_title}"] = contact.title or ""
        replacements["{contact_email}"] = contact.email or ""
        replacements["{contact_phone}"] = contact.phone or ""
    
    if agency:
        replacements["{agency_name}"] = agency.name or ""
        replacements["{agency_code}"] = agency.code or ""
        replacements["{agency_dba}"] = agency.dba or ""
    
    if underwriter:
        replacements["{underwriter_name}"] = underwriter.name or ""
        replacements["{underwriter_email}"] = underwriter.email or ""
    
    result = text
    for placeholder, value in replacements.items():
        result = result.replace(placeholder, value)
    
    # Replace any remaining placeholders with empty string
    result = re.sub(r"\{[^}]+\}", "", result)
    
    return result


@router.get("", response_model=List[schemas.EmailTemplate])
def get_email_templates(
    category: Optional[str] = None,
    request: Request = None,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get email templates. Returns system templates and user's own templates."""
    require_authenticated(user)
    
    employee_id = user.get("employee_id")
    templates = crud.get_email_templates(db, category=category, employee_id=employee_id)
    return templates


@router.get("/{template_id}", response_model=schemas.EmailTemplate)
def get_email_template(
    template_id: int,
    request: Request = None,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific email template."""
    require_authenticated(user)
    
    template = crud.get_email_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")
    
    # Check access: system templates or user's own templates
    employee_id = user.get("employee_id")
    if not template.is_system_template and template.created_by_employee_id != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return template


@router.post("", response_model=schemas.EmailTemplate, status_code=201)
def create_email_template(
    template: schemas.EmailTemplateCreate,
    is_system_template: bool = False,
    request: Request = None,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new email template. Only admins can create system templates."""
    require_authenticated(user)
    
    # Only admins can create system templates (check groups list)
    if is_system_template and "admin" not in user.get("groups", []):
        raise HTTPException(status_code=403, detail="Only admins can create system templates")
    
    employee_id = user.get("employee_id") if not is_system_template else None
    new_template = crud.create_email_template(db, template, employee_id=employee_id, is_system_template=is_system_template)
    return new_template


@router.put("/{template_id}", response_model=schemas.EmailTemplate)
def update_email_template(
    template_id: int,
    payload: schemas.EmailTemplateUpdate,
    request: Request = None,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an email template. Admins can update system templates, users can only update their own."""
    require_authenticated(user)
    
    template = crud.get_email_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")
    
    is_admin = "admin" in user.get("groups", [])
    
    # Check if trying to change is_system_template
    update_data = payload.model_dump(exclude_unset=True)
    changing_to_system = "is_system_template" in update_data and update_data.get("is_system_template") is True
    changing_from_system = "is_system_template" in update_data and update_data.get("is_system_template") is False
    
    # Only admins can change the system template flag
    if "is_system_template" in update_data and not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can change system template status")
    
    # Admins can update system templates, regular users cannot
    if template.is_system_template and not is_admin:
        raise HTTPException(status_code=403, detail="System templates can only be modified by admins")
    
    # Regular users can only update their own templates
    if not template.is_system_template and not changing_to_system:
        employee_id = user.get("employee_id")
        if template.created_by_employee_id != employee_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Update the template using CRUD (which handles schema fields)
    updated = crud.update_email_template(db, template_id, payload)
    
    # Handle created_by_employee_id changes separately (not in schema, so update directly)
    if changing_to_system and is_admin:
        updated.created_by_employee_id = None
        db.commit()
        db.refresh(updated)
    elif changing_from_system and is_admin:
        updated.created_by_employee_id = user.get("employee_id")
        db.commit()
        db.refresh(updated)
    
    return updated


@router.delete("/{template_id}", status_code=204)
def delete_email_template(
    template_id: int,
    request: Request = None,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an email template. Admins can delete system templates, users can only delete their own."""
    require_authenticated(user)
    
    template = crud.get_email_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")
    
    is_admin = "admin" in user.get("groups", [])
    
    # Admins can delete system templates, regular users cannot
    if template.is_system_template and not is_admin:
        raise HTTPException(status_code=403, detail="System templates can only be deleted by admins")
    
    # Regular users can only delete their own templates
    if not template.is_system_template:
        employee_id = user.get("employee_id")
        if template.created_by_employee_id != employee_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # For system templates, allow deletion by admins (bypass the crud check)
    if template.is_system_template and is_admin:
        db.delete(template)
        db.commit()
        return None
    
    deleted = crud.delete_email_template(db, template_id)
    if not deleted:
        raise HTTPException(status_code=403, detail="Template cannot be deleted")
    
    return None


@router.post("/preview", response_model=schemas.EmailTemplatePreviewResponse)
def preview_email_template(
    preview: schemas.EmailTemplatePreview,
    request: Request = None,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Preview an email template with variable replacement."""
    require_authenticated(user)
    
    template = crud.get_email_template(db, preview.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")
    
    # Check access
    employee_id = user.get("employee_id")
    if not template.is_system_template and template.created_by_employee_id != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Load related data for variable replacement
    contact = None
    agency = None
    underwriter = None
    
    if preview.contact_id:
        contact = crud.get_contact(db, preview.contact_id)
        if contact and contact.agency_id:
            agency = db.get(models.Agency, contact.agency_id)
    
    if preview.agency_id:
        agency = db.get(models.Agency, preview.agency_id)
    
    if employee_id:
        underwriter = db.get(models.Employee, employee_id)
    
    # Replace variables
    subject = replace_template_variables(template.subject, contact, agency, underwriter)
    body = replace_template_variables(template.body, contact, agency, underwriter)
    
    return schemas.EmailTemplatePreviewResponse(subject=subject, body=body)
