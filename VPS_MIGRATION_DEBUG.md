# Debug Migration Issue

## Check if Migration File Exists After Rebuild

```bash
docker exec -it uw-workbench-backend ls -la /app/backend/alembic/versions/ | grep 0011
```

## Check What Alembic Sees as Head

```bash
docker exec -it uw-workbench-backend bash -c "cd /app/backend && python -m alembic history | head -20"
```

This will show all migrations. You should see `0011_add_contact_details_fields` in the list.

## Check Git Status on VPS

Make sure the code was actually pulled:

```bash
cd /root/uw-workbench
git log --oneline -5
```

You should see the commit with the migration.

## Check if Migration File is in Git

```bash
cd /root/uw-workbench
ls -la backend/alembic/versions/ | grep 0011
```

## Force Rebuild Without Cache

If the file exists in git but not in container, rebuild without cache:

```bash
cd /root/uw-workbench
docker compose -f docker-compose.prod.yml build --no-cache backend
docker compose -f docker-compose.prod.yml up -d backend
```

## Manual Migration Check

Check the actual migration file content:

```bash
docker exec -it uw-workbench-backend cat /app/backend/alembic/versions/0011_add_contact_details_fields.py | head -30
```

If this file doesn't exist, the container doesn't have the latest code.
