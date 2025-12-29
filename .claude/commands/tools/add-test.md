# Add Tests

Generate comprehensive tests for a specified function, class, or module.

## Usage
```
/tools:add-test <file_path> [function_or_class_name]
```

## Examples
```
/tools:add-test src/utils/helpers.py
/tools:add-test src/services/user_service.py UserService
/tools:add-test src/models/order.py calculate_total
```

## What This Command Creates

1. **Test File**
   - Creates test file in tests/ directory
   - Mirrors source file structure
   - Follows naming convention test_<filename>.py

2. **Test Cases**
   - Happy path tests
   - Edge case tests
   - Error condition tests
   - Boundary tests

3. **Fixtures**
   - Sample data fixtures
   - Mock objects for dependencies
   - Setup/teardown as needed

## Instructions for Claude

When this command is invoked:

1. Read the specified source file
2. Identify the function/class to test (or all if not specified)
3. Analyze the code to understand:
   - Input parameters and types
   - Return values
   - Side effects
   - Error conditions
4. Generate comprehensive tests:
   - Use pytest framework
   - Follow AAA pattern (Arrange, Act, Assert)
   - Include parametrized tests for multiple inputs
   - Mock external dependencies
5. Create or update the test file
6. Run the tests to verify they pass
