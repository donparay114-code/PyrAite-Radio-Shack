---
name: git-workflow-enhanced
description: Enhanced Git workflow with branch management, PR templates, changelogs, and release management. Use when the user mentions Git operations, branches, pull requests, releases, or version control workflows.
---

# Git Workflow Enhanced

## Purpose
Streamline Git workflows with best practices, automated changelogs, PR templates, and release management.

## Branch Strategy

### GitFlow Model

```
main (production)
  ├── develop (integration)
  │   ├── feature/radio-broadcasting
  │   ├── feature/reputation-system
  │   └── feature/suno-integration
  ├── hotfix/critical-bug-fix
  └── release/v1.2.0
```

### Branch Naming Convention

```bash
# Features
feature/short-description
feature/add-dj-intros
feature/user-authentication

# Bugfixes
fix/short-description
fix/queue-priority-calculation
fix/suno-api-timeout

# Hotfixes
hotfix/critical-issue
hotfix/database-connection-leak

# Releases
release/v1.2.0
release/v2.0.0-beta
```

## Common Workflows

### Start New Feature

```bash
#!/bin/bash
# new_feature.sh

FEATURE_NAME=$1

if [ -z "$FEATURE_NAME" ]; then
  echo "Usage: ./new_feature.sh feature-name"
  exit 1
fi

# Update develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b "feature/${FEATURE_NAME}"

# Push to remote
git push -u origin "feature/${FEATURE_NAME}"

echo "✓ Feature branch created: feature/${FEATURE_NAME}"
echo "Start coding! When done, run: ./finish_feature.sh ${FEATURE_NAME}"
```

### Finish Feature

```bash
#!/bin/bash
# finish_feature.sh

FEATURE_NAME=$1

if [ -z "$FEATURE_NAME" ]; then
  CURRENT_BRANCH=$(git branch --show-current)
  FEATURE_NAME=${CURRENT_BRANCH#feature/}
fi

echo "Finishing feature: $FEATURE_NAME"

# Ensure on feature branch
git checkout "feature/${FEATURE_NAME}"

# Update from develop
git fetch origin
git merge origin/develop

# Run tests
npm test
if [ $? -ne 0 ]; then
  echo "✗ Tests failed. Fix before merging."
  exit 1
fi

# Push latest changes
git push origin "feature/${FEATURE_NAME}"

echo "✓ Feature ready for PR"
echo ""
echo "Next steps:"
echo "1. Create PR: feature/${FEATURE_NAME} → develop"
echo "2. Request code review"
echo "3. Merge after approval"
```

## Pull Request Templates

### PR Template (.github/pull_request_template.md)

```markdown
## Description
<!-- Brief description of changes -->

## Type of Change
- [ ] Feature (new functionality)
- [ ] Bugfix (fixes an issue)
- [ ] Hotfix (critical production fix)
- [ ] Refactor (code improvement, no behavior change)
- [ ] Documentation
- [ ] Performance improvement

## Related Issues
<!-- Link to issues: Fixes #123, Relates to #456 -->

## Changes Made
<!-- Detailed list of changes -->
-
-
-

## Testing
<!-- How was this tested? -->
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Tested on development environment

## Database Changes
- [ ] No database changes
- [ ] Migration files included
- [ ] Rollback script included

## Screenshots
<!-- If applicable, add screenshots -->

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No console.log or debug code
- [ ] Tests pass locally
- [ ] No merge conflicts

## Deployment Notes
<!-- Special deployment instructions, if any -->

## Rollback Plan
<!-- How to rollback if issues occur -->
```

### Create PR with Template

```bash
#!/bin/bash
# create_pr.sh

BRANCH=$(git branch --show-current)
BASE_BRANCH=${1:-develop}

# Push current branch
git push origin $BRANCH

# Create PR using gh CLI
gh pr create \
  --base $BASE_BRANCH \
  --head $BRANCH \
  --title "$(git log -1 --pretty=%s)" \
  --body-file .github/pull_request_template.md

echo "✓ PR created: $BRANCH → $BASE_BRANCH"
```

## Changelog Generation

### Auto-Generate Changelog

```bash
#!/bin/bash
# generate_changelog.sh

OUTPUT_FILE="CHANGELOG.md"
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

echo "Generating changelog..."

cat > $OUTPUT_FILE << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

EOF

# Get all tags
TAGS=$(git tag --sort=-v:refname)

for TAG in $TAGS; do
  echo "" >> $OUTPUT_FILE
  echo "## [$TAG] - $(git log -1 --format=%ai $TAG | cut -d' ' -f1)" >> $OUTPUT_FILE
  echo "" >> $OUTPUT_FILE

  # Get commits since previous tag
  PREVIOUS_TAG=$(git describe --tags --abbrev=0 $TAG^ 2>/dev/null || echo "")

  if [ -z "$PREVIOUS_TAG" ]; then
    RANGE="$TAG"
  else
    RANGE="$PREVIOUS_TAG..$TAG"
  fi

  # Categorize commits
  echo "### Added" >> $OUTPUT_FILE
  git log $RANGE --pretty=format:"- %s" --grep="^feat" >> $OUTPUT_FILE
  echo "" >> $OUTPUT_FILE
  echo "" >> $OUTPUT_FILE

  echo "### Fixed" >> $OUTPUT_FILE
  git log $RANGE --pretty=format:"- %s" --grep="^fix" >> $OUTPUT_FILE
  echo "" >> $OUTPUT_FILE
  echo "" >> $OUTPUT_FILE

  echo "### Changed" >> $OUTPUT_FILE
  git log $RANGE --pretty=format:"- %s" --grep="^refactor\|^chore" >> $OUTPUT_FILE
  echo "" >> $OUTPUT_FILE
done

echo "✓ Changelog generated: $OUTPUT_FILE"
```

## Release Management

### Create Release

```bash
#!/bin/bash
# create_release.sh

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./create_release.sh v1.2.0"
  exit 1
fi

echo "Creating release: $VERSION"

# Create release branch
git checkout develop
git pull origin develop
git checkout -b "release/$VERSION"

# Update version in package.json
npm version $VERSION --no-git-tag-version

# Generate changelog
./scripts/generate_changelog.sh

# Commit version bump
git add package.json CHANGELOG.md
git commit -m "chore: bump version to $VERSION"

# Push release branch
git push origin "release/$VERSION"

echo "✓ Release branch created: release/$VERSION"
echo ""
echo "Next steps:"
echo "1. Test thoroughly"
echo "2. Fix any issues"
echo "3. Run: ./finish_release.sh $VERSION"
```

### Finish Release

```bash
#!/bin/bash
# finish_release.sh

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./finish_release.sh v1.2.0"
  exit 1
fi

echo "Finishing release: $VERSION"

# Merge to main
git checkout main
git pull origin main
git merge --no-ff "release/$VERSION" -m "Release $VERSION"

# Tag release
git tag -a $VERSION -m "Release $VERSION"

# Merge back to develop
git checkout develop
git pull origin develop
git merge --no-ff "release/$VERSION" -m "Merge release $VERSION into develop"

# Push everything
git push origin main develop $VERSION

# Delete release branch
git branch -d "release/$VERSION"
git push origin --delete "release/$VERSION"

echo "✓ Release $VERSION completed"
echo ""
echo "Published:"
echo "- Tag: $VERSION"
echo "- Branch main updated"
echo "- Branch develop updated"
```

## Commit Message Standards

### Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only
- **style**: Code style (formatting, semicolons, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvement
- **test**: Adding tests
- **chore**: Maintenance tasks

**Examples:**

```bash
# Feature
git commit -m "feat(radio): add DJ intro generation"

# Bug fix
git commit -m "fix(queue): correct priority calculation formula"

# Breaking change
git commit -m "feat(api)!: change Suno API endpoint structure

BREAKING CHANGE: API endpoint structure changed from /generate to /v2/generate"
```

### Commit Message Template

```bash
# Set up git commit template
cat > ~/.gitmessage << 'EOF'
# <type>(<scope>): <subject>
# |<----  Using a Maximum Of 50 Characters  ---->|

# Explain why this change is being made
# |<----   Try To Limit Each Line to a Maximum Of 72 Characters   ---->|

# Provide links or keys to any relevant tickets, articles or other resources
# Example: Fixes #23

# --- COMMIT END ---
# Type can be
#    feat     (new feature)
#    fix      (bug fix)
#    refactor (refactoring code)
#    style    (formatting, missing semicolons, etc)
#    docs     (changes to documentation)
#    test     (adding or refactoring tests)
#    chore    (updating build tasks, etc)
# --------------------
# Remember to
#   - Use the imperative mood in the subject line
#   - Do not end the subject line with a period
#   - Separate subject from body with a blank line
#   - Capitalize the subject line and each paragraph
#   - Wrap lines at 72 characters
# --------------------
EOF

git config --global commit.template ~/.gitmessage
```

## Code Review Checklist

### .github/code_review_checklist.md

```markdown
# Code Review Checklist

## Functionality
- [ ] Changes match requirements
- [ ] Edge cases handled
- [ ] Error handling in place
- [ ] No hardcoded values

## Code Quality
- [ ] DRY principle followed
- [ ] Functions are focused and single-purpose
- [ ] Clear variable/function names
- [ ] Complex logic has comments
- [ ] No commented-out code

## Testing
- [ ] Unit tests added/updated
- [ ] Tests pass locally
- [ ] Coverage maintained or improved
- [ ] Manual testing completed

## Security
- [ ] No sensitive data exposed
- [ ] Input validation present
- [ ] SQL injection prevented
- [ ] XSS vulnerabilities addressed

## Performance
- [ ] No N+1 queries
- [ ] Efficient algorithms used
- [ ] No memory leaks
- [ ] Database indexes added if needed

## Database
- [ ] Migration files included
- [ ] Rollback script provided
- [ ] Foreign keys defined
- [ ] Indexes on lookup columns
```

## Git Hooks

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running pre-commit checks..."

# Run tests
npm test
if [ $? -ne 0 ]; then
  echo "✗ Tests failed. Commit aborted."
  exit 1
fi

# Check for console.log
if git diff --cached | grep -E "console\.(log|debug|info)"; then
  echo "✗ Found console.log statements. Remove before committing."
  exit 1
fi

# Check for merge conflict markers
if git diff --cached | grep -E "^(<<<<<<<|=======|>>>>>>>)"; then
  echo "✗ Found merge conflict markers. Resolve before committing."
  exit 1
fi

echo "✓ Pre-commit checks passed"
```

### Install Hooks

```bash
#!/bin/bash
# install_hooks.sh

cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "✓ Git hooks installed"
```

## Useful Aliases

```bash
# Add to ~/.gitconfig

[alias]
  # Short status
  st = status -sb

  # Pretty log
  lg = log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit

  # Undo last commit (keep changes)
  undo = reset HEAD~1 --soft

  # Amend last commit
  amend = commit --amend --no-edit

  # List branches sorted by last modified
  branches = branch --sort=-committerdate

  # Clean up merged branches
  cleanup = !git branch --merged | grep -v '\\*\\|main\\|develop' | xargs -n 1 git branch -d
```

## When to Use This Skill

- Creating feature branches
- Managing pull requests
- Generating changelogs
- Creating releases
- Writing commit messages
- Setting up git hooks
- Code review workflows
- Branch management
- Merge conflict resolution
- Version tagging
