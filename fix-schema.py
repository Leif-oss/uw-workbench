import requests

url = 'https://uw-workbench-backend-4szvavge6a-uc.a.run.app/admin/fix-missing-schema'
print("Fixing missing schema elements...")

try:
    r = requests.post(url, timeout=30)
    print(f'Status: {r.status_code}')
    if r.status_code == 200:
        data = r.json()
        print(f"Success: {data.get('message', '')}")
        if data.get('fixes'):
            print("Fixes applied:")
            for fix in data['fixes']:
                print(f"  - {fix}")
    else:
        print(f"Error: {r.text}")
except Exception as e:
    print(f"Error: {e}")
