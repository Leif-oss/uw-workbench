# Docker Security Updates

## Summary
Updated all Docker images and Dockerfiles to address 32 vulnerabilities found in the security scan. The changes include:

1. **Updated base images to latest secure versions**
2. **Added security best practices** (non-root users, minimal layers, security updates)
3. **Improved Dockerfile security** (cleanup, proper permissions)

## Changes Made

### 1. Base Image Updates

#### PostgreSQL
- **Before**: `postgres:15-alpine`
- **After**: `postgres:16-alpine`
- **Reason**: Latest stable version with security patches

#### Python Backend
- **Before**: `python:3.11-slim`
- **After**: `python:3.12-slim`
- **Reason**: Latest stable Python version with security updates

#### Node.js Frontend
- **Before**: `node:18-alpine`
- **After**: `node:20-alpine`
- **Reason**: Latest LTS version with security patches

#### Caddy
- **Before**: `caddy:2-alpine`
- **After**: `caddy:2.8-alpine`
- **Reason**: Specific version pinning for better security control

### 2. Security Improvements

#### Backend Dockerfile (`backend/Dockerfile`)
- ✅ Added `--no-install-recommends` to reduce attack surface
- ✅ Added cleanup of apt cache and temp files
- ✅ Created non-root user (`appuser`) for running the application
- ✅ Changed ownership of all application files to non-root user
- ✅ Application now runs as non-root user

#### Frontend Dockerfile (`frontend/Dockerfile.vps`)
- ✅ Added security updates installation
- ✅ Cleaned up apk cache
- ✅ Ensured proper file permissions (nginx already runs as non-root)

### 3. Docker Compose Updates
- Updated all image references in `docker-compose.prod.yml`
- Updated cache_from references to match new base images

## How to Apply Updates

### On Your VPS

1. **Pull the latest code** (if using git):
   ```bash
   git pull
   ```

2. **Rebuild the Docker images**:
   ```bash
   docker compose -f docker-compose.prod.yml build --no-cache
   ```

3. **Restart the services**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **Verify the update**:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs backend
   ```

### Verify Security Improvements

After rebuilding, you can scan the images again:
```bash
# Scan backend image
docker scout cves uw-workbench-backend

# Scan frontend image
docker scout cves uw-workbench-frontend

# Scan postgres image
docker scout cves postgres:16-alpine
```

## Expected Results

After applying these updates:
- ✅ **Reduced vulnerabilities**: Should significantly reduce or eliminate the 32 vulnerabilities
- ✅ **Non-root execution**: Applications run with minimal privileges
- ✅ **Updated dependencies**: All base images use latest security patches
- ✅ **Minimal attack surface**: Removed unnecessary packages and files

## Notes

- The non-root user setup may require testing to ensure all functionality works correctly
- If you encounter permission issues, check that the `/app` directory and files are properly owned by `appuser`
- Database migrations will still run correctly as they execute before switching to the non-root user

## Rollback

If you encounter issues, you can rollback by:
1. Reverting the Dockerfile changes
2. Rebuilding with the previous base images
3. Or use `docker compose down` and restart with previous images

## Additional Security Recommendations

1. **Regular Updates**: Schedule regular Docker image rebuilds to get latest security patches
2. **Vulnerability Scanning**: Set up automated scanning in your CI/CD pipeline
3. **Secrets Management**: Ensure environment variables with secrets are properly secured
4. **Network Security**: Review firewall rules and network policies
5. **Log Monitoring**: Set up monitoring for security events
