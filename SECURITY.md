# Security Policy

## 🔒 Security Best Practices

### Environment Variables & Secrets

**CRITICAL:** Never commit secrets to Git!

#### What to Keep Secret:
- ✅ API keys (OpenAI, etc.)
- ✅ Database passwords
- ✅ Admin passwords
- ✅ Session secrets
- ✅ OAuth tokens
- ✅ Any authentication credentials

#### How to Store Secrets:

1. **Local Development:**
   - Use `.env` files (already in `.gitignore`)
   - Copy from `.env.example` templates
   - Never share `.env` files via email/Slack

2. **Production:**
   - Use environment variables on your hosting platform
   - Use secret management services (AWS Secrets Manager, Azure Key Vault, etc.)
   - Never hardcode secrets in source code

### Password Requirements

#### Admin Password (`ADMIN_PASSWORD`):
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Not a dictionary word
- Change every 90 days
- Never reuse across systems

#### Example Strong Passwords:
- ✅ `Tr0ub4dor&3-Secure!2024`
- ✅ `MyD0g!sN4m3dF1uffy#99`
- ❌ `admin123` (NEVER USE!)
- ❌ `password` (NEVER USE!)

### API Key Security

#### OpenAI API Key:
- Treat as highly sensitive
- Rotate every 6 months
- Monitor usage for anomalies
- Set spending limits in OpenAI dashboard
- Never log API keys
- Never send in error messages

### Database Security

1. **Never commit database files:**
   - `*.db`, `*.sqlite`, `*.sqlite3` are in `.gitignore`
   - Database files may contain PII and sensitive data

2. **Production databases:**
   - Use strong passwords
   - Enable SSL/TLS connections
   - Restrict network access (firewall rules)
   - Regular backups with encryption
   - Separate read/write credentials if possible

### CORS Configuration

**Development:**
```python
allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

**Production:**
```python
allow_origins=[
    "https://yourdomain.com",
    "https://app.yourdomain.com",
]
```

**NEVER use:**
```python
allow_origins=["*"]  # ❌ Allows any origin - security risk!
```

### HTTPS/TLS

- ✅ **Production MUST use HTTPS**
- ❌ Never use HTTP in production
- Use valid SSL certificates (Let's Encrypt is free)
- Enable HSTS headers
- Redirect HTTP to HTTPS

### File Upload Security

The Document Scrubber accepts file uploads. Security measures:

1. **File type validation:**
   - Only allow: PDF, DOCX, XLSX, TXT
   - Check file extensions AND MIME types
   - Scan for malware if possible

2. **File size limits:**
   - Current limit: Check `document_scrubber.py`
   - Prevent DoS attacks via large files

3. **Storage:**
   - Don't store uploaded files long-term unless necessary
   - If storing, use separate storage (S3, Azure Blob)
   - Never serve uploaded files directly

### Logging Security

**DO:**
- ✅ Log authentication attempts
- ✅ Log admin actions
- ✅ Log API errors
- ✅ Log database migrations

**DON'T:**
- ❌ Log passwords
- ❌ Log API keys
- ❌ Log credit card numbers
- ❌ Log PII unnecessarily

### Code Security

1. **SQL Injection Prevention:**
   - ✅ Using SQLAlchemy ORM (parameterized queries)
   - ❌ Never use string concatenation for SQL

2. **XSS Prevention:**
   - ✅ React escapes by default
   - ❌ Never use `dangerouslySetInnerHTML` without sanitization

3. **Dependency Security:**
   - Run `npm audit` regularly
   - Run `pip-audit` or `safety check` for Python
   - Keep dependencies updated

### Git Security

**Before Committing:**
```bash
# Check for secrets
git diff

# Verify .env files are not staged
git status

# Use git-secrets or similar tools
```

**If You Accidentally Commit a Secret:**

1. **Immediately rotate the secret** (new API key, password, etc.)
2. Remove from Git history:
   ```bash
   # Use BFG Repo-Cleaner or git-filter-repo
   # Contact DevOps team for help
   ```
3. Force push (requires coordination with team)
4. Notify security team

### Incident Response

**If you discover a security issue:**

1. **DO NOT** create a public GitHub issue
2. **DO NOT** discuss in public channels
3. **DO** contact the security team immediately
4. **DO** document what you found
5. **DO** preserve evidence (logs, screenshots)

### Security Checklist for Deployment

- [ ] All `.env` files configured with strong secrets
- [ ] No default passwords in use
- [ ] HTTPS enabled with valid certificate
- [ ] CORS configured for specific domains only
- [ ] Database using strong password
- [ ] Database connections encrypted (SSL/TLS)
- [ ] File upload limits configured
- [ ] Rate limiting enabled
- [ ] Logging configured (no secrets logged)
- [ ] Error messages don't expose system details
- [ ] Dependencies up to date
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] Backups configured and tested
- [ ] Monitoring and alerting configured

### Regular Security Tasks

**Weekly:**
- Review access logs for anomalies
- Check API usage for unusual patterns

**Monthly:**
- Update dependencies (`npm audit fix`, `pip install --upgrade`)
- Review user access and permissions
- Check for failed login attempts

**Quarterly:**
- Rotate API keys
- Review and update passwords
- Security audit of new features
- Penetration testing (if applicable)

**Annually:**
- Full security audit
- Review and update security policies
- Security training for team

### Compliance

If handling sensitive data (PII, PHI, financial):
- Understand applicable regulations (GDPR, HIPAA, PCI-DSS)
- Implement data retention policies
- Enable audit logging
- Implement data encryption at rest
- Document data flows
- Conduct privacy impact assessments

### Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [React Security Best Practices](https://react.dev/learn/security)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/safety-best-practices)

---

**Security is everyone's responsibility. When in doubt, ask!**

Last Updated: December 2024

