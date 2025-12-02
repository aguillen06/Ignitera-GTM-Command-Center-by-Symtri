#!/bin/bash
# Branch Protection Setup Script for Ignitera GTM Command Center
# Run this script to automatically configure branch protection via GitHub CLI

set -e  # Exit on error

echo "🔒 Setting up Branch Protection for Main Branch..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Repository details
OWNER="aguillen06"
REPO="Ignitera-GTM-Command-Center-by-Symtri"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check authentication
echo -e "${BLUE}Checking GitHub authentication...${NC}"
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub${NC}"
    echo "Run: gh auth login"
    exit 1
fi
echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Create the ruleset
echo -e "${BLUE}Creating branch protection ruleset...${NC}"

gh api \
  repos/${OWNER}/${REPO}/rulesets \
  --method POST \
  --silent \
  --raw-field name='Main Branch Protection' \
  --raw-field enforcement='active' \
  --raw-field target='branch' \
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

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Branch protection ruleset created successfully!${NC}"
    echo ""
    echo "📋 Protection Rules Applied:"
    echo "  ✓ Pull requests required (1 approval)"
    echo "  ✓ Status checks required (Test & Lint, Security Audit)"
    echo "  ✓ Force pushes blocked"
    echo "  ✓ Branch deletion restricted"
    echo "  ✓ Repository admins can bypass"
    echo ""
    echo "🔍 View all rulesets:"
    echo "  gh api repos/${OWNER}/${REPO}/rulesets | jq"
    echo ""
    echo "🌐 Or visit:"
    echo "  https://github.com/${OWNER}/${REPO}/settings/rules"
else
    echo -e "${RED}❌ Failed to create ruleset${NC}"
    echo "This might be because:"
    echo "  - A ruleset with this name already exists"
    echo "  - You don't have admin permissions"
    echo "  - The repository is private and requires different permissions"
    echo ""
    echo "Try creating it manually via GitHub web interface:"
    echo "  https://github.com/${OWNER}/${REPO}/settings/rules"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📖 Next steps:"
echo "  1. Test by creating a branch and PR"
echo "  2. Review the setup guide: docs/BRANCH_PROTECTION_SETUP.md"
echo "  3. Verify protection works as expected"
