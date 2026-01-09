# Huvrly VS Code fork

This repository tracks upstream **microsoft/vscode** while keeping Huvrly customizations small, reviewable, and easy to rebase.

## Branch model

- `upstream-main`: a mirror of `microsoft/vscode@main` (force-updated by automation).
- `huvrly-main`: Huvrly product branch (minimal core changes; keep most work in built-in extensions).

## Upstream sync

A nightly workflow opens a PR that merges upstream changes into `huvrly-main`.

- Workflow: `.github/workflows/upstream-sync.yml`

### First-time setup notes

- Create a GitHub label named: `upstream-sync` (optional, but the workflow tries to apply it).
- Protect `huvrly-main` (recommended): require PRs, require checks, restrict force-push.

## Development (macOS)

See upstream docs in the repo root for build and run commands (we keep this file short on purpose).

## Huvrly Agent integration

Planned: a built-in extension under `extensions/huvrly/` that talks to the local Platform Agent endpoint:

- `GET http://localhost:<port>/agent/status`

(Exact URL/port will be configurable.)
