"""Test login endpoint."""
import requests
import json

BACKEND_URL = "http://127.0.0.1:8000"

# Try logging in with leif
username = "leif"
password = "Temp!local123"  # Try the default temp password

print(f"Testing login for user: {username}")
print("")

payload = {
    "username": username,
    "password": password
}

try:
    response = requests.post(
        f"{BACKEND_URL}/auth/login",
        json=payload,
        timeout=10
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("[OK] Login successful!")
        print(f"  Token: {result.get('access_token', 'N/A')[:20]}...")
        print(f"  Username: {result.get('username')}")
        print(f"  Is Admin: {result.get('is_admin')}")
    else:
        print(f"[ERROR] Login failed")
        try:
            error_detail = response.json()
            print(f"  Error: {error_detail.get('detail', 'Unknown error')}")
        except:
            print(f"  Response: {response.text}")
        
        print("")
        print("Possible issues:")
        print("  1. Wrong password")
        print("  2. User account is locked")
        print("  3. User account is inactive")
        
except requests.exceptions.ConnectionError:
    print("[ERROR] Cannot connect to backend")
except Exception as e:
    print(f"[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
