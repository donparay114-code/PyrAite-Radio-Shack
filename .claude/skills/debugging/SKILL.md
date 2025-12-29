---
name: debugging
description: Systematic debugging and troubleshooting including root cause analysis, logging strategies, and performance profiling
---

# Debugging Skill

You are a debugging expert with systematic approaches to finding and fixing bugs, analyzing logs, and optimizing performance.

## Core Capabilities

### Debugging Strategies
- **Reproduce First**: Consistently reproduce the issue
- **Isolate**: Narrow down the problem scope
- **Understand**: Read error messages and stack traces carefully
- **Hypothesize**: Form theories about the cause
- **Test**: Verify hypotheses systematically
- **Fix**: Implement minimal fix
- **Verify**: Confirm the fix resolves the issue

### Debugging Tools
- Python debugger (pdb, ipdb)
- Print debugging (strategic logging)
- Profilers (cProfile, line_profiler)
- Memory profilers (memory_profiler, tracemalloc)
- Log analysis tools

## Python Debugging Techniques

### Using pdb
```python
import pdb

def problematic_function(data):
    result = process(data)
    pdb.set_trace()  # Breakpoint here
    return transform(result)

# pdb commands:
# n (next) - Execute next line
# s (step) - Step into function
# c (continue) - Continue execution
# p variable - Print variable value
# l (list) - Show current code
# w (where) - Show stack trace
# q (quit) - Exit debugger
```

### Breakpoint (Python 3.7+)
```python
def process_items(items):
    for item in items:
        if item.is_problematic():
            breakpoint()  # Built-in breakpoint
        process(item)
```

### Strategic Logging
```python
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def complex_operation(data):
    logger.debug(f"Starting operation with {len(data)} items")

    try:
        result = process(data)
        logger.info(f"Operation completed: {len(result)} results")
        return result
    except Exception as e:
        logger.exception(f"Operation failed: {e}")
        raise
```

### Exception Debugging
```python
import traceback
import sys

def debug_exception():
    try:
        risky_operation()
    except Exception as e:
        # Get full exception info
        exc_type, exc_value, exc_tb = sys.exc_info()

        # Print formatted traceback
        print("".join(traceback.format_exception(exc_type, exc_value, exc_tb)))

        # Print local variables at exception point
        tb = exc_tb
        while tb.tb_next:
            tb = tb.tb_next
        print("Local variables:", tb.tb_frame.f_locals)
```

## Performance Profiling

### cProfile
```python
import cProfile
import pstats

# Profile a function
cProfile.run('my_function()', 'output.prof')

# Analyze results
stats = pstats.Stats('output.prof')
stats.sort_stats('cumulative')
stats.print_stats(10)  # Top 10 functions
```

### Line Profiler
```python
# Install: pip install line_profiler
# Decorate function:
@profile
def slow_function():
    ...

# Run: kernprof -l -v script.py
```

### Memory Profiling
```python
from memory_profiler import profile

@profile
def memory_heavy_function():
    large_list = [i ** 2 for i in range(1000000)]
    return sum(large_list)

# Run: python -m memory_profiler script.py
```

## Common Bug Patterns

### Off-by-One Errors
```python
# Bug: Missing last element
for i in range(len(items) - 1):
    process(items[i])

# Fix: Include all elements
for i in range(len(items)):
    process(items[i])

# Better: Use iteration directly
for item in items:
    process(item)
```

### Mutable Default Arguments
```python
# Bug: Shared mutable default
def add_item(item, items=[]):
    items.append(item)
    return items

# Fix: Use None as default
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

### Variable Scope Issues
```python
# Bug: Closure captures variable by reference
funcs = []
for i in range(3):
    funcs.append(lambda: i)
# All return 2!

# Fix: Capture value
funcs = []
for i in range(3):
    funcs.append(lambda i=i: i)
# Returns 0, 1, 2
```

## Root Cause Analysis Template

```markdown
## Issue Summary
[Brief description of the bug]

## Symptoms
- [Observable behavior 1]
- [Observable behavior 2]

## Environment
- Python version: X.Y.Z
- OS: [Operating System]
- Related dependencies: [versions]

## Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Investigation
- [What was checked]
- [What was ruled out]

## Root Cause
[Technical explanation of why the bug occurs]

## Fix
[Description of the fix]

## Prevention
[How to prevent similar bugs]
```

## Tools Usage
- Use Read to examine code and logs
- Use Grep to find error patterns
- Use Bash to run debugging tools
- Use Edit to implement fixes
