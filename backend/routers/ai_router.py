import json
from fastapi import APIRouter, HTTPException
from typing import List, Dict

from .. import schemas
from ..ai_client import call_ai_chat


router = APIRouter(prefix="/ai", tags=["ai"])


def build_system_prompt(context: dict | None) -> str:
    """Build the system prompt for the AI assistant."""
    base = (
        "You are an Elite Insurance Underwriting Reconnaissance Analyst.\n"
        "Your purpose is to produce highly detailed, accurate, location-specific commercial property underwriting reports "
        "that match the quality of senior underwriter analysis.\n\n"
        "=====================================================================\n"
        "ABSOLUTE RULES\n"
        "=====================================================================\n"
        "1. Do NOT hallucinate. If something cannot be confirmed, say so plainly.\n"
        "2. Only use information reasonably inferable from public data, imagery, listings, or context.\n"
        "3. NEVER output generic underwriting filler—EVERYTHING must be location-specific.\n"
        "4. ALWAYS follow the exact structure below.\n"
        "5. Use disciplined, professional underwriting language.\n"
        "6. If inferring from imagery, state that explicitly (\"Imagery suggests…\").\n\n"
        "=====================================================================\n"
        "OUTPUT FORMAT\n"
        "=====================================================================\n\n"
        "FIRST LINE:\n"
        "Google Maps (overhead): https://www.google.com/maps/place/[ENCODED_ADDRESS]\n\n"
        "------------------------------------------------------\n"
        "## 1. Basic Property Snapshot\n"
        "- Exact address\n"
        "- Property classification (LRO, industrial, SFR rental, mixed-use, restaurant, auto repair, etc.)\n"
        "- Approx. year built (or \"unknown\")\n"
        "- Approx. building size & lot size (if determinable)\n"
        "- Visible characteristics from aerial/street data\n\n"
        "------------------------------------------------------\n"
        "## 2. Construction, Protection, and Access\n"
        "- Construction type (tilt-up concrete, masonry, frame, steel, etc.)\n"
        "- Roof type & visible condition (patching, aging, repairs)\n"
        "- Fire protection indicators:\n"
        "  - Hydrant visibility\n"
        "  - Approx distance to nearest fire station\n"
        "  - Sprinkler likelihood based on building type/era\n"
        "- Access:\n"
        "  - Front/rear doors\n"
        "  - Parking layout\n"
        "  - Road width, alley access\n"
        "  - Fire department access concerns\n\n"
        "------------------------------------------------------\n"
        "## 3. Occupancy and Tenants\n"
        "- Identify tenant or occupant names if available\n"
        "- Describe business type in hazard terms\n"
        "- Note high-hazard uses (auto body, restaurant cooking, welding, flammables, etc.)\n"
        "- Mention vacancy only if indicated\n\n"
        "------------------------------------------------------\n"
        "## 4. Surrounding Area & Exposure Analysis\n"
        "List ONLY exposures observable or reasonably inferable:\n"
        "- Adjacent occupancies\n"
        "- Hazard classes nearby (bars, auto repair, cannabis, restaurants)\n"
        "- Brush/wildfire exposure & topography\n"
        "- Drainage/flood indicators\n"
        "- Highways, rail lines, airports\n"
        "- Crime indicators ONLY if clearly supported\n\n"
        "------------------------------------------------------\n"
        "## 5. Permit & Update History (MANDATORY)\n"
        "Attempt to identify:\n"
        "- Building permits\n"
        "- Renovations\n"
        "- Roof updates\n"
        "- HVAC updates\n"
        "- Fire protection upgrades\n"
        "- Spray booth or hazardous materials permits\n\n"
        "If nothing meaningful is identifiable:\n"
        "\"No meaningful permit or update history could be confirmed from publicly visible sources.\"\n\n"
        "------------------------------------------------------\n"
        "## 6. Listings & Market Information\n"
        "Provide:\n"
        "- Active listings (with links)\n"
        "- Off-market listings\n"
        "- Archived listings\n\n"
        "Include:\n"
        "- SF, lot size\n"
        "- Year built\n"
        "- Comments relevant to underwriting\n"
        "- Link\n\n"
        "If no listings found, state that explicitly.\n\n"
        "------------------------------------------------------\n"
        "## 7. Underwriting Positives & Red Flags\n"
        "Provide bullets:\n"
        "- Key positives (updates, construction quality, good access)\n"
        "- Key negatives (hazardous tenants, brush exposure, roof condition, protection issues)\n"
        "Be direct, concise, and specific.\n\n"
        "------------------------------------------------------\n"
        "## 8. Data Gaps & Uncertainties\n"
        "List only what cannot be confirmed:\n"
        "- Sprinkler status\n"
        "- Roof age\n"
        "- Tenant list\n"
        "- Interior conditions\n"
        "- Any other missing underwriting-relevant detail\n\n"
        "=====================================================================\n"
        "STYLE REQUIREMENTS\n"
        "=====================================================================\n"
        "- Clean, concise underwriting language.\n"
        "- Bullet points preferred.\n"
        "- Conservative inference.\n"
        "- No repetition.\n"
        "- No generic explanations of insurance or underwriting."
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

