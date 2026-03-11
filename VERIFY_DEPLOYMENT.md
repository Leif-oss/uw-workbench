# Verify Deployment - Next Steps

## ✅ Deployment Complete!

Your services are running. Now verify everything works:

## 1. Check Database Migration

Make sure the migration ran (adds 3 new contact fields):

```bash
# On VPS, check if migration was applied
cd /root/uw-workbench/backend
python -m alembic current
```

You should see: `0011_add_contact_details_fields (head)`

If not, run:
```bash
python -m alembic upgrade head
```

## 2. Test the Application

Visit your domain in a browser and check:
- ✅ Login works
- ✅ Contact Details section appears on agency contact pages
- ✅ Workflow Tool shows renewals
- ✅ Activity metrics display on employee page
- ✅ All 6 activity boxes show on employee page

## 3. Check Backend Health

```bash
# On VPS
curl http://localhost:8000/health
```

Should return: `{"status":"ok","db":"reachable"}`

## 4. View Live Logs (Optional)

```bash
# Watch all logs
docker compose -f docker-compose.prod.yml logs -f

# Or specific service
docker compose -f docker-compose.prod.yml logs -f backend
```

## Minor Fix: Docker Compose Warning

The warning about `version` being obsolete is harmless, but you can fix it:

```bash
# On VPS
cd /root/uw-workbench
# Edit docker-compose.prod.yml and remove the first line: version: '3.8'
```

Or leave it - it's just a warning and doesn't affect functionality.

## What Was Deployed

✅ Contact details fields (previous_agencies, likes_hobbies, additional_info)
✅ Renewals API and workflow tool
✅ Email templates API
✅ Activity metrics (6 boxes on employee page)
✅ Sortable activity columns
✅ Notes field in Contact Details
✅ All recent fixes and improvements

## If Something Doesn't Work

```bash
# Restart a specific service
docker compose -f docker-compose.prod.yml restart backend

# Rebuild without cache (if needed)
./scripts/vps-update.sh --no-cache

# Check service logs
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```
