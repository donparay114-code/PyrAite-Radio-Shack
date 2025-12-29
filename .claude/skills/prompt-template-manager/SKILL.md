---
name: prompt-template-manager
description: Use this skill for managing prompt templates - Jinja2-style rendering, variable substitution, conditional sections, template versioning, validation, and library management. Essential for prompt engineering and content generation.
allowed-tools: [Read, Write]
---

# Prompt Template Manager

Template rendering and management system for prompts and content.

## Template Syntax

```jinja2
# Basic variable substitution
Hello {{name}}!

# Conditional sections
{% if premium %}
Premium features enabled
{% endif %}

# Loops
{% for item in items %}
- {{item}}
{% endfor %}

# Filters
{{name | uppercase}}
{{description | truncate(100)}}
```

## Template Rendering

```javascript
function renderTemplate(template, variables) {
  let result = template;

  // Variable substitution
  result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? variables[varName] : match;
  });

  // Conditionals
  result = result.replace(/\{% if (\w+) %\}([\s\S]*?)\{% endif %\}/g,
    (match, condition, content) => {
      return variables[condition] ? content : '';
    }
  );

  // Loops
  result = result.replace(/\{% for (\w+) in (\w+) %\}([\s\S]*?)\{% endfor %\}/g,
    (match, itemVar, arrayVar, content) => {
      const array = variables[arrayVar] || [];
      return array.map(item => {
        return content.replace(new RegExp(`\\{\\{${itemVar}\\}\\}`, 'g'), item);
      }).join('');
    }
  );

  return result.trim();
}
```

## Common Templates

### Video Generation Prompt
```jinja2
SCENE: {{subject}} {{action}} in {{setting}}
CAMERA: {{camera_type}}, {{movement}}
{% if lighting %}
LIGHTING: {{lighting}}
{% endif %}
STYLE: {{style}}
DURATION: {{duration}}
```

### Social Media Post
```jinja2
{{hook}}

{{main_content}}

{% if cta %}
{{cta}}
{% endif %}

{% for tag in hashtags %}
#{{tag}}{% endfor %}
```

## Template Validation

```javascript
function validateTemplate(template) {
  const errors = [];

  // Check for unclosed tags
  const ifCount = (template.match(/\{% if/g) || []).length;
  const endifCount = (template.match(/\{% endif %\}/g) || []).length;
  if (ifCount !== endifCount) {
    errors.push('Unclosed {% if %} tag');
  }

  // Check for undefined variables (optional)
  const vars = template.match(/\{\{(\w+)\}\}/g) || [];

  return {
    valid: errors.length === 0,
    errors,
    variables: [...new Set(vars.map(v => v.replace(/[{}]/g, '')))]
  };
}
```

## When This Skill is Invoked

Use for prompt engineering, content templates, or any template rendering needs.
