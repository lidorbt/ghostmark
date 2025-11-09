# Ghostmark

<p align="center">
  <img src="https://raw.githubusercontent.com/lidorbt/ghostmark/main/assets/logo.png" alt="Ghostmark Logo" width="600">
</p>

A powerful Vite plugin that invisibly marks JSX elements with debug attributes for seamless development and testing.

<p>
<a href="https://npmjs.org/package/ghostmark"><img src="https://badgen.net/npm/v/ghostmark" alt="NPM Version"></a>
<a href="https://npmcharts.com/compare/ghostmark?minimal=true"><img src="https://badgen.net/npm/dm/ghostmark" alt="NPM Downloads"></a>
<a href="https://github.com/lidorbt/ghostmark/blob/main/LICENSE"><img src="https://badgen.net/npm/license/ghostmark" alt="License"></a>
<a href="https://github.com/lidorbt/ghostmark"><img src="https://badgen.net/github/stars/lidorbt/ghostmark" alt="GitHub Stars"></a>
<a href="https://github.com/lidorbt/ghostmark/graphs/contributors"><img src="https://badgen.net/github/contributors/lidorbt/ghostmark" alt="Contributors"></a>
</p>

## Features

- **Smart Element Detection** - Tags all JSX elements in your application
- **Highly Configurable** - Customize everything: prefixes, paths, filters, and more
- **Zero Runtime Overhead** - No impact on production bundles
- **Framework Agnostic** - Works with React, Preact, SolidJS, and any JSX-based framework
- **Enhanced Debugging** - Seamless integration with browser DevTools
- **TypeScript First** - Full TypeScript support with comprehensive type definitions
- **Generic Component Support** - Handles typed components like `<Field<T>>`
- **Granular Control** - Choose which attributes to include

## Installation

```bash
npm install --save-dev ghostmark
# or
yarn add --dev ghostmark
# or
pnpm add --save-dev ghostmark
```

## Quick Start

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ghostmark } from 'ghostmark'

export default defineConfig({
  plugins: [
    react(),
    ghostmark() // Uses sensible defaults
  ]
})
```

## Configuration

### All Options

```typescript
import { ghostmark } from 'ghostmark'

export default defineConfig({
  plugins: [
    react(),
    ghostmark({
      // Attribute Control
      includeId: true,              // data-gm-id="src/Button.tsx:15:4"
      includeName: true,            // data-gm-name="Button"
      includePath: true,            // data-gm-path="src/Button.tsx"
      includeLine: true,            // data-gm-line="15"
      includeFile: true,            // data-gm-file="Button.tsx"
      includeContent: true,         // data-gm-content="%7B...%7D"
      
      // General Options
      tagPrefix: 'gm',              // Custom prefix (e.g., 'myapp' → data-myapp-id)
      
      // File Processing
      include: ['.jsx', '.tsx'],    // File extensions to process
      exclude: ['node_modules'],    // Paths to exclude
      useRelativePath: true,        // Use relative paths instead of absolute
      
      // Element Filtering
      filter3DElements: true,       // Filter out Three.js/Drei elements
      
      // Development
      debug: false                  // Enable debug logging
    })
  ]
})
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `includeId` | `boolean` | `true` | Include component ID (file:line:column) |
| `includeName` | `boolean` | `true` | Include element name |
| `includePath` | `boolean` | `true` | Include file path |
| `includeLine` | `boolean` | `true` | Include line number |
| `includeFile` | `boolean` | `true` | Include filename |
| `includeContent` | `boolean` | `true` | Include props and content as JSON |
| `tagPrefix` | `string` | `'gm'` | Custom prefix for data attributes |
| `include` | `string[]` | `['.jsx', '.tsx']` | File extensions to process |
| `exclude` | `string[]` | `['node_modules']` | Paths to exclude from processing |
| `useRelativePath` | `boolean` | `true` | Use relative paths in debug info |
| `debug` | `boolean` | `false` | Enable debug logging |
| `filter3DElements` | `boolean` | `true` | Filter out Three.js/Drei elements |

## How It Works

### Before Transformation

```tsx
function App() {
  return (
    <div className="container">
      <Header title="Hello World" />
      <MainContent>
        <Button onClick={handleClick}>Click me</Button>
      </MainContent>
    </div>
  )
}
```

### After Transformation (Default Settings)

```tsx
function App() {
  return (
    <div 
      data-gm-id="src/App.tsx:3:4"
      data-gm-path="src/App.tsx"
      data-gm-line="3"
      data-gm-file="App.tsx"
      className="container"
    >
      <Header 
        data-gm-id="src/App.tsx:4:6"
        data-gm-path="src/App.tsx"
        data-gm-line="4"
        data-gm-file="App.tsx"
        title="Hello World" 
      />
      <MainContent 
        data-gm-id="src/App.tsx:5:6"
        data-gm-path="src/App.tsx"
        data-gm-line="5"
        data-gm-file="App.tsx"
      >
        <Button 
          data-gm-id="src/App.tsx:6:8"
          data-gm-path="src/App.tsx"
          data-gm-line="6"
          data-gm-file="App.tsx"
          onClick={handleClick}
        >
          Click me
        </Button>
      </MainContent>
    </div>
  )
}
```

Note: All JSX elements are tagged, including native HTML elements.

## Advanced Features

### Custom Tag Prefix

Customize the prefix to match your project's conventions:

```typescript
ghostmark({
  tagPrefix: 'myapp' // Changes data-gm-* to data-myapp-*
})
```

**Result:**
- `data-myapp-id` instead of `data-gm-id`
- `data-myapp-path` instead of `data-gm-path`
- `data-myapp-line` instead of `data-gm-line`
- etc.

### Custom File Extensions

Process additional file types like MDX:

```typescript
ghostmark({
  include: ['.jsx', '.tsx', '.mdx']
})
```

### Custom Exclusions

Exclude specific paths from processing:

```typescript
ghostmark({
  exclude: ['node_modules', 'dist', 'build', '.storybook', 'test']
})
```

### Absolute Paths

Use absolute paths instead of relative:

```typescript
ghostmark({
  useRelativePath: false
})
```

### Debug Mode

Enable detailed logging to troubleshoot:

```typescript
ghostmark({
  debug: true
})
```

**Debug output includes:**
- Configuration summary
- Files being processed
- Elements being tagged/skipped
- Build statistics

## Use Cases

- **Debugging**: Quickly identify components in browser dev tools
- **Testing**: Use stable selectors for E2E tests (Playwright, Cypress)
- **Development**: Instant component location during development
- **Analytics**: Track component usage and interactions
- **Design Systems**: Verify component rendering and placement
- **Code Review**: Quickly locate components in large codebases

## Framework Support

Ghostmark works with any Vite project using JSX:

- **React** - Fully supported
- **Preact** - Fully supported  
- **SolidJS** - Fully supported
- **MDX** - Add `.mdx` to the include option

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

---

Made by developers, for developers
