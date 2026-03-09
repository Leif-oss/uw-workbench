#!/bin/bash
# Update Caddyfile with security headers
# Run this on your VPS

cat > Caddyfile << 'EOF'
# Caddy Reverse Proxy Configuration for UW Workbench
# Using domain: dhcrm.com

dhcrm.com {
    log {
        output file /var/log/caddy/access.log
        format console
    }

    # Security Headers
    header {
        # HTTP Strict Transport Security (HSTS)
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        
        # Content Security Policy
        # Allow same origin, API calls to same domain, and common CDNs
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com; frame-ancestors 'self';"
        
        # Referrer Policy
        Referrer-Policy "strict-origin-when-cross-origin"
        
        # Permissions Policy
        Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
        
        # Remove server header for security
        -Server
        
        # X-Frame-Options (additional protection)
        X-Frame-Options "SAMEORIGIN"
        
        # X-Content-Type-Options
        X-Content-Type-Options "nosniff"
        
        # X-XSS-Protection
        X-XSS-Protection "1; mode=block"
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

echo "✅ Security headers updated in Caddyfile"
echo "Restarting Caddy..."
docker compose -f docker-compose.prod.yml restart caddy
echo "✅ Caddy restarted with security headers"
echo ""
echo "Security headers now include:"
echo "  - Strict-Transport-Security (HSTS)"
echo "  - Content-Security-Policy"
echo "  - Referrer-Policy"
echo "  - Permissions-Policy"
echo "  - X-Frame-Options"
echo "  - X-Content-Type-Options"
echo "  - X-XSS-Protection"
