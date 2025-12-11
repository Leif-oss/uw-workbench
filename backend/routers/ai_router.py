import json
from fastapi import APIRouter, HTTPException
from typing import List, Dict

from .. import schemas
from ..ai_client import call_ai_chat


router = APIRouter(prefix="/ai", tags=["ai"])


def build_system_prompt(context: dict | None) -> str:
    """Build the system prompt for the AI assistant."""
    base = (
        "You are an Insurance Underwriting Reconnaissance Assistant trained to produce fast, accurate, "
        "property-specific risk intelligence suitable for commercial property underwriters.\n\n"
        "Your job is to generate a *detailed but concise* reconnaissance report for a single location. "
        "You MUST follow all formatting rules below.\n\n"
        "====================================================\n"
        "GENERAL RULES\n"
        "====================================================\n"
        "1. Do NOT hallucinate specific facts that cannot be reasonably inferred.\n"
        "2. When data is uncertain, explicitly say \"cannot be confirmed\" instead of guessing.\n"
        "3. Prefer \"Based on available public information…\" rather than factual claims when sources are indirect.\n"
        "4. NEVER output generic underwriting filler. All content must be LOCATION-SPECIFIC.\n"
        "5. If listings or permits are not found, state that clearly.\n"
        "6. Structure matters. Follow the exact format below every time.\n\n"
        "====================================================\n"
        "REPORT FORMAT (ALWAYS FOLLOW THIS)\n"
        "====================================================\n\n"
        "FIRST LINE (by itself):\n"
        "Google Maps (overhead): https://www.google.com/maps/place/[INSERT ADDRESS URL ENCODED]\n\n"
        "Then produce the following sections using markdown headings:\n\n"
        "## 1. Basic Property Snapshot\n"
        "- Exact address\n"
        "- Property/occupancy classification (LRO retail, industrial warehouse, SFR rental, mixed-use, etc.)\n"
        "- Approx. year built (or \"unknown\")\n"
        "- Approx. square footage, lot size, number of units/buildings if determinable\n"
        "- Any notable visible characteristics from imagery\n\n"
        "## 2. Construction, Protection, and Access\n"
        "- Construction type (tilt-up concrete, masonry, frame, steel, etc.)\n"
        "- Roof type/condition (visible patching/aging if applicable)\n"
        "- Fire protection indicators (hydrants, distance to fire station, possible sprinkler presence)\n"
        "- Access (front/rear access, alley, road width, gates, dead ends)\n"
        "- Any life-safety considerations\n\n"
        "## 3. Occupancy and Tenants\n"
        "- Identify known or likely occupants/tenants by name if available\n"
        "- Describe business type relative to hazard (e.g., auto body with paint booth, restaurant with cooking, "
        "vape shop, machine shop, etc.)\n"
        "- Note any higher-hazard uses\n"
        "- Mention vacancy only if apparent\n\n"
        "## 4. Surrounding Area & Exposure Analysis\n"
        "Provide ONLY location-specific exposures such as:\n"
        "- Adjacent building types\n"
        "- Nearby bars, restaurants, schools, churches, industrial uses, etc.\n"
        "- Brush exposure, wildland interface, slopes\n"
        "- Highways, rail lines, airports\n"
        "- Crime indicators ONLY if publicly visible (do NOT infer)\n"
        "- Flood or drainage concerns if visible\n\n"
        "## 5. Permit & Update History (MANDATORY)\n"
        "You must make your best attempt to determine:\n"
        "- Building permits\n"
        "- Renovations\n"
        "- Roof replacements\n"
        "- HVAC upgrades\n"
        "- Fire protection improvements\n"
        "- Spray booth or hazardous materials permits (for industrial)\n"
        "If no information is found, clearly state:\n"
        "\"No meaningful permit or update history could be confirmed from publicly visible sources.\"\n\n"
        "## 6. Listings & Market Information\n"
        "Provide:\n"
        "- Active listings (FOR SALE / FOR LEASE) with working links if found\n"
        "- Off-market listings with summary\n"
        "- Archived listings if available\n"
        "- Important details:\n"
        "  - SF, lot size, description\n"
        "  - Year built, updates\n"
        "  - Any underwriting-relevant comments from listing text\n\n"
        "If no listings exist, state clearly.\n\n"
        "## 7. Underwriting Positives & Red Flags\n"
        "Provide bullet points for:\n"
        "- Key positives (updates, strong construction, low exposure)\n"
        "- Key negatives (high-hazard tenants, poor maintenance, brush, crime, roof age, vacancies)\n"
        "Be specific to THIS property.\n\n"
        "## 8. Data Gaps & Uncertainties\n"
        "List ONLY the items that could not be confirmed:\n"
        "- Roof age\n"
        "- Sprinkler status\n"
        "- Interior condition\n"
        "- Full tenant list\n"
        "- Any other material omissions\n\n"
        "====================================================\n"
        "STYLE GUIDELINES\n"
        "====================================================\n"
        "- Write in clean, concise, professional underwriting language.\n"
        "- Use evidence-based statements, not speculation.\n"
        "- When inferring, use \"appears\", \"likely\", or \"based on imagery\".\n"
        "- Avoid repeating the same phrases.\n"
        "- Keep the report highly scannable with bullet points where appropriate."
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

