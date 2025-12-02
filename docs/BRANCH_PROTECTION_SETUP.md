# GitHub Branch Protection Setup Guide

This guide walks you through setting up branch protection for the Ignitera GTM Command Center repository.

## Prerequisites

- Repository admin access
- GitHub account logged in
- CI/CD workflow already configured (✅ Already done)

## Option 1: Web Interface Setup (Recommended)

### Step 1: Navigate to Rulesets

1. Go to https://github.com/aguillen06/Ignitera-GTM-Command-Center-by-Symtri
2. Click **Settings** tab
3. In left sidebar under "Code and automation", click **Rules** → **Rulesets**
4. Click **New ruleset** → **New branch ruleset**

### Step 2: Basic Configuration

```
Ruleset name: Main Branch Protection
Enforcement status: Active
```

### Step 3: Target Branches

Under "Target branches":
- Click **Add target** → **Include by pattern**
- Enter pattern: `main`
- Click **Add inclusion pattern**

### Step 4: Configure Rules

Check these boxes and configure:

#### ✅ Require a pull request before merging
- **Required approving reviews**: `1`
- ✅ **Dismiss stale pull request approvals when new commits are pushed**
- ✅ **Require review from Code Owners** (optional, if you have CODEOWNERS file)

#### ✅ Require status checks to pass before merging
Add these required checks (they come from `.github/workflows/ci.yml`):
- `Test & Lint`
- `Security Audit`

Options:
- ✅ **Require branches to be up to date before merging**

#### ✅ Block force pushes
No additional configuration needed.

#### ✅ Require linear history (Optional)
Keeps commit history clean - recommended for production branches.

#### ✅ Restrict deletions
Prevents accidental branch deletion.

### Step 5: Bypass Configuration

Under "Bypass list":
- Click **Add bypass**
- Select **Repository admin** (allows you to bypass in emergencies)

### Step 6: Save

- Click **Create** at the bottom
- Your ruleset is now active! 🎉

---

## Option 2: GitHub CLI Setup

If you have GitHub CLI installed:

```bash
# 1. Check if gh CLI is authenticated
gh auth status

# 2. Create the ruleset
gh api \
  repos/aguillen06/Ignitera-GTM-Command-Center-by-Symtri/rulesets \
  --method POST \
  --field name='Main Branch Protection' \
  --field enforcement='active' \
  --field target='branch' \
  --raw-field 'conditions={"ref_name":{"include":["refs/heads/main"]}}' \
  --raw-field 'rules=[
    {
      "type":"pull_request",
      "parameters":{
        "required_approving_review_count":1,
        "dismiss_stale_reviews_on_push":true,
        "require_code_owner_review":false,
        "require_last_push_approval":false
      }
    },
    {
      "type":"required_status_checks",
      "parameters":{
        "required_status_checks":[
          {"context":"Test & Lint"},
          {"context":"Security Audit"}
        ],
        "strict_required_status_checks_policy":true
      }
    },
    {
      "type":"non_fast_forward"
    },
    {
      "type":"deletion"
    }
  ]' \
  --raw-field 'bypass_actors=[
    {
      "actor_id":5,
      "actor_type":"RepositoryRole",
      "bypass_mode":"always"
    }
  ]'

# 3. Verify creation
gh api repos/aguillen06/Ignitera-GTM-Command-Center-by-Symtri/rulesets
```

---

## Option 3: Manual JSON Configuration

If you prefer to see the exact JSON structure:

```json
{
  "name": "Main Branch Protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "required_status_checks": [
          {"context": "Test & Lint"},
          {"context": "Security Audit"}
        ],
        "strict_required_status_checks_policy": true
      }
    },
    {
      "type": "non_fast_forward"
    },
    {
      "type": "deletion"
    }
  ],
  "bypass_actors": [
    {
      "actor_id": 5,
      "actor_type": "RepositoryRole",
      "bypass_mode": "always"
    }
  ]
}
```

---

## What Each Rule Does

| Rule | Purpose | Impact |
|------|---------|--------|
| **Pull Request Required** | Forces code review process | Can't push directly to `main` |
| **1 Approval Required** | Ensures peer review | At least one person must approve |
| **Status Checks** | Tests must pass | CI/CD must succeed before merge |
| **Block Force Push** | Prevents history rewriting | Protects against `git push --force` |
| **Restrict Deletions** | Prevents branch deletion | Can't accidentally delete `main` |
| **Linear History** | No merge commits | Keeps history clean (optional) |

---

## Verification Steps

After setup, test the protection:

1. **Try direct push** (should fail):
   ```bash
   git checkout main
   echo "test" >> README.md
   git commit -am "test: direct push"
   git push origin main
   # Expected: ❌ Push rejected by branch protection
   ```

2. **Create PR workflow** (should work):
   ```bash
   git checkout -b feature/test-protection
   echo "test" >> README.md
   git commit -am "feat: test via PR"
   git push origin feature/test-protection
   # Then create PR on GitHub
   # Expected: ✅ PR can be created and merged after checks pass
   ```

---

## Troubleshooting

### Issue: Status checks not appearing
**Solution**: Push to a branch and create a PR first. Status checks only appear after the CI/CD workflow runs at least once.

### Issue: Can't merge even with approvals
**Solution**: Ensure all required status checks have passed. Check the "Checks" tab on your PR.

### Issue: Need to bypass protection urgently
**Solution**: 
1. Go to PR → Click "Merge" dropdown → "Merge without waiting for requirements to be met" (only visible to admins)
2. Or temporarily disable the ruleset in Settings

### Issue: GitHub CLI command fails
**Solution**:
```bash
# Authenticate first
gh auth login

# Check authentication
gh auth status

# Try simpler creation via web interface instead
```

---

## Advanced Configurations

### Protect Multiple Branches

Target pattern examples:
- `main` - Only main branch
- `main|develop` - Main and develop
- `release/*` - All release branches
- `*` - All branches (not recommended)

### Add CODEOWNERS File

Create `.github/CODEOWNERS`:
```
# Require review from specific people/teams
* @aguillen06
/services/ @aguillen06 @backend-team
/components/ @aguillen06 @frontend-team
```

### Require Signed Commits

Enable in ruleset:
- ✅ **Require signed commits**

Then configure locally:
```bash
# Configure GPG signing
git config --global commit.gpgsign true
git config --global user.signingkey YOUR_KEY_ID
```

---

## Recommended Settings for Your Project

Based on your current setup:

```yaml
Protection Level: Medium (Development Phase)

Rules:
✓ PR required (1 approval)
✓ Status checks required (Test & Lint, Security Audit)
✓ Block force pushes
✓ Restrict deletions
✗ Signed commits (optional, add later for production)
✗ Linear history (optional, cleaner but more restrictive)

Bypass: Repository admins only
```

For production deployment, increase to:
- 2 required approvals
- Require signed commits
- Enforce linear history

---

## Next Steps

After setting up branch protection:

1. ✅ Test the protection by creating a test PR
2. ✅ Document the workflow in your team wiki
3. ✅ Add CODEOWNERS file if working with a team
4. ✅ Consider setting up automatic branch cleanup
5. ✅ Enable GitHub Advanced Security features (if available)

---

## Quick Reference Commands

```bash
# View current rulesets
gh api repos/aguillen06/Ignitera-GTM-Command-Center-by-Symtri/rulesets

# List all rules in a ruleset
gh api repos/aguillen06/Ignitera-GTM-Command-Center-by-Symtri/rulesets/RULESET_ID

# Disable a ruleset temporarily
gh api repos/aguillen06/Ignitera-GTM-Command-Center-by-Symtri/rulesets/RULESET_ID \
  --method PATCH \
  --field enforcement='disabled'

# Delete a ruleset
gh api repos/aguillen06/Ignitera-GTM-Command-Center-by-Symtri/rulesets/RULESET_ID \
  --method DELETE
```

---

**Questions?** Check the [GitHub Rulesets documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) or open an issue in the repository.
