import os
import logging
from typing import List, Dict
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path

# Load .env from private folder (outside Git tracking)
env_path = Path(__file__).parent.parent / 'private' / '.env'
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gpt-5-mini")  # GPT-5 preferred, falls back to gpt-4o if not available

def get_client():
    if not AI_API_KEY:
        raise ValueError("AI_API_KEY environment variable is not set")
    return OpenAI(api_key=AI_API_KEY)

async def call_ai_chat(messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
    try:
        client = get_client()

        # Build request parameters - exclude certain params for GPT-5 models
        request_params = {
            "model": AI_MODEL,
            "messages": messages,
        }
        
        # GPT-5 models don't support temperature, top_p, frequency_penalty, presence_penalty
        if not AI_MODEL.startswith("gpt-5"):
            request_params["temperature"] = temperature

        response = client.chat.completions.create(**request_params)
        return response.choices[0].message.content.strip()

    except Exception as e:
        raise Exception(f"AI client error: {str(e)}")
