import requests
import json

url = 'https://uw-workbench-backend-4szvavge6a-uc.a.run.app/admin/reset-leif-password'
r = requests.post(url, timeout=30)

print(f'Status: {r.status_code}')
data = r.json()

print('\n' + '='*60)
print('PASSWORD RESET!')
print('='*60)
print(f'\nUsername: {data["username"]}')
print(f'Email: {data["email"]}')
print(f'Temporary Password: {data["temp_password"]}')
print(f'\nLogin at: https://uw-workbench-frontend-4szvavge6a-uc.a.run.app')
print('')
