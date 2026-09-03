# Git Workflow & Branch Management Rules

## Master Branch Protection Policy
- **NEVER Commit Directly to `master`**: The `master` branch is strictly protected. Do NOT commit directly to `master`, and do NOT push direct commits to `origin/master`.
- **Updates Only via Pull Requests (PR)**: The only way to update the `master` branch is through a Pull Request. Every feature, bugfix, refactor, or documentation change must be developed on a dedicated topic/feature branch (e.g. `feat/...`, `fix/...`) and merged via PR.
- **Enforced Workflow**:
  1. Check out a new branch before committing: `git checkout -b <branch-name>`
  2. Commit changes to the feature branch: `git commit -m "..."`
  3. Push upstream: `git push -u origin <branch-name>`
  4. Open a Pull Request targeting `master`: `gh pr create`

## Branch Preservation Policy
- **Never Delete Branches on Merge**: When merging Pull Requests using `gh pr merge` or git commands, NEVER include the `--delete-branch` flag or delete local/remote branches after merging, unless the user explicitly requests branch deletion.
- **Preserve Historical Branches**: Maintain all feature, fix, and documentation branches so that historical context, revision diffs, and development tracks remain accessible.

## Commit & PR Best Practices
- **Atomic Semantic Commits**: Use semantic commit prefixes (`feat:`, `docs:`, `fix:`, `refactor:`, `test:`).
- **Upstream Tracking**: When creating feature branches, always set up upstream tracking (`git push -u origin <branch-name>`).
