# Deploy to Digital Ocean VPS - Ready Now!

Since the secret has been allowed on GitHub, you can now deploy using the standard method.

## Quick Deployment Steps

### On Your VPS (SSH into it):

```bash
# 1. SSH into VPS
ssh root@157.245.172.164

# 2. Navigate to project
cd /root/uw-workbench

# 3. Pull latest production branch
git fetch origin
git checkout production
git pull origin production

# 4. Run database migrations (CRITICAL - adds new contact fields)
cd backend
python -m alembic upgrade head
cd ..

# 5. Update and restart all services
./scripts/vps-update.sh
```

## One-Liner Command

```bash
cd /root/uw-workbench && git fetch origin && git checkout production && git pull origin production && cd backend && python -m alembic upgrade head && cd .. && ./scripts/vps-update.sh
```

## What's Being Deployed

### Backend:
- ✅ Contact details fields (previous_agencies, likes_hobbies, additional_info)
- ✅ Renewals API endpoints
- ✅ Email templates API
- ✅ Enhanced activity metrics
- ✅ Improved log action detection

### Frontend:
- ✅ Contact Details expandable section
- ✅ Workflow Tool with renewals
- ✅ 6 activity metric boxes on employee page
- ✅ Sortable activity columns
- ✅ Notes field in Contact Details

## Verify Deployment

After deployment completes:

```bash
# Check services
docker compose -f docker-compose.prod.yml ps

# Check backend logs
docker compose -f docker-compose.prod.yml logs --tail=50 backend

# Check frontend logs
docker compose -f docker-compose.prod.yml logs --tail=50 frontend
```

## Important Notes

1. **Database Migration**: The migration `0011_add_contact_details_fields` will add 3 new columns to the contacts table. This is automatic when you run `alembic upgrade head`.

2. **Environment Variables**: Make sure your `.env` file on the VPS has:
   - `AI_API_KEY` (if using AI features)
   - `DATABASE_URL` (PostgreSQL connection)
   - `CORS_ORIGINS` (your domain)
   - Other required variables

3. **Service Restart**: The `vps-update.sh` script will rebuild Docker images and restart all services automatically.

## Troubleshooting

If something goes wrong:

```bash
# Rebuild without cache
./scripts/vps-update.sh --no-cache

# Check specific service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml restart backend
```
