---
name: philosophical-content
description: Manage the Philosophical Content Generator system with MySQL database and n8n workflows. Use when the user mentions philosophers, philosophical problems, pain points, metaphors, scenarios, philosophical content, or content generation.
---

# Philosophical Content Generator Manager

## Purpose
Manage the philosophical content generation system including database schema, n8n workflows, and content creation.

## System Overview

The philosophical content system generates content by:
1. Selecting a random philosopher from database
2. Finding related pain points using JSON overlap matching
3. Conditionally selecting metaphors (if philosopher uses metaphorical thinking)
4. Selecting contemporary scenarios
5. Generating calls to action
6. Combining all elements into cohesive content

## Database Schema

### Core Tables

**philosophers**
- Philosopher profiles with thinking styles
- `uses_metaphorical_thinking` boolean flag
- `philosophical_problems` JSON array

**pain_points**
- User pain points and challenges
- `philosophical_problems` JSON array for matching
- Multiple fields for different aspects

**metaphors**
- Metaphorical frameworks and examples
- Only used when `uses_metaphorical_thinking = true`
- `philosophical_problems` JSON array for matching

**contemporary_scenarios**
- Modern real-world scenarios
- `philosophical_problems` JSON array for matching

**calls_to_action**
- Action items and next steps
- `philosophical_problems` JSON array for matching

## SQL File Locations

```
C:\Users\Jesse\.gemini\antigravity\
├── 00_initial_setup.sql
├── 01_philosophical_problems_foundation.sql
├── 02_philosopher_database_enhancement.sql
├── 03_context_library_structure.sql
├── 04_data_pain_points.sql
├── 04_data_pain_points_simple.sql
├── 05_data_metaphors_scenarios.sql
├── 06_calls_to_action_FIXED.sql
├── 06_data_calls_to_action.sql
├── 07_add_metaphor_conditions.sql
├── 07_expand_pain_points.sql
├── 07_expand_pain_points_FIXED.sql
├── 07_fix_updates.sql
├── 08_expand_metaphors_scenarios.sql
├── 08_expand_metaphors_scenarios_FIXED.sql
├── 09_expand_philosophers_to_100.sql
└── philosopher_system_complete.sql
```

## N8N Workflow Files

```
C:\Users\Jesse\.gemini\antigravity\
├── n8n_philosophical_content_workflow.json
├── n8n_philosophical_content_workflow_v2.json
└── n8n_complete_workflow.json
```

## Key Concepts

### JSON Overlap Matching

The system uses MySQL's `JSON_OVERLAPS()` function to match content:

```sql
-- Find pain points matching philosopher's problems
SELECT * FROM pain_points
WHERE JSON_OVERLAPS(
  philosophical_problems,
  '["epistemology", "metaphysics"]'
)
ORDER BY RAND()
LIMIT 1;
```

This ensures thematic consistency across generated content.

### Conditional Metaphor Selection

```sql
-- In n8n workflow
IF philosopher.uses_metaphorical_thinking = true THEN
  SELECT * FROM metaphors WHERE JSON_OVERLAPS(...)
ELSE
  SELECT * FROM contemporary_scenarios WHERE JSON_OVERLAPS(...)
END IF
```

Respects each philosopher's thinking style.

## Workflow Structure (V2)

### Nodes in Order

1. **Manual Trigger** - Start workflow
2. **Select Philosopher** - Random philosopher from database
3. **Select Pain Point** - Matching pain point via JSON overlap
4. **Check Metaphorical** - IF node checking `uses_metaphorical_thinking`
5. **Select Metaphor** - (If true) Get matching metaphor
6. **Select Scenario** - (If false) Get matching scenario
7. **Select Call to Action** - Get matching CTA
8. **Assemble Content** - Combine all elements
9. **Output/Save** - Return or store generated content

## Common Queries

### View Random Philosopher

```sql
SELECT
  name,
  core_ideas,
  uses_metaphorical_thinking,
  philosophical_problems
FROM philosophers
ORDER BY RAND()
LIMIT 1;
```

### Find Matching Pain Points

```sql
-- For a specific philosopher
SELECT pp.title, pp.description, pp.philosophical_problems
FROM pain_points pp
WHERE JSON_OVERLAPS(
  pp.philosophical_problems,
  (SELECT philosophical_problems FROM philosophers WHERE id = 1)
)
LIMIT 5;
```

### Check Metaphorical Philosophers

```sql
SELECT
  name,
  uses_metaphorical_thinking,
  philosophical_problems
FROM philosophers
WHERE uses_metaphorical_thinking = TRUE;
```

### View Content Relationships

```sql
-- See how many items match each problem
SELECT
  problem,
  (SELECT COUNT(*) FROM philosophers WHERE JSON_CONTAINS(philosophical_problems, JSON_QUOTE(problem))) as philosophers_count,
  (SELECT COUNT(*) FROM pain_points WHERE JSON_CONTAINS(philosophical_problems, JSON_QUOTE(problem))) as pain_points_count,
  (SELECT COUNT(*) FROM metaphors WHERE JSON_CONTAINS(philosophical_problems, JSON_QUOTE(problem))) as metaphors_count
FROM (
  SELECT 'epistemology' as problem UNION
  SELECT 'ethics' UNION
  SELECT 'metaphysics' UNION
  SELECT 'logic' UNION
  SELECT 'aesthetics'
) problems;
```

## Setup and Initialization

### Initial Database Setup

```bash
# Connect to MySQL
mysql -u root -p

# Run setup scripts in order
mysql -u root -p < 00_initial_setup.sql
mysql -u root -p < 01_philosophical_problems_foundation.sql
mysql -u root -p < 02_philosopher_database_enhancement.sql
# ... continue with other scripts
```

### Import N8N Workflow

1. Open n8n (http://localhost:5678)
2. Import `n8n_philosophical_content_workflow_v2.json`
3. Configure MySQL credentials
4. Test with manual trigger
5. Activate workflow

## Troubleshooting

### Issue: No Matching Pain Points

**Cause**: Philosopher's philosophical_problems don't overlap with any pain points

**Fix:**
```sql
-- Check philosopher's problems
SELECT name, philosophical_problems FROM philosophers WHERE id = X;

-- Check available pain point problems
SELECT DISTINCT philosophical_problems FROM pain_points;

-- Add matching problems to pain point
UPDATE pain_points
SET philosophical_problems = JSON_ARRAY_APPEND(
  philosophical_problems,
  '$',
  'new_problem'
)
WHERE id = Y;
```

### Issue: Workflow Returns Empty Results

**Debug:**
1. Check each node's output in n8n
2. Verify JSON_OVERLAPS is working
3. Check database has data

```sql
-- Verify data exists
SELECT COUNT(*) FROM philosophers;
SELECT COUNT(*) FROM pain_points;
SELECT COUNT(*) FROM metaphors;
SELECT COUNT(*) FROM contemporary_scenarios;
SELECT COUNT(*) FROM calls_to_action;
```

### Issue: JSON_OVERLAPS Not Working

**Requirement**: MySQL 8.0.17+

**Check version:**
```sql
SELECT VERSION();
```

**Alternative for older MySQL:**
```sql
-- Use JSON_CONTAINS instead
SELECT * FROM pain_points pp
WHERE EXISTS (
  SELECT 1
  FROM JSON_TABLE(
    pp.philosophical_problems,
    '$[*]' COLUMNS (problem VARCHAR(100) PATH '$')
  ) jt
  WHERE JSON_CONTAINS(
    (SELECT philosophical_problems FROM philosophers WHERE id = X),
    JSON_QUOTE(jt.problem)
  )
);
```

## Content Expansion

### Adding New Philosophers

```sql
INSERT INTO philosophers (
  name,
  core_ideas,
  key_quotes,
  uses_metaphorical_thinking,
  philosophical_problems
) VALUES (
  'Philosopher Name',
  'Core philosophical ideas...',
  'Famous quote...',
  TRUE,  -- or FALSE
  JSON_ARRAY('epistemology', 'ethics')
);
```

### Adding New Pain Points

```sql
INSERT INTO pain_points (
  title,
  description,
  emotional_impact,
  philosophical_problems
) VALUES (
  'Pain Point Title',
  'Detailed description...',
  'How it affects people emotionally...',
  JSON_ARRAY('ethics', 'existentialism')
);
```

### Adding New Metaphors

```sql
INSERT INTO metaphors (
  title,
  metaphor_text,
  explanation,
  philosophical_problems
) VALUES (
  'Metaphor Title',
  'The metaphorical description...',
  'What this metaphor means...',
  JSON_ARRAY('metaphysics', 'epistemology')
);
```

## Documentation Files

### Implementation Guides

```
C:\Users\Jesse\.gemini\antigravity\
├── COMPLETE_IMPLEMENTATION_GUIDE.md
├── COMPLETE_SETUP_GUIDE.md
├── CONDITIONAL_METAPHOR_SUMMARY.md
├── N8N_CONDITIONAL_METAPHOR_WORKFLOW.md
├── N8N_SETUP_GUIDE.md
└── README_MIGRATION_GUIDE.md
```

## Data Quality

### Check for Missing Matches

```sql
-- Philosophers with no matching pain points
SELECT p.name, p.philosophical_problems
FROM philosophers p
WHERE NOT EXISTS (
  SELECT 1 FROM pain_points pp
  WHERE JSON_OVERLAPS(pp.philosophical_problems, p.philosophical_problems)
);

-- Pain points with no matching philosophers
SELECT pp.title, pp.philosophical_problems
FROM pain_points pp
WHERE NOT EXISTS (
  SELECT 1 FROM philosophers p
  WHERE JSON_OVERLAPS(p.philosophical_problems, pp.philosophical_problems)
);
```

### Validate JSON Arrays

```sql
-- Check for invalid JSON
SELECT id, name FROM philosophers
WHERE JSON_VALID(philosophical_problems) = 0;

SELECT id, title FROM pain_points
WHERE JSON_VALID(philosophical_problems) = 0;
```

## Content Generation Patterns

### Typical Output Structure

```
Philosopher: [Name]
Core Ideas: [Summary]

Pain Point: [Title]
Description: [Details]

[If metaphorical thinker]
Metaphor: [Title]
Explanation: [How it relates]

[If not metaphorical]
Contemporary Scenario: [Title]
Example: [Modern application]

Call to Action: [Title]
Next Steps: [Actionable items]
```

## Best Practices

1. **Maintain thematic consistency**: Ensure philosophical_problems arrays overlap
2. **Balance content**: Keep similar numbers of each content type
3. **Quality over quantity**: Well-written content > more content
4. **Test matches**: Verify JSON_OVERLAPS returns results
5. **Version control**: Keep SQL files in git
6. **Backup regularly**: Export database before major changes

## Utilities

### Batch Update Philosophical Problems

```sql
-- Add a problem to all relevant philosophers
UPDATE philosophers
SET philosophical_problems = JSON_ARRAY_APPEND(
  philosophical_problems,
  '$',
  'new_problem'
)
WHERE core_ideas LIKE '%keyword%';
```

### Generate Statistics

```sql
SELECT
  'Philosophers' as table_name,
  COUNT(*) as total,
  SUM(uses_metaphorical_thinking) as metaphorical_count
FROM philosophers
UNION ALL
SELECT
  'Pain Points',
  COUNT(*),
  NULL
FROM pain_points
UNION ALL
SELECT
  'Metaphors',
  COUNT(*),
  NULL
FROM metaphors;
```

## When to Use This Skill

- Working with philosophical content database
- Managing philosophical content workflows
- Adding new philosophers, pain points, or metaphors
- Troubleshooting JSON overlap matching
- Understanding content generation logic
- Setting up or updating the philosophical system
- Querying philosophical content
- Expanding the content library
