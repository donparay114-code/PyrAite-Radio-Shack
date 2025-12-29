# Bug Fix Workflow

Start a structured bug fix process with investigation, root cause analysis, fix implementation, and regression testing.

## Usage
```
/workflows:bugfix <bug_description>
```

## Examples
```
/workflows:bugfix Users can't log in with email containing plus sign
/workflows:bugfix Order total calculation is incorrect for discounted items
/workflows:bugfix API returns 500 when product ID is not found
```

## Workflow Steps

### 1. Investigation Phase
- Reproduce the bug
- Gather error messages/logs
- Identify affected code
- Understand expected behavior

### 2. Root Cause Analysis
- Trace the code path
- Identify the exact failure point
- Understand why it fails
- Document findings

### 3. Fix Implementation
- Implement minimal fix
- Avoid changing unrelated code
- Add defensive checks
- Handle edge cases

### 4. Testing Phase
- Add test for the specific bug
- Verify fix resolves the issue
- Check for regressions
- Test related functionality

### 5. Documentation
- Document the fix
- Update any affected docs
- Add comments if complex

## Instructions for Claude

When this command is invoked:

1. **Understand the Bug**
   - Parse the bug description
   - Ask for reproduction steps if unclear
   - Identify symptoms vs root cause

2. **Investigate**
   - Search for related code
   - Trace the execution path
   - Look for similar patterns
   - Check test coverage

3. **Analyze Root Cause**
   - Document the exact failure
   - Understand why it happens
   - Consider edge cases

4. **Implement Fix**
   - Create minimal fix
   - Don't over-engineer
   - Add defensive code if needed
   - Follow existing patterns

5. **Verify**
   - Add regression test
   - Run full test suite
   - Verify fix works
   - Check for side effects
