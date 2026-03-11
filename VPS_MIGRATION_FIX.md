# Run Migration on VPS - Correct Method

## Use the Migration Script in the Container

The Docker container has a migration script. Use it:

```bash
docker exec -it uw-workbench-backend python /app/backend/run_migrations.py
```

## Or Run Alembic Directly with Correct Path

If you want to run alembic directly, you need to specify the config:

```bash
docker exec -it uw-workbench-backend bash -c "cd /app/backend && python -m alembic upgrade head"
```

## Check Current Migration Status

```bash
docker exec -it uw-workbench-backend python /app/backend/run_migrations.py
```

Or check directly:

```bash
docker exec -it uw-workbench-backend bash -c "cd /app/backend && python -m alembic current"
```

## Recommended: Use the Migration Script

The easiest and most reliable method:

```bash
docker exec -it uw-workbench-backend python /app/backend/run_migrations.py
```

This script:
- Finds the correct alembic.ini
- Connects to the database properly
- Handles errors gracefully
- Shows detailed logs
