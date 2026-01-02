---
name: bug-hunter
description: Systematically debug issues by analyzing logs, stack traces, and code flow. Use when the user reports bugs, errors, crashes, or unexpected behavior, or mentions debugging, troubleshooting, or fixing issues.
---

# Bug Hunter

## Purpose
Systematically diagnose and fix bugs through methodical investigation and analysis.

## Instructions

### 1. Gather Information

**From the user**:
- What is the expected behavior?
- What actually happens?
- Steps to reproduce
- When did it start happening?
- What changed recently?

**From the system**:
- Error messages and stack traces
- Application logs
- Browser console errors (for web apps)
- System logs

### 2. Reproduce the Issue

- Follow the reproduction steps exactly
- Try to create a minimal test case
- Note any variations in behavior
- Check if it's consistent or intermittent

### 3. Form Hypotheses

Based on the evidence, consider:
- Recent code changes (check `git log`)
- Common bug patterns (null refs, race conditions, etc.)
- Environment-specific issues
- Dependency version conflicts

### 4. Investigate Systematically

**Code flow analysis**:
```
1. Start at the entry point (where error occurs)
2. Trace backwards to find root cause
3. Check inputs and state at each step
4. Identify where expectations diverge from reality
```

**Check common culprits**:
- Null/undefined values
- Off-by-one errors
- Async race conditions
- Type mismatches
- Scope issues
- Missing error handling

**Use debugging tools**:
- Add strategic console.log/print statements
- Use debugger breakpoints
- Check variable states
- Examine call stack

### 5. Test the Fix

- Verify the fix resolves the issue
- Check for side effects
- Run existing tests
- Add regression test

## Common Bug Patterns

### Null Reference Errors
```javascript
// Problem
user.profile.name  // crashes if profile is null

// Fix
user?.profile?.name  // optional chaining
// or
if (user && user.profile) { user.profile.name }
```

### Race Conditions
```javascript
// Problem
async function loadData() {
  this.loading = true
  const data = await fetch('/api/data')
  this.data = data  // might update after component unmounted
  this.loading = false
}

// Fix
async function loadData() {
  this.loading = true
  const data = await fetch('/api/data')
  if (this.mounted) {  // check still valid
    this.data = data
    this.loading = false
  }
}
```

### Off-by-One Errors
```python
# Problem
for i in range(len(items)):
    if items[i+1]:  # crashes on last item
        process(items[i+1])

# Fix
for i in range(len(items) - 1):
    if items[i+1]:
        process(items[i+1])
```

## Investigation Template

Use this structure for complex bugs:

```
## Bug Report
- **Description**: [what's wrong]
- **Expected**: [what should happen]
- **Actual**: [what does happen]
- **Reproduction**: [steps to reproduce]

## Investigation
- **Error message**: [full error text]
- **Stack trace**: [if available]
- **Recent changes**: [git log output]
- **Affected code**: [file:line]

## Hypothesis
[Your theory about root cause]

## Root Cause
[What you found after investigation]

## Fix
[What changes are needed]

## Testing
- [ ] Verified fix resolves issue
- [ ] No new errors introduced
- [ ] Existing tests pass
- [ ] Added regression test
```

## Tips

- Start with the error message/stack trace
- Read the code carefully - bugs are often obvious once you see them
- Check assumptions - print/log variable values
- Binary search: Comment out half the code to isolate the problem
- Check recently modified files first: `git diff HEAD~5`
- Look for patterns in when it fails vs succeeds
