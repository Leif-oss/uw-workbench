import os
from typing import List, Dict
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file in backend directory
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# Read configuration from environment
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gpt-5.1")

# Initialize OpenAI client
client = OpenAI(api_key=AI_API_KEY)


async def call_ai_chat(messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
    """
    AI chat completion function using new OpenAI SDK.
    
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
    
    try:
        response = client.chat.completions.create(
            model="gpt-5.1",
            messages=messages,
            temperature=temperature
        )
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        raise Exception(f"AI client error: {str(e)}")

