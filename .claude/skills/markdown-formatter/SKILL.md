---
name: markdown-formatter
description: Use this skill for consistent markdown formatting - table generation, lists, code blocks, links, images, document structure, TOC creation, and frontmatter. Ensures professional documentation formatting.
allowed-tools: [Read, Write]
---

# Markdown Formatter

Consistent markdown formatting for documentation.

## Table Generation

```javascript
function createTable(headers, rows, alignment = []) {
  const alignSymbols = {
    left: ':--',
    center: ':-:',
    right: '--:'
  };

  const headerRow = '| ' + headers.join(' | ') + ' |';
  const separatorRow = '| ' + headers.map((_, i) =>
    alignSymbols[alignment[i]] || '---'
  ).join(' | ') + ' |';

  const dataRows = rows.map(row =>
    '| ' + row.join(' | ') + ' |'
  );

  return [headerRow, separatorRow, ...dataRows].join('\n');
}
```

## Lists

```javascript
function createOrderedList(items, indent = 0) {
  const prefix = '  '.repeat(indent);
  return items.map((item, i) => `${prefix}${i + 1}. ${item}`).join('\n');
}

function createUnorderedList(items, indent = 0, bullet = '-') {
  const prefix = '  '.repeat(indent);
  return items.map(item => `${prefix}${bullet} ${item}`).join('\n');
}

function createChecklist(items, checked = []) {
  return items.map((item, i) =>
    `- [${checked[i] ? 'x' : ' '}] ${item}`
  ).join('\n');
}
```

## Code Blocks

```javascript
function codeBlock(code, language = '', filename = '') {
  const label = filename ? `\`\`\`${language} // ${filename}` : `\`\`\`${language}`;
  return `${label}\n${code}\n\`\`\``;
}

function inlineCode(text) {
  return `\`${text}\``;
}
```

## When This Skill is Invoked

Use for documentation, reports, or any markdown content generation.
