---
name: commit-helper
description: Generates clear, conventional commit messages from git diffs. Use when the user wants to commit changes, needs help writing commit messages, or mentions commits, git, or version control.
---

# Commit Message Helper

## Purpose
Generate well-formatted commit messages that follow best practices and conventional commit standards.

## Instructions

1. **Check staged changes**:
   - Run `git diff --staged` to see what will be committed
   - If nothing is staged, check `git status` and `git diff` for unstaged changes

2. **Analyze the changes**:
   - Identify the type: feat, fix, docs, style, refactor, test, chore
   - Determine the scope (component/module affected)
   - Understand the impact and motivation

3. **Generate commit message format**:
   ```
   <type>(<scope>): <subject>

   <body>

   <footer>
   ```

4. **Follow these rules**:
   - Subject line: 50 characters max, no period, imperative mood
   - Body: Wrap at 72 characters, explain what and why (not how)
   - Footer: Reference issues (Fixes #123) or breaking changes

## Examples

### Feature Addition
```
feat(auth): add OAuth2 login support

Implement OAuth2 authentication flow for Google and GitHub providers.
Users can now sign in using their existing accounts, reducing friction
in the onboarding process.

Fixes #234
```

### Bug Fix
```
fix(api): handle null response in user endpoint

Add null check before accessing user.profile to prevent crashes
when profile data is missing. Returns default empty profile instead.

Fixes #456
```

### Refactoring
```
refactor(database): extract query builder to separate module

Move query building logic from controllers to dedicated QueryBuilder
class. Improves testability and reduces code duplication across
endpoints.
```

## Best Practices

- Use present tense: "add feature" not "added feature"
- Be specific: "fix login bug" → "fix OAuth redirect loop on login"
- Reference issues when applicable
- Break changes require "BREAKING CHANGE:" in footer
