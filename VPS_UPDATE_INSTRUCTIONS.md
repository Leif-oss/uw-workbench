# VPS Update Instructions

## Quick Update Steps

Run these commands on your VPS to update the application:

```bash
# 1. Navigate to the project directory
cd /root/uw-workbench

# 2. Pull the latest production branch
git fetch origin
git checkout production
git pull origin production

# 3. Run database migrations (if needed)
cd backend
python -m alembic upgrade head
cd ..

# 4. Update and restart all services
./scripts/vps-update.sh

# OR update services individually:
# ./scripts/vps-update.sh backend
# ./scripts/vps-update.sh frontend
```

## What's New in This Update

- **Contact Details Section**: Added expandable contact details with:
  - Contact statistics (Total, In Person, Emails, Phone)
  - Previous Agencies field
  - Likes / Hobbies field
  - Additional Information field
  - Notes (moved inside Contact Details)

- **Workflow Tool Improvements**:
  - Renewals persist across sessions
  - Better status management (Pending/Quoted/Non-Renewed)
  - Improved red warning logic
  - Duplicate detection

- **Activity Metrics**:
  - 6 separate metrics boxes on employee page
  - Activity metrics on office and agency pages
  - Sortable activity columns

- **Email Builder & Templates**:
  - Enhanced email generation
  - Better contact selection
  - Improved logging

## Database Migration Required

This update includes a new migration (`0011_add_contact_details_fields`) that adds:
- `previous_agencies` field to contacts
- `likes_hobbies` field to contacts  
- `additional_info` field to contacts

The migration will run automatically when you execute `alembic upgrade head`.

## Troubleshooting

If you encounter issues:

1. **Check service status**: `docker compose -f docker-compose.prod.yml ps`
2. **View logs**: `docker compose -f docker-compose.prod.yml logs -f`
3. **Restart services**: `docker compose -f docker-compose.prod.yml restart`
