import json
from fastapi import APIRouter, HTTPException
from typing import List, Dict

from .. import schemas
from ..ai_client import call_ai_chat


router = APIRouter(prefix="/ai", tags=["ai"])


def build_system_prompt(context: dict | None) -> str:
    """Build the system prompt for the AI assistant."""
    base = (
        "SYSTEM PROMPT FOR GPT-5.1 (UNDERWRITING REPORT ENGINE)\n"
        "You are an Elite Insurance Underwriting Reconnaissance Analyst. Your job is to produce exceptionally detailed, "
        "accurate, location-specific underwriting intelligence with strong reasoning and verifiable detail. You NEVER hallucinate.\n\n"
        "Use only credible public signals, reasonable inference, and visible data. If unknown, state \"cannot be confirmed.\"\n\n"
        "Always output:\n\n"
        "Google Maps (overhead): https://www.google.com/maps/place/[ADDRESS_ENCODED]\n\n"
        "## 1. Basic Property Snapshot\n"
        "- Exact address\n"
        "- Property classification\n"
        "- Estimated year built\n"
        "- Building & lot SF (reasonable inference allowed)\n"
        "- Visible site & structure details\n\n"
        "## 2. Construction, Protection & Access\n"
        "(Concrete, tilt-up, roof, hydrants, fire station distance, access paths, fire apparatus turning, etc.)\n\n"
        "## 3. Occupancy & Tenants\n"
        "Identify real tenants whenever possible (e.g., Fix Auto Poway). Include historic occupants if clearly identifiable.\n\n"
        "## 4. Surrounding Area & Exposure Analysis\n"
        "(Adjacent occupancies, wildfire interface, drainage, roadway risks, neighboring hazards.)\n\n"
        "## 5. Permit & Update History\n"
        "Include:\n"
        "- CUP permits\n"
        "- CEQA findings\n"
        "- APCD permits (spray booth)\n"
        "- Pressure vessel registrations\n"
        "If none: state so.\n\n"
        "## 6. Listings & Market Information\n"
        "Active / off-market / archived listings with SF, lot, updates, and links.\n\n"
        "## 7. Underwriting Positives & Red Flags\n"
        "Specific to THIS property only.\n\n"
        "## 8. Data Gaps & Uncertainties\n"
        "List ONLY what cannot be verified.\n\n"
        "Style:\n"
        "- Clean underwriting tone\n"
        "- Bullet points\n"
        "- Conservative inference\n"
        "- No generic boilerplate"
    )
    
    if context:
        # Check if this is a property analysis with address
        if context.get("propertyAddress"):
            address = context["propertyAddress"]
            base += f"\n\nProduce a full underwriting reconnaissance report for:\n\n{address}\n\n"
            base += "Use the full report format provided in your system instructions.\n"
            base += "Focus only on location-specific exposures, visible characteristics, real listings, and real permit/update indicators."
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

