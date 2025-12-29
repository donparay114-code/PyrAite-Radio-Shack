---
name: code-reviewer
description: Perform thorough code reviews checking for bugs, security issues, performance, and best practices. Use when the user asks to review code, check changes, or mentions pull requests, code quality, or reviews.
allowed-tools: Read, Grep, Glob, Bash
---

# Code Reviewer

## Purpose
Conduct comprehensive code reviews focusing on correctness, security, performance, and maintainability.

## Instructions

### 1. Understanding the Changes

- Read all modified files completely
- Check git diff to understand what changed: `git diff` or `git diff main...HEAD`
- Identify the purpose and scope of changes
- Look for related files that might be affected

### 2. Review Checklist

**Correctness**:
- Logic errors or edge cases not handled
- Incorrect assumptions or preconditions
- Missing error handling
- Potential null/undefined reference errors

**Security**:
- Input validation and sanitization
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication and authorization checks
- Sensitive data exposure
- Insecure dependencies

**Performance**:
- Inefficient algorithms or data structures
- N+1 query problems
- Unnecessary loops or redundant operations
- Memory leaks
- Missing indexes for database queries

**Best Practices**:
- Code follows project conventions
- Functions are focused and single-purpose
- Clear and meaningful naming
- Appropriate comments (only where needed)
- DRY principle (Don't Repeat Yourself)
- Error messages are helpful

**Testing**:
- Are there tests for new functionality?
- Do existing tests still pass?
- Are edge cases covered?

### 3. Review Output Format

Organize findings by severity:

**Critical** - Must fix before merge:
- Security vulnerabilities
- Data loss risks
- Breaking changes without migration

**Important** - Should fix before merge:
- Logic errors
- Performance issues
- Missing error handling

**Suggestions** - Nice to have:
- Code style improvements
- Additional tests
- Documentation updates

### 4. Providing Feedback

- Be specific: Reference file paths and line numbers
- Explain the issue and why it matters
- Suggest concrete solutions when possible
- Acknowledge good patterns and improvements

## Example Review

```
### Critical Issues

1. **SQL Injection vulnerability** (users.controller.ts:45)
   - Using string concatenation to build SQL query
   - Fix: Use parameterized queries or ORM

2. **Missing authentication check** (api.routes.ts:23)
   - DELETE endpoint accessible without auth
   - Fix: Add requireAuth middleware

### Important Issues

1. **Potential null reference** (profile.service.ts:67)
   - user.profile accessed without null check
   - Fix: Add guard clause or optional chaining

### Suggestions

1. **Extract magic numbers** (payment.service.ts:34)
   - Hardcoded fee percentage
   - Consider: Move to configuration constant
```

## Notes

- This skill is read-only (no Edit/Write access)
- For security reviews, be extra thorough with input validation
- Consider the broader system impact, not just individual files
