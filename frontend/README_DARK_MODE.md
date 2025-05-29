# Dark Mode Implementation Guide

## Overview

This application features a comprehensive dark mode system built with CSS custom properties and React context. The system supports three theme modes: **Light**, **Dark**, and **System** (auto-detect).

## Features

- ✨ Seamless theme switching with smooth transitions
- 🎨 Three theme modes: Light, Dark, and System preference
- 💾 Persistent theme preference (localStorage)
- 📱 Responsive design across all themes
- ♿ Accessibility-compliant with proper contrast ratios
- 🔄 Real-time system preference detection
- 🎭 Multiple toggle component variants

## Architecture

### CSS Variable System

The design system uses CSS custom properties for theme management:

```css
/* Light Mode (Default) */
:root {
  --color-background: #ffffff;
  --color-text-primary: #1e293b;
  /* ... */
}

/* Dark Mode */
[data-theme="dark"] {
  --color-background: #0f172a;
  --color-text-primary: #f8fafc;
  /* ... */
}
```

### Theme Context

The `ThemeContext` provides theme state management:

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}
```

## Usage

### 1. Theme Provider Setup

Wrap your app with the `ThemeProvider`:

```tsx
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      {/* Your app content */}
    </ThemeProvider>
  );
}
```

### 2. Using Theme Toggles

Multiple toggle variants are available:

```tsx
import { 
  ThemeToggle, 
  SimpleThemeToggle, 
  AnimatedThemeToggle 
} from './components/ui/ThemeToggle';

// Standard toggle with options
<ThemeToggle showLabel variant="dropdown" />

// Simple circular toggle
<SimpleThemeToggle />

// Switch-style animated toggle
<AnimatedThemeToggle />
```

### 3. Using Theme Values

Access theme information in components:

```tsx
import { useTheme } from './contexts/ThemeContext';

function MyComponent() {
  const { theme, effectiveTheme, setTheme } = useTheme();
  
  return (
    <div>
      Current theme: {theme}
      Effective theme: {effectiveTheme}
    </div>
  );
}
```

### 4. CSS Classes

Use semantic CSS classes for consistent theming:

```tsx
// Text colors
<p className="text-primary">Primary text</p>
<p className="text-secondary">Secondary text</p>
<p className="text-tertiary">Tertiary text</p>

// Backgrounds
<div className="bg-surface">Surface background</div>
<div className="bg-secondary">Secondary background</div>

// Borders
<div className="border-default">Default border</div>
```

## Color System

### Text Colors
- `--color-text-primary`: Main text color
- `--color-text-secondary`: Secondary text color  
- `--color-text-tertiary`: Muted text color
- `--color-text-inverse`: Inverse text (for buttons)

### Background Colors
- `--color-background`: Main page background
- `--color-background-secondary`: Secondary background areas
- `--color-surface`: Card/component surfaces
- `--color-surface-hover`: Hover states

### Status Colors
- `--color-success`: Success states (#10b981 dark, #059669 light)
- `--color-warning`: Warning states (#f59e0b dark, #d97706 light)
- `--color-danger`: Error states (#ef4444 dark, #dc2626 light)
- `--color-info`: Info states (#06b6d4 dark, #0891b2 light)

### Severity Colors
- `--color-critical`: Critical issues
- `--color-high`: High priority
- `--color-medium`: Medium priority
- `--color-low`: Low priority/resolved

## Component Integration

### Cards
```tsx
<Card elevated interactive>
  <CardBody>
    Content automatically adapts to theme
  </CardBody>
</Card>
```

### Buttons
```tsx
<Button variant="primary">Themed Button</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost Style</Button>
```

### Modals
```tsx
<Modal glassmorphism>
  <ModalBody>
    Glassmorphism effects adapt to theme
  </ModalBody>
</Modal>
```

## Browser Support

- **CSS Custom Properties**: All modern browsers
- **Media Queries**: Universal support
- **Local Storage**: All browsers
- **Transitions**: Hardware accelerated

## Accessibility

- Proper contrast ratios in both themes
- Respects `prefers-reduced-motion`
- High contrast mode support
- Focus indicators adapt to theme
- Screen reader friendly

## Performance

- CSS-in-CSS approach (not CSS-in-JS)
- Hardware accelerated transitions
- Minimal JavaScript for theme switching
- No runtime style calculations
- Optimized for tree shaking

## Customization

### Adding New Colors

1. Add to both light and dark mode variables:

```css
:root {
  --color-custom: #your-light-color;
}

[data-theme="dark"] {
  --color-custom: #your-dark-color;
}
```

2. Create utility classes:

```css
.text-custom { color: var(--color-custom); }
.bg-custom { background-color: var(--color-custom); }
```

### Custom Components

Use CSS variables for consistent theming:

```css
.my-component {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  transition: all var(--transition-base);
}
```

## Testing

Test your components in both themes:

1. Use the theme toggle in development
2. Test system preference changes
3. Verify accessibility contrast ratios
4. Check animation performance
5. Test localStorage persistence

## Troubleshooting

### Theme Not Applying
- Ensure `ThemeProvider` wraps your app
- Check CSS custom property spelling
- Verify data-theme attribute on html element

### Flashing on Load
- Add theme detection to initial HTML
- Use CSS prefers-color-scheme for critical styles
- Consider server-side theme detection

### Performance Issues
- Use CSS transitions, not JavaScript animations
- Avoid inline styles that depend on theme
- Minimize DOM mutations during theme change

## Future Enhancements

- [ ] Server-side theme detection
- [ ] More color scheme variations
- [ ] Theme scheduling (auto dark at night)
- [ ] Custom theme creation
- [ ] Theme export/import functionality 