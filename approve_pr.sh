#!/usr/bin/env bash
#
# merge_pr.sh - Merge one or more GitHub PRs and delete their branches afterwards.
#
# Usage:
#   ./merge_pr.sh <PR_NUMBER> [PR_NUMBER ...]
#   ./merge_pr.sh --rebase [PR_NUMBER ...]
#
# With --rebase, a "@dependabot rebase" comment is posted instead of merging. When no PR numbers are
# given, it is posted on all open Dependabot PRs.
#
# Requires: GitHub CLI (`gh`) installed and authenticated (`gh auth login`).

set -euo pipefail

# ---- Configuration: edit these for your repo ----
ORG="OpenConext"
REPO="OpenConext-access"
# ---------------------------------------------------

# --- Merge method: one of "merge", "squash", "rebase" ---
MERGE_METHOD="squash"

REBASE=false
if [[ "${1:-}" == "--rebase" ]]; then
  REBASE=true
  shift
fi

if [[ $# -lt 1 && "$REBASE" == false ]]; then
  echo "Usage: $0 [--rebase] <PR_NUMBER> [PR_NUMBER ...]" >&2
  exit 1
fi

REPO_FULL="${ORG}/${REPO}"

if ! command -v gh &> /dev/null; then
  echo "Error: GitHub CLI ('gh') is not installed or not in PATH." >&2
  exit 1
fi

merge_pr() {
  local pr_number="$1"

  echo "Fetching info for PR #${pr_number} in ${REPO_FULL}..."

  # Get PR state and branch name
  local pr_state branch_name
  pr_state=$(gh pr view "$pr_number" --repo "$REPO_FULL" --json state --jq '.state')
  branch_name=$(gh pr view "$pr_number" --repo "$REPO_FULL" --json headRefName --jq '.headRefName')

  if [[ -z "$branch_name" ]]; then
    echo "Error: Could not determine branch name for PR #${pr_number}." >&2
    return 1
  fi

  if [[ "$pr_state" != "OPEN" ]]; then
    echo "Error: PR #${pr_number} is not open (current state: ${pr_state})." >&2
    return 1
  fi

  echo "PR #${pr_number} found. Branch: ${branch_name}"
  echo "Merging with method: ${MERGE_METHOD}..."

  # Merge the PR and delete the branch (gh can do both in one call)
  gh pr merge "$pr_number" \
    --repo "$REPO_FULL" \
    --"${MERGE_METHOD}" \
    --delete-branch

  echo "PR #${pr_number} merged successfully and branch '${branch_name}' deleted."
}

rebase_pr() {
  local pr_number="$1"
  echo "Commenting '@dependabot rebase' on PR #${pr_number} in ${REPO_FULL}..."
  gh pr comment "$pr_number" --repo "$REPO_FULL" --body "@dependabot rebase"
}

PR_NUMBERS=("$@")
if [[ "$REBASE" == true && ${#PR_NUMBERS[@]} -eq 0 ]]; then
  while IFS= read -r n; do
    [[ -n "$n" ]] && PR_NUMBERS+=("$n")
  done < <(gh pr list --repo "$REPO_FULL" --state open --author "app/dependabot" --limit 200 --json number --jq '.[].number')
  echo "Found ${#PR_NUMBERS[@]} open Dependabot PR(s)."
fi

FAILED_PRS=()

for pr_number in "${PR_NUMBERS[@]+"${PR_NUMBERS[@]}"}"; do
  echo "=================================================="
  if [[ "$REBASE" == true ]]; then
    action=rebase_pr
  else
    action=merge_pr
  fi
  if ! $action "$pr_number"; then
    FAILED_PRS+=("$pr_number")
  fi
  echo
done

if [[ ${#FAILED_PRS[@]} -gt 0 ]]; then
  echo "Failed PR(s): ${FAILED_PRS[*]}" >&2
  exit 1
fi

echo "All PRs processed successfully."
