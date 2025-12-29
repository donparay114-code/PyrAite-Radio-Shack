---
name: data-visualizer
description: Use this skill to generate ASCII charts, graphs, and visual representations of data for reports and dashboards. Creates bar charts, line graphs, and tables.
allowed-tools: [Read]
---

# Data Visualizer

Generate charts and visual representations of data.

## ASCII Bar Chart

```javascript
function createBarChart(data, options = {}) {
  const { maxWidth = 50, label = true } = options;
  const maxValue = Math.max(...data.map(d => d.value));

  return data.map(item => {
    const barLength = Math.round((item.value / maxValue) * maxWidth);
    const bar = '█'.repeat(barLength);
    const labelText = label ? `${item.name}: ` : '';

    return `${labelText}${bar} ${item.value}`;
  }).join('\n');
}

// Example:
// Sales:    ██████████████████████ 85
// Marketing: ████████████████ 62
// Dev:      ██████████████████████████████ 120
```

## ASCII Line Graph

```javascript
function createLineGraph(data, height = 10) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  const rows = [];
  for (let y = height; y >= 0; y--) {
    let row = '';
    const threshold = min + (range * y / height);

    data.forEach(value => {
      row += value >= threshold ? '█' : ' ';
    });

    rows.push(row);
  }

  return rows.join('\n');
}
```

## When This Skill is Invoked

Use for reports, dashboards, or data visualization in text format.
