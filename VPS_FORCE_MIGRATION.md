# Force Migration to Latest - VPS

## Check Available Migrations

First, see what migrations are available:

```bash
docker exec -it uw-workbench-backend bash -c "cd /app/backend && python -m alembic history"
```

This will show all migrations, including `0011_add_contact_details_fields`.

## Check Current Status

```bash
docker exec -it uw-workbench-backend bash -c "cd /app/backend && python -m alembic current"
```

## Force Upgrade to Head

If the migration script thinks it's up to date but it's not, force the upgrade:

```bash
docker exec -it uw-workbench-backend bash -c "cd /app/backend && python -m alembic upgrade head"
```

## Verify Migration File Exists

Check if the migration file is in the container:

```bash
docker exec -it uw-workbench-backend ls -la /app/backend/alembic/versions/ | grep 0011
```

You should see: `0011_add_contact_details_fields.py`

## If Migration File is Missing

If the migration file doesn't exist in the container, you need to rebuild the backend:

```bash
cd /root/uw-workbench
./scripts/vps-update.sh backend
```

This will rebuild the backend container with the latest code including the new migration.
