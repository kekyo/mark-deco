# Mark-Deco CLI - Native Binaries

Enhanced markdown processor with plugin support - compiled as native executables.

## Overview

This directory contains native binary executables of the Mark-Deco CLI tool for multiple platforms. These are standalone executables that don't require Node.js to be installed on the target system.

## Available Binaries

- `mark-deco-cli-linux` - Linux x64 executable (~46MB)
- `mark-deco-cli-macos` - macOS x64 executable (~51MB) 
- `mark-deco-cli-win.exe` - Windows x64 executable (~38MB)

## Usage

### Linux/macOS
```bash
# Make executable (if needed)
chmod +x mark-deco-cli-linux

# Process markdown from stdin
echo "# Hello World" | ./mark-deco-cli-linux

# Process file
./mark-deco-cli-linux -i input.md -o output.html

# Use with pipes
cat README.md | ./mark-deco-cli-linux > output.html
```

### Windows
```cmd
# Process markdown from stdin
echo # Hello World | mark-deco-cli-win.exe

# Process file
mark-deco-cli-win.exe -i input.md -o output.html
```

## Command Line Options

```
Usage: mark-deco-cli [options]

Enhanced markdown processor with plugin support for oEmbed, Amazon cards, and more

Options:
  -V, --version                      output the version number
  -i, --input <file>                 Input markdown file (default: stdin)
  -o, --output <file>                Output HTML file (default: stdout)
  -c, --config <file>                Configuration file path
  -p, --plugins <plugins...>         Enable specific plugins (oembed, card, mermaid)
  --no-plugins                       Disable all default plugins
  --unique-id-prefix <prefix>        Prefix for unique IDs (default: "section")
  --hierarchical-heading-id          Use hierarchical heading IDs (default: true)
  --content-based-heading-id         Use content-based heading IDs (default: false)
  -h, --help                         display help for information
```

## Distribution

### File Sizes
- Linux: ~46MB
- macOS: ~51MB  
- Windows: ~38MB

These files are self-contained and include the Node.js runtime and all dependencies.

### Technical Approach
- **Step 1**: Bundle with `@vercel/ncc` - Creates a single JavaScript file with all dependencies
- **Step 2**: Binary compilation with `pkg` - Embeds Node.js runtime into native executable
- **Result**: Fully functional standalone binaries with ESM compatibility

## Building from Source

To rebuild the native binaries:

```bash
# Install dependencies
npm install

# Create bundle with ncc
npm run build:bundle

# Create Linux binary only
npm run pkg

# Create all platform binaries
npm run pkg:all

# Clean binaries and bundles
npm run pkg:clean
```

## Technical Details

- **Node.js Version**: Built with Node.js 18.x
- **Packaging Tool**: pkg v5.8.1
- **Target Platforms**: 
  - node18-linux-x64
  - node18-macos-x64  
  - node18-win-x64

## Known Issues

1. **Large File Sizes**: Binaries include the full Node.js runtime (~40-50MB)
2. **Performance**: First execution may be slower due to extraction

## Success Factors

1. **ESM Compatibility**: Resolved through ncc bundling step
2. **Dependency Resolution**: All dependencies bundled into single file
3. **Cross-Platform**: Works on Linux, macOS, and Windows 