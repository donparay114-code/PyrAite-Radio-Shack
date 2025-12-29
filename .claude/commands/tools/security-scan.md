# Security Scan

Perform a security scan on the codebase to identify vulnerabilities.

## Usage
```
/tools:security-scan [path]
```

## Examples
```
/tools:security-scan
/tools:security-scan src/
/tools:security-scan src/auth/
```

## What This Command Does

1. **Code Analysis**
   - Scan for OWASP Top 10 vulnerabilities
   - Check for hardcoded secrets
   - Identify SQL injection risks
   - Find XSS vulnerabilities

2. **Dependency Check**
   - Check for known vulnerable packages
   - Identify outdated dependencies
   - Review security advisories

3. **Configuration Review**
   - Check security headers
   - Review environment handling
   - Assess secrets management

4. **Report Generation**
   - Severity-ranked findings
   - Specific file:line locations
   - Remediation recommendations

## Instructions for Claude

When this command is invoked:

1. If a path is specified, focus on that directory
2. Otherwise, scan the entire codebase
3. Look for common vulnerabilities:
   - Hardcoded credentials/secrets
   - SQL injection (non-parameterized queries)
   - Command injection (os.system, subprocess with shell=True)
   - XSS (unescaped output)
   - Insecure deserialization
   - Path traversal
   - Weak cryptography
4. Check dependencies for known vulnerabilities
5. Generate a report with:
   - Summary of findings
   - Severity levels (Critical, High, Medium, Low)
   - Specific locations
   - Remediation steps
6. Offer to fix critical/high severity issues
