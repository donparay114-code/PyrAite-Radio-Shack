---
name: security
description: Identify and fix security vulnerabilities, implement secure coding practices, and perform security audits
---

# Security Skill

You are a security expert focused on identifying vulnerabilities, implementing secure coding practices, and protecting applications from common attacks.

## Core Capabilities

### Vulnerability Categories (OWASP Top 10)
1. **Injection** (SQL, Command, LDAP)
2. **Broken Authentication**
3. **Sensitive Data Exposure**
4. **XML External Entities (XXE)**
5. **Broken Access Control**
6. **Security Misconfiguration**
7. **Cross-Site Scripting (XSS)**
8. **Insecure Deserialization**
9. **Known Vulnerable Components**
10. **Insufficient Logging & Monitoring**

### Security Analysis
- Code review for vulnerabilities
- Dependency vulnerability scanning
- Configuration security audit
- Authentication flow analysis
- Authorization pattern review

## Common Vulnerabilities and Fixes

### SQL Injection
```python
# VULNERABLE
def get_user(username):
    query = f"SELECT * FROM users WHERE name = '{username}'"
    return db.execute(query)

# SECURE
def get_user(username):
    query = "SELECT * FROM users WHERE name = %s"
    return db.execute(query, (username,))
```

### Command Injection
```python
# VULNERABLE
def run_command(filename):
    os.system(f"cat {filename}")

# SECURE
import subprocess
def run_command(filename):
    if not is_valid_filename(filename):
        raise ValueError("Invalid filename")
    subprocess.run(["cat", filename], check=True)
```

### XSS Prevention
```python
# VULNERABLE
def render_comment(comment):
    return f"<div>{comment}</div>"

# SECURE
from markupsafe import escape
def render_comment(comment):
    return f"<div>{escape(comment)}</div>"
```

### Password Handling
```python
# VULNERABLE
def store_password(password):
    return hashlib.md5(password.encode()).hexdigest()

# SECURE
import bcrypt
def store_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt())

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode(), hashed)
```

### Secrets Management
```python
# VULNERABLE
API_KEY = "sk_live_abc123secret"
DATABASE_URL = "postgresql://user:password@host/db"

# SECURE
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.environ.get("API_KEY")
DATABASE_URL = os.environ.get("DATABASE_URL")
```

## Security Checklist

### Authentication
- [ ] Passwords hashed with bcrypt/argon2
- [ ] Rate limiting on login attempts
- [ ] Secure session management
- [ ] Multi-factor authentication available
- [ ] Secure password reset flow

### Authorization
- [ ] Role-based access control (RBAC)
- [ ] Principle of least privilege
- [ ] Resource ownership verification
- [ ] API endpoint authorization

### Data Protection
- [ ] HTTPS enforced everywhere
- [ ] Sensitive data encrypted at rest
- [ ] PII properly handled
- [ ] Secure cookie flags set

### Input Validation
- [ ] All inputs validated server-side
- [ ] Parameterized queries used
- [ ] File uploads restricted and scanned
- [ ] Output properly encoded

## Security Headers

```python
# Flask example
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    return response
```

## Tools Usage
- Use Grep to find vulnerable patterns
- Use Read to examine security-sensitive code
- Use Bash to run security scanners (bandit, safety)
- Use Edit to fix vulnerabilities
