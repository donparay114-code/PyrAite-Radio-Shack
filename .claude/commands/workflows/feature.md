# Feature Development Workflow

Start a structured feature development process with planning, implementation, testing, and documentation.

## Usage
```
/workflows:feature <feature_description>
```

## Examples
```
/workflows:feature Add user authentication with JWT tokens
/workflows:feature Implement product search with filters
/workflows:feature Create order processing pipeline
```

## Workflow Steps

### 1. Planning Phase
- Understand requirements
- Identify affected files
- Design approach
- Create task breakdown

### 2. Implementation Phase
- Create/modify source files
- Follow existing patterns
- Add type hints
- Handle errors properly

### 3. Testing Phase
- Write unit tests
- Add integration tests
- Verify edge cases
- Run test suite

### 4. Documentation Phase
- Update docstrings
- Update README if needed
- Add usage examples
- Document configuration

### 5. Review Phase
- Run linters
- Check type safety
- Security review
- Final verification

## Instructions for Claude

When this command is invoked:

1. **Understand the Feature**
   - Parse the feature description
   - Ask clarifying questions if needed
   - Identify scope and boundaries

2. **Plan the Implementation**
   - Create a todo list with specific tasks
   - Identify files to create/modify
   - Consider dependencies and order

3. **Implement Step by Step**
   - Follow the task list
   - Make incremental changes
   - Run tests after each step
   - Commit logically

4. **Ensure Quality**
   - Run all tests
   - Check linting
   - Verify type hints
   - Review for security issues

5. **Document Changes**
   - Update relevant documentation
   - Add inline comments where needed
   - Update changelog if applicable
