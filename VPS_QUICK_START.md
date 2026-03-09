# VPS Quick Start Guide

## Connect to VPS
```bash
ssh root@157.245.172.164
```

## Start Services

### If services are already configured:
```bash
cd /root/uw-workbench
docker compose -f docker-compose.prod.yml up -d
```

### If you need to rebuild (after updates):
```bash
cd /root/uw-workbench
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Check Status
```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Check specific service
docker compose -f docker-compose.prod.yml logs -f backend
```

## Restart Services
```bash
docker compose -f docker-compose.prod.yml restart
```

## Stop Services
```bash
docker compose -f docker-compose.prod.yml down
```

## Access Your Application
- **With domain**: https://dhcrm.com
- **With IP**: http://157.245.172.164

## Troubleshooting

### Services won't start
```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs

# Check if ports are in use
netstat -tulpn | grep -E '80|443|5432'
```

### Rebuild everything from scratch
```bash
cd /root/uw-workbench
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Check database connection
```bash
docker exec -it uw-workbench-postgres psql -U uw_workbench -d uw_workbench -c "SELECT version();"
```

### View backend health
```bash
curl http://localhost/api/health
```
