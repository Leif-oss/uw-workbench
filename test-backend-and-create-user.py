"""Test backend connection and create admin user if needed."""
import requests
import json
import sys

BACKEND_URL = "http://127.0.0.1:8000"

def test_backend():
    """Test if backend is responding."""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            print("[OK] Backend is responding")
            return True
        else:
            print(f"[ERROR] Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("[ERROR] Cannot connect to backend - is it running?")
        return False
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return False

def create_admin_user():
    """Create admin user via /admin/setup-admin endpoint."""
    setup_token = "CHANGE_THIS_IN_PRODUCTION"
    username = "leif"
    email = "leif@deanshomer.com"
    password = "Temp!local123"
    name = "Leif"
    
    payload = {
        "username": username,
        "email": email,
        "password": password,
        "name": name,
        "setup_token": setup_token
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/admin/setup-admin",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print("[OK] Admin user created successfully!")
            print("")
            print("Login credentials:")
            print(f"  Username: {username}")
            print(f"  Email: {email}")
            print(f"  Password: {password}")
            print("")
            print("[WARNING] IMPORTANT: Change this password after first login!")
            return True
        else:
            print(f"[ERROR] Failed to create admin user")
            print(f"   Status: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   Error: {error_detail.get('detail', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("[ERROR] Cannot connect to backend")
        return False
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return False

if __name__ == "__main__":
    print("Testing backend connection...")
    print("")
    
    if not test_backend():
        print("")
        print("Please start the backend first:")
        print("  .\\start_backend.ps1")
        sys.exit(1)
    
    print("")
    print("Creating admin user...")
    print("")
    
    if create_admin_user():
        sys.exit(0)
    else:
        sys.exit(1)
