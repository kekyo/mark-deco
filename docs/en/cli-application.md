## CLI Application

MarkDeco includes a CLI application for processing Markdown files from the command line. It supports reading from standard input, file processing, and detailed customization using configuration files.

### Installation

```bash
# Global installation
npm install -g mark-deco-cli

# Or run directly with npx
npx mark-deco-cli input.md
```

### Basic Usage

```bash
# From standard input to standard output
echo "# Hello World" | mark-deco

# Process file
$ mark-deco -i input.md

# Save output to file
$ mark-deco -i input.md -o output.html
```

### Command Line Options

```
Options:
  -i, --input <file>              Input Markdown file (default: standard input)
  -o, --output <file>             Output HTML file (default: standard output)
  -c, --config <file>             Configuration file path
  -p, --plugins <plugins...>      Enable specific plugins (oembed, card, mermaid)
      --no-plugins                Disable all standard plugins
      --unique-id-prefix <prefix>  Unique ID prefix (default: "section")
      --hierarchical-heading-id    Use hierarchical heading IDs (default: true)
      --content-based-heading-id   Use content-based heading IDs (default: false)
      --heading-base-level <level> Base heading level for markdown headings (default: 1)
      --header-title-transform <mode>
                                   Apply the first base-level heading to frontmatter.title (extract, extractAndRemove, none; default: extractAndRemove)
      --frontmatter-output <file>  Output frontmatter as JSON to specified file
      --heading-tree-output <file> Output heading tree as JSON to specified file
  -h, --help                      Display help
  -V, --version                   Display version
```

### Usage Examples

```bash
# Basic Markdown processing
$ echo "# Hello World" | mark-deco

# File processing with custom ID prefix
$ mark-deco -i document.md --unique-id-prefix "doc"

# Disable all plugins
$ mark-deco -i simple.md --no-plugins

# Enable only specific plugins
$ mark-deco -i content.md -p oembed mermaid

# Use configuration file
$ mark-deco -i content.md -c config.json

# Output frontmatter and HTML separately
$ mark-deco -i article.md -o article.html --frontmatter-output metadata.json
```

### Configuration File

You can specify default options in JSON format configuration file:

```json
{
  "plugins": ["oembed", "card", "mermaid"],
  "uniqueIdPrefix": "section",
  "hierarchicalHeadingId": true,
  "contentBasedHeadingId": false,
  "headingBaseLevel": 1,
  "headerTitleTransform": "extractAndRemove",
  "oembed": {
    "enabled": true,
    "timeout": 5000
  },
  "card": {
    "enabled": true
  },
  "mermaid": {
    "enabled": true,
    "theme": "default"
  }
}
```
