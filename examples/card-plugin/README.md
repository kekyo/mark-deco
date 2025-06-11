# Card Plugin Examples

This directory contains example files demonstrating the Card Plugin functionality for the MarkDeco.

## Files Overview

### 🎯 `demo-card-working.js`
**Purpose**: Comprehensive card plugin demonstration with feature detection  
**Features**:
- Creates card plugin with real websites (GitHub, Example.com)
- Detects and verifies card-specific HTML elements
- Shows card generation statistics
- Displays sample HTML output

**Usage**:
```bash
node demo-card-working.js
```

### 🧪 `demo-card-plugin.js`
**Purpose**: Simple card plugin testing with multiple scenarios  
**Features**:
- Tests various URL types including error handling
- Demonstrates card HTML structure detection
- Shows basic card plugin functionality

**Usage**:
```bash
node demo-card-plugin.js
```

### 📊 `demo-card-output.js` 
**Purpose**: Detailed output analysis and card analytics  
**Features**:
- Analyzes generated HTML output in detail
- Provides statistics on successful vs fallback cards
- Detects presence of images, descriptions, and other features
- Shows formatted HTML output preview

**Usage**:
```bash
node demo-card-output.js
```

### ⚠️ `test-invalid-url.js`
**Purpose**: Error handling demonstration  
**Features**:
- Tests invalid URL handling behavior
- Demonstrates why invalid URLs are removed from demos
- Shows graceful error handling vs successful processing
- Compares error scenarios with valid URL processing

**Usage**:
```bash
node test-invalid-url.js
```

## Prerequisites

1. **Build the project**: Run `npm run build` from the project root
2. **Install dependencies**: Ensure all dependencies are installed with `npm install`

## Running Examples

From the project root:

```bash
# Navigate to examples directory
cd examples/card-plugin

# Run any example
node demo-card-working.js
node demo-card-plugin.js
node demo-card-output.js
node test-invalid-url.js
```

## Expected Output

All examples should:
- ✅ Successfully import the card plugin
- ✅ Create markdown processor with card plugin
- ✅ Process markdown with card blocks
- ✅ Generate HTML with card containers
- ✅ Display relevant statistics and information

## What These Examples Demonstrate

### Card Plugin Capabilities
- **OGP Metadata Extraction**: Fetches Open Graph metadata from URLs
- **Fallback Handling**: Uses Twitter Cards and HTML metadata when OGP unavailable  
- **Error Handling**: Graceful handling of invalid URLs, CORS errors, timeouts
- **Responsive Design**: Generated cards work on desktop and mobile
- **Rich Content**: Displays titles, descriptions, images, favicons, and site names

### Card HTML Structure
```html
<div class="card-container">
  <a href="[URL]" target="_blank" rel="noopener noreferrer" class="card-link">
    <div class="card-image">
      <img src="[IMAGE]" alt="[TITLE]" loading="lazy" />
    </div>
    <div class="card-body">
      <div class="card-header">
        <div class="card-title">[TITLE]</div>
        <div class="card-provider">
          <img src="[FAVICON]" alt="" class="card-favicon" />
          <span>[SITE_NAME]</span>
        </div>
      </div>
      <div class="card-description">[DESCRIPTION]</div>
    </div>
  </a>
</div>
```

## Integration with Demo Pages

These examples complement the main demo page available at:
- **Development**: `http://localhost:8080` (when demo server is running)
- **Built version**: Open `dist-demo-pages/index.html` in a browser

The examples provide programmatic testing while the demo page offers interactive browser-based testing. 