#!/usr/bin/env bash
# Setup script for troubleshoot-dev build environment

set -e

echo "Setting up troubleshoot-dev build environment..."

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    export OS_NAME="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    export OS_NAME="osx"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    export OS_NAME="windows"
else
    echo "Warning: Unknown OS type $OSTYPE, defaulting to linux"
    export OS_NAME="linux"
fi

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        export VSCODE_ARCH="x64"
        ;;
    aarch64|arm64)
        export VSCODE_ARCH="arm64"
        ;;
    armv7l)
        export VSCODE_ARCH="arm"
        ;;
    *)
        echo "Warning: Unknown architecture $ARCH, defaulting to x64"
        export VSCODE_ARCH="x64"
        ;;
esac

echo "Detected OS: $OS_NAME"
echo "Detected Architecture: $VSCODE_ARCH"

# Set default environment variables
export SHOULD_BUILD="${SHOULD_BUILD:-yes}"
export CI_BUILD="${CI_BUILD:-no}"
export DISABLE_UPDATE="${DISABLE_UPDATE:-no}"
export RELEASE_VERSION="${RELEASE_VERSION:-1.0.0}"
export VSCODE_QUALITY="${VSCODE_QUALITY:-stable}"
export SHOULD_BUILD_REH="${SHOULD_BUILD_REH:-yes}"
export SHOULD_BUILD_REH_WEB="${SHOULD_BUILD_REH_WEB:-yes}"

# Check for required tools
echo "Checking for required tools..."

check_tool() {
    if ! command -v "$1" &> /dev/null; then
        echo "Error: $1 is not installed or not in PATH"
        echo "Please install $1 and try again"
        exit 1
    else
        echo "✓ $1 found"
    fi
}

check_tool "node"
check_tool "npm"
check_tool "git"
check_tool "jq"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_NODE_VERSION="22.15.1"

if [[ -f ".nvmrc" ]]; then
    REQUIRED_NODE_VERSION=$(cat .nvmrc)
fi

echo "Node.js version: $NODE_VERSION (required: $REQUIRED_NODE_VERSION)"

# Create .env file if it doesn't exist
if [[ ! -f ".env" ]]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    
    # Update .env with detected values
    sed -i.bak "s/# OS_NAME=.*/OS_NAME=$OS_NAME/" .env
    sed -i.bak "s/# VSCODE_ARCH=.*/VSCODE_ARCH=$VSCODE_ARCH/" .env
    rm .env.bak 2>/dev/null || true
    
    echo "✓ Created .env file with detected values"
else
    echo "✓ .env file already exists"
fi

# Source the .env file
if [[ -f ".env" ]]; then
    set -a
    source .env
    set +a
fi

echo ""
echo "Environment setup complete!"
echo "You can now run the build with: ./build.sh"
echo ""
echo "To customize the build, edit the .env file with your preferred settings."