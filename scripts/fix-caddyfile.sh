#!/bin/bash
# Fix Caddyfile on VPS - Run this once to fix routing

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

echo "✅ Caddyfile fixed"
echo "Restarting Caddy..."
docker compose -f docker-compose.prod.yml restart caddy
echo "✅ Caddy restarted - try logging in now!"
