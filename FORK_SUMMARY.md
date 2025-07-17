# troubleshoot.dev - VSCodium Fork Summary

## Overview
This repository (`troubleshoot-dev`) is a fork of VSCodium, rebranded as "troubleshoot.dev" - a developer-focused code editor optimized for troubleshooting and development workflows.

## Naming Convention
- **Repository Name**: `troubleshoot-dev` (GitHub repository)
- **Application Name**: `troubleshoot.dev` (the actual application)
- **Binary Name**: `troubleshoot-dev` (executable file)
- **Organization**: `troubleshoot-dev` (GitHub organization)

## Changes Made

### 1. Branding Updates
- **Application Name**: Changed from "VSCodium" to "troubleshoot.dev"
- **Repository Name**: `troubleshoot-dev`
- **Binary Name**: Changed from "codium" to "troubleshoot-dev"
- **Application Identifier**: Updated to "dev.troubleshoot"
- **URLs**: Updated all references to point to troubleshoot-dev organization

### 2. Files Modified

#### Core Configuration
- `README.md` - Complete rebranding and updated installation instructions
- `prepare_vscode.sh` - Updated product configuration and branding
- `product.json` - Updated with new identifiers and URLs

#### GitHub Workflows
- `stable-linux.yml` - Updated environment variables
- `stable-windows.yml` - Updated environment variables and WinGet identifier
- `stable-macos.yml` - Updated environment variables
- `stable-spearhead.yml` - Updated environment variables
- `insider-linux.yml` - Updated environment variables
- `insider-windows.yml` - Updated environment variables
- `insider-macos.yml` - Updated environment variables
- `insider-spearhead.yml` - Updated environment variables

#### Issue Templates
- `.github/ISSUE_TEMPLATE/bug_report.md` - Updated references

### 3. Key Identifiers Changed

#### Application Names
- **Short Name**: "troubleshoot.dev"
- **Long Name**: "troubleshoot.dev"
- **Application Name**: "troubleshoot-dev"
- **Binary Name**: "troubleshoot-dev"

#### Platform-Specific Identifiers
- **macOS Bundle ID**: "dev.troubleshoot"
- **Windows App User Model ID**: "troubleshoot.dev.troubleshoot-dev"
- **Linux Icon Name**: "troubleshoot-dev"
- **URL Protocol**: "troubleshoot-dev"

#### Windows GUIDs (Updated for uniqueness)
- **win32AppId**: "{{A63CBF88-25C6-4B10-952F-326AE657F16C}"
- **win32x64AppId**: "{{B8DA3577-054F-4CA1-8122-7D820494CFFC}"
- **win32arm64AppId**: "{{C7DEE444-3D04-4258-B92A-BC1F0FF2CAE5}"
- **win32UserAppId**: "{{DFD05EB4-651E-4E78-A062-515204B47A3B}"
- **win32x64UserAppId**: "{{E1F05D1-C245-4562-81EE-28188DB6FD18}"
- **win32arm64UserAppId**: "{{F7FD70A5-1B8D-4875-9F40-C5553F094829}"

### 4. Repository Configuration
- **Git Remote**: Updated to point to `https://github.com/troubleshoot-dev/troubleshoot-dev.git`
- **Organization**: troubleshoot-dev
- **Repository Name**: troubleshoot-dev

## Next Steps

### 1. Repository Setup
1. Create the GitHub organization: `troubleshoot-dev`
2. Create the main repository: `troubleshoot-dev/troubleshoot-dev`
3. Push this code to the new repository
4. Set up branch protection rules
5. Configure GitHub Actions secrets and variables

### 2. Additional Repositories Needed
- `troubleshoot-dev/versions` - For update management
- `troubleshoot-dev/troubleshoot-dev-insiders` - For insider builds (if needed)

### 3. Build Infrastructure
1. Set up GitHub Actions runners
2. Configure code signing certificates
3. Set up release automation
4. Configure package managers (Homebrew, Chocolatey, Snap, etc.)

### 4. Documentation
1. Update all documentation in the `docs/` folder
2. Create troubleshoot.dev website
3. Set up community guidelines
4. Create contribution guidelines

### 5. Distribution
1. Submit to package managers:
   - Homebrew
   - Chocolatey
   - Snap Store
   - AUR (Arch User Repository)
   - Flatpak
   - WinGet
2. Set up download mirrors
3. Configure update mechanisms

### 6. Community
1. Set up Discord/Slack community
2. Create social media presence
3. Establish support channels
4. Set up issue templates and automation

## Building

To build troubleshoot.dev, follow the same process as VSCodium:

```bash
# Install dependencies
npm install

# Build
./build.sh
```

## License

This project maintains the same MIT license as VSCodium, with telemetry disabled and Microsoft branding removed.

## Acknowledgments

This fork is based on the excellent work of the VSCodium team, which provides free/libre binaries of Visual Studio Code without Microsoft's proprietary additions.