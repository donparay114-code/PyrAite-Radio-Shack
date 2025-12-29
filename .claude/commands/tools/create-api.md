# Create API Endpoint

Generate a new API endpoint with proper structure, validation, and documentation.

## Usage
```
/tools:create-api <method> <path> <description>
```

## Examples
```
/tools:create-api POST /users Create a new user account
/tools:create-api GET /products/{id} Get product by ID
/tools:create-api PUT /orders/{id}/status Update order status
```

## What This Command Creates

1. **Route Handler**
   - FastAPI/Flask endpoint function
   - Request/response models
   - Input validation
   - Error handling

2. **Data Models**
   - Pydantic models for request body
   - Response models with proper typing
   - Validation rules

3. **Documentation**
   - OpenAPI docstrings
   - Example requests/responses
   - Error code documentation

4. **Tests**
   - Basic unit tests for the endpoint
   - Test for success case
   - Test for error cases

## Instructions for Claude

When this command is invoked:

1. Parse the method, path, and description from the arguments
2. Determine the appropriate file location based on project structure
3. Create the endpoint with:
   - Type-safe request/response models
   - Comprehensive input validation
   - Proper HTTP status codes
   - Error handling for common cases
   - Docstrings for OpenAPI documentation
4. Create corresponding test file
5. Update any route registration if needed
