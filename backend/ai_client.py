import os
from typing import List, Dict
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path

# Load environment from backend/.env
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gpt-5.1")   # default to GPT-5.1

def get_client():
    if not AI_API_KEY:
        raise ValueError("AI_API_KEY environment variable is not set")
    return OpenAI(api_key=AI_API_KEY)

async def call_ai_chat(messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
    """
    Chat using the NEW OpenAI API format compatible with GPT-5.1.
    """
    try:
        client = get_client()

        response = client.chat.completions.create(
            model=AI_MODEL,
            temperature=temperature,
            messages=messages
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        raise Exception(f"AI client error: {str(e)}")
