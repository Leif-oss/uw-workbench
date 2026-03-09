# SMTP Network Debugging Guide

## Quick Test

After deploying, test the diagnostics endpoint:

```bash
# Replace with your backend URL
curl https://uw-workbench-backend-4szvavge6a-uc.a.run.app/_diag/network
```

## gcloud Commands for Cloud Run Networking

### 1. Check Cloud Run Service Configuration

```bash
# Set variables
PROJECT_ID="ultra-ace-481723-e6"
REGION="us-central1"
SERVICE_NAME="uw-workbench-backend"

# Show service configuration including VPC connector and egress settings
gcloud run services describe ${SERVICE_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="yaml(vpcAccess, ingress, egress)"
```

### 2. Check VPC Connector Details (if present)

```bash
# If VPC connector is configured, get its details
CONNECTOR_NAME="your-connector-name"  # Replace with actual name from step 1

gcloud compute networks vpc-access connectors describe ${CONNECTOR_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID}
```

### 3. Check VPC Network and Subnet

```bash
# Get VPC network name from connector output
VPC_NETWORK="your-vpc-network"  # Replace with actual network name
SUBNET_NAME="your-subnet-name"  # Replace with actual subnet name

# Check subnet configuration
gcloud compute networks subnets describe ${SUBNET_NAME} \
  --region=${REGION} \
  --network=${VPC_NETWORK} \
  --project=${PROJECT_ID}
```

### 4. Check Cloud NAT Configuration

```bash
# List routers in the region
gcloud compute routers list \
  --region=${REGION} \
  --project=${PROJECT_ID}

# Check NAT configuration on router
ROUTER_NAME="your-router-name"  # Replace with actual router name

gcloud compute routers describe ${ROUTER_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="yaml(nats)"
```

### 5. Check Firewall Rules (if applicable)

```bash
# List firewall rules that might block SMTP
gcloud compute firewall-rules list \
  --project=${PROJECT_ID} \
  --filter="direction:EGRESS AND (denied.ports:587 OR denied.ports:465 OR denied.ports:25)"
```

## Interpretation Guide

### Scenario 1: DNS Resolution Fails
**Symptom**: `/_diag/network` shows `"success": false` for DNS tests

**Likely Causes**:
- VPC connector with "all-traffic" egress but missing Cloud NAT
- VPC connector with blocked DNS (port 53)
- Organization policy blocking DNS resolution

**Solutions**:
1. If using VPC connector, ensure Cloud NAT is configured on the subnet
2. Check organization policies for DNS restrictions
3. Consider using "private-ranges-only" egress instead of "all-traffic"

### Scenario 2: DNS Resolves but TCP Connect Fails
**Symptom**: DNS tests succeed, but TCP tests fail

**Likely Causes**:
- Firewall rules blocking ports 587/465
- Organization policy blocking SMTP ports
- Cloud NAT not configured (if using VPC connector)

**Solutions**:
1. Check firewall rules (see command 5 above)
2. Verify Cloud NAT is configured and working
3. Check organization policies for port restrictions

### Scenario 3: Both DNS and TCP Succeed
**Symptom**: All tests pass in `/_diag/network`

**Conclusion**: Networking is fine. The issue is likely:
- SMTP authentication (wrong credentials)
- Gmail account security settings (app passwords, 2FA)
- Gmail account restrictions

**Next Steps**:
- Check SMTP_USER and SMTP_PASSWORD in Secret Manager
- Verify Gmail account allows "less secure apps" or use app password
- Check Gmail account for any restrictions

## Common VPC Connector Issues

### Issue: "all-traffic" egress without NAT
**Problem**: When using VPC connector with `egress: all-traffic`, Cloud Run routes all traffic through VPC, but without Cloud NAT, there's no public IP for outbound connections.

**Solution**: Configure Cloud NAT on the VPC subnet used by the connector.

### Issue: DNS not resolving
**Problem**: VPC connector might be using private DNS that doesn't resolve public domains.

**Solution**: 
- Ensure Cloud NAT is configured
- Check VPC DNS settings
- Consider using "private-ranges-only" egress if you don't need all traffic through VPC

## Quick Fixes

### Option 1: Remove VPC Connector (if not needed)
```bash
gcloud run services update ${SERVICE_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --clear-vpc-connector
```

### Option 2: Switch to "private-ranges-only" egress
```bash
gcloud run services update ${SERVICE_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --vpc-egress=private-ranges-only
```

### Option 3: Configure Cloud NAT
```bash
# Create Cloud NAT (if router exists)
gcloud compute routers nats create nat-config \
  --router=${ROUTER_NAME} \
  --region=${REGION} \
  --nat-all-subnet-ip-ranges \
  --auto-allocate-nat-external-ips \
  --project=${PROJECT_ID}
```

## Testing After Changes

1. Check startup logs for DNS test:
```bash
gcloud run services logs read ${SERVICE_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --limit=50 | grep "SMTP DIAG"
```

2. Test diagnostics endpoint:
```bash
curl https://uw-workbench-backend-4szvavge6a-uc.a.run.app/_diag/network | jq
```

3. Try sending a test email (create a new user)



