import json
from fastapi import APIRouter, HTTPException
from typing import List, Dict

from .. import schemas
from ..ai_client import call_ai_chat


router = APIRouter(prefix="/ai", tags=["ai"])


def build_system_prompt(context: dict | None) -> str:
    """Build the system prompt for the AI assistant."""
    base = (
        "You are an AI assistant embedded in the Underwriting Workbench, "
        "an insurance application used by underwriters and marketing staff at Deans & Homer.\n\n"
        "Your role:\n"
        "- Provide comprehensive, professional underwriting analysis and recommendations\n"
        "- Use provided context (agency info, contacts, property details) to give specific, actionable answers\n"
        "- Format responses with clear sections, bullet points, and professional structure\n"
        "- When analyzing properties, consider: construction type, occupancy, protection class, limits, location risks\n"
        "- When providing reports, use this structure:\n"
        "  * Executive Summary\n"
        "  * Detailed Analysis (organized by category)\n"
        "  * Key Considerations or Red Flags\n"
        "  * Recommendations\n"
        "- Use professional insurance terminology but explain complex concepts clearly\n"
        "- Always include a disclaimer that final underwriting decisions require human review and approval\n\n"
        "When analyzing properties, evaluate:\n"
        "- Construction adequacy (frame=higher risk, masonry/concrete=lower risk)\n"
        "- Age and condition (older buildings may have outdated systems)\n"
        "- Protection (sprinklers, alarm systems, fire department proximity)\n"
        "- Occupancy hazards (manufacturing/storage=higher risk, office=lower risk)\n"
        "- Limit adequacy vs. replacement cost\n"
        "- Deductible appropriateness for risk profile"
    )
    
    if context:
        # Check if this is a property analysis with details
        if context.get("propertyDetails"):
            prop = context["propertyDetails"]
            base += f"\n\n📋 PROPERTY DETAILS PROVIDED:\n"
            for key, value in prop.items():
                if value:
                    base += f"- {key.replace('_', ' ').title()}: {value}\n"
        else:
            context_str = json.dumps(context, indent=2)
            base += f"\n\nContext:\n{context_str}"
    
    return base


def build_user_message(message: str, context: dict | None) -> str:
    """Build the user message, optionally mentioning context."""
    if context:
        # Light mention that context is available
        return f"{message}\n\n(Context has been provided to you in the system message)"
    return message


@router.post("/chat", response_model=schemas.AIChatResponse)
async def ai_chat(request: schemas.AIChatRequest):
    """
    AI chat endpoint.
    
    Request:
        - message: User's question
        - context: Optional dict with current app context (agency, contact, etc.)
        - history: Optional list of prior messages [{"role": "user/assistant", "content": "..."}]
    
    Response:
        - answer: AI's response
        - used_context: The context dict that was sent (for debugging/transparency)
        - error: Error message if something failed
    """
    try:
        # Build message list for the AI
        messages: List[Dict[str, str]] = []
        
        # 1. System prompt (with context if provided)
        system_prompt = build_system_prompt(request.context)
        messages.append({"role": "system", "content": system_prompt})
        
        # 2. History (if provided)
        if request.history:
            for turn in request.history:
                if "role" in turn and "content" in turn:
                    messages.append({
                        "role": turn["role"],
                        "content": turn["content"]
                    })
        
        # 3. Current user message
        user_message = build_user_message(request.message, request.context)
        messages.append({"role": "user", "content": user_message})
        
        # Call AI
        answer = await call_ai_chat(messages, temperature=0.7)
        
        return schemas.AIChatResponse(
            answer=answer,
            used_context=request.context,
            error=None
        )
        
    except ValueError as e:
        # Configuration error (e.g., missing API key)
        return schemas.AIChatResponse(
            answer="",
            used_context=None,
            error=f"Configuration error: {str(e)}"
        )
    except Exception as e:
        # Other errors
        return schemas.AIChatResponse(
            answer="",
            used_context=None,
            error=f"AI service error: {str(e)}"
        )

