# GitHub Actions Release Workflow for Chrome Extension

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `workflow_dispatch`-triggered GitHub Actions workflow that bumps the version, rebuilds the extension, commits, tags, and publishes a GitHub release with `dist.zip` attached.

**Architecture:** A single workflow file at `.github/workflows/release-chrome-extension.yml`. It runs on `ubuntu-latest`, uses Node.js, and leverages the built-in `GITHUB_TOKEN` for push and release permissions — no extra secrets needed. The version bump logic mirrors `release.js` but runs entirely in CI.

**Tech Stack:** GitHub Actions, ubuntu-latest runner, Node.js 20, `actions/checkout@v4`, `actions/setup-node@v4`, built-in `GITHUB_TOKEN`, `zip` CLI (pre-installed on ubuntu-latest)

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `.github/workflows/release-chrome-extension.yml` | Create | The entire workflow — trigger, version bump, build, zip, commit, tag, release |

---

### Task 1: Create the GitHub Actions workflow file

**Files:**
- Create: `.github/workflows/release-chrome-extension.yml`

- [ ] **Step 1: Create the `.github/workflows/` directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create the workflow file**

Create `.github/workflows/release-chrome-extension.yml` with this exact content:

```yaml
name: Release Chrome Extension

on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'Version bump type'
        required: true
        default: 'patch'
        type: choice
        options:
          - patch
          - minor
          - major

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Compute next version
        id: version
        run: |
          CURRENT=$(node -p "require('./clients/chrome-extension/package.json').version")
          BUMP="${{ github.event.inputs.bump }}"
          IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
          if [ "$BUMP" = "major" ]; then
            NEXT="$((MAJOR + 1)).0.0"
          elif [ "$BUMP" = "minor" ]; then
            NEXT="${MAJOR}.$((MINOR + 1)).0"
          else
            NEXT="${MAJOR}.${MINOR}.$((PATCH + 1))"
          fi
          echo "current=$CURRENT" >> $GITHUB_OUTPUT
          echo "next=$NEXT" >> $GITHUB_OUTPUT
          echo "tag=v$NEXT" >> $GITHUB_OUTPUT

      - name: Bump version in package.json and manifest.json
        run: |
          NEXT="${{ steps.version.outputs.next }}"
          node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('clients/chrome-extension/package.json', 'utf8'));
            pkg.version = '$NEXT';
            fs.writeFileSync('clients/chrome-extension/package.json', JSON.stringify(pkg, null, 2) + '\n');
            const manifest = JSON.parse(fs.readFileSync('clients/chrome-extension/src/manifest.json', 'utf8'));
            manifest.version = '$NEXT';
            fs.writeFileSync('clients/chrome-extension/src/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
          "

      - name: Build extension
        run: node build.js
        working-directory: clients/chrome-extension

      - name: Verify version in dist/manifest.json
        run: |
          NEXT="${{ steps.version.outputs.next }}"
          DIST_VER=$(node -p "require('./clients/chrome-extension/dist/manifest.json').version")
          if [ "$DIST_VER" != "$NEXT" ]; then
            echo "ERROR: dist/manifest.json version is $DIST_VER, expected $NEXT"
            exit 1
          fi
          echo "dist/manifest.json version verified: $DIST_VER"

      - name: Package dist.zip
        run: |
          rm -f dist.zip
          cd dist && zip -r ../dist.zip .
        working-directory: clients/chrome-extension

      - name: Commit version bump
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add clients/chrome-extension/src/manifest.json \
                  clients/chrome-extension/package.json \
                  clients/chrome-extension/dist.zip
          git commit -m "chore: bump chrome extension version to ${{ steps.version.outputs.next }}"

      - name: Create and push tag
        run: |
          TAG="${{ steps.version.outputs.tag }}"
          git tag -a "$TAG" -m "Chrome extension $TAG"
          git push origin main --tags

      - name: Create GitHub release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          TAG="${{ steps.version.outputs.tag }}"
          PREV="${{ steps.version.outputs.current }}"
          gh release create "$TAG" \
            clients/chrome-extension/dist.zip \
            --title "Chrome Extension $TAG" \
            --notes "## Chrome Extension $TAG

          Bumped from $PREV → ${{ steps.version.outputs.next }} (${{ github.event.inputs.bump }} release).

          ### Changes since $PREV
          $(git log v${PREV}..HEAD~1 --oneline 2>/dev/null || echo 'See commit history for details.')"
```

- [ ] **Step 3: Verify the file exists**

```bash
ls -la .github/workflows/release-chrome-extension.yml
```
Expected: file exists with non-zero size.

- [ ] **Step 4: Validate YAML syntax**

```bash
node -e "
  const fs = require('fs');
  const content = fs.readFileSync('.github/workflows/release-chrome-extension.yml', 'utf8');
  // Basic structure checks
  if (!content.includes('workflow_dispatch')) throw new Error('Missing workflow_dispatch trigger');
  if (!content.includes('permissions:')) throw new Error('Missing permissions block');
  if (!content.includes('contents: write')) throw new Error('Missing contents: write permission');
  if (!content.includes('GITHUB_TOKEN')) throw new Error('Missing GITHUB_TOKEN reference');
  console.log('YAML structure checks passed');
"
```
Expected: `YAML structure checks passed`

- [ ] **Step 5: Commit the workflow**

```bash
git add .github/workflows/release-chrome-extension.yml
git commit -m "feat: add GitHub Actions release workflow for chrome extension"
```

- [ ] **Step 6: Push to origin**

```bash
git push origin main
```
Expected: push succeeds.

- [ ] **Step 7: Verify the workflow appears on GitHub**

```bash
gh workflow list
```
Expected: `Release Chrome Extension` appears in the list.

---

## How to use after this is deployed

Go to the repo on GitHub → **Actions** tab → **Release Chrome Extension** → **Run workflow** → choose `patch`, `minor`, or `major` → click **Run workflow**.

The workflow will:
1. Compute the next version
2. Bump `package.json` and `src/manifest.json`
3. Build the extension
4. Package `dist.zip`
5. Commit + tag + push
6. Create a GitHub release with `dist.zip` attached
