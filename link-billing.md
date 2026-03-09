# Link Billing Account to Project

## Current Status
Billing account exists but is not linked to project `ultra-ace-481723-e6`.

## To Link Billing (Choose One Method)

### Method 1: Using Google Cloud Console (Easiest)
1. Go to: https://console.cloud.google.com/billing/linkedaccount?project=ultra-ace-481723-e6
2. Click "Link a billing account"
3. Select your billing account
4. Click "Set account"

### Method 2: Using Command Line
Run this command (replace `BILLING_ACCOUNT_ID` with your actual billing account ID):
```powershell
gcloud billing projects link ultra-ace-481723-e6 --billing-account=BILLING_ACCOUNT_ID
```

To find your billing account ID, run:
```powershell
gcloud billing accounts list
```

## After Linking
Wait 1-2 minutes for propagation, then we can continue with deployment.





