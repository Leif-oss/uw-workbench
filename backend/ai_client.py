import os
import json
from typing import List, Dict, Optional
import httpx


# Read configuration from environment
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")
AI_ENDPOINT = os.getenv("AI_ENDPOINT", "https://api.openai.com/v1/chat/completions")


async def call_ai_chat(messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
    """
    Generic AI chat completion function.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        temperature: Sampling temperature (0-1)
    
    Returns:
        The AI's response text
        
    Raises:
        Exception: If API call fails or key is not set
    """
    if not AI_API_KEY:
        raise ValueError("AI_API_KEY environment variable is not set")
    
    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": AI_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                AI_ENDPOINT,
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
            
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text if hasattr(e.response, "text") else str(e)
            raise Exception(f"AI API error ({e.response.status_code}): {error_detail}")
        except Exception as e:
            raise Exception(f"AI client error: {str(e)}")

