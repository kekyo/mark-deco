# mark-deco CLI

Command-line interface for [mark-deco](https://github.com/kekyo/mark-deco).

[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
# Install globally
npm install -g mark-deco-cli

# Or run directly with npx
npx mark-deco-cli input.md
```

## Usage

### Basic Usage

```bash
# Process from stdin to stdout
echo "# Hello World" | mark-deco-cli

# Process a file
mark-deco -i input.md

# Save output to file
mark-deco -i input.md -o output.html
```

### Command Line Options

```
Options:
  -i, --input <file>              Input markdown file (default: stdin)
  -o, --output <file>             Output HTML file (default: stdout)
  -c, --config <file>             Configuration file path
  -p, --plugins <plugins...>      Enable specific plugins (oembed, card, mermaid)
      --no-plugins                Disable all default plugins
      --unique-id-prefix <prefix>  Prefix for unique IDs (default: "section")
      --hierarchical-heading-id    Use hierarchical heading IDs (default: true)
      --content-based-heading-id   Use content-based heading IDs (default: false)
  -h, --help                      Display help for command
  -V, --version                   Display version number
```

### Examples

```bash
# Basic markdown processing
echo "# Hello World" | mark-deco

# Process file with custom ID prefix
mark-deco -i document.md --unique-id-prefix "doc"

# Disable all plugins
mark-deco -i simple.md --no-plugins

# Enable specific plugins only
mark-deco -i content.md -p oembed mermaid

# Use configuration file
mark-deco -i content.md -c config.json
```

## Configuration File

You can use a JSON configuration file to set default options:

```json
{
  "plugins": ["oembed", "card", "mermaid"],
  "uniqueIdPrefix": "section",
  "hierarchicalHeadingId": true,
  "contentBasedHeadingId": false,
  "oembed": {
    "enabled": true,
    "timeout": 5000
  },
  "card": {
    "enabled": true,
    "amazonAssociateId": "your-associate-id"
  },
  "mermaid": {
    "enabled": true,
    "theme": "default"
  }
}
```

## Supported Features

- Frontmatter Information Extraction - Parse YAML frontmatter from Markdown files
- Heading ID Generation and Heading Information Extraction - Automatically generate unique IDs for headings
- Fetcher and Cache System - External HTTP request management with configurable caching
- Built-in Plugins - oEmbed, card, and Mermaid plugins for rich content embedding
- Creating Custom Plugins - Develop custom plugins to extend Markdown processing
- CLI Application - Command-line interface for batch processing

---

## Documentation

For detailed documentation and advanced features, please visit our [GitHub repository](https://github.com/kekyo/mark-deco/).

## Note

This library was born when we determined during the development of [a-terra-forge](https://github.com/kekyo/a-terra-forge/) that it would be better to separate the conversion engine into a standalone component.

The project includes a demonstration page that can be run with `npm run dev`.
Additionally, using a-terra-forge allows you to verify the implementation of a site generator utilizing mark-deco.

## License

Under MIT.
