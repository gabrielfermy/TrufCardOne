# Git Workflow & Branch Management Rules

## Multi-Stage Branching & Promotion Strategy
All code changes and repository updates MUST follow the structured multi-stage branching pipeline:
1. **Feature / Dev Branches (`feat/...`, `fix/...`, `dev/...`)**:
   - All development, refactoring, bugfixes, and asset changes MUST originate on a dedicated branch branched off `staging`.
   - Never develop or commit directly to `staging` or `master`.
2. **Staging Environment (`staging`)**:
   - Updating `staging` MUST be done via Pull Request (PR) from the feature/dev branch.
   - Used for integration testing and staging deployment validation.
3. **Production Environment (`master`)**:
   - Updating `master` (Production / kancasela.my.id) MUST be done exclusively via Pull Request (PR) from `staging`.
   - Direct merges or pushes to `master` from unvetted feature branches or working trees are strictly prohibited.

## PR Automation & Conditional Merge Protocol
When completing a task or user request that involves pushing changes:
1. **Validation First**: Run local validations (`npm run build`, `npm run lint`, `npm test`).
2. **If No Critical Issues**:
   - Create PR from `feature/dev` → `staging`.
   - Merge the PR into `staging`.
   - Create PR from `staging` → `master`.
   - Merge the PR into `master`.
   - Report summary and links to the user.
3. **If Critical Issues / Blockers Exist** (e.g. test failure, severe linter error, breaking migration risk, merge conflict):
   - Create the PR to capture progress.
   - **DO NOT merge the PR automatically**.
   - Report to the user with a detailed breakdown of the blocker and why automated merging was withheld.

## Branch Preservation Policy
- **Never Delete Branches on Merge**: When merging Pull Requests (`gh pr merge` or git commands), NEVER include `--delete-branch` or delete branches locally/remotely unless explicitly instructed by the user.
- **Maintain Audit Trail**: Keep branch history intact for traceability.

## Commit & PR Standards
- **Semantic Commits**: Use semantic prefixes (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- **Upstream Tracking**: Always set upstream when pushing (`git push -u origin <branch-name>`).
