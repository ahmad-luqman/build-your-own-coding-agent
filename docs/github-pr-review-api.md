# GitHub PR Review API Guide

How to programmatically create PR reviews and resolve review comments using the GitHub API via `gh` CLI.

## Creating a PR Review

### Method 1: Simple Review with Summary Only

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews \
  --method POST \
  -f commit_id="<commit_sha>" \
  -f event="COMMENT" \
  -f body="## Review Summary

Your review content here..."
```

### Method 2: Review with Inline Comments (JSON file)

For reviews with line-specific comments, use a JSON file:

```json
{
  "commit_id": "<commit_sha>",
  "event": "COMMENT",
  "body": "## PR Review Summary\n\nYour summary here...",
  "comments": [
    {
      "path": "path/to/file.ts",
      "line": 99,
      "body": "Your comment on this specific line"
    },
    {
      "path": "path/to/another-file.tsx",
      "line": 42,
      "body": "Another inline comment"
    }
  ]
}
```

Then post it:

```bash
cat review.json | gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews \
  --method POST --input -
```

### Important Notes on Line Numbers

- **New files**: All lines are valid (the entire file is in the diff)
- **Modified files**: Only lines within diff hunks are valid
- If you specify a line not in the diff, you'll get: `"Line could not be resolved"`

### Review Events

| Event | Description |
|-------|-------------|
| `COMMENT` | Submit general feedback without approval |
| `APPROVE` | Approve the PR |
| `REQUEST_CHANGES` | Request changes before merge |

### Getting the Commit SHA

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number} --jq '.head.sha'
```

## Resolving Review Comments

Review comments create "threads" that can be resolved. Use the GraphQL API for this.

### Step 1: Get Thread IDs

```bash
gh api graphql -f query='
query {
  repository(owner: "{owner}", name: "{repo}") {
    pullRequest(number: {pr_number}) {
      reviewThreads(first: 20) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes {
              body
              path
            }
          }
        }
      }
    }
  }
}'
```

This returns thread IDs like `PRRT_kwDOQ1zG-s5rXjTg`.

### Step 2: Resolve a Thread

```bash
gh api graphql -f query='
mutation {
  resolveReviewThread(input: {threadId: "PRRT_kwDOQ1zG-s5rXjTg"}) {
    thread { isResolved }
  }
}'
```

### Step 3: Unresolve a Thread (if needed)

```bash
gh api graphql -f query='
mutation {
  unresolveReviewThread(input: {threadId: "PRRT_kwDOQ1zG-s5rXjTg"}) {
    thread { isResolved }
  }
}'
```

## Quick One-Shot Template

Copy-paste template for posting a PR review with inline comments:

```bash
# Set PR number
PR_NUM=372

# Get commit SHA
COMMIT_SHA=$(gh api repos/elegsys/atlas/pulls/$PR_NUM --jq '.head.sha')

# Create and post review (use 'EOF' with single quotes to prevent shell expansion)
# Note: $COMMIT_SHA must be interpolated separately since we're using quoted heredoc
cat > /tmp/pr-review.json << EOF
{
  "commit_id": "$COMMIT_SHA",
  "event": "COMMENT",
  "body": "## Review Summary\n\nYour summary here...",
  "comments": [
    {
      "path": "path/to/file.tsx",
      "line": 42,
      "body": "**[Suggestion]** Your inline comment here"
    }
  ]
}
EOF
# Alternative: If comment bodies contain backticks, use a temp file with hardcoded commit SHA

cat /tmp/pr-review.json | gh api repos/elegsys/atlas/pulls/$PR_NUM/reviews \
  --method POST --input -
```

**Key points:**
- Use `COMMENT` event for your own PRs (cannot `APPROVE` your own)
- For new files, all line numbers are valid
- For modified files, line must be in a diff hunk
- Comments array is optional - omit for summary-only reviews

---

## Complete Example

### 1. Create Review

```bash
# Get commit SHA
COMMIT_SHA=$(gh api repos/elegsys/atlas/pulls/370 --jq '.head.sha')

# Create review with inline comments
cat > /tmp/review.json << 'EOF'
{
  "commit_id": "d86c39819e3c939939962751562fba39716b99e9",
  "event": "COMMENT",
  "body": "## Review Summary\n\n- Issue 1: Missing error handling\n- Issue 2: Type safety concern",
  "comments": [
    {
      "path": "frontend/hooks/useAutosave.ts",
      "line": 99,
      "body": "**[Important]** Add error logging here for debugging."
    }
  ]
}
EOF

cat /tmp/review.json | gh api repos/elegsys/atlas/pulls/370/reviews \
  --method POST --input -
```

### 2. Resolve All Comments After Fixing

```bash
# Get all unresolved thread IDs
THREADS=$(gh api graphql -f query='
query {
  repository(owner: "elegsys", name: "atlas") {
    pullRequest(number: 370) {
      reviewThreads(first: 50) {
        nodes {
          id
          isResolved
        }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | .id')

# Resolve each thread
for THREAD_ID in $THREADS; do
  gh api graphql -f query="
  mutation {
    resolveReviewThread(input: {threadId: \"$THREAD_ID\"}) {
      thread { isResolved }
    }
  }"
done
```

## Troubleshooting

### "Can not approve your own pull request"

You cannot use `APPROVE` or `REQUEST_CHANGES` events on your own PR. Use `COMMENT` instead:

```json
{
  "event": "COMMENT",  // Not "APPROVE" for your own PRs
  "body": "## Review Summary\n\n**Ready to Merge** ..."
}
```

### "Line could not be resolved"

The line number must be within a diff hunk. Check which lines are in the diff:

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/files \
  --jq '.[] | select(.filename=="path/to/file.ts") | .patch'
```

### "Problems parsing JSON" with Heredocs

When using heredocs to create JSON, shell variable expansion can break the JSON:

```bash
# ❌ WRONG - Variables like $COMMIT_SHA expand, backticks cause issues
cat > /tmp/review.json << EOF
{
  "body": "Check `this_function` for issues"
}
EOF

# ✅ CORRECT - Single quotes prevent all expansion
cat > /tmp/review.json << 'EOF'
{
  "body": "Check `this_function` for issues"
}
EOF
```

**Key**: Use `<< 'EOF'` (with single quotes) to prevent shell expansion of backticks, `$variables`, and special characters in your JSON.

### "No subschema in oneOf matched"

For individual comments (not part of a review), use different parameters:

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments \
  --method POST \
  -f commit_id="<sha>" \
  -f path="file.ts" \
  -F position=5 \
  -f body="Comment"
```

Note: `position` is the line number in the diff (not the file), starting from 1.

## References

- [Create a review](https://docs.github.com/en/rest/pulls/reviews#create-a-review-for-a-pull-request)
- [Create a review comment](https://docs.github.com/en/rest/pulls/comments#create-a-review-comment-for-a-pull-request)
- [GraphQL: resolveReviewThread](https://docs.github.com/en/graphql/reference/mutations#resolvereviewthread)
