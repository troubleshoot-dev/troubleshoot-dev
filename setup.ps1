# PowerShell setup script for troubleshoot-dev build environment
Write-Host "Setting up troubleshoot-dev build environment..." -ForegroundColor Green

# Set platform variables
$env:OS_NAME = "windows"
$env:VSCODE_ARCH = "x64"
$env:SHOULD_BUILD = "yes"
$env:CI_BUILD = "no"
$env:RELEASE_VERSION = "1.0.0"
$env:VSCODE_QUALITY = "stable"

Write-Host "Platform: Windows x64" -ForegroundColor Cyan

# Check for required tools
Write-Host "Checking for required tools..." -ForegroundColor Yellow

function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        Write-Host "✓ $Command found" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ $Command not found" -ForegroundColor Red
        return $false
    }
}

$toolsOk = $true
$toolsOk = (Test-Command "node") -and $toolsOk
$toolsOk = (Test-Command "npm") -and $toolsOk
$toolsOk = (Test-Command "git") -and $toolsOk

if (-not $toolsOk) {
    Write-Host "Please install missing tools and try again." -ForegroundColor Red
    exit 1
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    
    @"
SHOULD_BUILD=yes
CI_BUILD=no
DISABLE_UPDATE=no
OS_NAME=windows
VSCODE_ARCH=x64
RELEASE_VERSION=1.0.0
VSCODE_QUALITY=stable
SHOULD_BUILD_REH=yes
SHOULD_BUILD_REH_WEB=yes
SHOULD_BUILD_ZIP=yes
SHOULD_BUILD_EXE_SYS=yes
SHOULD_BUILD_EXE_USR=yes
NODE_OPTIONS=--max-old-space-size=8192
ELECTRON_SKIP_BINARY_DOWNLOAD=1
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    Write-Host "✓ Created .env file" -ForegroundColor Green
} else {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
}

Write-Host "Environment setup complete!" -ForegroundColor Green