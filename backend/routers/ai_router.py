import json
from fastapi import APIRouter, HTTPException
from typing import List, Dict

from .. import schemas
from ..ai_client import call_ai_chat


router = APIRouter(prefix="/ai", tags=["ai"])


def build_system_prompt(context: dict | None) -> str:
    """Build the system prompt for the AI assistant."""
    base = (
        "You are an insurance underwriting reconnaissance assistant.\n\n"
        "Your job is to generate a concise but thorough, LOCATION-SPECIFIC report for a single property/location, "
        "suitable for a commercial property underwriter reviewing a risk.\n\n"
        "You MUST follow these rules:\n\n"
        "1. Always start with a single, clear Google Maps overhead link to the exact location, on its own line, in this format:\n"
        "   Google Maps (overhead): https://www.google.com/maps/place/...\n\n"
        "2. Immediately after the Google Maps link, produce a structured underwriting report using markdown headings. "
        "Use this section order:\n\n"
        "   ## 1. Basic Property Snapshot\n"
        "   - Full address\n"
        "   - Property type / occupancy classification (e.g. single-family rental, Lessor's Risk Only retail strip, "
        "mixed-use, industrial, office, multifamily, etc.)\n"
        "   - Approx. year built (or \"unknown\" if you can't reasonably infer)\n"
        "   - Approx. size/units (SF, # units, # buildings) if findable or reasonably inferred; otherwise say \"not clearly available\".\n\n"
        "   ## 2. Construction, Protection, and Access\n"
        "   - Construction type (e.g. frame/wood, masonry, tilt-up concrete, high-rise steel, etc.)\n"
        "   - Roof type and apparent condition (include any hints of age or patching if visible or mentioned in listings)\n"
        "   - Protection: nearest fire station (approx. distance / drive time), hydrant presence if visible, "
        "sprinkler/alarm information if available\n"
        "   - Access & fire department access (road width, dead-end/cul-de-sac issues, gated access, etc.)\n\n"
        "   ## 3. Occupancy and Tenants\n"
        "   - Classify occupancy correctly: owner-occupied, tenant-occupied, Lessor's Risk Only, mixed-use, residential rental, etc.\n"
        "   - For commercial/LRP:\n"
        "     - List known tenants by name if available\n"
        "     - Briefly describe each tenant's business type (e.g. restaurant, bar, auto repair, smoke/vape, daycare, medical, office, etc.)\n"
        "     - Note any higher-hazard occupancies (restaurant with commercial cooking, auto repair, welding, cannabis, vape/smoke shop, etc.)\n\n"
        "   ## 4. Surrounding Area & Exposure Analysis\n"
        "   Describe only LOCATION-SPECIFIC exposures within the immediate area (roughly 0–1 mile), not generic boilerplate.\n"
        "   Mention things like:\n"
        "   - Neighboring occupancies (bars, nightclubs, restaurants, schools, churches, big box stores, industrial, etc.)\n"
        "   - Adjoining buildings / shared walls\n"
        "   - Parking, alleys, rear access\n"
        "   - Brush, wildland, hillside exposure, rivers/floodways, railroad tracks, major highways, airports, etc.\n"
        "   - Crime/safety signals ONLY if meaningfully apparent from reputable public info (don't guess).\n\n"
        "   ## 5. Permit & Update History\n"
        "   - Work your best to find any building permits, remodels, additions, roof replacements, HVAC, fire protection, "
        "or other construction/update history.\n"
        "   - Summarize by date, type of work, and status if available.\n"
        "   - If nothing relevant is found, say: \"No clear permit or update history found from publicly visible sources.\"\n"
        "   - Do NOT list or name the online portals or data providers you used.\n\n"
        "   ## 6. Listing & Market Info\n"
        "   - Include **Active listings**, **Off-market listings**, and **Archived/older listings** if available.\n"
        "   - For each, include:\n"
        "     - Status (Active, Off-market, Archived)\n"
        "     - Date range (if known)\n"
        "     - Basic property description (SF, units, usage)\n"
        "     - Any notable comments relevant to underwriting (updates, deferred maintenance, tenant mix, roof/HVAC updates, etc.)\n"
        "     - A working clickable link to the listing.\n"
        "   - Clearly label each listing as Active / Off-market / Archived.\n\n"
        "   ## 7. Underwriting Concerns & Positives\n"
        "   Bullet-point the key underwriting takeaways:\n"
        "   - Major red flags (high-hazard tenants, poor access, heavy crime, brush exposure, old roof, visible deterioration, vacancy, etc.)\n"
        "   - Major positives (recent updates with permits, sprinklered, strong neighboring uses, good access, etc.)\n\n"
        "   ## 8. Data Gaps & Uncertainties\n"
        "   - List the important items you could NOT confirm (e.g. exact year built, full tenant list, roof age, sprinkler status).\n"
        "   - Do NOT invent specific details when not supported by data. If you must infer, clearly label it as a reasonable inference.\n\n"
        "GENERAL STYLE GUIDELINES:\n"
        "- Be accurate, reality-based, and conservative in your statements.\n"
        "- Prefer \"Based on available imagery, it appears that…\" over strong claims when data is indirect.\n"
        "- Do NOT pad the report with generic underwriting theory; stay focused on the specific location and its real, "
        "visible or documented characteristics.\n"
        "- If something cannot be determined, plainly say so.\n"
        "- Keep the report tight and scannable; underwriters should be able to skim headings and bullets quickly."
    )
    
    if context:
        # Check if this is a property analysis with address
        if context.get("propertyAddress"):
            address = context["propertyAddress"]
            base += f"\n\n--- Generate a full underwriting reconnaissance report for the following location.\n\n"
            base += f"Address:\n{address}\n\n"
            base += "Additional context from my system (if present, you can quote or summarize it in the report):\n"
            base += "- Known occupancy type: none provided\n"
            base += "- Known tenants or occupant names: none provided\n"
            base += "- Known construction details from our internal data: none provided\n"
            base += "- Any prior underwriter comments: none provided\n\n"
            base += "Use your tools and public data sources to:\n"
            base += "- Confirm the correct property on maps and imagery.\n"
            base += "- Pull any visible listing details, tenant info, and building description.\n"
            base += "- Look for any useful permit/update history if possible.\n\n"
            base += "Then respond EXACTLY in the format described in your system instructions, starting with the "
            base += "Google Maps overhead link and then the markdown sectioned report."
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

