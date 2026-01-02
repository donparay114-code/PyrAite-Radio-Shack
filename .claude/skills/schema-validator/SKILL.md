---
name: schema-validator
description: Use this skill to validate JSON data structures, API payloads, configuration files against schemas. Includes type checking, custom validation rules, and input sanitization for security.
allowed-tools: [Read]
---

# Schema Validator

Validate data structures and API payloads.

## JSON Schema Validation

```javascript
function validateJSON(data, schema) {
  const errors = [];

  function validate(value, schemaNode, path = '') {
    if (schemaNode.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== schemaNode.type) {
        errors.push(`${path}: Expected ${schemaNode.type}, got ${actualType}`);
        return;
      }
    }

    if (schemaNode.required) {
      schemaNode.required.forEach(field => {
        if (!(field in value)) {
          errors.push(`${path}: Missing required field "${field}"`);
        }
      });
    }

    if (schemaNode.properties) {
      Object.entries(schemaNode.properties).forEach(([key, propSchema]) => {
        if (key in value) {
          validate(value[key], propSchema, `${path}.${key}`);
        }
      });
    }

    if (schemaNode.items && Array.isArray(value)) {
      value.forEach((item, i) => {
        validate(item, schemaNode.items, `${path}[${i}]`);
      });
    }

    if (schemaNode.min !== undefined && value < schemaNode.min) {
      errors.push(`${path}: Value ${value} below minimum ${schemaNode.min}`);
    }

    if (schemaNode.max !== undefined && value > schemaNode.max) {
      errors.push(`${path}: Value ${value} above maximum ${schemaNode.max}`);
    }
  }

  validate(data, schema);

  return { valid: errors.length === 0, errors };
}
```

## Common Schemas

```javascript
const SCHEMAS = {
  webhook: {
    type: 'object',
    required: ['event', 'data'],
    properties: {
      event: { type: 'string' },
      data: { type: 'object' },
      timestamp: { type: 'number' }
    }
  },

  n8n_workflow: {
    type: 'object',
    required: ['name', 'nodes', 'connections'],
    properties: {
      name: { type: 'string' },
      nodes: { type: 'array' },
      connections: { type: 'object' }
    }
  }
};
```

## Input Sanitization

```javascript
function sanitizeInput(data, rules) {
  if (rules.trim && typeof data === 'string') {
    data = data.trim();
  }

  if (rules.maxLength && typeof data === 'string') {
    data = data.substring(0, rules.maxLength);
  }

  if (rules.removeHTML && typeof data === 'string') {
    data = data.replace(/<[^>]*>/g, '');
  }

  return data;
}
```

## When This Skill is Invoked

Use for API validation, configuration validation, or data quality checks.
