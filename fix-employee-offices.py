import requests

url = 'https://uw-workbench-backend-4szvavge6a-uc.a.run.app/admin/create-employee-offices-table'
print("Creating employee_offices table...")

try:
    r = requests.post(url, timeout=30)
    print(f'Status: {r.status_code}')
    if r.status_code == 200:
        data = r.json()
        print(f"Success: {data.get('message', 'Table created')}")
    else:
        print(f"Error: {r.text}")
except Exception as e:
    print(f"Error: {e}")
