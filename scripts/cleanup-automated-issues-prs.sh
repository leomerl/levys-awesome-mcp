#!/bin/bash

# Script to close and delete automated issues and PRs
# Only closes/deletes items created by app/claude or claude[bot]

set -e

echo "🔍 Finding automated issues created by Claude..."

# Get all open issues created by app/claude
AUTOMATED_ISSUES=$(gh issue list --state open --json number,title,author --jq '.[] | select(.author.login == "app/claude") | .number')

if [ -z "$AUTOMATED_ISSUES" ]; then
  echo "✅ No automated issues found"
else
  echo "Found $(echo "$AUTOMATED_ISSUES" | wc -l) automated issue(s)"

  for issue_num in $AUTOMATED_ISSUES; do
    echo "  Closing issue #$issue_num"
    gh issue close $issue_num --comment "Closed by automated cleanup script"
  done
fi

echo ""
echo "🔍 Finding automated PRs created by Claude..."

# Get all open PRs created by app/claude or claude[bot]
AUTOMATED_PRS=$(gh pr list --state open --json number,title,author,headRefName --jq '.[] | select(.author.login == "app/claude" or .author.login == "claude[bot]") | {number, branch: .headRefName}')

if [ -z "$AUTOMATED_PRS" ]; then
  echo "✅ No automated PRs found"
else
  echo "Found automated PR(s)"

  echo "$AUTOMATED_PRS" | jq -r '.number' | while read pr_num; do
    if [ ! -z "$pr_num" ]; then
      echo "  Closing PR #$pr_num"
      gh pr close $pr_num --comment "Closed by automated cleanup script" --delete-branch
    fi
  done
fi

echo ""
echo "✨ Cleanup complete!"
