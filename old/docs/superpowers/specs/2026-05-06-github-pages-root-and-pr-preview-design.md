# GitHub Pages Root Site and PR Preview Design

## Problem

The repository currently mixes two deployment models:

- branch-based GitHub Pages from `gh-pages`
- workflow-based Pages deployment from `main`

That causes the base site URL to depend on what is present at the root of `gh-pages`, while PR previews are also being published into subdirectories there. The result is that PR previews can work while the normal site returns 404.

## Goals

- Keep the production site available at the normal project Pages URL
- Deploy the production site whenever `main` changes
- Deploy PR previews under `/pr-<number>/`
- Add a PR comment with the preview URL once per PR
- Rebuild PR previews on every new commit pushed to the PR

## Non-Goals

- Cleaning up preview folders when PRs close
- Adding a separate build system
- Changing application runtime behavior

## Recommended Deployment Model

Use **GitHub Actions** as the source of truth for the production Pages site, and keep `gh-pages` only as storage for PR preview subdirectories.

### Production flow

- Trigger on push to `main`
- Run the existing test suite
- Deploy the repository root through `actions/deploy-pages`
- Configure repository Pages settings to use **GitHub Actions** instead of `gh-pages/(root)`

This keeps the production site available at:

`https://pardelapawel.github.io/mordheim-warband-builder/`

### PR preview flow

- Trigger on `pull_request` events: `opened`, `reopened`, `synchronize`
- Run the existing test suite
- Publish the site files into `gh-pages/pr-<number>/`
- Preserve previously published preview folders
- Publish the preview at:

`https://pardelapawel.github.io/mordheim-warband-builder/pr-<number>/`

## PR Comment Behavior

The preview URL is stable for the lifetime of a PR because the PR number does not change. Because of that:

- post one comment the first time the preview is published
- do not update or duplicate that comment on later preview rebuilds

The workflow should detect an existing marker comment before creating a new one.

## Workflow Boundaries

### Workflow 1: production Pages deploy

Purpose: keep the base site current.

Responsibilities:

- test on `main`
- deploy the root site with `actions/deploy-pages`

### Workflow 2: PR preview publish

Purpose: keep `/pr-<number>/` previews current.

Responsibilities:

- test pull request changes
- copy the static site into the matching subdirectory on `gh-pages`
- create the one-time PR comment if it does not already exist

## Data and State

The design intentionally keeps state minimal:

- production state lives in the Pages deployment generated from `main`
- preview state lives as static folders in `gh-pages`
- comment state is inferred from the presence of a marker comment on the PR

No external database or artifact registry is needed.

## Error Handling

- If tests fail, do not deploy production or preview output
- If preview publish succeeds but PR comment creation fails, the workflow should fail clearly so the missing comment is visible
- If the preview folder already exists, overwrite only that PR subdirectory

## Testing Strategy

- Keep the existing test suite as the deployment gate
- Verify the production workflow still deploys successfully from `main`
- Verify a PR workflow run creates or refreshes `/pr-<number>/`
- Verify rerunning the PR workflow does not create duplicate comments

## Operational Notes

- Repository Pages settings must be switched manually to **GitHub Actions**
- `gh-pages` remains useful for preview storage only
- No cleanup workflow is included in this design

## Success Criteria

- The base Pages URL serves the current `main` version after a push to `main`
- An open PR gets a working preview under `/pr-<number>/`
- The PR receives one preview comment and does not accumulate duplicates
