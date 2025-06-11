#!/bin/bash

# Build script for native binaries
# Usage: ./scripts/build-native.sh [clean|test|all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$CLI_DIR/bin"

cd "$CLI_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Clean function
clean() {
    log_info "Cleaning previous builds..."
    npm run pkg:clean || true
    rm -f dist/*.js dist/*.cjs dist/*.map || true
    rm -rf dist-bundle/ || true
}

# Build function
build() {
    log_info "Creating bundle with ncc..."
    npm run build:bundle

    log_info "Creating native binaries with pkg..."
    npm run pkg:all

    log_info "Build completed!"
    ls -la "$BIN_DIR"
    du -h "$BIN_DIR"/*
}

# Test function
test_binaries() {
    log_info "Testing native binaries..."
    
    local test_md="# Test Heading\n\nThis is a test markdown."
    
    for binary in "$BIN_DIR"/*; do
        if [[ -x "$binary" && ! "$binary" == *.exe ]]; then
            log_info "Testing $(basename "$binary")..."
            
            # Test help command
            if "$binary" --help > /dev/null 2>&1; then
                log_info "✓ Help command works for $(basename "$binary")"
            else
                log_warn "✗ Help command failed for $(basename "$binary")"
            fi
            
            # Test version command  
            if "$binary" --version > /dev/null 2>&1; then
                log_info "✓ Version command works for $(basename "$binary")"
            else
                log_warn "✗ Version command failed for $(basename "$binary")"
            fi
            
            # Test basic markdown processing
            if echo -e "$test_md" | "$binary" > /dev/null 2>&1; then
                log_info "✓ Basic processing works for $(basename "$binary")"
            else
                log_warn "✗ Basic processing failed for $(basename "$binary")"
            fi
        fi
    done
}

# Main execution
case "${1:-all}" in
    clean)
        clean
        ;;
    build)
        build
        ;;
    test)
        test_binaries
        ;;
    all)
        clean
        build
        test_binaries
        ;;
    *)
        echo "Usage: $0 [clean|build|test|all]"
        echo "  clean - Clean previous builds"
        echo "  build - Build native binaries"
        echo "  test  - Test existing binaries"
        echo "  all   - Clean, build, and test (default)"
        exit 1
        ;;
esac

log_info "Script completed!" 