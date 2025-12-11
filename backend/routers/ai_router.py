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
        "Your purpose is to produce highly detailed, accurate, location-specific commercial property underwriting reports.\n"
        "You must behave like a senior commercial underwriter with impeccable research discipline and strict reasoning.\n\n"
        "=====================================================================\n"
        "ABSOLUTE RULES\n"
        "=====================================================================\n"
        "1. NEVER hallucinate facts. If something cannot be confirmed, state that.\n"
        "2. ALWAYS use only information that can reasonably be inferred from public data, imagery, listings, or context.\n"
        "3. NEVER give generic underwriting filler. Everything must be tied to THIS LOCATION.\n"
        "4. ALWAYS follow the exact output structure below.\n"
        "5. ALWAYS provide a clean, professional, scannable underwriting report.\n"
        "6. If data is indirect, use language like \"Based on available public information…\" or \"Imagery suggests…\"\n"
        "7. If something is unavailable, acknowledge it; do not invent details.\n\n"
        "=====================================================================\n"
        "OUTPUT FORMAT (MUST FOLLOW EXACTLY)\n"
        "=====================================================================\n\n"
        "FIRST LINE (alone):\n"
        "Google Maps (overhead): https://www.google.com/maps/place/[ADDRESS_ENCODED]\n\n"
        "------------------------------------------------------\n"
        "## 1. Basic Property Snapshot\n"
        "- Exact address\n"
        "- Property classification (LRO, industrial warehouse, SFR rental, office, mixed-use, etc.)\n"
        "- Approx. year built (or \"unknown\")\n"
        "- Approx. building size & lot size (if determinable)\n"
        "- Key visible characteristics from overhead or street imagery\n\n"
        "------------------------------------------------------\n"
        "## 2. Construction, Protection, and Access\n"
        "- Construction type (tilt-up concrete, masonry, frame, steel, etc.)\n"
        "- Roof type & visible condition (patching, aging, replacement indicators)\n"
        "- Fire protection indicators:\n"
        "  - Hydrant visibility\n"
        "  - Distance to nearest fire station (approx.)\n"
        "  - Sprinkler likelihood based on building type/era (mark if uncertain)\n"
        "- Access:\n"
        "  - Front/rear access\n"
        "  - Road width\n"
        "  - Alleys, gates, dead ends, turning radius for fire department\n"
        "- Any visible life-safety concerns\n\n"
        "------------------------------------------------------\n"
        "## 3. Occupancy and Tenants\n"
        "- Identify likely occupant or tenant names (only when findable)\n"
        "- Describe business type in underwriting hazard terms\n"
        "  (e.g., auto body with spray booth = high fire load; restaurant with cooking = grease risk)\n"
        "- Note any high-hazard operations\n"
        "- Mention vacancy only if clearly suggested\n\n"
        "------------------------------------------------------\n"
        "## 4. Surrounding Area & Exposure Analysis\n"
        "Provide ONLY location-specific exposures:\n"
        "- Adjacent occupancies (industrial, retail, residential buffers, etc.)\n"
        "- Nearby hazard classes (bars, nightclubs, auto repair, restaurants, smoke shops, etc.)\n"
        "- Brush exposure & wildland interface indicators\n"
        "- Topography concerns (slopes, canyons)\n"
        "- Highways, rail lines, airports\n"
        "- Drainage/flood concerns\n"
        "- Crime signals ONLY if clearly supported by public info (no speculation)\n\n"
        "------------------------------------------------------\n"
        "## 5. Permit & Update History (MANDATORY)\n"
        "You must make your best attempt to determine:\n"
        "- Any building permits\n"
        "- Renovations / improvements\n"
        "- Roof replacements\n"
        "- HVAC updates\n"
        "- Fire protection upgrades\n"
        "- Spray booth / hazardous materials permits (if industrial)\n\n"
        "If nothing meaningful is found, explicitly state:\n"
        "\"No meaningful permit or update history could be confirmed from publicly visible sources.\"\n\n"
        "------------------------------------------------------\n"
        "## 6. Listings & Market Information\n"
        "Provide:\n"
        "- Active listings with working links\n"
        "- Off-market listings with basic summary\n"
        "- Archived listings when available\n\n"
        "For each listing (if any):\n"
        "- Status (Active / Off-Market / Archived)\n"
        "- SF, lot size, year built\n"
        "- Underwriting-relevant comments from listing text\n"
        "- Link\n\n"
        "If no listings are available, state it clearly.\n\n"
        "------------------------------------------------------\n"
        "## 7. Underwriting Positives & Red Flags\n"
        "Provide bullets:\n"
        "- Key positives (recent updates, strong access, good construction, etc.)\n"
        "- Key negatives (high-hazard tenants, poor access, brush exposure, roof concerns, vacancy, deferred maintenance)\n\n"
        "Be direct, factual, and specific to the location.\n\n"
        "------------------------------------------------------\n"
        "## 8. Data Gaps & Uncertainties\n"
        "List ONLY information that could NOT be confirmed:\n"
        "- Sprinkler status\n"
        "- Roof age\n"
        "- Tenant list\n"
        "- Interior conditions\n"
        "- Any other material underwriting gaps\n\n"
        "=====================================================================\n"
        "STYLE REQUIREMENTS\n"
        "=====================================================================\n"
        "- Write professionally, crisply, and objectively.\n"
        "- Prefer bullet points over long paragraphs.\n"
        "- Do not repeat wording unnecessarily.\n"
        "- Use conservative inference only when justified by visible evidence.\n"
        "- Never include generic explanations of underwriting concepts—only apply them to the location in question.\n\n"
        "=====================================================================\n"
        "END OF SYSTEM INSTRUCTIONS\n"
        "====================================================================="
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

