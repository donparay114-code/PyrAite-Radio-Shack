# Generate Documentation

Generate comprehensive documentation for a module, class, or the entire project.

## Usage
```
/tools:generate-docs [path] [type]
```

## Examples
```
/tools:generate-docs                          # Project README
/tools:generate-docs src/api/                 # API documentation
/tools:generate-docs src/models/user.py       # Module documentation
/tools:generate-docs src/services/ api        # API reference
```

## Documentation Types

- **readme** - Project overview and quick start
- **api** - API reference documentation
- **module** - Module/class documentation
- **guide** - User guide or tutorial

## What This Command Creates

1. **README Documentation**
   - Project overview
   - Installation instructions
   - Quick start guide
   - Configuration options
   - Usage examples

2. **API Documentation**
   - Endpoint listings
   - Request/response formats
   - Authentication details
   - Error codes

3. **Module Documentation**
   - Class/function descriptions
   - Parameters and return values
   - Usage examples
   - Related modules

## Instructions for Claude

When this command is invoked:

1. Determine the scope (project, directory, or file)
2. Read and analyze the relevant code
3. Generate appropriate documentation:
   - For projects: README with overview, install, usage
   - For APIs: Endpoint documentation with examples
   - For modules: Docstrings and API reference
4. Use clear, concise language
5. Include code examples
6. Add navigation/links where appropriate
7. Create or update the documentation file
