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
        "- Use provided context (agency info, contacts, property addresses) to give specific, actionable answers\n"
        "- Format responses with clear sections, emojis, bullet points, and professional structure\n"
        "- When analyzing properties by address, use your knowledge to research and infer:\n"
        "  * Building characteristics (age, construction type, size)\n"
        "  * Location risk factors (natural hazards, protection class, fire department proximity)\n"
        "  * Market context and typical occupancy for the area\n"
        "  * Replacement cost estimates based on location and building type\n"
        "- When providing property reports, use this exact structure:\n"
        "  🏢 PROPERTY OVERVIEW\n"
        "  ⚠️ RISK ASSESSMENT\n"
        "  💰 UNDERWRITING ANALYSIS\n"
        "  📋 COVERAGE RECOMMENDATIONS\n"
        "  💵 PRICING GUIDANCE\n"
        "  🚨 RED FLAGS & CONCERNS\n"
        "- Use professional insurance terminology but explain complex concepts clearly\n"
        "- For property analyses, research publicly available information and make reasonable inferences\n"
        "- Clearly note when you're making assumptions vs. stating known facts\n"
        "- Always include a disclaimer that final underwriting decisions require inspection and human review\n\n"
        "Property Analysis Guidelines:\n"
        "- Research the address for building type, age, and characteristics\n"
        "- Consider location-specific risks (earthquake zones, flood zones, wildfire areas, coastal exposure)\n"
        "- Evaluate construction quality based on age and location (frame=higher risk, masonry/concrete=lower risk)\n"
        "- Estimate protection class based on urban/suburban/rural location\n"
        "- Suggest appropriate building limits based on estimated replacement cost\n"
        "- Recommend deductibles based on building value and risk profile\n"
        "- Identify any special concerns requiring additional underwriting review"
    )
    
    if context:
        # Check if this is a property analysis with address
        if context.get("propertyAddress"):
            address = context["propertyAddress"]
            base += f"\n\n📍 PROPERTY ADDRESS FOR ANALYSIS:\n{address}\n"
            base += "\nPlease research this property and provide a comprehensive underwriting analysis.\n"
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

