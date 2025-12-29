---
name: git-operations-helper
description: Use this skill for git operations - commit history analysis, parsing conventional commits, tagging/versioning, generating diffs, calculating next version from commits. Essential for changelog and release automation.
allowed-tools: [Bash, Read]
---

# Git Operations Helper

Common git operations for documentation and version control.

## Commit History

```bash
# Get commits since tag/date
git log v1.0.0..HEAD --oneline

# Parse conventional commits
git log --format="%s" | grep -E "^(feat|fix|docs|style|refactor|perf|test|chore)"
```

## Conventional Commits Parsing

```javascript
function parseConventionalCommit(message) {
  const regex = /^(feat|fix|docs|style|refactor|perf|test|chore)(\((\w+)\))?:(.+)/;
  const match = message.match(regex);

  if (!match) return null;

  return {
    type: match[1],
    scope: match[3] || null,
    description: match[4].trim(),
    breaking: message.includes('BREAKING CHANGE')
  };
}

function groupCommitsByType(commits) {
  const groups = {};

  commits.forEach(commit => {
    const parsed = parseConventionalCommit(commit);
    if (parsed) {
      if (!groups[parsed.type]) groups[parsed.type] = [];
      groups[parsed.type].push(parsed);
    }
  });

  return groups;
}
```

## Semantic Versioning

```bash
# Get latest tag
git describe --tags --abbrev=0

# Create new tag
git tag -a v1.2.3 -m "Release 1.2.3"
```

```javascript
function calculateNextVersion(commits, currentVersion) {
  let [major, minor, patch] = currentVersion.split('.').map(Number);

  const hasBreaking = commits.some(c => c.includes('BREAKING CHANGE'));
  const hasFeat = commits.some(c => c.startsWith('feat'));
  const hasFix = commits.some(c => c.startsWith('fix'));

  if (hasBreaking) {
    major++;
    minor = 0;
    patch = 0;
  } else if (hasFeat) {
    minor++;
    patch = 0;
  } else if (hasFix) {
    patch++;
  }

  return `${major}.${minor}.${patch}`;
}
```

## When This Skill is Invoked

Use for changelog generation, release automation, or version management.
