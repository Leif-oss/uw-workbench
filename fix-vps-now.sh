#!/bin/bash
# Quick fix for VPS - Run this once
# Upload this file to your VPS and run: bash fix-vps-now.sh

cd /root/uw-workbench

# Fix Caddyfile
cat > Caddyfile << 'EOF'
:80 {
    log {
        output file /var/log/caddy/access.log
        format console
    }

    handle /api/* {
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

# Restart Caddy
docker compose -f docker-compose.prod.yml restart caddy

echo "✅ Fixed! Try logging in now at http://157.245.172.164"
