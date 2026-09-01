# Git Workflow & Branch Management Rules

## Branch Preservation Policy
- **Never Delete Branches on Merge**: When merging Pull Requests using `gh pr merge` or git commands, NEVER include the `--delete-branch` flag or delete local/remote branches after merging, unless the user explicitly requests branch deletion.
- **Preserve Historical Branches**: Maintain all feature, fix, and documentation branches so that historical context, revision diffs, and development tracks remain accessible.

## Commit & PR Best Practices
- **Atomic Semantic Commits**: Use semantic commit prefixes (`feat:`, `docs:`, `fix:`, `refactor:`, `test:`).
- **Upstream Tracking**: When creating feature branches, always set up upstream tracking (`git push -u origin <branch>`).
