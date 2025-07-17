#!/bin/bash

# troubleshoot.dev Fork Setup Script
# Repository: troubleshoot-dev (GitHub repo name)
# Application: troubleshoot.dev (app name)

set -e

echo "🚀 Setting up troubleshoot.dev fork..."
echo "📁 Repository: troubleshoot-dev"
echo "🎯 Application: troubleshoot.dev"
echo ""

# Check if we're in the right directory
if [ ! -f "FORK_SUMMARY.md" ]; then
    echo "❌ Error: Please run this script from the troubleshoot-dev directory"
    exit 1
fi

# Update git configuration
echo "📝 Updating git configuration..."
git remote set-url origin https://github.com/troubleshoot-dev/troubleshoot-dev.git

# Add upstream remote for syncing with VSCodium
echo "🔗 Adding upstream remote..."
git remote add upstream https://github.com/VSCodium/vscodium.git || echo "Upstream remote already exists"

# Show current remotes
echo "📋 Current git remotes:"
git remote -v

# Create initial commit with fork changes
echo "💾 Creating initial commit..."
git add .
git commit -m "feat: fork VSCodium as troubleshoot.dev

Repository: troubleshoot-dev
Application: troubleshoot.dev
Binary: troubleshoot-dev

Changes:
- Rebrand from VSCodium to troubleshoot.dev
- Update all configuration files and workflows
- Change binary name from codium to troubleshoot-dev
- Update GitHub workflows and identifiers
- Maintain MIT license and telemetry-free approach

Based on VSCodium commit: $(git rev-parse HEAD)"

echo "✅ Fork setup complete!"
echo ""
echo "📋 Summary:"
echo "   Repository Name: troubleshoot-dev"
echo "   Application Name: troubleshoot.dev"
echo "   Binary Name: troubleshoot-dev"
echo "   Organization: troubleshoot-dev"
echo ""
echo "🚀 Next steps:"
echo "1. Create GitHub organization: troubleshoot-dev"
echo "2. Create repository: troubleshoot-dev/troubleshoot-dev"
echo "3. Push to GitHub: git push origin master"
echo "4. Set up GitHub Actions secrets and variables"
echo "5. Configure build infrastructure"
echo ""
echo "📖 For detailed next steps, see FORK_SUMMARY.md"