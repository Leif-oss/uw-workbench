#!/bin/bash
# Setup domain configuration for dhcrm.com
# Run this on your VPS after DNS is configured

DOMAIN="dhcrm.com"

echo "Setting up domain: $DOMAIN"

# Update Caddyfile
cat > Caddyfile << EOF
# Caddy Reverse Proxy Configuration for UW Workbench
# Using domain: $DOMAIN

$DOMAIN {
    log {
        output file /var/log/caddy/access.log
        format console
    }

    handle /api/* {
        uri strip_prefix /api
        reverse_proxy backend:8000 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    handle {
        reverse_proxy frontend:3000 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }
}
EOF

# Update .env file
if [ -f .env ]; then
    # Update FRONTEND_URL
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" .env
    
    # Update CORS_ORIGINS
    sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://$DOMAIN|" .env
    
    # Update VITE_API_URL (requires frontend rebuild)
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN/api|" .env
    
    echo "✅ .env file updated"
else
    echo "⚠️  .env file not found"
fi

# Restart Caddy
echo "Restarting Caddy..."
docker compose -f docker-compose.prod.yml restart caddy

echo ""
echo "✅ Domain configuration complete!"
echo ""
echo "⚠️  IMPORTANT: You need to rebuild the frontend for VITE_API_URL changes:"
echo "   Run: docker compose -f docker-compose.prod.yml up -d --build frontend"
echo ""
echo "After DNS propagates (5-60 minutes), access at:"
echo "   https://$DOMAIN"
