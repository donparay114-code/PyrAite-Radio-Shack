# Code Review Workflow

Perform a comprehensive code review on specified files or recent changes.

## Usage
```
/workflows:review [target]
```

## Examples
```
/workflows:review                           # Review uncommitted changes
/workflows:review src/api/users.py          # Review specific file
/workflows:review src/services/             # Review directory
/workflows:review HEAD~3..HEAD              # Review recent commits
```

## Review Categories

### 1. Security Review
- Hardcoded secrets
- SQL injection
- XSS vulnerabilities
- Authentication issues
- Authorization flaws

### 2. Code Quality Review
- Code style violations
- Anti-patterns
- Code duplication
- Complexity issues
- Naming conventions

### 3. Performance Review
- N+1 queries
- Inefficient algorithms
- Memory issues
- Unnecessary operations

### 4. Testing Review
- Test coverage
- Test quality
- Missing edge cases
- Flaky tests

### 5. Documentation Review
- Missing docstrings
- Outdated comments
- API documentation

## Review Output Format

```markdown
## Code Review Summary

### Critical Issues
- [Issue description with file:line]

### Improvements Suggested
- [Suggestion with explanation]

### Positive Observations
- [Good patterns noticed]

### Action Items
- [ ] [Specific action to take]
```

## Instructions for Claude

When this command is invoked:

1. **Determine Scope**
   - If no target, review uncommitted changes
   - If file/directory, review those files
   - If git range, review those commits

2. **Read the Code**
   - Get all relevant files
   - Understand the context
   - Note the purpose

3. **Perform Review**
   - Check security issues
   - Evaluate code quality
   - Assess performance
   - Review test coverage
   - Check documentation

4. **Generate Report**
   - Organize by severity
   - Provide specific locations
   - Explain the "why"
   - Suggest fixes

5. **Offer Assistance**
   - Offer to fix critical issues
   - Suggest improvements
   - Provide examples
