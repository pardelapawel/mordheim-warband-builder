# Unified gh-pages Deploy Design

## Problem

The current deployment setup mixes two incompatible publication models:

- `main` deploys the production site through GitHub Actions Pages
- PR previews publish files into the `gh-pages` branch under `pr-<number>/`

That allows the root site to work while preview directories written to `gh-pages` are no longer live-served. As a result, PR preview workflows can run successfully, write files, and post comments, but `/pr-<number>/` still returns 404.

## Goals

- Keep the main site always available at the base project Pages URL
- Create a preview at `/pr-<number>/` for every PR
- Update the same `/pr-<number>/` preview after every new commit pushed to the PR
- Preserve the one-time PR preview comment behavior

## Recommended Model

Use a single branch-based Pages architecture with `gh-pages` as the only published source.

### Production flow

- Trigger on push to `main`
- Run tests
- Build the Pages payload into `dist-pages/`
- Publish `dist-pages/` into the root of `gh-pages`
- Preserve existing `pr-*` directories so previews survive production deploys

This keeps the base site available at:

`https://pardelapawel.github.io/mordheim-warband-builder/`

### PR preview flow

- Trigger on PR `opened`, `reopened`, and `synchronize`
- Run tests
- Build the Pages payload into `dist-pages/`
- Publish `dist-pages/` into `gh-pages/pr-<number>/`
- Overwrite only that PR directory so each new commit refreshes the preview

This keeps previews available at:

`https://pardelapawel.github.io/mordheim-warband-builder/pr-<number>/`

## Why This Model

This model matches the required URL structure exactly. Unlike GitHub Actions Pages deployments, branch-based Pages can serve both the root site and arbitrary preview subdirectories from the same published branch.

## Workflow Responsibilities

### `deploy.yml`

`deploy.yml` should stop using `actions/deploy-pages`. Instead, it should publish to the `gh-pages` branch root while preserving preview directories already present there.

Key requirements:

- deploy from `main` only
- run tests before deploy
- publish `dist-pages/` to the root of `gh-pages`
- keep `pr-*` directories intact
- keep the main site current after every push to `main`

### `pr-preview.yml`

`pr-preview.yml` should remain branch-based and continue publishing to `gh-pages/pr-<number>/`.

Key requirements:

- run on `opened`, `reopened`, `synchronize`
- publish only for same-repo PRs
- deploy preview files into `pr-<number>/`
- update the preview on every new PR commit
- post the preview comment only once per PR

## Repository Setting

Repository Pages source must be switched back to:

`Settings -> Pages -> Build and deployment -> Source -> Deploy from a branch`

with:

- Branch: `gh-pages`
- Folder: `/(root)`

## Error Handling

- If tests fail, do not publish the production site or PR preview
- If a production deploy fails, existing `gh-pages` content remains as the last good version
- If a preview deploy fails, the previous preview remains available until the next successful run

## Verification

After implementation:

1. Push to `main` and verify the base site loads
2. Open or update a PR and verify `/pr-<number>/` loads
3. Push another commit to the PR and verify the preview updates at the same URL
4. Confirm the PR has only one preview comment

## Success Criteria

- Base URL always serves the latest successful `main` deploy
- Every PR gets a working `/pr-<number>/` preview
- Each PR preview refreshes on every new commit
- PR preview comments do not duplicate
