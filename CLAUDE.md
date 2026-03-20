# CLAUDE.md

## Git Workflow

- **Commit frequently**: After completing each meaningful unit of work (bug fix, feature, config change), create a git commit immediately.
- **Push to GitHub**: After committing, push to the remote repository so work is never lost.
- **Clean commit messages**: Use clear, descriptive commit messages that explain what was changed and why. Follow the format:
  - `fix: description` for bug fixes
  - `feat: description` for new features
  - `chore: description` for config/setup changes
  - `refactor: description` for code restructuring
- **Never batch too many changes**: Each commit should be focused on one logical change. Don't combine unrelated fixes in a single commit.
- **Always verify before pushing**: Run `git status` and `git diff` before committing to ensure only intended changes are included.
