# Refactoring Workflow

Start a structured refactoring process to improve code quality without changing behavior.

## Usage
```
/workflows:refactor <target> [goal]
```

## Examples
```
/workflows:refactor src/services/user_service.py reduce complexity
/workflows:refactor src/api/ improve consistency
/workflows:refactor src/utils/helpers.py add type hints
```

## Workflow Steps

### 1. Assessment Phase
- Analyze current code
- Identify code smells
- Check test coverage
- Define refactoring goals

### 2. Planning Phase
- List specific changes
- Order by dependency
- Ensure tests exist
- Create backup point

### 3. Refactoring Phase
- Make small changes
- Run tests after each
- Commit frequently
- Keep behavior identical

### 4. Verification Phase
- Run full test suite
- Check all tests pass
- Verify functionality
- Review changes

### 5. Documentation Phase
- Update docstrings
- Add missing comments
- Update any docs

## Common Refactoring Goals

- **reduce complexity** - Simplify complex functions
- **add type hints** - Add comprehensive typing
- **improve naming** - Better variable/function names
- **extract methods** - Break down large functions
- **remove duplication** - DRY up repeated code
- **improve testability** - Make code easier to test

## Instructions for Claude

When this command is invoked:

1. **Assess Current State**
   - Read the target file(s)
   - Identify code smells
   - Check existing tests
   - Understand the goal

2. **Plan Changes**
   - Create specific task list
   - Order by dependency
   - Identify risky changes

3. **Execute Refactoring**
   - Make one change at a time
   - Run tests after each change
   - Commit after each successful step
   - Never change behavior

4. **Verify Results**
   - All tests must pass
   - Behavior must be identical
   - Code should be improved

5. **Clean Up**
   - Remove dead code
   - Update documentation
   - Final review
