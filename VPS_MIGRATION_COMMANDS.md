# VPS Migration Commands

## Run Database Migration

On your VPS, use `python3` instead of `python`:

```bash
cd /root/uw-workbench/backend
python3 -m alembic current
```

To run the migration:

```bash
python3 -m alembic upgrade head
```

## Quick One-Liner

```bash
cd /root/uw-workbench/backend && python3 -m alembic upgrade head
```

## Verify Migration Applied

After running the migration, verify it worked:

```bash
python3 -m alembic current
```

You should see: `0011_add_contact_details_fields (head)`

## Alternative: Run Migration Inside Docker Container

If python3 isn't available on the host, you can run the migration inside the backend container:

```bash
docker exec -it uw-workbench-backend python -m alembic upgrade head
```

This uses the Python environment inside the Docker container.
